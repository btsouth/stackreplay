"use client";
import { Select as BaseSelect } from "@base-ui-components/react/select";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/cn";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
export interface SelectProps {
  options: readonly SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  label: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  /** Keep listbox options inside a native modal dialog’s top layer. */
  portalContainer?: HTMLElement | null;
}
/** Base UI owns typeahead, arrows, Home/End, Escape, focus return and form submission. */
export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  label,
  id,
  name,
  disabled,
  required,
  placeholder = "Choose an option",
  className,
  portalContainer,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Portal into the nearest terminal scope so ancestor tokens and rules apply.
  const [scope, setScope] = useState<HTMLElement | null>(null);
  useEffect(() => setReady(true), []);
  useEffect(() => {
    setScope(triggerRef.current?.closest<HTMLElement>(".terminal") ?? null);
  }, []);
  const popupContainer = portalContainer ?? scope;
  return (
    <BaseSelect.Root
      items={options}
      open={open}
      onOpenChange={setOpen}
      {...(value !== undefined ? { value } : {})}
      {...(defaultValue !== undefined ? { defaultValue } : {})}
      onValueChange={(next) => {
        if (next !== null) onValueChange?.(next);
      }}
      {...(name ? { name } : {})}
      disabled={!ready || (disabled ?? false)}
      required={required ?? false}
    >
      <BaseSelect.Trigger
        id={id}
        ref={triggerRef}
        aria-label={label}
        className={cn("sr-select", className)}
        onKeyDown={(event) => {
          // Escape must also work before the popup's focus transfer completes.
          if (event.key === "Escape" && open) {
            event.preventDefault();
            setOpen(false);
          }
        }}
      >
        <BaseSelect.Value>
          {(selected: string | null) =>
            options.find((option) => option.value === selected)?.label ?? placeholder
          }
        </BaseSelect.Value>
        <BaseSelect.Icon>
          <ChevronDown size={16} aria-hidden="true" />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal {...(popupContainer ? { container: popupContainer } : {})}>
        <BaseSelect.Positioner sideOffset={8} className="sr-select-positioner">
          <BaseSelect.Popup className="sr-select-popup">
            <BaseSelect.List>
              {options.map((option) => (
                <BaseSelect.Item
                  key={option.value}
                  data-value={option.value}
                  value={option.value}
                  disabled={option.disabled ?? false}
                  className="sr-select-option"
                >
                  <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
                  <BaseSelect.ItemIndicator>
                    <Check size={16} aria-hidden="true" />
                  </BaseSelect.ItemIndicator>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
