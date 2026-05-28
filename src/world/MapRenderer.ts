// Renders the Loring Park map. Background is baked into an offscreen canvas
// once, then drawn each frame. Trees + lampposts are drawn dynamically each frame.

import type { MapData, Tree, Bush, Bench, Lamppost, Sign, Statue, PicnicTable, TrashCan, Kiosk, BikeRack, DrinkingFountain, Gazebo, ParkGate } from "./Map.ts";
import { WORLD_W, WORLD_H } from "./Map.ts";

export class MapRenderer {
  bg: HTMLCanvasElement;
  shadeLayer: HTMLCanvasElement;
  private data: MapData;

  constructor(data: MapData) {
    this.data = data;
    this.bg = document.createElement("canvas");
    this.bg.width = WORLD_W;
    this.bg.height = WORLD_H;
    this.shadeLayer = document.createElement("canvas");
    this.shadeLayer.width = WORLD_W;
    this.shadeLayer.height = WORLD_H;
    this.renderBackground();
    this.renderShadeLayer();
  }

  private renderBackground(): void {
    const ctx = this.bg.getContext("2d")!;

    // Base grass
    const grad = ctx.createLinearGradient(0, 0, 0, WORLD_H);
    grad.addColorStop(0, "#5b7a3a");
    grad.addColorStop(0.4, "#658547");
    grad.addColorStop(0.7, "#5e7a3f");
    grad.addColorStop(1, "#547036");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    // Per-area grass tint variation
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * WORLD_W;
      const y = Math.random() * WORLD_H;
      const r = 80 + Math.random() * 240;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const tint = Math.random() < 0.5
        ? "rgba(100, 130, 65, 0.15)"
        : "rgba(75, 100, 50, 0.18)";
      g.addColorStop(0, tint);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Manicured / wild grass patches
    for (const p of this.data.grassPatches) {
      if (p.kind === "manicured") {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, "rgba(130, 165, 80, 0.32)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      } else {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, "rgba(75, 95, 45, 0.4)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        for (let i = 0; i < 20; i++) {
          const px = p.x + (Math.random() - 0.5) * p.r * 1.4;
          const py = p.y + (Math.random() - 0.5) * p.r * 1.4;
          ctx.strokeStyle = `rgba(${90 + Math.random() * 40},${130 + Math.random() * 40},${55 + Math.random() * 25},0.55)`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + (Math.random() - 0.5) * 2, py - 1.5 - Math.random() * 2.5);
          ctx.stroke();
        }
      }
    }

    // Fine grass texture splotches
    for (let i = 0; i < 14000; i++) {
      const x = Math.random() * WORLD_W;
      const y = Math.random() * WORLD_H;
      const r = 0.4 + Math.random() * 1.2;
      const a = 0.04 + Math.random() * 0.08;
      ctx.fillStyle = Math.random() < 0.5
        ? `rgba(80,110,55,${a})`
        : `rgba(120,150,80,${a})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 3500; i++) {
      const x = Math.random() * WORLD_W;
      const y = Math.random() * WORLD_H;
      ctx.strokeStyle = `rgba(${90 + Math.random() * 40},${130 + Math.random() * 40},${60 + Math.random() * 30},0.16)`;
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 2, y - 1 - Math.random() * 2);
      ctx.stroke();
    }

    // Buildings — drawn so player can SEE they're solid
    for (const b of this.data.buildings) {
      // Drop shadow
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(b.x + 3, b.y + 4, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = "rgba(0,0,0,0.45)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(b.x + 0.75, b.y + 0.75, b.w - 1.5, b.h - 1.5);
      // Roof texture lines
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 0.5;
      for (let yy = b.y + 12; yy < b.y + b.h - 4; yy += 12) {
        ctx.beginPath();
        ctx.moveTo(b.x + 2, yy);
        ctx.lineTo(b.x + b.w - 2, yy);
        ctx.stroke();
      }
      // Windows
      ctx.fillStyle = "rgba(220, 200, 130, 0.2)";
      for (let yy = b.y + 18; yy < b.y + b.h - 8; yy += 16) {
        for (let xx = b.x + 8; xx < b.x + b.w - 8; xx += 14) {
          if (Math.random() < 0.32) ctx.fillRect(xx, yy, 4, 5);
        }
      }
      // AC units / rooftop bumps
      for (let i = 0; i < 3; i++) {
        if (Math.random() < 0.7) {
          const rx = b.x + 8 + Math.random() * (b.w - 16);
          const ry = b.y + 8 + Math.random() * (b.h - 16);
          ctx.fillStyle = "rgba(80, 75, 70, 0.6)";
          ctx.fillRect(rx, ry, 5, 4);
        }
      }
      if (b.label) {
        ctx.fillStyle = "rgba(220,210,180,0.55)";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
      }
    }

    // === Tennis court block: surrounding fence area + 4 courts ===
    if (this.data.tennisFenceRect) {
      const f = this.data.tennisFenceRect;
      // green surround
      ctx.fillStyle = "#3e6240";
      ctx.fillRect(f.x, f.y, f.w, f.h);
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 1;
      ctx.strokeRect(f.x + 0.5, f.y + 0.5, f.w - 1, f.h - 1);
      // chain-link fence: dashed line around perimeter
      ctx.strokeStyle = "rgba(200, 210, 180, 0.55)";
      ctx.lineWidth = 0.6;
      ctx.setLineDash([1.2, 1.2]);
      ctx.strokeRect(f.x + 2, f.y + 2, f.w - 4, f.h - 4);
      ctx.setLineDash([]);
      // Fence posts at corners + spaced along edges
      ctx.fillStyle = "#2a2a2a";
      const post = (x: number, y: number) => { ctx.beginPath(); ctx.arc(x, y, 0.9, 0, Math.PI * 2); ctx.fill(); };
      for (let x = f.x + 2; x <= f.x + f.w - 2; x += 14) {
        post(x, f.y + 2);
        post(x, f.y + f.h - 2);
      }
      for (let y = f.y + 2; y <= f.y + f.h - 2; y += 14) {
        post(f.x + 2, y);
        post(f.x + f.w - 2, y);
      }
    }
    for (const c of this.data.courts) {
      ctx.fillStyle = "#2f6da0";
      ctx.fillRect(c.x, c.y, c.w, c.h);
      // dark border line
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 0.6;
      ctx.strokeRect(c.x, c.y, c.w, c.h);
      // Court markings (top-down singles + service boxes)
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 0.7;
      // outer doubles boundary
      ctx.strokeRect(c.x + 2, c.y + 2, c.w - 4, c.h - 4);
      // singles sidelines (inset)
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(c.x + 5, c.y + 2);
      ctx.lineTo(c.x + 5, c.y + c.h - 2);
      ctx.moveTo(c.x + c.w - 5, c.y + 2);
      ctx.lineTo(c.x + c.w - 5, c.y + c.h - 2);
      ctx.stroke();
      // service line (middle horizontal)
      ctx.beginPath();
      ctx.moveTo(c.x + 5, c.y + c.h / 2);
      ctx.lineTo(c.x + c.w - 5, c.y + c.h / 2);
      ctx.stroke();
      // service-box dividing line (center vertical, only between service lines)
      ctx.beginPath();
      ctx.moveTo(c.x + c.w / 2, c.y + c.h / 4);
      ctx.lineTo(c.x + c.w / 2, c.y + c.h - c.h / 4);
      ctx.stroke();
      // net (white) at center horizontal
      ctx.fillStyle = "rgba(220,220,220,0.7)";
      ctx.fillRect(c.x, c.y + c.h / 2 - 0.5, c.w, 1);
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(c.x - 0.5, c.y + c.h / 2 - 1, 1, 2);
      ctx.fillRect(c.x + c.w - 0.5, c.y + c.h / 2 - 1, 1, 2);
    }

    // Crosswalks
    for (const cw of this.data.crosswalks) {
      ctx.save();
      ctx.translate(cw.x, cw.y);
      ctx.rotate(cw.rot);
      ctx.fillStyle = "rgba(220, 215, 195, 0.7)";
      const stripes = 4;
      for (let i = 0; i < stripes; i++) {
        ctx.fillRect(-cw.w * 0.5, -cw.h * 0.5 + i * (cw.h / stripes) * 1.2, cw.w, cw.h / (stripes * 1.5));
      }
      ctx.restore();
    }

    // Mulch beds around some trees
    for (const t of this.data.trees) {
      if (t.hasMulch) {
        ctx.fillStyle = "#4a2e1a";
        ctx.beginPath();
        ctx.arc(t.x, t.y + 1, t.r * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(30, 20, 12, 0.4)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
        // mulch texture flecks
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const d = t.r * 0.3 * Math.random();
          ctx.fillStyle = "rgba(60, 36, 18, 0.7)";
          ctx.fillRect(t.x + Math.cos(a) * d, t.y + 1 + Math.sin(a) * d, 0.4, 0.4);
        }
      }
    }

    // Paths
    for (const seg of this.data.paths) {
      const pathColor = seg.kind === "paved" ? "#a6a097" : "#b8a574";
      const highlightColor = seg.kind === "paved" ? "rgba(190, 184, 176, 0.45)" : "rgba(220,205,170,0.4)";
      ctx.strokeStyle = "rgba(60,45,25,0.35)";
      ctx.lineWidth = seg.width + 1.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawPolyline(ctx, seg.pts);
      ctx.strokeStyle = pathColor;
      ctx.lineWidth = seg.width;
      drawPolyline(ctx, seg.pts);
      ctx.strokeStyle = highlightColor;
      ctx.lineWidth = seg.width * 0.4;
      drawPolyline(ctx, seg.pts);
      // Path-edge grass tufts
      for (let i = 1; i < seg.pts.length; i += 3) {
        const a = seg.pts[i - 1], b = seg.pts[i];
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const off = seg.width * 0.55;
        // Both sides occasional grass tufts
        if (Math.random() < 0.7) {
          const tx = (a.x + b.x) / 2 + nx * off;
          const ty = (a.y + b.y) / 2 + ny * off;
          for (let j = 0; j < 3; j++) {
            ctx.strokeStyle = "rgba(80, 110, 50, 0.7)";
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(tx + (j - 1) * 0.6, ty);
            ctx.lineTo(tx + (j - 1) * 0.6 + (Math.random() - 0.5) * 0.7, ty - 1.5 - Math.random());
            ctx.stroke();
          }
        }
        if (Math.random() < 0.7) {
          const tx = (a.x + b.x) / 2 - nx * off;
          const ty = (a.y + b.y) / 2 - ny * off;
          for (let j = 0; j < 3; j++) {
            ctx.strokeStyle = "rgba(80, 110, 50, 0.7)";
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(tx + (j - 1) * 0.6, ty);
            ctx.lineTo(tx + (j - 1) * 0.6 + (Math.random() - 0.5) * 0.7, ty - 1.5 - Math.random());
            ctx.stroke();
          }
        }
      }
      // gravel specks
      if (seg.kind === "gravel") {
        for (let i = 1; i < seg.pts.length; i += 2) {
          const a = seg.pts[i - 1], b = seg.pts[i];
          const steps = 4;
          for (let s = 0; s < steps; s++) {
            const t = s / steps;
            const px = a.x + (b.x - a.x) * t + (Math.random() - 0.5) * seg.width * 0.6;
            const py = a.y + (b.y - a.y) * t + (Math.random() - 0.5) * seg.width * 0.6;
            ctx.fillStyle = "rgba(140, 130, 100, 0.4)";
            ctx.beginPath();
            ctx.arc(px, py, 0.3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // Plazas + Berger Fountain
    for (const z of this.data.plazas) {
      ctx.fillStyle = "#b8a574";
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(60,45,25,0.4)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // pavers
      ctx.strokeStyle = "rgba(90, 75, 50, 0.22)";
      ctx.lineWidth = 0.4;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        ctx.beginPath();
        ctx.moveTo(z.x + Math.cos(a) * 4, z.y + Math.sin(a) * 4);
        ctx.lineTo(z.x + Math.cos(a) * z.r, z.y + Math.sin(a) * z.r);
        ctx.stroke();
      }
      // concentric ring
      ctx.strokeStyle = "rgba(90, 75, 50, 0.3)";
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.r * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      if (z.r > 35) {
        // Berger dandelion fountain
        ctx.fillStyle = "#7e96a8";
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#9caeb8";
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r * 0.18, 0, Math.PI * 2);
        ctx.fill();
        // Center sphere
        ctx.fillStyle = "#5e7888";
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r * 0.05, 0, Math.PI * 2);
        ctx.fill();
        // Dandelion rays
        ctx.strokeStyle = "rgba(255,255,255,0.55)";
        ctx.lineWidth = 0.6;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 22) {
          ctx.beginPath();
          ctx.moveTo(z.x + Math.cos(a) * z.r * 0.06, z.y + Math.sin(a) * z.r * 0.06);
          ctx.lineTo(z.x + Math.cos(a) * z.r * 0.27, z.y + Math.sin(a) * z.r * 0.27);
          ctx.stroke();
          // Droplet at tip
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.beginPath();
          ctx.arc(z.x + Math.cos(a) * z.r * 0.28, z.y + Math.sin(a) * z.r * 0.28, 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Ponds — with sky reflection + better detail
    for (const pond of this.data.ponds) {
      // shore dirt
      ctx.fillStyle = "#5d4a30";
      ctx.beginPath();
      drawPolygonOffset(ctx, pond.pts, 3);
      ctx.fill();
      // water gradient
      const cx = avgX(pond.pts), cy = avgY(pond.pts);
      const rad = ctx.createRadialGradient(cx - 30, cy - 30, 14, cx, cy, 300);
      rad.addColorStop(0, "#2c4d56");
      rad.addColorStop(0.7, "#1f3a44");
      rad.addColorStop(1, "#16292f");
      ctx.fillStyle = rad;
      ctx.beginPath();
      drawPolygon(ctx, pond.pts);
      ctx.fill();
      // Sky reflection — a long horizontal swath near the top of the pond
      ctx.save();
      ctx.beginPath();
      drawPolygon(ctx, pond.pts);
      ctx.clip();
      const skyRad = ctx.createLinearGradient(cx, cy - 100, cx, cy + 60);
      skyRad.addColorStop(0, "rgba(180, 200, 220, 0.22)");
      skyRad.addColorStop(0.5, "rgba(180, 200, 220, 0.08)");
      skyRad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = skyRad;
      ctx.fillRect(cx - 250, cy - 150, 500, 250);
      ctx.restore();
      // shore line
      ctx.strokeStyle = "rgba(180, 200, 180, 0.18)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      drawPolygon(ctx, pond.pts);
      ctx.stroke();
      // ripples
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 30; i++) {
        const rx = cx + (Math.random() - 0.5) * 280;
        const ry = cy + (Math.random() - 0.5) * 160;
        ctx.beginPath();
        ctx.ellipse(rx, ry, 5 + Math.random() * 14, 1.2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // lily pads
      for (let i = 0; i < 10; i++) {
        const lx = cx + (Math.random() - 0.5) * 200;
        const ly = cy + (Math.random() - 0.5) * 100;
        ctx.fillStyle = "rgba(70, 110, 55, 0.75)";
        ctx.beginPath();
        ctx.ellipse(lx, ly, 3 + Math.random() * 2, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // little white flower on a few
        if (Math.random() < 0.2) {
          ctx.fillStyle = "rgba(240, 235, 220, 0.85)";
          ctx.beginPath();
          ctx.arc(lx, ly, 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Bridges
    for (const br of this.data.bridges) {
      ctx.save();
      const dx = br.bx.x - br.ax.x, dy = br.bx.y - br.ax.y;
      const len = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx);
      ctx.translate(br.ax.x, br.ax.y);
      ctx.rotate(ang);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(0, -br.width * 0.5 + 1, len, br.width);
      ctx.fillStyle = "#7a5630";
      ctx.fillRect(0, -br.width * 0.5, len, br.width);
      ctx.strokeStyle = "rgba(50, 30, 15, 0.5)";
      ctx.lineWidth = 0.4;
      const plankCount = Math.floor(len / 4);
      for (let i = 1; i < plankCount; i++) {
        const px = (i / plankCount) * len;
        ctx.beginPath();
        ctx.moveTo(px, -br.width * 0.5);
        ctx.lineTo(px, br.width * 0.5);
        ctx.stroke();
      }
      ctx.strokeStyle = "#5a3e22";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -br.width * 0.5);
      ctx.lineTo(len, -br.width * 0.5);
      ctx.moveTo(0, br.width * 0.5);
      ctx.lineTo(len, br.width * 0.5);
      ctx.stroke();
      ctx.restore();
    }

    // Shore stones — drawn after ponds, sit on the bank
    for (const s of this.data.shoreStones) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(s.x + 0.4, s.y + 0.6, s.r * 1.05, s.r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      const base = lerpColor("#867b6c", "#5e5448", s.hue);
      ctx.fillStyle = base;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.r, s.r * 0.72, s.hue * Math.PI, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.beginPath();
      ctx.ellipse(s.x - s.r * 0.3, s.y - s.r * 0.25, s.r * 0.5, s.r * 0.25, s.hue * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Reeds
    for (const r of this.data.reeds) {
      for (let i = 1; i < r.pts.length; i++) {
        const a = r.pts[i - 1], b = r.pts[i];
        const segs = 20;
        for (let s = 0; s < segs; s++) {
          const t = s / segs;
          const x = a.x + (b.x - a.x) * t + (Math.random() - 0.5) * 1.4;
          const y = a.y + (b.y - a.y) * t + (Math.random() - 0.5) * 1.4;
          ctx.strokeStyle = `rgba(${70 + Math.random() * 30},${95 + Math.random() * 25},${50 + Math.random() * 20},0.85)`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + (Math.random() - 0.5) * 1.2, y - 2.5 - Math.random() * 2.5);
          ctx.stroke();
          // cattail head
          if (Math.random() < 0.1) {
            ctx.fillStyle = "#5a3e1f";
            ctx.beginPath();
            ctx.ellipse(x + (Math.random() - 0.5) * 0.6, y - 3, 0.55, 1.6, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // Flower beds
    for (const fb of this.data.flowerBeds) {
      ctx.save();
      ctx.translate(fb.x, fb.y);
      ctx.rotate(fb.rot);
      ctx.fillStyle = "#4a3220";
      ctx.fillRect(-fb.w * 0.5, -fb.h * 0.5, fb.w, fb.h);
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(-fb.w * 0.5, -fb.h * 0.5, fb.w, fb.h);
      // brick border
      ctx.strokeStyle = "rgba(120, 75, 50, 0.6)";
      ctx.lineWidth = 0.3;
      ctx.strokeRect(-fb.w * 0.5 + 0.5, -fb.h * 0.5 + 0.5, fb.w - 1, fb.h - 1);
      // flowers
      const count = Math.floor(fb.w * fb.h * 0.55);
      for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * fb.w * 0.9;
        const y = (Math.random() - 0.5) * fb.h * 0.85;
        ctx.fillStyle = "rgba(70, 95, 40, 0.6)";
        ctx.fillRect(x - 0.15, y, 0.3, 1.2);
        ctx.fillStyle = Math.random() < 0.5 ? fb.colorA : fb.colorB;
        ctx.beginPath();
        ctx.arc(x, y - 0.5, 0.75, 0, Math.PI * 2);
        ctx.fill();
        // 4-petal hint
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath();
        ctx.arc(x - 0.4, y - 0.5, 0.18, 0, Math.PI * 2);
        ctx.arc(x + 0.4, y - 0.5, 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Rocks
    for (const rk of this.data.rocks) {
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(rk.x + 0.5, rk.y + 0.8, rk.r * 0.9, rk.r * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      const baseColor = lerpColor("#7a7268", "#5a5048", rk.hue);
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.ellipse(rk.x, rk.y, rk.r, rk.r * 0.7, rk.hue * Math.PI, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath();
      ctx.ellipse(rk.x - rk.r * 0.3, rk.y - rk.r * 0.2, rk.r * 0.5, rk.r * 0.25, rk.hue * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bushes
    for (const b of this.data.bushes) drawBush(ctx, b);

    // Signs
    for (const s of this.data.signs) drawSign(ctx, s);
  }

  private renderShadeLayer(): void {
    const ctx = this.shadeLayer.getContext("2d")!;
    ctx.clearRect(0, 0, WORLD_W, WORLD_H);
    for (const t of this.data.trees) {
      const g = ctx.createRadialGradient(t.x + 3, t.y + 4, 0, t.x + 3, t.y + 4, t.shadeR);
      g.addColorStop(0, "rgba(0,0,0,0.35)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(t.x + 3, t.y + 4, t.shadeR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawBackground(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.bg, 0, 0);
    ctx.drawImage(this.shadeLayer, 0, 0);
  }

  // Mid-layer details: gazebos, kiosks, bike racks, drinking fountains,
  // picnic tables, benches, trash cans, statues, gates
  drawDetails(ctx: CanvasRenderingContext2D): void {
    for (const g of this.data.gazebos) drawGazebo(ctx, g);
    for (const t of this.data.picnicTables) drawPicnicTable(ctx, t);
    for (const k of this.data.kiosks) drawKiosk(ctx, k);
    for (const br of this.data.bikeRacks) drawBikeRack(ctx, br);
    for (const d of this.data.drinkingFountains) drawDrinkingFountain(ctx, d);
    for (const b of this.data.benches) drawBench(ctx, b);
    for (const t of this.data.trashCans) drawTrashCan(ctx, t);
    for (const s of this.data.statues) drawStatue(ctx, s);
    for (const g of this.data.gates) drawGate(ctx, g);
  }

  drawOverlay(ctx: CanvasRenderingContext2D, time: number): void {
    for (const l of this.data.lampposts) drawLamppost(ctx, l, time);
  }

  drawCanopies(ctx: CanvasRenderingContext2D, time: number): void {
    // First draw trunks (under canopies)
    for (const t of this.data.trees) {
      drawTrunk(ctx, t);
    }
    // Then canopies
    for (const t of this.data.trees) {
      drawTree(ctx, t, time);
    }
  }
}

function drawTrunk(ctx: CanvasRenderingContext2D, t: Tree): void {
  // Small visible trunk peeking at south edge of canopy
  const trunkR = Math.max(1.2, t.r * 0.16);
  const x = t.x + t.trunkOffset;
  const y = t.y + t.r * 0.65;
  let trunkColor = "#3a2a18";
  if (t.kind === "birch") trunkColor = "#e0d8c0";
  else if (t.kind === "pine" || t.kind === "spruce") trunkColor = "#4a3018";
  else if (t.kind === "cherry") trunkColor = "#5a3522";
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(x + 0.5, y + 0.8, trunkR * 1.1, trunkR * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // trunk
  ctx.fillStyle = trunkColor;
  ctx.beginPath();
  ctx.ellipse(x, y, trunkR, trunkR * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();
  // birch bark markings
  if (t.kind === "birch") {
    ctx.strokeStyle = "rgba(40, 40, 40, 0.6)";
    ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.moveTo(x - trunkR * 0.6, y - trunkR * 0.2);
    ctx.lineTo(x + trunkR * 0.6, y - trunkR * 0.2);
    ctx.moveTo(x - trunkR * 0.4, y + trunkR * 0.15);
    ctx.lineTo(x + trunkR * 0.4, y + trunkR * 0.15);
    ctx.stroke();
  }
}

function drawTree(ctx: CanvasRenderingContext2D, t: Tree, time: number): void {
  const sway = Math.sin(time * 1.2 + t.x * 0.03) * 0.6;
  const cx = t.x + sway;
  const cy = t.y;

  let c1 = lerpColor("#3a5a26", "#4f7a35", t.hue);
  let c2 = lerpColor("#2c4519", "#3c5d22", t.hue);
  let hi = lerpColor("#6b9a48", "#8bb059", t.hue);
  let isConifer = false;
  let conicShape = false;
  let blossomColor: string | null = null;

  switch (t.kind) {
    case "pine":
      c1 = lerpColor("#1f3a18", "#2a4a20", t.hue);
      c2 = lerpColor("#152a10", "#1f3a18", t.hue);
      hi = lerpColor("#365a28", "#4a6b32", t.hue);
      isConifer = true; conicShape = true;
      break;
    case "spruce":
      c1 = lerpColor("#264a3a", "#385a48", t.hue);
      c2 = lerpColor("#1a3024", "#264a38", t.hue);
      hi = lerpColor("#48705c", "#5e8a74", t.hue);
      isConifer = true; conicShape = true;
      break;
    case "maple":
      c1 = lerpColor("#5a6e26", "#75884a", t.hue);
      c2 = lerpColor("#446020", "#5a7530", t.hue);
      hi = lerpColor("#8eb050", "#a8c065", t.hue);
      break;
    case "willow":
      c1 = lerpColor("#6e8a3a", "#8aa050", t.hue);
      c2 = lerpColor("#587028", "#6e8a40", t.hue);
      hi = lerpColor("#a8c065", "#c0d27e", t.hue);
      break;
    case "birch":
      c1 = lerpColor("#7e9854", "#9ab070", t.hue);
      c2 = lerpColor("#608a3a", "#7e9854", t.hue);
      hi = lerpColor("#b6c884", "#c8d896", t.hue);
      break;
    case "linden":
      c1 = lerpColor("#4f7430", "#609040", t.hue);
      c2 = lerpColor("#3a5a22", "#4f7430", t.hue);
      hi = lerpColor("#7ea84a", "#92b85e", t.hue);
      break;
    case "crabapple":
      c1 = lerpColor("#5a7228", "#6e8a38", t.hue);
      c2 = lerpColor("#446020", "#5a7028", t.hue);
      hi = lerpColor("#7e9a48", "#92ae5c", t.hue);
      blossomColor = "rgba(232, 179, 200, 0.65)";  // pink crab apple blossoms
      break;
    case "cherry":
      c1 = lerpColor("#6e8a40", "#85a25a", t.hue);
      c2 = lerpColor("#557028", "#6e8a40", t.hue);
      hi = lerpColor("#9eba6e", "#b2c878", t.hue);
      blossomColor = "rgba(248, 215, 230, 0.7)";   // soft pink cherry blossoms
      break;
  }

  // shadow on ground (small)
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.arc(cx + 2, cy + 4, t.r * 0.85, 0, Math.PI * 2);
  ctx.fill();

  // base canopy
  ctx.fillStyle = c2;
  ctx.beginPath();
  ctx.arc(cx, cy + 2, t.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = c1;
  ctx.beginPath();
  ctx.arc(cx - 0.5, cy - 0.5, t.r * 0.9, 0, Math.PI * 2);
  ctx.fill();

  // Conifer pointed top
  if (conicShape) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - t.r);
    ctx.lineTo(cx - t.r * 0.6, cy);
    ctx.lineTo(cx + t.r * 0.6, cy);
    ctx.closePath();
    ctx.fill();
    // Branch rings for conifer feel
    ctx.strokeStyle = "rgba(20,30,15,0.55)";
    ctx.lineWidth = 0.4;
    for (let i = 0; i < 3; i++) {
      const yy = cy - t.r * 0.4 + i * t.r * 0.4;
      const ww = t.r * (0.4 + i * 0.18);
      ctx.beginPath();
      ctx.ellipse(cx, yy, ww, ww * 0.25, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Highlight
  ctx.fillStyle = hi;
  ctx.beginPath();
  ctx.arc(cx - t.r * 0.35, cy - t.r * 0.35, t.r * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Inner leaf texture
  ctx.fillStyle = "rgba(40,60,25,0.4)";
  const dots = isConifer ? 8 : 5;
  for (let i = 0; i < dots; i++) {
    const a = (i / dots) * Math.PI * 2 + t.hue * 6.28;
    const d = t.r * 0.5;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, t.r * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  // Blossom overlay (cherry, crabapple) — deterministic positions per-tree (NOT per-frame)
  if (blossomColor) {
    ctx.fillStyle = blossomColor;
    // Hash trunkOffset+hue+x for stable per-tree pseudorandom
    const seed = (t.x * 31 + t.y * 17 + t.hue * 1009) | 0;
    let s = seed;
    const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    for (let i = 0; i < 18; i++) {
      const a = rng() * Math.PI * 2;
      const d = rng() * t.r * 0.85;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawBush(ctx: CanvasRenderingContext2D, b: Bush): void {
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(b.x + 0.5, b.y + 0.7, b.r * 1.05, b.r * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();

  const dark = lerpColor("#2c4419", "#3a5826", b.hue);
  const mid = lerpColor("#4a6a28", "#5a7e36", b.hue);
  const light = lerpColor("#7a9648", "#8eb058", b.hue);

  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + b.hue * 6.28;
    ctx.fillStyle = mid;
    ctx.beginPath();
    ctx.arc(b.x + Math.cos(a) * b.r * 0.4, b.y + Math.sin(a) * b.r * 0.4, b.r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.arc(b.x - b.r * 0.25, b.y - b.r * 0.25, b.r * 0.35, 0, Math.PI * 2);
  ctx.fill();

  if (b.hasFlowers) {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const d = b.r * (0.4 + Math.random() * 0.4);
      ctx.fillStyle = b.flowerColor;
      ctx.beginPath();
      ctx.arc(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawBench(ctx: CanvasRenderingContext2D, b: Bench): void {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.rot);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(-7, -2 + 0.7, 14, 4);
  ctx.fillStyle = "#5a3e22";
  ctx.fillRect(-7, -2, 14, 4);
  ctx.strokeStyle = "rgba(30, 18, 10, 0.5)";
  ctx.lineWidth = 0.3;
  for (let i = -6; i <= 6; i += 3) {
    ctx.beginPath();
    ctx.moveTo(i, -2);
    ctx.lineTo(i, 2);
    ctx.stroke();
  }
  ctx.fillStyle = "#4a3018";
  ctx.fillRect(-7, -3.2, 14, 1.2);
  ctx.fillStyle = "#3a261a";
  ctx.fillRect(-6.5, 2, 1.2, 1.2);
  ctx.fillRect(5.3, 2, 1.2, 1.2);
  ctx.restore();
}

function drawLamppost(ctx: CanvasRenderingContext2D, l: Lamppost, time: number): void {
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(l.x - 0.5, l.y - 1, 5, 1.2);
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(l.x, l.y, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(l.x - 0.5, l.y - 6, 1, 6);
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.ellipse(l.x, l.y - 7, 1.8, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  const flick = 0.8 + Math.sin(time * 9 + l.x) * 0.05;
  ctx.fillStyle = `rgba(255, 220, 140, ${0.45 * flick})`;
  ctx.beginPath();
  ctx.arc(l.x, l.y - 7, 1.3, 0, Math.PI * 2);
  ctx.fill();
  const halo = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, 12);
  halo.addColorStop(0, "rgba(255, 220, 140, 0.18)");
  halo.addColorStop(1, "rgba(255, 220, 140, 0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(l.x, l.y, 12, 0, Math.PI * 2);
  ctx.fill();
}

function drawSign(ctx: CanvasRenderingContext2D, s: Sign): void {
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.fillStyle = "#3a2818";
  ctx.fillRect(-0.5, 0, 1, 4);
  ctx.fillStyle = "#5e3e22";
  ctx.fillRect(-9, -4, 18, 4);
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 0.4;
  ctx.strokeRect(-9, -4, 18, 4);
  ctx.fillStyle = "#f0e8c8";
  ctx.font = "bold 3px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(s.text, 0, -2);
  ctx.restore();
}

function drawStatue(ctx: CanvasRenderingContext2D, s: Statue): void {
  if (s.kind === "fountain") return;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(0, 1, s.r * 1.1, s.r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6e6862";
  ctx.beginPath();
  ctx.arc(0, 0, s.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.fillStyle = "#3a3530";
  if (s.kind === "monument") {
    ctx.beginPath();
    ctx.arc(0, 0, s.r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a2520";
    ctx.fillRect(-0.6, -1, 1.2, 2);
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, s.r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPicnicTable(ctx: CanvasRenderingContext2D, p: PicnicTable): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(-9, -5 + 0.8, 18, 10);
  ctx.fillStyle = "#7a5630";
  ctx.fillRect(-9, -5.5, 18, 1.5);
  ctx.fillRect(-9, 4, 18, 1.5);
  ctx.fillStyle = "#9a7038";
  ctx.fillRect(-8, -3.5, 16, 7);
  ctx.strokeStyle = "rgba(40, 25, 10, 0.5)";
  ctx.lineWidth = 0.4;
  for (let xx = -6; xx <= 6; xx += 4) {
    ctx.beginPath();
    ctx.moveTo(xx, -3.5);
    ctx.lineTo(xx, 3.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTrashCan(ctx: CanvasRenderingContext2D, t: TrashCan): void {
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(t.x + 0.6, t.y + 0.8, 2.4, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3a3530";
  ctx.beginPath();
  ctx.arc(t.x, t.y, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a2520";
  ctx.beginPath();
  ctx.arc(t.x, t.y, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a5550";
  ctx.lineWidth = 0.3;
  ctx.beginPath();
  ctx.arc(t.x, t.y, 1.5, 0, Math.PI * 2);
  ctx.stroke();
}

function drawKiosk(ctx: CanvasRenderingContext2D, k: Kiosk): void {
  ctx.save();
  ctx.translate(k.x, k.y);
  ctx.rotate(k.rot);
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(-6, -4 + 1, 12, 8);
  // Base / roof
  ctx.fillStyle = "#5a3e22";
  ctx.fillRect(-6, -4, 12, 8);
  // Roof
  ctx.fillStyle = "#3e2a18";
  ctx.fillRect(-7, -5, 14, 1.5);
  // Posters/papers on board
  ctx.fillStyle = "#f0e8c8";
  ctx.fillRect(-4.5, -2.5, 4, 5);
  ctx.fillStyle = "#d0e0c8";
  ctx.fillRect(0.5, -2.5, 4, 5);
  // Lines for paper text
  ctx.strokeStyle = "rgba(80, 70, 50, 0.6)";
  ctx.lineWidth = 0.3;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(-4, -1.5 + i * 1); ctx.lineTo(-1, -1.5 + i * 1);
    ctx.moveTo(1, -1.5 + i * 1); ctx.lineTo(4, -1.5 + i * 1);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBikeRack(ctx: CanvasRenderingContext2D, br: BikeRack): void {
  ctx.save();
  ctx.translate(br.x, br.y);
  ctx.rotate(br.rot);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(-7, -1 + 0.6, 14, 2);
  // U-shaped racks
  ctx.strokeStyle = "#4a4a4a";
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 5; i++) {
    const x = -6 + i * 3;
    ctx.beginPath();
    ctx.moveTo(x, 0.5);
    ctx.lineTo(x, -2);
    ctx.lineTo(x + 1.4, -2);
    ctx.lineTo(x + 1.4, 0.5);
    ctx.stroke();
  }
  // Bikes (some racks occupied) — shown as simple frames
  for (let i = 0; i < br.bikes; i++) {
    const x = -5.5 + i * 3;
    ctx.fillStyle = ["#c8231a", "#3868a8", "#3a8a4a", "#d4a324", "#5a5050"][i % 5];
    ctx.beginPath();
    ctx.arc(x - 0.4, 0.5, 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 1.6, 0.5, 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ["#c8231a", "#3868a8", "#3a8a4a", "#d4a324", "#5a5050"][i % 5];
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(x - 0.4, 0.5);
    ctx.lineTo(x + 0.6, -0.5);
    ctx.lineTo(x + 1.6, 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDrinkingFountain(ctx: CanvasRenderingContext2D, d: DrinkingFountain): void {
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(d.x + 0.4, d.y + 0.6, 1.6, 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5a6a76";
  ctx.fillRect(d.x - 1.2, d.y - 1.5, 2.4, 2.8);
  ctx.fillStyle = "#7a8a96";
  ctx.fillRect(d.x - 1.2, d.y - 1.5, 2.4, 0.6);
  ctx.fillStyle = "#3a4650";
  ctx.beginPath();
  ctx.arc(d.x, d.y - 1.4, 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawGazebo(ctx: CanvasRenderingContext2D, g: Gazebo): void {
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.arc(g.x + 1, g.y + 2, g.r * 1.05, 0, Math.PI * 2);
  ctx.fill();
  // floor (octagonal hint via circle)
  ctx.fillStyle = "#a08560";
  ctx.beginPath();
  ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
  ctx.fill();
  // plank lines
  ctx.strokeStyle = "rgba(60, 40, 20, 0.5)";
  ctx.lineWidth = 0.4;
  for (let a = 0; a < Math.PI; a += Math.PI / 6) {
    ctx.beginPath();
    ctx.moveTo(g.x + Math.cos(a) * g.r, g.y + Math.sin(a) * g.r);
    ctx.lineTo(g.x - Math.cos(a) * g.r, g.y - Math.sin(a) * g.r);
    ctx.stroke();
  }
  // posts at 6 corners
  ctx.fillStyle = "#3e2a18";
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(g.x + Math.cos(a) * g.r * 0.9, g.y + Math.sin(a) * g.r * 0.9, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // roof (darker disc on top)
  ctx.fillStyle = "rgba(60, 40, 25, 0.7)";
  ctx.beginPath();
  ctx.arc(g.x, g.y - 1, g.r * 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(90, 65, 40, 0.8)";
  ctx.beginPath();
  ctx.arc(g.x - 1, g.y - 2, g.r * 0.9, 0, Math.PI * 2);
  ctx.fill();
  // roof apex finial
  ctx.fillStyle = "#3a261a";
  ctx.beginPath();
  ctx.arc(g.x - 1, g.y - 3, g.r * 0.18, 0, Math.PI * 2);
  ctx.fill();
}

function drawGate(ctx: CanvasRenderingContext2D, g: ParkGate): void {
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.rotate(g.rot);
  // Two stone pillars and an arch
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(-6, -1 + 0.8, 12, 2);
  ctx.fillStyle = "#7a6e62";
  ctx.fillRect(-6, -2, 2.5, 4);
  ctx.fillRect(3.5, -2, 2.5, 4);
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 0.4;
  ctx.strokeRect(-6, -2, 2.5, 4);
  ctx.strokeRect(3.5, -2, 2.5, 4);
  // Iron arch suggestion
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.moveTo(-3.5, -1.5);
  ctx.quadraticCurveTo(0, -3.5, 3.5, -1.5);
  ctx.stroke();
  ctx.restore();
}

function drawPolygon(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}
function drawPolygonOffset(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[], off: number): void {
  const cx = avgX(pts), cy = avgY(pts);
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const dx = pts[i].x - cx, dy = pts[i].y - cy;
    const len = Math.hypot(dx, dy);
    const f = (len + off) / len;
    const x = cx + dx * f, y = cy + dy * f;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}
function drawPolyline(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}
function avgX(pts: { x: number; y: number }[]): number { let s = 0; for (const p of pts) s += p.x; return s / pts.length; }
function avgY(pts: { x: number; y: number }[]): number { let s = 0; for (const p of pts) s += p.y; return s / pts.length; }
function lerpColor(a: string, b: string, t: number): string {
  const pa = parseHex(a), pb = parseHex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bb = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bb})`;
}
function parseHex(s: string): [number, number, number] {
  const v = parseInt(s.slice(1), 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}
