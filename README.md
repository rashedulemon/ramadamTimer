# 🌙 Bangladesh Ramadan 2026 — Sehri & Iftar Countdown

A clean, fast, and fully offline Ramadan countdown website for **all 64 zilas across 8 divisions of Bangladesh**. No server needed — just open `index.html` in a browser and it works.

---

## What it does

- Shows today's **Sehri end time** and **Iftar time** for your selected location
- Live countdown timer that ticks down to the next Sehri or Iftar
- Tomorrow's schedule at a glance
- Full 30-day Ramadan schedule table (collapsible)
- Remembers your Division & Zilla selection across visits
- Dark mode toggle
- Responsive — works great on mobile and desktop (two-column layout on PC)

---

## How to use

1. Clone or download this repo
2. Open `index.html` in any browser — no build step, no server
3. Pick your **Division** and **Zilla** from the dropdowns
4. That's it — the countdown and schedule update instantly

---

## Schedule Data

All schedule data comes from the **Islamic Foundation Bangladesh** for Ramadan 1447H / 2026.

The data lives in [`schedule_data.js`](./schedule_data.js) as a plain JavaScript object — **feel free to use it in your own project**. The structure is straightforward:

```js
SCHEDULE_DB["Rajshahi"]["Rajshahi"] // → array of 30 day objects
// Each entry looks like:
{
  ramadan_day: 1,
  date: "2026-02-19",
  sehri_end: "5:17",   // 12-hour, always AM
  iftar: "6:05"        // 12-hour, always PM
}
```

All 8 divisions and 64 zilas are included:

| Division | Zilas |
|---|---|
| Barisal | Barisal, Barguna, Bhola, Jhalokati, Patuakhali, Pirojpur |
| Chittagong | Lakshmipur, Rangamati, Brahmanbaria, Bandarban, Feni, Noakhali, Chandpur, Cox's Bazar + more |
| Dhaka | Dhaka, Faridpur, Gazipur, Gopalganj, Kishoreganj, Narsingdi, Tangail + more |
| Khulna | Khulna, Bagerhat, Chuadanga, Jessore, Jhenaidah, Kushtia + more |
| Mymensingh | Mymensingh, Jamalpur, Netrokona, Sherpur |
| Rajshahi | Rajshahi, Bogra, Chapainawabganj, Joypurhat, Naogaon, Natore, Pabna, Sirajganj |
| Rangpur | Rangpur, Dinajpur, Gaibandha, Kurigram, Lalmonirhat, Nilphamari, Panchagarh, Thakurgaon |
| Sylhet | Sylhet, Habiganj, Moulvibazar, Sunamganj |

If you want to pull this data into your own app, widget, or script — go ahead. No attribution required, but it would be nice 🙂

---

## Tech

Pure HTML, CSS, and vanilla JavaScript. No frameworks, no dependencies, no build tools.

---

*Ramadan Mubarak! 🌙*

---

## 🤲 Developer Note

Built during Ramadan 2026 with a lot of ☕ (before Sehri, of course) and a genuine wish that this makes at least one person's fast a little easier.

No fancy framework, no cloud dependency — just a quiet little webpage that knows when it's time to eat.

> *"Whoever fasts Ramadan out of faith and in the hope of reward, his previous sins will be forgiven."*
> — Sahih al-Bukhari

Made with 💚 — feel free to fork, improve, and share.