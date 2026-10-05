"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
export function PlansNavigation({ section }: { section: "plans" | "replay" | "compare" }) {
  const query = useSearchParams();
  return (
    <nav aria-label="Your plan tools" className="sr-plan-nav">
      {[
        { id: "plans", label: "Your plans" },
        { id: "replay", label: "Try a change" },
        { id: "compare", label: "Compare" },
      ].map((item) => {
        const params = new URLSearchParams(query.toString());
        params.delete("section");
        if (item.id !== "plans") params.set("section", item.id);
        return (
          <Link
            key={item.id}
            href={`/app/plans${params.size ? `?${params.toString()}` : ""}`}
            aria-current={section === item.id ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
