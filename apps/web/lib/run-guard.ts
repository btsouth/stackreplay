/**
 * A one-slot guard for work that outlives the selection that asked for it.
 *
 * A replay takes long enough to outlive the panel that requested it: a reader can
 * pick another target while the engine is still working. The worker client
 * already refuses to let a newer worker request be superseded by an older one,
 * but changing a target starts no new request at all, so the surface needs its
 * own guard. A result computed for one selection is never displayed under
 * another (benchmark finding F026, extended to a run still in flight).
 */
export interface RunGuard {
  /** Begin a run: the returned token is what that run must present to be accepted. */
  begin: () => number;
  /** Invalidate whatever is in flight without starting anything. */
  invalidate: () => void;
  /** True when a token still belongs to the current selection. */
  isCurrent: (token: number) => boolean;
}

export function createRunGuard(): RunGuard {
  let current = 0;
  return {
    begin: () => {
      current += 1;
      return current;
    },
    invalidate: () => {
      current += 1;
    },
    isCurrent: (token: number) => token === current,
  };
}
