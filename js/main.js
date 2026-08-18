// Kari — records values 0-5 (plus 10) per routine and shows them as a table

document.addEventListener('DOMContentLoaded', () => {

  // ---------------------------------------------------------------
  // Password for the start screen. Change it right here — it is the
  // only place it appears. Any length works, 10 characters is just
  // what was generated. Note that it only keeps casual hands out:
  // anyone who opens the page source can read it.
  // ---------------------------------------------------------------
  const APP_PASSWORD = 'a';

  const MAX_CLICKS = 11;           // value columns: S1-S10, L
  const COLUMNS = MAX_CLICKS + 2;  // plus "Total" and "E:"
  const STORAGE_KEY = 'kari.exercises';
  const MAX_DIGITS = 3;            // guard against runaway input in a narrow cell

  const viewLock   = document.getElementById('view-lock');
  const viewStart  = document.getElementById('view-start');
  const viewInput  = document.getElementById('view-input');
  const viewResult = document.getElementById('view-result');
  const viewGuide  = document.getElementById('view-guide');
  const numberBtns = Array.from(document.querySelectorAll('.btn'));
  const resultBody = document.getElementById('result-body');
  const deleteBtn  = document.getElementById('delete-last');
  const inputTitle = document.getElementById('input-title');
  const inputSkill = document.getElementById('input-skill');
  const track      = document.getElementById('track');
  const finishBtn  = document.getElementById('finish');

  /**
   * A routine is an array of at most MAX_CLICKS entries. Tapping appends to the
   * end; manual editing may leave gaps, which are stored as null.
   */
  let values = [];

  /** Earlier routines, oldest first — cleared only by Reset. */
  let saved = loadSaved();

  function loadSaved() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!Array.isArray(stored)) return [];
      return stored
        .filter(Array.isArray)
        .map((row) => row.slice(0, MAX_CLICKS).map(normalise));
    } catch {
      return [];                   // ignore broken or blocked localStorage
    }
  }

  function persistSaved() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      /* Cannot store — routines then only last until the next reload. */
    }
  }

  /** Anything that is not a real number counts as an empty cell. */
  function normalise(value) {
    return Number.isFinite(value) ? value : null;
  }

  function isFilled(value) {
    return typeof value === 'number';
  }

  function sumOf(rowValues) {
    return rowValues.reduce((acc, v) => acc + (isFilled(v) ? v : 0), 0);
  }

  function hasValues(rowValues) {
    return rowValues.some(isFilled);
  }

  /** Column names as they read in the heading above the buttons. */
  const SKILL_NAMES = [
    '1st Skill', '2nd Skill', '3rd Skill', '4th Skill', '5th Skill',
    '6th Skill', '7th Skill', '8th Skill', '9th Skill', '10th Skill',
    'Landing',
  ];

  /** Slot names on the track, matching the table header: S1-S10, then L. */
  const SLOT_LABELS = Array.from({ length: MAX_CLICKS }, (_, i) =>
    i === MAX_CLICKS - 1 ? 'L' : `S${i + 1}`);

  /** Builds the empty track once; only its contents change afterwards. */
  function buildTrack() {
    track.style.setProperty('--track-count', String(MAX_CLICKS));
    track.replaceChildren(...SLOT_LABELS.map((label) => {
      const slot = document.createElement('li');
      slot.className = 'track-slot';

      const name = document.createElement('span');
      name.className = 'track-label';
      name.textContent = label;

      const value = document.createElement('span');
      value.className = 'track-value';

      slot.append(name, value);
      return slot;
    }));
  }

  function updateTrack() {
    Array.from(track.children).forEach((slot, i) => {
      const value = values[i];
      const filled = isFilled(value);
      slot.querySelector('.track-value').textContent = filled ? String(value) : '';
      slot.classList.toggle('is-filled', filled);
      slot.classList.toggle('is-next', i === values.length);
      if (filled) slot.dataset.value = String(value);
      else delete slot.dataset.value;
    });
  }

  /** Replays the drop-in so a repeat of the same value still reads as a tap. */
  function popSlot(index) {
    const slot = track.children[index];
    if (!slot) return;
    slot.classList.remove('just-filled');
    void slot.offsetWidth;
    slot.classList.add('just-filled');
  }

  track.addEventListener('animationend', (event) => {
    event.target.classList.remove('just-filled');
  });

  /** Names the value the next tap will record — S1-S10, then L. */
  function updateInputTitle() {
    const next = values.length;
    const complete = next >= SKILL_NAMES.length;
    inputSkill.textContent = complete ? 'Routine complete' : SKILL_NAMES[next];
    inputTitle.classList.toggle('is-complete', complete);
    updateTrack();

    // The landing is not a skill, so a full routine drops the count entirely.
    const full = next >= MAX_CLICKS;
    finishBtn.textContent = full
      ? 'Finish Routine'
      : `Finish Routine after ${next} ${next === 1 ? 'Skill' : 'Skills'}`;
    finishBtn.classList.toggle('is-ready', full);
  }

  /** Lock and dim the buttons once all values have been recorded. */
  function updateButtonState() {
    const full = values.length >= MAX_CLICKS;
    numberBtns.forEach((btn) => {
      btn.disabled = full;
      btn.classList.toggle('is-dimmed', full);
    });
    updateInputTitle();
  }

  function record(value, button) {
    if (values.length >= MAX_CLICKS) return;
    values.push(value);
    updateButtonState();
    popSlot(values.length - 1);
    flash(button);
  }

  /** One-shot confirmation on the key that was just tapped. */
  function flash(button) {
    if (!button) return;
    button.classList.remove('just-tapped');
    void button.offsetWidth;
    button.classList.add('just-tapped');
  }

  // --- Library table ------------------------------------------------

  /** Which routine the table currently shows as selected. */
  let selectedRow = null;

  /** Whether the library also shows the running, not yet saved routine. */
  let showsCurrent = false;

  function selectRow(tr) {
    if (selectedRow === tr) return;
    if (selectedRow) selectedRow.classList.remove('is-selected');
    selectedRow = tr;
    if (tr) tr.classList.add('is-selected');
  }

  /** Any whole number is accepted; only digits, and without leading zeros. */
  function sanitise(text) {
    const digits = text.replace(/\D/g, '').slice(0, MAX_DIGITS);
    return digits === '' ? '' : String(Number(digits));
  }

  /** Writes a manually entered value back into the routine it belongs to. */
  function writeValue(rowValues, index, raw, isSaved) {
    while (rowValues.length <= index) rowValues.push(null);
    rowValues[index] = raw === '' ? null : Number(raw);
    if (isSaved) persistSaved();
  }

  function updateSummary(tr, rowValues) {
    const filled = hasValues(rowValues);
    const sum = sumOf(rowValues);
    tr.querySelector('.cell-total').textContent = filled ? String(sum) : '';
    tr.querySelector('.cell-extra').textContent = filled
      ? ((100 - sum) / 10).toLocaleString('en-US', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
      : '';
  }

  /** Enter walks through the cells, the arrow keys move between routines. */
  function onCellKey(event) {
    const input = event.target;
    const tr = input.closest('tr');
    const cells = Array.from(tr.querySelectorAll('.cell-input'));
    const col = cells.indexOf(input);

    if (event.key === 'Enter') {
      event.preventDefault();
      const step = event.shiftKey ? -1 : 1;
      const next = cells[col + step];
      if (next) next.focus();
      else moveToRow(tr, step, col);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveToRow(tr, event.key === 'ArrowDown' ? 1 : -1, col);
    }
  }

  function moveToRow(tr, step, col) {
    const rows = Array.from(resultBody.querySelectorAll('tr'));
    const target = rows[rows.indexOf(tr) + step];
    if (!target) return;
    const cells = target.querySelectorAll('.cell-input');
    const cell = cells[Math.min(col, cells.length - 1)];
    if (cell) cell.focus();
  }

  function buildRow(rowValues, isCurrent, isSaved) {
    const tr = document.createElement('tr');
    if (isCurrent) tr.classList.add('is-current');

    for (let i = 0; i < MAX_CLICKS; i++) {
      const td = document.createElement('td');
      const value = rowValues[i];
      if (isFilled(value)) td.dataset.value = String(value);

      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'numeric';
      input.maxLength = MAX_DIGITS;
      input.className = 'cell-input';
      input.value = isFilled(value) ? String(value) : '';
      input.setAttribute('aria-label', `Value ${i + 1}`);

      input.addEventListener('focus', () => selectRow(tr));
      input.addEventListener('keydown', onCellKey);
      input.addEventListener('input', () => {
        const clean = sanitise(input.value);
        if (clean !== input.value) input.value = clean;
        writeValue(rowValues, i, clean, isSaved);
        if (clean === '') delete td.dataset.value;
        else td.dataset.value = clean;
        updateSummary(tr, rowValues);
        if (!isSaved) updateButtonState();
      });

      td.appendChild(input);
      tr.appendChild(td);
    }

    // Column 12: sum of the recorded values
    const total = document.createElement('td');
    total.className = 'cell-total';
    tr.appendChild(total);

    // Column 13: E = 10 - (Total * 0.1), computed on integers
    const extra = document.createElement('td');
    extra.className = 'cell-extra';
    tr.appendChild(extra);

    updateSummary(tr, rowValues);
    return tr;
  }

  function buildEmptyRow() {
    const tr = document.createElement('tr');
    tr.className = 'result-empty';
    const td = document.createElement('td');
    td.colSpan = COLUMNS;
    td.textContent = 'No routine saved yet — use Add Routine to enter one';
    tr.appendChild(td);
    return tr;
  }

  /** Earlier routines on top, the running one (if any) below. */
  function renderTable(includeCurrent) {
    showsCurrent = includeCurrent;
    selectedRow = null;
    const rows = saved.map((row) => buildRow(row, false, true));
    if (includeCurrent) rows.push(buildRow(values, true, false));
    if (rows.length === 0) rows.push(buildEmptyRow());
    resultBody.replaceChildren(...rows);
    deleteBtn.disabled = saved.length === 0;
  }

  // --- Views and actions --------------------------------------------

  const startMeta = document.getElementById('start-meta');

  function showView(view) {
    [viewLock, viewStart, viewInput, viewResult, viewGuide]
      .forEach((v) => { v.hidden = v !== view; });
    if (view === viewStart) updateStartMeta();
  }

  function updateStartMeta() {
    const count = saved.length;
    startMeta.textContent = count === 0
      ? 'Library empty'
      : `${count} ${count === 1 ? 'routine' : 'routines'} in the library`;
  }

  // --- Guide ---------------------------------------------------------

  const GUIDES = { en: 'USAGE.md', de: 'ANLEITUNG.md' };
  const guideFrame = document.querySelector('.guide-frame');
  const guideBody = document.getElementById('guide-body');
  const langBtns = Array.from(document.querySelectorAll('.btn-lang'));
  const guideCache = {};

  async function showGuide(lang) {
    langBtns.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.lang === lang);
    });

    if (!guideCache[lang]) {
      guideBody.innerHTML = '<p class="guide-note">Loading…</p>';
      try {
        const response = await fetch(GUIDES[lang], { cache: 'no-cache' });
        if (!response.ok) throw new Error(String(response.status));
        guideCache[lang] = window.renderMarkdown(await response.text());
      } catch {
        // Happens when the page is opened straight from disk (file://)
        guideCache[lang] =
          `<p class="guide-note">The guide could not be loaded. ` +
          `Open <code>${GUIDES[lang]}</code> in the project folder instead.</p>`;
      }
    }

    guideBody.innerHTML = guideCache[lang];
    guideFrame.scrollTop = 0;
  }

  function openGuide() {
    showView(viewGuide);
    const active = langBtns.find((btn) => btn.classList.contains('is-active'));
    showGuide(active ? active.dataset.lang : 'en');
  }

  const passwordField = document.getElementById('password');
  const lockError = document.getElementById('lock-error');

  /** The start screen is only reachable through the password prompt. */
  function lock() {
    passwordField.value = '';
    lockError.classList.remove('is-visible');
    showView(viewLock);
    passwordField.focus();
  }

  function unlock(event) {
    event.preventDefault();
    if (passwordField.value !== APP_PASSWORD) {
      lockError.classList.add('is-visible');
      passwordField.select();
      return;
    }
    passwordField.value = '';
    lockError.classList.remove('is-visible');
    showView(viewStart);
  }

  /** Lock button: leaves the library untouched, just asks for the password. */
  function lockApp() {
    if (!window.confirm(
      'Lock the app? The password is needed to get back in.'
    )) return;
    lock();
  }

  function start() {
    showView(viewInput);
  }

  function showResult() {
    renderTable(true);
    showView(viewResult);
  }

  /** Library straight from the start screen: all saved routines. */
  function openLibrary() {
    renderTable(false);
    showView(viewResult);
  }

  /** Add Routine: append an empty routine as the last row and focus it. */
  function addRoutine() {
    // A running routine is drawn below the saved ones and would otherwise end
    // up underneath the new row, so it joins the library first.
    if (showsCurrent && hasValues(values)) saved.push(values.slice());
    clearCurrent();

    saved.push([]);
    persistSaved();
    renderTable(false);

    const rows = resultBody.querySelectorAll('tr');
    const newRow = rows[rows.length - 1];
    if (newRow) newRow.querySelector('.cell-input').focus();
  }

  function clearCurrent() {
    values = [];
    updateButtonState();
  }

  /** Next Routine: keep the running routine, go straight back to input. */
  function nextRoutine() {
    if (hasValues(values)) {
      saved.push(values.slice());
      persistSaved();
    }
    clearCurrent();
    showView(viewInput);
  }

  /** Delete last Routine: drop the most recently saved routine. */
  function deleteLast() {
    if (saved.length === 0) return;
    saved.pop();
    persistSaved();
    renderTable(showsCurrent);
  }

  /** Reset: clear the whole library and return to the start screen. */
  function reset() {
    if (!window.confirm(
      'Reset? This deletes all routines and returns to the start screen.'
    )) return;

    saved = [];
    persistSaved();
    clearCurrent();
    showView(viewStart);
  }

  numberBtns.forEach((btn) => {
    btn.addEventListener('click', () => record(Number(btn.dataset.value), btn));
    btn.addEventListener('animationend', () => btn.classList.remove('just-tapped'));
  });

  // iOS Safari does not apply :active to buttons, so every button gets its
  // pressed state from pointer events instead. Same look, but it actually
  // shows up on the iPad.
  const pressOff = (event) => event.currentTarget.classList.remove('is-pressed');
  document.querySelectorAll('button').forEach((button) => {
    button.addEventListener('pointerdown', () => {
      if (!button.disabled) button.classList.add('is-pressed');
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => {
      button.addEventListener(type, pressOff);
    });
  });

  langBtns.forEach((btn) => {
    btn.addEventListener('click', () => showGuide(btn.dataset.lang));
  });

  // The guides link to each other — keep that inside the app
  guideBody.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link) return;
    const lang = Object.keys(GUIDES).find((key) => GUIDES[key] === link.getAttribute('href'));
    if (!lang) return;
    event.preventDefault();
    showGuide(lang);
  });

  document.getElementById('lock-form').addEventListener('submit', unlock);
  document.getElementById('start').addEventListener('click', start);
  document.getElementById('open-guide').addEventListener('click', openGuide);
  document.getElementById('guide-back').addEventListener('click', () => showView(viewStart));
  document.getElementById('open-library').addEventListener('click', openLibrary);
  finishBtn.addEventListener('click', showResult);
  document.getElementById('add-routine').addEventListener('click', addRoutine);
  document.getElementById('next').addEventListener('click', nextRoutine);
  deleteBtn.addEventListener('click', deleteLast);
  document.getElementById('reset').addEventListener('click', reset);
  document.getElementById('lock').addEventListener('click', lockApp);

  // Track, heading and Finish Routine label all start from an empty routine
  buildTrack();
  updateButtonState();

});
