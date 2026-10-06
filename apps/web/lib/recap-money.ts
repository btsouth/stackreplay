/** Exact addition for persisted non-negative dollar aggregates, without loading replay or schemas. */
export function addRecapMoney(a: string, b: string): string {
  const [aw = "0", af = ""] = a.split("."),
    [bw = "0", bf = ""] = b.split(".");
  const scale = Math.max(af.length, bf.length);
  const units = BigInt(aw + af.padEnd(scale, "0")) + BigInt(bw + bf.padEnd(scale, "0"));
  const digits = units.toString().padStart(scale + 1, "0");
  if (!scale) return digits;
  const fraction = digits.slice(-scale).replace(/0+$/, "");
  return digits.slice(0, -scale) + (fraction ? `.${fraction}` : "");
}
