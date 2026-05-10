# Roadmap: Birthday Website

## Shipped Milestones

- **v1.0 RSVP Site** ✅ — 4 phases, 7 plans — [Archive](.planning/milestones/v1.0-ROADMAP.md)

## Current Milestone: v1.1 Password Hint Page

### Phase 5: Password Hint Page

**Goal:** Guests who need the password see a warm, festive HTML page with a German birthday riddle instead of a blank browser screen when they visit without credentials or enter the wrong password.

**Requirements:** AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07

**Success criteria:**
1. Visiting the site with no credentials shows the festive HTML page (after cancelling the browser auth dialog)
2. Entering wrong credentials and cancelling shows the same page
3. The hint page visually matches the main site's warm palette and typography
4. The German birthday riddle is present and legible
5. The 401 response includes `Cache-Control: no-store`
6. Guests with correct credentials are not affected — site loads normally

**Depends on:** Phase 4 (design system established)

---

