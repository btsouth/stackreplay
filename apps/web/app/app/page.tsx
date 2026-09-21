import { buttonVariants, Card, CardContent } from "@stackreplay/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Overview" };

const STEPS = [
  {
    title: "1. Import",
    body: "Bring in a StackReplay export from the CLI, or start from a deterministic demo workload. The file is read by this browser.",
    href: "/app/import",
    action: "Import a workload",
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
        title="Overview"
        description="Replay your real workload against another plan before you switch."
      />
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {STEPS.map((step) => (
            <Card key={step.title}>
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <h2 className="text-sm font-medium">{step.title}</h2>
                <p className="text-sm text-muted-foreground">{step.body}</p>
                <div className="mt-auto pt-2">
                  <Link
                    href={step.href}
                    className={buttonVariants({ variant: "secondary", size: "sm" })}
                  >
                    {step.action}
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-surface-2">
          <CardContent className="flex flex-col gap-2 p-5">
            <h2 className="text-sm font-medium">Local by construction</h2>
            <p className="text-sm text-muted-foreground">
              Imported workloads are stored only in this browser, and replay runs on this device.
              There is no import endpoint and no account. Prompts, responses, source code, file
              paths and repository names are never part of a StackReplay export.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
