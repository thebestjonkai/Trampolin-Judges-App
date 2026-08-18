# Kari

A small touch app for recording routines. During a routine you tap a value per
element; afterwards the routine lands in a library where it can be reviewed,
corrected or typed in by hand. Built for an iPad in landscape, but it works in
any modern browser.

**Using the app?** There is a step-by-step guide for that:
[English](USAGE.md) · [Deutsch](ANLEITUNG.md). The rest of this file describes
how the thing is put together.

No build step, no dependencies, no server logic — three static files.

```
index.html      the four screens as plain markup
css/styles.css  layout, dark theme, the whole visual design
js/main.js      all behaviour, roughly 280 lines
```

## Running it

Open `index.html` through any static web server, for example the VS Code
extension **Live Server** or:

```bash
npx live-server --port=5500
```

Opening the file directly via `file://` works too, but a server is friendlier
during development because the page reloads on save.

## The four screens

### 1. Lock

The app starts locked. The password is the same for everyone and lives in one
place only — `js/main.js`, near the top:

```js
const APP_PASSWORD = 'MaLnsJGwhL';
```

Change the string, save, reload. Any length works. Be aware this is a
convenience lock, not security: the password ships in the JavaScript and anyone
who opens the page source can read it. It keeps the wrong hands off the reset
button, nothing more.

### 2. Start

Two ways on: **Start Routine** begins recording, **Library** opens the table of
everything saved so far.

### 3. Input

Six large buttons, `0`–`5`, coloured by severity — 0/1 green, 2/3 yellow,
4/5 red. A seventh button, `10` in dark red, sits in the footer next to
**Finish Routine**, exactly as wide as the `3` above it.

Every tap appends one value, in tap order. A routine holds **11 values**: the
ten elements `S1`–`S10` plus `L`. Once eleven are recorded the buttons grey out
and stop responding. **Finish Routine** shows the result in the library.

A heading above the grid names the value the next tap records — driven by
`SKILL_NAMES` in `js/main.js`, which lists the eleven column names in order and
falls back to *Routine complete* when the routine is full. The same function
relabels **Finish Routine** with the number of skills recorded so far.

### 4. Library

One row per routine, thirteen columns:

| Columns | Meaning |
| --- | --- |
| `S1`–`S10` | the ten recorded elements |
| `L` | the eleventh value, set apart in the header |
| `Total` | sum of all values in the row |
| `E:` | `10 − (Total × 0.1)`, to one decimal |

`E` is computed as `(100 − Total) / 10` — mathematically the same, but on whole
numbers, so no floating-point artefacts like `6.300000000000001` appear.

Values are coloured like the buttons: 0/1 green, 2/3 yellow, 4/5 red, 10 dark
red on a filled background. **Any other number stays white** — useful when a
value is typed in by hand that the buttons never produce.

Rows are ordered oldest first. A routine that has been finished but not yet
saved is drawn at the bottom, highlighted with a bar on the left. The header row
and the *Library* heading stay in place while the table scrolls.

## Editing

Every value cell is a real input field. Tap or click into it and type — on a
tablet the on-screen keyboard appears, with a hardware keyboard you just type.
The row being edited is highlighted.

* Any whole number is accepted, up to three digits. Leading zeros are dropped.
* `Total` and `E` recalculate on every keystroke, and the cell recolours
  immediately.
* **Enter** moves to the next cell, **Shift+Enter** back, **↑ / ↓** jump to the
  same column in the routine above or below. **Tab** works as usual.
* Changes are written to storage right away — there is no separate save step.

## The library buttons

| Button | What it does |
| --- | --- |
| **Lock** | Back to the lock screen. Deletes nothing. Asks first. |
| **Reset** | Clears the whole library and returns to the start screen. Asks first. |
| **Add Routine** | Appends an empty routine as the last row and puts the cursor in its first cell. |
| **Next Routine** | Keeps the current routine and goes straight back to the input screen. |
| **Delete last Routine** | Removes the most recently saved routine. Greyed out while the library is empty. |

Two behaviours worth knowing:

* **Add Routine** also commits a still-running routine to the library. Without
  that, the running routine — which is drawn below the saved ones — would end up
  underneath the new empty row.
* **Delete last Routine** removes the last *saved* routine. If you came in
  through *Finish Routine*, the bottom row is the unsaved one, so the row above
  it is the one that goes.

## Storage

Saved routines live in the browser's `localStorage` under the key
`kari.exercises`, as an array of arrays. They survive a reload and an app
restart. They are tied to that one browser on that one device — there is no sync
and no backup. **Reset** is the only thing that clears them.

A routine may contain gaps: leaving `S2` empty and filling `S3` stores `null` in
between. Gaps count as 0 in `Total`.

## Adjusting things

Most of what you would want to change sits in one place each:

| What | Where |
| --- | --- |
| Password | `APP_PASSWORD` in `js/main.js` |
| Values per routine | `MAX_CLICKS` in `js/main.js` (the header in `index.html` has to match) |
| Digits allowed per cell | `MAX_DIGITS` in `js/main.js` |
| Formula behind `E:` | `buildRow()` in `js/main.js` |
| Colours, sizes, spacing | the custom properties in `:root` at the top of `css/styles.css` |
| Column names | the `<thead>` in `index.html` |

The value colours are declared at the **end** of the stylesheet on purpose. The
row states above them (running routine, selected row) match just as
specifically, so the colours have to come last to win.
