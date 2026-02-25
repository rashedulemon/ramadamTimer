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
const elInstallBtn = document.getElementById('installBtn');

/* ── PWA INSTALLATION LOGIC ────────────────────────────── */
let deferredPrompt;

// Only show logs in dev
const logPWA = (msg, data) => console.log(`[PWA] ${msg}`, data || '');

window.addEventListener('beforeinstallprompt', (e) => {
  logPWA('beforeinstallprompt fired');
  e.preventDefault();
  deferredPrompt = e;
  if (elInstallBtn) {
    elInstallBtn.style.display = 'flex';
    elInstallBtn.classList.add('pulse'); // Let's add a subtle pulse
  }
});

if (elInstallBtn) {
  elInstallBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      logPWA('Click: No deferredPrompt available');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    logPWA(`User response: ${outcome}`);
    deferredPrompt = null;
    elInstallBtn.style.display = 'none';
  });
}

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  if (elInstallBtn) elInstallBtn.style.display = 'none';
  logPWA('App was successfully installed');
});

// Detect iOS specifically for PWA help
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
if (isIOS) {
  logPWA('iOS detected - automatic prompt not supported');
  // Optional: You could show the button with instructions for iOS
}

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
 * Convert a schedule date + "HH:MM" (24h) string to UTC epoch ms.
 * All times in schedule_data.js are now stored in 24h format.
 */
function bstTimeToEpoch(dateStr, timeStr) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return Date.UTC(y, mo - 1, d, hh, mm, 0) - (6 * 60 * 60 * 1000);
}

/** Zero-pad to 2 digits */
const pad2 = (n) => String(Math.floor(n)).padStart(2, '0');

/**
 * Format a 24h time string "HH:MM" for display as 12h AM/PM.
 * e.g. "05:17" → "5:17 AM",  "18:05" → "6:05 PM"
 */
function formatTime12(t) {
  let [hh, mm] = t.split(':').map(Number);
  const suffix = hh >= 12 ? 'PM' : 'AM';
  if (hh > 12) hh -= 12;
  if (hh === 0) hh = 12;
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
      elSehriTime.textContent = formatTime12(first.sehri_end);
      elIftarTime.textContent = formatTime12(first.iftar);
      elCountdownLabel.textContent = 'Time Until First Sehri';
      elCountdownDisplay.hidden = false;
      elRamadanOver.hidden = true;
      setCountdown(bstTimeToEpoch(first.date, first.sehri_end) - epochNow);
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
  elSehriTime.textContent = formatTime12(today.sehri_end);
  elIftarTime.textContent = formatTime12(today.iftar);

  if (tomorrow) {
    elTomorrowSehri.textContent = formatTime12(tomorrow.sehri_end);
    elTomorrowIftar.textContent = formatTime12(tomorrow.iftar);
    elTomorrowCard.style.display = '';
  } else {
    elTomorrowCard.style.display = 'none';
  }

  /* ── COUNTDOWN LOGIC ── */
  const iftarEpoch = bstTimeToEpoch(today.date, today.iftar);
  const msToIftar = iftarEpoch - epochNow;

  /* ── AUTO DARK MODE CHECK ─────────────────────────────── */
  const userPref = localStorage.getItem('darkMode');
  if (userPref === null) {
    const hr = new Date().getHours();
    const isEvening = msToIftar <= 0 || hr >= 18 || hr < 5;
    if (isEvening && !document.body.classList.contains('dark')) {
      document.body.classList.add('dark');
      elDarkIcon.textContent = '☀️';
    } else if (!isEvening && document.body.classList.contains('dark')) {
      document.body.classList.remove('dark');
      elDarkIcon.textContent = '🌙';
    }
  }

  if (msToIftar > 0) {
    elCountdownLabel.textContent = '🌅 Time Until Iftar';
    elCountdownDisplay.hidden = false;
    elRamadanOver.hidden = true;
    setCountdown(msToIftar);
  } else {
    if (tomorrow) {
      const msToSehri = bstTimeToEpoch(tomorrow.date, tomorrow.sehri_end) - epochNow;
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

  elScheduleTbody.innerHTML = '';
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
    tdSehri.textContent = formatTime12(entry.sehri_end);

    const tdIftar = document.createElement('td');
    tdIftar.textContent = formatTime12(entry.iftar);
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
  const userPref = localStorage.getItem('darkMode');

  if (userPref === 'true') {
    document.body.classList.add('dark');
    elDarkIcon.textContent = '☀️';
  } else if (userPref === 'false') {
    document.body.classList.remove('dark');
    elDarkIcon.textContent = '🌙';
  } else {
    // Initial guess before updatePage runs (approx 6 PM to 5 AM)
    const hr = new Date().getHours();
    if (hr >= 18 || hr < 5) {
      document.body.classList.add('dark');
      elDarkIcon.textContent = '☀️';
    }
  }
}

elDarkToggle.addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark');
  elDarkIcon.textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('darkMode', isDark);
});

/* ── CUSTOM GLASS DROPDOWN ────────────────────────────── */

/**
 * Creates or refreshes a glassmorphic dropdown UI for a native select.
 */
function setupCustomDropdown(selectEl) {
  // If already setup, clear the custom elements next to it
  const parent = selectEl.parentElement;
  let wrapper = parent.querySelector('.custom-dropdown-outer');

  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'custom-dropdown-outer';
    wrapper.style.width = '100%';
    selectEl.classList.add('native-hidden');
    parent.appendChild(wrapper);
  } else {
    wrapper.innerHTML = '';
  }

  const trigger = document.createElement('div');
  trigger.className = 'glass-select';
  trigger.textContent = selectEl.options[selectEl.selectedIndex]?.textContent || 'Select...';

  const optionsMenu = document.createElement('div');
  optionsMenu.className = 'glass-options';

  // Rebuild options
  Array.from(selectEl.options).forEach(opt => {
    const customOpt = document.createElement('div');
    customOpt.className = 'glass-option';
    if (opt.value === selectEl.value) customOpt.classList.add('selected');
    customOpt.textContent = opt.textContent;
    customOpt.dataset.value = opt.value;

    customOpt.addEventListener('click', (e) => {
      e.stopPropagation();
      selectEl.value = customOpt.dataset.value;
      trigger.textContent = customOpt.textContent;

      // Update 'selected' class
      wrapper.querySelectorAll('.glass-option').forEach(o => o.classList.remove('selected'));
      customOpt.classList.add('selected');

      // Close menu
      optionsMenu.classList.remove('show');
      trigger.classList.remove('active');

      // Trigger native change
      selectEl.dispatchEvent(new Event('change'));
    });

    optionsMenu.appendChild(customOpt);
  });

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isShowing = optionsMenu.classList.contains('show');

    // Close other open glass menus
    document.querySelectorAll('.glass-options.show').forEach(m => {
      if (m !== optionsMenu) {
        m.classList.remove('show');
        const otherTrigger = m.parentElement.querySelector('.glass-select');
        otherTrigger?.classList.remove('active');
        // Remove elevation from other cards
        otherTrigger?.closest('.card')?.classList.remove('card-elevated');
      }
    });

    const willShow = !optionsMenu.classList.contains('show');
    optionsMenu.classList.toggle('show', willShow);
    trigger.classList.toggle('active', willShow);

    // Elevate the parent card's z-index
    const parentCard = trigger.closest('.card');
    if (parentCard) {
      parentCard.classList.toggle('card-elevated', willShow);
    }
  });

  wrapper.appendChild(trigger);
  wrapper.appendChild(optionsMenu);
}

// Close dropdowns on outside click
document.addEventListener('click', () => {
  document.querySelectorAll('.glass-options.show').forEach(m => {
    m.classList.remove('show');
    const trigger = m.parentElement.querySelector('.glass-select');
    trigger?.classList.remove('active');
    trigger?.closest('.card')?.classList.remove('card-elevated');
  });
});

/* ── BOOT ────────────────────────────────────────────────── */
initDarkMode();
initLocation();

// Initialize custom dropdowns for the first time
setupCustomDropdown(elDivisionSelect);
setupCustomDropdown(elZillaSelect);

// We need to refresh them when data changes dynamically
const originalPopulateZillas = populateZillas;
populateZillas = function (div) {
  originalPopulateZillas(div);
  setupCustomDropdown(elZillaSelect);
};

const originalOnDivisionChange = onDivisionChange;
onDivisionChange = function () {
  originalOnDivisionChange();
  setupCustomDropdown(elDivisionSelect);
  setupCustomDropdown(elZillaSelect);
};

setInterval(updatePage, 1000); // Refresh countdown every second
