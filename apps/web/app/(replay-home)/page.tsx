import type { Metadata } from "next";
import { ReplayHomepage } from "@/components/home/replay-homepage";
import { publicPageMetadata } from "@/lib/site";
export const metadata: Metadata = publicPageMetadata({
  title: "StackReplay: your AI coding, measured.",
  description:
    "Measure tokens, speed, models and coding rhythm from your local AI history. Scan in your browser. Your logs stay on this device.",
  path: "/",
  absoluteTitle: true,
});
export default function HomePage() {
  return <ReplayHomepage />;
}
