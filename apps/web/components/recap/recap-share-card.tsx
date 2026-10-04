import type { CSSProperties } from "react";
import { familyColors, type Recap, topRecapModels } from "@/lib/recap";
import { compactNumber, recapUsd } from "@/lib/recap-card";
/** The live counterpart to renderRecapCard: same recap, formatting and ranking. */
export function RecapShareCard({
  recap,
  progress = 1,
  sample = false,
}: {
  recap: Recap;
  progress?: number;
  sample?: boolean;
}) {
  return (
    <article
      className="replay-card"
      aria-label={sample ? "Fictional sample recap for Alex" : "Your share card preview"}
    >
      <div className="replay-card-top">
        <span>↺ StackReplay</span>
        <span>{sample ? "Alex’s replay" : "My coding recap"}</span>
      </div>
      <div className="replay-card-period">
        {recap.start} → {recap.end}
      </div>
      <div className="replay-card-total">
        <strong>{compactNumber(recap.total * progress)}</strong>
        <span>tokens processed</span>
      </div>
      <div className="replay-card-value">
        <strong>{recapUsd(String(Number(recap.usd) * progress))}</strong>
        <span>of AI coding at API prices</span>
      </div>
      <div className="replay-card-models">
        <div className="replay-card-model-heading">
          <span>Your most played</span>
          <span>Total tokens</span>
        </div>
        {topRecapModels(recap.models, 4).map((model, i) => (
          <div
            className="replay-card-model"
            key={model.id}
            style={
              {
                "--bar-color": familyColors[model.family],
                "--bar-width": `${(model.total / Math.max(1, recap.models[0]?.total ?? 1)) * 100}%`,
                "--bar-delay": `${i * 100}ms`,
              } as CSSProperties
            }
          >
            <div>
              <span>{model.name}</span>
              <span>{compactNumber(model.total)}</span>
            </div>
            <div className="replay-card-track">
              <i />
            </div>
          </div>
        ))}
      </div>
      <div className="replay-card-bottom">
        <span>{recap.sessions.toLocaleString()} sessions</span>
        <span>{recap.longestStreak} day streak</span>
        <span>{sample ? "Illustrative sample" : "Only in your browser"}</span>
      </div>
    </article>
  );
}
