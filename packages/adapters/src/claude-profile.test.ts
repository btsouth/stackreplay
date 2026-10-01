import { describe, expect, it } from "vitest";
import { intakeBrowserCandidates } from "./browser.js";
import {
  CLAUDE_PROFILE_MAX_BYTES,
  claudeLocationAccount,
  readClaudeProfile,
} from "./claude-profile.js";
import { CLAUDE_CODE_SESSION } from "./fixtures/content.js";
import { FIXTURE_SALT, syntheticCatalog } from "./fixtures/helpers.js";

const ACCOUNT = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const SALT = "local-account-salt";

/** A synthetic profile with every field Claude Code writes, all invented. */
function profile(oauth: Record<string, unknown> = {}): string {
  return JSON.stringify({
    numStartups: 12,
    projects: { "/home/zzuser/CANARY-repo": { allowedTools: [] } },
    primaryApiKey: "sk-ant-CANARY",
    oauthAccount: {
      accountUuid: ACCOUNT,
      emailAddress: "zz@example.test",
      displayName: "Zed",
      fullName: "Zed CANARY Surname",
      organizationUuid: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      organizationName: "CANARY org",
      organizationRole: "admin",
      organizationType: "claude_max",
      organizationRateLimitTier: "default_claude_max_5x",
      userRateLimitTier: null,
      billingType: "stripe_subscription",
      subscriptionCreatedAt: "2026-05-19T03:00:19Z",
      hasExtraUsageEnabled: false,
      profileFetchedAt: Date.UTC(2026, 8, 30, 12),
      ...oauth,
    },
  });
}

describe("readClaudeProfile", () => {
  it("keeps only the fixed account fields, with the account id hashed", () => {
    const read = readClaudeProfile(profile(), SALT);
    expect(read).toEqual({
      account: expect.stringMatching(/^ca_[0-9a-f]{32}$/u),
      name: "Zed",
      email: "zz@example.test",
      organizationType: "claude_max",
      rateLimitTier: "default_claude_max_5x",
      fetchedOn: "2026-09-30",
    });
    const kept = JSON.stringify(read);
    for (const dropped of [ACCOUNT, "CANARY", "ffffffff", "admin", "stripe", "2026-05-19"])
      expect(kept).not.toContain(dropped);
  });

  it("gives one account the same key from any folder, and another account a different one", () => {
    const a = readClaudeProfile(profile(), SALT)?.account;
    expect(readClaudeProfile(profile({ accountUuid: ACCOUNT.toUpperCase() }), SALT)?.account).toBe(
      a,
    );
    expect(
      readClaudeProfile(profile({ accountUuid: "1a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d" }), SALT)
        ?.account,
    ).not.toBe(a);
    expect(readClaudeProfile(profile(), "another-browser")?.account).not.toBe(a);
  });

  it("reads nothing from a profile without a signed-in account", () => {
    expect(readClaudeProfile("{}", SALT)).toBeUndefined();
    expect(readClaudeProfile(JSON.stringify({ oauthAccount: null }), SALT)).toBeUndefined();
    expect(readClaudeProfile(profile({ accountUuid: "not an id" }), SALT)).toBeUndefined();
    expect(readClaudeProfile("not json", SALT)).toBeUndefined();
  });

  it("drops a field that is not the shape Claude Code writes", () => {
    const read = readClaudeProfile(
      profile({
        displayName: "a\u0007b".repeat(60),
        emailAddress: "no-at-sign",
        organizationType: "Claude Max!",
        organizationRateLimitTier: 7,
        profileFetchedAt: "yesterday",
      }),
      SALT,
    );
    expect(read).toEqual({ account: expect.stringMatching(/^ca_/u) });
    expect(CLAUDE_PROFILE_MAX_BYTES).toBeGreaterThan(64 * 1024);
  });
});

describe("claudeLocationAccount", () => {
  it("is undefined for a file outside a projects folder", () => {
    expect(claudeLocationAccount("notes/a.jsonl", "claude-code", SALT)).toBeUndefined();
    expect(claudeLocationAccount(".claude/projects/p/a.jsonl", "claude-code", SALT)).toMatch(
      /^claude-code:sr_[0-9a-f]{32}$/u,
    );
  });

  it("names exactly the accounts a real browser scan records", async () => {
    const files = [
      { path: ".claude/projects/p/a.jsonl", group: "claude-code" },
      { path: "projects/p/a.jsonl", group: "claude-code-2" },
    ];
    const result = await intakeBrowserCandidates(
      files.map(({ path, group }) => ({
        path,
        group,
        size: CLAUDE_CODE_SESSION.length,
        lastModified: Date.parse("2026-09-21T12:00:00Z"),
        text: async () => CLAUDE_CODE_SESSION,
      })),
      syntheticCatalog(),
      { now: "2026-09-21T12:00:00.000Z", salt: FIXTURE_SALT, sourceRootSalt: SALT },
    );
    const recorded = new Set(
      result.exported?.events.map((event) => event.source.resourceInstanceId),
    );
    expect(recorded).toEqual(
      new Set(files.map(({ path, group }) => claudeLocationAccount(path, group, SALT))),
    );
  });
});
