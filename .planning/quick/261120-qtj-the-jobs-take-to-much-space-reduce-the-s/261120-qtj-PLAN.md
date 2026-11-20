---
phase: quick
plan: 261120-qtj
type: execute
wave: 1
depends_on: []
files_modified:
  - public/script.js
  - public/style.css
  - tests/phase-9-ui.test.mjs
autonomous: true
requirements: []
must_haves:
  truths:
    - "Uncapped jobs show no capacity sentence, while capped jobs retain their remaining/full status."
    - "The Anzahl control sits at the upper-right of each job card without adding height to the card's content flow."
    - "The gap between a job description and its Plätze status is visibly smaller at desktop and mobile widths, without overlap."
    - "The count input remains accessible by its existing job-specific label and description/status relationships."
  artifacts:
    - path: public/script.js
      provides: "Job-option rendering without the uncapped-capacity sentence"
    - path: public/style.css
      provides: "Compact job-card layout with the count control at the upper-right"
    - path: tests/phase-9-ui.test.mjs
      provides: "Regression coverage for uncapped and capped text and the job-card layout contract"
  key_links:
    - from: public/script.js
      to: public/style.css
      via: "Rendered .job-option, .job-option-details, .job-option-capacity, and .job-count-label elements use the compact card layout."
    - from: tests/phase-9-ui.test.mjs
      to: public/script.js
      via: "The RSVP UI test loads and exercises the production job-option renderer."
---

<objective>
Reduce the vertical space used by job-option cards while retaining clear capacity information for capped jobs.

Purpose: Make the help-options section more compact by removing redundant uncapped wording, keeping the count control in the card's upper-right corner, and tightening the description-to-capacity spacing.
Output: Updated job-option rendering and responsive styles, with focused UI regression tests.
</objective>

<execution_context>
@.github/gsd-core/workflows/quick.md
@.github/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@AGENTS.md
@public/script.js
@public/style.css
@tests/phase-9-ui.test.mjs

This is a focused presentation change within the current Phase 09 work. Preserve capped availability messages, full-job behavior, the existing count-input accessibility attributes, and the separate job catalog. Do not change API behavior, markup in `public/rsvp/index.html`, or production configuration.
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Compact job-option cards and cover their display behavior</name>
  <files>public/script.js, public/style.css, tests/phase-9-ui.test.mjs</files>
  <behavior>
    - An uncapped option with max_capacity and remaining both null renders no capacity sentence.
    - A capped option continues to show its remaining Plätze text, and a full option continues to show its full status and disabled count input.
    - The Anzahl label and input are positioned at the card's upper-right without participating in normal vertical layout; reserve enough space so they do not obscure the title or description on narrow screens.
    - Reduce the visual gap between the description and capacity status at desktop and mobile widths while retaining readable separation and the existing input accessibility relationships.
  </behavior>
  <action>
    First update `tests/phase-9-ui.test.mjs`: replace the existing uncapped-text expectation with an assertion that the uncapped card does not contain that sentence, retain the capped/full assertions, and add focused checks for the count-control placement/reserved text space and tighter description-to-capacity layout using the existing stylesheet/DOM test conventions. Then update `public/script.js` so the uncapped branch retains its invalid-availability validation but leaves `capacityStatus` empty. In `public/style.css`, revise the `.job-option`, `.job-option-details`, `.job-option-capacity`, and `.job-count-label` layout so the count control is anchored at the upper-right outside the card's normal vertical flow, the details reserve horizontal room for it, and the description/status gap is smaller; adapt the same layout for the existing mobile breakpoint. Preserve the current labels, input dimensions, focus visibility, capped/full messages, and status semantics; do not alter API logic or other invitation sections.
  </action>
  <verify>
    <automated>node --experimental-default-type=module --test tests/phase-9-ui.test.mjs</automated>
    <human-check>At desktop and narrow mobile widths, inspect the RSVP help cards: the count control is in the upper-right without making cards taller, the description and capacity status are closer together, no text is obscured, and uncapped jobs show no capacity sentence.</human-check>
  </verify>
  <done>The focused UI test passes; uncapped jobs have no capacity sentence, capped/full statuses and count behavior remain intact, and the compact layout meets the stated positioning and spacing criteria at desktop and mobile widths.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Job catalog data → browser DOM | API-provided job text is rendered into the UI; this task preserves the existing text-only rendering and changes only capacity copy/layout. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-qtj-01 | Tampering | `public/script.js` job-option text rendering | low | mitigate | Keep job labels, descriptions, and capacity text assigned through `textContent`; do not introduce HTML interpolation while removing the uncapped sentence. |
| T-qtj-SC | Tampering | npm/pip/cargo installs | high | mitigate | Add no packages; verify with the repository's existing Node built-in test runner. |
</threat_model>

<verification>
- `node --experimental-default-type=module --test tests/phase-9-ui.test.mjs`
- Confirm the visual criteria at desktop and narrow mobile widths.
</verification>

<success_criteria>
Uncapped options display no capacity sentence; capped and full options retain their current availability behavior. The Anzahl control appears at the upper-right without increasing card height, and the description-to-status gap is smaller without overlap at desktop and mobile widths. The focused UI test passes.
</success_criteria>

<output>
Create `.planning/quick/261120-qtj-the-jobs-take-to-much-space-reduce-the-s/261120-qtj-SUMMARY.md` when done.
</output>
