import type { CSSProperties } from "react";
import type { PublicCard } from "@/lib/terminal-card";
import { cardMetrics, cardName, cardPeriod, cardTitle } from "@/lib/terminal-card";
import { compact } from "@/lib/terminal-presentation";
/** Fixed landscape geometry shared by the public page and its OG image. */
export function TerminalLandscape({
  card,
  legacy = false,
  synthetic = false,
}: {
  card: PublicCard;
  legacy?: boolean;
  synthetic?: boolean;
}) {
  const dark = card.theme === "dark",
    fg = dark ? "#eceee9" : "#121413",
    dim = dark ? "#8d9691" : "#5c625e",
    signal = dark ? "#ff6a1f" : "#e24e00",
    line = dark ? "#1c2022" : "#dedcd3";
  const absolute = (x: number, y: number, extra: CSSProperties = {}): CSSProperties => ({
    position: "absolute",
    left: x,
    top: y,
    display: "flex",
    ...extra,
  });
  return (
    <div
      style={{
        display: "flex",
        width: 1200,
        height: 630,
        position: "relative",
        background: dark ? "#08090a" : "#f3f2ed",
        color: fg,
        fontFamily: "Geist Mono",
        fontWeight: 500,
      }}
    >
      <div style={absolute(56, 35, { fontSize: 20, color: dim, gap: 14 })}>
        <span style={{ width: 18, height: 18, marginTop: 4, background: signal }} />
        <span>STACKREPLAY</span>
      </div>
      <div
        style={{
          position: "absolute",
          right: 56,
          top: 38,
          display: "flex",
          fontSize: 18,
          color: dim,
        }}
      >
        {legacy ? "SHARED RECAP" : cardPeriod(card)}
      </div>
      <div style={absolute(56, 95, { fontSize: 156, letterSpacing: "-.055em" })}>
        {cardTitle(card)}
      </div>
      <div style={absolute(56, 278, { fontSize: 22, color: dim })}>
        {card.totalTokens !== undefined ? "TOKENS OF AI CODING" : "YOUR AI CODING"}
      </div>
      {card.spark?.map((v, i) => (
        <div
          key={i}
          style={absolute(
            56 + i * (1088 / card.spark!.length),
            395 - Math.max(2, (v / 1000) * 72),
            {
              width: (1088 / card.spark!.length) * 0.7,
              height: Math.max(2, (v / 1000) * 72),
              background: signal,
            },
          )}
        />
      ))}
      {cardMetrics(card).map((m, i) => (
        <div
          key={m.label}
          style={absolute(56 + (i % 3) * 362.67, 438 + Math.floor(i / 3) * 70, {
            flexDirection: "column",
            borderTop: `1px solid ${line}`,
            width: 338,
            paddingTop: 4,
          })}
        >
          <span style={{ fontSize: 32 }}>{m.value}</span>
          <span style={{ fontSize: 14, color: dim, marginTop: 6 }}>{m.label}</span>
        </div>
      ))}
      {card.models && (
        <div style={absolute(56, 565, { fontSize: 14, color: dim, gap: 16 })}>
          {card.models.slice(0, 3).map((m) => (
            <span key={m.id}>
              {cardName(m.id)} {compact(m.tokenCount)}
            </span>
          ))}
        </div>
      )}
      <div style={absolute(56, 585, { fontSize: 16, color: dim })}>STACKREPLAY.COM</div>
      <div
        style={{
          position: "absolute",
          right: 56,
          top: 585,
          display: "flex",
          fontSize: 14,
          color: dim,
        }}
      >
        {synthetic ? "FICTIONAL SAMPLE · NOT A BILL" : "REPORTED USAGE · NOT A BILL"}
      </div>
    </div>
  );
}
