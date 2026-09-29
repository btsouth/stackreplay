import { describe, expect, it } from "vitest";
import { defaultSortDirection, type ModelSortKey } from "./model-library";
import { modelLibrarySearch, readModelLibraryUrl } from "./model-layout";

const direction = (sort: string) => defaultSortDirection(sort as ModelSortKey);
const allowed = {
  developers: ["anthropic", "minimax"],
  capabilities: ["Reasoning", "long-context"],
  sorts: ["featured", "name", "input", "context"],
  defaultDirection: direction,
};

describe("models page URL state", () => {
  it("round-trips a shared view and leaves every default out", () => {
    const search =
      "?view=table&q=glm&tab=legacy&developer=minimax&capability=long-context&sort=input&dir=desc&included=1&priced=1";
    const state = readModelLibraryUrl(search, allowed);
    expect(state).toEqual({
      layout: "table",
      query: "glm",
      tab: "legacy",
      developer: "minimax",
      capability: "long-context",
      sort: "input",
      direction: "descending",
      included: true,
      priced: true,
    });
    expect(modelLibrarySearch(state, direction)).toBe(search);
    expect(modelLibrarySearch(readModelLibraryUrl("", allowed), direction)).toBe("");
  });

  it("uses a sort's own default direction unless the link says otherwise", () => {
    expect(readModelLibraryUrl("?sort=context", allowed).direction).toBe("descending");
    expect(readModelLibraryUrl("?sort=input", allowed).direction).toBe("ascending");
    const state = readModelLibraryUrl("?sort=context", allowed);
    expect(modelLibrarySearch(state, direction)).toBe("?sort=context");
  });

  it("ignores values the page does not offer", () => {
    const state = readModelLibraryUrl(
      "?developer=nobody&capability=Teleport&sort=speed&tab=secret&view=grid",
      allowed,
    );
    expect(state).toMatchObject({
      layout: "cards",
      developer: "all",
      capability: "all",
      sort: "featured",
      tab: "models",
    });
  });
});
