# Phase 8: German Content Update - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-21
**Phase:** 08-german-content-update
**Areas discussed:** Riddle rewrite, Save-the-date body text, Names and host identity, Outdated strings

---

## Riddle Rewrite

### How should the riddle signal two people celebrating?

| Option | Description | Selected |
|--------|-------------|----------|
| Plural 'Wir' | Replace 'ich' with 'wir' throughout — minimal change | |
| Add a 'Zwei' line | Keep riddle intact, add a line like 'Und in diesem Jahr sind wir sogar zu zweit' | ✓ |
| Rewrite fresh | Start from scratch with a new riddle for two people | |

**User's choice:** Add a 'Zwei' line

### Where should the 'zu zweit' line land?

| Option | Description | Selected |
|--------|-------------|----------|
| Before the password hint | After 'singt für mich', before 'Wer eingeladen ist...' | |
| At the very end | After the password clue as a final reveal / punchline | |
| Claude decides placement | Pick whichever reads most naturally in German | ✓ |

**User's choice:** Claude decides placement

### Should the 401 riddle stay in sync with the hint page?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep in sync | Same riddle in both places — update public/index.html and _middleware.js together | ✓ |
| 401 stays simple | Leave 401 riddle as-is, only hint page gets the joint framing | |

**User's choice:** Keep in sync

---

## Save-the-Date Body Text

### How should body text be handled?

| Option | Description | Selected |
|--------|-------------|----------|
| You provide the copy | User writes/pastes German text, planner inserts exactly | |
| Claude drafts, you review | Claude writes joint-birthday version in same casual tone | ✓ |
| Keep existing, minimal changes | Change only clearly single-host phrases | |

**User's choice:** Claude drafts, you review

### What should the body text communicate?

| Element | Selected |
|---------|----------|
| Date + venue still TBD | ✓ |
| Buffet + party idea | ✓ |
| Guest list gap / share the link | ✓ |
| RSVP deadline line | ✓ |

**User's choice:** All four elements included

### Tone for the body text?

| Option | Description | Selected |
|--------|-------------|----------|
| Same casual tone | Keep existing voice — 'Moin', informal 'ihr/euch', conversational | ✓ |
| Slightly more festive | Warm and celebratory, a bit more occasion-appropriate | |

**User's choice:** Same casual tone

---

## Names and Host Identity

### Should copy name both birthday people explicitly?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — names in copy | e.g. 'Tom & Lisa feiern ihren 30.' — personal and clear | |
| No — stay anonymous | 'Wir feiern unseren 30.' — 'Wir' is clear enough for guests | ✓ |

**User's choice:** Stay anonymous — use 'Wir/uns' throughout

---

## Outdated Strings

### What should replace the outdated deadline?

| Option | Description | Selected |
|--------|-------------|----------|
| Remove deadline line | Drop the deadline entirely | |
| Update to a new date | Set a new hard deadline | |
| Replace with soft ask | 'Je früher, desto besser — dann können wir besser planen.' | ✓ |

**User's choice:** Replace with soft ask

### Confirmation messages — need changes?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep as-is | 'Danke/Schade, {name}!' messages already work for joint framing | ✓ |
| Update both | Rewrite to explicitly reflect joint celebration | |

**User's choice:** Keep as-is

---

## Claude's Discretion

- **Riddle line placement:** Claude picks the most natural position for the "zu zweit" line in German. Options discussed: before the password clue (build-up) or at the end (punchline). No user preference stated.
- **Soft ask phrasing:** Claude refines the deadline replacement while preserving the "help us plan" rationale.
- **Body text draft:** Claude authors the full body text replacement within the constraints (casual tone, Wir voice, four elements, no names).

## Deferred Ideas

None — discussion stayed within phase scope.
