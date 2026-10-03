import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { SourceList } from "./provenance";

it("shows the checked date of each source independently", () => {
  const html = renderToStaticMarkup(
    createElement(SourceList, {
      sources: [
        {
          title: "Pricing",
          url: "https://example.com/prices",
          checkedAt: "2026-09-23",
        },
        {
          title: "Terms",
          url: "https://example.com/terms",
          checkedAt: "2026-10-03",
        },
      ],
    }),
  );
  expect(html).toContain("checked Sep 23, 2026");
  expect(html).toContain("checked Oct 3, 2026");
});
