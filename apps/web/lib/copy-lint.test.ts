import { describe, expect, it } from "vitest";
import { copyDefects } from "./copy-lint";

describe("copy lint", () => {
  it("finds the defects templates produce", () => {
    expect(copyDefects("It is a partial one..")).toHaveLength(1);
    expect(copyDefects("Served 10 calls .")).toHaveLength(1);
    expect(copyDefects("Cost ( ) here")).toHaveLength(1);
    expect(copyDefects("Cost was undefined today")).toHaveLength(1);
  });

  it("leaves ordinary copy and ellipses alone", () => {
    expect(copyDefects("Replaying… Reading the window...")).toEqual([]);
    expect(copyDefects("$9,812.82 at published rates. Not what you paid.")).toEqual([]);
    expect(copyDefects("GPT-5.6 Sol, Claude Opus 4.8 (legacy).")).toEqual([]);
  });
});
