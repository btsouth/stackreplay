import { buttonVariants } from "@stackreplay/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Workspace" };

const STEPS = [
  {
    title: "1. Scan",
    body: "Select your Claude Code or Codex history, a folder, a ZIP archive, or a StackReplay workload. Everything is read in this browser.",
    href: "/app/import",
    action: "Scan history",
  },
  {
    title: "2. Understand",
    body: "See how you actually use AI: when you work, your heaviest windows, which projects and models carry the demand, and where the tokens go.",
    href: "/app/workload",
    action: "Open workload",
  },
  {
    title: "3. Replay",
    body: "Send the recorded chronology through another plan, provider or API, exactly or with the model substitutions you choose.",
    href: "/app/replay",
    action: "Open replay",
  },
  {
    title: "4. Compare",
    body: "Replay the same workload against several targets and read model support, capacity, crossings and cost side by side.",
    href: "/app/compare",
    action: "Compare targets",
  },
] as const;

export default function OverviewPage() {
  return (
    <>
      <PageHeader
        title="Your replay workspace"
        description="Scan your history, understand how you use AI, then replay what would happen if you changed the stack."
      />
      <div className="flex max-w-5xl flex-col gap-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
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
            Selected source files are processed in this browser. Normalized usage is saved in this
            browser by default (you can turn that off per scan, and delete it any time), and replay
            runs on this device. Raw session files are never copied. There is no import endpoint or
            account. Prompts, responses, source code, file paths and repository names are not part
            of a StackReplay export. Project folder names label your projects in this browser only.
          </p>
        </section>
      </div>
    </>
  );
}
