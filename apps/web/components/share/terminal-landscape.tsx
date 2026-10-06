import { cardLayout, type PublicCard } from "@/lib/terminal-card";
/** Uses the same non-overlapping regions as the browser's landscape export. */
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
    signal = dark ? "#ff6a1f" : "#e24e00";
  const layout = cardLayout(card, "landscape");

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
      <svg
        aria-hidden="true"
        width={1200}
        height={378}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <defs>
          <pattern id="terminal-grid" width={40} height={40} patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 H 0 V 40"
              fill="none"
              stroke={dark ? "#1c2022" : "#dedcd3"}
              strokeWidth={1}
            />
          </pattern>
        </defs>
        <rect width={1200} height={378} fill="url(#terminal-grid)" />
      </svg>
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 56,
          top: 39,
          width: 18,
          height: 18,
          background: signal,
        }}
      />
      {[...layout.bars, ...layout.activityBars].map((bar) => (
        <div
          key={bar.id}
          style={{
            display: "flex",
            position: "absolute",
            left: bar.x,
            top: bar.y,
            width: bar.width,
            height: bar.height,
            background: bar.color,
          }}
        />
      ))}
      {layout.texts.map((t) => {
        const text =
          t.id === "period" && legacy
            ? "SHARED RECAP"
            : t.id === "footer-note" && synthetic
              ? "FICTIONAL SAMPLE · NOT A BILL"
              : t.text;
        if (t.lines && t.lines.length > 1) {
          const longest = Math.max(...t.lines.map((line) => line.length));
          const size = Math.min(t.size, t.width / Math.max(1, longest * 0.5));
          return (
            <div
              key={t.id}
              style={{
                display: "flex",
                flexDirection: "column",
                position: "absolute",
                left: t.x,
                top: t.y,
                width: t.width,
                fontFamily: t.font === "sans" ? "Geist Sans" : "Geist Mono",
                fontSize: size,
                lineHeight: 1.16,
                color: t.color ?? (t.signal ? signal : t.dim ? dim : fg),
              }}
            >
              {t.lines.map((line) => (
                <span key={line} style={{ display: "flex" }}>
                  {line}
                </span>
              ))}
            </div>
          );
        }
        const size = Math.min(
          t.size,
          t.width / Math.max(1, text.length * (t.font === "sans" ? 0.56 : 0.6)),
        );
        // Geist's server font subset does not contain the square glyph. Draw
        // the color swatch directly so the social PNG matches the canvas legend.
        const legend = text.startsWith("■ ");
        const label = legend ? text.slice(2) : text;
        const parts = t.tight ? label.split(".") : [label];
        return (
          <div
            key={t.id}
            style={{
              display: "flex",
              position: "absolute",
              left: t.align === "right" ? t.x - t.width : t.x,
              top: t.y,
              width: t.width,
              justifyContent: t.align === "right" ? "flex-end" : "flex-start",
              fontFamily: t.font === "sans" ? "Geist Sans" : "Geist Mono",
              fontSize: size,
              lineHeight: 1,
              color: t.color ?? (t.signal ? signal : t.dim ? dim : fg),
            }}
          >
            {legend && (
              <span
                style={{
                  display: "flex",
                  width: size * 0.5,
                  height: size * 0.5,
                  marginTop: size * 0.25,
                  marginRight: size * 0.7,
                  background: t.color,
                }}
              />
            )}
            <span style={{ display: "flex" }}>{parts[0]}</span>
            {parts.length > 1 && (
              <span style={{ display: "flex" }}>
                <span style={{ marginLeft: "-0.12em", marginRight: "-0.12em" }}>.</span>
                {parts[1]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
