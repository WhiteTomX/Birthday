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
  const jobOptionsWrap = document.getElementById('job-options');
  const jobOptionsStatus = document.getElementById('job-options-status');
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

  function createJobOption(option) {
    if (
      !option
      || typeof option.id !== 'string'
      || typeof option.label !== 'string'
      || typeof option.description !== 'string'
    ) {
      throw new Error('Invalid job option');
    }

    const item = document.createElement('div');
    item.className = 'job-option';

    const details = document.createElement('div');
    details.className = 'job-option-details';
    const label = document.createElement('strong');
    label.textContent = option.label;
    const description = document.createElement('p');
    const optionIndex = createJobOption.nextId++;
    description.id = `job-description-${optionIndex}`;
    description.textContent = option.description;
    details.append(label, description);

    const capacityStatus = document.createElement('p');
    capacityStatus.id = `job-capacity-${optionIndex}`;
    capacityStatus.className = 'job-option-capacity';
    capacityStatus.setAttribute('role', 'status');
    let isFull = false;
    if (option.max_capacity === null) {
      if (option.remaining !== null) throw new Error('Invalid uncapped job availability');
      capacityStatus.textContent = 'Keine feste Begrenzung.';
    } else {
      if (
        !Number.isInteger(option.max_capacity)
        || option.max_capacity < 0
        || !Number.isInteger(option.remaining)
        || option.remaining < 0
        || option.remaining > option.max_capacity
      ) {
        throw new Error('Invalid capped job availability');
      }
      isFull = option.remaining === 0;
      if (isFull) {
        capacityStatus.textContent = 'Keine Plätze mehr frei.';
        item.classList.add('is-full');
      } else {
        const placeWord = option.remaining === 1 ? 'Platz' : 'Plätze';
        capacityStatus.textContent = `Noch ${option.remaining} ${placeWord} frei; bei mehr Anmeldungen werden nur verfügbare Plätze bestätigt.`;
      }
    }

    const countLabel = document.createElement('label');
    countLabel.className = 'job-count-label';
    const countId = `job-count-${optionIndex}`;
    countLabel.htmlFor = countId;
    countLabel.textContent = 'Anzahl';

    const count = document.createElement('input');
    count.type = 'number';
    count.id = countId;
    count.min = '0';
    count.max = String(Number(attendeesInput.value) || 10);
    count.value = '0';
    count.disabled = isFull;
    count.dataset.jobId = option.id;
    count.setAttribute('aria-label', `Anzahl für ${option.label}`);
    count.setAttribute('aria-describedby', `${description.id} ${capacityStatus.id}`);
    countLabel.appendChild(count);
    item.append(details, capacityStatus, countLabel);
    return item;
  }
  createJobOption.nextId = 0;

  function renderJobOptions(options) {
    if (!Array.isArray(options)) throw new Error('Invalid job catalog');
    jobOptionsWrap.replaceChildren(...options.map(createJobOption));
  }

  function selectedJobs() {
    return Array.from(jobOptionsWrap.querySelectorAll('input[data-job-id]'))
      .filter((input) => !input.disabled && input.value.trim() !== '' && Number(input.value) !== 0)
      .map((input) => ({ id: input.dataset.jobId, count: Number(input.value) }));
  }

  function updateJobCountMaximum() {
    const maximum = String(Number(attendeesInput.value) || 10);
    jobOptionsWrap.querySelectorAll('input[data-job-id]').forEach((input) => {
      input.max = maximum;
    });
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

  function showConfirmation(payload, drinks, result) {
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
      const jobs = result.jobs?.filter((job) => job.accepted_count > 0) ?? [];
      const jobSummary = jobs.length
        ? ` Helferjobs: ${jobs.map((job) => `${job.label} (${job.accepted_count})`).join(', ')}.`
        : '';
      confirmation.textContent = `Danke, ${payload.name}! Wir freuen uns auf euch mit ${payload.attendees} ${group}. Getränkewünsche: ${drinkSummary}. Die Getränke sind Wünsche, keine Garantie.${jobSummary}`;
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
    updateJobCountMaximum();
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
      const jobs = selectedJobs();
      if (jobs.some(({ count }) => !Number.isInteger(count) || count < 1 || count > attendees)) {
        const invalidJobInput = Array.from(jobOptionsWrap.querySelectorAll('input[data-job-id]'))
          .find((input) => input.value.trim() !== '' && Number(input.value) !== 0 && (
            Number(input.value) < 1
            || Number(input.value) > attendees
            || !Number.isInteger(Number(input.value))
          ));
        if (invalidJobInput) invalidJobInput.focus();
        setFeedback(jobOptionsStatus, 'Die Anzahl für jeden Helferjob muss zwischen 1 und der Gruppengröße liegen.', true);
        return;
      }
      setFeedback(jobOptionsStatus, '', false);
      payload = { name, attendance, attendees, drinks };
      if (jobs.length > 0) payload.jobs = jobs;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Wird gesendet…';
    try {
      const result = await postJson('/api/fresh-rsvp', payload);
      showConfirmation(payload, drinks, result);
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
      btnDrinkSuggestion.textContent = 'Hinzufügen';
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

  async function loadJobOptions() {
    setFeedback(jobOptionsStatus, 'Helferjobs werden geladen …', true);
    try {
      const response = await fetch('/api/job-options');
      const data = await response.json();
      if (!response.ok || !data?.ok) throw new Error('Catalog request failed');
      renderJobOptions(data.options);
      setFeedback(jobOptionsStatus, '', false);
    } catch {
      jobOptionsWrap.replaceChildren();
      setFeedback(jobOptionsStatus, 'Helferjobs konnten nicht geladen werden. Bitte lade die Seite erneut.', true);
    }
  }

  loadDrinkOptions();
  loadJobOptions();
})();
