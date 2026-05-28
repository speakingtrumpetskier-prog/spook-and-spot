// Draws the AI hunter as a stylized top-down figure.

import type { Hunter } from "./Hunter.ts";

export function drawHunter(ctx: CanvasRenderingContext2D, h: Hunter, time: number): void {
  ctx.save();
  ctx.translate(h.pos.x, h.pos.y);

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(0, 4, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(h.facing + Math.PI / 2);

  const bob = Math.sin(h.spriteBob) * 0.6;
  // legs
  ctx.fillStyle = "#2a2419";
  ctx.fillRect(-3, 0 + bob * 0.4, 2.4, 4);
  ctx.fillRect(0.6, 0 - bob * 0.4, 2.4, 4);

  // torso — camo
  ctx.fillStyle = "#3e4628";
  ctx.fillRect(-4.5, -8, 9, 9);
  ctx.fillStyle = "#5a6238";
  // camo splotches
  ctx.fillRect(-3.5, -7, 2.5, 2);
  ctx.fillRect(0.5, -5, 2.5, 2);
  ctx.fillRect(-2, -2, 2, 2);

  // arms
  ctx.fillStyle = "#3e4628";
  ctx.fillRect(-6, -7, 2, 5);
  ctx.fillRect(4, -7, 2, 5);

  // shotgun — long thin rect protruding forward
  ctx.fillStyle = "#1a1a14";
  ctx.fillRect(-1, -16, 2, 9);
  // wood stock
  ctx.fillStyle = "#5e3a1f";
  ctx.fillRect(-1.5, -8, 3, 3);

  // head
  ctx.fillStyle = "#c89870";
  ctx.beginPath();
  ctx.arc(0, -10, 2.8, 0, Math.PI * 2);
  ctx.fill();

  // orange hunter cap
  ctx.fillStyle = "#e84b1a";
  ctx.beginPath();
  ctx.arc(0, -10.5, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#a82e0c";
  ctx.beginPath();
  ctx.arc(0, -11.5, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // aim indicator when aiming
  if (h.mode === "aim" && h.target) {
    ctx.save();
    ctx.translate(h.pos.x, h.pos.y);
    ctx.rotate(h.facing);
    ctx.strokeStyle = `rgba(255, 100, 60, ${0.35 + Math.sin(time * 12) * 0.2})`;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(80, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}
