"use client";
import { LocalReadError } from "@/components/plans/app-page-state";
export default function PageError({ reset }: { reset: () => void }) {
  return <LocalReadError retry={reset} />;
}
