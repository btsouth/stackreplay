import { sampleInsights, sampleRecap } from "@/lib/home/recap-sample";
import {
  compact,
  dollars,
  namedModelCount,
  presentation,
  tokenSplit,
} from "@/lib/terminal-presentation";
import { InsightStrip } from "./insights";
import { TightNumber } from "./primitives";
export function SamplePreview() {
  const recap = sampleRecap;
  const p = presentation(recap),
    max = Math.max(1, ...p.days.map((d) => d.total));
  const named = namedModelCount(recap);
  const split = tokenSplit(recap);
  return (
    <section className="sample-preview" aria-label="Sample overview preview">
      <div className="sample-heading label">SAMPLE · FICTIONAL HISTORY</div>
      <div className="sample-grid">
        <div className="cell">
          <div className="label">Total tokens</div>
          <div className="sample-number">
            <TightNumber value={compact(recap.total)} />
          </div>
          {split && <p className="label">{Math.round(split.cacheShare * 100)}% CACHED CONTEXT</p>}
          <p className="label">
            {recap.models.length} MODELS · {named} NAMED · {recap.sessions} SESSIONS
          </p>
        </div>
        <div className="cell">
          <div className="label">Tokens / day</div>
          <div className="sample-spark">
            {p.days.map((d) => (
              <i key={d.date} style={{ height: `${Math.max(2, (d.total / max) * 100)}%` }} />
            ))}
          </div>
        </div>
        <div className="cell">
          <div className="label">API value</div>
          <div className="sample-number sig">{dollars(recap.usd)}</div>
          <p className="label">ESTIMATE · NOT A BILL</p>
        </div>
      </div>
      <InsightStrip insights={sampleInsights} />
    </section>
  );
}
