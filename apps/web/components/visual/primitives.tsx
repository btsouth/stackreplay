"use client";

import Link from "next/link";
import { type ReactNode, useId, useState } from "react";
import { tokenSize } from "@/lib/model-specifications";
import { formatRate } from "@/lib/price-table";
import type { VisualBenchmark, VisualModel } from "@/lib/visual-model-data";

export const money = (value: string | undefined) => (value === undefined ? "–" : formatRate(value));
export const tokens = (value: number | undefined) => (value === undefined ? "–" : tokenSize(value));
const labs = [
  "amazon",
  "anthropic",
  "cohere",
  "cursor",
  "deepseek",
  "google",
  "z-ai",
  "openai",
  "x-ai",
  "tencent",
  "thinking-machines",
  "moonshot",
  "poolside",
  "meta",
  "meituan",
  "microsoft",
  "xiaomi",
  "minimax",
  "mistral",
  "nvidia",
  "alibaba",
  "stepfun",
];
export const labColor = (lab: string) => `var(--lab-${labs.includes(lab) ? lab : "other"})`;
export const compareHref = (ids: readonly string[]) =>
  `/compare/models?models=${ids.map(encodeURIComponent).join(",")}`;

export function Info({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <details className="v-info">
      <summary aria-label={label} aria-controls={id}>
        i
      </summary>
      <div id={id} className="v-popover">
        {children}
      </div>
    </details>
  );
}
export function ModelInfo({ model }: { model: VisualModel }) {
  return (
    <Info label={`Sources and conditions for ${model.name}`}>
      <strong>{model.name}</strong>
      {model.details.map((detail) => (
        <p key={detail}>{detail}</p>
      ))}
      {model.sources.map((source) => (
        <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
          {source.title} ↗
        </a>
      ))}
    </Info>
  );
}
export function BenchmarkInfo({
  benchmark,
  ids,
}: {
  benchmark: VisualBenchmark;
  ids?: readonly string[];
}) {
  const scores = ids
    ? ids.flatMap((id) => (benchmark.scores[id] ? [benchmark.scores[id]] : []))
    : Object.values(benchmark.scores);
  return (
    <Info label={`Evidence for ${benchmark.name}`}>
      <strong>{benchmark.name}</strong>
      <p>{benchmark.description}</p>
      <p>
        Reported results may use different harnesses, effort or tools. Numerical leaders do not
        imply matched evaluation conditions.
      </p>
      {scores.map((score) => (
        <div key={score.modelId}>
          <a href={score.sourceUrl} target="_blank" rel="noreferrer">
            {score.modelId} · {score.evaluator}: {score.displayValue} ↗
          </a>
          <p>
            {[
              score.evidenceClass.replaceAll("_", " "),
              score.harness,
              score.effort,
              score.tools,
              score.notes,
              score.uncertainty,
              `Checked ${score.checkedAt}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      ))}
      <Link href="/benchmarks">Full evidence and methodology →</Link>
    </Info>
  );
}
export function Picker({
  models,
  onPick,
  disabled = false,
  label = "Search models to compare",
  exclude = [],
}: {
  models: VisualModel[];
  onPick: (id: string) => void;
  disabled?: boolean;
  label?: string;
  exclude?: string[];
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const id = useId();
  const matches = models
    .filter(
      (model) =>
        !exclude.includes(model.id) &&
        `${model.name} ${model.developer}`.toLowerCase().includes(query.toLowerCase()),
    )
    .slice(0, 7);
  return (
    <div className="v-picker">
      <span aria-hidden="true" className="v-search-icon">
        ⌕
      </span>
      <input
        aria-label={label}
        placeholder={disabled && exclude.length >= 4 ? "Four models selected" : label}
        disabled={disabled}
        value={query}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) setFocused(false);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setFocused(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setFocused(false);
          if (event.key === "Enter" && matches[0]) {
            onPick(matches[0].id);
            setQuery("");
            setFocused(false);
          }
        }}
      />
      {focused && (
        <div id={id} className="v-picker-results">
          {matches.map((model) => (
            <button
              type="button"
              key={model.id}
              onClick={() => {
                onPick(model.id);
                setQuery("");
                setFocused(false);
              }}
            >
              <span>
                <i style={{ background: labColor(model.lab) }} />
                {model.name}
              </span>
              <small>{model.developer}</small>
            </button>
          ))}
          {matches.length === 0 && <p>No matching models</p>}
        </div>
      )}
    </div>
  );
}
export function Bars({
  items,
  format,
  max,
  detail,
}: {
  items: { model: VisualModel; value: number }[];
  format: (value: number) => string;
  max?: number | undefined;
  detail?: ((model: VisualModel) => string) | undefined;
}) {
  const ceiling = max ?? (Math.max(...items.map((item) => item.value)) || 1);
  return (
    <div className="v-bars">
      {items.map(({ model, value }) => (
        <Link href={compareHref([model.id])} className="v-bar-row" key={model.id}>
          <span className="v-bar-label">
            {model.name}
            {detail && <small>{detail(model)}</small>}
          </span>
          <strong>{format(value)}</strong>
          <span className="v-bar-track">
            <span
              style={{ width: `${(value / ceiling) * 100}%`, background: labColor(model.lab) }}
            />
          </span>
        </Link>
      ))}
    </div>
  );
}
