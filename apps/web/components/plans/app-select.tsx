"use client";
import { Select, type SelectOption } from "@stackreplay/ui";
import { Children, isValidElement, type ReactNode, useState } from "react";

type OptionProps = { value?: string | number; disabled?: boolean; children?: ReactNode };
function text(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      isValidElement<OptionProps>(child) ? text(child.props.children) : String(child),
    )
    .join("");
}
/** Adapt existing domain option builders to the shared listbox, including form submission. */
export function AppSelect({
  children,
  label,
  value,
  defaultValue,
  onChange,
  id,
  name,
  disabled,
  required,
  className,
  "aria-label": ariaLabel,
  "data-testid": testId,
}: {
  children: ReactNode;
  label: string;
  value?: string;
  defaultValue?: string;
  onChange?: (event: { target: { value: string } }) => void;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  "aria-label"?: string;
  "data-testid"?: string;
}) {
  function collectOptions(nodes: ReactNode): SelectOption[] {
    return Children.toArray(nodes).flatMap((child) => {
      if (!isValidElement<OptionProps>(child)) return [];
      if (child.type !== "option") return collectOptions(child.props.children);
      return [
        {
          value: String(child.props.value ?? text(child.props.children)),
          label: text(child.props.children),
          ...(child.props.disabled ? { disabled: true } : {}),
        },
      ];
    });
  }
  const options = collectOptions(children);
  const [selection, setSelection] = useState(defaultValue ?? options[0]?.value ?? "");
  const selected = value ?? selection;
  return (
    <span className="app-select" data-testid={testId} data-value={selected}>
      <Select
        label={ariaLabel ?? label}
        options={options}
        value={selected}
        onValueChange={(next) => {
          const target = { value: next };
          onChange?.({ target });
          setSelection(target.value);
        }}
        {...(id ? { id } : {})}
        {...(name ? { name } : {})}
        {...(disabled !== undefined ? { disabled } : {})}
        {...(required !== undefined ? { required } : {})}
        {...(className ? { className } : {})}
      />
    </span>
  );
}
