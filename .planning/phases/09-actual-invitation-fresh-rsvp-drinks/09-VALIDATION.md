---
phase: "09"
slug: "actual-invitation-fresh-rsvp-drinks"
status: approved
nyquist_compliant: true
wave_0_complete: false
created: "2026-11-14"
---

# Phase 09 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in `node:test` (Node v22.23.4) |
| **Config file** | none — native Node test runner |
| **Quick run command** | `node --test tests/phase-9-api.test.mjs tests/phase-9-ui.test.mjs` |
| **Full suite command** | `node --test --test-concurrency=1 tests/phase-9-api.test.mjs tests/phase-9-ui.test.mjs tests/phase-9-e2e.test.mjs tests/phase-9-jobs-e2e.test.mjs` |
| **Estimated runtime** | Quick tests under 30 seconds; complete serialized local integration ~3 minutes as a final gate |

---

## Sampling Rate

- **After every task commit:** Run the smallest relevant API or UI test command listed in that task's plan.
- **After each plan wave:** Run the focused verification commands for the tasks in that wave; do not repeat the complete integration suite.
- **Final local gate:** Run `node --test --test-concurrency=1 tests/phase-9-api.test.mjs tests/phase-9-ui.test.mjs tests/phase-9-e2e.test.mjs tests/phase-9-jobs-e2e.test.mjs` and `powershell -NoProfile -ExecutionPolicy Bypass -File tests/phase-9-migration-check.ps1` once before the production checkpoint.
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** <30 seconds for task-level feedback; reserve the ~60-second full integration suite for the final local gate.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 09-01 | 1 | RSVP-09, RSVP-10, DRINK-01 | T-09-01 | Additive fresh tables, exact fixed-drink set, decline constraints, no historical writes | Local D1 migration | `wrangler d1 migrations apply birthday-rsvps --local --persist-to .wrangler/phase-9-migration-smoke` | Yes | ✅ prior pass |
| 09-01-02 | 09-01 | 1 | RSVP-09, RSVP-10, DRINK-01 | T-09-01 | Clean/populated migration checks and historical sentinel preservation | Migration regression | `powershell -NoProfile -ExecutionPolicy Bypass -File tests/phase-9-migration-check.ps1` | Yes | ✅ prior pass |
| 09-02-01 | 09-02 | 2 | RSVP-09, RSVP-10, DRINK-01, DRINK-02, DRINK-03 | T-09-02 | Exact payloads, coming/decline branches, host attribution, atomic drink links | API unit | `node --experimental-default-type=module --test tests/phase-9-api.test.mjs` | Yes | ✅ prior pass |
| 09-02-02 | 09-02 | 2 | DRINK-01, DRINK-02, DRINK-03 | T-09-03 | Fixed/suggested catalog, normalized labels, duplicate recovery | API unit | `node --experimental-default-type=module --test tests/phase-9-api.test.mjs` | Yes | ✅ prior pass |
| 09-03-01 | 09-03 | 3 | AUTH-09, INV-02, INV-03, INV-04 | T-09-04 | Environment URL/empty/encoding boundaries and escaped invitation values | Invitation unit | `node --experimental-default-type=module --test tests/phase-9-invitation.test.mjs` | Yes | ✅ prior pass |
| 09-03-02 | 09-03 | 3 | AUTH-09, INV-01, INV-02, INV-03, INV-04 | T-09-04 | Protected/private logistics, date/time copy, public-root separation | Invitation unit | `node --experimental-default-type=module --test tests/phase-9-invitation.test.mjs` | Yes | ✅ prior pass |
| 09-04-01 | 09-04 | 4 | INV-01, INV-02, INV-03, INV-04, RSVP-10, DRINK-01, DRINK-04 | T-09-05 | German invitation, accessible single RSVP, fixed checkbox selector, no neutral option | UI unit | `node --experimental-default-type=module --test tests/phase-9-ui.test.mjs` | Yes | ✅ prior pass |
| 09-04-02 | 09-04 | 4 | RSVP-10, DRINK-01, DRINK-02, DRINK-03, DRINK-04 | T-09-05 | Safe DOM rendering, selected suggestions, coming/decline payloads and confirmations | UI unit | `node --experimental-default-type=module --test tests/phase-9-ui.test.mjs` | Yes | ✅ prior pass |
| 09-05-01 | 09-05 | 9 | AUTH-09, INV-01–INV-04, RSVP-09–RSVP-10, DRINK-01–DRINK-04 | T-09-06 | Existing local invitation/drink flow and historical-row checks rerun after implementation | Pages/D1 E2E | `node --test --test-concurrency=1 tests/phase-9-e2e.test.mjs tests/phase-9-jobs-e2e.test.mjs` | Yes | ✅ pass |
| 09-05-02 | 09-05 | 9 | AUTH-09, INV-01–INV-04, RSVP-09–RSVP-10, DRINK-01–DRINK-04, BRUNCH-01, JOB-01–JOB-05 | T-09-06, T-09-11 | Owner authorization names target and confirms configuration and draft-description review after final local checks | Blocking decision | N/A — human checkpoint | N/A | ⏸ blocked |
| 09-05-03 | 09-05 | 9 | AUTH-09, RSVP-09 | T-09-06, T-09-11 | Only remaining Phase 09 migrations may apply after all merge/target/local gates; unrelated pending migrations stop | Production-only manual gate | `wrangler d1 migrations list birthday-rsvps --remote` — only after all preconditions | N/A | ⏸ blocked |
| 09-06-01 | 09-06 | 5 | BRUNCH-01, JOB-01, JOB-02, JOB-03, JOB-05 | T-09-07 | One fixed Aufbau path, exact six seeds, coming-only and history-preserving D1 writes | Pages/D1 tracer | `node --test tests/phase-9-jobs-e2e.test.mjs` | Created by this task | ✅ pass |
| 09-06-02 | 09-06 | 5 | BRUNCH-01, JOB-01, JOB-05 | T-09-07 | Stable catalog order, descriptions, safe rendering, full/partial/uncapped display | API/UI unit | `node --test tests/phase-9-api.test.mjs tests/phase-9-ui.test.mjs` | Yes | ✅ pass |
| 09-07-01 | 09-07 | 6 | RSVP-09, RSVP-10, BRUNCH-01, JOB-02, JOB-03 | T-09-08 | Per-job boundaries, aggregate counts above party size, atomic partial/full/uncapped reservations | API unit | `node --test tests/phase-9-api.test.mjs` | Yes | ✅ pass |
| 09-07-02 | 09-07 | 6 | DRINK-02, DRINK-03, JOB-04 | T-09-08 | Staging no-write behavior, 80-code-point/Unicode boundaries, canonical duplicates, selected-only batch publish and rollback | API unit | `node --test tests/phase-9-api.test.mjs` | Yes | ✅ pass |
| 09-08-01 | 09-08 | 7 | BRUNCH-01, JOB-01, JOB-02, JOB-03, JOB-05 | T-09-09 | One combined brunch option, independent counts, decline gating, descriptions/capacity in UI | UI unit | `node --test tests/phase-9-ui.test.mjs` | Yes | ✅ pass |
| 09-08-02 | 09-08 | 7 | JOB-02, JOB-03, JOB-04, JOB-05 | T-09-09 | Safe staged job labels, duplicate reuse, exact accepted/partial/unassigned confirmation | UI unit | `node --test tests/phase-9-ui.test.mjs` | Yes | ✅ pass |
| 09-09-01 | 09-09 | 8 | AUTH-09, INV-01–INV-04, RSVP-09–RSVP-10, DRINK-01–DRINK-04, BRUNCH-01, JOB-01–JOB-05 | T-09-10 | Full local flow, all edge probes, concurrent cap 15, suggestion atomicity and history preservation | Full local integration | `node --test --test-concurrency=1 tests/phase-9-api.test.mjs tests/phase-9-ui.test.mjs tests/phase-9-e2e.test.mjs tests/phase-9-jobs-e2e.test.mjs` | Yes | ✅ pass |
| 09-09-02 | 09-09 | 8 | RSVP-09, BRUNCH-01, JOB-01, JOB-03, JOB-05 | T-09-10 | Clean/populated migration, exact seed/default checks, forbidden decline allocation, byte-identical history | Local migration regression | `powershell -NoProfile -ExecutionPolicy Bypass -File tests/phase-9-migration-check.ps1` | Yes | ✅ pass |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Spec-Less Edge Probe Coverage (29 candidates)

Every reported edge is assigned an explicit assertion or a named backstop below. No candidate is dismissed because its probe was unclassified.

| Requirement | Probe categories | Resolution and evidence |
|-------------|------------------|-------------------------|
| AUTH-09 | unclassified | Explicit: anonymous `/` remains public; private invitation and APIs return 401; both host passwords access the same invitation in `09-05-01` and `09-09-01`. |
| INV-01 | unclassified | Explicit: exact German `5. Dezember` and `17:00 Uhr`, with no year, in `09-03-02` / `09-04-01`. |
| INV-02 | empty, encoding | Explicit: missing/blank and invalid URL forms are omitted; HTTPS values and text/attribute escaping are checked in `09-03-01` and `09-09-01`. |
| INV-03 | unclassified | Explicit: configured park-entry wording is preserved and escaped; unset values do not invent fallback directions in `09-03-01`. |
| INV-04 | unclassified | Explicit: blank/unset buffet URL omits the callout; valid HTTPS URL appears; unsafe or credential-bearing URL is omitted in `09-03-01` / `09-05-01`. |
| RSVP-09 | unclassified | Explicit: fresh records use separate tables; clean and populated migration checks compare historical values and timestamp bytes before/after in `09-01-02` / `09-09-02`. |
| RSVP-10 | boundary, precision | Explicit: 1 and 10 accepted; 0, 11, null, empty, numeric strings, and fractions rejected; declines have zero group size and no drink/job associations in `09-02-01`, `09-07-01`, `09-09-01`. |
| DRINK-01 | adjacency, empty, ordering | Explicit: exact eight fixed labels and stable order; multi-select combinations and empty selection are valid; no neutral option appears in `09-04-01`, `09-06-02`, `09-09-01`. |
| DRINK-02 | unclassified | Explicit: separate suggestion control returns staged data only; catalog counts are unchanged until selected final RSVP submission in `09-07-02` / `09-09-01`. |
| DRINK-03 | unclassified | Explicit: selected suggestions publish and associate atomically; unselected/abandoned/failed-batch labels do not persist; later authenticated reads reuse the canonical option in `09-07-02` / `09-09-01`. |
| DRINK-04 | concurrency | Explicit: the neutral preference is absent and non-guarantee explanation is present; concurrent duplicate selected suggestions create one canonical row in `09-04-01` / `09-09-01`. |
| BRUNCH-01 | unclassified | Explicit: exactly one combined Abbau/brunch option, no separate brunch control/headcount, and decline payload rejection in `09-06-01`, `09-08-01`, `09-09-01`. |
| JOB-01 | unclassified | Explicit: exactly six fixed labels in D-19 order; drinks-shopping is seeded fixed data, not a suggestion, in `09-06-01` / `09-09-02`. |
| JOB-02 | boundary, precision | Explicit: each allocation is a positive integer no greater than party size; empty is valid; per-job counts are independent and total assignments may exceed the party in `09-07-01`, `09-08-01`. |
| JOB-03 | boundary, adjacency, empty, ordering, precision | Explicit: Aufbau cap 15, available counts at zero/partial/full edges, exact `min(requested, remaining)`, uncapped jobs, stable catalog order, and parallel requests whose accepted sum stays at 15 in `09-06-02`, `09-07-01`, `09-09-01`. |
| JOB-04 | empty, encoding | Explicit: trim/whitespace/NFC normalization, 80 versus 81 Unicode code-point boundaries (including supplementary characters), empty rejection, canonical duplicate reuse, and no-write staging in `09-07-02` / `09-09-01`. |
| JOB-05 | adjacency, empty, ordering | Explicit: all six descriptions are nonempty German review drafts with a measurable longer-copy check, exact catalog order, general Dinge wording, and car/Friday-or-Saturday shopping description without invented timing/logistics in `09-06-02`, `09-09-02`. |

### Flagged assumptions and backstops

- **A1 — uncapped representation:** `NULL` means uncapped; migration, API and catalog tests verify that representation for all fixed jobs except Aufbau.
- **A2 — description review:** all six descriptions remain drafts until the owner reviews them at the preserved Plan 09-05 blocking checkpoint.
- **D1 SQL return shape:** accepted counts are read back for the just-created RSVP after the atomic batch; local D1 integration asserts the exact API response and persisted allocations.

---

## Foundation Verification Requirements

- Existing Node test infrastructure and Phase 09 API, UI, and end-to-end test files cover the current harness; Plan 09-06-01 creates the job tracer before dependent tasks, and later integration extends it; no dependency installation is needed. There are no missing existing-code requirements that call for a separate wave-0 implementation task.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Production configuration and both Phase 09 migrations | AUTH-09, RSVP-09 | Requires owner confirmation of the production project, D1 binding, configuration, merged schema changes, description-draft review, and explicit authorization | Preserve Plan 09-05 gates. Do not run remote commands unless local checks pass, both schema migrations are merged, the intended target and migration list are confirmed, and the owner explicitly authorizes the operation. |

---

## Validation Sign-Off

- [x] Every implementation task has an automated verify or an explicit dependency on its tracer; runnable automated commands have an immediate `<fails_when>` signal. Human decision checkpoints use explicit human checks.
- [x] Sampling continuity: no 3 consecutive implementation tasks without automated verify
- [x] All missing verification references are assigned to a plan task; no separate wave-0 task is required
- [x] No watch-mode flags
- [x] Task-level feedback latency is under 30 seconds; the longer complete integration suite is reserved for the final local gate
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** Plan verification passed; implementation and execution-time validation remain pending.
