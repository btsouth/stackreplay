import { decodeAnyShareToken } from "@stackreplay/share";
import { ImageResponse } from "next/og";
import { terminalImageFonts } from "@/components/share/terminal-image-font";
import { TerminalLandscape } from "@/components/share/terminal-landscape";
import { resolveShareParam } from "@/lib/share-link-store";
import { sharedRecap } from "@/lib/shared-recap";
import type { PublicCard } from "@/lib/terminal-card";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const resolved = await resolveShareParam((await params).token),
    decoded =
      resolved.kind === "token"
        ? await decodeAnyShareToken(resolved.token)
        : { ok: false as const };
  if (!decoded.ok) return new Response("Share not found", { status: 404 });
  const old = sharedRecap(decoded.snapshot),
    supplied =
      decoded.snapshot.version === 2 && decoded.snapshot.kind === "workload"
        ? decoded.snapshot.card
        : undefined;
  const card: PublicCard = supplied ?? {
    theme: "dark",
    start: "1970-01-01",
    end: "1970-01-01",
    ...(old.tokens !== undefined ? { tokens: old.tokens } : {}),
    ...(old.usd !== undefined ? { usd: old.usd } : {}),
    ...(old.streak !== undefined ? { streak: old.streak } : {}),
    models: old.models.map((m) => ({ id: m.id, tokenCount: m.tokens })),
  };
  return new ImageResponse(
    <TerminalLandscape
      card={card}
      legacy={!supplied}
      synthetic={decoded.snapshot.version === 2 && decoded.snapshot.synthetic === true}
    />,
    {
      width: 1200,
      height: 630,
      fonts: terminalImageFonts(),
      headers: { "cache-control": "public, max-age=31536000, immutable" },
    },
  );
}
