// End-of-match summary screen.

import type { Game } from "../game/Game.ts";
import { SPECIES } from "../birds/species.ts";
import { drawBird } from "../birds/render.ts";

export function drawEndScreen(ctx: CanvasRenderingContext2D, game: Game): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  ctx.fillStyle = "rgba(8, 14, 10, 0.96)";
  ctx.fillRect(0, 0, w, h);

  const wScore = game.watcherScore.total;
  const hScore = game.hunterScore;
  const watcherWon = wScore > hScore;
  const tied = wScore === hScore;

  // Outcome banner
  ctx.fillStyle = watcherWon ? "#c8e29a" : (tied ? "#e6c45a" : "#e07a3a");
  ctx.font = "bold 42px serif";
  ctx.textAlign = "center";
  ctx.fillText(tied ? "Sundown — tied" : (watcherWon ? "You won the day" : "The hunter outscored you"), w / 2, 90);

  // Scores
  ctx.font = "16px sans-serif";
  ctx.fillStyle = "#e8e0c8";
  ctx.fillText(`Watcher ${wScore}   vs   Hunter ${hScore}`, w / 2, 124);

  // Stats columns
  const cx1 = w / 2 - 230;
  const cx2 = w / 2 + 30;
  const top = 180;

  ctx.textAlign = "left";
  ctx.font = "bold 16px serif";
  ctx.fillStyle = "#c8e29a";
  ctx.fillText("Watcher's Notebook", cx1, top);
  ctx.font = "12px serif";
  ctx.fillStyle = "rgba(232, 224, 200, 0.85)";
  ctx.fillText(`${game.watcherScore.uniqueSpecies()} species observed`, cx1, top + 22);

  let y = top + 48;
  for (const entry of [...game.watcherScore.notebook.values()].sort((a,b) => b.bestPoints - a.bestPoints)) {
    const sp = SPECIES[entry.speciesId];
    ctx.save();
    ctx.translate(cx1 + 14, y - 4);
    const fake: import("../birds/render.ts").BirdSprite = {
      pos: { x: 0, y: 0 },
      species: { ...sp, length: 16 },
      facing: 0, state: "perched", altitude: 0, bobPhase: 0,
    };
    drawBird(ctx, fake, 0);
    ctx.restore();
    ctx.fillStyle = "#f0ead6";
    ctx.font = "12px serif";
    ctx.fillText(`${sp.name}  ×${entry.spotCount}${entry.photographed ? "  📷" : ""}`, cx1 + 32, y);
    ctx.fillStyle = "rgba(200, 220, 180, 0.55)";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`+${entry.bestPoints}`, cx1 + 360, y);
    ctx.textAlign = "left";
    y += 20;
  }

  // Hunter bag
  ctx.font = "bold 16px serif";
  ctx.fillStyle = "#e0a878";
  ctx.fillText("Hunter's Bag", cx2, top);
  ctx.font = "12px serif";
  ctx.fillStyle = "rgba(232, 224, 200, 0.85)";
  ctx.fillText(`${game.hunter.bag.length} birds bagged`, cx2, top + 22);

  // Group hunter bag by species
  const tally = new Map<string, number>();
  for (const b of game.hunter.bag) tally.set(b.speciesId, (tally.get(b.speciesId) ?? 0) + 1);
  y = top + 48;
  for (const [id, count] of [...tally.entries()].sort((a, b) => b[1] - a[1])) {
    const sp = SPECIES[id as keyof typeof SPECIES];
    ctx.save();
    ctx.translate(cx2 + 14, y - 4);
    const fake: import("../birds/render.ts").BirdSprite = {
      pos: { x: 0, y: 0 },
      species: { ...sp, length: 16 },
      facing: 0, state: "dead", altitude: 0, bobPhase: 0,
    };
    drawBird(ctx, fake, 0);
    ctx.restore();
    ctx.fillStyle = "#f0ead6";
    ctx.font = "12px serif";
    ctx.fillText(`${sp.name}  ×${count}`, cx2 + 32, y);
    ctx.fillStyle = "rgba(200, 220, 180, 0.55)";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`+${count * sp.pointsHunt}`, cx2 + 360, y);
    ctx.textAlign = "left";
    y += 20;
  }

  // Reset hint
  ctx.fillStyle = "rgba(232, 224, 200, 0.9)";
  ctx.font = "13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Press R to play another round", w / 2, h - 40);
}
