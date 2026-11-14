(function () {
  'use strict';

  const form = document.getElementById('rsvp-form');
  if (!form) return;

  const section = document.querySelector('.rsvp-section');
  const nameInput = document.getElementById('name');
  const nameError = document.getElementById('name-error');
  const attendanceError = document.getElementById('attendance-error');
  const attendanceInputs = [
    document.getElementById('attendance-coming'),
    document.getElementById('attendance-not-coming'),
  ];
  const comingFields = document.getElementById('coming-fields');
  const attendeesInput = document.getElementById('attendees');
  const attendeesError = document.getElementById('attendees-error');
  const drinkOptionsWrap = document.getElementById('drink-options');
  const drinkOptionsStatus = document.getElementById('drink-options-status');
  const suggestionForm = document.getElementById('drink-suggestion-form');
  const drinkSuggestion = document.getElementById('drink-suggestion');
  const drinkSuggestionError = document.getElementById('drink-suggestion-error');
  const drinkSuggestionStatus = document.getElementById('drink-suggestion-status');
  const btnDrinkSuggestion = document.getElementById('btn-drink-suggestion');
  const submitButton = document.getElementById('btn-submit-coming');
  const submitError = document.getElementById('submit-error');

  function setFeedback(element, message, visible) {
    if (message !== null) element.textContent = message;
    element.hidden = !visible;
    element.classList.toggle('visible', visible);
  }

  function selectedAttendance() {
    return attendanceInputs.find((input) => input.checked)?.value || '';
  }

  function createDrinkOption(option, checked = false) {
    if (!option || typeof option.label !== 'string' || !option.label.trim()) {
      throw new Error('Invalid drink option');
    }

    const label = document.createElement('label');
    label.className = 'drink-option';
    const checkboxId = `drink-option-${createDrinkOption.nextId++}`;
    label.setAttribute('for', checkboxId);

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = checkboxId;
    checkbox.value = option.label;
    checkbox.checked = checked;

    const text = document.createElement('span');
    text.textContent = option.label;

    label.appendChild(checkbox);
    label.appendChild(text);
    return { label, checkbox };
  }
  createDrinkOption.nextId = 0;

  function renderDrinkOptions(options) {
    if (!Array.isArray(options)) throw new Error('Invalid drink catalog');
    const optionElements = options.map((option) => createDrinkOption(option).label);
    drinkOptionsWrap.replaceChildren(...optionElements);
  }

  function selectedDrinks() {
    return Array.from(
      drinkOptionsWrap.querySelectorAll('input[type="checkbox"]'),
    ).filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value);
  }

  async function postJson(endpoint, payload) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok || !data?.ok) throw new Error('Request failed');
    return data;
  }

  function showConfirmation(payload, drinks) {
    const confirmation = document.createElement('p');
    confirmation.className = 'success-msg';
    confirmation.setAttribute('role', 'status');
    confirmation.setAttribute('aria-live', 'polite');
    confirmation.tabIndex = -1;

    if (payload.attendance === 'not_coming') {
      confirmation.textContent = `Schade, ${payload.name}! Wir werden dich vermissen.`;
    } else {
      const group = payload.attendees === 1 ? 'Person' : 'Personen';
      const drinkSummary = drinks.length ? drinks.join(', ') : 'keine angegeben';
      confirmation.textContent = `Danke, ${payload.name}! Wir freuen uns auf euch mit ${payload.attendees} ${group}. Getränkewünsche: ${drinkSummary}. Die Getränke sind Wünsche, keine Garantie.`;
    }

    section.replaceChildren(confirmation);
    confirmation.focus();
  }

  attendanceInputs.forEach((input) => {
    input.addEventListener('change', () => {
      comingFields.hidden = selectedAttendance() !== 'coming';
      setFeedback(attendanceError, null, false);
    });
  });

  nameInput.addEventListener('input', () => {
    if (nameInput.value.trim()) {
      nameInput.removeAttribute('aria-invalid');
      setFeedback(nameError, null, false);
    }
  });

  attendeesInput.addEventListener('input', () => {
    attendeesInput.removeAttribute('aria-invalid');
    setFeedback(attendeesError, null, false);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setFeedback(submitError, '', false);

    const attendance = selectedAttendance();
    if (!attendance) {
      setFeedback(attendanceError, null, true);
      attendanceInputs[0].focus();
      return;
    }

    const name = nameInput.value.trim();
    if (!name || name.length > 200) {
      nameInput.setAttribute('aria-invalid', 'true');
      setFeedback(nameError, 'Bitte gib deinen Namen mit höchstens 200 Zeichen ein.', true);
      nameInput.focus();
      return;
    }
    nameInput.removeAttribute('aria-invalid');
    setFeedback(nameError, null, false);

    let payload = { name, attendance };
    let drinks = [];
    if (attendance === 'coming') {
      const attendees = Number(attendeesInput.value);
      if (!Number.isInteger(attendees) || attendees < 1 || attendees > 10) {
        attendeesInput.setAttribute('aria-invalid', 'true');
        setFeedback(attendeesError, null, true);
        attendeesInput.focus();
        return;
      }
      attendeesInput.removeAttribute('aria-invalid');
      setFeedback(attendeesError, null, false);
      drinks = selectedDrinks();
      payload = { name, attendance, attendees, drinks };
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Wird gesendet…';
    try {
      await postJson('/api/fresh-rsvp', payload);
      showConfirmation(payload, drinks);
    } catch {
      submitButton.disabled = false;
      submitButton.textContent = 'Anmeldung senden';
      setFeedback(submitError, 'Die Anmeldung konnte nicht gesendet werden. Bitte versuche es erneut.', true);
    }
  });

  suggestionForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setFeedback(drinkSuggestionStatus, '', false);

    const label = drinkSuggestion.value.trim();
    if (!label || label.length > 80) {
      drinkSuggestion.setAttribute('aria-invalid', 'true');
      setFeedback(drinkSuggestionError, 'Bitte gib ein Getränk mit höchstens 80 Zeichen ein.', true);
      drinkSuggestion.focus();
      return;
    }

    drinkSuggestion.removeAttribute('aria-invalid');
    setFeedback(drinkSuggestionError, null, false);
    btnDrinkSuggestion.disabled = true;
    btnDrinkSuggestion.textContent = 'Wird gespeichert…';
    try {
      const data = await postJson('/api/drink-suggestions', { label });
      if (!data.option) throw new Error('Missing drink option');

      const existing = selectedDrinks().find(
        (drink) => drink.toLowerCase() === data.option.label.toLowerCase(),
      );
      if (existing) {
        const checkbox = Array.from(
          drinkOptionsWrap.querySelectorAll('input[type="checkbox"]'),
        ).find((option) => option.value === existing);
        checkbox.checked = true;
      } else {
        const { label: optionLabel, checkbox } = createDrinkOption(data.option, true);
        drinkOptionsWrap.appendChild(optionLabel);
        checkbox.checked = true;
      }

      drinkSuggestion.value = '';
      setFeedback(drinkSuggestionStatus, `${data.option.label} wurde hinzugefügt und ausgewählt.`, true);
    } catch {
      setFeedback(drinkSuggestionError, 'Das Getränk konnte nicht gespeichert werden. Bitte versuche es erneut.', true);
    } finally {
      btnDrinkSuggestion.disabled = false;
      btnDrinkSuggestion.textContent = 'Vorschlagen';
    }
  });

  drinkSuggestion.addEventListener('input', () => {
    if (drinkSuggestion.value.trim()) {
      drinkSuggestion.removeAttribute('aria-invalid');
      setFeedback(drinkSuggestionError, null, false);
    }
  });

  async function loadDrinkOptions() {
    setFeedback(drinkOptionsStatus, 'Getränke werden geladen …', true);
    try {
      const response = await fetch('/api/drink-suggestions');
      const data = await response.json();
      if (!response.ok || !data?.ok) throw new Error('Catalog request failed');
      renderDrinkOptions(data.options);
      setFeedback(drinkOptionsStatus, '', false);
    } catch {
      drinkOptionsWrap.replaceChildren();
      setFeedback(drinkOptionsStatus, 'Getränke konnten nicht geladen werden. Bitte lade die Seite erneut.', true);
    }
  }

  loadDrinkOptions();
})();
