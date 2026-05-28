import type { Vec2 } from "./types.ts";

// 2D camera that follows a target in world space.
// Renders with pixel-perfect translation; zoom is uniform.
export class Camera {
  pos: Vec2 = { x: 0, y: 0 };
  target: Vec2 = { x: 0, y: 0 };
  zoom = 1.0;
  followLerp = 6; // higher = snappier

  viewportW = 1;
  viewportH = 1;

  setViewport(w: number, h: number): void {
    this.viewportW = w;
    this.viewportH = h;
  }

  follow(target: Vec2): void {
    this.target = target;
  }

  update(dt: number): void {
    const t = 1 - Math.exp(-this.followLerp * dt);
    this.pos.x += (this.target.x - this.pos.x) * t;
    this.pos.y += (this.target.y - this.pos.y) * t;
  }

  // Apply the world->screen transform to a canvas context.
  // After calling this, draw in world coordinates.
  apply(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.viewportW * 0.5, this.viewportH * 0.5);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.pos.x, -this.pos.y);
  }

  restore(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }

  screenToWorld(sx: number, sy: number): Vec2 {
    return {
      x: (sx - this.viewportW * 0.5) / this.zoom + this.pos.x,
      y: (sy - this.viewportH * 0.5) / this.zoom + this.pos.y,
    };
  }

  worldToScreen(wx: number, wy: number): Vec2 {
    return {
      x: (wx - this.pos.x) * this.zoom + this.viewportW * 0.5,
      y: (wy - this.pos.y) * this.zoom + this.viewportH * 0.5,
    };
  }

  // Visible world rect
  visibleBounds(): { x: number; y: number; w: number; h: number } {
    const w = this.viewportW / this.zoom;
    const h = this.viewportH / this.zoom;
    return { x: this.pos.x - w / 2, y: this.pos.y - h / 2, w, h };
  }
}
