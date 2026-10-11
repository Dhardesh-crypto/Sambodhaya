// วัดสัมโพธายะ 3D — a calm, solo, Roblox-style walk through the temple.
// No scores, no collectibles, no sound unless pressed. Every hall links back to the
// 2D site, which stays the single place where the teaching content lives.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

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
  { id: "learn", icon: "🧘", th: "ศาลาเรียนรู้", en: "Learning Hall", sub: ["เรียน ฝึก และสังเกตไปทีละก้าว", "Learn, practise and observe, one step at a time"], href: "index.html#learn", pos: [-13, -30], r: 8 },
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
const canvas = document.getElementById("view");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xf6dcb0, 70, 190);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);

// warm late-afternoon light, like the entrance artwork
scene.add(new THREE.HemisphereLight(0xfff2d6, 0x6f8f4a, 1.15));
const sun = new THREE.DirectionalLight(0xffd9a0, 2.1);
sun.position.set(-40, 60, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 180 });
scene.add(sun);

const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra });
const MAT = {
  grass: M(0x8fbf5c), stone: M(0xd9c7a5), stoneDark: M(0xb39f7d), wood: M(0x8a5a33), woodDark: M(0x5e3b20),
  roof: M(0x5d5752), roofEdge: M(0xc9963a, { metalness: 0.3 }), wall: M(0xf3e6cc), gold: M(0xe8b84a, { metalness: 0.4, roughness: 0.5 }),
  leaf: M(0x5f9e4a), leafLight: M(0x7db85a), trunk: M(0x7a5536), water: new THREE.MeshStandardMaterial({ color: 0x6fb6c9, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.9 }),
  lotus: M(0xf28fb0), pad: M(0x4d8f45), glow: M(0xffd27a, { emissive: 0xffb84a, emissiveIntensity: 0.9 }), mountain: M(0x9fb0b8), mountainFar: M(0xbcc8cc),
};
const add = (geo, mat, x, y, z, parent = scene, cast = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m; };
const colliders = []; // circles {x, z, r}
const blockers = [];  // axis-aligned boxes {minX, maxX, minZ, maxZ}

/* ---------------- sky & far mountains ---------------- */
{
  const g = new THREE.SphereGeometry(300, 32, 16);
  const c = []; const pos = g.attributes.position; const top = new THREE.Color(0x8cc4e8), mid = new THREE.Color(0xfbe3b8), low = new THREE.Color(0xf6c98a);
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 300; const col = y > 0.15 ? mid.clone().lerp(top, Math.min(1, (y - 0.15) / 0.6)) : low.clone().lerp(mid, (y + 0.2) / 0.35); c.push(col.r, col.g, col.b); }
  g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
  scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })));
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2, d = 150 + (i % 3) * 18, h = 30 + ((i * 37) % 25);
    const m = add(new THREE.ConeGeometry(28 + (i % 4) * 6, h, 5), i % 2 ? MAT.mountain : MAT.mountainFar, Math.cos(a) * d, h / 2 - 2, Math.sin(a) * d, scene, false);
    m.rotation.y = i;
  }
}

/* ---------------- ground, plaza and paths ---------------- */
add(new THREE.CylinderGeometry(120, 120, 1, 48), MAT.grass, 0, -0.5, 0, scene, false);
add(new THREE.CylinderGeometry(16, 16, 0.2, 40), MAT.stone, 0, 0.05, 0, scene, false);
const path = (x1, z1, x2, z2, w = 5) => {
  const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz);
  const m = add(new THREE.BoxGeometry(w, 0.15, len), MAT.stone, (x1 + x2) / 2, 0.06, (z1 + z2) / 2, scene, false);
  m.rotation.y = Math.atan2(dx, dz);
};
path(0, 16, 0, 46, 7); path(0, -14, 0, -44); path(-12, -8, -28, -14); path(12, -8, 28, -14);
path(-8, -13, -12, -24); path(8, -13, 12, -24); path(-12, 8, -24, 13); path(12, 8, 24, 13);

/* ---------------- the great tree at the centre ---------------- */
{
  add(new THREE.CylinderGeometry(6.5, 7, 1.2, 24), MAT.stoneDark, 0, 0.6, 0);
  add(new THREE.CylinderGeometry(5.8, 5.8, 0.3, 24), M(0x6f5a3e), 0, 1.25, 0, scene, false);
  add(new THREE.CylinderGeometry(1.4, 2.2, 10, 8), MAT.trunk, 0, 6, 0);
  [[-2.5, 7, 0.8, -0.6], [2.4, 8, -0.4, 0.7], [0.5, 9, 2.2, 0.3]].forEach(([x, y, z, r]) => { const b = add(new THREE.CylinderGeometry(0.5, 0.8, 6, 6), MAT.trunk, x, y, z); b.rotation.z = r; b.rotation.x = z * 0.2; });
  [[0, 14, 0, 8], [-6, 12, 2, 5.5], [6, 12.5, -1, 5.5], [2, 15, 5, 5], [-3, 15.5, -5, 5], [5, 11, 5, 4.5], [-5, 11, -4, 4.5]].forEach(([x, y, z, r], i) =>
    add(new THREE.IcosahedronGeometry(r, 1), i % 2 ? MAT.leaf : MAT.leafLight, x, y, z));
  colliders.push({ x: 0, z: 0, r: 7 });
}

/* ---------------- lanterns ---------------- */
const lantern = (x, z) => {
  add(new THREE.BoxGeometry(0.5, 2.4, 0.5), MAT.woodDark, x, 1.2, z);
  add(new THREE.BoxGeometry(1, 1, 1), MAT.glow, x, 2.9, z);
  add(new THREE.ConeGeometry(0.9, 0.6, 4), MAT.roof, x, 3.7, z).rotation.y = Math.PI / 4;
  colliders.push({ x, z, r: 0.7 });
};
[[-5, 20], [5, 20], [-5, 30], [5, 30], [-17, 0], [17, 0], [-10, -40], [10, -40]].forEach(([x, z]) => lantern(x, z));

/* ---------------- ponds with lotus ---------------- */
const pond = (x, z, r) => {
  add(new THREE.CylinderGeometry(r + 0.6, r + 0.6, 0.5, 28), MAT.stoneDark, x, 0.2, z, scene, false);
  add(new THREE.CylinderGeometry(r, r, 0.52, 28), MAT.water, x, 0.22, z, scene, false);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4, d = r * (0.3 + ((i * 7) % 6) / 10);
    const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
    add(new THREE.CylinderGeometry(0.7, 0.7, 0.06, 10), MAT.pad, px, 0.52, pz, scene, false);
    if (i % 2 === 0) { const f = add(new THREE.ConeGeometry(0.35, 0.6, 6), MAT.lotus, px, 0.85, pz); f.rotation.x = Math.PI; f.position.y = 0.85; }
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
function sign(title, sub, icon, x, y, z, w = 6) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: signTexture(title, sub, icon), depthWrite: false }));
  s.scale.set(w, w * 220 / 512, 1); s.position.set(x, y, z); scene.add(s); return s;
}

/* ---------------- Thai-style hall: base, pillars, two-tier gabled roof, finials ---------------- */
function gable(w, d, h, mat) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(0, h); s.lineTo(w / 2, 0); s.lineTo(-w / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2);
  return new THREE.Mesh(g, mat);
}
function hall(x, z, rotY, w = 12, d = 9) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; scene.add(g);
  add(new THREE.BoxGeometry(w + 2, 1, d + 2), MAT.stoneDark, 0, 0.5, 0, g);
  add(new THREE.BoxGeometry(w, 4.6, d), MAT.wall, 0, 3.3, 0, g);
  // front pillars and door
  for (let i = -2; i <= 2; i++) add(new THREE.BoxGeometry(0.6, 5, 0.6), MAT.wood, i * (w / 4.4), 3.5, d / 2 + 0.5, g);
  add(new THREE.BoxGeometry(2.6, 3.4, 0.3), MAT.woodDark, 0, 2.7, d / 2 + 0.05, g);
  [-w / 3, w / 3].forEach((wx) => add(new THREE.BoxGeometry(1.8, 1.6, 0.25), MAT.glow, wx, 3.6, d / 2 + 0.05, g, false));
  // roofs: lower wide tier and upper tier, each with a gold edge and chofa finials
  const tiers = [[w + 3, d + 3, 3.4, 5.6], [w * 0.75, d * 0.8, 3.2, 8.2]];
  tiers.forEach(([rw, rd, rh, ry]) => {
    const r = gable(rw, rd, rh, MAT.roof); r.position.y = ry; r.castShadow = true; g.add(r);
    const e = gable(rw + 0.3, 0.3, rh + 0.15, MAT.roofEdge); e.position.set(0, ry - 0.05, rd / 2); g.add(e);
    const e2 = e.clone(); e2.position.z = -rd / 2; g.add(e2);
    [-1, 1].forEach((sgn) => { const f = add(new THREE.ConeGeometry(0.25, 1.6, 5), MAT.gold, 0, ry + rh + 0.6, sgn * rd / 2, g); f.rotation.x = sgn * 0.5; });
  });
  // collision: approximate the footprint as a rotated box -> use a circle at the centre plus the rectangle
  const c = Math.cos(rotY), s = Math.sin(rotY), hx = (w + 2) / 2, hz = (d + 2) / 2;
  blockers.push({ x, z, c, s, hx, hz });
  return g;
}

/* ---------------- place the halls ---------------- */
const signs = [];
const halls = {
  library: hall(-30, -24, Math.PI / 5), learn: hall(-13, -38, 0.12), media: hall(13, -38, -0.12), access: hall(30, -24, -Math.PI / 5),
  care: hall(34, 6, -Math.PI / 2.4, 9, 7),
};
PLACES.forEach((p) => {
  if (p.id === "yard" || p.id === "exit") return;
  const yOffset = p.id === "garden" || p.id === "journey" || p.id === "rest" ? 5 : 7.2;
  const [sx, sz] = { library: [-30, -18], learn: [-13, -31], media: [13, -31], access: [30, -18], care: [29, 9], rest: [-28, 14], garden: [0, -48], journey: [15, 49] }[p.id] || p.pos;
  signs.push(sign(L === "en" ? p.en : p.th, p.sub[L === "en" ? 1 : 0], p.icon, sx, yOffset, sz, 5.2));
});
sign(tx("ลานกลาง", "Central Courtyard"), tx("อยากไปไหนวันนี้?", "Where would you like to go today?"), "🌳", 0, 21, 0, 8);

// the Sambodhaya wheel hangs on the Media Hall as explanatory media (image used unchanged)
new THREE.TextureLoader().load("img/sambodhaya-wheel.png", (t) => {
  t.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 4.75), new THREE.MeshBasicMaterial({ map: t }));
  const frame = new THREE.Mesh(new THREE.BoxGeometry(5.6, 5.15, 0.2), MAT.woodDark);
  const gp = new THREE.Group(); gp.add(frame); board.position.z = 0.11; gp.add(board);
  gp.position.set(7.5, 3.4, -32.6); gp.rotation.y = -0.12; scene.add(gp);
});

/* ---------------- rest area: benches by the pond ---------------- */
[[-24, 18, 0.3], [-30, 10, -0.4], [-34, 15, 1.2]].forEach(([x, z, r]) => {
  const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = r; scene.add(b);
  add(new THREE.BoxGeometry(3.4, 0.3, 1.1), MAT.wood, 0, 1, 0, b);
  [-1.3, 1.3].forEach((bx) => add(new THREE.BoxGeometry(0.3, 1, 0.9), MAT.woodDark, bx, 0.5, 0, b));
  colliders.push({ x, z, r: 1.6 });
});

/* ---------------- practice garden: four observation stones and a waterfall wall ---------------- */
{
  add(new THREE.BoxGeometry(22, 9, 3), MAT.stoneDark, 0, 4.5, -60);
  const fall = add(new THREE.BoxGeometry(5, 8, 0.4), MAT.water, 0, 4.4, -58.3, scene, false);
  fall.material = fall.material.clone(); fall.material.opacity = 0.75;
  add(new THREE.CylinderGeometry(5, 5, 0.4, 24), MAT.water, 0, 0.2, -55.5, scene, false);
  colliders.push({ x: 0, z: -56, r: 5 });
  blockers.push({ x: 0, z: -60, c: 1, s: 0, hx: 11, hz: 1.6 });
  const four = [["🧍", "กาย", "Body"], ["💗", "ความรู้สึก", "Feelings"], ["🧠", "จิต", "Mind"], ["☸", "ธรรม", "Dhamma"]];
  four.forEach(([ic, th, en], i) => {
    const x = -9 + i * 6, z = -47;
    add(new THREE.CylinderGeometry(1.4, 1.6, 0.6, 10), MAT.stone, x, 0.3, z);
    sign(L === "en" ? en : th, "", ic, x, 2.6, z, 3.2);
    colliders.push({ x, z, r: 1.5 });
  });
  [[-14, -52], [14, -52], [-16, -44], [16, -44]].forEach(([x, z]) => { add(new THREE.CylinderGeometry(0.5, 0.7, 3, 6), MAT.trunk, x, 1.5, z); add(new THREE.IcosahedronGeometry(2.6, 0), MAT.leafLight, x, 4.4, z); colliders.push({ x, z, r: 1 }); });
}

/* ---------------- my journey: eight stepping stones ---------------- */
const journeyStones = [];
JOURNEY.forEach(([th, en], i) => {
  const x = 17 + i * 3.1, z = 45 - Math.sin(i * 0.55) * 6;
  add(new THREE.CylinderGeometry(1.5, 1.6, 0.35, 12), MAT.stone, x, 0.18, z, scene, false);
  sign(`${i + 1}`, L === "en" ? en : th, "👣", x, 2.2, z, 3.4);
  journeyStones.push({ x, z, i });
});

/* ---------------- gates (enter left, exit right) ---------------- */
[[-7, tx("ยินดีต้อนรับ", "Welcome"), "🚪"], [7, tx("ออกจากวัดได้เสมอ", "Leave any time"), "🚪"]].forEach(([x, label]) => {
  add(new THREE.BoxGeometry(1.6, 7, 1.6), MAT.woodDark, x, 3.5, 36);
  add(new THREE.BoxGeometry(2.2, 0.6, 2.2), MAT.roof, x, 7.2, 36);
  add(new THREE.BoxGeometry(0.9, 0.9, 0.9), MAT.glow, x, 8, 36);
  sign(label, "", "🚪", x, 10, 36, 4.4);
  colliders.push({ x, z: 36, r: 1.3 });
});
[-4.5, 4.5].forEach((x) => { const door = add(new THREE.BoxGeometry(3.4, 4.4, 0.3), MAT.wood, x + (x < 0 ? -2.4 : 2.4), 2.2, 34); door.rotation.y = x < 0 ? -1.1 : 1.1; });

/* ---------------- scattered trees around the edge ---------------- */
for (let i = 0; i < 40; i++) {
  const a = (i / 40) * Math.PI * 2 + 0.07, d = 58 + ((i * 13) % 14);
  const x = Math.cos(a) * d, z = Math.sin(a) * d;
  if (z > 30 && Math.abs(x) < 14) continue; // keep the entrance view open
  if (z > 26 && x > 10 && x < 54) continue; // keep the My Journey path clear
  add(new THREE.CylinderGeometry(0.5, 0.8, 4, 6), MAT.trunk, x, 2, z);
  add(new THREE.IcosahedronGeometry(3 + (i % 3), 0), i % 2 ? MAT.leaf : MAT.leafLight, x, 6, z);
}

/* ---------------- avatars ---------------- */
const AV_DEFAULT = { kind: "blocky", skin: "#e8b48a", shirt: "#e98a2b", pants: "#5e4a3a", hair: "#2b1d14", hairStyle: "short", face: "smile" };
let avatarCfg = { ...AV_DEFAULT, ...read("avatar", {}) };
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

const player = { obj: new THREE.Group(), x: 0, z: 44, y: 0, vy: 0, yaw: Math.PI, model: null, mixer: null, clips: {}, current: null, vrm: null };
scene.add(player.obj);
function setModel(obj, mixerClips) {
  if (player.model) player.obj.remove(player.model);
  if (player.vrm) { VRMUtils.deepDispose(player.vrm.scene); player.vrm = null; }
  player.model = obj; player.obj.add(obj);
  player.mixer = null; player.clips = {}; player.current = null;
  if (mixerClips && mixerClips.length) {
    player.mixer = new THREE.AnimationMixer(obj);
    const find = (re) => mixerClips.find((c) => re.test(c.name));
    player.clips.idle = find(/idle|stand|breath/i) || mixerClips[0];
    player.clips.walk = find(/walk|run|move/i);
    playClip("idle");
  }
}
function playClip(name) {
  if (!player.mixer || !player.clips[name] || player.current === name) return;
  const a = player.mixer.clipAction(player.clips[name]);
  player.mixer.stopAllAction(); a.reset().fadeIn(0.2).play(); player.current = name;
}
function fitModel(obj, height = 2.9) {
  const box = new THREE.Box3().setFromObject(obj); const size = box.getSize(new THREE.Vector3());
  const s = height / (size.y || 1); obj.scale.setScalar(s);
  const box2 = new THREE.Box3().setFromObject(obj);
  obj.position.y -= box2.min.y; const c = box2.getCenter(new THREE.Vector3()); obj.position.x -= c.x; obj.position.z -= c.z;
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
}
function buildBlocky() { setModel(blockyAvatar(avatarCfg, avatarCfg.kind === "photo" ? faceImage : null)); }
buildBlocky();

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
const dog = { obj: new THREE.Group(), x: 3, z: 40, y: 0, yaw: Math.PI };
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
}

/* ---------------- input ---------------- */
const keys = {};
let camYaw = Math.PI, camPitch = 0.32, camDist = 11;
addEventListener("keydown", (e) => {
  if (dialogOpen()) { if (e.key === "Escape") closeDialog(); return; }
  if (e.target instanceof HTMLInputElement) return;
  keys[e.code] = true;
  if (e.code === "KeyE" || e.code === "Enter") { if (near) openPlace(near); }
  if (e.code === "KeyG") openPlaces(true);
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
  document.getElementById("t-jump").addEventListener("click", () => { if (player.y <= 0.01) player.vy = 9; });
  document.getElementById("t-act").addEventListener("click", () => { if (near) openPlace(near); else openPlaces(true); });
}

// click on the dog or a hall
const ray = new THREE.Raycaster();
function pickAt(x, y) {
  const v = new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(v, camera);
  if (dog.obj.visible && ray.intersectObject(dog.obj, true).length) { openPlaces(true); return; }
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
  const d = Math.hypot(nx, nz); if (d > 70) { nx *= 70 / d; nz *= 70 / d; }
  return [nx, nz];
}

/* ---------------- UI: prompt, dialogs ---------------- */
const $ = (id) => document.getElementById(id);
let near = null;
function placeName(p) { return L === "en" ? p.en : p.th; }
function showPrompt(p) {
  const el = $("prompt");
  if (!p) { el.hidden = true; return; }
  $("prompt-name").textContent = p.icon + " " + placeName(p);
  $("prompt-sub").textContent = p.stone != null ? tx("เรื่องที่ ", "Story ") + (p.stone + 1) : p.sub[L === "en" ? 1 : 0];
  $("prompt-go").textContent = tx("เข้า", "Visit");
  el.hidden = false;
}
$("prompt-go").addEventListener("click", () => near && openPlace(near));
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

function openPlace(p) {
  if (p.stone != null) {
    const n = p.stone + 1;
    openDialog(`👣 ${n} · ${esc(L === "en" ? JOURNEY[p.stone][1] : JOURNEY[p.stone][0])}`,
      `<p>${tx("หินก้อนที่ " + n + " บนเส้นทางของฉัน เรื่องนี้อ่านได้ในศาลาเรียนรู้ พร้อมต้นทางและกระจกอีกบาน", "Stone " + n + " on My Journey. Read this story in the Learning Hall, with its source and the other mirror.")}</p>
       <div class="row"><a class="btn" href="index.html#u0${n}">${tx("เปิดเรื่องนี้ →", "Open this story →")}</a><button class="chip" data-close>${tx("เดินต่อ", "Keep walking")}</button></div>`);
  } else {
    openDialog(`${p.icon} ${esc(placeName(p))}`,
      `<p>${esc(p.sub[L === "en" ? 1 : 0])}</p>
       ${p.id === "media" ? `<p class="quiet">${tx("ภาพวงล้อสัมโพธายะที่ผนังศาลานี้ เป็นสื่ออธิบายของวัด ยังรอตรวจ", "The Sambodhaya wheel on this hall's wall is the temple's explanatory media, still under review.")}</p>` : ""}
       ${p.id === "exit" ? `<p>${tx("วันนี้พอแล้วก็ได้", "That's enough for today, if you like.")}</p>` : ""}
       <div class="row"><a class="btn" href="${p.href}">${p.id === "exit" ? tx("ออกจากวัด →", "Leave the temple →") : tx("เข้าไปในศาลา →", "Go inside →")}</a><button class="chip" data-close>${tx("เดินต่อ", "Keep walking")}</button></div>`);
  }
}
function openPlaces(fromDog) {
  const items = PLACES.map((p) => `<li><button data-go="${p.id}"><span class="ic" aria-hidden="true">${p.icon}</span><span>${esc(placeName(p))}</span></button></li>`).join("");
  openDialog(fromDog ? tx("🐕 อยากไปทางไหน?", "🐕 Where would you like to go?") : tx("🗺️ ที่ต่าง ๆ ในวัด", "🗺️ Places in the temple"),
    `${fromDog ? `<p>${tx("เลือกได้เลย ผมพาไป ไม่เลือกอะไรก็ได้นะ", "Pick one and I'll take you there. Choosing nothing is fine too.")}</p>` : `<p>${tx("ไม่อยากเดินแบบ 3 มิติ? เลือกที่หมายแล้ววัดพาไปเลย หรือเปิดหน้าเว็บของศาลานั้นได้", "Prefer not to walk in 3D? Pick a place and the temple takes you there, or open that hall's web page.")}</p>`}
     <ul class="places">${items}</ul>
     <p class="quiet">${tx("🐕 ในต้นแบบนี้ หมาวัดเป็นตัวช่วยบอกทางที่เขียนไว้ล่วงหน้า ยังไม่ใช่ AI", "🐕 In this prototype the temple dog gives pre-written directions; it isn't an AI yet.")}</p>
     <div class="row"><a class="chip" href="index.html" style="text-decoration:none">${tx("ไปหน้าแผนที่วัด (ไม่ใช้ 3 มิติ)", "Go to the temple map (no 3D)")}</a><button class="chip" data-close>${tx("ปิด", "Close")}</button></div>`);
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
  `<p>${tx("⌨️ W A S D หรือปุ่มลูกศร = เดิน • Shift = เดินเร็ว • Space = กระโดด • E = เข้าศาลาที่อยู่ใกล้ • G = เรียกหมาวัด", "⌨️ W A S D or arrow keys = walk • Shift = faster • Space = jump • E = visit the nearby hall • G = call the temple dog")}</p>
   <p>${tx("🖱️ ลากเมาส์ = หมุนมุมมอง • ล้อเมาส์ = ซูม • คลิกหมาวัดหรือศาลา = เปิด", "🖱️ Drag = turn the view • Wheel = zoom • Click the dog or a hall = open it")}</p>
   <p>${tx("📱 จอยซ้ายล่าง = เดิน • ลากจอ = หมุนมุมมอง • ปุ่ม E = เข้า", "📱 Bottom-left stick = walk • Drag the screen = turn the view • E button = visit")}</p>
   <p class="note">${tx("ที่นี่ไม่มีคะแนน ไม่มีของให้เก็บ และไม่มีการแข่งขัน เดินดูตามสบาย และออกได้ทุกเมื่อที่ประตูขวา", "There are no points, nothing to collect and no competition here. Walk around as you like, and leave any time by the right-hand gate.")}</p>
   <div class="row"><button class="chip" data-close>${tx("ปิด", "Close")}</button></div>`));
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
function openAvatar(tab = "build") {
  const tabs = `<div class="tabs" role="tablist">
    <button class="chip${tab === "build" ? " on" : ""}" data-tab="build">🧱 ${tx("สร้างเอง", "Build")}</button>
    <button class="chip${tab === "photo" ? " on" : ""}" data-tab="photo">🖼️ ${tx("รูปเป็นหน้า", "Picture face")}</button>
    <button class="chip${tab === "model" ? " on" : ""}" data-tab="model">🧩 ${tx("ไฟล์ 3 มิติ", "3D file")}</button></div>`;
  let body = "";
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
  dlg.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => openAvatar(b.dataset.tab)));
  dlg.querySelectorAll("[data-sw]").forEach((b) => b.addEventListener("click", () => { avatarCfg = { ...avatarCfg, kind: avatarCfg.kind === "photo" ? "photo" : "blocky", [b.dataset.sw]: b.dataset.c }; write("avatar", avatarCfg); buildBlocky(); openAvatar("build"); }));
  dlg.querySelectorAll("[data-hs]").forEach((b) => b.addEventListener("click", () => { avatarCfg.hairStyle = b.dataset.hs; write("avatar", avatarCfg); buildBlocky(); openAvatar("build"); }));
  dlg.querySelectorAll("[data-face]").forEach((b) => b.addEventListener("click", () => { avatarCfg.face = b.dataset.face; if (avatarCfg.kind === "photo") { avatarCfg.kind = "blocky"; } write("avatar", avatarCfg); buildBlocky(); openAvatar("build"); }));
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
$("btn-avatar").addEventListener("click", () => openAvatar("build"));

/* ---------------- main loop ---------------- */
const clock = new THREE.Clock();
const tmp = new THREE.Vector3();
let walkPhase = 0;
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener("resize", resize); resize();

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  // movement relative to the camera
  let fx = 0, fz = 0;
  if (!dialogOpen()) {
    if (keys.KeyW || keys.ArrowUp) fz -= 1; if (keys.KeyS || keys.ArrowDown) fz += 1;
    if (keys.KeyA || keys.ArrowLeft) fx -= 1; if (keys.KeyD || keys.ArrowRight) fx += 1;
    fx += joy.x; fz += joy.y;
    if ((keys.Space) && player.y <= 0.01) player.vy = 9;
  }
  const mag = Math.min(1, Math.hypot(fx, fz));
  const speed = (keys.ShiftLeft || keys.ShiftRight ? 11 : 6.5) * mag;
  if (mag > 0.05) {
    const s = Math.sin(camYaw), c = Math.cos(camYaw);
    const nx = fx / (Math.hypot(fx, fz) || 1), nz = fz / (Math.hypot(fx, fz) || 1);
    const wx = nx * c + nz * s, wz = -nx * s + nz * c;
    [player.x, player.z] = collide(player.x + wx * speed * dt, player.z + wz * speed * dt);
    const target = Math.atan2(wx, wz);
    let diff = target - player.yaw; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); player.yaw += diff * Math.min(1, dt * 12);
  }
  player.vy -= 25 * dt; player.y = Math.max(0, player.y + player.vy * dt); if (player.y === 0) player.vy = Math.max(0, player.vy);
  player.obj.position.set(player.x, player.y, player.z); player.obj.rotation.y = player.yaw;

  // limb swing for blocky avatars, clips for 3D models
  const moving = mag > 0.05;
  walkPhase += dt * (moving ? speed * 1.6 : 0);
  const limbs = player.model && player.model.userData.limbs;
  if (limbs) {
    const sw = moving ? Math.sin(walkPhase) * 0.7 : 0;
    limbs.legL.rotation.x = sw; limbs.legR.rotation.x = -sw; limbs.armL.rotation.x = -sw * 0.8; limbs.armR.rotation.x = sw * 0.8;
  } else if (player.mixer) { playClip(moving && player.clips.walk ? "walk" : "idle"); player.mixer.update(dt); }
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

  // the dog follows a little behind
  if (dog.obj.visible) {
    // stay ahead-left of the player as seen from the camera, so it never blocks the view
    const fx2 = -Math.sin(camYaw), fz2 = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
    const bx = player.x + fx2 * 1.4 - rx * 2.6, bz = player.z + fz2 * 1.4 - rz * 2.6;
    const ddx = bx - dog.x, ddz = bz - dog.z, dd = Math.hypot(ddx, ddz);
    if (dd > 0.4) { const st = Math.min(dd, dt * (dd > 6 ? 12 : 6)); [dog.x, dog.z] = collide(dog.x + ddx / dd * st, dog.z + ddz / dd * st); dog.yaw = Math.atan2(ddx, ddz); }
    dog.obj.position.set(dog.x, 0, dog.z); dog.obj.rotation.y = dog.yaw;
    if (!settings.calmMotion) dog.tail.rotation.y = Math.sin(performance.now() / 160) * 0.6;
  }

  // nearest place within reach
  let best = null, bestD = Infinity;
  for (const p of PLACES) { const d = Math.hypot(player.x - p.pos[0], player.z - p.pos[1]); if (d < p.r && d < bestD) { best = p; bestD = d; } }
  for (const s of journeyStones) { const d = Math.hypot(player.x - s.x, player.z - s.z); if (d < 2.6 && d < bestD) { best = { ...PLACES.find((p) => p.id === "journey"), stone: s.i }; bestD = d; } }
  if ((best && best.id) !== (near && near.id) || (best && best.stone) !== (near && near.stone)) { near = best; showPrompt(near); }

  // camera follows
  const cx = player.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist;
  const cz = player.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist;
  const cy = player.y + 2 + Math.sin(camPitch) * camDist;
  if (settings.calmMotion) camera.position.set(cx, cy, cz); else camera.position.lerp(tmp.set(cx, cy, cz), Math.min(1, dt * 8));
  camera.lookAt(player.x, player.y + 2.2, player.z);

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

document.fonts.load("64px Itim").then(() => document.fonts.load("36px Mali")).catch(() => {}).finally(() => {
  // redraw sign textures once the Thai fonts are ready
  signDraws.forEach((d) => d());
});
camYaw = 0; camera.position.set(0, 8, 56);
$("loading").hidden = true;
canvas.focus();
requestAnimationFrame(tick);
