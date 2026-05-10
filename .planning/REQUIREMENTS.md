# Requirements: Birthday Website v1.1 Password Hint Page

**Milestone:** v1.1 Password Hint Page  
**Status:** Active — defining phases  
**Core Value:** Enable frictionless guest RSVPs via a password-protected, beautiful German site.

---

## v1.1 Requirements — Password Hint Page

### Access Control UX

- [ ] **AUTH-03**: Guest who provides no credentials sees a festive HTML page with a German birthday riddle (not a blank screen or plain-text "Unauthorized")
  - *Trigger: `Authorization` header absent — currently returns `new Response("Unauthorized", ...)`*
- [ ] **AUTH-04**: Guest who enters wrong credentials sees the same festive hint page after dismissing the browser's auth dialog
  - *Trigger: `Authorization` header present but password does not match `env.SITE_PASSWORD`*
- [ ] **AUTH-05**: The hint page matches the main site's festive design (warm palette `#FDF4E8` / `#C0395A` / `#C9900A`, same font stack, same visual language)
  - *CSS is inlined — `public/style.css` is also auth-gated and cannot be loaded as a sub-resource*
- [ ] **AUTH-06**: The hint page displays a short German riddle that hints at the password (Geburtstag theme)
  - *Riddle must be clever enough to help invited guests, vague enough not to be trivially guessed*
- [ ] **AUTH-07**: The 401 response includes `Cache-Control: no-store` to prevent CDN caching of the hint page
  - *Without this, Cloudflare's edge could cache the 401 and trap authenticated guests in a cached-401 loop*

---

## Future Requirements (Deferred)

- Form-based password entry (replace browser native dialog entirely) — out of scope for v1.1
- Localised error messages per language — out of scope for this project

---

## Out of Scope

| Item | Reason |
|------|--------|
| Replace browser native auth dialog with a custom form | Significantly more complex; browser dialog is functional |
| Admin RSVP view | Separate future feature |
| Password change flow | Secrets managed via `wrangler pages secret put` |

---

## Traceability

| REQ-ID  | Phase |
|---------|-------|
| AUTH-03 | Phase 5 |
| AUTH-04 | Phase 5 |
| AUTH-05 | Phase 5 |
| AUTH-06 | Phase 5 |
| AUTH-07 | Phase 5 |
