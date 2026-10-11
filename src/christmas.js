/* Scroll-scrubbed Christmas sculptures, rendered locally in one WebGL draw call. */
(() => {
  const journey = document.querySelector('#christmas-journey');
  if (!journey) return;
  const stage = journey.querySelector('.christmas-stage');
  const canvas = document.querySelector('#christmas-particles');
  const panels = [...journey.querySelectorAll('.journey-scene')];
  const steps = [...journey.querySelectorAll('.journey-steps a')];
  const fallback = [...journey.querySelectorAll('.fallback-shape')];
  const motionButton = document.querySelector('#motion-toggle');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const labels = ['01 / A LITTLE WINTER WONDER', '02 / LET THE WONDER GROW', '03 / A LITTLE JOY, WRAPPED UP'];
  const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
  const random = seed => { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  let target = 0, progress = 0, frame = 0, previous = 0, elapsed = 0;
  let paused = false, visible = true, pointerX = 0, pointerY = 0, scene = -1;
  let gl = null, program = null, count = 0;
  const uniforms = {};

  function measure() {
    const distance = Math.max(1, journey.offsetHeight - stage.clientHeight);
    target = clamp((-journey.getBoundingClientRect().top / distance) * 2.5 - .25, 0, 2);
    document.body.classList.toggle('journey-finished', journey.getBoundingClientRect().bottom < stage.clientHeight * .35);
  }
  function jump(index, instant = false) {
    if (reduced.matches) {
      panels[index].scrollIntoView({ behavior: 'instant', block: 'start' });
      return;
    }
    const top = journey.getBoundingClientRect().top + window.scrollY;
    const distance = Math.max(1, journey.offsetHeight - stage.clientHeight);
    window.scrollTo({ top: top + distance * (index === 0 ? 0 : (index + .25) / 2.5), behavior: instant ? 'instant' : 'smooth' });
  }
  journey.querySelectorAll('[data-jump]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    window.history.replaceState(null, '', link.getAttribute('href'));
    jump(Number(link.dataset.jump));
  }));
  function compose() {
    if (reduced.matches) {
      panels.forEach(panel => {
        panel.inert = false;
        panel.removeAttribute('aria-hidden');
        panel.style.removeProperty('opacity');
        panel.style.removeProperty('transform');
        panel.style.removeProperty('pointer-events');
      });
      return;
    }
    const nextScene = Math.round(progress);
    panels.forEach((panel, index) => {
      const opacity = clamp(1 - Math.abs(progress - index) * 2.15);
      panel.style.opacity = opacity;
      panel.style.transform = `translateY(${(index - progress) * 30}px)`;
      panel.style.pointerEvents = index === nextScene ? 'auto' : 'none';
      panel.inert = index !== nextScene;
      panel.setAttribute('aria-hidden', String(index !== nextScene));
    });
    fallback.forEach((shape, index) => {
      shape.style.opacity = clamp(1 - Math.abs(progress - index) * 1.5);
      shape.style.color = index === 0 ? '#bceef8' : '#f1cf91';
    });
    if (nextScene !== scene) {
      scene = nextScene;
      stage.dataset.scene = scene;
      document.querySelector('#particle-label').textContent = labels[scene];
      steps.forEach((link, index) => {
        if (index === scene) link.setAttribute('aria-current', 'step');
        else link.removeAttribute('aria-current');
      });
    }
  }

  function shapes(amount) {
    const snowflake = [], tree = [], gift = [], seeds = [];
    // Six crystalline arms with three pairs of smaller branches on each arm.
    const arms = [];
    for (let arm = 0; arm < 6; arm++) {
      const angle = arm * Math.PI / 3 + Math.PI / 6;
      const axis = [Math.cos(angle), Math.sin(angle)];
      arms.push([0, 0, axis[0] * 1.32, axis[1] * 1.32]);
      for (const distance of [.38, .68, .96]) {
        for (const side of [-1, 1]) {
          const branchAngle = angle + side * Math.PI / 3;
          const length = .35 - distance * .12;
          arms.push([axis[0] * distance, axis[1] * distance,
            axis[0] * distance + Math.cos(branchAngle) * length,
            axis[1] * distance + Math.sin(branchAngle) * length]);
        }
      }
    }
    for (let i = 0; i < amount; i++) {
      const u = random(i + 7), v = random(i + 1307), w = random(i + 2647);
      if (i % 12 === 0) {
        const angle = u * Math.PI * 2;
        snowflake.push(Math.cos(angle) * .17, Math.sin(angle) * .17, (w - .5) * .12);
      } else {
        const line = arms[i % 10 < 4 ? (i % 6) * 7 : i % arms.length];
        snowflake.push(line[0] + (line[2] - line[0]) * u + (v - .5) * .022,
          line[1] + (line[3] - line[1]) * u + (w - .5) * .022, (v - .5) * .14);
      }
      if (i % 23 === 0) {
        // Star at the top, formed from five intersecting edges.
        const edge = i % 5, angle = -Math.PI / 2 + edge * Math.PI * 4 / 5;
        const next = angle + Math.PI * 4 / 5;
        tree.push((Math.cos(angle) * (1 - u) + Math.cos(next) * u) * .2,
          1.4 + (Math.sin(angle) * (1 - u) + Math.sin(next) * u) * .2, (w - .5) * .045);
      } else if (i % 17 === 0) {
        tree.push((u - .5) * .18, -1.36 + v * .34, (w - .5) * .18);
      } else {
        const tier = Math.floor(v * 6), height = 1.05 - tier * .4 - w * .37;
        const radius = (.25 + tier * .15) * (.75 + .25 * w);
        const angle = u * Math.PI * 2;
        tree.push(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
      }
      if (i % 10 < 2) {
        const side = i % 2 ? 1 : -1, angle = u * Math.PI;
        gift.push(side * Math.sin(angle) * .43, .88 + Math.sin(angle) * .38,
          side * (Math.cos(angle) - 1) * .3 + (v - .5) * .035);
      } else if (i % 10 < 4) {
        const side = Math.floor(u * 4), offset = (u * 4 - side) * 1.6 - .8;
        const a = side < 2 ? offset : (side === 2 ? .805 : -.805);
        const b = side < 2 ? (side ? .805 : -.805) : offset;
        if (i % 2) gift.push((v - .5) * .10, a, b);
        else gift.push(b, a, (v - .5) * .10);
      } else if (i % 10 < 6) {
        const edge = Math.floor(v * 12), axis = Math.floor(edge / 4);
        const a = edge % 2 ? .8 : -.8, b = edge % 4 < 2 ? .8 : -.8, offset = u * 1.6 - .8;
        if (axis === 0) gift.push(offset, a, b);
        else if (axis === 1) gift.push(a, offset, b);
        else gift.push(a, b, offset);
      } else {
        const face = Math.floor(w * 6), a = u * 1.6 - .8, b = v * 1.6 - .8;
        if (face < 2) gift.push(face ? .8 : -.8, a, b);
        else if (face < 4) gift.push(a, face === 3 ? .8 : -.8, b);
        else gift.push(a, b, face === 5 ? .8 : -.8);
      }
      seeds.push(u, v, w);
    }
    return { snowflake, tree, gift, seed: seeds };
  }
  const vertex = `
    precision highp float;
    attribute vec3 a_snowflake, a_tree, a_gift, a_seed;
    uniform float u_progress, u_time, u_aspect, u_mobile, u_short, u_dpr, u_pointerX, u_pointerY;
    varying float v_alpha, v_kind, v_seed;
    vec3 shape(float s) { if(s < .5) return a_snowflake; if(s < 1.5) return a_tree; return a_gift; }
    void main() {
      float part = min(floor(u_progress), 1.);
      float blend = smoothstep(.12, .88, u_progress - part);
      vec3 p = mix(shape(part), shape(part + 1.), blend);
      float scatter = sin(blend * 3.14159265);
      p += (a_seed - .5) * scatter * 3.4;
      float angle = -.2 + u_progress * .62 + sin(u_time * .16) * .38 + u_pointerX;
      float c = cos(angle), s = sin(angle);
      p = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
      float roll = sin(u_time * .09) * .045;
      c = cos(roll); s = sin(roll); p.xy = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
      p.y += u_pointerY;
      float perspective = 4.5 / (4.5 + p.z);
      float scale = mix(.43, .23, u_mobile);
      float centerX = mix(.49, .0, u_mobile), centerY = mix(.10, mix(.58,.7,u_short), u_mobile);
      gl_Position = vec4(centerX + p.x * perspective * scale / u_aspect, centerY + p.y * perspective * scale, 0., 1.);
      gl_PointSize = (1.8 + a_seed.z * 1.8) * u_dpr * perspective;
      v_alpha = (.7 + .3 * sin(u_time * 1.15 + a_seed.x * 29.)) * (.75 + .25 * perspective);
      v_kind = u_progress; v_seed = a_seed.x;
    }`;
  const fragment = `
    precision mediump float;
    varying float v_alpha, v_kind, v_seed;
    void main() {
      float d = length(gl_PointCoord - .5); if(d > .5) discard;
      vec3 ice = vec3(.57, .85, 1.), gold = vec3(1., .75, .36);
      vec3 color = mix(ice, gold, smoothstep(.35, .9, v_kind));
      if(v_kind > .8 && v_kind < 1.25 && v_seed < .08) color = vec3(1., .28, .20);
      color = mix(color, vec3(1., .97, .86), v_seed * .4);
      gl_FragColor = vec4(color, smoothstep(.5, .04, d) * v_alpha * .85);
    }`;
  const snowVertex = `
    precision highp float;
    attribute vec3 a_seed;
    uniform float u_time, u_dpr;
    varying float v_alpha;
    void main() {
      float y = 1.1 - mod(a_seed.y * 2.2 + u_time * (.025 + a_seed.z * .035), 2.2);
      float x = a_seed.x * 2. - 1. + sin(u_time * .13 + a_seed.y * 15.) * .035;
      gl_Position = vec4(x, y, 0., 1.);
      gl_PointSize = (1. + a_seed.z * 2.5) * u_dpr;
      v_alpha = .15 + a_seed.z * .22;
    }`;
  const snowFragment = `precision mediump float; varying float v_alpha;
    void main() { float d=length(gl_PointCoord-.5); if(d>.5) discard;
    gl_FragColor=vec4(.79,.9,.98,v_alpha*smoothstep(.5,.1,d)); }`;
  let snowProgram, snowUniforms, snowBuffer, seedsBuffer;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); throw new Error('Shader unavailable'); }
    return shader;
  }
  function link(vertexSource, fragmentSource) {
    const result = gl.createProgram();
    gl.attachShader(result, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(result, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(result);
    if (!gl.getProgramParameter(result, gl.LINK_STATUS)) throw new Error('Renderer unavailable');
    return result;
  }
  const attributes = {};
  function initialize() {
    try {
      gl = canvas.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'low-power' });
      if (!gl) throw new Error('WebGL unavailable');
      program = link(vertex, fragment);
      count = window.innerWidth < 701 ? 3800 : 7800;
      const data = shapes(count);
      for (const [name, positions] of Object.entries(data)) {
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
        attributes[name] = { buffer, location: gl.getAttribLocation(program, 'a_' + name) };
        if (name === 'seed') seedsBuffer = buffer;
      }
      for (const name of ['progress', 'time', 'aspect', 'mobile', 'short', 'dpr', 'pointerX', 'pointerY']) uniforms[name] = gl.getUniformLocation(program, 'u_' + name);
      snowProgram = link(snowVertex, snowFragment);
      snowUniforms = { time: gl.getUniformLocation(snowProgram, 'u_time'), dpr: gl.getUniformLocation(snowProgram, 'u_dpr'), seed: gl.getAttribLocation(snowProgram, 'a_seed') };
      snowBuffer = seedsBuffer;
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      document.body.classList.add('has-webgl');
      canvas.hidden = false;
      canvas.dataset.renderer = 'webgl'; canvas.dataset.particles = String(count);
      resize();
    } catch {
      gl = null; canvas.hidden = true;
      document.body.classList.remove('has-webgl');
      canvas.dataset.renderer = 'svg-fallback';
    }
  }
  function bind(buffer, location) {
    if (location < 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
  }
  function resize() {
    if (gl) {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas.width = Math.round(stage.clientWidth * dpr);
      canvas.height = Math.round(stage.clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    measure();
  }
  function draw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(snowProgram);
    bind(snowBuffer, snowUniforms.seed);
    gl.uniform1f(snowUniforms.time, elapsed); gl.uniform1f(snowUniforms.dpr, dpr);
    gl.drawArrays(gl.POINTS, 0, 210);
    gl.useProgram(program);
    for (const { buffer, location } of Object.values(attributes)) bind(buffer, location);
    gl.uniform1f(uniforms.progress, progress); gl.uniform1f(uniforms.time, elapsed);
    gl.uniform1f(uniforms.aspect, stage.clientWidth / stage.clientHeight);
    gl.uniform1f(uniforms.mobile, window.innerWidth < 701 ? 1 : 0);
    gl.uniform1f(uniforms.short, stage.clientHeight < 700 ? 1 : 0);
    gl.uniform1f(uniforms.dpr, dpr);
    gl.uniform1f(uniforms.pointerX, paused ? 0 : pointerX);
    gl.uniform1f(uniforms.pointerY, paused ? 0 : pointerY);
    gl.drawArrays(gl.POINTS, 0, count);
  }
  function render(now) {
    frame = 0;
    if (!visible || document.hidden || reduced.matches) return;
    frame = requestAnimationFrame(render);
    if (now - previous < 30) return;
    const delta = Math.min((now - previous) / 1000, .06);
    previous = now;
    if (!paused) elapsed += delta;
    progress += (target - progress) * .16;
    if (Math.abs(progress - target) < .0005) progress = target;
    compose();
    if (gl) draw();
    if (paused && Math.abs(target - progress) < .0005) {
      cancelAnimationFrame(frame); frame = 0;
    }
  }
  function wake() {
    if (!frame && visible && !document.hidden && !reduced.matches) {
      previous = performance.now(); frame = requestAnimationFrame(render);
    }
  }
  function preferences() {
    document.body.classList.toggle('motion-enabled', !reduced.matches);
    motionButton.hidden = reduced.matches;
    if (!reduced.matches && !gl) initialize();
    if (reduced.matches && frame) { cancelAnimationFrame(frame); frame = 0; }
    resize(); progress = target; compose(); wake();
  }
  motionButton.addEventListener('click', () => {
    paused = !paused;
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.setAttribute('aria-label', paused ? 'Resume ambient animation' : 'Pause ambient animation');
    motionButton.querySelector('span').textContent = paused ? '▷' : 'Ⅱ';
    wake();
  });
  window.addEventListener('scroll', () => { measure(); wake(); }, { passive: true });
  window.addEventListener('resize', () => { resize(); wake(); }, { passive: true });
  stage.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse') {
      pointerX = (event.clientX / stage.clientWidth - .5) * .12;
      pointerY = (.5 - event.clientY / stage.clientHeight) * .05;
    }
  }, { passive: true });
  stage.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; });
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) wake();
    else if (frame) { cancelAnimationFrame(frame); frame = 0; }
  });
  observer.observe(journey);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && frame) { cancelAnimationFrame(frame); frame = 0; }
    else wake();
  });
  reduced.addEventListener('change', preferences);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); gl = null; canvas.hidden = true;
    document.body.classList.remove('has-webgl');
    canvas.dataset.renderer = 'svg-fallback';
  });
  canvas.addEventListener('webglcontextrestored', () => { initialize(); wake(); });
  preferences();
  function followSceneHash(instant = false) {
    const hashScene = { '#christmas-journey': 0, '#tree-scene': 1, '#gift-scene': 2 }[window.location.hash];
    if (hashScene !== undefined) jump(hashScene, instant);
  }
  window.addEventListener('hashchange', () => followSceneHash());
  // Wait for the browser's initial fragment positioning before applying the timeline position.
  const initialHash = () => requestAnimationFrame(() => requestAnimationFrame(() => followSceneHash(true)));
  if (document.readyState === 'complete') initialHash();
  else window.addEventListener('load', initialHash, { once: true });
})();
