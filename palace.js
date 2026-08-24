/* ============================================================================
   Kaleidoscope — the voxel palace on the shore
   ----------------------------------------------------------------------------
   A single scroll is a single camera move, cut into six acts:
     I    the boardwalk, far out over the water
     II   the gate, where the grounds begin
     III  the court of honour, at the foot of the grand stair
     IV   the wings, swinging around the east flank
     V    the garden court, behind the palace
     VI   dusk, the finale three-quarter
   Eleven windows are lit. Each one is a room. Click it to step inside.
   ========================================================================== */

import * as THREE from "three";
import { EffectComposer } from "/vendor/three-examples/postprocessing/EffectComposer.js";
import { RenderPass } from "/vendor/three-examples/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "/vendor/three-examples/postprocessing/UnrealBloomPass.js";

/* ───────────────────────────── rooms ─────────────────────────────
   The eleven rooms are authored as real HTML in index.html (#ledger) and
   read out of the DOM here. One source of truth: what the drawer shows is
   exactly what a search engine, a screen reader, or a browser without WebGL
   gets, because it is the same markup. */

const ROOMS = [...document.querySelectorAll("#ledger .room")].map((el) => ({
  plate: el.dataset.plate || "",
  kicker: el.dataset.kicker || "",
  title: el.querySelector(".room-title").textContent.trim(),
  img: el.querySelector(".room-img")?.getAttribute("src") || null,
  imgAlt: el.querySelector(".room-img")?.getAttribute("alt") || "",
  body: el.querySelector(".room-body").innerHTML,
  href: `#${el.id}`,
}));

if (ROOMS.length !== 11) {
  console.warn(`[palace] expected 11 rooms in #ledger, found ${ROOMS.length}`);
}

/* ───────────────────────── renderer & scene ───────────────────────── */

const canvas = document.getElementById("scene");
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
} catch {
  /* No WebGL: hand the visitor the readable page instead of a broken hero. */
  document.body.classList.add("no-webgl", "ready");
  throw new Error("no webgl");
}

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarsePointer = matchMedia("(pointer: coarse)").matches;
const lowPower = coarsePointer || innerWidth < 760;

/* Chunky voxels gain almost nothing from a 2x buffer, and it is the single
   biggest fill cost in the scene. */
renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1.25 : 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;   // driven by hand in frameStep
renderer.outputColorSpace = THREE.SRGBColorSpace;

/* Bloom is not decoration here — after dark the windows are the only real
   light in the frame, and without it they read as flat yellow rectangles. */
/* A half-float buffer is the whole trick: the window materials are driven
   well past 1.0, the bloom pass sees that headroom, and the cores blow out to
   white with a real halo instead of sitting at flat yellow. */
const hdrTarget = new THREE.WebGLRenderTarget(innerWidth, innerHeight, {
  type: THREE.HalfFloatType,
  samples: lowPower ? 0 : 2,
});
const composer = new EffectComposer(renderer, hdrTarget);
const bloom = new UnrealBloomPass(
  new THREE.Vector2(innerWidth, innerHeight),
  1.1,    // strength — driven by the clock below
  0.85,   // radius
  0.75    // threshold: only genuinely bright things bloom
);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x10122e, 130, 520);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.5, 1600);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(bloom);
composer.setSize(innerWidth, innerHeight);

const hemi = new THREE.HemisphereLight(0xbfd7ff, 0x54432e, 0.9);
scene.add(hemi);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
keyLight.castShadow = true;
/* Voxel shadows are chunky by design, so a 1024 map is plenty and costs a
   quarter of the fill a 2048 one does. */
keyLight.shadow.mapSize.set(lowPower ? 768 : 1024, lowPower ? 768 : 1024);
Object.assign(keyLight.shadow.camera, {
  left: -115, right: 115, top: 165, bottom: -95, near: 20, far: 640,
});
keyLight.shadow.camera.updateProjectionMatrix();
keyLight.shadow.bias = -0.0006;
keyLight.shadow.normalBias = 0.4;
scene.add(keyLight, keyLight.target);

/* a soft counter-fill: at sunset the shaded faces were going to mud */
const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
scene.add(fillLight, fillLight.target);

/* Lamps inside the lit storeys. Without these the tower is a black slab at
   night — these are what wash the facade orange around each window. */
const storeyLamps = [];
for (let i = 0; i < 6; i++) {
  const l = new THREE.PointLight(0xffb45e, 0, 62, 2);
  storeyLamps.push(l);
  scene.add(l);
}

/* warm spill from the great door, at night */
const doorGlow = new THREE.PointLight(0xffb45e, 0, 70, 2);
doorGlow.position.set(0, 8, 14);
scene.add(doorGlow);

/* ───────────────────────────── sky ───────────────────────────── */

const SUNSET_WARM = new THREE.Color(0xffb37a);
const SKY_KEYS = [
  [0.0, 0x060a1e], [0.17, 0x101736], [0.215, 0xb2635f], [0.28, 0x86b8db],
  [0.5, 0x9ad2ec], [0.79, 0x93c9e8], [0.83, 0xdcb287], [0.858, 0xf09a5c],
  [0.885, 0x7d4a68], [0.903, 0x2b2043], [0.925, 0x0d0a1b], [0.950, 0x040409], [1.0, 0x020205],
].map(([t, c]) => ({ t, c: new THREE.Color(c) }));

function sampleSkyInto(out, t) {
  for (let i = 0; i < SKY_KEYS.length - 1; i++) {
    const a = SKY_KEYS[i], b = SKY_KEYS[i + 1];
    if (t >= a.t && t <= b.t) return out.copy(a.c).lerp(b.c, (t - a.t) / (b.t - a.t));
  }
  return out.copy(SKY_KEYS[0].c);
}

const starMat = new THREE.PointsMaterial({
  color: 0xdfe8ff, size: 2.4, sizeAttenuation: false,
  transparent: true, opacity: 0, fog: false, depthWrite: false,
});
{
  const n = 900;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(700 + Math.random() * 120);
    v.y = Math.abs(v.y) + 40;
    pos.set([v.x, v.y, v.z], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(g, starMat);
  stars.frustumCulled = false;
  scene.add(stars);
}

/* a real gradient sky — a flat background colour was flattening every shot */
const skyUniforms = {
  uTop: { value: new THREE.Color(0x2f6ec4) },
  uBottom: { value: new THREE.Color(0x9ad2ec) },
  uSun: { value: new THREE.Vector3(0, 1, 0) },
  uSunColor: { value: new THREE.Color(0xffd9a0) },
  uSunStrength: { value: 0.5 },
};
const skyDome = new THREE.Mesh(
  new THREE.SphereGeometry(1000, 32, 20),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: skyUniforms,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uTop, uBottom, uSunColor, uSun;
      uniform float uSunStrength;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 c = mix(uBottom, uTop, pow(smoothstep(0.44, 1.0, h), 0.85));
        float s = max(dot(d, normalize(uSun)), 0.0);
        c += uSunColor * pow(s, 9.0) * uSunStrength;          // the disc's bloom
        c += uSunColor * pow(s, 2.2) * uSunStrength * 0.2;    // the wide wash
        gl_FragColor = vec4(c, 1.0);
      }`,
  })
);
skyDome.frustumCulled = false;
skyDome.renderOrder = -1;
scene.add(skyDome);
const ZENITH_DAY = new THREE.Color(0x2f6ec4);
const ZENITH_NIGHT = new THREE.Color(0x000001);

const sunDisc = new THREE.Mesh(
  new THREE.SphereGeometry(18, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xffd98a, fog: false })
);
const sunHalo = new THREE.Mesh(
  new THREE.SphereGeometry(34, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xffc978, fog: false, transparent: true, opacity: 0.22 })
);
const moonDisc = new THREE.Mesh(
  new THREE.SphereGeometry(11, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xdfe6ff, fog: false })
);
scene.add(sunDisc, sunHalo, moonDisc);

/* ───────────────────────────── palette ─────────────────────────────
   Ukrainian Baroque, off Kyiv rather than Moscow: Mariinskyi Palace
   turquoise, St. Andrew's gold and deep green, white pilasters. */

const C = {
  wall: 0x4fa6a0, wall2: 0x479a95, wallDk: 0x3d8b87,
  white: 0xf4f2ea, white2: 0xe9e5d8, whiteDk: 0xd8d3c2,
  gold: 0xe8b64c, goldLt: 0xffd782, goldDk: 0xc0912f,
  roof: 0x2f6b58, roofDk: 0x275a4a, roofLt: 0x3a7d67,
  stone: 0x7d7f86, stoneLt: 0x9a9ba1, stoneDk: 0x66686e,
  paving: [0xd9d3c4, 0xcdc6b5, 0xe2ddce],
  grass: [0x5f9e55, 0x69a95c, 0x568f4d, 0x64a459],
  sand: [0xe7d9a8, 0xdccb96, 0xefe3b8],
  hedge: [0x3f7a44, 0x37703d, 0x468a49],
  leaf: [0x4e9450, 0x58a058, 0x468a49],
  blossom: [0xe8a0c8, 0xdd8ebb, 0xf2b6d6, 0xc97fae],
  trunk: 0x7a5230,
  plank: [0xa5793f, 0x966c37, 0xb08549],
  pole: 0x45454f,
  water: 0x3f97c4,
  flowers: [0xe05252, 0xe8b64c, 0xd97fb0, 0xf3f0e4, 0x9d6fc4],
};

let seed = 1337;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = (a) => a[(rand() * a.length) | 0];

/* ───────────────────── voxel primitives ─────────────────────
   Everything is authored on an integer grid, then rendered at half a world
   unit per block. Twice the resolution of a naive voxel scene: fine enough
   for a moulding or an onion dome's curve, coarse enough to still read as
   blocks. */

const VOX = 0.5;
const w = (grid) => grid * VOX;          // grid → world
const gr = (world) => Math.round(world / VOX); // world → grid

const VOXELS = [];
/* one voxel per cell: a call onto an occupied cell is dropped, so earlier
   structures keep their place and the roof slabs below can be poured in
   afterwards without z-fighting where they meet walls and towers */
const placed = new Set();
const box = (x, y, z, c) => {
  const k = ((x + 512) * 2048 + (y + 512)) * 2048 + (z + 512);
  if (placed.has(k)) return;
  placed.add(k);
  VOXELS.push({ x, y, z, c });
};
const col = (c, x, y, z) => (typeof c === "function" ? c(x, y, z) : c);

function slab(x0, x1, z0, z1, y, c) {
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) box(x, y, z, col(c, x, y, z));
}
/** hollow rectangular tube — a building's walls, no floor or ceiling */
function walls(x0, x1, z0, z1, y0, y1, c) {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      for (let z = z0; z <= z1; z++)
        if (x === x0 || x === x1 || z === z0 || z === z1) box(x, y, z, col(c, x, y, z));
}
const frame = (x0, x1, z0, z1, y, c) => walls(x0, x1, z0, z1, y, y, c);

function disc(cx, cz, y, r, c) {
  const R = Math.ceil(r);
  for (let dx = -R; dx <= R; dx++)
    for (let dz = -R; dz <= R; dz++)
      if (dx * dx + dz * dz <= r * r + 0.01) box(cx + dx, y, cz + dz, col(c, dx, y, dz));
}
function ring(cx, cz, y, r, thick, c) {
  const R = Math.ceil(r);
  const inner = Math.max(0, r - thick);
  for (let dx = -R; dx <= R; dx++)
    for (let dz = -R; dz <= R; dz++) {
      const d2 = dx * dx + dz * dz;
      if (d2 <= r * r + 0.01 && d2 > inner * inner) box(cx + dx, y, cz + dz, col(c, dx, y, dz));
    }
}
const cylinder = (cx, cz, y0, y1, r, c) => {
  for (let y = y0; y <= y1; y++) ring(cx, cz, y, r, 2.4, c);
};

/** A cornice: a stack of slightly-stepped rings, the way a real one oversails. */
function cornice(x0, x1, z0, z1, y, steps, c) {
  for (let i = 0; i < steps; i++) {
    const o = i <= steps / 2 ? i : steps - i - 1;
    frame(x0 - o, x1 + o, z0 - o, z1 + o, y + i, typeof c === "function" ? c(i) : c);
  }
}

/* ── the onion dome ──
   The profile is the whole point: a narrow neck at the drum, a bulge above
   it, then a long taper to the finial. A hemisphere would read as Roman. */
const ONION = [
  [0.00, 0.60], [0.07, 0.80], [0.15, 0.95], [0.24, 1.00], [0.34, 0.99],
  [0.45, 0.92], [0.56, 0.80], [0.66, 0.66], [0.75, 0.52], [0.83, 0.38],
  [0.90, 0.25], [0.96, 0.13], [1.00, 0.05],
];
function onionRadius(u) {
  for (let i = 0; i < ONION.length - 1; i++) {
    const [a, ar] = ONION[i], [b, br] = ONION[i + 1];
    if (u >= a && u <= b) return ar + ((br - ar) * (u - a)) / (b - a);
  }
  return 0.05;
}
function onionDome(cx, cz, baseY, R, shell, rib) {
  const H = Math.round(R * 1.75);
  for (let k = 0; k <= H; k++) {
    const u = k / H;
    const r = R * onionRadius(u);
    const rNext = R * onionRadius(Math.min(1, (k + 1) / H));
    if (r < 1.2) { disc(cx, cz, baseY + k, 1.2, rib); continue; }
    const thick = Math.max(2.2, Math.abs(r - rNext) + 1.8);
    ring(cx, cz, baseY + k, r, thick, (dx, _y, dz) => {
      const ax = Math.abs(dx), az = Math.abs(dz);
      /* eight gilded ribs; between them, flutes in alternating gold.
         Deterministic, not random — noise here reads as a moth-eaten dome. */
      if (ax < 1.4 || az < 1.4 || Math.abs(ax - az) < 1.4) return rib;
      const band = Math.floor((Math.atan2(dz, dx) + Math.PI) / (Math.PI / 8)) % 2;
      return band ? shell : C.goldDk;
    });
  }
  return baseY + H;
}
/** the cross above every dome */
function crossFinial(cx, cz, y, h = 10) {
  for (let k = 0; k < h; k++) box(cx, y + k, cz, k < 2 ? C.goldDk : C.gold);
  const armY = y + h - 4;
  for (let d = -2; d <= 2; d++) box(cx + d, armY, cz, C.gold);
  box(cx, y + h, cz, C.goldLt);
}

/* ═══════════════════════════ THE GROUNDS ═══════════════════════════
   Terrain is one nearest-filtered canvas on a plane, drawn at the same
   resolution as the voxel grid so the two read as one material. */

const G = { x0: -110, x1: 110, z0: -110, z1: 110 };
const PX = 1 / VOX;                       // texels per world unit
const GW = (G.x1 - G.x0) * PX, GH = (G.z1 - G.z0) * PX;

const shoreNoise = (a) => Math.sin(a * 3.1) * 5 + Math.sin(a * 7.7 + 1.3) * 3.4 + Math.sin(a * 1.7) * 6;
function isLand(x, z) {
  const a = Math.atan2(z, x);
  const rx = 100 + shoreNoise(a), rz = 104 + shoreNoise(a + 2.1);
  return (x * x) / (rx * rx) + (z * z) / (rz * rz) <= 1;
}
function shoreDist(x, z) {
  const a = Math.atan2(z, x);
  const rx = 100 + shoreNoise(a), rz = 104 + shoreNoise(a + 2.1);
  const t = Math.sqrt((x * x) / (rx * rx) + (z * z) / (rz * rz));
  return (1 - t) * Math.min(rx, rz);
}

function buildGroundTexture() {
  const cv = document.createElement("canvas");
  cv.width = GW; cv.height = GH;
  const ctx = cv.getContext("2d");
  const img = ctx.createImageData(GW, GH);
  const d = img.data;
  const put = (px, py, hex, alpha = 255) => {
    const i = (py * GW + px) * 4;
    d[i] = (hex >> 16) & 255; d[i + 1] = (hex >> 8) & 255; d[i + 2] = hex & 255; d[i + 3] = alpha;
  };

  for (let py = 0; py < GH; py++) {
    for (let px = 0; px < GW; px++) {
      const x = G.x0 + (px + 0.5) * VOX;
      const z = G.z0 + (py + 0.5) * VOX;
      if (!isLand(x, z)) { put(px, py, 0, 0); continue; }

      const sd = shoreDist(x, z);
      let c;
      if (sd < 5) c = pick(C.sand);
      else if (sd < 8 && rand() < 0.5) c = pick(C.sand);
      else c = pick(C.grass);

      const onAvenue = Math.abs(x) <= 17 && z > 22 && z < 92;
      const onPlaza = Math.abs(x) <= 30 && z >= 80 && z <= 94;
      const onApron = Math.abs(x) <= 34 && z > 18 && z <= 54;
      if (onAvenue || onPlaza || onApron) {
        const chk = ((Math.floor(x / 3) + Math.floor(z / 3)) & 1) === 0;
        c = chk ? pick([C.paving[0], C.paving[2]]) : pick([C.paving[1], C.paving[0]]);
      }
      if (Math.abs(x) <= 11 && z >= 56 && z <= 82) c = Math.abs(x) >= 10 ? C.stoneDk : 0x1f5f7e;

      const inParterreZ = z > 26 && z < 84;
      const inParterreX = Math.abs(x) > 22 && Math.abs(x) < 62;
      if (inParterreZ && inParterreX) {
        const lx = (Math.abs(x) - 22) % 21, lz = (z - 26) % 20;
        const edge = lx < 1.6 || lx > 19.4 || lz < 1.6 || lz > 18.4;
        const inner = Math.abs(lx - 10.5) < 2.4 && Math.abs(lz - 10) < 2.4;
        if (edge) c = pick(C.hedge);
        else if (inner) c = pick(C.flowers);
        else if (rand() < 0.04) c = pick(C.flowers);
        else c = pick(C.grass);
      }
      /* the boardwalk deck, painted rather than built — 40k voxels saved */
      if (Math.abs(x) <= 8 && z > 92) c = pick(C.plank);
      put(px, py, c);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const groundTex = buildGroundTexture();
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(G.x1 - G.x0, G.z1 - G.z0),
  new THREE.MeshLambertMaterial({ map: groundTex, alphaTest: 0.5 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.set(0, 0, 0);
ground.receiveShadow = true;
scene.add(ground);
{
  const skirt = ground.clone();
  skirt.material = new THREE.MeshLambertMaterial({ map: groundTex, alphaTest: 0.5, color: 0x8a7c5e });
  skirt.position.y = -1.6;
  skirt.receiveShadow = false;
  skirt.scale.setScalar(1.004);
  scene.add(skirt);
}
/* the deck runs out past the island, over open water */
{
  const deck = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 170),
    new THREE.MeshLambertMaterial({ color: C.plank[0] })
  );
  deck.rotation.x = -Math.PI / 2;
  deck.position.set(0, 0.02, 165);
  deck.receiveShadow = true;
  scene.add(deck);
}

const seaMat = new THREE.MeshLambertMaterial({ color: C.water });
const sea = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), seaMat);
sea.rotation.x = -Math.PI / 2;
sea.position.y = -1.9;
scene.add(sea);

const basinMat = new THREE.MeshLambertMaterial({ color: 0x53b0d8 });
const basin = new THREE.Mesh(new THREE.PlaneGeometry(19, 24), basinMat);
basin.rotation.x = -Math.PI / 2;
basin.position.set(0, 0.4, 69);
scene.add(basin);

/* ═══════════════════════════ THE PALACE ═══════════════════════════
   Eleven storeys, each one an information panel. Three tiers with
   setbacks, gold onion domes above, low wings either side so it still
   reads as a palace rather than a tower. Grid units: 2 per world unit. */

/* tier: [halfX, halfZ, firstFloor, floorCount] in grid units */
const TIERS = [
  { hx: 56, hz: 40, y0: 10, floors: 5 },
  { hx: 44, hz: 32, y0: 65, floors: 3 },
  { hx: 32, hz: 26, y0: 98, floors: 3 },
];
const FLOOR_H = 11;                       // grid units — 5.5 world
const FLOORS = [];                        // one entry per storey, filled below

/* which face each storey's lit window sits on, following the camera's climb */
const FLOOR_FACE = ["z+", "z+", "x+", "x+", "x+", "z-", "z-", "x-", "x-", "x-", "z+"];
/* how far along its face each storey's window sits — the lowest two step
   aside so they do not land on top of the great door */
const FLOOR_ALONG = [-26, 26, 0, 0, 0, 0, 0, 0, 0, 0, 0];

/* ── plinth ── */
walls(-64, 64, -48, 48, 0, 9, (x, y) => (y >= 8 ? C.stoneLt : pick([C.stone, C.stoneDk])));
cornice(-64, 64, -48, 48, 10, 3, (i) => (i === 1 ? C.gold : C.white));

/* ── the storeys ── */
function storeyWall(hx, hz, y0, y1) {
  walls(-hx, hx, -hz, hz, y0, y1, (x, y, z) => {
    /* white pilasters every eight grid units, turquoise panels between */
    const onEdge = Math.abs(x) === hx || Math.abs(z) === hz;
    const along = Math.abs(x) === hx ? z : x;
    const pilaster = Math.abs(along) % 8 < 2 || Math.abs(Math.abs(along) - hx) < 2;
    if (!onEdge) return C.wall;
    if (pilaster) return y % 3 === 0 ? C.white : C.white2;
    if (y === y0) return C.whiteDk;
    return pick([C.wall, C.wall, C.wall2, C.wallDk]);
  });
}

let floorIndex = 0;
for (const tier of TIERS) {
  for (let f = 0; f < tier.floors; f++) {
    const y0 = tier.y0 + f * FLOOR_H;
    const y1 = y0 + FLOOR_H - 1;
    storeyWall(tier.hx, tier.hz, y0, y1 - 3);
    /* every storey is banded top and bottom so the count is legible */
    frame(-tier.hx, tier.hz * 0 + tier.hx, -tier.hz, tier.hz, y1 - 2, C.white);
    cornice(-tier.hx, tier.hx, -tier.hz, tier.hz, y1 - 1, 2, (i) => (i ? C.gold : C.white));
    FLOORS.push({
      n: floorIndex + 1,
      hx: tier.hx, hz: tier.hz,
      y0, y1,
      winY: w(y0 + 6),
      face: FLOOR_FACE[floorIndex],
      along: FLOOR_ALONG[floorIndex],
    });
    floorIndex++;
  }
  /* the setback above each tier gets a balustrade */
  const top = tier.y0 + tier.floors * FLOOR_H;
  for (let o = 0; o <= 4; o++)
    frame(-tier.hx - 2 + o, tier.hx + 2 - o, -tier.hz - 2 + o, tier.hz + 2 - o, top, C.stoneLt);
  for (let i = 0; i < 2; i++)
    frame(-tier.hx - 2, tier.hx + 2, -tier.hz - 2, tier.hz + 2, top + 1 + i,
      (x, y, z) => ((x + z) % 4 === 0 ? C.gold : C.white));
}

/* ── attic, drum, and the great onion ── */
const TOP = TIERS[2].y0 + TIERS[2].floors * FLOOR_H;   // 142
walls(-26, 26, -22, 22, TOP + 3, TOP + 12, (x, y) => (y > TOP + 10 ? C.white : pick([C.wall, C.wall2])));
cornice(-26, 26, -22, 22, TOP + 13, 3, (i) => (i === 1 ? C.gold : C.white));

/* an arcaded drum: white piers with turquoise between, gold above and below */
cylinder(0, 0, TOP + 16, TOP + 30, 20, (dx, y, dz) => {
  if (y === TOP + 30 || y === TOP + 16) return C.gold;
  const a = Math.atan2(dz, dx);
  return Math.abs(Math.sin(a * 6)) > 0.86 ? C.white : C.wall;
});
ring(0, 0, TOP + 31, 21, 3, C.gold);
const domeTop = onionDome(0, 0, TOP + 32, 22, C.gold, C.goldLt);
crossFinial(0, 0, domeTop + 1, 14);

/* four lesser onions on the corners of the second setback */
[[-40, -28], [40, -28], [-40, 28], [40, 28]].forEach(([cx, cz]) => {
  cylinder(cx, cz, TOP - 40, TOP - 30, 7, (dx, y) => (y === TOP - 30 ? C.gold : C.white));
  const t = onionDome(cx, cz, TOP - 29, 8, C.gold, C.goldLt);
  crossFinial(cx, cz, t + 1, 8);
});

/* ── the great door and its stair ── */
{
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x53341c });
  [-1.6, 1.6].forEach((dx) => {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(2.9, 7.5, 0.5), doorMat);
    leaf.position.set(dx, 8.2, w(40) + 0.3);
    scene.add(leaf);
  });
  /* gilded arch over the door */
  for (let k = 0; k <= 9; k++) {
    const a = (k / 9) * Math.PI;
    const x = Math.round(Math.cos(a) * 8), y = 24 + Math.round(Math.sin(a) * 8);
    box(x, y, 40, C.gold);
    box(x, y, 39, C.goldDk);
  }
  for (let y = 10; y <= 24; y++) { box(-8, y, 40, C.gold); box(8, y, 40, C.gold); }
}
/* the stair down to the court */
for (let s = 0; s < 5; s++) {
  const y = 9 - s * 2;
  const z0 = 49 + s * 3;
  slab(-24 - s * 2, 24 + s * 2, z0, z0 + 2, y, (x) => (Math.abs(x) % 8 < 2 ? C.white : pick(C.paving)));
  slab(-24 - s * 2, 24 + s * 2, z0, z0 + 2, y - 1, C.stone);
}

/* ── the wings ── */
function wing(sx) {
  const x0 = sx > 0 ? 62 : -104, x1 = sx > 0 ? 104 : -62;
  walls(x0, x1, -28, 28, 6, 33, (x, y, z) => {
    const onEdge = x === x0 || x === x1 || Math.abs(z) === 28;
    if (!onEdge) return C.wall;
    const along = Math.abs(z) === 28 ? x : z;
    if (Math.abs(along) % 9 < 2) return y % 3 === 0 ? C.white : C.white2;
    if (y === 6) return C.whiteDk;
    return pick([C.wall, C.wall, C.wall2]);
  });
  frame(x0, x1, -28, 28, 20, C.white);
  cornice(x0, x1, -28, 28, 34, 3, (i) => (i === 1 ? C.gold : C.white));
  slab(x0 + 1, x1 - 1, -27, 27, 37, () => pick([C.roof, C.roofDk, C.roofLt]));
  for (let i = 0; i < 3; i++)
    frame(x0 - 1 + i, x1 + 1 - i, -29 + i, 29 - i, 38 + i, () => pick([C.roof, C.roofDk]));

  /* ground arcade along the courtyard face */
  for (let x = x0 + 6; x <= x1 - 6; x += 9) {
    for (let z = 30; z <= 31; z++)
      for (let y = 6; y <= 19; y++) box(x, y, z, y % 3 === 0 ? C.white : C.white2);
    for (let k = 0; k <= 6; k++) {
      const a = (k / 6) * Math.PI;
      box(x + Math.round(Math.cos(a) * 4), 20 + Math.round(Math.sin(a) * 4), 31, C.white);
    }
  }
  slab(x0, x1, 29, 32, 25, C.gold);
  slab(x0, x1, 29, 32, 26, C.white);

  /* an end pavilion with its own onion */
  const cx = sx > 0 ? 92 : -92;
  walls(cx - 12, cx + 12, -30, 30, 6, 45, (x, y, z) => {
    const onEdge = Math.abs(x - cx) === 12 || Math.abs(z) === 30;
    if (!onEdge) return C.wall;
    const along = Math.abs(x - cx) === 12 ? z : x - cx;
    return Math.abs(along) % 9 < 2 ? C.white : pick([C.wall, C.wall2]);
  });
  cornice(cx - 12, cx + 12, -30, 30, 46, 3, (i) => (i === 1 ? C.gold : C.white));
  cylinder(cx, 0, 49, 55, 8, (dx, y) => (y === 55 ? C.gold : C.white));
  const t = onionDome(cx, 0, 56, 9, C.gold, C.goldLt);
  crossFinial(cx, 0, t + 1, 8);
}
wing(1); wing(-1);

/* ═══════════════════════════ THE APPROACH ═══════════════════════════ */

/* ── the gate ── */
[-1, 1].forEach((s) => {
  const cx = s * 38;
  walls(cx - 6, cx + 6, 168, 180, 0, 34, (x, y) =>
    y > 30 ? C.white : Math.abs(x - cx) === 6 ? pick([C.wall, C.wall2]) : C.wall);
  cornice(cx - 6, cx + 6, 168, 180, 35, 3, (i) => (i === 1 ? C.gold : C.white));
  const t = onionDome(cx, 174, 39, 5, C.gold, C.goldLt);
  crossFinial(cx, 174, t + 1, 6);
});
[-1, 1].forEach((s) => {
  for (let x = 46; x <= 124; x++) {
    const gx = s * x;
    for (let y = 0; y <= 3; y++) box(gx, y, 174, x % 12 < 2 ? C.white : pick([C.stone, C.stoneLt]));
    if (x % 12 < 2) { box(gx, 4, 174, C.gold); box(gx, 5, 174, C.goldLt); }
  }
});

/* ── roofs ──
   walls() raises hollow tubes, and every setback left the top open: from
   above, the eye went straight down the shell to the grass at the bottom.
   One slab per open top, poured in after everything else — cells already
   claimed by walls, drums and balustrades stay theirs. Roof colours come
   from a private RNG so the shared rand() sequence (window lights, petals)
   is untouched. */
{
  let rs = 20260823;
  const rc = () => ((rs = (rs * 16807) % 2147483647) / 2147483647);
  const roofC = () => [C.roof, C.roofDk, C.roofLt][(rc() * 3) | 0];
  const terraceC = () => [C.stone, C.stoneLt, C.stoneDk][(rc() * 3) | 0];

  /* the plinth terrace around the tower's foot */
  slab(-63, 63, -47, -41, 9, terraceC);
  slab(-63, 63, 41, 47, 9, terraceC);
  slab(-63, -57, -40, 40, 9, terraceC);
  slab(57, 63, -40, 40, 9, terraceC);

  /* one roof per setback, flush inside the storey cornice */
  for (const tier of TIERS)
    slab(-tier.hx, tier.hx, -tier.hz, tier.hz, tier.y0 + tier.floors * FLOOR_H - 1, roofC);

  /* attic floor behind the parapet, and a gilded cap sealing the drum */
  slab(-25, 25, -21, 21, TOP + 15, roofC);
  disc(0, 0, TOP + 31, 21, C.gold);

  /* the wing pavilions and the gate towers */
  [-92, 92].forEach((cx) => slab(cx - 11, cx + 11, -29, 29, 48, roofC));
  [-38, 38].forEach((cx) => slab(cx - 5, cx + 5, 169, 179, 37, roofC));
}

/* ── allée, lamps, statues ── */
function cypress(cx, cz, h = 22) {
  for (let y = 0; y <= 3; y++) box(cx, y, cz, C.trunk);
  for (let y = 4; y <= h; y++) {
    const t = (y - 4) / (h - 4);
    const r = Math.max(0, Math.round((1 - t) * 3.4) + (t < 0.15 ? 0 : 0));
    for (let dx = -r; dx <= r; dx++)
      for (let dz = -r; dz <= r; dz++)
        if (dx * dx + dz * dz <= r * r + 0.4) box(cx + dx, y, cz + dz, pick(C.hedge));
  }
}
function roundTree(tx, tz, palette = C.leaf) {
  for (let y = 0; y <= 7; y++) box(tx, y, tz, C.trunk);
  for (let k = 0; k <= 7; k++) {
    const r = Math.round(4.6 * Math.sin(((k + 1) / 9) * Math.PI));
    const rIn = Math.round(4.6 * Math.sin(((k + 2) / 9) * Math.PI)) - 2;
    for (let dx = -r; dx <= r; dx++)
      for (let dz = -r; dz <= r; dz++) {
        const d2 = dx * dx + dz * dz;
        if (d2 > r * r + 0.5) continue;
        if (k < 6 && rIn > 0 && d2 < rIn * rIn) continue;
        box(tx + dx, 7 + k, tz + dz, pick(palette));
      }
  }
}
const lampHeads = [];
const lampMat = new THREE.MeshBasicMaterial({ color: 0x2e3d55 });
function lamp(lx, lz, base = 0) {
  for (let y = base; y <= base + 9; y++) box(lx, y, lz, C.pole);
  box(lx, base + 10, lz, C.goldDk);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.9), lampMat);
  head.position.set(w(lx), w(base + 12), w(lz));
  lampHeads.push(head);
  scene.add(head);
}
for (let z = 194; z <= 256; z += 15) { cypress(-40, z); cypress(40, z); }
for (let z = 66; z <= 122; z += 28) { lamp(-26, z); lamp(26, z); }
[[-140, 80, 1], [140, 80, 1], [-152, -20, 0], [152, -20, 0], [-128, 148, 1], [128, 148, 1],
 [-116, -120, 0], [116, -120, 0], [-40, -148, 1], [40, -148, 1], [0, -160, 0],
 [-96, 96, 1], [96, 96, 1], [-168, 40, 0], [168, 40, 0]]
  .forEach(([x, z, isBlossom]) => roundTree(x, z, isBlossom ? C.blossom : C.leaf));

function statue(sx, sz) {
  for (let y = 0; y <= 7; y++) frame(sx - 3, sx + 3, sz - 3, sz + 3, y, y === 7 ? C.white : C.stoneLt);
  const g = new THREE.Group();
  const m = new THREE.MeshLambertMaterial({ color: C.white });
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.5, 0.7), m); legs.position.y = 0.75;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.7, 0.8), m); torso.position.y = 2.4;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.8, 0.75), m); head.position.y = 3.7;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.5, 0.45), m);
  armL.position.set(-0.85, 2.9, 0); armL.rotation.z = 0.7;
  const armR = armL.clone(); armR.position.x = 0.85; armR.rotation.z = -0.7;
  g.add(legs, torso, head, armL, armR);
  g.position.set(w(sx), w(8), w(sz));
  g.rotation.y = Math.PI;
  g.traverse((o) => { o.castShadow = true; });
  scene.add(g);
}
[54, 76, 98].forEach((z) => { statue(-48, z); statue(48, z); });

/* basin rim and fountains */
frame(-22, 22, 110, 166, 0, C.stoneDk);
frame(-24, 24, 108, 168, 0, C.white);
const jets = [];
const jetMat = new THREE.MeshBasicMaterial({ color: 0xdff2ff, transparent: true, opacity: 0.5, depthWrite: false });
[124, 140, 156].forEach((jz) => {
  disc(0, jz, 1, 5, (dx, _y, dz) => (dx * dx + dz * dz > 10 ? C.white : 0x1f5f7e));
  for (let y = 2; y <= 6; y++) box(0, y, jz, y > 4 ? C.gold : C.stoneLt);
  for (let i = 0; i < 3; i++) {
    const jet = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3, 0.22), jetMat);
    jet.position.set((i - 1) * 0.9, 5.5, w(jz));
    jet.userData.phase = i * 1.3 + jz;
    jets.push(jet);
    scene.add(jet);
  }
});

/* ── the boardwalk railings (the deck itself is painted on) ── */
for (let z = 192; z <= 490; z += 12) {
  [-18, 18].forEach((x) => { for (let y = -6; y <= 4; y++) box(x, y, z, C.pole); });
  box(-18, 5, z, C.goldDk); box(18, 5, z, C.goldDk);
}
[-18, 18].forEach((x) => {
  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.35, 158),
    new THREE.MeshLambertMaterial({ color: 0x8a6434 })
  );
  rail.position.set(w(x), w(7), 171);
  rail.castShadow = true;
  scene.add(rail);
});
for (let z = 200; z <= 488; z += 36) { lamp(-18, z, 3); lamp(18, z, 3); }

/* ── sailboats ── */
const boats = [];
function sailboat(bx, bz, rot, scale = 1) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(7, 2.2, 3), new THREE.MeshLambertMaterial({ color: 0x7a4b28 }));
  hull.position.y = 1;
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.35, 9, 0.35), new THREE.MeshLambertMaterial({ color: 0x5a3a20 }));
  mast.position.y = 6.4;
  const sail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5.4, 3.8), new THREE.MeshLambertMaterial({ color: 0xf7f2e2 }));
  sail.position.set(0, 7, 1.6);
  g.add(hull, mast, sail);
  g.traverse((o) => { o.castShadow = true; });
  g.position.set(bx, -1.2, bz);
  g.rotation.y = rot;
  g.scale.setScalar(scale);
  boats.push(g);
  scene.add(g);
}
sailboat(46, 128, 0.5); sailboat(-52, 150, -0.9, 1.2);
sailboat(96, 74, 1.8, 0.9); sailboat(-104, 46, 0.3, 1.1);
sailboat(70, -108, -1.2, 1.3);

/* ── far headlands, on a coarse grid of their own ── */
const BIG = [];
const STEP = 8;
function headland(cx, cz, R, h, base) {
  const layers = Math.max(2, Math.round(h / STEP));
  for (let k = 0; k <= layers; k++) {
    const r = R * (1 - k / (layers + 0.55));
    const rIn = R * (1 - (k + 1) / (layers + 0.55));
    const cells = Math.ceil(r / STEP);
    const c = new THREE.Color(base).offsetHSL(0, 0, k * 0.03).getHex();
    for (let dx = -cells; dx <= cells; dx++)
      for (let dz = -cells; dz <= cells; dz++) {
        const d2 = (dx * STEP) ** 2 + (dz * STEP) ** 2;
        if (d2 > r * r) continue;
        if (k < layers && d2 < (rIn - STEP * 1.2) ** 2) continue;
        BIG.push({ x: cx + dx * STEP, y: (k - 1) * STEP, z: cz + dz * STEP, c });
      }
  }
}
headland(-300, -210, 150, 46, 0x3d7455);
headland(-40, -360, 210, 62, 0x37694f);
headland(270, -250, 130, 38, 0x3d7455);
headland(360, 70, 120, 30, 0x41795a);
{
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(STEP, STEP, STEP),
    new THREE.MeshLambertMaterial({ color: 0xffffff }),
    BIG.length
  );
  const m = new THREE.Matrix4(), c = new THREE.Color();
  BIG.forEach((s, i) => {
    m.makeTranslation(s.x, s.y + STEP / 2, s.z);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.setHex(s.c));
  });
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
}

/* ═════════════════ commit every voxel to one instanced mesh ═════════════════ */

const solidMesh = new THREE.InstancedMesh(
  new THREE.BoxGeometry(VOX, VOX, VOX),
  new THREE.MeshLambertMaterial({ color: 0xffffff }),
  VOXELS.length
);
solidMesh.castShadow = true;
solidMesh.receiveShadow = true;
{
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  VOXELS.forEach((s, i) => {
    m.makeTranslation(w(s.x), w(s.y) + VOX / 2, w(s.z));
    solidMesh.setMatrixAt(i, m);
    solidMesh.setColorAt(i, c.setHex(s.c));
  });
}
solidMesh.instanceMatrix.needsUpdate = true;
scene.add(solidMesh);
if (new URLSearchParams(location.search).has("stats")) console.log(`[palace] ${VOXELS.length} voxels`);

/* ═══════════════════════════ WINDOWS ═══════════════════════════ */

const WIN_DAY = new THREE.Color(0x2a3850);
const WIN_NIGHT = new THREE.Color(0xffd9a4);

const NORMALS = {
  "z+": new THREE.Vector3(0, 0, 1), "z-": new THREE.Vector3(0, 0, -1),
  "x+": new THREE.Vector3(1, 0, 0), "x-": new THREE.Vector3(-1, 0, 0),
};
const faceYaw = (f) => (f === "x+" ? Math.PI / 2 : f === "x-" ? -Math.PI / 2 : f === "z-" ? Math.PI : 0);

/** the outward point on a storey's face, in world units */
function facePoint(floor, face, alongGrid, worldY) {
  const { hx, hz } = floor;
  if (face === "z+") return new THREE.Vector3(w(alongGrid), worldY, w(hz) + 0.35);
  if (face === "z-") return new THREE.Vector3(w(alongGrid), worldY, -w(hz) - 0.35);
  if (face === "x+") return new THREE.Vector3(w(hx) + 0.35, worldY, w(alongGrid));
  return new THREE.Vector3(-w(hx) - 0.35, worldY, w(alongGrid));
}

/* ── the ordinary windows: one shared material, so dusk is a single write ── */
const decorMat = new THREE.MeshBasicMaterial({ color: 0x2a3850 });
const DECOR = [];
for (const fl of FLOORS) {
  for (const face of ["z+", "z-", "x+", "x-"]) {
    const half = face[0] === "z" ? fl.hx : fl.hz;
    for (let a = -half + 11; a <= half - 11; a += 14) {
      /* leave the middle of the face to this storey's lit window */
      if (face === fl.face && Math.abs(a - fl.along) < 13) continue;
      DECOR.push({ p: facePoint(fl, face, a, fl.winY), f: face, w: 2.2, h: 4.4 });
      /* a gilded arch and sill, so the opening reads as baroque not curtain wall */
      const gy = gr(fl.winY);
      const along = a;
      const onZ = face[0] === "z";
      const fz = onZ ? (face === "z+" ? fl.hz : -fl.hz) : along;
      const fx = onZ ? along : (face === "x+" ? fl.hx : -fl.hx);
      for (let k = 0; k <= 5; k++) {
        const ang = (k / 5) * Math.PI;
        const dA = Math.round(Math.cos(ang) * 3);
        const dY = Math.round(Math.sin(ang) * 3);
        box(onZ ? fx + dA : fx, gy + 5 + dY, onZ ? fz : fz + dA, C.gold);
      }
      for (let d = -3; d <= 3; d++) box(onZ ? fx + d : fx, gy - 5, onZ ? fz : fz + d, C.white);
    }
  }
}
/* wings */
[-1, 1].forEach((s) => {
  for (let x = 52; x <= 100; x += 9) {
    [10, 24].forEach((y) => {
      DECOR.push({ p: new THREE.Vector3(w(s * x), w(y), w(28) + 0.35), f: "z+", w: 1.7, h: 3.2 });
      DECOR.push({ p: new THREE.Vector3(w(s * x), w(y), -w(28) - 0.35), f: "z-", w: 1.7, h: 3.2 });
    });
  }
  [14, 30, 40].forEach((y) =>
    DECOR.push({ p: new THREE.Vector3(s * (w(104) + 0.35), w(y), 0), f: s > 0 ? "x+" : "x-", w: 1.7, h: 3.2 })
  );
});

const decorMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 0.35), decorMat, DECOR.length);
{
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  DECOR.forEach((d, i) => {
    e.set(0, faceYaw(d.f), 0);
    q.setFromEuler(e);
    m.compose(d.p, q, new THREE.Vector3(d.w, d.h, 1));
    decorMesh.setMatrixAt(i, m);
    /* how brightly this particular window comes on after dark */
    d.lit = rand() < 0.12 ? 0.05 + rand() * 0.1 : 0.72 + rand() * 0.28;
    decorMesh.setColorAt(i, new THREE.Color(0x2a3850));
  });
}
decorMesh.instanceMatrix.needsUpdate = true;
scene.add(decorMesh);

/* ── one lit window per storey ── */
const FEATURED = [];
function featureWindow(roomIndex, floor) {
  const face = floor.face;
  const pos = facePoint(floor, face, floor.along, floor.winY);
  const yaw = faceYaw(face);

  const mat = new THREE.MeshBasicMaterial({ color: 0x2a3850 });
  const pane = new THREE.Mesh(new THREE.BoxGeometry(5.6, 6.4, 0.4), mat);
  pane.position.copy(pos);
  pane.rotation.y = yaw;
  pane.userData.room = roomIndex;
  scene.add(pane);

  /* a gilded aedicule: jambs, entablature, a little pediment */
  const g = new THREE.Group();
  const gm = new THREE.MeshLambertMaterial({ color: C.gold });
  const gml = new THREE.MeshLambertMaterial({ color: C.goldLt });
  const bar = (bw, bh, bx, by, m2) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.5), m2 || gm);
    b.position.set(bx, by, 0);
    g.add(b);
  };
  bar(8.0, 0.9, 0, 3.9, gml);                       // entablature
  bar(8.8, 0.8, 0, -3.7, gml);                      // sill
  bar(0.9, 7.6, -3.2, 0);                           // jambs
  bar(0.9, 7.6, 3.2, 0);
  bar(0.7, 7.0, -4.1, 0, gml);                      // flanking colonnettes
  bar(0.7, 7.0, 4.1, 0, gml);
  for (let k = 0; k < 5; k++) bar(6.4 - k * 1.3, 0.5, 0, 4.6 + k * 0.5, gml); // pediment
  bar(1.0, 1.0, 0, 7.3, gml);                       // finial
  g.position.copy(pos);
  g.rotation.y = yaw;
  g.translateZ(-0.08);
  scene.add(g);

  FEATURED.push({
    room: roomIndex, floor: floor.n, mat, pane,
    pos: pos.clone(), normal: NORMALS[face].clone(),
    glow: 0, target: 0,
  });
}
FLOORS.forEach((fl, i) => featureWindow(i, fl));

const PICKABLE = FEATURED.map((f) => f.pane);
const byRoom = new Map(FEATURED.map((f) => [f.room, f]));

/* ── petals ──
   Slow drifting motes, brightest near the palace. In the reference these are
   half of why the scene feels alive rather than architectural. */
const PETAL_N = lowPower ? 220 : 480;
const petalGeo = new THREE.BufferGeometry();
const petalPos = new Float32Array(PETAL_N * 3);
const petalCol = new Float32Array(PETAL_N * 3);
const petalDrift = [];
{
  const c = new THREE.Color();
  const palette = [0xf2b6d6, 0xe8a0c8, 0xfff0d8, 0xffd9a4, 0xd8e4ff];
  for (let i = 0; i < PETAL_N; i++) {
    const a = rand() * Math.PI * 2;
    const r = 26 + rand() * 105;
    petalPos[i * 3] = Math.cos(a) * r;
    petalPos[i * 3 + 1] = rand() * 78;
    petalPos[i * 3 + 2] = Math.sin(a) * r;
    c.setHex(palette[(rand() * palette.length) | 0]);
    petalCol.set([c.r, c.g, c.b], i * 3);
    petalDrift.push({
      fall: 1.4 + rand() * 2.6,
      swayA: rand() * Math.PI * 2,
      swayR: 0.5 + rand() * 1.8,
      spin: 0.3 + rand() * 0.8,
    });
  }
}
petalGeo.setAttribute("position", new THREE.BufferAttribute(petalPos, 3));
petalGeo.setAttribute("color", new THREE.BufferAttribute(petalCol, 3));
const petalMat = new THREE.PointsMaterial({
  size: 1.9, sizeAttenuation: true, vertexColors: true,
  transparent: true, opacity: 0.9, depthWrite: false, fog: true,
});
const petals = new THREE.Points(petalGeo, petalMat);
petals.frustumCulled = false;
scene.add(petals);

function updatePetals(dt, time) {
  const p = petalGeo.attributes.position.array;
  for (let i = 0; i < PETAL_N; i++) {
    const d = petalDrift[i];
    p[i * 3 + 1] -= d.fall * dt;
    p[i * 3] += Math.sin(time * d.spin + d.swayA) * d.swayR * dt;
    p[i * 3 + 2] += Math.cos(time * d.spin * 0.8 + d.swayA) * d.swayR * dt;
    if (p[i * 3 + 1] < -2) {
      p[i * 3 + 1] = 78 + rand() * 14;
      const a = rand() * Math.PI * 2;
      const r = 26 + rand() * 105;
      p[i * 3] = Math.cos(a) * r;
      p[i * 3 + 2] = Math.sin(a) * r;
    }
  }
  petalGeo.attributes.position.needsUpdate = true;
}

/* drifting clouds */
const clouds = [];
if (!reducedMotion) {
  for (let i = 0; i < 8; i++) {
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.72, emissive: 0x4a5578 });
    [[0, 0, 0, 22, 5, 11], [13, 1.5, 3, 14, 4.4, 8], [-12, 1.5, -2, 15, 4.4, 8.5], [3, 4.5, 0, 11, 4.4, 7]]
      .forEach(([x, y, z, ww, hh, dd]) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(ww, hh, dd), mat);
        b.position.set(x, y, z);
        g.add(b);
      });
    g.position.set(-500 + rand() * 1000, 135 + rand() * 85, -460 + rand() * 380);
    g.userData.speed = 1.6 + rand() * 2.2;
    clouds.push(g);
    scene.add(g);
  }
}

/* ═══════════════════════════ TIME OF DAY ═══════════════════════════ */

/* The scroll is the clock. It opens on the sunset and runs into the night —
   there is nothing to set, so there is no control for it. */
let timeOfDay = 1218 / 1440;

const TIME_KEYS = [
  /* opens at 20:18 with the sun on the horizon, closes at 21:48 in the dark */
  [0.0, 1218], [0.28, 1240], [0.52, 1272], [0.76, 1316], [1.0, 1372],
];
function timeForScroll(p) {
  for (let i = 0; i < TIME_KEYS.length - 1; i++) {
    const [a2, av] = TIME_KEYS[i], [b2, bv] = TIME_KEYS[i + 1];
    if (p >= a2 && p <= b2) return THREE.MathUtils.lerp(av, bv, (p - a2) / (b2 - a2)) / 1440;
  }
  return TIME_KEYS[TIME_KEYS.length - 1][1] / 1440;
}

const urlParams = new URLSearchParams(location.search);
/* ?t=1240 pins the clock — for previewing an hour, not a user-facing control */
const pinnedTime = urlParams.has("t") ? (Number(urlParams.get("t")) % 1440) / 1440 : null;
const startP = urlParams.has("p")
  ? THREE.MathUtils.clamp(Number(urlParams.get("p")), 0, 1)
  : null;

/* ═══════════════════════════ SCROLL ═══════════════════════════
   Every route into the page goes through one target: wheel, trackpad, touch,
   keyboard, scrollbar and the panel's Next button. The frame loop is the only
   thing that ever moves the page, so the camera never gets a jolt. */

const scrollSpace = document.querySelector(".scroll-space");
scrollSpace.style.height = coarsePointer ? "1200vh" : "1650vh";

const maxScroll = () => document.documentElement.scrollHeight - innerHeight;
/* the camera move ends when the spacer does; the document follows */
const journeyLength = () => Math.max(1, scrollSpace.offsetHeight - innerHeight);

/* Someone who has asked for reduced motion still gets to the same places —
   they just get there without the inertia. */
const eased = !reducedMotion;

const scroller = { target: scrollY, active: false, glide: null };
const clampY = (y) => THREE.MathUtils.clamp(y, 0, maxScroll());
const inScrollable = (e) =>
  e.composedPath().some((n) => n instanceof Element && n.closest(".panel-inner, .directory"));

function nudge(dy) {
  scroller.glide = null;                    // a hand on the wheel wins
  scroller.target = clampY(scroller.target + dy);
  scroller.active = true;
}

/** A timed, eased move — used when something *takes* you somewhere. */
function glideTo(y, seconds) {
  const to = clampY(y);
  if (!eased) { scrollTo(0, to); scroller.target = to; scroller.active = false; return; }
  const dist = Math.abs(to - scrollY);
  const dur = seconds ?? THREE.MathUtils.clamp(1.3 + (dist / Math.max(1, maxScroll())) * 3.6, 1.3, 3.6);
  scroller.glide = { from: scrollY, to, t: 0, dur };
  scroller.target = to;
  scroller.active = true;
}

/* wheel / trackpad */
addEventListener("wheel", (e) => {
  if (e.ctrlKey) return;                    // let pinch-zoom through
  if (inScrollable(e)) return;
  e.preventDefault();
  let d = e.deltaY;
  if (e.deltaMode === 1) d *= 33;
  else if (e.deltaMode === 2) d *= innerHeight;
  nudge(THREE.MathUtils.clamp(d, -200, 200) * 0.55);
}, { passive: false });

/* touch — the same target, with a flick at the end */
let touchY = null, touchV = 0, touchT = 0;
addEventListener("touchstart", (e) => {
  if (inScrollable(e)) { touchY = null; return; }
  touchY = e.touches[0].clientY;
  touchV = 0;
  touchT = performance.now();
  scroller.glide = null;
  scroller.target = scrollY;
}, { passive: true });
addEventListener("touchmove", (e) => {
  if (touchY === null) return;
  const y = e.touches[0].clientY;
  const dy = touchY - y;
  const now = performance.now();
  touchV = dy / Math.max(1, now - touchT);
  touchY = y;
  touchT = now;
  nudge(dy * 1.15);
  e.preventDefault();
}, { passive: false });
addEventListener("touchend", () => {
  if (touchY === null) return;
  nudge(touchV * 300);                      // carry the flick
  touchY = null;
}, { passive: true });

/* keyboard, when the drawer is not the thing being driven */
addEventListener("keydown", (e) => {
  if (panelOpen || directoryOpen()) return;
  if (e.target instanceof Element && e.target.closest("input, textarea, select, a, button")) return;
  const page = innerHeight * 0.85;
  let d = null;
  if (e.key === "ArrowDown") d = 150;
  else if (e.key === "ArrowUp") d = -150;
  else if (e.key === "PageDown" || e.key === " ") d = page;
  else if (e.key === "PageUp") d = -page;
  else if (e.key === "Home") { e.preventDefault(); return glideTo(0); }
  else if (e.key === "End") { e.preventDefault(); return glideTo(maxScroll()); }
  if (d === null) return;
  e.preventDefault();
  nudge(d);
});

/* a scrollbar drag is the one thing that moves the page itself — adopt it */
addEventListener("scroll", () => {
  if (!scroller.active) scroller.target = scrollY;
}, { passive: true });

function scrollToP(p) { glideTo(THREE.MathUtils.clamp(p, 0, 1) * journeyLength()); }

document.getElementById("brand-home").addEventListener("click", (e) => { e.preventDefault(); scrollToP(0); });
document.querySelectorAll("[data-goto]").forEach((el) =>
  el.addEventListener("click", (e) => { e.preventDefault(); scrollToP(Number(el.dataset.goto)); })
);

/* The approach, then a single revolution around the palace that rises one
   storey per stop. Each storey's lit window sits on whichever face the camera
   will be looking at when it arrives — that is what FLOOR_FACE encodes. */

const APPROACH = [
  { p: 0.00, pos: [0, 9, 272], tgt: [0, 70, 40] },     // I  · far out on the boardwalk
  { p: 0.09, pos: [0, 9, 244], tgt: [0, 66, 36] },
  { p: 0.17, pos: [5, 10, 228], tgt: [0, 60, 32] },    // II · the gate, dead ahead
  { p: 0.25, pos: [0, 12, 182], tgt: [0, 56, 26] },
  { p: 0.32, pos: [-12, 14, 146], tgt: [0, 50, 18] },  // III· the court, looking up
];

/* where each storey's stop falls on the scroll */
/* Provisional spacing. The real values are measured off the path below, so
   that a given amount of scroll always buys the same amount of travel. */
const ROOM_P = [];

/* one revolution, biased so each stop sits square-on to a face */
const FLOOR_THETA = [-18, 18, 58, 90, 122, 160, 200, 238, 270, 302, 342]
  .map((d) => (d * Math.PI) / 180);

const SHOTS = [...APPROACH];
FLOORS.forEach((fl, i) => {
  const th = FLOOR_THETA[i];
  /* The helix tightens as it climbs: down low you need distance to get the
     tower in behind the storey, up top the tower is narrower and closer works.
     82 is the ceiling — beyond it the arc would clip the gate. */
  const radius = 82 - i * 1.4;
  const win = FEATURED[i].pos;
  SHOTS.push({
    p: 0,
    pos: [Math.sin(th) * radius, fl.winY + 2.5, Math.cos(th) * radius],
    tgt: [win.x, fl.winY + 14 - i * 1.05, win.z],
  });
});
/* the last beat: fall back and take the whole thing in, at night */
SHOTS.push({ p: 1.0, pos: [-104, 72, 150], tgt: [0, 56, 0] });

const shotPos = SHOTS.map((s) => new THREE.Vector3(...s.pos));
const shotTgt = SHOTS.map((s) => new THREE.Vector3(...s.tgt));

/* ── one curve, sampled by distance ──
   Centripetal Catmull-Rom, because the uniform variant cusps and overshoots
   when control points are unevenly spaced. Sampled by arc length, because
   that is what makes a given amount of scroll buy a constant amount of
   travel. Previously each segment was reparameterised into its own slice of
   the scroll, which left a velocity kink at every keyframe. */
const ARC_DIV = 4000;
const posCurve = new THREE.CatmullRomCurve3(shotPos, false, "centripetal");
const tgtCurve = new THREE.CatmullRomCurve3(shotTgt, false, "centripetal");
posCurve.arcLengthDivisions = ARC_DIV;
tgtCurve.arcLengthDivisions = ARC_DIV;

const arcLengths = posCurve.getLengths(ARC_DIV);
const arcTotal = arcLengths[ARC_DIV] || 1;
/** the scroll position at which the camera arrives at keyframe i */
function uAtControl(i) {
  const f = (i / (shotPos.length - 1)) * ARC_DIV;
  const a2 = Math.min(ARC_DIV - 1, Math.floor(f));
  return (arcLengths[a2] + (arcLengths[a2 + 1] - arcLengths[a2]) * (f - a2)) / arcTotal;
}
FLOORS.forEach((_, i) => { ROOM_P[i] = uAtControl(APPROACH.length + i); });

const CHAPTERS = [
  { at: 0, no: "I", name: "The Boardwalk" },
  { at: Math.max(0.02, uAtControl(2) - 0.04), no: "II", name: "The Gate" },
  { at: Math.max(0.05, uAtControl(4) - 0.04), no: "III", name: "The Great Stair" },
];

/** the storey whose stop is closest to a given scroll position */
function nearestFloor(p) {
  let best = 0, bestD = Infinity;
  for (let i = 0; i < ROOM_P.length; i++) {
    const d = Math.abs(p - ROOM_P[i]);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}
/** During the climb the chapter is simply the storey you are level with. */
function chapterFor(p) {
  if (p < ROOM_P[0] - 0.03) {
    let c = CHAPTERS[0];
    for (const ch of CHAPTERS) if (p >= ch.at) c = ch;
    return c;
  }
  const i = nearestFloor(p);
  return { no: String(i + 1).padStart(2, "0"), name: ROOMS[i]?.title || `Floor ${i + 1}` };
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3();
const _look = new THREE.Matrix4(), _q = new THREE.Quaternion();
let cameraAimed = false;

function updateCamera(p, time, dt) {
  const t = posCurve.getUtoTmapping(THREE.MathUtils.clamp(p, 0, 1));
  posCurve.getPoint(t, _a);
  tgtCurve.getPoint(t, _b);
  if (!reducedMotion) {
    _a.y += Math.sin(time * 0.42) * 0.14;
    _a.x += Math.sin(time * 0.31 + 1.4) * 0.12;
  }
  camera.position.copy(_a);

  /* Ease the orientation instead of snapping to lookAt. Rotation is what the
     eye actually reads as roughness, and a few frames of inertia here take
     out the last of it. */
  _look.lookAt(_a, _b, camera.up);
  _q.setFromRotationMatrix(_look);
  if (!cameraAimed || reducedMotion) {
    camera.quaternion.copy(_q);
    cameraAimed = true;
  } else {
    camera.quaternion.slerp(_q, 1 - Math.pow(0.00002, Math.min(dt, 0.1)));
  }
}

/* ═══════════════════════ MARKERS (2D, over the 3D) ═══════════════════════ */

const markerLayer = document.getElementById("markers");
const markers = FEATURED.map((f) => {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "marker";
  el.innerHTML = `<span class="marker-dot"></span><span class="marker-label">${ROOMS[f.room].title}</span>`;
  el.setAttribute("aria-label", `Open: ${ROOMS[f.room].title}`);
  el.addEventListener("click", () => openPanel(f.room));
  el.addEventListener("pointerenter", () => (f.target = 1));
  el.addEventListener("pointerleave", () => (f.target = 0));
  markerLayer.appendChild(el);
  return { el, f, shown: false };
});

const _proj = new THREE.Vector3();
const _toCam = new THREE.Vector3();
let markersFade = 0;

function updateMarkers(p, dt) {
  const want = p > 0.26 ? 1 : 0;
  markersFade += (want - markersFade) * (1 - Math.pow(0.02, dt));
  for (const m of markers) {
    const { f, el } = m;
    _proj.copy(f.pos);
    const dist = camera.position.distanceTo(f.pos);
    /* is the wall it sits on turned toward us? */
    const facing = _toCam.copy(camera.position).sub(f.pos).normalize().dot(f.normal);
    _proj.project(camera);
    const onScreen = _proj.z < 1 && Math.abs(_proj.x) < 0.94 && Math.abs(_proj.y) < 0.9;
    const vis = onScreen && facing > 0.22 && dist < 190 && dist > 12 ? 1 : 0;
    const alpha = vis * markersFade * THREE.MathUtils.smoothstep(facing, 0.2, 0.5);

    if (alpha < 0.02) {
      if (m.shown) { el.style.opacity = "0"; el.style.pointerEvents = "none"; m.shown = false; }
      continue;
    }
    m.shown = true;
    el.style.transform = `translate3d(${((_proj.x + 1) / 2) * innerWidth}px, ${((-_proj.y + 1) / 2) * innerHeight}px, 0)`;
    el.style.opacity = String(alpha);
    el.style.pointerEvents = "auto";
  }
}

/* ═══════════════════════ PICKING & PANELS ═══════════════════════ */

const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();
const tooltip = document.getElementById("tooltip");
let hovered = null;

function pickAt(cx, cy) {
  pointerNDC.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointerNDC, camera);
  const hits = raycaster.intersectObjects(PICKABLE, false);
  return hits.length ? hits[0].object : null;
}
/** Drop any hover state. The tooltip is driven by pointermove over the
    canvas, so scrolling away from a window — or the reading document sliding
    up over it — left the last one stuck on screen. */
function clearHover() {
  if (!hovered) { tooltip.hidden = true; return; }
  const rec = byRoom.get(hovered.userData.room);
  if (rec) rec.target = 0;
  hovered = null;
  tooltip.hidden = true;
  canvas.style.cursor = "";
}

function setHover(obj, cx, cy) {
  if (obj !== hovered) {
    if (hovered) byRoom.get(hovered.userData.room).target = 0;
    hovered = obj;
    if (hovered) byRoom.get(hovered.userData.room).target = 1;
  }
  if (obj) {
    const r = ROOMS[obj.userData.room];
    tooltip.innerHTML = `<b>${r.title}</b><span>${r.plate}</span>`;
    tooltip.hidden = false;
    tooltip.style.left = `${cx}px`;
    tooltip.style.top = `${cy}px`;
    canvas.style.cursor = "pointer";
  } else {
    tooltip.hidden = true;
    canvas.style.cursor = "";
  }
}

let downX = 0, downY = 0;
canvas.addEventListener("pointerdown", (e) => { downX = e.clientX; downY = e.clientY; });
canvas.addEventListener("pointerup", (e) => {
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8) return;
  const hit = pickAt(e.clientX, e.clientY);
  if (hit) openPanel(hit.userData.room);
});
canvas.addEventListener("pointermove", (e) => setHover(pickAt(e.clientX, e.clientY), e.clientX, e.clientY));
canvas.addEventListener("pointerleave", clearHover);

const panel = document.getElementById("panel");
const panelKicker = document.getElementById("panel-kicker");
const panelTitle = document.getElementById("panel-title");
const panelBody = document.getElementById("panel-body");
const panelCount = document.getElementById("panel-count");
const panelFig = document.getElementById("panel-figure");
let currentRoom = 0;
let panelOpen = false;

function renderPanel() {
  const r = ROOMS[currentRoom];
  panelKicker.textContent = `${r.plate} · ${r.kicker}`;
  panelTitle.textContent = r.title;
  panelBody.innerHTML = r.body;
  panelCount.textContent = `${String(currentRoom + 1).padStart(2, "0")} / ${String(ROOMS.length).padStart(2, "0")}`;
  panelFig.innerHTML = r.img ? `<img src="${r.img}" alt="${r.imgAlt}" loading="lazy" />` : "";
}
function openPanel(i, { fly = true } = {}) {
  currentRoom = ((i % ROOMS.length) + ROOMS.length) % ROOMS.length;
  /* Selecting a room is also a camera move: the scroll target becomes that
     storey's stop, and the spiral carries us up to it. */
  if (fly && ROOM_P[currentRoom] !== undefined) scrollToP(ROOM_P[currentRoom]);
  renderPanel();
  panel.hidden = false;
  panelOpen = true;
  clearHover();
  setTimeout(() => panel.classList.add("open"), 20);
  directoryEl.hidden = true;
  document.body.classList.add("panel-open");
}
function closePanel() {
  panel.classList.remove("open");
  panelOpen = false;
  document.body.classList.remove("panel-open");
  setTimeout(() => { if (!panelOpen) panel.hidden = true; }, 450);
}
document.getElementById("panel-close").addEventListener("click", closePanel);
document.getElementById("panel-prev").addEventListener("click", () => openPanel(currentRoom - 1));
document.getElementById("panel-next").addEventListener("click", () => openPanel(currentRoom + 1));

const directoryEl = document.getElementById("directory");
const directoryOpen = () => !directoryEl.hidden;
const directoryList = document.getElementById("directory-list");
ROOMS.forEach((r, i) => {
  const li = document.createElement("li");
  li.innerHTML = `<button type="button"><span class="num">${String(i + 1).padStart(2, "0")}</span><span><b>${r.title}</b><i>${r.plate}</i></span></button>`;
  li.querySelector("button").addEventListener("click", () => openPanel(i));
  directoryList.appendChild(li);
});
document.getElementById("directory-btn").addEventListener("click", () => {
  directoryEl.hidden = !directoryEl.hidden;
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closePanel(); directoryEl.hidden = true; }
  if (panelOpen && e.key === "ArrowRight") openPanel(currentRoom + 1);
  if (panelOpen && e.key === "ArrowLeft") openPanel(currentRoom - 1);
});

/* ═══════════════════════ HUD & PROGRESS ═══════════════════════ */

const hero = document.getElementById("hero");
const progressBar = document.getElementById("progress-bar");
const chapterNo = document.getElementById("chapter-no");
const chapterName = document.getElementById("chapter-name");
const chapterEl = document.getElementById("chapter");
let targetP = 0, smoothP = 0, chapterIdx = null;

function readScroll() {
  targetP = THREE.MathUtils.clamp(scrollY / journeyLength(), 0, 1);
  const fade = 1 - THREE.MathUtils.smoothstep(targetP, 0.02, 0.13);
  hero.style.opacity = String(fade);
  hero.style.visibility = fade <= 0.02 ? "hidden" : "visible";
  progressBar.style.transform = `scaleX(${targetP})`;

  const ch = chapterFor(targetP);
  if (ch.name !== chapterIdx) {
    chapterIdx = ch.name;
    chapterEl.classList.remove("in");
    /* a timer, not rAF: rAF is frozen whenever the tab is in the background */
    setTimeout(() => {
      chapterNo.textContent = ch.no;
      chapterName.textContent = ch.name;
      chapterEl.classList.add("in");
    }, 45);
  }
  chapterEl.style.opacity = targetP > 0.06 && targetP < 0.995 ? "1" : "0";

  /* the reading document is up: stand the scene controls down */
  const reading = scrollY > journeyLength() - innerHeight * 0.35;
  document.body.classList.toggle("reading", reading);
  if (hovered) clearHover();      // the view moved out from under the pointer
}
addEventListener("scroll", readScroll, { passive: true });

/* ═══════════════════════ DAY / NIGHT ═══════════════════════ */

const clock = new THREE.Clock();
const skyColor = new THREE.Color();
const sunDir = new THREE.Vector3();
const moonDir = new THREE.Vector3();
const LIGHT_ANCHOR = new THREE.Vector3(0, 14, 10);
const tmpColor = new THREE.Color();
let lastGlow = -1;

function updateDayNight() {
  /* a long summer day: up at 5:30, down at 20:30 */
  const SR = 5.5 / 24, SS = 20.5 / 24, DAY = SS - SR;
  const f = (timeOfDay - SR + 1) % 1;
  const ang = f <= DAY
    ? Math.PI * (f / DAY)
    : Math.PI + Math.PI * ((f - DAY) / (1 - DAY));
  sunDir.set(Math.cos(ang) * 1.4, Math.sin(ang) * 1.05, 0.55).normalize();
  moonDir.copy(sunDir).multiplyScalar(-1);
  moonDir.z = Math.abs(moonDir.z);

  const elev = sunDir.y;
  const daylight = THREE.MathUtils.smoothstep(elev, -0.09, 0.3);
  const night = 1 - THREE.MathUtils.smoothstep(elev, 0.0, 0.28);

  sampleSkyInto(skyColor, timeOfDay);
  scene.background = skyColor;
  scene.fog.color.copy(skyColor);
  skyDome.position.copy(camera.position);
  skyUniforms.uBottom.value.copy(skyColor);
  skyUniforms.uTop.value.copy(skyColor)
    .lerp(tmpColor.copy(ZENITH_NIGHT).lerp(ZENITH_DAY, daylight), 0.82 + night * 0.16);
  skyUniforms.uSun.value.copy(elev > -0.06 ? sunDir : moonDir);
  skyUniforms.uSunColor.value.setHex(elev > -0.06 ? 0xffcf94 : 0x9fb2ff)
    .lerp(SUNSET_WARM, elev > -0.06 ? (1 - daylight) * 0.8 : 0);
  skyUniforms.uSunStrength.value = (elev > -0.06 ? 0.32 + (1 - daylight) * 0.5 : 0.08) * (1 - night * 0.85);
  /* fog all but disappears after dark — haze was greying out the night */
  scene.fog.near = THREE.MathUtils.lerp(320, 240, daylight) + night * 340;
  scene.fog.far = THREE.MathUtils.lerp(900, 1000, daylight) + night * 700;

    /* Falls away to almost nothing after dark. The reference is a near-black
     scene lit by its own windows, not a floodlit building. */
  hemi.intensity = 0.1 + 1.35 * daylight;
  hemi.color.setHex(0xbfd7ff).lerp(tmpColor.setHex(0xffb27a), (1 - daylight) * (1 - night * 0.6));
  hemi.groundColor.setHex(0x54432e).lerp(tmpColor.setHex(0x2a2438), night * 0.7);

  const useSun = elev > -0.05;
  keyLight.position.copy(useSun ? sunDir : moonDir).multiplyScalar(320).add(LIGHT_ANCHOR);
  keyLight.target.position.copy(LIGHT_ANCHOR);
  keyLight.intensity = useSun ? 0.45 + 2.45 * daylight : 0.06;
  keyLight.color.setHex(useSun ? 0xfff3e0 : 0x9fb2ff);
  if (useSun) keyLight.color.lerp(SUNSET_WARM, (1 - daylight) * 0.9);

  fillLight.position.copy(sunDir).multiplyScalar(-260).add(LIGHT_ANCHOR);
  fillLight.position.y = Math.abs(fillLight.position.y) * 0.5 + 120;
  fillLight.target.position.copy(LIGHT_ANCHOR);
  fillLight.intensity = (0.35 + 0.75 * (1 - daylight)) * (1 - night * 0.92);
  fillLight.color.setHex(0xffd7ae).lerp(tmpColor.setHex(0x8fa3e8), night);

  sunDisc.position.copy(sunDir).multiplyScalar(700);
  sunHalo.position.copy(sunDisc.position);
  sunDisc.visible = sunHalo.visible = sunDir.y > -0.18;
  sunDisc.material.color.setHex(0xffd98a).lerp(SUNSET_WARM, 1 - daylight);
  moonDisc.position.copy(moonDir).multiplyScalar(700);
  moonDisc.visible = moonDir.y > -0.1;
  starMat.opacity = night;

  seaMat.color.setHex(0x3f97c4).lerp(tmpColor.setHex(0x14203f), night * 0.85);
  basinMat.color.setHex(0x53b0d8).lerp(tmpColor.setHex(0x1b2c4d), night * 0.8);

  /* The windows are lit by the scroll, not by the sun's elevation. At 20:18
     the sun is technically already down, so an elevation-driven glow had the
     whole palace blazing while the sky was still bright orange. This way they
     come on the way the brief describes: dark on the boardwalk, full gold by
     the time you reach the top. */
  const litProgress = THREE.MathUtils.smoothstep(smoothP, 0.12, 0.86);

  bloom.strength = 0.09 + 1.08 * litProgress;
  bloom.radius = 0.68 + 0.36 * litProgress;

  const glow = Math.max(litProgress, night * 0.12);
  if (Math.abs(glow - lastGlow) > 0.004) {
    lastGlow = glow;
    {
      const c = tmpColor;
      for (let i = 0; i < DECOR.length; i++) {
        const lit = DECOR[i].lit;
        c.copy(WIN_DAY).lerp(WIN_NIGHT, glow * lit);
        /* past 1.0 once it is properly dark — that headroom is what blooms */
        c.multiplyScalar(1 + glow * lit * 2.2);
        decorMesh.setColorAt(i, c);
      }
      decorMesh.instanceColor.needsUpdate = true;
    }
    lampMat.color.copy(WIN_DAY).lerp(WIN_NIGHT, Math.max(glow, 0.12)).multiplyScalar(1 + glow * 0.9);
      doorGlow.intensity = glow * 180;
    storeyLamps.forEach((l, i) => {
      const f = FEATURED[i * 2];
      if (!f) return;
      /* just outside the pane, so the light lands on the wall around it */
      l.position.copy(f.pos).addScaledVector(f.normal, 3);
      l.intensity = glow * 225;
    });
  }
}

/* ═══════════════════════ MAIN LOOP ═══════════════════════ */

let shadowTick = 1;
function frameStep(dt, time) {
  /* the world is static and the sun moves slowly — refresh the shadow map a
     few times a second rather than every frame */
  shadowTick += dt;
  if (shadowTick > 0.14) { shadowTick = 0; renderer.shadowMap.needsUpdate = true; }

  if (scroller.glide) {
    const g = scroller.glide;
    g.t += dt;
    const k = Math.min(1, g.t / g.dur);
    /* easeInOutCubic — slow off the mark, slow into the stop */
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    scrollTo(0, g.from + (g.to - g.from) * e);
    if (k >= 1) { scroller.glide = null; scroller.active = false; }
  } else if (scroller.active) {
    const next = scrollY + (scroller.target - scrollY) * (1 - Math.pow(0.085, dt));
    if (Math.abs(scroller.target - next) < 0.25) {
      scrollTo(0, scroller.target);
      scroller.active = false;
    } else scrollTo(0, next);
  }

  smoothP += (targetP - smoothP) * (1 - Math.pow(0.0004, dt));

  timeOfDay = pinnedTime ?? timeForScroll(smoothP);

  updateCamera(smoothP, time, dt);
  updateDayNight();
  updateMarkers(smoothP, dt);

  /* lit windows breathe, and brighten under the pointer */
  const base = Math.max(lastGlow, 0.14);
  for (const f of FEATURED) {
    f.glow += (f.target - f.glow) * (1 - Math.pow(0.002, dt));
    const flicker = 1 + Math.sin(time * 1.6 + f.pos.x * 0.7) * 0.045;
    const k = Math.min(1, (base * 0.9 + f.glow * 0.85) * flicker);
    f.mat.color.copy(WIN_DAY).lerp(WIN_NIGHT, k).multiplyScalar(1 + k * 2.0);
    f.pane.scale.setScalar(1 + f.glow * 0.04);
  }

  jets.forEach((j) => {
    const sc = 0.55 + Math.abs(Math.sin(time * 2 + j.userData.phase)) * 0.75;
    j.scale.y = sc;
    j.position.y = 4.4 + sc * 1.5;
  });
  boats.forEach((b, i) => {
    b.position.y = -1.2 + Math.sin(time * 0.9 + i * 2.1) * 0.5;
    b.rotation.z = Math.sin(time * 0.75 + i) * 0.045;
  });
  if (!reducedMotion) updatePetals(dt, time);
  /* they catch the window light, so they brighten as the night comes on */
  petalMat.opacity = 0.2 + 0.7 * Math.max(lastGlow, 0);

  clouds.forEach((c) => {
    c.position.x += c.userData.speed * dt;
    if (c.position.x > 560) c.position.x = -560;
  });

  composer.render();
}

function animate() {
  requestAnimationFrame(animate);
  frameStep(Math.min(clock.getDelta(), 0.1), clock.elapsedTime);
}

/* ?dev=1 — step the loop by hand (a hidden tab freezes requestAnimationFrame) */
if (urlParams.has("dev")) {
  window.__kal = {
    step: (n = 90) => { for (let i = 0; i < n; i++) frameStep(1 / 60, i / 60); },
    goTo: (p) => {
      const q = THREE.MathUtils.clamp(p, 0, 1);
      scrollTo(0, q * journeyLength());
      scroller.target = scrollY;
      scroller.glide = null;
      scroller.active = false;
      readScroll();
      targetP = smoothP = q;
    },
    open: openPanel,
    rooms: ROOMS.map((r) => r.title),
    renderer, scene, camera, keyLight, solidMesh,
  };
}

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  bloom.setSize(innerWidth, innerHeight);
  readScroll();
});

readScroll();
if (startP !== null && !Number.isNaN(startP)) {
  scrollTo(0, startP * journeyLength());
  scroller.target = scrollY;
  targetP = smoothP = startP;
  readScroll();
}
document.body.classList.add("ready");
animate();
