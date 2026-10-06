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
        const parts = t.tight ? text.split(".") : [text];
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
