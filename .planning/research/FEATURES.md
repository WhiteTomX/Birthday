# Feature Landscape

**Domain:** Invite-only German joint-30th birthday invitation and RSVP site  
**Researched:** 2026-11-14  
**Scope:** v2.0 Actual Invitation. Event facts and requested behaviors below follow the milestone brief; environment-provided values were not inspected.

## Table Stakes

For this milestone, “table stakes” means required to deliver the confirmed scope, whether or not a generic invitation product would normally include it.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Formal, polished German joint-birthday invitation | The site is becoming the official invitation, not a save-the-date placeholder. | Medium | State who is inviting, that both hosts turn 30, and make the invitation itself warm and unambiguous. Remove tentative venue wording and outdated copy. |
| Prominent, exact event facts | Guests need an actionable time and date before deciding. | Low | Show **5. Dezember, 17:00 Uhr** where it is immediately visible. Do not invent a year or additional schedule details that were not confirmed. |
| Park-specific location and arrival guidance | A map pin alone can leave guests at the wrong park entrance; a street address is explicitly not the right locator for this event. | Medium | Provide a guest-visible map link and concise directions from the relevant park entry, using the supplied environment values. Do not substitute or fabricate a street address. |
| RSVP remains easy to find and use | RSVP collection is the core conversion action and existing product value. | Medium | Keep the current authenticated guest flow and clear “Ich komme” / “Ich komme leider nicht” choices. Maintain attendance count for coming groups and give clear completion/error feedback. |
| One drink preference for each RSVP group | The requested model is one group-level preference, not separate selections for each attendee. | Medium | Offer Bier, Wein, Sekt, Kola, Spezi, Fruchtlimonaden, Wasser, alkoholfreies Bier, and Sonstiges. Define behavior for declines (no drink preference); do not imply per-person tracking. |
| Sonstiges submissions become options for later respondents | This is explicitly requested and makes new drink requests reusable without host intervention. | High | Persist the text and include accepted submissions in the selectable choices for subsequent visitors. Define “later” as subsequent option loads/submissions; a currently open form need not update live. Normalize and deduplicate entries, validate length, and render as text rather than HTML. |
| New responses stored separately from historical responses | New data must not rewrite or erase the existing RSVP record history. | Medium–High | Write v2 submissions to a separate table; preserve old rows and their meaning. Keep stable host-circle attribution and submission timestamps. Decide explicitly whether declines also go into the new table; if they do, their beverage field should be empty. |
| External buffet-contribution link with honest wording | Guests need access to the supplied contribution destination, while the host must not promise all requested drinks will be provided. | Low–Medium | Make the link visibly optional and distinct from RSVP. Say drink wishes are requests, not guarantees. Avoid implying that contributing buys or guarantees a particular drink. |
| Accessible, understandable form behavior | Guests need to complete and confirm the RSVP reliably on mobile and with assistive technology. | Low–Medium | Associate visible labels with controls, identify conditional fields, and provide concise success/error messages. W3C WAI guidance supports explicit control labels and clear, actionable form feedback (source confidence: LOW per provider classification). |

## Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Self-growing drink-choice list | Turns a one-off “Sonstiges” request into a useful choice for later groups, reducing repeated free text and host curation. | High | Required in this milestone, although unusual for a small invitation site. The selection list needs a persisted source and a read path, not just a static HTML list. |
| Directions that explain the correct park entry | Reduces late arrivals and “I’m at the other side of the park” confusion better than a generic venue name. | Low–Medium | Short, scannable directions next to the map action are more valuable than embedding a full interactive map. |
| Clear expectation-setting for drinks and buffet contributions | Lets guests express a preference without creating a promise the hosts cannot keep. | Low | Put the caveat next to the beverage choice or contribution link, not only in fine print. |
| Invitation-first page with RSVP still close at hand | Gives guests the formal invitation experience while preserving the familiar RSVP task. | Medium | Keep event information and RSVP in one clear hierarchy; a dedicated RSVP page or anchor may be used, but should not add unnecessary navigation friction. |

## Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Inventing or displaying a street address for a park event | Could direct guests to the wrong location and conflicts with the confirmed scope. | Use the supplied map destination and explain the correct park entry in text. |
| Promising every submitted beverage request will be available | The host explicitly cannot guarantee that. | Label the control as a preference/request and state plainly that availability is not guaranteed. |
| Requiring host approval before a “Sonstiges” value becomes selectable | Contradicts the requested automatic behavior and adds recurring manual work. | Promote valid submissions automatically, with normalization, length bounds, safe text rendering, and duplicate handling. |
| Treating arbitrary free text as trusted markup or a complete option catalog | Guests could submit malformed, duplicative, or unsafe strings; stored text must not become executable HTML. | Validate on the server, store plain text, normalize whitespace/case for duplicate checks, and render with text APIs. Preserve the submitted choice text for response history. |
| Multiple beverage selections per group or one selection per attendee | Changes the specified RSVP data model and expands the form without a stated need. | Ask for exactly one preference per RSVP group. |
| Replacing, backfilling, or migrating old RSVP rows into the new table | Risks violating the existing no-overwrite/history-preservation decision. | Leave legacy rows untouched and direct new submissions to the separate v2 table. |
| Embedding a full map application, adding a payment/booking flow, or expanding into event-day features | These add complexity beyond the invitation and RSVP needs; map embed and bespoke booking are already out of scope in the current requirements. | Use a simple external map link and existing external contribution destination. Defer event-day features to a later milestone. |
| Making the contribution link a required step in RSVP | Adds friction and can imply payment is required to attend. | Keep contribution optional and separate from the RSVP action. |

## Feature Dependencies

```text
Confirmed invitation copy + date/time + guest-visible map URL and park-entry directions
  → invitation-first page content and prominent RSVP action

Separate v2 response table + migration
  → new RSVP endpoint writes without changing legacy records
  → preserve host_ref, timestamps, attendance count, and response status

Persisted drink preference / option source
  → server validates the chosen predefined or Sonstiges value
  → valid Sonstiges entry is normalized and made available to later option loads
  → future RSVP forms display the accumulated selectable choices

Environment-provided map, park-direction, and contribution values
  → runtime/configuration wiring for guest-facing links
  → authorized invitees can use the destinations; the values must not be hardcoded into source

RSVP submission
  → explicit success or recoverable error feedback
```

The dynamic options feature depends on a server-side source of previously submitted choices. A purely static client-side form cannot reliably provide newly submitted options to later respondents. The simple implementation can derive distinct options from persisted v2 responses; a dedicated option catalog is only warranted if the product later needs explicit curation or lifecycle management.

## MVP Recommendation

Prioritize:
1. Replace save-the-date/placeholder language with the formal German invitation and the confirmed date/time.
2. Show the supplied map link and park-entry directions without inventing a street address; keep the existing protected RSVP prominent.
3. Add group-level drink preference, including Sonstiges, and automatically make valid submissions selectable for subsequent groups.
4. Route fresh responses to a separate table while leaving every legacy record intact; retain a clear success/error flow.
5. Add the optional buffet-contribution link and a nearby statement that drink requests are not guarantees.

Defer: live map embeds, per-person drink preferences, response editing, a bespoke contribution/payment system, and event-day/photo/game functionality. These are not needed to deliver this invitation and would widen the schema and interaction surface.

## Scope Alignment and Open Questions

- `.planning/REQUIREMENTS.md` currently says the invitation must show a venue **address**. That conflicts with this milestone brief, which explicitly says the event is inside a park and must use a map link plus park-entry directions without a street address. Update the requirement wording before phase planning; do not interpret the existing address criterion as permission to invent one.
- `.planning/STATE.md` and the roadmap retain older notes that venue/timing confirmation is pending. This research follows the supplied confirmed scope (5 December at 17:00) and does not inspect environment-provided values.
- Confirm whether the new response table is to contain both attending and declining submissions or only fresh attendance submissions. The former gives one clean v2 history; the latter leaves declines on the legacy path.
- Confirm whether a Sonstiges string becomes selectable only after a successful RSVP insert. Recommended: yes, so rejected/failed requests do not create options.
- Confirm the exact wording for the buffet contribution and the statement about drink availability. No promise should be inferred from the presence of the link.
- Because the map and contribution destinations must be usable by invited guests, they will be visible to those guests in the rendered page even if their source values are held in environment configuration. Treat environment storage as source/configuration hygiene, not as secrecy from the intended audience.

## Sources

- Project context and existing implementation: `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/ROADMAP.md`, `public/rsvp/index.html`, `public/script.js`, `functions/api/rsvp.js`, `functions/api/not-coming.js`, `schema.sql`, and `migrations/0001_add_host_ref.sql`. Confidence: HIGH for the inspected local behavior and scope conflicts.
- W3C WAI, “Labeling Controls”: https://www.w3.org/WAI/tutorials/forms/labels/ — recommends labels that identify controls and explicit label/control association where possible. Confidence: LOW per `classify-confidence --provider webfetch`.
- W3C WAI, “User Notification”: https://www.w3.org/WAI/tutorials/forms/notifications/ — guidance for clear success/error feedback and concise, actionable errors. Confidence: LOW per `classify-confidence --provider webfetch`.
- Ecosystem web search was attempted through the configured research seam but unavailable because no Brave API key was configured. Feature judgments beyond the cited accessibility guidance are therefore based on the confirmed project scope and inspected implementation, not a broad competitor survey.
