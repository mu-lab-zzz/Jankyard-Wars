// src/constants.js — game-wide constants and tuning values

export const BS = 32;             // block size in world pixels
export const FIXED_DT = 1 / 60;  // physics step (seconds)
export const MAX_DT   = 0.05;    // delta-time clamp
export const DRAG     = 0.984;   // linear velocity damping per frame
export const ANG_DRAG = 0.88;    // angular velocity damping per frame
export const CAMERA_LERP = 0.1;  // camera smoothing factor

export const BULLET_SPEED  = 480;  // world px/s
export const BULLET_LIFE   = 2.5;  // seconds

export const CHUNK_BLOCKS = 16;
export const CHUNK_PX     = BS * CHUNK_BLOCKS; // 512
export const ACTIVE_RADIUS_CHUNKS = 3;

export const ASTEROID_DENSITY      = 0.12;
export const ASTEROIDS_PER_CHUNK   = 5;
export const ENEMY_DENSITY         = 0.06;
export const ENEMIES_PER_CHUNK     = 1;
export const ENEMY_DESPAWN_DIST    = 2200;
export const ASTEROID_DESPAWN_DIST = 1900;

// ── Cargo ──────────────────────────────────────────────────────────────────
export const BASE_CARGO = 20;          // capacity with no container blocks
export const PICKUP_RANGE = 80;        // auto-pickup radius

// ── Station ────────────────────────────────────────────────────────────────
export const STATION_X = 0;
export const STATION_Y = 0;
export const STATION_DOCK_RANGE = 350; // world px to show dock button
export const STATION_INNER_RANGE = 160;// world px for auto-dock collision

// ── Raw ores (from asteroids, stored in ship cargo) ────────────────────────
export const ORE = Object.freeze({
  IRON:        'iron_ore',
  COPPER:      'copper_ore',
  CRYSTAL:     'crystal_shard',
  TITANIUM:    'titanium_ore',
  DARK_MATTER: 'dark_matter',
});

// Cargo weight per 1 unit of ore
export const ORE_WEIGHT = Object.freeze({
  iron_ore:     1,
  copper_ore:   1,
  crystal_shard:2,
  titanium_ore: 2,
  dark_matter:  1,
});

// ── Processed materials (refined at station) ───────────────────────────────
export const MAT = Object.freeze({
  IRON_PLATE:     'iron_plate',
  COPPER_WIRE:    'copper_wire',
  CRYSTAL_LENS:   'crystal_lens',
  TITANIUM_ALLOY: 'titanium_alloy',
  ENERGY_CELL:    'energy_cell',
});

// ── Block type ids ─────────────────────────────────────────────────────────
export const BID = Object.freeze({
  CORE:        'core',
  ARMOR:       'armor',
  ENGINE:      'engine',
  WEAPON:      'weapon',
  DRILL:       'drill',
  CONTAINER:   'container',
  GENERATOR:   'generator',
  BATTERY:     'battery',
  SHIELD:      'shield',
  RADAR:       'radar',
  DRONE_HATCH: 'drone_hatch',
});

// ── Screen ids ─────────────────────────────────────────────────────────────
export const SCREEN = Object.freeze({
  GAME:     'game',
  BUILD:    'build',
  STATION:  'station',
  SETTINGS: 'settings',
  GAMEOVER: 'gameover',
});

// ── Enemy AI ────────────────────────────────────────────────────────────────
export const AI = Object.freeze({
  PATROL: 0,
  SEEK:   1,
  CHASE:  2,
  ATTACK: 3,
  FLEE:   4,
});

// ── Star field ─────────────────────────────────────────────────────────────
export const STAR_COUNT   = 250;
export const STAR_VIRTUAL = 3072;

// ── Pre-allocated colour strings ───────────────────────────────────────────
export const C = Object.freeze({
  BG:          '#06090f',
  STAR_DIM:    '#404868',
  STAR_MED:    '#8890b8',
  STAR_BRIGHT: '#dde8ff',
  HP_BAR:      '#40e060',
  HP_LOW:      '#e04020',
  SHIELD_BAR:  '#4080ff',
  CARGO_BAR:   '#e0a020',
  CARGO_FULL:  '#e04020',
  HUD_BG:      'rgba(0,6,16,0.75)',
  HUD_BORDER:  '#1a3050',
  WHITE:       '#ffffff',
  YELLOW:      '#ffe060',
  ORANGE:      '#ff9020',
  RED:         '#ff3020',
  BULLET_PLR:  '#ffe080',
  BULLET_ENM:  '#ff5030',
  // Ore colours
  ORE_IRON:        '#a0b8c8',
  ORE_COPPER:      '#e07830',
  ORE_CRYSTAL:     '#60d8ff',
  ORE_TITANIUM:    '#c0c8e0',
  ORE_DARK_MATTER: '#d060ff',
  // Material colours
  MAT_PLATE:  '#c8d8e0',
  MAT_WIRE:   '#f0a050',
  MAT_LENS:   '#80e8ff',
  MAT_ALLOY:  '#e0e8ff',
  MAT_CELL:   '#e080ff',
  // Station
  STATION_RANGE: 'rgba(60,200,100,0.15)',
  DOCK_ACTIVE:   '#40e080',
});
