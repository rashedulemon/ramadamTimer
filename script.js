/**
 * ============================================================
 *  BANGLADESH RAMADAN 2026 – IFTAR COUNTDOWN
 *  script.js
 * ============================================================
 *
 *  COUNTDOWN LOGIC OVERVIEW
 *  ─────────────────────────────────────────────────────────
 *  1. SCHEDULE_DB (from schedule_data.js) holds all 8 divisions × zilas.
 *  2. User picks Division → Zilla via dropdowns (saved in localStorage).
 *  3. On change, SCHEDULE = SCHEDULE_DB[division][zilla] (30 entries).
 *  4. Get current Bangladesh Standard Time (UTC+6).
 *  5. Match today's YYYY-MM-DD to SCHEDULE array.
 *  6. "msToIftar = iftarEpoch − nowEpoch"
 *     • > 0  → countdown TO Iftar.
 *     • ≤ 0  → Iftar has passed → countdown to next Sehri.
 *  7. setInterval(updatePage, 1000) refreshes every second.
 * ============================================================
 */

/* ── DOM REFERENCES ─────────────────────────────────────── */
const elRamadanDay = document.getElementById('ramadanDay');
const elTodayDate = document.getElementById('todayDate');
const elSehriTime = document.getElementById('sehriTime');
const elIftarTime = document.getElementById('iftarTime');
const elCountdownLabel = document.getElementById('countdownLabel');
const elCdHH = document.getElementById('cdHH');
const elCdMM = document.getElementById('cdMM');
const elCdSS = document.getElementById('cdSS');
const elCountdownDisplay = document.getElementById('countdownDisplay');
const elRamadanOver = document.getElementById('ramadanOver');
const elTomorrowSehri = document.getElementById('tomorrowSehri');
const elTomorrowIftar = document.getElementById('tomorrowIftar');
const elTomorrowCard = document.getElementById('tomorrowCard');
const elDarkToggle = document.getElementById('darkToggle');
const elDarkIcon = document.getElementById('darkIcon');
const elDivisionSelect = document.getElementById('divisionSelect');
const elZillaSelect = document.getElementById('zillaSelect');
const elFooterLocation = document.getElementById('footerLocation');
const elScheduleTbody = document.getElementById('scheduleTbody');

/* ── ACTIVE SCHEDULE (updated when location changes) ────── */
let SCHEDULE = []; // current 30-row array

/* ── UTILITIES ──────────────────────────────────────────── */

/**
 * Get current date-time in Bangladesh Standard Time (UTC+6).
 * We do this with pure epoch arithmetic to be timezone-agnostic.
 */
function getBSTNow() {
  const bstMs = Date.now() + (6 * 60 * 60 * 1000);
  const bst = new Date(bstMs);
  const year = bst.getUTCFullYear();
  const month = bst.getUTCMonth() + 1;
  const day = bst.getUTCDate();
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { dateStr, epochNow: Date.now() };
}

/**
 * Convert a schedule date + time string ("H:MM") to UTC epoch ms.
 * PDF times are 12-hour format – Iftar is always PM, Sehri is always AM.
 * @param {boolean} forcePM - add 12h to treat time as PM (for Iftar)
 */
function bstTimeToEpoch(dateStr, timeStr, forcePM = false) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  let [hh, mm] = timeStr.split(':').map(Number);
  if (forcePM) hh += 12;  // e.g. "6:05" → 18:05 for PM iftar
  return Date.UTC(y, mo - 1, d, hh, mm, 0) - (6 * 60 * 60 * 1000);
}

/** Zero-pad to 2 digits */
const pad2 = (n) => String(Math.floor(n)).padStart(2, '0');

/**
 * Format a time string "H:MM" for display.
 * PDF times are in 12-hour format without AM/PM indicator.
 * @param {string} t      - Time string like "5:57" or "6:02"
 * @param {boolean} forcePM - true for Iftar (always PM), false for Sehri (always AM)
 */
function formatTime12(t, forcePM = false) {
  const [hh, mm] = t.split(':').map(Number);
  const suffix = forcePM ? 'PM' : 'AM';
  return `${hh}:${pad2(mm)} ${suffix}`;
}

/** "2026-02-21" → "Saturday, 21 February 2026" */
function formatDate(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d))
    .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** "19 Feb (Sat)" short label */
function formatDateShort(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  const day = dt.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
  const date = dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `${date} (${day})`;
}

/** ms → { h, m, s } */
function msToHMS(ms) {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/* ── LOCATION SELECTORS ─────────────────────────────────── */
function populateDivisions() {
  const divisions = Object.keys(SCHEDULE_DB).sort();
  elDivisionSelect.innerHTML = '';
  divisions.forEach(div => {
    const opt = document.createElement('option');
    opt.value = div;
    opt.textContent = div;
    elDivisionSelect.appendChild(opt);
  });
}

function populateZillas(division) {
  const zilas = Object.keys(SCHEDULE_DB[division] || {}).sort();
  elZillaSelect.innerHTML = '';
  zilas.forEach(zl => {
    const opt = document.createElement('option');
    opt.value = zl;
    opt.textContent = zl;
    elZillaSelect.appendChild(opt);
  });
}

function applyLocation(division, zilla) {
  const data = SCHEDULE_DB[division]?.[zilla];
  if (!data) return;
  SCHEDULE = data;

  // Update footer
  if (elFooterLocation) elFooterLocation.textContent = `${zilla}, ${division}`;

  // Rebuild schedule table with new data
  if (elScheduleTbody) {
    elScheduleTbody.innerHTML = '';
    buildScheduleTable();
  }

  // Refresh countdown immediately
  updatePage();
}

function onDivisionChange() {
  const div = elDivisionSelect.value;
  populateZillas(div);
  // Try to keep same zilla name across division change, else pick first
  const zilas = Object.keys(SCHEDULE_DB[div] || {}).sort();
  const stored = localStorage.getItem('selectedZilla');
  const zilla = zilas.includes(stored) ? stored : zilas[0];
  elZillaSelect.value = zilla;
  localStorage.setItem('selectedDivision', div);
  localStorage.setItem('selectedZilla', zilla);
  applyLocation(div, zilla);
}

function onZillaChange() {
  const div = elDivisionSelect.value;
  const zilla = elZillaSelect.value;
  localStorage.setItem('selectedDivision', div);
  localStorage.setItem('selectedZilla', zilla);
  applyLocation(div, zilla);
}

function initLocation() {
  populateDivisions();
  const storedDiv = localStorage.getItem('selectedDivision') || DEFAULT_DIVISION;
  const storedZilla = localStorage.getItem('selectedZilla') || DEFAULT_ZILLA;

  // Set division
  if ([...elDivisionSelect.options].some(o => o.value === storedDiv)) {
    elDivisionSelect.value = storedDiv;
  }
  populateZillas(elDivisionSelect.value);

  // Set zilla
  if ([...elZillaSelect.options].some(o => o.value === storedZilla)) {
    elZillaSelect.value = storedZilla;
  }

  elDivisionSelect.addEventListener('change', onDivisionChange);
  elZillaSelect.addEventListener('change', onZillaChange);

  applyLocation(elDivisionSelect.value, elZillaSelect.value);
}

/* ── MAIN UPDATE FUNCTION ───────────────────────────────── */
function updatePage() {
  if (!SCHEDULE.length) return;

  const { dateStr: todayStr, epochNow } = getBSTNow();
  const todayIdx = SCHEDULE.findIndex(e => e.date === todayStr);

  /* ── BEFORE / AFTER RAMADAN ── */
  if (todayIdx === -1) {
    const first = SCHEDULE[0];
    const last = SCHEDULE[SCHEDULE.length - 1];

    if (epochNow < bstTimeToEpoch(first.date, '00:00')) {
      elRamadanDay.textContent = 'Ramadan Starts';
      elTodayDate.textContent = `1 Ramadan: ${formatDate(first.date)}`;
      elSehriTime.textContent = formatTime12(first.sehri_end, false);
      elIftarTime.textContent = formatTime12(first.iftar, true);
      elCountdownLabel.textContent = 'Time Until First Sehri';
      elCountdownDisplay.hidden = false;
      elRamadanOver.hidden = true;
      setCountdown(bstTimeToEpoch(first.date, first.sehri_end, false) - epochNow);
      elTomorrowCard.style.display = 'none';
    } else {
      elRamadanDay.textContent = 'Ramadan 1447H';
      elTodayDate.textContent = 'Ramadan has concluded';
      elSehriTime.textContent = '—';
      elIftarTime.textContent = '—';
      elCountdownDisplay.hidden = true;
      elRamadanOver.hidden = false;
      elTomorrowCard.style.display = 'none';
    }
    return;
  }

  /* ── DURING RAMADAN ── */
  const today = SCHEDULE[todayIdx];
  const tomorrow = SCHEDULE[todayIdx + 1] || null;

  elRamadanDay.textContent = `✨ Ramadan Day ${today.ramadan_day}`;
  elTodayDate.textContent = formatDate(today.date);
  elSehriTime.textContent = formatTime12(today.sehri_end, false);
  elIftarTime.textContent = formatTime12(today.iftar, true);

  if (tomorrow) {
    elTomorrowSehri.textContent = formatTime12(tomorrow.sehri_end, false);
    elTomorrowIftar.textContent = formatTime12(tomorrow.iftar, true);
    elTomorrowCard.style.display = '';
  } else {
    elTomorrowCard.style.display = 'none';
  }

  /* ── COUNTDOWN LOGIC ── */
  const iftarEpoch = bstTimeToEpoch(today.date, today.iftar, true);
  const msToIftar = iftarEpoch - epochNow;

  if (msToIftar > 0) {
    elCountdownLabel.textContent = '🌅 Time Until Iftar';
    elCountdownDisplay.hidden = false;
    elRamadanOver.hidden = true;
    setCountdown(msToIftar);
  } else {
    if (tomorrow) {
      const msToSehri = bstTimeToEpoch(tomorrow.date, tomorrow.sehri_end, false) - epochNow;
      if (msToSehri > 0) {
        elCountdownLabel.textContent = '🌙 Iftar Passed · Time Until Next Sehri';
        elCountdownDisplay.hidden = false;
        elRamadanOver.hidden = true;
        setCountdown(msToSehri);
      } else {
        elCountdownLabel.textContent = 'Fasting in progress…';
        setCountdown(0);
      }
    } else {
      elCountdownDisplay.hidden = true;
      elRamadanOver.hidden = false;
    }
  }
}

/** Push h/m/s into the digit elements */
function setCountdown(ms) {
  const { h, m, s } = msToHMS(ms);
  elCdHH.textContent = pad2(h);
  elCdMM.textContent = pad2(m);
  elCdSS.textContent = pad2(s);
}

/* ── FULL SCHEDULE TABLE ─────────────────────────────────── */
function buildScheduleTable() {
  if (!elScheduleTbody || !SCHEDULE.length) return;

  const { dateStr: todayStr } = getBSTNow();

  SCHEDULE.forEach(entry => {
    const tr = document.createElement('tr');
    if (entry.date === todayStr) tr.classList.add('row-today');
    else if (entry.date < todayStr) tr.classList.add('row-passed');

    const tdDay = document.createElement('td');
    tdDay.innerHTML = `<span class="day-pill">${entry.ramadan_day}</span>`;

    const tdDate = document.createElement('td');
    tdDate.textContent = formatDateShort(entry.date);

    const tdSehri = document.createElement('td');
    tdSehri.textContent = formatTime12(entry.sehri_end, false);

    const tdIftar = document.createElement('td');
    tdIftar.textContent = formatTime12(entry.iftar, true);
    tdIftar.classList.add('col-iftar');

    tr.append(tdDay, tdDate, tdSehri, tdIftar);
    elScheduleTbody.appendChild(tr);
  });
}

/* ── SCHEDULE TOGGLE ─────────────────────────────────────── */
const elScheduleToggle = document.getElementById('scheduleToggle');
const elScheduleWrapper = document.getElementById('scheduleWrapper');
const elToggleArrow = document.getElementById('toggleArrow');

if (elScheduleToggle) {
  elScheduleToggle.addEventListener('click', () => {
    const isHidden = elScheduleWrapper.hidden;
    elScheduleWrapper.hidden = !isHidden;
    elScheduleToggle.setAttribute('aria-expanded', String(isHidden));
    elToggleArrow.classList.toggle('open', isHidden);
    if (isHidden) {
      requestAnimationFrame(() => {
        const todayRow = elScheduleTbody?.querySelector('.row-today');
        if (todayRow) todayRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  });
}

/* ── DARK MODE ───────────────────────────────────────────── */
function initDarkMode() {
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark');
    elDarkIcon.textContent = '☀️';
  }
}

elDarkToggle.addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark');
  elDarkIcon.textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('darkMode', isDark);
});

/* ── BOOT ────────────────────────────────────────────────── */
initDarkMode();
initLocation();              // Populates selectors, sets SCHEDULE, calls buildScheduleTable + updatePage
setInterval(updatePage, 1000);  // Refresh countdown every second
