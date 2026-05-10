# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

---

## Milestone: v1.1 — Password Hint Page

**Shipped:** 2026-05-10
**Phases:** 1 | **Plans:** 1 | **Sessions:** ~3

### What Was Built
- Public festive hint page at `/` with German birthday riddle (no auth dialog on first visit)
- 401 HTML body with the same riddle for wrong/cancelled credentials at `/rsvp/`
- RSVP page restructured to `/rsvp/` with absolute resource paths
- `Cache-Control: no-store` on all 401 responses

### What Worked
- Route restructure was clean — public hint page + gated RSVP is a natural separation
- Reusing `style.css` from the 401 body (via public exclusion) avoided duplicating the entire design system inline
- All 32 automated verification checks passed in a single execution pass — zero rework
- Browser verification via Chrome DevTools gave high confidence before shipping
- SUMMARY.md served as the effective verification record even without a formal VERIFICATION.md

### What Was Inefficient
- Multiple replanning rounds (3 PLAN.md versions) before settling on the final route structure — initial plan put hint page inline in 401, then iterated to public root
- No VERIFICATION.md written — verification was thorough but not formally documented; this is recurring tech debt
- REQUIREMENTS.md checkboxes left unchecked throughout execution — requires manual cleanup at milestone close

### Patterns Established
- Public exclusion list in middleware (`pathname === '/'`, `/style.css`, etc.) is the clean way to expose public assets without bypassing auth broadly
- 401 HTML can use `<link rel="stylesheet">` if the CSS is explicitly in the public exclusion list
- JS auto-redirect on public page (`window.location.href = '/rsvp/'`) gracefully sends authenticated guests to the gated content

### Key Lessons
1. **Plan the route structure before the HTML** — the final split (`/` = public, `/rsvp/` = gated) was obvious once stated, but took 3 planning rounds to arrive at. Start with URL architecture, then fill content.
2. **Write VERIFICATION.md during execution, not after** — the browser verification was done but not recorded. Retrofitting it at milestone close is low-value busywork.
3. **REQUIREMENTS.md checkbox hygiene** — should be updated as each requirement is implemented, not left for milestone close.

### Cost Observations
- Model mix: mixed (planning used Claude, execution was AI-assisted with developer browser verification)
- Sessions: ~3 (context + planning + execution)
- Notable: Very small milestone (1 phase, 1 plan, 3 files changed) — overhead was proportionally higher than execution time

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 4 | 7 | Initial project — greenfield build |
| v1.1 | 1 | 1 | Small focused improvement — documentation gaps pattern repeating |

### Cumulative Quality

| Milestone | Automated Checks | Manual Browser Tests | Files Changed |
|-----------|-----------------|---------------------|---------------|
| v1.0 | — | Browser-confirmed | ~10 |
| v1.1 | 32/32 ✅ | 10/10 ✅ | 12 |

### Top Lessons (Verified Across Milestones)

1. **Document requirements as you go** — both v1.0 and v1.1 closed with unchecked REQUIREMENTS.md boxes and missing VERIFICATION.md files. This is the highest-priority process improvement.
2. **Plan URL structure first** — architecture decisions (routes, auth boundaries) are the hardest to change and should be locked before writing any implementation.
