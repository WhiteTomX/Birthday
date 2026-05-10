# Birthday Website - Project Context

## What This Is

A personal 30th birthday celebration website serving as the single source of truth for the event. Starts with a password-protected save-the-date RSVP collector, then evolves into a full event information hub with venue details, photo uploads, games, and a wishlist. Delivered across three milestones.

**Language:** German  
**Hosting:** Cloudflare (free tier)  
**Event Date:** 5 December  

## Current State: v1.0 RSVP Site ✅ Shipped 2026-05-10

**What's live:** Password-protected Cloudflare Pages site at `birthday-4om.pages.dev` with a German save-the-date page, fully functional RSVP form, Worker backend storing unique records in D1, and a warm festive design.

**Tech shipped:**
- `functions/_middleware.js` — HTTP Basic Auth (every request protected)
- `public/index.html` / `style.css` / `script.js` — German save-the-date + RSVP form UI
- `functions/api/rsvp.js` — Worker endpoint: validates, stores RSVP with UUID in D1
- `schema.sql` + D1 `birthday-rsvps` — RSVP storage (region WEUR)

**Key patterns established:**
- Auth: `Authorization` header → base64 decode → compare `env.SITE_PASSWORD` → `context.next()` or 401
- D1: parameterized `.prepare().bind().run()` — no SQL injection
- XSS prevention: `textContent` (not `innerHTML`) for user-supplied data in DOM
- Secrets: `wrangler pages secret put` (never hardcoded; dashboard unreliable for Pages)

## Current Milestone: v1.1 Password Hint Page

**Goal:** Guests who need the password see a warm, on-brand page with a German birthday riddle instead of a blank browser screen.

**Target features:**
- Custom HTML page returned on 401 (covers both: no auth provided on first visit, and wrong credentials)
- Matches festive design (warm palette, same fonts as main site)
- Short German riddle hinting at the password (Geburtstag theme)

## Milestones

### v1.0: RSVP Site ✅ Shipped 2026-05-10
- Password-protected page (HTTP Basic Auth via Worker)
- Save-the-date page with event description and date (5 December)
- RSVP form: name, contact method (7 options), plus-one count
- Each RSVP gets unique ID (no overwrites/duplicates)
- RSVP data stored in Cloudflare D1
- Warm festive design with "Save the Date" eyebrow badge

### v1.1: Password Hint Page (Upcoming)
- Custom 401 HTML page with German birthday riddle and festive design
- Shown on both: first visit with no auth, and wrong credentials

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

---
*Last updated: 2026-05-10 — v1.1 milestone started*

