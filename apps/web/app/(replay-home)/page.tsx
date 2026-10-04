import type { Metadata } from "next";
import { ReplayHomepage } from "@/components/home/replay-homepage";
import { publicPageMetadata } from "@/lib/site";
export const metadata: Metadata = publicPageMetadata({
  title: "StackReplay: your AI coding, replayed.",
  description:
    "Turn your local AI coding history into a beautiful recap. Total tokens, API-equivalent value and share cards. Your logs stay in your browser.",
  path: "/",
  absoluteTitle: true,
});
export default function HomePage() {
  return <ReplayHomepage />;
}
