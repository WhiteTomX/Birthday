# Birthday Website - Project Context

## What This Is

A personal 30th birthday celebration website serving as the single source of truth for the event. Starts with a password-protected save-the-date RSVP collector, then evolves into a full event information hub with venue details, photo uploads, games, and a wishlist. Delivered across three milestones.

**Language:** German  
**Hosting:** Cloudflare (free tier)  
**Event Date:** 5 December  

## Current State: v1.1 Password Hint Page ✅ Shipped 2026-05-10

**What's live:** Password-protected Cloudflare Pages site at `birthday-4om.pages.dev` with a public festive hint page at `/`, a German birthday riddle shown to unauthenticated guests, and the RSVP form protected at `/rsvp/`.

**Tech shipped in v1.1:**
- `public/index.html` — replaced with festive hint page (200, no auth, German riddle, `#FDF4E8` palette)
- `public/rsvp/index.html` — RSVP content moved here with absolute resource paths
- `functions/_middleware.js` — public exclusions for `/`, `/index.html`, `/style.css`; 401 returns full riddle HTML with `Cache-Control: no-store`

**Key patterns from v1.1:**
- Public exclusions in middleware: `pathname === '/'` etc. → `context.next()` (no auth check)
- 401 body: full HTML with `<link rel="stylesheet" href="/style.css">` (CSS publicly excluded, so links work from 401)
- `Cache-Control: no-store` on all 401s — prevents CDN from caching unauthenticated responses

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

### v2.0: Full Invitation (Post-Venue Decision — Weeks Away)
- Update site with confirmed venue details
- Formal invitation information
- Venue address, parking, timing, dress code (TBD based on venue)

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
*Last updated: 2026-05-10 — v1.1 milestone shipped*

