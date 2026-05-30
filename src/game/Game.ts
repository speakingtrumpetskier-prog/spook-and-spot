// Main game class. Owns the world, entities, and render loop.

import { Input } from "./Input.ts";
import { Camera } from "./Camera.ts";
import { buildLoringPark, WORLD_W, WORLD_H } from "../world/Map.ts";
import { MapRenderer } from "../world/MapRenderer.ts";
import type { MapData } from "../world/Map.ts";
import { Player } from "../entities/Player.ts";
import type { NoiseEvent } from "../entities/Player.ts";
import { drawPlayer } from "../entities/PlayerRenderer.ts";
import { BirdSpawner } from "../entities/Bird.ts";
import { drawBird } from "../birds/render.ts";
import type { SpeciesId } from "../birds/species.ts";
import { Binoculars } from "../watcher/Binoculars.ts";
import { IDQuiz } from "../watcher/IDQuiz.ts";
import { WatcherScore } from "../watcher/Score.ts";
import { CallSystem, CALL_LOADOUT } from "../watcher/Calls.ts";
import { Hunter } from "../hunter/Hunter.ts";
import { drawHunter } from "../hunter/HunterRenderer.ts";
import { drawHUD } from "../ui/HUD.ts";
import { drawNotebook } from "../ui/Notebook.ts";
import { drawMinimap } from "../ui/Minimap.ts";
import { drawLightingOverlay, dayPhaseLabel } from "../ui/Lighting.ts";
import { drawEndScreen } from "../ui/EndScreen.ts";
import { drawHelpOverlay } from "../ui/HelpOverlay.ts";
import { vDist } from "./types.ts";
import { sound } from "../audio/Sound.ts";
import { surfaceAt, pointInPolygon } from "../world/Map.ts";

export interface Lure { pos: { x: number; y: number }; speciesId: SpeciesId; ttl: number; }

export type GamePhase = "play" | "ended";

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  input: Input;
  camera: Camera;
  map: MapData;
  mapRenderer: MapRenderer;

  player: Player;
  spawner: BirdSpawner;
  hunter: Hunter;
  hunterMinimapVisibility = 0; // fades when hunter fires

  binoculars: Binoculars;
  quiz: IDQuiz;
  watcherScore: WatcherScore;
  callSystem: CallSystem;
  hunterScore = 0; // mirrors hunter.score for HUD convenience

  time = 0;
  matchTime = 10 * 60;       // 10 minutes
  baseZoom = 2.4;            // user-adjustable via wheel (not affected by binos)
  lastTs = 0;
  noises: NoiseEvent[] = [];
  lures: Lure[] = [];

  phase: GamePhase = "play";

  // Tanager alert ticker
  tanagerAnnouncedAt = 0;
  tanagerAlertShown = false;

  // Muzzle flash visualization
  muzzleFlashTimer = 0;

  // First-run help overlay timer (fades after 15s)
  helpOverlayTime = 15;

  // Ambient bird-call scheduling
  birdCallTimer = 0.6;

  // Track which birds have been flushed already (to play wingbeat once)
  flushedBirdIds = new Set<number>();

  // Audio start prompt overlay flag
  audioStarted = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.input = new Input(canvas);
    this.camera = new Camera();
    this.map = buildLoringPark();
    this.mapRenderer = new MapRenderer(this.map);
    this.player = new Player();
    const seed = Math.floor(Math.random() * 1e9);
    this.spawner = new BirdSpawner(seed);
    this.spawner.populate(this.map);
    this.hunter = new Hunter(seed);

    this.binoculars = new Binoculars();
    this.quiz = new IDQuiz();
    this.watcherScore = new WatcherScore();
    this.callSystem = new CallSystem();

    this.camera.zoom = this.baseZoom;
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.camera.follow(this.player.pos);
    this.camera.pos = { ...this.player.pos };

    // Lazy audio init on first user gesture
    const startAudio = () => {
      sound.init();
      this.audioStarted = true;
      window.removeEventListener("pointerdown", startAudio);
      window.removeEventListener("keydown", startAudio);
    };
    window.addEventListener("pointerdown", startAudio);
    window.addEventListener("keydown", startAudio);
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const iw = window.innerWidth;
    const ih = window.innerHeight;
    this.canvas.width = Math.floor(iw * dpr);
    this.canvas.height = Math.floor(ih * dpr);
    this.canvas.style.width = iw + "px";
    this.canvas.style.height = ih + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.camera.setViewport(iw, ih);
  }

  // Keep canvas in sync with viewport (preview windows resize without firing events sometimes)
  ensureCanvasSize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.floor(window.innerWidth * dpr);
    const targetH = Math.floor(window.innerHeight * dpr);
    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.resize();
    }
  }

  start(): void {
    const loop = (ts: number) => {
      const dt = this.lastTs === 0 ? 0 : Math.min(0.1, (ts - this.lastTs) / 1000);
      this.lastTs = ts;
      this.update(dt);
      this.render();
      this.input.endFrame();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  reset(): void {
    const seed = Math.floor(Math.random() * 1e9);
    this.spawner = new BirdSpawner(seed);
    this.spawner.populate(this.map);
    this.hunter = new Hunter(seed);
    this.player = new Player();
    this.binoculars = new Binoculars();
    this.quiz = new IDQuiz();
    this.watcherScore = new WatcherScore();
    this.callSystem = new CallSystem();
    this.hunterScore = 0;
    this.hunterMinimapVisibility = 0;
    this.time = 0;
    this.noises = [];
    this.lures = [];
    this.phase = "play";
    this.tanagerAnnouncedAt = 0;
    this.tanagerAlertShown = false;
    this.camera.pos = { ...this.player.pos };
  }

  update(dt: number): void {
    this.ensureCanvasSize();
    if (this.phase === "ended") {
      if (this.input.wasPressed("r")) this.reset();
      return;
    }

    this.time += dt;

    // Check end of match
    if (this.time >= this.matchTime) {
      this.phase = "ended";
      return;
    }

    // Update audio listener
    sound.setListener(this.player.pos.x, this.player.pos.y);

    // Ambient: check if player is near water (within 25 units of any pond polygon)
    let nearWater = false;
    for (const pond of this.map.ponds) {
      // Check polygon center distance OR if player is on water surface
      if (pointInPolygon(this.player.pos, pond.pts)) { nearWater = true; break; }
      // Or close to pond center
      let cx = 0, cy = 0;
      for (const p of pond.pts) { cx += p.x; cy += p.y; }
      cx /= pond.pts.length; cy /= pond.pts.length;
      const d = Math.hypot(this.player.pos.x - cx, this.player.pos.y - cy);
      if (d < 140) { nearWater = true; break; }
    }
    const playerSurface = surfaceAt(this.map, this.player.pos);
    const inTrees = playerSurface === "tree";
    sound.updateAmbient(dt, { nearWater, inTrees });

    // Notebook held — no game update while in notebook? Actually keep world running.
    this.player.update(dt, this.input, this.map, n => {
      this.noises.push(n);
      // Play footstep sound matched to the surface
      const surf = surfaceAt(this.map, n.pos);
      sound.playFootstep(surf as any, n.pos.x, n.pos.y);
    });

    // Spawner + birds
    this.spawner.update(dt, this.time, this.map);
    for (const bird of this.spawner.birds) {
      bird.update(dt, this.map, this.noises, this.lures);
    }

    // Hunter
    this.hunter.update(dt, this.spawner.birds, this.map, n => {
      this.noises.push(n);
      if (n.alertness > 50) {
        // gunshot — make hunter visible on minimap briefly + muzzle flash + sound
        this.hunterMinimapVisibility = 1.0;
        this.muzzleFlashTimer = 0.12;
        sound.playShotgun(n.pos.x, n.pos.y);
      } else if (n.alertness > 0 && n.alertness < 10) {
        // Hunter footstep / twig snap while stalking
        sound.playFootstep("grass", n.pos.x, n.pos.y);
      }
    });

    // Wingbeat sounds when birds enter takeoff state (first frame only)
    for (const b of this.spawner.birds) {
      if (b.state === "takeoff" && !this.flushedBirdIds.has(b.id)) {
        this.flushedBirdIds.add(b.id);
        sound.playWingbeat(b.pos.x, b.pos.y);
      }
      // Reset flag when bird lands
      if ((b.state === "perched" || b.state === "swimming" || b.state === "feeding") && this.flushedBirdIds.has(b.id)) {
        this.flushedBirdIds.delete(b.id);
      }
    }

    // Ambient bird calls — randomly emit calls from alive birds, weighted toward those near player
    this.birdCallTimer -= dt;
    if (this.birdCallTimer <= 0) {
      this.birdCallTimer = 0.4 + Math.random() * 0.9;
      // Pick a bird preferentially near player (within ~400 units)
      const candidates = this.spawner.birds.filter(b => {
        if (b.state === "dead" || b.state === "hit" || b.state === "takeoff" || b.state === "landing") return false;
        const d = vDist(this.player.pos, b.pos);
        return d < 500;
      });
      if (candidates.length > 0) {
        const b = candidates[Math.floor(Math.random() * candidates.length)];
        // Distance-based call probability: closer = more likely
        const d = vDist(this.player.pos, b.pos);
        const prob = Math.max(0.15, 1 - d / 500);
        if (Math.random() < prob) {
          sound.playBirdCall(b.species.id, b.pos.x, b.pos.y);
        }
      }
    }
    this.hunterScore = this.hunter.score;
    this.hunterMinimapVisibility = Math.max(0, this.hunterMinimapVisibility - dt * 0.3);
    this.muzzleFlashTimer = Math.max(0, this.muzzleFlashTimer - dt);
    this.helpOverlayTime = Math.max(0, this.helpOverlayTime - dt);

    // Calls
    this.callSystem.update(dt);
    for (let i = 0; i < CALL_LOADOUT.length; i++) {
      if (this.input.wasPressed(String(i + 1))) {
        // If quiz is active, the 1-4 keys go to the quiz — don't fire a call
        if (this.quiz.active) continue;
        const speciesId = this.callSystem.tryFire(i);
        if (speciesId) {
          this.lures.push({ pos: { ...this.player.pos }, speciesId, ttl: 10 });
          sound.playUI("callPlay");
          // Play the actual bird call so the user knows what was sent
          sound.playBirdCall(speciesId, this.player.pos.x, this.player.pos.y, 1.4);
        }
      }
    }

    // Binoculars
    this.binoculars.update(dt, this);

    // ID quiz update
    const quizResult = this.quiz.update(dt, k => this.input.wasPressed(k));
    if (quizResult) {
      if (quizResult.quality === "correct-fast") {
        const last = (this as any).__lastQuizBird;
        if (last) this.watcherScore.recordSpot(last, this.time, quizResult.sp.pointsWatch);
        sound.playUI("idCorrect");
      } else if (quizResult.quality === "correct-slow") {
        const last = (this as any).__lastQuizBird;
        if (last) this.watcherScore.recordSpot(last, this.time, Math.round(quizResult.sp.pointsWatch * 0.6));
        sound.playUI("idCorrect");
      } else if (quizResult.quality === "wrong") {
        this.watcherScore.recordPartialOrMiss(quizResult.sp, false);
        sound.playUI("idWrong");
      } else { // timeout
        this.watcherScore.recordPartialOrMiss(quizResult.sp, true);
        sound.playUI("idWrong");
      }
    }
    this.watcherScore.tickEvent(dt);

    // Auto-identify: holding focus on an un-IDed bird triggers the ID (no click)
    const focusBird = this.binoculars.targetedBird;
    if (focusBird && !this.quiz.active) {
      if (!focusBird.idedByWatcher && this.binoculars.readyToId) {
        if (this.watcherScore.autoIded.has(focusBird.species.id)) {
          // Already learned this species twice — instant spot, no quiz
          this.watcherScore.recordSpot(focusBird, this.time, focusBird.species.pointsWatch);
          sound.playUI("spot");
        } else if (this.quiz.start(focusBird)) {
          (this as any).__lastQuizBird = focusBird;
          sound.playUI("spot");
        }
        this.binoculars.resetAfterId();
      } else if (focusBird.idedByWatcher && this.binoculars.readyToPhoto) {
        // Auto-photograph an already-identified bird for a bonus
        const entry = this.watcherScore.notebook.get(focusBird.species.id);
        if (entry && !entry.photographed) {
          entry.photographed = true;
          this.binoculars.photoFlash = 0.9;
          sound.playUI("shutter");
          const bonus = Math.round(focusBird.species.pointsWatch * 0.5);
          this.watcherScore.total += bonus;
          this.watcherScore.lastEvent = { text: `${focusBird.species.name} 📷 +${bonus} (photo)`, points: bonus, ttl: 2.5 };
        }
        this.binoculars.resetAfterPhoto();
      }
    }

    // Tanager event alert
    if (this.spawner.eventSpawned && !this.tanagerAlertShown) {
      this.tanagerAlertShown = true;
      this.tanagerAnnouncedAt = this.time;
      sound.playUI("tanagerAlert");
    }

    // Decay noises and lures
    this.noises = this.noises.filter(n => { n.ttl -= dt; return n.ttl > 0; });
    this.lures = this.lures.filter(l => { l.ttl -= dt; return l.ttl > 0; });

    // Wheel adjusts base zoom (always, even during binos for next time)
    if (this.input.wheel !== 0) {
      this.baseZoom *= this.input.wheel < 0 ? 1.1 : 0.9;
      this.baseZoom = Math.max(1.2, Math.min(3.0, this.baseZoom));
    }
    // Camera stays locked on the player (even while glassing) so birds don't
    // drift out from under the reticle. You sweep the reticle, not the camera.
    this.camera.follow(this.player.pos);
    // Effective zoom = base * bino boost (decays smoothly with binoculars.zoomBoost)
    this.camera.zoom = this.baseZoom * this.binoculars.zoomBoost;
    this.camera.update(dt);
  }

  render(): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#1a1a14";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    this.camera.apply(ctx);
    this.mapRenderer.drawBackground(ctx);
    this.mapRenderer.drawDetails(ctx);

    // Lures - visualize as soft beacons
    for (const l of this.lures) {
      ctx.fillStyle = `rgba(200, 220, 140, ${0.15 * (l.ttl / 10)})`;
      ctx.beginPath();
      ctx.arc(l.pos.x, l.pos.y, 14 + (10 - l.ttl) * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    const sortedBirds = [...this.spawner.birds].sort((a, b) => {
      // Dead first (under everything), then by altitude (grounded under flying)
      if (a.state === "dead" && b.state !== "dead") return -1;
      if (b.state === "dead" && a.state !== "dead") return 1;
      const aGround = a.altitude < 1 ? 0 : 1;
      const bGround = b.altitude < 1 ? 0 : 1;
      if (aGround !== bGround) return aGround - bGround;
      return a.pos.y - b.pos.y;
    });

    // Dead birds first (under canopies)
    for (const bird of sortedBirds) {
      if (bird.state === "dead") drawBird(ctx, bird, this.time);
    }

    drawHunter(ctx, this.hunter, this.time);
    drawPlayer(ctx, this.player, this.time);

    this.mapRenderer.drawCanopies(ctx, this.time);

    // All live birds drawn ABOVE canopies — birds in trees stay readable
    for (const bird of sortedBirds) {
      if (bird.state !== "dead") drawBird(ctx, bird, this.time);
    }

    // Lampposts/halos sit above everything to read at night-ish phases
    this.mapRenderer.drawOverlay(ctx, this.time);

    // Muzzle flash effect when hunter just fired
    if (this.muzzleFlashTimer > 0) {
      const a = this.muzzleFlashTimer / 0.12;
      ctx.fillStyle = `rgba(255, 220, 100, ${a * 0.9})`;
      ctx.beginPath();
      const mx = this.hunter.pos.x + Math.cos(this.hunter.facing) * 10;
      const my = this.hunter.pos.y + Math.sin(this.hunter.facing) * 10;
      ctx.arc(mx, my, 6 + (1 - a) * 8, 0, Math.PI * 2);
      ctx.fill();
    }

    this.camera.restore(ctx);

    // Lighting overlay (screen-space)
    drawLightingOverlay(ctx, this.time, this.matchTime);

    // Binoculars overlay
    this.binoculars.drawOverlay(ctx, this);

    // HUD
    if (this.phase === "play") {
      drawHUD(ctx, this);
      drawMinimap(ctx, this);

      // Tanager alert banner
      if (this.tanagerAlertShown && this.time - this.tanagerAnnouncedAt < 6) {
        const a = 1 - (this.time - this.tanagerAnnouncedAt) / 6;
        ctx.fillStyle = `rgba(230, 58, 20, ${0.8 * a})`;
        ctx.font = "bold 18px serif";
        ctx.textAlign = "center";
        ctx.fillText("⚠ SCARLET TANAGER SIGHTED IN THE PARK", window.innerWidth / 2, 80);
        ctx.font = "12px sans-serif";
        ctx.fillStyle = `rgba(232, 224, 200, ${a})`;
        ctx.fillText("Trophy bird — first to ID/bag wins 20+ points", window.innerWidth / 2, 100);
      }

      // ID quiz on top
      this.quiz.draw(ctx);

      // Notebook (held)
      if (this.input.isDown("tab")) drawNotebook(ctx, this);

      // Help overlay (initial seconds)
      if (this.helpOverlayTime > 0 && !this.quiz.active && !this.input.isDown("tab")) {
        drawHelpOverlay(ctx, this.helpOverlayTime);
      }

      // Audio not started prompt
      if (sound.ready) this.audioStarted = true;
      if (!this.audioStarted) {
        const w = window.innerWidth, h = window.innerHeight;
        ctx.fillStyle = "rgba(8, 14, 10, 0.85)";
        ctx.fillRect(w/2 - 140, h - 110, 280, 40);
        ctx.strokeStyle = "rgba(168, 184, 154, 0.6)";
        ctx.lineWidth = 1;
        ctx.strokeRect(w/2 - 139.5, h - 109.5, 279, 39);
        ctx.fillStyle = "#f0ead6";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🔊 Click or press any key to enable sound", w/2, h - 86);
      }
    } else {
      drawEndScreen(ctx, this);
    }

    // Quiet unused warnings
    void WORLD_W; void WORLD_H; void vDist;
  }

  dayPhaseLabel(): string {
    return dayPhaseLabel(this.time, this.matchTime);
  }
}
