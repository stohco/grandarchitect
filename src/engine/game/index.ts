/**
 * game/index.ts — the playable entry: boot the game, show the gate verdict.
 */

import { bootGame, GAME_SEED } from './bootstrap';

const root = document.getElementById('game') as HTMLElement;
if (!root) throw new Error('no #game container');

const handle = bootGame(root);
if (!handle) {
  root.innerHTML = '<p style="color:#c04040;font-family:monospace">WORLD REJECTED BY QUALITY GATE</p>';
  throw new Error('world rejected by quality gate');
}

// the world says nothing at spawn — that is the point (constitution).
// controls: WASD move, Space jump.
const hud = document.createElement('div');
hud.style.cssText = 'position:fixed;left:12px;top:12px;font:12px monospace;color:rgba(230,220,200,0.75);pointer-events:none;z-index:10;';
hud.textContent = 'WASD — walk · Space — jump';
document.body.appendChild(hud);

// expose for evidence harnesses
declare global {
  interface Window { __GAME_READY?: boolean; __game?: typeof handle; }
}
window.__GAME_READY = true;
window.__game = handle;
