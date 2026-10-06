import { expect,test } from "@playwright/test";
import { stackWorkloadFile } from "./fixtures/stack-workload";
import { languageMatches } from "./app-language";
import { gotoImport } from "./helpers";
test("recap, explorer, plans, settings, scan and share use plain copy and one API total",async({page})=>{
 await page.clock.install({time:new Date("2026-10-05T12:00:00Z")});await gotoImport(page);
 await page.getByTestId("import-file-input").setInputFiles({name:"sample.stackreplay.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(stackWorkloadFile({scale:100})))});
 await expect(page.getByTestId("recap-ready")).toBeVisible({timeout:60000});const id=new URL(page.url()).searchParams.get("import");
 const amount=await page.locator(".recap-hero-number").allTextContents();
 for(const route of ["recap","stats","plans","settings","scan"]) {
  await page.goto(`/app/${route}?import=${id}`);
  if(route==="recap"||route==="stats"||route==="plans")await expect(page.getByTestId(`${route}-ready`)).toBeVisible({timeout:60000});
  else if(route==="scan")await expect(page.getByTestId("intake-surface")).toHaveAttribute("data-ready","true");
  else await expect(page.getByTestId("settings-saved")).toBeVisible();
  expect(languageMatches(await page.locator("body").innerText()),route).toEqual([]);
  if(route==="stats") {await expect(page.getByTestId("overview-api-total")).toHaveText(/\$[\d,]+$/);expect(amount.length).toBeGreaterThan(0);}
 }
 await page.goto(`/app/recap?import=${id}`);await expect(page.getByTestId("recap-ready")).toBeVisible();await page.getByTestId("recap-share-create").click();await page.getByTestId("recap-share-open").click();
 await expect(page.getByTestId("share-card-v2")).toBeVisible();expect(languageMatches(await page.locator("body").innerText())).toEqual([]);
 await expect(page.getByTestId("share-figure")).toHaveText(/\$[\d,]+$/);
});
