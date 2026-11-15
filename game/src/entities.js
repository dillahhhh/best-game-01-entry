// Entities for Nova Harvest: the harvester ship, stardust, void shards,
// shield cells, particles and floating score popups. All motion is plain
// data updated in fixed steps; rendering lives in render.js.
import { range, chance } from './random.js';

export const WORLD = { w: 960, h: 640 };

export function createPlayer() {
  return {
    x: WORLD.w / 2, y: WORLD.h * 0.78, r: 16,
    vx: 0, vy: 0, speed: 360,
    invuln: 0, shield: false, alive: true,
    tilt: 0, thrust: 0,
  };
}

// A stardust mote drifts down with a sine sway and a twinkle phase.
export function spawnStardust(rng, wave) {
  return {
    kind: 'dust',
    x: range(rng, 24, WORLD.w - 24),
    y: -14,
    r: 9,
    vy: range(rng, 46, 78) + wave * 3,
    sway: range(rng, 0, Math.PI * 2),
    swaySpeed: range(rng, 1.2, 2.4),
    phase: range(rng, 0, Math.PI * 2),
    value: 10,
  };
}

// A void shard tumbles down, rotating. Comets are the elite variant.
export function spawnShard(rng, wave, comet) {
  const fast = 95 + wave * 14 + range(rng, 0, 46);
  return {
    kind: comet ? 'comet' : 'shard',
    x: range(rng, 24, WORLD.w - 24),
    y: -24,
    r: comet ? 26 : range(rng, 13, 19),
    vy: comet ? fast * 1.5 : fast,
    vx: range(rng, -36, 36),
    rot: range(rng, 0, Math.PI * 2),
    rotSpeed: range(rng, -2.4, 2.4),
    points: 5,
  };
}

// A shield cell drifts down slowly and grants one free hit.
export function spawnShieldCell(rng) {
  return {
    kind: 'shield',
    x: range(rng, 40, WORLD.w - 40),
    y: -16,
    r: 13,
    vy: 52,
    sway: range(rng, 0, Math.PI * 2),
    swaySpeed: 1.6,
    phase: 0,
  };
}

export function createParticles() {
  return [];
}

export function burst(particles, x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.35 + Math.random() * 0.85);
    particles.push({
      x, y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 0.45 + Math.random() * 0.45, max: 0.9,
      size: 2 + Math.random() * 3.5,
      color,
    });
  }
}

export function trail(particles, x, y) {
  particles.push({
    x: x + (Math.random() - 0.5) * 8, y: y + 14,
    vx: (Math.random() - 0.5) * 20, vy: 60 + Math.random() * 40,
    life: 0.35, max: 0.35,
    size: 2 + Math.random() * 2,
    color: '#7fd4ff',
  });
}

export function updateParticles(particles, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.985;
    p.vy *= 0.985;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

export function createPopups() {
  return [];
}

export function addPopup(popups, x, y, text, color) {
  popups.push({ x, y, text, color: color || '#ffe9a3', life: 0.9, max: 0.9 });
}

export function updatePopups(popups, dt) {
  for (let i = popups.length - 1; i >= 0; i--) {
    const p = popups[i];
    p.y -= 42 * dt;
    p.life -= dt;
    if (p.life <= 0) popups.splice(i, 1);
  }
}

// Circle collision with a small forgiveness margin so near-misses feel fair.
export function hit(a, b, margin) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const rr = a.r + b.r - (margin || 4);
  return dx * dx + dy * dy < rr * rr;
}

export function randomDustColor(rng) {
  return chance(rng, 0.82) ? '#ffd94d' : '#ff9de2';
}
