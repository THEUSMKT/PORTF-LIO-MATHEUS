/* ==========================================================================
   Accretion Disc 4 (Originkit), adaptado para JavaScript/WebGL nativo.

   Os shaders, a geração determinística da nuvem e a câmera são os do código
   original. Mudanças para rodar numa página estática:
   - quantidade total de partículas explícita (sem o piso de 20.000);
   - DPR e quadros por segundo limitados por opção;
   - pausa real fora da tela e com a aba oculta (sem loop escondido);
   - perda e restauração de contexto, falha de shader e falta de WebGL
     devolvem null ou chamam onFallback, para a página mostrar a versão estática;
   - redução de carga única quando o aparelho não sustenta o ritmo;
   - destroy() libera buffers, shaders, programa, observers e listeners;
   - onde há OffscreenCanvas, o WebGL roda num Web Worker
     (js/accretion-disc-worker.js): criar o contexto e desenhar os quadros
     não ocupa a thread principal da página. Sem suporte, roda na própria
     página; sem WebGL, fica a versão estática.

   Uso: const fx = initAccretionDisc(host, opções)  → { destroy, pause, resume } ou null
   ========================================================================== */

const TAU = Math.PI * 2;
const ROUT = 100;
const FOV_DEG = 34;
const FOCAL = 1 / Math.tan((FOV_DEG * Math.PI) / 180 / 2);
const RIN_VAL = 24;
const THICKNESS = 2.4;
const WIND = 3.40;
const ARM_SHARPNESS = 2.6;
const ARM_PULL = 0.45;
const ARM_SPIN = 0.06;
const JET_FLOW = 0.09;
const JET_HELIX = 0.0055;
const JET_SHARE = 0.28;
const FOCUS_MULT = 1.75;
const HALO = 1.7;
const ORBIT_REF = 0.449;
const DOT_REF = 0.16;
const BLUR_REF = 0.64;
const TIME_WRAP = 1e5;

const PARTICLE_VERT = `
precision highp float;

attribute vec4 aSeed;
attribute float aKind;

uniform float uTime;
uniform float uTilt;
uniform float uDist;
uniform float uAspect;
uniform float uHalfH;
uniform float uDotSize;
uniform float uBlur;
uniform float uScatter;
uniform float uArms;
uniform float uJetAmount;
uniform float uJetLen;
uniform float uJetSpread;
uniform float uMaxPoint;

varying float vAlpha;
varying float vRamp;

const float FOCAL = ${FOCAL.toFixed(6)};
const float ROUT = ${ROUT.toFixed(1)};
const float WIND = ${WIND.toFixed(3)};
const float THICKNESS = ${THICKNESS.toFixed(2)};
const float ORBIT = ${ORBIT_REF.toFixed(4)};

void kill() {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vAlpha = 0.0;
    vRamp = 0.0;
}

void main() {
    float rIn = ${RIN_VAL.toFixed(1)};
    vec3 p;
    float bright;
    float ramp;

    if (aKind == 0.0) {
        float r = sqrt(mix(rIn * rIn, ROUT * ROUT, aSeed.x));
        float f = clamp((r - rIn) / max(ROUT - rIn, 1e-3), 0.0, 1.0);

        float th = aSeed.y + ORBIT * pow(rIn / r, 1.5) * uTime;

        float armAngle = uArms * (th - WIND * log(r / rIn))
                       - ${ARM_SPIN.toFixed(3)} * uTime * min(uArms, 1.0);
        th -= ${ARM_PULL.toFixed(2)} * sin(armAngle) / max(uArms, 1.0);
        float arm = pow(0.5 + 0.5 * cos(armAngle), ${ARM_SHARPNESS.toFixed(1)});

        float flare = 0.30 + 0.70 * pow(f, 1.2);
        float y = aSeed.z * THICKNESS * uScatter * flare;
        p = vec3(r * cos(th), y, r * sin(th));

        float radial = smoothstep(0.0, 0.06, f) * (1.0 - smoothstep(0.45, 1.0, f));
        radial *= 1.0 + 1.4 * exp(-pow((f - 0.32) / 0.20, 2.0));

        float farSide = 0.5 - 0.5 * (p.z / max(r, 1e-3));

        bright = radial * (0.34 + 0.75 * arm) * mix(0.62, 1.0, farSide) * 1.45;
        ramp = clamp((1.0 - f) * 0.55 + arm * 0.55, 0.0, 1.0);
    } else {
        if (aSeed.w > uJetAmount) { kill(); return; }

        float u = fract(aSeed.x + ${JET_FLOW.toFixed(3)} * uTime);
        float climb = pow(u, 1.35) * uJetLen;
        float cone = tan(uJetSpread) * climb * (0.30 + 0.70 * u) + ${RIN_VAL.toFixed(1)} * 0.35;
        float rr = aSeed.z * cone;
        float az = aSeed.y + climb * ${JET_HELIX.toFixed(4)};
        p = vec3(rr * cos(az), aKind * climb, rr * sin(az));

        bright = mix(1.0, 0.20, smoothstep(0.0, 1.0, u)) * (0.28 + 0.72 * (1.0 - aSeed.z)) * 1.75;
        ramp = 0.30 + 0.40 * (1.0 - u);
    }

    float c = cos(uTilt);
    float s = sin(uTilt);
    vec3 camPos = vec3(0.0, uDist * s, uDist * c);
    vec3 rel = p - camPos;
    vec3 q = vec3(rel.x, c * rel.y - s * rel.z, s * rel.y + c * rel.z);
    float depth = -q.z;
    if (depth < 1.0) { kill(); return; }

    gl_Position = vec4(q.x * FOCAL / (depth * uAspect), q.y * FOCAL / depth, 0.0, 1.0);

    float ppw = FOCAL * uHalfH / depth;
    float focusD = uDist * ${FOCUS_MULT.toFixed(2)};
    float coc = uBlur * max(0.0, focusD - depth) / focusD;
    float px = (uDotSize + coc) * ppw * ${HALO.toFixed(2)};

    vAlpha = bright * pow(uDotSize / max(uDotSize + coc, 1e-5), 1.6);
    float optical = px / ${HALO.toFixed(2)};
    if (optical < 1.0) vAlpha *= optical * optical;
    vRamp = ramp;
    gl_PointSize = clamp(px, 1.0, uMaxPoint);
}
`;

const PARTICLE_FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec3 uBase;
uniform vec3 uAccent;
uniform float uGain;

varying float vAlpha;
varying float vRamp;

void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r2 = dot(d, d) * 4.0;
    if (r2 > 1.0) discard;
    float core = max(0.0, exp(-r2 * 9.25) - 0.0000961);
    float skirt = max(0.0, exp(-r2 * 1.80) - 0.165299);
    float g = core + 0.30 * skirt;
    float e = g * vAlpha * uGain;
    vec3 col = mix(uBase, uAccent, vRamp);
    gl_FragColor = vec4(col * e, e);
}
`;

const UNIFORMS = ['uTime', 'uTilt', 'uDist', 'uAspect', 'uHalfH', 'uDotSize', 'uBlur', 'uScatter', 'uArms',
  'uJetAmount', 'uJetLen', 'uJetSpread', 'uMaxPoint', 'uBase', 'uAccent', 'uGain'];

// Valores do preset exportado (field, disc e jets do componente base), com as cores da nova identidade.
const DEFAULTS = {
  baseColor: '#2563EB',
  accentColor: '#67E8F9',
  count: 30000,          // total de partículas (disco + jatos)
  minCount: 6000,        // piso ao reduzir a carga
  dotSize: 135,          // percentual da fórmula original, não pixels
  speed: 32,
  distance: 228,
  fitPower: 0.55,        // afasta a câmera em hosts mais altos que largos, para o disco não ser cortado
  scatter: 300,
  blur: 0,
  tilt: 13,
  arms: 0,
  jetAmount: 100,
  jetLength: 102,
  jetSpread: 0,
  intensity: 1,
  dprMax: 1.5,
  fps: 60,
  adaptive: true,
  worker: true,          // false força a renderização na thread principal
  onFallback: null,
};

function parseColor(input) {
  const s = String(input || '').trim();
  const rgb = s.match(/rgba?\(([^)]+)\)/i);
  if (rgb) {
    const p = rgb[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat);
    return [(p[0] || 0) / 255, (p[1] || 0) / 255, (p[2] || 0) / 255];
  }
  let hx = s.replace('#', '');
  if (hx.length === 3 || hx.length === 4) hx = hx.split('').map((ch) => ch + ch).join('');
  hx = hx.padEnd(6, '0');
  const v = (i) => { const n = parseInt(hx.slice(i, i + 2), 16); return Number.isFinite(n) ? n / 255 : 0; };
  return [v(0), v(2), v(4)];
}

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rnd) {
  const u1 = Math.max(1e-9, rnd());
  const u2 = rnd();
  const g = Math.sqrt(-2 * Math.log(u1)) * Math.cos(TAU * u2);
  return Math.max(-3, Math.min(3, g));
}

function buildCloud(count) {
  const seed = new Float32Array(count * 4);
  const kind = new Float32Array(count);
  const rnd = mulberry32(0x9e3779b9);
  for (let i = 0; i < count; i++) {
    const o = i * 4;
    if (rnd() < JET_SHARE) {
      seed[o] = rnd();
      seed[o + 1] = rnd() * TAU;
      seed[o + 2] = Math.sqrt(rnd());
      seed[o + 3] = rnd();
      kind[i] = rnd() < 0.5 ? 1 : -1;
    } else {
      seed[o] = rnd();
      seed[o + 1] = rnd() * TAU;
      seed[o + 2] = gauss(rnd);
      seed[o + 3] = rnd();
      kind[i] = 0;
    }
  }
  return { seed, kind };
}

function compile(gl, type, src, check) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  // com compilação paralela o status só é lido no fim, para não travar esperando o driver
  if (check && !gl.getShaderParameter(sh, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

/* ── Núcleo de renderização ───────────────────────────────────────────────
   Não usa DOM: recebe um <canvas> ou um OffscreenCanvas e roda igual na página
   ou num Worker. hooks: live() no primeiro quadro, state('running'|'paused'),
   fail() quando desiste depois de iniciado. Devolve null se não conseguir começar. */
export function createRenderer(canvas, options, hooks = {}) {
  const o = Object.assign({}, DEFAULTS, options);
  let gl = null;
  try {
    gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: false, depth: false, stencil: false });
  } catch (e) { gl = null; }
  if (!gl) return null;

  const scope = typeof self !== 'undefined' ? self : globalThis;
  const raf = typeof scope.requestAnimationFrame === 'function'
    ? scope.requestAnimationFrame.bind(scope)
    : (cb) => setTimeout(() => cb(performance.now()), 1000 / o.fps);
  const caf = typeof scope.cancelAnimationFrame === 'function' ? scope.cancelAnimationFrame.bind(scope) : clearTimeout;

  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const base = parseColor(o.baseColor);
  const accent = parseColor(o.accentColor);
  let count = Math.max(o.minCount, Math.round(o.count));

  let res = null;
  let starting = true;
  let destroyed = false;
  let lost = false;
  let failed = false;
  let frameId = 0;
  let wantRun = false;
  let lastDraw = 0;
  let t = 0;
  let cssW = 1, cssH = 1, dpr = 1;
  let sizeDirty = true;
  let bw = 1, bh = 1;
  let shownLive = false;

  function freeResources() {
    if (!res || gl.isContextLost()) { res = null; return; }
    gl.deleteBuffer(res.seedBuf);
    gl.deleteBuffer(res.kindBuf);
    gl.detachShader(res.prog, res.vs);
    gl.detachShader(res.prog, res.fs);
    gl.deleteShader(res.vs);
    gl.deleteShader(res.fs);
    gl.deleteProgram(res.prog);
    res = null;
  }

  function upload(n) {
    const { seed, kind } = buildCloud(n);
    gl.bindBuffer(gl.ARRAY_BUFFER, res.seedBuf);
    gl.bufferData(gl.ARRAY_BUFFER, seed, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, res.kindBuf);
    gl.bufferData(gl.ARRAY_BUFFER, kind, gl.STATIC_DRAW);
    res.built = n;
  }

  /* Compila e liga os shaders. Com KHR_parallel_shader_compile a espera acontece
     entre quadros; done(ok) é chamado no fim. */
  let setupToken = 0;
  function setup(done) {
    const token = ++setupToken;
    const vs = compile(gl, gl.VERTEX_SHADER, PARTICLE_VERT, !parallel);
    const fs = compile(gl, gl.FRAGMENT_SHADER, PARTICLE_FRAG, !parallel);
    if (!vs || !fs) { if (vs) gl.deleteShader(vs); if (fs) gl.deleteShader(fs); done(false); return; }
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    const drop = () => { if (!gl.isContextLost()) { gl.deleteProgram(prog); gl.deleteShader(vs); gl.deleteShader(fs); } };
    const wait = () => {
      if (token !== setupToken || destroyed || failed || gl.isContextLost()) { drop(); return; }
      if (parallel && !gl.getProgramParameter(prog, parallel.COMPLETION_STATUS_KHR)) { raf(wait); return; }
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { drop(); done(false); return; }
      finish(prog, vs, fs);
      done(true);
    };
    wait();
  }

  function finish(prog, vs, fs) {
    const u = {};
    UNIFORMS.forEach((name) => { u[name] = gl.getUniformLocation(prog, name); });
    res = {
      prog, vs, fs, u,
      aSeed: gl.getAttribLocation(prog, 'aSeed'),
      aKind: gl.getAttribLocation(prog, 'aKind'),
      seedBuf: gl.createBuffer(),
      kindBuf: gl.createBuffer(),
      built: 0,
    };
    upload(count);

    const range = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
    gl.useProgram(prog);
    gl.uniform1f(u.uMaxPoint, Math.min(96, range && range[1] ? range[1] : 64));
    gl.uniform3fv(u.uBase, base);
    gl.uniform3fv(u.uAccent, accent);
    gl.uniform1f(u.uGain, o.intensity);
    gl.uniform1f(u.uTilt, (o.tilt * Math.PI) / 180);
    gl.uniform1f(u.uDotSize, (DOT_REF * o.dotSize) / 100);
    gl.uniform1f(u.uBlur, (BLUR_REF * o.blur) / 100);
    gl.uniform1f(u.uScatter, o.scatter / 100);
    gl.uniform1f(u.uArms, o.arms);
    gl.uniform1f(u.uJetAmount, o.jetAmount / 100);
    gl.uniform1f(u.uJetLen, (o.jetLength / 100) * ROUT);
    gl.uniform1f(u.uJetSpread, (o.jetSpread * Math.PI) / 180);

    gl.bindBuffer(gl.ARRAY_BUFFER, res.seedBuf);
    gl.enableVertexAttribArray(res.aSeed);
    gl.vertexAttribPointer(res.aSeed, 4, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, res.kindBuf);
    gl.enableVertexAttribArray(res.aKind);
    gl.vertexAttribPointer(res.aKind, 1, gl.FLOAT, false, 0, 0);

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.clearColor(0, 0, 0, 0);
    sizeDirty = true;
  }

  function applySize() {
    sizeDirty = false;
    const w = Math.max(1, Math.round(cssW * dpr));
    const h = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    bw = w; bh = h;
    gl.viewport(0, 0, w, h);
    const aspect = bw / Math.max(bh, 1);
    gl.uniform1f(res.u.uAspect, aspect);
    gl.uniform1f(res.u.uHalfH, bh * 0.5);
    gl.uniform1f(res.u.uDist, aspect < 1 ? o.distance * Math.pow(1 / aspect, o.fitPower) : o.distance);
  }

  function draw() {
    if (sizeDirty) applySize();
    gl.uniform1f(res.u.uTime, t);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, res.built);
  }

  /* Monitor de desempenho: depois de um aquecimento, mede os intervalos entre
     quadros desenhados. Se a mediana fica lenta, reduz a quantidade (no máximo
     duas vezes) e, se ainda assim não der, desiste para a versão estática.
     Nunca aumenta a carga de volta. */
  const target = 1000 / o.fps;
  // ms: abaixo de ~22 fps (alvo 60) ou ~16 fps (alvo 30). Tolera telas limitadas a 30 Hz em modo de economia.
  const slowLimit = o.fps >= 50 ? 45 : 62;
  let samples = [];
  let warm = 0;
  let downgrades = 0;
  function monitor(interval) {
    if (!o.adaptive) return;
    if (warm < 30) { warm++; return; }
    samples.push(interval);
    if (samples.length < 90) return;
    samples.sort((a, b) => a - b);
    const median = samples[samples.length >> 1];
    samples = [];
    warm = 0;
    if (median <= slowLimit) return;
    if (downgrades < 2 && count > o.minCount) {
      downgrades++;
      count = Math.max(o.minCount, Math.round(count * 0.55));
      upload(count);
    } else {
      fail();
    }
  }

  function frame(now) {
    frameId = raf(frame);
    if (lastDraw && now - lastDraw < target - 2) return;
    const interval = lastDraw ? now - lastDraw : 0;
    const dt = lastDraw ? Math.min(0.1, interval / 1000) : 0;
    lastDraw = now;
    t = (t + dt * (o.speed / 50)) % TIME_WRAP;
    draw();
    if (!shownLive) { shownLive = true; if (hooks.live) hooks.live(); }
    if (interval) monitor(interval);
  }

  function canRun() { return wantRun && !lost && !failed && !destroyed && !!res; }
  function start() {
    if (frameId || !canRun()) return;
    lastDraw = 0; warm = 0; samples = [];
    frameId = raf(frame);
    if (hooks.state) hooks.state('running');
  }
  function stop() {
    if (frameId) { caf(frameId); frameId = 0; }
    if (!failed && !destroyed && hooks.state) hooks.state('paused');
  }
  function sync() { canRun() ? start() : stop(); }

  function teardown() {
    canvas.removeEventListener('webglcontextlost', onLost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
    freeResources();
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose && !gl.isContextLost()) lose.loseContext();
  }

  function fail() {
    if (failed) return;
    failed = true;
    stop();
    teardown();
    if (!starting && hooks.fail) hooks.fail();
  }

  function onLost(e) { e.preventDefault(); lost = true; setupToken++; stop(); res = null; shownLive = false; if (hooks.lost) hooks.lost(); }
  function onRestored() {
    lost = false;
    if (destroyed || failed) return;
    setup((ok) => (ok ? sync() : fail()));
  }
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  setup((ok) => (ok ? sync() : fail()));
  starting = false;
  if (failed) return null;

  return {
    setRunning(v) { wantRun = !!v; sync(); },
    setSize(w, h, ratio) { cssW = Math.max(1, w); cssH = Math.max(1, h); dpr = Math.min(ratio || 1, o.dprMax); sizeDirty = true; },
    destroy() { if (destroyed) return; destroyed = true; stop(); teardown(); },
    get particles() { return res ? res.built : 0; },
  };
}

/* ── Controle na página ───────────────────────────────────────────────────
   Cria o canvas no host, escolhe Worker ou thread principal, acompanha
   visibilidade, aba e tamanho, e cai na versão estática quando preciso. */
export function initAccretionDisc(host, options = {}) {
  const o = Object.assign({}, DEFAULTS, options);
  const onFallback = typeof o.onFallback === 'function' ? o.onFallback : null;
  delete o.onFallback;

  const makeCanvas = () => {
    const c = document.createElement('canvas');
    c.className = 'disc__canvas';
    c.setAttribute('aria-hidden', 'true');
    host.appendChild(c);
    return c;
  };
  let canvas = makeCanvas();
  let mode = null;
  let worker = null;
  let core = null;
  let failed = false;
  let destroyed = false;
  let paused = false;
  let visible = false;
  let cssW = Math.max(1, host.clientWidth);
  let cssH = Math.max(1, host.clientHeight);
  const ratio = () => window.devicePixelRatio || 1;
  const wantRun = () => visible && !paused && !document.hidden;

  const hooks = {
    live() { if (!failed && !destroyed) host.classList.add('is-live'); },
    lost() { host.classList.remove('is-live'); },
    state(s) { if (!failed && !destroyed) host.dataset.discState = s; },
    fail() { fallback(); },
  };

  function pushRun() {
    if (mode === 'worker' && worker) worker.postMessage({ type: 'run', value: wantRun() });
    else if (core) core.setRunning(wantRun());
  }
  function pushSize() {
    if (mode === 'worker' && worker) worker.postMessage({ type: 'size', w: cssW, h: cssH, dpr: ratio() });
    else if (core) core.setSize(cssW, cssH, ratio());
  }

  function startMain() {
    mode = 'main';
    core = createRenderer(canvas, o, hooks);
    if (!core) return false;
    core.setSize(cssW, cssH, ratio());
    core.setRunning(wantRun());
    return true;
  }

  function startWorker() {
    let offscreen;
    try {
      offscreen = canvas.transferControlToOffscreen();
      worker = new Worker(new URL('./accretion-disc-worker.js', import.meta.url), { type: 'module' });
    } catch (e) {
      if (worker) worker.terminate();
      worker = null;
      // o canvas já transferido não aceita contexto na página: troca por um novo
      if (offscreen) { canvas.remove(); canvas = makeCanvas(); }
      return false;
    }
    mode = 'worker';
    let ready = false;
    // antes de o Worker confirmar o contexto, uma falha tenta a thread principal; depois, vai para a versão estática
    const onProblem = () => (ready ? fallback() : retryOnMain());
    worker.onmessage = (e) => {
      const m = e.data || {};
      if (m.type === 'ready') ready = true;
      else if (m.type === 'live') hooks.live();
      else if (m.type === 'lost') hooks.lost();
      else if (m.type === 'state') hooks.state(m.value);
      else if (m.type === 'fail') onProblem();
    };
    worker.onerror = (e) => { if (e && e.preventDefault) e.preventDefault(); onProblem(); };
    worker.postMessage({ type: 'init', canvas: offscreen, options: o, w: cssW, h: cssH, dpr: ratio(), run: wantRun() }, [offscreen]);
    return true;
  }

  function retryOnMain() {
    if (failed || destroyed) return;
    if (worker) { worker.terminate(); worker = null; }
    canvas.remove();
    canvas = makeCanvas();
    host.classList.remove('is-live');
    if (!startMain()) fallback();
  }

  const ro = new ResizeObserver((entries) => {
    const box = entries[0].contentRect;
    cssW = Math.max(1, box.width);
    cssH = Math.max(1, box.height);
    pushSize();
  });
  const io = new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; pushRun(); });
  const onVisibility = () => pushRun();

  let tornDown = false;
  function teardown() {
    if (tornDown) return;
    tornDown = true;
    ro.disconnect();
    io.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    if (worker) { worker.postMessage({ type: 'destroy' }); worker.terminate(); worker = null; }
    if (core) { core.destroy(); core = null; }
    canvas.remove();
  }

  function fallback() {
    if (failed || destroyed) return;
    failed = true;
    host.classList.remove('is-live');
    host.dataset.discState = 'fallback';
    teardown();
    if (onFallback) onFallback();
  }

  const canUseWorker = o.worker !== false && typeof Worker !== 'undefined'
    && typeof OffscreenCanvas !== 'undefined' && typeof canvas.transferControlToOffscreen === 'function';
  if (!(canUseWorker && startWorker())) {
    if (mode !== 'main' && !startMain()) { canvas.remove(); return null; }
  }

  document.addEventListener('visibilitychange', onVisibility);
  ro.observe(host);
  io.observe(host);

  return {
    pause() { paused = true; pushRun(); },
    resume() { paused = false; pushRun(); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      host.classList.remove('is-live');
      delete host.dataset.discState;
      teardown();
    },
    get mode() { return mode; },
  };
}
