import { EVIDENCE_LABELS, type Evidence, type EvidenceLevel } from "@/lib/stack-analysis";

const TONE: Record<EvidenceLevel, string> = {
  measured: "stack-evidence-measured",
  published: "stack-evidence-published",
  likely: "stack-evidence-likely",
  estimated: "stack-evidence-estimated",
  unknown: "stack-evidence-unknown",
};

/** The trust word is always printed; tone only reinforces it. */
export function EvidenceWord({ level }: { level: EvidenceLevel }) {
  return (
    <span className={`stack-evidence-word ${TONE[level]}`} data-evidence={level}>
      {EVIDENCE_LABELS[level]}
    </span>
  );
}

export function EvidenceList({
  items,
  className,
}: {
  items: readonly Evidence[];
  className?: string | undefined;
}) {
  if (items.length === 0) return null;
  return (
    <ul className={`stack-evidence ${className ?? ""}`}>
      {items.map((item) => (
        <li key={`${item.level}:${item.text}`}>
          <EvidenceWord level={item.level} />
          <span>{item.text}</span>
        </li>
      ))}
    </ul>
  );
}
