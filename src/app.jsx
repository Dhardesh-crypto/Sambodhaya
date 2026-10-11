const { useState, useEffect, useRef, createContext, useContext } = React;

/* ---------- settings & small helpers ---------- */
const Ctx = createContext(null);
const useApp = () => useContext(Ctx);
const store = {
  get(k, d) { try { const v = localStorage.getItem("sambodhaya-" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("sambodhaya-" + k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem("sambodhaya-" + k); } catch (e) {} },
};
const IMG = { bg: "img/temple-bg.webp", dog: "img/tup-calm.webp" };

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
function hush() { try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {} stopCalm(); }

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
function Listen({ text }) {
  const { lang, t } = useApp();
  return <button className="chip" onClick={() => readAloud(text, lang)}><span aria-hidden="true">🎧</span> {t(UI("ฟัง (เสียงจากเครื่อง)", "Listen (device voice)"))}</button>;
}

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
function Wayfinding() {
  const { go, t, view } = useApp();
  return (
    <nav className="wayfinding" aria-label={t(UI("ทางในวัด", "Temple paths"))}>
      {view !== "gate" && view !== "yard" && <button className="way" onClick={() => go("yard")}><span aria-hidden="true">↩️🌳</span> {t(UI("กลับลานกลาง", "Back to courtyard"))}</button>}
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

/* ---------- 🚪 Entrance ---------- */
function Gate() {
  const { go, t, settings } = useApp();
  return (
    <section className="gate" style={settings.textOnly ? null : { backgroundImage: `url(${IMG.bg})` }}>
      <div className="gate-card">
        <p className="brand-th">วัดสัมโพธายะ</p>
        <p className="brand-en">SAMBODHAYA</p>
        <h1>{t(UI("ยินดีต้อนรับสู่วัดสัมโพธายะ", "Welcome to Wat Sambodhaya"))}</h1>
        <p className="lede">{t(UI("ที่นี่คุณเข้ามาพัก เรียนรู้ หรือเดินดูได้ตามสบาย", "Here you can rest, learn or simply look around, as you like."))}</p>
        <button className="bell" onClick={() => ringBell(settings.mute)} aria-label={t(UI("ฟังเสียงระฆัง", "Ring the bell"))}>
          <span aria-hidden="true">🔔</span> {t(UI("ฟังเสียงระฆัง", "Ring the bell"))}
          <span className="bell-note">{t(UI("เลือกกดเองได้ • ไม่เปิดเอง", "Only if you press it • never plays by itself"))}</span>
        </button>
        <button className="btn big" onClick={() => go("yard")}>{t(UI("เข้าวัด →", "Enter the temple →"))}</button>
        <div className="gate-row">
          <button className="chip" onClick={() => go("access")}><span aria-hidden="true">🌐</span> {t(UI("ภาษา", "Language"))}</button>
          <button className="chip" onClick={() => go("access")}><span aria-hidden="true">♿</span> {t(UI("การเข้าถึง", "Accessibility"))}</button>
        </div>
        <p className="quiet">{t(UI("ไม่ต้องสมัคร • ไม่ต้องตอบคำถาม • อยากเดินดูเฉย ๆ ก็ได้", "No sign-up • no questions to answer • just looking around is fine"))}</p>
        <p className="rights">{t(UI("ที่นี่คุณ ถามได้ • ไม่เชื่อได้ • ตรวจได้ • ข้ามได้ • พักได้ • ออกได้", "Here you may ask • disagree • check • skip • rest • leave"))}</p>
        <p className="privacy">{t(UI("วัดนี้ไม่ขอชื่อ และไม่เก็บข้อมูลส่วนตัว การตั้งค่าภาษาและตัวอักษรจำไว้ในเครื่องนี้เท่านั้น", "This temple doesn't ask your name or keep personal data. Language and text settings are remembered on this device only."))}</p>
        <Teach text={UI("เข้ามาเพื่อเรียนรู้ ออกไปเพื่อรู้จักใจของตนเอง", "Come in to learn; go out to know your own mind.")} />
      </div>
    </section>
  );
}

/* ---------- 🌳 Courtyard ---------- */
const ZONES = [
  { id: "library", icon: "📚", name: UI("หอพระไตรปิฎก", "Tipiṭaka Hall"), want: UI("อยากรู้ว่ามาจากไหน", "I want to know where it comes from") },
  { id: "learn", icon: "🧘", name: UI("ศาลาเรียนรู้และฝึก", "Hall of Learning and Practice"), want: UI("อยากเรียนรู้", "I want to learn") },
  { id: "media", icon: "📖🎧🎬", name: UI("ศาลาสื่อ", "Media Hall"), want: UI("อยากอ่าน ฟัง หรือดู", "I want to read, listen or watch") },
  { id: "rest", icon: "🌿", name: UI("พื้นที่พักสงบ", "Quiet Rest Area"), want: UI("อยากพัก", "I want to rest") },
  { id: "access", icon: "🌍", name: UI("ศาลานานาชาติและการเข้าถึง", "Global Access Hall"), want: UI("อยากเปลี่ยนภาษา", "I want to change language") },
  { id: "care", icon: "🤝", name: UI("จุดผู้ดูแลวัด", "Temple Caretaker"), want: UI("อยากขอความช่วยเหลือ", "I want help") },
];
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
            <button key={z.id} className="sign" onClick={() => go(z.id)}>
              <span className="sign-icon" aria-hidden="true">{z.icon}</span>
              <span className="sign-name">{t(z.name)}</span>
              <span className="sign-want">{t(z.want)}</span>
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
        <Listen text={t(u.simple)} />
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
      <h1 className="zone-title"><span aria-hidden="true">📚</span> {t(UI("หอพระไตรปิฎก", "Tipiṭaka Hall"))}</h1>
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
                {mode === "listen" && <><Listen text={t(u.simple)} /><button className="chip" onClick={hush}>⏸️ {t(UI("หยุด", "Stop"))}</button></>}
                <button className="chip" onClick={() => go("unit", k)}>👣 {t(UI("เปิดเรื่องนี้และต้นทาง", "Open this story and its source"))}</button>
              </div>
            </li>
          ))}
          {mode === "listen" && <li className="quiet"><Tag kind="unknown" /> {t(UI("เสียงนี้อ่านโดยเสียงสังเคราะห์ของเครื่อง ยังไม่ใช่เสียงพากย์ที่ตรวจแล้ว", "This is read by your device's synthetic voice, not a reviewed narration."))}</li>}
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
      <h1 className="zone-title"><span aria-hidden="true">🌍♿</span> {t(UI("ภาษาและการเข้าถึง", "Language and access"))}</h1>
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
function Rest() {
  const { t, settings, setSettings } = useApp();
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => stopCalm(), []);
  return (
    <section className="zone rest">
      <h1 className="zone-title"><span aria-hidden="true">🌿</span> {t(UI("พื้นที่พักสงบ", "Quiet rest area"))}</h1>
      <p className="rest-line">{t(UI("พักตรงนี้ได้ ไม่ต้องรีบ", "You can rest here. No need to hurry."))}</p>
      <p className="quiet center">{t(UI("ไม่อยากทำอะไรก็ไม่ต้องทำ อยู่เงียบ ๆ ได้ และกลับเมื่อพร้อม", "If you don't want to do anything, you don't have to. You can stay quietly and go back when you're ready."))}</p>
      <div className="rest-space" aria-hidden="true" />
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

/* ---------- 🤝 Caretaker ---------- */
function Care() {
  const { t } = useApp();
  const [pick, setPick] = useState(null);
  const [note, setNote] = useState("");
  const options = [UI("ตรงนี้หนูไม่เข้าใจ", "I don't understand this part"), UI("หนูคิดว่าตรงนี้อาจผิด", "I think this part might be wrong"), UI("หนูหาทางไม่เจอ", "I can't find my way")];
  return (
    <section className="zone">
      <h1 className="zone-title"><span aria-hidden="true">🤝</span> {t(UI("จุดผู้ดูแลวัด", "Temple caretaker"))}</h1>
      <p className="lede">{t(UI("มีอะไรให้เราช่วยไหม?", "Can we help with anything?"))}</p>
      <p>{t(UI("พูดง่าย ๆ ได้เลย:", "Just say it simply:"))}</p>
      <div className="three">{options.map((o, k) => <button key={k} className={"tile" + (pick === k ? " on" : "")} onClick={() => setPick(k)}>{t(o)}</button>)}</div>
      {pick != null && (
        <div className="care-form">
          <label htmlFor="care-note">{t(UI("อยากบอกอะไรเพิ่มไหม? (ไม่ต้องใส่ชื่อ โรงเรียน หรือข้อมูลส่วนตัว)", "Anything to add? (No need for your name, school or personal details)"))}</label>
          <textarea id="care-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          <p className="notice"><Tag kind="unknown" /> {t(UI("ในต้นแบบนี้ ข้อความยังส่งถึงผู้ดูแลไม่ได้ ระบบรับเรื่องยังไม่ได้สร้าง", "In this prototype, messages can't reach the caretakers yet. The reporting system hasn't been built."))}</p>
          <p className="quiet">{t(UI("เมื่อระบบพร้อม คุณจะเห็นสถานะง่าย ๆ เพียง: รับเรื่องแล้ว • กำลังตรวจ • แก้แล้ว/ชี้แจงแล้ว", "When it's ready, you'll see a simple status: received • being checked • fixed or explained"))}</p>
        </div>
      )}
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

/* ---------- app shell & router ---------- */
const VIEWS = ["gate", "yard", "learn", "unit", "library", "media", "access", "rest", "care", "exit"];
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
      </main>
      {V === "gate" ? <footer className="foot"><Wayfinding /></footer> : <footer className="foot"><p className="rights">{t(UI("ที่นี่คุณ ถามได้ • ไม่เชื่อได้ • ตรวจได้ • ข้ามได้ • พักได้ • ออกได้", "Here you may ask • disagree • check • skip • rest • leave"))}</p></footer>}
    </Ctx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
