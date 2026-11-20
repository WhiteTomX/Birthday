# Birthday Website - Project Context

## What This Is

A joint 30th birthday celebration website for two friends sharing the same birthday event, serving as the single source of truth. Password-protected RSVP collection supports two separate guest circles (each with their own password) while all guests join one shared party. Evolves into a full event information hub with venue details, photo uploads, games, and a wishlist.

## Current Milestone: v2.0 Actual Invitation

**Goal:** Turn the authenticated RSVP page into the formal German invitation for the shared birthday, with confirmed event details, park access directions, a fresh RSVP round, group-level drink preferences, and next-day buffet brunch/job sign-up.

**Language:** German  
**Hosting:** Cloudflare Pages (free tier)  
**Event:** 5 December at 17:00; year intentionally omitted  

## Current State: v2.0 Actual Invitation — planning started 2026-11-14

The venue is inside a park, so there is no street address. The invitation will use the existing environment-backed venue name and map link, plus park-entry directions from `PARK_ENTRY_DIRECTIONS`. An optional buffet contribution link will come from `BUFFET_LIST_URL`; neither secret value belongs in source control.

The new RSVP round uses a separate D1 table so existing responses remain unchanged. Guests reconfirm whether they are coming, and coming groups may select multiple drink preferences. Drink and job suggestions are staged in the current form and become shared options only when the RSVP is submitted with them selected. The next-day signup includes the combined job option “Abbau & Brunch am nächsten Tag”, a drinks-shopping job requiring a car on Friday or Saturday, and other jobs with optional capacity limits.

**Patterns to preserve:**
- Keep `/` public and free of private logistics; the invitation and RSVP remain behind existing authentication at `/rsvp/`.
- Continue using plain HTML/CSS/JavaScript, Pages Functions, and D1.
- Keep the RSVP action prominent and maintain existing host-circle attribution.

## Milestones

### v1.0: RSVP Site ✅ Shipped 2026-05-10
- Password-protected page (HTTP Basic Auth via Worker)
- Save-the-date page with event description and date (5 December)
- RSVP form: name, contact method (7 options), plus-one count
- Each RSVP gets unique ID (no overwrites/duplicates)
- RSVP data stored in Cloudflare D1
- Warm festive design with "Save the Date" eyebrow badge

### v1.1: Password Hint Page ✅ Shipped 2026-05-10
- Public festive HTML page at `/` with German birthday riddle (no auth dialog on first visit)
- Same riddle shown in 401 body after wrong/cancelled credentials at `/rsvp/`
- Matches warm festive design (`#FDF4E8` palette, same font stack)
- `Cache-Control: no-store` on all 401s

### v1.2: Not Coming ✅ Shipped 2026-06-14
- Guests can submit a decline response

### v1.3: Joint Birthday ✅ Shipped 2026-06-21
- Dual-password auth for two host circles
- D1 `host_ref` tagging for guest records
- German copy updated for the shared birthday celebration

### v2.0: Actual Invitation — planning started 2026-11-14
- Formal German invitation with 5 December at 17:00
- Venue map and park-entry directions, with no fabricated street address
- Separate fresh RSVP table and multi-select group drink preferences
- Conditional drink/job suggestion catalog and optional buffet contribution link
- Next-day buffet brunch and job signup, including optional job capacities

### v3.0: Event Day Experience (Pre-event Build, Activate on Day)
- Photo upload functionality (guests can share photos)
- Games/interactive elements (TBD)
- Wishlist (scraped from external sources, displayed on site)

## Technical Approach

- **Frontend:** Plain HTML/CSS/JavaScript (no framework)
- **Hosting:** Cloudflare Pages (static site deployment)
- **Backend:** Cloudflare Workers (RSVP form handling)
- **Database:** Cloudflare D1 (SQLite - RSVP storage)
- **Deployment:** Manual redeploys when content changes

## Constraints & Decisions

- **No overwrites:** Every RSVP submission is a new record with unique ID
- **No edit links:** Assume guests don't change RSVPs
- **No RSVP cap:** Unlimited plus-ones per person
- **Private data:** RSVP data only queryable via D1 dashboard, not exposed on frontend
- **Language:** All UI in German (exception: "Save the Date" eyebrow — recognized international phrase)
- **Free hosting:** Strictly Cloudflare free tier
- **Preserve RSVP history:** v2.0 confirmations are stored separately; existing RSVP records remain unchanged
- **Environment configuration:** Venue, park directions, and buffet-link values are not hardcoded in source

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Basic Auth protection | Cloudflare Worker intercepts all requests, checks `Authorization` header against env password | Keeps site invite-only without paid access controls |
| Plain HTML/CSS/JS | Simplest deployment model, no build step complexity | Faster Phase 1 delivery |
| Cloudflare stack | Free tier, globally distributed, no separate backend needed | Cost-effective, performant |
| D1 for storage | Simple SQL, integrated with Cloudflare, queryable for admin | No external database needed |
| Manual redeployment | Dev-driven content updates, simple workflow | Avoids over-engineering for small project |
| Unique ID per RSVP | Prevents accidental overwrites, simple audit trail | All responses preserved |
| `crypto.randomUUID()` PK | Native Workers global, no import, collision-resistant | Clean implementation |
| `textContent` not `innerHTML` | XSS prevention for user-supplied data (guest name) in DOM | Security pattern established |
| Separate D1 table for v2.0 RSVP round | Preserve the earlier save-the-date responses while collecting reconfirmations | Pending implementation |
| Multi-select drinks per RSVP group | Capture several drink preferences for a group without per-person tracking | Pending implementation |
| Separate drink-suggestion form | Let guests propose new drink options without mixing suggestions into RSVP data | Pending implementation |
| Publish drink/job suggestions with the selected RSVP | Avoid adding unused suggestions to shared catalogs | Added to Phase 9 |
| Combine cleanup and brunch in one job option | Use “Abbau & Brunch am nächsten Tag”; do not add a separate Brunch option | Added to Phase 9 |
| Job capacity and group allocations | Allow optional per-job caps and group-level attendee counts; Aufbau is capped at 15 | Added to Phase 9 |
| Explain job options in German | Give each job a longer description clarifying the expected task, including the Friday-or-Saturday drinks shopping job with a car; keep “Dinge” general until reviewed | Added to Phase 9 |
| Secret-backed park directions and buffet URL | Keep configuration values out of source while showing them only to authenticated invitees | Pending implementation |

## Evolution

This document evolves at phase transitions and milestone boundaries.

<details>
<summary>v1.0 original project context (archived)</summary>

*Original content before milestone close — preserved for reference.*

**Current Milestone (v1.0):** Get a password-protected save-the-date page live with working RSVP collection so guests can confirm attendance early.

Requirements (all now validated):
- Password protection via HTTP Basic Auth ✅
- Save-the-date page with event description ✅
- RSVP form: name, contact method, plus-one count ✅
- Form validation (required fields) ✅
- Worker endpoint to receive RSVP submissions ✅
- D1 database schema for RSVPs ✅
- Success message after submission ✅
- Responsive design (mobile/desktop) ✅

</details>

| Route restructure: RSVP to `/rsvp/` | Move RSVP form to sub-path so root can be public | Cleaner public/private separation — `/` is hint page, `/rsvp/` is gated |
| Public CSS exclusion | `style.css` excluded from auth so 401 body can load it | 401 page renders with full festive design |
| `Cache-Control: no-store` on 401 | Prevents CDN caching unauthenticated responses | No "trapped in cached-401" loop for authenticated guests |

---
*Last updated: 2026-11-14 after v2.0 milestone scope confirmation*

