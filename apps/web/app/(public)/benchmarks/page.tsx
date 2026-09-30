import { benchmarkEditions } from "@stackreplay/benchmarks";
import type { Metadata } from "next";
import { BenchmarkExplorer } from "@/components/public/benchmark-explorer";
import { parseBenchmarkState } from "@/lib/benchmark-state";
import { loadPublicBenchmarks } from "@/lib/public-benchmarks";
import { loadPublicCatalog } from "@/lib/public-catalog";
export const metadata: Metadata = {
  title: "Model benchmarks",
  description:
    "Verified reported benchmark scores, exact versions, evaluation setups and original evidence. Compare the models you choose.",
  alternates: { canonical: "/benchmarks" },
};
export default async function BenchmarksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams))
    for (const entry of Array.isArray(value) ? value : value ? [value] : [])
      query.append(key, entry);
  const models = loadPublicCatalog()
    .models.filter((m) => m.kind !== "family")
    .map((m) => ({ id: m.id, name: m.name, developer: m.developerName ?? "Not recorded" }));
  return (
    <BenchmarkExplorer
      data={loadPublicBenchmarks()}
      editions={Object.fromEntries(
        Object.keys(benchmarkEditions).map((edition) => [edition, loadPublicBenchmarks(edition)]),
      )}
      models={models}
      initial={parseBenchmarkState(
        query,
        models.map((m) => m.id),
      )}
    />
  );
}
