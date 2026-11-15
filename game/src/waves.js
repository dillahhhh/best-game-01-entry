// Wave director for Nova Harvest. Each wave asks for a quota of stardust;
// filling the quota clears the wave, pays a bonus and raises the stakes.
// Every 5th wave is an elite wave: comets arrive and the sky gets busier.
import { spawnStardust, spawnShard, spawnShieldCell, WORLD } from './entities.js';
import { range, chance } from './random.js';

export function quotaFor(wave) {
  return 8 + wave * 2;
}

export function isElite(wave) {
  return wave % 5 === 0;
}

export function createDirector(rng) {
  return {
    rng,
    wave: 1,
    collected: 0,
    dustTimer: 0.4,
    shardTimer: 1.1,
    shieldTimer: 16,
    banner: 0,
    bannerText: '',
  };
}

export function startWave(d, wave) {
  d.wave = wave;
  d.collected = 0;
  d.dustTimer = 0.3;
  d.shardTimer = 0.9;
  d.banner = 2.2;
  d.bannerText = isElite(wave)
    ? 'ELITE WAVE ' + wave + ' — void comets inbound!'
    : 'WAVE ' + wave;
}

export function updateDirector(d, state, dt) {
  const wave = d.wave;
  if (d.banner > 0) d.banner -= dt;

  // Stardust keeps the loop fed: a steady trickle, faster on later waves.
  d.dustTimer -= dt;
  const dustGap = Math.max(0.34, 0.85 - wave * 0.045);
  if (d.dustTimer <= 0) {
    d.dustTimer = dustGap * range(d.rng, 0.8, 1.25);
    state.dust.push(spawnStardust(d.rng, wave));
    if (isElite(wave) && chance(d.rng, 0.3)) state.dust.push(spawnStardust(d.rng, wave));
  }

  // Shards: pressure grows with the wave; elite waves add comets.
  d.shardTimer -= dt;
  const shardGap = Math.max(0.42, 1.35 - wave * 0.085);
  if (d.shardTimer <= 0) {
    d.shardTimer = shardGap * range(d.rng, 0.75, 1.3);
    state.shards.push(spawnShard(d.rng, wave, false));
    if (isElite(wave) && chance(d.rng, 0.35)) state.shards.push(spawnShard(d.rng, wave, true));
    if (wave >= 3 && chance(d.rng, 0.22)) state.shards.push(spawnShard(d.rng, wave, false));
  }

  // A shield cell drifts by now and then; never more than one on screen.
  d.shieldTimer -= dt;
  if (d.shieldTimer <= 0) {
    d.shieldTimer = range(d.rng, 15, 22);
    if (!state.cells.some((c) => c.kind === 'shield')) state.cells.push(spawnShieldCell(d.rng));
  }
}

// Move everything one step and drop what left the screen.
export function updateDrift(state, dt, time) {
  for (const d of state.dust) {
    d.y += d.vy * dt;
    d.x += Math.sin(time * d.swaySpeed + d.sway) * 22 * dt;
    d.phase += dt * 3;
  }
  for (const s of state.shards) {
    s.y += s.vy * dt;
    s.x += s.vx * dt;
    s.rot += s.rotSpeed * dt;
    if (s.x < 14) { s.x = 14; s.vx = Math.abs(s.vx); }
    if (s.x > WORLD.w - 14) { s.x = WORLD.w - 14; s.vx = -Math.abs(s.vx); }
  }
  for (const c of state.cells) {
    c.y += c.vy * dt;
    c.x += Math.sin(time * c.swaySpeed + c.sway) * 18 * dt;
    c.phase += dt * 3;
  }
  state.dust = state.dust.filter((d) => d.y < WORLD.h + 20);
  state.shards = state.shards.filter((s) => s.y < WORLD.h + 40);
  state.cells = state.cells.filter((c) => c.y < WORLD.h + 24);
}
