// Keyboard + mouse input for Nova Harvest. Tracks held keys, a just-pressed
// edge queue, and the pointer position in logical canvas coordinates.
export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const pointer = { x: canvas.width / 2, y: canvas.height * 0.75, active: false, down: false };

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (!e.repeat) pressed.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  }
  function onKeyUp(e) {
    keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  }
  function toLogical(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left) * (canvas.width / r.width),
      y: (clientY - r.top) * (canvas.height / r.height),
    };
  }
  function onMove(e) {
    const p = toLogical(e.clientX, e.clientY);
    pointer.x = p.x; pointer.y = p.y; pointer.active = true;
  }
  function onDown(e) {
    const p = toLogical(e.clientX, e.clientY);
    pointer.x = p.x; pointer.y = p.y; pointer.active = true; pointer.down = true;
    pressed.add('click');
  }
  function onUp() { pointer.down = false; }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);

  return {
    keys, pointer,
    axis() {
      let x = 0, y = 0;
      if (keys.has('ArrowLeft') || keys.has('a')) x -= 1;
      if (keys.has('ArrowRight') || keys.has('d')) x += 1;
      if (keys.has('ArrowUp') || keys.has('w')) y -= 1;
      if (keys.has('ArrowDown') || keys.has('s')) y += 1;
      if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
      return { x, y };
    },
    wasPressed(name) { return pressed.has(name); },
    consumePressed() { pressed.clear(); },
  };
}
