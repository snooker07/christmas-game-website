/* Quiet background magic for game pages. Canvas lives behind the readable content. */
(() => {
  const canvas = document.querySelector('#ambient-particles');
  const button = document.querySelector('#ambient-motion');
  if (!canvas || !button) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const icy = document.body.classList.contains('game-snow');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const random = seed => { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const particles = Array.from({ length: window.innerWidth < 701 ? 48 : 88 }, (_, i) => ({
    x: random(i + 7), y: random(i + 707), depth: random(i + 1407), phase: random(i + 2007) * Math.PI * 2
  }));
  let width = 0, height = 0, frame = 0, previous = 0, time = 0, paused = false;
  let scroll = window.scrollY, progress = 0;
  function measure() {
    scroll = window.scrollY;
    progress = Math.max(0, Math.min(1, scroll / Math.max(1, document.documentElement.scrollHeight - height)));
  }
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth; height = window.innerHeight;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    measure(); draw();
  }
  function crystal(x, y, size, angle) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.lineWidth = .65; ctx.strokeStyle = icy ? '#a6ddec' : '#e4c48b';
    ctx.globalAlpha = .09;
    ctx.beginPath();
    if (icy) {
      for (let arm = 0; arm < 6; arm++) {
        const a = arm * Math.PI / 3;
        const dx = Math.cos(a), dy = Math.sin(a);
        ctx.moveTo(0, 0); ctx.lineTo(dx * size, dy * size);
        for (const side of [-1, 1]) {
          const b = a + side * Math.PI / 3;
          ctx.moveTo(dx * size * .6, dy * size * .6);
          ctx.lineTo(dx * size * .6 + Math.cos(b) * size * .23, dy * size * .6 + Math.sin(b) * size * .23);
        }
      }
    } else {
      for (let i = 0; i < 10; i++) {
        const a = i * Math.PI / 5 - Math.PI / 2, radius = i % 2 ? size * .44 : size;
        if (i === 0) ctx.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
        else ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
      }
      ctx.closePath();
    }
    ctx.stroke(); ctx.restore();
  }
  function draw() {
    if (reduced.matches) return;
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const x = p.x * width + Math.sin(time * .09 + p.phase) * (8 + p.depth * 13);
      const y = ((p.y * (height + 40) + time * (icy ? 4 : -2) * (1 + p.depth) - scroll * (.035 + p.depth * .025)) % (height + 40) + height + 40) % (height + 40) - 20;
      const radius = .55 + p.depth * 1.25;
      ctx.globalAlpha = (.12 + p.depth * .22) * (.7 + .3 * Math.sin(time * .6 + p.phase));
      ctx.fillStyle = icy ? '#c7e8f1' : i % 3 ? '#e6cb94' : '#b5d8df';
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
      if (i % 13 === 0) {
        ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = .6;
        ctx.beginPath(); ctx.moveTo(x - radius * 2.5, y); ctx.lineTo(x + radius * 2.5, y);
        ctx.moveTo(x, y - radius * 2.5); ctx.lineTo(x, y + radius * 2.5); ctx.stroke();
      }
    }
    // Large, faint constellations drift in the margins as the page is explored.
    const size = Math.min(width * .13, 165);
    crystal(width * .93, height * (.26 + progress * .40), size, time * .012 + progress * .45);
    crystal(width * .05, height * (.8 - progress * .35), size * .65, -time * .009 - progress * .3);
    ctx.globalAlpha = 1;
    canvas.dataset.renderer = 'canvas-2d'; canvas.dataset.particles = String(particles.length);
  }
  function render(now) {
    frame = 0;
    if (paused || reduced.matches || document.hidden) return;
    frame = requestAnimationFrame(render);
    if (now - previous < 40) return;
    time += Math.min((now - previous) / 1000, .08); previous = now;
    draw();
  }
  function wake() {
    if (!frame && !paused && !reduced.matches && !document.hidden) {
      previous = performance.now(); frame = requestAnimationFrame(render);
    }
  }
  function preferences() {
    canvas.hidden = reduced.matches; button.hidden = reduced.matches;
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
    if (reduced.matches) ctx.clearRect(0, 0, width, height);
    else { draw(); wake(); }
  }
  button.addEventListener('click', () => {
    paused = !paused;
    button.setAttribute('aria-pressed', String(paused));
    button.setAttribute('aria-label', paused ? 'Resume background animation' : 'Pause background animation');
    button.querySelector('[data-motion-icon]').textContent = paused ? '▷' : 'Ⅱ';
    button.querySelector('[data-motion-label]').textContent = paused ? 'Motion paused' : 'Background magic';
    if (paused && frame) { cancelAnimationFrame(frame); frame = 0; }
    else wake();
  });
  window.addEventListener('scroll', () => { measure(); if (!paused) draw(); }, { passive: true });
  window.addEventListener('resize', () => { resize(); wake(); }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && frame) { cancelAnimationFrame(frame); frame = 0; }
    else wake();
  });
  reduced.addEventListener('change', preferences);
  resize(); preferences();
})();
