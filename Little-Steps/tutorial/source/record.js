// Records a captioned tour of Little Steps with sample data → MP4.
const http = require("http"), fs = require("fs"), path = require("path"), { spawn } = require("child_process");
const { chromium } = require("playwright-core");
const ffmpegPath = require("ffmpeg-static");
const build = require("./sample-data");

const ROOT = "D:/Docs/Little-Steps/app";
const OUT_DIR = "D:/Docs/Little-Steps/tutorial";
const OUT = path.join(OUT_DIR, "little-steps-tutorial.mp4");
fs.mkdirSync(OUT_DIR, { recursive: true });
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };

const CHAPTERS = [
  ["Today at a glance", "The home screen answers the 3 a.m. question first: when did she last eat, and which side is next?"],
  ["Breastfeeding timer", "Tap a side to start. One tap switches sides. The timer keeps running even if the phone locks."],
  ["One-tap logging", "Diapers take a single tap, with Undo. Sleep is a simple start and stop."],
  ["The whole family logs", "Each entry shows who logged it: Mama, Papa or Lola. Look back through earlier days in one tap."],
  ["Milestones, gently", "Sofia was born 3\u00bd weeks early, so the app uses her corrected age. Answers are \u201cYes!\u201d, \u201cStill working on it\u201d or \u201cNot sure yet\u201d. No red, no comparisons."],
  ["Growth on WHO charts", "Measurements sit on the WHO Child Growth Standards. Parents see \u201caround the 48th percentile\u201d, never \u201cnormal\u201d or \u201cabnormal\u201d."],
  ["Memories & Firsts", "Collect the firsts, from first smile to binyag, with a photo and the story behind each one."],
  ["Vaccines, PH schedule", "Due dates follow the DOH and PPS schedule. EPI shots are free at health centers. Keep a photo of the baby book card."],
  ["Family & privacy", "Lola and the yaya can log too. Relatives can be view-only. Everything stays on the phone; a family file keeps phones in sync."],
  ["Night mode", "One tap for a warm, dim screen during night feeds. No bright white at 3 a.m."],
];

const HOST = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
:root{--ink:#3b3330;--muted:#857a72;--primary:#b65943;--soft:#fbe6de}
*{box-sizing:border-box}html,body{margin:0;height:100%;overflow:hidden;font-family:Nunito,system-ui,sans-serif;color:var(--ink)}
body{background:radial-gradient(900px 700px at 12% 18%,#fff3ea,transparent 70%),linear-gradient(135deg,#fbf6ef,#f1dfd2)}
.stage{display:flex;height:100%;align-items:center;justify-content:center;gap:96px;padding:0 80px}
.panel{width:700px}
.brand{display:flex;align-items:center;gap:14px;font-weight:800;font-size:22px;color:var(--primary);margin-bottom:64px}
.brand img{width:48px;height:48px;border-radius:14px}
.count{font-weight:800;color:var(--primary);letter-spacing:.1em;font-size:17px;text-transform:uppercase}
h1{font-size:58px;line-height:1.06;margin:12px 0 22px;font-weight:900;letter-spacing:-.01em}
p.body{font-size:27px;line-height:1.45;margin:0;color:#5d524c;min-height:160px}
.chapters{margin-top:48px;display:flex;flex-wrap:wrap;gap:8px}
.chapters span{font-size:15px;font-weight:700;padding:7px 13px;border-radius:999px;background:rgba(255,255,255,.55);color:#a0948b}
.chapters span.done{color:var(--ink)}
.chapters span.on{background:var(--primary);color:#fff}
.phone{flex:none;width:418px;height:872px;border-radius:60px;background:#2b2320;padding:14px;box-shadow:0 40px 90px rgba(90,45,20,.28),inset 0 0 0 2px #463a35}
.phone iframe{width:390px;height:844px;border:0;border-radius:46px;background:#fbf6ef;display:block}
.anim{animation:fi .55s cubic-bezier(.2,.8,.3,1)}
@keyframes fi{from{opacity:0;transform:translateY(10px)}}
.ripple{position:fixed;width:50px;height:50px;margin:-25px 0 0 -25px;border-radius:50%;background:rgba(182,89,67,.28);border:3px solid rgba(182,89,67,.9);pointer-events:none;animation:rp .75s ease-out forwards;z-index:10}
@keyframes rp{0%{transform:scale(.35);opacity:1}100%{transform:scale(1.6);opacity:0}}
.card{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:radial-gradient(900px 700px at 50% 30%,#fff3ea,transparent 70%),linear-gradient(135deg,#fbf6ef,#f1dfd2);z-index:20;transition:opacity .9s}
.card.hide{opacity:0;pointer-events:none}
.card img{width:150px;height:150px;border-radius:40px;margin-bottom:30px;box-shadow:0 20px 50px rgba(182,89,67,.2)}
.card h2{font-size:92px;margin:0;font-weight:900;letter-spacing:-.02em}
.card .tag{font-size:34px;color:var(--muted);margin:8px 0 40px}
.card .pill{font-size:22px;font-weight:800;color:var(--primary);background:#fff;padding:12px 26px;border-radius:999px}
.card .grid{display:grid;grid-template-columns:repeat(2,minmax(0,380px));gap:14px 40px;text-align:left;font-size:25px;font-weight:700;margin:6px 0 44px}
.card .grid div::before{content:"\\2713";color:#4f8a6c;font-weight:900;margin-right:12px}
</style></head><body>
<div class="stage">
  <div class="panel"><div class="brand"><img src="/icon.svg" alt="">Little Steps \u00b7 App tour</div>
    <div id="cap"></div><div class="chapters" id="chapters"></div></div>
  <div class="phone"><iframe id="phone" src="/__seed"></iframe></div>
</div>
<div class="card" id="card"><img src="/icon.svg" alt=""><h2>Little Steps</h2><p class="tag">Every little step is a big milestone.</p><span class="pill">A quick tour with sample data</span></div>
<script>
window.setCaption = (i, chapters) => {
  const [t, b] = chapters[i];
  document.getElementById('cap').innerHTML = '<div class="anim"><div class="count">' + String(i + 1).padStart(2, '0') + ' / ' + chapters.length + '</div><h1>' + t + '</h1><p class="body">' + b + '</p></div>';
  document.getElementById('chapters').innerHTML = chapters.map((c, k) => '<span class="' + (k === i ? 'on' : k < i ? 'done' : '') + '">' + c[0] + '</span>').join('');
};
window.ripple = (x, y) => { const r = document.createElement('div'); r.className = 'ripple'; r.style.left = x + 'px'; r.style.top = y + 'px'; document.body.appendChild(r); setTimeout(() => r.remove(), 900); };
window.showCard = (html) => { const c = document.getElementById('card'); if (html) c.innerHTML = html; c.classList.remove('hide'); };
window.hideCard = () => document.getElementById('card').classList.add('hide');
</script></body></html>`;

const server = http.createServer((req, res) => {
  const p0 = decodeURIComponent(req.url.split("?")[0]);
  if (p0 === "/__host") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); return res.end(HOST); }
  if (p0 === "/__seed") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); return res.end("<!doctype html><title>seed</title><body style='background:#fbf6ef'>"); }
  let p = p0.endsWith("/") ? p0 + "index.html" : p0;
  fs.readFile(path.join(ROOT, p), (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(p)] || "application/octet-stream" });
    res.end(data);
  });
});

// In-frame seeding: draws sample "photos" on canvas, stores them in IndexedDB, writes app state.
async function seedInFrame({ state, photos, cardRows }) {
  const draw = (p) => {
    const c = document.createElement("canvas"); c.width = c.height = 1000;
    const g = c.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 1000, 1000); gr.addColorStop(0, p.from); gr.addColorStop(1, p.to);
    g.fillStyle = gr; g.fillRect(0, 0, 1000, 1000);
    g.fillStyle = "rgba(255,255,255,.28)";
    [[180, 200, 140], [820, 260, 90], [760, 820, 170], [160, 840, 70]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
    g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "520px 'Segoe UI Emoji','Apple Color Emoji',sans-serif"; g.fillText(p.emoji, 500, p.label ? 450 : 520);
    if (p.label) { g.font = "italic 700 78px 'Segoe Print','Comic Sans MS',cursive"; g.fillStyle = "rgba(60,40,30,.75)"; g.fillText(p.label, 500, 860); }
    return c;
  };
  const drawCard = () => {
    const c = document.createElement("canvas"); c.width = 1000; c.height = 1250;
    const g = c.getContext("2d");
    g.fillStyle = "#e9dfd0"; g.fillRect(0, 0, 1000, 1250);
    g.save(); g.translate(500, 625); g.rotate(-0.025); g.translate(-450, -575);
    g.fillStyle = "#fffdf7"; g.shadowColor = "rgba(0,0,0,.18)"; g.shadowBlur = 30; g.fillRect(0, 0, 900, 1150); g.shadowBlur = 0;
    g.fillStyle = "#4d7fb0"; g.fillRect(0, 0, 900, 120);
    g.fillStyle = "#fff"; g.font = "800 50px Segoe UI, sans-serif"; g.textAlign = "center"; g.fillText("Immunization Record", 450, 78);
    g.textAlign = "left"; g.fillStyle = "#333"; g.font = "600 34px Segoe UI, sans-serif";
    g.fillText("Name: ", 50, 190); g.fillText("Vaccine", 50, 275); g.fillText("Date given", 540, 275);
    g.font = "italic 600 40px 'Segoe Print', cursive"; g.fillStyle = "#1f3f8a"; g.fillText("Sofia", 160, 190);
    g.strokeStyle = "#b9c7d6"; g.lineWidth = 2;
    cardRows.forEach(([v, d], i) => {
      const y = 330 + i * 66;
      g.beginPath(); g.moveTo(40, y + 20); g.lineTo(860, y + 20); g.stroke();
      g.fillStyle = "#333"; g.font = "500 32px Segoe UI, sans-serif"; g.fillText(v, 50, y);
      if (d) { g.fillStyle = "#1f3f8a"; g.font = "italic 600 32px 'Segoe Print', cursive"; g.fillText(d, 540, y); }
    });
    g.restore();
    return c;
  };
  const blob = (c) => new Promise((r) => c.toBlob(r, "image/jpeg", 0.88));
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open("littlesteps-photos", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("photos");
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  const entries = [];
  for (const p of photos) entries.push([p.id, await blob(draw(p))]);
  entries.push(["p_card", await blob(drawCard())]);
  await new Promise((res, rej) => {
    const t = db.transaction("photos", "readwrite");
    entries.forEach(([k, b]) => t.objectStore("photos").put(b, k));
    t.oncomplete = res; t.onerror = () => rej(t.error);
  });
  db.close();
  localStorage.setItem("littlesteps:v1", JSON.stringify(state));
}

(async () => {
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.2, serviceWorkers: "block" });
  await ctx.clock.install({ time: new Date() });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto(base + "/__host");
  await page.evaluate(() => document.fonts.ready);

  // --- screen capture → ffmpeg (30 fps, wall-clock timed)
  const ff = spawn(ffmpegPath, ["-y", "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", "30", "-i", "-",
    "-vf", "scale=1920:1080:flags=lanczos,format=yuv420p", "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-movflags", "+faststart", OUT],
    { stdio: ["pipe", "ignore", "pipe"] });
  let ffErr = ""; ff.stderr.on("data", (d) => (ffErr = (ffErr + d).slice(-2000)));
  const cdp = await ctx.newCDPSession(page);
  let latest = null, written = 0, t0 = 0, recording = false;
  cdp.on("Page.screencastFrame", async (f) => {
    latest = Buffer.from(f.data, "base64");
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  const pump = setInterval(() => {
    if (!recording || !latest) return;
    const due = Math.floor((Date.now() - t0) / (1000 / 30));
    while (written < due) { ff.stdin.write(latest); written++; }
  }, 15);
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080 });

  const wait = (ms) => page.waitForTimeout(ms);
  const iframe = page.frameLocator("#phone");
  const frame = page.frames().find((f) => f !== page.mainFrame());
  const caption = (i) => page.evaluate(([i, c]) => window.setCaption(i, c), [i, CHAPTERS]);
  async function tap(sel, after = 1000) {
    const loc = iframe.locator(sel).first();
    await loc.evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    await wait(450);
    const b = await loc.boundingBox();
    await page.evaluate(([x, y]) => window.ripple(x, y), [b.x + b.width / 2, b.y + b.height / 2]);
    await wait(320);
    await loc.click();
    await wait(after);
  }
  const scrollTo = async (y, after = 1400) => { await frame.evaluate((y) => window.scrollTo({ top: y, behavior: "smooth" }), y); await wait(after); };
  const scrollEl = async (sel, after = 1400) => { await frame.evaluate((s) => document.querySelector(s).scrollIntoView({ behavior: "smooth", block: "start" }), sel); await wait(after); };
  const sheetScroll = async (y, after = 1400) => { await frame.evaluate((y) => document.querySelector(".sheet").scrollTo({ top: y, behavior: "smooth" }), y); await wait(after); };
  const ff_ = (t) => ctx.clock.fastForward(t);

  // --- intro card while seeding
  t0 = Date.now(); recording = true;
  const data = build(Date.now());
  await frame.evaluate(seedInFrame, data);
  await frame.goto(base + "/");
  await iframe.locator(".topbar").waitFor();
  await frame.evaluate(() => document.fonts.ready);
  await wait(3200);
  await caption(0);
  await page.evaluate(() => window.hideCard());
  await wait(4200);

  // 1 — Today
  await scrollTo(330, 2200);
  await scrollTo(0, 1800);

  // 2 — Breastfeeding timer
  await caption(1); await wait(1500);
  await tap('.qa[data-action="breast"]', 1500);
  await tap('.bf-side[data-side="L"]', 1800);
  await ff_("08:40"); await wait(1500);
  await tap('.bf-side[data-side="R"]', 1600);
  await ff_("05:10"); await wait(1500);
  await tap('[data-action="bf-save"]', 2600);

  // 3 — One-tap logging
  await caption(2); await wait(1500);
  await tap('.diaper-btns [data-kind="wet"]', 2600);
  await tap('.qa[data-action="sleep-start"]', 1800);
  await ff_("47:00"); await wait(2200);
  await tap('.qa[data-action="wake"]', 2600);

  // 4 — Family log
  await caption(3); await wait(800);
  await scrollEl(".day", 2600);
  await scrollTo(1400, 2600);
  await tap('.day-nav [data-d="-1"]', 2200);
  await scrollEl(".day", 2400);
  await tap('.day-nav [data-d="1"]', 1200);
  await scrollTo(0, 1200);

  // 5 — Milestones
  await caption(4);
  await tap('.tabbar [data-tab="milestones"]', 3200);
  await scrollTo(1500, 2200);
  await scrollEl('.ms-item:has(button[data-id="m4-movement-4"])', 1400);
  await tap('button[data-id="m4-movement-4"][data-v="yes"]', 2600);
  await scrollTo(0, 1200);
  await tap('.chip[data-m="6"]', 2600);
  await tap('.chip[data-m="4"]', 1200);

  // 6 — Growth
  await caption(5);
  await tap('.tabbar [data-tab="growth"]', 3600);
  await tap('.seg-tabs [data-ind="lhfa"]', 2400);
  await tap('.seg-tabs [data-ind="hcfa"]', 2400);
  await tap('.seg-tabs [data-ind="wfa"]', 1200);
  await tap('[data-action="add-growth"]', 1200);
  const w = iframe.locator('.sheet [name="weight"]');
  await page.evaluate(([x, y]) => window.ripple(x, y), await w.boundingBox().then((b) => [b.x + b.width / 2, b.y + b.height / 2]));
  await w.click(); await w.pressSequentially(String(data.nextWeight), { delay: 140 });
  await wait(700);
  await tap('.sheet button.primary', 3000);
  await scrollEl(".note-card", 2600);
  await scrollTo(0, 800);

  // 7 — Memories
  await caption(6);
  await tap('.tabbar [data-tab="memories"]', 3000);
  await scrollTo(380, 2000);
  await tap('.first-card[data-key="binyag"]', 3400);
  await tap(".sheet-x", 1000);
  await scrollTo(0, 900);
  await tap('.seg-tabs [data-t="all"]', 2800);
  await scrollTo(500, 2200);
  await scrollTo(0, 800);
  await tap('.seg-tabs [data-t="firsts"]', 600);

  // 8 — Vaccines
  await caption(7);
  await tap('.tabbar [data-tab="health"]', 3400);
  await scrollTo(650, 2400);
  await scrollEl('.vax-row[data-id="flu1"]', 1200);
  await tap('.vax-row[data-id="flu1"]', 2800);
  await tap(".sheet-x", 900);
  await frame.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
  await wait(2000);
  await tap(".photo-thumb:not(.add)", 3200);
  await tap(".sheet-x", 900);
  await scrollTo(0, 600);

  // 9 — Family & privacy
  await caption(8);
  await tap('.tabbar [data-tab="today"]', 1000);
  await tap('[data-action="settings"]', 2400);
  await sheetScroll(330, 3000);
  await sheetScroll(560, 2600);
  const sel = iframe.locator('select[data-change="set-me"]');
  await page.evaluate(([x, y]) => window.ripple(x, y), await sel.boundingBox().then((b) => [b.x + b.width / 2, b.y + b.height / 2]));
  await wait(300);
  await sel.selectOption("cg_ben"); await wait(1200);
  await tap(".sheet-x", 2800);
  await scrollTo(300, 2000);
  await scrollTo(0, 600);
  await tap('[data-action="settings"]', 900);
  await sel.selectOption("cg_ana"); await wait(600);
  await sheetScroll(2000, 2800);
  await tap(".sheet-x", 800);

  // 10 — Night mode
  await caption(9); await wait(1200);
  await tap('[data-action="toggle-night"]', 2600);
  await tap('.qa[data-action="breast"]', 2800);
  await tap(".sheet-x", 1000);
  await tap('.tabbar [data-tab="growth"]', 2600);
  await tap('.tabbar [data-tab="memories"]', 2600);

  // outro
  await page.evaluate(() => window.showCard(`<img src="/icon.svg" alt=""><h2>Little Steps</h2><p class="tag">Every little step is a big milestone.</p>
    <div class="grid"><div>Baby profiles with corrected age</div><div>Feeding, sleep &amp; diaper log</div><div>Gentle milestone tracker</div><div>WHO growth charts</div>
    <div>Memories &amp; Firsts Collection</div><div>Philippine vaccine schedule</div><div>Shared family caregiving</div><div>Night mode \u00b7 works offline</div></div>
    <span class="pill">Version 1</span>`));
  await wait(6000);

  recording = false;
  clearInterval(pump);
  await cdp.send("Page.stopScreencast");
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  await browser.close();
  server.close();
  console.log("frames:", written, "seconds:", (written / 30).toFixed(1));
  console.log("page errors:", errors.length ? errors : "none");
  console.log(fs.existsSync(OUT) ? `saved ${OUT} (${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB)` : "NO OUTPUT\n" + ffErr);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
