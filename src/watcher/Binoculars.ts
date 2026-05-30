// Binoculars system — touchpad friendly.
// E toggles binoculars. Move the touchpad to aim the reticle.
// Hold the reticle on a bird and it auto-identifies (no click), then auto-photographs.

import type { Game } from "../game/Game.ts";
import type { Bird } from "../entities/Bird.ts";

export type BinoMode = "off" | "raising" | "on";

// Tuning
const PICK_RADIUS_PX = 70;     // how close (screen px) the cursor must be to target a bird
const FOCUS_RADIUS_PX = 38;    // within this, focus charges
const ID_FOCUS_TIME = 0.7;     // seconds of focus to trigger an ID
const PHOTO_FOCUS_TIME = 1.0;  // seconds of focus (after ID) to snap a photo

export class Binoculars {
  mode: BinoMode = "off";
  zoomBoost = 1;
  targetZoomBoost = 1;
  aimOffset = { x: 0, y: 0 };       // world-units offset from player (drives camera pan)
  targetedBird: Bird | null = null;
  focusTime = 0;                    // charges while a bird is held under the reticle
  photoFlash = 0;

  // Screen-space reticle position (follows the touchpad cursor)
  reticle = { x: 0, y: 0 };

  private focusBirdId: number | null = null;

  update(dt: number, game: Game): void {
    const input = game.input;

    // E toggles binoculars on/off
    if (input.wasPressed("e")) {
      if (this.mode === "off") this.mode = "raising";
      else this.mode = "off";
    }

    if (this.mode === "raising") {
      this.targetZoomBoost = 2.0;
      this.zoomBoost += (this.targetZoomBoost - this.zoomBoost) * Math.min(1, dt * 8);
      if (this.zoomBoost > 1.85) this.mode = "on";
    } else if (this.mode === "off") {
      this.targetZoomBoost = 1;
      this.zoomBoost += (this.targetZoomBoost - this.zoomBoost) * Math.min(1, dt * 10);
      this.targetedBird = null;
      this.focusTime = 0;
      this.focusBirdId = null;
    }

    if (this.mode === "on" || this.mode === "raising") {
      // Reticle follows the touchpad cursor (with a tiny natural sway)
      const sway = Math.sin(game.time * 1.6) * 1.2;
      this.reticle.x = input.mouse.x + sway;
      this.reticle.y = input.mouse.y;
      // aimOffset drives the camera pan toward where you're looking
      const worldPt = game.camera.screenToWorld(this.reticle.x, this.reticle.y);
      this.aimOffset.x = worldPt.x - game.player.pos.x;
      this.aimOffset.y = worldPt.y - game.player.pos.y;
    }

    if (this.mode === "on") {
      // Target the bird nearest the reticle in SCREEN space
      let best: Bird | null = null;
      let bestD = PICK_RADIUS_PX;
      for (const b of game.spawner.birds) {
        if (b.state === "dead") continue;
        const s = game.camera.worldToScreen(b.pos.x, b.pos.y);
        const d = Math.hypot(s.x - this.reticle.x, s.y - this.reticle.y);
        if (d < bestD) { bestD = d; best = b; }
      }
      this.targetedBird = best;

      // Reset focus when the target changes
      if (best && best.id !== this.focusBirdId) {
        this.focusBirdId = best.id;
        this.focusTime = 0;
      }
      if (!best) {
        this.focusBirdId = null;
        this.focusTime = Math.max(0, this.focusTime - dt * 2);
      }

      // Charge focus while the bird is held close & steady (and no quiz blocking)
      if (best && !game.quiz.active) {
        const s = game.camera.worldToScreen(best.pos.x, best.pos.y);
        const d = Math.hypot(s.x - this.reticle.x, s.y - this.reticle.y);
        if (d < FOCUS_RADIUS_PX) {
          this.focusTime += dt;
        } else {
          this.focusTime = Math.max(0, this.focusTime - dt * 1.5);
        }
      }
    }

    if (this.photoFlash > 0) this.photoFlash = Math.max(0, this.photoFlash - dt * 4);
  }

  effectiveZoom(game: Game): number {
    return game.camera.zoom * this.zoomBoost;
  }

  // True when the held bird has charged enough to auto-identify
  get readyToId(): boolean {
    return this.mode === "on" && this.focusTime >= ID_FOCUS_TIME;
  }

  // True when the held (already-IDed) bird has charged enough to auto-photograph
  get readyToPhoto(): boolean {
    return this.mode === "on" && this.focusTime >= PHOTO_FOCUS_TIME;
  }

  // Called after triggering an ID attempt — back off so it doesn't instantly retry
  resetAfterId(): void {
    this.focusTime = -1.0;
  }
  // Called after taking a photo
  resetAfterPhoto(): void {
    this.focusTime = 0;
  }

  drawOverlay(ctx: CanvasRenderingContext2D, game: Game): void {
    const blend = (this.zoomBoost - 1) / 1.4;
    if (blend < 0.01) return;
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Lens vignette centred on screen
    const scx = w / 2, scy = h / 2;
    const r = Math.min(w, h) * 0.45;
    const grad = ctx.createRadialGradient(scx, scy, r * 0.55, scx, scy, r * 1.1);
    grad.addColorStop(0, `rgba(0,0,0,0)`);
    grad.addColorStop(0.55, `rgba(0,0,0,${0.45 * blend})`);
    grad.addColorStop(1, `rgba(0,0,0,${0.95 * blend})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Reticle drawn at the cursor
    const cx = this.reticle.x, cy = this.reticle.y;

    // Crosshair
    ctx.strokeStyle = `rgba(255,255,255,${0.5 * blend})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy); ctx.lineTo(cx - 4, cy);
    ctx.moveTo(cx + 4, cy);  ctx.lineTo(cx + 12, cy);
    ctx.moveTo(cx, cy - 12);  ctx.lineTo(cx, cy - 4);
    ctx.moveTo(cx, cy + 4);   ctx.lineTo(cx, cy + 12);
    ctx.stroke();
    // reticle ring
    ctx.strokeStyle = `rgba(255,255,255,${0.18 * blend})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.stroke();

    // Target callout + focus/photo charge ring
    if (this.targetedBird) {
      const b = this.targetedBird;
      const s = game.camera.worldToScreen(b.pos.x, b.pos.y);
      const isIded = b.idedByWatcher;
      ctx.strokeStyle = `rgba(220, 240, 200, ${0.8 * blend})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 16, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(s.x + Math.cos(a) * 16, s.y + Math.sin(a) * 16);
        ctx.lineTo(s.x + Math.cos(a) * 20, s.y + Math.sin(a) * 20);
        ctx.stroke();
      }

      // Charge ring: green while identifying, amber while photographing
      const denom = isIded ? PHOTO_FOCUS_TIME : ID_FOCUS_TIME;
      const prog = Math.max(0, Math.min(1, this.focusTime / denom));
      if (prog > 0.001 && !game.quiz.active) {
        ctx.strokeStyle = isIded
          ? `rgba(255,235,150,${0.95 * blend})`
          : `rgba(150,235,140,${0.95 * blend})`;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 19, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
        ctx.stroke();
      }

      // Small hint label
      ctx.fillStyle = `rgba(230, 240, 210, ${0.7 * blend})`;
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(isIded ? "hold to photograph" : "hold to identify", s.x, s.y + 30);
      ctx.textAlign = "left";
    }

    // Photo flash
    if (this.photoFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.photoFlash})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
}
