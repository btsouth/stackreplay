import { buildArchetypeExport } from "@stackreplay/test-fixtures";
import { buildRecap } from "@/lib/recap";
import { compact, dollars, presentation } from "@/lib/terminal-presentation";
import { TightNumber } from "./primitives";
export function SamplePreview() {
  const recap = buildRecap(
    buildArchetypeExport("mixed").events,
    "all",
    "2026-09-24T12:00:00Z",
    "UTC",
  );
  const p = presentation(recap),
    max = Math.max(1, ...p.days.map((d) => d.total));
  return (
    <section className="sample-preview" aria-label="Sample overview preview">
      <div className="sample-heading label">SAMPLE · FICTIONAL HISTORY</div>
      <div className="sample-grid">
        <div className="cell">
          <div className="label">Total tokens</div>
          <div className="sample-number">
            <TightNumber value={compact(recap.total)} />
          </div>
          <p className="label">
            {recap.models.length} MODELS · {recap.sessions} SESSIONS
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
    </section>
  );
}
