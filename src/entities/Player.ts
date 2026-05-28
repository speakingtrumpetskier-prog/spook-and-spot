// Watcher player. Walk / crouch / stand still. Noise & stealth.

import type { Vec2 } from "../game/types.ts";
import type { Input } from "../game/Input.ts";
import type { MapData } from "../world/Map.ts";
import { surfaceAt, WORLD_W, WORLD_H, blockedByBuilding } from "../world/Map.ts";
import { vNorm } from "../game/types.ts";

export type Stance = "walk" | "crouch" | "still";

export interface NoiseEvent {
  pos: Vec2;
  radius: number;
  alertness: number; // 0-100 contributed
  ttl: number;
}

export class Player {
  pos: Vec2 = { x: 600 * 2.5, y: 470 * 2.5 };  // start in Watcher Garden / east side
  vel: Vec2 = { x: 0, y: 0 };
  facing = 0;             // radians, 0 = east
  stance: Stance = "walk";
  patience = 0;           // 0..100 — rises when standing still
  stepTimer = 0;
  shellsRemaining = 0;    // for watcher this is irrelevant; kept for symmetry

  // visuals
  spriteFrame = 0;

  update(dt: number, input: Input, map: MapData, onNoise: (n: NoiseEvent) => void): void {
    // stance selection
    const crouch = input.isDown("shift");
    const stillKey = input.isDown(" ") || input.isDown("control");
    let target: Stance = "walk";
    if (stillKey) target = "still";
    else if (crouch) target = "crouch";
    this.stance = target;

    // movement
    const moveDir: Vec2 = { x: 0, y: 0 };
    if (input.isDown("w") || input.isDown("arrowup")) moveDir.y -= 1;
    if (input.isDown("s") || input.isDown("arrowdown")) moveDir.y += 1;
    if (input.isDown("a") || input.isDown("arrowleft")) moveDir.x -= 1;
    if (input.isDown("d") || input.isDown("arrowright")) moveDir.x += 1;

    const moving = (moveDir.x !== 0 || moveDir.y !== 0) && this.stance !== "still";
    let speed = 0;
    if (this.stance === "walk") speed = 140;
    if (this.stance === "crouch") speed = 70;
    if (this.stance === "still") speed = 0;

    if (moving) {
      const n = vNorm(moveDir);
      this.vel.x = n.x * speed;
      this.vel.y = n.y * speed;
      this.facing = Math.atan2(n.y, n.x);
      this.patience = Math.max(0, this.patience - dt * 30);
    } else {
      this.vel.x = 0;
      this.vel.y = 0;
      if (this.stance === "still") this.patience = Math.min(100, this.patience + dt * 18);
      else this.patience = Math.max(0, this.patience - dt * 10);
    }

    // Tentative new position with collision (block water + buildings)
    const nx = this.pos.x + this.vel.x * dt;
    const ny = this.pos.y + this.vel.y * dt;
    const surfNX = surfaceAt(map, { x: nx, y: this.pos.y });
    const surfNY = surfaceAt(map, { x: this.pos.x, y: ny });
    const buildBlockX = blockedByBuilding(map, { x: nx, y: this.pos.y }, 4);
    const buildBlockY = blockedByBuilding(map, { x: this.pos.x, y: ny }, 4);
    if (surfNX !== "water" && !buildBlockX && nx > 4 && nx < WORLD_W - 4) this.pos.x = nx;
    if (surfNY !== "water" && !buildBlockY && ny > 4 && ny < WORLD_H - 4) this.pos.y = ny;

    // Footstep noise
    if (moving) {
      this.stepTimer += dt;
      const stepInterval = this.stance === "crouch" ? 0.6 : 0.35;
      if (this.stepTimer > stepInterval) {
        this.stepTimer = 0;
        const surf = surfaceAt(map, this.pos);
        // grass = quiet, path/plaza = louder, crouch reduces all (scaled for bigger world)
        let radius = 35, alert = 4;
        if (surf === "path" || surf === "plaza" || surf === "bridge") { radius = 70; alert = 9; }
        if (surf === "court") { radius = 55; alert = 7; }
        if (this.stance === "crouch") { radius *= 0.45; alert *= 0.3; }
        onNoise({ pos: { ...this.pos }, radius, alertness: alert, ttl: 0.4 });
        this.spriteFrame = (this.spriteFrame + 1) % 4;
      }
    } else {
      this.spriteFrame = 0;
    }
  }
}
