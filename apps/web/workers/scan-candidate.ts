import type { BrowserCandidate } from "@stackreplay/adapters/browser";

/** File handles and metadata are cloned; readers are recreated in each Worker. */
export interface ScanFile {
  file: File;
  path: string;
  group?: string;
  readCost?: number;
}

export function scanCandidate(selected: ScanFile, preReadText?: string): BrowserCandidate {
  const { file, path, group } = selected;
  return {
    path,
    ...(group === undefined ? {} : { group }),
    size: file.size,
    lastModified: file.lastModified,
    readCost: selected.readCost ?? file.size,
    text: () => (preReadText === undefined ? file.text() : Promise.resolve(preReadText)),
    stream: () => file.stream(),
    peekText: (bytes) => file.slice(0, bytes).text(),
    arrayBuffer: () => file.arrayBuffer(),
  };
}
