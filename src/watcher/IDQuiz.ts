// ID quiz popup — 4-choice species ID under time pressure.

import type { Bird } from "../entities/Bird.ts";
import { SPECIES, QUIZ_DISTRACTORS, type SpeciesId, type SpeciesDef } from "../birds/species.ts";
import { drawBird } from "../birds/render.ts";
import { makeRng } from "../game/types.ts";

export interface QuizState {
  bird: Bird;
  correct: SpeciesId;
  choices: SpeciesId[];
  timer: number;     // counts up
  maxTime: number;   // total available
  result?: "correct-fast" | "correct-slow" | "wrong" | "timeout";
}

export class IDQuiz {
  active: QuizState | null = null;
  // Cooldown so quizzes don't fire instantly back-to-back
  cooldown = 0;

  start(bird: Bird): boolean {
    if (this.active) return false;
    if (this.cooldown > 0) return false;
    const correct = bird.species.id;
    const distractors = (QUIZ_DISTRACTORS[correct] ?? []).slice();
    const rng = makeRng(bird.id * 31);
    // Pick 3 distractors not equal to correct
    const filtered = distractors.filter(d => d !== correct).slice(0, 3);
    while (filtered.length < 3) {
      const all = Object.keys(SPECIES) as SpeciesId[];
      const pick = all[Math.floor(rng() * all.length)];
      if (pick !== correct && !filtered.includes(pick)) filtered.push(pick);
    }
    const choices = [...filtered, correct];
    // shuffle
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    this.active = { bird, correct, choices, timer: 0, maxTime: 3.0 };
    return true;
  }

  // Returns true if a result was just recorded (parent should consume the result and close).
  update(dt: number, keyPressed: (k: string) => boolean): { sp: SpeciesDef; quality: "correct-fast" | "correct-slow" | "wrong" | "timeout" } | null {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (!this.active) return null;
    this.active.timer += dt;

    let choice: number | null = null;
    if (keyPressed("1")) choice = 0;
    else if (keyPressed("2")) choice = 1;
    else if (keyPressed("3")) choice = 2;
    else if (keyPressed("4")) choice = 3;

    if (choice !== null) {
      const picked = this.active.choices[choice];
      const sp = SPECIES[this.active.bird.species.id];
      if (picked === this.active.correct) {
        const q = this.active.timer < 1.8 ? "correct-fast" : "correct-slow";
        const out = { sp, quality: q as "correct-fast" | "correct-slow" };
        this.close(0.5);
        return out;
      } else {
        const out = { sp, quality: "wrong" as const };
        this.close(0.5);
        return out;
      }
    }
    if (this.active.timer > this.active.maxTime) {
      const sp = SPECIES[this.active.bird.species.id];
      const out = { sp, quality: "timeout" as const };
      this.close(0.5);
      return out;
    }
    return null;
  }

  close(cd: number): void {
    this.active = null;
    this.cooldown = cd;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    const q = this.active;
    const w = window.innerWidth;
    const h = window.innerHeight;
    // dim background slightly
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0, 0, w, h);

    // panel
    const pw = 460, ph = 270;
    const px = (w - pw) / 2;
    const py = h - ph - 20;
    ctx.fillStyle = "rgba(20, 25, 18, 0.92)";
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = "#a8b89a";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);

    ctx.fillStyle = "#e8e0c8";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("IDENTIFY THE BIRD", px + 16, py + 22);

    // Timer bar
    const t = q.timer / q.maxTime;
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(px + 16, py + 30, pw - 32, 4);
    ctx.fillStyle = t < 0.6 ? "#c8e29a" : (t < 0.85 ? "#e6c45a" : "#e07a3a");
    ctx.fillRect(px + 16, py + 30, (pw - 32) * (1 - t), 4);

    // Choices
    const choiceH = 42;
    const gap = 6;
    ctx.font = "13px sans-serif";
    for (let i = 0; i < q.choices.length; i++) {
      const sp = SPECIES[q.choices[i]];
      const cy = py + 50 + i * (choiceH + gap);
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.fillRect(px + 14, cy, pw - 28, choiceH);
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.strokeRect(px + 14.5, cy + 0.5, pw - 29, choiceH - 1);

      // Number key indicator
      ctx.fillStyle = "#c8d2b0";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(i + 1), px + 32, cy + 26);

      // little bird portrait
      ctx.save();
      ctx.translate(px + 70, cy + choiceH / 2);
      const fake: import("../birds/render.ts").BirdSprite = {
        pos: { x: 0, y: 0 },
        species: { ...sp, length: 16 },
        facing: 0,
        state: "perched",
        altitude: 0,
        bobPhase: 0,
      };
      drawBird(ctx, fake, 0);
      ctx.restore();

      // species name
      ctx.fillStyle = "#f0ead6";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(sp.name, px + 100, cy + 20);
      ctx.fillStyle = "rgba(200, 220, 180, 0.55)";
      ctx.font = "italic 11px sans-serif";
      ctx.fillText(sp.scientific, px + 100, cy + 35);
    }

    ctx.textAlign = "left";
  }
}
