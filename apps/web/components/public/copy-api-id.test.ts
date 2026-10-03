import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CopyApiId } from "./copy-api-id";

describe("CopyApiId", () => {
  it("uses a neutral accessible label and keeps the stable test id", () => {
    const html = renderToStaticMarkup(createElement(CopyApiId, { value: "mistral-large-2512" }));

    expect(html).toContain('aria-label="Copy model identifier"');
    expect(html).toContain('data-testid="copy-api-id"');
    expect(html).toContain("mistral-large-2512");
    expect(html).not.toContain("Copy API model id");
  });
});
