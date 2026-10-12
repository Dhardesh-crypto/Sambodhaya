// วัดสัมโพธายะ 3D — a calm, solo, Roblox-style walk through the temple.
// No scores, no collectibles, no sound unless pressed. Every hall links back to the
// 2D site, which stays the single place where the teaching content lives.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { createSound } from "./sound.js";

/* ---------------- settings shared with the 2D site ---------------- */
const read = (k, d) => { try { const v = localStorage.getItem("sambodhaya-" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
const write = (k, v) => { try { localStorage.setItem("sambodhaya-" + k, JSON.stringify(v)); return true; } catch (e) { return false; } };
const settings = { lang: "th", calmMotion: false, mute: false, guide: true, ...read("settings", {}) };
if (matchMedia("(prefers-reduced-motion: reduce)").matches) settings.calmMotion = true;
const L = settings.lang === "en" ? "en" : "th";
const tx = (th, en) => (L === "en" ? en : th);
document.documentElement.lang = L;
document.querySelectorAll("[data-th]").forEach((el) => { el.textContent = el.dataset[L]; });

/* ---------------- places: each opens the matching page of the site ---------------- */
const PLACES = [
  { id: "yard", icon: "🌳", th: "ลานกลาง", en: "Central Courtyard", sub: ["อยากไปไหนวันนี้?", "Where would you like to go today?"], href: "index.html#yard", pos: [0, 9], r: 9 },
  { id: "library", icon: "📚", th: "หอหลักฐาน · ห้องสมุด", en: "Evidence Library", sub: ["ดูต้นทาง หลักฐาน และสถานะการตรวจ", "Sources, evidence and checking status"], href: "index.html#library", pos: [-30, -16], r: 8 },
  { id: "learn", icon: "🧘", th: "ศาลาเรียนรู้", en: "Learning Hall", sub: ["เรียน ฝึก และสังเกตไปทีละก้าว", "Learn, practise and observe, one step at a time"], href: "index.html#learn", pos: [-14, -29.5], r: 5 },
  { id: "media", icon: "🎬", th: "ศาลาสื่อ", en: "Media Hall", sub: ["อ่าน ฟัง หรือดู", "Read, listen or watch"], href: "index.html#media", pos: [13, -30], r: 8 },
  { id: "access", icon: "🌍", th: "ศาลาสากล", en: "Universal Hall", sub: ["หลายภาษาและการเข้าถึง", "Languages and access"], href: "index.html#access", pos: [30, -16], r: 8 },
  { id: "rest", icon: "🪷", th: "พื้นที่พัก", en: "Rest Area", sub: ["พักใจได้เสมอ", "Rest any time"], href: "index.html#rest", pos: [-28, 14], r: 8 },
  { id: "care", icon: "🤝", th: "ผู้ดูแลวัดและหมาวัด", en: "Caretaker & temple dog", sub: ["มีคำถาม หรืออยากให้ช่วย", "Questions, or need a hand"], href: "index.html#care", pos: [28, 14], r: 8 },
  { id: "garden", icon: "🌿", th: "สวนสังเกตใจ", en: "Practice Garden", sub: ["กาย • ความรู้สึก • จิต • ธรรม", "Body • feelings • mind • Dhamma"], href: "index.html#garden", pos: [0, -50], r: 9 },
  { id: "journey", icon: "👣", th: "เส้นทางของฉัน", en: "My Journey", sub: ["ตามรอยเรื่องของพระพุทธเจ้าทีละก้าว", "Follow the Buddha's story step by step"], href: "index.html#journey", pos: [27, 47], r: 3 },
  { id: "exit", icon: "🚪", th: "ประตูออกจากวัด", en: "Exit gate", sub: ["เมื่อพร้อมแล้ว ออกจากวัดได้เสมอ", "When you're ready, you can always leave"], href: "index.html#exit", pos: [7, 37], r: 4 },
];
// The eight U01–U08 stepping stones of My Journey (titles from the Library's Child Output Records).
const JOURNEY = [
  ["ออกแสวงหา", "Going forth to seek"], ["อาฬาระและอุทกะ", "Āḷāra and Uddaka"], ["ทดลองทางที่หนักเกินไป", "Trying a path that was too harsh"],
  ["พบทางที่ต่างออกไป", "Finding a different path"], ["เริ่มสอน", "Beginning to teach"], ["เรียนรู้คำสอนสำคัญ", "Learning key teachings"],
  ["ช่วงสุดท้าย", "The final period"], ["ปรินิพพาน", "Parinibbāna"],
];

/* ---------------- renderer, scene, camera ---------------- */
// Quality: "high" = sunset sky lighting, soft shadows, glow and detailed models; "light" = for weaker phones.
// Chosen automatically the first time, then remembered on this device only.
const weak = matchMedia("(pointer: coarse)").matches && (navigator.deviceMemory || 4) <= 4;
let quality = read("world-quality", weak ? "light" : "high");
const HIGH = quality === "high";

const canvas = document.getElementById("view");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !HIGH, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, HIGH ? 1.75 : 1.25));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = HIGH ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xf3d2a4, 90, 290);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 600);

// warm late-afternoon light, like the entrance artwork
const hemi = new THREE.HemisphereLight(0xfff2d6, 0x6f8f4a, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd4a0, 2.3);
sun.position.set(-40, 55, 34);
sun.castShadow = true;
sun.shadow.mapSize.set(HIGH ? 4096 : 1024, HIGH ? 4096 : 1024);
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
Object.assign(sun.shadow.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 1, far: 200 });
scene.add(sun);
const hallLamps = []; // the lights inside the halls: brighter at night
let skyDome = null, skyHdr = null; // the painted dome (until the real sky loads) and the real sunset sky

// post-processing (high quality only): a soft glow on lanterns and candles
let composer = null, bloom = null;
if (HIGH) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.45, 1.05); composer.addPass(bloom);
  composer.addPass(new OutputPass());
}

/* ---------------- materials: real textures (CC0, Poly Haven) ---------------- */
const SKY_TURN = -1.8; // turns the sky so its low sun sits behind the entrance, where the shadows come from
const texLoader = new THREE.TextureLoader();
const texCache = {};
function tex(name, kind, rx, ry) {
  const key = `${name}_${kind}_${rx}_${ry}`;
  if (texCache[key]) return texCache[key];
  const t = texLoader.load(`assets/tex/${name}_${kind}.jpg`);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = HIGH ? 8 : 2;
  if (kind === "diff") t.colorSpace = THREE.SRGBColorSpace;
  return (texCache[key] = t);
}
// a textured material; in light mode only the colour map is used
function P(name, rx, ry, extra = {}) {
  const o = { map: tex(name, "diff", rx, ry), roughness: 1, ...extra };
  if (HIGH) { o.normalMap = tex(name, "nor", rx, ry); const arm = tex(name, "arm", rx, ry); o.roughnessMap = arm; o.aoMap = arm; o.normalScale = new THREE.Vector2(0.8, 0.8); }
  return new THREE.MeshStandardMaterial(o);
}

const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra });
const S = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
const MAT = {
  grass: new THREE.MeshStandardMaterial({ color: 0x7db552, roughness: 1, normalMap: HIGH ? tex("leafy_grass", "nor", 70, 70) : null, normalScale: new THREE.Vector2(0.6, 0.6) }), rock: P("mossy_rock", 3, 3), stone: P("brick_pavement_02", 3, 3, { color: new THREE.Color(1.75, 1.5, 1.2) }), stoneDark: M(0xb39f7d), wood: S(0x8a4a2a), woodDark: S(0x4a2a18),
  roof: P("clay_roof_tiles_02", 0.4, 0.4, { color: 0xffb08a }), roofEdge: S(0xd9a640, { metalness: 0.55, roughness: 0.5 }), wall: P("beige_wall_001", 2, 1, { color: 0xfff4e2 }), gold: S(0xe0b24a, { metalness: 0.65, roughness: 0.45 }),
  floor: P("brown_planks_05", 4, 4), lacquer: S(0x8e1f17, { roughness: 0.45 }), roofGreen: S(0x2f6b4a, { roughness: 0.5 }),
  leaf: M(0x5f9e4a), leafLight: M(0x7db85a), trunk: M(0x7a5536), water: new THREE.MeshStandardMaterial({ color: 0x2f7f8a, roughness: 0.06, metalness: 0.15, transparent: true, opacity: 0.88 }),
  lotus: M(0xf28fb0), pad: M(0x4d8f45), glow: M(0xffd27a, { emissive: 0xffb84a, emissiveIntensity: 0.9 }), mountain: M(0x9fb0b8), mountainFar: M(0xbcc8cc),
};
const add = (geo, mat, x, y, z, parent = scene, cast = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m; };
const colliders = []; // circles {x, z, r}
const blockers = [];  // rotated boxes {x, z, c, s, hx, hz}
const floors = [];    // raised floors you can walk onto, as rotated boxes {x, z, c, s, hx, hz, y}
const camBlock = [];  // meshes the camera must not look through (walls, ceilings)
const inFloor = (f, x, z) => { const lx = (x - f.x) * f.c - (z - f.z) * f.s, lz = (x - f.x) * f.s + (z - f.z) * f.c; return Math.abs(lx) < f.hx && Math.abs(lz) < f.hz ? lz : null; };
const groundAt = (x, z) => {
  let y = 0;
  for (const f of floors) {
    const lz = inFloor(f, x, z); if (lz == null) continue;
    y = Math.max(y, f.arch ? f.y * (1 - (lz / f.hz) ** 2) : f.y); // arched floors (the bridge) rise to their middle
  }
  return y;
};
const insideHall = (x, z) => floors.some((f) => f.hall && inFloor(f, x, z) != null);

/* ---------------- 3D props made for this temple (assets/models/*.glb) ---------------- */
// Each prop loads once and is cloned; if a file can't load, the simple shapes stay instead.
const propLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const propCache = {};
function loadProp(name) {
  if (!propCache[name]) propCache[name] = new Promise((res) => propLoader.load(`assets/models/${name}.glb`, (g) => res(g.scene), undefined, () => res(null)));
  return propCache[name];
}
// scale a model so its height is h and stand it on the ground at its centre
function fitTo(obj, h) {
  const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3());
  obj.scale.setScalar(h / (size.y || 1));
  const b2 = new THREE.Box3().setFromObject(obj), c = b2.getCenter(new THREE.Vector3());
  obj.position.set(-c.x, -b2.min.y, -c.z);
  const holder = new THREE.Group(); holder.add(obj); return holder;
}
const propJobs = [];
// place copies of a prop: list of [x, z, rotY, y?]; fallback() runs if the model is missing
function props(name, h, list, { fallback, shadow = true, parent = scene, extra = false } = {}) {
  if (extra && !HIGH) return Promise.resolve(); // purely decorative: skipped in light mode
  const job = loadProp(name).then((src) => {
    if (!src) { if (fallback) fallback(); return; }
    // work on a copy: the same model may be placed again elsewhere at another size
    const copy = src.clone();
    copy.traverse((o) => { if (o.isMesh) { o.castShadow = shadow; o.receiveShadow = true; if (o.material) o.material.envMapIntensity = 1; } });
    const base = fitTo(copy, h);
    list.forEach(([x, z, r = 0, y = 0]) => { const c = base.clone(); c.position.set(x, y, z); c.rotation.y = r; parent.add(c); });
  });
  propJobs.push(job); return job;
}

/* ---------------- sky & far mountains ---------------- */
{
  const g = new THREE.SphereGeometry(300, 32, 16);
  const c = []; const pos = g.attributes.position; const top = new THREE.Color(0x8cc4e8), mid = new THREE.Color(0xfbe3b8), low = new THREE.Color(0xf6c98a);
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 300; const col = y > 0.15 ? mid.clone().lerp(top, Math.min(1, (y - 0.15) / 0.6)) : low.clone().lerp(mid, (y + 0.2) / 0.35); c.push(col.r, col.g, col.b); }
  g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
  const dome = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }));
  scene.add(dome); skyDome = dome;
  // a real sunset sky (CC0 HDRI) lights every surface; the painted dome stays only if it can't load
  new RGBELoader().load("assets/tex/belfast_sunset_puresky_1k.hdr", (hdr) => {
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromEquirectangular(hdr).texture;
    scene.environmentIntensity = 0.75;
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = hdr; scene.backgroundIntensity = 0.9;
    scene.backgroundRotation.y = SKY_TURN; scene.environmentRotation.y = SKY_TURN;
    dome.visible = false; hemi.intensity = 0.45; pm.dispose();
    skyHdr = hdr; applyTime(); // (keeps night if it is night)
  });
  // soft rolling hills fading into the haze
  const hillGeo = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const hillMats = [S(0x6f9a5a, { roughness: 1 }), S(0x86a77a, { roughness: 1 }), S(0x9fb39a, { roughness: 1 })];
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + 0.1, d = 185 + (i % 3) * 25, h = 22 + ((i * 37) % 28), w = 40 + (i % 4) * 10;
    const m = add(hillGeo, hillMats[i % 3], Math.cos(a) * d, -1, Math.sin(a) * d, scene, false);
    m.scale.set(w, h, w * 0.8); m.rotation.y = i;
  }
}

/* ---------------- ground, plaza and paths ---------------- */
// the ground: the temple island, a moat around it, and the land beyond
const MOAT = { r1: 79, r2: 86, bed: -1.5, water: -0.45 };
const BRIDGE = { zc: (MOAT.r1 + MOAT.r2) / 2, half: (MOAT.r2 - MOAT.r1) / 2 + 2 }; // lands 2 m onto each bank
{
  // inner island; its texture coordinates are scaled to match the outer land
  const island = new THREE.CylinderGeometry(MOAT.r1, MOAT.r1, 2, 128);
  const uv = island.attributes.uv, k = MOAT.r1 / 120;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5 + (uv.getX(i) - 0.5) * k, 0.5 + (uv.getY(i) - 0.5) * k);
  add(island, MAT.grass, 0, -1, 0, scene, false);
  const outer = new THREE.Mesh(new THREE.RingGeometry(MOAT.r2, 120, 128, 1), MAT.grass);
  outer.rotation.x = -Math.PI / 2; outer.receiveShadow = true; scene.add(outer);
  // the moat: stone banks, a dark bed and still water
  const bankH = -MOAT.bed;
  [MOAT.r1, MOAT.r2].forEach((r) => { const b = add(new THREE.CylinderGeometry(r, r, bankH, 128, 1, true), P("mossy_rock", 40, 0.6), 0, MOAT.bed / 2, 0, scene, false); b.material.side = THREE.DoubleSide; });
  const bed = new THREE.Mesh(new THREE.RingGeometry(MOAT.r1, MOAT.r2, 128, 1), S(0x3d4a35, { roughness: 1 }));
  bed.rotation.x = -Math.PI / 2; bed.position.y = MOAT.bed; scene.add(bed);
  const water = new THREE.Mesh(new THREE.RingGeometry(MOAT.r1, MOAT.r2, 128, 1), MAT.water.clone()); // clearer than the ponds: the fish show beneath it
  water.material.opacity = 0.58; water.renderOrder = 2;
  water.rotation.x = -Math.PI / 2; water.position.y = MOAT.water; scene.add(water);
  // a few lotus pads drifting in the moat
  for (let i = 0; i < 70; i++) {
    const a = i * 2.39996, r = MOAT.r1 + 1 + ((i * 37) % 50) / 10;
    if (Math.sin(a) > 0.97) continue; // keep the water under the bridge clear
    add(new THREE.CylinderGeometry(0.6, 0.6, 0.04, 10), MAT.pad, Math.cos(a) * r, MOAT.water + 0.03, Math.sin(a) * r, scene, false);
  }
}
// paving is laid flush: its surface is only a few centimetres above the grass, where feet walk
add(new THREE.CylinderGeometry(16, 16, 0.2, 64), P("brick_pavement_02", 11, 11, { color: new THREE.Color(1.75, 1.5, 1.2) }), 0, -0.06, 0, scene, false);
const paths = []; // for footsteps: stone on paths, grass elsewhere
const path = (x1, z1, x2, z2, w = 5) => {
  paths.push({ x1, z1, x2, z2, w });
  const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz);
  const m = add(new THREE.BoxGeometry(w, 0.15, len), P("brick_pavement_02", Math.round(w / 3), Math.round(len / 3), { color: new THREE.Color(1.75, 1.5, 1.2) }), (x1 + x2) / 2, -0.05, (z1 + z2) / 2, scene, false);
  m.rotation.y = Math.atan2(dx, dz);
};
// the roads start inside the plaza circle, so no grass shows where a straight edge meets the curve
const ROAD = 7;
// the roads run half a metre onto each end of the bridge, so road and bridge join without a gap
path(0, 13, 0, BRIDGE.zc - BRIDGE.half + 0.5, ROAD); path(0, BRIDGE.zc + BRIDGE.half - 0.5, 0, 98, ROAD); path(0, -13, 0, -44); // entrance and Practice Garden; the hall paths are drawn from the halls themselves
// the walking-meditation lane (ทางเดินจงกรม) on the lawn by the kuti: a straight strip of raked sand
const LANE = { x1: 22, z1: -9, x2: 34, z2: -9, w: 1.5 };
{
  paths.push(LANE);
  const len = Math.hypot(LANE.x2 - LANE.x1, LANE.z2 - LANE.z1);
  const m = add(new THREE.BoxGeometry(LANE.w, 0.12, len + 1), S(0xd9c49a, { roughness: 1 }), (LANE.x1 + LANE.x2) / 2, -0.04, (LANE.z1 + LANE.z2) / 2, scene, false);
  m.rotation.y = Math.atan2(LANE.x2 - LANE.x1, LANE.z2 - LANE.z1); m.receiveShadow = true;
}

/* ---------------- the great tree at the centre ---------------- */
{
  add(new THREE.CylinderGeometry(6.5, 7, 1.2, 48), P("beige_wall_001", 6, 1, { color: 0xfff8ee }), 0, 0.6, 0);
  add(new THREE.TorusGeometry(6.55, 0.09, 8, 64), MAT.gold, 0, 1.2, 0, scene, false).rotation.x = Math.PI / 2;
  add(new THREE.CylinderGeometry(5.8, 5.8, 0.3, 48), S(0x5a4632, { roughness: 1 }), 0, 1.25, 0, scene, false);
  const simple = new THREE.Group(); scene.add(simple);
  add(new THREE.CylinderGeometry(1.4, 2.2, 10, 8), MAT.trunk, 0, 6, 0, simple);
  [[-2.5, 7, 0.8, -0.6], [2.4, 8, -0.4, 0.7], [0.5, 9, 2.2, 0.3]].forEach(([x, y, z, r]) => { const b = add(new THREE.CylinderGeometry(0.5, 0.8, 6, 6), MAT.trunk, x, y, z, simple); b.rotation.z = r; b.rotation.x = z * 0.2; });
  [[0, 14, 0, 8], [-6, 12, 2, 5.5], [6, 12.5, -1, 5.5], [2, 15, 5, 5], [-3, 15.5, -5, 5], [5, 11, 5, 4.5], [-5, 11, -4, 4.5]].forEach(([x, y, z, r], i) =>
    add(new THREE.IcosahedronGeometry(r, 1), i % 2 ? MAT.leaf : MAT.leafLight, x, y, z, simple));
  // the Bodhi tree model replaces the simple one once it has loaded
  loadProp("bodhi").then((m) => { if (m) simple.visible = false; });
  props("bodhi", 18, [[0, 0, 0.6, 1.4]]);
  colliders.push({ x: 0, z: 0, r: 7 });
}

/* ---------------- lanterns ---------------- */
// the pair by the gate stand just outside it, in front of the gate posts, so the doors can swing shut
const LAMP_HEAD = 3.45; // height of a lamp post's lantern (it glows at night)
const lanternSpots = [[-5, 20], [5, 20], [-4.7, 39.5], [4.7, 39.5], [-5, 50], [5, 50], [-5, 63], [5, 63], [-5, 95], [5, 95], [-17, 0], [17, 0], [-4.5, -30], [4.5, -30]];
const lantern = (x, z) => {
  add(new THREE.BoxGeometry(0.5, 2.4, 0.5), MAT.woodDark, x, 1.2, z);
  add(new THREE.BoxGeometry(1, 1, 1), MAT.glow, x, 2.9, z);
  add(new THREE.ConeGeometry(0.9, 0.6, 4), MAT.roof, x, 3.7, z).rotation.y = Math.PI / 4;
};
lanternSpots.forEach(([x, z]) => colliders.push({ x, z, r: 0.7 }));
props("lamppost", 4.2, lanternSpots.map(([x, z]) => [x, z, Math.atan2(-x, -z)]), { fallback: () => lanternSpots.forEach(([x, z]) => lantern(x, z)) });

/* ---------------- ponds with lotus ---------------- */
const ponds = [];
const pond = (x, z, r) => {
  ponds.push({ x, z, r });
  add(new THREE.CylinderGeometry(r + 0.7, r + 0.9, 0.55, 40), MAT.rock, x, 0.22, z, scene, false);
  add(new THREE.CylinderGeometry(r, r, 0.3, 40), MAT.water, x, 0.4, z, scene, false);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4, d = r * (0.3 + ((i * 7) % 6) / 10);
    const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
    add(new THREE.CylinderGeometry(0.7, 0.7, 0.06, 10), MAT.pad, px, 0.58, pz, scene, false);
    if (i % 2 === 0) { const f = add(new THREE.ConeGeometry(0.35, 0.6, 6), MAT.lotus, px, 0.9, pz); f.rotation.x = Math.PI; }
  }
  colliders.push({ x, z, r: r + 0.6 });
};
pond(-14, 30, 6); pond(14, 30, 6); pond(-36, 22, 5); pond(36, 24, 4);

/* ---------------- text signs (Thai-ready canvas textures) ---------------- */
const signDraws = [];
function signTexture(title, sub, icon) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 220;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const draw = () => {
  const g = c.getContext("2d"); g.clearRect(0, 0, 512, 220);
  g.fillStyle = "#fffdf8"; g.strokeStyle = "#3a2a1d"; g.lineWidth = 8;
  g.beginPath(); g.roundRect(6, 6, 500, 208, 30); g.fill(); g.stroke();
  g.fillStyle = "#3a2a1d"; g.font = "64px Itim, sans-serif"; g.textBaseline = "middle";
  g.fillText((icon ? icon + " " : "") + title, 30, 78, 452);
  g.fillStyle = "#6e5c4c"; g.font = "36px Mali, sans-serif"; g.fillText(sub || "", 30, 158, 452);
  t.needsUpdate = true;
  };
  draw(); signDraws.push(draw); return t;
}
const signMats = [];
function sign(title, sub, icon, x, y, z, w = 6) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: signTexture(title, sub, icon), depthWrite: false }));
  signMats.push(s.material); // dimmed at night
  s.scale.set(w, w * 220 / 512, 1); s.position.set(x, y, z); scene.add(s); return s;
}

/* ---------------- Thai sala: the one building every hall is made from ---------------- */
function gable(w, d, h, mat) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(0, h); s.lineTo(w / 2, 0); s.lineTo(-w / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2);
  return new THREE.Mesh(g, mat);
}
// A sala you can walk into: stone base, wooden floor, red lacquer columns, a two-tier roof with
// gold gable panels and chofa finials. Walls on three sides (front open), or none for a pavilion.
// Everything is built in the hall's own coordinates: +z is the open front.
function sala({ x, z, rot = 0, W = 13, D = 10, H = 5.6, walls = true }) {
  const FY = 0.35;
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
  const c = Math.cos(rot), s = Math.sin(rot);
  const toWorld = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  const block = (lx, lz, hx, hz) => { const [bx, bz] = toWorld(lx, lz); blockers.push({ x: bx, z: bz, c, s, hx, hz }); };
  const post = (lx, lz, r) => { const [px, pz] = toWorld(lx, lz); colliders.push({ x: px, z: pz, r }); };
  // stone base, front step and wooden floor
  add(new THREE.BoxGeometry(W + 1.6, FY - 0.02, D + 1.6), MAT.stoneDark, 0, (FY - 0.02) / 2, 0, g, false);
  add(new THREE.BoxGeometry(W + 0.4, 0.06, D + 0.4), MAT.floor, 0, FY, 0, g, false);
  add(new THREE.BoxGeometry(Math.min(5, W - 2), 0.18, 1), MAT.stoneDark, 0, 0.09, D / 2 + 1.2, g, false);
  { const [sx, sz] = toWorld(0, D / 2 + 1.2); floors.push({ x: sx, z: sz, c, s, hx: Math.min(5, W - 2) / 2, hz: 0.5, y: 0.18 }); } // the step you step up onto
  floors.push({ x, z, c, s, hx: W / 2 + 0.8, hz: D / 2 + 0.8, y: FY + 0.03, hall: true });
  const colGeo = new THREE.CylinderGeometry(0.28, 0.32, H, 16), capGeo = new THREE.CylinderGeometry(0.42, 0.3, 0.45, 16), footGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.25, 16);
  const column = (lx, lz, solid) => {
    add(colGeo, MAT.lacquer, lx, FY + H / 2, lz, g);
    add(capGeo, MAT.gold, lx, FY + H - 0.85, lz, g, false);
    add(footGeo, MAT.gold, lx, FY + 0.12, lz, g, false);
    if (solid) post(lx, lz, 0.45);
  };
  const beam = (w, lx, lz, ry = 0) => {
    const b = add(new THREE.BoxGeometry(w, 0.6, 0.5), MAT.lacquer, lx, FY + H - 0.3, lz, g); b.rotation.y = ry;
    const t = add(new THREE.BoxGeometry(w + 0.1, 0.12, 0.56), MAT.gold, lx, FY + H - 0.66, lz, g, false); t.rotation.y = ry;
  };
  let n = Math.max(3, Math.round(W / 2.6)); if (n % 2 === 0) n += 1; // odd gaps: the doorway in the middle stays open
  if (walls) {
    const wall = (w, d, lx, lz) => { const m = add(new THREE.BoxGeometry(w, H, d), MAT.wall, lx, FY + H / 2, lz, g); camBlock.push(m); };
    wall(W, 0.4, 0, -D / 2); wall(0.4, D, -W / 2, 0); wall(0.4, D, W / 2, 0);
    block(0, -D / 2, W / 2, 0.3); block(-W / 2, 0, 0.3, D / 2); block(W / 2, 0, 0.3, D / 2);
    // red lacquer wainscot inside
    add(new THREE.BoxGeometry(W - 0.5, 1, 0.05), MAT.lacquer, 0, FY + 0.5, -D / 2 + 0.23, g, false);
    [-1, 1].forEach((sg) => add(new THREE.BoxGeometry(0.05, 1, D - 0.2), MAT.lacquer, sg * (W / 2 - 0.23), FY + 0.5, 0.1, g, false));
    // the two columns either side of the doorway stand at least DOOR from the middle, so the way in is wide enough to walk through
    const DOOR = 1.3;
    for (let i = 0; i <= n; i++) { let lx = -W / 2 + 0.3 + i * (W - 0.6) / n; if (Math.abs(lx) < DOOR) lx = Math.sign(lx) * DOOR; column(lx, D / 2 + 0.2, i > 0 && i < n); }
  } else {
    // open pavilion: columns on all four sides
    for (let i = 0; i <= n; i++) { const lx = -W / 2 + 0.3 + i * (W - 0.6) / n; column(lx, D / 2 + 0.2, true); column(lx, -D / 2 + 0.2, true); }
    beam(W + 0.6, 0, -D / 2 + 0.2);
    [-1, 1].forEach((sg) => beam(D + 0.5, sg * (W / 2 - 0.3), 0, Math.PI / 2));
  }
  beam(W + 0.6, 0, D / 2 + 0.2);
  camBlock.push(add(new THREE.BoxGeometry(W + 0.4, 0.25, D + 0.6), MAT.woodDark, 0, FY + H + 0.12, 0.1, g));
  // two-tier roof
  [[W + 3.4, D + 3.4, H * 0.68, FY + H + 0.2], [W * 0.72, D * 0.86, H * 0.57, FY + H + H * 0.43]].forEach(([rw, rd, rh, ry]) => {
    const r = gable(rw, rd, rh, MAT.roof); r.position.y = ry; r.castShadow = true; g.add(r); camBlock.push(r);
    [-1, 1].forEach((sg) => {
      const e = gable(rw + 0.3, 0.25, rh + 0.15, MAT.roofEdge); e.position.set(0, ry - 0.05, sg * rd / 2); g.add(e);
      const pnl = gable(rw * 0.55, 0.12, rh * 0.55, MAT.gold); pnl.position.set(0, ry + 0.25, sg * (rd / 2 + 0.1)); g.add(pnl);
      const f = add(new THREE.ConeGeometry(0.25, 1.8, 6), MAT.gold, 0, ry + rh + 0.7, sg * rd / 2, g); f.rotation.x = sg * 0.55;
    });
    const bt = new THREE.BoxGeometry(0.25, 0.25, rd + 0.3);
    [-1, 1].forEach((sg) => { const b = add(bt, MAT.roofGreen, sg * rw / 2, ry + 0.05, 0, g, false); b.rotation.z = sg * 0.1; });
  });
  // warm light inside
  const lamp = new THREE.PointLight(0xffd2a0, walls ? 14 : 6, Math.max(W, D) + 2, 2); lamp.position.set(0, FY + H - 0.3, walls ? -D / 4 : 0); g.add(lamp);
  hallLamps.push({ light: lamp, day: lamp.intensity, night: walls ? 34 : 18 });
  return { g, toWorld, block, post, W, D, H, FY, signAt: [...toWorld(0, D / 2 + 2.4), FY + H + H * 0.62] };
}

/* ---------------- wall boards (canvas textures so the Thai text stays sharp) ---------------- */
const seg = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter(L, { granularity: "word" }) : null;
function wrapText(gx, text, maxW) {
  const parts = seg ? [...seg.segment(text)].map((p) => p.segment) : text.split(/(\s+)/);
  const lines = []; let cur = "";
  for (const p of parts) { if (gx.measureText(cur + p).width > maxW && cur) { lines.push(cur.trim()); cur = p; } else cur += p; }
  if (cur.trim()) lines.push(cur.trim()); return lines;
}
// a framed board: small heading, a round icon, a title and an optional footnote
function boardTexture({ head = "", icon = "", title = "", foot = "", wide = false }) {
  const Wd = wide ? 768 : 512, Hd = 640;
  const c = document.createElement("canvas"); c.width = Wd; c.height = Hd;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const draw = () => {
    const gx = c.getContext("2d");
    gx.fillStyle = "#7a1c14"; gx.fillRect(0, 0, Wd, Hd);
    gx.fillStyle = "#e8b84a"; gx.fillRect(14, 14, Wd - 28, Hd - 28);
    gx.fillStyle = "#fdf3dc"; gx.fillRect(30, 30, Wd - 60, Hd - 60);
    gx.strokeStyle = "#c9963a"; gx.lineWidth = 3; gx.strokeRect(46, 46, Wd - 92, Hd - 92);
    gx.textAlign = "center"; gx.textBaseline = "middle";
    if (head) { gx.fillStyle = "#a5560f"; gx.font = "44px Itim, sans-serif"; gx.fillText(head, Wd / 2, 118); }
    if (icon) { gx.beginPath(); gx.arc(Wd / 2, 228, 64, 0, Math.PI * 2); gx.fillStyle = "#f2cc62"; gx.fill(); gx.font = "70px sans-serif"; gx.fillStyle = "#3a2a1d"; gx.fillText(icon, Wd / 2, 232); }
    gx.font = "52px Itim, sans-serif"; gx.fillStyle = "#3a2a1d";
    wrapText(gx, title, Wd - 132).slice(0, 3).forEach((ln, i) => gx.fillText(ln, Wd / 2, 360 + i * 66));
    if (foot) { gx.font = "28px Mali, sans-serif"; gx.fillStyle = "#6e5c4c"; wrapText(gx, foot, Wd - 132).slice(0, 2).forEach((ln, i) => gx.fillText(ln, Wd / 2, 552 + i * 36)); }
    t.needsUpdate = true;
  };
  draw(); signDraws.push(draw); return t;
}
// hang a board on a sala wall: side = "back" | "left" | "right", at offset u along that wall
function wallBoard(h, side, u, tex, w = 1.7, ht = 2.12, y = 2.6) {
  // unlit, so the text reads the same in bright sun and in shade
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, ht), new THREE.MeshBasicMaterial({ map: tex, color: 0xe2e2e2 }));
  let lx, lz;
  if (side === "back") { lx = u; lz = -h.D / 2 + 0.22; }
  else { const sg = side === "left" ? -1 : 1; lx = sg * (h.W / 2 - 0.22); lz = u; m.rotation.y = -sg * Math.PI / 2; }
  m.position.set(lx, h.FY + y, lz); h.g.add(m);
  // where to stand to read it
  const [sx, sz] = side === "back" ? h.toWorld(lx, lz + 1.4) : h.toWorld(lx * 0.8, lz);
  return { x: sx, z: sz };
}
const cushGeo = new THREE.CylinderGeometry(0.42, 0.46, 0.2, 24), rimGeo = new THREE.TorusGeometry(0.44, 0.035, 8, 32);
const cushMat = S(0x9b2a1d, { roughness: 0.95 });
const cushionSpots = []; // where you can sit down: on a cushion, facing the front of the hall (the altar and the teachers)
function cushion(h, lx, lz) {
  add(cushGeo, cushMat, lx, h.FY + 0.1, lz, h.g); const r = add(rimGeo, MAT.gold, lx, h.FY + 0.19, lz, h.g, false); r.rotation.x = Math.PI / 2;
  const [x, z] = h.toWorld(lx, lz); cushionSpots.push({ x, z, top: 0.2, yaw: h.g.rotation.y + Math.PI });
}
// candles with soft flames (they glow; no sound); every flame sways a little unless calm motion is on
const flameMat = new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffa53a, emissiveIntensity: 3 });
const waxMat = S(0xfff6e4, { roughness: 0.7 });
const flames = [];
function candle(parent, lx, y, lz, tall = 0.45) {
  add(new THREE.CylinderGeometry(0.06, 0.06, tall, 10), waxMat, lx, y + tall / 2, lz, parent, false);
  const f = add(new THREE.SphereGeometry(0.06, 10, 8), flameMat, lx, y + tall + 0.08, lz, parent, false); f.scale.y = 1.8; flames.push(f);
}
function hangLanterns(h, spots) { props("lantern", 1.3, spots.map(([lx, lz]) => [lx, lz, 0, h.FY + h.H - 1.35]), { shadow: false, parent: h.g }); }

/* ---------------- the halls ---------------- */
const signs = [];
const halls = {};
const salas = {};
const boards = [];
// Every hall faces the Bodhi tree, and its path runs straight from the plaza to its front steps.
const facing = (x, z) => Math.atan2(-x, -z);
const hallAt = (x, z, o) => sala({ x, z, rot: facing(x, z), ...o });
salas.learn = hallAt(-14, -38, { W: 13, D: 11 });
salas.library = hallAt(-30, -24, { W: 13, D: 10 });
salas.media = hallAt(14, -38, { W: 13, D: 10 });
salas.access = hallAt(30, -24, { W: 13, D: 10 });
salas.care = hallAt(34, 6, { W: 10, D: 8, H: 5 });
salas.rest = hallAt(-28, 14, { W: 8, D: 6, H: 4, walls: false });
Object.entries(salas).forEach(([id, h]) => {
  halls[id] = h.g;
  const [sx, sz] = h.toWorld(0, h.D / 2 + 1.7);            // the front step
  const d = Math.hypot(sx, sz);
  path(sx / d * 15.2, sz / d * 15.2, sx, sz, 4.2);
  const p = PLACES.find((q) => q.id === id);                // "press E" spot: just in front of the steps
  const [px, pz] = h.toWorld(0, h.D / 2 + 2.6); p.pos = [px, pz]; p.r = 6;
});

PLACES.forEach((p) => {
  if (p.id === "yard" || p.id === "exit") return;
  const h = salas[p.id];
  // the garden's sign hangs before the rock wall, beside the waterfall, so it hides neither the fall nor the great Buddha above
  const [sx, sz, sy] = h ? h.signAt : ({ garden: [-6.6, -55, 7.4], journey: [15, 49, 5] }[p.id] || [...p.pos, 5]);
  signs.push(sign(L === "en" ? p.en : p.th, p.sub[L === "en" ? 1 : 0], p.icon, sx, sy, sz, 5.2));
});
sign(tx("ลานกลาง", "Central Courtyard"), tx("อยากไปไหนวันนี้?", "Where would you like to go today?"), "🌳", 0, 21, 0, 8);

/* ---- The shrine, shared by the Learning Hall and the Universal Hall ----
   Seating follows temple custom: visitors and students sit on the floor; teachers and monks sit on a
   raised platform along the back wall; the Buddha image sits on a stepped altar on that platform,
   always the highest of all. The platform is not walkable, as lay visitors don't step onto it.
   Returns the local z of the platform's front edge. */
const buddhaImages = [];
const altars = []; // the low incense tables before the shrines (merit-making, below)
// offerings before an image are made kneeling: he kneels this far from the table (or the gold-leaf stand) to reach
// it, then moves back on his knees to bow three times from the kraap's spot, clear of the table
const KNEEL_NEAR = 0.6, KRAAP_BACK = 2.3, INCENSE_H = 0.45, INCENSE_D = 0.5, GILD_H = 0.5, GILD_D = 0.6;
const gildImage = { mesh: null, leaves: [] }; // the small image for gold leaf, in the Universal Hall
// folded monks' robes (the same brown as the monks wear), stacked
const robeMat = S(0x8a4f22, { roughness: 0.9 }), robeEdge = S(0x6e3d18, { roughness: 0.9 });
function robeStack(parent, x, y, z, n = 1) {
  for (let i = 0; i < n; i++) { add(new THREE.BoxGeometry(0.42, 0.1, 0.32), i % 2 ? robeEdge : robeMat, x + (i % 2) * 0.01, y + 0.05 + i * 0.1, z, parent); }
}
// Kathina (กฐิน): the offering gifts (บริวารกฐิน) on a low table on the platform, before the monks and to the
// senior monk's left: folded robes with a pillow, an alms bowl, a folded umbrella and a candle
function kathinGifts(g, tx0, y, tz0) {
  props("table", 0.45, [[tx0, tz0, 0, y]], { parent: g });
  const T = y + 0.45;
  robeStack(g, tx0 - 0.45, T, tz0, 3);
  add(new THREE.BoxGeometry(0.4, 0.12, 0.28), S(0xd9c48a, { roughness: 0.95 }), tx0 - 0.45, T + 0.36, tz0, g); // a pillow on the robes
  add(new THREE.SphereGeometry(0.2, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), S(0x1a1a1e, { roughness: 0.35, metalness: 0.2 }), tx0 + 0.1, T + 0.2, tz0, g).rotation.x = Math.PI; // the bowl
  add(new THREE.CylinderGeometry(0.19, 0.19, 0.04, 20), S(0x1a1a1e, { roughness: 0.35 }), tx0 + 0.1, T + 0.02, tz0, g, false);
  const umb = new THREE.Group(); umb.position.set(tx0 + 0.55, T, tz0 - 0.1); umb.rotation.z = 0.5; g.add(umb); // the folded umbrella (กลด), lying
  add(new THREE.ConeGeometry(0.09, 0.75, 10), S(0xe8dcc0, { roughness: 0.8 }), 0, 0.4, 0, umb);
  add(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 6), MAT.wood, 0, 0.45, 0, umb, false);
  candle(g, tx0 + 0.3, T, tz0 + 0.2, 0.25);
}
// the Kathina robe on a gold pedestal tray (พาน); its origin is the bottom of the foot
function kathinTray() {
  const g = new THREE.Group();
  add(new THREE.CylinderGeometry(0.12, 0.16, 0.06, 20), MAT.gold, 0, 0.03, 0, g);
  add(new THREE.CylinderGeometry(0.06, 0.1, 0.12, 16), MAT.gold, 0, 0.12, 0, g);
  add(new THREE.CylinderGeometry(0.27, 0.2, 0.05, 28), MAT.gold, 0, 0.2, 0, g);
  robeStack(g, 0, 0.22, 0, 1); add(new THREE.BoxGeometry(0.38, 0.09, 0.28), robeMat, 0, 0.36, 0.01, g);
  add(new THREE.BoxGeometry(0.06, 0.2, 0.33), MAT.gold, 0, 0.32, 0, g, false); // a gold band tied round the folded robe
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
// monks (Higgsfield, from artwork in the boy's style): brown temple robes, right shoulder bare, seated cross-legged
const MONK_H = 1.75, MONK_TURN = -Math.PI / 2;                         // seated height, to the boy's scale (he stands ~2.75, sits ~1.6); quarter turns if a model faces sideways
const monkFigures = []; let monkTime = 0;                                     // each breathes slowly (still when calm motion is on)
function seatMonk(name, g, x, y, z) {
  const lean = new THREE.Group(); lean.position.set(x, y, z); g.add(lean); // leans toward the hall to receive an offering
  propJobs.push(loadProp(name).then((src) => {
    if (!src) return;                                       // no fallback: an empty seat is better than a block figure
    const copy = src.clone();
    copy.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material) o.material.envMapIntensity = 1; } });
    const m = fitTo(copy, MONK_H); m.rotation.y = MONK_TURN; lean.add(m);
    monkFigures.push({ o: m, ph: monkFigures.length * 2.1 });
  }));
  return lean;
}
function shrine(h, monks = [], { gifts = false } = {}) {
  const { g, FY, W, D } = h;
  const PH = 0.6, PD = 2.8, pz = -D / 2 + 0.2 + PD / 2;     // teachers' platform: height, depth, centre
  const top = FY + PH;
  add(new THREE.BoxGeometry(W - 0.8, PH, PD), MAT.lacquer, 0, FY + PH / 2, pz, g);
  add(new THREE.BoxGeometry(W - 0.7, 0.08, PD + 0.1), MAT.floor, 0, top + 0.02, pz, g, false);
  add(new THREE.BoxGeometry(W - 0.75, 0.1, 0.06), MAT.gold, 0, FY + PH - 0.12, pz + PD / 2 + 0.01, g, false);
  add(new THREE.BoxGeometry(W - 0.75, 0.1, 0.06), MAT.gold, 0, FY + 0.12, pz + PD / 2 + 0.01, g, false);
  h.block(0, pz, (W - 0.8) / 2, PD / 2);
  // teachers' seats: a square cushion with a triangle backrest, two each side of the altar
  const tri = new THREE.Shape(); tri.moveTo(-0.72, 0); tri.lineTo(0, 1.2); tri.lineTo(0.72, 0); tri.lineTo(-0.72, 0);
  const triGeo = new THREE.ExtrudeGeometry(tri, { depth: 0.22, bevelEnabled: false }); triGeo.translate(0, 0, -0.11);
  const seatGeo = new THREE.BoxGeometry(1.5, 0.14, 1.5), seatMat = S(0xb8862e, { roughness: 0.9 }), backMat = S(0x9b2a1d, { roughness: 0.9 });
  [-4.6, -2.6, 2.6, 4.6].forEach((lx) => {
    if (gifts && lx === -4.6) { kathinGifts(g, lx, top + 0.06, pz + 0.3); return; } // the Kathina gifts stand in this seat's place
    add(seatGeo, seatMat, lx, top + 0.1, pz + 0.3, g);
    add(triGeo, backMat, lx, top + 0.03, pz - 0.6, g);
  });
  monks.forEach(([name, lx]) => {
    const lean = seatMonk(name, g, lx, top + 0.17, pz + 0.3);
    if (name === "monk-elder") h.senior = { lean, lx, lz: pz + 0.3, top: top + 0.06, edge: pz + PD / 2 }; // the senior monk: he receives offerings
  });
  // the stepped altar (to mu bucha) in the middle of the platform
  const az = -D / 2 + 1.1;
  const tiers = [[3, 0.55, 1.5], [2.1, 0.55, 1.1], [1.3, 0.5, 0.8]];
  let y = top;
  tiers.forEach(([tw, th, td], i) => {
    add(new THREE.BoxGeometry(tw, th, td), MAT.lacquer, 0, y + th / 2, az - i * 0.12, g);
    add(new THREE.BoxGeometry(tw + 0.08, 0.06, td + 0.08), MAT.gold, 0, y + th, az - i * 0.12, g, false);
    y += th;
  });
  const statueY = y + 0.03;                                 // the Buddha image sits here, above everyone
  // a gold arch (suum) behind the image and a red cloth on the wall
  const arch = add(new THREE.TorusGeometry(1.05, 0.07, 10, 40, Math.PI), MAT.gold, 0, statueY + 1.05, az - 0.5, g, false);
  arch.scale.y = 1.25;
  add(new THREE.BoxGeometry(3.6, 4.4, 0.05), S(0x9b2a1d, { roughness: 0.9 }), 0, top + 2.3, -D / 2 + 0.24, g, false);
  add(new THREE.BoxGeometry(3.7, 0.12, 0.07), MAT.gold, 0, top + 4.5, -D / 2 + 0.25, g, false);
  { const [bx, bz] = h.toWorld(0, az - 0.24), [sx, sz] = h.toWorld(0, pz + PD / 2 + KRAAP_BACK); // bowed head and hands reach ~1.45 m forward, clear of the incense table
    buddhaImages.push({ x: bx, z: bz, hall: h, spot: { x: sx, z: sz } }); } // the wai turns toward it; the kraap is made from the spot
  // the model is built facing +x; a quarter turn makes the image face the entrance
  props("buddha", 1.9, [[0, az - 0.12 * 2, -Math.PI / 2, statueY]], { parent: g, fallback: () => {
    // if the image can't load, a lotus throne stays rather than nothing
    add(new THREE.CylinderGeometry(0.55, 0.45, 0.35, 24), MAT.gold, 0, statueY + 0.18, az - 0.24, g);
  } });
  // ornaments: candles, offering trays and flower vases on the lower steps, incense bowl at the front
  [-1.25, 1.25].forEach((lx) => candle(g, lx, top + 0.58, az + 0.5, 0.5));
  [-0.85, 0.85].forEach((lx) => candle(g, lx, top + 1.13, az + 0.2, 0.4));
  props("phanphum", 0.75, [[-1.15, az + 0.15, 0, top + 0.58], [1.15, az + 0.15, 0, top + 0.58]], { parent: g });
  props("vase", 0.7, [[-0.75, az - 0.1, 0, top + 1.13], [0.75, az - 0.1, 0, top + 1.13]], { parent: g });
  props("lotus", 0.45, [[0, az + 0.55, 0, top + 0.58]], { parent: g });
  const shrineLight = new THREE.PointLight(0xffc27a, 10, 7, 2); shrineLight.position.set(0, top + 2.4, az + 1.6); g.add(shrineLight);
  hallLamps.push({ light: shrineLight, day: 10, night: 16 });
  // a low incense table (โต๊ะหมู่บูชา) on the floor against the middle of the platform, below the image: two candles
  // waiting to be lit, a brass urn of sand for incense and a vase for a lotus. Offerings are made kneeling before it.
  {
    const lz = pz + PD / 2 + INCENSE_D / 2, T = FY + INCENSE_H;
    const ag = new THREE.Group(); ag.position.set(0, 0, lz); g.add(ag);
    add(new THREE.BoxGeometry(1.3, INCENSE_H, INCENSE_D), MAT.lacquer, 0, FY + INCENSE_H / 2, 0, ag);
    add(new THREE.BoxGeometry(1.36, 0.05, INCENSE_D + 0.06), MAT.gold, 0, T - 0.02, 0, ag, false);
    add(new THREE.CylinderGeometry(0.16, 0.12, 0.14, 20), MAT.gold, 0, T + 0.07, -0.04, ag);                         // the urn
    add(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 20), S(0xcdb98a, { roughness: 1 }), 0, T + 0.135, -0.04, ag, false); // its sand
    add(new THREE.CylinderGeometry(0.05, 0.07, 0.2, 12), S(0x2f6f9f, { roughness: 0.4 }), 0.26, T + 0.1, 0.1, ag); // the vase
    const candles = [-0.45, 0.45].map((dx) => {
      add(new THREE.CylinderGeometry(0.035, 0.035, 0.26, 10), waxMat, dx, T + 0.13, -0.04, ag, false);
      const f = add(new THREE.SphereGeometry(0.035, 8, 6), flameMat, dx, T + 0.29, -0.04, ag, false); f.scale.y = 1.8; f.visible = false;
      return f;
    });
    h.block(0, lz, 0.68, INCENSE_D / 2);
    const [nx, nz] = h.toWorld(0, pz + PD / 2 + INCENSE_D + KNEEL_NEAR), [fx, fz] = h.toWorld(0, pz + PD / 2 + KRAAP_BACK), [ix, iz] = h.toWorld(0, az - 0.24);
    altars.push({ h, g: ag, T, candles, near: { x: nx, z: nz }, far: { x: fx, z: fz }, faceYaw: Math.atan2(ix - nx, iz - nz), sticks: [], lit: 0 });
  }
  return pz + PD / 2;
}

/* ---- Learning Hall: the shrine at the back, and eight story boards (U01–U08, approved titles)
        along the side walls that open the matching lesson ---- */
{
  const h = salas.learn;
  shrine(h, [["monk-elder", -2.6], ["monk", 2.6], ["monk-young", 4.6]], { gifts: true }); // the main hall, where the monks sit: Kathina is offered here
  const spots = [["left", 4.2], ["left", 2.2], ["left", 0.2], ["left", -1.8], ["right", -1.8], ["right", 0.2], ["right", 2.2], ["right", 4.2]];
  spots.forEach(([side, u], i) => {
    const tex = boardTexture({ head: tx("เรื่องที่ ", "Story ") + (i + 1), icon: "👣", title: L === "en" ? JOURNEY[i][1] : JOURNEY[i][0], foot: tx("เดินมาใกล้ ๆ แล้วกด E", "Walk close and press E") });
    boards.push({ ...wallBoard(h, side, u, tex), i });
  });
  // students and visitors sit on the floor, facing the platform
  // (no front row: before the platform there is room to offer incense, to give the Kathina robe and to bow)
  for (let r = 1; r < 3; r++) for (let c = -2; c <= 2; c++) if (c !== 0) cushion(h, c * 1.5, -0.9 + r * 1.6);
  hangLanterns(h, [[-3.5, 1.2], [3.5, 1.2], [0, 3.4]]);
}

/* ---- Evidence Library: shelves of palm-leaf manuscripts, reading tables ---- */
{
  const h = salas.library, { g, FY, W, D } = h;
  // the shelf model is built facing +x: a quarter turn makes it face into the room
  const Q = -Math.PI / 2;
  props("bookshelf", 2.7, [[-4, -D / 2 + 0.75, Q, FY], [4, -D / 2 + 0.75, Q, FY], [-W / 2 + 0.75, -1.5, Q + Math.PI / 2, FY], [W / 2 - 0.75, -1.5, Q - Math.PI / 2, FY], [-W / 2 + 0.75, 1.8, Q + Math.PI / 2, FY], [W / 2 - 0.75, 1.8, Q - Math.PI / 2, FY]], { parent: g });
  h.block(-4, -D / 2 + 0.75, 1.3, 0.6); h.block(4, -D / 2 + 0.75, 1.3, 0.6);
  h.block(-W / 2 + 0.75, 0.15, 0.6, 2.9); h.block(W / 2 - 0.75, 0.15, 0.6, 2.9);
  wallBoard(h, "back", 0, boardTexture({ head: tx("หอหลักฐาน", "Evidence Library"), icon: "📚", title: tx("ดูต้นทาง หลักฐาน และสถานะการตรวจ", "Sources, evidence and checking status"), foot: tx("📜 ต้นทาง · 📝 คำแปล · 💡 คำอธิบาย · 🕯️ ยังรอตรวจ", "📜 source · 📝 translation · 💡 explanation · 🕯️ under review"), wide: true }), 3, 2.5, 2.7);
  props("table", 0.8, [[-1.8, 1, 0, FY], [1.8, 1, 0, FY]], { parent: g });
  [[-1.8, 2.2], [1.8, 2.2], [-1.8, -0.2], [1.8, -0.2]].forEach(([lx, lz]) => cushion(h, lx, lz));
  h.post(-1.8, 1, 0.8); h.post(1.8, 1, 0.8);
  hangLanterns(h, [[-3, 0], [3, 0]]);
}

/* ---- Media Hall: the Sambodhaya wheel (image used unchanged) on the back wall, benches to sit and look ---- */
{
  const h = salas.media, { g, FY, D } = h;
  new THREE.TextureLoader().load("img/sambodhaya-wheel.png", (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.2), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
    const frame = new THREE.Mesh(new THREE.BoxGeometry(5, 4.6, 0.15), MAT.gold);
    const gp = new THREE.Group(); gp.add(frame); board.position.z = 0.08; gp.add(board);
    gp.position.set(0, FY + 2.95, -D / 2 + 0.3); g.add(gp);
  });
  wallBoard(h, "left", -1, boardTexture({ icon: "📖", title: tx("อ่าน", "Read") }), 1.5, 1.9);
  wallBoard(h, "left", 2, boardTexture({ icon: "🎧", title: tx("ฟัง", "Listen") }), 1.5, 1.9);
  wallBoard(h, "right", -1, boardTexture({ icon: "🎬", title: tx("ดู", "Watch") }), 1.5, 1.9);
  wallBoard(h, "right", 2, boardTexture({ icon: "🕯️", title: tx("ยังรอตรวจ", "Under review"), foot: tx("ภาพวงล้อเป็นสื่ออธิบายของวัด", "The wheel is the temple's explanatory media") }), 1.5, 1.9);
  props("bench", 1.1, [[-1.9, 0, Math.PI, FY], [1.9, 0, Math.PI, FY], [-1.9, 2.4, Math.PI, FY], [1.9, 2.4, Math.PI, FY]], { parent: g });
  [[-1.9, 0], [1.9, 0], [-1.9, 2.4], [1.9, 2.4]].forEach(([lx, lz]) => h.block(lx, lz, 1.1, 0.4));
  hangLanterns(h, [[-3, 1], [3, 1]]);
}

/* ---- Universal Hall: languages and access, with the hall's shrine ---- */
{
  const h = salas.access, { g, FY, W, D } = h;
  shrine(h); // the teachers' seats stand ready; the monks sit in the Learning Hall
  // a small bronze Buddha image on a low stand for gold leaf (ปิดทอง), before the platform on the left: it is
  // gilded kneeling, like every offering before an image
  {
    const edge = -D / 2 + 0.2 + 2.8, lx = -4.2, lz = edge + GILD_D / 2, T = FY + GILD_H;
    add(new THREE.BoxGeometry(0.9, GILD_H, GILD_D), MAT.lacquer, lx, FY + GILD_H / 2, lz, g);
    add(new THREE.BoxGeometry(0.98, 0.05, GILD_D + 0.08), MAT.gold, lx, T, lz, g, false);
    h.block(lx, lz, 0.49, GILD_D / 2);
    const holder = new THREE.Group(); holder.position.set(lx, T + 0.03, lz); g.add(holder);
    loadProp("buddha").then((src) => {
      if (!src) return;
      const c = fitTo(src.clone(), 1.25); c.rotation.y = -Math.PI / 2;
      c.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.color = new THREE.Color(0x7a5532); o.material.metalness = 0.65; o.material.roughness = 0.45; o.material.map = null; o.castShadow = true; } }); // dark bronze, waiting for gold
      holder.add(c); gildImage.mesh = c;
    });
    const [nx, nz] = h.toWorld(lx, edge + GILD_D + KNEEL_NEAR), [fx, fz] = h.toWorld(lx, edge + GILD_D + 1.55);
    Object.assign(gildImage, { h, holder, near: { x: nx, z: nz }, far: { x: fx, z: fz }, faceYaw: h.g.rotation.y + Math.PI, chest: new THREE.Vector3(lx, T + 0.62, lz + 0.2) });
  }
  // the hall's own board moves to the side wall
  wallBoard(h, "left", 0.6, boardTexture({ head: tx("ศาลาสากล", "Universal Hall"), icon: "🌍", title: "ภาษาไทย · English", foot: tx("เลือกภาษา ขนาดตัวอักษร และการเคลื่อนไหวได้ในหน้าเว็บของศาลานี้", "Choose language and motion settings on this hall's web page"), wide: true }), 2.8, 2.33, 2.6);
  props("potplant", 1.6, [[-W / 2 + 1, D / 2 - 1, 2, FY], [W / 2 - 1, D / 2 - 1, 3, FY]], { parent: g });
  [[-W / 2 + 1, D / 2 - 1], [W / 2 - 1, D / 2 - 1]].forEach(([lx, lz]) => h.post(lx, lz, 0.6));
  // students and visitors sit on the floor, facing the platform
  for (let r = 0; r < 2; r++) for (let c = -2; c <= 2; c++) cushion(h, c * 1.5, 0.7 + r * 1.6);
  hangLanterns(h, [[-3, 1.8], [3, 1.8]]);
}

/* ---- Caretaker's hall: a small kuti where the temple dog sleeps ---- */
{
  const h = salas.care, { g, FY, W, D } = h;
  wallBoard(h, "back", 0, boardTexture({ head: tx("ผู้ดูแลวัดและหมาวัด", "Caretaker & temple dog"), icon: "🤝", title: tx("มีคำถาม หรืออยากให้ช่วย", "Questions, or need a hand"), wide: true }), 2.8, 2.3, 2.4);
  props("table", 0.8, [[-2.2, -1.2, 0, FY]], { parent: g }); h.post(-2.2, -1.2, 0.8);
  props("bench", 1.1, [[-2.2, 0.4, Math.PI, FY]], { parent: g });
  // the dog's bed: a round cushion by the wall
  add(new THREE.CylinderGeometry(0.8, 0.85, 0.22, 28), S(0x4f9a5d, { roughness: 0.95 }), 2.6, FY + 0.11, -2, g);
  add(new THREE.TorusGeometry(0.8, 0.14, 10, 32), S(0x3f7f4a, { roughness: 0.95 }), 2.6, FY + 0.25, -2, g).rotation.x = Math.PI / 2;
  props("potplant", 1.5, [[W / 2 - 0.9, D / 2 - 0.9, 0, FY], [-W / 2 + 0.9, D / 2 - 0.9, 1, FY]], { parent: g });
}

/* ---- Rest Area: an open pavilion; its benches look out over the pond ---- */
{
  const h = salas.rest, { FY } = h;
  props("bench", 1.1, [[-1.5, -0.6, Math.PI, FY], [1.5, -0.6, Math.PI, FY]], { parent: h.g, fallback: () => [-1.5, 1.5].forEach((lx) => add(new THREE.BoxGeometry(2.4, 0.5, 0.8), MAT.wood, lx, FY + 0.25, -0.6, h.g)) });
  h.block(0, -0.6, 2.8, 0.45);
}

/* ---------------- running water: a waterfall that flows, foams and splashes ---------------- */
// Streaks scroll down a curved sheet of water (two layers at different speeds for depth); where it
// lands, foam turns, rings spread across the pool, droplets splash up and a soft mist hangs.
// Calm motion slows all of it down rather than stopping it.
const waterAnims = [];
function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const streakTex = () => canvasTexture(128, 512, (g, w, h) => {
  g.fillStyle = "rgba(190,230,240,0.35)"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * w, y = Math.random() * h, len = 30 + Math.random() * 160, a = 0.15 + Math.random() * 0.6, wd = 1 + Math.random() * 3;
    const gr = g.createLinearGradient(0, y, 0, y + len); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, `rgba(255,255,255,${a})`); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(x, y, wd, len); if (y + len > h) g.fillRect(x, y - h, wd, len); // wrap so it tiles
  }
});
const foamTex = () => canvasTexture(256, 256, (g, w, h) => {
  for (let i = 0; i < 380; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.pow(Math.random(), 0.7) * w * 0.48, x = w / 2 + Math.cos(a) * r, y = h / 2 + Math.sin(a) * r;
    const rad = 3 + Math.random() * 12, fade = 1 - r / (w * 0.5);
    const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(255,255,255,${0.75 * fade})`); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
  }
});
const softTex = canvasTexture(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
function waterfall(x, zTop, yTop, yPool, width) {
  const drop = yTop - yPool, landZ = zTop + 0.85;
  // the falling sheet: leaves the lip, curves outward a little, then drops straight
  const sheet = (offset, tex, opacity, color) => {
    const geo = new THREE.PlaneGeometry(width, drop, 6, 24), pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const t = (pos.getY(i) + drop / 2) / drop; pos.setZ(i, 0.85 * Math.pow(1 - t, 0.6) + offset); pos.setX(i, pos.getX(i) * (1 - (1 - t) * 0.06)); }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color, map: tex || null, transparent: true, opacity, roughness: 0.12, metalness: 0, emissive: 0x2c5560, emissiveIntensity: 0.35, depthWrite: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat); m.position.set(x, yPool + drop / 2, zTop); m.renderOrder = 2; scene.add(m); return m;
  };
  sheet(-0.04, null, 0.55, 0x4f9fb0);                            // the body of the water
  const a = streakTex(); a.repeat.set(2, 1.2); sheet(0, a, 0.9, 0xe6f7fb);
  waterAnims.push((dt) => { a.offset.y += dt * 1.6; });
  if (HIGH) { const b = streakTex(); b.repeat.set(3, 2); sheet(0.05, b, 0.6, 0xffffff); waterAnims.push((dt) => { b.offset.y += dt * 2.3; }); }
  // foam where it lands: two layers turning opposite ways, gently breathing
  [[1, 0.9, 0.35], [-1, 0.7, 0.5]].forEach(([dir, op, spd], k) => {
    const f = new THREE.Mesh(new THREE.CircleGeometry(width * 0.62, 32), new THREE.MeshBasicMaterial({ map: foamTex(), transparent: true, opacity: op, depthWrite: false }));
    f.rotation.x = -Math.PI / 2; f.position.set(x, yPool + 0.02 + k * 0.01, landZ + 0.6); f.renderOrder = 3; scene.add(f);
    waterAnims.push((dt, t) => { f.rotation.z += dt * spd * dir; const s = 1 + Math.sin(t * 2.2 + k) * 0.05; f.scale.set(s, s, 1); });
  });
  // ripples spreading across the pool
  for (let i = 0; i < 4; i++) {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    r.rotation.x = -Math.PI / 2; r.position.set(x, yPool + 0.015, landZ + 0.5); r.renderOrder = 3; scene.add(r);
    let life = i / 4;
    waterAnims.push((dt) => { life = (life + dt / 2.6) % 1; const s = 1.5 + life * 4; r.scale.set(s * (width / 4.6), s, 1); r.material.opacity = 0.4 * (1 - life); });
  }
  // droplets splashing up from the landing
  const N = HIGH ? 140 : 50, dg = new THREE.BufferGeometry(), dp = new Float32Array(N * 3), vel = [], age = [];
  const spawn = (i) => { dp[i * 3] = x + (Math.random() - 0.5) * width * 0.9; dp[i * 3 + 1] = yPool + 0.05; dp[i * 3 + 2] = landZ + Math.random() * 0.4; vel[i] = [(Math.random() - 0.5) * 0.8, 1.2 + Math.random() * 2.4, 0.3 + Math.random() * 1.2]; age[i] = 0; };
  for (let i = 0; i < N; i++) { spawn(i); age[i] = Math.random(); }
  dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
  const drops = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xeefaff, size: 0.14, map: softTex, transparent: true, opacity: 0.85, depthWrite: false }));
  drops.frustumCulled = false; drops.renderOrder = 4; scene.add(drops);
  waterAnims.push((dt) => {
    for (let i = 0; i < N; i++) {
      vel[i][1] -= 9 * dt; dp[i * 3] += vel[i][0] * dt; dp[i * 3 + 1] += vel[i][1] * dt; dp[i * 3 + 2] += vel[i][2] * dt; age[i] += dt;
      if (dp[i * 3 + 1] < yPool || age[i] > 1.2) spawn(i);
    }
    dg.attributes.position.needsUpdate = true;
  });
  // a soft mist at the foot of the fall
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false }));
    m.scale.set(3, 2, 1); m.position.set(x + (i - 1.5) * 1.3, yPool + 0.9, landZ + 0.6); m.renderOrder = 5; scene.add(m);
    waterAnims.push((dt, t) => { m.position.y = yPool + 0.9 + Math.sin(t * 0.6 + i) * 0.25; m.material.opacity = 0.14 + Math.sin(t * 0.8 + i * 2) * 0.05; });
  }
}

const BIG_BUDDHA_H = 21, BIG_BUDDHA_TURN = -Math.PI / 2; // the great white Buddha above the waterfall: its height; turns it to face the temple
/* ---------------- practice garden: four observation stones and a waterfall wall ---------------- */
{
  add(new THREE.BoxGeometry(22, 9, 3), MAT.rock, 0, 4.5, -60);
  props("boulder", 7, [[-7.5, -59, 0.4], [7.5, -59.5, 2.5], [-3.6, -58.6, 1.2, 4.5], [3.8, -58.8, 4, 4.8]]);
  props("bamboo", 7, [[-13, -50, 0], [-15, -55, 1], [13, -50, 2], [15, -55, 3], [-11, -57, 4], [11, -57, 5]]);
  add(new THREE.CylinderGeometry(5, 5, 0.4, 24), MAT.water, 0, 0.2, -55.5, scene, false);
  waterfall(0, -58.35, 9, 0.42, 4.6);
  colliders.push({ x: 0, z: -56, r: 5 });
  blockers.push({ x: 0, z: -60, c: 1, s: 0, hx: 11, hz: 1.6 });
  // above the waterfall, a great white Buddha image (Maravijaya, ปางมารวิชัย) sits on a rock terrace, facing the
  // temple; seen from all over the grounds, like the great white Buddhas on Thai hillsides. The water seems to pour
  // from beneath its seat. Soft floodlights light it at night.
  add(new THREE.BoxGeometry(24, 9, 11.5), MAT.rock, 0, 4.5, -67.25);                       // the terrace behind the cliff
  add(new THREE.BoxGeometry(17, 1.2, 9), MAT.rock, 0, 9.6, -67.5).rotation.y = 0.05;         // its uneven top
  blockers.push({ x: 0, z: -67.25, c: 1, s: 0, hx: 12, hz: 5.75 });
  props("boulder", 4.5, [[-10.5, -61.6, 0.7, 8.6], [10.4, -62, 2.1, 8.6], [-11.2, -70, 3, 8.6], [11, -70.5, 1, 8.6]]);
  props("buddha-white", BIG_BUDDHA_H, [[0, -67.5, BIG_BUDDHA_TURN, 10.2]]);
  if (HIGH) [-1, 1].forEach((sg) => { // (real lights are costly: light mode leaves it unlit at night)
    const l = new THREE.SpotLight(0xfff0d8, 0, 60, 0.42, 0.6, 1.2); l.position.set(sg * 12, 3, -44); l.target.position.set(0, 21, -67); scene.add(l, l.target);
    hallLamps.push({ light: l, day: 0, night: 140 });
  });
  const four = [["🧍", "กาย", "Body"], ["💗", "ความรู้สึก", "Feelings"], ["🧠", "จิต", "Mind"], ["☸", "ธรรม", "Dhamma"]];
  four.forEach(([ic, th, en], i) => {
    const x = -9 + i * 6, z = -47;
    add(new THREE.CylinderGeometry(1.4, 1.6, 0.4, 24), MAT.rock, x, 0.2, z, scene, false);
    props("stone", 0.9, [[x, z, i * 1.7, 0.2]]);
    sign(L === "en" ? en : th, "", ic, x, 2.6, z, 3.2);
    colliders.push({ x, z, r: 1.5 });
  });
  [[-13, -50], [-15, -55], [13, -50], [15, -55], [-11, -57], [11, -57]].forEach(([x, z]) => colliders.push({ x, z, r: 1.2 }));
}

/* ---------------- my journey: eight stepping stones ---------------- */
const journeyStones = [];
JOURNEY.forEach(([th, en], i) => {
  const x = 17 + i * 3.1, z = 45 - Math.sin(i * 0.55) * 6;
  add(new THREE.CylinderGeometry(1.5, 1.6, 0.35, 28), MAT.rock, x, 0.175, z, scene, false);
  floors.push({ x, z, c: 1, s: 0, hx: 1.1, hz: 1.1, y: 0.35 }); // stand on the stone, not in it
  sign(`${i + 1}`, L === "en" ? en : th, "👣", x, 2.2, z, 3.4);
  journeyStones.push({ x, z, i });
});

/* ---------------- gates (enter left, exit right) ---------------- */
[[-7, tx("ยินดีต้อนรับ", "Welcome"), "🚪"], [7, tx("ออกจากวัดได้เสมอ", "Leave any time"), "🚪"]].forEach(([x, label]) => {
  add(new THREE.BoxGeometry(1.8, 0.6, 1.8), MAT.stoneDark, x, 0.3, 36);
  add(new THREE.BoxGeometry(1.1, 6.4, 1.1), MAT.lacquer, x, 3.8, 36);
  add(new THREE.BoxGeometry(1.3, 0.25, 1.3), MAT.gold, x, 1.0, 36, scene, false);
  add(new THREE.BoxGeometry(1.4, 0.35, 1.4), MAT.gold, x, 7.1, 36);
  add(new THREE.ConeGeometry(1.1, 1.6, 4), MAT.roof, x, 8.1, 36).rotation.y = Math.PI / 4;
  add(new THREE.ConeGeometry(0.14, 1.2, 6), MAT.gold, x, 9.4, 36);
  sign(label, "", "🚪", x, 11, 36, 4.4);
  colliders.push({ x, z: 36, r: 1.3 });
});
// the two doors: each is half the gateway wide, hinged on its post, so closed they would shut it completely;
// they stand open, swung in along the sides of the road, and are solid to walk into
{
  const HALF = 7 - 0.55, W = HALF - 0.05, OPEN = 1.5; // from the post's inner face to the middle; how far they swing in
  [-1, 1].forEach((sg) => {
    const hinge = new THREE.Group(); hinge.position.set(sg * HALF, 0, 36); scene.add(hinge);
    hinge.rotation.y = sg < 0 ? OPEN : -OPEN;            // swung in, toward the temple
    add(new THREE.BoxGeometry(W, 5, 0.25), MAT.wood, -sg * W / 2, 2.75, 0, hinge);                 // the leaf
    [1.1, 2.75, 4.4].forEach((y) => add(new THREE.BoxGeometry(W - 0.2, 0.18, 0.32), MAT.woodDark, -sg * W / 2, y, 0, hinge, false)); // rails
    add(new THREE.BoxGeometry(W, 0.2, 0.3), MAT.gold, -sg * W / 2, 5.3, 0, hinge, false);           // a gold top rail
    const th = hinge.rotation.y, c = Math.cos(th), sn = Math.sin(th), ox = -sg * W / 2;
    blockers.push({ x: hinge.position.x + ox * c, z: 36 - ox * sn, c, s: sn, hx: W / 2, hz: 0.2 });
  });
}

/* ---------------- the donation box (for adults) on the front of the "leave any time" post ---------------- */
// Quiet and optional: walking up to it and pressing E opens a note and a link to the support page.
const DONATE = { x: 7, z: 36.95 };
{
  const g = new THREE.Group(); g.position.set(DONATE.x, 0, DONATE.z); scene.add(g);
  add(new THREE.BoxGeometry(0.95, 1.15, 0.6), MAT.lacquer, 0, 1.75, 0, g);
  add(new THREE.BoxGeometry(1.05, 0.1, 0.7), MAT.gold, 0, 2.37, 0, g);      // lid
  add(new THREE.BoxGeometry(1.05, 0.08, 0.7), MAT.gold, 0, 1.16, 0, g, false); // base trim
  add(new THREE.BoxGeometry(0.42, 0.03, 0.06), S(0x1a1008, { roughness: 1 }), 0, 2.43, 0.05, g, false); // coin slot
  add(new THREE.BoxGeometry(0.12, 0.5, 0.12), MAT.gold, 0, 0.92, -0.1, g, false); // bracket to the post
  const drawFront = (c, w = 256, h = 320) => {
    c.clearRect(0, 0, w, h); c.fillStyle = "#8e1f17"; c.fillRect(0, 0, w, h);
    c.strokeStyle = "#e8b84a"; c.lineWidth = 10; c.strokeRect(10, 10, w - 20, h - 20);
    c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#f2cc62";
    c.font = "80px sans-serif"; c.fillText("🪷", w / 2, 92);
    c.font = "40px Itim, sans-serif"; c.fillText("ตู้รับบริจาค", w / 2, 190);
    c.font = "26px Mali, sans-serif"; c.fillStyle = "#fff4d6"; c.fillText(tx("สำหรับผู้ใหญ่", "For adults"), w / 2, 246);
  };
  const tex = canvasTexture(256, 320, drawFront);
  signDraws.push(() => { drawFront(tex.image.getContext("2d")); tex.needsUpdate = true; }); // redrawn once the Thai fonts are in
  const front = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
  front.position.set(0, 1.75, 0.305); g.add(front);
  colliders.push({ x: DONATE.x, z: DONATE.z, r: 0.6 });
}

/* ---------------- the alms round (ตักบาตร) on the road outside the gate ---------------- */
// Four monks stand in a row on the entrance road, most senior first, nearest the gate. On an alms round the
// robe covers both shoulders (ห่มคลุม), unlike the bare right shoulder inside the temple. Standing in front of
// one and pressing E, the boy offers a ball of sticky rice: he raises it to his forehead, places it in the
// bowl with both hands, then gives the high wai. Nothing is counted; the rice simply stays in the bowl.
const ALMS_ROW = { x: 1.6, z0: 44, dz: 3.4, yaw: -Math.PI / 2 };   // across the road, facing the far side
const ALMS_MONKS = [["alms-elder", 3.3], ["alms-monk", 3.3], ["alms-young", 3.35], ["alms-novice", 2.95]]; // model, standing height
// each model's bowl, as fractions of its height in its own front-facing space: centre forward, rim height, radius (measured from the side)
const ALMS_BOWL = { "alms-elder": [0.10, 0.674, 0.067], "alms-monk": [0.10, 0.674, 0.067], "alms-young": [0.10, 0.674, 0.067], "alms-novice": [0.10, 0.674, 0.067] };
const almsMonks = [];
const RICE_R = 0.1, riceGeo = new THREE.SphereGeometry(RICE_R, 16, 12), riceMat = S(0xf7f1e1, { roughness: 0.95 });
const riceBall = () => { const m = new THREE.Mesh(riceGeo, riceMat); m.scale.y = 0.85; m.castShadow = true; return m; };
ALMS_MONKS.forEach(([name, H], i) => {
  const x = ALMS_ROW.x, z = ALMS_ROW.z0 + i * ALMS_ROW.dz, yaw = ALMS_ROW.yaw;
  const pivot = new THREE.Group(); pivot.position.set(x, groundAt(x, z), z); pivot.rotation.y = yaw; scene.add(pivot);
  const lean = new THREE.Group(); pivot.add(lean);                   // a slight bow toward the giver as he receives
  const [bf, by, br] = ALMS_BOWL[name];
  const m = { name, x, z, yaw, pivot, lean, bowl: { f: bf * H, y: by * H, r: br * H }, rice: [] };
  almsMonks.push(m); colliders.push({ x, z, r: 0.75 });
  propJobs.push(loadProp(name).then((src) => {
    if (!src) { pivot.visible = false; almsMonks.splice(almsMonks.indexOf(m), 1); return; }
    const copy = src.clone();
    copy.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material) o.material.envMapIntensity = 1; } });
    const fig = fitTo(copy, H); fig.rotation.y = MONK_TURN; lean.add(fig);
    monkFigures.push({ o: fig, ph: monkFigures.length * 2.1 });
  }));
});
// the rice: a silver bowl of sticky-rice balls on a low table at the roadside, where the giver stands
{
  const tx0 = -5.4, tz0 = ALMS_ROW.z0 + 1.0 * ALMS_ROW.dz, gy = groundAt(tx0, tz0); // off the road, clear of the dog's way
  props("table", 0.8, [[tx0, tz0, Math.PI / 2, gy]]);
  add(new THREE.CylinderGeometry(0.42, 0.3, 0.22, 24, 1, true), S(0xd9dde2, { metalness: 0.9, roughness: 0.3, side: THREE.DoubleSide }), tx0, gy + 0.92, tz0, scene, false);
  [[0, 0], [0.15, 0.1], [-0.14, 0.08], [0.05, -0.16], [-0.1, -0.12]].forEach(([dx, dz2], k) => { const b = riceBall(); b.position.set(tx0 + dx, gy + 0.98 + (k ? 0 : 0.06), tz0 + dz2); scene.add(b); });
  colliders.push({ x: tx0, z: tz0, r: 0.9 });
}
const ALMS_PLACE = { id: "alms", icon: "🍚", th: "ใส่บาตร", en: "Give alms", sub: ["ถวายข้าวเหนียว แล้วไหว้พระ", "Offer sticky rice, then wai"] };
const ALMS_STAND = 1.25; // how far in front of the monk the giver stands

/* ---------------- scattered trees around the edge ---------------- */
const edgeTrees = [];
for (let i = 0; i < 40; i++) {
  const a = (i / 40) * Math.PI * 2 + 0.07, d = 58 + ((i * 13) % 14);
  const x = Math.cos(a) * d, z = Math.sin(a) * d;
  if (z > 30 && Math.abs(x) < 14) continue; // keep the entrance view open
  if (z > 26 && x > 10 && x < 54) continue; // keep the My Journey path clear
  if (!HIGH && i % 2) continue; // fewer trees on weaker phones
  edgeTrees.push([x, z, i * 1.3, 0, i]);
}
// a mix of Thai trees: frangipani, sugar palms and banana clumps
const kinds = [["frangipani", 8], ["palm", 13], ["frangipani", 7.5], ["banana", 5]];
kinds.forEach(([name, h], k) => {
  const mine = edgeTrees.filter(([, , , , i]) => i % 4 === k);
  props(name, h, mine.map(([x, z, r]) => [x, z, r]), { fallback: () => mine.forEach(([x, z, , , i]) => {
    add(new THREE.CylinderGeometry(0.5, 0.8, 4, 6), MAT.trunk, x, 2, z);
    add(new THREE.IcosahedronGeometry(3 + (i % 3), 0), i % 2 ? MAT.leaf : MAT.leafLight, x, 6, z);
  }) });
});

const YAKSHA_H = 6.2; // the guardians stand about as tall as the gateway's posts
/* ---------------- the temple wall (kampaeng kaew): white, with lotus-bud posts ---------------- */
{
  const R = 76, segs = 72, wallMat = P("beige_wall_001", 3, 1, { color: 0xfffaf2 });
  const segLen = 2 * Math.PI * R / segs;
  const list = [];
  for (let i = 0; i < segs; i++) { const a = (i + 0.5) / segs * Math.PI * 2; const x = Math.cos(a) * R, z = Math.sin(a) * R; if (z > 60 && Math.abs(x) < 4) continue; list.push([x, z, a]); }
  const body = new THREE.InstancedMesh(new THREE.BoxGeometry(segLen + 0.05, 1.8, 0.6), wallMat, list.length);
  const cap = new THREE.InstancedMesh(new THREE.BoxGeometry(segLen + 0.1, 0.25, 0.9), MAT.lacquer, list.length);
  const postB = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 2.4, 0.9), wallMat, list.length);
  const bud = new THREE.InstancedMesh(new THREE.SphereGeometry(0.45, 12, 8), MAT.gold, list.length);
  const o = new THREE.Object3D();
  list.forEach(([x, z, a], i) => {
    o.position.set(x, 0.9, z); o.rotation.set(0, -a + Math.PI / 2, 0); o.scale.set(1, 1, 1); o.updateMatrix(); body.setMatrixAt(i, o.matrix);
    o.position.y = 1.9; o.updateMatrix(); cap.setMatrixAt(i, o.matrix);
    const pa = a + Math.PI / segs; o.position.set(Math.cos(pa) * R, 1.2, Math.sin(pa) * R); o.updateMatrix(); postB.setMatrixAt(i, o.matrix);
    o.position.y = 2.65; o.scale.set(1, 1.4, 1); o.updateMatrix(); bud.setMatrixAt(i, o.matrix);
  });
  [body, cap, postB, bud].forEach((m) => { m.castShadow = true; m.receiveShadow = true; scene.add(m); });

  // the gateway in the wall, where the bridge arrives
  const GZ = Math.sqrt(R * R - 25);
  [-1, 1].forEach((sg) => {
    add(new THREE.BoxGeometry(1.4, 6.2, 1.4), wallMat, sg * 4.6, 3.1, GZ);
    add(new THREE.BoxGeometry(1.6, 0.25, 1.6), MAT.gold, sg * 4.6, 0.9, GZ, scene, false);
    add(new THREE.BoxGeometry(1.6, 0.3, 1.6), MAT.gold, sg * 4.6, 6.0, GZ, scene, false);
    add(new THREE.BoxGeometry(1.5, 1.8, 0.6), wallMat, sg * 6, 0.9, GZ - 0.1);           // short wall to meet the ring
    add(new THREE.BoxGeometry(1.6, 0.25, 0.9), MAT.lacquer, sg * 6, 1.9, GZ - 0.1, scene, false);
  });
  add(new THREE.BoxGeometry(10.6, 0.8, 1.6), MAT.lacquer, 0, 6.5, GZ);
  add(new THREE.BoxGeometry(10.7, 0.12, 1.7), MAT.gold, 0, 6.1, GZ, scene, false);
  const gr = gable(11.4, 3, 2.8, MAT.roof); gr.position.set(0, 6.9, GZ); gr.castShadow = true; scene.add(gr);
  // the two guardian giants (ยักษ์ทวารบาล), as at the gates of Wat Arun: on white pedestals either side of the
  // gateway, just outside the wall, facing out over the naga bridge to meet those who come. Green on the left as
  // you arrive, white on the right; friendly rather than fearsome, in the boy's style.
  const YZ = GZ + 1.5, YX = 7.2;
  [[-1, "yaksha-green"], [1, "yaksha-white"]].forEach(([sg, name]) => {
    add(new THREE.BoxGeometry(2.3, 0.7, 1.9), wallMat, sg * YX, 0.35, YZ);
    add(new THREE.BoxGeometry(2.45, 0.12, 2.05), MAT.gold, sg * YX, 0.72, YZ, scene, false);
    props(name, YAKSHA_H, [[sg * YX, YZ, MONK_TURN, 0.78]]);
  });
  [-1, 1].forEach((sg) => {
    const e = gable(11.7, 0.25, 2.95, MAT.roofEdge); e.position.set(0, 6.85, GZ + sg * 1.5); scene.add(e);
    const pnl = gable(6.2, 0.12, 1.55, MAT.gold); pnl.position.set(0, 7.1, GZ + sg * 1.6); scene.add(pnl);
    const f = add(new THREE.ConeGeometry(0.22, 1.6, 6), MAT.gold, 0, 10.3, GZ + sg * 1.5); f.rotation.x = sg * 0.55;
  });
  sign(tx("วัดสัมโพธายะ", "Sambodhaya Temple"), tx("ยินดีต้อนรับ เดินช้า ๆ ได้", "Welcome. Take your time."), "☸", 0, 12.4, GZ, 6);
}

/* ---------------- the bridge over the moat ---------------- */
// a gently arched stone bridge whose railings are nagas (ราวนาค): each handrail is the serpent's golden scaled
// body, rising at both ends of the bridge into a rearing many-headed naga that guards the way; you walk over its arch
const nagaHeads = [], NAGA_H = 2.0, NAGA_BACK = 1.05; // the serpent's height; how far its middle sits back from the pedestal
// gold scales with a green-and-red glass inlay, drawn once and repeated along the body
const nagaScales = (() => {
  const t = canvasTexture(128, 128, (c, w, h) => {
    c.fillStyle = "#c9932a"; c.fillRect(0, 0, w, h);
    for (let row = 0; row < 5; row++) for (let col = -1; col < 5; col++) {
      const cx = col * 32 + (row % 2) * 16 + 16, cy = row * 28 + 14;
      c.beginPath(); c.arc(cx, cy, 17, 0, Math.PI); c.fillStyle = (row + col) % 3 === 0 ? "#2f8a5a" : "#e2b347"; c.fill();
      c.lineWidth = 3; c.strokeStyle = "#7d5512"; c.stroke();
      if ((row * 3 + col) % 5 === 0) { c.beginPath(); c.arc(cx, cy + 6, 4, 0, Math.PI * 2); c.fillStyle = "#b8302a"; c.fill(); }
    }
  });
  t.repeat.set(26, 3);
  return new THREE.MeshStandardMaterial({ map: t, metalness: 0.55, roughness: 0.35 });
})();
// a gently arched stone bridge with white balustrades and gold lotus-bud posts; you walk over its arch
{
  const ZC = BRIDGE.zc, H = BRIDGE.half, RISE = 1.1, BW = ROAD; // as wide as the road it carries
  const topY = (u) => RISE * (1 - (u / H) ** 2);
  const sh = new THREE.Shape(); const N = 24;
  for (let i = 0; i <= N; i++) { const u = -H + (2 * H * i) / N; i ? sh.lineTo(u, topY(u)) : sh.moveTo(u, topY(u)); }
  for (let i = N; i >= 0; i--) { const u = -H + (2 * H * i) / N; sh.lineTo(u, topY(u) - 0.7); }
  const deckGeo = new THREE.ExtrudeGeometry(sh, { depth: BW, bevelEnabled: false });
  deckGeo.rotateY(Math.PI / 2); deckGeo.translate(-BW / 2, 0, 0);
  add(deckGeo, P("brick_pavement_02", 0.35, 0.35, { color: new THREE.Color(1.75, 1.5, 1.2) }), 0, 0.02, ZC);
  floors.push({ x: 0, z: ZC, c: 1, s: 0, hx: BW / 2, hz: H, y: RISE + 0.02, arch: true });
  paths.push({ x1: 0, z1: ZC - H, x2: 0, z2: ZC + H, w: BW }); // footsteps sound like stone here
  const white = S(0xfbf6ec, { roughness: 0.8 });
  [-1, 1].forEach((sg) => {
    const x = sg * (BW / 2 - 0.2);
    // white balusters carry the serpent's body
    for (let i = 1; i <= 7; i++) {
      const u = -H + 0.4 + (2 * H - 0.8) * i / 8;
      add(new THREE.BoxGeometry(0.28, 0.95, 0.28), white, x, topY(u) + 0.475, ZC - u);
      add(new THREE.BoxGeometry(0.34, 0.08, 0.34), MAT.gold, x, topY(u) + 0.95, ZC - u, scene, false);
    }
    const low = []; for (let i = 0; i <= 20; i++) { const u = -H + 0.4 + (2 * H - 0.8) * i / 20; low.push(new THREE.Vector3(x, topY(u) + 0.4, ZC - u)); }
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(low), 40, 0.05, 8), white, 0, 0, 0, scene, true);
    // the naga's body is the handrail: scaled and golden, gently undulating, with a crest of gold fins along its back;
    // at each end it rises into a rearing head (the model, on a white pedestal, looks out along the road)
    const U0 = -H + 0.55, U1 = H - 0.55, body = [];
    for (let i = 0; i <= 48; i++) { const u = U0 + (U1 - U0) * i / 48; body.push(new THREE.Vector3(x, topY(u) + 1.02 + Math.sin(i / 48 * Math.PI * 6) * 0.07, ZC - u)); }
    const curve = new THREE.CatmullRomCurve3(body);
    add(new THREE.TubeGeometry(curve, 160, 0.17, 12), nagaScales, 0, 0, 0, scene, true);
    for (let i = 1; i < 44; i++) {
      const t = i / 44, pnt = curve.getPointAt(t), tan = curve.getTangentAt(t);
      const fin = add(new THREE.ConeGeometry(0.07, 0.24, 4), MAT.gold, pnt.x, pnt.y + 0.18, pnt.z, scene, false);
      fin.rotation.x = -Math.atan2(tan.y, -tan.z) * 0.6 - 0.35 * Math.sign(-tan.z || 1); fin.scale.set(1, 1, 0.35); // flame-like, leaning back
    }
    [[-H + 0.35, 1], [H - 0.35, -1]].forEach(([u, out]) => {   // out: +1 looks toward +z (the outer bank), -1 toward the temple
      const y = topY(u);
      add(new THREE.BoxGeometry(0.75, 0.55, 1.0), white, x, y + 0.275, ZC - u, scene, true);
      add(new THREE.BoxGeometry(0.85, 0.08, 1.1), MAT.gold, x, y + 0.56, ZC - u, scene, false);
      // the model is a whole serpent in profile, its hood at one end: hood over the pedestal, looking out along the
      // road, and its body lying back along the handrail
      nagaHeads.push([x, ZC - u - out * NAGA_BACK, out > 0 ? -Math.PI / 2 : Math.PI / 2, y + 0.6]);
    });
  });
  props("naga", NAGA_H, nagaHeads, { fallback: () => nagaHeads.forEach(([hx, hz, , hy]) => add(new THREE.ConeGeometry(0.35, 1.6, 8), MAT.gold, hx, hy + 0.8, hz)) });
}

/* ---------------- small things that make it feel lived in ---------------- */
const BELL = [-6.8, 24.5]; // beside the entrance road: rung without stepping off the road
props("bell", 4.6, [[BELL[0], BELL[1], 0.9]]); colliders.push({ x: BELL[0], z: BELL[1], r: 1.6 });
const jars = [[-33, 7], [-19, 21], [-11, 39], [11, 39], [22, 19], [-36, -8]];
props("jar", 1.1, jars.map(([x, z], i) => [x, z, i]), { extra: true }); jars.forEach(([x, z]) => colliders.push({ x, z, r: 0.7 }));
const bushes = [[-9, 18], [9, 18], [-19, -5], [19, -5], [-24, -36], [24, -36], [-40, 0], [40, -4], [22, 52], [36, 40], [-8, -52], [8, -52]];
props("bougainvillea", 2.4, bushes.map(([x, z], i) => [x, z, i * 2]), { extra: true }); bushes.forEach(([x, z]) => colliders.push({ x, z, r: 1.3 }));
const pots = [[-5.2, 15.8], [5.2, 15.8]];
props("potplant", 1.6, pots.map(([x, z], i) => [x, z, i]), { extra: true }); pots.forEach(([x, z]) => colliders.push({ x, z, r: 0.6 }));
const blooms = [[-9.5, 12], [9.5, 12]];
props("lotus", 1, blooms.map(([x, z], i) => [x, z, i]), { extra: true }); blooms.forEach(([x, z]) => colliders.push({ x, z, r: 0.8 }));

/* ---------------- the garden: Thai temple planting and rock formations ---------------- */
const gardenSpots = []; // (for ?debug checks)
// A Thai temple's grounds are full of green: shade trees, flowering trees, clipped shrubs, potted bonsai and
// rockeries. Everything here is placed by rule rather than by hand: each candidate spot is checked against the
// paths, the halls and their steps, the ponds, the plaza, the Practice Garden, the My Journey stones, the alms row
// and everything already standing, so nothing lands where people walk. Decorative only: skipped in light mode.
{
  const taken = [];
  const segDist = (x, z, p) => { const dx = p.x2 - p.x1, dz = p.z2 - p.z1, L2 = dx * dx + dz * dz || 1; const u = Math.max(0, Math.min(1, ((x - p.x1) * dx + (z - p.z1) * dz) / L2)); return Math.hypot(x - p.x1 - u * dx, z - p.z1 - u * dz); };
  const clear = (x, z, r, pathGap = 0.8) => {
    const d = Math.hypot(x, z);
    if (d < 16 + r + 1 || d > 72.5 - r) return false;                                   // the plaza; inside the wall
    if (x > -18 && x < 18 && z < -42) return false;                                     // the Practice Garden and the great Buddha's terrace
    if (Math.abs(x) < 6 + r && z > 13) return false;                                    // the entrance road and the alms row
    for (const p of paths) if (segDist(x, z, p) < p.w / 2 + r + pathGap) return false;
    for (const f of floors) { const lx = (x - f.x) * f.c - (z - f.z) * f.s, lz = (x - f.x) * f.s + (z - f.z) * f.c; if (Math.abs(lx) < f.hx + r + 1.2 && Math.abs(lz) < f.hz + r + 1.2) return false; }
    for (const b of blockers) { const lx = (x - b.x) * b.c - (z - b.z) * b.s, lz = (x - b.x) * b.s + (z - b.z) * b.c; if (Math.abs(lx) < b.hx + r + 0.6 && Math.abs(lz) < b.hz + r + 0.6) return false; }
    for (const c of colliders) if (Math.hypot(x - c.x, z - c.z) < c.r + r + 0.6) return false;
    for (const q of ponds) if (Math.hypot(x - q.x, z - q.z) < q.r + r + 1.4) return false;
    for (const st of journeyStones) if (Math.hypot(x - st.x, z - st.z) < 2.6 + r) return false;
    for (const t of taken) if (Math.hypot(x - t.x, z - t.z) < t.r + r + 0.4) return false;
    return true;
  };
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;     // the same garden every time
  const put = (name, h, x, z, r, block = r * 0.6) => { taken.push({ x, z, r }); if (block) colliders.push({ x, z, r: block }); return [x, z, rnd() * Math.PI * 2]; };
  // scatter n of a kind in a ring of the grounds, as far as clear spots allow
  const scatter = (name, h, n, r, r0, r1, block, pathGap = 0.8) => {
    const list = [];
    for (let tries = 0; tries < n * 60 && list.length < n; tries++) {
      const a = rnd() * Math.PI * 2, d = r0 + rnd() * (r1 - r0), x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (clear(x, z, r, pathGap)) list.push(put(name, h, x, z, r, block));
    }
    if (list.length) props(name, h, list, { extra: true });
  };
  if (HIGH) {
    // trees stand well back from the paths, so the camera behind him doesn't swing into their leaves
    scatter("raintree", 11, 9, 4.2, 42, 62, 0.8, 4.5);       // big shade trees between the halls and the outer trees
    scatter("goldenshower", 8, 14, 2.8, 20, 58, 0.6, 4.5);   // ราชพฤกษ์, hanging yellow blossom
    // rockeries (เขามอ) beside the ponds, the way temples set them at the water's edge
    const rocky = [];
    ponds.forEach((q, i) => { for (let k = 0; k < 12; k++) { const a = i * 1.7 + k * 0.52, d = q.r + 2.2 + 1.5; const x = q.x + Math.cos(a) * d, z = q.z + Math.sin(a) * d; if (clear(x, z, 2.2)) { rocky.push(put("rockery", 3.4, x, z, 2.2, 1.6)); break; } } });
    if (rocky.length) props("rockery", 3.4, rocky, { extra: true });
    scatter("rockery", 3.4, 3, 2.2, 22, 50, 1.6);
    scatter("rocks", 1.7, 10, 1.8, 18, 66, 1.2);       // limestone groups with ferns
    // shrubs: red ixora (เข็ม) and heliconia, along the paths a step back from each edge, round the plaza and in
    // beds along both sides of every hall
    const ixora = [], helic = [];
    const shrub = (x, z, big) => { const r = big ? 1.2 : 1.1; if (clear(x, z, r, 0.6)) (big ? helic : ixora).push(put(big ? "heliconia" : "ixora", 1, x, z, r, r * 0.7)); };
    paths.forEach((p) => {
      const L = Math.hypot(p.x2 - p.x1, p.z2 - p.z1), nx = -(p.z2 - p.z1) / L, nz = (p.x2 - p.x1) / L;
      for (let u = 3; u < L - 2; u += 4.5) [-1, 1].forEach((sg, k) => {
        const big = ((Math.round(u / 4.5) + k) % 3) === 0, off = p.w / 2 + (big ? 1.2 : 1.1) + 0.9;
        shrub(p.x1 + (p.x2 - p.x1) * u / L + nx * off * sg, p.z1 + (p.z2 - p.z1) * u / L + nz * off * sg, big);
      });
    });
    for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; shrub(Math.cos(a) * 19.2, Math.sin(a) * 19.2, i % 4 === 0); } // the plaza's border
    Object.values(salas).forEach((h) => [-1, 1].forEach((sg) => { for (let lz = -h.D / 2; lz <= h.D / 2 + 0.1; lz += 2.6) { const [x, z] = h.toWorld(sg * (h.W / 2 + 3.4), lz); shrub(x, z, Math.round(lz) % 2 === 0); } }));
    if (ixora.length) props("ixora", 2.0, ixora, { extra: true });
    if (helic.length) props("heliconia", 3.0, helic, { extra: true });
  }
  // a pair of bonsai in glazed pots (ไม้ดัด) either side of every hall's steps
  const bonsai = [];
  Object.values(salas).forEach((h) => { [-1, 1].forEach((sg) => { const [x, z] = h.toWorld(sg * (Math.min(5, h.W - 2) / 2 + 1.0), h.D / 2 + 1.5); bonsai.push([x, z, sg]); colliders.push({ x, z, r: 0.55 }); }); });
  props("bonsai", 1.4, bonsai, { extra: true });
  taken.forEach((t) => { gardenSpots.push(t); });
}

/* ---------------- fish in the moat, fed from the bridge ---------------- */
// Koi and golden carp swim the moat, each patrolling its own stretch (more of them live near the bridge).
// Standing on the bridge and pressing E, the boy goes to the rail and tosses three handfuls of fish food:
// the pellets arc down and ripple where they land, and the fish nearby hurry over, crowd at the surface and
// nibble, then drift back to their stretch.
const FISH_LEN = 0.95, FISH_DEPTH = 0.16; // a fish's length (at this scale); how far under the surface they swim
const fishes = [], ripples = [], pellets = [];
const feed = { t: -1, side: 1, stand: null, faceYaw: 0, spot: null, until: -1, thrown: 0 };
const FEED_DUR = 4.6, FEED_TOSSES = [1.0, 2.2, 3.4];
const FISH_PLACE = { id: "fish", icon: "🐟", th: "ให้อาหารปลา", en: "Feed the fish", sub: ["โปรยอาหารจากสะพาน", "Toss food from the bridge"] };
{
  const n = HIGH ? 36 : 16, bridgeA = Math.PI / 2; // the bridge crosses the moat at +z
  for (let i = 0; i < n; i++) {
    const home = i < n * 0.4 ? bridgeA + (i / (n * 0.4) - 0.5) * 0.7 : (i / n) * Math.PI * 2 * 3.7; // 40% near the bridge
    const f = { kind: i % 3 === 2 ? "fish-gold" : "fish-koi", home, a: home + (Math.random() - 0.5) * 0.3, rr: MOAT.r1 + 1.2 + Math.random() * (MOAT.r2 - MOAT.r1 - 2.4),
      span: 0.12 + Math.random() * 0.18, speed: 0.6 + Math.random() * 0.5, ph: Math.random() * 10, dir: Math.random() < 0.5 ? 1 : -1,
      o: new THREE.Group(), pos: new THREE.Vector3(), heading: 0, eating: false, goal: null };
    f.pos.set(Math.cos(f.a) * f.rr, MOAT.water - FISH_DEPTH, Math.sin(f.a) * f.rr);
    scene.add(f.o); fishes.push(f);
  }
  ["fish-koi", "fish-gold"].forEach((kind) => loadProp(kind).then((src) => {
    if (!src) return;
    // the model's length is laid along +z (its head forward), scaled to a fish's length
    const box = new THREE.Box3().setFromObject(src), size = box.getSize(new THREE.Vector3());
    const along = size.x >= size.z ? "x" : "z", base = src.clone(); base.scale.setScalar(FISH_LEN / Math.max(size.x, size.z));
    if (along === "x") base.rotation.y = FISH_TURN; else base.rotation.y = FISH_TURN - Math.PI / 2;
    const holder = new THREE.Group(); holder.add(base);
    const b2 = new THREE.Box3().setFromObject(holder), c = b2.getCenter(new THREE.Vector3()); base.position.sub(c); // centred on its body
    fishes.filter((f) => f.kind === kind).forEach((f) => { const m = holder.clone(); m.traverse((o) => { if (o.isMesh) o.castShadow = false; }); f.o.add(m); });
  }));
}
const FISH_TURN = Math.PI / 2; // with the models' own facing, this points their heads where they swim (checked from the side)
const pelletGeo = new THREE.SphereGeometry(0.045, 6, 4), pelletMat = S(0x8a5a2b, { roughness: 1 });
const rippleGeo = new THREE.RingGeometry(0.85, 1, 32), rippleMat = new THREE.MeshBasicMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide });
function addRipple(x, z, size = 0.6) { const m = new THREE.Mesh(rippleGeo, rippleMat.clone()); m.rotation.x = -Math.PI / 2; m.position.set(x, MOAT.water + 0.02, z); m.userData = { t: 0, size }; scene.add(m); ripples.push(m); }
const onBridge = (x, z) => Math.abs(x) < ROAD / 2 - 0.4 && Math.abs(z - BRIDGE.zc) < BRIDGE.half - 1.2;
function startFeed() {
  if (feed.t >= 0 || alms.t >= 0 || kraap.t >= 0 || !onBridge(player.x, player.z)) return;
  if (sit.on) { sit.on = false; sit.rise = 0; sit.faceYaw = null; }
  wai.t = -1;
  const side = player.x >= 0 ? 1 : -1, z = Math.max(BRIDGE.zc - 2.5, Math.min(BRIDGE.zc + 2.5, player.z));
  feed.side = side; feed.stand = { x: side * (ROAD / 2 - 1.2), z }; feed.faceYaw = side > 0 ? Math.PI / 2 : -Math.PI / 2;
  feed.spot = new THREE.Vector3(side * (ROAD / 2 + 2.6), MOAT.water, z); feed.t = 0; feed.thrown = 0;
  if (player.mixer) playClip("idle", 0.4);
}
// the throwing arm: back beside the shoulder, then forward and up, the food leaving the hand at the top
const tossW = (t) => { for (const t0 of FEED_TOSSES) { const u = (t - t0) / 1.0; if (u >= 0 && u <= 1) return { u, w: smooth(0, 0.2, u) * (1 - smooth(0.75, 1, u)) }; } return { u: 0, w: 0 }; };
function poseFeed(model, B) {
  const { u, w } = tossW(feed.t); if (w <= 0.001) return;
  const up = new THREE.Vector3(0, 1, 0), fwd = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw)), side = new THREE.Vector3().crossVectors(up, fwd);
  const shoulder = B.RightArm.getWorldPosition(new THREE.Vector3()), scale = model.getWorldScale(new THREE.Vector3()).y;
  const back = shoulder.clone().addScaledVector(up, 0.05 * scale).addScaledVector(fwd, 0.1 * scale).addScaledVector(side, -0.25 * scale);
  const out = shoulder.clone().addScaledVector(up, 0.2 * scale).addScaledVector(fwd, 0.75 * scale).addScaledVector(side, 0.05 * scale);
  const target = back.lerp(out, smooth(0.3, 0.58, u));
  const shape = handShape(model); if (!shape) return;
  const hs = shape.Right, Q = basisQuat(hs.finger, hs.palm, fwd.clone().addScaledVector(up, 0.3).normalize(), up.clone().negate().addScaledVector(fwd, 0.3).normalize());
  armTo(B, "Right", target, Q, new THREE.Vector3().addScaledVector(up, -1).addScaledVector(side, -0.6), w);
  feed.hand = B.RightHand.getWorldPosition(new THREE.Vector3());
}
function feedStep(dt) {
  if (feed.t >= 0) {
    feed.t += dt;
    if (feed.t < 0.8) { player.x += (feed.stand.x - player.x) * Math.min(1, dt * 8); player.z += (feed.stand.z - player.z) * Math.min(1, dt * 8); }
    let dy = feed.faceYaw - player.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); player.yaw += dy * Math.min(1, dt * 8);
    // each toss lets go of a handful of pellets, which arc down onto the water
    const k = FEED_TOSSES.findIndex((t0) => feed.t >= t0 + 0.55 && feed.t - dt < t0 + 0.55);
    if (k >= 0 && feed.hand) {
      for (let i = 0; i < 9; i++) {
        const m = new THREE.Mesh(pelletGeo, pelletMat); m.position.copy(feed.hand); scene.add(m);
        const aim = feed.spot.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.6, 0, (Math.random() - 0.5) * 2.2));
        const T = 0.75 + Math.random() * 0.2, v = aim.sub(m.position).multiplyScalar(1 / T); v.y += 0.5 * 9.8 * T; // land at aim after T seconds
        pellets.push({ m, v });
      }
      feed.until = feed.t + 9; feed.thrown++;
    }
    if (feed.t > FEED_DUR) { feed.t = -1; feed.hand = null; feedLeft = 8; }
  } else if (feedLeft > 0) feedLeft -= dt;
  // pellets fall; where they meet the water they ripple and become food
  for (let i = pellets.length - 1; i >= 0; i--) {
    const q = pellets[i]; q.v.y -= 9.8 * dt; q.m.position.addScaledVector(q.v, dt);
    if (q.m.position.y <= MOAT.water) { addRipple(q.m.position.x, q.m.position.z, 0.35); food.push({ x: q.m.position.x, z: q.m.position.z, left: 6 + Math.random() * 3 }); scene.remove(q.m); pellets.splice(i, 1); }
  }
  for (let i = food.length - 1; i >= 0; i--) { food[i].left -= dt; if (food[i].left <= 0) food.splice(i, 1); }
  for (let i = ripples.length - 1; i >= 0; i--) { const r = ripples[i], d = r.userData; d.t += dt; const s = d.size * (0.3 + d.t * 1.6); r.scale.set(s, s, s); r.material.opacity = 0.6 * Math.max(0, 1 - d.t / 1.2); if (d.t > 1.2) { scene.remove(r); r.material.dispose(); ripples.splice(i, 1); } }
}
let feedLeft = 0; const food = [];
// the fish: patrol their stretch of the moat; when there is food nearby they hurry over and nibble at the surface
let fishTime = 0;
function fishStep(dt) {
  fishTime += dt; const calm = settings.calmMotion ? 0.5 : 1;
  for (const f of fishes) {
    let goal = null;
    if (food.length) { let best = 26; for (const q of food) { const d = Math.hypot(q.x - f.pos.x, q.z - f.pos.z); if (d < best) { best = d; goal = q; } } }
    if (goal) {
      // to the food, quickly, and up to the surface to take it
      const tx = goal.x + Math.sin(f.ph * 7) * 0.5, tz = goal.z + Math.cos(f.ph * 5) * 0.5;
      const dx = tx - f.pos.x, dz = tz - f.pos.z, d = Math.hypot(dx, dz) || 1, sp = Math.min(d, 2.6 * dt);
      f.pos.x += dx / d * sp; f.pos.z += dz / d * sp;
      const want = Math.atan2(dx, dz); let dh = want - f.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); f.heading += dh * Math.min(1, dt * 5);
      f.pos.y += ((d < 1.5 ? MOAT.water - 0.03 : MOAT.water - FISH_DEPTH) - f.pos.y) * Math.min(1, dt * 3);
      f.eating = d < 1.5;
      const rr = Math.hypot(f.pos.x, f.pos.z); f.rr = Math.max(MOAT.r1 + 0.8, Math.min(MOAT.r2 - 0.8, rr)); f.a = Math.atan2(f.pos.z, f.pos.x); // where it is now
      if (f.eating && Math.random() < dt * 0.8) addRipple(f.pos.x, f.pos.z, 0.25);
    } else {
      // patrolling: along the ring, turning back at the ends of its stretch
      f.eating = false;
      f.a += f.dir * f.speed * calm * dt / f.rr;
      if (Math.abs(Math.atan2(Math.sin(f.a - f.home), Math.cos(f.a - f.home))) > f.span * 3) f.dir = Math.sign(Math.atan2(Math.sin(f.home - f.a), Math.cos(f.home - f.a)));
      const rr = f.rr + Math.sin(fishTime * 0.3 + f.ph) * 0.8;
      const nx = Math.cos(f.a) * rr, nz = Math.sin(f.a) * rr;
      const want = Math.atan2(nx - f.pos.x, nz - f.pos.z); if (Math.hypot(nx - f.pos.x, nz - f.pos.z) > 1e-4) { let dh = want - f.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); f.heading += dh * Math.min(1, dt * 3); }
      f.pos.x += (nx - f.pos.x) * Math.min(1, dt * 2); f.pos.z += (nz - f.pos.z) * Math.min(1, dt * 2);
      f.pos.y += ((MOAT.water - FISH_DEPTH) - f.pos.y) * Math.min(1, dt * 1.5);
    }
    // the body sways as the tail beats (faster when hurrying or eating)
    const beat = f.eating || goal ? 9 : 4;
    f.o.position.copy(f.pos); f.o.rotation.set(f.eating ? -0.25 : 0, f.heading + Math.sin(fishTime * beat * calm + f.ph) * 0.18, 0);
  }
}

/* ---------------- making merit (ทำบุญ): incense, candles and a lotus; gold leaf; cloth on the Bodhi tree ---------------- */
// Three offerings, posed on the boy's skeleton like the wai. Before a Buddha image they are made kneeling, as in
// Thailand, with the kraap's kneeling and bows (below):
// • kneeling at the low incense table before a shrine he lights the two candles, lights three incense sticks from
//   them, holds the sticks and a lotus bud between his palms in the high wai, plants the incense in the sand and the
//   lotus in the vase, brings his hands to a wai at the chest, moves back on his knees and bows three times; the
//   candles and incense burn on (smoke rising) for a few minutes;
// • kneeling before the small bronze image he makes the high wai, presses a leaf of gold onto it, makes the high
//   wai again, moves back and bows three times; the gold stays where he pressed;
// • standing at the edge of the Bodhi tree's platform he makes a wai holding a folded three-coloured cloth, and a
//   new band of cloth appears around the trunk, shaped to it.
const merit = { t: -1, kind: null, spot: null, faceYaw: 0, dur: 0, altar: null, items: null, placed: false, done: false };
const MERIT = {
  offer: { place: { id: "offer", icon: "🪔", th: "บูชาพระด้วยธูปเทียนดอกไม้", en: "Offer incense, candles and a lotus", sub: ["คุกเข่า จุดเทียน จุดธูป ถวายดอกบัว แล้วกราบ 3 ครั้ง", "Kneel, light the candles and incense, offer a lotus, bow three times"] } },
  gild: { place: { id: "gild", icon: "✨", th: "ปิดทององค์พระ", en: "Apply gold leaf", sub: ["คุกเข่า ปิดทอง แล้วกราบ 3 ครั้ง", "Kneel, press on a leaf of gold, bow three times"] } },
  cloth: { dur: 4.4, place: { id: "cloth", icon: "🎗️", th: "ผูกผ้าสามสีต้นโพธิ์", en: "Tie a cloth on the Bodhi tree", sub: ["ผ้าสามสี แล้วไหว้", "A three-coloured cloth, then wai"] } },
};
const incenseMat = S(0x8c2f22, { roughness: 0.9 }), emberMat = new THREE.MeshBasicMaterial({ color: 0xff7a2a }), lotusMat = S(0xf2a3b8, { roughness: 0.7 }), stemMat = S(0x4f8f3f, { roughness: 0.8 });
function incenseBundle() { // three sticks and a lotus bud, held together
  const g = new THREE.Group();
  [-0.025, 0, 0.025].forEach((dx, i) => { add(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 5), incenseMat, dx, 0.21, (i - 1) * 0.01, g, false); const e = add(new THREE.SphereGeometry(0.012, 6, 4), emberMat, dx, 0.42, (i - 1) * 0.01, g, false); e.visible = false; e.userData.ember = true; });
  add(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 5), stemMat, 0.05, 0.12, 0.02, g, false);
  const bud = add(new THREE.SphereGeometry(0.05, 10, 8), lotusMat, 0.05, 0.31, 0.02, g, false); bud.scale.y = 1.7; bud.userData.lotus = true;
  return g;
}
const smokes = []; // incense smoke: soft puffs rising and fading
function puff(x, y, z) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: 0xe8e4dc, transparent: true, opacity: 0.35, depthWrite: false })); m.position.set(x, y, z); m.scale.setScalar(0.08); m.userData = { t: 0, dx: (Math.random() - 0.5) * 0.08 }; scene.add(m); smokes.push(m); }
function meritHere() {
  for (const a of altars) if (Math.hypot(player.x - a.near.x, player.z - a.near.z) < 1.1) return { kind: "offer", near: a.near, far: a.far, faceYaw: a.faceYaw, altar: a };
  if (gildImage.near && Math.hypot(player.x - gildImage.near.x, player.z - gildImage.near.z) < 1.1) return { kind: "gild", near: gildImage.near, far: gildImage.far, faceYaw: gildImage.faceYaw };
  const d = Math.hypot(player.x, player.z);
  if (d > 7.2 && d < 9.2 && player.y < 0.5) { const a = Math.atan2(player.x, player.z); return { kind: "cloth", spot: { x: Math.sin(a) * 7.9, z: Math.cos(a) * 7.9 }, faceYaw: a + Math.PI }; }
  return null;
}
function startMerit(here) {
  if (!here || merit.t >= 0 || kraap.t >= 0 || alms.t >= 0 || feed.t >= 0) return;
  if (sit.on) { sit.on = false; sit.rise = 0; sit.faceYaw = null; }
  if (broom.held) putBroomBack();
  if (here.kind !== "cloth") { startKneelingOffering(here); return; }
  wai.t = -1; wai.level = "buddha";
  Object.assign(merit, here, { t: 0, dur: 4.4, items: clothBundle(), placed: false, done: false });
  merit.items.visible = false; scene.add(merit.items);
  if (player.mixer) playClip("idle", 0.4);
}
// Kneeling offerings run on the kraap (its kneeling, wai and bows), with two more channels: the right hand reaching
// to something (the candles, the urn, the image) and the incense held. Keyframes:
// [time, kneel, chest wai, high wai, palms on the floor, bow, (tray, lift, place: Kathina only), moved back, reach]
function kneelKeys(kind) {
  const k = kind === "offer" ? [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0.6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [2.0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],             // kneeling before the table
    [2.6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],             // lights the left candle
    [3.1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],             // and the right
    [3.7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1], [4.2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],   // lights the incense at the candle
    [4.9, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0], [6.6, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],   // incense and lotus held in the high wai
    [7.3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1], [7.8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],   // planted in the urn
    [8.4, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],             // hands to a wai at the chest
    [9.6, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0],             // back on his knees, room to bow
  ] : [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0.6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [2.0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],             // kneeling before the image, a wai at the chest
    [2.6, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0], [3.2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],   // the high wai
    [3.9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1], [4.7, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],   // presses the gold leaf on
    [5.4, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0], [6.2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],   // the high wai again
    [6.8, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [8.0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0],             // back on his knees
  ];
  const shift = k[k.length - 1][0] - 2.0;
  KRAAP_KEYS.filter((q) => q[0] > 2.0).forEach((q) => k.push([q[0] + shift, ...q.slice(1), 0, 0, 0, 1, 0])); // the high wai, three bows, up
  return k;
}
const KNEEL_EVENTS = { offer: { candleL: 2.65, candleR: 3.15, embers: 4.0, plant: 7.6 }, gild: { leaf: 4.4 } };
function startKneelingOffering(here) {
  wai.t = -1;
  kraap.kathin = null;
  const items = here.kind === "offer" ? incenseBundle() : null; if (items) { items.visible = false; scene.add(items); }
  kraap.merit = { ...here, items, placed: false };
  kraap.spot = here.near; kraap.faceYaw = here.faceYaw;
  kraap.floorY = groundAt(here.near.x, here.near.z);
  kraap.keys = kneelKeys(here.kind); kraap.dur = kraap.keys[kraap.keys.length - 1][0];
  kraap.t = 0;
  if (player.mixer) playClip("idle", 0.4);
}
// where the right hand reaches, by the time in the offering
function kneelReach(t) {
  const m = kraap.merit;
  if (m.kind === "gild") return reachPoint("image");
  const a = m.altar, flame = (i) => a.candles[i].getWorldPosition(new THREE.Vector3());
  if (t < 2.9) return flame(0).add(new THREE.Vector3(0, 0.05, 0));
  if (t < 3.45) return flame(1).add(new THREE.Vector3(0, 0.05, 0));
  if (t < 4.6) return flame(1).add(new THREE.Vector3(0, -0.3, 0));   // the incense tips held in the flame
  return a.g.localToWorld(new THREE.Vector3(0, a.T + 0.3, -0.04));     // over the urn
}
function kneelStep(before, t) {
  const m = kraap.merit; if (!m) return;
  const at = (x) => before < x && t >= x, E = KNEEL_EVENTS[m.kind];
  if (m.kind === "offer") {
    const a = m.altar;
    if (at(E.candleL)) a.candles[0].visible = true;
    if (at(E.candleR)) a.candles[1].visible = true;
    if (at(E.embers) && m.items) m.items.children.forEach((c) => { if (c.userData.ember) c.visible = true; }); // lit from the candle
    if (at(E.plant) && m.items) { // planted in the sand, the lotus into the vase
      m.placed = true; const g = m.items; a.g.attach(g);
      g.position.set((Math.random() - 0.5) * 0.12, a.T + 0.12, -0.04 + (Math.random() - 0.5) * 0.06); g.rotation.set((Math.random() - 0.5) * 0.12, 0, (Math.random() - 0.5) * 0.12);
      const bud = g.children.find((c) => c.userData.lotus); if (bud) bud.position.set(0.26 - g.position.x, 0.33 - 0.12, 0.1 - g.position.z); // into the vase
      a.sticks.push(g); if (a.sticks.length > 3) { const old = a.sticks.shift(); old.parent && old.parent.remove(old); }
      a.lit = 180;
    }
  }
  if (m.kind === "gild" && at(E.leaf)) gildLeaf();
}
function endKneelingOffering() { const m = kraap.merit; if (m && m.items && !m.placed) scene.remove(m.items); kraap.merit = null; }
// the hand's target and turn for a reach (fingers forward and down, palm down), as in poseKraap
function kneelHand(model, fwd, up, t) {
  const shape = handShape(model); if (!shape) return null;
  const hs = shape.Right, Q = basisQuat(hs.finger, hs.palm, fwd.clone().addScaledVector(up, -0.4).normalize(), up.clone().negate().addScaledVector(fwd, 0.4).normalize());
  const along = hs.points.reduce((a, q) => a + q.clone().applyQuaternion(Q).dot(fwd), 0) / hs.points.length * model.getWorldScale(new THREE.Vector3()).y;
  return { target: kneelReach(t).addScaledVector(fwd, -along - 0.05), Q };
}
const clothBundle = () => { const g = new THREE.Group(); [0xf2c230, 0xc8322a, 0x3f9a4f].forEach((c, i) => add(new THREE.BoxGeometry(0.2, 0.05, 0.14), S(c, { roughness: 0.9 }), 0, 0.05 + i * 0.05, 0, g, false)); return g; };
// envelopes for each offering: reach (to a point), wai (hands together), bow
function meritState(t) {
  const k = merit.kind, e = (a, b, c, d) => smooth(a, b, t) * (1 - smooth(c, d, t));
  return { reach: 0, wai: e(0.8, 1.3, 3.6, 4.1), bow: e(1.6, 2.1, 3.0, 3.4) };
}
function reachPoint() { return gildImage.holder.parent.localToWorld(gildImage.chest.clone()); }
function poseMerit(model, B) {
  const st = meritState(merit.t), w = Math.max(st.reach, st.wai);
  const rest = restPose(model);
  const up = new THREE.Vector3(0, 1, 0), fwd = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw)), side = new THREE.Vector3().crossVectors(up, fwd);
  if (B.Hips && B.LeftUpLeg && B.RightUpLeg && w > 0) { // square to what he faces (the idle stands turned)
    model.updateMatrixWorld(true);
    const hipLine = B.LeftUpLeg.getWorldPosition(new THREE.Vector3()).sub(B.RightUpLeg.getWorldPosition(new THREE.Vector3())).setY(0).normalize();
    turnBone(B.Hips, _q2.slerpQuaternions(_q1.identity(), new THREE.Quaternion().setFromUnitVectors(hipLine, side), w));
  }
  if (rest && w > 0) ["Spine", "Spine01", "Spine02", "neck", "Head"].forEach((n) => { if (B[n] && rest[n]) B[n].quaternion.slerp(rest[n], w); });
  model.updateMatrixWorld(true);
  if (st.wai > 0.001 || st.bow > 0.001) poseWaiCore(model, B, st.wai, st.bow);
  if (st.reach > 0.001) {
    const shape = handShape(model); if (shape) {
      const hs = shape.Right, Q = basisQuat(hs.finger, hs.palm, fwd.clone().addScaledVector(up, -0.4).normalize(), up.clone().negate().addScaledVector(fwd, 0.4).normalize());
      const along = hs.points.reduce((a, q) => a + q.clone().applyQuaternion(Q).dot(fwd), 0) / hs.points.length * model.getWorldScale(new THREE.Vector3()).y;
      const target = reachPoint(st.reachTo).addScaledVector(fwd, -along - 0.05);
      armTo(B, "Right", target, Q, new THREE.Vector3().addScaledVector(up, -1).addScaledVector(side, -0.6), st.reach);
    }
  }
  // what he holds: between his palms in the wai, in his right hand as he reaches
  if (merit.items && !merit.placed) {
    const it = merit.items; it.visible = merit.t > 0.9;
    if (st.wai >= st.reach) { it.position.copy(wai.plane.point).addScaledVector(up, -0.06); it.rotation.set(0, player.yaw, 0); }
    else { it.position.copy(B.RightHand.getWorldPosition(new THREE.Vector3())).addScaledVector(fwd, 0.06); it.rotation.set(0, player.yaw, 0); }
  }
}
function meritStep(dt) {
  // the smoke and the burning sticks go on whether or not he is making an offering
  for (let i = smokes.length - 1; i >= 0; i--) { const m = smokes[i], d = m.userData; d.t += dt; m.position.y += dt * 0.35; m.position.x += d.dx * dt; m.scale.setScalar(0.08 + d.t * 0.12); m.material.opacity = 0.3 * Math.max(0, 1 - d.t / 2.6); if (d.t > 2.6) { scene.remove(m); m.material.dispose(); smokes.splice(i, 1); } }
  for (const a of altars) {
    if (a.lit > 0) { a.lit -= dt; if (a.lit <= 0) { a.candles.forEach((f) => { f.visible = false; }); a.sticks.forEach((g) => scene.remove(g)); a.sticks = []; } }
    a.sticks.forEach((g) => { if (Math.random() < dt * 2.2) { const e = g.children.find((c) => c.userData.ember); if (e) { const p = e.getWorldPosition(new THREE.Vector3()); puff(p.x, p.y + 0.02, p.z); } } });
  }
  if (merit.t < 0) return;
  const before = merit.t; merit.t += dt; const t = merit.t;
  if (t < 0.8) { player.x += (merit.spot.x - player.x) * Math.min(1, dt * 8); player.z += (merit.spot.z - player.z) * Math.min(1, dt * 8); }
  let dy = merit.faceYaw - player.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); player.yaw += dy * Math.min(1, dt * 8);
  const at = (x) => before < x && t >= x;
  if (merit.kind === "cloth" && at(2.4)) { tieCloth(); if (merit.items) { merit.items.visible = false; merit.placed = true; } }
  if (t > merit.dur) { if (merit.items && !merit.placed) scene.remove(merit.items); merit.t = -1; merit.kind = null; merit.items = null; }
}
// a leaf of gold where his fingers pressed, lying on the image's surface
const leafGeo = new THREE.PlaneGeometry(0.1, 0.1), leafMat = new THREE.MeshStandardMaterial({ color: 0xffd36a, metalness: 1, roughness: 0.25, emissive: 0x6a4a10, emissiveIntensity: 0.3, side: THREE.DoubleSide });
function gildLeaf() {
  if (!gildImage.mesh) return;
  const base = new THREE.Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.4) * 0.35, 0);
  for (let k = 0, put = 0; k < 10 && put < 3; k++) if (gildOne(base.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.08, 0)))) put++; // a few overlapping leaves
}
function gildOne(jitter) {
  const target = reachPoint("image"), from = target.clone().add(new THREE.Vector3(Math.sin(gildImage.faceYaw), 0, Math.cos(gildImage.faceYaw)).multiplyScalar(-0.8));
  const ray = new THREE.Raycaster(from.clone().add(jitter), target.clone().add(jitter).sub(from).normalize(), 0, 2);
  const hit = ray.intersectObject(gildImage.mesh, true)[0]; if (!hit) return false;
  const leaf = new THREE.Mesh(leafGeo, leafMat); leaf.position.copy(hit.point);
  const n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : ray.ray.direction.clone().negate();
  leaf.lookAt(hit.point.clone().add(n)); leaf.position.addScaledVector(n, 0.004); leaf.rotation.z += Math.random();
  gildImage.holder.attach(leaf); gildImage.leaves.push(leaf);
  if (gildImage.leaves.length > 120) { const old = gildImage.leaves.shift(); old.parent && old.parent.remove(old); }
  return true;
}
// a three-coloured cloth around the Bodhi tree's trunk, shaped to the trunk at its height
const bodhiBands = [];
function tieCloth() {
  const n = bodhiBands.length % 7, y = 4.3 + n * 0.3;
  const shown = (o) => { while (o) { if (!o.visible) return false; o = o.parent; } return true; };
  const meshes = []; scene.traverse((o) => { if (o.isMesh && shown(o)) { const p = o.getWorldPosition(new THREE.Vector3()); if (Math.hypot(p.x, p.z) < 3 && p.y < 12) meshes.push(o); } });
  const ray = new THREE.Raycaster(), N = 20, pts = [[], [], []];
  for (let k = 0; k < N; k++) {
    const a = k / N * Math.PI * 2; ray.set(new THREE.Vector3(Math.cos(a) * 6, y, Math.sin(a) * 6), new THREE.Vector3(-Math.cos(a), 0, -Math.sin(a))); ray.far = 6;
    const hit = ray.intersectObjects(meshes, true).find((h) => shown(h.object)); const r = (hit ? 6 - hit.distance : 1.4) + 0.05;
    [0, 1, 2].forEach((j) => pts[j].push(new THREE.Vector3(Math.cos(a) * r, y + (j - 1) * 0.07, Math.sin(a) * r)));
  }
  if (bodhiBands[n]) { scene.remove(bodhiBands[n]); }
  const g = new THREE.Group();
  [0xf2c230, 0xc8322a, 0x3f9a4f].forEach((c, j) => g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts[j], true), 60, 0.045, 6, true), S(c, { roughness: 0.9 }))));
  scene.add(g); bodhiBands[n] = g;
}

/* ---------------- sweeping the courtyard (กวาดลานวัด) ---------------- */
// A broom leans by the plaza. Picking it up, the boy sweeps as he walks: fallen Bodhi leaves before the broom are
// brushed away. Now and then a leaf falls from the tree. Putting it back is the same button at the stand.
const BROOM_AT = { x: -6.4, z: 12.6 };
const broom = { held: false, obj: new THREE.Group(), phase: 0 };
const BROOM_PLACE = { id: "broom", icon: "🧹", th: "กวาดลานวัด", en: "Sweep the courtyard", sub: ["หยิบไม้กวาด", "Pick up the broom"] };
const BROOM_BACK = { id: "broom", icon: "🧹", th: "วางไม้กวาด", en: "Put the broom back", sub: ["วางไว้ที่เดิม", "Lean it back where it was"] };
{
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.9, 8), MAT.wood); handle.position.y = 0.95 + 0.25; handle.castShadow = true;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.55, 10, 1, true), S(0xc9a560, { roughness: 1, side: THREE.DoubleSide })); head.position.y = 0.27; head.castShadow = true;
  const tie = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.08, 10), S(0xa03a2a)); tie.position.y = 0.52;
  broom.obj.add(handle, head, tie); scene.add(broom.obj);
  colliders.push({ x: BROOM_AT.x - 0.3, z: BROOM_AT.z, r: 0.3 });
}
function putBroomBack() { broom.held = false; }
const fallenLeaves = [];
const bodhiLeafGeo = new THREE.PlaneGeometry(0.22, 0.32), bodhiLeafMats = [0x7aa14a, 0xb7a240, 0x9c7a35].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, side: THREE.DoubleSide }));
function dropLeaf(fromTree) {
  const a = Math.random() * Math.PI * 2, r = 7.8 + Math.random() * 7.5;
  const m = new THREE.Mesh(bodhiLeafGeo, bodhiLeafMats[Math.floor(Math.random() * 3)]);
  m.userData = { x: Math.cos(a) * r, z: Math.sin(a) * r, fall: fromTree ? 9 + Math.random() * 3 : 0, spin: Math.random() * 6, fade: -1 };
  m.position.set(m.userData.x, 0.02 + m.userData.fall, m.userData.z); m.rotation.set(-Math.PI / 2, 0, Math.random() * 6);
  scene.add(m); fallenLeaves.push(m);
}
for (let i = 0; i < (HIGH ? 34 : 16); i++) dropLeaf(false);
let leafClock = 8;
function broomStep(dt, moving) {
  // the broom: leaning at its stand, or in his hands, its head swinging over the ground as he sweeps
  if (!broom.held) { broom.obj.position.set(BROOM_AT.x, 0, BROOM_AT.z); broom.obj.rotation.set(0, 0, -0.22); }
  else {
    broom.phase += dt * (moving ? 5 : 1.4);
    const fwd = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw)), right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const head = new THREE.Vector3(player.x, player.y, player.z).addScaledVector(fwd, 1.05).addScaledVector(right, 0.12 + Math.sin(broom.phase) * 0.35);
    const top = new THREE.Vector3(player.x, player.y + 1.75, player.z).addScaledVector(fwd, 0.25).addScaledVector(right, 0.25);
    const dir = top.clone().sub(head).normalize();
    broom.obj.position.copy(head); broom.obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    broom.grips = [head.clone().addScaledVector(dir, 1.0), head.clone().addScaledVector(dir, 1.45)];
    // leaves before the broom are brushed away
    for (const l of fallenLeaves) { const u = l.userData; if (u.fall > 0 || u.fade >= 0) continue; if (Math.hypot(u.x - head.x, u.z - head.z) < 0.75) { u.fade = 0; u.vx = fwd.x * 1.2 + right.x * Math.sin(broom.phase); u.vz = fwd.z * 1.2 + right.z * Math.sin(broom.phase); } }
  }
  // falling and swept leaves
  leafClock -= dt; if (leafClock <= 0) { leafClock = 10 + Math.random() * 14; if (fallenLeaves.length < (HIGH ? 60 : 30)) dropLeaf(true); }
  for (let i = fallenLeaves.length - 1; i >= 0; i--) {
    const l = fallenLeaves[i], u = l.userData;
    if (u.fall > 0) { u.fall = Math.max(0, u.fall - dt * 1.4); u.spin += dt * 3; l.position.set(u.x + Math.sin(u.spin) * 0.4, 0.02 + u.fall, u.z + Math.cos(u.spin * 0.7) * 0.3); l.rotation.set(-Math.PI / 2 + Math.sin(u.spin) * 0.6 * (u.fall > 0 ? 1 : 0), 0, u.spin); if (u.fall === 0) { u.x = l.position.x; u.z = l.position.z; } }
    else if (u.fade >= 0) { u.fade += dt; u.x += u.vx * dt; u.z += u.vz * dt; l.position.set(u.x, 0.02 + Math.sin(u.fade * 6) * 0.06, u.z); l.scale.setScalar(Math.max(0.01, 1 - u.fade / 1.2)); if (u.fade > 1.2) { scene.remove(l); fallenLeaves.splice(i, 1); } }
  }
}
function poseBroom(model, B) {
  if (!broom.held || !broom.grips) return;
  const shape = handShape(model); if (!shape) return;
  const up = new THREE.Vector3(0, 1, 0), fwd = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw)), side = new THREE.Vector3().crossVectors(up, fwd);
  [["Right", broom.grips[0], -1], ["Left", broom.grips[1], 1]].forEach(([s, p, sg]) => {
    const hs = shape[s], Q = basisQuat(hs.finger, hs.palm, side.clone().multiplyScalar(-sg), fwd.clone().negate());
    armTo(B, s, p.clone().addScaledVector(side, sg * 0.06), Q, new THREE.Vector3().addScaledVector(up, -1).addScaledVector(side, sg * 0.7), 1);
  });
}

/* ---------------- a living temple: walking meditation, a novice sweeping, the temple cat, pigeons ---------------- */
// The temple goes on with its day whether or not the visitor joins in: a monk at walking meditation (เดินจงกรม)
// on the sand lane by the kuti, a novice sweeping the courtyard round the Bodhi tree (by day), the temple cat asleep
// on the library's veranda, and pigeons pecking on the plaza that take off when someone comes close. None of them
// speaks or teaches; they are scenery. The monk and the novice are rigged like the boy (the same skeleton), so
// their hands are posed the same way: the monk's clasped before him, the novice's on his broom.
const npcLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
function loadNpc(name, height) {
  return Promise.all([name, name + "-idle"].map((n) => new Promise((res) => npcLoader.load(`assets/models/${n}.glb`, res, undefined, () => res(null)))))
    .then(([main, idle]) => {
      if (!main) return null;
      const obj = main.scene, holder = new THREE.Group(); holder.add(obj); fitModel(obj, height); scene.add(holder);
      holder.updateMatrixWorld(true);
      const walkClip = main.animations.find((c) => /walk/i.test(c.name)) || main.animations[0], idleClip = idle && idle.animations[0];
      if (!walkClip) return null;
      const B = {}; obj.traverse((o) => { if (o.isBone) B[o.name] = o; });
      const mixer = new THREE.AnimationMixer(obj);
      const n = { holder, obj, B, mixer, walk: mixer.clipAction(walkClip), idle: idleClip ? mixer.clipAction(idleClip) : null, gait: measureGait(obj, walkClip), liftWalk: measureLift(obj, walkClip), liftIdle: idleClip ? measureLift(obj, idleClip) : 0, k: height / 1.7 };
      n.lift = n.liftIdle;
      n.walk.play(); if (n.idle) n.idle.play();
      return n;
    });
}
// play walk and idle blended by how fast he goes; the walk at the speed that keeps the feet planted
function npcAnimate(n, speed, dt) {
  const w = Math.min(1, speed / 0.15);
  n.walk.setEffectiveWeight(n.idle ? w : 1); if (n.idle) n.idle.setEffectiveWeight(1 - w);
  n.walk.timeScale = speed > 0.01 ? speed / n.gait.speed : (n.idle ? 1 : 0);
  n.lift = n.idle ? n.liftIdle + (n.liftWalk - n.liftIdle) * w : n.liftWalk; // feet on the ground in either clip
  n.mixer.update(dt);
}
const npcAxes = (yaw) => { const up = new THREE.Vector3(0, 1, 0), fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)); return { up, fwd, side: new THREE.Vector3().crossVectors(up, fwd) }; };

// the monk: slowly along the lane and back, hands clasped before him, eyes lowered; at each end he stands a
// moment and turns round; if someone is standing in his way he waits for them
const lane = { n: null, u: 0, dir: 1, stop: 3, turn: -1, speed: 0, col: { x: LANE.x1, z: LANE.z1, r: 0.55 } };
colliders.push(lane.col);
function poseClasped(n, yaw) {
  const B = n.B; if (!B.Hips || !B.LeftArm) return;
  waiBegin(B);
  const { up, fwd, side } = npcAxes(yaw), k = n.k;
  [["neck", 0.12], ["Head", 0.16]].forEach(([b, a]) => { if (B[b]) turnBone(B[b], _q2.setFromAxisAngle(side, a)); }); // eyes on the ground ahead
  const shape = handShape(n.obj);
  if (shape) {
    const c = B.Hips.getWorldPosition(new THREE.Vector3()).addScaledVector(fwd, 0.17 * k).addScaledVector(up, -0.02 * k);
    const down = up.clone().negate();
    // the left hand lies against the body, the right hand holds it, a little in front
    [["Left", 1, 0], ["Right", -1, 0.05]].forEach(([s, sg, out]) => {
      const hs = shape[s]; if (!hs) return;
      const fingers = side.clone().multiplyScalar(-sg * 0.65).addScaledVector(down, 0.76).normalize();
      const palm = fwd.clone().negate(); palm.addScaledVector(fingers, -palm.dot(fingers)).normalize();
      const Q = basisQuat(hs.finger, hs.palm, fingers, palm);
      const wrist = c.clone().addScaledVector(side, sg * 0.085 * k).addScaledVector(fwd, out * k).addScaledVector(up, 0.03 * k);
      armTo(B, s, wrist, Q, side.clone().multiplyScalar(sg).addScaledVector(fwd, -0.5).addScaledVector(up, -0.3), 1);
    });
  }
  waiMark(B);
}
function laneStep(dt) {
  const n = lane.n; if (!n) return;
  const L = Math.hypot(LANE.x2 - LANE.x1, LANE.z2 - LANE.z1), dx = (LANE.x2 - LANE.x1) / L, dz = (LANE.z2 - LANE.z1) / L;
  const walkYaw = Math.atan2(dx * lane.dir, dz * lane.dir);
  let yaw = walkYaw, target = 0;
  if (lane.stop > 0) { lane.stop -= dt; if (lane.stop <= 0) lane.turn = 0; yaw = Math.atan2(-dx * lane.dir, -dz * lane.dir); }
  else if (lane.turn >= 0) { // turning round slowly, on the spot
    lane.turn += dt / 2.6; const from = Math.atan2(-dx * lane.dir, -dz * lane.dir);
    yaw = from + Math.PI * smooth(0, 1, Math.min(1, lane.turn)) * (lane.dir > 0 ? 1 : -1);
    if (lane.turn >= 1) { lane.turn = -1; yaw = walkYaw; }
  } else {
    const x = LANE.x1 + dx * lane.u, z = LANE.z1 + dz * lane.u;
    const ahead = (player.x - x) * dx * lane.dir + (player.z - z) * dz * lane.dir, across = Math.abs((player.x - x) * dz - (player.z - z) * dx);
    target = ahead > 0 && ahead < 2.2 && across < 1.2 ? 0 : 0.55; // someone in the way: he waits
    lane.u += lane.speed * dt * lane.dir;
    if (lane.u >= L || lane.u <= 0) { lane.u = Math.max(0, Math.min(L, lane.u)); lane.dir = -lane.dir; lane.stop = 2.5; lane.speed = 0; }
  }
  lane.speed += (target - lane.speed) * Math.min(1, dt * 2);
  const x = LANE.x1 + dx * lane.u, z = LANE.z1 + dz * lane.u;
  n.holder.position.set(x, groundAt(x, z) + n.lift, z); n.holder.rotation.y = yaw; lane.col.x = x; lane.col.z = z;
  npcAnimate(n, lane.stop > 0 || lane.turn >= 0 ? 0 : lane.speed, dt);
  n.holder.updateMatrixWorld(true);
  poseClasped(n, yaw);
}

// the novice: sweeping his way round the courtyard and back, now and then stopping to sweep one spot; at night
// he has gone in
const novice = { n: null, a: 2.1, dir: 1, speed: 0, pause: 0, phase: 0, broom: null, grips: null, col: { x: 0, z: 10, r: 0.55 } };
const NOVICE_ARC = [1.75, 4.55]; // the side of the courtyard away from the entrance road (angles round the tree)
colliders.push(novice.col);
function noviceStep(dt) {
  const n = novice.n; if (!n) return;
  const away = night.on; n.holder.visible = !away; novice.broom.visible = !away; novice.col.r = away ? 0 : 0.55;
  if (away) return;
  const r = 10.6 + Math.sin(novice.a * 3.1) * 2.2;
  let x = Math.sin(novice.a) * r, z = Math.cos(novice.a) * r;
  const yaw = Math.atan2(Math.cos(novice.a) * novice.dir, -Math.sin(novice.a) * novice.dir); // along the circle
  const { up, fwd, side } = npcAxes(yaw), right = side.clone().negate();
  let target = 0.42;
  if (novice.pause > 0) { novice.pause -= dt; target = 0; }
  else if (Math.random() < dt / 14) novice.pause = 3 + Math.random() * 4;
  const toP = new THREE.Vector3(player.x - x, 0, player.z - z);
  if (toP.length() < 2.6 && toP.dot(fwd) > 0) target = 0; // someone in the way: he waits
  novice.speed += (target - novice.speed) * Math.min(1, dt * 2);
  novice.a += (novice.speed * dt / r) * novice.dir;
  if (novice.a > NOVICE_ARC[1] || novice.a < NOVICE_ARC[0]) { novice.a = Math.max(NOVICE_ARC[0], Math.min(NOVICE_ARC[1], novice.a)); novice.dir = -novice.dir; novice.pause = 2; }
  n.holder.position.set(x, groundAt(x, z) + n.lift, z); n.holder.rotation.y = yaw; novice.col.x = x; novice.col.z = z;
  npcAnimate(n, novice.speed, dt);
  n.holder.updateMatrixWorld(true);
  // the broom swings from side to side before him, brushing leaves along
  novice.phase += dt * (novice.speed > 0.1 ? 4.2 : 3);
  const k = n.k / 1.6;
  const head = new THREE.Vector3(x, 0, z).addScaledVector(fwd, 1.1 * k).addScaledVector(right, 0.1 + Math.sin(novice.phase) * 0.38);
  const top = new THREE.Vector3(x, 1.85 * k, z).addScaledVector(fwd, 0.25 * k).addScaledVector(right, 0.25 * k);
  const dir = top.clone().sub(head).normalize();
  novice.broom.position.copy(head); novice.broom.quaternion.setFromUnitVectors(up, dir);
  const grips = [head.clone().addScaledVector(dir, 1.05 * k), head.clone().addScaledVector(dir, 1.5 * k)];
  for (const l of fallenLeaves) { const u = l.userData; if (u.fall > 0 || u.fade >= 0) continue; if (Math.hypot(u.x - head.x, u.z - head.z) < 0.75) { u.fade = 0; u.vx = fwd.x * 0.8 + right.x * Math.cos(novice.phase) * 1.2; u.vz = fwd.z * 0.8 + right.z * Math.cos(novice.phase) * 1.2; } }
  const B = n.B, shape = handShape(n.obj); if (!shape || !B.LeftArm) return;
  waiBegin(B);
  [["neck", 0.1], ["Head", 0.12]].forEach(([b, a]) => { if (B[b]) turnBone(B[b], _q2.setFromAxisAngle(side, a)); }); // watching the broom
  [["Right", grips[0], -1], ["Left", grips[1], 1]].forEach(([s, p, sg]) => {
    const hs = shape[s], Q = basisQuat(hs.finger, hs.palm, side.clone().multiplyScalar(-sg), fwd.clone().negate());
    armTo(B, s, p.clone().addScaledVector(side, sg * 0.06), Q, new THREE.Vector3().addScaledVector(up, -1).addScaledVector(side, sg * 0.7), 1);
  });
  waiMark(B);
}

// the temple cat, curled up asleep on the library's veranda; it breathes
const cat = { obj: null };
loadProp("cat").then((src) => {
  if (!src) return;
  const c = fitTo(src.clone(), 0.58), h = salas.library, [x, z] = h.toWorld(h.W / 2 - 1.1, h.D / 2 - 0.7);
  c.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  c.position.set(x, h.FY, z); c.rotation.y = h.g.rotation.y + 2.4; c.userData.sy = c.scale.y; scene.add(c); cat.obj = c;
});

// pigeons on the plaza: they walk and peck; when someone comes close (or the dog) they clatter up and fly to
// a tree, and come back down a while later somewhere quieter. At night they roost (out of sight).
const birds = [];
{
  const body = new THREE.SphereGeometry(0.12, 10, 8), head = new THREE.SphereGeometry(0.075, 10, 8), beak = new THREE.ConeGeometry(0.022, 0.07, 6), wing = new THREE.BoxGeometry(0.3, 0.015, 0.16), tail = new THREE.BoxGeometry(0.12, 0.012, 0.14);
  const looks = [[0x8d929c, 0x5e6470, 0x6f8f86], [0x9aa0aa, 0x6b7180, 0x7a6f8f], [0xb8b2a8, 0x7e7468, 0x8f8a7a], [0x6f7480, 0x4a4f5a, 0x5f7f78]];
  const beakMat = S(0x2b2b2b);
  for (let i = 0; i < (HIGH ? 9 : 5); i++) {
    const [cb, cw, cn] = looks[i % looks.length], mb = S(cb, { roughness: 0.8 }), mw = S(cw, { roughness: 0.8 }), mn = S(cn, { roughness: 0.5, metalness: 0.2 });
    const g = new THREE.Group(), b = new THREE.Mesh(body, mb); b.scale.set(1, 0.9, 1.6); b.position.y = 0.17; b.castShadow = true; g.add(b);
    const hp = new THREE.Group(); hp.position.set(0, 0.27, 0.15); g.add(hp);
    const hd = new THREE.Mesh(head, mn); hd.castShadow = true; hp.add(hd);
    const bk = new THREE.Mesh(beak, beakMat); bk.rotation.x = Math.PI / 2; bk.position.set(0, -0.01, 0.09); hp.add(bk);
    const wings = [-1, 1].map((sg) => { const p = new THREE.Group(); p.position.set(sg * 0.08, 0.22, 0); const m = new THREE.Mesh(wing, mw); m.position.x = sg * 0.14; p.add(m); g.add(p); return p; });
    const tl = new THREE.Mesh(tail, mw); tl.position.set(0, 0.17, -0.25); tl.rotation.x = -0.2; g.add(tl);
    [-1, 1].forEach((sg) => add(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 4), S(0xc0605a), sg * 0.04, 0.05, 0.02, g, false));
    g.scale.setScalar(1.15);
    scene.add(g);
    birds.push({ g, hp, wings, state: "ground", x: 0, z: 0, y: 0, yaw: Math.random() * 6, t: Math.random() * 5, peck: 0, hop: 0, flight: null, perch: 0 });
  }
}
const BIRD_GROUND = [[-6, -11], [7, -12], [-12, 3], [12, 2], [-8, 8], [9, -6]];
function birdHome(b, far) { // a quiet spot on the plaza, away from whoever scared them
  const pick = BIRD_GROUND.filter(([x, z]) => !far || Math.hypot(x - player.x, z - player.z) > 10);
  const [x, z] = (pick.length ? pick : BIRD_GROUND)[Math.floor(Math.random() * (pick.length || BIRD_GROUND.length))];
  const a = Math.random() * 6.28, r = Math.random() * 2.2; return [x + Math.cos(a) * r, z + Math.sin(a) * r];
}
birds.forEach((b) => { const [x, z] = birdHome(b, false); b.x = x; b.z = z; });
function fly(b, to, y1) {
  const from = new THREE.Vector3(b.x, b.y, b.z), dist = Math.hypot(to[0] - b.x, to[1] - b.z);
  b.flight = { from, to: new THREE.Vector3(to[0], y1, to[1]), mid: new THREE.Vector3((b.x + to[0]) / 2, Math.max(b.y, y1) + 3 + dist * 0.12, (b.z + to[1]) / 2), t: 0, dur: Math.max(1.6, dist / 8) };
  b.state = "fly";
}
let flutterAt = 0;
function birdsStep(dt) {
  const roost = night.on;
  for (const b of birds) {
    b.g.visible = !roost || b.state === "fly"; b.t += dt;
    if (b.state === "ground") {
      if (roost) { b.state = "perch"; b.perch = 1e9; continue; }
      // someone close: up they go, to a tree
      const dp = Math.hypot(player.x - b.x, player.z - b.z), dd = Math.hypot(dog.x - b.x, dog.z - b.z);
      if (dp < (keys.ShiftLeft || keys.ShiftRight ? 6 : 3.6) || dd < 2.4) {
        const tr = edgeTrees.length ? edgeTrees[Math.floor(Math.random() * edgeTrees.length)] : [b.x + 20, b.z];
        fly(b, [tr[0] + (Math.random() - 0.5) * 3, tr[1] + (Math.random() - 0.5) * 3], 6.5 + Math.random() * 2);
        if (performance.now() - flutterAt > 400) { flutterAt = performance.now(); sound.flutter(b.x, 0.5, b.z); }
        continue;
      }
      // walking and pecking
      b.peck = Math.max(0, b.peck - dt); b.hop = Math.max(0, b.hop - dt);
      if (b.peck <= 0 && b.hop <= 0 && Math.random() < dt * 0.8) { if (Math.random() < 0.55) b.peck = 0.5; else { b.hop = 0.6 + Math.random() * 0.8; b.yaw += (Math.random() - 0.5) * 2.2; } }
      if (b.hop > 0) { b.x += Math.sin(b.yaw) * dt * 0.7; b.z += Math.cos(b.yaw) * dt * 0.7; if (Math.hypot(b.x, b.z) < 7.6 || Math.hypot(b.x, b.z) > 15.5) b.yaw += Math.PI; }
      b.hp.rotation.x = b.peck > 0 ? Math.sin((0.5 - b.peck) / 0.5 * Math.PI) * 1.1 : 0;
      b.hp.position.z = 0.15 + (b.hop > 0 ? Math.sin(b.t * 12) * 0.03 : 0); // the pigeon's nodding walk
      b.wings.forEach((w, i) => { w.rotation.z = 0; });
      b.y = 0.03;
    } else if (b.state === "fly") {
      const f = b.flight; f.t += dt / f.dur; const u = Math.min(1, f.t), iu = 1 - u;
      const p = f.from.clone().multiplyScalar(iu * iu).addScaledVector(f.mid, 2 * iu * u).addScaledVector(f.to, u * u);
      const v = f.mid.clone().sub(f.from).multiplyScalar(2 * iu).addScaledVector(f.to.clone().sub(f.mid), 2 * u);
      b.yaw = Math.atan2(v.x, v.z); b.x = p.x; b.z = p.z; b.y = p.y;
      b.g.rotation.x = -Math.atan2(v.y, Math.hypot(v.x, v.z)) * 0.5;
      const flap = u > 0.85 ? 0.35 : Math.sin(b.t * 30) * 0.9; // gliding in to land
      b.wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * flap; });
      b.hp.rotation.x = 0;
      if (u >= 1) { b.g.rotation.x = 0; b.flight = null; if (f.to.y > 1) { b.state = "perch"; b.perch = 15 + Math.random() * 25; } else { b.state = "ground"; b.y = 0.03; } }
    } else { // perched in a tree (hidden among its leaves), or roosting for the night
      b.g.visible = false;
      b.perch -= dt;
      if (roost) b.perch = Math.max(b.perch, 1);
      else if (b.perch > 1e8) { b.perch = Math.random() * 6; }
      if (b.perch <= 0) { const [x, z] = birdHome(b, true); if (Math.hypot(player.x - x, player.z - z) > 8) fly(b, [x, z], 0.03); else b.perch = 3; }
    }
    b.g.position.set(b.x, b.y, b.z); b.g.rotation.y = b.yaw;
  }
}

function lifeStep(dt) {
  laneStep(dt); noviceStep(dt); birdsStep(dt);
  if (cat.obj) cat.obj.scale.y = cat.obj.userData.sy * (1 + Math.sin(performance.now() / 1000 * 1.7) * 0.025);
}
// the rigged monk and novice load after the boy, so his first steps are never delayed
setTimeout(() => {
  loadNpc("monk-walk", 3.3).then((n) => { if (n) lane.n = n; });
  loadNpc("novice", 2.95).then((n) => {
    if (!n) return; novice.n = n;
    novice.broom = broom.obj.clone(); scene.add(novice.broom);
  });
}, 1500);

/* ---------------- day and night, with dawn and dusk ---------------- */
// Night: a dark blue sky with stars and a moon, soft moonlight instead of the sun, every lamp post lit (a warm
// glow at its head and a pool of light on the ground), the halls lit from inside and their lanterns glowing.
// Day turns to night through a golden dusk, and night to day through a golden dawn: the light warms and lowers,
// the stars come out, and the lamp posts come on one by one. Real lights are costly, so only a few follow the
// visitor to the lamp posts nearest him; the rest of the lamps are glow alone. It follows the clock of the
// visitor's device: day from 6:00 to 18:00 and night otherwise, each change taking the hour around 6:00 and 18:00;
// the 🌙 button switches by hand for this visit (an eight-second dusk or dawn), until the clock's next change.
const DAWN = 6 * 60, DUSK = 18 * 60, TWILIGHT = 30; // minutes
const smoothT = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clockDay = () => { const n = new Date(), m = n.getHours() * 60 + n.getMinutes() + n.getSeconds() / 60; return smoothT(DAWN - TWILIGHT, DAWN + TWILIGHT, m) * (1 - smoothT(DUSK - TWILIGHT, DUSK + TWILIGHT, m)); };
const clockNight = () => clockDay() < 0.5;
// night.d: how much daylight there is now, 1 full day, 0 full night (in between: dawn or dusk)
const night = { on: clockNight(), manual: false, clockWas: clockNight(), d: clockDay() };
setInterval(() => {
  const c = clockNight(); if (c === night.clockWas) return;
  night.clockWas = c; night.manual = false;                      // the clock has turned (6:00 or 18:00): follow it again
  dawnDuskGong();
}, 30000);
// at dawn and dusk the temple gong sounds from the Learning Hall (only with the ambience on)
function dawnDuskGong() { const h = salas.learn, [x, z] = h.toWorld(0, h.D / 2 + 1); sound.gong(x, h.FY + 2, z); }
// every frame: move toward the light the clock (or the button) asks for
function timeStep(dt) {
  const want = night.manual ? (night.on ? 0 : 1) : clockDay();
  if (!night.manual && night.on !== want < 0.5) { night.on = want < 0.5; nightButton(); }
  if (Math.abs(want - night.d) < 1e-4) return;
  const rate = night.manual ? dt / 8 : dt / 2;
  night.d += Math.max(-rate, Math.min(rate, want - night.d));
  applyTime();
}
const nightObjs = new THREE.Group(); nightObjs.visible = false; scene.add(nightObjs);
const nightSky = []; // the night sky's materials, faded in at dusk
const lampGlows = []; // each lamp post's glow, with the point in the dusk at which it comes on
const duskGlow = { mat: null, mesh: null };
{
  // the night sky: a deep gradient, stars and the moon
  const g = new THREE.SphereGeometry(295, 32, 16), c = [], pos = g.attributes.position;
  const top = new THREE.Color(0x060b1c), low = new THREE.Color(0x1d2a4a);
  for (let i = 0; i < pos.count; i++) { const y = Math.max(0, pos.getY(i) / 295); const col = low.clone().lerp(top, Math.min(1, y * 1.6)); c.push(col.r, col.g, col.b); }
  g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
  const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, transparent: true, depthWrite: false });
  const skyM = new THREE.Mesh(g, skyMat); skyM.renderOrder = -3; nightObjs.add(skyM); // drawn first, then the stars and moon over it
  const sp = []; let sd = 11; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 900; i++) { const a = r() * Math.PI * 2, y = 0.08 + r() * 0.92, h = Math.sqrt(1 - y * y); sp.push(Math.cos(a) * h * 285, y * 285, Math.sin(a) * h * 285); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xfff6e0, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, depthWrite: false });
  const stars = new THREE.Points(sg, starMat); stars.renderOrder = -2; nightObjs.add(stars);
  const moonMat = new THREE.MeshBasicMaterial({ color: 0xfff3d6, fog: false, transparent: true, depthWrite: false });
  const moon = new THREE.Mesh(new THREE.CircleGeometry(9, 32), moonMat);
  moon.position.set(-120, 150, -170); moon.lookAt(0, 0, 0); moon.renderOrder = -1; nightObjs.add(moon);
  nightSky.push([skyMat, 0.0, 0.75], [starMat, 0.0, 0.35], [moonMat, 0.0, 0.55]); // [material, fully shown below, gone above] in daylight
  // the golden glow of dawn and dusk: warm at the horizon, fading upward (shown only in the twilight)
  const gg = new THREE.SphereGeometry(290, 32, 16), gc = [], ga = [], gp = gg.attributes.position;
  for (let i = 0; i < gp.count; i++) { const y = Math.max(0, gp.getY(i) / 290); const col = new THREE.Color(0xffa04a).lerp(new THREE.Color(0xff6f6a), Math.min(1, y * 2)); gc.push(col.r, col.g, col.b); ga.push(Math.max(0, 1 - y * 2.2)); }
  gg.setAttribute("color", new THREE.Float32BufferAttribute(gc, 3));
  const glowSky = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.BackSide, vertexColors: true, uniforms: { uOn: { value: 0 } },
    vertexShader: "attribute float alpha; varying vec3 vC; varying float vA; void main() { vC = color; vA = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform float uOn; varying vec3 vC; varying float vA; void main() { gl_FragColor = vec4(vC, vA * uOn); }" });
  gg.setAttribute("alpha", new THREE.Float32BufferAttribute(ga, 1));
  const glowM = new THREE.Mesh(gg, glowSky); glowM.renderOrder = -0.5; scene.add(glowM); duskGlow.mat = glowSky; duskGlow.mesh = glowM;
  // each lamp post: a glow at its head and a soft pool of light on the ground
  const poolTex = canvasTexture(128, 128, (cx, w, h) => { const gr = cx.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,196,120,0.75)"); gr.addColorStop(0.45, "rgba(255,170,90,0.28)"); gr.addColorStop(1, "rgba(255,160,80,0)"); cx.fillStyle = gr; cx.fillRect(0, 0, w, h); });
  poolTex.wrapS = poolTex.wrapT = THREE.ClampToEdgeWrapping;
  const head = new THREE.SphereGeometry(0.3, 14, 10), pool = new THREE.PlaneGeometry(7, 7);
  // they come on one by one at dusk, from the middle of the temple out to the gate and down the road
  const order = lanternSpots.map((p, i) => [i, Math.hypot(p[0], p[1])]).sort((a, b) => a[1] - b[1]).map(([i]) => i);
  lanternSpots.forEach(([x, z], i) => {
    const gy = groundAt(x, z), rank = order.indexOf(i);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffd38a, transparent: true });
    const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const h = new THREE.Mesh(head, glowMat); h.position.set(x, gy + LAMP_HEAD, z); scene.add(h);
    const p = new THREE.Mesh(pool, poolMat); p.rotation.x = -Math.PI / 2; p.position.set(x, gy + 0.07, z); p.renderOrder = 1; scene.add(p);
    lampGlows.push({ x, z, h, p, at: 0.68 - 0.36 * rank / Math.max(1, lanternSpots.length - 1), on: 0 });
  });
}
// a few real lights go to the lit lamp posts nearest him
const lampLights = []; if (HIGH) for (let i = 0; i < 3; i++) { const l = new THREE.PointLight(0xffc27a, 0, 11, 2); scene.add(l); lampLights.push(l); }
let lampLightTimer = 0;
function placeLampLights(dt) {
  if (night.d > 0.7 || !lampLights.length) return;
  lampLightTimer -= dt; if (lampLightTimer > 0) return; lampLightTimer = 0.25;
  const near = lampGlows.filter((q) => q.on > 0).map((q) => [q, Math.hypot(q.x - player.x, q.z - player.z)]).sort((a, b) => a[1] - b[1]);
  lampLights.forEach((l, i) => { const q = near[i] && near[i][0]; if (!q) { l.intensity = 0; return; } l.position.set(q.x, groundAt(q.x, q.z) + LAMP_HEAD - 0.2, q.z); l.intensity = 26 * q.on; });
}
const lanternMats = [];
loadProp("lantern").then((src) => { if (src) src.traverse((o) => { if (o.material && o.material.emissive) { o.material.emissive.set(0xff9a3c); lanternMats.push(o.material); } }); applyTime(); });
function nightButton() {
  const b = $("btn-night"), n = night.on; if (!b) return;
  b.setAttribute("aria-pressed", n); b.classList.toggle("on", n); b.firstChild.textContent = n ? "☀️ " : "🌙 ";
  const lb = b.querySelector(".label"); if (lb) lb.textContent = n ? tx("กลางวัน", "Day") : tx("กลางคืน", "Night");
}
// light the temple for how much daylight there is: day, golden dusk or dawn, night
function applyTime() {
  const d = night.d, k = 1 - d;
  const gold = Math.pow(Math.max(0, 1 - Math.abs(2 * d - 1)), 0.8);          // strongest halfway
  const mix = (day, nite) => nite + (day - nite) * d;
  const tone = (day, nite, golden, amt) => new THREE.Color(nite).lerp(new THREE.Color(day), d).lerp(new THREE.Color(golden), gold * amt);
  nightObjs.visible = d < 0.999;
  nightSky.forEach(([m, lo, hi]) => { m.opacity = 1 - smoothT(lo, hi, d); });
  if (duskGlow.mat) { duskGlow.mat.uniforms.uOn.value = 0.85 * gold; duskGlow.mesh.visible = gold > 0.001; }
  if (skyDome) skyDome.visible = d > 0.001 && !skyHdr;
  scene.background = d > 0.001 ? skyHdr : null;
  scene.backgroundIntensity = 0.9 * (0.45 + 0.55 * d);
  scene.environmentIntensity = mix(0.75, 0.08) * (1 - gold * 0.25);
  hemi.color.copy(tone(0xfff2d6, 0x8fa6d8, 0xffb070, 0.8)); hemi.groundColor.copy(tone(0x6f8f4a, 0x1c2433, 0x7a5a3a, 0.5)); hemi.intensity = mix(skyHdr ? 0.45 : 0.9, 0.32);
  sun.color.copy(tone(0xffd4a0, 0xa9bcff, 0xff7a30, 0.95)); sun.intensity = mix(2.3, 0.45) + gold * 0.5;
  scene.fog.color.copy(tone(0xf3d2a4, 0x0c1428, 0xe8915a, 0.85)); scene.fog.near = mix(90, 60); scene.fog.far = mix(290, 230);
  hallLamps.forEach((l) => { l.light.intensity = l.night + (l.day - l.night) * smoothT(0.3, 0.75, d); }); // the halls light up as dusk deepens
  lampGlows.forEach((q) => { q.on = smoothT(q.at + 0.03, q.at - 0.03, d); q.h.material.opacity = q.on; q.p.material.opacity = q.on; q.h.visible = q.p.visible = q.on > 0.001; });
  if (d > 0.7) lampLights.forEach((l) => { l.intensity = 0; });
  if (bloom) { bloom.strength = mix(0.3, 0.75); bloom.threshold = mix(1.05, 0.85); }
  renderer.toneMappingExposure = mix(0.95, 1.05);
  signMats.forEach((m) => m.color.copy(new THREE.Color(0x6d6d72).lerp(new THREE.Color(0xffffff), d))); // the signs are unlit: softer at night, readable without glare
  lanternMats.forEach((m) => { m.emissiveIntensity = 0.9 * smoothT(0.75, 0.3, d); }); // the hanging lanterns glow at night
  lampLightTimer = 0;
  sound.setDaylight(d);
  nightButton();
}

/* ---------------- sound: off until the visitor turns it on (charter: no autoplay) ---------------- */
const sound = createSound({ high: HIGH });
{
  const chimes = [];
  Object.values(salas).forEach((h) => [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => {
    const [x, z] = h.toWorld(sx * (h.W / 2 + 1.5), sz * (h.D / 2 + 1.5)); chimes.push([x, h.FY + h.H, z]);
  }));
  const trees = [...edgeTrees.map(([x, z]) => [x, 4, z]), [0, 10, 0], ...bushes.map(([x, z]) => [x, 1, z]), [-13, 4, -50], [13, 4, -50]];
  sound.places({ waterfalls: [[0, 4.4, -58.3]], chimes, trees, ponds: ponds.map(({ x, z }) => [x, 0.4, z]), geckos: chimes, moat: (MOAT.r1 + MOAT.r2) / 2 });
  sound.setDaylight(night.d);
}
const onPath = (x, z) => {
  if (Math.hypot(x, z) < 16) return true;
  return paths.some(({ x1, z1, x2, z2, w }) => {
    const dx = x2 - x1, dz = z2 - z1, L2 = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / L2));
    return Math.hypot(x - (x1 + t * dx), z - (z1 + t * dz)) < w / 2;
  });
};
addEventListener("visibilitychange", () => { if (document.hidden) sound.pause(); else sound.resume(); });

/* ---------------- avatars ---------------- */
// kind: "boy" (the Sambodhaya film's boy, the default), "blocky" (built here) or "photo" (a picture as the face)
const AV_DEFAULT = { kind: "boy", skin: "#e8b48a", shirt: "#e98a2b", pants: "#5e4a3a", hair: "#2b1d14", hairStyle: "short", face: "smile" };
const savedAvatar = read("avatar", {});
let avatarCfg = { ...AV_DEFAULT, ...savedAvatar };
if (!savedAvatar.v && savedAvatar.kind !== "photo") avatarCfg.kind = "boy"; // the boy became the default in v2
avatarCfg.v = 2;
let faceImage = null; // data URL, only kept if the player chose to remember it
if (avatarCfg.kind === "photo") faceImage = read("avatar-face", null);
if (avatarCfg.kind === "photo" && !faceImage) avatarCfg.kind = "blocky";
if (avatarCfg.kind === "model") avatarCfg.kind = "blocky"; // 3D files are never stored; start blocky

function faceCanvas(style, skin) {
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  g.fillStyle = skin; g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#2b1d14";
  g.beginPath(); g.ellipse(42, 52, 8, style === "sleepy" ? 3 : 10, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(86, 52, 8, style === "sleepy" ? 3 : 10, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#2b1d14"; g.lineWidth = 6; g.lineCap = "round"; g.beginPath();
  if (style === "smile") g.arc(64, 74, 22, 0.15 * Math.PI, 0.85 * Math.PI);
  else if (style === "calm") { g.moveTo(48, 92); g.lineTo(80, 92); }
  else if (style === "wow") { g.arc(64, 92, 9, 0, Math.PI * 2); }
  else g.arc(64, 80, 16, 0.2 * Math.PI, 0.8 * Math.PI);
  g.stroke();
  g.fillStyle = "rgba(240,120,120,.35)"; g.beginPath(); g.arc(30, 76, 9, 0, 7); g.arc(98, 76, 9, 0, 7); g.fill();
  return c;
}
function blockyAvatar(cfg, faceImg) {
  const root = new THREE.Group();
  const mat = (c) => M(new THREE.Color(c));
  const skin = mat(cfg.skin), shirt = mat(cfg.shirt), pants = mat(cfg.pants);
  const part = (geo, m, x, y, z, pivotY = 0) => {
    const pivot = new THREE.Group(); pivot.position.set(x, y + pivotY, z); root.add(pivot);
    const mesh = new THREE.Mesh(geo, m); mesh.position.y = -pivotY; mesh.castShadow = true; pivot.add(mesh); return pivot;
  };
  const legL = part(new THREE.BoxGeometry(0.48, 1, 0.5), pants, -0.27, 0.5, 0, 0.5);
  const legR = part(new THREE.BoxGeometry(0.48, 1, 0.5), pants, 0.27, 0.5, 0, 0.5);
  part(new THREE.BoxGeometry(1.05, 1.05, 0.55), shirt, 0, 1.53, 0);
  const armL = part(new THREE.BoxGeometry(0.42, 1, 0.45), shirt, -0.75, 1.5, 0, 0.45);
  const armR = part(new THREE.BoxGeometry(0.42, 1, 0.45), shirt, 0.75, 1.5, 0, 0.45);
  [armL, armR].forEach((a) => { const hand = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.43), skin); hand.position.y = -0.95; hand.castShadow = true; a.add(hand); });
  // head: face on +z
  const faceTex = new THREE.CanvasTexture(faceCanvas(cfg.face, cfg.skin)); faceTex.colorSpace = THREE.SRGBColorSpace;
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.9 });
  const headMats = [skin, skin, skin, skin, faceMat, skin];
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.75), headMats); head.position.y = 2.45; head.castShadow = true; root.add(head);
  if (faceImg) new THREE.TextureLoader().load(faceImg, (t) => { t.colorSpace = THREE.SRGBColorSpace; faceMat.map = t; faceMat.needsUpdate = true; });
  if (cfg.hairStyle !== "none") {
    const hm = mat(cfg.hair);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.2, 0.82), hm); top.position.y = 2.88; root.add(top);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.82, cfg.hairStyle === "long" ? 0.95 : 0.45, 0.16), hm); back.position.set(0, cfg.hairStyle === "long" ? 2.35 : 2.6, -0.42); root.add(back);
  }
  root.userData.limbs = { legL, legR, armL, armR };
  return root;
}

const player = { obj: new THREE.Group(), x: 0, z: 93, y: 0, vy: 0, yaw: Math.PI, model: null, mixer: null, clips: {}, current: null, vrm: null };
scene.add(player.obj);
function setModel(obj, mixerClips) {
  if (player.model) player.obj.remove(player.model);
  if (player.vrm) { VRMUtils.deepDispose(player.vrm.scene); player.vrm = null; }
  player.model = obj; player.obj.add(obj);
  player.mixer = null; player.clips = {}; player.current = null; player.action = null; player.lift = null;
  player.gait = {};
  if (mixerClips && mixerClips.length) {
    const find = (re) => mixerClips.find((c) => re.test(c.name));
    player.clips.idle = find(/idle|stand|breath/i) || mixerClips[0];
    player.clips.walk = find(/walk/i) || find(/run|jog|move/i);
    player.clips.run = find(/run|jog|sprint/i);
    if (player.clips.run === player.clips.walk) delete player.clips.run;
    const sitClip = find(/sit|cross.?legged|meditat/i); if (sitClip) player.clips.sit = sitClip;
    // measured once per model (the boy swaps between his shod and socked models at every hall)
    if (!obj.userData.gait) {
      obj.userData.gait = {}; ["walk", "run"].forEach((k) => { if (player.clips[k]) obj.userData.gait[k] = measureGait(obj, player.clips[k]); });
      obj.userData.lift = {}; ["idle", "walk", "run", "sit"].forEach((k) => { if (player.clips[k]) obj.userData.lift[k] = measureLift(obj, player.clips[k]); });
    }
    player.gait = obj.userData.gait; player.lift = obj.userData.lift;
    player.mixer = new THREE.AnimationMixer(obj);
    playClip("idle");
  }
}
// How far a clip lowers the feet below where they were measured standing (e.g. bent knees when idle):
// returns how much to lift the character so the lowest sole rests on the paving surface.
const PAVING = 0.025;
function measureLift(obj, clip) {
  let sk = null; obj.traverse((o) => { if (!sk && o.isSkinnedMesh) sk = o; });
  if (!sk) return 0;
  const mixer = new THREE.AnimationMixer(obj), act = mixer.clipAction(clip); act.play();
  const holderY = obj.position.y; obj.position.y = 0;
  let low = Infinity; const box = new THREE.Box3(), N = 24;
  for (let i = 0; i < N; i++) { mixer.setTime(clip.duration * i / N); obj.updateMatrixWorld(true); sk.computeBoundingBox(); box.copy(sk.boundingBox).applyMatrix4(sk.matrixWorld); low = Math.min(low, box.min.y - obj.getWorldPosition(new THREE.Vector3()).y); }
  mixer.stopAllAction(); mixer.uncacheRoot(obj); obj.position.y = holderY;
  return PAVING - low;
}
// How fast a walk or run clip carries the character, so the clip can be played at the speed that keeps
// the feet planted: sample a foot through the clip, count its strides and how far it travels.
function measureGait(obj, clip) {
  let foot = null; obj.traverse((o) => { if (!foot && o.isBone && /left.?foot|foot.?l\b|l.?foot/i.test(o.name)) foot = o; });
  if (!foot) return { speed: 3, steps: 2 };
  const mixer = new THREE.AnimationMixer(obj), act = mixer.clipAction(clip); act.play();
  const v = new THREE.Vector3(), zs = [], N = 160;
  for (let i = 0; i <= N; i++) { mixer.setTime(clip.duration * i / N); obj.updateMatrixWorld(true); foot.getWorldPosition(v); obj.worldToLocal(v); zs.push(v.z); }
  mixer.stopAllAction(); mixer.uncacheRoot(obj);
  const mean = zs.reduce((a, z) => a + z, 0) / zs.length;
  let cross = 0; for (let i = 1; i < zs.length; i++) if ((zs[i - 1] - mean) * (zs[i] - mean) < 0) cross++;
  const cycles = Math.max(1, cross / 2), range = Math.max(...zs) - Math.min(...zs);
  // the holder is scaled; convert to world units
  const s = new THREE.Vector3(); obj.getWorldScale(s);
  return { speed: Math.max(0.5, (2 * range * cycles) / clip.duration * (s.z || 1)), steps: (2 * cycles) / clip.duration };
}
function playClip(name, fade = 0.25) {
  if (!player.mixer || !player.clips[name] || player.current === name) return;
  const a = player.mixer.clipAction(player.clips[name]), prev = player.action;
  a.reset().setEffectiveWeight(1).play();
  if (prev && prev !== a) prev.crossFadeTo(a, fade, false); else a.fadeIn(fade);
  player.action = a; player.current = name;
}
function fitModel(obj, height = 2.9) {
  const box = new THREE.Box3().setFromObject(obj); const size = box.getSize(new THREE.Vector3());
  const s = height / (size.y || 1); obj.scale.setScalar(s);
  const box2 = new THREE.Box3().setFromObject(obj);
  obj.position.y -= box2.min.y; const c = box2.getCenter(new THREE.Vector3()); obj.position.x -= c.x; obj.position.z -= c.z;
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
}
function buildBlocky() { setModel(blockyAvatar(avatarCfg, avatarCfg.kind === "photo" ? faceImage : null)); }

// the Sambodhaya boy: a rigged 3D model with walk and idle animations (assets/models/boy*.glb)
const boyLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const boyReady = {};
// kit "boy" wears his sneakers; kit "boy-socks" is the same boy in his white socks, for inside the halls
function loadBoy(kit = "boy") {
  // boy.glb holds the model and its walk; the other files hold only an animation for the same skeleton
  if (!boyReady[kit]) boyReady[kit] = Promise.all([kit, kit + "-idle", kit + "-run", kit + "-sit"].map((n) => new Promise((res) => boyLoader.load(`assets/models/${n}.glb`, res, undefined, () => res(null)))))
    .then(([walk, idle, run, sitting]) => {
      if (!walk) return null;
      const obj = walk.scene, holder = new THREE.Group(); holder.add(obj); fitModel(obj);
      holder.updateMatrixWorld(true); pressHands(holder); // measure the hands in their rest pose
      return { holder, clips: [walk, idle, run, sitting].flatMap((g) => (g ? g.animations : [])) };
    });
  return boyReady[kit];
}
function buildAvatar() {
  if (avatarCfg.kind !== "boy") { buildBlocky(); return; }
  if (!player.model) buildBlocky(); // a stand-in while the boy loads
  loadBoy("boy").then((b) => {
    if (avatarCfg.kind !== "boy") return;
    if (!b) { buildBlocky(); return; } // couldn't load: stay a built character
    boyKits.shod = b; shoes.on = true; setModel(b.holder, b.clips);
    loadBoy("boy-socks").then((socks) => { boyKits.socks = socks; }); // for inside the halls; until it arrives, he keeps his shoes on
  });
}
buildAvatar();

const loader = new GLTFLoader();
loader.register((p) => new VRMLoaderPlugin(p));
function loadModelFile(file, done) {
  const url = URL.createObjectURL(file);
  loader.load(url, (gltf) => {
    URL.revokeObjectURL(url);
    const vrm = gltf.userData.vrm;
    let obj;
    if (vrm) { VRMUtils.removeUnnecessaryVertices(gltf.scene); VRMUtils.rotateVRM0(vrm); obj = vrm.scene; }
    else obj = gltf.scene;
    const holder = new THREE.Group(); holder.add(obj); fitModel(obj);
    setModel(holder, vrm ? null : gltf.animations);
    if (vrm) player.vrm = vrm;
    done(null);
  }, undefined, (err) => { URL.revokeObjectURL(url); done(err); });
}

/* ---------------- the temple dog (scripted guide, not an AI) ---------------- */
const dog = { obj: new THREE.Group(), x: 3, z: 90, y: 0, yaw: Math.PI };
{
  const fur = M(0xd9a35a), light = M(0xf3d29c), dark = M(0x3a2414), collar = M(0x3f8f5a);
  const b = (geo, m, x, y, z) => { const mm = new THREE.Mesh(geo, m); mm.position.set(x, y, z); mm.castShadow = true; dog.obj.add(mm); return mm; };
  b(new THREE.BoxGeometry(0.9, 0.8, 1.6), fur, 0, 0.95, 0);
  [[-0.3, 0.55], [0.3, 0.55], [-0.3, -0.55], [0.3, -0.55]].forEach(([x, z]) => b(new THREE.BoxGeometry(0.28, 0.6, 0.28), fur, x, 0.3, z));
  b(new THREE.BoxGeometry(0.8, 0.75, 0.75), fur, 0, 1.6, 0.85);
  b(new THREE.BoxGeometry(0.5, 0.35, 0.4), light, 0, 1.45, 1.3);
  b(new THREE.BoxGeometry(0.16, 0.12, 0.08), dark, 0, 1.58, 1.52);
  [-0.22, 0.22].forEach((x) => b(new THREE.BoxGeometry(0.1, 0.1, 0.05), dark, x, 1.78, 1.24));
  [-0.42, 0.42].forEach((x) => b(new THREE.BoxGeometry(0.15, 0.5, 0.35), M(0xb07a3a), x, 1.75, 0.8));
  b(new THREE.BoxGeometry(0.85, 0.12, 0.8), collar, 0, 1.25, 0.85);
  b(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 10), MAT.gold, 0, 1.12, 1.25).rotation.x = Math.PI / 2;
  dog.tail = b(new THREE.BoxGeometry(0.18, 0.18, 0.7), fur, 0, 1.25, -1);
  dog.tail.rotation.x = -0.6;
  dog.obj.visible = settings.guide !== false;
  scene.add(dog.obj);
  // the temple dog from the entrance artwork, as a 3D model (the block dog stays if it can't load)
  loadProp("dog").then((src) => {
    if (!src) return;
    dog.obj.children.forEach((c) => { c.visible = false; });
    src.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      // the model has no skeleton, so the walk is done on the graphics card (its shadow walks too)
      o.material = o.material.clone(); animateDog(o.material);
      o.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }); animateDog(o.customDepthMaterial);
    });
    const m = fitTo(src, 1.7); m.rotation.y = -Math.PI / 2; // the model faces sideways; turn it to walk head-first
    dog.obj.add(m); dog.model = m;
  });
}

// A trotting walk for the dog model. In the model's own space the head points to +x, it stands
// from y = -0.63 (paws) to 0.63 (ears), front legs sit near x = 0.6, back legs near x = -0.3 and the
// tail curls up behind x = -0.55. Diagonal legs swing together; the tail wags, faster when walking.
const dogAnim = { phase: { value: 0 }, walk: { value: 0 }, time: { value: 0 }, wag: { value: 1 }, sit: { value: 0 } };
function animateDog(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uPhase = dogAnim.phase; sh.uniforms.uWalk = dogAnim.walk; sh.uniforms.uTime = dogAnim.time; sh.uniforms.uWag = dogAnim.wag; sh.uniforms.uSit = dogAnim.sit;
    sh.vertexShader = "uniform float uPhase, uWalk, uTime, uWag, uSit;\n" + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      {
        const float HIP = -0.1, FEET = -0.634;
        float below = max(HIP - transformed.y, 0.0);                    // how far under the hip
        float legW = clamp(below / (HIP - FEET), 0.0, 1.0);
        float front = step(0.2, transformed.x), left = step(0.0, transformed.z);
        float off = 3.14159 * abs(front - left);                        // trot: diagonal pairs move together
        transformed.x += below * 0.5 * sin(uPhase + off) * uWalk;        // swing forward and back
        transformed.y += 0.07 * legW * legW * max(0.0, cos(uPhase + off)) * uWalk; // lift the paw on the way forward
        float tailW = clamp((-0.5 - transformed.x) / 0.4, 0.0, 1.0) * smoothstep(-0.15, 0.1, transformed.y);
        transformed.z += sin(uTime * mix(7.0, 13.0, uWalk)) * mix(0.12, 0.22, uWalk) * tailW * tailW * uWag;
        float headW = smoothstep(0.35, 0.6, transformed.x) * smoothstep(0.0, 0.3, transformed.y);
        transformed.y += sin(uPhase * 2.0) * 0.025 * uWalk * headW;
        // sitting: the body tips back around the front paws so the haunches come down to the ground;
        // the front legs stay upright (less tip toward the paws) and the hind legs fold flat on the ground
        if (uSit > 0.0) {
          float th = 0.5 * uSit * (1.0 - front * legW);
          vec2 dv = vec2(transformed.x - 0.6, transformed.y - FEET);
          float cs = cos(th), sn = sin(th);
          transformed.x = 0.6 + dv.x * cs - dv.y * sn;
          transformed.y = max(FEET + 0.01, FEET + dv.x * sn + dv.y * cs);
        }
      }`);
  };
}

/* ---------------- sitting: cross-legged, for meditation and for listening to a teacher ---------------- */
// He lowers himself into a cross-legged sit (ขัดสมาธิ) with his hands resting in his lap, palms up, the
// right hand on the left. Near a cushion in a hall he sits on it, facing the front (the altar and the
// teachers' platform); before a Buddha image he faces the image. The temple dog comes and sits beside
// him. Walking (or the button again) stands him up; a wai while sitting is fine.
const sit = { on: false, w: 0, rise: 0, spot: null, faceYaw: null };
function startSit() {
  if (sit.on || player.y > groundAt(player.x, player.z) + 0.05) return;
  let best = null, bd = 1.6;
  for (const c of cushionSpots) { const d = Math.hypot(c.x - player.x, c.z - player.z); if (d < bd) { bd = d; best = c; } }
  sit.spot = best; sit.on = true; sit.rise = 0;
  if (best) sit.faceYaw = best.yaw;
  else { const here = waiLevelHere(); sit.faceYaw = here.face ? Math.atan2(here.face.x - player.x, here.face.z - player.z) : null; }
  if (player.mixer && player.clips.sit) playClip("sit", 1.2);
}
function standUp() {
  if (!sit.on) return;
  sit.on = false; sit.rise = 1.1; sit.faceYaw = null;
  if (player.mixer) playClip("idle", 1.0);
}
const toggleSit = () => (sit.on ? standUp() : startSit());

/* ---------------- the kraap (กราบ): paying tribute to the Buddha, three times ---------------- */
// The five-point prostration (เบญจางคประดิษฐ์), made in front of a Buddha image: he kneels sitting back on
// his heels with his hands in a wai at the chest, raises them to the high wai, then three times lowers his
// hands flat onto the floor, a hand's width apart, and bows until his forehead touches the floor between
// them, coming back up into the high wai each time. Then he lowers his hands and stands. No animation for
// this exists, so it is posed on his skeleton: the knee, hip and forehead heights come from his measured
// body, and the bow is solved so the forehead really reaches the floor.
const kraap = { t: -1, spot: null, faceYaw: null, floorY: 0, touch: null, keys: null, dur: 0, kathin: null, merit: null };
// keyframes: [time, kneel, chest wai, high wai, palms on the floor, bow]
const KRAAP_KEYS = (() => {
  const k = [[0, 0, 0, 0, 0, 0], [0.6, 0, 0, 0, 0, 0], [2.0, 1, 1, 0, 0, 0], [2.7, 1, 0, 1, 0, 0], [3.0, 1, 0, 1, 0, 0]];
  let t = 3.0;
  for (let i = 0; i < 3; i++) {
    t += 1.0; k.push([t, 1, 0, 0, 1, 1]);   // down: palms flat, forehead to the floor
    t += 0.6; k.push([t, 1, 0, 0, 1, 1]);   // rest there
    t += 1.0; k.push([t, 1, 0, 1, 0, 0]);   // up again into the high wai
    t += 0.6; k.push([t, 1, 0, 1, 0, 0]);
  }
  t += 0.7; k.push([t, 1, 1, 0, 0, 0]);     // hands down to the chest
  t += 1.5; k.push([t, 0, 0, 0, 0, 0]);     // stand
  return k;
})();
const KRAAP_DUR = KRAAP_KEYS[KRAAP_KEYS.length - 1][0];
function kraapState(t) {
  const K = kraap.keys || KRAAP_KEYS; let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1], u = smooth(a[0], b[0], t);
  const v = (j) => (a[j] || 0) + ((b[j] || 0) - (a[j] || 0)) * u;
  return { kneel: v(1), chest: v(2), high: v(3), floor: v(4), bow: v(5), tray: v(6), lift: v(7), place: v(8), back: v(9), reach: v(10) };
}

/* ---------------- Kathina (ทอดกฐิน): offering the robe to the Sangha ---------------- */
// In the Learning Hall, the temple's main hall, the boy brings the Kathina robe on a gold tray to the senior monk, who receives it
// for the community of monks. He kneels close to the platform holding the tray, raises it to his forehead,
// sets it on the edge of the platform before the monk (who leans in and draws it to himself), brings his hands
// to a wai at the chest and moves back on his knees. Then he pays respect to the monk exactly as to the Buddha:
// the high wai and three bows, forehead and palms to the floor (the kraap above). No chant text is shown.
// keyframes as the kraap's, plus: [.., holding the tray, raised to the forehead, set on the platform, moved back]
const KATHIN_NEAR = 0.6, KATHIN_RELEASE = 4.65, KATHIN_BACK = 4.7; // kneel this far from the platform edge to reach it
const KATHIN_KEYS = (() => {
  const k = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0.6, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [2.2, 1, 0, 0, 0, 0, 1, 0, 0, 0],            // kneeling with the tray in both hands
    [3.0, 1, 0, 0, 0, 0, 1, 1, 0, 0], [3.5, 1, 0, 0, 0, 0, 1, 1, 0, 0],   // raised to the forehead
    [4.5, 1, 0, 0, 0, 0, 1, 0, 1, 0], [4.8, 1, 0, 0, 0, 0, 1, 0, 1, 0],   // set on the platform before the monk
    [5.5, 1, 1, 0, 0, 0, 0, 0, 0, 0],            // hands to a wai at the chest
    [6.7, 1, 1, 0, 0, 0, 0, 0, 0, 1],            // back on his knees, room to bow
  ];
  // then the kraap from its kneeling chest wai: the high wai, three bows, and up
  KRAAP_KEYS.filter((q) => q[0] > 2.0).forEach((q) => k.push([q[0] + KATHIN_BACK, ...q.slice(1), 0, 0, 0, 1]));
  return k;
})();
const KATHIN_PLACE = { id: "kathin", icon: "🟫", th: "ถวายผ้ากฐิน", en: "Offer the Kathina robe", sub: ["ถวายพระสงฆ์ผ่านพระเถระ แล้วกราบ 3 ครั้ง", "To the Sangha, through the senior monk; then bow three times"] };
function kathinSpots(h) { // where he kneels to offer, and where he bows (as far from the platform as before the Buddha)
  const s = h.senior, [nx, nz] = h.toWorld(s.lx, s.edge + KATHIN_NEAR), [fx, fz] = h.toWorld(s.lx, s.edge + 1.75);
  return { near: { x: nx, z: nz }, far: { x: fx, z: fz } };
}
function startKathin(h) {
  if (kraap.t >= 0 || alms.t >= 0 || !h || !h.senior) return;
  if (sit.on) { sit.on = false; sit.rise = 0; sit.faceYaw = null; }
  wai.t = -1;
  const sp = kathinSpots(h), s = h.senior;
  const [mx, mz] = h.toWorld(s.lx, s.lz);
  if (h.kathinTray && h.kathinTray.parent) h.kathinTray.parent.remove(h.kathinTray); // one robe at a time before the monk
  const tray = kathinTray(); tray.visible = false; scene.add(tray); h.kathinTray = tray;
  kraap.merit = null; kraap.kathin = { h, near: sp.near, far: sp.far, tray, released: false, monk: s };
  kraap.spot = sp.near; kraap.faceYaw = Math.atan2(mx - sp.near.x, mz - sp.near.z);
  kraap.floorY = groundAt(sp.near.x, sp.near.z);
  kraap.keys = KATHIN_KEYS; kraap.dur = KATHIN_KEYS[KATHIN_KEYS.length - 1][0];
  kraap.t = 0;
  if (player.mixer) playClip("idle", 0.4);
}
const TRAY_GRIP = 0.21, TRAY_HALF = 0.27; // where his hands hold the tray: height above its foot, half its width
// after he lets go: the senior monk leans in and draws the tray to himself
function kathinStep() {
  const k = kraap.kathin; if (!k) return;
  const s = k.monk, t = kraap.t;
  if (!k.released && t >= KATHIN_RELEASE) { k.released = true; k.h.g.attach(k.tray); k.from = k.tray.position.clone(); }
  if (k.released) {
    const u = smooth(KATHIN_RELEASE + 0.3, KATHIN_RELEASE + 1.8, t);
    k.tray.position.lerpVectors(k.from, new THREE.Vector3(s.lx, s.top, s.lz + 0.55), u); // to just before his knees
    k.tray.rotation.set(0, 0, 0);
    s.lean.rotation.x = 0.08 * smooth(KATHIN_RELEASE, KATHIN_RELEASE + 0.7, t) * (1 - smooth(KATHIN_RELEASE + 1.6, KATHIN_RELEASE + 2.4, t));
  }
}
function startKraap() {
  if (kraap.t >= 0) return;
  const here = waiLevelHere();
  if (here.level !== "buddha" || !here.face || !here.face.spot) {
    openDialog(tx("🙇 กราบพระ", "🙇 Pay tribute"), `<p>${tx("กราบพระได้ที่หน้าพระพุทธรูป ในศาลาเรียนรู้หรือศาลาสากล", "You can pay tribute in front of a Buddha image, in the Learning Hall or the Universal Hall.")}</p>
      <div class="row"><button class="chip" data-close>${tx("ตกลง", "OK")}</button></div>`);
    return;
  }
  if (sit.on) { sit.on = false; sit.rise = 0; sit.faceYaw = null; }
  wai.t = -1;
  kraap.keys = null; kraap.kathin = null; kraap.merit = null;
  kraap.spot = here.face.spot; kraap.faceYaw = Math.atan2(here.face.x - here.face.spot.x, here.face.z - here.face.spot.z);
  kraap.floorY = groundAt(here.face.spot.x, here.face.spot.z);
  kraap.t = 0;
  if (player.mixer) playClip("idle", 0.4);
}

/* ---------------- giving alms (ตักบาตร) ---------------- */
// He steps up to the monk and faces him, holds the rice ball in both hands, raises it to his forehead,
// places it in the bowl (bending a little, his eyes on the bowl), lowers his hands and then gives the high wai.
// The monk leans in slightly to receive. Posed on the skeleton, like the wai.
const alms = { t: -1, m: null, spot: null, faceYaw: 0, item: null, placed: false };
const ALMS_DUR = 4.0, ALMS_RELEASE = 3.05;
function almsState(t) {
  return {
    hold: smooth(0.4, 1.0, t) * (1 - smooth(3.3, 3.9, t)),   // the rice in both hands
    raise: smooth(1.0, 1.6, t) * (1 - smooth(2.3, 3.0, t)),  // up to the forehead
    place: smooth(2.3, 3.0, t) * (1 - smooth(3.3, 3.9, t)),  // into the bowl
  };
}
function startAlms(m) {
  if (alms.t >= 0 || kraap.t >= 0 || !m) return;
  if (sit.on) { sit.on = false; sit.rise = 0; sit.faceYaw = null; }
  wai.t = -1;
  alms.m = m; alms.spot = { x: m.x + Math.sin(m.yaw) * ALMS_STAND, z: m.z + Math.cos(m.yaw) * ALMS_STAND };
  alms.faceYaw = m.yaw + Math.PI;
  alms.item = riceBall(); alms.item.visible = false; scene.add(alms.item); alms.placed = false;
  alms.t = 0;
  if (player.mixer) playClip("idle", 0.4);
}
function almsStep(dt) {
  alms.t += dt;
  const st = almsState(alms.t);
  if (alms.m) alms.m.lean.rotation.x = 0.07 * st.place;                    // the monk leans in to receive
  if (alms.t >= ALMS_RELEASE && !alms.placed && alms.item) {             // let go: the rice stays in the bowl
    const m = alms.m, k = m.rice.length;
    m.lean.add(alms.item);
    const a = k * 2.4, d = k ? m.bowl.r * 0.45 : 0;
    alms.item.position.set(Math.sin(a) * d, m.bowl.y - RICE_R * 0.35 + Math.min(k, 3) * 0.02, m.bowl.f + Math.cos(a) * d);
    alms.item.visible = true; alms.item.scale.set(1, 0.85, 1);
    m.rice.push(alms.item); if (m.rice.length > 4) m.lean.remove(m.rice.shift()); // a full bowl stays a full bowl
    alms.placed = true;
  }
  if (alms.t > ALMS_DUR) {                                               // then the high wai to the monk
    if (!alms.placed && alms.item) scene.remove(alms.item);
    alms.t = -1; alms.item = null; if (alms.m) alms.m.lean.rotation.x = 0;
    wai.level = "buddha"; wai.dur = WAI_LEVELS.buddha.dur; wai.faceYaw = alms.faceYaw; wai.t = 0; wai.fromAlms = true; // the dog keeps sitting through it
  }
}
const ALMS_CHEST = { fwd: 0.42, up: -0.2 };  // where the rice is held, from the upper spine
const ALMS_GRIP = 0.026;                       // the palms press into the soft rice a little (measured gap otherwise ~2.5 cm)
const ALMS_BROW = { up: 0.2, fwd: 0.26 };      // raised to the forehead: above and in front of the head bone, square to the body
function poseAlms(model, B, st) {
  // square to the monk: the idle stands with the hips turned; they turn to face him, and the idle's
  // twist of the shoulders and glance of the head ease out
  const rest = restPose(model), w = Math.max(st.hold, st.place);
  const up = new THREE.Vector3(0, 1, 0), fwd = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  const side = new THREE.Vector3().crossVectors(up, fwd), axis = side.clone();  // toward his left; the bow turns about it
  if (B.Hips && B.LeftUpLeg && B.RightUpLeg) {
    model.updateMatrixWorld(true);
    const hipLine = B.LeftUpLeg.getWorldPosition(new THREE.Vector3()).sub(B.RightUpLeg.getWorldPosition(new THREE.Vector3())).setY(0).normalize();
    turnBone(B.Hips, _q2.slerpQuaternions(_q1.identity(), new THREE.Quaternion().setFromUnitVectors(hipLine, side), w));
  }
  if (rest) ["Spine", "Spine01", "Spine02", "neck", "Head"].forEach((n) => { if (B[n] && rest[n]) B[n].quaternion.slerp(rest[n], w); });
  model.updateMatrixWorld(true);
  // the head meets the raised rice; bending a little and looking down into the bowl to place it
  const bow = Math.max(0.3 * st.raise, st.place);
  [["Spine02", 0.06], ["Spine01", 0.06], ["Spine", 0.05], ["neck", 0.14], ["Head", 0.14]].forEach(([n, a]) => { if (B[n]) turnBone(B[n], _q2.setFromAxisAngle(axis, a * bow)); });
  model.updateMatrixWorld(true);
  const shape = handShape(model); if (!shape || !alms.m) return;
  const scale = model.getWorldScale(new THREE.Vector3()).y;
  const chest = B.Spine02.getWorldPosition(new THREE.Vector3()).addScaledVector(fwd, ALMS_CHEST.fwd).addScaledVector(up, ALMS_CHEST.up);
  const brow = B.Head.getWorldPosition(new THREE.Vector3()).addScaledVector(up, ALMS_BROW.up).addScaledVector(fwd, ALMS_BROW.fwd + RICE_R);
  const m = alms.m; m.lean.updateMatrixWorld(true);
  const bowl = m.lean.localToWorld(new THREE.Vector3(0, m.bowl.y + RICE_R * 0.8, m.bowl.f));
  const item = chest.clone().lerp(brow, st.raise).lerp(bowl, st.place);
  if (!alms.placed && alms.item) { alms.item.position.copy(item); alms.item.visible = st.hold > 0.3; }
  // both hands cup the rice from either side: palms toward each other, fingers forward and a little down
  const F = fwd.clone().addScaledVector(up, -0.35 + 0.6 * st.raise).normalize();
  [["Left", 1], ["Right", -1]].forEach(([s, sg]) => {
    const hs = shape[s], inward = side.clone().multiplyScalar(-sg);
    const P = inward.clone().addScaledVector(F, -inward.dot(F)).normalize();
    const Q = basisQuat(hs.finger, hs.palm, F, P);
    let reach = -Infinity, along = 0;
    for (const pt of hs.points) { _v1.copy(pt).applyQuaternion(Q); reach = Math.max(reach, _v1.dot(inward)); along += _v1.dot(F); }
    along /= hs.points.length;
    const target = item.clone().addScaledVector(inward, -(RICE_R - ALMS_GRIP + reach * scale)).addScaledVector(F, -along * scale);
    const pole = new THREE.Vector3().addScaledVector(up, -1).addScaledVector(side, sg * 0.6).addScaledVector(fwd, -0.2);
    armTo(B, s, target, Q, pole, st.hold);
  });
}

/* ---------------- the wai: palms together, a small bow ---------------- */
// No ready-made animation exists for a Thai wai, so it is posed on the boy's own skeleton: the
// arms are placed with a two-bone reach solver so the palms meet in front of the chest with the
// fingertips toward the chin, then the upper body and head bow, hold, and rise again. It sits on top
// of whatever he is doing (usually standing at ease); walking away ends it gently.
// The three heights of the Thai wai. Fingertip height and the face point are in the boy's head space
// (measured from his head mesh: chin about -0.07, nose tip 0.12, eyebrows 0.23, hairline 0.30, face front 0.26).
//   buddha: to the Buddha and to monks - thumbs between the eyebrows, fingertips at the hairline, deeper bow
//   elder:  to parents, teachers and elders - thumbs at the nose tip, fingertips between the eyebrows
//   peer:   to friends and equals - thumbs at the chin, fingertips at the nose
const WAI_LEVELS = {
  buddha: { tip: 0.32, dur: 3.8, bow: [0.08, 0.08, 0.08, 0.15, 0.13] },
  elder:  { tip: 0.23, dur: 3.2, bow: [0.06, 0.06, 0.06, 0.14, 0.12] },
  peer:   { tip: 0.12, dur: 2.9, bow: [0.05, 0.05, 0.05, 0.12, 0.10] },
};
const wai = { t: -1, dur: 2.9, level: "peer", faceYaw: null, plane: { normal: new THREE.Vector3(), point: new THREE.Vector3(), on: 0 } };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// which wai fits where he stands: in a shrine hall, to the Buddha image (and he turns to face it);
// in the caretaker's kuti, to an elder; elsewhere, the everyday wai
function waiLevelHere() {
  for (const b of buddhaImages) {
    if (insideHall(player.x, player.z) && Math.hypot(player.x - b.x, player.z - b.z) < Math.max(b.hall.W, b.hall.D)) return { level: "buddha", face: b };
  }
  const c = salas.care; if (c && insideHall(player.x, player.z) && Math.hypot(player.x - c.g.position.x, player.z - c.g.position.z) < Math.max(c.W, c.D) / 2 + 1) return { level: "elder" };
  return { level: "peer" };
}
function startWai() {
  if (wai.t >= 0 && wai.t < wai.dur - 0.6) return;
  const here = waiLevelHere();
  wai.level = here.level; wai.dur = WAI_LEVELS[here.level].dur; wai.fromAlms = false;
  wai.faceYaw = here.face ? Math.atan2(here.face.x - player.x, here.face.z - player.z) : null;
  wai.t = 0;
}
function waiWeights() {
  const t = wai.t, d = wai.dur; if (t < 0) return [0, 0];
  const hands = smooth(0, 0.55, t) * (1 - smooth(d - 0.55, d, t));
  const bow = smooth(0.5, 1.1, t) * (1 - smooth(d - 1.0, d - 0.45, t));
  return [hands, bow];
}
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _m = new THREE.Matrix4();
// turn a bone (in world space) by q, keeping it attached to its parent
const _tw = new THREE.Quaternion(), _tp = new THREE.Quaternion(); // private: callers pass _q1/_q2 as q
function turnBone(bone, q) {
  bone.getWorldQuaternion(_tw); _tw.premultiply(q);
  bone.parent.getWorldQuaternion(_tp); bone.quaternion.copy(_tp.invert().multiply(_tw));
  bone.updateMatrixWorld(true);
}
// point a bone so that its child (at childPos, world) moves to the target (world)
function aimBone(bone, childPos, target) {
  bone.getWorldPosition(_v1);
  _v2.copy(childPos).sub(_v1).normalize(); _v3.copy(target).sub(_v1).normalize();
  turnBone(bone, _q1.setFromUnitVectors(_v2, _v3));
}
const WAI_LEAN = 0.08;  // how much the tops of the hands lean together (radians)
const WAI_GAP = 0.0;    // the fingertips touch
// The hand's real shape, from the skinned mesh: the points that follow each hand bone (in world units,
// in the hand's own axes), the finger axis, and the palm normal. The palm normal is the hand's thinnest
// direction across the fingers; of its two signs, the palm is the side that faces the body when the
// arms hang at rest.
function handShape(model) {
  if (model.userData.waiHands !== undefined) return model.userData.waiHands;
  let sk = null; model.traverse((o) => { if (!sk && o.isSkinnedMesh) sk = o; });
  let result = null;
  if (sk) {
    result = {};
    const g = sk.geometry, pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, bones = sk.skeleton.bones;
    for (const side of ["Left", "Right"]) {
      const bi = bones.findIndex((b) => b.name === side + "Hand"); if (bi < 0) { result = null; break; }
      const sc = bones[bi].getWorldScale(new THREE.Vector3()).x / model.getWorldScale(new THREE.Vector3()).x;
      const toLocal = new THREE.Matrix4().multiplyMatrices(sk.skeleton.boneInverses[bi], sk.bindMatrix);
      const pts = [];
      for (let i = 0; i < pos.count; i++) {
        let wgt = 0; for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === bi) wgt += sw.getComponent(i, k);
        if (wgt > 0.5) pts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(toLocal).multiplyScalar(sc));
      }
      if (pts.length < 20) { result = null; break; }
      // thinnest direction across the hand (smaller axis of the spread in the x-z plane)
      let mx = 0, mz = 0; pts.forEach((q) => { mx += q.x; mz += q.z; }); mx /= pts.length; mz /= pts.length;
      let cxx = 0, czz = 0, cxz = 0; pts.forEach((q) => { const dx = q.x - mx, dz = q.z - mz; cxx += dx * dx; czz += dz * dz; cxz += dx * dz; });
      const ang = 0.5 * Math.atan2(2 * cxz, cxx - czz) + Math.PI / 2; // the minor axis
      const palm = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang));
      // the palm faces the body when the arms hang at rest
      const rest = sk.skeleton.boneInverses[bi].clone().invert(), hipsI = bones.findIndex((b) => /hips/i.test(b.name));
      const handPos = new THREE.Vector3().setFromMatrixPosition(rest);
      const bodyPos = hipsI >= 0 ? new THREE.Vector3().setFromMatrixPosition(sk.skeleton.boneInverses[hipsI].clone().invert()) : new THREE.Vector3();
      if (palm.clone().transformDirection(rest).dot(bodyPos.sub(handPos).setY(0)) < 0) palm.negate();
      const len = Math.max(...pts.map((q) => q.y));
      const tips = pts.filter((q) => q.y > 0.9 * len);
      // the fingers run from the wrist to the fingertips, which need not be straight along the bone (one model's
      // fingers bend 18 degrees toward the palm); the palm normal is kept square to them
      const finger = tips.reduce((acc, q) => acc.add(q), new THREE.Vector3()).normalize();
      palm.addScaledVector(finger, -palm.dot(finger)).normalize();
      result[side] = { points: pts, tips, tipY: tips.reduce((acc, q) => acc + q.dot(finger), 0) / tips.length, finger, palm, bone: bi };
    }
  }
  model.userData.waiHands = result;
  return result;
}
// Palms pressed together: during the wai, any vertex of a hand that would pass the plane where the hands
// meet is put back onto that plane, so the two palms flatten against each other instead of crossing.
function pressHands(model) {
  let sk = null; model.traverse((o) => { if (!sk && o.isSkinnedMesh) sk = o; });
  const shape = handShape(model); if (!sk || !shape) return;
  const u = { uPress: { value: 0 }, uPlane: { value: new THREE.Vector4() }, uHands: { value: new THREE.Vector2(shape.Left.bone, shape.Right.bone) } };
  sk.material = sk.material.clone();
  sk.material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = "uniform float uPress; uniform vec4 uPlane; uniform vec2 uHands;\n" + sh.vertexShader.replace("#include <skinning_vertex>", `#include <skinning_vertex>
      if (uPress > 0.0) {
        float wl = dot(skinWeight, vec4(equal(skinIndex, vec4(uHands.x)))), wr = dot(skinWeight, vec4(equal(skinIndex, vec4(uHands.y))));
        float sgn = wl > 0.5 ? 1.0 : (wr > 0.5 ? -1.0 : 0.0);
        float past = sgn * (dot(uPlane.xyz, transformed) + uPlane.w);   // how far past the middle this hand's vertex is
        if (sgn != 0.0 && past > 0.0) transformed -= sgn * uPlane.xyz * past * uPress;
      }`);
  };
  sk.material.customProgramCacheKey = () => "wai-press";
  sk.userData.press = u;
}
const _plane = new THREE.Plane(), _inv = new THREE.Matrix4();
function updatePress(model) {
  let sk = null; model.traverse((o) => { if (!sk && o.isSkinnedMesh) sk = o; });
  if (!sk || !sk.userData.press) return;
  const u = sk.userData.press;
  u.uPress.value = wai.t >= 0 || sit.w > 0.01 || kraap.t >= 0 || merit.t >= 0 ? Math.min(1, wai.plane.on * 1.5) : 0;
  if (!u.uPress.value) return;
  // the plane in the mesh's own space (where the skinned vertices are)
  _plane.setFromNormalAndCoplanarPoint(wai.plane.normal, wai.plane.point).applyMatrix4(_inv.copy(sk.matrixWorld).invert());
  u.uPlane.value.set(_plane.normal.x, _plane.normal.y, _plane.normal.z, _plane.constant);
}
// each bone's local rotation in the rest pose, from the skin's bind matrices
function restPose(model) {
  if (model.userData.restPose !== undefined) return model.userData.restPose;
  let sk = null; model.traverse((o) => { if (!sk && o.isSkinnedMesh) sk = o; });
  let rest = null;
  if (sk) {
    rest = {};
    const bones = sk.skeleton.bones, inv = sk.skeleton.boneInverses, m = new THREE.Matrix4(), q = new THREE.Quaternion(), pp = new THREE.Vector3(), sc = new THREE.Vector3();
    model.updateMatrixWorld(true);
    bones.forEach((b, i) => {
      const pi = bones.indexOf(b.parent);
      if (pi >= 0) m.copy(inv[pi]).multiply(inv[i].clone().invert()); // parent⁻¹ · bone, both in the rest pose
      else { // the root bone (the hips): its rest pose in the world, brought into its parent's (the armature's) space
        m.copy(b.parent.matrixWorld).invert().multiply(sk.matrixWorld).multiply(sk.bindMatrixInverse).multiply(inv[i].clone().invert());
      }
      m.decompose(pp, q, sc); rest[b.name] = q.clone();
    });
  }
  model.userData.restPose = rest;
  return rest;
}
// the rotation that turns local axes (a1, a2) onto world axes (b1, b2); a1 ⟂ a2 and b1 ⟂ b2
function basisQuat(a1, a2, b1, b2) {
  const a3 = new THREE.Vector3().crossVectors(a1, a2), b3 = new THREE.Vector3().crossVectors(b1, b2);
  const La = new THREE.Matrix4().makeBasis(a1, a2, a3), Lb = new THREE.Matrix4().makeBasis(b1, b2, b3);
  return new THREE.Quaternion().setFromRotationMatrix(Lb.multiply(La.transpose()));
}
const waiBones = {};
const WAI_BONES = ["Spine02", "Spine01", "Spine", "neck", "Head", "LeftArm", "LeftForeArm", "LeftHand", "RightArm", "RightForeArm", "RightHand",
  "Hips", "LeftUpLeg", "LeftLeg", "LeftFoot", "RightUpLeg", "RightLeg", "RightFoot"];
// Some bones (the spine) have no animation track, so nothing resets them each frame: start every
// frame from each bone's own pose, and hand it back when the wai ends.
function waiBegin(B) {
  WAI_BONES.forEach((n) => {
    const b = B[n]; if (!b) return;
    if (!b.userData.waiSet || !b.quaternion.equals(b.userData.waiSet)) b.userData.waiBase = b.quaternion.clone(); // the animation set it this frame
    else b.quaternion.copy(b.userData.waiBase);                                                                 // still our pose from last frame
  });
}
function waiEnd(B) {
  WAI_BONES.forEach((n) => { const b = B[n]; if (!b) return; if (b.userData.waiSet && b.quaternion.equals(b.userData.waiSet)) b.quaternion.copy(b.userData.waiBase); b.userData.waiSet = null; });
}
function waiMark(B) { WAI_BONES.forEach((n) => { const b = B[n]; if (b) b.userData.waiSet = b.quaternion.clone(); }); }
function boneMap(model) {
  if (!waiBones.model || waiBones.model !== model) {
    Object.keys(waiBones).forEach((k) => delete waiBones[k]); waiBones.model = model;
    model.traverse((o) => { if (o.isBone) waiBones[o.name] = o; });
  }
  return waiBones;
}
// Layers on top of the animation: sitting (hands in the lap, eyes lowered), then the wai. Each frame starts
// from the animation's pose; when both are done, the bones are handed back.
function poseOverlays(model, hands, bow, sitW) {
  const B = boneMap(model);
  if (!B.Spine || !B.LeftArm || !B.RightArm || !B.Head) return;
  if (kraap.t >= 0 && kraap.spot) { waiBegin(B); poseKraap(model, B, kraapState(kraap.t)); waiMark(B); return; }
  if (alms.t >= 0 && alms.m) { waiBegin(B); poseAlms(model, B, almsState(alms.t)); waiMark(B); return; }
  if (shoes.t >= 0) { waiBegin(B); poseShoes(model, B, shoes.t); waiMark(B); return; }
  if (feed.t >= 0) { waiBegin(B); poseFeed(model, B); waiMark(B); return; }
  if (merit.t >= 0) { waiBegin(B); poseMerit(model, B); waiMark(B); return; }
  if (broom.held && hands <= 0 && sitW <= 0.001) { waiBegin(B); poseBroom(model, B); waiMark(B); return; }
  if (hands <= 0 && bow <= 0 && sitW <= 0.001) { waiEnd(B); return; }
  waiBegin(B);
  if (sitW > 0.001) poseSit(model, B, sitW);
  poseWaiCore(model, B, hands, bow);
  waiMark(B);
}
function poseWai(model, hands, bow) { poseOverlays(model, hands, bow, sit.w); }
// one leg: ankle to its target with the knee toward pole, the foot pointing its toes to toe; blend by weight
function legTo(B, s, ankle, toe, pole, weight) {
  const up = B[s + "UpLeg"], lo = B[s + "Leg"], ft = B[s + "Foot"], tb = B[s + "ToeBase"]; if (!up || !lo || !ft) return;
  const animQ = [up.quaternion.clone(), lo.quaternion.clone(), ft.quaternion.clone()];
  const H = up.getWorldPosition(new THREE.Vector3()), K0 = lo.getWorldPosition(new THREE.Vector3()), A0 = ft.getWorldPosition(new THREE.Vector3());
  const a = H.distanceTo(K0), b = K0.distanceTo(A0);
  const toT = ankle.clone().sub(H); const d = Math.min(toT.length(), a + b - 1e-3); toT.normalize();
  const x = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - x * x));
  const pl = pole.clone().addScaledVector(toT, -pole.dot(toT)).normalize();
  aimBone(up, K0, H.clone().addScaledVector(toT, x).addScaledVector(pl, h));
  aimBone(lo, ft.getWorldPosition(new THREE.Vector3()), ankle);
  if (tb) aimBone(ft, tb.getWorldPosition(new THREE.Vector3()), toe);
  [up, lo, ft].forEach((bn, i) => { const solved = bn.quaternion.clone(); bn.quaternion.copy(animQ[i]).slerp(solved, weight); });
  up.updateMatrixWorld(true);
}
const KNEE_UP = 0.07, ANKLE_UP = 0.075, KNEEL_BACK = 0.08; // knee and ankle heights above the floor; ankles behind the hip joints
const CHEST_TIP = -0.12;                                    // the wai at the chest: fingertips just under the chin
const FOREHEAD = new THREE.Vector3(0, 0.27, 0.27);          // his forehead, in head space (from his head mesh)
const BOW_SPLIT = [["Spine02", 0.4], ["Spine01", 0.3], ["Spine", 0.3]], BOW_NECK = 0.25, BOW_HEAD = 0.2; // the forehead leads, not the crown
function applyBow(B, axis, theta, neckHead, extraHead) {
  BOW_SPLIT.forEach(([n, f]) => { if (B[n]) turnBone(B[n], _q2.setFromAxisAngle(axis, theta * f)); });
  if (B.neck) turnBone(B.neck, _q2.setFromAxisAngle(axis, BOW_NECK * neckHead + 0.06 * extraHead));
  if (B.Head) turnBone(B.Head, _q2.setFromAxisAngle(axis, BOW_HEAD * neckHead + 0.08 * extraHead));
}
// Each model's own forehead (the shod and socked boys' faces sit differently on the head bone): the front-most
// point of the face's midline at forehead height, measured from the head mesh in its rest pose. FOREHEAD came
// from the first boy, whose forehead measures 0.011 behind it; the same margin is kept for every model.
function foreheadOf(model) {
  if (!model || model.userData.forehead !== undefined) return (model && model.userData.forehead) || FOREHEAD;
  let sk = null; model.traverse((o) => { if (!sk && o.isSkinnedMesh) sk = o; });
  let f = null;
  if (sk) {
    const bones = sk.skeleton.bones, bi = bones.findIndex((b) => b.name === "Head");
    if (bi >= 0) {
      const g = sk.geometry, pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
      const sc = bones[bi].getWorldScale(new THREE.Vector3()).y / model.getWorldScale(new THREE.Vector3()).y;
      const M = new THREE.Matrix4().multiplyMatrices(sk.skeleton.boneInverses[bi], sk.bindMatrix), v = new THREE.Vector3();
      let z = -Infinity;
      for (let i = 0; i < pos.count; i++) {
        let wt = 0; for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === bi) wt += sw.getComponent(i, k);
        if (wt < 0.3) continue;
        v.fromBufferAttribute(pos, i).applyMatrix4(M).multiplyScalar(sc);
        if (Math.abs(v.x) < 0.03 && v.y > 0.22 && v.y < 0.32) z = Math.max(z, v.z);
      }
      if (z > -Infinity) f = new THREE.Vector3(0, FOREHEAD.y, z + 0.011);
    }
  }
  model.userData.forehead = f;
  return f || FOREHEAD;
}
const foreheadAt = (B) => { const hs = B.Head.getWorldScale(new THREE.Vector3()).y || 1; return foreheadOf(B.model).clone().multiplyScalar(1 / hs).applyMatrix4(B.Head.matrixWorld); };
const PHI_BOW = 0.75, PELVIS_SHARE = 0.6; // in the bow the thighs pivot around the knees (hips stay low); most of the fold is at the hips, the back stays long
// The lower body. Kneeling, he sits back on his heels; as he bows, his hips rise and come forward, the thighs
// pivoting around the knees (which stay on the floor) and the pelvis tilting forward, so the torso can fold
// down in front of the knees - as in a real kraap.
function poseLowerBody(model, B, c, kneel, bow, fold = 0) {
  const thighAngle = Math.asin(Math.min(1, c.span / c.thigh));
  const phi = thighAngle + (PHI_BOW - thighAngle) * bow;
  const knee = new THREE.Vector3(c.root.x, c.floor + KNEE_UP * c.scale, c.root.z).addScaledVector(c.fwd, c.span);
  const hipJoint = knee.clone().addScaledVector(c.up, c.thigh * Math.cos(phi)).addScaledVector(c.fwd, -c.thigh * Math.sin(phi));
  B.Hips.quaternion.copy(c.hipsQ);
  // square the hips to the front while kneeling: turn the pelvis so the line between the hip joints runs
  // straight across his body (no twist or sideways tilt from the standing animation)
  model.updateMatrixWorld(true);
  const hipLine = B.LeftUpLeg.getWorldPosition(new THREE.Vector3()).sub(B.RightUpLeg.getWorldPosition(new THREE.Vector3())).normalize();
  turnBone(B.Hips, new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(hipLine, c.side), kneel));
  turnBone(B.Hips, _q2.setFromAxisAngle(c.axis, fold * kneel)); // the pelvis folds forward
  // place the pelvis so the hip joints sit exactly where they should (tilting swings them around the pelvis)
  B.Hips.position.copy(B.Hips.parent.worldToLocal(c.hipsW.clone().lerp(hipJoint.clone().add(c.hipsAbove), kneel)));
  model.updateMatrixWorld(true);
  const jointsAt = B.LeftUpLeg.getWorldPosition(new THREE.Vector3()).add(B.RightUpLeg.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5);
  const want = c.joints.clone().lerp(hipJoint, kneel);
  B.Hips.position.copy(B.Hips.parent.worldToLocal(B.Hips.getWorldPosition(new THREE.Vector3()).add(want.sub(jointsAt))));
  model.updateMatrixWorld(true);
  [["Left", 1], ["Right", -1]].forEach(([s]) => {
    const H = B[s + "UpLeg"].getWorldPosition(new THREE.Vector3());
    // the ankle stays where it lies when kneeling (behind the knee, the shin flat on the floor)
    const ankle = new THREE.Vector3(c.root.x, c.floor + ANKLE_UP * c.scale, c.root.z).addScaledVector(c.fwd, c.span - c.shin).addScaledVector(c.side, H.clone().sub(c.root).dot(c.side));
    const toe = ankle.clone().addScaledVector(c.fwd, -0.24 * c.scale).setY(c.floor + 0.04 * c.scale);
    legTo(B, s, ankle, toe, c.fwd.clone().addScaledVector(c.up, -0.3), kneel);
  });
}
// how far the spine must bend, with the hips raised as in the bow, for the forehead to touch the floor
// (found once he is fully kneeling, then kept)
function kraapTouch(model, B, c) {
  if (kraap.touch) return kraap.touch;
  const lower = ["Hips", "LeftUpLeg", "LeftLeg", "LeftFoot", "RightUpLeg", "RightLeg", "RightFoot"], upper = ["Spine02", "Spine01", "Spine", "neck", "Head"];
  const savedQ = [...lower, ...upper].map((n) => B[n] && B[n].quaternion.clone()), savedP = B.Hips.position.clone();
  const restore = () => { [...lower, ...upper].forEach((n, i) => { if (B[n]) B[n].quaternion.copy(savedQ[i]); }); B.Hips.position.copy(savedP); model.updateMatrixWorld(true); };
  const upperQ = upper.map((n) => B[n].quaternion.clone());
  const reset = () => restore();
  // scan for the first bend at which the forehead reaches the floor, then refine; if it never quite
  // does, take the bend that brings it lowest
  const pose = (th) => { reset(); poseLowerBody(model, B, c, 1, 1, PELVIS_SHARE * th); applyBow(B, c.axis, (1 - PELVIS_SHARE) * th, 1, 0); };
  const heightAt = (th) => { pose(th); return foreheadAt(B).y - (c.floor + 0.012); };
  let lo = 0, hi = null, best = 0, bestH = Infinity;
  for (let th = 0; th <= 2.6; th += 0.05) { const h = heightAt(th); if (h < bestH) { bestH = h; best = th; } if (h <= 0) { hi = th; break; } lo = th; }
  if (hi != null) { for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (heightAt(mid) > 0) lo = mid; else hi = mid; } } else hi = best;
  pose(hi);
  const joints = B.LeftUpLeg.getWorldPosition(new THREE.Vector3()).add(B.RightUpLeg.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5);
  const fh = foreheadAt(B);
  kraap.touch = { theta: hi, fwd: fh.clone().sub(joints).dot(c.fwd), reached: fh.y - c.floor };
  restore();
  return kraap.touch;
}
function poseKraap(model, B, st) {
  const up = new THREE.Vector3(0, 1, 0);
  const fwd = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw)), side = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  const axis = new THREE.Vector3().crossVectors(up, fwd).normalize();
  const scale = model.getWorldScale(new THREE.Vector3()).y;
  const floor = kraap.floorY + (insideHall(kraap.spot.x, kraap.spot.z) ? 0 : PAVING);
  const rest = restPose(model);
  // a straight back and head, facing straight ahead (out of the standing animation's lean and glancing)
  if (rest) ["Spine02", "Spine01", "Spine", "neck", "Head"].forEach((n) => { if (B[n] && rest[n]) B[n].quaternion.slerp(rest[n], st.kneel); });
  model.updateMatrixWorld(true);
  const wp = (n) => B[n].getWorldPosition(new THREE.Vector3());
  // his measurements, from this frame's standing pose
  const thigh = wp("LeftUpLeg").distanceTo(wp("LeftLeg")), shin = wp("LeftLeg").distanceTo(wp("LeftFoot"));
  const joints = wp("LeftUpLeg").add(wp("RightUpLeg")).multiplyScalar(0.5), hipsW = wp("Hips");
  const span = shin - KNEEL_BACK * scale; // knees this far in front of the hip joints when sitting on the heels
  const c = { up, fwd, side, axis, scale, floor, thigh, shin, span, root: new THREE.Vector3(player.x, 0, player.z).addScaledVector(fwd, joints.clone().sub(new THREE.Vector3(player.x, 0, player.z)).dot(fwd)),
    hipsW, joints, hipsQ: B.Hips.quaternion.clone(), hipsAbove: hipsW.clone().sub(joints) };
  // 1)+2) hips and legs: kneeling, rising as he bows
  const touch = st.kneel > 0.99 ? kraapTouch(model, B, c) : (kraap.touch || { theta: 1.6, fwd: 1.0 });
  poseLowerBody(model, B, c, st.kneel, st.bow, PELVIS_SHARE * touch.theta * st.bow);
  // 3) the bow: the rest of the fold in the back, the neck and head bowing until the forehead touches the floor
  applyBow(B, axis, (1 - PELVIS_SHARE) * touch.theta * st.bow, st.bow, st.high);
  model.updateMatrixWorld(true);
  // 4) the hands: a wai at the chest, the high wai, or palms flat on the floor either side of the forehead
  const wsum = st.chest + st.high + st.floor + st.tray + st.reach;
  if (wsum < 0.001) { if (kraap.merit && kraap.merit.items && !kraap.merit.placed) kraap.merit.items.visible = false; return; }
  const shape = handShape(model); if (!shape) return;
  // Kathina: the tray held in both hands at its rim, raised to the forehead or set on the platform edge
  let trayT = null;
  if (st.tray > 0.001 && kraap.kathin) {
    const k = kraap.kathin, s = k.monk;
    const chestP = B.Spine02.getWorldPosition(new THREE.Vector3()).addScaledVector(fwd, 0.45 * scale).addScaledVector(up, -0.25 * scale);
    const browP = B.Head.getWorldPosition(new THREE.Vector3()).addScaledVector(up, 0.12 * scale).addScaledVector(fwd, (0.3 + TRAY_HALF) * scale);
    const placeP = k.h.g.localToWorld(new THREE.Vector3(s.lx, s.top + TRAY_GRIP, s.edge - 0.2)); // just onto the platform's edge
    const grip = chestP.lerp(browP, st.lift).lerp(placeP, st.place);
    if (!k.released) { k.tray.position.copy(grip).addScaledVector(up, -TRAY_GRIP); k.tray.rotation.set(0, player.yaw, 0); k.tray.visible = st.tray > 0.3; }
    const F = fwd.clone().addScaledVector(up, -0.3 + 0.5 * st.lift).normalize();
    trayT = {};
    [["Left", 1], ["Right", -1]].forEach(([sd, sg]) => {
      const hs = shape[sd], inward = side.clone().multiplyScalar(-sg);
      const P = inward.clone().addScaledVector(F, -inward.dot(F)).normalize(), Q = basisQuat(hs.finger, hs.palm, F, P);
      let reach = -Infinity, along = 0; for (const pt of hs.points) { _v1.copy(pt).applyQuaternion(Q); reach = Math.max(reach, _v1.dot(inward)); along += _v1.dot(F); }
      along /= hs.points.length;
      trayT[sd] = { target: grip.clone().addScaledVector(inward, -(TRAY_HALF * scale + reach * scale)).addScaledVector(F, -along * scale), Q,
        pole: new THREE.Vector3().addScaledVector(up, -1).addScaledVector(side, sg * 0.6).addScaledVector(fwd, -0.2) };
    });
  }
  const chest = st.chest > 0.001 ? waiHands(model, B, CHEST_TIP, side, up, fwd, 0) : null;
  const high = st.high > 0.001 ? waiHands(model, B, WAI_LEVELS.buddha.tip, side, up, fwd, 0) : null;
  // palms pressed together while in a wai: the plane follows whichever wai is the main one
  const mainTip = st.high >= st.chest ? (high ? WAI_LEVELS.buddha.tip : null) : (chest ? CHEST_TIP : null);
  if (mainTip != null) waiHands(model, B, mainTip, side, up, fwd, st.chest + st.high); else wai.plane.on = 0;
  const jointsNow = wp("LeftUpLeg").add(wp("RightUpLeg")).multiplyScalar(0.5);
  const reachT = st.reach > 0.001 && kraap.merit ? kneelHand(model, fwd, up, kraap.t) : null;
  [["Left", 1], ["Right", -1]].forEach(([s, sg]) => {
    const hs = shape[s];
    // palms flat on the floor: fingers forward, palm down, either side of the forehead
    const Qf = basisQuat(hs.finger, hs.palm, fwd, up.clone().negate());
    const palmTop = Math.max(...hs.points.map((q) => q.dot(hs.palm))) * scale;
    const centroid = hs.points.reduce((acc, q) => acc.add(q), new THREE.Vector3()).multiplyScalar(1 / hs.points.length).applyQuaternion(Qf).multiplyScalar(scale);
    const palmAt = jointsNow.clone().addScaledVector(fwd, touch.fwd + 0.02 * scale).addScaledVector(side, sg * 0.2 * scale); // level with the forehead, which rests between them
    const floorT = new THREE.Vector3(palmAt.x - centroid.x, floor + palmTop + 0.003 * scale, palmAt.z - centroid.z);
    const floorPole = side.clone().multiplyScalar(sg * 0.6).addScaledVector(up, -0.8).addScaledVector(fwd, -0.3);
    // blend the three hand positions by their weights
    const target = new THREE.Vector3(), Q = new THREE.Quaternion(), pole = new THREE.Vector3(); let acc = 0;
    const addIn = (w, t, q, pl) => { if (w <= 0.001 || !t) return; acc += w; target.lerp(t, acc === w ? 1 : w / acc); if (acc === w) Q.copy(q); else Q.slerp(q, w / acc); pole.lerp(pl, acc === w ? 1 : w / acc); };
    if (chest) addIn(st.chest, chest[s].target, chest[s].Q, chest.pole(sg));
    if (high) addIn(st.high, high[s].target, high[s].Q, high.pole(sg));
    addIn(st.floor, floorT, Qf, floorPole);
    if (trayT) addIn(st.tray, trayT[s].target, trayT[s].Q, trayT[s].pole);
    if (s === "Right" && reachT) addIn(st.reach, reachT.target, reachT.Q, new THREE.Vector3().addScaledVector(up, -1).addScaledVector(side, -0.6));
    if (s === "Left" && reachT) { // the free hand rests on his thigh, palm down
      const thighT = wp("LeftUpLeg").lerp(wp("LeftLeg"), 0.6).addScaledVector(up, palmTop + 0.06 * scale).sub(centroid.clone().setY(0));
      addIn(st.reach, thighT, Qf, side.clone().multiplyScalar(0.8).addScaledVector(fwd, -0.4));
    }
    if (acc > 0.001) armTo(B, s, target, Q, pole, Math.min(1, acc));
  });
  // kneeling offerings: the incense in his right hand as he lights it and plants it, between his palms in the wai
  const m = kraap.merit;
  if (m && m.items && !m.placed) {
    m.items.visible = kraap.t > 3.5;
    if (st.high > st.reach) m.items.position.copy(wai.plane.point).addScaledVector(up, -0.06);
    else m.items.position.copy(B.RightHand.getWorldPosition(new THREE.Vector3())).addScaledVector(fwd, 0.06);
    m.items.rotation.set(0, player.yaw, 0);
  }
}
// put one arm's wrist at target with the hand turned to Qhand (world), elbow toward pole; blend by weight
function armTo(B, s, target, Qhand, pole, weight) {
  const arm = B[s + "Arm"], fore = B[s + "ForeArm"], hand = B[s + "Hand"]; if (!arm || !fore || !hand) return;
  const animQ = [arm.quaternion.clone(), fore.quaternion.clone(), hand.quaternion.clone()];
  const A = arm.getWorldPosition(new THREE.Vector3()), E0 = fore.getWorldPosition(new THREE.Vector3()), W0 = hand.getWorldPosition(new THREE.Vector3());
  const a = A.distanceTo(E0), b = E0.distanceTo(W0);
  const toT = target.clone().sub(A); const d = Math.min(toT.length(), a + b - 1e-3); toT.normalize();
  const x = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - x * x));
  const pl = pole.clone().addScaledVector(toT, -pole.dot(toT)).normalize();
  aimBone(arm, E0, A.clone().addScaledVector(toT, x).addScaledVector(pl, h));
  aimBone(fore, hand.getWorldPosition(new THREE.Vector3()), target);
  hand.getWorldQuaternion(_q1); turnBone(hand, _q2.copy(Qhand).multiply(_q1.invert()));
  [arm, fore, hand].forEach((bn, i) => { const solved = bn.quaternion.clone(); bn.quaternion.copy(animQ[i]).slerp(solved, weight); });
  arm.updateMatrixWorld(true);
}
// Seated meditation: face forward with the eyes lowered, hands resting in the lap with the palms up and
// the right hand lying on the left. The left hand's back rests on the lap (measured from his seated legs);
// the right hand nests on it, and where the two thick cartoon hands meet they are pressed flat against
// each other in the shader (the same as the wai's palms), so they lie together without passing through.
const SIT_NEST = 0.55; // how much of the stacked thickness the right hand sinks onto the left (pressed flat)
function lapSurface(model, B) {
  if (model.userData.lapSurface != null) return model.userData.lapSurface;
  if (sit.w < 0.98) return 0.12; // measured once he is fully seated
  let sk = null; model.traverse((o) => { if (!sk && o.isSkinnedMesh) sk = o; }); if (!sk) return 0.12;
  const bones = sk.skeleton.bones, legs = new Set(["LeftUpLeg", "LeftLeg", "LeftFoot", "LeftToeBase", "RightUpLeg", "RightLeg", "RightFoot", "RightToeBase"].map((n) => bones.findIndex((b) => b.name === n)));
  const si = sk.geometry.attributes.skinIndex, sw = sk.geometry.attributes.skinWeight, n = sk.geometry.attributes.position.count;
  const c = lapCentre(B), v = new THREE.Vector3(); let top = -Infinity;
  model.updateMatrixWorld(true);
  for (let i = 0; i < n; i++) {
    let wl = 0; for (let k = 0; k < 4; k++) if (legs.has(si.getComponent(i, k))) wl += sw.getComponent(i, k);
    if (wl < 0.6) continue;
    sk.getVertexPosition(i, v); v.applyMatrix4(sk.matrixWorld);
    if (Math.hypot(v.x - c.x, v.z - c.z) < 0.09) top = Math.max(top, v.y);
  }
  model.userData.lapSurface = top > -Infinity ? (top - c.y) / model.getWorldScale(new THREE.Vector3()).y : 0.12;
  return model.userData.lapSurface;
}
const lapCentre = (B) => B.Hips.getWorldPosition(new THREE.Vector3()).lerp(B.LeftLeg.getWorldPosition(new THREE.Vector3()).add(B.RightLeg.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5), 0.5);
function poseSit(model, B, w) {
  const rest = restPose(model);
  if (rest) ["neck", "Head"].forEach((n) => { if (B[n] && rest[n]) B[n].quaternion.slerp(rest[n], w); });
  model.updateMatrixWorld(true);
  const up = new THREE.Vector3(0, 1, 0);
  const side = B.LeftArm.getWorldPosition(new THREE.Vector3()).sub(B.RightArm.getWorldPosition(new THREE.Vector3())).setY(0).normalize();
  const fwd = new THREE.Vector3().crossVectors(side, up).normalize(), axis = new THREE.Vector3().crossVectors(up, fwd).normalize();
  [["neck", 0.08], ["Head", 0.1]].forEach(([n, a]) => { if (B[n]) turnBone(B[n], _q2.setFromAxisAngle(axis, a * w)); }); // eyes lowered
  const shape = handShape(model); if (!shape || !B.Hips || !B.LeftLeg || !B.RightLeg) return;
  const scale = model.getWorldScale(new THREE.Vector3()).y;
  const c = lapCentre(B);
  const pd = (hs) => hs.points.map((q) => q.dot(hs.palm));
  const leftBack = -Math.min(...pd(shape.Left)) * scale, leftPalm = Math.max(...pd(shape.Left)) * scale, rightBack = -Math.min(...pd(shape.Right)) * scale;
  const leftAxisY = c.y + lapSurface(model, B) * scale + leftBack + 0.004 * scale;       // the left hand's back rests on the lap
  const full = leftPalm + rightBack, rightAxisY = leftAxisY + full * (1 - SIT_NEST);       // the right hand lies on it
  const contactY = leftAxisY + leftPalm - full * SIT_NEST / 2;                               // where the two meet
  if (!(wai.t >= 0 && waiWeights()[0] > 0.5)) { wai.plane.normal.copy(up); wai.plane.point.set(c.x, contactY, c.z); wai.plane.on = w; }
  [["Left", 1, leftAxisY], ["Right", -1, rightAxisY]].forEach(([s, sg, ay]) => {
    const hs = shape[s];
    const F = side.clone().multiplyScalar(-sg), Q = basisQuat(hs.finger, hs.palm, F, up); // fingers across, palm up
    const centroid = hs.points.reduce((acc, q) => acc.add(q), new THREE.Vector3()).multiplyScalar(1 / hs.points.length).applyQuaternion(Q).multiplyScalar(scale);
    const target = new THREE.Vector3(c.x - centroid.x, ay, c.z - centroid.z); // palms over each other, at their own height
    armTo(B, s, target, Q, side.clone().multiplyScalar(sg * 0.8).addScaledVector(up, -0.6), w);
  });
}
// The wai's hands: a lotus bud. Each hand stands upright with its palm turned toward the other hand, tops
// leaning in a little; the wrists are placed from the real hand mesh so the fingertips meet exactly at the
// middle, at the given height on his face (head space), following the head as it bows. The fleshier palms
// that would pass the middle are pressed flat against it in the shader (see pressHands).
function waiHands(model, B, tipLevel, side, up, fwd, on) {
  const shape = handShape(model); if (!shape) return null;
  const spineQ = B.Spine.getWorldQuaternion(new THREE.Quaternion());
  const bodyUp = new THREE.Vector3(0, 1, 0).applyQuaternion(spineQ), bodyFwd = new THREE.Vector3(0, 0, 1).applyQuaternion(spineQ);
  const scale = model.getWorldScale(new THREE.Vector3()).y; // world units per model unit (1 for the boy's holder)
  const headScale = B.Head.getWorldScale(new THREE.Vector3()).y || 1;
  const tipAt = new THREE.Vector3(0, tipLevel, 0.36).multiplyScalar(1 / headScale).applyMatrix4(B.Head.matrixWorld);
  const tipLen = (shape.Left.tipY + shape.Right.tipY) / 2;
  const fingersUp = up.clone().addScaledVector(fwd, 0.15).normalize();
  const mid = tipAt.addScaledVector(fingersUp, -tipLen * scale); // between the wrists
  wai.plane.normal.copy(side).negate(); wai.plane.point.copy(mid); wai.plane.on = on; // where the hands meet
  const out = { pole: (sg) => new THREE.Vector3().addScaledVector(bodyUp, -1).addScaledVector(side, sg * 0.5).addScaledVector(bodyFwd, -0.15) };
  [["Left", 1], ["Right", -1]].forEach(([s, sg]) => {
    const hs = shape[s], inward = side.clone().multiplyScalar(-sg);                       // toward the other hand
    const P0 = inward.clone().addScaledVector(fingersUp, -inward.dot(fingersUp)).normalize();
    const F = fingersUp.clone().multiplyScalar(Math.cos(WAI_LEAN)).addScaledVector(P0, Math.sin(WAI_LEAN)).normalize(); // tops lean in
    const P = P0.clone().addScaledVector(F, -P0.dot(F)).normalize();
    const Q = basisQuat(hs.finger, hs.palm, F, P);
    // how far this hand's fingertips reach toward the middle: the wrist goes that far out, so they meet exactly
    let reach = -Infinity; for (const pt of hs.tips) reach = Math.max(reach, _v1.copy(pt).applyQuaternion(Q).dot(inward));
    out[s] = { target: mid.clone().addScaledVector(inward, -(reach + WAI_GAP) * scale), Q };
  });
  return out;
}
// a modest bow, mostly of the head, as in an everyday wai
function poseWaiCore(model, B, hands, bow) {
  if (hands <= 0 && bow <= 0) return;
  // face straight ahead: ease the neck and head out of the idle's glancing around, back to their rest pose
  const rest = restPose(model);
  if (rest) ["neck", "Head"].forEach((n) => { if (B[n] && rest[n]) B[n].quaternion.slerp(rest[n], Math.max(hands, bow)); });
  model.updateMatrixWorld(true);
  const up = new THREE.Vector3(0, 1, 0);
  const side = B.LeftArm.getWorldPosition(new THREE.Vector3()).sub(B.RightArm.getWorldPosition(new THREE.Vector3())).setY(0).normalize(); // toward his left
  const fwd = new THREE.Vector3().crossVectors(side, up).normalize();                                   // the way he faces
  // 1) the bow: spread over the spine, a little more in the neck and head
  const axis = new THREE.Vector3().crossVectors(up, fwd).normalize();
  const L = WAI_LEVELS[wai.level] || WAI_LEVELS.peer;
  ["Spine02", "Spine01", "Spine", "neck", "Head"].forEach((n, i) => { if (B[n]) turnBone(B[n], _q2.setFromAxisAngle(axis, L.bow[i] * bow)); });
  if (hands <= 0.001) return;
  // 2) the hands: a lotus bud (see waiHands), placed with the two-bone reach solver
  const T = waiHands(model, B, L.tip, side, up, fwd, hands); if (!T) return;
  [["Left", 1], ["Right", -1]].forEach(([s, sg]) => armTo(B, s, T[s].target, T[s].Q, T.pole(sg), hands));
}

/* ---------------- shoes off at the hall steps ---------------- */
// As at every Thai temple, shoes stay outside: stepping up into a hall, the boy stops on the step, slips
// out of his sneakers one foot at a time and goes in in his socks; the pair waits at the step, toes turned
// out, with his school backpack beside it (sitting and bowing with a bag on is not done either). Leaving,
// he steps back into them and takes his bag. (Only the Sambodhaya boy: the built characters have neither.)
const boyKits = { shod: null, socks: null };
const shoes = { on: true, t: -1, mode: null, pair: null };
const SHOES_DUR = 1.5, SHOES_SWAP = 0.62;
let shoePairSrc = null, bagSrc = null; loadProp("shoes").then((m) => { shoePairSrc = m; }); loadProp("backpack").then((m) => { bagSrc = m; });
const isBoy = () => boyKits.shod && boyKits.socks && (player.model === boyKits.shod.holder || player.model === boyKits.socks.holder);
function wearKit(kit) {
  const k = boyKits[kit]; if (!k || player.model === k.holder) return;
  const was = player.current;
  setModel(k.holder, k.clips);
  if (was && was !== "idle") { player.current = null; playClip(was, 0); }
}
function hallStepOf(x, z) { // the front step of the hall whose floor this is: where the shoes are left
  const f = floors.find((q) => q.hall && inFloor(q, x, z) != null); if (!f) return null;
  const d = f.hz + 0.4; return { x: f.x + d * f.s, z: f.z + d * f.c, yaw: Math.atan2(f.s, f.c) };
}
function placePair(x, z, yaw) {
  removePair();
  const g = new THREE.Group(); g.position.set(x, groundAt(x, z), z); g.rotation.y = yaw; scene.add(g);
  // his sneakers at this scale: about 0.42 long
  if (shoePairSrc) { const c = fitTo(shoePairSrc.clone(), 0.2); c.rotation.y = SHOES_TURN; c.traverse((o) => { if (o.isMesh) o.castShadow = true; }); g.add(c); }
  else [-0.1, 0.1].forEach((dx) => { add(new THREE.BoxGeometry(0.15, 0.12, 0.34), S(0x1d1d22), dx, 0.07, 0, g); add(new THREE.BoxGeometry(0.16, 0.04, 0.35), S(0xf2f2f2), dx, 0.02, 0, g, false); });
  // his backpack stands beside the shoes (about 0.75 tall at his scale)
  if (bagSrc) { const b = fitTo(bagSrc.clone(), 0.75); b.rotation.y = BAG_TURN; b.position.x = -0.55; b.traverse((o) => { if (o.isMesh) o.castShadow = true; }); g.add(b); }
  shoes.pair = g;
}
function removePair() { if (shoes.pair) { scene.remove(shoes.pair); shoes.pair = null; } }
// out: the step just outside, where he was heading (going out, he steps into his waiting pair if it is near)
function startShoes(mode, out) {
  if (shoes.t >= 0) return;
  shoes.mode = mode; shoes.t = 0; shoes.glide = null;
  if (mode === "on") {
    const p = shoes.pair && shoes.pair.position;
    shoes.glide = p && Math.hypot(p.x - player.x, p.z - player.z) < 3.5 ? { x: p.x, z: p.z } : out;
  }
  if (player.mixer) playClip("idle", 0.3);
}
function shoesStep(dt) {
  const before = shoes.t; shoes.t += dt;
  if (shoes.glide && shoes.t < 0.5) { player.x += (shoes.glide.x - player.x) * Math.min(1, dt * 8); player.z += (shoes.glide.z - player.z) * Math.min(1, dt * 8); }
  if (before < SHOES_SWAP && shoes.t >= SHOES_SWAP) {
    if (shoes.mode === "off") {
      // the pair is left where he stood, a little to his right, toes turned out from the hall
      const rx = -Math.cos(player.yaw), rz = Math.sin(player.yaw);
      placePair(player.x + rx * 0.32, player.z + rz * 0.32, player.yaw + Math.PI);
      wearKit("socks"); shoes.on = false;
    } else { removePair(); wearKit("shod"); shoes.on = true; }
  }
  if (shoes.t > SHOES_DUR) { shoes.t = -1; shoes.mode = null; }
}
// one foot, then the other, lifts back out of (or into) its shoe; he looks down at his feet
const shoeLift = (t, a) => smooth(a, a + 0.22, t) * (1 - smooth(a + 0.3, a + 0.52, t));
function poseShoes(model, B, t) {
  const fwd = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw)), side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), fwd);
  const look = smooth(0, 0.3, t) * (1 - smooth(SHOES_DUR - 0.35, SHOES_DUR, t));
  [["neck", 0.2], ["Head", 0.25]].forEach(([n, a]) => { if (B[n]) turnBone(B[n], _q2.setFromAxisAngle(side, a * look)); });
  [["Left", 0.25], ["Right", 0.75]].forEach(([s, a]) => {
    const w = shoeLift(t, a); if (w <= 0.001 || !B[s + "UpLeg"] || !B[s + "Leg"]) return;
    turnBone(B[s + "UpLeg"], _q2.setFromAxisAngle(side, SHOE_THIGH * w));  // thigh a little forward
    turnBone(B[s + "Leg"], _q2.setFromAxisAngle(side, -SHOE_KNEE * w));    // shin back: the heel comes up out of the shoe
  });
}
const BAG_TURN = -Math.PI / 2; // turns the backpack model's front pocket out, the way the shoes point
const SHOE_THIGH = 0.35, SHOE_KNEE = 1.3, SHOES_TURN = -Math.PI / 2; // the pair model lies toes-sideways; this points the toes along the group's +z

/* ---------------- input ---------------- */
const keys = {};
let camYaw = Math.PI, camPitch = 0.32, camDist = 11;
addEventListener("keydown", (e) => {
  if (dialogOpen()) { if (e.key === "Escape") closeDialog(); return; }
  if (e.target instanceof HTMLInputElement) return;
  keys[e.code] = true;
  if (e.code === "KeyE" || e.code === "Enter") { if (near) openPlace(near); }
  if (e.code === "KeyG") openPlaces(true);
  if (e.code === "KeyQ") startWai();
  if (e.code === "KeyC") toggleSit();
  if (e.code === "KeyK") startKraap();
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
});
addEventListener("keyup", (e) => { keys[e.code] = false; });
let drag = null;
canvas.addEventListener("pointerdown", (e) => {
  canvas.focus();
  if (e.pointerType === "touch" && e.clientX < innerWidth * 0.4 && e.clientY > innerHeight * 0.5) return; // joystick area
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
  camYaw -= dx * 0.006; camPitch = Math.min(1.1, Math.max(0.05, camPitch + dy * 0.004));
});
canvas.addEventListener("pointerup", (e) => {
  if (drag && drag.moved < 6) pickAt(e.clientX, e.clientY);
  drag = null;
});
canvas.addEventListener("wheel", (e) => { camDist = Math.min(22, Math.max(5, camDist + e.deltaY * 0.01)); e.preventDefault(); }, { passive: false });

// touch joystick
const stick = document.getElementById("stick"), knob = document.getElementById("knob");
const joy = { x: 0, y: 0, id: null };
if (stick) {
  const moveKnob = (e) => {
    const r = stick.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy; const m = Math.hypot(dx, dy), max = r.width / 2 - 10;
    if (m > max) { dx *= max / m; dy *= max / m; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`; joy.x = dx / max; joy.y = dy / max;
  };
  stick.addEventListener("pointerdown", (e) => { joy.id = e.pointerId; stick.setPointerCapture(e.pointerId); moveKnob(e); });
  stick.addEventListener("pointermove", (e) => { if (e.pointerId === joy.id) moveKnob(e); });
  const end = () => { joy.id = null; joy.x = joy.y = 0; knob.style.transform = ""; };
  stick.addEventListener("pointerup", end); stick.addEventListener("pointercancel", end);
  document.getElementById("t-jump").addEventListener("click", () => { if (player.y <= groundAt(player.x, player.z) + 0.01) player.vy = 9; });
  document.getElementById("t-act").addEventListener("click", () => { if (near) openPlace(near); else openPlaces(true); });
  document.getElementById("t-wai").addEventListener("click", startWai);
  document.getElementById("t-sit").addEventListener("click", toggleSit);
}

// click on the dog or a hall
const ray = new THREE.Raycaster();
function pickAt(x, y) {
  const v = new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(v, camera);
  if (dog.obj.visible && ray.intersectObject(dog.obj, true).length) { openPlaces(true); return; }
  if (insideHall(player.x, player.z)) return; // inside a hall, clicks just turn the view
  for (const id of Object.keys(halls)) { if (ray.intersectObject(halls[id], true).length) { openPlace(PLACES.find((p) => p.id === id)); return; } }
}

/* ---------------- collisions ---------------- */
function collide(nx, nz) {
  const R = 0.7;
  for (const c of colliders) { const dx = nx - c.x, dz = nz - c.z, d = Math.hypot(dx, dz), min = c.r + R; if (d < min && d > 0.0001) { nx = c.x + dx / d * min; nz = c.z + dz / d * min; } }
  for (const b of blockers) {
    // to box space
    const lx = (nx - b.x) * b.c - (nz - b.z) * b.s, lz = (nx - b.x) * b.s + (nz - b.z) * b.c;
    const px = b.hx + R - Math.abs(lx), pz = b.hz + R - Math.abs(lz);
    if (px > 0 && pz > 0) {
      let ax = lx, az = lz;
      if (px < pz) ax = Math.sign(lx || 1) * (b.hx + R); else az = Math.sign(lz || 1) * (b.hz + R);
      nx = b.x + ax * b.c + az * b.s; nz = b.z - ax * b.s + az * b.c;
    }
  }
  // where you can walk: inside the temple wall, through the gateway and over the bridge to the landing
  const d = Math.hypot(nx, nz);
  if (d > 73.5) {
    if (nz > 0 && Math.abs(nx) < 4.6) {
      const half = nz < MOAT.r2 + 2.4 ? 2.8 : 4.2; // through the gateway and between the bridge rails; wider on the landing
      nx = Math.max(-half, Math.min(half, nx)); nz = Math.min(nz, 97);
    } else { nx *= 73.5 / d; nz *= 73.5 / d; }
  }
  return [nx, nz];
}

/* ---------------- UI: prompt, dialogs ---------------- */
const $ = (id) => document.getElementById(id);
let near = null;
function placeName(p) { return L === "en" ? p.en : p.th; }
let promptRest = null, promptAway = false;
// on touch screens the prompt sits just under the top buttons, however many rows they wrap to
const placePrompt = () => { const hud = document.querySelector(".hud-top"); if (hud) document.documentElement.style.setProperty("--prompt-top", Math.round(hud.getBoundingClientRect().bottom + 8) + "px"); };
addEventListener("resize", placePrompt); placePrompt();
function showPrompt(p) {
  const el = $("prompt");
  if (!p) { el.hidden = true; return; }
  $("prompt-name").textContent = p.icon + " " + placeName(p);
  $("prompt-sub").textContent = p.stone != null ? (p.board ? tx("ป้ายเรื่องที่ ", "Story board ") : tx("เรื่องที่ ", "Story ")) + (p.stone + 1) : p.sub[L === "en" ? 1 : 0];
  $("prompt-go").textContent = p.id === "bell" ? tx("ตี", "Strike") : p.id === "donate" ? tx("เปิด", "Open") : p.id === "alms" ? tx("ใส่บาตร", "Offer") : p.id === "fish" ? tx("ให้อาหาร", "Feed") : p.merit ? tx("ทำบุญ", "Offer") : p.id === "broom" ? (broom.held ? tx("วาง", "Put back") : tx("หยิบ", "Pick up")) : p.id === "kathin" ? tx("ถวาย", "Offer") : tx("เข้า", "Visit");
  el.hidden = false;
}
$("prompt-go").addEventListener("click", () => near && openPlace(near));
const DONATE_PLACE = { id: "donate", icon: "🤲", th: "ตู้รับบริจาค (สำหรับผู้ใหญ่)", en: "Donation box (for adults)", sub: ["สมทบทุนพัฒนาและสร้างวัด", "Support the temple's development"] };
function openDonate() {
  openDialog(tx("🤲 ตู้รับบริจาค", "🤲 Donation box"),
    `<p>${tx("สำหรับผู้ใหญ่ที่อยากร่วมสมทบทุนพัฒนาและสร้างวัดสัมโพธายะ", "For adults who would like to support the development of Sambodhaya temple.")}</p>
     <p class="note">${tx("ไม่บริจาคก็ได้ วัดเปิดให้ทุกคนเหมือนเดิม และไม่มีใครรู้ว่าใครบริจาคหรือไม่", "Giving is entirely optional. The temple is open to everyone just the same, and no one knows who gives.")}</p>
     <div class="row"><a class="btn" href="${to2d("support")}">${tx("ไปหน้าสมทบทุน →", "Go to the support page →")}</a><button class="chip" data-close>${tx("เดินต่อ", "Keep walking")}</button></div>`);
}
const BELL_PLACE = { id: "bell", icon: "🔔", th: "ระฆังวัด", en: "Temple bell", sub: ["ตีระฆังได้ ฟังเสียงจนเงียบ", "Strike it, and listen until it fades"] };
function ringBell() {
  if (settings.mute) { askSound(); return; }
  sound.bell(BELL[0], 3.4, BELL[1]);
}
const dialogOpen = () => !$("dlg").hidden;
let lastFocus = null;
function openDialog(title, html) {
  lastFocus = document.activeElement;
  $("dlg-title").textContent = title; $("dlg-body").innerHTML = html; $("dlg").hidden = false;
  for (const k in keys) keys[k] = false;
  const f = $("dlg").querySelector("button, a, input"); if (f) f.focus();
}
function closeDialog() { $("dlg").hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); else canvas.focus(); }
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Pages opened from inside the 3D temple carry ?from=3d, so the site can offer the way back here;
// the spot (position, facing and view) is kept for this browser tab only, and restored on return.
// Leaving the temple and the "no 3D" map are deliberate exits, so they don't carry it.
const to2d = (hash) => `index.html?from=3d#${hash}`;
const SPOT_KEY = "sambodhaya-3d-spot";
function saveSpot() {
  try { sessionStorage.setItem(SPOT_KEY, JSON.stringify({ x: player.x, z: player.z, yaw: player.yaw, camYaw, camPitch, camDist, t: Date.now() })); } catch (e) {}
}
addEventListener("click", (e) => { const a = e.target.closest && e.target.closest('a[href*="from=3d"]'); if (a) saveSpot(); }, true);
function restoreSpot() {
  const nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
  const returning = /[?&]return=1\b/.test(location.search) || (nav && nav.type === "back_forward");
  if (!returning) return false;
  let spot = null; try { spot = JSON.parse(sessionStorage.getItem(SPOT_KEY) || "null"); } catch (e) {}
  if (/[?&]return=1\b/.test(location.search)) { try { history.replaceState(null, "", location.pathname + location.search.replace(/[?&]return=1\b/, "").replace(/^&/, "?")); } catch (e) {} }
  if (!spot || Date.now() - spot.t > 6 * 3600 * 1000) return false;
  player.x = spot.x; player.z = spot.z; player.yaw = spot.yaw; player.y = groundAt(spot.x, spot.z);
  camYaw = spot.camYaw; camPitch = spot.camPitch; camDist = spot.camDist;
  dog.x = player.x + 1.5; dog.z = player.z + 1.5;
  player.obj.position.set(player.x, player.y, player.z); player.obj.rotation.y = player.yaw;
  camera.position.set(player.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist, player.y + 2 + Math.sin(camPitch) * camDist, player.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist);
  return true;
}
function openPlace(p) {
  if (p.id === "bell") { ringBell(); return; }
  if (p.id === "donate") { openDonate(); return; }
  if (p.id === "alms") { startAlms(p.monk); return; }
  if (p.id === "fish") { startFeed(); return; }
  if (p.merit) { startMerit(meritHere()); return; }
  if (p.id === "broom") { broom.held = !broom.held; near = null; return; }
  if (p.id === "kathin") { startKathin(p.hall); return; }
  if (p.stone != null) {
    const n = p.stone + 1;
    openDialog(`👣 ${n} · ${esc(L === "en" ? JOURNEY[p.stone][1] : JOURNEY[p.stone][0])}`,
      `<p>${p.board ? tx("ป้ายเรื่องที่ " + n + " ในศาลาเรียนรู้ เปิดอ่านเรื่องนี้ได้ พร้อมต้นทางและกระจกอีกบาน", "Story board " + n + " in the Learning Hall. Open the story, with its source and the other mirror.") : tx("หินก้อนที่ " + n + " บนเส้นทางของฉัน เรื่องนี้อ่านได้ในศาลาเรียนรู้ พร้อมต้นทางและกระจกอีกบาน", "Stone " + n + " on My Journey. Read this story in the Learning Hall, with its source and the other mirror.")}</p>
       <div class="row"><a class="btn" href="${to2d("u0" + n)}">${tx("เปิดเรื่องนี้ →", "Open this story →")}</a><button class="chip" data-close>${tx("เดินต่อ", "Keep walking")}</button></div>`);
  } else {
    openDialog(`${p.icon} ${esc(placeName(p))}`,
      `<p>${esc(p.sub[L === "en" ? 1 : 0])}</p>
       ${p.id === "media" ? `<p class="quiet">${tx("ภาพวงล้อสัมโพธายะที่ผนังศาลานี้ เป็นสื่ออธิบายของวัด ยังรอตรวจ", "The Sambodhaya wheel on this hall's wall is the temple's explanatory media, still under review.")}</p>` : ""}
       ${p.id === "exit" ? `<p>${tx("วันนี้พอแล้วก็ได้", "That's enough for today, if you like.")}</p>` : ""}
       <div class="row"><a class="btn" href="${p.id === "exit" ? p.href : to2d(p.href.split("#")[1])}">${p.id === "exit" ? tx("ออกจากวัด →", "Leave the temple →") : tx("เข้าไปในศาลา →", "Go inside →")}</a><button class="chip" data-close>${tx("เดินต่อ", "Keep walking")}</button></div>`);
  }
}
function openPlaces(fromDog) {
  const items = PLACES.map((p) => `<li><button data-go="${p.id}"><span class="ic" aria-hidden="true">${p.icon}</span><span>${esc(placeName(p))}</span></button></li>`).join("");
  openDialog(fromDog ? tx("🐕 อยากไปทางไหน?", "🐕 Where would you like to go?") : tx("🗺️ ที่ต่าง ๆ ในวัด", "🗺️ Places in the temple"),
    `${fromDog ? `<p>${tx("เลือกได้เลย ผมพาไป ไม่เลือกอะไรก็ได้นะ", "Pick one and I'll take you there. Choosing nothing is fine too.")}</p>` : `<p>${tx("ไม่อยากเดินแบบ 3 มิติ? เลือกที่หมายแล้ววัดพาไปเลย หรือเปิดหน้าเว็บของศาลานั้นได้", "Prefer not to walk in 3D? Pick a place and the temple takes you there, or open that hall's web page.")}</p>`}
     <ul class="places">${items}</ul>
     <p class="quiet">${tx("🐕 ในต้นแบบนี้ หมาวัดเป็นตัวช่วยบอกทางที่เขียนไว้ล่วงหน้า ยังไม่ใช่ AI", "🐕 In this prototype the temple dog gives pre-written directions; it isn't an AI yet.")}</p>
     <div class="row"><a class="chip" href="index.html" style="text-decoration:none">${tx("ไปหน้าแผนที่วัด (ไม่ใช้ 3 มิติ)", "Go to the temple map (no 3D)")}</a><button class="chip" data-close>${tx("ปิด", "Close")}</button></div>
     <p class="quiet">🤲 <a href="${to2d("support")}">${tx("สมทบทุนพัฒนาและสร้างวัด (สำหรับผู้ใหญ่)", "Support the temple's development (for adults)")}</a></p>`);
}
function teleport(id) {
  const p = PLACES.find((q) => q.id === id); if (!p) return;
  const [x, z] = p.pos; const a = Math.atan2(x, z);
  const back = id === "yard" ? -4 : 3; // step towards the courtyard; for the courtyard itself, step out to the plaza
  player.x = x - Math.sin(a) * back; player.z = z - Math.cos(a) * back + (id === "yard" ? 4 : 0);
  [player.x, player.z] = collide(player.x, player.z);
  dog.x = player.x + 1.5; dog.z = player.z + 1.5;
  camYaw = id === "journey" || id === "exit" ? Math.atan2(player.x, player.z) : (Math.atan2(player.x - x, player.z - z) || camYaw);
}
$("dlg").addEventListener("click", (e) => {
  const go = e.target.closest("[data-go]"); if (go) { teleport(go.dataset.go); closeDialog(); return; }
  if (e.target.closest("[data-close]")) closeDialog();
});
$("btn-places").addEventListener("click", () => openPlaces(false));
$("btn-help").addEventListener("click", () => openDialog(tx("❔ วิธีเดินในวัด", "❔ How to walk around"),
  `<p>${tx("⌨️ W A S D หรือปุ่มลูกศร = เดิน • Shift = วิ่ง • Space = กระโดด • E = เข้าศาลาที่อยู่ใกล้ • G = เรียกหมาวัด • Q = ไหว้ 🙏 • C = นั่งสมาธิ 🧘 (เดินเพื่อลุก) • K = กราบพระ 🙇 (หน้าพระพุทธรูป) • ใส่บาตร 🍚: ยืนหน้าพระที่ถนนหน้าประตูวัด แล้วกด E", "⌨️ W A S D or arrow keys = walk • Shift = run • Space = jump • E = visit the nearby hall • G = call the temple dog • Q = wai 🙏 • C = sit 🧘 (walk to stand up) • K = pay tribute 🙇 (before a Buddha image) • give alms 🍚: stand before a monk on the road outside the gate and press E")}</p>
   <p>${tx("🖱️ ลากเมาส์ = หมุนมุมมอง • ล้อเมาส์ = ซูม • คลิกหมาวัดหรือศาลา = เปิด", "🖱️ Drag = turn the view • Wheel = zoom • Click the dog or a hall = open it")}</p>
   <p>${tx("📱 จอยซ้ายล่าง = เดิน • ลากจอ = หมุนมุมมอง • ปุ่ม E = เข้า", "📱 Bottom-left stick = walk • Drag the screen = turn the view • E button = visit")}</p>
   <p>${tx("🔈 ปุ่มเสียง = เปิดเสียงนก ลม น้ำตก และกระดิ่งชายคา (ปิดอยู่จนกว่าจะกด) • 🔔 เดินไปที่ระฆังแล้วกด E เพื่อตีระฆัง", "🔈 Sound button = birds, breeze, the waterfall and the roof bells (off until you press it) • 🔔 Walk to the bell and press E to strike it")}</p>
   <p class="quiet">🤲 <a href="${to2d("support")}">${tx("สมทบทุนพัฒนาและสร้างวัด (สำหรับผู้ใหญ่)", "Support the temple's development (for adults)")}</a> • ${tx("หรือที่ตู้รับบริจาคที่เสาประตูขวา", "or at the donation box on the right-hand gate post")}</p>
   <p class="note">${tx("ที่นี่ไม่มีคะแนน ไม่มีของให้เก็บ และไม่มีการแข่งขัน เดินดูตามสบาย และออกได้ทุกเมื่อที่ประตูขวา", "There are no points, nothing to collect and no competition here. Walk around as you like, and leave any time by the right-hand gate.")}</p>
   <div class="row"><button class="chip" data-close>${tx("ปิด", "Close")}</button></div>`));
const qBtn = $("btn-quality");
qBtn.querySelector(".label").textContent = HIGH ? tx("ภาพสวย", "Detailed") : tx("ภาพเบา", "Light");
qBtn.firstChild.textContent = HIGH ? "✨ " : "⚡ ";
qBtn.title = tx("สลับภาพสวย / ภาพเบา (สำหรับเครื่องที่ช้า)", "Switch detailed / light graphics (for slower devices)");
qBtn.addEventListener("click", () => { write("world-quality", HIGH ? "light" : "high"); location.reload(); });
// sound button: off every time the page opens; the site-wide "turn off all sound" setting is respected
$("btn-wai").addEventListener("click", () => { startWai(); canvas.focus(); });
$("btn-sit").addEventListener("click", () => { toggleSit(); canvas.focus(); });
$("btn-kraap").addEventListener("click", () => { startKraap(); if ($("dlg").hidden) canvas.focus(); });
const soundBtn = $("btn-sound");
const syncSound = () => { soundBtn.setAttribute("aria-pressed", sound.on); soundBtn.classList.toggle("on", sound.on); soundBtn.firstChild.textContent = sound.on ? "🔊 " : "🔈 "; };
function askSound() {
  openDialog(tx("🔇 เสียงถูกปิดไว้", "🔇 Sound is turned off"),
    `<p>${tx("ในการตั้งค่าของวัด เลือกไว้ว่า \"ปิดเสียงทั้งหมด\" อยากเปิดเสียงไหม?", "The temple's settings say \"turn off all sound\". Would you like sound on?")}</p>
     <div class="row"><button class="btn" id="snd-yes">${tx("เปิดเสียง", "Turn sound on")}</button><button class="chip" data-close>${tx("ไม่เป็นไร", "No thanks")}</button></div>`);
  $("snd-yes").addEventListener("click", () => { settings.mute = false; write("settings", { ...read("settings", {}), mute: false }); closeDialog(); sound.start().then(syncSound); });
}
soundBtn.addEventListener("click", () => {
  if (sound.on) { sound.stop(); syncSound(); return; }
  if (settings.mute) { askSound(); return; }
  sound.start().then(syncSound);
});
syncSound();
$("btn-night").addEventListener("click", () => { night.on = !night.on; night.manual = true; nightButton(); dawnDuskGong(); });
applyTime();
const calmBtn = $("btn-calm");
const syncCalm = () => { calmBtn.setAttribute("aria-pressed", settings.calmMotion); calmBtn.classList.toggle("on", settings.calmMotion); };
calmBtn.addEventListener("click", () => { settings.calmMotion = !settings.calmMotion; write("settings", { ...read("settings", {}), calmMotion: settings.calmMotion }); syncCalm(); });
syncCalm();

/* ---------------- avatar maker ---------------- */
const SK = ["#f5d0b0", "#e8b48a", "#c98e62", "#a06a43", "#7a4b2c", "#4f3020"];
const SH = ["#e98a2b", "#4f9a5d", "#3d8fd1", "#f27aa0", "#f2cc62", "#fffdf8", "#5d5752"];
const PA = ["#5e4a3a", "#2f3b55", "#3f6b3a", "#7a2f2f", "#d9c7a5"];
const HA = ["#2b1d14", "#6b3e1f", "#c98e3a", "#9aa0a6"];
function swatches(field, list) { return `<div class="swatches" role="radiogroup">${list.map((c) => `<button class="sw${avatarCfg[field] === c ? " on" : ""}" style="background:${c}" data-sw="${field}" data-c="${c}" aria-label="${c}" role="radio" aria-checked="${avatarCfg[field] === c}"></button>`).join("")}</div>`; }
function openAvatar(tab = avatarCfg.kind === "boy" ? "boy" : "build") {
  const tabs = `<div class="tabs" role="tablist">
    <button class="chip${tab === "boy" ? " on" : ""}" data-tab="boy">🧒 ${tx("เด็กชายสัมโพธายะ", "Sambodhaya boy")}</button>
    <button class="chip${tab === "build" ? " on" : ""}" data-tab="build">🧱 ${tx("สร้างเอง", "Build")}</button>
    <button class="chip${tab === "photo" ? " on" : ""}" data-tab="photo">🖼️ ${tx("รูปเป็นหน้า", "Picture face")}</button>
    <button class="chip${tab === "model" ? " on" : ""}" data-tab="model">🧩 ${tx("ไฟล์ 3 มิติ", "3D file")}</button></div>`;
  let body = "";
  if (tab === "boy") body = `
    <div class="row"><img class="preview" src="img/avatar-boy.jpg" alt="" style="object-fit:contain;background:#fff"><p>${tx("เด็กชายจากภาพยนตร์สั้นของวัดสัมโพธายะ เดินได้ ยืนพักได้ สะพายกระเป๋านักเรียน", "The boy from the Sambodhaya film. He walks, stands at ease and carries his school bag.")}</p></div>
    <div class="row"><button class="btn" id="use-boy" ${avatarCfg.kind === "boy" ? "disabled" : ""}>${avatarCfg.kind === "boy" ? tx("กำลังใช้อยู่ ✓", "In use ✓") : tx("ใช้ตัวละครนี้", "Use this character")}</button></div>`;
  if (tab === "build") body = `
    <div class="field"><span>${tx("สีผิว", "Skin")}</span>${swatches("skin", SK)}</div>
    <div class="field"><span>${tx("เสื้อ", "Shirt")}</span>${swatches("shirt", SH)}</div>
    <div class="field"><span>${tx("กางเกง", "Trousers")}</span>${swatches("pants", PA)}</div>
    <div class="field"><span>${tx("ผม", "Hair")}</span>${swatches("hair", HA)}
      <div class="row">${[["none", tx("ไม่มี", "None")], ["short", tx("สั้น", "Short")], ["long", tx("ยาว", "Long")]].map(([v, l]) => `<button class="chip${avatarCfg.hairStyle === v ? " on" : ""}" data-hs="${v}">${l}</button>`).join("")}</div></div>
    <div class="field"><span>${tx("หน้า", "Face")}</span><div class="row">${[["smile", "🙂"], ["calm", "😌"], ["wow", "😮"], ["sleepy", "😴"]].map(([v, l]) => `<button class="chip${avatarCfg.face === v ? " on" : ""}" data-face="${v}">${l}</button>`).join("")}</div></div>
    <p class="quiet">${tx("ตัวละครแบบนี้จำไว้ในเครื่องนี้เท่านั้น", "This character is remembered on this device only.")}</p>`;
  if (tab === "photo") body = `
    <p class="warn">${tx("แนะนำให้ใช้รูปวาดหรือรูปการ์ตูน ไม่ใช่รูปถ่ายใบหน้าจริง โดยเฉพาะสำหรับเด็ก", "We suggest a drawing or cartoon rather than a real photo of a face, especially for children.")}</p>
    <div class="row"><img class="preview" id="face-prev" alt="" ${faceImage ? `src="${faceImage}"` : ""}><label class="btn" for="face-file">${tx("เลือกรูป", "Choose a picture")}</label><input id="face-file" type="file" accept="image/*" hidden></div>
    <label class="row"><input type="checkbox" id="face-remember"> ${tx("จำรูปนี้ไว้ในเครื่องนี้ (ไม่ติ๊กก็ได้ รูปจะหายเมื่อปิดหน้า)", "Remember this picture on this device (optional; otherwise it's gone when you close the page)")}</label>
    <p class="note">${tx("รูปอยู่ในเครื่องของคุณเท่านั้น ไม่ถูกส่งไปไหน", "The picture stays on your device. It isn't sent anywhere.")}</p>`;
  if (tab === "model") body = `
    <p>${tx("อัปโหลดตัวละคร 3 มิติแบบ .glb หรือ .vrm เช่น จาก Ready Player Me หรือ VRoid Studio", "Upload a 3D character as .glb or .vrm, for example from Ready Player Me or VRoid Studio.")}</p>
    <div class="row"><label class="btn" for="model-file">${tx("เลือกไฟล์ 3 มิติ", "Choose a 3D file")}</label><input id="model-file" type="file" accept=".glb,.gltf,.vrm" hidden><span class="quiet" id="model-status"></span></div>
    <div class="row"><button class="chip" id="model-flip" ${player.model && !player.model.userData.limbs ? "" : "disabled"}>↻ ${tx("หันกลับ (ถ้าตัวละครเดินถอยหลัง)", "Turn around (if your character walks backwards)")}</button></div>
    <p class="note">${tx("ไฟล์อยู่ในเครื่องของคุณเท่านั้น ไม่ถูกส่งไปไหน และไม่ถูกเก็บไว้ เมื่อเปิดหน้าใหม่จะกลับเป็นตัวละครที่สร้างเอง", "The file stays on your device. It isn't sent anywhere or stored; next time the page opens you'll be your built character again.")}</p>`;
  openDialog(tx("🧍 ตัวละครของฉัน", "🧍 My avatar"), tabs + body + `<div class="row"><button class="btn" data-close>${tx("เสร็จแล้ว", "Done")}</button></div>`);
  const dlg = $("dlg");
  const ub = $("use-boy"); if (ub) ub.addEventListener("click", () => { avatarCfg.kind = "boy"; write("avatar", avatarCfg); buildAvatar(); openAvatar("boy"); });
  dlg.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => openAvatar(b.dataset.tab)));
  dlg.querySelectorAll("[data-sw]").forEach((b) => b.addEventListener("click", () => { avatarCfg = { ...avatarCfg, kind: avatarCfg.kind === "photo" ? "photo" : "blocky", [b.dataset.sw]: b.dataset.c }; write("avatar", avatarCfg); buildBlocky(); openAvatar("build"); }));
  dlg.querySelectorAll("[data-hs]").forEach((b) => b.addEventListener("click", () => { avatarCfg.hairStyle = b.dataset.hs; if (avatarCfg.kind === "boy") avatarCfg.kind = "blocky"; write("avatar", avatarCfg); buildBlocky(); openAvatar("build"); }));
  dlg.querySelectorAll("[data-face]").forEach((b) => b.addEventListener("click", () => { avatarCfg.face = b.dataset.face; if (avatarCfg.kind === "photo" || avatarCfg.kind === "boy") { avatarCfg.kind = "blocky"; } write("avatar", avatarCfg); buildBlocky(); openAvatar("build"); }));
  const ff = $("face-file");
  if (ff) ff.addEventListener("change", () => {
    const f = ff.files[0]; if (!f) return;
    const img = new Image(); const url = URL.createObjectURL(f);
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
      const s = Math.min(img.width, img.height); g.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 256, 256);
      URL.revokeObjectURL(url); faceImage = c.toDataURL("image/jpeg", 0.85);
      $("face-prev").src = faceImage; avatarCfg.kind = "photo"; buildBlocky();
      const keep = $("face-remember").checked; write("avatar", avatarCfg);
      if (keep) write("avatar-face", faceImage); else { try { localStorage.removeItem("sambodhaya-avatar-face"); } catch (e) {} write("avatar", { ...avatarCfg, kind: "blocky" }); }
    };
    img.src = url;
  });
  const fr = $("face-remember");
  if (fr) fr.addEventListener("change", () => { if (fr.checked && faceImage) { write("avatar-face", faceImage); write("avatar", { ...avatarCfg, kind: "photo" }); } else { try { localStorage.removeItem("sambodhaya-avatar-face"); } catch (e) {} write("avatar", { ...avatarCfg, kind: "blocky" }); } });
  const flip = $("model-flip");
  if (flip) flip.addEventListener("click", () => { const inner = player.model && player.model.children[0]; if (inner) inner.rotation.y += Math.PI; });
  const mf = $("model-file");
  if (mf) mf.addEventListener("change", () => {
    const f = mf.files[0]; if (!f) return;
    if (f.size > 40 * 1024 * 1024) { $("model-status").textContent = tx("ไฟล์ใหญ่เกิน 40 MB", "File is larger than 40 MB"); return; }
    $("model-status").textContent = tx("กำลังโหลด…", "Loading…");
    loadModelFile(f, (err) => { $("model-status").textContent = err ? tx("เปิดไฟล์นี้ไม่ได้ ลองไฟล์ .glb หรือ .vrm อื่น", "Couldn't open this file. Try another .glb or .vrm.") : tx("ใส่ตัวละครแล้ว ✓", "Avatar applied ✓"); if (!err && $("model-flip")) $("model-flip").disabled = false; });
  });
}
$("btn-avatar").addEventListener("click", () => openAvatar());

/* ---------------- main loop ---------------- */
const clock = new THREE.Clock();
const tmp = new THREE.Vector3(), head = new THREE.Vector3();
const camRay = new THREE.Raycaster(), camFwd = new THREE.Vector3();
let waterClock = 0;
let walkPhase = 0;
function resize() { renderer.setSize(innerWidth, innerHeight, false); if (composer) composer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener("resize", resize); resize();

let debugPause = false; // ?debug only: time stands still (the picture still redraws) while a test poses a moment
function tick() {
  frame(debugPause ? 0 : Math.min(clock.getDelta(), 0.05));
  requestAnimationFrame(tick);
}
// one step of the world: movement, animation, camera and the picture
function frame(dt) {
  timeStep(dt); placeLampLights(dt);
  feedStep(dt); fishStep(dt); meritStep(dt); lifeStep(dt);
  if (broom.held && (alms.t >= 0 || kraap.t >= 0 || feed.t >= 0 || shoes.t >= 0 || sit.on || merit.t >= 0)) putBroomBack(); // hands needed elsewhere
  monkTime += dt;
  if (!settings.calmMotion) for (const m of monkFigures) { const b = Math.sin(monkTime * 1.25 + m.ph); m.o.scale.set(1 + b * 0.004, 1 + b * 0.008, 1 + b * 0.004); } // slow breathing
  // movement relative to the camera
  let fx = 0, fz = 0;
  if (!dialogOpen()) {
    if (keys.KeyW || keys.ArrowUp) fz -= 1; if (keys.KeyS || keys.ArrowDown) fz += 1;
    if (keys.KeyA || keys.ArrowLeft) fx -= 1; if (keys.KeyD || keys.ArrowRight) fx += 1;
    fx += joy.x; fz += joy.y;
    if ((keys.Space) && !sit.on && sit.rise <= 0 && kraap.t < 0 && alms.t < 0 && shoes.t < 0 && feed.t < 0 && merit.t < 0 && player.y <= groundAt(player.x, player.z) + 0.01) player.vy = 9;
  }
  if (kraap.t >= 0) { // paying tribute: stay put (it ends by itself); glide to the spot and face the image first
    fx = fz = 0;
    const kBefore = kraap.t;
    kraap.t += dt; if (kraap.t > (kraap.keys ? kraap.dur : KRAAP_DUR)) { kraap.t = -1; kraap.touch = null; kraap.keys = null; if (kraap.kathin) kraap.kathin.monk.lean.rotation.x = 0; endKneelingOffering(); }
    const mv = kraap.kathin || kraap.merit;
    if (mv && kraap.keys && kraap.t >= 0) { // Kathina and kneeling offerings: kneel close to offer, then move back on the knees to bow
      const b = kraapState(kraap.t).back;
      kraap.spot = { x: mv.near.x + (mv.far.x - mv.near.x) * b, z: mv.near.z + (mv.far.z - mv.near.z) * b };
      if (kraap.t >= 0.8) { player.x = kraap.spot.x; player.z = kraap.spot.z; }
      if (kraap.kathin) kathinStep(); else kneelStep(kBefore, kraap.t);
    }
    if (kraap.spot && kraap.t >= 0 && kraap.t < 0.8) { player.x += (kraap.spot.x - player.x) * Math.min(1, dt * 8); player.z += (kraap.spot.z - player.z) * Math.min(1, dt * 8); }
    if (kraap.faceYaw != null) { let dy = kraap.faceYaw - player.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); player.yaw += dy * Math.min(1, dt * 8); }
  }
  if (shoes.t >= 0) { fx = fz = 0; shoesStep(dt); } // shoes off or on at the step: a moment's pause
  else if (!isBoy() && (shoes.pair || !shoes.on)) { removePair(); shoes.on = true; } // another character now: no shoes waiting
  else if (isBoy() && !sit.on && kraap.t < 0 && alms.t < 0 && !shoes.hold) { // (shoes.hold: ?debug tests keep one kit)
    const inH = insideHall(player.x, player.z);
    // arrived inside some other way (the places menu, back from a page): socks on, the pair at the step
    if (inH && shoes.on) { const st = hallStepOf(player.x, player.z); if (st) placePair(st.x, st.z, st.yaw); wearKit("socks"); shoes.on = false; }
    // outside in socks: fine at the step; walking off (or carried away) he puts his shoes back on
    else if (!inH && !shoes.on) {
      const p = shoes.pair && shoes.pair.position;
      if (!p || Math.hypot(p.x - player.x, p.z - player.z) > 1.0) startShoes("on", { x: player.x, z: player.z });
    }
  }
  if (merit.t >= 0) fx = fz = 0; // making an offering: in place until it is done
  if (feed.t >= 0) fx = fz = 0; // feeding the fish: at the rail until the last handful is thrown
  if (alms.t >= 0) { // giving alms: stay put (it ends by itself); step up to the monk and face him first
    fx = fz = 0;
    if (alms.t < 0.8) { player.x += (alms.spot.x - player.x) * Math.min(1, dt * 8); player.z += (alms.spot.z - player.z) * Math.min(1, dt * 8); }
    let dy = alms.faceYaw - player.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); player.yaw += dy * Math.min(1, dt * 8);
    almsStep(dt);
  }
  if (sit.on || sit.rise > 0) { // seated (or getting up): stay put; wanting to walk stands him up
    if (sit.on && Math.hypot(fx, fz) > 0.3) standUp();
    fx = fz = 0;
    if (sit.on && sit.spot) { player.x += (sit.spot.x - player.x) * Math.min(1, dt * 5); player.z += (sit.spot.z - player.z) * Math.min(1, dt * 5); } // settle onto the cushion
    if (sit.faceYaw != null) { let dy = sit.faceYaw - player.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); player.yaw += dy * Math.min(1, dt * 5); }
  }
  sit.w += ((sit.on ? 1 : 0) - sit.w) * Math.min(1, dt * 2.4); sit.rise = Math.max(0, sit.rise - dt);
  const mag = Math.min(1, Math.hypot(fx, fz));
  // a calm walk, like the boy in the film; Shift (or the touch stick pushed to its edge) runs
  const running = keys.ShiftLeft || keys.ShiftRight || Math.hypot(joy.x, joy.y) > 0.92;
  const speed = (running ? 6 : 2.6) * mag; // a 10-year-old's natural walking and running pace at this scale
  if (mag > 0.05) {
    const s = Math.sin(camYaw), c = Math.cos(camYaw);
    const nx = fx / (Math.hypot(fx, fz) || 1), nz = fz / (Math.hypot(fx, fz) || 1);
    const wx = nx * c + nz * s, wz = -nx * s + nz * c;
    const [cx, cz] = collide(player.x + wx * speed * dt, player.z + wz * speed * dt);
    // the edge of a hall floor: shoes come off going in, and go back on coming out
    const gateIn = isBoy() && shoes.on && insideHall(cx, cz) && !insideHall(player.x, player.z);
    const gateOut = isBoy() && !shoes.on && !insideHall(cx, cz) && insideHall(player.x, player.z);
    if (gateIn || gateOut) startShoes(gateIn ? "off" : "on", { x: cx + wx * 0.5, z: cz + wz * 0.5 }); else [player.x, player.z] = [cx, cz];
    const target = Math.atan2(wx, wz);
    let diff = target - player.yaw; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); player.yaw += diff * Math.min(1, dt * 12);
  }
  const gy = groundAt(player.x, player.z);
  player.vy -= 25 * dt; player.y = Math.max(gy, player.y + player.vy * dt); if (player.y === gy) player.vy = Math.max(0, player.vy);
  player.obj.position.set(player.x, player.y, player.z); player.obj.rotation.y = player.yaw;

  // limb swing for blocky avatars, clips for 3D models
  const moving = mag > 0.05;
  broomStep(dt, moving);
  const stepsBefore = Math.floor(walkPhase / Math.PI);
  const gait = player.gait && player.gait[player.current];
  walkPhase += dt * (moving ? (gait && player.action ? Math.PI * gait.steps * player.action.timeScale : speed * 1.6) : 0); // footsteps follow the animation's own steps
  if (moving && Math.floor(walkPhase / Math.PI) !== stepsBefore && player.y <= gy + 0.05) sound.step(insideHall(player.x, player.z) ? "wood" : onPath(player.x, player.z) ? "stone" : "grass");
  const limbs = player.model && player.model.userData.limbs;
  if (limbs) {
    const sw = moving ? Math.sin(walkPhase) * 0.7 : 0;
    limbs.legL.rotation.x = sw; limbs.legR.rotation.x = -sw; limbs.armL.rotation.x = -sw * 0.8; limbs.armR.rotation.x = sw * 0.8;
    if (sit.w > 0.01) { // the block avatar sits on the ground, legs forward, hands on the knees
      limbs.legL.rotation.x = limbs.legR.rotation.x = -1.45 * sit.w;
      limbs.armL.rotation.x = limbs.armR.rotation.x = -0.75 * sit.w;
      player.model.position.y = -1.05 * sit.w + (sit.spot ? sit.spot.top * sit.w : 0);
    } else if (player.model.position.y < 0) player.model.position.y = 0;
  } else if (player.mixer) {
    if (kraap.t >= 0 || alms.t >= 0 || shoes.t >= 0 || feed.t >= 0 || merit.t >= 0) playClip("idle", 0.4);
    else if (sit.on && player.clips.sit) playClip("sit", 1.2);
    else if (sit.rise > 0) playClip("idle", 1.0);
    else playClip(!moving ? "idle" : player.clips.run && speed > 5 ? "run" : player.clips.walk ? "walk" : "idle");
    // keep the soles (or, seated, the crossed legs) on the ground: each animation has its own lift,
    // blended by how much of each animation is showing; on a cushion, its height is added
    if (player.lift) {
      let lw = 0, lsum = 0;
      for (const k in player.lift) { const a = player.mixer.existingAction(player.clips[k]); const wgt = a ? a.getEffectiveWeight() : 0; lw += wgt; lsum += wgt * player.lift[k]; }
      const lift = (lw > 0.001 ? lsum / lw : (player.lift[player.current] || 0)) + (sit.spot ? sit.spot.top * sit.w : 0);
      player.model.position.y += (lift - player.model.position.y) * Math.min(1, dt * 10);
    }
    const g = player.gait[player.current];
    if (g && player.action) player.action.timeScale = Math.min(2.6, Math.max(0.4, speed / g.speed)); // feet keep pace with the ground
    player.mixer.update(dt);
  }
  else if (player.model && !player.vrm && !settings.calmMotion) player.model.position.y = moving ? Math.abs(Math.sin(walkPhase)) * 0.12 : 0;
  if (player.vrm) {
    // VRM files carry no animation: relax the arms and swing the limbs procedurally
    const h = player.vrm.humanoid, bone = (n) => h && h.getNormalizedBoneNode(n);
    const sw = moving ? Math.sin(walkPhase) * 0.6 : 0;
    const set = (n, ax, v) => { const b = bone(n); if (b) b.rotation[ax] = v; };
    set("leftUpperArm", "z", -1.15); set("rightUpperArm", "z", 1.15);
    set("leftUpperArm", "x", sw * 0.8); set("rightUpperArm", "x", -sw * 0.8);
    set("leftUpperLeg", "x", -sw); set("rightUpperLeg", "x", sw);
    set("leftLowerLeg", "x", moving ? Math.max(0, Math.sin(walkPhase)) * 0.6 : 0); set("rightLowerLeg", "x", moving ? Math.max(0, -Math.sin(walkPhase)) * 0.6 : 0);
    player.vrm.update(dt);
  }

  // the wai rides on top of the current animation; walking away lets it finish quickly
  if (wai.t >= 0) {
    if (moving && wai.t < wai.dur - 0.55) { wai.t = Math.max(wai.t, wai.dur - 0.55); wai.faceYaw = null; }
    if (wai.faceYaw != null) { let dy = wai.faceYaw - player.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); player.yaw += dy * Math.min(1, dt * 6); player.obj.rotation.y = player.yaw; }
    wai.t += dt; if (wai.t > wai.dur) wai.t = -1;
    const [hands, bow] = waiWeights();
    if (limbs) { // the block avatar: arms forward and together, a small bow
      limbs.armL.rotation.x = -1.35 * hands; limbs.armR.rotation.x = -1.35 * hands;
      limbs.armL.rotation.z = 0.42 * hands; limbs.armR.rotation.z = -0.42 * hands; // armL sits at -x: bring both hands to the middle
      player.model.rotation.x = 0.3 * bow;
    }
  } else if (limbs && player.model.rotation.x) { player.model.rotation.x = 0; limbs.armL.rotation.z = 0; limbs.armR.rotation.z = 0; }
  if (player.mixer) { // sitting and the wai, layered on the animation (with nothing to do, this hands the bones back)
    const [hands, bow] = waiWeights();
    poseOverlays(player.model, hands, bow, sit.w); player.model.updateMatrixWorld(true); updatePress(player.model);
  }

  // the dog follows a little behind
  if (dog.obj.visible) {
    // stay ahead-left of the player as seen from the camera, so it never blocks the view
    const fx2 = -Math.sin(camYaw), fz2 = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
    let bx = player.x + fx2 * 1.4 - rx * 2.6, bz = player.z + fz2 * 1.4 - rz * 2.6;
    // during the ceremonies (sitting, paying respect, Kathina, giving alms and its wai) the dog sits at his left side, facing the same way
    const ceremony = sit.on || kraap.t >= 0 || alms.t >= 0 || (wai.t >= 0 && wai.fromAlms) || feed.t >= 0 || merit.t >= 0;
    if (ceremony) {
      // beside where he will be for the whole ceremony (the bowing spot, the spot before the monk), so the dog
      // sits down once and stays down while he steps up or moves back on his knees
      const k = kraap.t >= 0 ? kraap : null, al = !k && (alms.t >= 0 || wai.fromAlms) ? alms : null, fd = feed.t >= 0 ? feed : merit.t >= 0 ? { stand: merit.spot, faceYaw: merit.faceYaw } : null;
      const at = k ? ((k.kathin || k.merit) && k.keys ? (k.kathin || k.merit).far : k.spot) : al ? al.spot : fd ? fd.stand : null;
      const ax = at ? at.x : player.x, az = at ? at.z : player.z;
      const ay = k && k.faceYaw != null ? k.faceYaw : al ? al.faceYaw : fd ? fd.faceYaw : player.yaw;
      bx = ax + Math.cos(ay) * 1.5 + Math.sin(ay) * 0.2; bz = az - Math.sin(ay) * 1.5 + Math.cos(ay) * 0.2;
    }
    const ddx = bx - dog.x, ddz = bz - dog.z, dd = Math.hypot(ddx, ddz);
    const wantSit = ceremony && dd < 0.5;
    dogAnim.sit.value += ((wantSit ? 1 : 0) - dogAnim.sit.value) * Math.min(1, dt * 3);
    const dogFree = dogAnim.sit.value < 0.15; // a sitting dog gets up before it walks
    dog.moving = dd > 0.4 && dogFree;
    let dogSpeed = 0;
    if (wantSit) { let dy = player.yaw - dog.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); dog.yaw += dy * Math.min(1, dt * 4); }
    if (dd > 0.4 && dogFree) { const st = Math.min(dd, dt * (dd > 6 ? 12 : 6)); dogSpeed = dt > 0 ? st / dt : 0; [dog.x, dog.z] = collide(dog.x + ddx / dd * st, dog.z + ddz / dd * st); dog.yaw = Math.atan2(ddx, ddz); }
    // walk cycle: about one stride per 1.2 m; the legs ease in and out of walking
    dogAnim.phase.value = (dogAnim.phase.value + dt * dogSpeed * 5.2) % (Math.PI * 200); // kept small so it stays precise
    if (!Number.isFinite(dogAnim.phase.value)) dogAnim.phase.value = 0;
    dogAnim.walk.value += ((dogSpeed > 0.5 ? 1 : 0) - dogAnim.walk.value) * Math.min(1, dt * 6);
    dogAnim.time.value += dt; dogAnim.wag.value = settings.calmMotion ? 0.4 : 1;
    dog.obj.position.set(dog.x, groundAt(dog.x, dog.z), dog.z); dog.obj.rotation.y = dog.yaw;
    if (!settings.calmMotion) dog.tail.rotation.y = Math.sin(performance.now() / 160) * 0.6;
  }

  // nearest place within reach
  let best = null, bestD = Infinity;
  for (const p of PLACES) { const d = Math.hypot(player.x - p.pos[0], player.z - p.pos[1]); if (d < p.r && d < bestD) { best = p; bestD = d; } }
  for (const s of journeyStones) { const d = Math.hypot(player.x - s.x, player.z - s.z); if (d < 2.6 && d < bestD) { best = { ...PLACES.find((p) => p.id === "journey"), stone: s.i }; bestD = d; } }
  if (Math.hypot(player.x - BELL[0], player.z - BELL[1]) < 4.4 && 3 < bestD) { best = BELL_PLACE; bestD = 3; } // reachable from the road
  { const d = Math.hypot(player.x - DONATE.x, player.z - (DONATE.z + 0.6)); if (d < 2.4 && d < bestD) { best = DONATE_PLACE; bestD = d; } } // only when standing at the box
  { const h = salas.learn; if (h && h.senior && kraap.t < 0) { const sp = kathinSpots(h), d = Math.hypot(player.x - sp.near.x, player.z - sp.near.z); if (d < 1.3 && d < bestD) { best = { ...KATHIN_PLACE, hall: h }; bestD = d; } } }
  if (onBridge(player.x, player.z) && feed.t < 0 && 2.5 < bestD) { best = FISH_PLACE; bestD = 2.5; }
  if (merit.t < 0 && kraap.t < 0) { const mh = meritHere(); if (mh) { best = { ...MERIT[mh.kind].place, merit: mh }; bestD = 0.5; } } // standing at it: the offering comes first
  if (Math.hypot(player.x - BROOM_AT.x, player.z - BROOM_AT.z) < 1.8 && 2.3 < bestD) { best = broom.held ? BROOM_BACK : BROOM_PLACE; bestD = 2.3; }
  for (const m of almsMonks) { const d = Math.hypot(player.x - (m.x + Math.sin(m.yaw) * ALMS_STAND), player.z - (m.z + Math.cos(m.yaw) * ALMS_STAND)); if (d < 1.5 && d < bestD) { best = { ...ALMS_PLACE, monk: m }; bestD = d; } }
  for (const s of boards) { const d = Math.hypot(player.x - s.x, player.z - s.z); if (d < 1.9 && d < bestD) { best = { ...PLACES.find((p) => p.id === "learn"), stone: s.i, board: true }; bestD = d; } }
  if ((best && best.id) !== (near && near.id) || (best && best.stone) !== (near && near.stone) || (best && best.monk) !== (near && near.monk)) { near = best; showPrompt(near); }
  // while he is doing something the prompt steps aside, and stays aside until he has walked on a little
  const busy = alms.t >= 0 || kraap.t >= 0 || shoes.t >= 0 || wai.t >= 0 || sit.on || feed.t >= 0 || merit.t >= 0;
  if (busy) promptRest = { x: player.x, z: player.z };
  else if (promptRest && Math.hypot(player.x - promptRest.x, player.z - promptRest.z) > 0.6) promptRest = null;
  if (!!promptRest !== promptAway) { promptAway = !!promptRest; $("prompt").classList.toggle("away", promptAway); }

  // camera follows
  const cx = player.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist;
  const cz = player.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist;
  const ks = kraap.t >= 0 ? kraapState(kraap.t) : null;
  const seatDrop = Math.max(1.05 * sit.w, ks ? 1.0 * ks.kneel + 0.6 * ks.bow : 0); // seated or kneeling, the camera looks at where his head now is
  const cy = player.y + 2 - seatDrop + Math.sin(camPitch) * camDist;
  // don't look through walls or roofs: pull the camera in front of whatever is in the way
  head.set(player.x, player.y + 2.2 - seatDrop, player.z); tmp.set(cx, cy, cz);
  const want = tmp.clone().sub(head), dist = want.length(); want.normalize();
  camRay.set(head, want); camRay.far = dist;
  const hit = camRay.intersectObjects(camBlock, false)[0];
  if (hit) tmp.copy(head).addScaledVector(want, Math.max(1.2, hit.distance - 0.35));
  if (settings.calmMotion || hit) camera.position.copy(tmp); else camera.position.lerp(tmp, Math.min(1, dt * 8));
  camera.lookAt(head);

  // running water (slower with calm motion on)
  { const wdt = dt * (settings.calmMotion ? 0.35 : 1); waterClock += wdt; waterAnims.forEach((f) => f(wdt, waterClock)); }
  // candle flames sway a little (not in calm motion)
  if (!settings.calmMotion) { const t = performance.now() / 1000; flames.forEach((f, i) => { f.scale.y = 1.8 + Math.sin(t * 7 + i * 1.7) * 0.18; }); }
  if (dog.model) dog.model.position.y = Math.abs(Math.sin(dogAnim.phase.value)) * 0.035 * dogAnim.walk.value; // a light bounce in step

  camera.getWorldDirection(camFwd);
  sound.update(camera.position, camFwd, insideHall(player.x, player.z) && Math.hypot(camera.position.x - player.x, camera.position.z - player.z) < 14, dt);

  if (composer) composer.render(); else renderer.render(scene, camera);
}

document.fonts.load("64px Itim").then(() => document.fonts.load("36px Mali")).catch(() => {}).finally(() => {
  // redraw sign textures once the Thai fonts are ready
  signDraws.forEach((d) => d());
});
camYaw = 0; camera.position.set(0, 8, 105);
restoreSpot(); // back from a page of the site: stand where you were
if (/[?&]debug\b/.test(location.search)) window.__w = { THREE, scene, salas, sound, player, dog, dogAnim, wai, startWai, poseWai, buddhaImages, monkFigures, almsMonks, alms, startAlms, almsState, shoes, boyKits, startShoes, insideHall, wearKit, colliders, blockers, gardenSpots, paths, floors, ponds, WAI_LEVELS, sit, startSit, standUp, cushionSpots, kraap, startKraap, kraapState, startKathin, kathinSpots, feed, startFeed, fishes, food, onBridge, merit, startMerit, meritHere, broom, fallenLeaves, altars, gildImage, bodhiBands, lane, novice, birds, cat, look: (eye, at) => { camera.position.set(...eye); camera.lookAt(...at); if (composer) composer.render(); else renderer.render(scene, camera); }, step: (n = 1, dt = 0.05) => { for (let i = 0; i < n; i++) frame(dt); }, boards, pause: (v = true) => { debugPause = v; }, setCam: (y, p, d) => { camYaw = y; if (p != null) camPitch = p; if (d != null) camDist = d; } };
Promise.race([Promise.all(propJobs), new Promise((r) => setTimeout(r, 7000))]).then(() => {
  $("loading").hidden = true;
  canvas.focus();
});
requestAnimationFrame(tick);
