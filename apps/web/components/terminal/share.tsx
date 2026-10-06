"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Recap } from "@/lib/recap";
import {
  CARD_SIZES,
  type CardFormat,
  type CardSelections,
  type CardToggle,
  DEFAULT_SELECTIONS,
  drawCard,
  makeCard,
  type PublicCard,
  renderTerminalCard,
} from "@/lib/terminal-card";
import { presentation } from "@/lib/terminal-presentation";
import type { PaidFigure } from "@/lib/use-paid-multiplier";

function CardPreview({
  card,
  format,
  speeds,
}: {
  card: PublicCard;
  format: CardFormat;
  speeds: { name: string; median: number }[];
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let active = true;
    void document.fonts.ready.then(() => {
      if (active && ref.current) drawCard(ref.current, card, format, speeds);
    });
    return () => {
      active = false;
    };
  }, [card, format, speeds]);
  return (
    <canvas
      ref={ref}
      className="card-canvas"
      width={CARD_SIZES[format][0]}
      height={CARD_SIZES[format][1]}
      role="img"
      aria-label={`${format} share card preview`}
    />
  );
}
export function TerminalShare({
  recap,
  paid,
  github,
  synthetic,
  previewOnly = false,
}: {
  recap: Recap;
  paid?: PaidFigure | undefined;
  github?: number | undefined;
  synthetic?: boolean | undefined;
  previewOnly?: boolean;
}) {
  const [selected, setSelected] = useState<CardSelections>(DEFAULT_SELECTIONS),
    [theme, setTheme] = useState<"dark" | "light">("dark"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string>(),
    [href, setHref] = useState<string>();
  useEffect(() => {
    const refresh = () =>
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  const card = useMemo(
    () => makeCard(recap, selected, theme, paid, github),
    [recap, selected, theme, paid, github],
  );
  const speeds = useMemo(() => {
    const p = presentation(recap);
    return selected.speed
      ? p.speeds.map((s) => ({ name: p.names.get(s.id) ?? "Unreported model", median: s.median }))
      : [];
  }, [recap, selected.speed]);
  const toggles: [CardToggle, string][] = [
    ["tokens", "Total tokens"],
    ["usd", "API value"],
    ["speed", "Speed"],
    ["github", "GitHub"],
    ["streak", "Streak"],
    ["models", "Top models"],
    ["peakHour", "Peak hour"],
    ["paidMultiplier", "What you paid"],
  ];
  async function download(format: CardFormat) {
    setBusy(true);
    setError(undefined);
    try {
      const blob = await renderTerminalCard(card, format, speeds);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stackreplay-${format}-${CARD_SIZES[format].join("x")}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Image download failed. Try again.");
    } finally {
      setBusy(false);
    }
  }
  async function share() {
    setBusy(true);
    setError(undefined);
    try {
      const [{ encodeShareTokenV2 }, { terminalShareV2 }] = await Promise.all([
        import("@stackreplay/share"),
        import("@/lib/share-v2"),
      ]);
      const token = await encodeShareTokenV2(terminalShareV2(card, synthetic));
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (!response.ok || typeof data.path !== "string")
        throw Error(data.error ?? "Could not create a share link.");
      setHref(data.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create a share link.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="sharegrid">
        {(["landscape", "square", "story"] as const).map((format) => (
          <div key={format}>
            <CardPreview card={card} format={format} speeds={speeds} />
            <div className="fmt">
              <span>
                {format.toUpperCase()} · {CARD_SIZES[format].join(" × ")}
              </span>
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => void download(format)}
              >
                Download {format} PNG
              </button>
            </div>
          </div>
        ))}
      </div>
      {!previewOnly && (
        <>
          <fieldset className="toggles" aria-label="Card stats">
            {toggles.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`tg${selected[key] ? " on" : ""}`}
                aria-pressed={selected[key]}
                aria-label={label.toUpperCase()}
                disabled={
                  (key === "paidMultiplier" && !paid) || (key === "github" && github === undefined)
                }
                onClick={() => {
                  setSelected((old) => ({ ...old, [key]: !old[key] }));
                  setHref(undefined);
                }}
              >
                {label.toUpperCase()}
              </button>
            ))}
          </fieldset>
          <div className="card-actions">
            <button
              type="button"
              className="btn primary"
              data-testid="recap-share-create"
              disabled={busy}
              onClick={() => void share()}
            >
              Create share link
            </button>
            {href && (
              <Link className="btn" href={href} data-testid="recap-share-open">
                Open shared recap ↗
              </Link>
            )}
            <p>Creating a link uploads only the selected card numbers.</p>
          </div>
        </>
      )}
      {previewOnly && (
        <div className="card-actions">
          <Link href="/app/scan" className="btn primary">
            Make yours ↗
          </Link>
        </div>
      )}
      {error && (
        <p role="alert" className="share-error">
          {error}
        </p>
      )}
    </>
  );
}
