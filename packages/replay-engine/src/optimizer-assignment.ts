/**
 * Exact maximum-weight capacitated matching for unit-request pools.
 *
 * Matchable event sets form a transversal matroid (expand each capacity into
 * identical slots). Greedy descending weight with an exact augmenting-path
 * independence test is optimal. Mandatory/no-API calls precede finite weights.
 * Occupants with identical eligibility share a group: searching one representative
 * is sufficient, avoiding scans of thousands of equivalent assigned calls.
 */
export interface RequestPool {
  resource: number;
  resourceId: string;
  limitId: string;
  start: string;
  end: string;
  capacity: number;
}

export interface PoolMembership {
  /** One pool per event, or -1 for an unsupported model. */
  pools: Int32Array;
}

export function matchRequestPools(
  count: number,
  orderedEvents: readonly number[],
  resources: readonly number[],
  membership: readonly PoolMembership[],
  pools: readonly RequestPool[],
): { placement: Int32Array; used: Int32Array } {
  const placement = new Int32Array(count).fill(-1);
  const used = new Int32Array(pools.length);
  const groupIds = new Map<string, number>();
  const groups: number[][] = [];
  const occupants = new Map<number, Map<number, number[]>>();

  const put = (pool: number, group: number, event: number) => {
    let byGroup = occupants.get(pool);
    if (byGroup === undefined) {
      byGroup = new Map();
      occupants.set(pool, byGroup);
    }
    let list = byGroup.get(group);
    if (list === undefined) {
      list = [];
      byGroup.set(group, list);
    }
    list.push(event);
    placement[event] = pool;
  };

  const augment = (group: number, event: number, seen: Set<number>): boolean => {
    for (const pool of groups[group] ?? []) {
      if (seen.has(pool)) continue;
      seen.add(pool);
      const capacity = pools[pool]?.capacity ?? 0;
      if ((used[pool] ?? 0) < capacity) {
        put(pool, group, event);
        used[pool] = (used[pool] ?? 0) + 1;
        return true;
      }
      const byGroup = occupants.get(pool);
      if (byGroup === undefined) continue;
      // Numeric group IDs arise only from the explicit weight/event ordering.
      for (const other of [...byGroup.keys()].sort((a, b) => a - b)) {
        if (other === group) continue;
        const list = byGroup.get(other);
        const moved = list?.[list.length - 1];
        if (moved !== undefined && augment(other, moved, seen)) {
          list?.pop();
          put(pool, group, event);
          return true;
        }
      }
    }
    return false;
  };

  for (const event of orderedEvents) {
    const eligible = resources
      .map((resource) => membership[resource]?.pools[event] ?? -1)
      .filter((pool) => pool >= 0);
    const key = eligible.join(",");
    let group = groupIds.get(key);
    if (group === undefined) {
      group = groups.length;
      groups.push(eligible);
      groupIds.set(key, group);
    }
    augment(group, event, new Set());
  }
  return { placement, used };
}
