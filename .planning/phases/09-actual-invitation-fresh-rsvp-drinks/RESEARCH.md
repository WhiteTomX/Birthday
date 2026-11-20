# Phase 9: Actual Invitation, Fresh RSVP, Drinks & Next-Day Brunch — Research

**Researched:** 2026-11-15
**Domain:** Cloudflare Pages Functions, D1, and plain HTML/CSS/JavaScript
**Confidence:** HIGH for current D1 batch/concurrency behavior; MEDIUM for application design recommendations

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

## Implementation Decisions

### Invitation presentation
- **D-01:** Use a warm, personal German voice, consistent with the existing page.
- **D-02:** Present the invitation as one integrated flow, with the date/time prominent and venue/map details within the invitation rather than in a separate event-details card.
- **D-03:** Put configured park-entry directions in a clearly labelled paragraph, preserving the configured wording.
- **D-04:** When `BUFFET_LIST_URL` is configured, show it in a distinct callout; omit it entirely when unset.

### Fresh RSVP details
- **D-05:** A coming response requires the guest's name and group headcount. Do not collect a contact method.
- **D-06:** A not-coming response requires only the guest's name and has no drink selection.
- **D-07:** Present attendance, headcount, coming-only drink choices, and the next-day signup as one coherent flow. Only guests coming to the birthday can sign up for next-day Brunch or jobs.
- **D-08:** Cap group headcount at 10.

### Drink selector and suggestions
- **D-09:** Use checkboxes for multi-select choices.
- **D-10:** Show fixed drinks and saved guest suggestions in one combined list.
- **D-11:** Place the drink-suggestion control directly below the selector.
- **D-12:** Stage a drink suggestion for the current form and select it there, but do not publish it to the shared catalog until the RSVP is submitted with that drink selected. An unselected suggestion or one from an abandoned form is not published.
- **D-13:** Preserve fixed drink choices, omit “Keine Präferenz,” and explain that drink requests are not guarantees.

### Submission confirmation
- **D-14:** Replace the RSVP section with an inline confirmation while leaving the invitation visible.
- **D-15:** For a coming response, summarize group headcount and selected drink requests, and repeat that drink preferences are not guaranteed.
- **D-16:** Use warm, personal copy for a decline confirmation.

### Next-day brunch and jobs
- **D-17:** Make “Abbau & Brunch am nächsten Tag” one combined job option. There is no separate Brunch option, form, or special brunch headcount.
- **D-18:** Guests wanting to attend the next-day buffet brunch select the combined “Abbau & Brunch am nächsten Tag” option; that option includes both cleanup and buffet brunch.
- **D-19:** Offer Aufbau (maximum 15 people), Teilzeit Barkeeper nach Lust und Laune, Dinge, “Abbau & Brunch am nächsten Tag”, and “Getränkeeinkauf mit Auto (Freitag oder Samstag)”.
- **D-20:** One RSVP contact allocates party attendees by number across multiple selected jobs. Job assignments are optional, and the total assigned count may exceed the party size because one person may take multiple jobs.
- **D-21:** Capacity is optional per job. A capped job closes when full; if only some requested places remain, accept those places and leave the rest unassigned.
- **D-22:** A suggested job is staged for the current signup, selected there, and published for everyone only when the RSVP is submitted with it selected. Unselected or abandoned suggestions are not published. New suggestions are uncapped by default, and duplicate labels reuse the existing option.
- **D-23:** Guests who decline the birthday cannot sign up for next-day jobs or the combined Abbau/brunch option.
- **D-24:** Every job option has a longer German description explaining what the task means. Draft descriptions for the initial jobs for the user's review; do not treat the ambiguous label “Dinge” as permission to invent specific duties.
- **D-25:** Add “Getränkeeinkauf mit Auto (Freitag oder Samstag)” for helping purchase drinks on either day; the helper provides a car. No capacity was requested, so leave this job uncapped.

### the agent's Discretion
Technical implementation details may follow existing project patterns, while preserving the decisions above. In particular, keep the production authorization and merged-schema gates intact; do not make remote changes without the required explicit authorization.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within the expanded Phase 9 scope.

[CITED: `.planning/phases/09-actual-invitation-fresh-rsvp-drinks/09-CONTEXT.md:15-55`]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description (verbatim) | Research support |
|---|---|---|
| AUTH-09 | “Venue, arrival, buffet, and RSVP details remain behind the existing guest authentication; the public page does not reveal them.” | Keep existing auth boundary and verify public/private routes remain isolated. |
| INV-01 | “Guests see the joint-birthday invitation in German with the event date, 5 December, and start time, 17:00.” | Retain invitation date/time and German copy. |
| INV-02 | “Authenticated guests see the venue name and map link from the existing environment values without a fabricated street address.” | Preserve authenticated personalization and safe URL handling. |
| INV-03 | “Authenticated guests see the park-entry directions loaded from `PARK_ENTRY_DIRECTIONS`.” | Keep configured directions server-injected on the authenticated route. |
| INV-04 | “The optional buffet contribution link is loaded from `BUFFET_LIST_URL` and is not shown when unset.” | Retain current optional-link behavior. |
| RSVP-09 | “New confirmations are written to a separate D1 table; existing RSVP records remain unchanged.” | Keep schema changes additive. |
| RSVP-10 | `The fresh round records both “coming” and “not coming” responses; declining responses have no drink selection.` | Branch server validation by attendance. |
| DRINK-01 | “A coming RSVP group can select multiple drink preferences from Bier, Wein, Sekt, Kola, Spezi, Fruchtlimonaden, Wasser, and alkoholfreies Bier.” | Keep one group-level multi-select. |
| DRINK-02 | “Guests can suggest a new drink using the separate suggestion control on the authenticated RSVP page; the suggestion is staged for the current form and is not published to the shared catalog until the RSVP is submitted with that drink selected.” | Stage locally; publish only in final RSVP write. |
| DRINK-03 | “A selected drink suggestion is saved with the submitted RSVP as a safely displayed, unique selectable option for later respondents; an unselected or abandoned suggestion is not published.” | Batch selected catalog insert and association with RSVP; render text safely. |
| DRINK-04 | `The drink form has no “Keine Präferenz” choice and explains that drink requests are not guaranteed.` | Retain current fixed choices and non-guarantee explanation. |
| BRUNCH-01 | “Guests coming to the birthday can select one combined ‘Abbau & Brunch am nächsten Tag’ option; there is no separate Brunch option, form, or special headcount, and guests declining the birthday cannot select the combined option.” | Model the combined task as one job option and gate next-day selections on coming attendance. |
| JOB-01 | “The job catalog offers Aufbau, Teilzeit Barkeeper nach Lust und Laune, Dinge, ‘Abbau & Brunch am nächsten Tag’, and ‘Getränkeeinkauf mit Auto (Freitag oder Samstag)’.” | Seed the specified catalog labels; do not invent alternatives. |
| JOB-02 | “One RSVP contact for a coming party can allocate party members by count across multiple jobs, leave attendees without a job, and assign one attendee to more than one job.” | Persist group-level counts independently per selected option. |
| JOB-03 | “Each job may have an optional maximum. Aufbau has a maximum of 15; capped jobs stop accepting sign-ups when full, while partial availability can be accepted for a group allocation.” | Add nullable capacity and atomic partial reservation. |
| JOB-04 | “Guests can suggest jobs. Suggestions are selected in the current form but are published to the shared catalog only when the RSVP is submitted with them selected; unselected or abandoned suggestions are not published. New suggestions are uncapped by default, and duplicate labels reuse the existing option.” | Stage in the form and publish/resolve duplicates within final submission. |
| JOB-05 | “Every job option has a longer German description explaining the expected task; this includes helping purchase drinks on Friday or Saturday with a car. Initial descriptions are drafts for owner review, and the description for ‘Dinge’ stays general rather than inventing specific duties.” | Add a description field; defer exact copy to owner clarification/review. |

[CITED: `.planning/REQUIREMENTS.md:10-35`; job labels and behavior also quoted in `.planning/phases/09-actual-invitation-fresh-rsvp-drinks/09-CONTEXT.md:43-50`]
</phase_requirements>

## Summary

Preserve the current Pages + Pages Functions + D1 + vanilla frontend and the existing Basic Auth/host attribution, authenticated invitation personalization, fresh RSVP isolation, and safe `textContent` rendering patterns. Existing RSVP/drink code is a useful base, but its drink suggestion POST currently persists catalog options before RSVP; this conflicts with the expanded staged-suggestion requirement and must move publication into successful RSVP persistence. [CITED: `functions/_middleware.js:8-55`; `functions/rsvp/index.js:8-45`; `functions/api/fresh-rsvp.js:12-22, 86-105`; `functions/api/drink-suggestions.js:66-91`; `public/script.js:47-59, 184-215`]

Extend the additive D1 model for job catalog descriptions, optional capacities, and per-RSVP job counts. Compute and reserve capacity inside a D1 transaction batch, accept `min(requested, remaining)` for capped jobs, and persist the accepted count so the UI can report partial fulfillment. Treat D1's documented batch atomicity and serialization as the platform guarantee; the application must still put the capacity check and reservation in that same batch. [CITED: https://developers.cloudflare.com/d1/worker-api/d1-database/#batch; https://developers.cloudflare.com/d1/platform/limits/]

**Primary recommendation:** Keep drink/job suggestions in form state until submit; validate and publish only selected suggestions together with the RSVP and dependent selections in one `DB.batch()`. Make the database—not a frontend or separate preflight read—the authority for capacity reservation.

## Architectural Responsibility Map

| Capability | Primary tier | Secondary tier | Rationale |
|---|---|---|---|
| Invitation/auth and form staging | Browser / Client | Frontend Server | Existing form and Pages Function personalization; auth remains server-enforced. |
| RSVP validation, suggestion publication, allocation counts | API / Backend | Database / Storage | Validate exact payload and perform coordinated writes through the existing authenticated Functions API. |
| Capacity enforcement and persistent catalog/allocations | Database / Storage | API / Backend | Database-side conditional writes in an atomic batch prevent race-prone read-then-write logic. |

## Standard Stack

| Component | Use | Constraint |
|---|---|---|
| Cloudflare Pages + Pages Functions | Static invitation and authenticated API | Retain existing routes and Basic Auth middleware. |
| Cloudflare D1 / SQLite | Additive catalog, RSVP, and allocation schema | Use prepared statements and `DB.batch()` for atomic multi-statement writes. |
| Plain HTML/CSS/JavaScript | Combined RSVP, suggestions, brunch/jobs form | No new framework/package is indicated by the existing project. |

The project already binds D1 as `DB` and configures `migrations/`; keep schema changes additive and preserve historical RSVP rows. [CITED: `wrangler.jsonc`; `.planning/REQUIREMENTS.md:14-17`]

## Expanded-Scope Findings

### 1. Stage suggestions; publish selected options with RSVP

- Replace the current suggestion POST's immediate catalog insert with client-side staging. The staged option should appear selected in the current form, but not in the shared catalog for other guests. [CITED: `.planning/REQUIREMENTS.md:24-25, 34`; `.planning/phases/09-actual-invitation-fresh-rsvp-drinks/09-CONTEXT.md:30-31, 48`]
- At final submit, send selected existing options plus selected staged suggestions. In the authenticated handler, validate/normalize labels, resolve case-insensitive duplicates to canonical catalog rows, and batch RSVP creation, selected suggestion insertion, and associations together. A failure must leave neither a partial RSVP nor an orphaned suggestion. D1 `batch()` runs statements sequentially/non-concurrently and rolls back the sequence on statement failure. [CITED: https://developers.cloudflare.com/d1/worker-api/d1-database/#batch; `functions/api/fresh-rsvp.js:91-105`; `functions/api/drink-suggestions.js:11-17, 66-91`]
- Apply the same staging/publish-on-submit rule to job suggestions. An abandoned or unselected form must not create shared catalog data. Continue rendering all guest-supplied labels and descriptions using DOM text APIs, not HTML interpolation. [CITED: `.planning/REQUIREMENTS.md:34`; `public/script.js:47-59`]

### 2. Optional capacity and group job counts

- Add a nullable per-option maximum (`NULL` meaning uncapped) and per-RSVP allocation counts; do not constrain the sum of job counts to party size because multiple jobs may be assigned to the same attendee and some attendees may have no job. Store accepted counts separately or otherwise retain the actual accepted amount. [CITED: `.planning/REQUIREMENTS.md:32-33`; `.planning/phases/09-actual-invitation-fresh-rsvp-drinks/09-CONTEXT.md:46-47`]
- Validate each requested allocation as a positive integer within the current party size, but validate jobs independently: total allocation across jobs may exceed group size by design. Deduplicate option IDs/labels per payload and reject malformed/non-catalog selections. [CITED: `.planning/phases/09-actual-invitation-fresh-rsvp-drinks/09-CONTEXT.md:45-47`; existing headcount validation: `functions/api/fresh-rsvp.js:72-83`]
- For each capped option, reserve `accepted = min(requested, capacity - already_reserved)`; return zero when full and accept the available remainder for partial fulfillment. Show the accepted count in confirmation rather than claiming the full request succeeded. The requirements lock Aufbau's maximum at 15; no other numeric maxima are specified. [CITED: `.planning/REQUIREMENTS.md:33`; `.planning/phases/09-actual-invitation-fresh-rsvp-drinks/09-CONTEXT.md:45, 47`]

### 3. Concurrency-safe D1 write boundary

- Cloudflare documents each D1 database as single-threaded, processing queries one at a time; concurrent requests queue and may return an overloaded error if that queue fills. D1 `batch()` executes statements sequentially and non-concurrently, with transaction semantics and rollback when a statement fails. [CITED: [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) (updated 2026-10-30); [D1 Database `batch()`](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch) (updated 2026-06-22)]
- Therefore, calculate remaining capacity and write the accepted allocation within the same `DB.batch()` transaction. Do not read availability in one request/query and later issue an unconditional insert: concurrent submissions could both act on stale availability. Batch the RSVP, suggestion publication, associations, and allocations so a failed step does not leave a partial submission. [CITED: [D1 Database `batch()`](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch); [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)]
- The Cloudflare docs establish serialization and batch rollback, but do **not** prescribe this application's partial-allocation SQL/data model or response contract. Confirm the selected SQL implementation against real local D1 and add a concurrent-submission test asserting that the sum of accepted counts never exceeds each cap, plus a partial-capacity test asserting exact accepted/remainder counts. [CITED: https://developers.cloudflare.com/d1/worker-api/d1-database/#batch; https://developers.cloudflare.com/d1/platform/limits/]

### 4. Brunch, Abbau, and job descriptions

- Use one combined job option named “Abbau & Brunch am nächsten Tag”; do not create a separate Brunch option or headcount. Selecting it means cleanup plus buffet brunch, and guests declining the birthday cannot select it. [CITED: `.planning/REQUIREMENTS.md:30`; `.planning/phases/09-actual-invitation-fresh-rsvp-drinks/09-CONTEXT.md:43-50`]
- Include “Getränkeeinkauf mit Auto (Freitag oder Samstag)” as an initial job option. Its longer German description should say that the helper provides a car and helps purchase the drinks on either day; no capacity is set, so keep it uncapped. [CITED: `.planning/REQUIREMENTS.md:31-35`; `.planning/phases/09-actual-invitation-fresh-rsvp-drinks/09-CONTEXT.md:46-55`]
- Every job option needs a longer German description. Draft initial descriptions for owner review, but keep “Dinge” general instead of inventing specific duties. The descriptions are proposed copy, not approved final wording. [CITED: `.planning/REQUIREMENTS.md:31-35`; `.planning/phases/09-actual-invitation-fresh-rsvp-drinks/09-CONTEXT.md:50-52`]
- Existing `drink_options` stores a label and fixed flag but no description or capacity; a separate additive job catalog (or equivalent additive schema) avoids changing historical RSVP data and allows job-specific metadata. [CITED: `migrations/0002_fresh_rsvp_round.sql:15-24`]

## Architecture Patterns

### Recommended submission flow

```text
Authenticated guest
  -> browser loads catalogs and stages new drink/job suggestions locally
  -> guest submits attendance + group size + selected drinks + selected jobs/counts
  -> Pages Function validates attendance and selections
  -> D1 batch: create fresh RSVP; publish selected staged options; associate selected options;
               reserve capped job counts and store accepted allocations
  -> response reports saved RSVP and actual accepted job counts
  -> browser renders safe inline confirmation using textContent
```

### Data/API constraints

- Keep declines name-only with no drinks/jobs/brunch. Coming-only validations are server-side even if controls are hidden in the browser. [CITED: `.planning/REQUIREMENTS.md:14-17, 30`; `functions/api/fresh-rsvp.js:35-84`]
- Use prepared statements with bound guest-provided values; Cloudflare recommends prepared statements and states that binding prevents SQL injection. [CITED: [Prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/) (updated 2026-06-22)]
- Preserve the existing case-insensitive uniqueness behavior for suggestions. Conflict recovery should recognize only the intended unique-label conflict, not mask unrelated D1 errors. [CITED: `migrations/0002_fresh_rsvp_round.sql:15-20`; `functions/api/drink-suggestions.js:9-17, 70-89`]
- Leave auth, host attribution, environment-backed directions/URLs, and public/private route separation unchanged. [CITED: `functions/_middleware.js:8-55`; `functions/rsvp/index.js:8-45`]

## Don't Hand-Roll

| Problem | Avoid | Use instead |
|---|---|---|
| Atomic multi-row RSVP write | Independent writes with compensating cleanup | Prepared statements grouped in D1 `batch()` |
| Capacity reservation | Client-only counts or a preflight read followed by a later unconditional insert | Conditional database write/reservation in the same D1 batch |
| Safe user-generated option text | `innerHTML`/string-built markup | `textContent` and DOM element creation |
| Duplicate option races | Application-only lookup followed by assuming insert succeeds | Unique database constraint plus narrow duplicate-conflict recovery |

## Verification Implications

- **API tests:** verify staged suggestions do not write before submit; selected suggestions publish with the RSVP; unselected/abandoned suggestions do not; duplicate suggestion races resolve canonically; failures roll back; decline payloads cannot include drinks/jobs.
- **Capacity tests:** uncapped options accept requested counts; capped options accept zero when full and exact remaining places when partially available; one attendee may appear in multiple job allocations; total job counts may exceed party size; concurrent requests never overbook.
- **UI tests:** options and descriptions render as text; the single combined Abbau/brunch option communicates the task and buffet; partial acceptance is reported accurately; declining hides/disallows next-day signup.
- **Local integration:** run migrations only against isolated local D1, preserve a historical-row sentinel, and test the Pages/API flow. Do not access production or pass the existing production authorization/schema gates as part of this research.

### Validation Architecture

| Property | Value |
|---|---|
| Framework | Node built-in `node:test` (runtime present: Node v22.23.4) [VERIFIED: `node --version`; `tests/phase-9-api.test.mjs:1-2`] |
| Config | The inspected phase tests use Node's native test modules; no separate framework config is needed for these commands. |
| Quick run | `node --test tests/phase-9-api.test.mjs tests/phase-9-ui.test.mjs` |
| Full phase integration | `node --test tests/phase-9-api.test.mjs tests/phase-9-ui.test.mjs tests/phase-9-e2e.test.mjs` |
| Local Pages/D1 tooling | Wrangler v4.103.0 present [VERIFIED: `wrangler --version`]; e2e test provisions isolated local persistence. |

Nyquist validation is enabled by default because `.planning/config.json` contains `"workflow": {"_auto_chain_active": false}` and does not set `workflow.nyquist_validation` to `false`. [CITED: `.planning/config.json`; existing tests: `tests/phase-9-api.test.mjs`, `tests/phase-9-ui.test.mjs`, `tests/phase-9-e2e.test.mjs`]

## Security Domain

| ASVS area | Applies | Research constraint |
|---|---|---|
| V2/V3 Authentication and session | Yes | Retain server-enforced Basic Auth boundary; do not expose private logistics/catalog writes anonymously. |
| V4 Access control | Yes | Enforce coming-only next-day data rules in the API, not only UI. |
| V5 Input validation | Yes | Exact payload shape, bounded strings, integer counts, known option IDs, capacity checks, and prepared bindings. |
| V6 Cryptography | No new cryptographic design | Preserve existing password/env-secret handling; no crypto library is needed for this scope. |

[CITED: `functions/_middleware.js:8-55`; `functions/api/fresh-rsvp.js:25-84`; Cloudflare prepared-statement docs]

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | `NULL` capacity will represent an uncapped option. | Capacity | Schema/API contract needs adjustment if owner expects a different unlimited representation. |
| A2 | Draft job descriptions are proposed copy and require owner review before being treated as final. | Brunch/jobs | Unreviewed copy could misstate a task; keep “Dinge” general and visibly reviewable. |

## Open Questions

1. **(RESOLVED — owner gate retained):** Draft descriptions are proposed copy, not approved final wording. Plan 09-05 keeps explicit owner review of all five descriptions as a blocking human checkpoint before production changes; “Dinge” remains general. If the owner requests copy changes, update and locally verify the seeds before the schema PR is merged. Until review is recorded, the production gate remains blocked.
2. **(RESOLVED — application contract):** Do not depend on D1 batch result metadata for per-job accepted counts. Insert each conditional capacity reservation in the same atomic batch as the RSVP, then query allocations by the new RSVP ID after the batch. Build the response from the requested jobs and queried rows, reporting zero when a full-capacity job produced no allocation row. Plan 09-07 implements this contract, and Plan 09-09 verifies the exact response and persisted counts using local D1; the plans retain this verification because Cloudflare does not prescribe the application-level allocation model.

The job catalog remains separate from the drink catalog, following the additive schema recommendation below. Because that schema choice is one-way, Plan 09-06 includes a blocking decision checkpoint before the migration is created; implementation must pause if the owner does not confirm the separate catalog.

## Sources

### Official platform documentation

- [Cloudflare D1 Workers Binding API](https://developers.cloudflare.com/d1/worker-api/) — binding and prepared-statement overview.
- [Cloudflare D1 Database: `batch()`](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch) — sequential/non-concurrent statements, transaction semantics, rollback; updated 2026-06-22.
- [Cloudflare D1 limits](https://developers.cloudflare.com/d1/platform/limits/) — per-database single-threaded execution, queue/overload behavior; updated 2026-10-30.
- [Cloudflare D1 prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/) — parameter binding and SQL-injection prevention guidance; updated 2026-06-22.

### Project sources

- `.planning/ROADMAP.md` — expanded Phase 9 scope and success criteria.
- `.planning/REQUIREMENTS.md` — requirements AUTH-09 through JOB-05.
- `.planning/phases/09-actual-invitation-fresh-rsvp-drinks/09-CONTEXT.md` — locked behavior, description-copy limits, and production gate.
- `functions/api/fresh-rsvp.js`, `functions/api/drink-suggestions.js`, `migrations/0002_fresh_rsvp_round.sql`, `public/script.js`, `functions/_middleware.js`, `functions/rsvp/index.js` — current implementation patterns and required changes.
- `tests/phase-9-api.test.mjs`, `tests/phase-9-ui.test.mjs`, `tests/phase-9-e2e.test.mjs` — existing local verification patterns.

**Confidence breakdown:** D1 batch/concurrency semantics HIGH (official current docs); retained architecture MEDIUM-HIGH (in-repo implementation inspected); partial-capacity SQL details MEDIUM (application design not prescribed by Cloudflare docs); job description copy LOW/unresolved pending owner input.

**Valid until:** Recheck Cloudflare D1 docs before implementation if substantial time passes; description copy remains pending clarification.
