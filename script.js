/* ═══════════════════════════════════════════════════════════
   GAYAN SANDAMAL — portfolio engine
   DOM layer: overture, choreography, inertia scrolling, scrubbed
   copy, stacking cards, cross-fading voices and the chapter rail.
   The WebGL layer lives in scene3d.js and is driven from the same
   scroll positions, so the two can never disagree.
   ═══════════════════════════════════════════════════════════ */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ─────────── Clipboard + toast ─────────── */
const copyToClipBoard = (text) => {
  navigator.clipboard.writeText(text);
  const el = document.getElementById('snackbar');
  el.querySelector('span').innerText = `Copied — ${text}`;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2600);
};

/* ─────────── Colombo clock ─────────── */
const timeEl = document.getElementById('localTime');
if (timeEl) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const tick = () => { timeEl.textContent = fmt.format(new Date()); };
  tick();
  setInterval(tick, 30000);
}

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ─────────── Overture ─────────── */
{
  const overture = document.getElementById('overture');
  let seen = false;
  try { seen = sessionStorage.getItem('gs-seen') === '1'; } catch (e) { /* private mode */ }

  const finish = () => {
    document.documentElement.classList.add('ready');
    if (overture) {
      overture.classList.add('is-done');
      setTimeout(() => overture.remove(), 1400);
    }
    document.body.style.overflow = '';
    try { sessionStorage.setItem('gs-seen', '1'); } catch (e) { /* ignore */ }
  };

  if (reducedMotion || seen || !overture) {
    if (overture) overture.remove();
    document.documentElement.classList.add('ready');
  } else {
    document.body.style.overflow = 'hidden';
    const fill = document.getElementById('overtureFill');
    const t0 = performance.now();
    const dur = 1500;
    const step = (now) => {
      const p = clamp((now - t0) / dur, 0, 1);
      if (fill) fill.style.width = `${(1 - Math.pow(1 - p, 3)) * 100}%`;
      if (p < 1) requestAnimationFrame(step);
      else setTimeout(finish, 220);
    };
    requestAnimationFrame(step);
    /* the curtain must never be able to trap the page */
    setTimeout(() => {
      if (!document.documentElement.classList.contains('ready')) finish();
    }, 4000);
  }
}

/* ─────────── Inertia scrolling ───────────
   Wheel and keyboard set a target; the loop eases the real scroll
   position toward it. Native scroll stays the source of truth, so
   sticky scenes, anchors and the scrollbar keep working. */
const inertia = {
  on: false,
  target: window.scrollY,
  current: window.scrollY,
  ease: 0.14,
  beat: 0,
  applied: window.scrollY,   /* last position we wrote ourselves */
};

if (!reducedMotion && finePointer && !('ontouchstart' in window)) {
  const maxScroll = () =>
    Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  inertia.on = true;
  document.documentElement.classList.add('has-inertia');

  const sync = () => { inertia.target = inertia.current = window.scrollY; };

  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) return;
    const t = e.target;
    if (t && t.closest && t.closest('[data-native-scroll]')) return;
    /* only swallow the gesture while the loop replacing it is alive */
    if (performance.now() - inertia.beat > 400) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? window.innerHeight : 1;
    const d = Math.abs(e.deltaY);
    inertia.ease = (d >= 45 && Number.isInteger(e.deltaY)) ? 0.1 : 0.19;
    inertia.target = clamp(inertia.target + e.deltaY * unit, 0, maxScroll());
  }, { passive: false });

  const keySteps = {
    ArrowDown: 90, ArrowUp: -90, PageDown: 0.85, PageUp: -0.85,
    Home: 'top', End: 'bottom', ' ': 0.85,
  };
  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const step = keySteps[e.key];
    if (step === undefined) return;
    if (step === 'top') inertia.target = 0;
    else if (step === 'bottom') inertia.target = maxScroll();
    else if (Math.abs(step) < 2) inertia.target += step * window.innerHeight;
    else inertia.target += step;
    inertia.target = clamp(inertia.target, 0, maxScroll());
    e.preventDefault();
  });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const el = id ? document.getElementById(id) : document.body;
    if (!el) return;
    e.preventDefault();
    inertia.target = clamp(el.getBoundingClientRect().top + window.scrollY, 0, maxScroll());
  });

  window.addEventListener('resize', sync, { passive: true });
  window.addEventListener('pageshow', sync);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
}

/* ─────────── Split headings into characters ─────────── */
document.querySelectorAll('[data-split]').forEach((heading) => {
  let i = 0;
  const splitNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const frag = document.createDocumentFragment();
      for (const ch of node.textContent) {
        if (/\s/.test(ch)) { frag.appendChild(document.createTextNode(ch)); continue; }
        const s = document.createElement('span');
        s.className = 'char';
        s.style.setProperty('--i', i++);
        s.textContent = ch;
        frag.appendChild(s);
      }
      node.replaceWith(frag);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      [...node.childNodes].forEach(splitNode);
    }
  };
  [...heading.childNodes].forEach(splitNode);
});

/* ─────────── Split scrubbed copy into words ─────────── */
const scrubBlocks = [...document.querySelectorAll('[data-scrub]')].map((el) => {
  const splitNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        const s = document.createElement('span');
        s.className = 'word';
        s.textContent = part;
        frag.appendChild(s);
      });
      node.replaceWith(frag);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      [...node.childNodes].forEach(splitNode);
    }
  };
  [...el.childNodes].forEach(splitNode);
  return { el, words: [...el.querySelectorAll('.word')] };
});
if (reducedMotion) {
  scrubBlocks.forEach(({ words }) => words.forEach((w) => { w.style.opacity = 1; }));
}

/* ─────────── Reveals (fail-open) ───────────
   Position checks are the source of truth; IntersectionObserver is an
   optimisation; an interval plus visibility hooks guarantee nothing
   can stay hidden after anchor jumps or background-tab loads. */
{
  const pending = new Set(document.querySelectorAll('[data-reveal], [data-split]'));

  const reveal = (el, delay = 0) => {
    if (!pending.has(el)) return;
    pending.delete(el);
    el.style.transitionDelay = `${delay}ms`;
    el.classList.add('is-visible');
  };

  if (reducedMotion) {
    pending.forEach((el) => el.classList.add('is-visible'));
    pending.clear();
  } else {
    const sweep = (staggered) => {
      if (!pending.size) return;
      let i = 0;
      [...pending].forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight - 40) {
          reveal(el, staggered ? Math.min(i++ * 80, 320) : 0);
        }
      });
    };

    sweep(true);

    let lastSweep = 0;
    window.addEventListener('scroll', () => {
      if (!pending.size) return;
      const now = performance.now();
      if (now - lastSweep < 60) return;
      lastSweep = now;
      sweep(false);
    }, { passive: true });
    window.addEventListener('pageshow', () => sweep(false));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) sweep(false); });

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { if (entry.isIntersecting) reveal(entry.target); });
      }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });
      pending.forEach((el) => io.observe(el));
    }

    const guard = setInterval(() => {
      sweep(false);
      if (!pending.size) clearInterval(guard);
    }, 700);
  }
}

/* ─────────── Nav + rail active state ─────────── */
const nav = document.getElementById('nav');
const navLinks = [...document.querySelectorAll('.nav-links a')];
const railLinks = [...document.querySelectorAll('.rail a')];
const anchored = (links) => links
  .map((a) => ({ a, el: document.getElementById(a.getAttribute('href').slice(1)) }))
  .filter((x) => x.el);
const navMap = anchored(navLinks);
const railMap = anchored(railLinks);

const setActive = () => {
  const y = window.scrollY + window.innerHeight * 0.4;
  let currentNav = null;
  navMap.forEach(({ el }) => { if (el.offsetTop <= y) currentNav = el.id; });
  navMap.forEach(({ a, el }) => a.classList.toggle('is-active', el.id === currentNav));
  let currentRail = null;
  railMap.forEach(({ el }) => { if (el.offsetTop <= y) currentRail = el.id; });
  railMap.forEach(({ a, el }) => a.classList.toggle('is-current', el.id === currentRail));
};
window.addEventListener('scroll', setActive, { passive: true });
setActive();

/* ─────────── Scene engine ─────────── */
if (!reducedMotion) {
  const heroScene = document.querySelector('[data-scene="hero"]');
  const heroStage = heroScene ? heroScene.querySelector('.stage') : null;

  const voicesScene = document.querySelector('[data-scene="voices"]');
  const quotes = voicesScene ? [...voicesScene.querySelectorAll('blockquote')] : [];

  const contactTitle = document.getElementById('contactTitle');
  const parallaxImgs = [...document.querySelectorAll('[data-parallax]')];
  const stackCards = [...document.querySelectorAll('[data-stack] > *')];

  const sceneProgress = (wrapper) => {
    const r = wrapper.getBoundingClientRect();
    const range = r.height - window.innerHeight;
    return range > 0 ? clamp(-r.top / range, 0, 1) : 0;
  };

  /* pointer-driven layers */
  const cursor = document.getElementById('cursor');
  const peek = document.getElementById('peek');
  const peekImg = document.getElementById('peekImg');
  const magnets = [...document.querySelectorAll('[data-magnetic]')];
  let mx = -200, my = -200, cx = -200, cy = -200, px = -200, py = -200;

  if (finePointer) {
    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      if (cursor) cursor.classList.add('is-on');
    }, { passive: true });
    document.addEventListener('mouseleave', () => {
      if (cursor) cursor.classList.remove('is-on');
    });
    document.addEventListener('mouseover', (e) => {
      if (cursor) {
        const view = e.target.closest('[data-cursor]');
        const link = e.target.closest('a, button');
        cursor.classList.toggle('is-view', !!view);
        cursor.classList.toggle('is-link', !view && !!link);
      }
      if (peek && peekImg) {
        const row = e.target.closest('[data-peek]');
        if (row) {
          const src = row.dataset.peek;
          if (peekImg.getAttribute('src') !== src) peekImg.src = src;
          peek.classList.add('is-on');
        } else if (!e.target.closest('.peek')) {
          peek.classList.remove('is-on');
        }
      }
    });
  }

  let smoothY = window.scrollY;
  let lastY = window.scrollY;

  /* Stepping scroll and painting are separate jobs: only the rAF loop
     may step inertia (it writes scrollY, which re-enters through the
     scroll listener), while render() is safe to call from anywhere and
     also runs on scroll — so visuals stay correct if rAF is throttled. */
  const stepInertia = () => {
    if (!inertia.on) return;
    const y0 = window.scrollY;

    /* If the page moved by any means other than our own last write —
       find-in-page, Tab focus scrolling an element into view,
       scrollIntoView, scroll restoration — adopt that position instead
       of dragging the reader back to a stale target. */
    if (Math.abs(y0 - inertia.applied) > 2) {
      inertia.target = inertia.current = inertia.applied = y0;
      return;
    }

    if (Math.abs(inertia.target - y0) > 0.6) {
      inertia.current = y0 + (inertia.target - y0) * inertia.ease;
      window.scrollTo(0, inertia.current);
      inertia.applied = window.scrollY;
    } else {
      inertia.target = inertia.current = inertia.applied = y0;
    }
  };

  const render = () => {
    const y = window.scrollY;
    const vh = window.innerHeight;
    smoothY += (y - smoothY) * 0.12;
    const vel = y - smoothY;

    /* hero: copy lifts and dissolves as the scene unpins */
    if (heroScene && heroStage) {
      const p = sceneProgress(heroScene);
      heroStage.style.transform = `translate3d(0, ${(-p * 60).toFixed(1)}px, 0)`;
      heroStage.style.opacity = (1 - clamp((p - 0.5) * 2.2, 0, 1)).toFixed(3);
    }

    /* framed images drift inside their frames */
    parallaxImgs.forEach((img) => {
      const frame = img.parentElement;
      const r = frame.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const strength = parseFloat(img.dataset.parallax) || 20;
      const off = clamp(((r.top + r.height / 2) - vh / 2) / vh, -1, 1);
      const scale = 1 + (strength * 2.4) / Math.max(r.height, 1);
      img.style.transform =
        `translate3d(0, ${(off * strength).toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
    });

    /* voices: quotes cross-fade across the pinned scene */
    if (voicesScene && quotes.length) {
      const p = sceneProgress(voicesScene);
      const n = quotes.length;
      quotes.forEach((q, i) => {
        const centre = (i + 0.5) / n;
        const d = Math.abs(p - centre) * n;
        const op = clamp(1 - d * 1.5, 0, 1);
        q.style.opacity = op.toFixed(3);
        q.style.transform = `translate3d(0, ${((p - centre) * -40).toFixed(1)}px, 0)`;
      });
    }

    /* contact: title settles and shears with velocity */
    if (contactTitle) {
      const r = contactTitle.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) {
        const skew = clamp(vel * 0.035, -1.8, 1.8);
        contactTitle.style.transform = `skewY(${skew.toFixed(3)}deg)`;
      }
    }

    /* scrubbed copy lights word by word */
    scrubBlocks.forEach(({ el, words }) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -60 || r.top > vh + 60) return;
      const p = clamp((vh * 0.86 - r.top) / (vh * 0.5 + r.height * 0.5), 0, 1);
      const lit = p * (words.length + 6);
      words.forEach((w, i) => {
        w.style.opacity = clamp((lit - i) * 0.6, 0.14, 1).toFixed(3);
      });
    });

    /* stacking cards shrink as the next covers them */
    stackCards.forEach((card, i) => {
      const next = stackCards[i + 1];
      if (!next) { card.style.transform = ''; return; }
      const r = card.getBoundingClientRect();
      const nr = next.getBoundingClientRect();
      const overlap = clamp((r.bottom - nr.top) / Math.max(r.height, 1), 0, 1);
      card.style.transform = `scale(${(1 - overlap * 0.05).toFixed(4)})`;
    });

    /* pointer layers */
    if (finePointer) {
      if (cursor) {
        cx += (mx - cx) * 0.18;
        cy += (my - cy) * 0.18;
        cursor.style.left = `${cx.toFixed(1)}px`;
        cursor.style.top = `${cy.toFixed(1)}px`;
      }
      if (peek) {
        px += (mx - px) * 0.09;
        py += (my - py) * 0.09;
        peek.style.left = `${px.toFixed(1)}px`;
        peek.style.top = `${py.toFixed(1)}px`;
      }
      magnets.forEach((el) => {
        const r = el.getBoundingClientRect();
        const dx = mx - (r.left + r.width / 2);
        const dy = my - (r.top + r.height / 2);
        const dist = Math.hypot(dx, dy);
        const radius = Math.min(Math.max(r.width, 80) * 1.1, 190);
        if (dist < radius) {
          const pull = 1 - dist / radius;
          el.style.transform =
            `translate3d(${(dx * 0.26 * pull).toFixed(1)}px, ${(dy * 0.4 * pull).toFixed(1)}px, 0)`;
        } else if (el.style.transform) {
          el.style.transform = '';
        }
      });
    }

    /* nav */
    if (y > 640 && y - lastY > 3) nav.classList.add('is-hidden');
    else if (y - lastY < -3 || y <= 640) nav.classList.remove('is-hidden');
    nav.classList.toggle('is-scrolled', y > 40);
    lastY = y;
  };

  const loop = () => {
    inertia.beat = performance.now();
    stepInertia();
    render();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  /* Throttled on a timestamp, never on rAF: this listener exists to
     cover the case where rAF is throttled or paused, so it must not
     depend on rAF to release its own gate. */
  let lastRender = 0;
  window.addEventListener('scroll', () => {
    const now = performance.now();
    if (now - lastRender < 16) return;
    lastRender = now;
    render();
  }, { passive: true });
  window.addEventListener('resize', render, { passive: true });
} else {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 40);
  }, { passive: true });
}

/* ─────────── Ledger counters ─────────── */
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    counterObserver.unobserve(el);
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';
    if (reducedMotion) { el.textContent = target + suffix; return; }
    const duration = 1800;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}, { threshold: 0.5 });
document.querySelectorAll('.fig-num[data-count]').forEach((el) => counterObserver.observe(el));
