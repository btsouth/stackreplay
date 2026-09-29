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

interface Entry {
  hash: string;
  parts: string[];
  /** Ancestor folder names that tell this project apart, nearest first. */
  extra: string[];
  /** The next ancestor depth to look at (2 is the parent). */
  next: number;
}

function labelOf(entry: Entry): string {
  const base = clean(entry.parts.at(-1) ?? "");
  const text = [base, ...entry.extra.map(clean)].filter((part) => part.length > 0).join(" · ");
  return text.length === 0 ? "Unnamed folder" : text.slice(0, MAX_LABEL_LENGTH);
}

/**
 * Derives one label per project hash. Deterministic: the same keys always
 * produce the same labels, ordered by hash.
 *
 * Folders that share a name are told apart by the nearest ancestor whose name
 * differs between them, and only that one: `app · work` and `app · personal`,
 * not `app · projects · work` when both sit in a `projects` folder.
 */
export function localProjectLabels(keys: ReadonlyMap<string, string>): LocalProjectLabel[] {
  const entries: Entry[] = [...keys]
    .map(([hash, key]) => ({ hash, parts: segmentsOf(key), extra: [], next: 2 }))
    .sort((a, b) => (a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0));
  for (let round = 0; round < 3; round += 1) {
    const byLabel = new Map<string, Entry[]>();
    for (const entry of entries) {
      const label = labelOf(entry);
      byLabel.set(label, [...(byLabel.get(label) ?? []), entry]);
    }
    let changed = false;
    for (const group of byLabel.values()) {
      if (group.length < 2) continue;
      const deepest = Math.max(...group.map((entry) => entry.parts.length));
      let depth = Math.max(...group.map((entry) => entry.next));
      while (
        depth <= deepest &&
        new Set(group.map((entry) => entry.parts.at(-depth) ?? "")).size < 2
      )
        depth += 1;
      if (depth > deepest) continue;
      for (const entry of group) {
        const name = entry.parts.at(-depth);
        if (name !== undefined) entry.extra.push(name);
        entry.next = depth + 1;
      }
      changed = true;
    }
    if (!changed) break;
  }
  const seen = new Map<string, number>();
  return entries.map((entry) => {
    const base = labelOf(entry);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return { hash: entry.hash, label: count === 1 ? base : `${base} #${count}` };
  });
}
