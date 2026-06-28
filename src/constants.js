// src/constants.js — game-wide constants and tuning values

export const BS = 32;             // block size in world pixels
export const FIXED_DT = 1 / 60;  // physics step (seconds)
export const MAX_DT   = 0.05;    // delta-time clamp
export const DRAG     = 0.984;   // linear velocity damping per frame
export const ANG_DRAG = 0.88;    // angular velocity damping per frame
export const CAMERA_LERP = 0.1;  // camera smoothing factor

export const BULLET_SPEED  = 480;  // world px/s
export const BULLET_LIFE   = 2.5;  // seconds
export const PICKUP_RANGE  = 72;   // world px for auto-pickup

export const CHUNK_BLOCKS = 16;
export const CHUNK_PX     = BS * CHUNK_BLOCKS; // 512
export const ACTIVE_RADIUS_CHUNKS = 3;

export const ASTEROID_DENSITY      = 0.12;  // fraction of chunks that have asteroids
export const ASTEROIDS_PER_CHUNK   = 5;
export const ENEMY_DENSITY         = 0.06;
export const ENEMIES_PER_CHUNK     = 1;
export const ENEMY_DESPAWN_DIST    = 2200;
export const ASTEROID_DESPAWN_DIST = 1900;

// Resource ids
export const RES = Object.freeze({
  IRON:        'iron',
  COPPER:      'copper',
  CRYSTAL:     'crystal',
  TITANIUM:    'titanium',
  DARK_MATTER: 'dark_matter',
});

// Block type ids
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

// Screen ids
export const SCREEN = Object.freeze({
  GAME:     'game',
  BUILD:    'build',
  CRAFT:    'craft',
  SETTINGS: 'settings',
  GAMEOVER: 'gameover',
});

// Enemy AI state ids
export const AI = Object.freeze({
  PATROL: 0,
  SEEK:   1,
  CHASE:  2,
  ATTACK: 3,
  FLEE:   4,
});

// Star field
export const STAR_COUNT   = 250;
export const STAR_VIRTUAL = 3072; // size of tiling star virtual canvas

// HUD colors (pre-allocated strings — never build these in hot path)
export const C = Object.freeze({
  BG:          '#06090f',
  STAR_DIM:    '#404868',
  STAR_MED:    '#8890b8',
  STAR_BRIGHT: '#dde8ff',
  HP_BAR:      '#40e060',
  HP_LOW:      '#e04020',
  SHIELD_BAR:  '#4080ff',
  HUD_BG:      'rgba(0,6,16,0.75)',
  HUD_BORDER:  '#1a3050',
  WHITE:       '#ffffff',
  YELLOW:      '#ffe060',
  ORANGE:      '#ff9020',
  RED:         '#ff3020',
  BULLET_PLR:  '#ffe080',
  BULLET_ENM:  '#ff5030',
  DROP_IRON:   '#a0b8c8',
  DROP_COPPER: '#e07830',
  DROP_CRYSTAL:'#60d8ff',
  DROP_TIT:    '#c0c8e0',
  DROP_DM:     '#d060ff',
});
