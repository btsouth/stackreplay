"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface TargetOption {
  id: string;
  label: string;
  detail: string;
  kind: "subscription" | "api";
  /** What the option pins: a plan version, a provider, or a stated absence. */
  reference: string;
  /** The scenario applies an explicit cross-model substitution for this target. */
  translated: boolean;
}

/**
 * The execution-target selector.
 *
 * It is a listbox, not a <select>: the options carry structure (target type,
 * what the target pins, whether the scenario translates) that a native control
 * cannot express, and the approved interaction is a custom one. It is a
 * controlled component so the instrument owns the selected target, which is
 * what makes a rerun on target change possible without a page load.
 *
 * Keyboard: the button toggles, Up/Down move the active option, Home/End jump,
 * Enter or Space selects, Escape closes and returns focus to the button.
 */
export function TargetSelector({
  options,
  value,
  onChange,
  label = "Execution target",
  disabled,
}: {
  options: readonly TargetOption[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      0,
      options.findIndex((option) => option.id === value),
    ),
  );
  const listId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.id === value),
  );
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(
      `[data-option-index="${activeIndex}"]`,
    );
    node?.focus();
  }, [open, activeIndex]);

  useEffect(() => {
    setActiveIndex(selectedIndex);
  }, [selectedIndex]);

  function close(returnFocus: boolean): void {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }

  function select(index: number): void {
    const option = options[index];
    if (option === undefined) return;
    onChange(option.id);
    close(true);
  }

  function onButtonKeyDown(event: React.KeyboardEvent<HTMLButtonElement>): void {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
    }
  }

  function onListKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => Math.min(options.length - 1, index + 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => Math.max(0, index - 1));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        select(activeIndex);
        break;
      case "Escape":
        event.preventDefault();
        close(true);
        break;
      case "Tab":
        close(false);
        break;
      default:
        break;
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span
        className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
        id={`${listId}-label`}
      >
        {label}
      </span>
      <button
        aria-controls={open ? listId : undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-labelledby={`${listId}-label`}
        className="group flex min-h-11 w-full items-center justify-between gap-4 border border-border-strong bg-surface px-3 py-2.5 text-left transition-colors hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[open=true]:border-accent"
        data-open={open}
        data-testid="target-selector"
        data-value={selected?.id}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onButtonKeyDown}
        ref={buttonRef}
        type="button"
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-2">
            <TargetKindMark kind={selected?.kind ?? "subscription"} />
            <span className="truncate text-sm text-foreground">
              {selected?.label ?? "No target"}
            </span>
          </span>
          <span className="truncate font-mono text-xs text-muted-foreground">
            {selected?.reference ?? ""}
          </span>
        </span>
        <span aria-hidden="true" className="shrink-0 text-muted-foreground group-hover:text-accent">
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open ? (
        <div
          aria-labelledby={`${listId}-label`}
          className="flex flex-col border border-border-strong bg-surface shadow-[0_1px_0_0_var(--border)]"
          data-testid="target-selector-list"
          id={listId}
          onKeyDown={onListKeyDown}
          ref={listRef}
          role="listbox"
        >
          {options.map((option, index) => {
            const isSelected = option.id === value;
            return (
              <div
                aria-selected={isSelected}
                className="flex cursor-pointer flex-col gap-1 border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring data-[active=true]:bg-surface-2 aria-selected:bg-surface-2"
                data-option-index={index}
                data-testid={`target-option-${option.id}`}
                key={option.id}
                onClick={() => select(index)}
                onFocus={() => setActiveIndex(index)}
                onKeyDown={(event) => {
                  // The option owns Enter and Space because it is the focused
                  // element; the list handles navigation for the same reason.
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    select(index);
                  }
                }}
                onMouseEnter={() => setActiveIndex(index)}
                role="option"
                tabIndex={index === activeIndex ? 0 : -1}
              >
                <span className="flex items-center gap-2">
                  <TargetKindMark kind={option.kind} />
                  <span className="text-sm text-foreground">{option.label}</span>
                  {option.translated ? (
                    <span className="border border-accent px-1.5 py-px font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
                      Translated
                    </span>
                  ) : null}
                </span>
                <span className="text-xs text-muted-foreground">{option.detail}</span>
                <span className="font-mono text-xs text-muted-foreground">{option.reference}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Target type is carried by a word and a rule, never by colour alone.
 */
function TargetKindMark({ kind }: { kind: "subscription" | "api" }) {
  return (
    <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
      {kind === "api" ? "Direct API" : "Subscr."}
    </span>
  );
}
