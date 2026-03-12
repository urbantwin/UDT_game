// Simple game loop moving a square using requestAnimationFrame.
// Create and attach a canvas.
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

document.body.style.margin = '0';
document.body.style.background = '#111';
document.body.appendChild(canvas);

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Square state.
const square = {
  size: 50,
  x: 100,
  y: 100,
  vx: 180, // pixels per second
  vy: 120
};

let lastTime = performance.now();

function update(dt) {
  square.x += square.vx * dt;
  square.y += square.vy * dt;

  // Bounce off edges.
  if (square.x < 0) {
    square.x = 0;
    square.vx *= -1;
  } else if (square.x + square.size > canvas.width) {
    square.x = canvas.width - square.size;
    square.vx *= -1;
  }

  if (square.y < 0) {
    square.y = 0;
    square.vy *= -1;
  } else if (square.y + square.size > canvas.height) {
    square.y = canvas.height - square.size;
    square.vy *= -1;
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#4cc9f0';
  ctx.fillRect(square.x, square.y, square.size, square.size);
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000); // clamp dt
  lastTime = now;

  update(dt);
  render();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
