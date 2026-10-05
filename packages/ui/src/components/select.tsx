"use client";
import { Select as BaseSelect } from "@base-ui-components/react/select";
import { Check, ChevronDown } from "lucide-react";
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
}: SelectProps) {
  return (
    <BaseSelect.Root
      items={options}
      {...(value !== undefined ? { value } : {})}
      {...(defaultValue !== undefined ? { defaultValue } : {})}
      onValueChange={(next) => {
        if (next !== null) onValueChange?.(next);
      }}
      {...(name ? { name } : {})}
      disabled={disabled ?? false}
      required={required ?? false}
    >
      <BaseSelect.Trigger id={id} aria-label={label} className={cn("sr-select", className)}>
        <BaseSelect.Value>
          {(selected: string | null) =>
            options.find((option) => option.value === selected)?.label ?? placeholder
          }
        </BaseSelect.Value>
        <BaseSelect.Icon>
          <ChevronDown size={16} aria-hidden="true" />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner sideOffset={8} className="sr-select-positioner">
          <BaseSelect.Popup className="sr-select-popup">
            <BaseSelect.List>
              {options.map((option) => (
                <BaseSelect.Item
                  key={option.value}
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
