/**
 * Local project labels.
 *
 * A normalized workload identifies projects by a salted hash only, so an export
 * never carries a repository name. The person who scanned their own history
 * still wants to read "StackReplay" rather than `ph_3a9f…` on their own
 * screen, so the browser intake derives a short label while the raw key is in
 * hand and keeps only that label, next to the hash, in local storage.
 *
 * The label is the folder's basename. Two different folders with the same
 * basename get their parent folder appended with a separator that is not a
 * path separator, so no label ever reads as, or reconstructs, a full path.
 */

export interface LocalProjectLabel {
  /** The salted project hash carried by the workload's events. */
  hash: string;
  /** Short, path-free label for local display only. */
  label: string;
}

const MAX_LABEL_LENGTH = 80;

function segmentsOf(key: string): string[] {
  return key.split(/[\\/]+/u).filter((part) => part.length > 0 && part !== ".");
}

function clean(text: string): string {
  return Array.from(text, (character) => {
    const code = character.codePointAt(0) ?? 0;
    return code < 32 || code === 127 ? " " : character;
  })
    .join("")
    .trim();
}

function labelAt(parts: readonly string[], depth: number): string {
  const tail = parts.slice(-depth).reverse().map(clean);
  const text = tail.filter((part) => part.length > 0).join(" · ");
  return text.length === 0 ? "Unnamed folder" : text.slice(0, MAX_LABEL_LENGTH);
}

/**
 * Derives one label per project hash. Deterministic: the same keys always
 * produce the same labels, ordered by hash.
 */
export function localProjectLabels(keys: ReadonlyMap<string, string>): LocalProjectLabel[] {
  const entries = [...keys]
    .map(([hash, key]) => ({ hash, parts: segmentsOf(key), depth: 1 }))
    .sort((a, b) => (a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0));
  for (let round = 0; round < 3; round += 1) {
    const byLabel = new Map<string, typeof entries>();
    for (const entry of entries) {
      const label = labelAt(entry.parts, entry.depth);
      byLabel.set(label, [...(byLabel.get(label) ?? []), entry]);
    }
    let changed = false;
    for (const group of byLabel.values()) {
      if (group.length < 2) continue;
      for (const entry of group) {
        if (entry.depth < entry.parts.length) {
          entry.depth += 1;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  const seen = new Map<string, number>();
  return entries.map((entry) => {
    const base = labelAt(entry.parts, entry.depth);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return { hash: entry.hash, label: count === 1 ? base : `${base} #${count}` };
  });
}
