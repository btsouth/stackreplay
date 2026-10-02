# Catalog watcher triage: 2026-10-01

The first human queue review covered 63 open GitHub issues: 62 source episodes and
one rolling model-coverage queue. Twenty-nine episodes were closed as page noise;
34 remained open at that checkpoint. No accepted catalog, price, model alias, plan
rule or watcher state was changed. W3 catalog drafting remains deferred.

## October 2 source-health follow-up

The two source-health episodes were repaired from their official replacements:

- [#25](https://github.com/btsouth/stackreplay/issues/25): the Command Code Provider
  API model list moved from `commandcode.ai/provider/v1/models` to the live
  `api.commandcode.ai/provider/v1/models`. All 21 model references now use the
  live endpoint, and the watcher host policy includes the API origin.
- [#26](https://github.com/btsouth/stackreplay/issues/26): Anthropic consolidated
  the retired Pro-usage article into
  `support.claude.com/en/articles/8325606-what-is-the-pro-plan`. The dead source
  and its Included usage term now point to the current article.
- [#79](https://github.com/btsouth/stackreplay/issues/79) and
  [#82](https://github.com/btsouth/stackreplay/issues/82): Anthropic's current
  deprecation page confirms Sonnet 4.5 was deprecated September 30, 2026, with
  API retirement November 30, 2026. The model was already `legacy`; its source
  title and verification date now record the published lifecycle facts. No
  capacity, pricing or current-availability claim was inferred.

Command Code's Kimi K3 boost still ends October 7, and the provider's free-request
wording remains temporary. The four per-page reports were consolidated into
[#62](https://github.com/btsouth/stackreplay/issues/62) for the October 8 source
recheck instead of being turned into an unsupported Replay capacity model.

## October 2 signal-quality consolidation

The per-source episode model was replaced with the bounded source-review digest
described in [Catalog watcher](catalog-watcher.md). The migration also requests US
English, extracts `main`/`article` content instead of navigation and footers,
classifies known counters/navigation as noise and silently rebaselines existing
fingerprints under `normalizerVersion: 2`.

The backlog was consolidated at the same time:

- 10 Google locale/model-page episodes were closed as superseded by the durable
  deprecation review [#43](https://github.com/btsouth/stackreplay/issues/43), the
  pricing review [#55](https://github.com/btsouth/stackreplay/issues/55), and the
  rolling coverage queue [#27](https://github.com/btsouth/stackreplay/issues/27).
- [#66](https://github.com/btsouth/stackreplay/issues/66) and
  [#68](https://github.com/btsouth/stackreplay/issues/68) were closed as duplicate
  Google subscription episodes; English US review remains in
  [#67](https://github.com/btsouth/stackreplay/issues/67).
- [#57](https://github.com/btsouth/stackreplay/issues/57),
  [#78](https://github.com/btsouth/stackreplay/issues/78) and
  [#80](https://github.com/btsouth/stackreplay/issues/80) were closed as
  documentation/navigation changes with no accepted model, price, limit or access
  correction identified.
- [#76](https://github.com/btsouth/stackreplay/issues/76) was closed as the FAQ
  duplicate of the Kiro pricing review
  [#77](https://github.com/btsouth/stackreplay/issues/77).
- [#58](https://github.com/btsouth/stackreplay/issues/58) was closed after the
  apparent Command Code diff resolved to ordering, a preview qualifier and
  unchanged model rates.
- [#83](https://github.com/btsouth/stackreplay/issues/83),
  [#84](https://github.com/btsouth/stackreplay/issues/84),
  [#85](https://github.com/btsouth/stackreplay/issues/85) and
  [#86](https://github.com/btsouth/stackreplay/issues/86) were closed after the
  documented MiniMax change was verified as Token Plan/M Plan terminology with
  unchanged numeric pricing.

The resulting queue is six issues: five durable review tracks
([#27](https://github.com/btsouth/stackreplay/issues/27),
[#43](https://github.com/btsouth/stackreplay/issues/43),
[#55](https://github.com/btsouth/stackreplay/issues/55),
[#67](https://github.com/btsouth/stackreplay/issues/67) and
[#77](https://github.com/btsouth/stackreplay/issues/77)) plus one consolidated
Command Code recheck ([#62](https://github.com/btsouth/stackreplay/issues/62)) due
October 8. Existing individual issues are historical; new actionable changes use
the digest marker and no longer create one issue per URL.

## Evidence and decision boundary

The review used the full normalized source text in the
[September 30 state](https://github.com/btsouth/stackreplay/blob/5ebcbc27258ea1588bbf42f78385854203b74b28/state.json)
and [October 1 state](https://github.com/btsouth/stackreplay/blob/e0cd479031b4e408accba174adc43b54065b528a/state.json),
plus every open issue body and its comment history. There were no comments at
this checkpoint. Full text comparisons were required because issue snippets are
capped and can omit important changes. Reordered identical lines were considered
alongside changed lines; dates, values and model/plan associations were not
removed to make a comparison pass.

The October 1 [scheduled run](https://github.com/btsouth/stackreplay/actions/runs/36831814505)
succeeded. State observation times describe retrieval, not effective dates.
The following source facts were also checked live on October 1:

- [Command Code pricing/limits](https://commandcode.ai/docs/resources/pricing-limits)
  reports boosted Kimi K3 per-model allowances through October 7: $60 on GOAT
  and $70 on Pro, returning to $20 and $30 from October 8. It also reports
  300 daily free Ling 3.1 Flash requests. Review these commercial disclosures
  and expiry without converting them into an unsupported Replay capacity model.
- [Anthropic deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations)
  lists Sonnet 4.5 as deprecated September 30, with API retirement November 30
  and Sonnet 5.5 as its recommended replacement. Verify lifecycle handling;
  deprecation does not mean the API is already retired or every subscription removed it.
- [Kiro pricing](https://kiro.dev/pricing/) contains the new workflow-credit FAQ.
  The saved watcher text includes the question without its answer, so its
  successful HTTP status does not prove that the normalized page captured all terms.

## Remaining queue

| Label | Open issues | Next action |
| --- | ---: | --- |
| `catalog:review` | 19 | Verify source changes against accepted records; open a bounded catalog PR only for supported corrections |
| `catalog:source-review` | 12 | Review substantial/locale-switched Google pages, starting with pricing #55 and deprecations #43; do not infer equivalence from truncated diffs |
| `catalog:source-health` | 2 | Locate and verify replacements for the 404 references in #25 and #26 |
| `catalog:coverage` | 1 | Continue stable-release research in #27 using the existing coverage policy |

Issues #59-62 and #79/#82 also carry `catalog:time-sensitive`. Start with the
October 7 promotion and Sonnet lifecycle notices. Review #66-68 together for
Google subscription access, #76/#77 for Kiro terms, and #83-86 for MiniMax plan
terminology. Preview-only identities and moving `latest` pointers in #27 do not
become accepted model releases merely because the watcher found them.

## Episode decisions

`catalog:noise` issues are closed as not planned for this episode. Other issues
remain open. Reasons below are the review record; no issue description or hidden
watcher marker was replaced.

| Issue | Decision | Reason |
| --- | --- | --- |
| [#25](https://github.com/btsouth/stackreplay/issues/25) | Open: source-health | Stored source returned HTTP 404; locate and verify its official replacement before changing references. |
| [#26](https://github.com/btsouth/stackreplay/issues/26) | Open: source-health | Stored source returned HTTP 404; locate and verify its official replacement before changing references. |
| [#27](https://github.com/btsouth/stackreplay/issues/27) | Open: coverage | Rolling research queue; apply the existing policy to stable releases, previews and unresolved aliases. |
| [#42](https://github.com/btsouth/stackreplay/issues/42) | Open: source-review | Large page comparison needs direct verification; locale switches or truncated diffs do not establish semantic equivalence. |
| [#43](https://github.com/btsouth/stackreplay/issues/43) | Open: source-review | Large page comparison needs direct verification; locale switches or truncated diffs do not establish semantic equivalence. |
| [#44](https://github.com/btsouth/stackreplay/issues/44) | Open: source-review | Large page comparison needs direct verification; locale switches or truncated diffs do not establish semantic equivalence. |
| [#45](https://github.com/btsouth/stackreplay/issues/45) | Open: source-review | Large page comparison needs direct verification; locale switches or truncated diffs do not establish semantic equivalence. |
| [#46](https://github.com/btsouth/stackreplay/issues/46) | Open: source-review | Large page comparison needs direct verification; locale switches or truncated diffs do not establish semantic equivalence. |
| [#47](https://github.com/btsouth/stackreplay/issues/47) | Open: source-review | Large page comparison needs direct verification; locale switches or truncated diffs do not establish semantic equivalence. |
| [#48](https://github.com/btsouth/stackreplay/issues/48) | Open: source-review | Large page comparison needs direct verification; locale switches or truncated diffs do not establish semantic equivalence. |
| [#49](https://github.com/btsouth/stackreplay/issues/49) | Open: source-review | Large page comparison needs direct verification; locale switches or truncated diffs do not establish semantic equivalence. |
| [#50](https://github.com/btsouth/stackreplay/issues/50) | Open: source-review | Large page comparison needs direct verification; locale switches or truncated diffs do not establish semantic equivalence. |
| [#51](https://github.com/btsouth/stackreplay/issues/51) | Closed: noise | Model lineup unchanged; capitalization and prose edits only. |
| [#52](https://github.com/btsouth/stackreplay/issues/52) | Open: source-review | Large page comparison needs direct verification; locale switches or truncated diffs do not establish semantic equivalence. |
| [#53](https://github.com/btsouth/stackreplay/issues/53) | Open: source-review | Large page comparison needs direct verification; locale switches or truncated diffs do not establish semantic equivalence. |
| [#54](https://github.com/btsouth/stackreplay/issues/54) | Closed: noise | Related-news and footer recommendations changed; the model article is unchanged. |
| [#55](https://github.com/btsouth/stackreplay/issues/55) | Open: source-review | Large page comparison needs direct verification; locale switches or truncated diffs do not establish semantic equivalence. |
| [#56](https://github.com/btsouth/stackreplay/issues/56) | Closed: noise | Pricing tab/navigation labels changed; published plan prices and terms are unchanged. |
| [#57](https://github.com/btsouth/stackreplay/issues/57) | Open: review | Gateway context-window and fallback behavior changed; check matching model/access copy. |
| [#58](https://github.com/btsouth/stackreplay/issues/58) | Open: review | Stealth preview access gains an explicit duration qualifier; check lineup wording. |
| [#59](https://github.com/btsouth/stackreplay/issues/59) | Open: review | GOAT Kimi K3 per-model allowance is temporarily boosted; source says through October 7. |
| [#60](https://github.com/btsouth/stackreplay/issues/60) | Open: review | New Kimi promotion and Ling free-request count; check referenced Max lineup/terms. |
| [#61](https://github.com/btsouth/stackreplay/issues/61) | Open: review | Pro Kimi K3 per-model allowance is temporarily boosted; source says through October 7. |
| [#62](https://github.com/btsouth/stackreplay/issues/62) | Open: review | Time-bounded Kimi allowances and a Ling free-request limit changed; review terms and expiry. |
| [#63](https://github.com/btsouth/stackreplay/issues/63) | Closed: noise | Only the cross-site model count changed from 89 to 88. |
| [#64](https://github.com/btsouth/stackreplay/issues/64) | Closed: noise | Only the cross-site model count changed from 89 to 88. |
| [#65](https://github.com/btsouth/stackreplay/issues/65) | Closed: noise | Only the cross-site model count changed from 89 to 88. |
| [#66](https://github.com/btsouth/stackreplay/issues/66) | Open: review | Subscription-page product/access copy changed; compare the complete affected plan content. |
| [#67](https://github.com/btsouth/stackreplay/issues/67) | Open: review | Subscription-page product/access copy and footnote order changed; check English US plan facts. |
| [#68](https://github.com/btsouth/stackreplay/issues/68) | Open: review | Same US subscription page without the locale query; review alongside #67. |
| [#69](https://github.com/btsouth/stackreplay/issues/69) | Closed: noise | Likes, developer followers and download counters only. |
| [#70](https://github.com/btsouth/stackreplay/issues/70) | Closed: noise | Developer followers, downloads and related Spaces only. |
| [#71](https://github.com/btsouth/stackreplay/issues/71) | Closed: noise | Likes, followers, downloads, Spaces and a relative collection age only. |
| [#72](https://github.com/btsouth/stackreplay/issues/72) | Closed: noise | Only an Agents navigation entry was added. |
| [#73](https://github.com/btsouth/stackreplay/issues/73) | Closed: noise | Only the download counter changed; reordered Spaces have identical content. |
| [#74](https://github.com/btsouth/stackreplay/issues/74) | Closed: noise | Only an Agents navigation entry was added. |
| [#75](https://github.com/btsouth/stackreplay/issues/75) | Closed: noise | Developer followers, downloads and related Spaces only. |
| [#76](https://github.com/btsouth/stackreplay/issues/76) | Open: review | New workflows-credit question and Kiro Web terminology; check published terms. |
| [#77](https://github.com/btsouth/stackreplay/issues/77) | Open: review | New workflows-credit question on pricing page; review alongside #76. |
| [#78](https://github.com/btsouth/stackreplay/issues/78) | Open: review | Custom-provider protocol compatibility changed; check whether any accepted access guidance needs correction. |
| [#79](https://github.com/btsouth/stackreplay/issues/79) | Open: review | Claude Sonnet 4.5 deprecated September 30; API retirement scheduled November 30. |
| [#80](https://github.com/btsouth/stackreplay/issues/80) | Open: review | Messages model enumeration/descriptions changed beyond navigation; verify against exact accepted identities. |
| [#81](https://github.com/btsouth/stackreplay/issues/81) | Closed: noise | SDK pagination wording and API navigation changed; no cataloged plan/model/pricing fact changed. |
| [#82](https://github.com/btsouth/stackreplay/issues/82) | Open: review | Release notes repeat Sonnet 4.5 deprecation; review with #79. |
| [#83](https://github.com/btsouth/stackreplay/issues/83) | Open: review | MiniMax preview subscription-access label changed from Token Plan to M Plan. |
| [#84](https://github.com/btsouth/stackreplay/issues/84) | Open: review | MiniMax preview subscription-access label changed from Token Plan to M Plan. |
| [#85](https://github.com/btsouth/stackreplay/issues/85) | Open: review | MiniMax subscription billing terminology changed; numeric API rates in the stored comparison did not. |
| [#86](https://github.com/btsouth/stackreplay/issues/86) | Open: review | MiniMax preview subscription-access label changed from Token Plan to M Plan. |
| [#87](https://github.com/btsouth/stackreplay/issues/87) | Closed: noise | Only the model pull counter changed. |
| [#88](https://github.com/btsouth/stackreplay/issues/88) | Closed: noise | Only Token Plan/M Plan navigation labels changed; function-call content is unchanged. |
| [#89](https://github.com/btsouth/stackreplay/issues/89) | Closed: noise | Only the relative updated-at label changed. |
| [#90](https://github.com/btsouth/stackreplay/issues/90) | Closed: noise | Only a related-help link changed; usage-credit terms are unchanged. |
| [#91](https://github.com/btsouth/stackreplay/issues/91) | Closed: noise | Only a related-help link changed; Agent SDK entitlement text is unchanged. |
| [#92](https://github.com/btsouth/stackreplay/issues/92) | Closed: noise | Only the relative updated-at label changed. |
| [#93](https://github.com/btsouth/stackreplay/issues/93) | Closed: noise | Only a generated Help Center footer identifier changed. |
| [#94](https://github.com/btsouth/stackreplay/issues/94) | Closed: noise | Only a related-help link changed; cancellation instructions are unchanged. |
| [#95](https://github.com/btsouth/stackreplay/issues/95) | Closed: noise | Only a generated Help Center footer identifier changed. |
| [#96](https://github.com/btsouth/stackreplay/issues/96) | Closed: noise | Only generated Help Center footer identifiers/booleans changed; article content is unchanged. |
| [#97](https://github.com/btsouth/stackreplay/issues/97) | Closed: noise | Only a generated Help Center footer identifier changed. |
| [#98](https://github.com/btsouth/stackreplay/issues/98) | Closed: noise | Only generated Help Center footer identifiers/booleans changed; article content is unchanged. |
| [#99](https://github.com/btsouth/stackreplay/issues/99) | Closed: noise | Only a migration-guide link was added; model availability is unchanged. |
| [#100](https://github.com/btsouth/stackreplay/issues/100) | Closed: noise | Only header/footer Token Plan labels changed to Plan; the model article is unchanged. |
| [#101](https://github.com/btsouth/stackreplay/issues/101) | Closed: noise | Only header/footer Token Plan labels changed to Plan; the model article is unchanged. |

## Follow-up limits

Noise can recur when counters or navigation change again. This review closes
specific episodes and leaves watcher hashing unchanged. Source-region extraction
or narrow boilerplate rules would require a separate change with preserved prices,
limits, availability and dates; broad number removal is not an acceptable shortcut.
Provider challenges, 404s and incomplete rendered text stay visible. Neither a
new baseline nor closing every alert would substitute for source review.
