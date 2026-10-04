import type { Metadata } from "next";
import { describe, expect, it } from "vitest";
import { metadata as benchmarks } from "../app/(public)/benchmarks/page";
import { metadata as changelog } from "../app/(public)/changelog/page";
import { metadata as compare } from "../app/(public)/compare/page";
import { metadata as methodology } from "../app/(public)/methodology/page";
import { generateMetadata as modelMetadata } from "../app/(public)/models/[modelId]/page";
import { metadata as models } from "../app/(public)/models/page";
import { metadata as home } from "../app/(public)/page";
import { generateMetadata as planMetadata } from "../app/(public)/plans/[planId]/page";
import { metadata as plans } from "../app/(public)/plans/page";
import {
  generateMetadata as providerMetadata,
  generateStaticParams as providerParams,
} from "../app/(public)/providers/[providerId]/page";
import { metadata as providers } from "../app/(public)/providers/page";
import { absoluteUrl, brandAssets } from "./site";

function check(metadata: Metadata, title: string, path: string) {
  expect(metadata.title).toEqual(path === "/" ? { absolute: title } : title);
  expect(metadata.alternates?.canonical).toBe(path);
  expect(metadata.openGraph).toMatchObject({
    title,
    description: metadata.description,
    url: absoluteUrl(path),
    images: [{ url: brandAssets.openGraph.src }],
  });
  expect(metadata.twitter).toMatchObject({ title, description: metadata.description });
}

describe("public route metadata", () => {
  it.each([
    [home, "StackReplay: explore AI models, providers and plans", "/"],
    [models, "Models", "/models"],
    [plans, "Subscriptions", "/plans"],
    [providers, "Providers", "/providers"],
    [benchmarks, "Model benchmarks", "/benchmarks"],
    [compare, "Compare plans", "/compare"],
    [methodology, "Methodology", "/methodology"],
    [changelog, "AI updates", "/changelog"],
  ] as const)("has its own title and canonical social URL: %s", (metadata, title, path) => {
    check(metadata, title, path);
  });

  it("uses provider identity and includes empty and offer-only hubs", async () => {
    check(
      await providerMetadata({ params: Promise.resolve({ providerId: "anthropic" }) }),
      "Anthropic",
      "/providers/anthropic",
    );
    expect(providerParams()).toContainEqual({ providerId: "mistral" });
    expect(providerParams()).toContainEqual({ providerId: "devin" });
    await expect(
      providerMetadata({ params: Promise.resolve({ providerId: "example-provider" }) }),
    ).rejects.toThrow();
    await expect(
      providerMetadata({ params: Promise.resolve({ providerId: "unknown" }) }),
    ).rejects.toThrow();
  });

  it("uses the model identity and path", async () => {
    check(
      await modelMetadata({ params: Promise.resolve({ modelId: "gpt-6-1-sol" }) }),
      "GPT-6.1 Sol",
      "/models/gpt-6-1-sol",
    );
  });

  it("uses the plan identity and path", async () => {
    check(
      await planMetadata({ params: Promise.resolve({ planId: "clinepass" }) }),
      "ClinePass",
      "/plans/clinepass",
    );
  });
});
