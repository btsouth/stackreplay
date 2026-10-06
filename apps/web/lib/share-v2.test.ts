import { decodeAnyShareToken, encodeShareTokenV2 } from "@stackreplay/share";
import { buildArchetypeExport } from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import { buildRecap } from "./recap";
import { recapShareV2 } from "./share-v2";

/**
 * Share privacy: every link is decoded here and read back as a stranger would,
 * and nothing private may be in it.
 */

const NOW = "2026-09-24T12:00:00Z";

function mixedRecap(
  mutate: (exported: ReturnType<typeof buildArchetypeExport>) => void = () => {},
) {
  const exported = buildArchetypeExport("mixed");
  mutate(exported);
  return { exported, recap: buildRecap(exported.events, "all", NOW, "America/New_York") };
}

async function publicJson(snapshot: Parameters<typeof encodeShareTokenV2>[0]): Promise<string> {
  const token = await encodeShareTokenV2(snapshot);
  const decoded = await decodeAnyShareToken(token);
  if (!decoded.ok) throw new Error(decoded.message);
  return JSON.stringify(decoded.snapshot);
}

describe("recap share links", () => {
  it("carry aggregates only: no project names, sessions, paths or times", async () => {
    const { exported, recap } = mixedRecap();
    const json = await publicJson(recapShareV2(recap));
    for (const hash of new Set(exported.events.flatMap((event) => event.projectHash ?? [])))
      expect(json).not.toContain(hash);
    for (const event of exported.events) {
      if (event.source.nativeSessionHash !== undefined)
        expect(json).not.toContain(event.source.nativeSessionHash);
    }
    expect(json).not.toMatch(/"at"|"zone"|AM\b|PM\b|America\//u);
    expect(json).not.toMatch(/projectHash|nativeSessionHash|nativeEventHash|rawName/u);
    expect(json).toContain(`"totalTokens":${recap.total}`);
  });

  it("never name a tool from a hand-edited file, only a known recording tool", async () => {
    const { recap } = mixedRecap((exported) => {
      for (const event of exported.events)
        if (event.source.adapterId === "command-code")
          (event.source as { adapterId: string }).adapterId = "acme-internal";
    });
    const json = await publicJson(recapShareV2(recap));
    expect(json).not.toContain("acme-internal");
    expect(json).toContain('"id":"other"');
  });

  it("marks sample data as synthetic", async () => {
    const { recap } = mixedRecap();
    expect(await publicJson(recapShareV2(recap, true))).toContain('"synthetic":true');
  });
});
