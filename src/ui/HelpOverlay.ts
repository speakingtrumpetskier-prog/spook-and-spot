// First-run help overlay. Fades after a few seconds.

export function drawHelpOverlay(ctx: CanvasRenderingContext2D, ttl: number): void {
  if (ttl <= 0) return;
  const alpha = Math.min(1, ttl / 4);  // fade in last 4 sec
  const w = window.innerWidth;
  const h = window.innerHeight;

  // Centered card
  const cw = 380, ch = 240;
  const cx = (w - cw) / 2;
  const cy = h / 2 - ch / 2 - 30;

  ctx.fillStyle = `rgba(8, 14, 10, ${0.88 * alpha})`;
  ctx.fillRect(cx, cy, cw, ch);
  ctx.strokeStyle = `rgba(168, 184, 154, ${0.6 * alpha})`;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx + 0.5, cy + 0.5, cw - 1, ch - 1);

  ctx.fillStyle = `rgba(232, 224, 200, ${alpha})`;
  ctx.font = "bold 18px serif";
  ctx.textAlign = "center";
  ctx.fillText("Spook & Spot", w / 2, cy + 30);
  ctx.font = "italic 11px serif";
  ctx.fillStyle = `rgba(200, 220, 180, ${0.7 * alpha})`;
  ctx.fillText("Loring Park birding · practice match (10:00)", w / 2, cy + 48);

  const lines = [
    ["RMB", "raise binoculars · zoom & track"],
    ["E", "identify the targeted bird (1-4 to answer)"],
    ["LMB", "photograph (hold target steady ~1s)"],
    ["1 – 4", "play bird calls (30s cooldown)"],
    ["WASD", "move · Shift to crouch · Space to stand still"],
    ["TAB", "open field notebook"],
  ];
  ctx.textAlign = "left";
  ctx.font = "12px sans-serif";
  let y = cy + 78;
  for (const [k, v] of lines) {
    ctx.fillStyle = `rgba(200, 220, 180, ${0.9 * alpha})`;
    ctx.fillText(k, cx + 24, y);
    ctx.fillStyle = `rgba(232, 224, 200, ${alpha})`;
    ctx.fillText(v, cx + 80, y);
    y += 20;
  }

  ctx.fillStyle = `rgba(200, 220, 180, ${0.5 * alpha})`;
  ctx.font = "italic 10px serif";
  ctx.textAlign = "center";
  ctx.fillText("You are the watcher. An AI hunter is also in the park.", w / 2, cy + ch - 16);
}
