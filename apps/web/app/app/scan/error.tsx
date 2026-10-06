"use client";
import { LocalReadError } from "@/components/app/app-page-state";
export default function PageError({ reset }: { reset: () => void }) {
  return <LocalReadError retry={reset} />;
}
