// Heads-up display: score, timer, calls, target name, ticker.

import type { Game } from "../game/Game.ts";
import { SPECIES } from "../birds/species.ts";
import { CALL_LOADOUT } from "../watcher/Calls.ts";

export function drawHUD(ctx: CanvasRenderingContext2D, game: Game): void {
  const w = window.innerWidth;
  const h = window.innerHeight;

  // === Top bar ===
  ctx.fillStyle = "rgba(8, 14, 10, 0.6)";
  ctx.fillRect(0, 0, w, 48);
  ctx.strokeStyle = "rgba(160, 180, 130, 0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 48); ctx.lineTo(w, 48); ctx.stroke();

  // Title left
  ctx.fillStyle = "#e8e0c8";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Spook & Spot", 14, 22);
  ctx.fillStyle = "rgba(200, 220, 180, 0.55)";
  ctx.font = "10px sans-serif";
  ctx.fillText("Loring Park · Practice", 14, 38);

  // Center: timer + day arc
  const t = Math.max(0, game.matchTime - game.time);
  const mm = Math.floor(t / 60).toString().padStart(2, "0");
  const ss = Math.floor(t % 60).toString().padStart(2, "0");
  ctx.fillStyle = "#f0ead6";
  ctx.font = "bold 22px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${mm}:${ss}`, w / 2, 30);
  // day phase
  ctx.font = "10px sans-serif";
  ctx.fillStyle = "rgba(200, 220, 180, 0.55)";
  ctx.fillText(game.dayPhaseLabel(), w / 2, 42);

  // Scores: watcher (left of center) + hunter (right of center)
  const wScore = game.watcherScore.total;
  const hScore = game.hunterScore;
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = "#c8e29a";
  ctx.fillText("Watcher", w / 2 - 80, 22);
  ctx.font = "bold 22px monospace";
  ctx.fillText(String(wScore), w / 2 - 80, 42);
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = "#e0a878";
  ctx.fillText("Hunter (AI)", w / 2 + 80, 22);
  ctx.font = "bold 22px monospace";
  ctx.fillText(String(hScore), w / 2 + 80, 42);

  // === Bottom-left: calls ===
  const calls = game.callSystem;
  const cx0 = 18;
  const cy0 = h - 70;
  ctx.fillStyle = "rgba(8, 14, 10, 0.6)";
  ctx.fillRect(cx0 - 4, cy0 - 4, 56 * 4 + 8, 56);
  ctx.font = "10px sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(200, 220, 180, 0.5)";
  ctx.fillText("BIRD CALLS", cx0, cy0 - 8);
  for (let i = 0; i < CALL_LOADOUT.length; i++) {
    const x = cx0 + i * 56;
    const sp = SPECIES[CALL_LOADOUT[i]];
    ctx.fillStyle = calls.cooldowns[i] > 0 ? "rgba(60,60,50,0.7)" : "rgba(80, 100, 60, 0.55)";
    ctx.fillRect(x, cy0, 52, 48);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.strokeRect(x + 0.5, cy0 + 0.5, 51, 47);
    // cooldown overlay
    if (calls.cooldowns[i] > 0) {
      const frac = calls.cooldowns[i] / 30;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(x, cy0 + 48 * (1 - frac), 52, 48 * frac);
    }
    // species name
    ctx.fillStyle = "#e8e0c8";
    ctx.font = "10px sans-serif";
    ctx.fillText(sp.name.split(" ")[0], x + 4, cy0 + 12);
    ctx.fillStyle = "rgba(200, 220, 180, 0.55)";
    ctx.fillText(sp.name.split(" ").slice(1).join(" "), x + 4, cy0 + 24);
    // key hint
    ctx.fillStyle = "#c8d2b0";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(String(i + 1), x + 48, cy0 + 44);
    ctx.textAlign = "left";
  }

  // === Bottom-right: minimap-like notebook count + last event ===
  const noteW = 200;
  ctx.fillStyle = "rgba(8, 14, 10, 0.6)";
  ctx.fillRect(w - noteW - 14, h - 70, noteW, 56);
  ctx.font = "10px sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(200, 220, 180, 0.5)";
  ctx.fillText("FIELD NOTEBOOK", w - noteW - 4, h - 78);
  ctx.fillStyle = "#e8e0c8";
  ctx.font = "13px sans-serif";
  ctx.fillText(`${game.watcherScore.uniqueSpecies()} species · ${[...game.watcherScore.notebook.values()].reduce((a,b)=>a+b.spotCount,0)} spots`, w - noteW - 4, h - 50);
  ctx.fillStyle = "rgba(200, 220, 180, 0.55)";
  ctx.font = "10px sans-serif";
  ctx.fillText("TAB to open notebook", w - noteW - 4, h - 32);

  // Recent event ticker (above call bar)
  if (game.watcherScore.lastEvent) {
    const ev = game.watcherScore.lastEvent;
    const alpha = Math.min(1, ev.ttl);
    ctx.fillStyle = `rgba(232, 224, 200, ${alpha})`;
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(ev.text, w / 2, h - 100);
  }

  // === Stance indicator + patience ===
  const px = w / 2 - 20;
  const py = h - 32;
  ctx.fillStyle = "rgba(8, 14, 10, 0.6)";
  ctx.fillRect(px - 4, py - 14, 70, 20);
  ctx.fillStyle = "#c8d2b0";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`stance: ${game.player.stance}`, px, py);

  // Controls hint
  ctx.fillStyle = "rgba(200, 220, 180, 0.4)";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("WASD move · Shift crouch · Space stand still · E binoculars · aim & hold on a bird to ID/photo · 1-4 calls · TAB notebook", w / 2, h - 4);
}
