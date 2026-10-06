"use client";
import { type DataColumn, DataTable } from "@stackreplay/ui";
import Link from "next/link";
import { useState } from "react";
import { AppPageSkeleton, ScanEmptyState } from "@/components/app/app-page-state";
import { PartialScanNotice } from "@/components/import/evidence";
import { CalculationNote } from "@/components/recap/calculation-note";
import { PeriodControl } from "@/components/recap/period-control";
import { familyColors } from "@/lib/recap";
import { compactNumber, recapUsd } from "@/lib/recap-card";
import { developerNames, harnessNames, providerNames } from "@/lib/recap-deep";
import { usePaidMultiplier } from "@/lib/use-paid-multiplier";
import { useRecapData } from "@/lib/use-recap-data";
import { isSyntheticWorkload } from "@/lib/workload-kind";
import "@/components/recap/recap.css";
import "@/components/app/explorer.css";

type Row = {
  id: string;
  name: string;
  developer?: string;
  total: number;
  usd?: string | undefined;
  sessions?: number;
  requests?: number;
  color?: string | undefined;
};
const tabs = ["Models", "Tools", "Providers", "Projects", "Days", "Hours"] as const;
export function StatsSurface({ initialImportId }: { initialImportId?: string | undefined }) {
  const data = useRecapData(initialImportId);
  const { recap, period, selectPeriod, record } = data;
  const paid = usePaidMultiplier(recap);
  const [tab, setTab] = useState<(typeof tabs)[number]>("Models");
  const [all, setAll] = useState(false);
  if (data.error)
    return (
      <div className="recap-page">
        <h1>Your stats</h1>
        <p role="alert" data-testid="workload-missing">
          {data.error}
        </p>
        <a className="recap-button" href="/app/scan">
          Scan my history
        </a>
      </div>
    );
  if (!data.imports)
    return <AppPageSkeleton label="Opening your stats" testId="workload-restoring" />;
  if (!data.id)
    return (
      <div className="recap-page">
        <h1>Your stats</h1>
        <ScanEmptyState testId="workload-empty" />
      </div>
    );
  if (!recap) return <AppPageSkeleton label="Calculating your stats" />;
  const explorer = recap.explorer;
  const models: Row[] = recap.models.map((m) => ({
    id: m.id,
    name: m.name,
    developer: developerNames[m.family] ?? m.family,
    total: m.total,
    usd: m.priced > 0 ? m.usd : undefined,
    sessions: explorer?.modelSessions[m.id] ?? 0,
    color: familyColors[m.family] ?? familyColors.other,
  }));
  const rows: Row[] =
    tab === "Models"
      ? models
      : tab === "Tools"
        ? (recap.deep?.harnesses ?? []).map((t) => ({
            ...t,
            name: harnessNames[t.id] ?? t.id,
            requests: t.records,
          }))
        : tab === "Providers"
          ? (recap.deep?.providers ?? []).map((t) => ({
              ...t,
              name: providerNames[t.id] ?? t.id,
              requests: t.records,
            }))
          : tab === "Projects"
            ? (recap.deep?.projects ?? []).map((p, i) => ({
                id: p.hash,
                name:
                  record?.localProjects?.find((label) => label.hash === p.hash)?.label ??
                  `Project ${i + 1}`,
                total: p.total,
              }))
            : (explorer?.days ?? []).map((d) => ({
                id: d.date,
                name: d.date,
                total: d.total,
                requests: d.records,
                usd: d.usd,
              }));
  const columns: DataColumn<Row>[] = [
    {
      key: "name",
      label: tab === "Models" ? "Model" : tab.slice(0, -1),
      render: (r) => (
        <span className="explorer-row-name">
          <i style={{ background: r.color ?? "var(--accent)" }} />
          {r.name}
        </span>
      ),
      compare: (a, b) => a.name.localeCompare(b.name),
    },
    ...(tab === "Models"
      ? [
          {
            key: "developer",
            label: "Developer",
            render: (r: Row) => r.developer,
            compare: (a: Row, b: Row) => (a.developer ?? "").localeCompare(b.developer ?? ""),
          },
        ]
      : []),
    {
      key: "tokens",
      label: "Tokens",
      numeric: true,
      render: (r) => compactNumber(r.total),
      compare: (a, b) => a.total - b.total,
    },
    {
      key: "share",
      label: "Share",
      render: (r) => (
        <span className="explorer-share">
          <i
            style={{
              width: `${(100 * r.total) / Math.max(1, recap.total)}%`,
              background: r.color ?? "var(--accent)",
            }}
          />
          <span>{Math.round((100 * r.total) / Math.max(1, recap.total))}%</span>
        </span>
      ),
      compare: (a, b) => a.total - b.total,
    },
    ...(tab === "Models" || tab === "Days"
      ? [
          {
            key: "usd",
            label: "Value at API prices",
            numeric: true,
            render: (r: Row) => (r.usd === undefined ? "Unreported" : recapUsd(r.usd)),
            compare: (a: Row, b: Row) => Number(a.usd ?? "-1") - Number(b.usd ?? "-1"),
          },
        ]
      : []),
    ...(tab === "Models"
      ? [
          {
            key: "sessions",
            label: "Sessions",
            numeric: true,
            render: (r: Row) => r.sessions?.toLocaleString(),
            compare: (a: Row, b: Row) => (a.sessions ?? 0) - (b.sessions ?? 0),
          },
        ]
      : tab !== "Projects"
        ? [
            {
              key: "requests",
              label: "Requests",
              numeric: true,
              render: (r: Row) => r.requests?.toLocaleString(),
              compare: (a: Row, b: Row) => (a.requests ?? 0) - (b.requests ?? 0),
            },
          ]
        : []),
  ];
  const days = explorer?.days ?? [];
  const maxDay = Math.max(1, ...days.map((d) => d.total));
  const hours = recap.deep?.hours ?? [];
  const maxHour = Math.max(1, ...hours.flat());
  return (
    <div className="recap-page explorer-page" data-testid="stats-ready" data-period={period}>
      <header className="recap-toolbar">
        <div>
          <p className="recap-eyebrow">A closer look</p>
          <h1>Your stats</h1>
          <p className="explorer-intro">Every model. Every project. Your rhythm.</p>
        </div>
        <PeriodControl value={period} onChange={selectPeriod} />
      </header>
      {data.record && (
        <PartialScanNotice
          record={data.record}
          action={
            <Link className="text-sm text-accent" href="/app/scan" data-testid="stats-rescan">
              Scan again
            </Link>
          }
        />
      )}
      {data.record && isSyntheticWorkload(data.record) && (
        <p className="plan-muted">Fictional demo. These numbers are sample data.</p>
      )}
      <div className="explorer-stats" data-paid={paid ? "" : undefined}>
        {[
          [compactNumber(recap.total), "Total tokens"],
          [recapUsd(recap.usd), "at API prices"],
          [recap.sessions.toLocaleString(), "Sessions"],
          [recap.days.filter((d) => d.records > 0).length.toLocaleString(), "Active days"],
          ...(paid ? [[paid.text, "what you paid"]] : []),
        ].map(([value, label]) => (
          <div key={label}>
            <strong
              data-testid={
                label === "at API prices"
                  ? "overview-api-total"
                  : label === "what you paid"
                    ? "overview-paid"
                    : undefined
              }
            >
              {value}
            </strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <section className="explorer-panel">
        <div className="explorer-tabs" role="tablist" aria-label="Explore your history">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              id={`tab-${t}`}
              aria-selected={tab === t}
              aria-controls="explorer-content"
              tabIndex={tab === t ? 0 : -1}
              onClick={() => {
                setTab(t);
                setAll(false);
              }}
              onKeyDown={(e) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
                e.preventDefault();
                const index =
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? tabs.length - 1
                      : (tabs.indexOf(t) + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) %
                        tabs.length;
                setTab(tabs[index]!);
                setAll(false);
                document.getElementById(`tab-${tabs[index]}`)?.focus();
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div
          id="explorer-content"
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
          data-testid={tab === "Models" ? "section-models" : undefined}
        >
          <div className="explorer-section-title">
            <h2>
              {tab === "Models"
                ? "Your most used models"
                : tab === "Hours"
                  ? "When you get into it"
                  : `Your ${tab.toLowerCase()}`}
            </h2>
            <p>
              {tab === "Hours"
                ? "Requests by weekday and hour, in your local time."
                : "Choose a column to sort."}
            </p>
          </div>
          {tab === "Days" && (
            <div className="explorer-day-chart" role="img" aria-label="Daily tokens">
              {days.map((d) => (
                <div key={d.date} title={`${d.date}: ${compactNumber(d.total)} tokens`}>
                  <i style={{ height: `${Math.max(2, (100 * d.total) / maxDay)}%` }} />
                </div>
              ))}
            </div>
          )}
          {tab === "Hours" ? (
            <div className="explorer-heatmap">
              <div className="explorer-hours-label">
                <span />
                <span>Midnight</span>
                <span>6 am</span>
                <span>Noon</span>
                <span>6 pm</span>
              </div>
              {hours.map((values, day) => (
                <div
                  key={
                    ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
                      day
                    ]
                  }
                  className="explorer-hour-row"
                >
                  <span>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]}</span>
                  {values
                    .map((n, hour) => ({
                      n,
                      label: `${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day]}, ${hour}:00`,
                    }))
                    .map(({ n, label }) => (
                      <div
                        key={label}
                        title={`${label}: ${n.toLocaleString()} requests`}
                        style={{
                          background: `color-mix(in srgb, var(--accent) ${n ? Math.max(15, (100 * n) / maxHour) : 0}%, var(--surface-2))`,
                        }}
                      />
                    ))}
                </div>
              ))}
            </div>
          ) : (
            <>
              <DataTable
                key={tab}
                label={`${tab} in this period`}
                rows={rows}
                rowLimit={all ? undefined : 10}
                columns={columns}
                rowKey={(r) => r.id}
                empty="No activity recorded in this period. Try All time."
              />
              {rows.length > 10 && (
                <button
                  type="button"
                  className="recap-button secondary explorer-show-all"
                  onClick={() => setAll(!all)}
                >
                  {all ? "Show top 10" : `Show all ${rows.length}`}
                </button>
              )}
            </>
          )}
        </div>
      </section>
      <CalculationNote recap={recap} />
      <footer className="recap-footer">
        <span>Calculated on this device. Your logs stay here.</span>
        <Link href="/app/scan" data-testid="stats-scan-again">
          Scan again →
        </Link>
      </footer>
    </div>
  );
}
