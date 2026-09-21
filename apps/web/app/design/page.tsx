import { demoPresets } from "@stackreplay/test-fixtures";
import {
  ApplicationShell,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ConfidenceBadge,
  ConstraintStatus,
  Input,
  Metric,
} from "@stackreplay/ui";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = { title: "Design system" };

const heavy = demoPresets.heavy;

/** Groups the integer part of a decimal string for display; money stays a string. */
function formatAmount(value: string): string {
  const [whole = "", fraction] = value.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction ? `${grouped}.${fraction}` : grouped;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="border-b border-border pb-2 text-[13px] font-medium text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Internal design-system surface (Milestone 0). Exercises every component in
 * both themes with deterministic demo fixtures. Not part of the product IA;
 * it exists for development, review and visual testing.
 */
export default function DesignPage() {
  return (
    <ApplicationShell right={<ThemeToggle />}>
      <div className="flex max-w-3xl flex-col gap-10">
        <header className="flex flex-col gap-1">
          <h1 className="text-lg font-medium tracking-tight text-foreground">Design system</h1>
          <p className="text-[13px] text-muted-foreground">
            Internal surface for reviewing typography, tokens and components in both themes. Demo
            values are deterministic fixtures, not real usage data.
          </p>
        </header>

        <Section title="Typography">
          <div className="flex flex-col gap-2">
            <p className="text-lg font-medium tracking-tight text-foreground">
              Premium technical instrument
            </p>
            <p className="text-sm text-foreground">
              Precise, calm, fast, deliberate, technical, trustworthy, data-rich, restrained.
            </p>
            <p className="text-[13px] text-muted-foreground">
              Muted supporting copy at 13px for dense analytical surfaces.
            </p>
            <p className="font-mono text-sm tabular-nums text-foreground">
              4.81B · 98.7% · 56.9× · deepseek-v4.1-flash
            </p>
          </div>
        </Section>

        <Section title="Metrics">
          <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3">
            <Metric label="Tokens" value={heavy.tokens} unit="tokens" size="lg" />
            <Metric label="Sessions" value={heavy.sessions} size="lg" />
            <Metric
              label="Subscriptions"
              value={`$${formatAmount(heavy.subscriptionMonthly)}`}
              unit="/mo"
              size="lg"
            />
            <Metric
              label="API list-price equivalent"
              value={`$${formatAmount(heavy.apiListPriceEquivalent)}`}
              hint="Modeled, not billed"
            />
            <Metric
              label="Value ratio"
              value={heavy.valueRatio}
              hint="API equivalent / subscription"
            />
            <Metric
              label="Historical request coverage"
              value={heavy.coverage}
              hint={heavy.windowLabel}
            />
          </div>
        </Section>

        <Section title="Model usage">
          <div className="flex flex-col gap-3">
            {heavy.models.map((model) => (
              <div key={model.model} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[13px] text-foreground">{model.model}</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {model.share}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-foreground/55"
                    style={{ width: model.share }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Constraint status">
          <div className="flex flex-col gap-2">
            {heavy.constraints.map((constraint) => (
              <ConstraintStatus
                key={constraint.label}
                state={constraint.status}
                label={constraint.label}
                {...(constraint.detail ? { detail: constraint.detail } : {})}
              />
            ))}
            <ConstraintStatus state="unknown" label="Concurrency" />
          </div>
        </Section>

        <Section title="Confidence">
          <div className="flex flex-wrap items-center gap-2">
            <ConfidenceBadge level="high" />
            <ConfidenceBadge level="medium" />
            <ConfidenceBadge level="low" />
          </div>
        </Section>

        <Section title="Badges">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Neutral</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="accent">Accent</Badge>
            <Badge variant="positive">Pass</Badge>
            <Badge variant="warning">Estimated</Badge>
            <Badge variant="negative">Exceeded</Badge>
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button>Replay</Button>
              <Button variant="secondary">Compare</Button>
              <Button variant="outline">Export</Button>
              <Button variant="ghost">Dismiss</Button>
              <Button variant="destructive">Delete</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm">Small</Button>
              <Button size="md">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" aria-label="Continue">
                <ArrowRight aria-hidden="true" />
              </Button>
              <Button disabled>Disabled</Button>
            </div>
          </div>
        </Section>

        <Section title="Inputs">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="design-input-default"
                className="text-xs font-medium text-muted-foreground"
              >
                Plan slug
              </label>
              <Input id="design-input-default" placeholder="command-code-goat" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="design-input-invalid"
                className="text-xs font-medium text-muted-foreground"
              >
                Invalid
              </label>
              <Input
                id="design-input-invalid"
                defaultValue="not a plan"
                aria-invalid="true"
                aria-describedby="design-input-invalid-error"
              />
              <p id="design-input-invalid-error" className="text-xs text-negative">
                No plan matches this slug.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="design-input-disabled"
                className="text-xs font-medium text-muted-foreground"
              >
                Disabled
              </label>
              <Input id="design-input-disabled" placeholder="Unavailable" disabled />
            </div>
          </div>
        </Section>

        <Section title="Cards">
          <Card>
            <CardHeader>
              <CardTitle>Weekly window</CardTitle>
              <CardDescription>
                Two historical periods would have exceeded this plan's weekly cap.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                <Metric label="Affected requests" value={heavy.affectedRequests} />
                <Metric label="Confidence" value={heavy.confidence.toUpperCase()} />
              </div>
            </CardContent>
            <CardFooter>
              <Button size="sm">View timeline</Button>
              <Button size="sm" variant="ghost">
                Details
              </Button>
            </CardFooter>
          </Card>
        </Section>
      </div>
    </ApplicationShell>
  );
}
