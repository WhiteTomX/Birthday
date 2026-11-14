# Requirements: Birthday Website — v2.0 Actual Invitation

**Defined:** 2026-11-14
**Core Value:** Make the site feel like the real invitation for the shared birthday while preserving a smooth, reliable RSVP flow.

## v2.0 Requirements

### Access and Invitation

- [ ] **AUTH-09**: Venue, arrival, buffet, and RSVP details remain behind the existing guest authentication; the public page does not reveal them.
- [ ] **INV-01**: Guests see the joint-birthday invitation in German with the event date, 5 December, and start time, 17:00.
- [ ] **INV-02**: Authenticated guests see the venue name and map link from the existing environment values without a fabricated street address.
- [ ] **INV-03**: Authenticated guests see the park-entry directions loaded from `PARK_ENTRY_DIRECTIONS`.
- [ ] **INV-04**: The optional buffet contribution link is loaded from `BUFFET_LIST_URL` and is not shown when unset.

### Fresh RSVP Round

- [ ] **RSVP-09**: New confirmations are written to a separate D1 table; existing RSVP records remain unchanged.
- [ ] **RSVP-10**: The fresh round records both “coming” and “not coming” responses; declining responses have no drink selection.

### Drink Preferences

- [ ] **DRINK-01**: A coming RSVP group can select multiple drink preferences from Bier, Wein, Sekt, Kola, Spezi, Fruchtlimonaden, Wasser, and alkoholfreies Bier.
- [ ] **DRINK-02**: Guests can submit a new drink through a separate drink-suggestion form.
- [ ] **DRINK-03**: A successfully submitted drink suggestion is saved as a safely displayed, unique selectable option, updates the current RSVP selector immediately, and is available to later respondents.
- [ ] **DRINK-04**: The drink form has no “Keine Präferenz” choice and explains that drink requests are not guaranteed.

## Future Requirements

### Later Milestones

- **EVNT-01**: Guests can share event-day photos.
- **EVNT-02**: Guests can use event-day games or other interactive elements.
- **EVNT-03**: Guests can view the event wishlist.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Per-attendee drink selections | v2.0 collects one multi-select set per RSVP group |
| Editing or deleting historical RSVP responses | Preserve the earlier RSVP history as-is |
| A street address for the park | The venue is inside a park; use the map link and park-entry directions |
| Live map embedding or a bespoke booking/payment flow | A simple external map link and optional buffet contribution link are sufficient |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|

**Coverage:**
- v2.0 requirements: 11 total
- Mapped to phases: 0
- Unmapped: 11 (roadmap pending)

---
*Requirements defined: 2026-11-14*
*Last updated: 2026-11-14 after v2.0 scope and research confirmation*
