import { describe, expect, it } from "vitest";
import { localProjectLabels } from "./project-labels.js";

describe("local project labels", () => {
  it("uses the folder basename and never a path", () => {
    const labels = localProjectLabels(
      new Map([
        ["ph_b", "/home/someone/Projects/StackReplay"],
        ["ph_a", "C:\\work\\Harbor\\"],
      ]),
    );
    expect(labels).toEqual([
      { hash: "ph_a", label: "Harbor" },
      { hash: "ph_b", label: "StackReplay" },
    ]);
    for (const { label } of labels) expect(label).not.toMatch(/[\\/]/u);
  });

  it("disambiguates equal basenames with the parent folder, without a separator", () => {
    const labels = localProjectLabels(
      new Map([
        ["ph_1", "/home/someone/personal/app"],
        ["ph_2", "/home/someone/work/app"],
        ["ph_3", "/srv/other"],
      ]),
    );
    expect(labels.map((entry) => entry.label)).toEqual(["app · personal", "app · work", "other"]);
  });

  it("names only the ancestor that differs, not the folders both share", () => {
    const labels = localProjectLabels(
      new Map([
        ["ph_1", "/mnt/c/Users/bts/Windows/projects/api"],
        ["ph_2", "/home/bts/Linux/projects/api"],
      ]),
    );
    expect(labels.map((entry) => entry.label)).toEqual(["api · Windows", "api · Linux"]);
  });

  it("stays deterministic and unique when folders cannot be told apart", () => {
    const keys = new Map([
      ["ph_2", "app"],
      ["ph_1", "app"],
    ]);
    expect(localProjectLabels(keys)).toEqual([
      { hash: "ph_1", label: "app" },
      { hash: "ph_2", label: "app #2" },
    ]);
    expect(localProjectLabels(keys)).toEqual(localProjectLabels(new Map([...keys].reverse())));
  });

  it("strips control characters from a label", () => {
    expect(localProjectLabels(new Map([["ph_1", "/x/bad\u0007name"]]))[0]?.label).toBe("bad name");
  });
});
