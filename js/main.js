// Kari — Eingabe der Werte 0-5 (max. 12) und Auswertung als Tabelle

document.addEventListener('DOMContentLoaded', () => {

  const MAX_CLICKS = 12;

  const viewStart  = document.getElementById('view-start');
  const viewInput  = document.getElementById('view-input');
  const viewResult = document.getElementById('view-result');
  const numberBtns = Array.from(document.querySelectorAll('.btn'));
  const resultRow  = document.getElementById('result-row');
  const cells      = Array.from(resultRow.children);

  /** Bisher angeklickte Werte, in Klick-Reihenfolge. */
  let values = [];

  /** Buttons sperren + ausgrauen, sobald 12 Werte erfasst sind. */
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

  function showResult() {
    cells.forEach((cell, i) => {
      cell.textContent = i < values.length ? String(values[i]) : '';
    });
    viewInput.hidden = true;
    viewResult.hidden = false;
  }

  function reset() {
    values = [];
    cells.forEach((cell) => { cell.textContent = ''; });
    updateButtonState();
    viewResult.hidden = true;
    viewStart.hidden = false;
  }

  function start() {
    viewStart.hidden = true;
    viewInput.hidden = false;
  }

  numberBtns.forEach((btn) => {
    btn.addEventListener('click', () => record(Number(btn.dataset.value)));
  });

  document.getElementById('start').addEventListener('click', start);
  document.getElementById('finish').addEventListener('click', showResult);
  document.getElementById('reset').addEventListener('click', reset);

});
