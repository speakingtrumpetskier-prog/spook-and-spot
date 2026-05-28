// Procedural top-down bird renderer.
// Species-specific detail layered on top of a shared body/head/wing pipeline.

import type { SpeciesDef, SpeciesId } from "./species.ts";

export type BirdState =
  | "perched"
  | "feeding"
  | "alert"
  | "walking"
  | "swimming"
  | "takeoff"
  | "flying"
  | "landing"
  | "hit"
  | "dead";

export interface BirdSprite {
  pos: { x: number; y: number };
  species: SpeciesDef;
  facing: number;
  state: BirdState;
  altitude: number;
  bobPhase: number;
  hitTimer?: number;
}

export function drawBird(ctx: CanvasRenderingContext2D, bird: BirdSprite, time: number): void {
  const sp = bird.species;
  const len = sp.length;
  const wid = len * sp.width;

  ctx.save();
  ctx.translate(bird.pos.x, bird.pos.y);

  // Shadow (always grounded position, scales with altitude)
  const altShadow = bird.altitude;
  ctx.fillStyle = `rgba(0,0,0,${0.36 / (1 + altShadow * 0.04)})`;
  ctx.beginPath();
  const shadowScale = 1 + altShadow * 0.015;
  ctx.ellipse(0, 0, (len * 0.55) * shadowScale, (wid * 0.55) * shadowScale, bird.facing, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, -altShadow);
  ctx.rotate(bird.facing);

  const bobY = (bird.state === "walking") ? Math.sin(bird.bobPhase) * 0.4 : 0;
  ctx.translate(0, bobY);

  const flap = Math.sin(time * 16 + bird.bobPhase * 7);

  if (bird.state === "flying" || bird.state === "takeoff" || bird.state === "landing") {
    drawFlightWings(ctx, sp, flap, bird.state);
  }

  // Body — base + species detail
  drawBody(ctx, sp);
  drawBodySpeciesDetail(ctx, sp);

  // Tail
  drawTail(ctx, sp, bird.state);

  // Neck + head positioning
  let headOffset = len * 0.42;
  const hasLongNeck = sp.id === "heron";
  if (hasLongNeck) {
    const neckExtend = bird.state === "alert" ? 0.55 : (bird.state === "feeding" ? 0.85 : 0.35);
    drawHeronNeck(ctx, sp, len * neckExtend);
    headOffset = len * (0.42 + neckExtend * 0.6);
  } else if (bird.state === "alert") {
    headOffset = len * 0.45;
  }

  // Collar / neck ring
  if (sp.collar) {
    ctx.fillStyle = sp.collar.color;
    ctx.beginPath();
    ctx.ellipse(len * 0.32, 0, len * 0.05, wid * sp.collar.width * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    // collar shading
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 0.3;
    ctx.stroke();
  }

  drawHead(ctx, sp, headOffset, bird.state, time);
  drawHeadSpeciesDetail(ctx, sp, headOffset, bird.state);

  if (bird.state !== "flying" && bird.state !== "takeoff" && bird.state !== "landing") {
    drawFoldedWings(ctx, sp);
    drawWingSpeciesDetail(ctx, sp);
  }

  if (sp.crest) drawCrest(ctx, sp, headOffset);

  if (sp.whitePatch === "wing") {
    drawWhiteWingPatches(ctx, sp);
  }

  if (sp.spots) {
    drawSpotPattern(ctx, sp);
  }

  // Heron — suggest trailing legs in flight
  if (sp.id === "heron" && (bird.state === "flying" || bird.state === "takeoff")) {
    ctx.strokeStyle = "#3a2c1c";
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(-len * 0.45, -wid * 0.18);
    ctx.lineTo(-len * 0.85, -wid * 0.12);
    ctx.moveTo(-len * 0.45, wid * 0.18);
    ctx.lineTo(-len * 0.85, wid * 0.12);
    ctx.stroke();
  }

  // Hit effect — feather burst
  if (bird.state === "hit" && bird.hitTimer !== undefined) {
    const t = bird.hitTimer;
    ctx.globalAlpha = Math.max(0, 1 - t * 2);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const d = 4 + t * 22;
      ctx.fillStyle = sp.bodyColor;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d, 1.5, 0.7, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// === Body — base ellipse with feather texture ===
function drawBody(ctx: CanvasRenderingContext2D, sp: SpeciesDef): void {
  const len = sp.length;
  const wid = len * sp.width;

  // Outline (soft)
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 0.4, len * 0.52, wid * 0.52, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body base
  ctx.fillStyle = sp.bodyColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, len * 0.5, wid * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Lower-flank shading
  ctx.fillStyle = sp.bodyAccent;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.ellipse(0, wid * 0.18, len * 0.48, wid * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Fine feather texture — series of tiny arc lines along the back
  ctx.strokeStyle = "rgba(0,0,0,0.16)";
  ctx.lineWidth = 0.25;
  const rows = 4;
  for (let r = 0; r < rows; r++) {
    const yy = -wid * 0.35 + (r / (rows - 1)) * wid * 0.7;
    const rowAlpha = 1 - Math.abs(yy) / (wid * 0.45);
    if (rowAlpha < 0.2) continue;
    const arcW = len * 0.06;
    const xStart = -len * 0.4;
    const xEnd = len * 0.4;
    for (let x = xStart; x < xEnd; x += arcW * 0.95) {
      ctx.beginPath();
      ctx.arc(x, yy + 0.2, arcW * 0.55, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
  }

  // Back highlight stripe
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.ellipse(0, -wid * 0.22, len * 0.4, wid * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Subtle pin highlight on top
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.ellipse(-len * 0.08, -wid * 0.3, len * 0.18, wid * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Per-species body overlay (belly colors, breast, speciality)
function drawBodySpeciesDetail(ctx: CanvasRenderingContext2D, sp: SpeciesDef): void {
  const len = sp.length;
  const wid = len * sp.width;
  switch (sp.id) {
    case "mallard": {
      // Chestnut breast hint at front of body
      ctx.fillStyle = "#6a3622";
      ctx.beginPath();
      ctx.ellipse(len * 0.22, 0, len * 0.18, wid * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.beginPath();
      ctx.ellipse(len * 0.22, wid * 0.15, len * 0.16, wid * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      // Faint gray feather barring on flanks
      ctx.strokeStyle = "rgba(245,235,210,0.4)";
      ctx.lineWidth = 0.3;
      for (let i = 0; i < 8; i++) {
        const xx = -len * 0.3 + i * (len * 0.07);
        ctx.beginPath();
        ctx.moveTo(xx, -wid * 0.42);
        ctx.lineTo(xx + 0.6, -wid * 0.36);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(xx, wid * 0.42);
        ctx.lineTo(xx + 0.6, wid * 0.36);
        ctx.stroke();
      }
      break;
    }
    case "robin": {
      // Orange-red breast peeking under chin
      ctx.fillStyle = "#c84a26";
      ctx.beginPath();
      ctx.ellipse(len * 0.25, 0, len * 0.18, wid * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.beginPath();
      ctx.ellipse(len * 0.25, wid * 0.15, len * 0.16, wid * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "chickadee": {
      // Buff sides + white underbody peek
      ctx.fillStyle = "#e8dcc4";
      ctx.beginPath();
      ctx.ellipse(0, wid * 0.32, len * 0.42, wid * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d8c8a8";
      ctx.beginPath();
      ctx.ellipse(0, wid * 0.45, len * 0.38, wid * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "canadaGoose": {
      // White undertail peek
      ctx.fillStyle = "#f0e8d0";
      ctx.beginPath();
      ctx.ellipse(-len * 0.4, 0, len * 0.1, wid * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      // Body lighter belly hint
      ctx.fillStyle = "rgba(220, 205, 175, 0.25)";
      ctx.beginPath();
      ctx.ellipse(0, wid * 0.3, len * 0.4, wid * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "woodDuck": {
      // Distinctive golden-buff flanks with fine black vermiculation
      ctx.fillStyle = "#e8c66a";
      ctx.beginPath();
      ctx.ellipse(0, wid * 0.28, len * 0.36, wid * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8c66a";
      ctx.beginPath();
      ctx.ellipse(0, -wid * 0.28, len * 0.36, wid * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      // Black vermiculation lines
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.lineWidth = 0.25;
      for (let i = 0; i < 14; i++) {
        const xx = -len * 0.32 + i * (len * 0.045);
        ctx.beginPath(); ctx.moveTo(xx, wid * 0.18); ctx.lineTo(xx + 1.2, wid * 0.42); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(xx, -wid * 0.18); ctx.lineTo(xx + 1.2, -wid * 0.42); ctx.stroke();
      }
      // Chestnut breast
      ctx.fillStyle = "#7a3a26";
      ctx.beginPath();
      ctx.ellipse(len * 0.24, 0, len * 0.16, wid * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      // White vertical stripe between breast and flank
      ctx.fillStyle = "#f0ead6";
      ctx.fillRect(len * 0.12, -wid * 0.5, 0.7, wid);
      break;
    }
    case "cardinal": {
      // Slightly darker red on lower body
      ctx.fillStyle = "#9c1a14";
      ctx.beginPath();
      ctx.ellipse(0, wid * 0.2, len * 0.45, wid * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "downy": {
      // White stripe down the middle of back
      ctx.fillStyle = "#f0ead6";
      ctx.beginPath();
      ctx.ellipse(0, 0, len * 0.45, wid * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      // White underside
      ctx.fillStyle = "#f0ead6";
      ctx.beginPath();
      ctx.ellipse(0, wid * 0.34, len * 0.42, wid * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "heron": {
      // Lighter underside
      ctx.fillStyle = "#8a96a4";
      ctx.beginPath();
      ctx.ellipse(0, wid * 0.25, len * 0.4, wid * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Shoulder dark patch
      ctx.fillStyle = "#2c3a44";
      ctx.beginPath();
      ctx.ellipse(len * 0.15, -wid * 0.18, len * 0.12, wid * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "pileated": {
      // White flash on wing/back stripe
      ctx.fillStyle = "#f0ead6";
      ctx.beginPath();
      ctx.ellipse(len * 0.1, -wid * 0.3, len * 0.16, wid * 0.05, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(len * 0.1, wid * 0.3, len * 0.16, wid * 0.05, -0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "redtail": {
      // Lighter belly with a darker "belly band"
      ctx.fillStyle = "#d8c4a0";
      ctx.beginPath();
      ctx.ellipse(0, wid * 0.3, len * 0.42, wid * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5a3a22";
      ctx.fillRect(-len * 0.08, wid * 0.18, len * 0.16, wid * 0.18);
      // Streaks
      ctx.strokeStyle = "rgba(50,30,18,0.7)";
      ctx.lineWidth = 0.3;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(-len * 0.12 + i * (len * 0.04), wid * 0.2);
        ctx.lineTo(-len * 0.12 + i * (len * 0.04), wid * 0.36);
        ctx.stroke();
      }
      break;
    }
    case "waxwing": {
      // Soft yellow tinge on belly
      ctx.fillStyle = "#e8d05e";
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.ellipse(0, wid * 0.3, len * 0.36, wid * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      break;
    }
    case "tanager": {
      // Pure red body — slight pin highlight already done
      ctx.fillStyle = "#fa5a30";
      ctx.beginPath();
      ctx.ellipse(0, -wid * 0.18, len * 0.36, wid * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
}

// === Tail with species accents ===
function drawTail(ctx: CanvasRenderingContext2D, sp: SpeciesDef, state: BirdState): void {
  const len = sp.length;
  const wid = len * sp.width;
  const fan = (state === "flying" || state === "takeoff") ? 1.5 : 1.0;

  ctx.fillStyle = sp.tailColor;
  ctx.beginPath();
  ctx.moveTo(-len * 0.45, -wid * 0.22 * fan);
  ctx.lineTo(-len * 0.7 - (sp.id === "redtail" ? 1 : 0), 0);
  ctx.lineTo(-len * 0.45, wid * 0.22 * fan);
  ctx.closePath();
  ctx.fill();

  // Per-species tail accents
  if (sp.id === "waxwing") {
    // Yellow tail tip band
    ctx.fillStyle = "#f4d03f";
    ctx.beginPath();
    ctx.moveTo(-len * 0.58, -wid * 0.13);
    ctx.lineTo(-len * 0.7, 0);
    ctx.lineTo(-len * 0.58, wid * 0.13);
    ctx.closePath();
    ctx.fill();
  }
  if (sp.id === "redtail") {
    // Brick-red tail (overlay brighter)
    ctx.fillStyle = "#c8543c";
    ctx.beginPath();
    ctx.moveTo(-len * 0.46, -wid * 0.22 * fan + 0.4);
    ctx.lineTo(-len * 0.7, 0);
    ctx.lineTo(-len * 0.46, wid * 0.22 * fan - 0.4);
    ctx.closePath();
    ctx.fill();
    // Faint banding
    ctx.strokeStyle = "rgba(60, 30, 20, 0.45)";
    ctx.lineWidth = 0.3;
    for (let i = 0; i < 3; i++) {
      const xx = -len * 0.5 - i * (len * 0.06);
      ctx.beginPath();
      ctx.moveTo(xx, -wid * 0.15);
      ctx.lineTo(xx + 1, wid * 0.15);
      ctx.stroke();
    }
  }
  if (sp.id === "mallard") {
    // Drake's curled black central tail feathers
    ctx.fillStyle = "#0a0a0a";
    ctx.beginPath();
    ctx.ellipse(-len * 0.55, 0, len * 0.12, wid * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    // tiny curl up
    ctx.strokeStyle = "#0a0a0a";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-len * 0.55, -wid * 0.05);
    ctx.quadraticCurveTo(-len * 0.62, -wid * 0.18, -len * 0.5, -wid * 0.22);
    ctx.stroke();
  }
  if (sp.id === "canadaGoose") {
    // Solid black tail; white undertail visible just in front
    ctx.fillStyle = "#f0e8d0";
    ctx.beginPath();
    ctx.moveTo(-len * 0.42, -wid * 0.18);
    ctx.lineTo(-len * 0.5, 0);
    ctx.lineTo(-len * 0.42, wid * 0.18);
    ctx.closePath();
    ctx.fill();
  }
  if (sp.id === "tanager") {
    // Pure black tail (matches wings)
    ctx.fillStyle = "#0a0a0a";
    ctx.beginPath();
    ctx.moveTo(-len * 0.45, -wid * 0.2);
    ctx.lineTo(-len * 0.72, 0);
    ctx.lineTo(-len * 0.45, wid * 0.2);
    ctx.closePath();
    ctx.fill();
  }
}

function drawHeronNeck(ctx: CanvasRenderingContext2D, sp: SpeciesDef, extend: number): void {
  const wid = sp.length * sp.width;
  // S-curve neck
  ctx.fillStyle = sp.bodyColor;
  ctx.beginPath();
  ctx.moveTo(sp.length * 0.4, -wid * 0.13);
  ctx.bezierCurveTo(
    sp.length * 0.42 + extend * 0.3, -wid * 0.4,
    sp.length * 0.42 + extend * 0.6, wid * 0.05,
    sp.length * 0.4 + extend, -wid * 0.05,
  );
  ctx.bezierCurveTo(
    sp.length * 0.42 + extend * 0.6, wid * 0.15,
    sp.length * 0.42 + extend * 0.3, -wid * 0.3 + wid * 0.5,
    sp.length * 0.4, wid * 0.13,
  );
  ctx.closePath();
  ctx.fill();
  // Lighter underside of neck
  ctx.strokeStyle = "rgba(220,220,220,0.4)";
  ctx.lineWidth = 0.3;
  ctx.beginPath();
  ctx.moveTo(sp.length * 0.4, -wid * 0.07);
  ctx.bezierCurveTo(
    sp.length * 0.42 + extend * 0.5, -wid * 0.25,
    sp.length * 0.42 + extend * 0.5, wid * 0.1,
    sp.length * 0.4 + extend, 0,
  );
  ctx.stroke();
}

// === Head — base ===
function drawHead(ctx: CanvasRenderingContext2D, sp: SpeciesDef, ox: number, state: BirdState, _time: number): void {
  const len = sp.length;
  const wid = len * sp.width;
  const headR = len * 0.18;

  let oy = 0;
  if (state === "feeding") oy = wid * 0.18;

  // Head base
  ctx.fillStyle = sp.headColor;
  ctx.beginPath();
  ctx.arc(ox, oy, headR, 0, Math.PI * 2);
  ctx.fill();

  // Shading underside
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(ox, oy + headR * 0.35, headR * 0.95, headR * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Top highlight
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.ellipse(ox + headR * 0.15, oy - headR * 0.32, headR * 0.55, headR * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  // Generic white patches
  if (sp.whitePatch === "cheek") {
    ctx.fillStyle = "#f4ecd8";
    ctx.beginPath();
    ctx.ellipse(ox - headR * 0.15, oy - headR * 0.05, headR * 0.55, headR * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(ox - headR * 0.15, oy + headR * 0.55, headR * 0.32, headR * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (sp.whitePatch === "neck") {
    ctx.fillStyle = "#f4ecd8";
    ctx.beginPath();
    ctx.ellipse(ox - headR * 0.7, oy, headR * 0.25, headR * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Eye + highlight
  const eyeX = ox + headR * 0.18, eyeY = oy - headR * 0.35;
  ctx.fillStyle = "#0a0a0a";
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, headR * 0.18, 0, Math.PI * 2);
  ctx.fill();
  // Iris highlight (species-tinted)
  let irisColor = "#3a2c1c";
  if (sp.id === "woodDuck") irisColor = "#c8231a";   // red eye
  if (sp.id === "redtail") irisColor = "#caaa54";    // yellow eye
  ctx.fillStyle = irisColor;
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, headR * 0.11, 0, Math.PI * 2);
  ctx.fill();
  // Bright catchlight
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.arc(eyeX + headR * 0.05, eyeY - headR * 0.05, headR * 0.05, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  drawBeak(ctx, sp, ox + headR * 0.75, oy);
}

// Per-species head overlay (masks, caps, stripes, throat patches)
function drawHeadSpeciesDetail(ctx: CanvasRenderingContext2D, sp: SpeciesDef, ox: number, _state: BirdState): void {
  const len = sp.length;
  const headR = len * 0.18;
  switch (sp.id) {
    case "mallard": {
      // Iridescent green head with purple highlight at top
      ctx.fillStyle = "#2a8a4a";
      ctx.beginPath();
      ctx.arc(ox, 0, headR * 0.95, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(120, 90, 160, 0.45)";
      ctx.beginPath();
      ctx.ellipse(ox - headR * 0.15, -headR * 0.3, headR * 0.55, headR * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      // Re-darken underside
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(ox, headR * 0.35, headR * 0.9, headR * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // Tiny eye on green head
      ctx.fillStyle = "#0a0a0a";
      ctx.beginPath();
      ctx.arc(ox + headR * 0.22, -headR * 0.25, headR * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.arc(ox + headR * 0.27, -headR * 0.3, headR * 0.05, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "woodDuck": {
      // Multi-color crested head: green-purple base, white stripes
      ctx.fillStyle = "#2a4a3e";
      ctx.beginPath();
      ctx.arc(ox, 0, headR * 0.98, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(110, 60, 130, 0.5)";
      ctx.beginPath();
      ctx.ellipse(ox - headR * 0.1, -headR * 0.3, headR * 0.55, headR * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      // White stripe from beak back through cheek
      ctx.strokeStyle = "#f4ecd8";
      ctx.lineWidth = headR * 0.18;
      ctx.beginPath();
      ctx.moveTo(ox + headR * 0.7, headR * 0.15);
      ctx.bezierCurveTo(ox + headR * 0.4, headR * 0.32, ox - headR * 0.2, headR * 0.45, ox - headR * 0.7, headR * 0.4);
      ctx.stroke();
      // Second narrower white stripe behind eye
      ctx.lineWidth = headR * 0.1;
      ctx.beginPath();
      ctx.moveTo(ox + headR * 0.2, -headR * 0.1);
      ctx.lineTo(ox - headR * 0.55, -headR * 0.2);
      ctx.stroke();
      // White throat
      ctx.fillStyle = "#f4ecd8";
      ctx.beginPath();
      ctx.ellipse(ox + headR * 0.5, headR * 0.55, headR * 0.4, headR * 0.18, 0.2, 0, Math.PI * 2);
      ctx.fill();
      // Red eye
      ctx.fillStyle = "#c8231a";
      ctx.beginPath();
      ctx.arc(ox + headR * 0.18, -headR * 0.18, headR * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0a0a0a";
      ctx.beginPath();
      ctx.arc(ox + headR * 0.18, -headR * 0.18, headR * 0.07, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "chickadee": {
      // Black cap (top half)
      ctx.fillStyle = "#0a0a0a";
      ctx.beginPath();
      ctx.arc(ox, 0, headR * 0.95, Math.PI, Math.PI * 2);
      ctx.fill();
      // Black throat bib
      ctx.fillStyle = "#0a0a0a";
      ctx.beginPath();
      ctx.ellipse(ox + headR * 0.55, headR * 0.35, headR * 0.35, headR * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      // White cheek between
      ctx.fillStyle = "#f4ecd8";
      ctx.beginPath();
      ctx.ellipse(ox - headR * 0.1, headR * 0.05, headR * 0.55, headR * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Eye visible on white
      ctx.fillStyle = "#0a0a0a";
      ctx.beginPath();
      ctx.arc(ox + headR * 0.18, -headR * 0.1, headR * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.arc(ox + headR * 0.22, -headR * 0.14, headR * 0.04, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "canadaGoose": {
      // White chinstrap from cheek up under jaw
      ctx.fillStyle = "#f4ecd8";
      ctx.beginPath();
      ctx.ellipse(ox - headR * 0.1, headR * 0.1, headR * 0.7, headR * 0.32, -0.1, 0, Math.PI * 2);
      ctx.fill();
      // Cover top with black again
      ctx.fillStyle = "#0a0a0a";
      ctx.beginPath();
      ctx.ellipse(ox - headR * 0.1, -headR * 0.15, headR * 0.9, headR * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "cardinal": {
      // Black mask around base of beak and eye
      ctx.fillStyle = "#0a0a0a";
      ctx.beginPath();
      ctx.ellipse(ox + headR * 0.35, headR * 0.1, headR * 0.5, headR * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      // Re-paint red eye area
      ctx.fillStyle = "#c8231a";
      ctx.beginPath();
      ctx.arc(ox - headR * 0.05, -headR * 0.18, headR * 0.4, 0, Math.PI * 2);
      ctx.fill();
      // Tiny dark eye
      ctx.fillStyle = "#0a0a0a";
      ctx.beginPath();
      ctx.arc(ox + headR * 0.18, -headR * 0.18, headR * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.arc(ox + headR * 0.22, -headR * 0.22, headR * 0.04, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "waxwing": {
      // Black mask across the eye
      ctx.strokeStyle = "#0a0a0a";
      ctx.lineWidth = headR * 0.3;
      ctx.beginPath();
      ctx.moveTo(ox + headR * 0.65, headR * 0.05);
      ctx.lineTo(ox - headR * 0.5, -headR * 0.15);
      ctx.stroke();
      break;
    }
    case "downy":
    case "pileated": {
      // Already mostly black — add white facial stripe from beak to nape
      ctx.strokeStyle = "#f4ecd8";
      ctx.lineWidth = headR * (sp.id === "pileated" ? 0.18 : 0.13);
      ctx.beginPath();
      ctx.moveTo(ox + headR * 0.7, headR * 0.05);
      ctx.lineTo(ox - headR * 0.7, headR * 0.15);
      ctx.stroke();
      if (sp.id === "downy") {
        // Red occipital patch (male)
        ctx.fillStyle = "#c8231a";
        ctx.beginPath();
        ctx.arc(ox - headR * 0.55, -headR * 0.25, headR * 0.18, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Pileated: a second stripe under jaw
        ctx.strokeStyle = "#f4ecd8";
        ctx.lineWidth = headR * 0.12;
        ctx.beginPath();
        ctx.moveTo(ox + headR * 0.6, headR * 0.45);
        ctx.lineTo(ox - headR * 0.4, headR * 0.55);
        ctx.stroke();
      }
      break;
    }
    case "heron": {
      // White head with black plume from eye to back
      ctx.fillStyle = "#e4e6ea";
      ctx.beginPath();
      ctx.arc(ox, 0, headR * 0.92, 0, Math.PI * 2);
      ctx.fill();
      // Dark crown stripe + plume trailing back
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.ellipse(ox - headR * 0.25, -headR * 0.35, headR * 0.6, headR * 0.18, -0.15, 0, Math.PI * 2);
      ctx.fill();
      // Trailing plume
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(ox - headR * 0.75, -headR * 0.3);
      ctx.lineTo(ox - headR * 1.4, -headR * 0.5);
      ctx.stroke();
      // Re-paint eye + yellow iris
      ctx.fillStyle = "#caaa54";
      ctx.beginPath();
      ctx.arc(ox + headR * 0.2, -headR * 0.15, headR * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0a0a0a";
      ctx.beginPath();
      ctx.arc(ox + headR * 0.2, -headR * 0.15, headR * 0.08, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "redtail": {
      // Lighter cheek with dark malar stripe (suggestive)
      ctx.fillStyle = "#4a3624";
      ctx.beginPath();
      ctx.ellipse(ox - headR * 0.15, 0, headR * 0.85, headR * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d4b890";
      ctx.beginPath();
      ctx.ellipse(ox + headR * 0.05, headR * 0.15, headR * 0.55, headR * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // Dark malar stripe
      ctx.strokeStyle = "#2a1a10";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(ox + headR * 0.5, headR * 0.25);
      ctx.lineTo(ox - headR * 0.2, headR * 0.5);
      ctx.stroke();
      // Yellow eye
      ctx.fillStyle = "#e6c44a";
      ctx.beginPath();
      ctx.arc(ox + headR * 0.18, -headR * 0.25, headR * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0a0a0a";
      ctx.beginPath();
      ctx.arc(ox + headR * 0.18, -headR * 0.25, headR * 0.08, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "tanager": {
      // Pure red head (already), darker around beak base
      ctx.fillStyle = "rgba(120, 20, 12, 0.5)";
      ctx.beginPath();
      ctx.ellipse(ox + headR * 0.4, headR * 0.1, headR * 0.35, headR * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "robin": {
      // Slight white eye-ring around the eye
      ctx.strokeStyle = "#f4ecd8";
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.arc(ox + headR * 0.18, -headR * 0.35, headR * 0.22, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
  }
}

function drawBeak(ctx: CanvasRenderingContext2D, sp: SpeciesDef, x: number, y: number): void {
  const len = sp.length;
  let beakLen = len * 0.13;
  if (sp.id === "heron") beakLen = len * 0.22;
  if (sp.id === "downy" || sp.id === "pileated") beakLen = len * 0.16;
  if (sp.id === "cardinal") beakLen = len * 0.1;
  if (sp.id === "redtail") beakLen = len * 0.1;

  ctx.fillStyle = sp.beakColor;
  ctx.beginPath();
  ctx.moveTo(x - 0.5, y - 0.7);
  ctx.lineTo(x + beakLen, y);
  ctx.lineTo(x - 0.5, y + 0.7);
  ctx.closePath();
  ctx.fill();

  // Beak shading on bottom
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.moveTo(x - 0.5, y + 0.1);
  ctx.lineTo(x + beakLen, y);
  ctx.lineTo(x - 0.5, y + 0.7);
  ctx.closePath();
  ctx.fill();

  // Hooked tip for raptors
  if (sp.id === "redtail") {
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.moveTo(x + beakLen - 0.3, y - 0.3);
    ctx.lineTo(x + beakLen + 0.4, y + 0.2);
    ctx.lineTo(x + beakLen - 0.3, y + 0.5);
    ctx.closePath();
    ctx.fill();
  }
  // Cardinal — thicker conical
  if (sp.id === "cardinal") {
    ctx.fillStyle = sp.beakColor;
    ctx.beginPath();
    ctx.moveTo(x - 0.8, y - 1.0);
    ctx.lineTo(x + beakLen, y - 0.1);
    ctx.lineTo(x + beakLen, y + 0.3);
    ctx.lineTo(x - 0.8, y + 1.0);
    ctx.closePath();
    ctx.fill();
  }
}

function drawCrest(ctx: CanvasRenderingContext2D, sp: SpeciesDef, ox: number): void {
  if (!sp.crest) return;
  const len = sp.length;
  ctx.fillStyle = sp.crest.color;
  const cx = ox - len * 0.08;
  const h = sp.crest.height;
  ctx.beginPath();
  ctx.moveTo(cx, -h * 0.4);
  ctx.lineTo(cx - h * 0.65, -h * 0.95);
  ctx.lineTo(cx - h * 1.15, -h * 0.5);
  ctx.lineTo(cx - h * 0.85, 0);
  ctx.lineTo(cx - h * 1.15, h * 0.5);
  ctx.lineTo(cx - h * 0.65, h * 0.95);
  ctx.lineTo(cx, h * 0.4);
  ctx.closePath();
  ctx.fill();
  // Crest highlight
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.moveTo(cx - h * 0.2, -h * 0.4);
  ctx.lineTo(cx - h * 0.7, -h * 0.5);
  ctx.lineTo(cx - h * 0.5, -h * 0.1);
  ctx.closePath();
  ctx.fill();
}

function drawFoldedWings(ctx: CanvasRenderingContext2D, sp: SpeciesDef): void {
  const len = sp.length;
  const wid = len * sp.width;
  ctx.fillStyle = sp.wingColor;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.ellipse(-len * 0.05, -wid * 0.32, len * 0.34, wid * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-len * 0.05, wid * 0.32, len * 0.34, wid * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Primary feather lines on each folded wing
  ctx.strokeStyle = "rgba(0,0,0,0.42)";
  ctx.lineWidth = 0.35;
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue;
    ctx.beginPath();
    ctx.moveTo(-len * 0.3, -wid * 0.32 + i * 0.4);
    ctx.lineTo(-len * 0.42, -wid * 0.2 + i * 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-len * 0.3, wid * 0.32 + i * 0.4);
    ctx.lineTo(-len * 0.42, wid * 0.2 + i * 0.4);
    ctx.stroke();
  }

  // Highlight on top of folded wings (lighter feather edges)
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 0.3;
  for (let i = 0; i < 5; i++) {
    const xx = -len * 0.32 + i * (len * 0.13);
    ctx.beginPath();
    ctx.moveTo(xx, -wid * 0.42);
    ctx.lineTo(xx - 1, -wid * 0.32);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(xx, wid * 0.42);
    ctx.lineTo(xx - 1, wid * 0.32);
    ctx.stroke();
  }
}

// Species-specific wing detail (mallard speculum, etc.)
function drawWingSpeciesDetail(ctx: CanvasRenderingContext2D, sp: SpeciesDef): void {
  const len = sp.length;
  const wid = len * sp.width;
  if (sp.id === "mallard") {
    // Blue speculum (wing patch) outlined white-black-white
    ctx.fillStyle = "#3868a8";
    ctx.fillRect(-len * 0.2, -wid * 0.42, len * 0.2, wid * 0.12);
    ctx.fillRect(-len * 0.2, wid * 0.3, len * 0.2, wid * 0.12);
    ctx.strokeStyle = "#f4ecd8";
    ctx.lineWidth = 0.3;
    ctx.strokeRect(-len * 0.2, -wid * 0.42, len * 0.2, wid * 0.12);
    ctx.strokeRect(-len * 0.2, wid * 0.3, len * 0.2, wid * 0.12);
  }
  if (sp.id === "waxwing") {
    // Red wax-tip spots on wing tips
    ctx.fillStyle = "#c8231a";
    ctx.beginPath();
    ctx.arc(-len * 0.36, -wid * 0.4, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-len * 0.36, wid * 0.4, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWhiteWingPatches(ctx: CanvasRenderingContext2D, sp: SpeciesDef): void {
  const len = sp.length;
  const wid = len * sp.width;
  ctx.fillStyle = "rgba(240, 240, 230, 0.92)";
  ctx.beginPath();
  ctx.ellipse(-len * 0.06, -wid * 0.32, len * 0.16, wid * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-len * 0.06, wid * 0.32, len * 0.16, wid * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawSpotPattern(ctx: CanvasRenderingContext2D, sp: SpeciesDef): void {
  if (!sp.spots) return;
  const len = sp.length;
  const wid = len * sp.width;
  ctx.fillStyle = sp.spots.color;
  // Tidy alternating rows for "checkerboard" woodpecker back
  const rows = 4;
  for (let r = 0; r < rows; r++) {
    const yy = -wid * 0.35 + (r / (rows - 1)) * wid * 0.7;
    const cols = 5;
    for (let c = 0; c < cols; c++) {
      const xx = -len * 0.32 + (c / (cols - 1)) * len * 0.5;
      if ((r + c) % 2 === 0) {
        ctx.beginPath();
        ctx.arc(xx, yy, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawFlightWings(ctx: CanvasRenderingContext2D, sp: SpeciesDef, flap: number, state: BirdState): void {
  const len = sp.length;

  let wingSpread = 1.7;
  let wingChord = 0.45;
  if (sp.id === "redtail") { wingSpread = 2.1; wingChord = 0.55; }
  if (sp.id === "heron")   { wingSpread = 2.2; wingChord = 0.6; }
  if (sp.id === "chickadee") { wingSpread = 1.5; }
  if (sp.id === "canadaGoose") { wingSpread = 2.0; wingChord = 0.5; }

  const flapAmt = (state === "takeoff") ? Math.abs(flap) * 0.4 : flap * 0.3;
  const span = len * wingSpread * (1 - flapAmt * 0.3);
  const chord = len * wingChord;
  const sweep = 0.18;

  // LEFT wing
  ctx.fillStyle = sp.wingColor;
  ctx.beginPath();
  ctx.ellipse(-len * sweep, -span * 0.4, chord * 0.5, span * 0.4, -0.15, 0, Math.PI * 2);
  ctx.fill();
  // Wing underside lighter for redtail/heron
  if (sp.id === "redtail" || sp.id === "heron") {
    ctx.fillStyle = "rgba(220, 200, 170, 0.4)";
    ctx.beginPath();
    ctx.ellipse(-len * sweep, -span * 0.4, chord * 0.45, span * 0.35, -0.15, 0, Math.PI * 2);
    ctx.fill();
  }
  // Primary feather tips
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    ctx.beginPath();
    ctx.ellipse(-len * sweep - 0.5 + t * 0.5, -span * 0.4 - span * 0.3 - i * 0.3, 0.7, span * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // RIGHT wing
  ctx.fillStyle = sp.wingColor;
  ctx.beginPath();
  ctx.ellipse(-len * sweep, span * 0.4, chord * 0.5, span * 0.4, 0.15, 0, Math.PI * 2);
  ctx.fill();
  if (sp.id === "redtail" || sp.id === "heron") {
    ctx.fillStyle = "rgba(220, 200, 170, 0.4)";
    ctx.beginPath();
    ctx.ellipse(-len * sweep, span * 0.4, chord * 0.45, span * 0.35, 0.15, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    ctx.beginPath();
    ctx.ellipse(-len * sweep - 0.5 + t * 0.5, span * 0.4 + span * 0.3 + i * 0.3, 0.7, span * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function birdMinimapColor(id: SpeciesId): string {
  return {
    mallard: "#9a8862",
    robin: "#7a4836",
    chickadee: "#9a9080",
    canadaGoose: "#3a3328",
    woodDuck: "#c4884a",
    waxwing: "#b89a6b",
    cardinal: "#d4341c",
    downy: "#1a1a1a",
    heron: "#7a8a98",
    pileated: "#c8231a",
    redtail: "#7e6845",
    tanager: "#e63a14",
  }[id];
}
