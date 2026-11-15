// All drawing for Nova Harvest: parallax starfield, entities, HUD and the
// title / pause / game-over screens. Canvas 2D only, no images.
import { WORLD } from './entities.js';

const TAU = Math.PI * 2;

export function createStarfield(rng, count) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rng() * WORLD.w,
      y: rng() * WORLD.h,
      z: 0.25 + rng() * 0.75,
      size: 0.6 + rng() * 1.7,
      tw: rng() * TAU,
    });
  }
  return stars;
}

function drawStars(ctx, stars, time, dt) {
  for (const s of stars) {
    s.y += (14 + s.z * 42) * dt;
    if (s.y > WORLD.h + 2) { s.y = -2; s.x = Math.random() * WORLD.w; }
    const a = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(time * 1.7 + s.tw));
    ctx.globalAlpha = a * s.z;
    ctx.fillStyle = '#cfe4ff';
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }
  ctx.globalAlpha = 1;
}

function drawNebula(ctx, time) {
  const g = ctx.createRadialGradient(200, 130, 10, 200, 130, 340);
  g.addColorStop(0, 'rgba(88, 60, 180, 0.20)');
  g.addColorStop(1, 'rgba(88, 60, 180, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  const g2 = ctx.createRadialGradient(780, 520, 10, 780, 520, 300);
  g2.addColorStop(0, 'rgba(20, 120, 140, 0.16)');
  g2.addColorStop(1, 'rgba(20, 120, 140, 0)');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  void time;
}

function drawShip(ctx, p, time) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.invuln > 0 && Math.floor(time * 14) % 2 === 0) ctx.globalAlpha = 0.35;
  ctx.rotate(p.tilt * 0.35);
  // Engine glow.
  const flame = 10 + Math.sin(time * 30) * 3 + p.thrust * 8;
  const fg = ctx.createLinearGradient(0, 10, 0, 10 + flame);
  fg.addColorStop(0, 'rgba(140, 220, 255, 0.9)');
  fg.addColorStop(1, 'rgba(140, 220, 255, 0)');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(-5, 10); ctx.lineTo(0, 10 + flame); ctx.lineTo(5, 10); ctx.closePath();
  ctx.fill();
  // Hull: a swept harvester dart.
  const hg = ctx.createLinearGradient(0, -18, 0, 12);
  hg.addColorStop(0, '#bfe9ff');
  hg.addColorStop(0.55, '#5aa9e6');
  hg.addColorStop(1, '#2b5f9e');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.moveTo(0, -18); ctx.lineTo(13, 10); ctx.lineTo(5, 6); ctx.lineTo(0, 10);
  ctx.lineTo(-5, 6); ctx.lineTo(-13, 10); ctx.closePath();
  ctx.fill();
  // Cockpit.
  ctx.fillStyle = '#ffe9a3';
  ctx.beginPath();
  ctx.arc(0, -6, 3.4, 0, TAU);
  ctx.fill();
  // Shield ring.
  if (p.shield) {
    ctx.strokeStyle = 'rgba(110, 240, 255, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 26 + Math.sin(time * 4) * 2, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDust(ctx, d) {
  const tw = 0.75 + 0.25 * Math.sin(d.phase);
  ctx.save();
  ctx.globalAlpha = tw;
  const g = ctx.createRadialGradient(d.x, d.y, 1, d.x, d.y, d.r + 7);
  g.addColorStop(0, 'rgba(255, 225, 120, 0.95)');
  g.addColorStop(0.5, 'rgba(255, 190, 60, 0.55)');
  g.addColorStop(1, 'rgba(255, 190, 60, 0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(d.x, d.y, d.r + 7, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath(); ctx.arc(d.x, d.y, 3.4, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawShard(ctx, s) {
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.rot);
  const r = s.r;
  const g = ctx.createLinearGradient(-r, -r, r, r);
  if (s.kind === 'comet') {
    g.addColorStop(0, '#ff7ad9');
    g.addColorStop(0.5, '#a03df0');
    g.addColorStop(1, '#3d0a5e');
  } else {
    g.addColorStop(0, '#c77dff');
    g.addColorStop(0.5, '#7b2fbe');
    g.addColorStop(1, '#2a0a44');
  }
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(255, 150, 255, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < s.points; i++) {
    const a = (i / s.points) * TAU - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.55;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.3, r * 0.14, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawShieldCell(ctx, c) {
  ctx.save();
  ctx.translate(c.x, c.y);
  const tw = 0.7 + 0.3 * Math.sin(c.phase);
  ctx.globalAlpha = tw;
  ctx.strokeStyle = '#6ef0ff';
  ctx.lineWidth = 2.5;
  ctx.fillStyle = 'rgba(110, 240, 255, 0.25)';
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU - Math.PI / 2;
    const x = Math.cos(a) * c.r;
    const y = Math.sin(a) * c.r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#dffaff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('S', 0, 1);
  ctx.restore();
}

function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPopups(ctx, popups) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const p of popups) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
}

function hearts(ctx, x, y, lives) {
  for (let i = 0; i < 3; i++) {
    const cx = x + i * 26;
    ctx.save();
    ctx.translate(cx, y);
    ctx.fillStyle = i < lives ? '#ff5d7a' : 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.bezierCurveTo(-11, -3, -6, -11, 0, -5);
    ctx.bezierCurveTo(6, -11, 11, -3, 0, 7);
    ctx.fill();
    ctx.restore();
  }
}

export function drawHUD(ctx, s) {
  ctx.save();
  // Top bar.
  ctx.fillStyle = 'rgba(5, 10, 28, 0.55)';
  ctx.fillRect(0, 0, WORLD.w, 46);
  ctx.fillStyle = 'rgba(140, 220, 255, 0.35)';
  ctx.fillRect(0, 46, WORLD.w, 1);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#eaf6ff';
  ctx.font = 'bold 19px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SCORE ' + s.score, 16, 24);
  ctx.fillStyle = '#8fb8d8';
  ctx.font = '13px sans-serif';
  ctx.fillText('BEST ' + s.best, 200, 24);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9a3';
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText('WAVE ' + s.wave, WORLD.w / 2, 24);
  // Wave quota pips under the wave label.
  const need = s.quota;
  const got = Math.min(s.collected, need);
  for (let i = 0; i < need; i++) {
    ctx.fillStyle = i < got ? '#ffd94d' : 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.arc(WORLD.w / 2 - (need * 9) / 2 + i * 9 + 4, 40, 2.6, 0, TAU);
    ctx.fill();
  }
  hearts(ctx, WORLD.w - 96, 24, s.lives);
  // Combo meter, right side under the hearts.
  if (s.combo > 1) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff9de2';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('COMBO x' + s.combo, WORLD.w - 16, 66);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(WORLD.w - 116, 76, 100, 5);
    ctx.fillStyle = '#ff9de2';
    ctx.fillRect(WORLD.w - 116, 76, 100 * s.comboTimer / 3, 5);
  }
  if (s.shield) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#6ef0ff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('SHIELD READY', WORLD.w - 16, s.combo > 1 ? 96 : 66);
  }
  // Wave banner.
  if (s.banner > 0) {
    ctx.globalAlpha = Math.min(1, s.banner);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(s.bannerText, WORLD.w / 2, 150);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(6, 12, 32, 0.82)';
  ctx.strokeStyle = 'rgba(140, 220, 255, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();
}

export function drawTitle(ctx, s, time) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Big title with a slow glow pulse.
  const glow = 0.55 + 0.25 * Math.sin(time * 2);
  ctx.shadowColor = '#7b2fbe';
  ctx.shadowBlur = 26 * glow;
  ctx.fillStyle = '#fdf6ff';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('NOVA HARVEST', WORLD.w / 2, 168);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 21px sans-serif';
  ctx.fillText('Collect the stardust. Dodge the void.', WORLD.w / 2, 216);
  panel(ctx, WORLD.w / 2 - 300, 258, 600, 168);
  ctx.fillStyle = '#eaf6ff';
  ctx.font = '17px sans-serif';
  ctx.fillText('Move  —  WASD / Arrow keys, or steer with the mouse', WORLD.w / 2, 288);
  ctx.fillText('Stardust scores — chain pickups to raise your combo', WORLD.w / 2, 318);
  ctx.fillText('Void shards cost a life — shield cells block one hit', WORLD.w / 2, 348);
  ctx.fillText('Fill the wave quota to advance — every 5th wave is elite', WORLD.w / 2, 378);
  ctx.fillStyle = '#8fb8d8';
  ctx.font = '15px sans-serif';
  ctx.fillText('P pause   ·   M mute   ·   3 lives, no second chances in the void', WORLD.w / 2, 404);
  const blink = 0.6 + 0.4 * Math.sin(time * 4);
  ctx.globalAlpha = blink;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('Press ENTER or CLICK to launch', WORLD.w / 2, 480);
  ctx.globalAlpha = 1;
  if (s.best > 0) {
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText('BEST SCORE  ' + s.best, WORLD.w / 2, 524);
  }
  ctx.fillStyle = 'rgba(160, 190, 220, 0.75)';
  ctx.font = '13px sans-serif';
  ctx.fillText('An original arcade game for make.fun — best-game-01', WORLD.w / 2, 606);
  ctx.restore();
}

export function drawPaused(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(4, 8, 20, 0.6)';
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('PAUSED', WORLD.w / 2, 290);
  ctx.fillStyle = '#8fb8d8';
  ctx.font = '17px sans-serif';
  ctx.fillText('Press P to resume', WORLD.w / 2, 336);
  ctx.restore();
}

export function drawGameOver(ctx, s) {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 4, 18, 0.72)';
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ff8fa3';
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText('THE VOID CLAIMS YOU', WORLD.w / 2, 190);
  panel(ctx, WORLD.w / 2 - 250, 240, 500, 170);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('SCORE  ' + s.score, WORLD.w / 2, 282);
  ctx.fillStyle = '#eaf6ff';
  ctx.font = '18px sans-serif';
  ctx.fillText('Reached wave ' + s.wave + '  ·  ' + s.totalCollected + ' stardust gathered', WORLD.w / 2, 322);
  ctx.fillStyle = s.score >= s.best && s.score > 0 ? '#ffd94d' : '#8fb8d8';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(
    s.score >= s.best && s.score > 0 ? 'NEW BEST SCORE!' : 'BEST  ' + s.best,
    WORLD.w / 2, 360,
  );
  const blink = 0.6 + 0.4 * Math.sin(Date.now() / 280);
  ctx.globalAlpha = blink;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Press R or CLICK to fly again', WORLD.w / 2, 470);
  ctx.globalAlpha = 1;
  ctx.restore();
}

// One frame: background, entities, particles, HUD, then the state screen.
export function render(ctx, s, time, dt) {
  ctx.save();
  ctx.clearRect(0, 0, WORLD.w, WORLD.h);
  const bg = ctx.createLinearGradient(0, 0, 0, WORLD.h);
  bg.addColorStop(0, '#0a1030');
  bg.addColorStop(0.6, '#0a0a22');
  bg.addColorStop(1, '#05060f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  drawNebula(ctx, time);
  drawStars(ctx, s.stars, time, dt);
  if (s.shake > 0) {
    const m = s.shake * 9;
    ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
  }
  for (const c of s.cells) drawShieldCell(ctx, c);
  for (const d of s.dust) drawDust(ctx, d);
  for (const sh of s.shards) drawShard(ctx, sh);
  drawParticles(ctx, s.particles);
  if (s.player.alive && (s.phase === 'playing' || s.phase === 'paused')) drawShip(ctx, s.player, time);
  drawPopups(ctx, s.popups);
  if (s.flash > 0) {
    ctx.fillStyle = 'rgba(255, 40, 70, ' + (s.flash * 0.28) + ')';
    ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  }
  ctx.restore();
  if (s.phase === 'playing' || s.phase === 'paused') drawHUD(ctx, s);
  if (s.phase === 'title') drawTitle(ctx, s, time);
  if (s.phase === 'paused') drawPaused(ctx);
  if (s.phase === 'gameover') drawGameOver(ctx, s);
}
