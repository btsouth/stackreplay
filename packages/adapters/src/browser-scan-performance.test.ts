import { expect, it, vi } from "vitest";
import {
  type BrowserCandidate,
  BrowserIntakeCancelledError,
  intakeBrowserCandidates,
} from "./browser.js";
import { CLAUDE_CODE_SESSION } from "./fixtures/content.js";
import { FIXTURE_SALT, syntheticCatalog } from "./fixtures/helpers.js";

const NOW = "2026-10-01T12:00:00.000Z";
function streamed(path: string, group?: string) {
  const blob = new Blob([CLAUDE_CODE_SESSION]);
  const stream = vi.fn(() => blob.stream());
  const file: BrowserCandidate = {
    path,
    ...(group === undefined ? {} : { group }),
    size: blob.size,
    lastModified: Date.parse(NOW),
    peekText: (bytes) => blob.slice(0, bytes).text(),
    text: async () => {
      throw new Error("whole-file read attempted");
    },
    stream,
  };
  return { file, stream };
}

it.each([
  ["root/projects/a/first.jsonl", "root/projects/b/second.jsonl", "same", "same"],
  ["C:\\history\\projects\\p\\first.jsonl", "C:/history/projects/p/second.jsonl", "same", "same"],
  ["first.jsonl", "second.jsonl", "first", "second"],
])(
  "still rejects exact duplicates in a shared scope: %s",
  async (firstPath, secondPath, firstGroup, secondGroup) => {
    const first = streamed(firstPath, firstGroup);
    const second = streamed(secondPath, secondGroup);
    const result = await intakeBrowserCandidates([first.file, second.file], syntheticCatalog(), {
      now: NOW,
      salt: FIXTURE_SALT,
      sourceRootSalt: FIXTURE_SALT,
    });
    expect(result.outcomes.map((outcome) => outcome.status)).toEqual(["imported", "duplicate"]);
    expect(result.exported?.events).toHaveLength(2);
    expect(first.stream).toHaveBeenCalledOnce();
    expect(second.stream).toHaveBeenCalledOnce();
  },
);

it.each([false, true])(
  "still signs against decoded text in the same scope regardless of its declared byte size (reverse=%s)",
  async (reverse) => {
    const history = streamed("root/projects/p/session.jsonl", "same");
    const text: BrowserCandidate = {
      path: "root/projects/p/copy.jsonl",
      group: "same",
      size: 1,
      lastModified: 0,
      text: async () => CLAUDE_CODE_SESSION,
    };
    const result = await intakeBrowserCandidates(
      reverse ? [text, history.file] : [history.file, text],
      syntheticCatalog(),
      {
        now: NOW,
        salt: FIXTURE_SALT,
      },
    );
    expect(result.outcomes.map((outcome) => outcome.status)).toEqual(["imported", "duplicate"]);
    expect(result.exported?.events).toHaveLength(2);
    expect(history.stream).toHaveBeenCalledOnce();
  },
);

it("keeps separate groups separate even under the same projects path", async () => {
  const first = streamed("root/projects/p/first.jsonl", "first");
  const second = streamed("root/projects/p/second.jsonl", "second");
  const result = await intakeBrowserCandidates([first.file, second.file], syntheticCatalog(), {
    now: NOW,
    salt: FIXTURE_SALT,
    sourceRootSalt: FIXTURE_SALT,
  });
  expect(result.outcomes.map((outcome) => outcome.status)).toEqual(["imported", "imported"]);
  expect(result.exported?.events).toHaveLength(4);
  expect(
    new Set(result.exported?.events.map((event) => event.source.resourceInstanceId)).size,
  ).toBe(2);
  expect(first.stream).not.toHaveBeenCalled();
  expect(second.stream).not.toHaveBeenCalled();
});

it("does not turn byte-different BOM data into an exact-file duplicate", async () => {
  const history = streamed("root/projects/p/session.jsonl", "same");
  const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), CLAUDE_CODE_SESSION]);
  history.file.size = blob.size;
  history.file.peekText = (bytes) => blob.slice(0, bytes).text();
  history.file.stream = () => blob.stream();
  const text: BrowserCandidate = {
    path: "root/projects/p/copy.jsonl",
    group: "same",
    size: 1,
    lastModified: 0,
    text: async () => CLAUDE_CODE_SESSION,
  };
  const result = await intakeBrowserCandidates([history.file, text], syntheticCatalog(), {
    now: NOW,
    salt: FIXTURE_SALT,
  });
  expect(result.outcomes.map((outcome) => outcome.status)).toEqual(["imported", "imported"]);
  expect(result.exported?.events).toHaveLength(2);
});

it("does not hash equal-size streamed histories from different duplicate scopes", async () => {
  const first = streamed("first/projects/p/session.jsonl", "first");
  const second = streamed("second/projects/p/session.jsonl", "second");
  const result = await intakeBrowserCandidates([first.file, second.file], syntheticCatalog(), {
    now: NOW,
    salt: FIXTURE_SALT,
    sourceRootSalt: FIXTURE_SALT,
  });
  expect(result.outcomes.map((outcome) => outcome.status)).toEqual(["imported", "imported"]);
  expect(result.exported?.events).toHaveLength(4);
  expect(
    new Set(result.exported?.events.map((event) => event.source.resourceInstanceId)).size,
  ).toBe(2);
  expect(first.stream).not.toHaveBeenCalled();
  expect(second.stream).not.toHaveBeenCalled();
});

it.each(["opening", "locked"])(
  "reports a %s stream as unreadable after skipping cross-scope hashing",
  async (failure) => {
    const history = streamed("location-1/projects/p/session.jsonl", "location-1");
    history.file.size = 9 * 1024 * 1024;
    const locked = new Blob([CLAUDE_CODE_SESSION]).stream();
    const reader = locked.getReader();
    history.file.stream = () => {
      if (failure === "opening")
        throw new DOMException("Synthetic read failure", "NotReadableError");
      return locked;
    };
    const ignored: BrowserCandidate = {
      path: "ignored.json",
      size: 2,
      lastModified: 0,
      text: async () => "{}",
    };
    try {
      const result = await intakeBrowserCandidates([history.file, ignored], syntheticCatalog(), {
        now: NOW,
        salt: FIXTURE_SALT,
      });
      expect(result.outcomes.map((outcome) => outcome.status)).toEqual([
        "unreadable",
        "unrecognized",
      ]);
      expect(result.exported).toBeUndefined();
    } finally {
      reader.releaseLock();
    }
  },
);

it.each(["read", "cancel", "cancel-opening"])(
  "preserves %s failure handling for newly unsigned streams",
  async (failure) => {
    const history = streamed("location-1/projects/p/session.jsonl", "location-1");
    history.file.size = 9 * 1024 * 1024;
    const controller = new AbortController();
    history.file.stream = () => {
      if (failure === "cancel-opening") throw new BrowserIntakeCancelledError();
      let sent = false;
      return new ReadableStream<Uint8Array>({
        pull(output) {
          if (!sent) {
            sent = true;
            output.enqueue(new TextEncoder().encode(CLAUDE_CODE_SESSION));
          } else if (failure === "cancel") {
            controller.abort();
            output.enqueue(new Uint8Array([10]));
            output.close();
          } else {
            output.error(new DOMException("Synthetic read failure", "NotReadableError"));
          }
        },
      });
    };
    const ignored: BrowserCandidate = {
      path: "ignored.json",
      size: 2,
      lastModified: 0,
      text: async () => "{}",
    };
    const intake = intakeBrowserCandidates([history.file, ignored], syntheticCatalog(), {
      now: NOW,
      salt: FIXTURE_SALT,
      signal: controller.signal,
    });
    if (failure.startsWith("cancel")) {
      await expect(intake).rejects.toBeInstanceOf(BrowserIntakeCancelledError);
    } else {
      const result = await intake;
      expect(result.outcomes.map((outcome) => outcome.status)).toEqual([
        "unreadable",
        "unrecognized",
      ]);
      expect(result.exported).toBeUndefined();
    }
  },
);

it("still signs undefined-scope streamed histories when an undefined-scope text file is selected", async () => {
  const history = streamed("session.jsonl", "first");
  const text: BrowserCandidate = {
    path: "copy.jsonl",
    group: "second",
    size: 1,
    lastModified: 0,
    text: async () => CLAUDE_CODE_SESSION,
  };
  const result = await intakeBrowserCandidates([history.file, text], syntheticCatalog(), {
    now: NOW,
    salt: FIXTURE_SALT,
  });
  expect(result.outcomes.map((outcome) => outcome.status)).toEqual(["imported", "duplicate"]);
  expect(history.stream).toHaveBeenCalledOnce();
});

it.each(["root/projects/opencode.db", "other/opencode.db"])(
  "uses the database's existing directory scope for signing: %s",
  async (path) => {
    const history = streamed("root/projects/p/session.jsonl", "same");
    const database: BrowserCandidate = {
      path,
      group: "same",
      size: 128,
      lastModified: 0,
      text: async () => {
        throw new Error("database read as text");
      },
      arrayBuffer: async () => {
        throw new DOMException("Synthetic read failure", "NotReadableError");
      },
    };
    const result = await intakeBrowserCandidates([history.file, database], syntheticCatalog(), {
      now: NOW,
      salt: FIXTURE_SALT,
    });
    expect(result.outcomes.map((outcome) => outcome.status)).toEqual(["imported", "unreadable"]);
    expect(history.stream).toHaveBeenCalledTimes(path.startsWith("root/projects/") ? 1 : 0);
  },
);

it("does not hash a streamed history because of a text file outside its duplicate scope", async () => {
  const history = streamed("location-1/projects/p/session.jsonl", "location-1");
  const text: BrowserCandidate = {
    path: "ignored.json",
    size: 2,
    lastModified: 0,
    text: async () => "{}",
  };
  const result = await intakeBrowserCandidates([history.file, text], syntheticCatalog(), {
    now: NOW,
    salt: FIXTURE_SALT,
  });
  expect(result.outcomes[0]?.status).toBe("imported");
  expect(result.exported?.events).toHaveLength(2);
  expect(history.stream).not.toHaveBeenCalled();
});
