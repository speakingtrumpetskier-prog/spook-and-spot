// Stylized top-down map of Loring Park.
// World coordinates in meters. Park is approx 1000m E-W x 875m N-S.

import type { Vec2 } from "../game/types.ts";
import { makeRng, randRange } from "../game/types.ts";

export const WORLD_SCALE = 2.5;
export const WORLD_W = Math.round(820 * WORLD_SCALE);
export const WORLD_H = Math.round(700 * WORLD_SCALE);

export type Surface = "grass" | "path" | "water" | "tree" | "court" | "plaza" | "mulch" | "flowers" | "bridge";
export type TreeKind = "oak" | "maple" | "pine" | "elm" | "willow" | "birch" | "spruce" | "linden" | "crabapple" | "cherry";

export interface Tree {
  x: number; y: number; r: number;
  shadeR: number; hue: number; trunkOffset: number;
  kind: TreeKind;
  hasMulch: boolean;
}

export interface Bush {
  x: number; y: number; r: number; hue: number;
  hasFlowers: boolean; flowerColor: string;
}

export interface FlowerBed {
  x: number; y: number; w: number; h: number;
  colorA: string; colorB: string; rot: number;
}

export interface Bench { x: number; y: number; rot: number; }
export interface Lamppost { x: number; y: number; }
export interface Sign { x: number; y: number; text: string; }
export interface Statue { x: number; y: number; r: number; kind: "monument" | "fountain" | "bust"; }
export interface PicnicTable { x: number; y: number; rot: number; }
export interface TrashCan { x: number; y: number; }
export interface Reeds { pts: Vec2[]; }
export interface Rock { x: number; y: number; r: number; hue: number; }
export interface GrassPatch { x: number; y: number; r: number; kind: "wild" | "manicured"; }
export interface Bridge { ax: Vec2; bx: Vec2; width: number; }
export interface Crosswalk { x: number; y: number; w: number; h: number; rot: number; }
export interface PathSeg { pts: Vec2[]; width: number; kind: "gravel" | "paved"; }
export interface PondPoly { pts: Vec2[]; }
export interface Kiosk { x: number; y: number; rot: number; }
export interface BikeRack { x: number; y: number; rot: number; bikes: number; }
export interface DrinkingFountain { x: number; y: number; }
export interface Gazebo { x: number; y: number; r: number; }
export interface ParkGate { x: number; y: number; rot: number; }

export interface MapData {
  ponds: PondPoly[];
  paths: PathSeg[];
  trees: Tree[];
  bushes: Bush[];
  flowerBeds: FlowerBed[];
  benches: Bench[];
  lampposts: Lamppost[];
  signs: Sign[];
  statues: Statue[];
  picnicTables: PicnicTable[];
  trashCans: TrashCan[];
  reeds: Reeds[];
  rocks: Rock[];
  shoreStones: Rock[];
  grassPatches: GrassPatch[];
  bridges: Bridge[];
  crosswalks: Crosswalk[];
  plazas: { x: number; y: number; r: number }[];
  courts: { x: number; y: number; w: number; h: number }[];
  buildings: { x: number; y: number; w: number; h: number; color: string; label?: string }[];
  kiosks: Kiosk[];
  bikeRacks: BikeRack[];
  drinkingFountains: DrinkingFountain[];
  gazebos: Gazebo[];
  gates: ParkGate[];
  tennisFenceRect: { x: number; y: number; w: number; h: number } | null;
}

function blob(cx: number, cy: number, baseR: number, points: number, irregularity: number, seed: number): Vec2[] {
  const rng = makeRng(seed);
  const pts: Vec2[] = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const r = baseR * (1 - irregularity / 2 + rng() * irregularity);
    pts.push({ x: cx + Math.cos(a) * r * 1.05, y: cy + Math.sin(a) * r * 0.85 });
  }
  return pts;
}

const S = (x: number) => x * WORLD_SCALE;

export function buildLoringPark(): MapData {
  const rng = makeRng(2026);

  const loringPond: PondPoly = { pts: blob(S(420), S(470), S(110), 40, 0.18, 11) };
  const nwPond: PondPoly = { pts: blob(S(135), S(280), S(55), 32, 0.22, 13) };

  const paths: PathSeg[] = [
    { width: S(5.5), kind: "paved", pts: smoothPath([
      [60, 130],[120, 95],[220, 80],[330, 70],[440, 80],[560, 110],[660, 170],
      [710, 260],[720, 360],[680, 470],[600, 560],[480, 620],[340, 630],[210, 600],
      [120, 540],[70, 440],[55, 320],[60, 200],[60, 130]
    ]) },
    { width: S(4.5), kind: "gravel", pts: smoothPath([
      [260, 290],[330, 250],[420, 260],[470, 310],[460, 380],[400, 410],[320, 400],[270, 350],[260, 290]
    ]) },
    { width: S(4), kind: "gravel", pts: smoothPath([[345, 330],[200, 230],[120, 180]]) },
    { width: S(4), kind: "gravel", pts: smoothPath([[365, 320],[460, 220],[560, 160]]) },
    { width: S(4), kind: "gravel", pts: smoothPath([[370, 360],[510, 410],[640, 460]]) },
    { width: S(4), kind: "gravel", pts: smoothPath([[330, 380],[250, 460],[180, 540]]) },
    { width: S(4), kind: "gravel", pts: smoothPath([[345, 305],[330, 200],[340, 90]]) },
    { width: S(5), kind: "paved",  pts: smoothPath([[640, 230],[660, 320],[640, 420],[600, 520],[560, 600]]) },
    { width: S(3.5), kind: "gravel", pts: smoothPath([[100, 270],[170, 290],[230, 310]]) },
    { width: S(4.5), kind: "paved",  pts: smoothPath([[230, 620],[330, 640],[440, 640],[560, 620]]) },
    // Connector from greenway to tennis area
    { width: S(3.5), kind: "gravel", pts: smoothPath([[340, 90],[310, 130],[290, 165]]) },
    // Path to playground / east
    { width: S(4), kind: "paved", pts: smoothPath([[660, 220],[680, 290],[690, 360]]) },
    // Pond-loop trail
    { width: S(3.5), kind: "gravel", pts: smoothPath([
      [330, 380],[280, 430],[270, 480],[290, 540],[360, 580],[450, 590],[530, 570],[570, 510],[565, 440],[510, 400],[440, 390],[370, 380]
    ]) },
  ];

  // === TREES — 10 kinds across regions ===
  const trees: Tree[] = [];
  // Hunter Woods (NW): mixed deciduous + pines
  scatterTreesMixed(trees, rng, { x: S(50), y: S(50), w: S(290), h: S(260) }, 220, [6, 14],
    ["oak", "maple", "elm", "pine", "spruce", "birch"]);
  // East woods: more cherry/crabapple ornamentals + maples
  scatterTreesMixed(trees, rng, { x: S(530), y: S(180), w: S(220), h: S(310) }, 150, [6, 13],
    ["maple", "oak", "crabapple", "cherry", "linden", "elm"]);
  // South strip: large oaks + lindens
  scatterTreesMixed(trees, rng, { x: S(190), y: S(570), w: S(410), h: S(90) }, 110, [7, 13],
    ["oak", "linden", "elm", "maple"]);
  // Central scattered: lighter, ornamental
  scatterTreesMixed(trees, rng, { x: S(240), y: S(220), w: S(280), h: S(220) }, 60, [5, 10],
    ["crabapple", "cherry", "birch", "linden"]);
  // Pond perimeter: willows + maples
  scatterTreesMixed(trees, rng, { x: S(280), y: S(370), w: S(310), h: S(220) }, 80, [5, 12],
    ["willow", "maple", "elm", "linden"]);
  // West strip
  scatterTreesMixed(trees, rng, { x: S(60), y: S(380), w: S(180), h: S(150) }, 60, [5, 11],
    ["oak", "maple", "pine", "spruce"]);

  const filteredTrees = trees.filter(t => {
    if (pointInPolygon(t, loringPond.pts)) return false;
    if (pointInPolygon(t, nwPond.pts)) return false;
    return true;
  });

  // === Bushes — placed beside paths and along edges, not in trees ===
  const bushes: Bush[] = [];
  scatterBushes(bushes, rng, { x: S(60), y: S(60), w: S(280), h: S(260) }, 90, filteredTrees, [loringPond, nwPond]);
  scatterBushes(bushes, rng, { x: S(540), y: S(190), w: S(200), h: S(290) }, 70, filteredTrees, [loringPond, nwPond]);
  scatterBushes(bushes, rng, { x: S(200), y: S(580), w: S(390), h: S(80) }, 35, filteredTrees, [loringPond, nwPond]);
  // Ornamental flowering bushes around plazas
  scatterBushes(bushes, rng, { x: S(560), y: S(160), w: S(80), h: S(60) }, 20, filteredTrees, [loringPond, nwPond], true);
  scatterBushes(bushes, rng, { x: S(320), y: S(300), w: S(60), h: S(60) }, 14, filteredTrees, [loringPond, nwPond], true);

  // === Flower beds — formal plantings near plazas and along paths ===
  const flowerBeds: FlowerBed[] = [
    // Berger Fountain ring of beds
    { x: S(563), y: S(178), w: S(28), h: S(7),  colorA: "#e8b3c8", colorB: "#c44e7e", rot: -0.4 },
    { x: S(617), y: S(178), w: S(28), h: S(7),  colorA: "#e8d36b", colorB: "#c89a2a", rot: 0.4 },
    { x: S(590), y: S(150), w: S(28), h: S(7),  colorA: "#9fb9e8", colorB: "#5570a2", rot: 0 },
    { x: S(590), y: S(206), w: S(28), h: S(7),  colorA: "#d6a8d8", colorB: "#6e3470", rot: 0 },
    // Central hub flowers
    { x: S(335), y: S(310), w: S(20), h: S(6),  colorA: "#e89f5a", colorB: "#a85a1f", rot: 0.6 },
    { x: S(365), y: S(310), w: S(20), h: S(6),  colorA: "#e8b3c8", colorB: "#a83568", rot: -0.6 },
    { x: S(335), y: S(340), w: S(20), h: S(6),  colorA: "#c8d4a0", colorB: "#6e9038", rot: 0.6 },
    { x: S(365), y: S(340), w: S(20), h: S(6),  colorA: "#9fb9e8", colorB: "#5570a2", rot: -0.6 },
    // Park entrance
    { x: S(115), y: S(140), w: S(38), h: S(8),  colorA: "#e8b3c8", colorB: "#c44e7e", rot: 0 },
    { x: S(75), y: S(122), w: S(8), h: S(28), colorA: "#e8d36b", colorB: "#c89a2a", rot: 0 },
    // Greenway entrance
    { x: S(580), y: S(605), w: S(34), h: S(8),  colorA: "#d6a8d8", colorB: "#6e3470", rot: 0.6 },
  ];

  const benches: Bench[] = [];
  addBenchesAlongPath(benches, rng, paths[0], 22);
  addBenchesAlongPath(benches, rng, paths[7], 8);
  addBenchesAlongPath(benches, rng, paths[9], 8);
  // Pond-loop benches
  addBenchesAlongPath(benches, rng, paths[12], 14);
  benches.push({ x: S(360), y: S(370), rot: 0.2 });
  benches.push({ x: S(490), y: S(420), rot: -1.3 });
  // Benches facing fountain
  benches.push({ x: S(573), y: S(195), rot: Math.atan2(180 - 195, 590 - 573) });
  benches.push({ x: S(607), y: S(195), rot: Math.atan2(180 - 195, 590 - 607) });
  benches.push({ x: S(573), y: S(163), rot: Math.atan2(180 - 163, 590 - 573) });
  benches.push({ x: S(607), y: S(163), rot: Math.atan2(180 - 163, 590 - 607) });
  benches.push({ x: S(180), y: S(290), rot: 1.4 });

  const lampposts: Lamppost[] = [];
  addLamppostsAlongPath(lampposts, paths[0], 90);
  addLamppostsAlongPath(lampposts, paths[7], 100);
  addLamppostsAlongPath(lampposts, paths[9], 100);
  addLamppostsAlongPath(lampposts, paths[1], 110);
  addLamppostsAlongPath(lampposts, paths[12], 110);
  // Filter lampposts that landed in trees or buildings
  const treesForCheck = filteredTrees;
  const lampsClean = lampposts.filter(l => {
    for (const t of treesForCheck) if (Math.hypot(t.x - l.x, t.y - l.y) < t.r * 0.7) return false;
    return true;
  });

  const signs: Sign[] = [
    { x: S(80), y: S(130), text: "LORING PARK" },
    { x: S(575), y: S(610), text: "→ Greenway" },
    { x: S(695), y: S(280), text: "Willow St" },
    { x: S(125), y: S(695), text: "Hennepin Ave" },
    { x: S(310), y: S(155), text: "Tennis Courts" },
  ];

  const statues: Statue[] = [
    { x: S(590), y: S(180), r: S(6), kind: "fountain" },
    { x: S(350), y: S(325), r: S(4.5), kind: "monument" },
    { x: S(280), y: S(560), r: S(3), kind: "bust" },
  ];

  // Picnic tables clustered in a south-east lawn clearing + near west side
  const picnicTables: PicnicTable[] = [
    { x: S(605), y: S(540), rot: 0.3 },
    { x: S(632), y: S(548), rot: -0.2 },
    { x: S(660), y: S(528), rot: 0.1 },
    { x: S(640), y: S(575), rot: 0.4 },
    { x: S(195), y: S(450), rot: 0.5 },
    { x: S(225), y: S(465), rot: -0.6 },
  ];

  // Trash cans paired with lampposts and benches sensibly
  const trashCans: TrashCan[] = [];
  for (const lp of lampsClean) {
    if (rng() < 0.18) {
      trashCans.push({ x: lp.x + (rng() < 0.5 ? 6 : -6), y: lp.y + 6 });
    }
  }
  for (let i = 0; i < benches.length; i += 5) {
    trashCans.push({ x: benches[i].x + 7, y: benches[i].y + 1 });
  }

  const reeds: Reeds[] = [];
  for (let i = 0; i < loringPond.pts.length; i += 4) {
    if (rng() < 0.55) {
      reeds.push({ pts: [loringPond.pts[i], loringPond.pts[(i+1) % loringPond.pts.length], loringPond.pts[(i+2) % loringPond.pts.length]] });
    }
  }
  for (let i = 0; i < nwPond.pts.length; i += 3) {
    if (rng() < 0.5) {
      reeds.push({ pts: [nwPond.pts[i], nwPond.pts[(i+1) % nwPond.pts.length]] });
    }
  }

  // Shore stones — along pond perimeters
  const shoreStones: Rock[] = [];
  for (const pond of [loringPond, nwPond]) {
    for (let i = 0; i < pond.pts.length; i++) {
      if (rng() < 0.45) {
        const p = pond.pts[i];
        const cx = pond.pts.reduce((s, q) => s + q.x, 0) / pond.pts.length;
        const cy = pond.pts.reduce((s, q) => s + q.y, 0) / pond.pts.length;
        const dx = p.x - cx, dy = p.y - cy;
        const len = Math.hypot(dx, dy) || 1;
        const off = 1.5 + rng() * 2.5;
        shoreStones.push({
          x: p.x + (dx / len) * off,
          y: p.y + (dy / len) * off,
          r: randRange(rng, 1.8, 4.5),
          hue: rng(),
        });
      }
    }
  }

  const rocks: Rock[] = [];
  for (let i = 0; i < 80; i++) {
    const x = randRange(rng, S(30), S(800));
    const y = randRange(rng, S(30), S(680));
    if (pointInPolygon({ x, y }, loringPond.pts)) continue;
    if (pointInPolygon({ x, y }, nwPond.pts)) continue;
    rocks.push({ x, y, r: randRange(rng, 1.5, 4), hue: rng() });
  }

  const grassPatches: GrassPatch[] = [];
  for (let i = 0; i < 160; i++) {
    const x = randRange(rng, 0, WORLD_W);
    const y = randRange(rng, 0, WORLD_H);
    const r = randRange(rng, 12, 30);
    grassPatches.push({
      x, y, r,
      kind: rng() < 0.4 ? "manicured" : "wild",
    });
  }

  // Bridge across narrowest pond neck (sensible position over water)
  const bridges: Bridge[] = [
    { ax: { x: S(495), y: S(450) }, bx: { x: S(545), y: S(420) }, width: S(5) },
  ];

  const crosswalks: Crosswalk[] = [
    { x: S(75),  y: S(125), w: S(5), h: S(18), rot: 0.3 },
    { x: S(720), y: S(280), w: S(5), h: S(18), rot: -0.1 },
    { x: S(140), y: S(695), w: S(18), h: S(5), rot: 0.1 },
  ];

  const plazas = [
    { x: S(590), y: S(180), r: S(22) },        // Berger Fountain plaza — larger
    { x: S(350), y: S(325), r: S(16) },        // central hub
  ];

  // === Larger tennis courts — proper size with realistic proportions ===
  // Real tennis: 23.77 × 10.97. Scale up so they look proper from above.
  // Block of 4 (2x2 grid) with green surround.
  const courts = [
    { x: S(258), y: S(95),  w: S(56), h: S(28) },
    { x: S(320), y: S(95),  w: S(56), h: S(28) },
    { x: S(258), y: S(128), w: S(56), h: S(28) },
    { x: S(320), y: S(128), w: S(56), h: S(28) },
  ];
  const tennisFenceRect = { x: S(248), y: S(86), w: S(138), h: S(82) };

  const buildings = [
    { x: S(0),   y: S(0),   w: S(60),  h: S(120), color: "#3a3733", label: "" },
    { x: S(700), y: S(0),   w: S(120), h: S(90),  color: "#403c37", label: "Booth Manor" },
    { x: S(700), y: S(380), w: S(120), h: S(90),  color: "#403c37", label: "LPM Apts" },
    { x: S(700), y: S(540), w: S(120), h: S(160), color: "#3d3a35", label: "" },
    { x: S(0),   y: S(580), w: S(80),  h: S(120), color: "#383530", label: "" },
    { x: S(0),   y: S(460), w: S(60),  h: S(90),  color: "#383530", label: "" },
  ];

  // === New amenities ===
  const kiosks: Kiosk[] = [
    // Park info kiosk at main entrance (south)
    { x: S(330), y: S(620), rot: 0 },
    // East entrance
    { x: S(650), y: S(220), rot: -0.4 },
  ];

  const bikeRacks: BikeRack[] = [
    { x: S(85), y: S(135), rot: 0, bikes: 4 },
    { x: S(640), y: S(225), rot: -0.4, bikes: 3 },
    { x: S(140), y: S(688), rot: 0, bikes: 5 },
  ];

  const drinkingFountains: DrinkingFountain[] = [
    { x: S(370), y: S(345) },   // central hub
    { x: S(615), y: S(195) },   // Berger plaza
    { x: S(615), y: S(540) },   // picnic area
    { x: S(195), y: S(290) },   // NW pond
  ];

  const gazebos: Gazebo[] = [
    { x: S(220), y: S(450), r: S(11) }, // pond view gazebo
  ];

  const gates: ParkGate[] = [
    { x: S(75), y: S(135), rot: 0 },
    { x: S(580), y: S(615), rot: Math.PI / 2 },
  ];

  return {
    ponds: [loringPond, nwPond],
    paths, trees: filteredTrees, bushes, flowerBeds,
    benches, lampposts: lampsClean, signs, statues, picnicTables, trashCans,
    reeds, rocks, shoreStones, grassPatches, bridges, crosswalks,
    plazas, courts, buildings,
    kiosks, bikeRacks, drinkingFountains, gazebos, gates,
    tennisFenceRect,
  };
}

function scatterTreesMixed(out: Tree[], rng: () => number, region: { x: number; y: number; w: number; h: number }, count: number, rRange: [number, number], kinds: TreeKind[]): void {
  for (let i = 0; i < count; i++) {
    const x = region.x + rng() * region.w;
    const y = region.y + rng() * region.h;
    const r = randRange(rng, rRange[0], rRange[1]);
    out.push({
      x, y, r,
      shadeR: r * 1.4,
      hue: rng(),
      trunkOffset: (rng() - 0.5) * r * 0.3,
      kind: kinds[Math.floor(rng() * kinds.length)],
      hasMulch: rng() < 0.18,
    });
  }
}

function scatterBushes(
  out: Bush[],
  rng: () => number,
  region: { x: number; y: number; w: number; h: number },
  count: number,
  trees: Tree[],
  ponds: PondPoly[],
  flowering = false,
): void {
  const flowerColors = ["#e8b3c8", "#9fb9e8", "#e8d36b", "#d6a8d8", "#e89f5a"];
  for (let i = 0; i < count; i++) {
    const x = region.x + rng() * region.w;
    const y = region.y + rng() * region.h;
    let inWater = false;
    for (const p of ponds) if (pointInPolygon({ x, y }, p.pts)) { inWater = true; break; }
    if (inWater) continue;
    let onTree = false;
    for (const t of trees) {
      if (Math.hypot(t.x - x, t.y - y) < t.r * 0.4) { onTree = true; break; }
    }
    if (onTree) continue;
    out.push({
      x, y,
      r: randRange(rng, 2.8, 5.5),
      hue: rng(),
      hasFlowers: flowering && rng() < 0.4,
      flowerColor: flowerColors[Math.floor(rng() * flowerColors.length)],
    });
  }
}

function addBenchesAlongPath(out: Bench[], rng: () => number, path: PathSeg, count: number): void {
  for (let i = 0; i < count; i++) {
    const t = rng();
    const idx = Math.floor(t * (path.pts.length - 1));
    const a = path.pts[idx];
    const b = path.pts[Math.min(path.pts.length - 1, idx + 1)];
    const tangentX = b.x - a.x, tangentY = b.y - a.y;
    const tlen = Math.hypot(tangentX, tangentY) || 1;
    const nx = -tangentY / tlen, ny = tangentX / tlen;
    const off = (path.width * 0.6) + 4;
    const side = rng() < 0.5 ? 1 : -1;
    const bx = (a.x + b.x) / 2 + nx * off * side;
    const by = (a.y + b.y) / 2 + ny * off * side;
    const rot = Math.atan2(tangentY, tangentX) + (side < 0 ? Math.PI : 0);
    out.push({ x: bx, y: by, rot });
  }
}

function addLamppostsAlongPath(out: Lamppost[], path: PathSeg, spacing: number): void {
  let accum = 0;
  for (let i = 1; i < path.pts.length; i++) {
    const a = path.pts[i - 1], b = path.pts[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    accum += seg;
    if (accum >= spacing) {
      accum = 0;
      const nx = -(b.y - a.y) / (seg || 1);
      const ny = (b.x - a.x) / (seg || 1);
      const off = (path.width * 0.6) + 5;
      const side = Math.random() < 0.5 ? 1 : -1;
      out.push({ x: (a.x + b.x) / 2 + nx * off * side, y: (a.y + b.y) / 2 + ny * off * side });
    }
  }
}

function smoothPath(waypoints: number[][]): Vec2[] {
  const out: Vec2[] = [];
  const pts = waypoints.map(p => ({ x: p[0] * WORLD_SCALE, y: p[1] * WORLD_SCALE }));
  if (pts.length < 2) return pts;
  const closed = pts[0].x === pts[pts.length - 1].x && pts[0].y === pts[pts.length - 1].y;
  const get = (i: number) => {
    if (closed) return pts[(i + pts.length) % pts.length];
    return pts[Math.max(0, Math.min(pts.length - 1, i))];
  };
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const steps = 14;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t, t3 = t2 * t;
      const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2*p0.x - 5*p1.x + 4*p2.x - p3.x) * t2 + (-p0.x + 3*p1.x - 3*p2.x + p3.x) * t3);
      const y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2*p0.y - 5*p1.y + 4*p2.y - p3.y) * t2 + (-p0.y + 3*p1.y - 3*p2.y + p3.y) * t3);
      out.push({ x, y });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export function pointInPolygon(p: { x: number; y: number }, poly: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > p.y) !== (yj > p.y)) && (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function surfaceAt(map: MapData, p: Vec2): Surface {
  for (const br of map.bridges) {
    const d = distPointToSegment(p, br.ax, br.bx);
    if (d < br.width * 0.6) return "bridge";
  }
  for (const pond of map.ponds) {
    if (pointInPolygon(p, pond.pts)) return "water";
  }
  for (const c of map.courts) {
    if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) return "court";
  }
  for (const z of map.plazas) {
    const d = Math.hypot(p.x - z.x, p.y - z.y);
    if (d < z.r) return "plaza";
  }
  for (const seg of map.paths) {
    for (let i = 1; i < seg.pts.length; i++) {
      const a = seg.pts[i - 1], b = seg.pts[i];
      if (distPointToSegment(p, a, b) < seg.width * 0.6) return "path";
    }
  }
  for (const t of map.trees) {
    if (Math.hypot(p.x - t.x, p.y - t.y) < t.r * 0.45) return "tree";
  }
  return "grass";
}

export function blockedByBuilding(map: MapData, p: Vec2, radius: number): boolean {
  for (const b of map.buildings) {
    if (p.x >= b.x - radius && p.x <= b.x + b.w + radius &&
        p.y >= b.y - radius && p.y <= b.y + b.h + radius) {
      return true;
    }
  }
  return false;
}

function distPointToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx*dx + dy*dy;
  if (len2 < 1e-6) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}
