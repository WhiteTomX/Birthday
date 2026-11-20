# Deferred Items

- The requested UI suite has one pre-existing failure in `tests/phase-9-ui.test.mjs`: the event-details test expects `<!-- VENUE_DETAILS -->`, which is absent from the current `public/rsvp/index.html`. The same failure occurred before the implementation changes; unrelated to this task and left untouched.
