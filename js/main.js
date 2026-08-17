// Kari — records values 0-5 (plus 10) per routine and shows them as a table

document.addEventListener('DOMContentLoaded', () => {

  const MAX_CLICKS = 11;           // value columns: S1-S10, L
  const COLUMNS = MAX_CLICKS + 2;  // plus "Total" and "E:"
  const STORAGE_KEY = 'kari.exercises';
  const MAX_DIGITS = 3;            // guard against runaway input in a narrow cell

  const viewStart  = document.getElementById('view-start');
  const viewInput  = document.getElementById('view-input');
  const viewResult = document.getElementById('view-result');
  const numberBtns = Array.from(document.querySelectorAll('.btn'));
  const resultBody = document.getElementById('result-body');
  const deleteBtn  = document.getElementById('delete-last');

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

  /** Lock and dim the buttons once all values have been recorded. */
  function updateButtonState() {
    const full = values.length >= MAX_CLICKS;
    numberBtns.forEach((btn) => {
      btn.disabled = full;
      btn.classList.toggle('is-dimmed', full);
    });
  }

  function record(value) {
    if (values.length >= MAX_CLICKS) return;
    values.push(value);
    updateButtonState();
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

  function showView(view) {
    [viewStart, viewInput, viewResult].forEach((v) => { v.hidden = v !== view; });
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
    const hasData = saved.length > 0 || hasValues(values);
    if (hasData && !window.confirm(
      'Delete all routines? This cannot be undone.'
    )) return;

    saved = [];
    persistSaved();
    clearCurrent();
    showView(viewStart);
  }

  numberBtns.forEach((btn) => {
    btn.addEventListener('click', () => record(Number(btn.dataset.value)));
  });

  document.getElementById('start').addEventListener('click', start);
  document.getElementById('open-library').addEventListener('click', openLibrary);
  document.getElementById('finish').addEventListener('click', showResult);
  document.getElementById('add-routine').addEventListener('click', addRoutine);
  document.getElementById('next').addEventListener('click', nextRoutine);
  deleteBtn.addEventListener('click', deleteLast);
  document.getElementById('reset').addEventListener('click', reset);

});
