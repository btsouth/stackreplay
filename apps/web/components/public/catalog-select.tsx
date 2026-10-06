"use client";
import { Select, type SelectOption } from "@stackreplay/ui";
import { Children, isValidElement, type ReactNode, useEffect, useRef, useState } from "react";

function text(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      isValidElement<{ children?: ReactNode }>(child) ? text(child.props.children) : String(child),
    )
    .join("");
}
function choices(children: ReactNode, group = ""): SelectOption[] {
  return Children.toArray(children).flatMap((child) => {
    if (
      !isValidElement<{ children?: ReactNode; value?: string; label?: string; disabled?: boolean }>(
        child,
      )
    )
      return [];
    if (child.type === "option")
      return [
        {
          value: child.props.value ?? text(child.props.children),
          label: `${group}${text(child.props.children)}`,
          disabled: child.props.disabled ?? false,
        },
      ];
    return choices(
      child.props.children,
      child.type === "optgroup" ? `${child.props.label} · ` : group,
    );
  });
}
/** Preserve the catalog's option expressions while Base UI owns listbox keyboard and focus. */
export function CatalogSelect({
  label,
  children,
  value,
  onChange,
  disabled,
  className,
  id,
  portalContainer,
  "data-testid": testId,
}: {
  label: string;
  children: ReactNode;
  value?: string | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
  id?: string | undefined;
  "data-testid"?: string;
  portalContainer?: HTMLElement | null;
  onChange: (event: { target: { value: string } }) => void;
}) {
  const options = choices(children);
  const ref = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setContainer(ref.current?.closest<HTMLElement>(".public-terminal") ?? null);
  }, []);
  return (
    <div
      ref={ref}
      className="catalog-select"
      data-testid={testId}
      data-selected-value={value}
      data-options={JSON.stringify(options)}
    >
      <Select
        label={label}
        placeholder={options.find((option) => option.value === value)?.label ?? label}
        {...((portalContainer ?? container)
          ? { portalContainer: portalContainer ?? container ?? undefined }
          : {})}
        options={options}
        {...(value !== undefined ? { value } : {})}
        onValueChange={(value) => onChange({ target: { value } })}
        disabled={disabled ?? false}
        {...(className ? { className } : {})}
        {...(id ? { id } : {})}
      />
    </div>
  );
}
