const { useState, useEffect, useRef, createContext, useContext } = React;

/* ---------- settings & small helpers ---------- */
const Ctx = createContext(null);
const useApp = () => useContext(Ctx);
const store = {
  get(k, d) { try { const v = localStorage.getItem("sambodhaya-" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("sambodhaya-" + k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem("sambodhaya-" + k); } catch (e) {} },
};
const IMG = { bg: "img/temple-bg.webp", dog: "img/temple-dog.jpg", entrance: "img/entrance.jpg", world: "img/world-preview.jpg" };

// UI wording (not teaching). Thai first; English is a draft.
const UI = (th, en) => ({ th, en });

/* ---------- sound: only ever started by the visitor ---------- */
let ac = null;
const audio = () => { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); } catch (e) {} return ac; };
function ringBell(muted) {
  const a = audio(); if (!a || muted) return;
  const t = a.currentTime;
  [[220, 0.5], [440, 0.22], [661, 0.12], [1102, 0.06]].forEach(([f, v]) => {
    const o = a.createOscillator(), g = a.createGain();
    o.type = "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * 0.5, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 6);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + 6.1);
  });
}
let calm = null;
function startCalm() {
  const a = audio(); if (!a || calm) return;
  const len = a.sampleRate * 4, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
  const src = a.createBufferSource(); src.buffer = buf; src.loop = true;
  const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 700;
  const g = a.createGain(); g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(0.18, a.currentTime + 2);
  src.connect(f).connect(g).connect(a.destination); src.start(); calm = { src, g };
}
function stopCalm() { if (!calm || !ac) return; const { src, g } = calm; g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.8); setTimeout(() => { try { src.stop(); } catch (e) {} }, 900); calm = null; }
function readAloud(text, lang) {
  try { const ss = window.speechSynthesis; if (!ss) return false; ss.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = lang === "th" ? "th-TH" : "en-US"; u.rate = lang === "th" ? 0.95 : 1; const v = ss.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith(lang)); if (v) u.voice = v; ss.speak(u); return true; } catch (e) { return false; }
}
// Each lesson's short story is recorded (audio/u01-th.mp3 …, an AI voice: "Mark", MiniMax); if a recording can't be
// played, the device's own voice reads it instead.
let voiceEl = null;
function playVoice(code, lang, text) {
  hush();
  const a = new Audio(`audio/${code.toLowerCase()}-${lang}.mp3`); voiceEl = a;
  const fallback = () => { if (voiceEl === a) { voiceEl = null; readAloud(text, lang); } };
  a.onerror = fallback; a.play().catch(fallback);
}
function hush() { try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {} if (voiceEl) { voiceEl.pause(); voiceEl = null; } stopCalm(); }

/* ---------- labels: 📜 source · 📝 translation · 💡 explanation · 🕯️ not yet known ---------- */
const KIND = {
  source: { icon: "📜", th: "ต้นทางกล่าวไว้", en: "From the source" },
  translation: { icon: "📝", th: "คำแปล", en: "Translation" },
  explain: { icon: "💡", th: "คำอธิบายของวัด", en: "Our explanation" },
  unknown: { icon: "🕯️", th: "ยังไม่แน่ / รอตรวจ", en: "Not yet certain / under review" },
  draft: { icon: "📝", th: "ร่างคำแปลโดย AI ยังไม่ได้ตรวจ", en: "Draft AI translation, not yet reviewed" },
};
function Tag({ kind }) {
  const { lang } = useApp(); const k = KIND[kind];
  return <span className={"tag tag-" + kind}><span aria-hidden="true">{k.icon}</span> {k[lang]}</span>;
}
// Teaching text: Thai is the reviewed child copy; English shows as an unreviewed draft.
function Teach({ text, kind = "explain", block }) {
  const { lang } = useApp();
  const El = block ? "div" : "p";
  return (
    <El className={"teach k-" + kind}>
      <span className="teach-tags"><Tag kind={kind} />{lang === "en" && <Tag kind="draft" />}</span>
      <span className="teach-text" lang={lang}>{text[lang]}</span>
    </El>
  );
}
function Listen({ text, code }) {
  const { lang, t, settings } = useApp();
  return <button className="chip" disabled={settings.mute} onClick={() => (code ? playVoice(code, lang, text) : readAloud(text, lang))}><span aria-hidden="true">🎧</span> {t(code ? UI("ฟัง", "Listen") : UI("ฟัง (เสียงจากเครื่อง)", "Listen (device voice)"))}</button>;
}
const VOICE_NOTE = UI("เสียงอ่านนี้เป็นเสียง AI ยังไม่ใช่เสียงพากย์ที่ตรวจแล้ว", "This reading is an AI voice, not yet a reviewed narration.");

/* ---------- the temple dog: scripted directions only, never teaching ---------- */
function Dog({ say, children }) {
  const { settings, t } = useApp();
  if (!settings.guide) return null;
  return (
    <div className="dog">
      {!settings.textOnly && <img className="dog-img" src={IMG.dog} alt={t(UI("หมาวัด", "The temple dog"))} width="160" height="160" />}
      <div className="dog-bubble">
        <span className="dog-name"><span aria-hidden="true">🐕</span> {t(UI("หมาวัด", "Temple dog"))}</span>
        <p>{t(say)}</p>
        {children}
      </div>
    </div>
  );
}

/* ---------- persistent wayfinding: always back to courtyard, help, access, exit ---------- */
// Opened from the 3D temple (?from=3d)? Then the way back leads there, to the spot you left.
const FROM_3D = new URLSearchParams(location.search).get("from") === "3d";
function Wayfinding() {
  const { go, t, view } = useApp();
  return (
    <nav className="wayfinding" aria-label={t(UI("ทางในวัด", "Temple paths"))}>
      {FROM_3D && <a className="way" href="world.html?return=1"><span aria-hidden="true">↩️🏯</span> {t(UI("กลับวัด 3 มิติ", "Back to the 3D temple"))}</a>}
      {!FROM_3D && view !== "gate" && view !== "yard" && <button className="way" onClick={() => go("yard")}><span aria-hidden="true">↩️🌳</span> {t(UI("กลับลานกลาง", "Back to courtyard"))}</button>}
      <button className="way" onClick={() => go("access")}><span aria-hidden="true">🌍♿</span> {t(UI("ภาษา • การเข้าถึง", "Language • Access"))}</button>
      <button className="way" onClick={() => go("care")}><span aria-hidden="true">🤝</span> {t(UI("ขอความช่วยเหลือ", "Ask for help"))}</button>
      <button className="way exit" onClick={() => go("exit")}><span aria-hidden="true">🚪</span> {t(UI("ออกจากวัด", "Leave the temple"))}</button>
    </nav>
  );
}

function Prototype() {
  const { t } = useApp();
  return <p className="proto" role="note"><span aria-hidden="true">🕯️</span> {t(UI("ต้นแบบ · วัดนี้ยังไม่เปิดใช้สาธารณะ เนื้อหาบางส่วนยังรอตรวจ และยังไม่ได้ทดสอบกับเด็กจริง", "Prototype · this temple is not yet open to the public. Some content is still under review and it has not yet been tested with real children."))}</p>;
}

/* ---------- 🚪 Entrance: the illustrated temple with clickable areas ---------- */
// Hotspots in % of the 1280×853 entrance artwork (img/entrance.jpg, used unchanged).
const HOTSPOTS = [
  { to: "library", pin: "📚", l: 5.2, tp: 27.7, w: 12.0, h: 11.0, label: UI("ห้องสมุด · หอหลักฐาน: รู้ว่ามาจากไหน", "Library · Evidence Hall: where things come from") },
  { to: "learn", pin: "🧘", l: 29.4, tp: 28.8, w: 11.2, h: 9.9, label: UI("ศาลาเรียนรู้: เรียน ฝึก และสังเกต", "Learning Hall: learn, practise and observe") },
  { to: "media", pin: "🎬", l: 59.9, tp: 29.1, w: 13.4, h: 9.7, label: UI("ศาลาสื่อ: อ่าน ฟัง หรือดู", "Media Hall: read, listen or watch") },
  { to: "access", pin: "🌍", l: 84.9, tp: 27.9, w: 13.7, h: 10.8, label: UI("ศาลาสากล: หลายภาษาและการเข้าถึง", "Universal Hall: languages and access") },
  { to: "yard", pin: "🌳", l: 43.4, tp: 40.9, w: 13.5, h: 7.6, label: UI("ลานกลาง: อยากไปไหนวันนี้?", "Central Courtyard: where would you like to go today?") },
  { to: "rest", pin: "🪷", l: 5.8, tp: 48.5, w: 14.2, h: 11.0, label: UI("พื้นที่พัก: พักใจได้เสมอ", "Rest Area: rest any time") },
  { to: "care", pin: "🤝", l: 81.4, tp: 48.2, w: 15.3, h: 12.1, label: UI("ผู้ดูแลวัดและผู้ช่วย AI", "Temple caretaker and AI helper") },
  { to: "yard", pin: "🐕", l: 34.9, tp: 62.4, w: 13.1, h: 24.6, label: UI("หมาวัด: ไม่รู้จะไปไหน ถามผมได้เลย", "Temple dog: not sure where to go? Ask me") },
  { to: "yard", l: 49.1, tp: 60.1, w: 13.8, h: 14.4, label: UI("หมาวัด: ไม่รู้จะไปไหน ถามผมได้เลย", "Temple dog: not sure where to go? Ask me"), dup: true },
  { to: "yard", pin: "🚪", pinPos: "top", l: 19.1, tp: 57.4, w: 9.2, h: 31.7, label: UI("เข้าวัด", "Enter the temple") },
  { to: "exit", pin: "🚪", pinPos: "top", l: 71.9, tp: 57.4, w: 9.2, h: 31.7, label: UI("ออกจากวัด", "Leave the temple") },
];
const HUBS = [
  { to: "yard", thumb: "img/hubs/yard.jpg", icon: "🌳", name: UI("ลานกลาง", "Central Courtyard"), sub: UI("อยากไปไหนวันนี้?", "Where would you like to go today?") },
  { to: "learn", thumb: "img/hubs/learn.jpg", icon: "🧘", name: UI("ศาลาเรียนรู้", "Learning Hall"), sub: UI("เรียน ฝึก และสังเกตไปทีละก้าว", "Learn, practise and observe, one step at a time") },
  { to: "library", thumb: "img/hubs/library.jpg", icon: "📚", name: UI("หอหลักฐาน · ห้องสมุด", "Evidence Library"), sub: UI("ดูต้นทาง หลักฐาน และสถานะการตรวจ", "Sources, evidence and checking status") },
  { to: "garden", icon: "🌿", name: UI("สวนสังเกตใจ", "Practice Garden"), sub: UI("กาย • ความรู้สึก • จิต • ธรรม", "Body • feelings • mind • Dhamma") },
  { to: "journey", icon: "👣", name: UI("เส้นทางของฉัน", "My Journey"), sub: UI("ตามรอยเรื่องของพระพุทธเจ้าทีละก้าว", "Follow the Buddha's story step by step") },
  { to: "media", thumb: "img/hubs/media.jpg", icon: "📖🎧🎬", name: UI("ศาลาสื่อ", "Media Hall"), sub: UI("อ่าน ฟัง หรือดู", "Read, listen or watch") },
  { to: "access", thumb: "img/hubs/access.jpg", icon: "🌍♿", name: UI("ศาลาสากล", "Universal Hall"), sub: UI("หลายภาษาและการเข้าถึง", "Languages and access") },
  { to: "rest", thumb: "img/hubs/rest.jpg", icon: "🪷", name: UI("พื้นที่พัก", "Rest Area"), sub: UI("พักใจได้เสมอ", "Rest any time") },
  { to: "care", thumb: "img/hubs/care.jpg", icon: "🤝", name: UI("ผู้ดูแลวัดและหมาวัด", "Caretaker & temple dog"), sub: UI("มีคำถาม หรืออยากให้ช่วย", "Questions, or need a hand") },
];
function Gate() {
  const { go, t, settings } = useApp();
  return (
    <section className="gate">
      <h1 className="sr-only">{t(UI("วัดสัมโพธายะออนไลน์", "Wat Sambodhaya Online"))}</h1>
      {!settings.textOnly && (
        <div className="temple-map">
          <img src={IMG.entrance} width="1280" height="853"
            alt={t(UI("ภาพวัดสัมโพธายะออนไลน์: ประตูไม้สองบานเปิดเข้าสู่ลานกลางที่มีต้นไม้ใหญ่ ศาลาโดยรอบมีป้าย ห้องสมุด ศาลาเรียนรู้ ศาลาสื่อ ศาลาสากล พื้นที่พัก และผู้ดูแลวัด หมาวัดนั่งรอต้อนรับที่ทางเดิน",
              "Wat Sambodhaya Online: two wooden gates open onto a courtyard with a great tree. Around it, signs mark the Library, Learning Hall, Media Hall, Universal Hall, Rest Area and Caretaker. The temple dog waits on the path to welcome you."))} />
          {HOTSPOTS.map((h, k) => (
            <button key={k} className="hotspot" style={{ left: h.l + "%", top: h.tp + "%", width: h.w + "%", height: h.h + "%" }}
              onClick={() => go(h.to)} aria-label={t(h.label)} title={t(h.label)} tabIndex={h.dup ? -1 : 0} aria-hidden={h.dup ? "true" : undefined}>
              {h.pin && <span className={"pin" + (h.pinPos === "top" ? " pin-top" : "")} aria-hidden="true">{h.pin}</span>}
            </button>
          ))}
          {/* the 3D temple, right on the hero: a clear second way in */}
          <a className="hero-3d" href="world.html"><img src={IMG.world} alt="" width="96" height="60" /><span>🏯 {t(UI("เดินในวัดแบบ 3 มิติ", "Walk the temple in 3D"))} →</span></a>
        </div>
      )}
      {/* two equal ways in: the pages, or walking the temple in 3D */}
      <h2 className="ways-title">{t(UI("เข้าวัดแบบไหนดี?", "How would you like to come in?"))}</h2>
      <div className="ways-in">
        <button className="way-card" onClick={() => go("yard")}>
          {!settings.textOnly ? <img className="way-img" src={IMG.bg} alt="" width="480" height="300" /> : <span className="way-icon" aria-hidden="true">🚪</span>}
          <span className="way-text">
            <span className="way-name">🚪 {t(UI("เข้าวัด", "Enter the temple"))} →</span>
            <span className="way-sub">{t(UI("อ่าน ฟัง และเลือกไปทีละศาลา ใช้ได้ทุกเครื่อง", "Read, listen and choose one hall at a time. Works on every device."))}</span>
          </span>
        </button>
        <a className="way-card way-3d" href="world.html">
          {!settings.textOnly ? <img className="way-img" src={IMG.world} alt="" width="480" height="300" /> : <span className="way-icon" aria-hidden="true">🏯</span>}
          <span className="way-text">
            <span className="way-name">🏯 {t(UI("เดินในวัดแบบ 3 มิติ", "Walk the temple in 3D"))} →</span>
            <span className="way-sub">{t(UI("เดินเอง ไหว้พระ นั่งสมาธิ ใส่บาตร กับหมาวัด • ต้นแบบ ใช้กับเครื่องรุ่นใหม่ได้ดีที่สุด เสียงปิดอยู่จนกว่าจะเปิดเอง", "Walk around yourself: wai, sit, give alms, with the temple dog • a prototype; best on newer devices; sound stays off until you turn it on"))}</span>
          </span>
        </a>
      </div>
      <div className="gate-actions">
        <button className="bell" onClick={() => ringBell(settings.mute)}>
          <span aria-hidden="true">🔔</span> {t(UI("ฟังเสียงระฆัง", "Ring the bell"))}
          <span className="bell-note">{t(UI("เลือกกดเองได้ • ไม่เปิดเอง", "Only if you press it • never plays by itself"))}</span>
        </button>
      </div>
      <h2 className="hubs-title">{t(UI("อยากไปไหนวันนี้?", "Where would you like to go today?"))}</h2>
      <ul className="hubs">
        {HUBS.map((h) => (
          <li key={h.to}><button className="hub" onClick={() => go(h.to)}>
            {h.thumb && !settings.textOnly ? <img className="hub-thumb" src={h.thumb} alt="" width="270" height="180" loading="lazy" /> : <span className="hub-icon" aria-hidden="true">{h.icon}</span>}
            <span className="hub-text"><span className="hub-name">{t(h.name)}</span><span className="hub-sub">{t(h.sub)}</span></span>
          </button></li>
        ))}
      </ul>
      <p className="quiet center">{t(UI("ไม่ต้องสมัคร • ไม่ต้องตอบคำถาม • อยากเดินดูเฉย ๆ ก็ได้", "No sign-up • no questions to answer • just looking around is fine"))}</p>
      <p className="rights center">{t(UI("ที่นี่คุณ ถามได้ • ไม่เชื่อได้ • ตรวจได้ • ข้ามได้ • พักได้ • ออกได้", "Here you may ask • disagree • check • skip • rest • leave"))}</p>
      <p className="privacy center">{t(UI("วัดนี้ไม่ขอชื่อ และไม่เก็บข้อมูลส่วนตัว การตั้งค่าภาษาและตัวอักษรจำไว้ในเครื่องนี้เท่านั้น", "This temple doesn't ask your name or keep personal data. Language and text settings are remembered on this device only."))}</p>
    </section>
  );
}

/* ---------- 🌳 Courtyard ---------- */
const ZONES = HUBS.filter((h) => h.to !== "yard");
function Yard() {
  const { go, t, settings, trail, clearTrail } = useApp();
  const [explore, setExplore] = useState(false);
  const four = [
    { icon: "💭", label: UI("อยากรู้เรื่องหนึ่ง", "I'm curious about something"), to: "learn" },
    { icon: "🎬", label: UI("อยากดูหรือฟังอะไร", "I'd like to watch or listen"), to: "media" },
    { icon: "🌿", label: UI("อยากพัก", "I'd like to rest"), to: "rest" },
    { icon: "👀", label: UI("เดินดูเอง", "I'll look around myself"), to: null },
  ];
  return (
    <section className="yard">
      <div className="yard-scene" style={settings.textOnly ? null : { backgroundImage: `url(${IMG.bg})` }}>
        <h1 className="zone-title"><span aria-hidden="true">🌳</span> {t(UI("ลานกลางวัดสัมโพธายะ", "The Central Courtyard"))}</h1>
      </div>
      <Dog say={UI("สวัสดี วันนี้อยากไปทางไหน?", "Hello! Where would you like to go today?")} />
      {!settings.guide && <h2 className="ask">{t(UI("อยากไปไหนวันนี้?", "Where would you like to go today?"))}</h2>}
      <div className="four">
        {four.map((c, k) => (
          <button key={k} className={"tile" + (c.to == null && explore ? " on" : "")} onClick={() => (c.to ? go(c.to) : setExplore(!explore))} aria-expanded={c.to == null ? explore : undefined}>
            <span className="tile-icon" aria-hidden="true">{c.icon}</span><span>{t(c.label)}</span>
          </button>
        ))}
      </div>
      <p className="quiet center">{t(UI("ไม่มีคำตอบผิด และไม่เลือกอะไรเลยก็ได้", "There's no wrong answer, and choosing nothing is fine too."))}</p>
      {explore && (
        <div className="signposts" aria-label={t(UI("พื้นที่ในวัด", "Places in the temple"))}>
          {ZONES.map((z) => (
            <button key={z.to} className="sign" onClick={() => go(z.to)}>
              <span className="sign-icon" aria-hidden="true">{z.icon}</span>
              <span className="sign-name">{t(z.name)}</span>
              <span className="sign-want">{t(z.sub)}</span>
            </button>
          ))}
        </div>
      )}
      {trail.length > 0 && (
        <div className="footprints-home">
          <h2><span aria-hidden="true">👣</span> {t(UI("รอยเท้าที่คุณเคยเดิน", "Footprints you've walked"))}</h2>
          <p className="quiet">{t(UI("ไม่ใช่คะแนน และไม่ได้บอกว่าใครเก่งกว่าใคร เป็นเพียงทางที่คุณเคยไป", "Not a score, and it doesn't say anyone is better. Just the paths you have taken."))}</p>
          <ol className="trail">{trail.map((f, k) => <li key={k}><button onClick={() => go("unit", f.u)}>{f.code} · {t(UNITS[f.u].title)}</button></li>)}</ol>
          <button className="chip" onClick={clearTrail}>{t(UI("ลบรอยเท้าออกจากเครื่องนี้", "Clear footprints from this device"))}</button>
        </div>
      )}
    </section>
  );
}

/* ---------- 🧘 Learning hall: start from a question ---------- */
function Learn() {
  const { go, t } = useApp();
  return (
    <section className="zone">
      <h1 className="zone-title"><span aria-hidden="true">🧘</span> {t(UI("ศาลาเรียนรู้และฝึก", "Hall of Learning and Practice"))}</h1>
      <p className="lede">{t(UI("มาเรียนรู้ทีละเรื่องกัน", "Let's learn one story at a time."))}</p>
      <p>{t(UI("ไม่ต้องทำให้ครบในครั้งเดียว ไม่เข้าใจก็ถามได้ และพักเมื่อไรก็ได้", "You don't have to finish everything at once. If something is unclear you can ask, and you can rest whenever you like."))}</p>
      <p className="cycle">{t(UI("เรียนรู้ → ลองฝึก → สังเกต → กลับไปใช้ในชีวิตจริง", "Learn → try → observe → take it back into real life"))}</p>
      <Dog say={UI("เลือกคำถามที่อยากรู้ได้เลย ไม่ต้องเริ่มจากเรื่องแรก", "Pick any question you're curious about. You don't have to start with the first one.")} />
      <h2>{t(UI("เริ่มจากคำถาม", "Start from a question"))}</h2>
      <ol className="questions">
        {UNITS.map((u, k) => (
          <li key={u.code}>
            <button className="q-card" onClick={() => go("unit", k)}>
              <span className="q-text">{u.question ? t(u.question) : t(u.title)}</span>
              <span className="q-meta">{u.code} · {t(u.title)}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="quiet">{t(UI("คำถามของ U08 ยังไม่มีใน Child Output Records จึงแสดงเพียงชื่อเรื่อง", "U08 has no child question in the Child Output Records yet, so only its topic is shown."))} <Tag kind="unknown" /></p>
      <div className="step">
        <h2><span aria-hidden="true">💬</span> {t(UI("คุยคำถามกับพระหรือครู", "Talk a question through with a monk or teacher"))}</h2>
        <p><Tag kind="unknown" /> {t(UI("ยังไม่เปิดในต้นแบบนี้ เมื่อเปิดแล้ว การสนทนาจะอยู่ภายใต้กฎความเป็นส่วนตัวและความปลอดภัยของเด็ก", "Not open in this prototype. When it opens, conversations will follow the temple's privacy and child-safety rules."))}</p>
      </div>
    </section>
  );
}

/* ---------- Evidence passport ---------- */
function Passport({ unit, srcKey, onClose }) {
  const { t } = useApp();
  const s = SOURCES[srcKey];
  const use = unit.sources.find((x) => x.key === srcKey);
  return (
    <div className="passport" role="dialog" aria-label={t(UI("หนังสือเดินทางหลักฐาน", "Evidence Passport"))}>
      <div className="pp-head"><span aria-hidden="true">👣📜</span> <strong>{t(UI("หนังสือเดินทางหลักฐาน", "Evidence Passport"))}</strong><button className="chip" onClick={onClose}>{t(UI("ปิด", "Close"))}</button></div>
      <dl>
        <dt>{t(UI("ต้นทาง", "Source"))}</dt><dd><strong>{s.id}</strong> · {s.pali}<br />{s.th}</dd>
        <dt>{t(UI("ใช้ในเรื่องนี้", "Used here"))}</dt><dd>{use ? use.use : "—"}</dd>
        <dt>{t(UI("บาลี", "Pāli"))}</dt><dd><Tag kind="unknown" /> {t(UI("ยังไม่ได้เชื่อม", "Not yet connected"))}</dd>
        <dt>{t(UI("คำแปล", "Translation"))}</dt><dd><Tag kind="unknown" /> {t(UI("ยังไม่ได้เชื่อม", "Not yet connected"))}</dd>
        <dt>{t(UI("ผู้พูด", "Speaker"))}</dt><dd><Tag kind="unknown" /> {t(UI("ดูได้ใน Source Record ซึ่งยังไม่ได้เชื่อมกับต้นแบบนี้", "Shown in the Source Record, which is not yet connected to this prototype"))}</dd>
        <dt>{t(UI("ข้อความต้นทางเต็ม", "Full source text"))}</dt><dd><Tag kind="unknown" /> {t(UI("ยังไม่ได้เชื่อมห้องสมุดสัมโพธายะในต้นแบบนี้ เราจึงยังไม่แสดงข้อความต้นทาง แทนที่จะเดา", "The Sambodhaya Library is not yet connected to this prototype, so the source text isn't shown rather than guessed."))}</dd>
        <dt>{t(UI("สถานะของเรื่อง", "Status of this story"))}</dt><dd><code>{unit.status}</code></dd>
      </dl>
    </div>
  );
}

/* ---------- one story (U01–U08): the five-minute pattern ---------- */
function Unit({ k }) {
  const { go, t, lang, addTrail, trail, setSeed } = useApp();
  const u = UNITS[k];
  const [opened, setOpened] = useState(null);
  const [steps, setSteps] = useState({ story: true });
  const [mirror, setMirror] = useState("");
  const [choice, setChoice] = useState(null);
  const [answers, setAnswers] = useState({});
  const mark = (s) => setSteps((x) => ({ ...x, [s]: true }));
  useEffect(() => { addTrail(k); }, [k]);
  const open = (key) => { setOpened(key); mark("source"); };
  return (
    <section className="zone unit">
      <p className="crumb"><button className="link" onClick={() => go("learn")}>🧘 {t(UI("ศาลาเรียนรู้", "Learning hall"))}</button> › {u.code}</p>
      <h1 className="zone-title">{t(u.title)}</h1>
      {u.question && <p className="unit-q"><span aria-hidden="true">💭</span> {t(u.question)}</p>}

      <div className="step">
        <h2><span aria-hidden="true">🕯️</span> 1 · {t(UI("เรื่องสั้น", "The short story"))}</h2>
        <Teach text={u.simple} block />
        <div className="row"><Listen text={t(u.simple)} code={u.code} /><button className="chip" onClick={hush}>⏸️ {t(UI("หยุด", "Stop"))}</button></div>
        <p className="quiet"><Tag kind="unknown" /> {t(VOICE_NOTE)}</p>
        {u.safety && <div className="safety" role="note"><strong>{t(UI("เรื่องนี้เป็นประวัติเท่านั้น ไม่ใช่สิ่งที่ให้ทำตาม", "This is history only, not something to copy"))}</strong><span>{t(u.safety)}</span></div>}
      </div>

      <div className="step">
        <h2><span aria-hidden="true">📖👣</span> 2 · {t(UI("เปิดต้นทาง", "Open the source"))}</h2>
        <p>{t(UI("อยากรู้ว่ามาจากไหน? ตามรอยกลับไปดูได้", "Want to know where it comes from? Follow the footprints back."))}</p>
        <div className="row">{u.sources.map((s) => <button key={s.key} className={"src-btn" + (opened === s.key ? " on" : "")} onClick={() => open(s.key)}><span aria-hidden="true">📜</span> {SOURCES[s.key].id}</button>)}</div>
        {opened && <Passport unit={u} srcKey={opened} onClose={() => setOpened(null)} />}
        {u.phrase && (
          <div className="phrase">
            <Tag kind="source" /> <span className="pali" lang="pi">{u.phrase}</span>
            <p><Tag kind="translation" /> <Tag kind="unknown" /> {t(UI("คำแปลที่ตรวจแล้วยังรอการตรวจก่อนเผยแพร่ เราจึงยังไม่แสดงคำแปล", "The controlled translation is still awaiting publication review, so it isn't shown yet."))}</p>
            <p className="quiet">{t(u.translationNote)}</p>
          </div>
        )}
        <details className="study">
          <summary>{t(UI("อ่านละเอียด: ขอบเขตและสถานะ", "Study view: boundaries and status"))}</summary>
          {u.boundary && <p><strong>{t(UI("ขอบเขต", "Boundary"))}:</strong> {t(u.boundary)}</p>}
          {u.uncertainty && <p><Tag kind="unknown" /> {t(u.uncertainty)}</p>}
          {u.evidenceNote && <p>{t(u.evidenceNote)}</p>}
          <p><strong>{t(UI("สถานะ", "Status"))}:</strong> <code>{u.status}</code></p>
        </details>
      </div>

      {u.media && (
        <div className="step">
          <h2><span aria-hidden="true">🎬</span> {t(UI("สื่อที่เกี่ยวข้อง", "Related media"))}</h2>
          <button className="media-link" onClick={() => go("media", "wheel")}>
            <img src={WHEEL_IMAGE.src} alt="" width="160" height="146" loading="lazy" />
            <span>{t(UI("ภาพวงล้อสัมโพธายะ: ขันธ์ 5 และปฏิจจสมุปบาท (ใน 🎬 ศาลาสื่อ)", "The Sambodhaya wheel: the five aggregates and dependent origination (in the 🎬 Media Hall)"))}</span>
          </button>
        </div>
      )}

      <div className="step mirror">
        <h2><span aria-hidden="true">🪞</span> 3 · {t(UI("กระจกอีกบาน", "The other mirror"))}</h2>
        <p className="two-mirrors">{t(UI("ด้านหนึ่งคือสิ่งที่หลักฐานบันทึกเกี่ยวกับพระพุทธเจ้า อีกด้านคือสิ่งที่คุณสังเกตได้เอง ทั้งสองไม่ใช่เรื่องเดียวกัน", "One side is what the evidence records about the Buddha; the other is what you can observe yourself. They are not the same story."))}</p>
        {u.life && <Teach text={u.life} />}
        <label htmlFor="mirror-note" className="mirror-q">{t(UI("ตอนนี้ฉันสังเกตอะไรได้บ้าง?", "What can I notice right now?"))}</label>
        <textarea id="mirror-note" value={mirror} onChange={(e) => { setMirror(e.target.value); if (e.target.value) mark("mirror"); }} rows={3}
          placeholder={t(UI("เขียนไว้คิดเองได้ ไม่ถูกส่งไปไหน และไม่ถูกบันทึก", "Write just for yourself. It isn't sent anywhere and isn't saved."))} />
        <div className="row">
          <button className="chip" onClick={() => { setMirror(t(UI("ยังไม่เห็นอะไร", "I haven't noticed anything yet"))); mark("mirror"); }}>{t(UI("ยังไม่เห็นอะไร", "I haven't noticed anything yet"))}</button>
          <button className="chip" onClick={() => mark("mirror")}>{t(UI("ข้าม", "Skip"))}</button>
        </div>
        <p className="quiet">{t(UI("ไม่มีถูกผิด ไม่มีคะแนน และ “ยังไม่เห็นอะไร” ก็เป็นคำตอบได้", "There's no right or wrong and no score. “I haven't noticed anything yet” is an answer too."))}</p>
        <details className="study">
          <summary>{t(UI("คำถามตรวจตน (ไม่ต้องตอบก็ได้)", "Questions for yourself (no need to answer)"))}</summary>
          <ul>
            <li>{t(UI("วันนี้ฉันเรียนรู้อะไร", "What did I learn today?"))}</li>
            <li>{t(UI("ฉันสังเกตเห็นอะไรเกิดขึ้นกับกายหรือใจ", "What did I notice happening in my body or mind?"))}</li>
            <li>{t(UI("เมื่อลองทำแล้ว อะไรเปลี่ยนหรือไม่เปลี่ยน", "When I tried it, what changed or didn't change?"))}</li>
            <li>{t(UI("ฉันจะนำสิ่งที่เห็นไปใช้ในชีวิตจริงอย่างไร", "How might I take what I saw into real life?"))}</li>
          </ul>
          <p className="quiet">{t(UI("คำตอบไม่มีคะแนน และไม่จำเป็นต้องเปิดเผยให้ใครเห็น", "Answers have no score and don't need to be shown to anyone."))}</p>
        </details>
      </div>

      <div className="step">
        <h2><span aria-hidden="true">🧩</span> {t(UI("ลองคิด (ไม่มีคะแนน)", "Think it over (no score)"))}</h2>
        <p className="quiet"><Tag kind="unknown" /> {t(UI("ชุดคำถามนี้เป็นร่างเพื่อเผยแพร่ ยังรอตรวจ และไม่ใช่พระพุทธพจน์", "These questions are a publication draft, still under review, and are not the Buddha's words."))}</p>
        {u.exercises.map((x, i) => (
          <div key={i} className="ex">
            <p className="ex-q" lang="th">{x.q}</p>
            {x.o && <div className="choices">{x.o.map((o, j) => (
              <button key={j} lang="th" className={"choice" + (answers[i] === j ? " picked" : "") + (answers[i] != null && j === x.a ? " rule" : "")} onClick={() => setAnswers({ ...answers, [i]: j })}>{String.fromCharCode(65 + j)} · {o}</button>
            ))}</div>}
            {x.o && answers[i] != null && (
              <div className="ex-out">
                <p>{t(UI("ข้อที่ตรงกับหลักของวัด", "The option that fits the temple's principle"))}: <strong>{String.fromCharCode(65 + x.a)}</strong>{answers[i] !== x.a && <> · {t(UI("คิดต่างได้ ลองเปิดต้นทางดูอีกครั้ง", "You may see it differently. Try opening the source again."))}</>}</p>
                {x.feedback && <p lang="th">{x.feedback}</p>}
                {x.evidence && <p className="quiet">👣 {x.evidence}</p>}
              </div>
            )}
            {x.rule && <details className="study"><summary>{t(UI("ดูหลักของวัด", "See the temple's rule"))}</summary><p>{t(UI("ไม่ควร เรื่องนี้เป็นประวัติเท่านั้น", "No. This story is history only."))}</p><p className="quiet"><code>{x.rule}</code></p></details>}
            {x.challenge && <p className="quiet">👣 {t(UI("ลองกดปุ่ม 📜 ในขั้นที่ 2 เพื่อเปิดหลักฐาน แล้วดูต้นทางและผู้พูด", "Press a 📜 button in step 2 to open the evidence, then look at the source and the speaker."))}{steps.source && " ✓"}</p>}
            {x.note && <p className="quiet"><code>{x.note}</code></p>}
          </div>
        ))}
      </div>

      <div className="step">
        <h2><span aria-hidden="true">👣</span> 4 · {t(UI("รอยเท้าการค้นพบ", "Footprints of discovery"))}</h2>
        <ol className="trail-steps">
          <li className="on">💭 {t(UI("คำถาม", "Question"))}</li>
          <li className={steps.story ? "on" : ""}>🕯️ {t(UI("เรื่องที่ดู", "Story"))}</li>
          <li className={steps.source ? "on" : ""}>📜 {t(UI("ต้นทาง", "Source"))}</li>
          <li className={steps.mirror ? "on" : ""}>🪞 {t(UI("สิ่งที่สังเกต", "What I noticed"))}</li>
          <li className={choice === "seed" ? "on" : ""}>🌱 {t(UI("เมล็ดกลับบ้าน", "A seed to take home"))}</li>
        </ol>
        <p className="quiet">{t(UI("รอยเท้าไม่ใช่แถบความก้าวหน้า และไม่วัดระดับธรรม", "Footprints aren't a progress bar and don't measure anyone's practice."))}</p>
      </div>

      <div className="step leave">
        <h2><span aria-hidden="true">🌅</span> 5 · {t(UI("เลือกทางออก", "Choose your way out"))}</h2>
        <div className="three">
          <button className={"tile" + (choice === "keep" ? " on" : "")} onClick={() => { setChoice("keep"); }}><span className="tile-icon" aria-hidden="true">📜</span>{t(UI("เก็บสิ่งที่เข้าใจ", "Keep what I understood"))}</button>
          <button className={"tile" + (choice === "seed" ? " on" : "")} onClick={() => { setChoice("seed"); setSeed(k); }}><span className="tile-icon" aria-hidden="true">🌱</span>{t(UI("เลือกหนึ่งเรื่องไปสังเกตต่อ", "Take one thing to keep noticing"))}</button>
          <button className="tile" onClick={() => go("exit")}><span className="tile-icon" aria-hidden="true">🚪</span>{t(UI("ออกเลย", "Leave now"))}</button>
        </div>
        {choice === "keep" && <p className="quiet">{t(UI("เก็บไว้ในใจ หรือจดไว้เองก็ได้ วัดไม่ได้เก็บแทนคุณ", "Keep it in mind, or note it down yourself. The temple doesn't store it for you."))}</p>}
        {choice === "seed" && <p className="quiet">{t(UI("🌱 เมล็ดของคุณคือคำถามของเรื่องนี้ ลองนำกลับไปสังเกตในชีวิตจริง ไม่ใช่รางวัล และข้ามได้", "🌱 Your seed is this story's question. Take it back to notice in real life. It isn't a reward, and you can skip it."))}</p>}
        <p className="enough">{t(UI("วันนี้พอแล้วก็ได้", "That's enough for today, if you like."))}</p>
        <div className="row">
          {k > 0 && <button className="chip" onClick={() => go("unit", k - 1)}>← {t(UNITS[k - 1].title)}</button>}
          {k < UNITS.length - 1 && <button className="chip" onClick={() => go("unit", k + 1)}>{t(UNITS[k + 1].title)} →</button>}
        </div>
      </div>
    </section>
  );
}

/* ---------- 📚 Tipiṭaka Hall (entrance to the library) ---------- */
function Library() {
  const { go, t } = useApp();
  const used = Object.keys(SOURCES).map((key) => ({ key, s: SOURCES[key], units: UNITS.filter((u) => u.sources.some((x) => x.key === key)) }));
  return (
    <section className="zone">
      <h1 className="zone-title"><span aria-hidden="true">📚</span> {t(UI("หอหลักฐาน · ห้องสมุด", "Evidence Library"))}</h1>
      <p className="lede">{t(UI("อยากรู้ว่ามาจากไหน?", "Want to know where things come from?"))}</p>
      <p>{t(UI("เข้ามาดูหนังสือ คำสอน และที่มาของข้อมูลได้ที่นี่", "Come in to see the books, the teachings and where the information comes from."))}</p>
      <Dog say={UI("อยากรู้ไหมว่าเรื่องเมื่อกี้มาจากไหน? ตามรอยกลับไปดูได้ที่นี่", "Curious where that story came from? You can follow it back here.")} />
      <h2>{t(UI("ป้ายบอกชนิดของข้อความ", "Signs for each kind of text"))}</h2>
      <ul className="legend">
        <li><Tag kind="source" /> {t(UI("ข้อความจากพระสูตรหรือพระวินัย", "Text from a sutta or the Vinaya"))}</li>
        <li><Tag kind="translation" /> {t(UI("คำแปลของข้อความต้นทาง", "A translation of the source text"))}</li>
        <li><Tag kind="explain" /> {t(UI("คำอธิบายภาษาง่าย ไม่ใช่พระพุทธพจน์", "A plain-language explanation, not the Buddha's words"))}</li>
        <li><Tag kind="unknown" /> {t(UI("หลักฐานยังไม่พอ หรือกำลังตรวจ", "Not enough evidence yet, or still being checked"))}</li>
      </ul>
      <p className="quiet">{t(UI("การพูดว่า “ยังไม่รู้” เป็นความซื่อตรง ไม่ใช่ความล้มเหลว", "Saying “we don't know yet” is honesty, not failure."))}</p>
      <h2>{t(UI("ต้นทางที่เรื่องในวัดใช้", "Sources used by the stories here"))}</h2>
      <ul className="sources">
        {used.map(({ key, s, units }) => (
          <li key={key}>
            <span className="src-id"><span aria-hidden="true">📜</span> {s.id}</span>
            <span className="src-name">{s.pali} · {s.th}</span>
            <span className="src-units">{units.map((u) => <button key={u.code} className="link" onClick={() => go("unit", UNITS.indexOf(u))}>{u.code}</button>)}</span>
          </li>
        ))}
      </ul>
      <p><Tag kind="unknown" /> {t(UI("ข้อความต้นทางเต็มและสถานะของแต่ละ Source Record อยู่ในห้องสมุดสัมโพธายะ ซึ่งยังไม่ได้เชื่อมกับต้นแบบนี้", "The full source texts and each Source Record's status live in the Sambodhaya Library, which is not yet connected to this prototype."))}</p>
      <details className="study">
        <summary>{t(UI("อ่านละเอียด: สิ่งที่ห้องสมุดยังคงสถานะ AMBER", "Study view: what the library still marks AMBER"))}</summary>
        <ul>{AMBER.map((a) => <li key={a}><code>{a}</code></li>)}</ul>
        <p className="quiet">Library Audit Closure — 3 Oct 2026 · Public release: NOT PASSED / NOT AUTHORIZED</p>
      </details>
    </section>
  );
}

/* ---------- 📖🎧🎬 Media hall ---------- */
function Media({ focus }) {
  const { go, t, lang, settings } = useApp();
  const [mode, setMode] = useState(focus === "wheel" ? "watch" : null);
  const [zoom, setZoom] = useState(false);
  return (
    <section className="zone">
      <h1 className="zone-title"><span aria-hidden="true">📖🎧🎬</span> {t(UI("ศาลาสื่อ", "Media Hall"))}</h1>
      <p className="lede">{t(UI("อยากเรียนรู้แบบไหน?", "How would you like to learn?"))}</p>
      <div className="three">
        <button className={"tile" + (mode === "read" ? " on" : "")} onClick={() => setMode("read")}><span className="tile-icon" aria-hidden="true">📖</span>{t(UI("อ่าน", "Read"))}</button>
        <button className={"tile" + (mode === "listen" ? " on" : "")} onClick={() => setMode("listen")}><span className="tile-icon" aria-hidden="true">🎧</span>{t(UI("ฟัง", "Listen"))}</button>
        <button className={"tile" + (mode === "watch" ? " on" : "")} onClick={() => setMode("watch")}><span className="tile-icon" aria-hidden="true">🎬</span>{t(UI("ดู", "Watch"))}</button>
      </div>
      <p className="quiet center">{t(UI("เลือกแบบที่สบายสำหรับคุณ และหยุดเมื่อไรก็ได้", "Choose whatever feels comfortable, and stop whenever you like."))}</p>
      {(mode === "read" || mode === "listen") && (
        <ol className="media-list">
          {UNITS.map((u, k) => (
            <li key={u.code}>
              <h3>{u.code} · {t(u.title)}</h3>
              <Teach text={u.simple} block />
              <div className="row">
                {mode === "listen" && <><Listen text={t(u.simple)} code={u.code} /><button className="chip" onClick={hush}>⏸️ {t(UI("หยุด", "Stop"))}</button></>}
                <button className="chip" onClick={() => go("unit", k)}>👣 {t(UI("เปิดเรื่องนี้และต้นทาง", "Open this story and its source"))}</button>
              </div>
            </li>
          ))}
          {mode === "listen" && <li className="quiet"><Tag kind="unknown" /> {t(VOICE_NOTE)}</li>}
        </ol>
      )}
      {mode === "watch" && (
        <div className="wheel-media">
          <h2>{t(UI("ภาพวงล้อสัมโพธายะ: ขันธ์ 5 และปฏิจจสมุปบาท", "The Sambodhaya wheel: the five aggregates and dependent origination"))}</h2>
          <div className="row"><Tag kind="explain" /><Tag kind="unknown" /></div>
          <p className="quiet">{t(UI("ภาพนี้เป็นสื่ออธิบายของวัด ไม่ใช่พระพุทธพจน์ ข้อความในภาพยังรอการตรวจหลักฐานและการเชื่อมโยงกับห้องสมุด (media/evidence-link review)", "This picture is the temple's explanatory media, not the Buddha's words. The text in the picture is still awaiting evidence and library-link review (media/evidence-link review)."))}</p>
          {settings.textOnly ? (
            <p className="alt-text">{t(WHEEL_IMAGE.alt)}</p>
          ) : (
            <button className="wheel-frame" onClick={() => setZoom(true)} aria-label={t(UI("ขยายภาพ", "Enlarge picture"))}>
              <img src={WHEEL_IMAGE.src} width={WHEEL_IMAGE.w} height={WHEEL_IMAGE.h} alt={t(WHEEL_IMAGE.alt)} />
            </button>
          )}
          <p>👣 {t(UI("หัวข้อที่เกี่ยวข้องในห้องสมุด", "Related topics in the library"))}: {WHEEL_IMAGE.related.map((key) => <span key={key} className="src-pill">📜 {SOURCES[key].id} · {SOURCES[key].pali}</span>)} <button className="link" onClick={() => go("unit", 5)}>U06 · {t(UNITS[5].title)}</button></p>
          <p className="quiet"><Tag kind="unknown" /> {t(UI("การจับคู่ภาพนี้กับ Source Record ยังไม่ได้ตรวจ", "Matching this picture to specific Source Records has not been checked yet."))}</p>
          {zoom && (
            <div className="zoom" role="dialog" aria-label={t(UI("ภาพขยาย", "Enlarged picture"))} onClick={() => setZoom(false)}>
              <img src={WHEEL_IMAGE.src} alt={t(WHEEL_IMAGE.alt)} />
              <button className="btn zoom-close" onClick={() => setZoom(false)}>{t(UI("ปิด", "Close"))}</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ---------- 🌍♿ Global access ---------- */
function Toggle({ k, label }) {
  const { t, settings, setSettings } = useApp();
  return <label className="toggle"><input type="checkbox" checked={!!settings[k]} onChange={(e) => setSettings({ ...settings, [k]: e.target.checked })} /> <span>{t(label)}</span></label>;
}
function Access() {
  const { t, settings, setSettings, remember, setRemember } = useApp();
  const set = (k, v) => setSettings({ ...settings, [k]: v });
  return (
    <section className="zone">
      <h1 className="zone-title"><span aria-hidden="true">🌍♿</span> {t(UI("ศาลาสากล", "Universal Hall"))}</h1>
      <p className="lede">{t(UI("เลือกภาษาและวิธีที่ช่วยให้คุณใช้วัดได้สบายขึ้น", "Choose the language and settings that make the temple easier for you."))}</p>
      <p>{t(UI("ถ้าอ่าน ฟัง หรือดูแบบหนึ่งไม่สะดวก เราจะพยายามมีอีกทางให้เลือก", "If reading, listening or watching one way is hard, we'll try to offer another way."))}</p>
      <fieldset className="setting">
        <legend><span aria-hidden="true">🌐</span> {t(UI("ภาษา", "Language"))}</legend>
        <div className="row">
          <button className={"chip" + (settings.lang === "th" ? " on" : "")} aria-pressed={settings.lang === "th"} onClick={() => set("lang", "th")}>ไทย</button>
          <button className={"chip" + (settings.lang === "en" ? " on" : "")} aria-pressed={settings.lang === "en"} onClick={() => set("lang", "en")}>English</button>
        </div>
        <p className="quiet"><Tag kind="draft" /> {t(UI("ภาษาอังกฤษยังเป็นร่างที่ยังไม่มีผู้ตรวจ ข้อความภาษาไทยคือฉบับที่ใช้", "English is still an unreviewed draft. The Thai text is the version in use."))}</p>
      </fieldset>
      <fieldset className="setting">
        <legend><span aria-hidden="true">🔤</span> {t(UI("ขนาดตัวอักษร", "Text size"))}</legend>
        <div className="row">{[["s", "ก"], ["m", "กก"], ["l", "กกก"], ["xl", "กกกก"]].map(([v, l]) => <button key={v} className={"chip size-" + v + (settings.size === v ? " on" : "")} aria-pressed={settings.size === v} onClick={() => set("size", v)}>{l}</button>)}</div>
      </fieldset>
      <fieldset className="setting">
        <legend><span aria-hidden="true">♿</span> {t(UI("การแสดงผล", "Display"))}</legend>
        <Toggle k="contrast" label={UI("ตัวอักษรเข้มชัด", "Higher contrast")} />
        <Toggle k="calmMotion" label={UI("ลดการเคลื่อนไหว", "Reduce motion")} />
        <Toggle k="textOnly" label={UI("ข้อความอย่างเดียว (ประหยัดอินเทอร์เน็ต ไม่โหลดภาพ)", "Text only (saves data, no pictures)")} />
        <Toggle k="mute" label={UI("ปิดเสียงทั้งหมด", "Turn off all sound")} />
        <Toggle k="guide" label={UI("ให้หมาวัดช่วยบอกทาง", "Let the temple dog show the way")} />
      </fieldset>
      <fieldset className="setting">
        <legend><span aria-hidden="true">👣</span> {t(UI("ให้วัดจำทาง", "Let the temple remember paths"))}</legend>
        <label className="toggle"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> <span>{t(UI("จำเรื่องที่ฉันเคยเปิดไว้ในเครื่องนี้", "Remember the stories I've opened, on this device"))}</span></label>
        <p className="quiet">{t(UI("ปิดไว้ตั้งแต่แรก ถ้าเปิด วัดจะจำแค่ชื่อเรื่องที่คุณเคยเปิด ไม่เก็บสิ่งที่คุณเขียน และไม่ส่งไปไหน", "Off unless you turn it on. If on, the temple only remembers which stories you opened. It never keeps what you write and sends nothing anywhere."))}</p>
      </fieldset>
      <p className="lede center">{t(UI("ทุกคนเข้าวัดได้", "Everyone can enter the temple."))}</p>
      <p className="quiet"><Tag kind="unknown" /> {t(UI("การเข้าถึงในต้นแบบนี้ยังไม่ได้ทดสอบกับผู้ใช้จริง", "Accessibility in this prototype has not yet been tested with real users."))}</p>
    </section>
  );
}

/* ---------- 🌿 Quiet rest area ---------- */
function BreathSpace() {
  const { t, settings } = useApp();
  const [on, setOn] = useState(false);
  return (
    <div className="rest-space">
      <div className={"breath" + (on && !settings.calmMotion ? " moving" : "")} aria-hidden="true" />
      <button className="chip" onClick={() => setOn(!on)} aria-pressed={on}>{on ? "⏸️ " + t(UI("หยุด", "Stop")) : "🫧 " + t(UI("หายใจช้า ๆ ตามสบาย (ถ้าอยาก)", "Breathe slowly, at your own pace (if you like)"))}</button>
      {on && <p className="quiet center">{t(UI("ไม่ต้องกลั้นหายใจ ไม่ต้องนับ วงกลมแค่ขยายและหดช้า ๆ ให้ดูตาม ถ้าไม่สบายให้หยุดได้เลย", "No holding your breath and no counting. The circle just grows and shrinks slowly, if you'd like to follow it. Stop whenever it doesn't feel good."))}</p>}
      <p className="quiet center">{t(UI("หรือลุกขึ้นเดินช้า ๆ สักพัก แล้วค่อยกลับมาก็ได้", "Or get up and walk slowly for a while, then come back."))}</p>
    </div>
  );
}

function Rest() {
  const { t, settings, setSettings } = useApp();
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => stopCalm(), []);
  return (
    <section className="zone rest">
      <h1 className="zone-title"><span aria-hidden="true">🌿</span> {t(UI("พื้นที่พักสงบ", "Quiet rest area"))}</h1>
      <p className="rest-line">{t(UI("พักตรงนี้ได้ ไม่ต้องรีบ", "You can rest here. No need to hurry."))}</p>
      <p className="quiet center">{t(UI("ไม่อยากทำอะไรก็ไม่ต้องทำ อยู่เงียบ ๆ ได้ และกลับเมื่อพร้อม", "If you don't want to do anything, you don't have to. You can stay quietly and go back when you're ready."))}</p>
      <BreathSpace />
      <div className="row center">
        {!playing ? <button className="chip" disabled={settings.mute} onClick={() => { startCalm(); setPlaying(true); }}>🎧 ▶️ {t(UI("ฟังเสียงลมเบา ๆ", "Play a soft wind sound"))}</button>
          : <button className="chip" onClick={() => { stopCalm(); setPlaying(false); }}>⏸️ {t(UI("หยุดเสียง", "Stop the sound"))}</button>}
        <button className={"chip" + (settings.mute ? " on" : "")} aria-pressed={!!settings.mute} onClick={() => { stopCalm(); setPlaying(false); setSettings({ ...settings, mute: !settings.mute }); }}>🔇 {t(UI("ปิดเสียงทั้งหมด", "Turn off all sound"))}</button>
      </div>
      <p className="quiet center">{t(UI("เสียงลมนี้สร้างขึ้นในเครื่องของคุณ ไม่ใช่บทสวดหรือคำสอน", "This wind sound is generated on your device. It isn't a chant or a teaching."))}</p>
      <p className="quiet center">{t(UI("ถ้าต้องการความช่วยเหลือจากคนจริง ไปที่ 🤝 ขอความช่วยเหลือ หรือบอกผู้ใหญ่ที่คุณไว้ใจได้", "If you need help from a real person, go to 🤝 Ask for help, or tell an adult you trust."))}</p>
    </section>
  );
}

/* ---------- 🌿 Practice Garden (part of the Learning–Practice–Observation hall) ---------- */
const FOUR = [
  { k: "body", icon: "🧍", name: UI("กาย", "Body") },
  { k: "feel", icon: "💗", name: UI("ความรู้สึก", "Feelings") },
  { k: "mind", icon: "🧠", name: UI("จิต", "Mind") },
  { k: "dhamma", icon: "☸", name: UI("ธรรม", "Dhamma") },
];
// Verbatim from LEARN • PRACTICE • OBSERVE (ส่วนที่ 2–3).
const OBSERVE = [
  { h: "ระลึกชอบ", p: "ฝึกรู้ตัวและสังเกตสิ่งที่กำลังเกิดขึ้น", en: ["Right mindfulness", "Practise being aware and noticing what is happening."] },
  { h: "เห็นความเปลี่ยนแปลง", p: "สังเกตว่าสิ่งต่าง ๆ ที่เกิดขึ้นมีการเปลี่ยนแปลง", en: ["Seeing change", "Notice that things which arise change."] },
  { h: "ไม่รีบถือว่าเป็นเรา", p: "เรียนรู้ที่จะสังเกตความคิดและความรู้สึกก่อนรีบสรุปว่ามันคือตัวเราทั้งหมด", en: ["Not rushing to call it ‘me’", "Learn to observe thoughts and feelings before concluding that they are all of who we are."] },
];
function Garden() {
  const { t, lang } = useApp();
  const [open, setOpen] = useState(null);
  const [note, setNote] = useState("");
  return (
    <section className="zone garden">
      <h1 className="zone-title"><span aria-hidden="true">🌿</span> {t(UI("สวนสังเกตใจ", "Practice Garden"))}</h1>
      <p className="lede">{t(UI("ที่นี่ไม่ต้องตอบให้ถูก ดูตามจริงได้", "Here you don't have to get it right. Just look at what's really there."))}</p>
      <p className="quiet">{t(UI("ไม่ต้องหลับตา ไม่ต้องนั่งท่าไหน ไม่ต้องเล่าเรื่องส่วนตัว และหยุดได้ทุกเมื่อ", "No need to close your eyes or sit any special way, no need to share anything personal, and you can stop any time."))}</p>
      <div className="four-dim">
        {FOUR.map((f) => (
          <button key={f.k} className={"tile" + (open === f.k ? " on" : "")} aria-expanded={open === f.k} onClick={() => { setOpen(open === f.k ? null : f.k); setNote(""); }}>
            <span className="tile-icon" aria-hidden="true">{f.icon}</span>{t(f.name)}
          </button>
        ))}
      </div>
      {open && (
        <div className="step mirror">
          <h2><span aria-hidden="true">🪞</span> {t(FOUR.find((f) => f.k === open).name)}</h2>
          <label htmlFor="garden-note" className="mirror-q">{t(UI("ตอนนี้ฉันสังเกตอะไรได้บ้าง?", "What can I notice right now?"))}</label>
          <textarea id="garden-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t(UI("เขียนไว้คิดเองได้ ไม่ถูกส่งไปไหน และไม่ถูกบันทึก", "Write just for yourself. It isn't sent anywhere and isn't saved."))} />
          <div className="row"><button className="chip" onClick={() => setNote(t(UI("ยังไม่เห็นอะไร", "I haven't noticed anything yet")))}>{t(UI("ยังไม่เห็นอะไร", "I haven't noticed anything yet"))}</button><button className="chip" onClick={() => setOpen(null)}>{t(UI("ข้าม", "Skip"))}</button></div>
          <p className="quiet"><Tag kind="unknown" /> {t(UI("คำอธิบายและต้นทางของการสังเกตด้านนี้ ยังรอ Source Record จากห้องสมุด เราจึงยังไม่อธิบายเอง", "The explanation and source for this kind of observing are still waiting for a Source Record from the library, so we don't explain it ourselves yet."))}</p>
        </div>
      )}
      <div className="step">
        <h2>{t(UI("แนวทางการสังเกต", "Ways of observing"))}</h2>
        {OBSERVE.map((o) => (
          <div key={o.h} className="teach k-explain">
            <span className="teach-tags"><Tag kind="explain" />{lang === "en" && <Tag kind="draft" />}</span>
            <strong>{lang === "en" ? o.en[0] : o.h}</strong>
            <span className="teach-text">{lang === "en" ? o.en[1] : o.p}</span>
          </div>
        ))}
      </div>
      <p className="quiet">{t(UI("ไม่มีคะแนน ไม่วัดระดับจิตหรือระดับธรรม และไม่สัญญาว่าการฝึกจะทำให้ทุกข์หายทันที ถ้าต้องการความช่วยเหลือจากคนจริง บอกผู้ใหญ่ที่ไว้ใจได้", "No scores, no measuring of anyone's mind or practice, and no promise that practice makes suffering vanish at once. If you need help from a real person, tell an adult you trust."))}</p>
    </section>
  );
}

/* ---------- 👣 My Journey: the U01–U08 storyline and your own footprints ---------- */
// The four rhythms are verbatim from the temple's main page ("4 จังหวะของประสบการณ์เดิม").
const RHYTHMS = [
  { icon: "🌑", h: "ก่อนเข้า — ฉันกำลังพบอะไร?", en: "Before entering — what am I facing?" },
  { icon: "🕯️", h: "ระหว่างทาง — พระองค์ทรงตรวจอย่างไร?", en: "Along the way — how did he check?" },
  { icon: "🪞", h: "กระจก — แล้วฉันเห็นอะไร?", en: "The mirror — and what do I see?" },
  { icon: "🌅", h: "ก่อนออก — อะไรที่ฉันจะนำกลับไปดูต่อในชีวิต?", en: "Before leaving — what will I take back to keep looking at in life?" },
];
function Journey() {
  const { go, t, lang, trail, remember } = useApp();
  const visited = new Set(trail.map((f) => f.u));
  return (
    <section className="zone journey">
      <h1 className="zone-title"><span aria-hidden="true">👣</span> {t(UI("เส้นทางของฉัน", "My Journey"))}</h1>
      <p className="lede">{t(UI("ตามรอยเรื่องของพระพุทธเจ้าทีละก้าว และดูทางของตัวเองไปพร้อมกัน", "Follow the Buddha's story step by step, and look at your own path alongside it."))}</p>
      <ol className="rhythms">{RHYTHMS.map((r) => <li key={r.icon}><span aria-hidden="true">{r.icon}</span> {lang === "en" ? r.en : r.h}</li>)}</ol>
      <ol className="path">
        {UNITS.map((u, k) => (
          <li key={u.code} className={visited.has(k) ? "been" : ""}>
            <button onClick={() => go("unit", k)}>
              <span className="path-n">{k + 1}</span>
              <span className="path-t">{t(u.title)}</span>
              {visited.has(k) && <span className="path-foot" aria-label={t(UI("เคยมาแล้ว", "visited"))}>👣</span>}
            </button>
          </li>
        ))}
      </ol>
      <Teach text={UI("เส้นเรื่องชีวิตในแอปหยุดที่ปรินิพพาน.", "The life story in this app ends at the parinibbāna.")} />
      <p className="quiet">{t(UI("ไม่ต้องเริ่มที่ข้อแรก และไม่ต้องเดินให้ครบ รอยเท้าไม่ใช่คะแนน", "You don't have to start at the first step or walk them all. Footprints aren't a score."))} {!remember && t(UI("ถ้าอยากให้วัดจำรอยเท้าไว้ในเครื่องนี้ เปิดได้ที่ 🌍 ศาลาสากล", "To let the temple remember your footprints on this device, switch it on in the 🌍 Universal Hall."))}</p>
    </section>
  );
}

/* ---------- 🤝 Caretaker ---------- */
function Care() {
  const { t } = useApp();
  return (
    <section className="zone">
      <h1 className="zone-title"><span aria-hidden="true">🤝</span> {t(UI("ผู้ดูแลวัดและผู้ช่วย AI", "Temple caretaker and AI helper"))}</h1>
      <p className="lede">{t(UI("มีอะไรให้เราช่วยไหม?", "Can we help with anything?"))}</p>
      <p>{t(UI("พูดง่าย ๆ ได้เลย:", "Just say it simply:"))}</p>
      <FeedbackForm />
      <div className="safety-note" role="note">
        <strong>{t(UI("ถ้าเป็นเรื่องที่ไม่ปลอดภัย หรือหนักใจมาก", "If something is unsafe or very worrying"))}</strong>
        <span>{t(UI("ให้บอกผู้ใหญ่ที่คุณไว้ใจได้ เช่น พ่อแม่ ผู้ปกครอง หรือคุณครู วัดนี้ไม่ใช่ที่รักษาหรือวินิจฉัยปัญหาสุขภาพ", "Tell an adult you trust, such as a parent, carer or teacher. This temple isn't a place for diagnosing or treating health problems."))}</span>
      </div>
      <p className="quiet"><span aria-hidden="true">🐕</span> {t(UI("ในต้นแบบนี้ หมาวัดยังไม่ใช่ AI เป็นเพียงข้อความบอกทางที่เขียนไว้ล่วงหน้า และยังไม่มี General AI Genesis", "In this prototype the temple dog isn't an AI yet. It's just pre-written directions, and General AI Genesis isn't connected."))}</p>
    </section>
  );
}

/* ---------- 🚪 Exit ---------- */
function Exit() {
  const { go, t, seed } = useApp();
  useEffect(() => { hush(); }, []);
  return (
    <section className="zone exit-page">
      <h1 className="zone-title"><span aria-hidden="true">🌅🚪</span> {t(UI("ออกจากวัด", "Leaving the temple"))}</h1>
      <p className="rest-line">{t(UI("วันนี้พอแล้วก็ได้", "That's enough for today, if you like."))}</p>
      {seed != null && UNITS[seed].question && (
        <div className="seed"><span aria-hidden="true">🌱</span><div><strong>{t(UI("เมล็ดที่คุณเลือกนำกลับไป", "The seed you chose to take home"))}</strong><p>{t(UNITS[seed].question)}</p></div></div>
      )}
      <Teach text={UI("เข้าวัดด้วยคำถาม → ออกจากวัดด้วยสิ่งที่เห็นด้วยตนเอง", "Enter with a question → leave with what you have seen for yourself.")} />
      <p className="quiet center">{t(UI("ไม่ต้องทำอะไรให้สำเร็จก่อนออก และกลับมาเมื่อไรก็ได้ ถ้าอยากมา", "There's nothing you need to finish before leaving. Come back any time, if you want to."))}</p>
      <div className="row center"><button className="chip" onClick={() => go("gate")}>🚪 {t(UI("กลับไปที่ประตูวัด", "Back to the temple gate"))}</button></div>
    </section>
  );
}

/* ---------- sending forms (Netlify Forms; nothing else receives the data) ---------- */
async function sendForm(name, fields, file) {
  const fd = new FormData();
  fd.append("form-name", name);
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v == null ? "" : String(v)));
  if (file) fd.append("attachment", file, file.name);
  const r = await fetch("/", { method: "POST", body: fd });
  if (!r.ok) throw new Error("HTTP " + r.status);
}
const MB = 1024 * 1024;

/* ---------- 💬 feedback & bug reports ---------- */
const FB_TYPES = [
  { k: "unclear", icon: "🙋", label: UI("ตรงนี้ไม่เข้าใจ", "I don't understand this part") },
  { k: "wrong", icon: "🔎", label: UI("คิดว่าตรงนี้อาจผิด", "I think this might be wrong") },
  { k: "lost", icon: "🧭", label: UI("หาทางไม่เจอ", "I can't find my way") },
  { k: "bug", icon: "🐞", label: UI("แจ้งปัญหาการใช้งาน", "Report a bug") },
  { k: "idea", icon: "💡", label: UI("ข้อเสนอแนะ", "Suggestion") },
];
function FeedbackForm({ onDone, compact }) {
  const { t, lang, view } = useApp();
  const [type, setType] = useState(null);
  const [msg, setMsg] = useState("");
  const [device, setDevice] = useState(true);
  const [file, setFile] = useState(null);
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const page = (location.hash || "#gate") + (document.referrer.includes("world.html") ? " (from 3D)" : "");
  const deviceInfo = `${innerWidth}x${innerHeight} · ${navigator.userAgent.replace(/\s*\([^)]*\)/g, " ").slice(0, 120)}`;
  const tooBig = file && file.size > 5 * MB;
  const canSend = type && msg.trim().length >= 3 && !tooBig && state !== "sending";
  const submit = async (e) => {
    e.preventDefault(); if (!canSend) return;
    setState("sending");
    try {
      await sendForm("feedback", { type, message: msg.trim(), page, lang, device: device ? deviceInfo : "(not shared)", email: email.trim(), "bot-field": "" }, file);
      setState("sent");
    } catch (err) { setState("error"); }
  };
  if (state === "sent") return (
    <div className="fb-done" role="status">
      <p className="lede">🙏 {t(UI("ได้รับแล้ว ขอบคุณที่ช่วยดูแลวัด", "Received. Thank you for helping look after the temple."))}</p>
      <p>{t(UI("สถานะ: รับเรื่องแล้ว ผู้ดูแลจะตรวจและแก้เมื่อมีหลักฐาน", "Status: received. The caretakers will check it and fix things where the evidence supports it."))}</p>
      {onDone && <button className="btn" onClick={onDone}>{t(UI("ปิด", "Close"))}</button>}
    </div>
  );
  return (
    <form className={"fb-form" + (compact ? " compact" : "")} onSubmit={submit} noValidate>
      <fieldset className="fb-types">
        <legend>{t(UI("อยากบอกเรื่องอะไร?", "What would you like to tell us?"))}</legend>
        {FB_TYPES.map((x) => (
          <label key={x.k} className={"fb-type" + (type === x.k ? " on" : "")}>
            <input type="radio" name="fb-type" value={x.k} checked={type === x.k} onChange={() => setType(x.k)} />
            <span aria-hidden="true">{x.icon}</span> {t(x.label)}
          </label>
        ))}
      </fieldset>
      <label className="fb-field" htmlFor="fb-msg">{t(UI("เล่าสั้น ๆ ก็ได้", "A short description is fine"))}
        <textarea id="fb-msg" rows={4} maxLength={2000} value={msg} onChange={(e) => setMsg(e.target.value)} required />
      </label>
      <p className="warn-kids">{t(UI("ไม่ต้องใส่ชื่อจริง โรงเรียน ที่อยู่ หรือเบอร์โทร", "No need for your real name, school, address or phone number."))}</p>
      <details className="study">
        <summary>{t(UI("เพิ่มเติม (ไม่ใส่ก็ได้)", "Extras (optional)"))}</summary>
        <label className="fb-field" htmlFor="fb-file">{t(UI("ภาพหน้าจอ (ไม่เกิน 5 MB)", "Screenshot (up to 5 MB)"))}
          <input id="fb-file" type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0] || null)} />
        </label>
        {tooBig && <p className="notice">{t(UI("ไฟล์ใหญ่เกิน 5 MB", "The file is larger than 5 MB"))}</p>}
        <label className="fb-field" htmlFor="fb-email">{t(UI("อีเมลสำหรับตอบกลับ (สำหรับผู้ใหญ่เท่านั้น)", "Email for a reply (adults only)"))}
          <input id="fb-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
      </details>
      <div className="fb-attach">
        <span>{t(UI("แนบไปด้วย:", "Attached:"))} <code>{page}</code></span>
        <label className="toggle"><input type="checkbox" checked={device} onChange={(e) => setDevice(e.target.checked)} /> <span>{t(UI("ขนาดจอและชนิดเบราว์เซอร์ (ช่วยหาบั๊ก)", "Screen size and browser type (helps find bugs)"))}</span></label>
      </div>
      {state === "error" && <p className="notice" role="alert">{t(UI("ส่งไม่สำเร็จ ลองอีกครั้ง หรือคัดลอกข้อความไว้ก่อน", "Couldn't send. Try again, or copy your message first."))}</p>}
      <div className="row">
        <button type="submit" className="btn" disabled={!canSend}>{state === "sending" ? t(UI("กำลังส่ง…", "Sending…")) : t(UI("ส่ง", "Send"))}</button>
        {onDone && <button type="button" className="chip" onClick={onDone}>{t(UI("ยกเลิก", "Cancel"))}</button>}
      </div>
      <p className="quiet">{t(UI("ข้อความจะถึงผู้ดูแลวัดเท่านั้น ไม่เปิดเผยต่อสาธารณะ", "Messages reach the temple caretakers only and are never made public."))}</p>
    </form>
  );
}
function FeedbackWidget() {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  useEffect(() => { const f = () => setOpen(false); addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  useEffect(() => { if (!open) return; const k = (e) => { if (e.key === "Escape") setOpen(false); }; addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [open]);
  return (
    <>
      <button className="fb-fab" onClick={() => setOpen(true)} aria-haspopup="dialog">💬 <span>{t(UI("ส่งความคิดเห็น / แจ้งปัญหา", "Feedback / report a problem"))}</span></button>
      {open && (
        <div className="fb-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="fb-panel" role="dialog" aria-modal="true" aria-labelledby="fb-title">
            <h2 id="fb-title">💬 {t(UI("ส่งความคิดเห็น / แจ้งปัญหา", "Feedback / report a problem"))}</h2>
            <FeedbackForm compact onDone={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
function FeedbackPage() {
  const { t } = useApp();
  return (
    <section className="zone">
      <h1 className="zone-title"><span aria-hidden="true">💬</span> {t(UI("ส่งความคิดเห็น / แจ้งปัญหา", "Feedback / report a problem"))}</h1>
      <FeedbackForm />
    </section>
  );
}

/* ---------- 🤲 donation & development fund (adults) ---------- */
function Copy({ text }) {
  const { t } = useApp();
  const [ok, setOk] = useState(false);
  return <button type="button" className="chip" onClick={() => { navigator.clipboard?.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1500); }).catch(() => {}); }}>{ok ? "✓ " + t(UI("คัดลอกแล้ว", "Copied")) : "📋 " + t(UI("คัดลอก", "Copy"))}</button>;
}
// The LINE OpenChat community (for adults): opens LINE in a new tab. Its wording and link are in content/world/signs.json
// ("community", editable in /admin) and the left gate post of the 3D temple uses the same.
function CommunityLink({ button = false }) {
  const { t } = useApp();
  return <a className={button ? "btn line-btn" : "adult-link"} href={COMMUNITY.url} target="_blank" rel="noopener noreferrer">💬 {t(COMMUNITY.title)}{button ? "" : ` · ${t(COMMUNITY.sub)}`}</a>;
}
function CommunityBox() {
  const { t } = useApp();
  return (
    <div className="community-box">
      <h2>💬 {t(UI("ชุมชนออนไลน์ของวัด", "The temple's online community"))}</h2>
      <p>{t(UI("พูดคุยกับผู้ใหญ่คนอื่น ๆ ที่สนใจวัดสัมโพธายะ รับข่าวงานบุญและความคืบหน้าการสร้างวัด ใน LINE OpenChat (เปิดในแอป LINE)", "Talk with other adults who care about Sambodhaya, and hear about merit-making days and the building work, in LINE OpenChat (opens in the LINE app)."))}</p>
      <div className="row"><CommunityLink button /></div>
      <p className="quiet">{t(COMMUNITY.sub)}</p>
    </div>
  );
}

function Support() {
  const { t, lang, go } = useApp();
  const S = SUPPORT;
  const ready = !!(S.recipient && (S.promptpayQr || S.promptpayId || S.bank) && S.retentionDays && S.contact);
  const method = S.promptpayQr || S.promptpayId ? "promptpay or bank" : "bank"; // (both are shown together)
  const [f, setF] = useState({ anonymous: false, name: "", amount: "", note: "", email: "", thanks: "private", agree: false });
  const [stage, setStage] = useState(1); // 1: the transfer details; 2: the slip form (shown once they say they've transferred)
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [state, setState] = useState("idle");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  useEffect(() => { if (!file || !file.type.startsWith("image/")) { setPreview(null); return; } const u = URL.createObjectURL(file); setPreview(u); return () => URL.revokeObjectURL(u); }, [file]);
  const fileOk = file && file.size <= 8 * MB && /^(image\/|application\/pdf)/.test(file.type);
  const valid = ready && (f.anonymous || f.name.trim()) && Number(f.amount) > 0 && fileOk && f.agree && state !== "sending"; // (the slip itself shows the date and time)
  const submit = async (e) => {
    e.preventDefault(); if (!valid) return;
    setState("sending");
    try {
      await sendForm("donation", { name: f.anonymous ? "(anonymous)" : f.name.trim(), amount: f.amount, method, note: f.note.trim(), email: f.email.trim(), thanks: f.anonymous ? "private" : f.thanks, adult: "yes", consent: "yes", lang, "bot-field": "" }, file);
      setState("sent"); window.scrollTo(0, 0);
    } catch (err) { setState("error"); }
  };
  const waiting = <p className="notice"><Tag kind="unknown" /> {t(UI("รอข้อมูลจริงจากทีมผู้ดูแล ยังไม่ได้ใส่", "Awaiting the real details from the temple team; not filled in yet."))}</p>;
  if (state === "sent") return (
    <section className="zone support">
      <h1 className="zone-title">🙏 {t(UI("ขอบคุณที่ร่วมสมทบทุน", "Thank you for your support"))}</h1>
      <div className="step">
        <p className="lede">{t(UI("ได้รับการแจ้งโอนแล้ว", "We've received your transfer notice."))}</p>
        <ol className="flow-steps"><li className="on">① {t(UI("โอน", "Transfer"))}</li><li className="on">② {t(UI("แจ้งสลิป", "Send slip"))}</li><li className="now">③ {t(UI("รอตรวจสอบ", "Awaiting check"))}</li></ol>
        <p>{t(UI("สถานะ: รอตรวจสอบ ผู้ดูแลจะตรวจยอดกับบัญชีก่อน แล้วจึงขอบคุณตามที่คุณเลือกไว้", "Status: awaiting check. The caretakers verify the amount against the account first, then thank you the way you chose."))}</p>
        <div className="row"><button className="btn" onClick={() => go("gate")}>{t(UI("กลับประตูวัด", "Back to the temple gate"))}</button></div>
      </div>
      <CommunityBox />
    </section>
  );
  return (
    <section className="zone support">
      <p className="eyebrow-adult">{t(UI("สำหรับผู้ใหญ่", "For adults"))}</p>
      <h1 className="zone-title">🤲 {t(UI("สมทบทุนพัฒนาและสร้างวัด", "Support the temple's development"))}</h1>
      <p className="lede">{t(UI("วัดสัมโพธายะเปิดให้ทุกคนใช้ฟรีเสมอ ไม่ต้องบริจาคก็เรียนได้ครบทุกอย่าง", "Wat Sambodhaya is always free for everyone. Nothing here requires a donation."))}</p>

      <ol className="flow-steps" aria-label={t(UI("ขั้นตอน", "Steps"))}><li className={stage === 1 ? "now" : "on"}>① {t(UI("โอน", "Transfer"))}</li><li className={stage === 2 ? "now" : ""}>② {t(UI("แจ้งสลิป", "Send slip"))}</li><li>③ {t(UI("รอตรวจสอบ", "Awaiting check"))}</li></ol>

      {stage === 1 && <div className="step">
        <h2>① {t(UI("โอนเงิน", "Make the transfer"))}</h2>
        {/* the QR code and the bank details side by side (stacked on phones): scan, or transfer by account number */}
        <div className="pay-grid">
          <div className="pay-card">
            <h3>📱 PromptPay</h3>
            {S.promptpayQr ? <img className="qr" src={S.promptpayQr} alt={t(UI("คิวอาร์โค้ดพร้อมเพย์ของวัด", "The temple's PromptPay QR code"))} />
              : <div className="qr qr-ph" role="img" aria-label={t(UI("ที่สำหรับคิวอาร์โค้ดพร้อมเพย์ ยังไม่มี", "Place for the PromptPay QR code, not available yet"))}><span aria-hidden="true">▦</span><span>{t(UI("คิวอาร์โค้ดพร้อมเพย์", "PromptPay QR code"))}</span><span className="quiet">{t(UI("เร็ว ๆ นี้", "coming soon"))}</span></div>}
            {S.promptpayId && <p>PromptPay: <strong className="mono">{S.promptpayId}</strong> <Copy text={S.promptpayId} /></p>}
            <p className="quiet">{S.promptpayQr ? t(UI("สแกนด้วยแอปธนาคาร แล้วตรวจชื่อผู้รับให้ตรงก่อนกดยืนยัน", "Scan with your banking app and check the recipient name before confirming.")) : t(UI("ระหว่างนี้โอนผ่านเลขบัญชีได้เลย", "Meanwhile, please transfer by account number."))}</p>
          </div>
          <div className="pay-card">
            <h3>🏦 {t(UI("โอนผ่านธนาคาร", "Bank transfer"))}</h3>
            {S.bank ? <dl className="pay bank">
              <dt>{t(UI("ธนาคาร", "Bank"))}</dt><dd>{t(S.bank.bank)}</dd>
              <dt>{t(UI("ชื่อบัญชี", "Account name"))}</dt><dd>{t(S.bank.name)}</dd>
              <dt>{t(UI("เลขที่บัญชี", "Account number"))}</dt><dd><strong className="mono">{S.bank.number}</strong> <Copy text={S.bank.number.replace(/\D/g, "")} /></dd>
            </dl> : waiting}
          </div>
        </div>
        {S.recipient ? <p className="quiet">{t(UI("ผู้รับเงิน", "Recipient"))}: {t(S.recipient)}</p> : waiting}
        {S.taxNote ? <p className="quiet">{t(S.taxNote)}</p> : <p className="quiet"><Tag kind="unknown" /> {t(UI("ข้อมูลเรื่องใบลดหย่อนภาษี: รอข้อมูลจากทีม", "Tax receipts: awaiting information from the team"))}</p>}
        <div className="row"><button type="button" className="btn big" onClick={() => { setStage(2); window.scrollTo(0, 0); }}>{t(UI("โอนเรียบร้อยแล้ว – แนบสลิป", "I've completed the transfer – attach the slip"))} →</button></div>
        <details className="uses-more">
          <summary>{t(UI("เงินสมทบนำไปใช้กับอะไรบ้าง", "What contributions go towards"))}</summary>
          <ul className="uses">
            <li><span aria-hidden="true">🏯</span> {t(UI("สร้างและพัฒนาวัด ทั้งวัดออนไลน์และพื้นที่จริง", "Building and developing the temple, online and physical"))}</li>
            <li><span aria-hidden="true">🤖</span> {t(UI("ค่าเครื่องมือ AI รายเดือน เช่น Claude, Midjourney และ AI APIs", "Monthly AI tools such as Claude, Midjourney and AI APIs"))}</li>
            <li><span aria-hidden="true">📚</span> {t(UI("คอร์สและแหล่งเรียนรู้ที่ทีมต้องใช้", "Courses and learning resources the team needs"))}</li>
            <li><span aria-hidden="true">🖥️</span> {t(UI("เซิร์ฟเวอร์และโฮสติ้ง", "Servers and hosting"))}</li>
          </ul>
        </details>
      </div>}

      {stage === 2 && <form className="step" onSubmit={submit} noValidate>
        <h2>② {t(UI("แจ้งการโอนและแนบสลิป", "Tell us about your transfer"))}</h2>
        <p><button type="button" className="link" onClick={() => setStage(1)}>← {t(UI("ดูข้อมูลการโอนอีกครั้ง", "See the transfer details again"))}</button></p>
        <label className="toggle"><input type="checkbox" checked={f.anonymous} onChange={set("anonymous")} /> <span>{t(UI("ไม่ประสงค์ออกนาม", "I'd like to stay anonymous"))}</span></label>
        {!f.anonymous && <label className="fb-field" htmlFor="d-name">{t(UI("ชื่อผู้สมทบ", "Your name"))} *<input id="d-name" value={f.name} onChange={set("name")} autoComplete="name" /></label>}
        <label className="fb-field" htmlFor="d-amount">{t(UI("จำนวนเงิน (บาท)", "Amount (THB)"))} *<input id="d-amount" type="number" min="1" step="0.01" inputMode="decimal" value={f.amount} onChange={set("amount")} /></label>
        <label className="fb-field" htmlFor="d-slip">{t(UI("สลิปการโอน (รูปหรือ PDF ไม่เกิน 8 MB)", "Transfer slip (image or PDF, up to 8 MB)"))} *
          <input id="d-slip" type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files[0] || null)} />
        </label>
        {file && !fileOk && <p className="notice" role="alert">{t(UI("ใช้ได้เฉพาะรูปหรือ PDF ขนาดไม่เกิน 8 MB", "Only images or PDFs up to 8 MB"))}</p>}
        {preview && <img className="slip-preview" src={preview} alt={t(UI("ตัวอย่างสลิปที่เลือก", "Preview of the chosen slip"))} />}
        <p className="quiet">{t(UI("สลิปมีชื่อและเลขบัญชีของคุณ เราใช้เพื่อยืนยันการโอน การทำบัญชีและการตรวจสอบเท่านั้น", "Your slip shows your name and account number. We use it only to confirm the transfer and for accounting and audit checks."))}</p>
        <label className="fb-field" htmlFor="d-note">{t(UI("ข้อความถึงวัด (ไม่ใส่ก็ได้)", "A message to the temple (optional)"))}<textarea id="d-note" rows={2} maxLength={500} value={f.note} onChange={set("note")} /></label>
        <label className="fb-field" htmlFor="d-email">{t(UI("อีเมลสำหรับแจ้งผลการตรวจ (ไม่ใส่ก็ได้)", "Email to hear when it's verified (optional)"))}<input id="d-email" type="email" value={f.email} onChange={set("email")} autoComplete="email" /></label>
        {!f.anonymous && (
          <fieldset className="fb-types">
            <legend>{t(UI("การขอบคุณ", "How we thank you"))}</legend>
            <label className={"fb-type" + (f.thanks === "private" ? " on" : "")}><input type="radio" name="d-thanks" value="private" checked={f.thanks === "private"} onChange={set("thanks")} /> {t(UI("ขอบคุณเป็นการส่วนตัว ไม่แสดงชื่อ", "Thank me privately; don't show my name"))}</label>
            <label className={"fb-type" + (f.thanks === "public" ? " on" : "")}><input type="radio" name="d-thanks" value="public" checked={f.thanks === "public"} onChange={set("thanks")} /> {t(UI("แสดงชื่อในรายชื่อผู้สนับสนุน (ไม่แสดงจำนวนเงิน)", "Show my name on the supporters list (never the amount)"))}</label>
          </fieldset>
        )}
        <label className="toggle consent"><input type="checkbox" checked={f.agree} onChange={set("agree")} /> <span>{t(UI("ฉันอายุ 18 ปีขึ้นไป และยินยอมให้เก็บข้อมูลและสลิปไว้เพื่อการตรวจสอบ", "I am 18+ and consent to my slip data being kept for audit purposes"))} ({S.retentionDays ? `${S.retentionDays} ${t(UI("วัน", "days"))}` : "…"}) *</span></label>
        <p className="quiet">{t(UI("ข้อมูลและสลิปใช้เพื่อยืนยันการโอน การทำบัญชีและการตรวจสอบ และเพื่อขอบคุณเท่านั้น แล้วลบทิ้ง ขอลบได้ที่ ", "The information and slip are used only to verify the transfer, for accounting and audit checks, and to thank you, then deleted. Request deletion at "))}{S.contact || "…"}</p>
        {!ready && <p className="notice"><Tag kind="unknown" /> {t(UI("ยังส่งไม่ได้: รอข้อมูลจริงจากทีม", "Can't be sent yet: awaiting from the team"))}: {[
          !(S.promptpayQr || S.promptpayId || S.bank) && t(UI("บัญชีรับเงิน", "the account")),
          !S.recipient && t(UI("ชื่อผู้รับเงิน", "the recipient")),
          !S.retentionDays && t(UI("ระยะเวลาเก็บข้อมูล", "the retention period")),
          !S.contact && t(UI("ช่องทางติดต่อสำหรับขอลบข้อมูล", "a contact for deletion requests")),
        ].filter(Boolean).join(", ")}</p>}
        {state === "error" && <p className="notice" role="alert">{t(UI("ส่งไม่สำเร็จ ลองอีกครั้ง", "Couldn't send. Please try again."))}</p>}
        <div className="row"><button type="submit" className="btn big" disabled={!valid}>{state === "sending" ? t(UI("กำลังส่ง…", "Sending…")) : t(UI("ส่งการแจ้งโอน", "Send transfer notice"))}</button></div>
        <p className="quiet">* {t(UI("จำเป็นต้องกรอก", "required"))}</p>
      </form>}
      <CommunityBox />
    </section>
  );
}

/* ---------- app shell & router ---------- */
const VIEWS = ["gate", "yard", "learn", "unit", "library", "media", "access", "rest", "care", "exit", "garden", "journey", "support", "feedback"];
function parseHash() {
  const h = (location.hash || "").replace("#", "");
  const m = h.match(/^u0([1-8])$/); if (m) return { view: "unit", arg: +m[1] - 1 };
  if (h === "wheel") return { view: "media", arg: "wheel" };
  return { view: VIEWS.includes(h) ? h : "gate", arg: null };
}
function App() {
  const [route, setRoute] = useState(parseHash);
  const [settings, setSettings] = useState(() => ({ lang: "th", size: "m", contrast: false, calmMotion: false, textOnly: false, mute: false, guide: true, ...store.get("settings", {}) }));
  const [remember, setRememberState] = useState(() => store.get("remember", false));
  const [trail, setTrail] = useState(() => (store.get("remember", false) ? store.get("trail", []) : []));
  const [seed, setSeed] = useState(null);
  const main = useRef(null);
  useEffect(() => { const f = () => setRoute(parseHash()); addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  useEffect(() => { store.set("settings", settings); const r = document.documentElement; r.lang = settings.lang; r.dataset.size = settings.size; r.dataset.contrast = settings.contrast ? "on" : "off"; r.dataset.motion = settings.calmMotion ? "calm" : "normal"; if (settings.mute) hush(); }, [settings]);
  useEffect(() => { if (remember) store.set("trail", trail); }, [trail, remember]);
  useEffect(() => { if (main.current) { main.current.focus({ preventScroll: true }); window.scrollTo(0, 0); } }, [route.view, route.arg]);
  const go = (view, arg = null) => { hush(); location.hash = view === "unit" ? "u0" + (arg + 1) : view === "media" && arg === "wheel" ? "wheel" : view; };
  const setRemember = (v) => { setRememberState(v); store.set("remember", v); if (!v) { store.del("trail"); } else store.set("trail", trail); };
  const addTrail = (u) => setTrail((tr) => (tr.length && tr[tr.length - 1].u === u ? tr : [...tr.filter((f) => f.u !== u), { u, code: UNITS[u].code }]));
  const clearTrail = () => { setTrail([]); store.del("trail"); };
  const lang = settings.lang;
  const t = (x) => (x == null ? "" : typeof x === "string" ? x : x[lang] ?? x.th);
  const ctx = { view: route.view, go, t, lang, settings, setSettings, remember, setRemember, trail, addTrail, clearTrail, seed, setSeed };
  const V = route.view;
  return (
    <Ctx.Provider value={ctx}>
      <a className="skip" href="#main">{t(UI("ข้ามไปที่เนื้อหา", "Skip to content"))}</a>
      {V !== "gate" && (
        <header className="top">
          <button className="brand" onClick={() => go("yard")} aria-label={t(UI("ลานกลาง", "Courtyard"))}>
            <span className="brand-mark" aria-hidden="true">☸</span><span>วัดสัมโพธายะ</span>
          </button>
          <Wayfinding />
        </header>
      )}
      <Prototype />
      <main id="main" ref={main} tabIndex={-1}>
        {V === "gate" && <Gate />}
        {V === "yard" && <Yard />}
        {V === "learn" && <Learn />}
        {V === "unit" && <Unit key={route.arg} k={route.arg} />}
        {V === "library" && <Library />}
        {V === "media" && <Media focus={route.arg} />}
        {V === "access" && <Access />}
        {V === "rest" && <Rest />}
        {V === "care" && <Care />}
        {V === "exit" && <Exit />}
        {V === "garden" && <Garden />}
        {V === "journey" && <Journey />}
        {V === "support" && <Support />}
        {V === "feedback" && <FeedbackPage />}
      </main>
      {V !== "feedback" && <FeedbackWidget />}
      {V === "gate" ? <footer className="foot"><Wayfinding /><a className="adult-link" href="#support">🤲 {t(UI("สมทบทุนพัฒนาและสร้างวัด (สำหรับผู้ใหญ่)", "Support the temple's development (for adults)"))}</a><CommunityLink /></footer> : <footer className="foot"><p className="rights">{t(UI("ที่นี่คุณ ถามได้ • ไม่เชื่อได้ • ตรวจได้ • ข้ามได้ • พักได้ • ออกได้", "Here you may ask • disagree • check • skip • rest • leave"))}</p><a className="adult-link" href="#support">🤲 {t(UI("สมทบทุนพัฒนาและสร้างวัด (สำหรับผู้ใหญ่)", "Support the temple's development (for adults)"))}</a><CommunityLink /></footer>}
    </Ctx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
