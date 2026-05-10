# Phase 2: Save-the-Date Page & RSVP Form - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 2-Save-the-Date Page & RSVP Form
**Areas discussed:** Visual style & aesthetic, Save-the-date content, Contact method picker UI, Plus-one count UX

---

## Visual Style & Aesthetic

| Option | Description | Selected |
|--------|-------------|----------|
| Elegant & celebratory | Gold accents, serif fonts, warm champagne tones | |
| Warm & playful | Bold birthday colors, fun typography, energetic feel | |
| Minimal & modern | Clean whitespace, neutral palette, understated style | ✓ |
| Themed | User-defined specific theme | |

**User's choice:** Minimal & modern

---

| Option | Description | Selected |
|--------|-------------|----------|
| White/off-white, dark charcoal, one accent | Light background, dark text | |
| Light grey (#f5f5f5), black text, minimal color | Like current placeholder | |
| Dark mode | Near-black background, light text | |
| You decide | Agent picks fitting palette | ✓ |

**User's choice:** Agent decides color palette

---

| Option | Description | Selected |
|--------|-------------|----------|
| System fonts only | No CDN load penalty | ✓ |
| One Google Font for headings | One HTTP request | |
| Two Google Fonts | Heading + body pairing | |
| You decide | Agent picks | |

**User's choice:** System fonts only

---

| Option | Description | Selected |
|--------|-------------|----------|
| Single-page | Info at top, form below, one scroll | ✓ |
| Two visual sections with divider | Info block then form block | |
| Full-width hero then centered form | Hero + form below | |
| You decide | Agent decides | |

**User's choice:** Single-page layout

---

## Save-the-Date Content

| Option | Description | Selected |
|--------|-------------|----------|
| Date only (5. Dezember) | Keep it mysterious, details to follow | ✓ |
| Date + time | Guests know when to arrive | |
| Date + time + city/area hint | Enough to plan travel | |
| Full details | Date, time, address | |

**User's choice:** Date only

---

| Option | Description | Selected |
|--------|-------------|----------|
| Warm personal message from host | A few sentences in German | ✓ |
| Short & punchy headline only | "Save the Date" + the date | |
| Just the date, no additional copy | Minimal | |
| You decide | Agent writes copy | |

**User's choice:** Personal message from host

**Free-text copy provided by user:**
> „Moin, Ich werde 30. Aus irgendwelchen Gründen ist das etwas Großes. Also reicht meine Wohnung vermutlich nicht. Daher möchte ich sammeln mit wie vielen ich rechnen muss, um eine Location zu finden. Meine aktuelle Idee ist ein gutes Buffet und anschließend feiern. Ich update die Seite, wenn ich mehr weiß und versuche euch zu informieren. Aber ich verspreche nichts :)."

---

| Option | Description | Selected |
|--------|-------------|----------|
| RSVP deadline shown | "Bitte bis [Datum] anmelden" | ✓ |
| No deadline | Not shown on page | |
| You decide | Agent decides | |

**User's choice:** Show RSVP deadline
**Deadline:** "Ende Mai"

---

## Contact Method Picker UI

| Option | Description | Selected |
|--------|-------------|----------|
| Radio buttons | Simple native UI, accessible by default | |
| Card-style toggle buttons | Each app as clickable chip/card, more visual | |
| Dropdown select | Most compact | ✓ |
| You decide | Agent decides | |

**User's choice:** Dropdown select

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — reveal second field for handle/number | Dynamic field after selection | |
| No — just the preference | No handle collected | ✓ |
| Yes, but only for methods that need it | Conditional field | |

**User's choice:** No — preference only, no handle collected in Phase 2

---

| Option | Description | Selected |
|--------|-------------|----------|
| Required | Must pick a method | |
| Optional — can skip | Guests can leave blank | ✓ |
| You decide | Agent decides | |

**User's choice:** Optional

---

## Plus-One Count UX

**Free-text response:** "Use the stepper for the total number not only plus one so start with 1"

**Interpretation confirmed:** Stepper controls total attendees (including the guest themselves), minimum 1, not a plus-one offset.

---

| Option | Description | Selected |
|--------|-------------|----------|
| No cap | Unlimited | |
| Cap at 10 | Reasonable upper bound | ✓ |
| You decide | Agent decides | |

**User's choice:** Cap at 10

---

| Option | Description | Selected |
|--------|-------------|----------|
| Required | Must specify | |
| Pre-filled at 1 and required | Sensible default | ✓ |
| Optional | Can leave blank | |

**User's choice:** Pre-filled at 1, required

---

## Agent's Discretion

- **Color palette:** User said "you decide" — agent selects a neutral, minimal palette fitting minimal & modern (e.g. white/off-white background, charcoal text, subtle accent).

## Deferred Ideas

- **Contact handle collection** — noted as potential future addition if follow-up with guests is needed.
- **Venue / time details** — full event details deferred to v2.0 milestone.
