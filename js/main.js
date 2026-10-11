/* ==========================================================================
   Matheus Beck, Portfólio · main.js
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
  var introOn = !reduced && !doc.classList.contains('no-intro');
  var WA = 'https://wa.me/5551981947979';
  var WA_DEFAULT = 'Olá Matheus! Vi seu portfólio e quero uma arte para minha empresa.';

  if (!hasGsap) doc.classList.add('no-gsap');

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ── Rolagem suave (Lenis) + ScrollTrigger ─────────────────────────── */
  var lenis = null;
  var velocity = 0;   // velocidade da rolagem, usada pela faixa de serviços
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  if (window.Lenis && !reduced && finePointer) {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    lenis.on('scroll', function (e) { velocity = clamp(e.velocity, -60, 60); });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      (function loop(t) { lenis.raf(t); requestAnimationFrame(loop); })(performance.now());
    }
  } else if (hasGsap && !reduced) {
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: function (st) { velocity = clamp(st.getVelocity() / 60, -60, 60); } });
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

  /* ── Nav: fundo ao sair do topo, menu mobile, link ativo ────────────── */
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
  $$('.nav__menu a[target]').forEach(function (a) { a.addEventListener('click', closeMenu); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { closeMenu(); toggle.focus(); }
  });

  var sentinel = $('.top-sentinel');
  if (sentinel) {
    new IntersectionObserver(function (en) { nav.classList.toggle('is-scrolled', !en[0].isIntersecting); }).observe(sentinel);
  }

  var navLinks = $$('.nav__links a');
  var activeIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      navLinks.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('href') === '#' + en.target.id); });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(function (s) { activeIO.observe(s); });

  /* ── Texto que decodifica ───────────────────────────────────────────────
     Cada letra vira um <span> que guarda a largura da letra final; por cima
     dela aparece uma letra sorteada até a vez dela chegar. Nada se mexe no
     layout, e leitores de tela leem uma cópia do texto real. */
  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#&/*+<>';
  function prepDecode(el) {
    var real = document.createElement('span');
    real.className = 'sr-only';
    real.textContent = el.textContent;
    var vis = document.createElement('span');
    vis.setAttribute('aria-hidden', 'true');
    while (el.firstChild) vis.appendChild(el.firstChild);
    var chars = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 1) { walk(child); return; }
        if (child.nodeType !== 3) return;
        var frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var word = document.createElement('span');
          word.className = 'dc-w';
          for (var k = 0; k < part.length; k++) {
            var c = document.createElement('span');
            c.className = 'dc is-scrambling';
            c.textContent = part[k];
            c.setAttribute('data-r', GLYPHS[(Math.random() * GLYPHS.length) | 0]);
            word.appendChild(c); chars.push(c);
          }
          frag.appendChild(word);
        });
        child.parentNode.replaceChild(frag, child);
      });
    })(vis);
    el.appendChild(real); el.appendChild(vis);
    return chars;
  }
  function runDecode(chars, dur) {
    var start = null, n = chars.length, done = 0, tick = 0;
    var step = function (t) {
      if (start === null) start = t;
      var p = clamp((t - start) / dur, 0, 1);
      var upto = Math.floor(p * n);
      for (; done < upto; done++) chars[done].classList.remove('is-scrambling');
      if (++tick % 2 === 0) {
        for (var k = done; k < n; k++) chars[k].setAttribute('data-r', GLYPHS[(Math.random() * GLYPHS.length) | 0]);
      }
      if (p < 1) requestAnimationFrame(step);
      else for (; done < n; done++) chars[done].classList.remove('is-scrambling');
    };
    requestAnimationFrame(step);
  }
  if (!reduced) {
    var decodeIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        decodeIO.unobserve(en.target);
        runDecode(en.target._dc, 650 + en.target._dc.length * 6);
      });
    }, { rootMargin: '0px 0px -15% 0px' });
    $$('[data-decode]').forEach(function (el) {
      el._dc = prepDecode(el);
      if (el.closest('.hero')) {
        setTimeout(function () { runDecode(el._dc, 900); }, introOn ? 1000 : 250);
      } else decodeIO.observe(el);
    });
  }

  /* ── Hero: título palavra por palavra, entrada, parallax ───────────── */
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

  // a entrada do hero começa quando a abertura termina
  requestAnimationFrame(function () {
    setTimeout(function () { hero.classList.add('is-in'); }, reduced || !finePointer ? 0 : (introOn ? 900 : 120));
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

  /* ── Chão quadriculado em WebGL (desktop; no celular fica a versão em CSS) ─ */
  function webglOK() {
    if (reduced || saveData || isMobile || !finePointer || !SCRIPT_SRC) return false;
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && c.getContext('webgl'));
    } catch (e) { return false; }
  }
  if (webglOK()) {
    var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 600); };
    var boot = function () {
      idle(function () {
        import(new URL('hero-grid.js', SCRIPT_SRC).href).then(function (m) {
          if (m.init($('.hero__canvas'))) hero.classList.add('has-webgl');
        }).catch(function () { /* fica o chão em CSS */ });
      }, { timeout: 2500 });
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
  var groups = ['.cases > .case', '.services__list > .service', '.timeline .step'];
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

  /* ── Cases: tilt, foil e glare; borda girando só no destaque ──────────── */
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
        var max = card.classList.contains('case--feature') ? 3 : 4;   // cases são grandes: inclinação pequena
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

  /* ── Faixa com ✦: acelera com a rolagem, para fora da tela ──────────── */
  var marquee = $('.marquee'), track = $('.marquee__track');
  if (marquee && !reduced) {
    marquee.classList.add('is-js');
    var x = 0, half = 0, mRaf = 0, prev = 0, boost = 0;
    var measure = function () { half = track.scrollWidth / 2; };
    measure(); window.addEventListener('resize', measure, { passive: true });
    var mLoop = function (t) {
      var dt = prev ? Math.min((t - prev) / 1000, 0.05) : 0.016; prev = t;
      boost += (Math.abs(velocity) - boost) * 0.08;
      velocity *= 0.9;
      x -= (40 + boost * 14) * dt;
      if (half && -x >= half) x += half;
      track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
      mRaf = requestAnimationFrame(mLoop);
    };
    new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { if (!mRaf) { prev = 0; mRaf = requestAnimationFrame(mLoop); } }
      else { cancelAnimationFrame(mRaf); mRaf = 0; }
    }).observe(marquee);
  }

  /* ── Botões principais magnéticos ───────────────────────────────────── */
  if (finePointer && !reduced) {
    $$('[data-magnetic]').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        b.style.transform = 'translate3d(' + (dx * 10).toFixed(1) + 'px,' + (dy * 6).toFixed(1) + 'px,0)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }

  /* ── WhatsApp flutuante: só aparece quando os botões do hero saem da tela ─ */
  var wa = $('.wa-float'), heroActions = $('.hero__actions');
  if (wa && heroActions) {
    new IntersectionObserver(function (en) {
      wa.classList.toggle('is-on', !en[0].isIntersecting);
    }).observe(heroActions);
  } else if (wa) wa.classList.add('is-on');

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
