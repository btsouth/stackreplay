/** Remove trailing path separators in one backwards pass, without regex backtracking. */
export function trimTrailingPathSeparators(value: string): string {
  let end = value.length;
  while (end > 0) {
    const character = value[end - 1];
    if (character !== "/" && character !== "\\") break;
    end -= 1;
  }
  return value.slice(0, end);
}
