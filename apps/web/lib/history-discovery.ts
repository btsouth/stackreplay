"use client";

import {
  type DiscoveryDirectory,
  type DiscoveryFile,
  type DiscoveryPlatform,
  discoveryPlatformFromHint,
} from "@stackreplay/adapters/discovery";

/**
 * Browser side of history discovery.
 *
 * A dropped folder arrives as a File and Directory Entries API entry. Unlike a
 * directory handle, a dropped home folder is not refused by the browser, and
 * unlike a folder chooser it is not listed up front: the page can ask it for
 * one named child at a time, which is exactly the contract discovery needs.
 * Symbolic links stay invisible through this API, so a linked history folder
 * surfaces as "additional access required" and goes to the folder chooser.
 */

/** A dropped file: its size comes from the File the browser hands over, which is not read. */
export class EntryFile implements DiscoveryFile {
  private resolved: Promise<File> | undefined;

  constructor(private readonly entry: FileSystemFileEntry) {}

  get name(): string {
    return this.entry.name;
  }

  file(): Promise<File> {
    this.resolved ??= new Promise<File>((resolve, reject) => this.entry.file(resolve, reject));
    return this.resolved;
  }

  async size(): Promise<number | undefined> {
    try {
      return (await this.file()).size;
    } catch {
      return undefined;
    }
  }
}

/** One path component: discovery never asks the browser for a nested path in one call. */
function singleComponent(name: string): boolean {
  return name.length > 0 && name !== "." && name !== ".." && !/[\\/]/u.test(name);
}

function lookup<T extends FileSystemEntry>(
  run: (ok: (entry: T) => void, fail: (error: DOMException) => void) => void,
): Promise<T | null> {
  return new Promise((resolve) => {
    try {
      run(resolve, () => resolve(null));
    } catch {
      resolve(null);
    }
  });
}

export function entryDirectory(entry: FileSystemDirectoryEntry): DiscoveryDirectory<EntryFile> {
  return {
    name: entry.name,
    async directory(name) {
      if (!singleComponent(name)) return null;
      const child = await lookup<FileSystemDirectoryEntry>((ok, fail) =>
        entry.getDirectory(name, {}, (found) => ok(found as FileSystemDirectoryEntry), fail),
      );
      return child?.isDirectory === true ? entryDirectory(child) : null;
    },
    async file(name) {
      if (!singleComponent(name)) return null;
      const child = await lookup<FileSystemFileEntry>((ok, fail) =>
        entry.getFile(name, {}, (found) => ok(found as FileSystemFileEntry), fail),
      );
      return child?.isFile === true ? new EntryFile(child) : null;
    },
    async list() {
      const reader = entry.createReader();
      const directories: DiscoveryDirectory<EntryFile>[] = [];
      const files: EntryFile[] = [];
      // Browsers return entries in batches; an empty batch ends the listing.
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((resolve) =>
          reader.readEntries(resolve, () => resolve([])),
        );
        if (batch.length === 0) break;
        for (const child of batch) {
          if (child.isDirectory)
            directories.push(entryDirectory(child as FileSystemDirectoryEntry));
          else if (child.isFile) files.push(new EntryFile(child as FileSystemFileEntry));
        }
      }
      return { directories, files };
    },
  };
}

/** A file from the folder chooser: the browser already holds it, so nothing is read here. */
export class ChosenFile implements DiscoveryFile {
  constructor(private readonly handle: File) {}

  get name(): string {
    return this.handle.name;
  }

  file(): Promise<File> {
    return Promise.resolve(this.handle);
  }

  async size(): Promise<number> {
    return this.handle.size;
  }
}

interface ChosenNode {
  name: string;
  folders: Map<string, ChosenNode>;
  files: Map<string, File>;
}

function chosenDirectory(node: ChosenNode): DiscoveryDirectory<ChosenFile> {
  return {
    name: node.name,
    async directory(name) {
      const child = node.folders.get(name);
      return child === undefined ? null : chosenDirectory(child);
    },
    async file(name) {
      const child = node.files.get(name);
      return child === undefined ? null : new ChosenFile(child);
    },
    async list() {
      return {
        directories: [...node.folders.values()].map(chosenDirectory),
        files: [...node.files.values()].map((file) => new ChosenFile(file)),
      };
    },
  };
}

/**
 * A folder picked with the folder chooser, as the same discovery interface a
 * drop gives: the chooser has already handed the page this folder's files, so
 * recognizing what the folder is follows exactly the same rules as a drop.
 */
export function chosenFolder(files: readonly File[]): DiscoveryDirectory<ChosenFile> | undefined {
  const root: ChosenNode = { name: "", folders: new Map(), files: new Map() };
  for (const file of files) {
    const parts = (file.webkitRelativePath ?? "").split("/").filter((part) => part.length > 0);
    const name = parts.at(-1);
    if (parts.length < 2 || name === undefined) continue;
    root.name ||= parts[0] ?? "";
    let node = root;
    for (const part of parts.slice(1, -1)) {
      let next = node.folders.get(part);
      if (next === undefined) {
        next = { name: part, folders: new Map(), files: new Map() };
        node.folders.set(part, next);
      }
      node = next;
    }
    node.files.set(name, file);
  }
  return root.name === "" ? undefined : chosenDirectory(root);
}

/**
 * The folders in a drop. Must run inside the drop handler: browsers empty the
 * data transfer when the event ends. Dropped files are counted, not kept.
 */
export function droppedFolders(transfer: DataTransfer | null): {
  folders: FileSystemDirectoryEntry[];
  files: number;
} {
  const folders: FileSystemDirectoryEntry[] = [];
  let files = 0;
  for (const item of Array.from(transfer?.items ?? [])) {
    if (item.kind !== "file") continue;
    const entry = item.webkitGetAsEntry?.() ?? null;
    if (entry?.isDirectory === true) folders.push(entry as FileSystemDirectoryEntry);
    else files += 1;
  }
  return { folders, files };
}

/**
 * Whether folder drag-and-drop discovery fits this device: the browser exposes
 * dropped folders and some pointer can drag one. Phones and tablets have no
 * home folder to drag, so they get the folder chooser instead.
 */
export function supportsDropDiscovery(): boolean {
  if (typeof window === "undefined" || typeof DataTransferItem === "undefined") return false;
  if (!("webkitGetAsEntry" in DataTransferItem.prototype)) return false;
  return window.matchMedia("(any-pointer: fine)").matches;
}

/** The browser's platform, as a hint for ordering and wording. Never authoritative. */
export function platformHint(): DiscoveryPlatform | undefined {
  if (typeof navigator === "undefined") return undefined;
  const data = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  return (
    discoveryPlatformFromHint(data?.platform || undefined) ??
    discoveryPlatformFromHint(navigator.platform || undefined) ??
    discoveryPlatformFromHint(navigator.userAgent)
  );
}

/** Where the user folder is, in the words of each platform's file manager. */
export function userFolderHint(platform: DiscoveryPlatform | undefined): string {
  if (platform === "windows")
    return "In File Explorer, open C:\\Users and drag the folder with your name.";
  if (platform === "macos") return "In Finder, drag your home folder (the house) from the sidebar.";
  if (platform === "linux") return "In your file manager, drag Home from the sidebar.";
  return "Drag the folder that holds your AI tools' hidden folders, usually your home folder.";
}

/* ---------- remembered connections ---------- */

/**
 * Which histories were connected last time, so a return visit can offer to
 * refresh them. Only tool names and counts: no folder, path or file name. The
 * browser keeps no folder access between visits, so refreshing always asks for
 * a new drop or folder choice.
 */
export interface RememberedConnection {
  id: string;
  name: string;
  via: "discovery" | "chooser";
}

export interface RememberedConnections {
  sources: RememberedConnection[];
  at: string;
}

const CONNECTIONS_KEY = "stackreplay.connections.v1";

export function readConnections(): RememberedConnections | undefined {
  try {
    const raw = window.localStorage.getItem(CONNECTIONS_KEY);
    if (raw === null) return undefined;
    const parsed = JSON.parse(raw) as Partial<RememberedConnections>;
    if (!Array.isArray(parsed.sources) || typeof parsed.at !== "string") return undefined;
    const sources = parsed.sources.filter(
      (source): source is RememberedConnection =>
        typeof source === "object" &&
        source !== null &&
        typeof source.id === "string" &&
        typeof source.name === "string" &&
        (source.via === "discovery" || source.via === "chooser"),
    );
    return sources.length === 0 ? undefined : { sources: sources.slice(0, 12), at: parsed.at };
  } catch {
    return undefined;
  }
}

export function rememberConnections(sources: RememberedConnection[], at: string): void {
  try {
    window.localStorage.setItem(CONNECTIONS_KEY, JSON.stringify({ sources, at }));
  } catch {
    /* A browser without storage just offers discovery again next time. */
  }
}

export function forgetConnections(): void {
  try {
    window.localStorage.removeItem(CONNECTIONS_KEY);
  } catch {
    /* Nothing was stored. */
  }
}
