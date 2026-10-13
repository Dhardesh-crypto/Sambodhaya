// Sounds of the 3D temple, made in the browser with Web Audio (nothing is downloaded).
// Charter rule: nothing plays until the visitor presses something. The ambience starts only
// from the 🔈 button; the temple bell rings only when it is struck. Every sound sits at a
// place in the temple, so it comes from where its source is.
// The ambience follows the time of day: birds by day; crickets, frogs and the tokay gecko by night;
// the gong at dawn and dusk.

export function createSound({ high = true } = {}) {
  let ctx = null, master = null, outdoor = null, outdoorFilter = null, on = false;
  const sources = [];          // looping, placed sounds (waterfall)
  let windGain = null, leafGain = null, gust = 0.5, gustTarget = 0.5;
  let nextBird = 0, nextChime = 0, nextKoel = 0;
  let listener = { x: 0, y: 2, z: 0 };
  let chimeSpots = [], treeSpots = [], indoorNow = false;
  // the time of day: 1 is full day, 0 full night (birds by day; crickets, frogs and the gecko by night)
  let daylight = 1, nightGain = null, nextFrog = 0, nextGecko = 0;
  let pondSpots = [], geckoSpots = [], moatR = 0, moatGain = null, moatPan = null;

  /* ---------- building blocks ---------- */
  function noiseBuffer(kind, seconds = 4) {
    const n = ctx.sampleRate * seconds, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, last = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === "white") d[i] = w * 0.5;
      else if (kind === "pink") { b0 = 0.997 * b0 + w * 0.029591; b1 = 0.985 * b1 + w * 0.032534; b2 = 0.95 * b2 + w * 0.048056; d[i] = (b0 + b1 + b2 + w * 0.05) * 0.9; }
      else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; } // brown
    }
    return buf;
  }
  const loopNoise = (buf) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.loopStart = Math.random(); s.start(0, Math.random() * 2); return s; };
  // a sound placed in the world; distance and direction come from the listener (the camera)
  function placed(x, y, z, ref = 4, max = 60, rolloff = 1.2) {
    const p = ctx.createPanner();
    p.panningModel = high ? "HRTF" : "equalpower"; p.distanceModel = "inverse";
    p.refDistance = ref; p.maxDistance = max; p.rolloffFactor = rolloff;
    p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z;
    p.connect(outdoor); return p;
  }
  const env = (g, t, a, peak, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };

  /* ---------- the bells ---------- */
  // big bronze temple bell: inharmonic partials (hum, prime, tierce, quint, nominal...) with long decays
  function strikeBell(x, y, z) {
    if (!ctx) return;
    const t = ctx.currentTime + 0.02, out = placed(x, y, z, 6, 120, 0.8);
    const f = 196;
    [[0.5, 0.5, 9], [1, 0.55, 7], [1.19, 0.32, 5], [1.5, 0.22, 4], [2, 0.3, 4.5], [2.51, 0.14, 3], [2.99, 0.12, 2.6], [4.2, 0.07, 1.6], [5.4, 0.05, 1.1]].forEach(([r, a, d]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f * r * (1 + (Math.random() - 0.5) * 0.002);
      o.connect(g); g.connect(out); env(g, t, 0.004, a * 0.5, d); o.start(t); o.stop(t + d + 0.1);
      // a slow beat between two close partials makes the bell "wah"
      if (r === 1 || r === 0.5) { const o2 = ctx.createOscillator(), g2 = ctx.createGain(); o2.frequency.value = f * r * 1.004; o2.connect(g2); g2.connect(out); env(g2, t, 0.004, a * 0.3, d); o2.start(t); o2.stop(t + d + 0.1); }
    });
    // the wooden striker hitting bronze
    const s = ctx.createBufferSource(), sf = ctx.createBiquadFilter(), sg = ctx.createGain();
    s.buffer = noiseBuffer("white", 0.2); sf.type = "bandpass"; sf.frequency.value = 1800; sf.Q.value = 0.8;
    s.connect(sf); sf.connect(sg); sg.connect(out); env(sg, t, 0.002, 0.35, 0.08); s.start(t);
  }
  // small bells hanging from the eaves (kradueng), stirred by the breeze
  function chime(x, y, z, soft = 1) {
    const t = ctx.currentTime + 0.01, out = placed(x, y, z, 3, 40, 1.4);
    const f = 1900 + Math.random() * 900;
    [[1, 0.12, 1.6], [2.76, 0.05, 0.9], [5.4, 0.025, 0.5]].forEach(([r, a, d]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f * r;
      o.connect(g); g.connect(out); env(g, t, 0.002, a * soft, d); o.start(t); o.stop(t + d + 0.05);
    });
  }

  /* ---------- birds ---------- */
  // a bulbul-like twitter: a few quick rising and falling whistles
  function twitter(x, y, z) {
    const out = placed(x, y, z, 3, 45, 1.3); let t = ctx.currentTime + 0.02;
    const notes = 2 + Math.floor(Math.random() * 4), base = 2300 + Math.random() * 1400;
    for (let i = 0; i < notes; i++) {
      const o = ctx.createOscillator(), g = ctx.createGain(), d = 0.05 + Math.random() * 0.08;
      const f0 = base * (0.85 + Math.random() * 0.35), f1 = f0 * (Math.random() < 0.5 ? 1.35 : 0.75);
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d);
      o.connect(g); g.connect(out); env(g, t, 0.01, 0.06, d); o.start(t); o.stop(t + d + 0.05);
      t += d + 0.03 + Math.random() * 0.06;
    }
  }
  // the Asian koel's call (common across Thailand): "ko-el", repeated, each a little higher
  function koel(x, y, z) {
    const out = placed(x, y, z, 6, 90, 0.9); let t = ctx.currentTime + 0.05;
    const reps = 3 + Math.floor(Math.random() * 3); let lift = 1;
    for (let i = 0; i < reps; i++) {
      [[620, 640, 0.16], [760, 980, 0.32]].forEach(([a, b, d], j) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine"; o.frequency.setValueAtTime(a * lift, t); o.frequency.linearRampToValueAtTime(b * lift, t + d);
        o.connect(g); g.connect(out); env(g, t, 0.03, 0.08, d); o.start(t); o.stop(t + d + 0.05);
        t += d + (j ? 0.45 : 0.06);
      });
      lift *= 1.06;
    }
  }

  /* ---------- the night ---------- */
  // crickets: a high tone chopped into fast pulses, grouped into chirps; three voices spread left to right
  function crickets() {
    nightGain = ctx.createGain(); nightGain.gain.value = 0; nightGain.connect(outdoor);
    const lfo = (f, type, depth, param) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f; g.gain.value = depth; o.connect(g); g.connect(param); o.start(); };
    [[4300, 31, 2.1, -0.7], [4750, 27, 1.4, 0.6], [3900, 35, 2.9, 0.1]].slice(0, high ? 3 : 2).forEach(([f, pulse, chirp, pan]) => {
      const o = ctx.createOscillator(), a = ctx.createGain(), b = ctx.createGain(), v = ctx.createGain(), p = ctx.createStereoPanner();
      o.frequency.value = f; a.gain.value = 0.5; b.gain.value = 0.5; v.gain.value = 0.018; p.pan.value = pan;
      lfo(pulse, "square", 0.5, a.gain); lfo(chirp, "square", 0.5, b.gain);
      o.connect(a); a.connect(b); b.connect(v); v.connect(p); p.connect(nightGain); o.start();
    });
  }
  // frogs by the water: the deep "oong-aang" of the bullfrog (อึ่งอ่าง) or a small frog's rattling "krrk"
  function frog(x, y, z) {
    const out = placed(x, y, z, 3, 50, 1.3); let t = ctx.currentTime + 0.02;
    const voice = (f0, f1, d, q, centre, peak) => {
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f1, t + d);
      f.type = "bandpass"; f.frequency.value = centre; f.Q.value = q;
      o.connect(f); f.connect(g); g.connect(out); env(g, t, 0.03, peak, d); o.start(t); o.stop(t + d + 0.1);
    };
    if (Math.random() < 0.5) { voice(150, 175, 0.3, 3, 420, 1.4); t += 0.42; voice(190, 160, 0.38, 3, 520, 1.6); }
    else for (let i = 0, n = 4 + Math.floor(Math.random() * 5); i < n; i++) { voice(520, 470, 0.035, 3, 1000, 1.2); t += 0.06; }
  }
  // the tokay gecko (ตุ๊กแก): a rattle, then "tuk-kae" called five to eight times, slowing and fading
  function gecko(x, y, z) {
    const out = placed(x, y, z, 4, 60, 1.1); let t = ctx.currentTime + 0.05;
    const syl = (f0, f1, d, peak) => {
      const o = ctx.createOscillator(), r = ctx.createGain(), f = ctx.createBiquadFilter(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d);
      l.type = "square"; l.frequency.value = 45; lg.gain.value = 0.5; r.gain.value = 0.5; l.connect(lg); lg.connect(r.gain); // a croaky roughness
      f.type = "bandpass"; f.frequency.value = (f0 + f1) * 1.6; f.Q.value = 2.5;
      o.connect(r); r.connect(f); f.connect(g); g.connect(out); env(g, t, 0.01, peak, d);
      o.start(t); l.start(t); o.stop(t + d + 0.05); l.stop(t + d + 0.05);
    };
    syl(260, 230, 0.5, 0.25); t += 1.0;                                  // the opening rattle
    const n = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) { const k = 1 - i / (n * 1.6); syl(420, 380, 0.1, 1.8 * k); t += 0.2; syl(330, 230, 0.32, 2.0 * k); t += 0.75 + i * 0.07; }
  }
  // the temple gong (ฆ้อง) struck at dawn and dusk: three strokes, a deep hum with a slow beat
  function gong(x, y, z) {
    const out = placed(x, y, z, 8, 150, 0.7), f = 110;
    [0, 3.2, 6.1].forEach((dt, k) => {
      const t = ctx.currentTime + 0.05 + dt, soft = 1 - k * 0.2;
      [[1, 0.6, 8], [1.006, 0.35, 8], [2.02, 0.12, 4], [2.83, 0.16, 3.5], [4.1, 0.06, 2], [5.6, 0.03, 1.2]].forEach(([r, a, d]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.setValueAtTime(f * r * 1.01, t); o.frequency.exponentialRampToValueAtTime(f * r, t + 0.4); // the pitch settles after the stroke
        o.connect(g); g.connect(out); env(g, t, 0.008, a * 0.45 * soft, d); o.start(t); o.stop(t + d + 0.1);
      });
      const s = ctx.createBufferSource(), sf = ctx.createBiquadFilter(), sg = ctx.createGain(); // the padded mallet
      s.buffer = noiseBuffer("white", 0.2); sf.type = "lowpass"; sf.frequency.value = 400;
      s.connect(sf); sf.connect(sg); sg.connect(out); env(sg, t, 0.003, 0.5 * soft, 0.1); s.start(t);
    });
  }
  // water lapping at the moat's banks: one sound that follows him to the nearest point of the moat
  function moatWater() {
    moatPan = placed(0, 0, 0, 5, 60, 1.4);
    const a = loopNoise(noiseBuffer("pink")), f = ctx.createBiquadFilter(), lap = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
    f.type = "lowpass"; f.frequency.value = 1100;
    l.frequency.value = 0.35; lg.gain.value = 0.35; lap.gain.value = 0.65; l.connect(lg); lg.connect(lap.gain); l.start(); // slow swells
    moatGain = ctx.createGain(); moatGain.gain.value = 0;
    a.connect(f); f.connect(lap); lap.connect(moatGain); moatGain.connect(moatPan);
  }

  /* ---------- footsteps ---------- */
  let stepBuf = null;
  function step(surface) {
    if (!ctx) return;
    const t = ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = stepBuf; s.playbackRate.value = 0.9 + Math.random() * 0.2;
    if (surface === "wood") { f.type = "bandpass"; f.frequency.value = 520; f.Q.value = 1.4; }
    else if (surface === "stone") { f.type = "bandpass"; f.frequency.value = 1500; f.Q.value = 0.7; }
    else { f.type = "lowpass"; f.frequency.value = 900; }
    s.connect(f); f.connect(g); g.connect(master);
    env(g, t, 0.005, surface === "grass" ? 0.05 : 0.09, surface === "wood" ? 0.09 : 0.06); s.start(t, Math.random()); s.stop(t + 0.2);
    if (surface === "wood") { // the hollow knock of a wooden floor
      const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.08);
      o.connect(og); og.connect(master); env(og, t, 0.003, 0.08, 0.09); o.start(t); o.stop(t + 0.15);
    }
  }

  /* ---------- start / stop ---------- */
  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.0001; master.connect(ctx.destination);
    // everything outside goes through one filter, so stepping into a hall muffles the world
    outdoorFilter = ctx.createBiquadFilter(); outdoorFilter.type = "lowpass"; outdoorFilter.frequency.value = 18000;
    outdoor = ctx.createGain(); outdoor.connect(outdoorFilter); outdoorFilter.connect(master);
    stepBuf = noiseBuffer("white", 1);
    // breeze: brown noise through a slowly wandering band-pass
    const brown = noiseBuffer("brown"), pink = noiseBuffer("pink");
    const wind = loopNoise(brown), wf = ctx.createBiquadFilter(); wf.type = "bandpass"; wf.frequency.value = 380; wf.Q.value = 0.6;
    windGain = ctx.createGain(); windGain.gain.value = 0.05; wind.connect(wf); wf.connect(windGain); windGain.connect(outdoor);
    // leaves: pink noise, high-passed, swelling with each gust
    const leaves = loopNoise(pink), lf = ctx.createBiquadFilter(); lf.type = "highpass"; lf.frequency.value = 2600;
    leafGain = ctx.createGain(); leafGain.gain.value = 0.015; leaves.connect(lf); lf.connect(leafGain); leafGain.connect(outdoor);
    crickets(); if (moatR) moatWater();
  }
  function addWaterfall(x, y, z) {
    if (!ctx) { sources.push(["fall", x, y, z]); return; }
    const out = placed(x, y, z, 5, 70, 1.6);
    const a = loopNoise(noiseBuffer("pink")), af = ctx.createBiquadFilter(); af.type = "lowpass"; af.frequency.value = 2400;
    const b = loopNoise(noiseBuffer("brown")), g = ctx.createGain(); g.gain.value = 0.55;
    a.connect(af); af.connect(g); b.connect(g); g.connect(out);
  }

  return {
    get on() { return on; },
    places({ waterfalls = [], chimes = [], trees = [], ponds = [], geckos = [], moat = 0 }) {
      chimeSpots = chimes; treeSpots = trees; pondSpots = ponds; geckoSpots = geckos; moatR = moat;
      waterfalls.forEach(([x, y, z]) => sources.push(["fall", x, y, z]));
    },
    // how much daylight there is (1 day, 0 night); it may change gradually at dawn and dusk
    setDaylight(d) { daylight = Math.max(0, Math.min(1, d)); },
    // the gong at dawn and dusk: only when the visitor has the ambience on
    gong(x, y, z) { if (ctx && on) gong(x, y, z); },
    async start() {
      if (!ctx) { build(); sources.forEach(([k, x, y, z]) => k === "fall" && addWaterfall(x, y, z)); }
      await ctx.resume();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.8, ctx.currentTime + 2.5);   // fade in gently
      on = true;
    },
    stop() {
      if (!ctx) return; on = false;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      setTimeout(() => { if (!on && ctx) ctx.suspend(); }, 700);
    },
    pause() { if (ctx && on) ctx.suspend(); },
    resume() { if (ctx && on) ctx.resume(); },
    // the bell can be struck even with the ambience off: striking it is the visitor's own press
    async bell(x, y, z) {
      if (!ctx) build();
      if (!on) { await ctx.resume(); master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setValueAtTime(0.8, ctx.currentTime); }
      strikeBell(x, y, z);
      if (!on) setTimeout(() => { if (!on && ctx) { master.gain.setValueAtTime(0.0001, ctx.currentTime); ctx.suspend(); } }, 9500);
    },
    step(surface) { if (on) step(surface); },
    // rain: a soft hush, as heavy as level (0..1); outdoors, so a hall muffles it
    setRain(level) {
      if (!ctx || !on) return;
      if (!this._rain && level <= 0) return;
      if (!this._rain) {
        const src = loopNoise(noiseBuffer("pink")), hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
        hp.type = "highpass"; hp.frequency.value = 500; lp.type = "lowpass"; lp.frequency.value = 6500; g.gain.value = 0;
        src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(outdoor); this._rain = g;
      }
      this._rain.gain.setTargetAtTime(0.2 * level, ctx.currentTime, 0.5);
    },
    // the cat purring while she is petted: a low rumble pulsing about 25 times a second; level 0 is silent
    purr(level, x, y, z) {
      if (!ctx || !on) { if (this._purr) this._purr.g.gain.value = 0; return; }
      if (!this._purr && level <= 0) return;
      if (!this._purr) {
        const out = placed(x, y, z, 6, 30, 1), src = loopNoise(noiseBuffer("brown")), f = ctx.createBiquadFilter(), am = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain();
        f.type = "lowpass"; f.frequency.value = 180; l.frequency.value = 25; lg.gain.value = 0.5; am.gain.value = 0.5; l.connect(lg); lg.connect(am.gain); l.start();
        g.gain.value = 0; src.connect(f); f.connect(am); am.connect(g); g.connect(out);
        this._purr = { out, g };
      }
      const t = ctx.currentTime, P = this._purr;
      P.out.positionX.setTargetAtTime(x, t, 0.1); P.out.positionY.setTargetAtTime(y, t, 0.1); P.out.positionZ.setTargetAtTime(z, t, 0.1);
      P.g.gain.setTargetAtTime(0.6 * level, t, 0.2);
    },
    // holy water flicked from the whisk: a soft spatter of drops
    sprinkle(x, y, z) {
      if (!ctx || !on) return;
      const out = placed(x, y, z, 3, 30, 1.2), t0 = ctx.currentTime + 0.02, buf = noiseBuffer("white", 0.1);
      for (let i = 0; i < 9; i++) {
        const t = t0 + 0.12 + Math.random() * 0.35, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = buf; f.type = "bandpass"; f.frequency.value = 3500 + Math.random() * 3000; f.Q.value = 1.5;
        s.connect(f); f.connect(g); g.connect(out); env(g, t, 0.002, 0.08, 0.03); s.start(t); s.stop(t + 0.06);
      }
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); // the swish of the whisk
      s.buffer = noiseBuffer("pink", 0.4); f.type = "bandpass"; f.frequency.value = 1800; f.Q.value = 0.8;
      s.connect(f); f.connect(g); g.connect(out); env(g, t0, 0.05, 0.12, 0.2); s.start(t0); s.stop(t0 + 0.4);
    },
    // pigeons taking off: a clatter of wingbeats
    flutter(x, y, z) {
      if (!ctx || !on) return;
      const out = placed(x, y, z, 3, 40, 1.3), t0 = ctx.currentTime + 0.01, buf = noiseBuffer("white", 0.1);
      for (let i = 0, n = 6 + Math.floor(Math.random() * 5); i < n; i++) {
        const t = t0 + i * (0.07 + Math.random() * 0.03), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = buf; f.type = "bandpass"; f.frequency.value = 900 + Math.random() * 700; f.Q.value = 0.9;
        s.connect(f); f.connect(g); g.connect(out); env(g, t, 0.004, 0.35 * (1 - i / (n + 2)), 0.05); s.start(t); s.stop(t + 0.1);
      }
    },
    // for testing: the current output level (RMS) and the audio state
    level() {
      this._indoor = indoorNow;
      if (!ctx) return { state: "none" };
      if (!this._an) { this._an = ctx.createAnalyser(); this._an.fftSize = 2048; master.connect(this._an); }
      const d = new Float32Array(2048); this._an.getFloatTimeDomainData(d);
      return { state: ctx.state, time: ctx.currentTime, indoor: indoorNow, hidden: document.hidden, rms: Math.sqrt(d.reduce((a, v) => a + v * v, 0) / d.length) };
    },
    // called every frame with where the camera is, which way it looks, and whether we're indoors
    update(cam, fwd, indoor, dt) {
      if (!ctx) return;
      const L = ctx.listener, t = ctx.currentTime;
      listener = cam;
      if (L.positionX) { L.positionX.setTargetAtTime(cam.x, t, 0.05); L.positionY.setTargetAtTime(cam.y, t, 0.05); L.positionZ.setTargetAtTime(cam.z, t, 0.05); L.forwardX.setTargetAtTime(fwd.x, t, 0.05); L.forwardY.setTargetAtTime(fwd.y, t, 0.05); L.forwardZ.setTargetAtTime(fwd.z, t, 0.05); L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; }
      else { L.setPosition(cam.x, cam.y, cam.z); L.setOrientation(fwd.x, fwd.y, fwd.z, 0, 1, 0); }
      if (!on) return; // the listener still follows the camera, so a struck bell sounds from the right place
      // indoors: the outside is muffled and quieter
      indoorNow = indoor;
      outdoorFilter.frequency.setTargetAtTime(indoor ? 700 : 18000, t, 0.4);
      outdoor.gain.setTargetAtTime(indoor ? 0.45 : 1, t, 0.4);
      // gusts wander slowly; wind, leaves and the roof bells follow them
      if (Math.random() < dt * 0.15) gustTarget = 0.2 + Math.random() * 0.8;
      gust += (gustTarget - gust) * Math.min(1, dt * 0.3);
      windGain.gain.setTargetAtTime(0.05 + gust * 0.08, t, 0.5);
      leafGain.gain.setTargetAtTime(0.006 + gust * gust * 0.045, t, 0.5);
      const now = performance.now() / 1000;
      const near = (list, r) => list.filter(([x, , z]) => Math.hypot(x - cam.x, z - cam.z) < r);
      if (now > nextChime && gust > 0.45) {
        const c = near(chimeSpots, 35); if (c.length) { const [x, y, z] = c[Math.floor(Math.random() * c.length)]; chime(x, y, z, 0.6 + gust * 0.6); }
        nextChime = now + 0.6 + Math.random() * (3.5 - gust * 2.5);
      }
      const dark = 1 - daylight;
      nightGain.gain.setTargetAtTime(dark * dark, t, 1.5);
      if (moatGain) { // louder the closer he is to the water, from the point of the moat nearest him
        const r = Math.hypot(cam.x, cam.z) || 1, d = Math.abs(r - moatR), k = moatR / r;
        moatPan.positionX.setTargetAtTime(cam.x * k, t, 0.1); moatPan.positionZ.setTargetAtTime(cam.z * k, t, 0.1); moatPan.positionY.value = -0.4;
        moatGain.gain.setTargetAtTime(0.32 * Math.max(0, 1 - d / 22), t, 0.3);
      }
      if (now > nextFrog) {
        if (nextFrog && dark > 0.4) {
          const water = [...near(pondSpots, 40)];
          const r = Math.hypot(cam.x, cam.z); if (moatR && Math.abs(r - moatR) < 30) { const a = Math.atan2(cam.z, cam.x) + (Math.random() - 0.5) * 0.5, rr = moatR + (Math.random() - 0.5) * 6; water.push([Math.cos(a) * rr, -0.3, Math.sin(a) * rr]); }
          if (water.length) { const [x, y, z] = water[Math.floor(Math.random() * water.length)]; frog(x + (Math.random() - 0.5) * 3, y, z + (Math.random() - 0.5) * 3); }
        }
        nextFrog = now + 1.2 + Math.random() * 4;
      }
      if (now > nextGecko) {
        if (nextGecko && dark > 0.6 && geckoSpots.length) { const g = near(geckoSpots, 40), [x, y, z] = (g.length ? g : geckoSpots)[Math.floor(Math.random() * (g.length || geckoSpots.length))]; gecko(x, y, z); }
        nextGecko = now + 35 + Math.random() * 55;
      }
      if (now > nextBird) {
        const tr = near(treeSpots, 45); if (tr.length && !indoor && Math.random() < daylight) { const [x, y, z] = tr[Math.floor(Math.random() * tr.length)]; twitter(x, y + 4 + Math.random() * 3, z); }
        nextBird = now + (high ? 2.5 : 4) + Math.random() * 6;
      }
      if (now > nextKoel) {
        if (nextKoel && treeSpots.length && daylight > 0.5) { const [x, y, z] = treeSpots[Math.floor(Math.random() * treeSpots.length)]; koel(x, y + 6, z); }
        nextKoel = now + 25 + Math.random() * 40;
      }
    },
  };
}
