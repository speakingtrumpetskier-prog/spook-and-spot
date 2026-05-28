// AI hunter NPC. Patrols, tracks birds, sets up shots, scores. Beatable but competent.

import type { Vec2 } from "../game/types.ts";
import { vDist, vNorm, makeRng } from "../game/types.ts";
import type { MapData } from "../world/Map.ts";
import { WORLD_W, WORLD_H, blockedByBuilding } from "../world/Map.ts";
import type { Bird } from "../entities/Bird.ts";
import type { NoiseEvent } from "../entities/Player.ts";
import { zoneCenter } from "../world/Zones.ts";

export type HunterMode = "patrol" | "stalk" | "aim" | "reload" | "relocate";

export class Hunter {
  pos: Vec2 = { x: 175 * 2.5, y: 200 * 2.5 };  // NW spawn (Hunter's Woods)
  vel: Vec2 = { x: 0, y: 0 };
  facing = 0;
  mode: HunterMode = "patrol";
  modeTimer = 0;

  // Resources
  shellsLeft = 12;
  shellsInMag = 3;
  reloadTimer = 0;

  // Tactical state
  target: Bird | null = null;
  patrolTarget: Vec2;
  aimTime = 0;
  aimAcc = 0;  // accuracy buildup while aiming (0..1)
  cooldown = 0; // between shots

  score = 0;
  bag: { speciesId: string; weight: number; time: number }[] = [];

  rng: () => number;

  // For visualizing for player (a far-away figure)
  spriteBob = 0;

  constructor(seed: number) {
    this.rng = makeRng(seed ^ 0xBEEF);
    this.patrolTarget = { ...this.pos };
  }

  update(dt: number, birds: Bird[], map: MapData, onShot: (n: NoiseEvent) => void): void {
    this.modeTimer += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.reloadTimer = Math.max(0, this.reloadTimer - dt);

    // Reload when empty and shells available
    if (this.shellsInMag === 0 && this.shellsLeft > 0 && this.mode !== "reload") {
      this.mode = "reload";
      this.reloadTimer = 2.5;
      this.modeTimer = 0;
    }

    switch (this.mode) {
      case "patrol":   this.doPatrol(dt, birds, map); break;
      case "stalk":    this.doStalk(dt, birds, map, onShot); break;
      case "aim":      this.doAim(dt, onShot); break;
      case "reload":   this.doReload(dt); break;
      case "relocate": this.doRelocate(dt, map); break;
    }

    // Apply velocity with building collision
    const nx = this.pos.x + this.vel.x * dt;
    const ny = this.pos.y + this.vel.y * dt;
    if (!blockedByBuilding(map, { x: nx, y: this.pos.y }, 4)) this.pos.x = nx;
    if (!blockedByBuilding(map, { x: this.pos.x, y: ny }, 4)) this.pos.y = ny;
    this.pos.x = Math.max(5, Math.min(WORLD_W - 5, this.pos.x));
    this.pos.y = Math.max(5, Math.min(WORLD_H - 5, this.pos.y));

    if (Math.hypot(this.vel.x, this.vel.y) > 1) {
      this.spriteBob += dt * 6;
    }
  }

  private doPatrol(dt: number, birds: Bird[], _map: MapData): void {
    // Find a high-value target within reasonable range
    const candidate = this.pickTarget(birds);
    if (candidate) {
      this.target = candidate;
      this.mode = "stalk";
      this.modeTimer = 0;
      return;
    }
    // Move toward patrol target
    const d = vDist(this.pos, this.patrolTarget);
    if (d < 12 || this.modeTimer > 8) {
      // pick a new patrol point (stay mostly in hunter zone)
      const c = zoneCenter("hunter");
      const r = 350;
      this.patrolTarget = {
        x: c.x + (this.rng() - 0.5) * r * 2,
        y: c.y + (this.rng() - 0.5) * r * 2,
      };
      this.modeTimer = 0;
    }
    this.moveToward(this.patrolTarget, 65, dt);
    void dt;
  }

  private doStalk(dt: number, _birds: Bird[], map: MapData, onShot: (n: NoiseEvent) => void): void {
    if (!this.target || this.target.state === "dead") {
      this.target = null;
      this.mode = "patrol";
      return;
    }
    const b = this.target;
    const d = vDist(this.pos, b.pos);
    // Within shooting range — set up shot
    const range = b.altitude > 5 ? 110 : 150;
    if (d < range) {
      this.mode = "aim";
      this.modeTimer = 0;
      this.aimTime = 0;
      this.aimAcc = 0;
      this.facing = Math.atan2(b.pos.y - this.pos.y, b.pos.x - this.pos.x);
      this.vel.x = 0;
      this.vel.y = 0;
      return;
    }
    if (d > 600) {
      this.target = null;
      this.mode = "patrol";
      return;
    }
    // Stalk at near-crouch speed
    this.moveToward(b.pos, 55, dt);
    // Stalking is mostly quiet — only occasional twig snap
    if (this.modeTimer > 1.6) {
      onShot({ pos: { ...this.pos }, radius: 45, alertness: 3, ttl: 0.3 });
      this.modeTimer = 0;
    }
    void map;
  }

  private doAim(dt: number, onShot: (n: NoiseEvent) => void): void {
    if (!this.target || this.target.state === "dead") { this.mode = "patrol"; this.target = null; return; }
    const b = this.target;
    const d = vDist(this.pos, b.pos);
    if (d > 225) { this.mode = "stalk"; return; }

    // Build accuracy over up to 1.0s
    this.aimTime += dt;
    this.aimAcc = Math.min(1, this.aimTime / 0.9);
    // Track moving target
    this.facing = Math.atan2(b.pos.y - this.pos.y, b.pos.x - this.pos.x);

    // Decide when to fire — wait for accuracy and not too soon after cooldown
    if (this.aimAcc > 0.7 && this.cooldown === 0 && this.shellsInMag > 0) {
      this.fireShot(b, d, onShot);
    }
  }

  private doReload(_dt: number): void {
    this.vel.x = 0; this.vel.y = 0;
    if (this.reloadTimer <= 0.01) {
      const need = 3 - this.shellsInMag;
      const take = Math.min(need, this.shellsLeft);
      this.shellsInMag += take;
      this.shellsLeft -= take;
      this.mode = "patrol";
      this.modeTimer = 0;
    }
  }

  private doRelocate(dt: number, _map: MapData): void {
    const d = vDist(this.pos, this.patrolTarget);
    if (d < 14) {
      this.mode = "patrol";
      this.modeTimer = 0;
      return;
    }
    this.moveToward(this.patrolTarget, 125, dt);
  }

  private fireShot(b: Bird, dist: number, onShot: (n: NoiseEvent) => void): void {
    this.shellsInMag--;
    this.cooldown = 0.9;
    // Hit chance: distance falloff over bigger world
    const distFactor = Math.max(0, 1 - dist / 200);
    const moveFactor = (b.state === "flying" || b.state === "takeoff") ? 0.45 : 1;
    const sizeBonus = b.species.length > 12 ? 1.15 : 1.0;
    const hitChance = Math.min(0.92, 0.55 + this.aimAcc * 0.4) * distFactor * moveFactor * sizeBonus;

    onShot({ pos: { ...this.pos }, radius: 325, alertness: 90, ttl: 0.5 });

    if (this.rng() < hitChance) {
      b.takeHit();
      this.score += b.species.pointsHunt;
      this.bag.push({ speciesId: b.species.id, weight: b.species.length, time: 0 });
      const c = zoneCenter("hunter");
      this.patrolTarget = {
        x: c.x + (this.rng() - 0.5) * 500,
        y: c.y + (this.rng() - 0.5) * 500,
      };
      this.target = null;
      this.mode = "relocate";
    } else {
      // Missed — bird is now extra alert
      b.alertness = 100;
      this.target = null;
      this.mode = "patrol";
    }
  }

  private moveToward(p: Vec2, speed: number, dt: number): void {
    const dir = vNorm({ x: p.x - this.pos.x, y: p.y - this.pos.y });
    this.vel.x = dir.x * speed;
    this.vel.y = dir.y * speed;
    if (dir.x !== 0 || dir.y !== 0) this.facing = Math.atan2(dir.y, dir.x);
    void dt;
  }

  // Pick best valuable target the hunter can see/sense
  private pickTarget(birds: Bird[]): Bird | null {
    let best: Bird | null = null;
    let bestScore = -Infinity;
    for (const b of birds) {
      if (b.state === "dead" || b.state === "hit") continue;
      if (b.altitude > 35) continue;
      const d = vDist(this.pos, b.pos);
      if (d > 550) continue;
      const score = b.species.pointsHunt * 10 - d * 0.02 - b.alertness * 0.3;
      if (score > bestScore) {
        bestScore = score;
        best = b;
      }
    }
    return bestScore > 5 ? best : null;
  }
}
