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
  const comingSuggestionFields = document.getElementById('coming-suggestion-fields');
  const suggestionForm = document.getElementById('drink-suggestion-form');
  const drinkSuggestion = document.getElementById('drink-suggestion');
  const drinkSuggestionError = document.getElementById('drink-suggestion-error');
  const drinkSuggestionStatus = document.getElementById('drink-suggestion-status');
  const btnDrinkSuggestion = document.getElementById('btn-drink-suggestion');
  const jobSuggestionForm = document.getElementById('job-suggestion-form');
  const jobSuggestion = document.getElementById('job-suggestion');
  const jobSuggestionError = document.getElementById('job-suggestion-error');
  const jobSuggestionStatus = document.getElementById('job-suggestion-status');
  const btnJobSuggestion = document.getElementById('btn-job-suggestion');
  const submitButton = document.getElementById('btn-submit-coming');
  const submitError = document.getElementById('submit-error');
  const stagedJobDescription = 'Vorgeschlagene Aufgabe; die genauen Details werden gemeinsam abgestimmt.';
  let jobOptionsLoaded = false;

  function setFeedback(element, message, visible) {
    if (message !== null) element.textContent = message;
    element.hidden = !visible;
    element.classList.toggle('visible', visible);
  }

  function selectedAttendance() {
    return attendanceInputs.find((input) => input.checked)?.value || '';
  }

  function normalizeSuggestionLabel(value) {
    return value.normalize('NFC').trim().replace(/\s+/g, ' ');
  }

  function suggestionKey(value) {
    return normalizeSuggestionLabel(value).toLocaleLowerCase('de-DE');
  }

  function createDrinkOption(option, checked = false, staged = false) {
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
    if (staged) checkbox.dataset.drinkSuggestion = option.label;

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

  function selectedDrinkOptions() {
    return Array.from(
      drinkOptionsWrap.querySelectorAll('input[type="checkbox"]'),
    ).filter((checkbox) => checkbox.checked);
  }

  function selectedDrinks() {
    return selectedDrinkOptions()
      .filter((checkbox) => !checkbox.dataset.drinkSuggestion)
      .map((checkbox) => checkbox.value);
  }

  function selectedDrinkSuggestions() {
    return selectedDrinkOptions()
      .filter((checkbox) => checkbox.dataset.drinkSuggestion)
      .map((checkbox) => checkbox.dataset.drinkSuggestion);
  }

  function selectedDrinkLabels() {
    return selectedDrinkOptions().map((checkbox) => checkbox.value);
  }

  function createJobOption(option, staged = false) {
    if (
      !option
      || typeof option.label !== 'string'
      || typeof option.description !== 'string'
      || (!staged && typeof option.id !== 'string')
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
    count.min = '1';
    count.step = '1';
    count.max = String(Number(attendeesInput.value) || 10);
    count.value = '';
    count.disabled = isFull;
    count.dataset.capacityFull = String(isFull);
    count.dataset.jobLabel = option.label;
    if (staged) count.dataset.jobSuggestion = option.label;
    else count.dataset.jobId = option.id;
    count.setAttribute('aria-label', `Anzahl für ${option.label}`);
    count.setAttribute('aria-describedby', `${description.id} ${capacityStatus.id}`);
    countLabel.appendChild(count);
    item.append(details, capacityStatus, countLabel);
    return item;
  }
  createJobOption.nextId = 0;

  function renderJobOptions(options) {
    if (!Array.isArray(options)) throw new Error('Invalid job catalog');
    jobOptionsWrap.replaceChildren(...options.map((option) => createJobOption(option)));
  }

  function jobCountInputs() {
    return [
      ...jobOptionsWrap.querySelectorAll('input[data-job-id]'),
      ...jobOptionsWrap.querySelectorAll('input[data-job-suggestion]'),
    ];
  }

  function selectedJobs() {
    return Array.from(jobOptionsWrap.querySelectorAll('input[data-job-id]'))
      .filter((input) => !input.disabled && input.value.trim() !== '')
      .map((input) => ({ id: input.dataset.jobId, count: Number(input.value) }));
  }

  function selectedJobSuggestions() {
    return Array.from(jobOptionsWrap.querySelectorAll('input[data-job-suggestion]'))
      .filter((input) => !input.disabled && input.value.trim() !== '')
      .map((input) => ({ label: input.dataset.jobSuggestion, count: Number(input.value) }));
  }

  function updateJobCountMaximum() {
    const maximum = String(Number(attendeesInput.value) || 10);
    jobCountInputs().forEach((input) => {
      input.max = maximum;
      if (input.value.trim() && Number(input.value) > Number(maximum)) {
        input.value = '';
      }
    });
  }

  function updateJobControlState() {
    const canAssignJobs = selectedAttendance() === 'coming';
    jobCountInputs().forEach((input) => {
      input.disabled = !canAssignJobs || input.dataset.capacityFull === 'true';
    });
  }

  function updateComingControlState() {
    const isComing = selectedAttendance() === 'coming';
    comingFields.hidden = !isComing;
    comingSuggestionFields.hidden = !isComing;
    drinkSuggestion.disabled = !isComing;
    btnDrinkSuggestion.disabled = !isComing;
    jobSuggestion.disabled = !isComing;
    btnJobSuggestion.disabled = !isComing || !jobOptionsLoaded;
    updateJobControlState();
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
      const jobs = Array.isArray(result.jobs) ? result.jobs : [];
      const jobSummary = jobs.length
        ? ` Helferjobs: ${jobs.map((job) => {
          const unassigned = Math.max(job.requested_count - job.accepted_count, 0);
          const remainder = unassigned > 0 ? `, ${unassigned} nicht bestätigt` : '';
          return `${job.label}: ${job.accepted_count} von ${job.requested_count} bestätigt${remainder}`;
        }).join('; ')}.`
        : '';
      confirmation.textContent = `Danke, ${payload.name}! Wir freuen uns auf euch mit ${payload.attendees} ${group}. Getränkewünsche: ${drinkSummary}. Die Getränke sind Wünsche, keine Garantie.${jobSummary}`;
    }

    section.replaceChildren(confirmation);
    confirmation.focus();
  }

  attendanceInputs.forEach((input) => {
    input.addEventListener('change', () => {
      updateComingControlState();
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
    let drinkLabels = [];
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
      drinkLabels = selectedDrinkLabels();
      drinks = selectedDrinks();
      const invalidJobInput = jobCountInputs()
        .find((input) => {
          const value = input.value.trim();
          const count = Number(value);
          return value !== '' && (
            count < 1
            || count > attendees
            || !Number.isInteger(count)
          );
        });
      if (invalidJobInput) {
        invalidJobInput.focus();
        setFeedback(jobOptionsStatus, 'Die Anzahl für jeden Helferjob muss zwischen 1 und der Gruppengröße liegen.', true);
        return;
      }
      const jobs = selectedJobs();
      const jobSuggestions = selectedJobSuggestions();
      setFeedback(jobOptionsStatus, '', false);
      payload = { name, attendance, attendees, drinks };
      const drinkSuggestions = selectedDrinkSuggestions();
      if (drinkSuggestions.length > 0) payload.drink_suggestions = drinkSuggestions;
      if (jobs.length > 0) payload.jobs = jobs;
      if (jobSuggestions.length > 0) payload.job_suggestions = jobSuggestions;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Wird gesendet…';
    try {
      const result = await postJson('/api/fresh-rsvp', payload);
      showConfirmation(payload, drinkLabels, result);
    } catch {
      submitButton.disabled = false;
      submitButton.textContent = 'Anmeldung senden';
      setFeedback(submitError, 'Die Anmeldung konnte nicht gesendet werden. Bitte versuche es erneut.', true);
    }
  });

  suggestionForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setFeedback(drinkSuggestionStatus, '', false);

    if (selectedAttendance() !== 'coming') return;

    const rawLabel = drinkSuggestion.value;
    const label = rawLabel.trim();
    if (!label || Array.from(label).length > 80) {
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
      const data = await postJson('/api/drink-suggestions', { label: rawLabel });
      if (typeof data.label !== 'string') throw new Error('Missing staged drink label');
      const normalizedLabel = normalizeSuggestionLabel(data.label);
      if (!normalizedLabel || Array.from(normalizedLabel).length > 80) {
        throw new Error('Invalid staged drink label');
      }

      const checkbox = Array.from(
        drinkOptionsWrap.querySelectorAll('input[type="checkbox"]'),
      ).find((option) => suggestionKey(option.value) === suggestionKey(normalizedLabel));
      if (checkbox) {
        checkbox.checked = true;
      } else {
        const { label: optionLabel } = createDrinkOption({ label: normalizedLabel }, true, true);
        drinkOptionsWrap.appendChild(optionLabel);
      }

      drinkSuggestion.value = '';
      setFeedback(drinkSuggestionStatus, `${normalizedLabel} wurde hinzugefügt und ausgewählt.`, true);
    } catch {
      setFeedback(drinkSuggestionError, 'Das Getränk konnte nicht gespeichert werden. Bitte versuche es erneut.', true);
    } finally {
      btnDrinkSuggestion.textContent = 'Hinzufügen';
      updateComingControlState();
    }
  });

  jobSuggestionForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setFeedback(jobSuggestionStatus, '', false);

    if (selectedAttendance() !== 'coming' || !jobOptionsLoaded) return;

    const rawLabel = jobSuggestion.value;
    const label = rawLabel.trim();
    if (!label || Array.from(label).length > 80) {
      jobSuggestion.setAttribute('aria-invalid', 'true');
      setFeedback(jobSuggestionError, 'Bitte gib einen Helferjob mit höchstens 80 Zeichen ein.', true);
      jobSuggestion.focus();
      return;
    }

    jobSuggestion.removeAttribute('aria-invalid');
    setFeedback(jobSuggestionError, null, false);
    btnJobSuggestion.disabled = true;
    btnJobSuggestion.textContent = 'Wird ergänzt…';
    try {
      const data = await postJson('/api/job-options', { label: rawLabel });
      if (typeof data.label !== 'string') throw new Error('Missing staged job label');
      const normalizedLabel = normalizeSuggestionLabel(data.label);
      if (!normalizedLabel || Array.from(normalizedLabel).length > 80) {
        throw new Error('Invalid staged job label');
      }

      const existing = jobCountInputs().find((input) => (
        suggestionKey(input.dataset.jobLabel) === suggestionKey(normalizedLabel)
      ));
      if (existing) {
        jobSuggestion.value = '';
        const message = existing.dataset.jobSuggestion
          ? `${normalizedLabel} wurde bereits vorgeschlagen.`
          : `${normalizedLabel} ist bereits als Helferjob vorhanden. Gib eine Anzahl ein, um dich dafür einzutragen.`;
        setFeedback(jobSuggestionStatus, message, true);
      } else {
        jobOptionsWrap.appendChild(createJobOption({
          label: normalizedLabel,
          description: stagedJobDescription,
          max_capacity: null,
          remaining: null,
        }, true));
        jobSuggestion.value = '';
        updateJobCountMaximum();
        updateJobControlState();
        setFeedback(jobSuggestionStatus, `${normalizedLabel} wurde ergänzt. Wähle eine Anzahl, damit der Vorschlag mit deiner Anmeldung geteilt wird.`, true);
      }
    } catch {
      setFeedback(jobSuggestionError, 'Der Helferjob konnte nicht ergänzt werden. Bitte versuche es erneut.', true);
    } finally {
      btnJobSuggestion.textContent = 'Job hinzufügen';
      updateComingControlState();
    }
  });

  drinkSuggestion.addEventListener('input', () => {
    if (drinkSuggestion.value.trim()) {
      drinkSuggestion.removeAttribute('aria-invalid');
      setFeedback(drinkSuggestionError, null, false);
    }
  });

  jobSuggestion.addEventListener('input', () => {
    if (jobSuggestion.value.trim()) {
      jobSuggestion.removeAttribute('aria-invalid');
      setFeedback(jobSuggestionError, null, false);
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
      jobOptionsLoaded = true;
      updateComingControlState();
      setFeedback(jobOptionsStatus, '', false);
    } catch {
      jobOptionsLoaded = false;
      jobOptionsWrap.replaceChildren();
      updateComingControlState();
      setFeedback(jobOptionsStatus, 'Helferjobs konnten nicht geladen werden. Bitte lade die Seite erneut.', true);
    }
  }

  updateComingControlState();
  loadDrinkOptions();
  loadJobOptions();
})();
