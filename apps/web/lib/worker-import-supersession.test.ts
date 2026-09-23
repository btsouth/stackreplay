import { buildDemoExport } from "@stackreplay/test-fixtures";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  responses: [] as unknown[],
  saved: new Map<string, { record: unknown; exported: unknown }>(),
  holdList: undefined as (() => void) | undefined,
  listGate: undefined as Promise<void> | undefined,
  listCalls: 0,
}));

vi.mock("../lib/idb", () => ({
  localStoreGeneration: () => ({}),
  listImports: async () => {
    state.listCalls += 1;
    if (state.listCalls === 1) await state.listGate;
    return [...state.saved.values()].map((item) => item.record);
  },
  saveImport: async (record: { id: string }, exported: unknown) => {
    state.saved.set(record.id, { record, exported });
    return { ok: true, value: record };
  },
  loadImport: async (id: string) =>
    state.saved.has(id)
      ? { ok: true, value: state.saved.get(id)?.exported }
      : { ok: false, code: "IMPORT_NOT_FOUND" },
  invalidateInFlightWrites: () => undefined,
  clearLocalData: async () => {
    state.saved.clear();
    return { ok: true, value: undefined };
  },
}));

const exported = buildDemoExport("moderate");
const text = JSON.stringify(exported);
const idA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const idB = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

async function worker() {
  const scope = {
    onmessage: undefined as ((event: { data: unknown }) => Promise<void>) | undefined,
    postMessage: (response: unknown) => state.responses.push(response),
  };
  vi.stubGlobal("self", scope);
  await import("../workers/replay.worker");
  return {
    send: (request: unknown) => scope.onmessage?.({ data: request }) ?? Promise.resolve(),
    messages: () =>
      state.responses as { type: string; requestId?: number; imports?: { id: string }[] }[],
  };
}

function fileImport(
  requestId: number,
  id: string,
  source: { text(): Promise<string> },
  saveLocal: boolean,
) {
  return {
    protocol: 1,
    type: "IMPORT_FILE",
    requestId,
    importId: id,
    label: `${id}.json`,
    now: "2026-09-22T12:00:00.000Z",
    saveLocal,
    file: { size: text.length, text: source.text },
  };
}

beforeEach(() => {
  vi.resetModules();
  state.responses.length = 0;
  state.saved.clear();
  state.listCalls = 0;
  state.listGate = undefined;
  state.holdList = undefined;
});

describe("Worker import supersession", () => {
  it("cancelling the current request prevents its deferred save", async () => {
    state.listGate = new Promise<void>((resolve) => {
      state.holdList = resolve;
    });
    const running = await worker();
    const a = running.send(fileImport(1, idA, { text: async () => text }, true));
    await vi.waitFor(() => expect(state.listCalls).toBe(1));
    await running.send({ protocol: 1, type: "CANCEL_IMPORT", requestId: 2 });
    state.holdList?.();
    await a;
    expect(state.saved.size).toBe(0);
    await running.send({ protocol: 1, type: "LIST_LOCAL_IMPORTS", requestId: 3 });
    expect(running.messages().find((message) => message.type === "IMPORTS")?.imports).toEqual([]);
  }, 15_000);

  it("does not persist A after B supersedes it before its commit", async () => {
    state.listGate = new Promise<void>((resolve) => {
      state.holdList = resolve;
    });
    const running = await worker();
    const a = running.send(fileImport(1, idA, { text: async () => text }, true));
    await vi.waitFor(() => expect(state.listCalls).toBe(1));
    const b = running.send(fileImport(2, idB, { text: async () => text }, true));
    state.holdList?.();
    await Promise.all([a, b]);
    expect(state.saved.has(idA)).toBe(false);
    expect(state.saved.has(idB)).toBe(true);
    await running.send({ protocol: 1, type: "LIST_LOCAL_IMPORTS", requestId: 3 });
    const listing = running.messages().find((message) => message.type === "IMPORTS");
    expect(listing?.imports?.map((item) => item.id)).toEqual([idB]);
    expect(
      running.messages().some((message) => message.type === "IMPORT_OK" && message.requestId === 1),
    ).toBe(false);
    expect(
      running.messages().some((message) => message.type === "IMPORT_OK" && message.requestId === 2),
    ).toBe(true);
  });

  it("does not put a superseded temporary import in sessionWorkloads", async () => {
    const running = await worker();
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const a = running.send(
      fileImport(
        1,
        idA,
        {
          text: async () => {
            await gate;
            return text;
          },
        },
        false,
      ),
    );
    const b = running.send(fileImport(2, idB, { text: async () => text }, false));
    release?.();
    await Promise.all([a, b]);
    await running.send({ protocol: 1, type: "LIST_LOCAL_IMPORTS", requestId: 3 });
    const listing = running.messages().find((message) => message.type === "IMPORTS");
    expect(listing?.imports?.map((item) => item.id)).toEqual([idB]);
    expect(state.saved.size).toBe(0);
  });

  it("clearing local data invalidates an unsaved import held before session commit", async () => {
    const running = await worker();
    let releaseA: (() => void) | undefined;
    let enteredA: (() => void) | undefined;
    const entered = new Promise<void>((resolve) => {
      enteredA = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      releaseA = resolve;
    });
    const a = running.send(
      fileImport(
        1,
        idA,
        {
          text: async () => {
            enteredA?.();
            await gate;
            return text;
          },
        },
        false,
      ),
    );
    await entered;

    const clear = running.send({ protocol: 1, type: "CLEAR_LOCAL_DATA", requestId: 2 });
    releaseA?.();
    await Promise.all([a, clear]);

    expect(running.messages().some((message) => message.type === "CLEARED")).toBe(true);
    expect(
      running.messages().some((message) => message.type === "IMPORT_OK" && message.requestId === 1),
    ).toBe(false);
    expect(state.saved.has(idA)).toBe(false);
    expect(state.saved.size).toBe(0);
    await running.send({ protocol: 1, type: "LIST_LOCAL_IMPORTS", requestId: 3 });
    expect(running.messages().find((message) => message.requestId === 3)?.imports).toEqual([]);

    await running.send(fileImport(4, idB, { text: async () => text }, true));
    expect(
      running.messages().some((message) => message.type === "IMPORT_OK" && message.requestId === 4),
    ).toBe(true);
    expect(state.saved.has(idB)).toBe(true);
    await running.send({ protocol: 1, type: "LIST_LOCAL_IMPORTS", requestId: 5 });
    expect(running.messages().find((message) => message.requestId === 5)?.imports).toEqual([
      expect.objectContaining({ id: idB }),
    ]);
  });
});
