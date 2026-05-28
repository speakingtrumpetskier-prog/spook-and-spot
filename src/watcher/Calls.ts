// Bird call loadout. Watcher picks 4 species, each with a 30s cooldown.

import type { SpeciesId } from "../birds/species.ts";

export const CALL_LOADOUT: SpeciesId[] = ["mallard", "robin", "cardinal", "woodDuck"];
export const CALL_COOLDOWN = 30; // seconds

export class CallSystem {
  cooldowns: number[] = [0, 0, 0, 0];
  // For lure event reporting back to game
  lastCallIndex = -1;

  update(dt: number): void {
    for (let i = 0; i < this.cooldowns.length; i++) {
      this.cooldowns[i] = Math.max(0, this.cooldowns[i] - dt);
    }
  }

  tryFire(slot: number): SpeciesId | null {
    if (slot < 0 || slot >= CALL_LOADOUT.length) return null;
    if (this.cooldowns[slot] > 0) return null;
    this.cooldowns[slot] = CALL_COOLDOWN;
    return CALL_LOADOUT[slot];
  }
}
