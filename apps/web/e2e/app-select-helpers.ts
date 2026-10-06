import { expect, type Locator } from "@playwright/test";
export async function chooseOption(locator: Locator, value: string) {
  const trigger =
    (await locator.getAttribute("role")) === "combobox" ? locator : locator.getByRole("combobox");
  await trigger.click();
  const option = locator
    .page()
    .getByRole("option")
    .locator(`xpath=self::*[@data-value=${JSON.stringify(value)}]`);
  await option.click();
}
export async function expectSelectValue(locator: Locator, value: string) {
  const wrapper = await locator.evaluate((element) => element.classList.contains("app-select"));
  await expect(
    wrapper
      ? locator
      : locator.locator(
          "xpath=ancestor::*[contains(concat(' ',normalize-space(@class),' '),' app-select ')][1]",
        ),
  ).toHaveAttribute("data-value", value);
}
