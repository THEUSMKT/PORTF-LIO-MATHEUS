/* ==========================================================================
   Hero, chão quadriculado em WebGL (sem bibliotecas).
   Um único shader desenha a grade em perspectiva, a névoa e o brilho dourado
   do horizonte. Só roda enquanto o hero está na tela e a aba está visível.
   Exporta init(canvas) → { destroy } ou null se o aparelho não suportar.
   ========================================================================== */

const VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `
#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uIntro;

void main(){
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec3 gold = vec3(0.784, 0.663, 0.416);

  float horizon = 0.03 + uMouse.y * 0.025;
  float d = horizon - p.y;
  vec3 col = vec3(0.0);

  // faixa de luz no horizonte, mais forte do lado da foto
  float side = 0.55 + 0.45 * smoothstep(-0.6, 0.5, p.x);
  col += gold * exp(-abs(d) * 18.0) * 0.42 * side;
  col += gold * exp(-abs(d) * 4.0) * 0.06;

  if (d > 0.0) {
    float z = 0.32 / d;
    vec2 g = vec2((p.x + uMouse.x * 0.08) * z, z) * 5.0;
    g.y += uTime * 0.55;

    vec2 w = fwidth(g);
    vec2 a = abs(fract(g + 0.5) - 0.5);
    vec2 l = 1.0 - smoothstep(w * 0.5, w * 1.6, a);
    float line = max(l.x, l.y);

    // névoa: some na distância e perto do horizonte, onde a grade fica densa
    float fog = exp(-z * 0.16) * smoothstep(0.0, 0.05, d);
    line *= fog * uIntro;

    // linhas próximas do mouse acendem um pouco mais
    float m = 1.0 + 0.6 * exp(-length(p - vec2(uMouse.x * 0.9, -0.25)) * 3.5);
    col += gold * line * 0.5 * m;
  }

  float alpha = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
  return s;
}

export function init(canvas) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'low-power' });
  if (!gl || !gl.getExtension('OES_standard_derivatives')) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  // um triângulo que cobre a tela inteira
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uMouse = gl.getUniformLocation(prog, 'uMouse');
  const uIntro = gl.getUniformLocation(prog, 'uIntro');

  let raf = 0, visible = true, start = 0, last = 0;
  let mx = 0, my = 0, cx = 0, cy = 0;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uRes, w, h);
  };

  const frame = (t) => {
    raf = 0;
    if (!visible || document.hidden) return;
    if (!start) start = t;
    // limita a ~45 quadros por segundo: a grade se move devagar e não precisa de mais
    if (t - last < 22) { raf = requestAnimationFrame(frame); return; }
    last = t;
    const s = (t - start) / 1000;
    cx += (mx - cx) * 0.05; cy += (my - cy) * 0.05;
    gl.uniform1f(uTime, s);
    gl.uniform2f(uMouse, cx, cy);
    gl.uniform1f(uIntro, Math.min(1, s / 1.6));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
  };
  const play = () => { if (!raf) raf = requestAnimationFrame(frame); };

  const onMove = (e) => { mx = e.clientX / window.innerWidth - 0.5; my = 0.5 - e.clientY / window.innerHeight; };
  const onVis = () => { if (!document.hidden) play(); };
  const io = new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) play(); });

  resize();
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('visibilitychange', onVis);
  io.observe(canvas);
  play();

  return {
    destroy() {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVis);
    }
  };
}
