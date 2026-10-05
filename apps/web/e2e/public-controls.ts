import { expect, type Locator } from "@playwright/test";

/** Exercise the real Base UI listbox and assert its visible selected label. */
export async function selectCatalogOption(locator: Locator, choice: string | { label: string }) {
  const control = locator.locator("xpath=ancestor-or-self::*[@data-options][1]");
  const options: { value: string; label: string }[] = JSON.parse(
    (await control.getAttribute("data-options")) ?? "[]",
  );
  const option =
    typeof choice === "string"
      ? options.find((o) => o.value === choice)
      : options.find((o) => o.label === choice.label);
  expect(option, `Catalog option ${JSON.stringify(choice)} exists`).toBeDefined();
  const trigger = locator;
  await trigger.click();
  await locator
    .page()
    .getByRole("option", { name: option?.label ?? "", exact: true })
    .click();
  await expect(locator).toHaveText(option?.label ?? "");
}
export async function expectCatalogSelection(locator: Locator, value: string) {
  const control = locator.locator("xpath=ancestor-or-self::*[@data-options][1]");
  await expect(control).toHaveAttribute("data-selected-value", value);
  const options: { value: string; label: string }[] = JSON.parse(
    (await control.getAttribute("data-options")) ?? "[]",
  );
  const label = options.find((option) => option.value === value)?.label;
  expect(label).toBeDefined();
  await expect(locator).toHaveText(label ?? "");
}
