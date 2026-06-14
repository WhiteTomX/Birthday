(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────────────────────
  const MIN = 1;
  const MAX = 10;

  // ── Element references ────────────────────────────────────────────────────
  const form        = document.getElementById('rsvp-form');
  const nameInput   = document.getElementById('name');
  const nameError   = document.getElementById('name-error');
  const btnLess     = document.getElementById('btn-less');
  const btnMore     = document.getElementById('btn-more');
  const countOutput = document.getElementById('attendee-count');
  const countHidden = document.getElementById('attendee-value');
  const submitBtn   = form.querySelector('.btn-submit');
  const contactField = document.getElementById('contact-field');
  const stepperField = document.getElementById('stepper-field');
  const radios       = form.elements['attendance']; // RadioNodeList

  // ── Stepper state ─────────────────────────────────────────────────────────
  let count = parseInt(countHidden.value, 10) || MIN;

  function updateStepper() {
    countOutput.textContent = count;
    countHidden.value = count;
    btnLess.disabled = (count <= MIN);
    btnMore.disabled = (count >= MAX);
  }

  btnLess.addEventListener('click', function () {
    if (count > MIN) {
      count -= 1;
      updateStepper();
    }
  });

  btnMore.addEventListener('click', function () {
    if (count < MAX) {
      count += 1;
      updateStepper();
    }
  });

  // Sync initial disabled state (matches HTML attr but ensures JS state is consistent)
  updateStepper();

  // ── Attendance mode controller ────────────────────────────────────────────
  function applyAttendanceMode() {
    var notComing = form.elements['attendance'].value === 'not-coming';
    contactField.hidden = notComing;
    stepperField.hidden = notComing;
    submitBtn.textContent = notComing ? 'Abmelden' : 'Anmelden';
  }

  // Wire radio buttons
  Array.prototype.forEach.call(radios, function (radio) {
    radio.addEventListener('change', applyAttendanceMode);
  });

  // Apply initial state (default: "Ich komme" pre-selected, no visible change)
  applyAttendanceMode();

  // ── Form validation ───────────────────────────────────────────────────────
  function showNameError() {
    nameInput.classList.add('error');
    nameError.classList.add('visible');
    nameInput.focus();
  }

  function clearNameError() {
    nameInput.classList.remove('error');
    nameError.classList.remove('visible');
  }

  // Remove error as soon as the field has a value (on input event)
  nameInput.addEventListener('input', function () {
    if (nameInput.value.trim().length > 0) {
      clearNameError();
    }
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault(); // Always prevent default — Phase 3 will handle actual submission

    let valid = true;

    // Validate name (required)
    if (nameInput.value.trim().length === 0) {
      showNameError();
      valid = false;
    } else {
      clearNameError();
    }

    // Stepper is always valid (pre-filled at 1, cannot be cleared to blank)
    // Defensive check only (skipped when not-coming, stepper is hidden):
    var notComing = form.elements['attendance'].value === 'not-coming';
    if (!notComing && (count < MIN || count > MAX)) {
      valid = false; // should never happen via normal interaction
    }

    if (valid) {
      // Disable submit and show loading state (D-03)
      submitBtn.disabled = true;
      submitBtn.textContent = '…';

      // Build JSON payload (D-02)
      // Decline payload carries only name; attending payload includes contact and attendees
      // contact coerced to null when empty string (D-10 / RESEARCH gotcha #5)
      // attendees parsed as integer (RESEARCH gotcha #6)
      var endpoint = notComing ? '/api/not-coming' : '/api/rsvp';
      var payload = notComing
        ? { name: nameInput.value.trim() }
        : {
            name: nameInput.value.trim(),
            contact: form.elements['contact'].value || null,
            attendees: parseInt(countHidden.value, 10)
          };

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok) {
              var err = new Error(data.error || 'Server error');
              err.status = res.status;
              throw err;
            }
            // Success: replace form section with personalised German confirmation (D-04, D-05)
            // Use createElement + textContent — never innerHTML with user input (XSS prevention)
            var section = document.querySelector('.rsvp-section');
            var p = document.createElement('p');
            p.className = 'success-msg';
            p.textContent = notComing
              ? 'Schade, ' + payload.name + '! Wir werden dich vermissen.'
              : 'Danke, ' + payload.name + '! Deine Anmeldung wurde gespeichert.';
            section.innerHTML = '';
            section.appendChild(p);
          });
        })
        .catch(function (err) {
          // Error: re-enable form and show inline error message (D-06, D-07)
          submitBtn.disabled = false;
          submitBtn.textContent = notComing ? 'Abmelden' : 'Anmelden';
          var errEl = document.getElementById('submit-error');
          if (!errEl) {
            errEl = document.createElement('p');
            errEl.id = 'submit-error';
            errEl.className = 'error-msg visible';
            form.appendChild(errEl);
          }
          // Show server-provided message for 4xx, generic message for 5xx / network errors
          errEl.textContent = (err.status && err.status < 500 && err.message)
            ? err.message
            : 'Etwas ist schiefgelaufen. Bitte versuche es noch einmal.';
        });
    }
  });

})();
