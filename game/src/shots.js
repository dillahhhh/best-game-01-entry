// Deterministic staging for screenshots: ?shot=start|play|end&seed=N.
// The play shot runs a short seeded autopilot so the frame shows a busy
// mid-game moment with a real HUD, then freezes updates for the capture.
import { makeRng } from './random.js';
import { spawnStardust, spawnShard, spawnShieldCell, WORLD } from './entities.js';
import { quotaFor } from './waves.js';

export function readShotParams() {
  const q = new URLSearchParams(window.location.search);
  return {
    shot: q.get('shot'),
    seed: Number(q.get('seed') || 7),
  };
}

// Seed the world for the play shot and let a simple autopilot fly it.
export function stagePlayShot(state, step) {
  const rng = makeRng(state.seed);
  state.score = 1250;
  state.wave = 3;
  state.collected = 5;
  state.quota = quotaFor(3);
  state.combo = 4;
  state.comboTimer = 2.1;
  state.lives = 3;
  state.totalCollected = 21;
  state.player.shield = true;
  for (let i = 0; i < 7; i++) state.dust.push(spawnStardust(rng, 3));
  for (let i = 0; i < 5; i++) state.shards.push(spawnShard(rng, 3, i === 1));
  state.cells.push(spawnShieldCell(rng));
  // 3.5 simulated seconds of autopilot: chase the nearest dust, dodge the
  // nearest shard, so the frame reads as a game in progress.
  const dt = 1 / 60;
  for (let t = 0; t < 3.5; t += dt) {
    autopilot(state, dt);
    step(state, dt, true);
  }
  // Compose the frame: ship centre-stage with room around it, a plausible
  // prior best under the current score, and no stray popups in the HUD.
  state.player.x = 480;
  state.player.y = 440;
  state.player.tilt = -0.2;
  state.player.thrust = 1;
  state.best = 1250;
  state.popups = [];
  state.frozen = true;
}

export function stageEndShot(state) {
  state.phase = 'gameover';
  state.score = 3420;
  state.wave = 6;
  state.totalCollected = 64;
  state.best = Math.max(state.best, 3420);
  state.frozen = true;
}

function autopilot(state, dt) {
  const p = state.player;
  let target = null;
  let bestD = Infinity;
  for (const d of state.dust) {
    const dx = d.x - p.x;
    const dy = d.y - p.y;
    const dd = dx * dx + dy * dy;
    if (dd < bestD) { bestD = dd; target = d; }
  }
  let mx = 0;
  let my = 0;
  if (target) {
    mx = Math.sign(target.x - p.x);
    my = Math.sign(target.y - p.y);
  }
  // Veer away from the closest shard that is nearly on top of us.
  for (const s of state.shards) {
    const dx = s.x - p.x;
    const dy = s.y - p.y;
    if (dy > -60 && dy < 130 && Math.abs(dx) < 70) {
      mx = dx > 0 ? -1 : 1;
      my = 0.4;
    }
  }
  p.x += mx * p.speed * dt;
  p.y += my * p.speed * dt;
  p.x = Math.max(18, Math.min(WORLD.w - 18, p.x));
  p.y = Math.max(70, Math.min(WORLD.h - 18, p.y));
  p.thrust = 1;
}
