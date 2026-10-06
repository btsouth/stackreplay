import { buildDemoExport } from "@stackreplay/test-fixtures";
import { describe,expect,it } from "vitest";
import { buildRecap } from "./recap";
import { buildPlanExplorer } from "./plan-explorer";
describe("plan explorer",()=>{
 it("shares the recap calendar period and preserves unknown plan capacity",()=>{
  const events=buildDemoExport("billing").events;
  const recap=buildRecap(events,"30","2026-10-05T12:00:00Z","UTC");
  const rows=buildPlanExplorer(events,recap,{"plan:anthropic-claude-max-5x":2,"plan:openai-chatgpt-pro":1});
  const max=rows.find(r=>r.id==="anthropic-claude-max-5x")!;
  expect(max.quantity).toBe(2);expect(max.monthly).toBe("200");expect(max.daysOut).toBeUndefined();
  expect(rows.every(r=>r.share>=0 && r.share<=1)).toBe(true);
 });
});
