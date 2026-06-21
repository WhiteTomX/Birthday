(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────────────────────
  const MIN = 1;
  const MAX = 10;

  // ── Element references ────────────────────────────────────────────────────
  const form          = document.getElementById('rsvp-form');
  const nameInput     = document.getElementById('name');
  const nameError     = document.getElementById('name-error');
  const btnLess       = document.getElementById('btn-less');
  const btnMore       = document.getElementById('btn-more');
  const countOutput   = document.getElementById('attendee-count');
  const countHidden   = document.getElementById('attendee-value');
  const btnNotComing  = document.getElementById('btn-not-coming');
  const btnComing     = document.getElementById('btn-coming');
  const comingFields  = document.getElementById('coming-fields');
  const btnSubmitComing = document.getElementById('btn-submit-coming');

  // ── Stepper state ─────────────────────────────────────────────────────────
  let count = parseInt(countHidden.value, 10) || MIN;

  function updateStepper() {
    countOutput.textContent = count;
    countHidden.value = count;
    btnLess.disabled = (count <= MIN);
    btnMore.disabled = (count >= MAX);
  }

  btnLess.addEventListener('click', function () {
    if (count > MIN) { count -= 1; updateStepper(); }
  });

  btnMore.addEventListener('click', function () {
    if (count < MAX) { count += 1; updateStepper(); }
  });

  updateStepper();

  // ── Name validation ───────────────────────────────────────────────────────
  function validateName() {
    if (nameInput.value.trim().length === 0) {
      nameInput.classList.add('error');
      nameError.classList.add('visible');
      nameInput.focus();
      return false;
    }
    nameInput.classList.remove('error');
    nameError.classList.remove('visible');
    return true;
  }

  nameInput.addEventListener('input', function () {
    if (nameInput.value.trim().length > 0) {
      nameInput.classList.remove('error');
      nameError.classList.remove('visible');
    }
  });

  // ── Shared fetch + success/error handler ─────────────────────────────────
  function submitForm(endpoint, payload, btnEl, labelOnError) {
    btnEl.disabled = true;
    btnEl.textContent = '…';

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
          // Replace form section with personalised German confirmation
          // Use createElement + textContent — never innerHTML with user input (XSS prevention)
          var section = document.querySelector('.rsvp-section');
          var p = document.createElement('p');
          p.className = 'success-msg';
          p.textContent = endpoint === '/api/not-coming'
            ? 'Schade, ' + payload.name + '! Wir werden dich vermissen.'
            : 'Danke, ' + payload.name + '! Deine Anmeldung wurde gespeichert.';
          section.innerHTML = '';
          section.appendChild(p);
        });
      })
      .catch(function (err) {
        btnEl.disabled = false;
        btnEl.textContent = labelOnError;
        var errEl = document.getElementById('submit-error');
        if (!errEl) {
          errEl = document.createElement('p');
          errEl.id = 'submit-error';
          errEl.className = 'error-msg visible';
          form.appendChild(errEl);
        }
        errEl.textContent = (err.status && err.status < 500 && err.message)
          ? err.message
          : 'Etwas ist schiefgelaufen. Bitte versuche es noch einmal.';
      });
  }

  // ── Attendance choice handlers ────────────────────────────────────────────
  btnNotComing.addEventListener('click', function () {
    if (!validateName()) return;
    submitForm(
      '/api/not-coming',
      { name: nameInput.value.trim() },
      btnNotComing,
      'Ich komme leider nicht'
    );
  });

  btnComing.addEventListener('click', function () {
    comingFields.hidden = false;
    btnComing.disabled = true;
    // Scroll the revealed fields into view on mobile
    comingFields.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  btnSubmitComing.addEventListener('click', function () {
    if (!validateName()) return;
    submitForm(
      '/api/rsvp',
      {
        name: nameInput.value.trim(),
        contact: document.getElementById('contact').value || null,
        attendees: parseInt(countHidden.value, 10)
      },
      btnSubmitComing,
      'Anmelden'
    );
  });

})();
