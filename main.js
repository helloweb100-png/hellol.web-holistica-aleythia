/* ==========================================================================
   Holística Aleythia | main.js
   Mejora progresiva: todo el contenido es legible sin JS ni librerías.
   Con GSAP + ScrollTrigger + Lenis se activan las escenas fijadas y el scroll suave.
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- Configuración editable ---------- */
  const CONFIG = {
    whatsapp: '525583271800', // WhatsApp principal (el formulario envía aquí)
    greeting: 'Hola Miry',
  };

  /* ---------- Utilidades ---------- */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const hasLenis = typeof window.Lenis === 'function';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  root.classList.add('js-ready');
  /* Seguro: si algo falla, el sitio nunca se queda oculto */
  setTimeout(() => root.classList.add('hero-in'), 9000);

  if (hasGSAP) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  let lenis = null;

  /* ==========================================================================
     LOADER
     ========================================================================== */
  function runLoader() {
    const loader = $('#loader');
    const num = $('#loader-num');
    return new Promise((resolve) => {
      if (!loader) return resolve();

      const minMs = reduceMotion ? 250 : 2900;
      const t0 = performance.now();
      let ready = false;
      let shown = 0;
      let finished = false;

      const loaded = document.readyState === 'complete'
        ? Promise.resolve()
        : new Promise((r) => window.addEventListener('load', r, { once: true }));
      const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      Promise.all([loaded, fonts]).then(() => { ready = true; });
      setTimeout(() => { ready = true; }, 6500);

      function finish() {
        if (reduceMotion) { loader.remove(); resolve(); return; }
        setTimeout(() => {
          loader.classList.add('is-done');
          setTimeout(resolve, 700);
          setTimeout(() => loader.remove(), 1700);
        }, 380);
      }

      function frame(now) {
        const t = clamp((now - t0) / minMs, 0, 1);
        let target = 1 - Math.pow(1 - t, 3);
        if (!ready) target = Math.min(target, 0.92);
        shown = lerp(shown, target, 0.12);
        if (target >= 1 && shown > 0.996) shown = 1;
        loader.style.setProperty('--p', shown.toFixed(4));
        if (num) num.textContent = Math.round(shown * 100);
        if (shown >= 1 && !finished) { finished = true; finish(); return; }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }

  /* ==========================================================================
     SCROLL SUAVE (Lenis)
     ========================================================================== */
  function initLenis() {
    if (!hasLenis || reduceMotion) return;
    lenis = new Lenis({
      duration: 1.3,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });
    if (hasGSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    lenis.stop(); // detenido mientras carga el loader
  }

  function goTo(target) {
    if (!target) return;
    if (lenis) lenis.scrollTo(target, { duration: 1.7, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  /* ==========================================================================
     MENÚ, HEADER, NAVEGACIÓN
     ========================================================================== */
  const menu = $('#menu');
  const toggle = $('#menu-toggle');

  function setMenu(open) {
    if (!menu || !toggle) return;
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    if (open) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    document.body.classList.toggle('menu-open', open);
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
    else document.body.style.overflow = open ? 'hidden' : '';
  }

  function initMenu() {
    $$('.menu-nav a').forEach((a, i) => a.style.setProperty('--k', i));
    if (toggle) toggle.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  }

  function initHeader() {
    const header = $('#header');
    const sentinel = $('.scroll-sentinel');
    if (header && sentinel && 'IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => header.classList.toggle('is-scrolled', !en.isIntersecting)).observe(sentinel);
    }
    const links = $$('.nav a');
    const map = new Map(links.map((a) => [a.getAttribute('href'), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const link = map.get('#' + en.target.id);
        if (!link) return;
        if (en.isIntersecting) { links.forEach((l) => l.classList.remove('is-active')); link.classList.add('is-active'); }
        else link.classList.remove('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    ['miry', 'terapias', 'chakras', 'proceso', 'faq'].forEach((id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  function initProgress() {
    const bar = $('.progress span');
    if (!bar || !hasGSAP) return;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => { bar.style.transform = `scaleX(${self.progress.toFixed(4)})`; },
    });
  }

  /* ==========================================================================
     ACCIONES: agendar y anclas
     ========================================================================== */
  function book(name) {
    const sel = $('#f-service');
    if (sel && name) {
      sel.value = name;
      if (sel.value !== name) sel.selectedIndex = 0;
    }
    goTo($('#contacto'));
    setTimeout(() => { const f = $('#f-name'); if (f) f.focus({ preventScroll: true }); }, 1900);
  }

  function initActions() {
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-book]');
      if (b) { e.preventDefault(); setMenu(false); book(b.dataset.book); return; }

      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      const wasOpen = menu && menu.classList.contains('is-open');
      setMenu(false);
      setTimeout(() => goTo(el), wasOpen ? 450 : 0);
      history.replaceState(null, '', id);
    });
  }

  /* ==========================================================================
     REVEAL, CONTADORES, TEXTO QUE SE ILUMINA
     ========================================================================== */
  function initReveal() {
    $$('[data-stagger]').forEach((group) => {
      Array.from(group.children).forEach((child, i) => {
        if (!child.hasAttribute('data-reveal')) child.setAttribute('data-reveal', 'up');
        child.style.setProperty('--d', i * 70);
      });
    });
    const els = $$('[data-reveal]');
    if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('in')); return; }
    /* Un elemento totalmente recortado con clip-path no intersecta: los reveals tipo clip se observan por su padre */
    const watched = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        (watched.get(en.target) || []).forEach((el) => el.classList.add('in'));
        io.unobserve(en.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    els.forEach((el) => {
      const host = el.dataset.reveal === 'clip' ? el.parentElement : el;
      if (!watched.has(host)) { watched.set(host, []); io.observe(host); }
      watched.get(host).push(el);
    });
  }

  function initCounters() {
    const els = $$('[data-count]');
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        const el = en.target;
        const end = parseInt(el.dataset.count, 10);
        if (reduceMotion) { el.textContent = end; return; }
        const t0 = performance.now();
        const dur = 1800;
        (function tick(now) {
          const t = clamp((now - t0) / dur, 0, 1);
          el.textContent = Math.round(end * (1 - Math.pow(2, -10 * t)));
          if (t < 1) requestAnimationFrame(tick); else el.textContent = end;
        })(t0);
      });
    }, { threshold: 0.6 });
    els.forEach((el) => { if (!reduceMotion) el.textContent = '0'; io.observe(el); });
  }

  function initScrubText() {
    if (!hasGSAP || reduceMotion) return;
    $$('[data-scrub]').forEach((p) => {
      const text = p.textContent.trim().replace(/\s+/g, ' ');
      p.setAttribute('aria-label', text);
      p.textContent = '';
      const words = text.split(' ').map((w) => {
        const s = document.createElement('span');
        s.className = 'word';
        s.setAttribute('aria-hidden', 'true');
        s.textContent = w + ' ';
        p.appendChild(s);
        return s;
      });
      gsap.fromTo(words, { opacity: 0.14 }, {
        opacity: 1, ease: 'none', stagger: 0.12,
        scrollTrigger: { trigger: p, start: 'top 82%', end: 'bottom 52%', scrub: true },
      });
    });
  }

  function initParallax() {
    if (!hasGSAP || reduceMotion) return;
    $$('[data-parallax]').forEach((el) => {
      const v = parseFloat(el.dataset.parallax) || 8;
      gsap.fromTo(el, { yPercent: -v }, {
        yPercent: v, ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
  }

  function initFooterParallax() {
    const footerGhost = $('.footer-ghost');
    if (!footerGhost || !hasGSAP || reduceMotion) return;
    gsap.fromTo(footerGhost, { yPercent: 40 }, {
      yPercent: 0, ease: 'none',
      scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true },
    });
  }

  /* ==========================================================================
     HERO: partículas, parallax de puntero, salida
     ========================================================================== */
  class Particles {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.o = Object.assign({
        density: 15000, max: 90, min: 26, link: 130, speed: 0.22,
        colors: ['12,123,142'], line: '12,123,142', lineAlpha: 0.2,
        radius: [0.8, 2.6], pointerRadius: 170,
      }, opts);
      this.pts = [];
      this.pointer = { x: -9999, y: -9999 };
      this.raf = 0;
      this.w = 0; this.h = 0;
      this.loop = this.loop.bind(this);
      this.resize();

      if ('ResizeObserver' in window) new ResizeObserver(() => this.resize()).observe(canvas);
      const host = canvas.closest('section') || canvas.parentElement;
      host.addEventListener('pointermove', (e) => {
        const r = canvas.getBoundingClientRect();
        this.pointer.x = e.clientX - r.left;
        this.pointer.y = e.clientY - r.top;
      }, { passive: true });
      host.addEventListener('pointerleave', () => { this.pointer.x = -9999; this.pointer.y = -9999; });
      new IntersectionObserver(([en]) => (en.isIntersecting ? this.start() : this.stop()), { threshold: 0 }).observe(canvas);
      document.addEventListener('visibilitychange', () => (document.hidden ? this.stop() : this.start()));
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      if (!w || !h) return;
      this.w = w; this.h = h;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = clamp(Math.round((w * h) / this.o.density), this.o.min, this.o.max);
      while (this.pts.length > n) this.pts.pop();
      while (this.pts.length < n) this.pts.push(this.make());
      this.pts.forEach((p) => { p.x = Math.min(p.x, w); p.y = Math.min(p.y, h); });
      if (reduceMotion) this.draw(0);
    }

    make() {
      const [r0, r1] = this.o.radius;
      const a = Math.random() * Math.PI * 2;
      const sp = (0.25 + Math.random()) * this.o.speed;
      return {
        x: Math.random() * (this.w || 800), y: Math.random() * (this.h || 600),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.05,
        r: r0 + Math.random() * (r1 - r0), ph: Math.random() * 6.283,
        col: this.o.colors[Math.floor(Math.random() * this.o.colors.length)],
        star: Math.random() < 0.14,
      };
    }

    start() { if (reduceMotion || this.raf) return; this.raf = requestAnimationFrame(this.loop); }
    stop() { cancelAnimationFrame(this.raf); this.raf = 0; }
    loop(now) { this.draw(now * 0.001); this.raf = requestAnimationFrame(this.loop); }

    draw(t) {
      const { ctx, w, h, pts, pointer } = this;
      const { link, lineAlpha, line, pointerRadius } = this.o;
      ctx.clearRect(0, 0, w, h);

      for (const p of pts) {
        if (!reduceMotion) {
          const dx = pointer.x - p.x; const dy = pointer.y - p.y;
          const d = Math.hypot(dx, dy);
          if (d < pointerRadius) { const f = (1 - d / pointerRadius) * 0.018; p.x += dx * f; p.y += dy * f; }
          p.x += p.vx; p.y += p.vy;
          if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
          if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
        }
        const tw = 0.5 + 0.5 * Math.sin(t * (0.7 + p.ph * 0.25) + p.ph * 6.283);
        const alpha = 0.28 + tw * 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3.2, 0, 6.283);
        ctx.fillStyle = `rgba(${p.col},${(alpha * 0.1).toFixed(3)})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fillStyle = `rgba(${p.col},${alpha.toFixed(3)})`;
        ctx.fill();
        if (p.star) {
          const len = p.r * (4 + tw * 5);
          ctx.strokeStyle = `rgba(${p.col},${(alpha * 0.7).toFixed(3)})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(p.x - len, p.y); ctx.lineTo(p.x + len, p.y);
          ctx.moveTo(p.x, p.y - len); ctx.lineTo(p.x, p.y + len);
          ctx.stroke();
        }
      }

      ctx.lineWidth = 0.7;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j];
          const dx = a.x - b.x; const dy = a.y - b.y;
          if (Math.abs(dx) > link || Math.abs(dy) > link) continue;
          const d = Math.hypot(dx, dy);
          if (d < link) {
            ctx.strokeStyle = `rgba(${line},${((1 - d / link) * lineAlpha).toFixed(3)})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        const pd = Math.hypot(a.x - pointer.x, a.y - pointer.y);
        if (pd < pointerRadius) {
          ctx.strokeStyle = `rgba(${line},${((1 - pd / pointerRadius) * lineAlpha * 2.2).toFixed(3)})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(pointer.x, pointer.y); ctx.stroke();
        }
      }
    }
  }

  function initParticles() {
    const hero = $('#hero-canvas');
    if (hero) {
      new Particles(hero, {
        colors: ['12,123,142', '39,196,214', '144,102,245'], line: '12,123,142', lineAlpha: 0.2, max: 88,
      });
    }
    const contact = $('#contact-canvas');
    if (contact) {
      new Particles(contact, {
        colors: ['234,246,248', '39,196,214'], line: '39,196,214', lineAlpha: 0.22, max: 70, density: 17000,
      });
    }
  }

  function initPortal() {
    const portal = $('#portal');
    const hero = $('#inicio');
    if (!portal || !hero || !finePointer || reduceMotion) return;
    const layers = $$('.p-layer', portal).map((el) => ({ el, d: parseFloat(el.dataset.depth) || 0 }));
    let tx = 0; let ty = 0; let cx = 0; let cy = 0; let raf = 0;

    function tick() {
      cx = lerp(cx, tx, 0.07); cy = lerp(cy, ty, 0.07);
      layers.forEach(({ el, d }) => { el.style.transform = `translate3d(${(-cx * d).toFixed(2)}px, ${(-cy * d).toFixed(2)}px, 0)`; });
      raf = (Math.abs(cx - tx) > 0.001 || Math.abs(cy - ty) > 0.001) ? requestAnimationFrame(tick) : 0;
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
      kick();
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
  }

  function initHeroExit() {
    if (!hasGSAP || reduceMotion) return;
    const st = { trigger: '#inicio', start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('.hero-copy', { yPercent: -14, opacity: 0.1, ease: 'none', scrollTrigger: st });
    gsap.to('.hero-visual', { yPercent: 7, scale: 0.94, ease: 'none', scrollTrigger: st });
  }

  /* ==========================================================================
     MARQUEE (velocidad ligada al scroll)
     ========================================================================== */
  let marqueeAnim = null;
  function initMarqueeMotion() {
    const track = $('#marquee-track');
    if (!track || reduceMotion || !track.animate) return;
    marqueeAnim = track.animate(
      [{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(-50%,0,0)' }],
      { duration: 52000, iterations: Infinity, easing: 'linear' }
    );
  }

  function initMarqueeVelocity() {
    const track = $('#marquee-track');
    if (!track || !marqueeAnim) return;
    let boost = 0; let dir = 1; let rate = 1; let raf = 0;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => {
        dir = self.direction || dir;
        boost = Math.min(7, Math.abs(self.getVelocity()) / 420);
      },
    });
    function loop() {
      boost = lerp(boost, 0, 0.05);
      rate = lerp(rate, dir * (1 + boost), 0.1);
      marqueeAnim.playbackRate = rate;
      raf = requestAnimationFrame(loop);
    }
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !raf) raf = requestAnimationFrame(loop);
      if (!en.isIntersecting) { cancelAnimationFrame(raf); raf = 0; }
    }, { threshold: 0 }).observe(track.parentElement);
  }

  /* ==========================================================================
     TERAPIAS: pan horizontal fijado
     ========================================================================== */
  function initServices() {
    const section = $('#terapias');
    const pin = $('.services-pin');
    const track = $('#services-track');
    if (!section || !pin || !track) return;

    if (!hasGSAP) return; // sin GSAP queda como carrusel nativo con snap
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      section.classList.add('is-pinned');
      const now = $('.services-now');
      const bar = $('.services-bar i');
      const ghost = $('.services-ghost');
      const families = $$('.svc-family');
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      let lastName = '';

      const tween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: pin, start: 'top top', end: () => '+=' + dist(),
          pin: true, scrub: 0.9, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (bar) bar.style.transform = `scaleX(${self.progress.toFixed(4)})`;
            const x = gsap.getProperty(track, 'x');
            let current = families[0];
            families.forEach((f) => { if (f.offsetLeft + x < window.innerWidth * 0.55) current = f; });
            const name = current ? current.dataset.familyName : '';
            if (now && name && name !== lastName) { lastName = name; now.textContent = name; }
          },
        },
      });

      if (ghost) {
        gsap.to(ghost, {
          xPercent: -34, ease: 'none',
          scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), scrub: true, invalidateOnRefresh: true },
        });
      }

      $$('.svc-img', track).forEach((img) => {
        gsap.fromTo(img, { xPercent: -7 }, {
          xPercent: 7, ease: 'none',
          scrollTrigger: { trigger: img.closest('.svc-card'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
        });
      });

      /* Accesibilidad: si un elemento recibe foco fuera de pantalla, llevamos el scroll hasta él */
      const onFocus = (e) => {
        const el = e.target.closest('.svc-card, .svc-family, .svc-intro, .svc-end');
        pin.scrollLeft = 0;
        if (!el) return;
        const st = tween.scrollTrigger;
        const y = st.start + (clamp(el.offsetLeft - 40, 0, dist()) / (dist() || 1)) * (st.end - st.start);
        if (lenis) lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
      };
      track.addEventListener('focusin', onFocus);

      return () => {
        track.removeEventListener('focusin', onFocus);
        section.classList.remove('is-pinned');
        gsap.set([track, ghost].filter(Boolean), { clearProps: 'all' });
        $$('.svc-img', track).forEach((img) => gsap.set(img, { clearProps: 'transform' }));
      };
    });
  }

  /* ==========================================================================
     CHAKRAS: escena que asciende
     ========================================================================== */
  function initChakras() {
    const section = $('#chakras');
    if (!section) return;
    const items = $$('.chakra-item', section);
    const ys = [85.6, 73.2, 61.5, 49.2, 37.9, 26.7, 15.8]; // % de altura de cada centro, de raíz a corona
    items.forEach((it) => it.style.setProperty('--c', it.dataset.color));
    let current = -1;

    function setActive(i) {
      if (i === current) return;
      current = i;
      items.forEach((it, k) => it.classList.toggle('is-active', k === i));
      section.style.setProperty('--chakra', items[i].dataset.color);
      section.style.setProperty('--chakra-y', ys[i] + '%');
    }
    setActive(0);
    if (!hasGSAP) return;

    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)', () => {
      section.classList.add('is-scene');
      ScrollTrigger.create({
        trigger: $('.chakras-sticky', section), start: 'top top', end: () => '+=' + Math.round(window.innerHeight * 0.62 * items.length),
        pin: true, scrub: true, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: (self) => setActive(Math.min(items.length - 1, Math.floor(self.progress * items.length))),
      });
      return () => { section.classList.remove('is-scene'); };
    });
    mm.add('(max-width: 899px), (max-height: 699px)', () => {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) setActive(items.indexOf(en.target)); });
      }, { rootMargin: '-42% 0px -42% 0px', threshold: 0 });
      items.forEach((it) => io.observe(it));
      return () => io.disconnect();
    });
  }

  /* ==========================================================================
     CALM: la imagen se expande y aparecen misión y visión
     ========================================================================== */
  function initCalm() {
    const calm = $('.calm');
    if (!calm || !hasGSAP || reduceMotion) return;
    const frame = $('.calm-frame', calm);
    const img = $('.calm-frame img', calm);
    const content = $$('.calm-content > *', calm).flatMap((el) => (el.classList.contains('calm-cards') ? Array.from(el.children) : [el]));
    calm.classList.add('is-anim');
    gsap.set(content, { y: 40 });

    gsap.fromTo(frame,
      { clipPath: 'inset(14% 9% 14% 9% round 40px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: calm, start: 'top 80%', end: 'top top', scrub: true } });
    gsap.fromTo(img, { scale: 1.35 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: calm, start: 'top bottom', end: 'bottom bottom', scrub: true } });
    gsap.to(content, {
      opacity: 1, y: 0, ease: 'none', stagger: 0.25,
      scrollTrigger: { trigger: calm, start: 'top 12%', end: 'top -38%', scrub: true },
    });
  }

  /* ==========================================================================
     SELECTOR DE INTENCIÓN
     ========================================================================== */
  function initSelector() {
    const list = $('.intent-list');
    const results = $('#selector-results');
    if (!list || !results) return;
    const intents = $$('.intent', list);
    const cards = new Map($$('.svc-card').map((c) => [c.dataset.name, c]));

    function movePill(btn) {
      list.style.setProperty('--py', btn.offsetTop + 'px');
      list.style.setProperty('--ph', btn.offsetHeight + 'px');
    }

    function render(btn) {
      results.textContent = '';
      btn.dataset.picks.split('|').forEach((name, k) => {
        const card = cards.get(name);
        if (!card) return;
        const art = document.createElement('article');
        art.className = 'result';
        art.style.setProperty('--k', k);

        const img = document.createElement('img');
        img.src = card.dataset.img; img.alt = ''; img.width = 96; img.height = 128; img.loading = 'lazy';

        const box = document.createElement('div');
        const h3 = document.createElement('h3'); h3.textContent = name;
        const price = document.createElement('p'); price.className = 'result-price';
        const strong = document.createElement('strong'); strong.textContent = card.dataset.price;
        price.append(strong, ' por sesión');
        box.append(h3, price);

        const b = document.createElement('button');
        b.type = 'button'; b.className = 'btn btn-primary btn-sm'; b.dataset.book = name;
        b.innerHTML = '<span>Agendar sesión</span><i class="ph ph-arrow-up-right" aria-hidden="true"></i>';

        art.append(img, box, b);
        results.appendChild(art);
      });
    }

    function select(btn, focus) {
      intents.forEach((i) => { const on = i === btn; i.setAttribute('aria-checked', String(on)); i.tabIndex = on ? 0 : -1; });
      movePill(btn);
      render(btn);
      if (focus) btn.focus();
    }

    intents.forEach((btn, idx) => {
      btn.addEventListener('click', () => select(btn));
      btn.addEventListener('keydown', (e) => {
        const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
        if (!(e.key in keys)) return;
        e.preventDefault();
        select(intents[(idx + keys[e.key] + intents.length) % intents.length], true);
      });
    });
    select(intents[0]);
    window.addEventListener('resize', () => movePill(intents.find((i) => i.getAttribute('aria-checked') === 'true')), { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => movePill(intents.find((i) => i.getAttribute('aria-checked') === 'true')));
  }

  /* ==========================================================================
     PROCESO: pila fija con escala
     ========================================================================== */
  function initProcess() {
    if (!hasGSAP || reduceMotion) return;
    const steps = $$('.step');
    steps.forEach((step, i) => {
      if (i === steps.length - 1) return;
      const next = steps[i + 1];
      gsap.to(step, {
        scale: 0.94, ease: 'none',
        scrollTrigger: { trigger: next, start: 'top bottom', end: () => 'top ' + (64 + 30 + (i + 1) * 16 + 20), scrub: true },
      });
    });
  }

  /* ==========================================================================
     EFECTOS DE PUNTERO: spotlight, tilt, imanes
     ========================================================================== */
  function initPointerFX() {
    if (!finePointer) return;

    let raf = 0; let target = null; let px = 0; let py = 0;
    document.addEventListener('pointermove', (e) => {
      const el = e.target.closest('[data-spot]');
      if (!el) return;
      target = el; px = e.clientX; py = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = target.getBoundingClientRect();
        target.style.setProperty('--mx', (px - r.left).toFixed(1) + 'px');
        target.style.setProperty('--my', (py - r.top).toFixed(1) + 'px');
      });
    }, { passive: true });

    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--ry', (x * 9).toFixed(2) + 'deg');
        el.style.setProperty('--rx', (-y * 9).toFixed(2) + 'deg');
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
    });

    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', ((e.clientX - (r.left + r.width / 2)) * 0.22).toFixed(1) + 'px');
        el.style.setProperty('--my', ((e.clientY - (r.top + r.height / 2)) * 0.32).toFixed(1) + 'px');
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--mx', '0px'); el.style.setProperty('--my', '0px'); });
    });
  }

  /* ==========================================================================
     FORMULARIO -> WHATSAPP
     ========================================================================== */
  function initForm() {
    const form = $('#booking-form');
    if (!form) return;
    const sel = $('#f-service');
    const name = $('#f-name');
    const phone = $('#f-phone');
    const date = $('#f-date');
    const msg = $('#f-msg');
    const success = $('#form-success');
    const fallback = $('#wa-fallback');
    const submitBtn = $('button[type="submit"]', form);

    /* Opciones agrupadas a partir de las tarjetas (una sola fuente de verdad) */
    const groups = [];
    let currentGroup = null;
    $$('#services-track > .svc-family, #services-track > .svc-card').forEach((el) => {
      if (el.classList.contains('svc-family')) {
        currentGroup = document.createElement('optgroup');
        currentGroup.label = el.dataset.familyName;
        groups.push(currentGroup);
      } else if (currentGroup) {
        const o = document.createElement('option');
        o.value = el.dataset.name; o.textContent = `${el.dataset.name} (${el.dataset.price})`;
        currentGroup.appendChild(o);
      }
    });
    groups.forEach((g) => sel.appendChild(g));

    if (date) date.min = new Date().toISOString().split('T')[0];

    function setError(input, text) {
      const field = input.closest('.field');
      const err = $('.field-error', field);
      field.classList.toggle('has-error', !!text);
      input.setAttribute('aria-invalid', text ? 'true' : 'false');
      if (err) err.textContent = text || '';
    }
    [name, phone].forEach((i) => i.addEventListener('input', () => setError(i, '')));

    function validate() {
      let ok = true;
      if (name.value.trim().length < 2) { setError(name, 'Escribe tu nombre para poder dirigirme a ti.'); ok = false; }
      if (phone.value.replace(/\D/g, '').length < 10) { setError(phone, 'Escribe un número de 10 dígitos para contactarte.'); ok = false; }
      if (!ok) { const bad = $('.has-error input', form); if (bad) bad.focus(); }
      return ok;
    }

    function burst(btn) {
      if (reduceMotion || !btn.animate) return;
      const r = btn.getBoundingClientRect();
      const colors = ['#27C4D6', '#9066F5', '#F2504B', '#1DBE72', '#EAF6F8'];
      for (let i = 0; i < 22; i++) {
        const p = document.createElement('span');
        p.className = 'burst';
        p.style.left = (r.left + r.width / 2) + 'px';
        p.style.top = (r.top + r.height / 2) + 'px';
        p.style.background = colors[i % colors.length];
        document.body.appendChild(p);
        const ang = (Math.PI * 2 * i) / 22 + Math.random() * 0.4;
        const dist = 70 + Math.random() * 90;
        p.animate([
          { transform: 'translate(0,0) scale(1)', opacity: 1 },
          { transform: `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist}px) scale(0)`, opacity: 0 },
        ], { duration: 800 + Math.random() * 400, easing: 'cubic-bezier(.16,1,.3,1)' }).onfinish = () => p.remove();
      }
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validate()) return;

      const lines = [`${CONFIG.greeting}, soy ${name.value.trim()}. Quiero agendar una sesión.`, ''];
      if (sel.value) lines.push(`*Terapia:* ${sel.value}`);
      else lines.push('*Terapia:* necesito orientación');
      if (date.value) { const [y, m, d] = date.value.split('-'); lines.push(`*Fecha preferida:* ${d}/${m}/${y}`); }
      lines.push(`*Mi WhatsApp:* ${phone.value.trim()}`);
      if (msg.value.trim()) lines.push(`*Mensaje:* ${msg.value.trim()}`);

      const url = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`;
      burst(submitBtn);
      window.open(url, '_blank', 'noopener');
      fallback.href = url;
      success.hidden = false;
      setTimeout(() => { success.hidden = true; form.reset(); }, 14000);
    });
  }

  /* ==========================================================================
     WHATSAPP FLOTANTE
     ========================================================================== */
  function initWhatsAppTip() {
    const tip = $('#wa-tip');
    if (!tip || reduceMotion) return;
    setTimeout(() => {
      tip.classList.add('is-visible');
      setTimeout(() => tip.classList.remove('is-visible'), 6500);
    }, 10000);
  }

  /* ==========================================================================
     ARRANQUE
     ========================================================================== */
  function boot() {
    initMenu();
    initActions();
    initHeader();
    initForm();
    initSelector();
    initReveal();
    initCounters();
    initPointerFX();
    initParticles();
    initPortal();
    initWhatsAppTip();
    initLenis();

    /* Orden del documento: cada pin desplaza lo que viene debajo */
    if (hasGSAP) {
      initHeroExit();
      initScrubText();
      initParallax();
    }
    initMarqueeMotion();
    initServices();
    initChakras();
    if (hasGSAP) {
      initCalm();
      initProcess();
      initFooterParallax();
      initProgress();
      initMarqueeVelocity();
    }

    runLoader().then(() => {
      root.classList.remove('is-loading');
      root.classList.add('hero-in');
      if (lenis) lenis.start();
      if (hasGSAP) ScrollTrigger.refresh();
    });

    window.addEventListener('load', () => { if (hasGSAP) ScrollTrigger.refresh(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (hasGSAP) ScrollTrigger.refresh(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
