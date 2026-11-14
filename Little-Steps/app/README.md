# Little Steps — web app (Version 1)

*Every little step is a big milestone.*

An offline-first, phone-friendly baby tracker built from `../little-steps-brief-additions.md`, Part 3 (Version 1 scope). It has no build step and no server: plain HTML, CSS and JavaScript.

## Run it

```sh
cd D:\Docs\Little-Steps\app
npx serve .            # or any static server, e.g. python -m http.server
```

Open the URL on your phone (same Wi-Fi) or desktop. To install it, use "Add to Home Screen" (it works offline after the first visit). Double-clicking `index.html` also works, but without offline caching.

## What's in V1

| Brief item | Where |
|---|---|
| Baby profiles with corrected age | Onboarding, ⚙️ → Babies. Corrected age applies when a baby is born 3+ weeks before the due date, and is used until age 2 |
| Milestone tracker with gentle wording | **Milestones**. CDC "Learn the Signs. Act Early." (2022), from 2 months to 5 years. The answers are *Yes! / Still working on it / Not sure yet*, with no red and no comparisons |
| Growth tracker (WHO charts) | **Growth**. WHO 2006 LMS tables for weight, length/height and head, 0–60 months. Shows "around the Nth percentile" and never "normal/abnormal" |
| Memories and Firsts Collection | **Memories**. 13 firsts (including binyag and first birthday) plus your own, with photos |
| Feeding / sleep / diaper logging | **Today**. A "last fed" timer, a left/right breastfeeding timer with a next-side hint, bottle, pump, a sleep timer, one-tap diapers, and past entries |
| Vaccine tracker (Philippine schedule) | **Vaccines**. DOH EPI (tagged) plus the PPS schedule, with due dates from the birth date, a photo of the baby book card, and custom vaccines |
| Shared caregiving | ⚙️ → Family. Roles are Parent, Co-parent, Caregiver (can log) and Family (view only). Every entry shows who logged it |
| Night / one-handed mode | 🌙 in the header. Warm dark theme, large buttons, bottom navigation |
| Offline-first, backup | Service worker. ⚙️ → Back up / share family file, and Import |

## How data works

- Everything stays on the device. Records are kept in `localStorage` and photos in IndexedDB (resized to 1600px JPEG). Nothing is uploaded.
- **Sharing between phones (interim):** "Share family file" exports a JSON file that includes the photos. On another phone, **Import** merges it by record ID: the newest edit wins and deletions carry over. Use the share sheet to send it through Messenger or Viber.
- True real-time sync across phones needs a backend with accounts, invites and server storage. That is the next step after V1.

## Files

```
index.html            app shell
css/styles.css        design tokens (light + night), layout
js/app.js             state, views, actions, backup/merge
js/content.js         milestones (CDC), vaccine schedule (DOH/PPS), firsts
js/who-data.js        WHO LMS growth tables (0–60 months)
sw.js                 offline cache
manifest.webmanifest  install metadata
```

## To review before launch

- Have a pediatrician check `js/content.js`, especially the vaccine timings (DOH updates the EPI schedule from time to time).
- Wording follows the brief's "gentle language" rule. Tagalog, peso pricing and GCash are post-V1.
