"use client";
import {
  Button,
  CatalogSubNav,
  DataTable,
  EmptyState,
  Input,
  LoadingSkeleton,
  Notice,
  PageHeader,
  Panel,
  SectionHeader,
  SegmentedControl,
  Select,
  StatTile,
  Tabs,
} from "@stackreplay/ui";
import { useState } from "react";
export function DesignGallery() {
  const [period, setPeriod] = useState("30");
  const [history, setHistory] = useState("sample");
  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="The shared design language"
        title="A story, in every detail."
        description="Instrument Sans, warm paper, graphite, ember and citron. Fictional examples of the building blocks used across StackReplay."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Tokens processed" value="41.2B" />
        <StatTile
          label="At published API prices"
          value="$18,400"
          tone="ember"
          hint="Fictional sample, not a bill"
        />
        <StatTile label="Days of coding" value="128" tone="citron" />
      </div>
      <Panel>
        <SectionHeader title="Controls that feel familiar" />
        <div className="flex flex-wrap items-end gap-6">
          <div className="w-64">
            <Select
              label="History"
              options={[
                { value: "sample", label: "Fictional sample" },
                { value: "recent", label: "Another sample" },
                { value: "unavailable", label: "Unavailable sample", disabled: true },
              ]}
              value={history}
              onValueChange={setHistory}
            />
          </div>
          <SegmentedControl
            label="Period"
            value={period}
            onValueChange={setPeriod}
            options={[
              { value: "30", label: "30 days" },
              { value: "90", label: "90 days" },
              { value: "all", label: "All time" },
            ]}
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button>Scan history</Button>
          <Button variant="secondary">Explore stats</Button>
          <Button variant="outline">Download card</Button>
          <Button variant="ghost">More details</Button>
          <Button variant="destructive">Delete scan</Button>
          <Button disabled>Unavailable</Button>
        </div>
      </Panel>
      <section>
        <SectionHeader title="A clear place for every view" />
        <Tabs
          label="Example views"
          items={[
            {
              value: "story",
              label: "Story",
              content: <p>Your recap tells the story of your AI coding.</p>,
            },
            {
              value: "details",
              label: "Details",
              content: <p>Your stats let you explore that history.</p>,
            },
          ]}
        />
        <div className="mt-8">
          <CatalogSubNav />
        </div>
      </section>
      <section>
        <SectionHeader title="Numbers with room to breathe" />
        <DataTable
          label="Fictional coding activity"
          rows={[
            { id: "claude", tool: "Claude Code", sessions: 180 },
            { id: "codex", tool: "Codex", sessions: 64 },
            { id: "open", tool: "OpenCode", sessions: 120 },
          ]}
          rowKey={(row) => row.id}
          columns={[
            {
              key: "tool",
              label: "Tool",
              render: (row) => row.tool,
              compare: (a, b) => a.tool.localeCompare(b.tool),
            },
            {
              key: "sessions",
              label: "Sessions",
              numeric: true,
              render: (row) => row.sessions,
              compare: (a, b) => a.sessions - b.sessions,
            },
          ]}
        />
      </section>
      <Panel>
        <SectionHeader title="Clear labels and helpful errors" />
        <div className="grid max-w-xl gap-4">
          <label htmlFor="example-slug">
            Plan ID
            <Input id="example-slug" placeholder="A catalog plan ID" />
          </label>
          <label htmlFor="invalid-slug">
            Invalid
            <Input
              id="invalid-slug"
              aria-invalid="true"
              aria-describedby="invalid-slug-error"
              defaultValue="unknown-plan"
            />
          </label>
          <p id="invalid-slug-error" className="text-sm text-negative">
            No plan matches this ID.
          </p>
        </div>
      </Panel>
      <EmptyState
        title="Your story starts with a scan"
        description="Bring in your coding history to see your recap. Your logs stay in your browser."
        actions={<Button>Scan history</Button>}
      />
      <div className="grid gap-4">
        <Notice title="Kept in this browser">Your raw logs are never saved.</Notice>
        <Notice
          title="The scan could not be opened"
          tone="error"
          actions={<Button variant="secondary">Try again</Button>}
        >
          Choose the file again, or try another history export.
        </Notice>
        <Notice title="Your scan is ready" tone="success">
          You can now explore your recap.
        </Notice>
      </div>
      <LoadingSkeleton label="Loading the fictional example" />
    </div>
  );
}
