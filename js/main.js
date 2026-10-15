/* ==========================================================================
   Matheus Beck, Criação de Sites Profissionais · main.js
   Aprimoramento progressivo: sem este arquivo a página continua legível,
   a faixa de projetos rola e os links do WhatsApp funcionam.
   ========================================================================== */
(function () {
  'use strict';
  window.__mbReady = true;

  var SCRIPT_SRC = document.currentScript && document.currentScript.src;
  var WA = 'https://wa.me/5551981947979';
  var FORM_INTRO = 'Olá, Matheus! Quero conversar sobre um site profissional.';
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ── Cabeçalho: fundo ao rolar, menu mobile, link ativo ─────────────── */
  var header = $('.header');
  var toggle = $('.nav-toggle');
  function setMenu(open) {
    header.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  }
  toggle.addEventListener('click', function () {
    var open = toggle.getAttribute('aria-expanded') !== 'true';
    setMenu(open);
    if (open) { var first = $('.nav__links a'); if (first) first.focus(); }
  });
  $$('.nav a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && header.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
  });
  window.matchMedia('(min-width: 960px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });

  var sentinel = $('.top-sentinel');
  new IntersectionObserver(function (en) { header.classList.toggle('is-scrolled', !en[0].isIntersecting); }).observe(sentinel);

  var navLinks = $$('.nav__links a');
  var activeIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      navLinks.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('href') === '#' + en.target.id); });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(function (s) { activeIO.observe(s); });

  /* ── Entradas curtas ao rolar (em sequência dentro de cada grupo) ───── */
  ['.bento', '.solutions__list', '.steps'].forEach(function (sel) {
    $$(sel + ' > .reveal').forEach(function (el, k) { el.style.setProperty('--d', (k * 0.06) + 's'); });
  });
  var revealIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('is-in'); revealIO.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach(function (el) { revealIO.observe(el); });

  var year = $('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ── Faixa de projetos ──────────────────────────────────────────────────
     Rolagem nativa com scroll-snap. O script só acrescenta os botões, a
     barra de progresso, o arraste com mouse, as setas do teclado e a
     moldura de luz. Os listeners de toque e rolagem só observam: nada de
     preventDefault, touch-action ou captura de ponteiro, então a rolagem
     horizontal, a vertical, a inércia e a pinça continuam com o navegador. */
  var carousel = $('[data-carousel]');
  if (carousel) {
    var track = $('.carousel__track', carousel);
    var items = $$('.carousel__item', track);
    var nav = $('[data-carousel-nav]');
    var buttons = $$('button', nav);
    var progress = $('[data-carousel-progress]', carousel);
    var behavior = function () { return mqReduce.matches ? 'auto' : 'smooth'; };

    // medidas reaproveitadas entre quadros; refeitas quando a faixa ou os cards mudam de tamanho
    var geo = { step: 0, starts: [], centers: [] };
    function measure() {
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      geo.step = items[0].offsetWidth + gap;
      // posição de rolagem em que cada card encosta no alinhamento do container (o mesmo ponto do snap)
      geo.starts = items.map(function (li) { return li.offsetLeft - items[0].offsetLeft; });
      geo.centers = items.map(function (li) { return li.offsetLeft + li.offsetWidth / 2; });
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        track.scrollBy({ left: Number(btn.getAttribute('data-step')) * geo.step, behavior: behavior() });
      });
    });
    function setDisabled(btn, off, other) {
      if (btn.disabled === off) return;
      // se o botão em foco ficar desabilitado, o foco passa para o outro
      if (off && document.activeElement === btn && !other.disabled) other.focus();
      btn.disabled = off;
    }

    /* Moldura de luz: o card sob o dedo ou o mouse fica aceso (.is-lit) com o
       ponto de luz na posição do contato; durante a rolagem, o card mais
       perto do centro da área visível ganha só o contorno (.is-current). */
    var lit = null;          // card aceso pelo ponteiro
    var aimId = null;        // ponteiro acompanhado; vira null quando o navegador assume a rolagem
    var aim = null;          // último ponto do ponteiro, em coordenadas da janela
    var aimDirty = false;
    var current = null;      // card predominante durante a rolagem
    var scrolling = false, settleTimer = 0, queued = false, stripDirty = true;
    var drag = null, suppressClick = false;  // arraste com mouse (mais abaixo)
    var landing = null;                       // card em que a faixa vai assentar depois do arraste

    function schedule() { if (!queued) { queued = true; requestAnimationFrame(tick); } }
    // um único passo por quadro: primeiro as leituras, depois as escritas. Um movimento do
    // ponteiro sem rolagem só lê a posição do card aceso e escreve o ponto de luz.
    function tick() {
      queued = false;
      var strip = stripDirty;
      stripDirty = false;
      var x = 0, view = 0, max = 0;
      if (strip) { x = track.scrollLeft; view = track.clientWidth; max = track.scrollWidth - view; }
      var box = aimDirty && lit && aim && !mqReduce.matches ? lit.getBoundingClientRect() : null;
      aimDirty = false;

      if (strip) {
        var scrollable = max > 2;
        nav.hidden = !scrollable;
        progress.hidden = !scrollable;
        if (scrollable) {
          setDisabled(buttons[0], x <= 2, buttons[1]);
          setDisabled(buttons[1], x >= max - 2, buttons[0]);
          progress.style.setProperty('--p', (x / max).toFixed(4));
          progress.style.setProperty('--vis', (view / (max + view)).toFixed(4));
        }
        if (scrolling) setCurrent(nearest(x + view / 2));
        if (landing !== null && Math.abs(x - landing) < 1) land();
      }
      if (box) {
        lit.style.setProperty('--mx', (aim.x - box.left).toFixed(1) + 'px');
        lit.style.setProperty('--my', (aim.y - box.top).toFixed(1) + 'px');
      }
    }
    function nearest(center) {
      var best = 0;
      geo.centers.forEach(function (c, i) { if (Math.abs(c - center) < Math.abs(geo.centers[best] - center)) best = i; });
      return items[best].firstElementChild;
    }
    function setCurrent(card) {
      if (card === current) return;
      if (current) current.classList.remove('is-current');
      current = card;
      if (card) card.classList.add('is-current');
    }
    function light(card) {
      if (card === lit) return;
      if (lit) lit.classList.remove('is-lit');
      lit = card;
      if (card) card.classList.add('is-lit');
    }
    function pointAt(e) { aim = { x: e.clientX, y: e.clientY }; aimDirty = true; schedule(); }
    function release() { aimId = null; light(null); }
    // a faixa parou (scrollend ou, onde ele não existe, uma pausa curta sem eventos de rolagem)
    function settle() { clearTimeout(settleTimer); scrolling = false; setCurrent(null); land(); }
    // a faixa chegou ao card escolhido (ou a rolagem parou antes): o snap volta a valer
    function land() { if (landing === null) return; landing = null; carousel.classList.remove('is-settling'); }
    function stopAll() { release(); settle(); }

    track.addEventListener('scroll', function () {
      scrolling = true;
      stripDirty = true;
      schedule();
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settle, 160);
    }, { passive: true });
    // o Chrome dispara scrollend a cada passo do arraste com mouse; aí quem decide o fim é o timer
    track.addEventListener('scrollend', function () { if (!(drag && drag.moved)) settle(); }, { passive: true });

    track.addEventListener('pointerdown', function (e) {
      land();
      var card = e.target.closest('.project');
      if (!card || (e.pointerType === 'mouse' && e.button !== 0)) return;
      aimId = e.pointerId;
      light(card);
      pointAt(e);
    }, { passive: true });
    track.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'mouse') {
        // mouse: a luz segue o cursor, inclusive durante o arraste; no vão entre cards ela apaga
        var card = e.target.closest('.project');
        light(card);
        if (card) pointAt(e);
      } else if (e.pointerId === aimId) {
        pointAt(e);
      }
    }, { passive: true });
    track.addEventListener('pointerup', function (e) {
      if (e.pointerType !== 'mouse' && e.pointerId === aimId) release();
    }, { passive: true });
    // o navegador assumiu a rolagem: o ponto para de ser seguido, mas a luz fica no card,
    // que se move junto com o dedo, até o dedo sair da tela
    track.addEventListener('pointercancel', function (e) {
      if (e.pointerId !== aimId) return;
      aimId = null;
      if (e.pointerType !== 'touch') release();
    }, { passive: true });
    track.addEventListener('touchend', function (e) { if (!e.touches.length) release(); }, { passive: true });
    track.addEventListener('touchcancel', release, { passive: true });
    track.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') release(); }, { passive: true });
    // aba escondida, janela sem foco ou faixa fora da tela: nada fica aceso
    document.addEventListener('visibilitychange', function () { if (document.hidden) stopAll(); });
    window.addEventListener('blur', stopAll);
    new IntersectionObserver(function (en) { if (!en[0].isIntersecting) stopAll(); }).observe(carousel);

    var ro = new ResizeObserver(function () { measure(); stripDirty = true; schedule(); });
    ro.observe(track);
    ro.observe(items[0]);
    carousel.classList.add('is-ready');
    measure();
    tick();

    // o foco num card fora da área visível revela o card
    track.addEventListener('focusin', function (e) {
      var item = e.target.closest('.carousel__item');
      if (!item) return;
      var t = track.getBoundingClientRect(), r = item.getBoundingClientRect();
      if (r.left < t.left || r.right > t.right) item.scrollIntoView({ behavior: behavior(), block: 'nearest', inline: 'nearest' });
    });

    // setas do teclado só dentro da faixa: passam o foco para o card vizinho
    track.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var item = e.target.closest('.carousel__item');
      if (!item) return;
      var next = items[items.indexOf(item) + (e.key === 'ArrowRight' ? 1 : -1)];
      if (!next) return;
      e.preventDefault();
      $('.project__link', next).focus();
    });

    // arraste com mouse: só vira arraste depois de 6px; um arraste não abre o link.
    // Ao soltar, a faixa assenta no próximo card na direção do arraste (o mouse não tem inércia,
    // e com cards largos o snap mais próximo poderia devolver a faixa ao ponto de partida).
    function endDrag() {
      if (!drag) return;
      if (drag.moved) {
        suppressClick = true;
        setTimeout(function () { suppressClick = false; }, 60);
        var x = track.scrollLeft, max = track.scrollWidth - track.clientWidth, dir = x - drag.left;
        var target = dir > 0
          ? geo.starts.filter(function (v) { return v > x + 1; })[0]
          : geo.starts.filter(function (v) { return v < x - 1; }).pop();
        if (target === undefined) target = dir > 0 ? max : 0;
        target = Math.min(target, max);
        if (Math.abs(dir) > 40 && Math.abs(target - x) >= 1) {
          // o snap só volta quando a faixa chegar lá; ligado antes, ele puxaria para o card mais próximo
          landing = target;
          carousel.classList.add('is-settling');
          track.scrollTo({ left: target, behavior: behavior() });
        }
        carousel.classList.remove('is-dragging');
      }
      drag = null;
    }
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, left: track.scrollLeft, moved: false };
    });
    window.addEventListener('pointermove', function (e) {
      if (!drag) return;
      // botão solto fora da janela: encerra o arraste em vez de continuar seguindo o mouse
      if (!(e.buttons & 1)) { endDrag(); return; }
      var dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) < 6) return;
      if (!drag.moved) { drag.moved = true; carousel.classList.add('is-dragging'); }
      track.scrollLeft = drag.left - dx;
    }, { passive: true });
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    window.addEventListener('blur', endDrag);
    track.addEventListener('click', function (e) {
      if (suppressClick) { e.preventDefault(); e.stopPropagation(); suppressClick = false; }
    }, true);
    track.addEventListener('dragstart', function (e) { e.preventDefault(); });
  }

  /* ── WhatsApp flutuante: aparece longe do topo e some perto dos CTAs,
     da faixa de projetos e do formulário, para não cobri-los ─────────── */
  var float = $('.wa-float');
  if (float) {
    var avoid = $$('.hero__actions, .carousel, .contact__panel, .footer');
    var inView = new Set();
    var pastTop = false;
    var refresh = function () { float.classList.toggle('is-on', pastTop && inView.size === 0); };
    new IntersectionObserver(function (en) { pastTop = !en[0].isIntersecting; refresh(); }).observe(sentinel);
    var avoidIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.isIntersecting ? inView.add(en.target) : inView.delete(en.target); });
      refresh();
    });
    avoid.forEach(function (el) { avoidIO.observe(el); });
  }

  /* ── Formulário → WhatsApp com a mensagem preenchida ────────────────── */
  var form = $('#form-contato');
  if (form) {
    var fields = [
      { el: form.elements.nome, error: $('#f-nome-erro') },
      { el: form.elements.tipo, error: $('#f-tipo-erro') },
    ];
    var setError = function (f, on) {
      f.el.setAttribute('aria-invalid', String(on));
      f.error.hidden = !on;
    };
    fields.forEach(function (f) {
      var clear = function () { if (f.el.value.trim()) setError(f, false); };
      f.el.addEventListener('input', clear);
      f.el.addEventListener('change', clear);
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var invalid = fields.filter(function (f) { var bad = !f.el.value.trim(); setError(f, bad); return bad; });
      if (invalid.length) { invalid[0].el.focus(); return; }

      var empresa = form.elements.empresa.value.trim();
      var mensagem = form.elements.mensagem.value.trim();
      var lines = [FORM_INTRO, '', 'Nome: ' + form.elements.nome.value.trim()];
      if (empresa) lines.push('Empresa: ' + empresa);
      lines.push('Tipo de projeto: ' + form.elements.tipo.value);
      if (mensagem) lines.push('Mensagem: ' + mensagem);
      var url = WA + '?text=' + encodeURIComponent(lines.join('\n'));
      // abre no clique do visitante; se o navegador bloquear a aba, segue para o mesmo destino
      var win = window.open(url, '_blank');
      if (win) win.opener = null; else window.location.href = url;
    });
  }

  /* ── Animação da hero (Accretion Disc) ──────────────────────────────────
     Carrega depois que a página está pintada e o navegador fica ocioso.
     Movimento reduzido ou economia de dados: fica a versão estática e
     nenhum contexto WebGL é criado. A preferência é acompanhada ao vivo. */
  var discHost = $('[data-disc]');
  var fx = null, loading = false, gaveUp = false;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  // o enquadramento segue o layout da hero; a carga segue o tipo de aparelho
  var wideLayout = window.matchMedia('(min-width: 960px)');
  function discOptions() {
    var small = window.matchMedia('(max-width: 767.98px), (pointer: coarse)').matches;
    var lowEnd = (navigator.deviceMemory || 8) < 4 || (navigator.hardwareConcurrency || 8) < 4;
    // com menos partículas que o preset original, os pontos ficam um pouco maiores e mais claros
    var opts = small
      ? { count: lowEnd ? 6000 : 10000, minCount: 4000, dprMax: 1, fps: 30, dotSize: 165, intensity: 1.8 }
      : { count: lowEnd ? 20000 : 32000, minCount: 8000, dprMax: 1.5, fps: 60, dotSize: 150, intensity: 1.45 };
    opts.tilt = 16;
    if (wideLayout.matches) {
      // fundo de toda a hero, com o disco no centro-direita (mesma posição de --disc-x no CSS)
      opts.distance = 228; opts.shiftX = 0.36; opts.shiftY = 0;
    } else {
      // layout estreito: disco centralizado atrás do conteúdo. Em tela vertical a câmera chega mais
      // perto para ele ser percebido; em tablet deitado fica mais longe para não espalhar demais.
      var box = discHost.getBoundingClientRect();
      var portrait = box.width < box.height;
      opts.distance = portrait ? 165 : 235; opts.fitPower = 0.45; opts.shiftX = 0; opts.shiftY = -0.12;
      opts.intensity = small ? 1.5 : 1.3;
    }
    return opts;
  }
  function startDisc() {
    if (!discHost || fx || loading || gaveUp || saveData || mqReduce.matches || !SCRIPT_SRC) return;
    loading = true;
    import(new URL('accretion-disc.js', SCRIPT_SRC).href).then(function (m) {
      loading = false;
      if (fx || mqReduce.matches) return;
      var opts = discOptions();
      opts.onFallback = function () { fx = null; gaveUp = true; };
      fx = m.initAccretionDisc(discHost, opts);
      if (!fx) gaveUp = true;
    }).catch(function () { loading = false; gaveUp = true; });
  }
  function stopDisc() { if (fx) { fx.destroy(); fx = null; } }
  mqReduce.addEventListener('change', function () { mqReduce.matches ? stopDisc() : startDisc(); });
  // ao cruzar o breakpoint, recria a animação com o enquadramento certo (uma instância por vez)
  wideLayout.addEventListener('change', function () { if (fx) { stopDisc(); startDisc(); } });
  if (discHost) {
    // espera a página carregar e a fonte trocar, para não disputar com a pintura do título
    var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 300); };
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var boot = function () { fontsReady.then(function () { idle(startDisc, { timeout: 2000 }); }); };
    document.readyState === 'complete' ? boot() : window.addEventListener('load', boot);
  }
})();
