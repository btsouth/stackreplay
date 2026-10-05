"use client";
import { Tabs as BaseTabs } from "@base-ui-components/react/tabs";
import type { ReactNode } from "react";
export interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}
/** Use for in-page content. Route changes use links with aria-current instead. */
export function Tabs({
  label,
  items,
  defaultValue,
}: {
  label: string;
  items: readonly TabItem[];
  defaultValue?: string;
}) {
  return (
    <BaseTabs.Root defaultValue={defaultValue ?? items[0]?.value}>
      <BaseTabs.List aria-label={label} className="sr-tabs">
        {items.map((item) => (
          <BaseTabs.Tab key={item.value} value={item.value} disabled={item.disabled ?? false}>
            {item.label}
          </BaseTabs.Tab>
        ))}
      </BaseTabs.List>
      {items.map((item) => (
        <BaseTabs.Panel key={item.value} value={item.value} className="sr-tab-panel">
          {item.content}
        </BaseTabs.Panel>
      ))}
    </BaseTabs.Root>
  );
}
