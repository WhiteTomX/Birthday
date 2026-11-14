---
gsd_state_version: "1.0"
milestone: v2.0
milestone_name: Actual Invitation
status: "Creating roadmap"
last_updated: "2026-11-14T14:55:00.000Z"
last_activity: 2026-11-14
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-11-14)

**Core value:** Enable frictionless guest RSVPs via a password-protected, beautiful German site.
**Current focus:** Phase 09 — actual-invitation

## Current Position

Phase: Not started (creating roadmap)
Plan: —
Status: Creating roadmap
Last activity: 2026-11-14 — v2.0 scope and requirements confirmed; research complete

## Progress

```
v2.0 Actual Invitation
Phase 9 [          ] 0%  Not started
```

v1.0 complete. v1.1 complete. v1.2 complete. v1.3 complete (shipped 2026-06-21).

## Recent Decisions

| Decision | Outcome |
|----------|---------|
| Three separate milestones | v1.0 RSVP, v2.0 Invitation, v3.0 Event Day |
| Basic Auth password protection | Worker-enforced, keeps site invite-only |
| Plain HTML/CSS/JS | Simplest deployment, no build step |
| Cloudflare stack | Free tier, globally distributed |
| D1 for storage | Simple SQL, no external DB needed |
| Unique ID per RSVP | All responses preserved |
| atob() for Base64 decode | Native in Workers runtime, no import needed |
| Password from env.SITE_PASSWORD only | Never hardcoded in source |
| Warm festive color tokens | `--bg: #FDF4E8`, `--accent: #C0395A`, `--festive: #C9900A` |
| Route restructure: RSVP to `/rsvp/` | Root `/` is public hint page, RSVP form at `/rsvp/` |
| Public CSS exclusion from auth | `style.css` publicly accessible — loads correctly from 401 body |
| `Cache-Control: no-store` on 401 | Prevents CDN-cached 401 loop for authenticated guests |
| Dual passwords for joint birthday | `SITE_PASSWORD__0` and `SITE_PASSWORD__1` in env; only index stored, never value |
| host_ref in D1 | RSVP records carry `host_ref` (0 or 1) to identify which host's circle |
| Venue and event time confirmed | 5 December at 17:00; use the park map pin and entry directions, not a street address |
| Fresh RSVP round uses a separate D1 table | Preserve the earlier RSVP history without rewriting it |
| Group drink preferences are multi-select | Track one set of drink preferences per RSVP group, not per attendee |
| Drink suggestions use a separate form | New suggestions become selectable options immediately and for later respondents |
| Logistics values use environment configuration | Keep venue and map values as-is; load park directions and buffet URL from environment values |

## Pending Todos

*(none)*

## Blockers / Concerns

- Production must set `PARK_ENTRY_DIRECTIONS`; `BUFFET_LIST_URL` is optional and its link is hidden when unset

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260621-kyk | update workflow to include migration step from phase 7 | 2026-06-21 | e987480 | [260621-kyk-update-workflow-to-include-migration-ste](./quick/260621-kyk-update-workflow-to-include-migration-ste/) |
| 260621-u1z | insert host names into RSVP invitation text | 2026-06-21 | cd4d90c | [260621-u1z-i-want-to-insert-the-names-to-the-invita](./quick/260621-u1z-i-want-to-insert-the-names-to-the-invita/) |

## Session Continuity

Last session: 2026-11-14T14:55:00.000Z
Stopped at: v2.0 requirements confirmed; creating roadmap
Last activity: 2026-11-14 - Confirmed invitation, fresh RSVP, and drink preference scope
