/* ==========================================================================
   Matheus Beck, Portfólio · main.js
   Tudo é aprimoramento progressivo: sem este arquivo a página continua
   legível e clicável. GSAP/ScrollTrigger são opcionais (classe no-gsap).
   ========================================================================== */
(function () {
  'use strict';
  window.__mbReady = true;

  var doc = document.documentElement;
  var mq = function (q) { return window.matchMedia(q); };
  var reduced = mq('(prefers-reduced-motion: reduce)').matches;
  var finePointer = mq('(hover: hover) and (pointer: fine)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var WA = 'https://wa.me/5551981947979';
  var WA_DEFAULT = 'Olá Matheus! Vi seu portfólio e quero uma arte para minha empresa.';

  if (!hasGsap) doc.classList.add('no-gsap');
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

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
  $$('.nav__menu a').forEach(function (a) { a.addEventListener('click', closeMenu); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { closeMenu(); toggle.focus(); }
  });

  var sentinel = $('.top-sentinel');
  if (sentinel) {
    new IntersectionObserver(function (en) {
      nav.classList.toggle('is-scrolled', !en[0].isIntersecting);
    }).observe(sentinel);
  }

  var navLinks = $$('.nav__links a');
  var activeIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      navLinks.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('href') === '#' + en.target.id); });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(function (s) { activeIO.observe(s); });

  /* ── Hero: título palavra por palavra (desktop) e entrada ───────────── */
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
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { hero.classList.add('is-in'); });
  });

  /* ── Entradas ao rolar (com atraso em sequência dentro de cada grupo) ─ */
  [['.cases', '.case'], ['.services__list', '.service'], ['.timeline__steps', '.step']].forEach(function (g) {
    var parent = $(g[0]);
    if (!parent) return;
    $$(g[1], parent).forEach(function (el, k) {
      var perRow = g[0] === '.timeline__steps' ? 5 : 2;
      el.style.setProperty('--d', (k % perRow) * 0.09 + 's');
    });
  });
  var revealIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('is-in'); revealIO.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px -10% 0px' });
  $$('.reveal, .step').forEach(function (el) { revealIO.observe(el); });

  /* ── Faixa de serviços: só anima quando está na tela ────────────────── */
  var marquee = $('.marquee');
  if (marquee && !reduced) {
    new IntersectionObserver(function (en) {
      marquee.classList.toggle('is-running', en[0].isIntersecting);
    }).observe(marquee);
  }

  /* ── Movimentos ligados à rolagem (GSAP) ────────────────────────────── */
  if (hasGsap && !reduced) {
    // linha do tempo enche conforme o processo avança
    var fill = $('.timeline__fill');
    var steps = $$('.timeline .step');
    var horizontal = mq('(min-width: 900px)').matches;
    gsap.fromTo(fill, horizontal ? { scaleX: 0 } : { scaleY: 0 }, {
      scaleX: 1, scaleY: 1, ease: 'none',
      scrollTrigger: {
        trigger: '.timeline', start: 'top 75%', end: horizontal ? 'top 35%' : 'bottom 60%', scrub: 0.6,
        onUpdate: function (st) {
          steps.forEach(function (s, k) { s.classList.toggle('is-on', st.progress >= k / (steps.length - 1) - 0.02); });
        }
      }
    });

    // celular do mockup sobe em camada separada, dando profundidade ao print
    $$('[data-phone]').forEach(function (ph) {
      gsap.fromTo(ph, { yPercent: 6 }, {
        yPercent: -6, ease: 'none',
        scrollTrigger: { trigger: ph.closest('.case'), start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    // foto do hero desce devagar enquanto a página sobe
    gsap.to('.hero__photo', {
      yPercent: 8, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
    });

    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  } else {
    $$('.timeline .step').forEach(function (s) { s.classList.add('is-on'); });
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
})();
