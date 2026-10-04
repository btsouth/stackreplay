import {
  type Datable,
  eventsInCategory,
  type MarketEventCategory,
  type MarketEventType,
} from "@stackreplay/market-events/feed";

export const UPDATE_CATEGORIES = [
  "all",
  "models",
  "benchmarks",
  "subscriptions",
  "pricing",
] as const;
export type UpdateCategory = MarketEventCategory | "all";
export interface UpdateSelection {
  providerId: string | null;
  category: UpdateCategory;
  providerRecognized: boolean;
}
export type UpdateSearch = Record<string, string | string[] | undefined>;
export interface UpdateProvider {
  id: string;
  name: string;
}

type Search = UpdateSearch | Pick<URLSearchParams, "get">;
function first(search: Search, key: string): string | undefined {
  if ("get" in search && typeof search.get === "function") return search.get(key) ?? undefined;
  const value = (search as UpdateSearch)[key];
  return Array.isArray(value) ? value[0] : value;
}

/** Unknown owners remain a restriction, rather than broadening to all providers. */
export function parseUpdateSelection(
  search: Search,
  providers: readonly UpdateProvider[],
): UpdateSelection {
  const provider = first(search, "provider");
  const providerId = !provider || provider === "all" ? null : provider;
  const type = first(search, "type");
  return {
    providerId,
    category: UPDATE_CATEGORIES.includes(type as UpdateCategory) ? (type as UpdateCategory) : "all",
    providerRecognized: providerId === null || providers.some((entry) => entry.id === providerId),
  };
}

/** Owned parameters are emitted once, provider then type. Unrelated parameters survive. */
export function updateSearch(selection: UpdateSelection, existing = ""): string {
  const params = new URLSearchParams(existing);
  params.delete("provider");
  params.delete("type");
  const owned = new URLSearchParams();
  if (selection.providerId !== null) owned.set("provider", selection.providerId);
  if (selection.category !== "all") owned.set("type", selection.category);
  for (const [key, value] of params) owned.append(key, value);
  const query = owned.toString();
  return query ? `?${query}` : "";
}
export function updateListHref(selection: UpdateSelection, existing = "", hash = ""): string {
  return `/changelog${updateSearch(selection, existing)}${hash}`;
}
export function marketEventHref(eventId: string): string {
  return `/changelog/${encodeURIComponent(eventId)}`;
}

export function selectUpdates<T extends Datable & { type: MarketEventType; providerId: string }>(
  events: readonly T[],
  selection: UpdateSelection,
): T[] {
  if (!selection.providerRecognized) return [];
  const owned =
    selection.providerId === null
      ? events
      : events.filter((event) => event.providerId === selection.providerId);
  return eventsInCategory(owned, selection.category);
}
export function updateProviderOptions(
  events: readonly { providerId: string }[],
  providers: readonly UpdateProvider[],
  selection: UpdateSelection,
): UpdateProvider[] {
  const owners = new Set(events.map((event) => event.providerId));
  return providers
    .filter((provider) => owners.has(provider.id) || provider.id === selection.providerId)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
export function sameUpdateSelection(a: UpdateSelection, b: UpdateSelection): boolean {
  return (
    a.providerId === b.providerId &&
    a.category === b.category &&
    a.providerRecognized === b.providerRecognized
  );
}
