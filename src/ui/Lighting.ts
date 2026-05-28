// Day-arc lighting overlay. Match starts at golden morning, peaks midday, ends amber evening.

export function dayPhaseFraction(t: number, total: number): number {
  return Math.min(1, Math.max(0, t / total));
}

export function dayPhaseLabel(t: number, total: number): string {
  const f = dayPhaseFraction(t, total);
  if (f < 0.18) return "Morning";
  if (f < 0.4) return "Late Morning";
  if (f < 0.6) return "Midday";
  if (f < 0.82) return "Afternoon";
  return "Evening";
}

// Returns a fillStyle gradient color overlay to wash the scene
export function drawLightingOverlay(ctx: CanvasRenderingContext2D, t: number, total: number): void {
  const f = dayPhaseFraction(t, total);
  const w = window.innerWidth;
  const h = window.innerHeight;

  // Morning: warm pinkish, late evening: orange
  // Build per-phase tint
  let tint = "rgba(255, 220, 160, 0.12)";   // morning gold
  if (f > 0.18 && f < 0.6) tint = "rgba(255, 250, 230, 0.04)"; // midday near-neutral
  if (f > 0.6 && f < 0.82) tint = "rgba(255, 200, 140, 0.10)"; // afternoon warm
  if (f > 0.82) {
    const intensity = (f - 0.82) / 0.18;
    tint = `rgba(220, 130, 70, ${0.12 + intensity * 0.18})`;
  }

  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, w, h);

  // Evening vignette
  if (f > 0.82) {
    const intensity = (f - 0.82) / 0.18;
    const g = ctx.createRadialGradient(w/2, h/2, Math.min(w,h)*0.3, w/2, h/2, Math.max(w,h)*0.7);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(0,0,20,${0.35 * intensity})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}
