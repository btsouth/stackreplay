import type { SharePresentation } from "@/lib/share-presentation";

/**
 * A V2 share as a page shows it: the same verdict block the application leads
 * a result with (`.sr-verdict`), so a shared result reads as StackReplay and
 * not as a generic card. Used by the public page and the share panel's preview.
 */
export function ShareCardV2({
  presentation,
  heading = "h2",
  testId = "share-card-v2",
}: {
  presentation: SharePresentation;
  /** The public page's headline is its h1; the panel preview's is not. */
  heading?: "h1" | "h2";
  testId?: string;
}) {
  const Heading = heading;
  const translated = presentation.label === "Translated replay";
  const boundary = presentation.headline.search(/(?<=[.;])\s(?=[A-Z])/u);
  const lead = boundary === -1 ? presentation.headline : presentation.headline.slice(0, boundary);
  const rest = boundary === -1 ? "" : presentation.headline.slice(boundary + 1);
  return (
    <article
      aria-labelledby={`${testId}-headline`}
      className="sr-verdict"
      data-kind={presentation.kind}
      data-testid={testId}
      data-weight={presentation.weight}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span
          className={`sr-mode ${translated ? "sr-mode--translated" : ""}`}
          data-testid="share-mode"
        >
          {presentation.label}
        </span>
        <span className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase [overflow-wrap:anywhere]">
          {presentation.context}
        </span>
      </div>
      <div className="sr-verdict-body">
        <Heading
          className="sr-verdict-headline"
          data-testid="share-headline"
          id={`${testId}-headline`}
        >
          {lead}
          {rest === "" ? null : <span className="sr-verdict-rest"> {rest}</span>}
        </Heading>
        {presentation.figure === undefined ? null : (
          <div className="sr-verdict-figures">
            <p className="sr-figure" data-testid="share-figure">
              {presentation.figure.value}
              {presentation.figure.minor === undefined ? null : (
                <small className="sr-figure-minor">{presentation.figure.minor}</small>
              )}
            </p>
            <p className="sr-micro sr-caption" data-testid="share-figure-caption">
              {presentation.figure.caption}
            </p>
            {presentation.secondary === undefined ? null : (
              <p className="sr-verdict-secondary">
                <strong>{presentation.secondary.value}</strong>
                <span className="sr-micro text-muted-foreground">
                  {presentation.secondary.caption}
                </span>
              </p>
            )}
          </div>
        )}
      </div>
      {presentation.support.length === 0 ? null : (
        <ul className="sr-verdict-support" data-testid="share-support">
          {presentation.support.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      {presentation.tools.length < 2 ? null : (
        <div className="flex max-w-xl flex-col gap-2" data-testid="share-tools">
          <div aria-hidden="true" className="flex h-1.5 w-full gap-0.5">
            {presentation.tools.map((tool, index) => (
              <span
                key={tool.name}
                className="h-full bg-foreground"
                style={{ width: `${tool.share * 100}%`, opacity: 0.85 - index * 0.25 }}
              />
            ))}
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {presentation.tools
              .map((tool) => `${tool.name} ${(tool.share * 100).toFixed(1)}%`)
              .join(" · ")}
          </p>
        </div>
      )}
      {presentation.facts.length === 0 ? null : (
        <ol className="grid gap-x-8 gap-y-4 lg:grid-cols-3" data-testid="share-facts">
          {presentation.facts.map((fact, index) => (
            <li
              key={fact.text}
              className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2 border-t border-border pt-3"
            >
              <span className="font-mono text-xs text-accent">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-base leading-snug text-foreground">{fact.text}</p>
                {fact.comparison === "" ? null : (
                  <p className="text-sm text-muted-foreground">{fact.comparison}.</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
