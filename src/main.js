// src/main.js — entry point

import { Game } from './Game.js';

const canvas = document.getElementById('canvas');
if (!canvas) throw new Error('Canvas element #canvas not found');

const game = new Game(canvas);
game.init().then(() => game.start());

// Expose for debugging in browser console
window.__game = game;
