# Birthday Website - Project Context

## What This Is

A personal 30th birthday celebration website serving as the single source of truth for the event. Starts with a password-protected save-the-date RSVP collector, then evolves into a full event information hub with venue details, photo uploads, games, and a wishlist. Delivered across three milestones.

**Language:** German  
**Hosting:** Cloudflare (free tier)  
**Event Date:** 5 December  

## Current Milestone: v1.0 RSVP Site

**Goal:** Get a password-protected save-the-date page live with working RSVP collection so guests can confirm attendance early.

**Target features:**
- Password protection via HTTP Basic Auth (Worker-enforced)
- Save-the-date page with event description (German)
- RSVP form: name, contact method preference, plus-one count
- Form validation (required fields)
- Worker endpoint to receive RSVP submissions
- D1 database schema for RSVPs
- Success message after submission
- Responsive design (mobile/desktop)

## Core Value

Enable frictionless guest RSVPs and participation by providing a centralized, beautiful site where guests can confirm attendance early (for venue planning) and stay engaged through the event lifecycle.

## Milestones

### v1.0: RSVP Site (Current — MVP, ASAP)
- Password-protected page (HTTP Basic Auth via Worker)
- Save-the-date page with event description
- RSVP form: name, contact method, plus-one count
- Each RSVP gets unique ID (no overwrites/duplicates)
- RSVP data stored in Cloudflare D1, not accessible via frontend

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
- **Language:** All UI in German
- **Free hosting:** Strictly Cloudflare free tier

## Requirements

### Validated
(None yet — ship to validate)

### Active
- [ ] Password protection via HTTP Basic Auth (Worker-enforced)
- [ ] Save-the-date page with event description
- [ ] RSVP form (name, contact method, plus-one count)
- [ ] Form validation (required fields)
- [ ] Worker endpoint to receive RSVP submissions
- [ ] D1 database schema for RSVPs
- [ ] Success message after RSVP submission
- [ ] German language support throughout
- [ ] Responsive design for mobile/desktop

### Out of Scope
- User authentication/login
- RSVP editing or deletion
- Email confirmations (frontend only)
- Complex analytics
- Third-party integrations (beyond wishlist scraping)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Basic Auth protection | Cloudflare Worker intercepts all requests, checks `Authorization` header against hashed password | Keeps site invite-only without paid access controls |
| Plain HTML/CSS/JS | Simplest deployment model, no build step complexity | Faster Phase 1 delivery |
| Cloudflare stack | Free tier, globally distributed, no separate backend needed | Cost-effective, performant |
| D1 for storage | Simple SQL, integrated with Cloudflare, queryable for admin | No external database needed |
| Manual redeployment | Dev-driven content updates, simple workflow | Avoids over-engineering for small project |
| Unique ID per RSVP | Prevents accidental overwrites, simple audit trail | All responses preserved |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

---
*Last updated: 2026-05-09 — Milestone v1.0 RSVP Site started*
