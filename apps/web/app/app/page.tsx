import { buttonVariants } from "@stackreplay/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Workspace" };

const STEPS = [
  {
    title: "1. Import",
    body: "Select supported AI history files, a folder, a ZIP archive, or a StackReplay workload. Processing happens in this browser.",
    href: "/app/import",
    action: "Load workload",
  },
  {
    title: "2. Replay",
    body: "Pick a target plan and a rules date. The deterministic engine runs in a Web Worker and reports what would have happened.",
    href: "/app/replay",
    action: "Open replay",
  },
] as const;

export default function OverviewPage() {
  return (
    <>
      <PageHeader
        title="Your replay workspace"
        description="Load an observed workload, choose an execution target, and inspect the counterfactual."
      />
      <div className="flex max-w-5xl flex-col gap-10">
        <div className="grid gap-8 sm:grid-cols-2">
          {STEPS.map((step) => (
            <div
              key={step.title}
              className="flex flex-col gap-4 border-t border-border-strong pt-5"
            >
              <h2 className="text-lg font-medium">{step.title}</h2>
              <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
              <div className="mt-auto pt-2">
                <Link
                  href={step.href}
                  className={buttonVariants({ variant: "secondary", size: "sm" })}
                >
                  {step.action}
                </Link>
              </div>
            </div>
          ))}
        </div>

        <section className="flex max-w-3xl flex-col gap-3 border-t border-border pt-5">
          <h2 className="text-base font-medium">Local by construction</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Selected source files are processed in this browser. You can save normalized usage
            locally here, and replay runs on this device. There is no import endpoint or account.
            Prompts, responses, source code, file paths and repository names are not part of a
            StackReplay export.
          </p>
        </section>
      </div>
    </>
  );
}
