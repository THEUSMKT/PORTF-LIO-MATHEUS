/* ==========================================================================
   Matheus Beck — Portfólio · main.js
   Tudo é aprimoramento progressivo: sem este arquivo a página continua
   legível e clicável. GSAP/ScrollTrigger/Lenis são opcionais (classe no-gsap).
   ========================================================================== */
(function () {
  'use strict';
  window.__mbReady = true;

  var doc = document.documentElement;
  var SCRIPT_SRC = document.currentScript && document.currentScript.src;
  var mq = function (q) { return window.matchMedia(q); };
  var reduced = mq('(prefers-reduced-motion: reduce)').matches;
  var finePointer = mq('(hover: hover) and (pointer: fine)').matches;
  var isMobile = mq('(max-width: 899.98px)').matches;
  var conn = navigator.connection || {};
  var saveData = !!conn.saveData;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var WA = 'https://wa.me/5551981947979';
  var WA_DEFAULT = 'Olá Matheus! Vi seu portfólio e quero uma arte para minha empresa.';

  if (!hasGsap) doc.classList.add('no-gsap');

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ── Rolagem suave (Lenis) + ScrollTrigger ─────────────────────────── */
  var lenis = null;
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  if (window.Lenis && !reduced && finePointer) {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      (function loop(t) { lenis.raf(t); requestAnimationFrame(loop); })(performance.now());
    }
  }

  // âncoras internas passam pelo Lenis (com compensação da nav fixa)
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var target = $(id);
      if (!target) return;
      closeMenu();
      if (lenis) {
        e.preventDefault();
        lenis.scrollTo(target, { offset: id === '#topo' ? 0 : -72 });
        history.replaceState(null, '', id);
      }
    });
  });

  /* ── Nav: fundo ao rolar, menu mobile, link ativo ───────────────────── */
  var nav = $('.nav');
  var toggle = $('.nav__toggle');
  function closeMenu() {
    if (!nav.classList.contains('is-open')) return;
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menu');
  }
  toggle.addEventListener('click', function () {
    var open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    if (open) { var first = $('.nav__links a'); first && first.focus(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { closeMenu(); toggle.focus(); }
  });

  var navLinks = $$('.nav__links a');
  var activeIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      navLinks.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('href') === '#' + en.target.id); });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(function (s) { activeIO.observe(s); });

  /* ── Rolagem: nav, barra de progresso, glow, marquee ───────────────── */
  var bar = $('.progress__bar');
  var lastY = window.scrollY, velocity = 0, ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = window.scrollY;
      velocity = clamp(velocity + (y - lastY) * 0.25, -60, 60);
      lastY = y;
      nav.classList.toggle('is-scrolled', y > 40);
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Hero: título palavra por palavra, decode, parallax ─────────────── */
  var hero = $('.hero');
  var title = $('[data-words]');
  // no celular o título não é dividido: o texto já pintado é o LCP e não deve ser recriado
  if (title && !reduced && finePointer) {
    var i = 0;
    (function split(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement('span'); w.className = 'w';
            var inner = document.createElement('span'); inner.textContent = part;
            inner.style.setProperty('--i', i++);
            w.appendChild(inner); frag.appendChild(w);
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === 1) split(child);
      });
    })(title);
  }

  var decodeEl = $('[data-decode]');
  if (decodeEl && !reduced) {
    var finalText = decodeEl.textContent;
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#&/*+<>';
    var vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true');
    var real = document.createElement('span'); real.className = 'sr-only'; real.textContent = finalText;
    decodeEl.textContent = ''; decodeEl.appendChild(real); decodeEl.appendChild(vis);
    var start = null, DUR = 900;
    var step = function (t) {
      if (start === null) start = t;
      var p = clamp((t - start) / DUR, 0, 1), out = '';
      for (var k = 0; k < finalText.length; k++) {
        var c = finalText[k];
        out += (c === ' ' || k / finalText.length < p) ? c : chars[(Math.random() * chars.length) | 0];
      }
      vis.textContent = out;
      if (p < 1) requestAnimationFrame(step);
    };
    setTimeout(function () { requestAnimationFrame(step); }, 300);
  }

  requestAnimationFrame(function () {
    setTimeout(function () { hero.classList.add('is-in'); }, reduced || !finePointer ? 0 : 320);
  });

  // parallax em duas camadas (foto e glow) seguindo o mouse
  if (finePointer && !reduced) {
    var photo = $('.hero__photo'), glow = $('.hero__glow');
    var tx = 0, ty = 0, cx = 0, cy = 0, heroRaf = 0, heroVisible = true;
    window.addEventListener('pointermove', function (e) {
      tx = (e.clientX / window.innerWidth - 0.5);
      ty = (e.clientY / window.innerHeight - 0.5);
      if (!heroRaf && heroVisible) heroRaf = requestAnimationFrame(heroLoop);
    }, { passive: true });
    var heroLoop = function () {
      cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
      photo.style.transform = 'translate3d(' + (cx * -14).toFixed(2) + 'px,' + (cy * -10).toFixed(2) + 'px,0)';
      glow.style.transform = 'translate3d(' + (cx * 26).toFixed(2) + 'px,' + (cy * 18).toFixed(2) + 'px,0)';
      heroRaf = (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) ? requestAnimationFrame(heroLoop) : 0;
    };
    new IntersectionObserver(function (en) { heroVisible = en[0].isIntersecting; }).observe(hero);
  }

  /* ── Fundo WebGL do hero (só quando ocioso e o aparelho aguenta) ────── */
  function webglOK() {
    if (reduced || saveData || !SCRIPT_SRC) return false;
    var mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
    if (isMobile && (mem < 4 || cores < 6)) return false;
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }
  if (webglOK()) {
    var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 1200); };
    var boot = function () {
      idle(function () {
        import(new URL('vendor/hero-webgl.js', SCRIPT_SRC).href).then(function (m) {
          m.init($('.hero__canvas'), { mobile: isMobile });
          hero.classList.add('has-webgl');
        }).catch(function () { /* fica o fallback em CSS */ });
      }, { timeout: 4000 });
    };
    document.readyState === 'complete' ? boot() : window.addEventListener('load', boot);
  }

  /* ── Reveals simples ────────────────────────────────────────────────── */
  var revealIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('is-in'); revealIO.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px -10% 0px' });
  $$('.reveal').forEach(function (el) { revealIO.observe(el); });

  /* ── Laser scan dos prints ──────────────────────────────────────────── */
  var scanIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target, img = $('img', el);
      var go = function () { el.classList.add('is-scanned'); };
      img.complete ? go() : (img.addEventListener('load', go), img.addEventListener('error', go));
      scanIO.unobserve(el);
    });
  }, { threshold: 0.35 });
  $$('.scan').forEach(function (el) { scanIO.observe(el); });

  /* ── Entradas dos cards e linha do tempo ────────────────────────────── */
  var groups = ['.cases > .case', '.services__grid > .service', '.timeline .step'];
  if (hasGsap && !reduced) {
    groups.forEach(function (sel) {
      gsap.set(sel, { opacity: 0, y: 40, rotateX: 8, transformPerspective: 1000, transformOrigin: '50% 100%' });
      ScrollTrigger.batch(sel, {
        start: 'top 88%',
        once: true,
        onEnter: function (els) {
          gsap.to(els, {
            opacity: 1, y: 0, rotateX: 0, duration: 1, ease: 'power3.out', stagger: 0.12,
            onComplete: function () { els.forEach(function (el) { el.classList.add('is-shown'); gsap.set(el, { clearProps: 'transform,opacity' }); }); }
          });
        }
      });
    });

    var fill = $('.timeline__fill');
    var steps = $$('.timeline .step');
    var horizontal = mq('(min-width: 900px)').matches;
    gsap.fromTo(fill, horizontal ? { scaleX: 0 } : { scaleY: 0 }, {
      scaleX: 1, scaleY: 1, ease: 'none',
      scrollTrigger: {
        trigger: '.timeline', start: 'top 75%', end: horizontal ? 'top 30%' : 'bottom 60%', scrub: 0.6,
        onUpdate: function (st) {
          steps.forEach(function (s, k) { s.classList.toggle('is-on', st.progress >= k / (steps.length - 1) - 0.02); });
        }
      }
    });

    // celular do mockup flutua em camada separada
    $$('[data-phone]').forEach(function (ph) {
      gsap.fromTo(ph, { yPercent: 10 }, {
        yPercent: -8, ease: 'none',
        scrollTrigger: { trigger: ph.closest('.case'), start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    // glow dourado acompanha a rolagem nas seções escuras
    $$('.sec-glow').forEach(function (g) {
      gsap.fromTo(g, { yPercent: -40 }, {
        yPercent: 60, ease: 'none',
        scrollTrigger: { trigger: g.parentNode, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  } else {
    var showIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-shown'); showIO.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    groups.forEach(function (sel) {
      $$(sel).forEach(function (el, k) { el.style.transitionDelay = (k % 3) * 0.1 + 's'; showIO.observe(el); });
    });
    $$('.timeline .step').forEach(function (s) { s.classList.add('is-on'); });
  }

  /* ── Cards holográficos: tilt, foil e glare ─────────────────────────── */
  var holoIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { en.target.classList.toggle('is-visible', en.isIntersecting); });
  });
  $$('.holo').forEach(function (card) {
    holoIO.observe(card);
    var raf = 0, last = null;
    var apply = function () {
      raf = 0;
      if (!last) return;
      var r = card.getBoundingClientRect();
      var px = clamp((last.x - r.left) / r.width, 0, 1), py = clamp((last.y - r.top) / r.height, 0, 1);
      card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      if (last.tilt) {
        var max = card.classList.contains('case') ? 4 : 8;   // cases são grandes: inclinação menor
        card.style.setProperty('--ry', ((px - 0.5) * 2 * max).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((0.5 - py) * 2 * max).toFixed(2) + 'deg');
      }
    };
    card.addEventListener('pointermove', function (e) {
      if (reduced) return;
      var tilt = e.pointerType === 'mouse' && finePointer;
      last = { x: e.clientX, y: e.clientY, tilt: tilt };
      card.style.setProperty('--hover', '1');
      if (tilt) card.classList.add('is-tilting');
      if (!raf) raf = requestAnimationFrame(apply);
    });
    card.addEventListener('pointerleave', function () {
      last = null;
      card.classList.remove('is-tilting');
      card.style.setProperty('--hover', '0');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
    // toque: sem tilt, o brilho acende onde o dedo toca
    card.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' || reduced) return;
      last = { x: e.clientX, y: e.clientY, tilt: false };
      card.style.setProperty('--hover', '1');
      apply();
      clearTimeout(card._t);
      card._t = setTimeout(function () { card.style.setProperty('--hover', '0'); }, 700);
    });
  });

  /* ── Marquee com velocidade reativa à rolagem ───────────────────────── */
  var marquee = $('.marquee'), track = $('.marquee__track');
  if (marquee && !reduced) {
    marquee.classList.add('is-js');
    var x = 0, half = 0, mRaf = 0, prev = 0;
    var measure = function () { half = track.scrollWidth / 2; };
    measure(); window.addEventListener('resize', measure, { passive: true });
    var mLoop = function (t) {
      var dt = prev ? Math.min((t - prev) / 1000, 0.05) : 0.016; prev = t;
      velocity *= 0.92;
      x -= (40 + Math.abs(velocity) * 14) * dt;
      if (half && -x >= half) x += half;
      track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
      mRaf = requestAnimationFrame(mLoop);
    };
    new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { if (!mRaf) { prev = 0; mRaf = requestAnimationFrame(mLoop); } }
      else { cancelAnimationFrame(mRaf); mRaf = 0; }
    }).observe(marquee);
  }

  /* ── Botões magnéticos ──────────────────────────────────────────────── */
  if (finePointer && !reduced) {
    $$('[data-magnetic]').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        b.style.transform = 'translate3d(' + (dx * 12).toFixed(1) + 'px,' + (dy * 8).toFixed(1) + 'px,0)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }

  /* ── Cursor em anel (só desktop) ────────────────────────────────────── */
  var cursor = $('.cursor');
  if (finePointer && !reduced && cursor) {
    doc.classList.add('has-cursor');
    var mx = -100, my = -100, kx = -100, ky = -100, cRaf = 0;
    var cLoop = function () {
      kx += (mx - kx) * 0.2; ky += (my - ky) * 0.2;
      cursor.style.transform = 'translate3d(' + kx.toFixed(1) + 'px,' + ky.toFixed(1) + 'px,0)';
      cRaf = (Math.abs(mx - kx) > 0.1 || Math.abs(my - ky) > 0.1) ? requestAnimationFrame(cLoop) : 0;
    };
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      cursor.classList.add('is-on');
      var t = e.target;
      var onCase = t.closest && t.closest('[data-cursor]');
      cursor.classList.toggle('is-case', !!onCase);
      cursor.classList.toggle('is-link', !onCase && !!(t.closest && t.closest('a,button,select,input,textarea,summary')));
      if (!cRaf) cRaf = requestAnimationFrame(cLoop);
    }, { passive: true });
    document.addEventListener('pointerleave', function () { cursor.classList.remove('is-on'); });
  }

  /* ── WhatsApp flutuante: balão aparece uma vez ──────────────────────── */
  var wa = $('.wa-float');
  if (wa) {
    setTimeout(function () { wa.classList.add('show-bubble'); }, 3500);
    setTimeout(function () { wa.classList.remove('show-bubble'); }, 9500);
  }

  /* ── Formulário → WhatsApp com mensagem pronta ──────────────────────── */
  var form = $('#form-contato');
  if (form) {
    var err = $('.form__error', form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = form.nome.value.trim(), empresa = form.empresa.value.trim();
      var servico = form.servico.value, msg = form.mensagem.value.trim();
      form.nome.setAttribute('aria-invalid', String(!nome));
      form.servico.setAttribute('aria-invalid', String(!servico));
      if (!nome || !servico) {
        err.hidden = false;
        (!nome ? form.nome : form.servico).focus();
        return;
      }
      err.hidden = true;
      var lines = [WA_DEFAULT, '', 'Nome: ' + nome];
      if (empresa) lines.push('Empresa: ' + empresa);
      lines.push('O que preciso: ' + servico);
      if (msg) lines.push('Mensagem: ' + msg);
      var url = WA + '?text=' + encodeURIComponent(lines.join('\n'));
      var win = window.open(url, '_blank');
      if (win) win.opener = null; else window.location.href = url;
    });
  }

  /* recalcula posições quando fontes e imagens terminam de carregar */
  if (hasGsap) window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
