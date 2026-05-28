// Renders the watcher player as a simple stylized top-down figure.

import type { Player } from "./Player.ts";

export function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, time: number): void {
  ctx.save();
  ctx.translate(p.pos.x, p.pos.y);

  // subtle ground marker so the player is always findable
  ctx.strokeStyle = "rgba(200, 220, 140, 0.25)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.arc(0, 4, 9, 0, Math.PI * 2);
  ctx.stroke();

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, 4, 7, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // facing-driven slight rotation for shoulders
  const facingDeg = p.facing;
  ctx.rotate(facingDeg + Math.PI / 2);

  const crouchOffset = p.stance === "crouch" ? 1 : 0;

  // legs/feet (subtle bob)
  const bob = (p.stance !== "still") ? Math.sin(time * 7) * 0.6 : 0;
  ctx.fillStyle = "#3b3326";
  ctx.fillRect(-3, 0 + bob * 0.5, 2.2, 4);
  ctx.fillRect(0.8, 0 - bob * 0.5, 2.2, 4);

  // torso — olive/khaki birder vest
  ctx.fillStyle = "#6b6a3d";
  const torsoH = 7 - crouchOffset;
  ctx.fillRect(-4, -torsoH, 8, torsoH + 1);
  // pocket detail
  ctx.fillStyle = "#4a4928";
  ctx.fillRect(-3, -torsoH + 2, 2.5, 2);
  ctx.fillRect(0.5, -torsoH + 2, 2.5, 2);

  // arms
  ctx.fillStyle = "#5a5a32";
  ctx.fillRect(-5.2, -torsoH + 1, 1.6, 4);
  ctx.fillRect(3.6, -torsoH + 1, 1.6, 4);

  // binoculars hanging across chest
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(-2.5, -torsoH + 4, 5, 1.5);

  // head
  ctx.fillStyle = "#d8b08c";
  ctx.beginPath();
  ctx.arc(0, -torsoH - 1, 2.6, 0, Math.PI * 2);
  ctx.fill();

  // wide-brim sun hat
  ctx.fillStyle = "#8a6f3d";
  ctx.beginPath();
  ctx.ellipse(0, -torsoH - 1.5, 4.2, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6b552b";
  ctx.beginPath();
  ctx.arc(0, -torsoH - 1.8, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Patience indicator (only when standing still)
  if (p.stance === "still" && p.patience > 5) {
    ctx.save();
    ctx.translate(p.pos.x, p.pos.y - 18);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(-10, -2, 20, 3);
    ctx.fillStyle = "rgba(180, 220, 130, 0.95)";
    ctx.fillRect(-10, -2, 20 * (p.patience / 100), 3);
    ctx.restore();
  }
}
