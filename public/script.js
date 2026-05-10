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
    // Defensive check only:
    if (count < MIN || count > MAX) {
      valid = false; // should never happen via normal interaction
    }

    if (valid) {
      // Disable submit and show loading state (D-03)
      var submitBtn = form.querySelector('.btn-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = '…';

      // Build JSON payload (D-02)
      // contact coerced to null when empty string (D-10 / RESEARCH gotcha #5)
      // attendees parsed as integer (RESEARCH gotcha #6)
      var payload = {
        name: nameInput.value.trim(),
        contact: form.elements['contact'].value || null,
        attendees: parseInt(countHidden.value, 10)
      };

      fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) { throw new Error('Server error'); }
          // Success: replace form section with personalised German confirmation (D-04, D-05)
          // Use createElement + textContent — never innerHTML with user input (XSS prevention)
          var section = document.querySelector('.rsvp-section');
          var p = document.createElement('p');
          p.className = 'success-msg';
          p.textContent = 'Danke, ' + payload.name + '! Deine Anmeldung wurde gespeichert.';
          section.innerHTML = '';
          section.appendChild(p);
        })
        .catch(function () {
          // Error: re-enable form and show inline error message (D-06, D-07)
          submitBtn.disabled = false;
          submitBtn.textContent = 'Anmelden';
          var errEl = document.getElementById('submit-error');
          if (!errEl) {
            errEl = document.createElement('p');
            errEl.id = 'submit-error';
            errEl.className = 'error-msg visible';
            form.appendChild(errEl);
          }
          errEl.textContent = 'Etwas ist schiefgelaufen. Bitte versuche es noch einmal.';
        });
    }
  });

})();
