# Phase 8: German Content Update - Context

**Gathered:** 2026-06-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 8 delivers: all user-visible German copy updated from single-host to joint-birthday framing. Three surfaces: (1) the hint page riddle, (2) the save-the-date body text and supporting strings on `/rsvp/`, (3) the inline 401 riddle in the middleware. No structural, auth, or backend changes — pure content.

**In scope:**
- Hint page riddle (`public/index.html`) — add a "zu zweit" line
- Save-the-date body text (`public/rsvp/index.html`) — full redraft in joint "Wir" voice
- Deadline line in RSVP page — replace with a soft RSVP ask
- 401 HTML in `functions/_middleware.js` — keep riddle in sync with hint page

**Out of scope:**
- Auth, backend, or D1 changes (Phase 7)
- Confirmation messages in `public/script.js` — already work for joint framing, no change
- Page structure, CSS, or visual design changes

</domain>

<decisions>
## Implementation Decisions

### Riddle Rewrite

- **D-01:** Keep the existing riddle format and text. Add a single new "zu zweit" line rather than rewriting from scratch. The birthday-as-answer still works.
- **D-02 (Claude's discretion):** Placement of the "zu zweit" line is Claude's call — pick whichever position reads most naturally in German. Natural candidates: after "singt für mich" as a build-up before the password clue, or as a final line after the password clue as a punchline.
- **D-03:** Both `public/index.html` AND the inline riddle HTML in `functions/_middleware.js` receive the same update. They must stay in sync — guests who mistype the password see the same riddle as guests reading the hint page.

### Save-the-Date Body Text

- **D-04:** Claude drafts a complete replacement for the body paragraphs in `public/rsvp/index.html`. The draft uses the same casual German register as the current text (informal "ihr/euch", conversational tone — think "Moin" energy), with voice shifted to "Wir/uns" throughout.
- **D-05:** Body text must include all four elements:
  1. Date (5. Dezember) and that the venue is still TBD — will be updated when confirmed
  2. The buffet + celebrating/dancing plan
  3. "If we forgot someone, share the link" sentiment
  4. A soft RSVP ask (see D-06 below)
- **D-06:** No names in copy — anonymous "Wir feiern unseren 30." framing throughout. No personal names in HTML.

### Deadline / Soft Ask

- **D-07:** Replace "Bitte bis Ende Mai anmelden." with a soft, no-deadline ask. Tone: "the earlier the better helps us plan" — no hard date. Example phrasing (Claude refines): "Je früher, desto besser — dann können wir besser planen."

### Unchanged Strings

- **D-08:** Confirmation messages in `public/script.js` are kept as-is:
  - "Danke, {name}! Deine Anmeldung wurde gespeichert."
  - "Schade, {name}! Wir werden dich vermissen."
  These already use "Wir" and are neutral — no update needed.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — CONT-01 is the single locked requirement for this phase. Read before planning.

### Files to Modify (read before editing)
- `public/index.html` — current hint page riddle (singular voice). Add "zu zweit" line.
- `public/rsvp/index.html` — current save-the-date body text (single-host first-person prose). Replace body paragraphs and deadline line.
- `functions/_middleware.js` — contains the inline 401 HTML with a copy of the riddle. Update to match the hint page riddle.

### Files NOT to Modify
- `public/script.js` — confirmation messages are correct for joint framing. Read to verify, do not edit.
- `public/style.css` — no CSS changes in scope.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `public/rsvp/index.html` HTML structure — keep `<p class="eyebrow">Save the Date</p>`, `<h1>5. Dezember</h1>`, `<section class="save-the-date">`, and all RSVP form markup unchanged. Only the body `<p>` elements and the `<p class="deadline">` line are replaced.
- The riddle's `<p>` block in `public/index.html` (4-line `<br>`-separated poem) — keep structure, add one line.

### Established Patterns
- German informal register throughout: "ihr/euch" second-person plural, casual tone. No formal "Sie". Match the existing voice.
- `textContent` (not `innerHTML`) for user-supplied data in JS — not touched in this phase but preserve the pattern.
- The riddle lives in TWO places: `public/index.html` and the `unauthorizedResponse()` inline HTML string in `functions/_middleware.js`. Always update both together.

### Integration Points
- The 401 riddle in `_middleware.js` is a template literal string. It is structurally independent from `public/index.html` — the planner must update both files.
- `public/rsvp/index.html` body text sits between `<h1>5. Dezember</h1>` and `<div class="divider">` — only that block changes.

</code_context>

<specifics>
## Specific Ideas

- Soft ask phrasing direction: "Je früher, desto besser — dann können wir besser planen." Claude may refine, but preserve the "help us plan" rationale (not a guilt-trip, just practical).
- Body text "Wir werden 30" is the anchor phrase — make it visible early in the copy so the joint nature is immediately clear.
- The riddle answer is still "Geburtstag" (birthday) — the "zu zweit" line should not obscure this. It adds context without giving away or complicating the password clue.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 8-German-Content-Update*
*Context gathered: 2026-06-21*
