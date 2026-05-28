// All 12 species definitions. Top-down view, procedurally rendered.

export type Tier = "common" | "uncommon" | "rare" | "event";
export type PreferredSurface = "water" | "tree" | "grass" | "any";
export type SpeciesId =
  | "mallard"
  | "robin"
  | "chickadee"
  | "canadaGoose"
  | "woodDuck"
  | "waxwing"
  | "cardinal"
  | "downy"
  | "heron"
  | "pileated"
  | "redtail"
  | "tanager";

export interface SpeciesDef {
  id: SpeciesId;
  name: string;
  scientific: string;
  tier: Tier;
  pointsWatch: number;
  pointsHunt: number;
  // sprite (top-down length in world units)
  length: number;
  width: number;        // body width ratio
  // colors (top-down — back side mostly visible)
  bodyColor: string;
  bodyAccent: string;   // darker mottling/shading
  headColor: string;
  wingColor: string;
  tailColor: string;
  beakColor: string;
  // distinctive features
  crest?: { color: string; height: number };
  collar?: { color: string; width: number };
  whitePatch?: "neck" | "cheek" | "wing";
  spots?: { color: string; count: number };
  // behavior
  spawnWeight: number;     // relative likelihood
  alertThreshold: number;  // 0-100 alertness at which it flushes
  flightSpeed: number;     // world units per second
  walkSpeed: number;
  preferredSurface: PreferredSurface;
  flockSize: [number, number];   // min, max group size at spawn
  callRange: number;        // m to attract via call
  // field guide
  blurb: string;
}

export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  mallard: {
    id: "mallard", name: "Mallard", scientific: "Anas platyrhynchos",
    tier: "common", pointsWatch: 1, pointsHunt: 1,
    length: 7.5, width: 0.5,
    bodyColor: "#7a6b48", bodyAccent: "#564a30",
    headColor: "#1f6b3a", wingColor: "#3d3424",
    tailColor: "#1a1a1a", beakColor: "#d4a536",
    collar: { color: "#ffffff", width: 0.6 },
    spawnWeight: 30, alertThreshold: 65,
    flightSpeed: 170, walkSpeed: 18,
    preferredSurface: "water", flockSize: [3, 6],
    callRange: 220,
    blurb: "The familiar dabbling duck. Drake's iridescent green head is unmistakable.",
  },
  robin: {
    id: "robin", name: "American Robin", scientific: "Turdus migratorius",
    tier: "common", pointsWatch: 1, pointsHunt: 1,
    length: 5.5, width: 0.45,
    bodyColor: "#5e5448", bodyAccent: "#3e3528",
    headColor: "#2a241c", wingColor: "#3a3326",
    tailColor: "#2a241c", beakColor: "#e8b948",
    whitePatch: "neck",
    spawnWeight: 28, alertThreshold: 55,
    flightSpeed: 140, walkSpeed: 30,
    preferredSurface: "grass", flockSize: [1, 3],
    callRange: 175,
    blurb: "Lawn-hopping thrush with rust-orange breast. Cocks its head to listen for worms.",
  },
  chickadee: {
    id: "chickadee", name: "Black-capped Chickadee", scientific: "Poecile atricapillus",
    tier: "common", pointsWatch: 2, pointsHunt: 2,
    length: 3.5, width: 0.55,
    bodyColor: "#b8aa90", bodyAccent: "#8a7e66",
    headColor: "#1a1a1a", wingColor: "#4a4438",
    tailColor: "#3a352a", beakColor: "#222",
    whitePatch: "cheek",
    spawnWeight: 22, alertThreshold: 70,
    flightSpeed: 130, walkSpeed: 14,
    preferredSurface: "tree", flockSize: [2, 4],
    callRange: 150,
    blurb: "Tiny, fearless. Black cap and bib over white cheeks; says its own name.",
  },
  canadaGoose: {
    id: "canadaGoose", name: "Canada Goose", scientific: "Branta canadensis",
    tier: "common", pointsWatch: 1, pointsHunt: 2,
    length: 11, width: 0.45,
    bodyColor: "#6b5d44", bodyAccent: "#4a3f2d",
    headColor: "#1a1a1a", wingColor: "#3a3324",
    tailColor: "#0a0a0a", beakColor: "#1a1a1a",
    whitePatch: "cheek",
    spawnWeight: 18, alertThreshold: 50,
    flightSpeed: 185, walkSpeed: 26,
    preferredSurface: "grass", flockSize: [3, 6],
    callRange: 300,
    blurb: "Honking, lawn-claiming, fearless. Black head with white chinstrap.",
  },
  woodDuck: {
    id: "woodDuck", name: "Wood Duck", scientific: "Aix sponsa",
    tier: "uncommon", pointsWatch: 4, pointsHunt: 4,
    length: 7, width: 0.5,
    bodyColor: "#c4884a", bodyAccent: "#8a5a26",
    headColor: "#2a4a3e", wingColor: "#1a2e26",
    tailColor: "#0f0f0f", beakColor: "#c84a30",
    crest: { color: "#0a1a14", height: 2.4 },
    collar: { color: "#ffffff", width: 0.7 },
    spawnWeight: 6, alertThreshold: 75,
    flightSpeed: 160, walkSpeed: 20,
    preferredSurface: "water", flockSize: [1, 2],
    callRange: 200,
    blurb: "America's most colorful waterfowl — drake's crested head looks painted on.",
  },
  waxwing: {
    id: "waxwing", name: "Cedar Waxwing", scientific: "Bombycilla cedrorum",
    tier: "uncommon", pointsWatch: 5, pointsHunt: 4,
    length: 4.5, width: 0.42,
    bodyColor: "#a48560", bodyAccent: "#7a6242",
    headColor: "#8a6e48", wingColor: "#3a3024",
    tailColor: "#3a3024", beakColor: "#1a1a1a",
    crest: { color: "#8a6e48", height: 1.8 },
    spawnWeight: 5, alertThreshold: 60,
    flightSpeed: 150, walkSpeed: 12,
    preferredSurface: "tree", flockSize: [2, 4],
    callRange: 165,
    blurb: "Sleek and silky, with a black mask and bright yellow tail-tip.",
  },
  cardinal: {
    id: "cardinal", name: "Northern Cardinal", scientific: "Cardinalis cardinalis",
    tier: "uncommon", pointsWatch: 3, pointsHunt: 4,
    length: 5, width: 0.48,
    bodyColor: "#c8231a", bodyAccent: "#8a1810",
    headColor: "#c8231a", wingColor: "#7a1a14",
    tailColor: "#a01a14", beakColor: "#e8b500",
    crest: { color: "#c8231a", height: 2.2 },
    spawnWeight: 7, alertThreshold: 55,
    flightSpeed: 130, walkSpeed: 16,
    preferredSurface: "tree", flockSize: [1, 2],
    callRange: 190,
    blurb: "Brilliant red male with peaked crest and stout orange beak.",
  },
  downy: {
    id: "downy", name: "Downy Woodpecker", scientific: "Dryobates pubescens",
    tier: "uncommon", pointsWatch: 4, pointsHunt: 5,
    length: 4, width: 0.4,
    bodyColor: "#1a1a1a", bodyAccent: "#0a0a0a",
    headColor: "#1a1a1a", wingColor: "#1a1a1a",
    tailColor: "#1a1a1a", beakColor: "#3a3024",
    whitePatch: "wing",
    spots: { color: "#f0ead6", count: 12 },
    spawnWeight: 5, alertThreshold: 65,
    flightSpeed: 115, walkSpeed: 10,
    preferredSurface: "tree", flockSize: [1, 1],
    callRange: 150,
    blurb: "Smallest North American woodpecker. Black-and-white checkered back.",
  },
  heron: {
    id: "heron", name: "Great Blue Heron", scientific: "Ardea herodias",
    tier: "rare", pointsWatch: 8, pointsHunt: 10,
    length: 15, width: 0.32,
    bodyColor: "#6e7c8a", bodyAccent: "#4a5862",
    headColor: "#dadada", wingColor: "#5a6a76",
    tailColor: "#3a4650", beakColor: "#e6c842",
    crest: { color: "#1a1a1a", height: 2 },
    spawnWeight: 1.5, alertThreshold: 80,
    flightSpeed: 115, walkSpeed: 12,
    preferredSurface: "water", flockSize: [1, 1],
    callRange: 250,
    blurb: "Tall, patient hunter at the pond's edge. Slate-blue with a yellow dagger beak.",
  },
  pileated: {
    id: "pileated", name: "Pileated Woodpecker", scientific: "Dryocopus pileatus",
    tier: "rare", pointsWatch: 10, pointsHunt: 12,
    length: 9, width: 0.4,
    bodyColor: "#1a1a1a", bodyAccent: "#0a0a0a",
    headColor: "#1a1a1a", wingColor: "#1a1a1a",
    tailColor: "#0a0a0a", beakColor: "#3a2a18",
    crest: { color: "#c8231a", height: 3.2 },
    whitePatch: "neck",
    spawnWeight: 1.2, alertThreshold: 75,
    flightSpeed: 130, walkSpeed: 10,
    preferredSurface: "tree", flockSize: [1, 1],
    callRange: 280,
    blurb: "Crow-sized, with a flaming red crest. Its drumming echoes across the woods.",
  },
  redtail: {
    id: "redtail", name: "Red-tailed Hawk", scientific: "Buteo jamaicensis",
    tier: "rare", pointsWatch: 10, pointsHunt: 10,
    length: 12, width: 0.5,
    bodyColor: "#6e5a3e", bodyAccent: "#4a3826",
    headColor: "#3a2c1c", wingColor: "#3a2c1c",
    tailColor: "#a84826", beakColor: "#2a1f14",
    spawnWeight: 1.3, alertThreshold: 90,
    flightSpeed: 220, walkSpeed: 0, // stays in the air mostly
    preferredSurface: "tree", flockSize: [1, 1],
    callRange: 200,
    blurb: "Soaring raptor with a brick-red tail. Often perched atop the tallest tree.",
  },
  tanager: {
    id: "tanager", name: "Scarlet Tanager", scientific: "Piranga olivacea",
    tier: "event", pointsWatch: 20, pointsHunt: 25,
    length: 5, width: 0.45,
    bodyColor: "#e63a14", bodyAccent: "#a82610",
    headColor: "#e63a14", wingColor: "#0a0a0a",
    tailColor: "#0a0a0a", beakColor: "#cdb56a",
    spawnWeight: 0, alertThreshold: 60,
    flightSpeed: 140, walkSpeed: 12,
    preferredSurface: "tree", flockSize: [1, 1],
    callRange: 220,
    blurb: "Once-in-a-season flash of brilliant red against black wings.",
  },
};

export const SPECIES_LIST = Object.values(SPECIES);

// Distractors for the ID quiz — visually similar within tier
export const QUIZ_DISTRACTORS: Record<SpeciesId, SpeciesId[]> = {
  mallard: ["woodDuck", "canadaGoose", "robin"],
  robin: ["cardinal", "waxwing", "chickadee"],
  chickadee: ["waxwing", "robin", "downy"],
  canadaGoose: ["mallard", "heron", "woodDuck"],
  woodDuck: ["mallard", "cardinal", "waxwing"],
  waxwing: ["robin", "cardinal", "chickadee"],
  cardinal: ["tanager", "robin", "waxwing"],
  downy: ["pileated", "chickadee", "robin"],
  heron: ["canadaGoose", "redtail", "mallard"],
  pileated: ["downy", "cardinal", "redtail"],
  redtail: ["heron", "pileated", "canadaGoose"],
  tanager: ["cardinal", "robin", "waxwing"],
};
