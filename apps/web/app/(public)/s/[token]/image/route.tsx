import { type AnyShareSnapshot, decodeAnyShareToken } from "@stackreplay/share";
import { ImageResponse } from "next/og";
import { shareImageFonts } from "@/lib/og-fonts";
import { WORDMARK_DARK } from "@/lib/og-wordmark";
import { resolveShareParam } from "@/lib/share-link-store";
import { presentShare, type SharePresentation } from "@/lib/share-presentation";

/**
 * The social image for one share link (decision 61).
 *
 * The path names a short-link id (its stored token is read from the share
 * store) or a self-contained token. The token is decoded and validated here,
 * and the image is drawn from its aggregate snapshot through the same
 * presentation the public page renders, so the image says what the page says.
 * Neither a token nor a stored link ever changes, so the image never changes
 * for a given URL.
 */

const INK = "#eef1f6";
const MUTED = "#8d96a8";
const RULE = "rgba(238, 241, 246, 0.14)";
const SIGNAL = "#4c8dff";
const FIELD = "#0a0c11";

function firstSentence(text: string): string {
  const boundary = text.search(/(?<=[.;])\s(?=[A-Z])/u);
  return boundary === -1 ? text : text.slice(0, boundary);
}

/** A V1 link, drawn with the words its own page leads with. */
function presentV1(snapshot: Extract<AnyShareSnapshot, { version: 1 }>): SharePresentation {
  const percent = snapshot.feasibility.coveragePercent;
  return {
    kind: "replay",
    label: "Exact replay",
    context: `${snapshot.target.planName} · rules as of ${snapshot.versions.rulesAsOf}`,
    ...(percent === undefined
      ? {}
      : { figure: { value: `${percent.toFixed(1)}%`, caption: "of recorded requests served" } }),
    headline: `${snapshot.workload.eventCount.toLocaleString("en-US")} recorded calls replayed against ${snapshot.target.planName}.`,
    weight: "strong",
    support: [],
    facts: [],
    tools: [],
    synthetic: snapshot.synthetic === true,
  };
}

function Card({ presentation }: { presentation: SharePresentation | undefined }) {
  const headline =
    presentation === undefined
      ? "This share link cannot be read."
      : firstSentence(presentation.headline);
  const long = headline.length > 110;
  // A quiet verdict's sentence is the answer: it leads, and the figure is a
  // small labelled line under it rather than a number set at display size.
  const quiet = presentation?.weight === "quiet";
  // A workload image carries its strongest comparative fact under the headline.
  const fact = presentation?.facts[0];
  const valueScope = presentation?.kind === "workload" ? presentation.valueScope : undefined;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: FIELD,
        color: INK,
        padding: "56px 72px",
        fontFamily: "Geist",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* biome-ignore lint/performance/noImgElement: the image renderer (satori) draws plain <img> only; next/image cannot run inside an image response. */}
        <img
          alt=""
          height={(WORDMARK_DARK.height * 3) / 4}
          src={WORDMARK_DARK.src}
          width={(WORDMARK_DARK.width * 3) / 4}
        />
        {presentation === undefined ? null : (
          <div
            style={{
              display: "flex",
              border: `1px solid ${presentation.label === "Translated replay" ? SIGNAL : RULE}`,
              color: presentation.label === "Translated replay" ? SIGNAL : MUTED,
              padding: "6px 14px",
              fontFamily: "Geist Mono",
              fontSize: 18,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            {presentation.synthetic ? `${presentation.label} · demo data` : presentation.label}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", width: "100%", height: 2, background: RULE }}>
          <div style={{ display: "flex", width: 180, height: 2, background: SIGNAL }} />
        </div>
        {presentation?.figure === undefined || quiet ? null : (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 34 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                fontSize: 128,
                lineHeight: 1,
                letterSpacing: "-0.05em",
              }}
            >
              {presentation.figure.value}
              {presentation.figure.minor === undefined ? null : (
                <span style={{ fontSize: 56, color: MUTED, letterSpacing: "-0.02em" }}>
                  {presentation.figure.minor}
                </span>
              )}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 16,
                fontFamily: "Geist Mono",
                fontSize: 19,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: MUTED,
              }}
            >
              {presentation.secondary === undefined
                ? presentation.figure.caption
                : `${presentation.figure.caption} · ${presentation.secondary.value} ${presentation.secondary.caption}`}
            </div>
          </div>
        )}
        {valueScope === undefined ? null : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 20,
              fontFamily: "Geist Mono",
              fontSize: 21,
              lineHeight: 1.35,
              color: valueScope.complete ? MUTED : INK,
            }}
          >
            <div style={{ display: "flex" }}>{`${valueScope.calls} priced`}</div>
            {valueScope.pricedTokenPercent === undefined ? null : (
              <div style={{ display: "flex", color: MUTED }}>
                {`${valueScope.pricedTokenPercent} of known processed tokens priced`}
              </div>
            )}
          </div>
        )}
        <div
          style={{
            display: "flex",
            marginTop: quiet ? 40 : valueScope === undefined ? 30 : 22,
            fontSize: quiet ? (long ? 40 : 48) : long ? 30 : 36,
            lineHeight: quiet ? 1.18 : 1.25,
            letterSpacing: quiet ? "-0.02em" : "-0.01em",
            maxWidth: 1040,
          }}
        >
          {headline}
        </div>
        {!quiet || presentation?.figure === undefined ? null : (
          <div
            style={{
              display: "flex",
              marginTop: 22,
              fontFamily: "Geist Mono",
              fontSize: 19,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: MUTED,
              maxWidth: 1040,
            }}
          >
            {`${presentation.figure.value} ${presentation.figure.caption}`}
          </div>
        )}
        {fact === undefined || valueScope?.complete === false ? null : (
          <div
            style={{
              display: "flex",
              marginTop: 14,
              fontSize: 24,
              lineHeight: 1.3,
              color: MUTED,
              maxWidth: 1040,
            }}
          >
            {`${fact.text} ${fact.comparison.charAt(0).toUpperCase()}${fact.comparison.slice(1)}.`}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          fontFamily: "Geist Mono",
          fontSize: 17,
          letterSpacing: "0.08em",
          color: MUTED,
        }}
      >
        <div style={{ display: "flex", maxWidth: 820 }}>{presentation?.context ?? ""}</div>
        <div style={{ display: "flex" }}>Aggregate data only</div>
      </div>
    </div>
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token: param } = await params;
  const resolved = await resolveShareParam(param);
  const decoded =
    resolved.kind === "token"
      ? await decodeAnyShareToken(resolved.token)
      : ({ ok: false } as const);
  const presentation = !decoded.ok
    ? undefined
    : decoded.snapshot.version === 2
      ? presentShare(decoded.snapshot)
      : presentV1(decoded.snapshot);
  return new ImageResponse(<Card presentation={presentation} />, {
    width: 1200,
    height: 630,
    fonts: shareImageFonts(),
    headers: {
      "cache-control": decoded.ok ? "public, max-age=31536000, immutable" : "public, max-age=60",
    },
  });
}
