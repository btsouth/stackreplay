export function quantile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (sorted.length - 1) * p;
  const lo = Math.floor(at);
  return (sorted[lo] ?? 0) + ((sorted[Math.ceil(at)] ?? 0) - (sorted[lo] ?? 0)) * (at - lo);
}
