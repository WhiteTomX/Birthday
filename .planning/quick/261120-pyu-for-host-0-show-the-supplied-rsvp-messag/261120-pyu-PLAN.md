---
phase: quick
plan: 261120-pyu
type: execute
wave: 1
depends_on: []
files_modified:
  - functions/rsvp/index.js
  - public/rsvp/index.html
  - tests/phase-9-invitation.test.mjs
autonomous: true
requirements: []
must_haves:
  truths:
    - "Authenticated host 0 sees the exact German RSVP notice only when HOST_0_BIRTHDAY_DATE is a valid date on or after the current UTC date."
    - "The notice displays the configured date in German and links only the Live-Standort text when HOST_0_LIVE_LOCATION_URL is a valid absolute HTTPS URL."
    - "Host 1 and requests without host identity never see the host 0 notice; missing or invalid optional values fail closed."
    - "The RSVP response preserves its existing no-store behavior and production settings remain unchanged."
  artifacts:
    - path: functions/rsvp/index.js
      provides: "Host-0-only rendering of the date-gated notice and validated optional location link"
    - path: public/rsvp/index.html
      provides: "A stable insertion point for the personalized host 0 notice"
    - path: tests/phase-9-invitation.test.mjs
      provides: "Regression coverage for host, date, locale, URL, and safe-link behavior"
  key_links:
    - from: functions/_middleware.js
      to: functions/rsvp/index.js
      via: "The authenticated request's X-Host-Ref header determines whether host 0 notice content is rendered."
    - from: public/rsvp/index.html
      to: functions/rsvp/index.js
      via: "A dedicated notice marker is replaced with escaped, conditionally linked markup or an empty string."
---

<objective>
Show the requested birthday RSVP notice only to host 0 and only through the configured birthday date, with an optional safe Live-Standort link.

Purpose: Give host 0's invitees the supplied timely notice without exposing it to host 1 or publishing a location link unless configured safely.
Output: A personalized RSVP notice rendered by the existing authenticated Pages Function, plus focused invitation regression tests.
</objective>

<execution_context>
@.github/gsd-core/workflows/quick.md
</execution_context>

<context>
@.planning/STATE.md
@AGENTS.md
@functions/_middleware.js
@functions/rsvp/index.js
@public/rsvp/index.html
@tests/phase-9-invitation.test.mjs
@.planning/phases/09-actual-invitation-fresh-rsvp-drinks/09-05-PLAN.md

This task is separate from Phase 09 and does not change Phase 09 plans, ROADMAP.md, production configuration, or remote services. Preserve the existing `X-Host-Ref` identity contract and no-store response header. The feature consumes environment configuration but does not integrate an external API, modify a schema, or change the host identity model; no API capability matrix or schema push is in scope.
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Render and test the host 0 birthday notice</name>
  <files>functions/rsvp/index.js, public/rsvp/index.html, tests/phase-9-invitation.test.mjs</files>
  <behavior>
    - With X-Host-Ref set to "0" and HOST_0_BIRTHDAY_DATE set to today's UTC date or a future valid YYYY-MM-DD date, render the complete supplied German notice and format the date in German.
    - For a birthday date before today, a missing date, or an impossible/malformed date, omit the notice entirely.
    - For X-Host-Ref "1" or a missing host header, omit the notice even when host 0's environment values are configured.
    - With a valid absolute HTTPS HOST_0_LIVE_LOCATION_URL, link only the words "Live-Standort"; when unset or invalid (including HTTP, malformed, or credential-bearing URLs), retain those words as plain text.
    - Escape configured href characters for HTML, remove the template marker from every response, and preserve the existing response status, content type, and Cache-Control: no-store behavior.
  </behavior>
  <action>
    First extend `tests/phase-9-invitation.test.mjs` with response-level cases that set `X-Host-Ref` on the test Request and exercise the current UTC date boundary, German date rendering, host 1 isolation, missing identity, invalid dates, and valid/missing/unsafe URL values. Assert the exact notice copy with `{{date}}` replaced by the German-rendered date: `An meinem Geburtstag ({{date}}) bin ich ausnahmsweise in der Stadt. Weiß noch nicht, was ich mache. Ich teile wieder einen Link mit meinem Live-Standort.` For a valid URL, assert only `Live-Standort` is an anchor; otherwise assert the sentence remains present and unlinked. Then add a dedicated marker within the invitation copy in `public/rsvp/index.html`; in `functions/rsvp/index.js`, replace that marker with generated markup only when the incoming `X-Host-Ref` is exactly `"0"` and the configured date is a real strict `YYYY-MM-DD` value greater than or equal to today's UTC date. Format it with `Intl.DateTimeFormat('de-DE', ...)` using UTC so date-only configuration is stable. Build the sentence from the supplied exact copy, substituting the formatted date; use the existing HTTPS URL validator and HTML escaping for the optional anchor, and keep the text unlinked if URL validation fails. Replace the marker with an empty string for other hosts or invalid/missing dates. Do not default an absent host header to host 0, do not edit `.dev.vars`, `wrangler.jsonc`, production settings, Phase 09 plans, or ROADMAP.md, and do not contact remote services.
  </action>
  <verify>
    <automated>node --experimental-default-type=module --test tests/phase-9-invitation.test.mjs</automated>
  </verify>
  <done>The RSVP page renders the exact date-gated notice only for host 0; German date output and optional HTTPS-only linking are covered by passing tests, and host 1, missing identity, invalid dates, and unsafe or absent URLs behave as specified.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Authenticated request → RSVP renderer | `X-Host-Ref` selects whether host 0-specific content may appear. |
| Environment configuration → HTML response | The configured date and location URL are transformed into visible text and an optional link. |

Security level: OWASP ASVS 1; block on unmitigated high-severity threats.

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-pyu-01 | Spoofing | Host identity handling in `functions/rsvp/index.js` | medium | mitigate | Render only when the existing middleware-provided `X-Host-Ref` value is exactly `"0"`; do not treat a missing or malformed value as host 0. |
| T-pyu-02 | Tampering | `HOST_0_LIVE_LOCATION_URL` interpolation | medium | mitigate | Accept only an absolute HTTPS URL without embedded credentials and HTML-escape the normalized href; otherwise leave the displayed label unlinked. |
| T-pyu-03 | Tampering | `HOST_0_BIRTHDAY_DATE` rendering | low | mitigate | Strictly validate the date-only format and calendar date before comparison or formatting; omit the notice for missing or invalid values. |
| T-pyu-SC | Tampering | npm/pip/cargo installs | high | mitigate | Add no dependencies; use the repository's existing Node built-in test runner. |
</threat_model>

<verification>
- `node --experimental-default-type=module --test tests/phase-9-invitation.test.mjs`
- Confirm the implementation and test diff contains no production configuration, remote-operation, Phase 09 plan, or ROADMAP changes.
</verification>

<success_criteria>
The authenticated `/rsvp/` response shows the exact supplied notice only for host 0 while the configured birthday date is today or later; it uses a German-formatted date, and only a valid configured HTTPS location URL makes “Live-Standort” clickable. Host 1 and invalid or missing date values never receive the notice, and absent or invalid location URLs never create an active link. All focused tests pass without production configuration or remote changes.
</success_criteria>

<output>
Create `.planning/quick/261120-pyu-for-host-0-show-the-supplied-rsvp-messag/261120-pyu-SUMMARY.md` when done.
</output>
