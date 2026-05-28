// Binoculars system — overlay zoom view, target selection, ID + photo.

import type { Game } from "../game/Game.ts";
import type { Bird } from "../entities/Bird.ts";
import { vDist } from "../game/types.ts";

export type BinoMode = "off" | "raising" | "on";

export class Binoculars {
  mode: BinoMode = "off";
  zoomBoost = 1;             // multiplier added on top of camera zoom while up
  targetZoomBoost = 1;
  aimOffset = { x: 0, y: 0 }; // world-units offset from player
  targetedBird: Bird | null = null;
  // Photo stability tracking
  photoLockTime = 0;
  photoFlash = 0;

  update(dt: number, game: Game): void {
    const input = game.input;
    // Hold right-mouse to raise; toggle by tap not implemented
    const want = input.mouseDown.right;
    if (want && this.mode === "off") this.mode = "raising";
    if (!want) this.mode = "off";

    if (this.mode === "raising") {
      this.targetZoomBoost = 2.4;
      this.zoomBoost += (this.targetZoomBoost - this.zoomBoost) * Math.min(1, dt * 8);
      if (this.zoomBoost > 2.2) this.mode = "on";
    } else if (this.mode === "off") {
      this.targetZoomBoost = 1;
      this.zoomBoost += (this.targetZoomBoost - this.zoomBoost) * Math.min(1, dt * 10);
    }

    // While bin is up — translate mouse to world aim
    if (this.mode === "on" || this.mode === "raising") {
      // aim drift adds a little sway
      const sway = Math.sin(game.time * 1.6) * 0.4;
      const worldPt = game.camera.screenToWorld(input.mouse.x, input.mouse.y);
      this.aimOffset.x = worldPt.x - game.player.pos.x + sway;
      this.aimOffset.y = worldPt.y - game.player.pos.y;
    }

    // Target the closest bird to the aim point (within radius)
    if (this.mode === "on") {
      const aim = {
        x: game.player.pos.x + this.aimOffset.x,
        y: game.player.pos.y + this.aimOffset.y,
      };
      let best: Bird | null = null;
      let bestD = 18 / this.effectiveZoom(game);  // smaller pickup radius at higher zoom
      for (const b of game.spawner.birds) {
        if (b.state === "dead") continue;
        const d = vDist(aim, b.pos);
        if (d < bestD) { bestD = d; best = b; }
      }
      this.targetedBird = best;

      // Photo stability — if a bird is centered & still focused, build photoLockTime
      if (best) {
        const d = vDist(aim, best.pos);
        if (d < 6) this.photoLockTime += dt;
        else this.photoLockTime = Math.max(0, this.photoLockTime - dt * 0.5);
      } else {
        this.photoLockTime = Math.max(0, this.photoLockTime - dt * 1.0);
      }
    } else {
      this.targetedBird = null;
      this.photoLockTime = 0;
    }

    if (this.photoFlash > 0) this.photoFlash = Math.max(0, this.photoFlash - dt * 4);
  }

  effectiveZoom(game: Game): number {
    return game.camera.zoom * this.zoomBoost;
  }

  // Render lens vignette + crosshair overlay (called AFTER world render, in screen-space)
  drawOverlay(ctx: CanvasRenderingContext2D, game: Game): void {
    const blend = (this.zoomBoost - 1) / 1.4;
    if (blend < 0.01) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    // Dark lens vignette
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.45;
    const grad = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r * 1.1);
    grad.addColorStop(0, `rgba(0,0,0,0)`);
    grad.addColorStop(0.55, `rgba(0,0,0,${0.45 * blend})`);
    grad.addColorStop(1, `rgba(0,0,0,${0.95 * blend})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Twin-circle lens shape (double barrel binos)
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = `rgba(0,0,0,${0.95 * blend})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();

    // Crosshair (center of screen)
    ctx.strokeStyle = `rgba(255,255,255,${0.5 * blend})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy);
    ctx.lineTo(cx - 4, cy);
    ctx.moveTo(cx + 4, cy);
    ctx.lineTo(cx + 12, cy);
    ctx.moveTo(cx, cy - 12);
    ctx.lineTo(cx, cy - 4);
    ctx.moveTo(cx, cy + 4);
    ctx.lineTo(cx, cy + 12);
    ctx.stroke();
    // tick marks
    ctx.strokeStyle = `rgba(255,255,255,${0.25 * blend})`;
    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue;
      ctx.beginPath();
      ctx.moveTo(cx + i * 20, cy - 3);
      ctx.lineTo(cx + i * 20, cy + 3);
      ctx.stroke();
    }

    // Reticle ring
    ctx.strokeStyle = `rgba(255,255,255,${0.18 * blend})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.stroke();

    // Target callout
    if (this.targetedBird) {
      const b = this.targetedBird;
      const s = game.camera.worldToScreen(b.pos.x, b.pos.y);
      ctx.strokeStyle = `rgba(220, 240, 200, ${0.8 * blend})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 14, 0, Math.PI * 2);
      ctx.stroke();
      // ticks
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(s.x + Math.cos(a) * 14, s.y + Math.sin(a) * 14);
        ctx.lineTo(s.x + Math.cos(a) * 18, s.y + Math.sin(a) * 18);
        ctx.stroke();
      }
      // photo lock meter
      if (this.photoLockTime > 0) {
        ctx.strokeStyle = `rgba(255,235,150,${0.9 * blend})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const sweep = Math.min(1, this.photoLockTime / 1.0) * Math.PI * 2;
        ctx.arc(s.x, s.y, 16, -Math.PI / 2, -Math.PI / 2 + sweep);
        ctx.stroke();
      }
    }

    // Photo flash
    if (this.photoFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.photoFlash})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
}
