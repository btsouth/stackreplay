import type { AdapterId } from "./types.js";

/**
 * History discovery contract.
 *
 * Each adapter declares where its tool keeps local history, as path components
 * below the user's home or profile folder. Discovery probes exactly those
 * components under a folder the user chose, one named child at a time, so it
 * can say what exists without ever listing the chosen folder itself.
 */

/** Platform families a location is documented for. A hint for ordering, never a filter. */
export type DiscoveryPlatform = "linux" | "macos" | "windows";

/**
 * A place below the user's home or profile folder. Components, never a joined
 * string, so the same entry resolves under a Unix home, a Windows profile, or
 * a WSL home connected on its own.
 */
export interface KnownLocation {
  path: readonly string[];
  kind: "directory" | "file";
  /** Platforms whose tool documentation or code establishes this location. */
  platforms: readonly DiscoveryPlatform[];
}

/** A child that must exist, checked by its exact name. */
export interface ChildMarker {
  name: string;
  kind: "file" | "directory";
}

/**
 * A folder recognized by its own children when it is supplied directly under a
 * name the registry does not know, such as a custom `CODEX_HOME` or a copied
 * OpenCode data folder. Every marker is checked by exact name; nothing is listed.
 * The markers must establish the tool positively: names another tool also
 * writes (`projects`, `sessions`, `history.jsonl`) need a tool-only name in
 * `anyOf` beside them.
 */
export interface RootSignature {
  requires: readonly ChildMarker[];
  /** At least one of these must exist too: names only this tool writes. */
  anyOf?: readonly ChildMarker[];
  /** Where the history is below the recognized folder; empty when it is the folder itself. */
  history: readonly string[];
  kind: "directory" | "file";
}

export interface SourceDiscovery {
  adapterId: AdapterId;
  name: string;
  /** Where the tool writes the history StackReplay reads. */
  history: readonly KnownLocation[];
  /**
   * Evidence that the tool is installed even when its history is not visible.
   * A linked or relocated history folder then needs additional access instead
   * of being reported absent.
   */
  installed: readonly KnownLocation[];
  /**
   * What inventory may list inside a found history folder: how many folder
   * levels below it (the history folder itself is level 0) and which files
   * count. Absent when the history is a single database file.
   */
  inventory?: {
    maxDepth: number;
    extension: string;
    /** Sidecar files beside the history that are never collected. */
    excludeSuffixes?: readonly string[];
  };
  /** Folders recognized by their children when supplied under another name. */
  roots?: readonly RootSignature[];
  /** Environment variable that moves the history elsewhere. */
  relocatedBy?: string;
  /** Documentation or source code that establishes these locations. */
  evidence: readonly string[];
}
