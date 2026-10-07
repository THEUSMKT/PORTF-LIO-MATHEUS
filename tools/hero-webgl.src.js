/* ==========================================================================
   Hero WebGL — campo de partículas douradas + grade em perspectiva com neblina.
   Fonte do arquivo js/vendor/hero-webgl.js (gerado com: npm run build:webgl
   dentro de tools/). Exporta init(canvas) → { destroy }.
   ========================================================================== */
import {
  WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, BufferAttribute,
  Points, ShaderMaterial, AdditiveBlending, LineSegments, Color, Vector2
} from 'three';

export function init(canvas, opts = {}) {
  const mobile = !!opts.mobile;
  const renderer = new WebGLRenderer({ canvas, antialias: !mobile, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(60, 1, 0.1, 120);
  camera.position.set(0, 0.4, 9);

  const gold = new Color('#C8A96A');
  const mouse = new Vector2(0, 0);       // -1..1
  const mouseLerp = new Vector2(0, 0);

  /* ── Partículas ─────────────────────────────────────────────────────── */
  const COUNT = mobile ? 900 : 2200;
  const pos = new Float32Array(COUNT * 3);
  const seed = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 26;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
    pos[i * 3 + 2] = -Math.random() * 40 + 6;
    seed[i] = Math.random();
  }
  const pGeo = new BufferGeometry();
  pGeo.setAttribute('position', new BufferAttribute(pos, 3));
  pGeo.setAttribute('aSeed', new BufferAttribute(seed, 1));

  const pMat = new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uMouse: { value: new Vector2() },
      uColor: { value: gold },
      uScale: { value: renderer.getPixelRatio() },
    },
    vertexShader: /* glsl */`
      attribute float aSeed;
      uniform float uTime; uniform vec2 uMouse; uniform float uScale;
      varying float vAlpha;
      void main(){
        vec3 p = position;
        p.y += sin(uTime * .25 + aSeed * 6.283) * .35;
        p.x += cos(uTime * .18 + aSeed * 12.0) * .25;
        // repulsão suave ao redor do mouse (projetado no plano da partícula)
        float depth = clamp((6.0 - p.z) / 46.0, 0.0, 1.0);
        vec2 m = uMouse * vec2(9.0, 5.0) * (1.0 + depth * 3.5);
        vec2 d = p.xy - m;
        float f = smoothstep(2.6, 0.0, length(d));
        p.xy += normalize(d + 0.0001) * f * 1.1;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float tw = .55 + .45 * sin(uTime * (0.6 + aSeed) + aSeed * 40.0);
        gl_PointSize = (2.2 + aSeed * 3.2) * uScale * (12.0 / -mv.z);
        vAlpha = tw * smoothstep(42.0, 6.0, -mv.z) * (0.35 + f * .65 + .25);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; varying float vAlpha;
      void main(){
        float d = length(gl_PointCoord - .5);
        float a = smoothstep(.5, .0, d);
        a *= a;
        gl_FragColor = vec4(uColor * (1.0 + a * .6), a * vAlpha);
      }`,
  });
  const points = new Points(pGeo, pMat);
  scene.add(points);

  /* ── Grade em perspectiva (wireframe) com neblina ───────────────────── */
  const SIZE = 60, STEP = 2;
  const lines = [];
  for (let x = -SIZE / 2; x <= SIZE / 2; x += STEP) lines.push(x, 0, -SIZE, x, 0, 8);
  for (let z = -SIZE; z <= 8; z += STEP) lines.push(-SIZE / 2, 0, z, SIZE / 2, 0, z);
  const gGeo = new BufferGeometry();
  gGeo.setAttribute('position', new BufferAttribute(new Float32Array(lines), 3));
  const gMat = new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uColor: { value: gold }, uTime: { value: 0 } },
    vertexShader: /* glsl */`
      uniform float uTime; varying float vFog; varying float vZ;
      void main(){
        vec3 p = position;
        p.z += mod(uTime * .6, 2.0);           // a grade desliza devagar em direção à câmera
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vFog = smoothstep(46.0, 4.0, -mv.z);
        vZ = p.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; varying float vFog; varying float vZ;
      void main(){
        float edge = smoothstep(8.0, 2.0, vZ);
        gl_FragColor = vec4(uColor, .22 * vFog * edge);
      }`,
  });
  const grid = new LineSegments(gGeo, gMat);
  grid.position.y = -3.2;
  scene.add(grid);

  /* ── Loop ───────────────────────────────────────────────────────────── */
  let raf = 0, running = false, t0 = performance.now(), scrollY = 0;

  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const t = (now - t0) / 1000;
    mouseLerp.lerp(mouse, 0.05);
    pMat.uniforms.uTime.value = t;
    pMat.uniforms.uMouse.value.copy(mouseLerp);
    gMat.uniforms.uTime.value = t;
    // parallax de câmera (mouse) + leve movimento com a rolagem
    const sy = Math.min(scrollY / (window.innerHeight || 1), 1.2);
    camera.position.x = mouseLerp.x * 0.8;
    camera.position.y = 0.4 + mouseLerp.y * 0.45 - sy * 1.4;
    camera.position.z = 9 - sy * 2.2;
    camera.lookAt(0, -sy * 0.8, -6);
    points.rotation.y = t * 0.012;
    renderer.render(scene, camera);
  }
  function start() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  const onMove = (e) => {
    mouse.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
  };
  const onScroll = () => { scrollY = window.scrollY; };
  const onVis = () => { document.hidden ? stop() : (visible && start()); };

  let visible = true;
  const io = new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    visible && !document.hidden ? start() : stop();
  });
  io.observe(canvas);

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVis);
  resize();
  onScroll();
  start();

  return {
    destroy() {
      stop(); io.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVis);
      pGeo.dispose(); pMat.dispose(); gGeo.dispose(); gMat.dispose(); renderer.dispose();
    },
  };
}
