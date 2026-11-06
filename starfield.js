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
    const density = Math.min(1.6, Math.max(.5, width * height / 1000000));
    // Distant stars drift gently; the foreground moves faster and reacts more to the pointer.
    const layers = [
      { count: 115, depth: .25, radius: .55, speed: 2, brightness: .62 },
      { count: 65, depth: .65, radius: .9, speed: 6, brightness: .84 },
      { count: 30, depth: 1.2, radius: 1.35, speed: 13, brightness: 1 }
    ];
    stars = layers.flatMap((layer) => Array.from({ length: Math.round(layer.count * density) }, () => ({
      x: random(), y: random(), depth: layer.depth,
      radius: layer.radius + random() * .45, phase: random() * Math.PI * 2,
      speed: layer.speed * (.8 + random() * .4), brightness: layer.brightness
    })));
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    for (const star of stars) {
      const moving = !reducedMotion.matches;
      const drift = moving ? elapsed * star.speed : 0;
      const swayX = moving ? (Math.sin(elapsed * .15 + star.phase) - Math.sin(star.phase)) * 14 * star.depth : 0;
      const swayY = moving ? (Math.cos(elapsed * .12 + star.phase) - Math.cos(star.phase)) * 10 * star.depth : 0;
      const x = ((star.x * width + offset.x * star.depth + drift + swayX) % width + width) % width;
      const y = ((star.y * height + offset.y * star.depth - drift * .22 + swayY) % height + height) % height;
      const pulse = moving ? .92 + Math.sin(elapsed * .65 + star.phase) * .08 : 1;
      const brightness = pulse * star.brightness;
      ctx.fillStyle = star.depth > 1 ? '#ffffff' : '#e0edff';
      if (star.depth > .5) {
        ctx.globalAlpha = brightness * .14;
        ctx.beginPath();
        ctx.arc(x, y, star.radius * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = brightness;
      ctx.beginPath();
      ctx.arc(x, y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function animate(time) {
    const delta = lastTime ? Math.min((time - lastTime) / 1000, .05) : 0;
    lastTime = time;
    elapsed += delta;
    const smooth = 1 - Math.exp(-delta * 4);
    offset.x += (pointer.x * 48 - offset.x) * smooth;
    offset.y += (pointer.y * 36 - window.scrollY * .08 - offset.y) * smooth;
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
