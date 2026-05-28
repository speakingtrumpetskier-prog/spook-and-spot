// Small top-down minimap showing the park, zones, player, hunter, and bird dots.

import type { Game } from "../game/Game.ts";
import { WORLD_W, WORLD_H } from "../world/Map.ts";
import { birdMinimapColor } from "../birds/render.ts";

const MINI_W = 180;
const MINI_H = 154;

export function drawMinimap(ctx: CanvasRenderingContext2D, game: Game): void {
  const w = window.innerWidth;
  const x = w - MINI_W - 18;
  const y = 60;
  // background
  ctx.fillStyle = "rgba(8, 14, 10, 0.85)";
  ctx.fillRect(x, y, MINI_W, MINI_H);
  ctx.strokeStyle = "rgba(160, 180, 130, 0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, MINI_W - 1, MINI_H - 1);

  const sx = MINI_W / WORLD_W;
  const sy = MINI_H / WORLD_H;

  // Pond
  ctx.fillStyle = "#1c2e36";
  for (const pond of game.map.ponds) {
    ctx.beginPath();
    ctx.moveTo(x + pond.pts[0].x * sx, y + pond.pts[0].y * sy);
    for (let i = 1; i < pond.pts.length; i++) ctx.lineTo(x + pond.pts[i].x * sx, y + pond.pts[i].y * sy);
    ctx.closePath();
    ctx.fill();
  }

  // Tree dots (subtle)
  ctx.fillStyle = "rgba(60, 110, 50, 0.4)";
  for (const t of game.map.trees) {
    ctx.beginPath();
    ctx.arc(x + t.x * sx, y + t.y * sy, Math.max(0.6, t.r * sx * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }

  // Zone labels (faint)
  ctx.fillStyle = "rgba(200, 220, 180, 0.35)";
  ctx.font = "8px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Hunter", x + 0.22 * MINI_W, y + 0.32 * MINI_H);
  ctx.fillText("Pond", x + 0.51 * MINI_W, y + 0.7 * MINI_H);
  ctx.fillText("Watcher", x + 0.78 * MINI_W, y + 0.74 * MINI_H);

  // Birds — IDed get colored dot; unknown get faint dot
  for (const b of game.spawner.birds) {
    if (b.state === "dead") continue;
    const px = x + b.pos.x * sx;
    const py = y + b.pos.y * sy;
    if (b.idedByWatcher || game.watcherScore.autoIded.has(b.species.id)) {
      ctx.fillStyle = birdMinimapColor(b.species.id);
      ctx.beginPath();
      ctx.arc(px, py, 1.6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(232, 224, 200, 0.55)";
      ctx.beginPath();
      ctx.arc(px, py, 1.0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Player
  const ppx = x + game.player.pos.x * sx;
  const ppy = y + game.player.pos.y * sy;
  ctx.fillStyle = "#c8e29a";
  ctx.beginPath();
  ctx.arc(ppx, ppy, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Hunter (only visible if recently fired or close)
  const hpx = x + game.hunter.pos.x * sx;
  const hpy = y + game.hunter.pos.y * sy;
  const showHunter = game.hunterMinimapVisibility > 0;
  if (showHunter) {
    ctx.fillStyle = `rgba(224, 168, 120, ${Math.min(1, game.hunterMinimapVisibility)})`;
    ctx.beginPath();
    ctx.arc(hpx, hpy, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  ctx.textAlign = "left";
}

export const MINIMAP_SIZE = { w: MINI_W, h: MINI_H };
