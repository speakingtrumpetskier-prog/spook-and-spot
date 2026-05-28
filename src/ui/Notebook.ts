// Field notebook overlay — shown when TAB is held.

import type { Game } from "../game/Game.ts";
import { SPECIES } from "../birds/species.ts";
import { drawBird } from "../birds/render.ts";

export function drawNotebook(ctx: CanvasRenderingContext2D, game: Game): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  ctx.fillStyle = "rgba(15, 20, 14, 0.92)";
  ctx.fillRect(0, 0, w, h);

  // Title
  ctx.fillStyle = "#f0ead6";
  ctx.font = "bold 22px serif";
  ctx.textAlign = "center";
  ctx.fillText("Field Notebook — Loring Park", w / 2, 50);
  ctx.fillStyle = "rgba(200, 220, 180, 0.55)";
  ctx.font = "italic 12px serif";
  ctx.fillText(`${game.watcherScore.uniqueSpecies()} of ${Object.keys(SPECIES).length} species observed`, w / 2, 72);

  // Grid: 4 cols, all 12 species
  const cols = 4;
  const cellW = 240;
  const cellH = 110;
  const startX = (w - cols * cellW) / 2;
  const startY = 100;
  let i = 0;
  for (const id in SPECIES) {
    const sp = SPECIES[id as keyof typeof SPECIES];
    const entry = game.watcherScore.notebook.get(sp.id);
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = startX + col * cellW;
    const cy = startY + row * cellH;

    // card
    ctx.fillStyle = entry ? "rgba(40, 50, 35, 0.85)" : "rgba(20, 25, 18, 0.6)";
    ctx.fillRect(cx, cy, cellW - 12, cellH - 12);
    ctx.strokeStyle = entry ? "rgba(180, 200, 140, 0.5)" : "rgba(255,255,255,0.08)";
    ctx.strokeRect(cx + 0.5, cy + 0.5, cellW - 13, cellH - 13);

    // portrait
    ctx.save();
    ctx.translate(cx + 36, cy + 40);
    if (entry) {
      const fake: import("../birds/render.ts").BirdSprite = {
        pos: { x: 0, y: 0 },
        species: { ...sp, length: 28 },
        facing: 0,
        state: "perched",
        altitude: 0,
        bobPhase: 0,
      };
      drawBird(ctx, fake, 0);
    } else {
      // silhouette only
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath();
      ctx.ellipse(0, 0, sp.length * 0.5, sp.length * sp.width * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(180, 200, 140, 0.4)";
      ctx.font = "bold 24px serif";
      ctx.textAlign = "center";
      ctx.fillText("?", 0, 7);
    }
    ctx.restore();

    // species name
    ctx.fillStyle = entry ? "#f0ead6" : "rgba(180, 200, 140, 0.45)";
    ctx.font = "bold 13px serif";
    ctx.textAlign = "left";
    ctx.fillText(entry ? sp.name : "—", cx + 78, cy + 22);
    ctx.fillStyle = "rgba(200, 220, 180, 0.55)";
    ctx.font = "italic 10px serif";
    ctx.fillText(entry ? sp.scientific : "—", cx + 78, cy + 36);

    if (entry) {
      ctx.font = "10px serif";
      ctx.fillStyle = "rgba(232, 224, 200, 0.85)";
      const lines = wrapText(ctx, sp.blurb, cellW - 100);
      let yy = cy + 54;
      for (const line of lines.slice(0, 3)) {
        ctx.fillText(line, cx + 78, yy);
        yy += 12;
      }
      ctx.fillStyle = entry.photographed ? "#e6c45a" : "rgba(200, 220, 180, 0.5)";
      ctx.font = "9px sans-serif";
      ctx.fillText(`${entry.spotCount} spot${entry.spotCount > 1 ? "s" : ""}${entry.photographed ? " · photo ✓" : ""}`, cx + 78, cy + cellH - 22);
    }

    i++;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(200, 220, 180, 0.6)";
  ctx.font = "11px sans-serif";
  ctx.fillText("Release TAB to return", w / 2, h - 24);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}
