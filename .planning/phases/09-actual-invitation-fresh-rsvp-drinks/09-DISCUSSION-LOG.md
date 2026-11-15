# Phase 9: Actual Invitation, Fresh RSVP, Drinks & Next-Day Brunch - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `09-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-11-14
**Phase:** 9-Actual Invitation, Fresh RSVP, Drinks & Next-Day Brunch
**Areas discussed:** Invitation presentation and tone, fresh RSVP details, drink selector and suggestions, after-submit confirmation, party job allocation, job capacity, job suggestions, job descriptions, drinks-shopping job

---

## Invitation presentation and tone

| Question | Options considered | Selected |
|---|---|---|
| Invitation voice | Warm and personal; more formal/traditional | Warm and personal |
| Page layout | Integrated invitation with prominent date/time; invitation plus separate event-details card | Integrated invitation |
| Park directions | Labelled paragraph; steps if the configured text supports a sequence | Labelled paragraph |
| Buffet link | Discreet secondary link; distinct callout | Distinct callout when configured |

## Fresh RSVP details

| Question | Options considered | Selected |
|---|---|---|
| Coming fields | Required name + headcount and optional contact; required name + headcount only; required name only | Required name + headcount only |
| Decline fields | Name only; name plus optional contact | Name only |
| Form progression | Reveal fields after choosing “Ich komme”; one form with one submit | One form with one submit |
| Headcount limit | Uncapped stepper; uncapped numeric input; retain a cap | Cap at 10 |

**Notes:** The selected cap intentionally revises the project-level no-RSVP-cap decision. The user confirmed the revision after it was surfaced.

## Drink selector and suggestions

| Question | Options considered | Selected |
|---|---|---|
| Multi-select control | Checkboxes; clickable chips/pills | Checkboxes |
| Fixed and suggested options | Separate labelled groups; one combined list | One combined list |
| Suggestion form placement | Directly below selector; separate card elsewhere | Directly below selector |
| Current response after suggestion | Add as available but unselected; auto-select | Auto-select |

## After-submit confirmation

| Question | Options considered | Selected |
|---|---|---|
| Coming confirmation detail | Summary of headcount and drinks; brief thank-you | Summary |
| Decline confirmation tone | Warm/personal; neutral | Warm/personal |
| Confirmation placement | Inline replacement of RSVP section; dedicated full-page view | Inline |
| Drink-request reminder | Repeat in confirmation; keep only in form | Repeat in confirmation |

## Reviewed Todo

“Support two passwords for joint 30th birthday party” was reviewed and not folded into Phase 9 because the auth work was completed in Phase 7 and content work in Phase 8.

## the agent's Discretion

No product decisions were explicitly delegated.

## Party job allocation

| Question | Options considered | Selected |
|---|---|---|
| Signup unit | RSVP contact assigns jobs for the party; individual attendee signups; RSVP contact only | RSVP contact assigns for the whole party |
| Jobs per party | One job; multiple jobs | Multiple jobs |
| Allocation detail | Count attendees for each job; each selected job applies to the whole party | Enter attendee counts per job |
| Unassigned attendees | Optional; every attendee must have a job | Optional |
| Multiple job assignments | Total job counts limited to party size; an attendee may take multiple jobs | An attendee may take multiple jobs |
| Brunch behavior | Separate Brunch and Abbau options; one combined option | One combined option: “Abbau & Brunch am nächsten Tag” |
| Eligibility after declining birthday | Next-day signup remains available; next-day signup is coming-only | Coming-only |

**Notes:** One RSVP contact allocates party counts across selected jobs. The combined Abbau/brunch option includes cleanup and buffet brunch; there is no separate Brunch option. Guests declining the birthday cannot sign up for next-day options.

## Job capacity

| Question | Options considered | Selected |
|---|---|---|
| Full job | Close signups; allow waitlist | Close signups |
| Partial group availability | Accept remaining places; reject the whole allocation | Accept remaining places and leave the remainder unassigned |

**Notes:** Capacity is optional per job; Aufbau is capped at 15. A person may take multiple jobs.

## Job suggestions and catalog publication

| Question | Options considered | Selected |
|---|---|---|
| Job suggestions | Guest suggestions; host-managed options; both | Guests can suggest jobs |
| Publication | Immediately publish; require host approval; publish only with submitted RSVP selection | Publish only with submitted RSVP selection |
| Duplicate labels | Reuse existing option; allow duplicates | Reuse existing option |
| Default capacity | Unlimited; let the suggester set a capacity | New suggestions start unlimited |
| Current signup behavior | Auto-select suggestion; add to catalog only | Auto-select for current signup |

**Notes:** Suggestions are staged in the current form. A drink or job suggestion becomes shared only if the guest submits the RSVP with that option selected; an unselected or abandoned suggestion is not published.

## Job descriptions

| Question | Options considered | Selected |
|---|---|---|
| Initial description copy | Draft clear German descriptions for review; owner provides exact wording first | Draft for review |

**Notes:** Every job should have a longer explanation of the expected task. Keep “Dinge” general rather than inventing specific duties.

## Additional job

The user added a job to help buy drinks on Friday or Saturday with a car. It is recorded as “Getränkeeinkauf mit Auto (Freitag oder Samstag)”; the description should say the helper provides a car. No cap was requested, so the option is uncapped.

## Job catalog architecture

| Question | Options considered | Selected |
|---|---|---|
| Catalog storage | Separate job catalog; generalize drink and job options into one catalog | Separate job catalog |

**Notes:** Confirmed by the user at the blocking Plan 09-06 decision checkpoint before implementation. Job descriptions, capacities, and allocation associations remain distinct from drink options.

## Deferred Ideas

None.
