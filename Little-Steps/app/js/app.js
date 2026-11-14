/* Little Steps — every little step is a big milestone.
   Offline-first, no build step. Structured data lives in localStorage, photos in IndexedDB. */
(function () {
  "use strict";

  const C = window.LS_CONTENT;
  const WHO = window.WHO_LMS;
  const KEY = "littlesteps:v1";
  const DAY = 864e5;

  /* ---------------------------------------------------------------- utils */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const now = () => Date.now();
  const pad2 = (n) => String(n).padStart(2, "0");
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const ordinal = (n) => {
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const toDateStr = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const todayStr = () => toDateStr(new Date());
  function parseDate(s) {
    if (!s) return null;
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function startOfDay(t) {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY);
  function fmtDate(v, opts) {
    const d = typeof v === "string" ? parseDate(v) : new Date(v);
    return d.toLocaleDateString("en-PH", opts || { day: "numeric", month: "short", year: "numeric" });
  }
  const fmtTime = (ts) => new Date(ts).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
  function toLocalInput(ts) {
    const d = new Date(ts);
    return `${toDateStr(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }
  function fromLocalInput(v) {
    if (!v) return null;
    const [ds, ts] = v.split("T");
    const d = parseDate(ds);
    const [h, m] = (ts || "0:0").split(":").map(Number);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  }
  function dur(ms) {
    const m = Math.max(0, Math.round(ms / 60000));
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60), r = m % 60;
    return r ? `${h}h ${r}m` : `${h}h`;
  }
  function ago(ts) {
    const ms = now() - ts;
    if (ms < 60000) return "just now";
    const m = Math.floor(ms / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ${m % 60}m ago`;
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h ago`;
  }
  function clock(sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
  }
  const mins = (sec) => (sec > 0 && sec < 60 ? "<1m" : `${Math.round(sec / 60)}m`);

  /* ----------------------------------------------------------------- ages */
  function calDiff(from, to) {
    let m = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
    let d = to.getDate() - from.getDate();
    if (d < 0) {
      m--;
      d += new Date(to.getFullYear(), to.getMonth(), 0).getDate();
    }
    return { m, d };
  }
  function ageLabel(from, to = new Date()) {
    const days = daysBetween(from, to);
    if (days < 0) return null;
    if (days < 14) return plural(days, "day");
    if (days < 91) {
      const w = Math.floor(days / 7), d = days % 7;
      return plural(w, "week") + (d ? `, ${plural(d, "day")}` : "");
    }
    const { m, d } = calDiff(from, to);
    if (m < 24) {
      const w = Math.floor(d / 7);
      return plural(m, "month") + (w ? `, ${plural(w, "week")}` : "");
    }
    const y = Math.floor(m / 12), mm = m % 12;
    return plural(y, "year") + (mm ? `, ${plural(mm, "month")}` : "");
  }
  // Corrected age applies to babies born 3+ weeks before their due date (before 37 weeks), until age 2.
  function babyInfo(b, at = new Date()) {
    const birth = parseDate(b.birthDate);
    const due = b.dueDate ? parseDate(b.dueDate) : null;
    const chronoDays = daysBetween(birth, at);
    const earlyDays = due ? daysBetween(birth, due) : 0;
    const preterm = earlyDays >= 21;
    const useCorrected = preterm && chronoDays < 730;
    const trackDays = useCorrected ? daysBetween(due, at) : chronoDays;
    return {
      birth, due, chronoDays, preterm, useCorrected, trackDays,
      trackMonths: Math.max(0, trackDays) / 30.4375,
      gaText: preterm ? `${Math.floor((280 - earlyDays) / 7)} weeks` : null,
      ageText: ageLabel(birth, at) || "not born yet",
      correctedText: useCorrected
        ? trackDays >= 0 ? ageLabel(due, at) : `${plural(Math.ceil(-trackDays / 7), "week")} before due date`
        : null,
    };
  }

  /* ---------------------------------------------------------- WHO growth */
  function lms(ind, sex, mo) {
    const rows = WHO[`${ind}_${sex === "girl" ? "girls" : "boys"}`];
    mo = Math.min(60, Math.max(0, mo));
    const i = Math.floor(mo), t = mo - i;
    const a = rows[i], b = rows[Math.min(i + 1, 60)];
    return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
  }
  const lmsValue = (L, M, S, z) => (Math.abs(L) < 1e-9 ? M * Math.exp(S * z) : M * Math.pow(1 + L * S * z, 1 / L));
  const lmsZ = (x, L, M, S) => (Math.abs(L) < 1e-9 ? Math.log(x / M) / S : (Math.pow(x / M, L) - 1) / (L * S));
  function normCdf(z) {
    const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z / 2);
    return 0.5 * (1 + (z >= 0 ? y : -y));
  }
  const IND = {
    wfa: { label: "Weight", unit: "kg", field: "weight", dp: 2 },
    lhfa: { label: "Length", unit: "cm", field: "length", dp: 1 },
    hcfa: { label: "Head", unit: "cm", field: "head", dp: 1 },
  };
  function measAgeMonths(b, dateStr) {
    const d = parseDate(dateStr), birth = parseDate(b.birthDate);
    const chrono = daysBetween(birth, d);
    const due = b.dueDate ? parseDate(b.dueDate) : null;
    const preterm = due && daysBetween(birth, due) >= 21;
    return (preterm && chrono < 730 ? daysBetween(due, d) : chrono) / 30.4375;
  }
  function percentileOf(ind, sex, mo, x) {
    if (!sex || !x || mo < 0 || mo > 60) return null;
    const [L, M, S] = lms(ind, sex, mo);
    return normCdf(lmsZ(x, L, M, S)) * 100;
  }
  function pctText(p) {
    if (p == null) return "";
    if (p < 1) return "below the 1st percentile line";
    if (p > 99) return "above the 99th percentile line";
    return `around the ${ordinal(Math.round(p))} percentile`;
  }

  /* ---------------------------------------------------------------- state */
  const ARRAYS = ["caregivers", "babies", "growth", "logs", "memories", "customVaccines", "cardPhotos"];
  const MAPS = ["milestones", "vaccines"];
  function blank() {
    return {
      version: 1,
      settings: { theme: "auto", activeBabyId: null, activeCaregiverId: null, tab: "today", lastExport: null },
      caregivers: [], babies: [], growth: [], logs: [], memories: [], customVaccines: [], cardPhotos: [],
      milestones: {}, vaccines: {}, timers: {}, deleted: {},
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw), b = blank();
        return { ...b, ...p, settings: { ...b.settings, ...(p.settings || {}) } };
      }
    } catch (e) {
      console.warn("Little Steps: could not read saved data", e);
    }
    return blank();
  }
  let S = load();
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
    } catch (e) {
      toast("Couldn't save — this phone's storage may be full. Try a backup.");
    }
  }

  const baby = () => S.babies.find((b) => b.id === S.settings.activeBabyId) || S.babies[0] || null;
  const me = () => S.caregivers.find((c) => c.id === S.settings.activeCaregiverId) || null;
  const canLog = () => { const c = me(); return !c || c.role !== "viewer"; };
  const canManage = () => { const c = me(); return !c || c.role === "owner" || c.role === "coowner"; };
  const who = (id) => S.caregivers.find((c) => c.id === id);
  const timers = (b) => (S.timers[b.id] = S.timers[b.id] || {});

  function upsert(arr, rec) {
    const list = S[arr];
    const i = rec.id ? list.findIndex((x) => x.id === rec.id) : -1;
    rec.updatedAt = now();
    if (i >= 0) {
      list[i] = { ...list[i], ...rec };
      rec = list[i];
    } else {
      rec.id = rec.id || uid();
      if (!rec.by && me()) rec.by = me().id;
      list.push(rec);
    }
    save();
    return rec;
  }
  function removeRec(arr, id) {
    const r = S[arr].find((x) => x.id === id);
    S[arr] = S[arr].filter((x) => x.id !== id);
    S.deleted[id] = now();
    if (r && r.photoId) DB.del(r.photoId).catch(() => {});
    save();
    return r;
  }

  /* ------------------------------------------------------- photo storage */
  const DB = (() => {
    let dbp;
    const open = () =>
      (dbp = dbp || new Promise((res, rej) => {
        const r = indexedDB.open("littlesteps-photos", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("photos");
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      }));
    async function tx(mode, fn) {
      const db = await open();
      return new Promise((res, rej) => {
        const t = db.transaction("photos", mode);
        const req = fn(t.objectStore("photos"));
        t.oncomplete = () => res(req && req.result);
        t.onerror = () => rej(t.error);
      });
    }
    return {
      put: (id, blob) => tx("readwrite", (s) => s.put(blob, id)),
      get: (id) => tx("readonly", (s) => s.get(id)),
      del: (id) => tx("readwrite", (s) => s.delete(id)),
      keys: () => tx("readonly", (s) => s.getAllKeys()),
    };
  })();
  const photoUrls = new Map();
  async function photoURL(id) {
    if (photoUrls.has(id)) return photoUrls.get(id);
    const blob = await DB.get(id).catch(() => null);
    if (!blob) return null;
    const u = URL.createObjectURL(blob);
    photoUrls.set(id, u);
    return u;
  }
  function hydratePhotos(root) {
    $$("img[data-photo]", root).forEach(async (img) => {
      const u = await photoURL(img.dataset.photo);
      if (u) img.src = u;
      else img.classList.add("missing");
    });
  }
  async function resizeImage(file, max = 1600) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = url;
      });
      const sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * sc);
      c.height = Math.round(img.naturalHeight * sc);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      return await new Promise((res) => c.toBlob(res, "image/jpeg", 0.85));
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  async function storePhoto(file) {
    const blob = await resizeImage(file);
    const id = "p_" + uid();
    await DB.put(id, blob);
    return id;
  }
  const referencedPhotos = () =>
    new Set([...S.babies, ...S.memories, ...S.cardPhotos].map((r) => r.photoId).filter(Boolean));
  async function gcPhotos() {
    if (sheetFn) return; // a form may hold a just-picked photo that isn't saved yet
    try {
      const used = referencedPhotos();
      for (const k of await DB.keys()) if (!used.has(k)) await DB.del(k);
    } catch (e) { /* storage unavailable — nothing to clean */ }
  }

  /* ------------------------------------------------------ toast & sheets */
  let toastTimer, toastUndo = null;
  function toast(msg, undo) {
    const el = $("#toast");
    el.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button data-action="toast-undo">Undo</button>' : ""}`;
    el.classList.add("show");
    toastUndo = undo || null;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.classList.remove("show"); toastUndo = null; }, undo ? 6000 : 3200);
  }

  let sheetFn = null;
  function openSheet(fn) {
    sheetFn = fn;
    const root = $("#sheet-root");
    root.innerHTML = `<div class="sheet-backdrop" data-action="close-sheet"></div>
      <div class="sheet" role="dialog" aria-modal="true">
        <div class="sheet-grab" aria-hidden="true"></div>
        <button class="sheet-x" data-action="close-sheet" aria-label="Close">✕</button>
        <div class="sheet-body">${fn()}</div>
      </div>`;
    root.classList.add("open");
    document.body.classList.add("no-scroll");
    hydratePhotos(root);
    tick();
  }
  function refreshSheet() {
    const body = $("#sheet-root .sheet-body");
    if (!sheetFn || !body) return;
    body.innerHTML = sheetFn();
    hydratePhotos(body);
    tick();
  }
  function closeSheet() {
    sheetFn = null;
    const root = $("#sheet-root");
    root.classList.remove("open");
    root.innerHTML = "";
    document.body.classList.remove("no-scroll");
  }

  /* --------------------------------------------------------------- theme */
  const isDark = () =>
    S.settings.theme === "dark" ||
    (S.settings.theme === "auto" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
  function applyTheme() {
    const t = S.settings.theme;
    if (t === "auto") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
    const m = $('meta[name="theme-color"]');
    if (m) m.content = isDark() ? "#17130f" : "#fbf6ef";
  }

  /* ----------------------------------------------------------- UI pieces */
  const ICONS = {
    today: '<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    milestones: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    growth: '<path d="M4 4v16h16"/><path d="m7.5 15 3.5-4 3 2.5L19 7"/>',
    memories: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z"/>',
    health: '<path d="M12 3 19 6v6c0 4.4-2.9 7.6-7 9-4.1-1.4-7-4.6-7-9V6z"/><path d="m9 12 2 2 4-4"/>',
  };
  const TABS = [["today", "Today"], ["milestones", "Milestones"], ["growth", "Growth"], ["memories", "Memories"], ["health", "Vaccines"]];
  const svgIcon = (k) =>
    `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>`;

  function avatar(b, cls = "") {
    if (b.photoId) return `<span class="avatar ${cls}"><img data-photo="${esc(b.photoId)}" alt=""></span>`;
    return `<span class="avatar ${cls}" aria-hidden="true">${esc((b.name || "?").trim().charAt(0).toUpperCase())}</span>`;
  }
  const byChip = (r) => {
    const c = r.by && who(r.by);
    return c && S.caregivers.length > 1 ? `<span class="by">${esc(c.relation || c.name)}</span>` : "";
  };
  function seg(name, opts, val, required) {
    return `<div class="seg" role="radiogroup">${opts
      .map(([v, l]) => `<label><input type="radio" name="${name}" value="${esc(v)}" ${v === val ? "checked" : ""} ${required ? "required" : ""}><span>${l}</span></label>`)
      .join("")}</div>`;
  }
  const ROLES = {
    owner: "Parent · full access",
    coowner: "Co-parent · full access",
    caregiver: "Caregiver · can log",
    viewer: "Family · view only",
  };

  /* ================================================================ VIEWS */
  function render() {
    applyTheme();
    const app = $("#app");
    if (!S.babies.length) {
      app.innerHTML = viewWelcome();
      return;
    }
    const b = baby();
    S.settings.activeBabyId = b.id;
    const tab = VIEWS[S.settings.tab] ? S.settings.tab : "today";
    app.innerHTML = `${header(b)}<main class="main" id="main">${VIEWS[tab](b)}</main>${nav(tab)}`;
    hydratePhotos(app);
    tick();
  }

  function header(b) {
    const info = babyInfo(b);
    return `<header class="topbar">
      <button class="baby-switch" data-action="babies" aria-label="Switch baby">
        ${avatar(b)}
        <span class="baby-meta"><strong>${esc(b.name)}</strong>
        <small>${esc(info.ageText)}${info.correctedText ? ` · corrected ${esc(info.correctedText)}` : ""}</small></span>
      </button>
      <button class="icon-btn" data-action="toggle-night" aria-label="${isDark() ? "Switch to day mode" : "Switch to night mode"}">${isDark() ? "☀️" : "🌙"}</button>
      <button class="icon-btn" data-action="settings" aria-label="Family and settings">⚙️</button>
    </header>`;
  }
  function nav(tab) {
    return `<nav class="tabbar" aria-label="Sections">${TABS.map(
      ([k, l]) => `<button class="${k === tab ? "on" : ""}" data-action="tab" data-tab="${k}" ${k === tab ? 'aria-current="page"' : ""}>${svgIcon(k)}<span>${l}</span></button>`
    ).join("")}</nav>`;
  }

  /* -------------------------------------------------------------- welcome */
  function viewWelcome() {
    return `<div class="welcome">
      <div class="welcome-hero">
        <div class="logo" aria-hidden="true">👣</div>
        <h1>Little Steps</h1>
        <p class="tagline">Every little step is a big milestone.</p>
      </div>
      <form data-form="onboard" class="card form">
        <h2>Let’s get started</h2>
        <div class="two">
          <label>Your name<input name="myName" required autocomplete="given-name" placeholder="e.g. Ana"></label>
          <label>You are baby’s…<input name="relation" list="relations" value="Mama"></label>
        </div>
        <hr>
        ${babyFields()}
        <button class="btn primary big">Start our journey</button>
      </form>
      <p class="center muted">Already using Little Steps on another phone?<br>
        <button class="link" data-action="import">Restore a backup or family file</button></p>
      <p class="privacy">🔒 Everything stays on this device. Nothing is uploaded.</p>
    </div>`;
  }
  function babyFields(b = {}) {
    const early = !!b.dueDate;
    return `<label>Baby’s name<input name="name" required value="${esc(b.name)}" placeholder="e.g. Mateo"></label>
      <label>Birth date<input type="date" name="birthDate" required max="${todayStr()}" value="${esc(b.birthDate)}"></label>
      <div class="field"><span class="field-label">Growth chart</span>
        ${seg("sex", [["girl", "Girl"], ["boy", "Boy"]], b.sex, true)}
        <small class="hint">Used only to pick the right WHO growth chart.</small></div>
      <label class="check"><input type="checkbox" name="early" data-toggle="due-wrap" ${early ? "checked" : ""}> Born early (before 37 weeks)</label>
      <div id="due-wrap" ${early ? "" : "hidden"}>
        <label>Original due date<input type="date" name="dueDate" value="${esc(b.dueDate)}" ${early ? "required" : ""}></label>
        <small class="hint">Milestones and growth will use corrected age until age 2.</small>
      </div>`;
  }
  function readBaby(fd) {
    const birthDate = fd.get("birthDate"), dueDate = fd.get("early") ? fd.get("dueDate") : "";
    if (birthDate > todayStr()) return toast("Birth date can’t be in the future"), null;
    if (dueDate && dueDate <= birthDate) return toast("The due date should be after the birth date"), null;
    return { name: fd.get("name").trim(), birthDate, sex: fd.get("sex"), dueDate: dueDate || null };
  }

  /* ---------------------------------------------------------------- today */
  let viewDay = startOfDay(now());
  const isFeed = (l) => l.type === "breast" || l.type === "bottle";

  function entryInfo(l) {
    switch (l.type) {
      case "breast": {
        const p = [];
        if (l.left) p.push(`L ${mins(l.left)}`);
        if (l.right) p.push(`R ${mins(l.right)}`);
        return { ico: "🤱", title: "Breastfed", detail: p.join(" · ") || "—" };
      }
      case "bottle":
        return { ico: "🍼", title: "Bottle", detail: `${l.amount || "?"} ml ${l.milk === "formula" ? "formula" : "breast milk"}` };
      case "pump":
        return { ico: "🥛", title: "Pumped", detail: `${l.amount || "?"} ml · ${{ L: "left", R: "right", both: "both sides" }[l.side] || "both sides"}` };
      case "sleep":
        return { ico: "💤", title: "Slept", detail: `${dur(l.end - l.time)} · ${fmtTime(l.time)}–${fmtTime(l.end)}` };
      case "diaper":
        return { ico: "🧷", title: "Diaper", detail: { wet: "Wet", dirty: "Dirty", both: "Wet + dirty" }[l.kind] || "" };
    }
    return { ico: "•", title: l.type, detail: "" };
  }
  const bfSecs = (t, side) => t.acc[side] + (t.side === side ? (now() - t.segStart) / 1000 : 0);
  const lastBreastOf = (b) =>
    S.logs.filter((l) => l.babyId === b.id && l.type === "breast").sort((a, c) => c.time - a.time)[0];

  function viewToday(b) {
    const tm = S.timers[b.id] || {};
    const logs = S.logs.filter((l) => l.babyId === b.id);
    const last = logs.filter(isFeed).sort((a, c) => c.time - a.time)[0];
    const lb = lastBreastOf(b);
    const nextSide = lb && lb.lastSide ? (lb.lastSide === "L" ? "right" : "left") : null;
    const editable = canLog();

    let hero;
    if (tm.feed) {
      hero = `<button class="hero-card live" data-action="breast">
        <span class="hero-label">🤱 Feeding now · ${tm.feed.side ? (tm.feed.side === "L" ? "left" : "right") + " side" : "paused"}</span>
        <span class="hero-big" data-bside="T">00:00</span>
        <span class="hero-sub">Tap to switch sides or finish</span></button>`;
    } else if (last) {
      const inf = entryInfo(last);
      hero = `<div class="hero-card">
        <span class="hero-label">Last fed</span>
        <span class="hero-big" data-ago="${last.time}">${ago(last.time)}</span>
        <span class="hero-sub">${inf.title} · ${esc(inf.detail)} · ${fmtTime(last.time)} ${byChip(last)}</span>
        ${nextSide ? `<span class="hero-hint">Next breastfeed: start on the <strong>${nextSide}</strong></span>` : ""}
      </div>`;
    } else {
      hero = `<div class="hero-card"><span class="hero-label">Last fed</span>
        <span class="hero-big small">No feeds yet</span>
        <span class="hero-sub">Tap Breastfeed or Bottle to log the first one.</span></div>`;
    }

    const sleepCard = tm.sleep
      ? `<div class="status-card"><span>💤 Asleep since ${fmtTime(tm.sleep.start)}</span><strong data-elapsed="${tm.sleep.start}">00:00</strong>${editable ? '<button class="btn small" data-action="wake">Woke up</button>' : ""}</div>`
      : "";

    const quick = editable
      ? `<section class="quick" aria-label="Quick log">
          <button class="qa" data-action="breast"><span class="qa-ico">🤱</span>Breastfeed</button>
          <button class="qa" data-action="entry" data-type="bottle"><span class="qa-ico">🍼</span>Bottle</button>
          ${tm.sleep
            ? '<button class="qa on" data-action="wake"><span class="qa-ico">☀️</span>Woke up</button>'
            : '<button class="qa" data-action="sleep-start"><span class="qa-ico">💤</span>Sleep</button>'}
          <button class="qa" data-action="entry" data-type="pump"><span class="qa-ico">🥛</span>Pump</button>
        </section>
        <section class="diaper card" aria-label="Diaper">
          <span class="diaper-label">🧷 Diaper</span>
          <div class="diaper-btns">
            <button data-action="diaper" data-kind="wet">💧 Wet</button>
            <button data-action="diaper" data-kind="dirty">💩 Dirty</button>
            <button data-action="diaper" data-kind="both">Both</button>
          </div>
        </section>
        ${S.caregivers.length > 1 && me() ? `<p class="center muted small">Logging as <button class="link" data-action="who">${esc(me().relation || me().name)}</button></p>` : ""}`
      : `<div class="note-card">👀 You’re viewing ${esc(b.name)}’s day. Only parents and caregivers can log.</div>`;

    // day summary
    const ds = viewDay, de = ds + DAY, isToday = ds === startOfDay(now());
    const dayLogs = logs
      .filter((l) => (l.time >= ds && l.time < de) || (l.type === "sleep" && l.time < de && l.end > ds))
      .sort((a, c) => c.time - a.time);
    const feeds = dayLogs.filter((l) => isFeed(l) && l.time >= ds);
    const bottleMl = feeds.filter((l) => l.type === "bottle").reduce((s, l) => s + (+l.amount || 0), 0);
    const sleepMs = dayLogs.filter((l) => l.type === "sleep").reduce((s, l) => s + Math.max(0, Math.min(l.end, de) - Math.max(l.time, ds)), 0);
    const diapers = dayLogs.filter((l) => l.type === "diaper");
    const wet = diapers.filter((l) => l.kind !== "dirty").length, dirty = diapers.filter((l) => l.kind !== "wet").length;

    const rows = dayLogs.length
      ? dayLogs.map((l) => {
          const inf = entryInfo(l);
          const inner = `<span class="entry-ico">${inf.ico}</span>
            <span class="entry-main"><strong>${inf.title}</strong><small>${esc(inf.detail)}${l.note ? ` · ${esc(l.note)}` : ""}</small></span>
            <span class="entry-meta"><time>${fmtTime(l.time)}</time>${byChip(l)}</span>`;
          return editable
            ? `<li><button class="entry" data-action="edit-entry" data-id="${l.id}">${inner}</button></li>`
            : `<li><div class="entry">${inner}</div></li>`;
        }).join("")
      : `<li class="empty">${isToday ? "Nothing logged yet today." : "Nothing logged this day."}</li>`;

    return `${hero}${sleepCard}${quick}
      <section class="day">
        <div class="day-nav">
          <button class="icon-btn" data-action="day" data-d="-1" aria-label="Previous day">‹</button>
          <strong>${isToday ? "Today" : fmtDate(ds, { weekday: "short", day: "numeric", month: "short" })}</strong>
          <button class="icon-btn" data-action="day" data-d="1" ${isToday ? "disabled" : ""} aria-label="Next day">›</button>
        </div>
        <div class="tiles">
          <div class="tile"><strong>${feeds.length}</strong><span>feeds${bottleMl ? ` · ${bottleMl} ml` : ""}</span></div>
          <div class="tile"><strong>${sleepMs ? dur(sleepMs) : "0"}</strong><span>sleep</span></div>
          <div class="tile"><strong>${wet}</strong><span>wet</span></div>
          <div class="tile"><strong>${dirty}</strong><span>dirty</span></div>
        </div>
        <ul class="timeline">${rows}</ul>
        ${editable ? '<p class="center"><button class="link" data-action="past-entry">+ Add a past entry</button></p>' : ""}
      </section>`;
  }

  function breastSheet() {
    const b = baby();
    const t = (S.timers[b.id] || {}).feed;
    const lb = lastBreastOf(b);
    const suggest = lb && lb.lastSide ? (lb.lastSide === "L" ? "R" : "L") : null;
    const side = (s) => {
      const running = t && t.side === s;
      const sug = !t && suggest === s;
      return `<button class="bf-side ${running ? "running" : ""} ${sug ? "suggest" : ""}" data-action="bf-tap" data-side="${s}" aria-pressed="${!!running}">
        <span class="bf-name">${s === "L" ? "Left" : "Right"}</span>
        <strong class="bf-time" data-bside="${s}">00:00</strong>
        <small>${running ? "Tap to pause" : t && t.acc[s] > 0 ? "Tap to resume" : "Tap to start"}</small>
        ${sug ? '<em class="bf-suggest">Start here</em>' : ""}</button>`;
    };
    return `<h2>Breastfeeding</h2>
      <div class="bf-sides">${side("L")}${side("R")}</div>
      <p class="bf-total">Total <strong data-bside="T">00:00</strong></p>
      ${t
        ? '<button class="btn primary big" data-action="bf-save">Done — save this feed</button><button class="btn ghost" data-action="bf-discard">Discard timer</button>'
        : '<p class="hint center">The timer keeps going even if you lock your phone or close the app.</p>'}
      <p class="center"><button class="link" data-action="entry" data-type="breast">Log a past feed instead</button></p>`;
  }

  const ENTRY_TITLES = { breast: "Breastfeed", bottle: "Bottle feed", pump: "Pumping", sleep: "Sleep", diaper: "Diaper" };
  function entrySheet(type, rec) {
    return () => {
      let f = "";
      if (type === "sleep") {
        f += `<div class="two"><label>Fell asleep<input type="datetime-local" name="time" required value="${toLocalInput(rec ? rec.time : now() - 3600e3)}"></label>
          <label>Woke up<input type="datetime-local" name="end" required value="${toLocalInput(rec ? rec.end : now())}"></label></div>`;
      } else {
        f += `<label>Time<input type="datetime-local" name="time" required value="${toLocalInput(rec ? rec.time : now())}"></label>`;
      }
      if (type === "breast") {
        f += `<div class="two"><label>Left (minutes)<input type="number" name="left" min="0" max="180" inputmode="numeric" value="${rec && rec.left ? Math.round(rec.left / 60) : ""}"></label>
          <label>Right (minutes)<input type="number" name="right" min="0" max="180" inputmode="numeric" value="${rec && rec.right ? Math.round(rec.right / 60) : ""}"></label></div>`;
      }
      if (type === "bottle" || type === "pump") {
        f += `<label>Amount (ml)<input type="number" name="amount" min="1" max="500" required inputmode="numeric" value="${rec ? esc(rec.amount) : ""}"></label>
          <div class="chips">${[30, 60, 90, 120, 150, 180].map((v) => `<button type="button" class="chip" data-action="set-amount" data-v="${v}">${v}</button>`).join("")}</div>`;
      }
      if (type === "bottle") f += `<div class="field"><span class="field-label">Milk</span>${seg("milk", [["breastmilk", "Breast milk"], ["formula", "Formula"]], rec ? rec.milk : "breastmilk")}</div>`;
      if (type === "pump") f += `<div class="field"><span class="field-label">Side</span>${seg("side", [["L", "Left"], ["R", "Right"], ["both", "Both"]], rec ? rec.side : "both")}</div>`;
      if (type === "diaper") f += `<div class="field"><span class="field-label">Diaper</span>${seg("kind", [["wet", "💧 Wet"], ["dirty", "💩 Dirty"], ["both", "Both"]], rec ? rec.kind : "", true)}</div>`;
      f += `<label>Note <span class="muted">(optional)</span><input name="note" maxlength="200" value="${rec ? esc(rec.note) : ""}"></label>`;
      return `<h2>${rec ? "Edit" : "Add"} ${ENTRY_TITLES[type].toLowerCase()}</h2>
        <form data-form="entry" class="form">
          <input type="hidden" name="type" value="${type}"><input type="hidden" name="id" value="${rec ? rec.id : ""}">
          ${f}
          <button class="btn primary big">Save</button>
          ${rec ? `<button type="button" class="btn danger-ghost" data-action="delete-entry" data-id="${rec.id}">Delete this entry</button>` : ""}
        </form>`;
    };
  }
  const pastEntrySheet = () =>
    `<h2>Add a past entry</h2><div class="pick-grid">${Object.entries(ENTRY_TITLES)
      .map(([k, l]) => `<button class="qa" data-action="entry" data-type="${k}"><span class="qa-ico">${entryInfo({ type: k, kind: "wet", side: "both" }).ico}</span>${l}</button>`)
      .join("")}</div>`;

  /* ----------------------------------------------------------- milestones */
  let msSel = null;
  function currentGroup(b) {
    const m = babyInfo(b).trackMonths;
    let g = C.milestoneGroups[0].months;
    for (const x of C.milestoneGroups) if (x.months <= m + 0.25) g = x.months;
    return g;
  }
  const MS_OPTS = [["yes", "Yes! 🎉"], ["working", "Still working on it 🌱"], ["unsure", "Not sure yet"]];

  function viewMilestones(b) {
    const info = babyInfo(b);
    const cur = currentGroup(b);
    const sel = msSel ?? cur;
    const g = C.milestoneGroups.find((x) => x.months === sel);
    const rec = S.milestones[b.id] || {};
    const counts = { yes: 0, working: 0 };
    g.items.forEach((it) => { const r = rec[it.id]; if (r && counts[r.status] != null) counts[r.status]++; });
    const editable = canLog();

    const chips = C.milestoneGroups.map(
      (x) => `<button class="chip ${x.months === sel ? "on" : ""}" data-action="ms-group" data-m="${x.months}">${x.label}${x.months === cur ? ' <span class="dot" aria-label="current"></span>' : ""}</button>`
    ).join("");

    const intro = sel === cur
      ? `What many children do by about <strong>${g.label}</strong>${info.useCorrected ? " (using corrected age)" : ""}.`
      : sel > cur ? `A peek at what’s ahead — no rush.` : `Looking back at ${g.label}.`;

    const cats = Object.entries(C.CAT).map(([cat, meta]) => {
      const items = g.items.filter((i) => i.cat === cat);
      if (!items.length) return "";
      return `<section class="card ms-cat"><h3><span aria-hidden="true">${meta.icon}</span> ${meta.label}</h3>
        ${items.map((it) => {
          const r = rec[it.id] || {};
          const st = r.status;
          return `<div class="ms-item ${st ? "st-" + st : ""}">
            <p>${esc(it.text)}</p>
            <div class="ms-btns" role="group" aria-label="${esc(it.text)}">${MS_OPTS.map(
              ([v, l]) => `<button data-action="ms" data-id="${it.id}" data-v="${v}" class="${st === v ? "on" : ""}" aria-pressed="${st === v}" ${editable ? "" : "disabled"}>${l}</button>`
            ).join("")}</div>
            ${st === "yes" && r.date ? `<small class="ms-date">Celebrated ${fmtDate(r.date)}</small>` : ""}
          </div>`;
        }).join("")}</section>`;
    }).join("");

    return `<div class="view-head"><h1>Milestones</h1></div>
      <div class="chip-row" role="tablist">${chips}</div>
      <p class="lead">${intro}</p>
      <div class="ms-progress">
        <span>🎉 <strong>${counts.yes}</strong> celebrated</span>
        <span>🌱 <strong>${counts.working}</strong> still working on</span>
        <span class="muted">of ${g.items.length}</span>
      </div>
      ${cats}
      <div class="note-card">💛 Every child grows at their own pace. These checklists are a conversation starter, not a test — if something is on your mind, bring it to your pedia.</div>
      <p class="source">Checklists adapted from the CDC’s “Learn the Signs. Act Early.” program (2022).</p>`;
  }

  /* --------------------------------------------------------------- growth */
  let growthInd = "wfa";
  function niceStep(range, n) {
    const raw = range / n, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  }
  function growthChart(b, ind) {
    const sex = b.sex, F = IND[ind].field;
    const pts = S.growth
      .filter((g) => g.babyId === b.id && g[F])
      .map((g) => ({ x: measAgeMonths(b, g.date), y: +g[F], g }))
      .filter((p) => p.x >= 0 && p.x <= 60)
      .sort((a, c) => a.x - c.x);
    const need = Math.max(babyInfo(b).trackMonths, ...pts.map((p) => p.x), 0);
    const xmax = [6, 12, 24, 36, 60].find((v) => v >= need + 0.5) || 60;
    const Z = [[-1.881, "3rd"], [-1.036, "15th"], [0, "50th"], [1.036, "85th"], [1.881, "97th"]];
    const N = 60;
    const curves = Z.map(([z]) => {
      const a = [];
      for (let i = 0; i <= N; i++) {
        const x = (xmax * i) / N;
        const [L, M, Sv] = lms(ind, sex, x);
        a.push([x, lmsValue(L, M, Sv, z)]);
      }
      return a;
    });
    let ymin = Math.min(...curves[0].map((p) => p[1]), ...pts.map((p) => p.y));
    let ymax = Math.max(...curves[4].map((p) => p[1]), ...pts.map((p) => p.y));
    const step = niceStep(ymax - ymin, 6);
    ymin = Math.floor(ymin / step) * step;
    ymax = Math.ceil(ymax / step) * step;

    const W = 360, H = 268, l = 34, r = 38, t = 22, bt = 28;
    const X = (x) => l + (x / xmax) * (W - l - r);
    const Y = (y) => t + (1 - (y - ymin) / (ymax - ymin)) * (H - t - bt);
    const path = (arr) => arr.map((p, i) => `${i ? "L" : "M"}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join("");
    const band = (lo, hi) => path(lo) + hi.slice().reverse().map((p) => `L${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join("") + "Z";

    let grid = "";
    for (let v = ymin; v <= ymax + 1e-9; v += step) {
      grid += `<line class="grid" x1="${l}" x2="${W - r}" y1="${Y(v)}" y2="${Y(v)}"/><text class="axis" x="${l - 5}" y="${Y(v) + 3.5}" text-anchor="end">${+v.toFixed(1)}</text>`;
    }
    const xs = { 6: 1, 12: 2, 24: 3, 36: 6, 60: 12 }[xmax];
    for (let m = 0; m <= xmax; m += xs) {
      const lab = m === 0 ? "Birth" : m % 12 === 0 ? `${m / 12}y` : `${m}m`;
      grid += `<line class="grid v" x1="${X(m)}" x2="${X(m)}" y1="${t}" y2="${H - bt}"/><text class="axis" x="${X(m)}" y="${H - bt + 16}" text-anchor="middle">${lab}</text>`;
    }
    const labels = curves.map((c, i) => `<text class="pct-label" x="${X(xmax) + 4}" y="${Y(c[N][1]) + 3.5}">${Z[i][1]}</text>`).join("");
    const line = pts.length > 1 ? `<path class="pt-line" d="${path(pts.map((p) => [p.x, p.y]))}"/>` : "";
    const dots = pts.map((p) => `<circle class="pt" cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="4.5"><title>${fmtDate(p.g.date)}: ${p.y} ${IND[ind].unit}</title></circle>`).join("");

    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="WHO ${IND[ind].label.toLowerCase()} chart with ${pts.length} measurements">
      <text class="axis unit" x="${l - 5}" y="${t - 10}" text-anchor="end">${IND[ind].unit}</text>
      ${grid}
      <path class="band outer" d="${band(curves[0], curves[4])}"/>
      <path class="band inner" d="${band(curves[1], curves[3])}"/>
      ${curves.map((c, i) => `<path class="curve ${i === 2 ? "mid" : ""}" d="${path(c)}"/>`).join("")}
      ${labels}${line}${dots}
    </svg>`;
  }

  function viewGrowth(b) {
    const all = S.growth.filter((g) => g.babyId === b.id).sort((a, c) => (c.date < a.date ? -1 : c.date > a.date ? 1 : c.updatedAt - a.updatedAt));
    const editable = canLog();
    const info = babyInfo(b);

    const summary = Object.entries(IND).map(([ind, meta]) => {
      const withVal = all.filter((g) => g[meta.field]);
      const latest = withVal[0], prev = withVal[1];
      if (!latest) return `<div class="stat"><span class="stat-label">${meta.label}</span><strong>—</strong><small>No entries yet</small></div>`;
      const p = percentileOf(ind, b.sex, measAgeMonths(b, latest.date), +latest[meta.field]);
      const delta = prev ? +latest[meta.field] - +prev[meta.field] : null;
      return `<div class="stat"><span class="stat-label">${meta.label}</span>
        <strong>${(+latest[meta.field]).toFixed(meta.dp).replace(/\.?0+$/, "")} ${meta.unit}</strong>
        <small>${p != null ? pctText(p) : fmtDate(latest.date)}</small>
        ${delta != null ? `<small class="muted">${delta >= 0 ? "+" : "−"}${Math.abs(delta).toFixed(meta.dp).replace(/\.?0+$/, "") || 0} ${meta.unit} since ${fmtDate(prev.date, { day: "numeric", month: "short" })}</small>` : ""}
      </div>`;
    }).join("");

    const list = all.length
      ? all.map((g) => {
          const parts = [g.weight && `${g.weight} kg`, g.length && `${g.length} cm long`, g.head && `head ${g.head} cm`].filter(Boolean).join(" · ");
          const inner = `<span class="entry-ico">📏</span><span class="entry-main"><strong>${fmtDate(g.date)}</strong><small>${esc(parts)}${g.note ? ` · ${esc(g.note)}` : ""}</small></span><span class="entry-meta">${esc(ageLabel(parseDate(b.birthDate), parseDate(g.date)) || "")}</span>`;
          return editable ? `<li><button class="entry" data-action="edit-growth" data-id="${g.id}">${inner}</button></li>` : `<li><div class="entry">${inner}</div></li>`;
        }).join("")
      : `<li class="empty">Add a measurement from your last check-up to see the chart come to life.</li>`;

    return `<div class="view-head"><h1>Growth</h1>${editable ? '<button class="btn primary" data-action="add-growth">+ Add</button>' : ""}</div>
      <div class="stats">${summary}</div>
      <div class="seg-tabs" role="tablist">${Object.entries(IND).map(([k, m]) => `<button class="${k === growthInd ? "on" : ""}" data-action="growth-ind" data-ind="${k}" role="tab" aria-selected="${k === growthInd}">${m.label}</button>`).join("")}</div>
      <div class="card chart-card">${growthChart(b, growthInd)}
        <p class="chart-legend"><span class="lg-dot"></span> ${esc(b.name)} · lines show the 3rd–97th percentiles of the WHO Child Growth Standards for ${b.sex === "girl" ? "girls" : "boys"}${info.preterm ? " · plotted by corrected age until 2" : ""}${all.some((g) => measAgeMonths(b, g.date) < 0) ? ". Measurements from before the due date aren’t plotted." : ""}</p>
      </div>
      <div class="note-card">📏 A percentile says where a measurement sits next to the WHO reference group — it’s not a grade. Healthy babies grow along every line. Your pedia looks at the pattern over time.</div>
      <h2 class="section-title">Measurements</h2>
      <ul class="timeline">${list}</ul>`;
  }
  function growthSheet(rec) {
    return () => `<h2>${rec ? "Edit" : "Add"} measurement</h2>
      <form data-form="growth" class="form">
        <input type="hidden" name="id" value="${rec ? rec.id : ""}">
        <label>Date<input type="date" name="date" required max="${todayStr()}" min="${esc(baby().birthDate)}" value="${rec ? rec.date : todayStr()}"></label>
        <label>Weight (kg)<input type="number" name="weight" step="0.01" min="0.3" max="40" inputmode="decimal" value="${rec ? esc(rec.weight) : ""}" placeholder="e.g. 6.25"></label>
        <div class="two">
          <label>Length / height (cm)<input type="number" name="length" step="0.1" min="30" max="130" inputmode="decimal" value="${rec ? esc(rec.length) : ""}"></label>
          <label>Head (cm)<input type="number" name="head" step="0.1" min="20" max="60" inputmode="decimal" value="${rec ? esc(rec.head) : ""}"></label>
        </div>
        <label>Note <span class="muted">(optional)</span><input name="note" maxlength="200" value="${rec ? esc(rec.note) : ""}" placeholder="e.g. 4-month check-up"></label>
        <button class="btn primary big">Save</button>
        ${rec ? `<button type="button" class="btn danger-ghost" data-action="delete-growth" data-id="${rec.id}">Delete</button>` : ""}
      </form>`;
  }

  /* ------------------------------------------------------------- memories */
  let memTab = "firsts";
  function firstDefs(b) {
    const custom = S.memories
      .filter((m) => m.babyId === b.id && m.firstKey && m.firstKey.startsWith("custom:"))
      .map((m) => ({ key: m.firstKey, label: m.firstLabel || "A first", icon: "⭐" }));
    return [...C.firsts, ...custom];
  }
  function backupCard() {
    const last = S.settings.lastExport;
    const changed = last && [...S.memories, ...S.logs, ...S.growth].some((r) => (r.updatedAt || 0) > last);
    const ok = last && !changed;
    return `<div class="backup ${ok ? "ok" : ""}">
      <span class="backup-ico" aria-hidden="true">${ok ? "✅" : "📱"}</span>
      <div><strong>${ok ? "Your memories are backed up" : last ? "New memories since your last backup" : "Saved on this phone only"}</strong>
      <small>${last ? `Last backup ${fmtDate(last)}` : "Make a backup so your photos are safe if this phone is lost."}</small></div>
      <button class="btn small" data-action="export">Back up</button>
    </div>`;
  }
  function viewMemories(b) {
    const mems = S.memories.filter((m) => m.babyId === b.id);
    const editable = canLog();
    let body;
    if (memTab === "firsts") {
      const defs = firstDefs(b);
      const got = defs.filter((f) => mems.some((m) => m.firstKey === f.key)).length;
      body = `<p class="lead">${got} of ${defs.length} firsts collected</p>
        <div class="firsts">${defs.map((f) => {
          const m = mems.find((x) => x.firstKey === f.key);
          return `<button class="first-card ${m ? "done" : ""}" data-action="first" data-key="${esc(f.key)}" ${editable || m ? "" : "disabled"}>
            ${m && m.photoId ? `<img data-photo="${esc(m.photoId)}" alt="">` : `<span class="first-ico" aria-hidden="true">${f.icon}</span>`}
            <strong>${esc(f.label)}</strong><small>${m ? fmtDate(m.date) : "Someday soon"}</small></button>`;
        }).join("")}
        ${editable ? '<button class="first-card add" data-action="first" data-key="new"><span class="first-ico">＋</span><strong>Add a first</strong><small>Your own</small></button>' : ""}</div>`;
    } else {
      const sorted = mems.slice().sort((a, c) => (c.date > a.date ? 1 : c.date < a.date ? -1 : c.updatedAt - a.updatedAt));
      body = `${editable ? '<button class="btn primary block" data-action="memory" data-id="">+ Add a memory</button>' : ""}
        ${sorted.length ? `<div class="mem-grid">${sorted.map((m) => `<button class="mem-card" data-action="memory" data-id="${m.id}">
            ${m.photoId ? `<img data-photo="${esc(m.photoId)}" alt="">` : `<span class="mem-text">${esc(m.caption || m.firstLabel || "")}</span>`}
            <span class="mem-cap"><strong>${esc(m.firstKey ? (firstDefs(b).find((f) => f.key === m.firstKey) || {}).label || "A first" : m.caption || "Memory")}</strong><small>${fmtDate(m.date)}</small></span>
          </button>`).join("")}</div>` : '<p class="empty">Photos, little stories, funny moments — they all belong here.</p>'}`;
    }
    return `<div class="view-head"><h1>Memories</h1></div>
      ${backupCard()}
      <div class="seg-tabs" role="tablist">
        <button class="${memTab === "firsts" ? "on" : ""}" data-action="mem-tab" data-t="firsts" role="tab" aria-selected="${memTab === "firsts"}">Firsts collection</button>
        <button class="${memTab === "all" ? "on" : ""}" data-action="mem-tab" data-t="all" role="tab" aria-selected="${memTab === "all"}">All memories</button>
      </div>${body}`;
  }
  function memorySheet(rec, firstKey) {
    return () => {
      const b = baby();
      const key = rec ? rec.firstKey : firstKey;
      const def = key && key !== "new" ? firstDefs(b).find((f) => f.key === key) : null;
      const isCustomNew = key === "new";
      const title = def ? def.label : isCustomNew ? "A new first" : rec ? "Memory" : "New memory";
      const editable = canLog();
      return `<h2>${def ? def.icon + " " : ""}${esc(title)}</h2>
        <form data-form="memory" class="form">
          <input type="hidden" name="id" value="${rec ? rec.id : ""}">
          <input type="hidden" name="firstKey" value="${esc(key || "")}">
          <input type="hidden" name="photoId" value="${rec && rec.photoId ? esc(rec.photoId) : ""}">
          <label class="photo-pick">
            <span class="photo-preview">${rec && rec.photoId ? `<img data-photo="${esc(rec.photoId)}" alt="">` : '<span class="ph">📷<br>Add a photo</span>'}</span>
            <input type="file" accept="image/*" data-photo-input hidden ${editable ? "" : "disabled"}>
          </label>
          ${isCustomNew || (rec && rec.firstKey && rec.firstKey.startsWith("custom:")) ? `<label>What was the first?<input name="firstLabel" required maxlength="60" value="${rec ? esc(rec.firstLabel) : ""}" placeholder="e.g. First time meeting Lolo"></label>` : ""}
          <label>Date<input type="date" name="date" required max="${todayStr()}" value="${rec ? rec.date : todayStr()}"></label>
          <label>${def || isCustomNew ? "The story" : "Caption"} <span class="muted">(optional)</span><textarea name="caption" rows="3" maxlength="1000">${rec ? esc(rec.caption) : ""}</textarea></label>
          ${editable ? '<button class="btn primary big">Save memory</button>' : ""}
          ${rec && editable ? `<button type="button" class="btn danger-ghost" data-action="delete-memory" data-id="${rec.id}">Delete</button>` : ""}
        </form>`;
    };
  }

  /* --------------------------------------------------------------- health */
  function vaxList(b) {
    const birth = parseDate(b.birthDate);
    const rec = S.vaccines[b.id] || {};
    const base = C.vaccines.map((v) => ({ ...v, due: new Date(birth.getFullYear(), birth.getMonth(), birth.getDate() + v.at) }));
    const custom = S.customVaccines.filter((v) => v.babyId === b.id).map((v) => ({ id: v.id, name: v.name, note: v.note, group: "Added by you", due: parseDate(v.due), custom: true }));
    const today = new Date();
    return [...base, ...custom].map((v) => {
      const r = rec[v.id] || {};
      const days = daysBetween(today, v.due);
      const st = r.given ? "given" : r.skipped ? "skipped" : days <= 0 ? "open" : days <= 14 ? "soon" : "upcoming";
      return { ...v, r, st, days };
    });
  }
  const VAX_LABEL = { given: "Given", skipped: "Not planned", open: "Not recorded yet", soon: "Due soon", upcoming: "Upcoming" };
  function viewHealth(b) {
    const list = vaxList(b);
    const editable = canLog();
    const next = list.filter((v) => v.st === "soon" || v.st === "upcoming").sort((a, c) => a.due - c.due);
    const nextGroup = next.length ? next.filter((v) => +v.due === +next[0].due) : [];
    const given = list.filter((v) => v.st === "given").length;
    const groups = [...new Set(list.map((v) => v.group))];
    const nextCard = nextGroup.length
      ? `<div class="hero-card soft"><span class="hero-label">Next up · ${fmtDate(nextGroup[0].due)}</span>
          <span class="hero-big small">${nextGroup.map((v) => esc(v.name)).join(", ")}</span>
          <span class="hero-sub">${nextGroup[0].days === 0 ? "Today" : `In ${plural(nextGroup[0].days, "day")}`} · ${given} of ${list.length} recorded</span></div>`
      : `<div class="hero-card soft"><span class="hero-label">Vaccines</span><span class="hero-big small">${given} of ${list.length} recorded</span></div>`;

    const rows = groups.map((g) => `<section class="card vax-group"><h3>${esc(g)}</h3>${list.filter((v) => v.group === g).map((v) => {
      const sub = v.st === "given" ? `Given ${fmtDate(v.r.given)}${v.r.place ? " · " + esc(v.r.place) : ""}` : v.st === "skipped" ? "Marked as not planned" : `Due ${fmtDate(v.due)}`;
      return `<button class="vax-row st-${v.st}" data-action="vax" data-id="${esc(v.id)}" ${editable ? "" : "disabled"}>
        <span class="vax-check" aria-hidden="true">${v.st === "given" ? "✓" : ""}</span>
        <span class="vax-main"><strong>${esc(v.name)}${v.epi ? ' <abbr class="epi" title="Part of the DOH routine program — free at health centers">EPI</abbr>' : ""}</strong><small>${sub}</small></span>
        <span class="pill ${v.st}">${VAX_LABEL[v.st]}</span></button>`;
    }).join("")}</section>`).join("");

    const cards = S.cardPhotos.filter((c) => c.babyId === b.id);
    return `<div class="view-head"><h1>Vaccines</h1>${editable ? '<button class="btn" data-action="add-vax">+ Other</button>' : ""}</div>
      ${nextCard}
      <p class="lead small"><abbr class="epi">EPI</abbr> = DOH routine program, free at barangay health centers. Others are recommended by the Philippine Pediatric Society; ask your pedia which ones fit your baby.</p>
      ${rows}
      <section class="card"><h3>📒 Baby book card</h3>
        <p class="hint">Snap the immunization card from the baby book so it’s always with you.</p>
        <div class="photo-grid">${cards.map((c) => `<button class="photo-thumb" data-action="view-card" data-id="${c.id}"><img data-photo="${esc(c.photoId)}" alt="Vaccine card photo"></button>`).join("")}
          ${editable ? '<label class="photo-thumb add"><input type="file" accept="image/*" data-card-photo hidden>＋<small>Add photo</small></label>' : ""}</div>
      </section>
      <p class="source">Schedule based on the DOH Expanded Program on Immunization and the PPS childhood immunization schedule. Schedules get updated — always follow your pedia’s advice.</p>`;
  }
  function vaxSheet(id) {
    return () => {
      const v = vaxList(baby()).find((x) => x.id === id);
      if (!v) return "<p>Not found.</p>";
      return `<h2>${esc(v.name)}</h2>
        <p class="muted">${v.note ? esc(v.note) + " · " : ""}Recommended from ${fmtDate(v.due)}</p>
        <form data-form="vax" class="form">
          <input type="hidden" name="id" value="${esc(v.id)}">
          <label>Date given<input type="date" name="given" required max="${todayStr()}" value="${v.r.given || todayStr()}"></label>
          <label>Where<input name="place" list="vax-places" maxlength="80" value="${esc(v.r.place)}" placeholder="e.g. Barangay health center"></label>
          <label>Notes <span class="muted">(brand, lot no., reactions)</span><input name="note" maxlength="200" value="${esc(v.r.note)}"></label>
          <button class="btn primary big">${v.r.given ? "Update" : "Mark as given"}</button>
          ${v.r.given || v.r.skipped
            ? `<button type="button" class="btn ghost" data-action="vax-clear" data-id="${esc(v.id)}">Clear this record</button>`
            : `<button type="button" class="btn ghost" data-action="vax-skip" data-id="${esc(v.id)}">Not planned (per our pedia)</button>`}
          ${v.custom ? `<button type="button" class="btn danger-ghost" data-action="vax-delete" data-id="${esc(v.id)}">Remove this vaccine</button>` : ""}
        </form>`;
    };
  }
  const addVaxSheet = () => `<h2>Add another vaccine</h2>
    <form data-form="addvax" class="form">
      <label>Vaccine name<input name="name" required maxlength="60" placeholder="e.g. Meningococcal"></label>
      <label>Due date<input type="date" name="due" required value="${todayStr()}"></label>
      <label>Note <span class="muted">(optional)</span><input name="note" maxlength="120"></label>
      <button class="btn primary big">Add</button>
    </form>`;

  /* ----------------------------------------------------- settings & family */
  function settingsSheet() {
    const manage = canManage();
    const cur = me();
    const theme = S.settings.theme;
    return `<h2>Family & settings</h2>
      <h3 class="section-title">Babies</h3>
      <ul class="list">${S.babies.map((b) => `<li><span class="list-main">${avatar(b, "sm")}<span><strong>${esc(b.name)}</strong><small>${esc(babyInfo(b).ageText)}</small></span></span>
        ${manage ? `<button class="btn small ghost" data-action="edit-baby" data-id="${b.id}">Edit</button>` : ""}</li>`).join("")}</ul>
      ${manage ? '<button class="btn block" data-action="edit-baby" data-id="">+ Add a baby</button>' : ""}

      <h3 class="section-title">Family & caregivers</h3>
      <label>Who’s using this phone?
        <select data-change="set-me">${S.caregivers.map((c) => `<option value="${c.id}" ${cur && cur.id === c.id ? "selected" : ""}>${esc(c.name)}${c.relation ? ` (${esc(c.relation)})` : ""}</option>`).join("")}</select></label>
      <ul class="list">${S.caregivers.map((c) => `<li><span class="list-main"><span class="avatar sm">${esc(c.name.charAt(0).toUpperCase())}</span><span><strong>${esc(c.name)}${c.relation ? ` · ${esc(c.relation)}` : ""}</strong><small>${ROLES[c.role]}</small></span></span>
        ${manage ? `<button class="btn small ghost" data-action="edit-cg" data-id="${c.id}">Edit</button>` : ""}</li>`).join("")}</ul>
      ${manage ? '<button class="btn block" data-action="edit-cg" data-id="">+ Add family member</button>' : ""}
      <div class="note-card small">👪 <strong>Logging from another phone?</strong> Tap <em>Share family file</em> below and send it to your partner, lola or yaya. They open Little Steps, tap <em>Import</em>, and everything merges — each entry keeps the name of who logged it. Do the same in the other direction to stay in sync.</div>

      <h3 class="section-title">Appearance</h3>
      <div class="seg" role="radiogroup">${[["auto", "Auto"], ["light", "Day"], ["dark", "Night"]].map(([v, l]) => `<label><input type="radio" name="theme" value="${v}" data-change="theme" ${theme === v ? "checked" : ""}><span>${l}</span></label>`).join("")}</div>
      <small class="hint">Night mode keeps the screen dim and warm for 3 a.m. feeds.</small>

      <h3 class="section-title">Your data</h3>
      <div class="btn-col">
        <button class="btn" data-action="export">⬆️ Back up / share family file</button>
        <button class="btn" data-action="import">⬇️ Import a backup or family file</button>
        ${manage ? '<button class="btn danger-ghost" data-action="erase">Erase everything on this phone</button>' : ""}
      </div>
      <p class="hint">🔒 Little Steps keeps your family’s data on this device only — nothing is sent to a server. Built with the Philippine Data Privacy Act of 2012 (RA 10173) in mind: you decide what leaves this phone and with whom.</p>
      <p class="source">Milestones: CDC “Learn the Signs. Act Early.” · Growth: WHO Child Growth Standards (0–5 years) · Vaccines: DOH EPI & PPS schedule. Little Steps doesn’t give medical advice.</p>`;
  }
  function babySheet(id) {
    return () => {
      const b = id ? S.babies.find((x) => x.id === id) : {};
      return `<h2>${id ? "Edit " + esc(b.name) : "Add a baby"}</h2>
        <form data-form="baby" class="form">
          <input type="hidden" name="id" value="${id || ""}">
          <input type="hidden" name="photoId" value="${esc(b.photoId || "")}">
          <label class="photo-pick round"><span class="photo-preview">${b.photoId ? `<img data-photo="${esc(b.photoId)}" alt="">` : '<span class="ph">📷<br>Photo</span>'}</span><input type="file" accept="image/*" data-photo-input hidden></label>
          ${babyFields(b)}
          <button class="btn primary big">Save</button>
          ${id && S.babies.length > 1 ? `<button type="button" class="btn danger-ghost" data-action="delete-baby" data-id="${id}">Remove ${esc(b.name)} and all their entries</button>` : ""}
        </form>`;
    };
  }
  function caregiverSheet(id) {
    return () => {
      const c = id ? S.caregivers.find((x) => x.id === id) : { role: "caregiver" };
      const owners = S.caregivers.filter((x) => x.role === "owner");
      const lockRole = c.role === "owner" && owners.length === 1;
      return `<h2>${id ? "Edit " + esc(c.name) : "Add family member"}</h2>
        <form data-form="caregiver" class="form">
          <input type="hidden" name="id" value="${id || ""}">
          <div class="two"><label>Name<input name="name" required maxlength="40" value="${esc(c.name)}"></label>
          <label>Relation<input name="relation" list="relations" maxlength="20" value="${esc(c.relation)}" placeholder="Lola"></label></div>
          <label>What can they do?
            <select name="role" ${lockRole ? "disabled" : ""}>${Object.entries(ROLES).map(([k, l]) => `<option value="${k}" ${c.role === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
          ${lockRole ? '<small class="hint">There must always be one parent with full access.</small>' : ""}
          <button class="btn primary big">Save</button>
          ${id && !lockRole && (!me() || me().id !== id) ? `<button type="button" class="btn danger-ghost" data-action="delete-cg" data-id="${id}">Remove</button>` : ""}
        </form>`;
    };
  }
  const babiesSheet = () => `<h2>Switch baby</h2><ul class="list">${S.babies.map((b) => `<li><button class="list-btn ${b.id === S.settings.activeBabyId ? "on" : ""}" data-action="pick-baby" data-id="${b.id}">${avatar(b, "sm")}<span><strong>${esc(b.name)}</strong><small>${esc(babyInfo(b).ageText)}</small></span>${b.id === S.settings.activeBabyId ? '<span class="tick">✓</span>' : ""}</button></li>`).join("")}</ul>
    ${canManage() ? '<button class="btn block" data-action="edit-baby" data-id="">+ Add a baby</button>' : ""}`;
  const whoSheet = () => `<h2>Who’s using this phone?</h2><p class="muted">Entries you log will show your name.</p>
    <ul class="list">${S.caregivers.map((c) => `<li><button class="list-btn" data-action="pick-me" data-id="${c.id}"><span class="avatar sm">${esc(c.name.charAt(0).toUpperCase())}</span><span><strong>${esc(c.name)}</strong><small>${esc(c.relation || "")} · ${ROLES[c.role]}</small></span></button></li>`).join("")}</ul>
    <button class="btn block" data-action="edit-cg" data-id="">Someone new</button>`;

  /* ------------------------------------------------------ backup & merge */
  const blobToDataURL = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
  async function exportBackup() {
    toast("Preparing your backup…");
    const photos = {};
    for (const id of referencedPhotos()) {
      const blob = await DB.get(id).catch(() => null);
      if (blob) photos[id] = await blobToDataURL(blob);
    }
    const { settings, timers, ...data } = S;
    const json = JSON.stringify({ app: "little-steps", format: 1, exportedAt: new Date().toISOString(), state: data, photos });
    const name = `little-steps-${todayStr()}.json`;
    const file = new File([json], name, { type: "application/json" });
    let done = false;
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Little Steps family file" });
        done = true;
      } catch (e) {
        if (e.name === "AbortError") return;
      }
    }
    if (!done) {
      const url = URL.createObjectURL(file);
      const a = Object.assign(document.createElement("a"), { href: url, download: name });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }
    S.settings.lastExport = now();
    save();
    render();
    if (sheetFn) refreshSheet();
    toast("Backup saved 💛 Keep it somewhere safe, like Google Drive.");
  }
  function mergeIn(inc) {
    let added = 0;
    const tomb = { ...S.deleted, ...(inc.deleted || {}) };
    for (const k of ARRAYS) {
      const map = new Map(S[k].map((r) => [r.id, r]));
      for (const r of inc[k] || []) {
        if (!r || !r.id) continue;
        const ex = map.get(r.id);
        if (!ex) { map.set(r.id, r); if (!tomb[r.id]) added++; }
        else if ((r.updatedAt || 0) > (ex.updatedAt || 0)) map.set(r.id, r);
      }
      S[k] = [...map.values()].filter((r) => !tomb[r.id]);
    }
    for (const k of MAPS) {
      const src = inc[k] || {};
      for (const bid in src) {
        S[k][bid] = S[k][bid] || {};
        for (const id in src[bid]) {
          const r = src[bid][id], ex = S[k][bid][id];
          if (!ex || (r.updatedAt || 0) > (ex.updatedAt || 0)) { S[k][bid][id] = r; if (!ex) added++; }
        }
      }
    }
    S.deleted = tomb;
    return added;
  }
  async function importFile(file) {
    try {
      const data = JSON.parse(await file.text());
      if (data.app !== "little-steps" || !data.state) throw new Error("not a Little Steps file");
      for (const [id, url] of Object.entries(data.photos || {})) {
        const blob = await (await fetch(url)).blob();
        await DB.put(id, blob);
      }
      const added = mergeIn(data.state);
      if (!baby() && S.babies.length) S.settings.activeBabyId = S.babies[0].id;
      save();
      closeSheet();
      render();
      toast(added ? `Merged — ${plural(added, "new entry")} added` : "Everything was already up to date");
      if (!me() && S.caregivers.length) openSheet(whoSheet);
    } catch (e) {
      console.warn(e);
      toast("That file couldn’t be read. Is it a Little Steps backup?");
    }
  }

  /* ------------------------------------------------------------- actions */
  const VIEWS = { today: viewToday, milestones: viewMilestones, growth: viewGrowth, memories: viewMemories, health: viewHealth };
  const rerender = () => { render(); if (sheetFn) refreshSheet(); };

  const actions = {
    tab: (el) => { S.settings.tab = el.dataset.tab; save(); render(); window.scrollTo(0, 0); },
    "close-sheet": closeSheet,
    "toast-undo": () => { if (toastUndo) { toastUndo(); toastUndo = null; } $("#toast").classList.remove("show"); },
    "toggle-night": () => { S.settings.theme = isDark() ? "light" : "dark"; save(); render(); },
    settings: () => openSheet(settingsSheet),
    babies: () => openSheet(babiesSheet),
    who: () => openSheet(whoSheet),
    "pick-baby": (el) => { S.settings.activeBabyId = el.dataset.id; msSel = null; save(); closeSheet(); render(); },
    "pick-me": (el) => { S.settings.activeCaregiverId = el.dataset.id; save(); closeSheet(); render(); toast(`Hi, ${me().name}! 👋`); },
    day: (el) => { viewDay = startOfDay(viewDay + +el.dataset.d * DAY + DAY / 2); if (viewDay > startOfDay(now())) viewDay = startOfDay(now()); render(); },

    // feeding
    breast: () => openSheet(breastSheet),
    "bf-tap": (el) => {
      const b = baby(), tm = timers(b), side = el.dataset.side;
      let t = tm.feed;
      if (!t) t = tm.feed = { start: now(), side: null, segStart: null, acc: { L: 0, R: 0 }, lastSide: null };
      if (t.side) t.acc[t.side] += (now() - t.segStart) / 1000;
      if (t.side === side) t.side = null;
      else { t.side = side; t.segStart = now(); t.lastSide = side; }
      save(); rerender();
    },
    "bf-save": () => {
      const b = baby(), tm = timers(b), t = tm.feed;
      if (!t) return;
      if (t.side) t.acc[t.side] += (now() - t.segStart) / 1000;
      const left = Math.round(t.acc.L), right = Math.round(t.acc.R);
      if (left + right < 5) {
        return toast(left + right === 0 ? "Tap Left or Right to start the timer first" : "That was only a few seconds — keep going, or discard the timer");
      }
      upsert("logs", { babyId: b.id, type: "breast", time: t.start, left, right, lastSide: t.lastSide });
      delete tm.feed;
      save(); closeSheet(); render();
      toast(`Feed saved · ${mins(left + right)} total`);
    },
    "bf-discard": () => { if (confirm("Discard this feeding timer?")) { delete timers(baby()).feed; save(); rerender(); } },

    entry: (el) => openSheet(entrySheet(el.dataset.type)),
    "past-entry": () => openSheet(pastEntrySheet),
    "edit-entry": (el) => { const r = S.logs.find((l) => l.id === el.dataset.id); if (r) openSheet(entrySheet(r.type, r)); },
    "delete-entry": (el) => {
      const r = removeRec("logs", el.dataset.id);
      closeSheet(); render();
      toast("Entry deleted", () => { delete S.deleted[r.id]; S.logs.push(r); save(); render(); });
    },
    "set-amount": (el) => { const i = el.closest("form").querySelector('[name="amount"]'); i.value = el.dataset.v; },
    "sleep-start": () => { timers(baby()).sleep = { start: now() }; save(); render(); toast("Sweet dreams 💤"); },
    wake: () => {
      const b = baby(), tm = timers(b);
      if (!tm.sleep) return;
      const rec = upsert("logs", { babyId: b.id, type: "sleep", time: tm.sleep.start, end: now() });
      delete tm.sleep;
      save(); render();
      toast(`Slept ${dur(rec.end - rec.time)} ☀️`);
    },
    diaper: (el) => {
      const rec = upsert("logs", { babyId: baby().id, type: "diaper", kind: el.dataset.kind, time: now() });
      render();
      toast(`${entryInfo(rec).detail} diaper logged`, () => { removeRec("logs", rec.id); render(); });
    },

    // milestones
    "ms-group": (el) => { msSel = +el.dataset.m; render(); },
    ms: (el) => {
      const b = baby();
      const map = (S.milestones[b.id] = S.milestones[b.id] || {});
      const cur = map[el.dataset.id] || {};
      const v = el.dataset.v;
      const status = cur.status === v ? null : v;
      map[el.dataset.id] = { status, date: status === "yes" ? cur.date || todayStr() : null, updatedAt: now(), by: me() ? me().id : null };
      save(); render();
      if (status === "yes") toast(`Yay! Another little step for ${b.name} 🎉`);
    },

    // growth
    "growth-ind": (el) => { growthInd = el.dataset.ind; render(); },
    "add-growth": () => openSheet(growthSheet()),
    "edit-growth": (el) => { const r = S.growth.find((g) => g.id === el.dataset.id); if (r) openSheet(growthSheet(r)); },
    "delete-growth": (el) => { if (confirm("Delete this measurement?")) { removeRec("growth", el.dataset.id); closeSheet(); render(); } },

    // memories
    "mem-tab": (el) => { memTab = el.dataset.t; render(); },
    first: (el) => {
      const key = el.dataset.key;
      const m = S.memories.find((x) => x.babyId === baby().id && x.firstKey === key);
      openSheet(memorySheet(m || null, key));
    },
    memory: (el) => openSheet(memorySheet(el.dataset.id ? S.memories.find((m) => m.id === el.dataset.id) : null)),
    "delete-memory": (el) => { if (confirm("Delete this memory and its photo?")) { removeRec("memories", el.dataset.id); closeSheet(); render(); } },

    // vaccines
    vax: (el) => openSheet(vaxSheet(el.dataset.id)),
    "add-vax": () => openSheet(addVaxSheet),
    "vax-skip": (el) => setVax(el.dataset.id, { given: null, skipped: true }),
    "vax-clear": (el) => setVax(el.dataset.id, { given: null, skipped: false, place: "", note: "" }),
    "vax-delete": (el) => { if (confirm("Remove this vaccine from the list?")) { removeRec("customVaccines", el.dataset.id); closeSheet(); render(); } },
    "view-card": (el) => {
      const c = S.cardPhotos.find((x) => x.id === el.dataset.id);
      openSheet(() => `<h2>Vaccine card</h2><img class="full-photo" data-photo="${esc(c.photoId)}" alt="Vaccine card">${canLog() ? `<button class="btn danger-ghost" data-action="delete-card" data-id="${c.id}">Delete photo</button>` : ""}`);
    },
    "delete-card": (el) => { if (confirm("Delete this photo?")) { removeRec("cardPhotos", el.dataset.id); closeSheet(); render(); } },

    // family & settings
    "edit-baby": (el) => openSheet(babySheet(el.dataset.id)),
    "delete-baby": (el) => {
      const b = S.babies.find((x) => x.id === el.dataset.id);
      if (!b || !confirm(`Remove ${b.name} and all of their entries, photos and records? This can’t be undone.`)) return;
      for (const k of ["growth", "logs", "memories", "customVaccines", "cardPhotos"]) S[k].filter((r) => r.babyId === b.id).forEach((r) => removeRec(k, r.id));
      delete S.milestones[b.id]; delete S.vaccines[b.id]; delete S.timers[b.id];
      removeRec("babies", b.id);
      S.settings.activeBabyId = S.babies[0].id;
      save(); closeSheet(); render();
    },
    "edit-cg": (el) => openSheet(caregiverSheet(el.dataset.id)),
    "delete-cg": (el) => { if (confirm("Remove this family member? Their past entries stay.")) { removeRec("caregivers", el.dataset.id); openSheet(settingsSheet); render(); } },
    export: () => exportBackup(),
    import: () => $("#import-file").click(),
    erase: async () => {
      if (!confirm("Erase all Little Steps data on this phone, including photos? Make a backup first if you want to keep anything.")) return;
      if (!confirm("Are you sure? This can’t be undone.")) return;
      try { for (const k of await DB.keys()) await DB.del(k); } catch (e) { /* ignore */ }
      localStorage.removeItem(KEY);
      S = blank();
      closeSheet(); render();
    },
  };
  function setVax(id, patch) {
    const b = baby();
    const map = (S.vaccines[b.id] = S.vaccines[b.id] || {});
    map[id] = { ...(map[id] || {}), ...patch, updatedAt: now(), by: me() ? me().id : null };
    save(); closeSheet(); render();
  }

  /* --------------------------------------------------------------- forms */
  const forms = {
    onboard(f, fd) {
      const b = readBaby(fd);
      if (!b) return;
      const c = upsert("caregivers", { name: fd.get("myName").trim(), relation: fd.get("relation").trim(), role: "owner" });
      S.settings.activeCaregiverId = c.id;
      const nb = upsert("babies", b);
      S.settings.activeBabyId = nb.id;
      S.settings.tab = "today";
      save(); render();
      toast(`Welcome, ${c.name}! 👣`);
    },
    entry(f, fd) {
      const type = fd.get("type"), id = fd.get("id");
      const old = id ? S.logs.find((l) => l.id === id) : null;
      const time = fromLocalInput(fd.get("time"));
      if (!time) return;
      if (time > now() + 60000) return toast("That time is in the future");
      const rec = { babyId: baby().id, type, time, note: (fd.get("note") || "").trim() };
      if (id) rec.id = id;
      if (type === "breast") {
        rec.left = (+fd.get("left") || 0) * 60;
        rec.right = (+fd.get("right") || 0) * 60;
        if (!rec.left && !rec.right) return toast("Add minutes for at least one side");
        rec.lastSide = rec.left && rec.right ? (old && old.lastSide) || null : rec.left ? "L" : "R";
      }
      if (type === "bottle") { rec.amount = +fd.get("amount"); rec.milk = fd.get("milk") || "breastmilk"; }
      if (type === "pump") { rec.amount = +fd.get("amount"); rec.side = fd.get("side") || "both"; }
      if (type === "sleep") {
        rec.end = fromLocalInput(fd.get("end"));
        if (!rec.end || rec.end <= time) return toast("Wake-up time should be after the sleep time");
        if (rec.end > now() + 60000) return toast("Wake-up time is in the future");
      }
      if (type === "diaper") rec.kind = fd.get("kind");
      upsert("logs", rec);
      viewDay = startOfDay(time);
      closeSheet(); render();
      toast(id ? "Updated" : "Saved 💛");
    },
    growth(f, fd) {
      const rec = { babyId: baby().id, date: fd.get("date"), note: (fd.get("note") || "").trim() };
      for (const k of ["weight", "length", "head"]) rec[k] = fd.get(k) ? +fd.get(k) : null;
      if (!rec.weight && !rec.length && !rec.head) return toast("Add at least one measurement");
      if (fd.get("id")) rec.id = fd.get("id");
      upsert("growth", rec);
      closeSheet(); render();
      toast("Measurement saved 📏");
    },
    memory(f, fd) {
      const id = fd.get("id");
      const old = id ? S.memories.find((m) => m.id === id) : null;
      let firstKey = fd.get("firstKey") || null;
      if (firstKey === "new") firstKey = "custom:" + uid();
      const rec = { babyId: baby().id, date: fd.get("date"), caption: (fd.get("caption") || "").trim(), photoId: fd.get("photoId") || null, firstKey };
      if (fd.has("firstLabel")) rec.firstLabel = fd.get("firstLabel").trim();
      if (!rec.photoId && !rec.caption && !firstKey) return toast("Add a photo or a few words");
      if (id) rec.id = id;
      if (old && old.photoId && old.photoId !== rec.photoId) DB.del(old.photoId).catch(() => {});
      upsert("memories", rec);
      closeSheet(); render();
      toast(firstKey ? "A first, saved forever ⭐" : "Memory saved 💛");
    },
    vax(f, fd) {
      setVax(fd.get("id"), { given: fd.get("given"), skipped: false, place: fd.get("place").trim(), note: fd.get("note").trim() });
      toast("Vaccine recorded 💉");
    },
    addvax(f, fd) {
      upsert("customVaccines", { babyId: baby().id, name: fd.get("name").trim(), due: fd.get("due"), note: fd.get("note").trim() });
      closeSheet(); render();
    },
    baby(f, fd) {
      const b = readBaby(fd);
      if (!b) return;
      b.photoId = fd.get("photoId") || null;
      const id = fd.get("id");
      const old = id && S.babies.find((x) => x.id === id);
      if (old && old.photoId && old.photoId !== b.photoId) DB.del(old.photoId).catch(() => {});
      if (id) b.id = id;
      const saved = upsert("babies", b);
      if (!id) { S.settings.activeBabyId = saved.id; msSel = null; save(); }
      closeSheet(); render();
      toast(id ? "Saved" : `Welcome, ${saved.name}! 💛`);
    },
    caregiver(f, fd) {
      const id = fd.get("id");
      const rec = { name: fd.get("name").trim(), relation: fd.get("relation").trim() };
      if (fd.get("role")) rec.role = fd.get("role");
      if (id) rec.id = id;
      const c = upsert("caregivers", rec);
      if (!me()) { S.settings.activeCaregiverId = c.id; save(); }
      openSheet(settingsSheet);
      render();
    },
  };

  /* -------------------------------------------------------------- events */
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el || el.disabled) return;
    const fn = actions[el.dataset.action];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener("submit", (e) => {
    const f = e.target;
    if (f.dataset.form && forms[f.dataset.form]) {
      e.preventDefault();
      forms[f.dataset.form](f, new FormData(f));
    }
  });
  document.addEventListener("change", async (e) => {
    const el = e.target;
    if (el.dataset.toggle) {
      const box = document.getElementById(el.dataset.toggle);
      box.hidden = !el.checked;
      $$("input", box).forEach((i) => (i.required = el.checked));
    }
    if (el.dataset.change === "set-me") { S.settings.activeCaregiverId = el.value; save(); render(); }
    if (el.dataset.change === "theme") { S.settings.theme = el.value; save(); render(); }
    if (el.id === "import-file" && el.files[0]) { await importFile(el.files[0]); el.value = ""; }
    if (el.hasAttribute("data-photo-input") && el.files[0]) {
      const form = el.closest("form");
      try {
        const id = await storePhoto(el.files[0]);
        form.querySelector('[name="photoId"]').value = id;
        form.querySelector(".photo-preview").innerHTML = `<img src="${await photoURL(id)}" alt="">`;
      } catch (err) { toast("Couldn’t add that photo"); }
    }
    if (el.hasAttribute("data-card-photo") && el.files[0]) {
      try {
        const photoId = await storePhoto(el.files[0]);
        upsert("cardPhotos", { babyId: baby().id, photoId });
        render();
        toast("Card photo saved 📒");
      } catch (err) { toast("Couldn’t add that photo"); }
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && sheetFn) closeSheet(); });

  function tick() {
    $$("[data-ago]").forEach((el) => (el.textContent = ago(+el.dataset.ago)));
    $$("[data-elapsed]").forEach((el) => (el.textContent = clock((now() - +el.dataset.elapsed) / 1000)));
    const b = baby();
    const t = b && (S.timers[b.id] || {}).feed;
    $$("[data-bside]").forEach((el) => {
      const s = el.dataset.bside;
      el.textContent = t ? clock(s === "T" ? bfSecs(t, "L") + bfSecs(t, "R") : bfSecs(t, s)) : "00:00";
    });
  }
  setInterval(tick, 1000);

  // Pick up changes from other tabs, and a new day after the phone wakes.
  window.addEventListener("storage", (e) => { if (e.key === KEY) { S = load(); rerender(); } });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !sheetFn) render(); });
  if (window.matchMedia) matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => render());

  render();
  setTimeout(gcPhotos, 3000);
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
