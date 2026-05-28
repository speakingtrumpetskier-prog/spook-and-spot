// Watcher scoring + field notebook entries.

import type { Bird } from "../entities/Bird.ts";
import { SPECIES, type SpeciesId, type SpeciesDef } from "../birds/species.ts";

export interface NotebookEntry {
  speciesId: SpeciesId;
  firstSpotted: number; // game time
  spotCount: number;
  photographed: boolean;
  bestPoints: number;
}

export class WatcherScore {
  total = 0;
  notebook = new Map<SpeciesId, NotebookEntry>();
  // species that have been correctly IDed twice => auto-ID future
  autoIded = new Set<SpeciesId>();
  // count of correct IDs per species
  correctIds = new Map<SpeciesId, number>();
  // Most recent activity for HUD ticker
  lastEvent: { text: string; points: number; ttl: number } | null = null;

  recordSpot(bird: Bird, time: number, points: number, photoBonus = false): void {
    const sp = bird.species;
    bird.idedByWatcher = true;
    bird.spottedByWatcher = true;
    const earned = Math.round(points * (photoBonus ? 1.5 : 1));
    this.total += earned;

    const e = this.notebook.get(sp.id);
    if (e) {
      e.spotCount++;
      if (photoBonus) e.photographed = true;
      e.bestPoints = Math.max(e.bestPoints, earned);
    } else {
      this.notebook.set(sp.id, {
        speciesId: sp.id,
        firstSpotted: time,
        spotCount: 1,
        photographed: photoBonus,
        bestPoints: earned,
      });
    }

    const c = (this.correctIds.get(sp.id) ?? 0) + 1;
    this.correctIds.set(sp.id, c);
    if (c >= 2) this.autoIded.add(sp.id);

    this.lastEvent = { text: `${sp.name} ${photoBonus ? "📸 " : "✓ "}+${earned}`, points: earned, ttl: 3 };
  }

  recordPartialOrMiss(sp: SpeciesDef, partial: boolean): void {
    if (partial) {
      const pts = Math.max(1, Math.round(sp.pointsWatch * 0.4));
      this.total += pts;
      this.lastEvent = { text: `${sp.name} (slow) +${pts}`, points: pts, ttl: 2.5 };
    } else {
      this.lastEvent = { text: `${sp.name} (wrong ID)`, points: 0, ttl: 2 };
    }
  }

  tickEvent(dt: number): void {
    if (this.lastEvent) {
      this.lastEvent.ttl -= dt;
      if (this.lastEvent.ttl <= 0) this.lastEvent = null;
    }
  }

  uniqueSpecies(): number { return this.notebook.size; }
}

export function speciesById(id: SpeciesId): SpeciesDef { return SPECIES[id]; }
