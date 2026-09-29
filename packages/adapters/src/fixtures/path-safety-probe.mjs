import assert from "node:assert/strict";
import { safeIntakeMessage } from "../../dist/browser.js";
import { normalizeProjectKey } from "../../dist/identity.js";
import { joinPath } from "../../dist/platform.js";

const slashes = "/".repeat(1_000_000);
const backslashes = "\\".repeat(1_000_000);
const linuxKey = `${slashes}!`;
const windowsKey = `${backslashes}!`;
assert.ok(normalizeProjectKey(`${linuxKey}/\\/`, "linux") === linuxKey);
assert.ok(normalizeProjectKey(`${windowsKey}\\`, "win32") === windowsKey);
assert.ok(joinPath("linux", `${linuxKey}/`, "/leaf/") === `${linuxKey}/leaf`);
assert.ok(joinPath("win32", `${windowsKey}\\`, "\\leaf\\") === `${windowsKey}\\leaf`);
assert.equal(safeIntakeMessage("!".repeat(1_000_000)), "!".repeat(240));
assert.equal(safeIntakeMessage(`${"!".repeat(1_000_000)}/private`), "<path>");
