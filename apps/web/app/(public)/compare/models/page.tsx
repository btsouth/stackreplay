import { ModelCompare } from "@/components/visual/model-compare";
import { loadPublicBenchmarks } from "@/lib/public-benchmarks";
import { loadPublicCatalog } from "@/lib/public-catalog";
import { publicPageMetadata } from "@/lib/site";
import { visualModelData } from "@/lib/visual-model-data";

export const metadata = publicPageMetadata({
  title: "Compare AI models",
  description:
    "Compare API prices, context, benchmark scores and subscription access for two to four models.",
  path: "/compare/models",
});
export default function ModelComparePage() {
  return <ModelCompare data={visualModelData(loadPublicCatalog(), loadPublicBenchmarks())} />;
}
