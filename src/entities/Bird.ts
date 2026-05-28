// Bird entity with state machine: roosting/feeding/alert/fleeing/lured/swimming/flying/dead.

import type { Vec2 } from "../game/types.ts";
import { vDist, makeRng, randRange, randChoice, lerpAngle } from "../game/types.ts";
import type { MapData } from "../world/Map.ts";
import { surfaceAt, WORLD_W, WORLD_H, pointInPolygon } from "../world/Map.ts";
import { SPECIES, type SpeciesDef, type SpeciesId } from "../birds/species.ts";
import type { BirdState, BirdSprite } from "../birds/render.ts";
import type { NoiseEvent } from "./Player.ts";
import { zoneAt, zoneCenter, oppositeZone, type ZoneId } from "../world/Zones.ts";

let nextBirdId = 1;

export class Bird implements BirdSprite {
  id: number;
  species: SpeciesDef;
  pos: Vec2;
  vel: Vec2 = { x: 0, y: 0 };
  facing = 0;
  state: BirdState = "perched";
  altitude = 0;       // 0 = ground, >0 = airborne
  targetAlt = 0;
  bobPhase = Math.random() * Math.PI * 2;

  alertness = 0;      // 0..100
  hunger = 0;         // 0..100
  stamina = 100;
  flockId: number;

  stateTimer = 0;
  target: Vec2 | null = null;   // destination for movement
  flushedTo: ZoneId | null = null;
  hitTimer?: number;
  // Anti-spin: cooldown on shore-bounce so a bird near shore can't flip 180° every frame
  shoreTurnCooldown = 0;
  // Smoothed-facing target — facing eases toward this each frame
  desiredFacing = 0;

  // For spotting/IDing — track when each player has identified this bird
  spottedByWatcher = false;
  idedByWatcher = false;

  rng: () => number;

  constructor(species: SpeciesDef, pos: Vec2, flockId: number, seed: number) {
    this.id = nextBirdId++;
    this.species = species;
    this.pos = { ...pos };
    this.flockId = flockId;
    this.rng = makeRng(seed + this.id);
    this.facing = randRange(this.rng, -Math.PI, Math.PI);
    this.desiredFacing = this.facing;
    this.hunger = randRange(this.rng, 30, 70);

    // Initial state based on surface preference
    if (species.preferredSurface === "water") this.state = "swimming";
    else if (species.preferredSurface === "tree") this.state = "perched";
    else this.state = "feeding";

    // Soaring birds (redtail) start in the air
    if (species.id === "redtail") {
      this.state = "flying";
      this.altitude = 30;
      this.targetAlt = 30;
    }
  }

  update(dt: number, map: MapData, playerNoises: NoiseEvent[], lures: { pos: Vec2; speciesId: SpeciesId; ttl: number }[]): void {
    this.stateTimer += dt;
    this.bobPhase += dt * (this.state === "walking" ? 8 : 2);
    this.shoreTurnCooldown = Math.max(0, this.shoreTurnCooldown - dt);

    // Altitude lerp toward target
    if (Math.abs(this.altitude - this.targetAlt) > 0.05) {
      const dir = Math.sign(this.targetAlt - this.altitude);
      this.altitude += dir * Math.min(Math.abs(this.targetAlt - this.altitude), 30 * dt);
    }

    // Handle hit/dead first
    if (this.state === "hit") {
      this.hitTimer = (this.hitTimer ?? 0) + dt;
      this.altitude = Math.max(0, this.altitude - 18 * dt);
      if (this.hitTimer > 0.6) {
        this.state = "dead";
      }
      return;
    }
    if (this.state === "dead") return;

    // Receive noise/alertness updates from player events.
    // Accumulate per-event proportional to its TTL share, so a noise event of
    // alertness=A, ttl=T contributes ~A*falloff total over its lifetime.
    for (const n of playerNoises) {
      const d = vDist(this.pos, n.pos);
      if (d < n.radius) {
        const falloff = 1 - d / n.radius;
        const baseTtl = 0.4;
        const perFrame = (n.alertness * falloff) * (dt / baseTtl);
        this.alertness = Math.min(100, this.alertness + perFrame);
      }
    }

    // Lures — attract toward a position if matching species and not too alert
    let activeLure: { pos: Vec2 } | null = null;
    for (const lure of lures) {
      if (lure.speciesId === this.species.id && this.alertness < 40) {
        const d = vDist(this.pos, lure.pos);
        if (d < this.species.callRange) {
          activeLure = lure;
          break;
        }
      }
    }
    if (activeLure && this.state !== "flying" && this.state !== "takeoff") {
      this.target = activeLure.pos;
      if (this.state === "swimming" || this.state === "feeding" || this.state === "perched") {
        this.state = "walking";
        this.stateTimer = 0;
      }
    }

    // Alertness decay over time (faster decay so birds settle back down)
    this.alertness = Math.max(0, this.alertness - dt * 12);

    // Flush threshold
    if (this.alertness > this.species.alertThreshold && this.state !== "flying" && this.state !== "takeoff") {
      this.flush(map);
    }

    // State actions
    switch (this.state) {
      case "perched":
      case "feeding":
      case "swimming":
      case "alert":
        this.idleBehavior(dt, map);
        break;
      case "walking":
        this.walkBehavior(dt, map);
        break;
      case "takeoff":
        this.takeoffBehavior(dt);
        break;
      case "flying":
        this.flyBehavior(dt, map);
        break;
      case "landing":
        this.landBehavior(dt);
        break;
    }

    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.pos.x = Math.max(5, Math.min(WORLD_W - 5, this.pos.x));
    this.pos.y = Math.max(5, Math.min(WORLD_H - 5, this.pos.y));

    // Smooth facing toward desiredFacing — turn rate depends on state
    let turnRate = 5; // rad/sec default
    if (this.state === "flying") turnRate = 2.4;
    else if (this.state === "swimming") turnRate = 2.0;
    else if (this.state === "walking") turnRate = 6.0;
    else if (this.state === "takeoff") turnRate = 8.0;
    this.facing = lerpAngle(this.facing, this.desiredFacing, Math.min(1, dt * turnRate));
  }

  private idleBehavior(_dt: number, map: MapData): void {
    this.vel.x = 0;
    this.vel.y = 0;

    // Periodic transitions
    if (this.stateTimer > 2 + this.rng() * 3) {
      this.stateTimer = 0;
      const r = this.rng();
      if (this.state === "feeding" && r < 0.4) this.state = "alert";
      else if (this.state === "alert" && r < 0.6) this.state = "feeding";
      else if (this.state === "perched" && r < 0.3) this.state = "alert";
      else if (this.state === "alert" && this.species.preferredSurface === "tree") this.state = "perched";
      else if (this.state === "swimming" && r < 0.3) {
        // Pick a new desired swim direction — facing will smoothly turn toward it
        this.desiredFacing = this.facing + (this.rng() - 0.5) * Math.PI;
      }
    }

    // Gentle swim drift
    if (this.state === "swimming") {
      const sp = this.species.walkSpeed * 0.3;
      this.vel.x = Math.cos(this.facing) * sp;
      this.vel.y = Math.sin(this.facing) * sp;

      // Shore avoidance: turn away from shore when about to leave water.
      // Only retarget facing when cooldown is 0 — prevents per-frame 180° flipping.
      if (this.shoreTurnCooldown === 0) {
        const ahead = { x: this.pos.x + Math.cos(this.facing) * 12, y: this.pos.y + Math.sin(this.facing) * 12 };
        const surf = surfaceAt(map, ahead);
        if (surf !== "water") {
          // Turn away, slight jitter, set cooldown so we don't re-trigger immediately
          this.desiredFacing = this.facing + Math.PI + (this.rng() - 0.5) * 0.6;
          this.shoreTurnCooldown = 2.0;
        }
      }
    }
  }

  private walkBehavior(_dt: number, map: MapData): void {
    if (!this.target) {
      this.target = this.pickWanderTarget(map);
    }
    const dx = this.target.x - this.pos.x;
    const dy = this.target.y - this.pos.y;
    const d = Math.hypot(dx, dy);
    if (d < 6) {
      this.target = null;
      this.state = (this.species.preferredSurface === "water") ? "swimming" : "feeding";
      this.stateTimer = 0;
      return;
    }
    const sp = this.species.walkSpeed;
    this.vel.x = (dx / d) * sp;
    this.vel.y = (dy / d) * sp;
    this.desiredFacing = Math.atan2(dy, dx);
  }

  private takeoffBehavior(dt: number): void {
    this.altitude = Math.min(20, this.altitude + 25 * dt);
    this.vel.x *= 0.95;
    this.vel.y *= 0.95;
    if (this.stateTimer > 0.6) {
      this.state = "flying";
      this.stateTimer = 0;
    }
  }

  private flyBehavior(dt: number, map: MapData): void {
    if (!this.target) {
      this.target = this.pickFlightTarget(map);
    }
    const dx = this.target.x - this.pos.x;
    const dy = this.target.y - this.pos.y;
    const d = Math.hypot(dx, dy);

    // Soaring (redtail) — wide lazy orbit, not a tight whip-around
    if (this.species.id === "redtail") {
      const center = this.target;
      const ang = Math.atan2(this.pos.y - center.y, this.pos.x - center.x) + dt * 0.25;
      const radius = 280;
      const tx = center.x + Math.cos(ang) * radius;
      const ty = center.y + Math.sin(ang) * radius;
      const ddx = tx - this.pos.x, ddy = ty - this.pos.y;
      const dd = Math.hypot(ddx, ddy) || 1;
      const sp = this.species.flightSpeed * 0.75;  // slower than full flight speed
      this.vel.x = (ddx / dd) * sp;
      this.vel.y = (ddy / dd) * sp;
      this.desiredFacing = Math.atan2(this.vel.y, this.vel.x);
      return;
    }

    if (d < 8) {
      this.state = "landing";
      this.stateTimer = 0;
      this.targetAlt = 0;
      this.vel.x *= 0.5;
      this.vel.y *= 0.5;
      return;
    }
    const sp = this.species.flightSpeed;
    this.vel.x = (dx / d) * sp;
    this.vel.y = (dy / d) * sp;
    this.desiredFacing = Math.atan2(dy, dx);
  }

  private landBehavior(dt: number): void {
    if (this.altitude < 1) {
      this.altitude = 0;
      this.target = null;
      this.alertness = Math.max(0, this.alertness - 30);
      this.state = (this.species.preferredSurface === "water") ? "swimming" : "feeding";
      this.stateTimer = 0;
    }
    void dt;
  }

  private flush(map: MapData): void {
    // Decide flee target: opposite zone from threat origin, with jitter
    const currentZone = zoneAt(this.pos);
    const flushZone = oppositeZone(currentZone);
    const c = zoneCenter(flushZone);
    const jx = (this.rng() - 0.5) * 500;
    const jy = (this.rng() - 0.5) * 500;
    let tx = c.x + jx, ty = c.y + jy;

    // Don't flush into ponds (unless waterfowl)
    if (this.species.preferredSurface !== "water") {
      for (const pond of map.ponds) {
        if (pointInPolygon({ x: tx, y: ty }, pond.pts)) {
          tx = c.x; ty = c.y - 250;
        }
      }
    }

    this.target = { x: tx, y: ty };
    this.flushedTo = flushZone;
    this.state = "takeoff";
    this.targetAlt = 20;
    this.stateTimer = 0;
    // Immediate velocity in target direction — facing snaps too (flush is sudden)
    const dx = tx - this.pos.x, dy = ty - this.pos.y;
    const d = Math.hypot(dx, dy) || 1;
    this.facing = Math.atan2(dy, dx);
    this.desiredFacing = this.facing;
    this.vel.x = (dx / d) * this.species.flightSpeed * 0.3;
    this.vel.y = (dy / d) * this.species.flightSpeed * 0.3;
  }

  private pickWanderTarget(map: MapData): Vec2 {
    for (let i = 0; i < 10; i++) {
      const dx = (this.rng() - 0.5) * 150;
      const dy = (this.rng() - 0.5) * 150;
      const t = { x: this.pos.x + dx, y: this.pos.y + dy };
      const s = surfaceAt(map, t);
      if (this.species.preferredSurface === "water" && s === "water") return t;
      if (this.species.preferredSurface !== "water" && s !== "water") return t;
    }
    return { ...this.pos };
  }

  private pickFlightTarget(_map: MapData): Vec2 {
    // Default: head to opposite zone
    if (this.target) return this.target;
    const z = oppositeZone(zoneAt(this.pos));
    return zoneCenter(z);
  }

  // Called externally when hit by hunter
  takeHit(): void {
    this.state = "hit";
    this.hitTimer = 0;
    this.stateTimer = 0;
    this.targetAlt = 0;
  }
}

// === Spawner ===

export class BirdSpawner {
  birds: Bird[] = [];
  flockCounter = 0;
  rng: () => number;
  seed: number;

  // Event bird state
  eventScheduled: { species: SpeciesId; atTime: number } | null = null;
  eventSpawned = false;

  constructor(seed: number) {
    this.seed = seed;
    this.rng = makeRng(seed);
  }

  // Initial population — denser for the larger world
  populate(map: MapData): void {
    const species = Object.values(SPECIES);
    for (const sp of species) {
      if (sp.tier === "event") continue;
      const target = Math.round(sp.spawnWeight * 0.45);
      for (let i = 0; i < target; i++) {
        this.spawnFlock(sp, map);
      }
    }
    const t = randRange(this.rng, 180, 480);
    this.eventScheduled = { species: "tanager", atTime: t };
  }

  spawnFlock(sp: SpeciesDef, map: MapData): void {
    const count = Math.round(randRange(this.rng, sp.flockSize[0], sp.flockSize[1]));
    const flockId = ++this.flockCounter;
    const center = this.findSpawnSpot(sp, map);
    if (!center) return;
    for (let i = 0; i < count; i++) {
      const ox = (this.rng() - 0.5) * 15;
      const oy = (this.rng() - 0.5) * 15;
      const bird = new Bird(sp, { x: center.x + ox, y: center.y + oy }, flockId, this.seed);
      this.birds.push(bird);
    }
  }

  private findSpawnSpot(sp: SpeciesDef, map: MapData): Vec2 | null {
    for (let i = 0; i < 30; i++) {
      const x = randRange(this.rng, 30, WORLD_W - 30);
      const y = randRange(this.rng, 30, WORLD_H - 30);
      const surf = surfaceAt(map, { x, y });
      if (sp.preferredSurface === "water" && surf === "water") return { x, y };
      if (sp.preferredSurface === "tree" && surf === "tree") return { x, y };
      if (sp.preferredSurface === "grass" && (surf === "grass" || surf === "path")) return { x, y };
      if (sp.preferredSurface === "any" && surf !== "water") return { x, y };
    }
    return null;
  }

  update(dt: number, gameTime: number, map: MapData): void {
    // Trigger event bird
    if (this.eventScheduled && !this.eventSpawned && gameTime > this.eventScheduled.atTime) {
      const sp = SPECIES[this.eventScheduled.species];
      this.spawnFlock(sp, map);
      this.eventSpawned = true;
    }

    // Steady churn so population stays interesting across the round
    if (this.rng() < dt * 0.25) {
      const commons = Object.values(SPECIES).filter(s => s.tier === "common" || s.tier === "uncommon");
      const sp = randChoice(this.rng, commons);
      if (this.birds.filter(b => b.species.id === sp.id && b.state !== "dead").length < sp.spawnWeight * 0.8) {
        this.spawnFlock(sp, map);
      }
    }

    // Cleanup very-distant dead birds eventually (keep them for end-of-match)
    void dt;
  }
}
