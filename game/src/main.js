// Nova Harvest — an original arcade game for make.fun best-game-01.
// Loop: title -> playing (collect stardust, dodge void shards, fill the wave
// quota, survive the elite waves) -> game over -> restart. Keyboard + mouse,
// synthesized sound, no network.
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { makeRng } from './random.js';
import {
  WORLD, createPlayer, spawnStardust, spawnShard, hit,
  createParticles, burst, trail, updateParticles,
  createPopups, addPopup, updatePopups,
} from './entities.js';
import { createDirector, startWave, updateDirector, updateDrift, quotaFor, isElite } from './waves.js';
import { createStarfield, render } from './render.js';
import { readShotParams, stagePlayShot, stageEndShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const input = createInput(canvas);
const audio = createAudio();
const params = readShotParams();
const seed = params.seed || ((Math.random() * 1e9) | 0);

const state = {
  phase: 'title', // title | playing | paused | gameover
  seed,
  rng: makeRng(seed),
  stars: createStarfield(makeRng(seed ^ 0x9e3779b9), 130),
  player: createPlayer(),
  dust: [],
  shards: [],
  cells: [],
  particles: createParticles(),
  popups: createPopups(),
  director: null,
  score: 0,
  best: Number(window.localStorage.getItem('nova-harvest-best') || 0),
  wave: 1,
  collected: 0,
  quota: quotaFor(1),
  totalCollected: 0,
  combo: 0,
  comboTimer: 0,
  lives: 3,
  shield: false,
  banner: 0,
  bannerText: '',
  flash: 0,
  shake: 0,
  time: 0,
  frozen: false,
  muted: false,
};

state.director = createDirector(state.rng);

function announce(text) {
  statusEl.textContent = text;
}

function resetRun() {
  state.player = createPlayer();
  state.dust = [];
  state.shards = [];
  state.cells = [];
  state.particles = createParticles();
  state.popups = createPopups();
  state.score = 0;
  state.wave = 1;
  state.collected = 0;
  state.quota = quotaFor(1);
  state.totalCollected = 0;
  state.combo = 0;
  state.comboTimer = 0;
  state.lives = 3;
  state.shield = false;
  state.flash = 0;
  state.shake = 0;
  state.director = createDirector(state.rng);
  startWave(state.director, 1);
  state.banner = state.director.banner;
  state.bannerText = state.director.bannerText;
}

function startGame() {
  audio.unlock();
  audio.start();
  resetRun();
  state.phase = 'playing';
  announce('Wave 1. Collect stardust, dodge void shards.');
}

function gameOver() {
  state.phase = 'gameover';
  state.player.alive = false;
  state.best = Math.max(state.best, state.score);
  window.localStorage.setItem('nova-harvest-best', String(state.best));
  audio.gameOver();
  burst(state.particles, state.player.x, state.player.y, '#ff5d7a', 60, 260);
  burst(state.particles, state.player.x, state.player.y, '#ffd94d', 30, 180);
  announce('Game over. Score ' + state.score + '. Press R to fly again.');
}

function hurtPlayer(shard) {
  const p = state.player;
  if (p.invuln > 0) return;
  if (p.shield) {
    p.shield = false;
    state.shield = false;
    p.invuln = 1.6;
    audio.shieldBreak();
    burst(state.particles, p.x, p.y, '#6ef0ff', 26, 200);
    addPopup(state.popups, p.x, p.y - 30, 'SHIELD DOWN', '#6ef0ff');
    state.shards = state.shards.filter((s) => s !== shard);
    return;
  }
  state.lives -= 1;
  state.combo = 0;
  state.comboTimer = 0;
  state.flash = 1;
  state.shake = 1;
  audio.hit();
  burst(state.particles, p.x, p.y, '#ff5d7a', 46, 240);
  burst(state.particles, p.x, p.y, '#ffffff', 20, 160);
  state.shards = state.shards.filter((s) => s !== shard);
  if (state.lives <= 0) {
    gameOver();
  } else {
    p.invuln = 2.2;
    announce('Hit! ' + state.lives + (state.lives === 1 ? ' life' : ' lives') + ' left.');
  }
}

function collectDust(d) {
  state.combo = Math.min(state.combo + 1, 8);
  state.comboTimer = 3;
  const gained = d.value * state.combo;
  state.score += gained;
  state.collected += 1;
  state.totalCollected += 1;
  audio.pickup(state.combo);
  burst(state.particles, d.x, d.y, '#ffd94d', 10, 120);
  addPopup(state.popups, d.x, d.y - 12, '+' + gained, state.combo >= 4 ? '#ff9de2' : '#ffe9a3');
  if (state.collected >= state.quota) {
    const bonus = 50 * state.wave;
    state.score += bonus;
    addPopup(state.popups, WORLD.w / 2, 200, 'WAVE CLEAR  +' + bonus, '#7dff9e');
    audio.waveClear(state.wave);
    const next = state.wave + 1;
    startWave(state.director, next);
    state.wave = next;
    state.quota = quotaFor(next);
    state.banner = state.director.banner;
    state.bannerText = state.director.bannerText;
    announce('Wave ' + next + (isElite(next) ? ' — elite wave!' : '') + '.');
  }
}

// One fixed simulation step. When silent is true (screenshot staging) no
// sound plays and no banner text is announced.
export function step(s, dt, silent) {
  const p = s.player;
  if (s.phase !== 'playing') return;
  s.time += dt;
  if (s.flash > 0) s.flash = Math.max(0, s.flash - dt * 2.2);
  if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 1.8);
  if (p.invuln > 0) p.invuln -= dt;
  if (s.comboTimer > 0) {
    s.comboTimer -= dt;
    if (s.comboTimer <= 0) s.combo = 0;
  }
  // Steering: keys first, mouse glide when the pointer moved and no keys.
  const ax = input.axis();
  if (ax.x !== 0 || ax.y !== 0) {
    p.vx = ax.x * p.speed;
    p.vy = ax.y * p.speed;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.tilt = ax.x;
    p.thrust = 1;
  } else if (input.pointer.active) {
    const dx = input.pointer.x - p.x;
    const dy = input.pointer.y - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 6) {
      const sp = Math.min(p.speed, dist * 6);
      p.x += (dx / dist) * sp * dt;
      p.y += (dy / dist) * sp * dt;
      p.tilt = Math.max(-1, Math.min(1, dx / 60));
      p.thrust = 0.8;
    } else {
      p.thrust = 0.2;
    }
  } else {
    p.thrust = 0.2;
  }
  p.x = Math.max(18, Math.min(WORLD.w - 18, p.x));
  p.y = Math.max(64, Math.min(WORLD.h - 18, p.y));
  if (p.thrust > 0.5 && Math.random() < 0.6) trail(s.particles, p.x, p.y);

  updateDirector(s.director, s, dt);
  updateDrift(s, dt, s.time);

  // Pickups.
  for (let i = s.dust.length - 1; i >= 0; i--) {
    const d = s.dust[i];
    if (hit(p, d, 2)) {
      s.dust.splice(i, 1);
      collectDust(d);
    }
  }
  for (let i = s.cells.length - 1; i >= 0; i--) {
    const c = s.cells[i];
    if (hit(p, c, 2)) {
      s.cells.splice(i, 1);
      p.shield = true;
      s.shield = true;
      if (!silent) audio.shieldGet();
      burst(s.particles, c.x, c.y, '#6ef0ff', 18, 150);
      addPopup(s.popups, c.x, c.y - 14, 'SHIELD UP', '#6ef0ff');
    }
  }
  // Hazards.
  for (let i = s.shards.length - 1; i >= 0; i--) {
    const sh = s.shards[i];
    if (hit(p, sh, 5)) hurtPlayer(sh);
  }

  // Keep the HUD fields in sync with the director.
  s.banner = s.director.banner;
  s.bannerText = s.director.bannerText;
  updateParticles(s.particles, dt);
  updatePopups(s.popups, dt);
}

function handleKeys() {
  if (input.wasPressed('m') || input.wasPressed('M')) {
    state.muted = audio.toggleMute();
    announce(state.muted ? 'Sound muted.' : 'Sound on.');
  }
  if (state.phase === 'title') {
    if (input.wasPressed('Enter') || input.wasPressed(' ') || input.wasPressed('click')) startGame();
  } else if (state.phase === 'playing') {
    if (input.wasPressed('p') || input.wasPressed('P') || input.wasPressed('Escape')) {
      state.phase = 'paused';
      announce('Paused. Press P to resume.');
    }
  } else if (state.phase === 'paused') {
    if (input.wasPressed('p') || input.wasPressed('P') || input.wasPressed('Escape')) {
      state.phase = 'playing';
      announce('Resumed.');
    }
  } else if (state.phase === 'gameover') {
    if (input.wasPressed('r') || input.wasPressed('R') || input.wasPressed('Enter') || input.wasPressed('click')) {
      startGame();
    }
  }
  input.consumePressed();
}

// Screenshot staging: freeze a composed frame before the first paint.
if (params.shot === 'play') {
  state.phase = 'playing';
  startWave(state.director, 3);
  stagePlayShot(state, (s, dt, silent) => step(s, dt, silent));
} else if (params.shot === 'end') {
  stageEndShot(state);
} else {
  startWave(state.director, 1);
  state.banner = 0;
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!state.frozen) {
    handleKeys();
    if (state.phase === 'playing') step(state, dt, false);
    else if (state.phase === 'title' || state.phase === 'gameover') state.time += dt;
  }
  render(ctx, state, state.time, dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// A tiny hook for headless play-tests: window.__nova exposes live state.
window.__nova = {
  state,
  start: startGame,
  step: (dt) => step(state, dt, true),
};
