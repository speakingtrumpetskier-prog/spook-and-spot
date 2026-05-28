import type { Vec2 } from "../game/types.ts";
import { WORLD_SCALE } from "./Map.ts";

export type ZoneId = "hunter" | "watcher" | "pond";

const S = (n: number) => n * WORLD_SCALE;

export const ZONES: { id: ZoneId; cx: number; cy: number; r: number; label: string }[] = [
  { id: "hunter",  cx: S(175), cy: S(200), r: S(220), label: "Hunter's Woods" },
  { id: "watcher", cx: S(590), cy: S(460), r: S(220), label: "Watcher's Garden" },
  { id: "pond",    cx: S(420), cy: S(470), r: S(160), label: "Loring Pond" },
];

export function zoneAt(p: Vec2): ZoneId {
  let bestId: ZoneId = "watcher";
  let bestScore = -Infinity;
  for (const z of ZONES) {
    const d = Math.hypot(p.x - z.cx, p.y - z.cy);
    const score = z.r - d;
    if (score > bestScore) {
      bestScore = score;
      bestId = z.id;
    }
  }
  return bestId;
}

export function oppositeZone(z: ZoneId): ZoneId {
  if (z === "hunter") return "watcher";
  if (z === "watcher") return "hunter";
  return "watcher";
}

export function zoneCenter(z: ZoneId): Vec2 {
  const zd = ZONES.find(zz => zz.id === z)!;
  return { x: zd.cx, y: zd.cy };
}
