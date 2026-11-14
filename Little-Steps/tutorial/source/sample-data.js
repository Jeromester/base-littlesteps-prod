// Builds a realistic sample family for the tutorial: Sofia, born 3.5 weeks early, ~5 months old.
global.window = global.window || {};
require("D:/Docs/Little-Steps/app/js/who-data.js");
const WHO = window.WHO_LMS;
const DAY = 864e5;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pad2 = (n) => String(n).padStart(2, "0");
const ds = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const sod = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
function lmsAt(ind, mo) {
  const rows = WHO[ind + "_girls"], i = Math.floor(mo), t = mo - i, a = rows[i], b = rows[i + 1];
  return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
}
const val = ([L, M, S], z) => M * Math.pow(1 + L * S * z, 1 / L);

module.exports = function build(NOW) {
  const rnd = mulberry32(11);
  const jit = (m) => (rnd() * 2 - 1) * m * 60e3;
  let n = 0;
  const id = () => "s" + (n++).toString(36);
  const today = new Date(sod(NOW));
  const birth = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 150);
  const dayOf = (k) => new Date(birth.getFullYear(), birth.getMonth(), birth.getDate() + k);
  const noon = (d) => d.getTime() + 12 * 3600e3;
  const due = dayOf(24);

  const caregivers = [
    { id: "cg_ana", name: "Ana", relation: "Mama", role: "owner" },
    { id: "cg_marco", name: "Marco", relation: "Papa", role: "coowner" },
    { id: "cg_lourdes", name: "Lourdes", relation: "Lola", role: "caregiver" },
    { id: "cg_ben", name: "Ben", relation: "Tito", role: "viewer" },
  ].map((c) => ({ ...c, updatedAt: noon(birth), by: "cg_ana" }));

  const babies = [{ id: "baby_sofia", name: "Sofia", sex: "girl", birthDate: ds(birth), dueDate: ds(due), photoId: "p_avatar", updatedAt: noon(birth), by: "cg_ana" }];
  const B = "baby_sofia";

  // ---- daily logs, last 4 days, up to ~100 minutes ago
  const cut = NOW - 100 * 60e3;
  const logs = [];
  let nextStart = "L";
  for (let d = 3; d >= 0; d--) {
    const base = sod(NOW) - d * DAY;
    const at = (h, j = 10) => base + h * 3600e3 + jit(j);
    for (const h of [0.6, 3.6, 6.6, 9.6, 12.6, 15.6, 18.6, 21.3]) {
      const t = at(h);
      let rec;
      if (h === 12.6 || h === 15.6) rec = { type: "bottle", amount: h === 12.6 ? 120 : 90, milk: h === 12.6 ? "breastmilk" : "formula", by: "cg_lourdes" };
      else if (h === 18.6 && d % 2 === 1) rec = { type: "bottle", amount: 100, milk: "breastmilk", by: "cg_marco" };
      else {
        const both = rnd() < 0.65;
        const a = Math.round((9 + rnd() * 7) * 60), b = Math.round((6 + rnd() * 6) * 60);
        const start = nextStart, other = start === "L" ? "R" : "L";
        rec = { type: "breast", left: 0, right: 0, by: "cg_ana" };
        rec[start === "L" ? "left" : "right"] = a;
        if (both) rec[other === "L" ? "left" : "right"] = b;
        rec.lastSide = both ? other : start;
        nextStart = rec.lastSide === "L" ? "R" : "L";
      }
      if (t < cut) logs.push({ id: id(), babyId: B, time: t, note: "", ...rec, updatedAt: t });
    }
    for (const [s, e, by] of [[-2.25, 0.4, "cg_ana"], [0.9, 3.4, "cg_ana"], [3.9, 6.3, "cg_marco"], [7.2, 9.3, "cg_lourdes"], [10.3, 12.2, "cg_lourdes"], [13.3, 15.2, "cg_lourdes"], [16.6, 17.4, "cg_ana"]]) {
      const t = at(s, 8), end = at(e, 8);
      if (end < cut) logs.push({ id: id(), babyId: B, type: "sleep", time: t, end, note: "", by, updatedAt: end });
    }
    for (const [h, kind] of [[0.7, "wet"], [3.7, "wet"], [6.8, "both"], [9.8, "wet"], [12.7, "dirty"], [15.7, "wet"], [18.8, "wet"], [21.4, "wet"]]) {
      const t = at(h, 6);
      const by = h > 9 && h < 17 ? "cg_lourdes" : h > 18 ? "cg_marco" : "cg_ana";
      if (t < cut) logs.push({ id: id(), babyId: B, type: "diaper", kind, time: t, note: "", by, updatedAt: t });
    }
  }

  // ---- growth on WHO girls curves, by corrected age
  const zs = { wfa: [-0.45, -0.3, -0.15, -0.05, 0.05], lhfa: [-0.2, -0.1, 0, 0.1, 0.15], hcfa: [0.1, 0.15, 0.2, 0.2, 0.25] };
  const notes = ["1-month check-up", "2-month check-up", "3-month check-up", "4-month check-up", "Weighed at the health center"];
  const growth = [30, 61, 92, 122, 146].map((k, i) => {
    const mo = (k - 24) / 30.4375;
    const d = dayOf(k);
    return {
      id: id(), babyId: B, date: ds(d), note: notes[i],
      weight: +val(lmsAt("wfa", mo), zs.wfa[i]).toFixed(2),
      length: +val(lmsAt("lhfa", mo), zs.lhfa[i]).toFixed(1),
      head: i === 4 ? null : +val(lmsAt("hcfa", mo), zs.hcfa[i]).toFixed(1),
      by: "cg_ana", updatedAt: noon(d),
    };
  });
  const nextWeight = +(growth[4].weight + 0.11).toFixed(2);

  // ---- milestones (2 months all done; 4 months in progress)
  const ms = {};
  const mark = (mid, status, k) => (ms[mid] = { status, date: status === "yes" ? ds(dayOf(k)) : null, updatedAt: noon(dayOf(k)), by: "cg_ana" });
  ["social-0", "social-1", "social-2", "social-3", "language-0", "language-1", "thinking-0", "thinking-1", "movement-0", "movement-1", "movement-2"]
    .forEach((m, i) => mark("m2-" + m, "yes", 80 + i));
  mark("m4-social-0", "yes", 128); mark("m4-social-1", "yes", 131); mark("m4-social-2", "yes", 133);
  mark("m4-language-0", "yes", 129); mark("m4-language-1", "yes", 136); mark("m4-language-2", "working", 140);
  mark("m4-thinking-0", "yes", 138); mark("m4-thinking-1", "unsure", 141);
  mark("m4-movement-0", "yes", 132); mark("m4-movement-1", "yes", 137); mark("m4-movement-2", "working", 142); mark("m4-movement-3", "yes", 139);

  // ---- vaccines
  const vx = {};
  const give = (vid, k, place, note = "") => (vx[vid] = { given: ds(dayOf(k)), place, note, skipped: false, updatedAt: noon(dayOf(k)), by: "cg_ana" });
  give("bcg", 0, "Hospital"); give("hepb0", 0, "Hospital");
  ["dtp1", "polio1", "pcv1"].forEach((v) => give(v, 43, "Barangay health center"));
  give("rota1", 45, "Pediatrician's clinic", "2-dose brand");
  ["dtp2", "polio2", "pcv2"].forEach((v) => give(v, 72, "Barangay health center"));
  give("rota2", 73, "Pediatrician's clinic");
  ["dtp3", "polio3", "pcv3"].forEach((v) => give(v, 101, "Barangay health center", v === "dtp3" ? "Slight fever that night" : ""));
  vx.rota3 = { skipped: true, given: null, updatedAt: noon(dayOf(73)), by: "cg_ana" };

  // ---- memories
  const mem = (k, rest) => ({ id: id(), babyId: B, date: ds(dayOf(k)), caption: "", photoId: null, firstKey: null, by: "cg_ana", updatedAt: noon(dayOf(k)), ...rest });
  const memories = [
    mem(46, { firstKey: "smile", photoId: "p_smile", caption: "Right after her morning bath. Papa swears it was for him." }),
    mem(88, { firstKey: "binyag", photoId: "p_binyag", caption: "Baptized at our parish in Batangas, with all the ninongs and ninangs." }),
    mem(112, { firstKey: "laugh", photoId: "p_laugh", caption: "Lola\u2019s \u201cboo!\u201d gets her every single time." }),
    mem(141, { firstKey: "roll", photoId: "p_roll", caption: "Tummy to back on the living room mat!" }),
    mem(60, { photoId: "p_lola", caption: "First visit to Lola\u2019s house" }),
    mem(100, { photoId: "p_papa", caption: "Matching shirts with Papa", by: "cg_marco" }),
    mem(120, { caption: "Slept 6 hours straight for the first time. We didn\u2019t know what to do with ourselves." }),
  ];
  const cardPhotos = [{ id: id(), babyId: B, photoId: "p_card", by: "cg_ana", updatedAt: noon(dayOf(101)) }];

  const state = {
    version: 1,
    settings: { theme: "light", activeBabyId: B, activeCaregiverId: "cg_ana", tab: "today", lastExport: NOW - 90 * 60e3 },
    caregivers, babies, growth, logs, memories, customVaccines: [], cardPhotos,
    milestones: { [B]: ms }, vaccines: { [B]: vx }, timers: {}, deleted: {},
  };

  const photos = [
    { id: "p_avatar", emoji: "\ud83d\udc76", from: "#ffd9c7", to: "#f7b39c" },
    { id: "p_smile", emoji: "\ud83d\ude0a", from: "#ffe7c2", to: "#f9c784", label: "first smile" },
    { id: "p_binyag", emoji: "\ud83d\udd4a\ufe0f", from: "#e8f1fb", to: "#bcd5f0", label: "binyag" },
    { id: "p_laugh", emoji: "\ud83d\ude06", from: "#fff2b8", to: "#f6d365", label: "giggles" },
    { id: "p_roll", emoji: "\ud83e\udd38", from: "#dff3e8", to: "#9fd4b8", label: "she rolled!" },
    { id: "p_lola", emoji: "\ud83c\udfe1", from: "#e5f4dc", to: "#b5dca0", label: "Lola\u2019s house" },
    { id: "p_papa", emoji: "\ud83d\udc68\u200d\ud83d\udc67", from: "#ece6fb", to: "#c6b8ef", label: "twinning" },
  ];
  const cardRows = [
    ["BCG", ds(dayOf(0))], ["Hepatitis B", ds(dayOf(0))], ["Pentavalent 1", ds(dayOf(43))], ["OPV 1", ds(dayOf(43))],
    ["PCV 1", ds(dayOf(43))], ["Pentavalent 2", ds(dayOf(72))], ["OPV 2", ds(dayOf(72))], ["PCV 2", ds(dayOf(72))],
    ["Pentavalent 3", ds(dayOf(101))], ["OPV 3 + IPV", ds(dayOf(101))], ["PCV 3", ds(dayOf(101))], ["Measles", ""],
  ];
  return { state, photos, cardRows, nextWeight };
};
