/* ==========================================================================
   Worker da animação da hero: recebe o OffscreenCanvas da página e roda o
   mesmo núcleo de js/accretion-disc.js fora da thread principal.
   Mensagens recebidas: init, run, size, destroy.
   Mensagens enviadas: ready, live, lost, state, fail.
   ========================================================================== */
import { createRenderer } from './accretion-disc.js';

let renderer = null;

self.onmessage = (e) => {
  const m = e.data || {};
  if (m.type === 'init') {
    renderer = createRenderer(m.canvas, m.options, {
      live: () => self.postMessage({ type: 'live' }),
      lost: () => self.postMessage({ type: 'lost' }),
      state: (value) => self.postMessage({ type: 'state', value }),
      fail: () => { renderer = null; self.postMessage({ type: 'fail' }); },
    });
    if (!renderer) { self.postMessage({ type: 'fail' }); return; }
    self.postMessage({ type: 'ready' });
    renderer.setSize(m.w, m.h, m.dpr);
    renderer.setRunning(m.run);
    return;
  }
  if (!renderer) return;
  if (m.type === 'run') renderer.setRunning(m.value);
  else if (m.type === 'size') renderer.setSize(m.w, m.h, m.dpr);
  else if (m.type === 'destroy') { renderer.destroy(); renderer = null; }
};
