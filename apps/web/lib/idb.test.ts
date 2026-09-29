import { describe, expect, it } from "vitest";
import { untilTransactionEnds } from "./idb";

/**
 * Chromium can abort a transaction without firing the pending request's own
 * error event (a value too large for an in-memory profile, a full disk). The
 * work inside the transaction must stop at the abort, not wait forever.
 */
describe("untilTransactionEnds", () => {
  const never = new Promise<never>(() => undefined);

  it("returns the work's result when the work finishes first", async () => {
    const finished = new Promise<void>(() => undefined);
    await expect(untilTransactionEnds(Promise.resolve("saved"), finished)).resolves.toBe("saved");
  });

  it("rejects when the transaction aborts while a request never answers", async () => {
    const aborted = Promise.reject(new DOMException("aborted", "UnknownError"));
    await expect(untilTransactionEnds(never, aborted)).rejects.toMatchObject({
      name: "UnknownError",
    });
  });

  it("still waits for the work when the transaction commits first", async () => {
    let finish: (value: string) => void = () => undefined;
    const work = new Promise<string>((resolve) => {
      finish = resolve;
    });
    const result = untilTransactionEnds(work, Promise.resolve());
    finish("saved");
    await expect(result).resolves.toBe("saved");
  });
});
