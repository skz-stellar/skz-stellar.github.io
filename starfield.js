(() => {
  'use strict';
  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const nebula = document.querySelector('.nebula');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x: 0, y: 0 };
  const offset = { x: 0, y: 0 };
  let width = 0, height = 0, stars = [], frame = 0, lastTime = 0, elapsed = 0;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    let seed = 713;
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    stars = Array.from({ length: Math.min(260, Math.max(70, Math.round(width * height / 6500))) }, () => ({
      x: random(), y: random(), depth: .2 + random() * .8,
      radius: .35 + random() * 1.1, phase: random() * Math.PI * 2,
      speed: .3 + random() * .6
    }));
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    for (const star of stars) {
      const drift = reducedMotion.matches ? 0 : elapsed * star.speed * 1.1;
      const x = ((star.x * width + offset.x * star.depth + drift) % width + width) % width;
      const y = ((star.y * height + offset.y * star.depth + drift * .25) % height + height) % height;
      const pulse = reducedMotion.matches ? .75 : .65 + Math.sin(elapsed * .65 + star.phase) * .25;
      ctx.globalAlpha = pulse * (.35 + star.depth * .6);
      ctx.fillStyle = star.depth > .75 ? '#d6e9ff' : '#b4c9e5';
      ctx.beginPath();
      ctx.arc(x, y, star.radius, 0, Math.PI * 2);
      ctx.fill();
      if (star.radius > 1.15) {
        ctx.globalAlpha *= .12;
        ctx.beginPath();
        ctx.arc(x, y, star.radius * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function animate(time) {
    const delta = lastTime ? Math.min((time - lastTime) / 1000, .05) : 0;
    lastTime = time;
    elapsed += delta;
    const smooth = 1 - Math.exp(-delta * 4);
    offset.x += (pointer.x * 30 - offset.x) * smooth;
    offset.y += (pointer.y * 22 - window.scrollY * .08 - offset.y) * smooth;
    nebula.style.setProperty('--parallax-x', `${offset.x * 1.4}px`);
    nebula.style.setProperty('--parallax-y', `${offset.y * 1.4}px`);
    draw();
    frame = window.requestAnimationFrame(animate);
  }

  function updateMotion() {
    window.cancelAnimationFrame(frame);
    lastTime = 0;
    document.querySelectorAll('.cloud').forEach((cloud) => {
      cloud.style.animationPlayState = document.hidden ? 'paused' : 'running';
    });
    if (reducedMotion.matches || document.hidden) {
      offset.x = offset.y = 0;
      nebula.style.setProperty('--parallax-x', '0px');
      nebula.style.setProperty('--parallax-y', '0px');
      draw();
    } else {
      frame = window.requestAnimationFrame(animate);
    }
  }

  window.addEventListener('pointermove', (event) => {
    if (reducedMotion.matches || event.pointerType === 'touch') return;
    pointer.x = event.clientX / width * 2 - 1;
    pointer.y = event.clientY / height * 2 - 1;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.x = pointer.y = 0; });
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', updateMotion);
  reducedMotion.addEventListener('change', updateMotion);
  resize();
  updateMotion();
})();
