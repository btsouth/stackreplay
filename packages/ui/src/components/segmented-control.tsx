"use client";
import { useId } from "react";
export interface Segment {
  value: string;
  label: string;
  disabled?: boolean;
}
/** Native radio semantics provide one tab stop and arrow-key selection. */
export function SegmentedControl({
  label,
  options,
  value,
  onValueChange,
}: {
  label: string;
  options: readonly Segment[];
  value: string;
  onValueChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <fieldset className="sr-segmented">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <label key={option.value}>
          <input
            type="radio"
            name={id}
            value={option.value}
            checked={value === option.value}
            disabled={option.disabled}
            onChange={() => onValueChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
