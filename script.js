/* ═══════════════════════════════════════════════════════════
   GAYAN SANDAMAL — portfolio engine
   Preloader → char/line choreography → scroll-scrub scenes
   (kinetic hero, horizontal gallery, contact finale), theme
   morph, velocity marquee, custom cursor. Vanilla, one rAF.
   ═══════════════════════════════════════════════════════════ */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ─────────── Copy to clipboard + toast ─────────── */
const copyToClipBoard = (text) => {
  navigator.clipboard.writeText(text);
  showToast(`Copied — ${text}`);
};

function showToast(msg) {
  const el = document.getElementById('snackbar');
  el.querySelector('span').innerText = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ─────────── Local time, Colombo ─────────── */
const timeEl = document.getElementById('localTime');
if (timeEl) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const tick = () => { timeEl.textContent = `${fmt.format(new Date())} in Colombo`; };
  tick();
  setInterval(tick, 30000);
}

/* ─────────── Footer year ─────────── */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ─────────── Preloader ─────────── */
{
  const loader = document.getElementById('loader');
  let seen = false;
  try { seen = sessionStorage.getItem('gs-seen') === '1'; } catch (e) { /* private mode */ }

  const finish = () => {
    document.documentElement.classList.add('ready');
    if (loader) {
      loader.classList.add('is-done');
      setTimeout(() => loader.remove(), 1000);
    }
    document.body.style.overflow = '';
    try { sessionStorage.setItem('gs-seen', '1'); } catch (e) { /* ignore */ }
  };

  if (reducedMotion || seen || !loader) {
    if (loader) loader.remove();
    document.documentElement.classList.add('ready');
  } else {
    document.body.style.overflow = 'hidden';
    const countEl = document.getElementById('loaderCount');
    const barEl = document.getElementById('loaderBar');
    const t0 = performance.now();
    const dur = 1300;
    const step = (now) => {
      const p = clamp((now - t0) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const n = Math.round(eased * 100);
      if (countEl) countEl.textContent = n;
      if (barEl) barEl.style.width = `${n}%`;
      if (p < 1) requestAnimationFrame(step);
      else setTimeout(finish, 150);
    };
    requestAnimationFrame(step);
    /* absolute fallback — the site must never stay behind the curtain */
    setTimeout(() => {
      if (!document.documentElement.classList.contains('ready')) finish();
    }, 3500);
  }
}

/* ─────────── Inertia scrolling ───────────
   Wheel and keyboard drive a target; the frame loop eases the real
   scroll position toward it. Native scrolling stays the source of
   truth (so position:sticky, anchors and the scrollbar all keep
   working) — only the pacing is ours. Pointer/touch scrolling is left
   completely alone. */
const inertia = {
  on: false,
  target: window.scrollY,
  current: window.scrollY,
  ease: 0.14,
  beat: 0,          /* timestamp of the last frame; proves the loop is alive */
};

if (!reducedMotion && finePointer && !('ontouchstart' in window)) {
  const maxScroll = () =>
    Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  inertia.on = true;
  document.documentElement.classList.add('has-inertia');

  const sync = () => { inertia.target = inertia.current = window.scrollY; };

  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) return;                       /* pinch-zoom */
    const t = e.target;
    if (t && t.closest && t.closest('[data-native-scroll]')) return;
    /* Never swallow the gesture unless the loop that replaces it is
       demonstrably alive — a stalled loop plus preventDefault would
       leave the page unscrollable. */
    if (performance.now() - inertia.beat > 400) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? window.innerHeight : 1;
    /* Trackpads emit small, frequent, fractional deltas and already
       carry OS momentum; mouse wheels emit large discrete notches.
       Ease the notches hard, stay light on the trackpad so we never
       fight momentum that's already smooth. */
    const d = Math.abs(e.deltaY);
    inertia.ease = (d >= 45 && Number.isInteger(e.deltaY)) ? 0.11 : 0.2;
    inertia.target = clamp(inertia.target + e.deltaY * unit, 0, maxScroll());
  }, { passive: false });

  /* keyboard paging, kept on the same easing */
  const keySteps = {
    ArrowDown: 90, ArrowUp: -90,
    PageDown: 0.85, PageUp: -0.85,
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

  /* in-page anchors ease instead of jumping */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const el = id ? document.getElementById(id) : document.body;
    if (!el) return;
    e.preventDefault();
    inertia.target = clamp(
      el.getBoundingClientRect().top + window.scrollY, 0, maxScroll());
  });

  /* anything that moves the page outside our control re-syncs us */
  window.addEventListener('resize', sync, { passive: true });
  window.addEventListener('pageshow', sync);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
}

/* ─────────── Split headings into chars ─────────── */
document.querySelectorAll('[data-split]').forEach((heading) => {
  let i = 0;
  const splitNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const frag = document.createDocumentFragment();
      for (const ch of node.textContent) {
        if (/\s/.test(ch)) {
          frag.appendChild(document.createTextNode(ch));
        } else {
          const s = document.createElement('span');
          s.className = 'char';
          s.style.setProperty('--i', i++);
          s.textContent = ch;
          frag.appendChild(s);
        }
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
   optimisation; interval + visibility hooks guarantee nothing can
   stay hidden after anchor jumps or background-tab loads. */
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
        if (el.getBoundingClientRect().top < window.innerHeight - 30) {
          reveal(el, staggered ? Math.min(i++ * 70, 280) : 0);
        }
      });
    };

    sweep(true);

    let queued = false;
    window.addEventListener('scroll', () => {
      if (queued || !pending.size) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; sweep(false); });
    }, { passive: true });
    window.addEventListener('pageshow', () => sweep(false));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) sweep(false);
    });

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { if (entry.isIntersecting) reveal(entry.target); });
      }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });
      pending.forEach((el) => io.observe(el));
    }

    const guard = setInterval(() => {
      sweep(false);
      if (!pending.size) clearInterval(guard);
    }, 700);
  }
}

/* ─────────── Nav: active section links ─────────── */
const nav = document.getElementById('nav');
const navLinks = [...document.querySelectorAll('.nav-links a')];
const navSections = navLinks
  .map((a) => document.getElementById(a.getAttribute('href').slice(1)))
  .filter(Boolean);

const setActive = () => {
  const y = window.scrollY + window.innerHeight * 0.35;
  let current = null;
  navSections.forEach((s) => { if (s.offsetTop <= y) current = s.id; });
  navLinks.forEach((a) =>
    a.classList.toggle('is-active', a.getAttribute('href') === `#${current}`));
};
window.addEventListener('scroll', setActive, { passive: true });
setActive();

/* ─────────── Main frame loop ───────────
   All scroll-linked writes live here: scenes, theme, marquee,
   cursor, progress, nav state. Reads first, then writes. */
if (!reducedMotion) {
  const progressBar = document.querySelector('.progress span');

  /* scenes */
  const heroScene = document.querySelector('[data-scene="hero"]');
  const heroLines = heroScene ? [...heroScene.querySelectorAll('.line')] : [];
  const heroStage = heroScene ? heroScene.querySelector('.stage') : null;

  const gallery = document.querySelector('[data-scene="gallery"]');
  const galleryStage = gallery ? gallery.querySelector('.gallery-stage') : null;
  const galleryTrack = document.getElementById('galleryTrack');
  const galleryCount = document.getElementById('galleryCount');
  const galleryPlates = galleryTrack ? galleryTrack.children.length : 0;

  const contactScene = document.querySelector('[data-scene="contact"]');
  const contactTitle = document.getElementById('contactTitle');

  const workChapter = document.getElementById('work');
  const marqueeTrack = document.getElementById('marqueeTrack');
  const galleryMedia = galleryTrack ? [...galleryTrack.querySelectorAll('.g-media img')] : [];
  const signature = document.querySelector('.signature');
  const stackCards = [...document.querySelectorAll('[data-stack] > *')];

  /* measured geometry */
  let galleryMaxX = 0;
  let marqueeHalf = 0;
  let workTop = 0;
  let workBottom = 0;

  const measure = () => {
    if (galleryTrack && galleryStage) {
      galleryMaxX = Math.max(0, galleryTrack.scrollWidth - galleryStage.clientWidth);
    }
    if (marqueeTrack) marqueeHalf = marqueeTrack.scrollWidth / 2;
    if (workChapter) {
      const r = workChapter.getBoundingClientRect();
      workTop = r.top + window.scrollY;
      workBottom = workTop + r.height;
    }
  };
  measure();
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('load', () => { measure(); setTimeout(measure, 1000); });

  const sceneProgress = (wrapper) => {
    const r = wrapper.getBoundingClientRect();
    const range = r.height - window.innerHeight;
    return range > 0 ? clamp(-r.top / range, 0, 1) : 0;
  };

  /* cursor + work-index peek + magnetism (all pointer-driven) */
  const cursor = document.getElementById('cursor');
  const peek = document.getElementById('peek');
  const peekImg = document.getElementById('peekImg');
  const magnets = [...document.querySelectorAll('[data-magnetic]')];
  let mx = -100, my = -100, cx = -100, cy = -100, px = -100, py = -100;

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

    /* 3D tilt on gallery media */
    document.querySelectorAll('.g-media').forEach((media) => {
      media.addEventListener('mousemove', (e) => {
        const r = media.getBoundingClientRect();
        const rx = ((e.clientY - r.top) / r.height - 0.5) * -7;
        const ry = ((e.clientX - r.left) / r.width - 0.5) * 7;
        media.style.transform =
          `perspective(1100px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(1.015)`;
      });
      media.addEventListener('mouseleave', () => { media.style.transform = ''; });
    });
  }

  let smoothY = window.scrollY;
  let lastY = window.scrollY;
  let marqueeX = 0;

  /* Stepping the scroll position and painting the scene are separate
     jobs: only the rAF loop may step inertia (it writes scrollY, which
     would re-enter through the scroll listener), while render() is safe
     to call from anywhere and also runs on scroll — so scroll-linked
     visuals stay correct even when rAF is throttled. */
  const stepInertia = () => {
    if (!inertia.on) return;
    const y0 = window.scrollY;
    if (Math.abs(inertia.target - y0) > 0.6) {
      inertia.current = y0 + (inertia.target - y0) * inertia.ease;
      window.scrollTo(0, inertia.current);
    } else {
      inertia.target = inertia.current = y0;
    }
  };

  const render = () => {
    const y = window.scrollY;
    const vh = window.innerHeight;
    smoothY += (y - smoothY) * 0.12;
    const vel = y - smoothY;

    /* progress */
    if (progressBar) {
      const max = document.documentElement.scrollHeight - vh;
      progressBar.style.transform = `scaleX(${clamp(y / Math.max(max, 1), 0, 1)})`;
    }

    /* hero: lines drift apart and the stage fades as it unpins */
    if (heroScene && heroStage) {
      const p = sceneProgress(heroScene);
      const drift = p * window.innerWidth * 0.14;
      heroLines.forEach((line) => {
        const dir = parseFloat(line.dataset.drift) || 1;
        line.style.transform = `translate3d(${(dir * drift).toFixed(1)}px, 0, 0)`;
      });
      heroStage.style.opacity = (1 - clamp((p - 0.55) * 2.4, 0, 1)).toFixed(3);
    }

    /* gallery: vertical scroll becomes horizontal travel, and each
       image drifts inside its frame as the plate crosses the screen */
    if (gallery && galleryTrack) {
      const p = sceneProgress(gallery);
      galleryTrack.style.transform = `translate3d(${(-p * galleryMaxX).toFixed(1)}px, 0, 0)`;
      if (galleryCount && galleryPlates > 0) {
        const idx = Math.min(galleryPlates, Math.floor(p * galleryPlates) + 1);
        galleryCount.textContent =
          `${String(idx).padStart(2, '0')} / ${String(galleryPlates).padStart(2, '0')}`;
      }
      if (p > 0 && p < 1) {
        const cxv = window.innerWidth / 2;
        galleryMedia.forEach((img) => {
          const r = img.getBoundingClientRect();
          if (r.right < -200 || r.left > window.innerWidth + 200) return;
          const off = clamp(((r.left + r.width / 2) - cxv) / window.innerWidth, -1, 1);
          img.style.transform = `translate3d(${(off * 34).toFixed(1)}px, 0, 0) scale(1.12)`;
        });
      }
    }

    /* contact finale: title grows in and shears with velocity */
    if (contactScene && contactTitle) {
      const p = sceneProgress(contactScene);
      const scale = 0.92 + 0.08 * p;
      const skew = clamp(vel * 0.04, -2, 2);
      contactTitle.style.transform = `scale(${scale.toFixed(4)}) skewY(${skew.toFixed(3)}deg)`;
    }

    /* theme morph: page turns to ink through the work chapter */
    if (workChapter) {
      const mid = y + vh * 0.5;
      document.documentElement.classList.toggle(
        'theme-ink', mid > workTop && mid < workBottom);
    }

    /* marquee: drifts by itself, accelerates with scroll speed, and
       reverses when you scroll back up */
    if (marqueeTrack && marqueeHalf > 0) {
      const dir = vel < -0.4 ? 1 : -1;
      marqueeX += dir * (0.6 + Math.min(Math.abs(vel) * 0.07, 5));
      if (marqueeX <= -marqueeHalf) marqueeX += marqueeHalf;
      if (marqueeX > 0) marqueeX -= marqueeHalf;
      marqueeTrack.style.transform = `translate3d(${marqueeX.toFixed(1)}px, 0, 0)`;
    }

    /* scrubbed copy: words light up across the block as it crosses */
    scrubBlocks.forEach(({ el, words }) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) return;
      const p = clamp((vh * 0.86 - r.top) / (vh * 0.5 + r.height * 0.5), 0, 1);
      const lit = p * (words.length + 6);
      words.forEach((w, i) => {
        w.style.opacity = clamp((lit - i) * 0.6, 0.16, 1).toFixed(3);
      });
    });

    /* stacking cards: each card shrinks slightly as the next covers it */
    stackCards.forEach((card, i) => {
      const r = card.getBoundingClientRect();
      const next = stackCards[i + 1];
      if (!next) { card.style.transform = ''; return; }
      const nr = next.getBoundingClientRect();
      const overlap = clamp((r.bottom - nr.top) / Math.max(r.height, 1), 0, 1);
      card.style.transform = `scale(${(1 - overlap * 0.055).toFixed(4)})`;
    });

    /* signature fills once its band is on screen */
    if (signature) {
      const r = signature.getBoundingClientRect();
      signature.classList.toggle('is-lit', r.top < vh * 0.92 && r.bottom > 0);
    }

    /* cursor chase, peek trail (slower = depth), magnet pull */
    if (finePointer) {
      if (cursor) {
        cx += (mx - cx) * 0.22;
        cy += (my - cy) * 0.22;
        cursor.style.left = `${cx.toFixed(1)}px`;
        cursor.style.top = `${cy.toFixed(1)}px`;
      }
      if (peek) {
        px += (mx - px) * 0.1;
        py += (my - py) * 0.1;
        peek.style.left = `${px.toFixed(1)}px`;
        peek.style.top = `${py.toFixed(1)}px`;
      }
      magnets.forEach((el) => {
        const r = el.getBoundingClientRect();
        const ex = r.left + r.width / 2;
        const ey = r.top + r.height / 2;
        const dx = mx - ex;
        const dy = my - ey;
        const dist = Math.hypot(dx, dy);
        /* capped so the effect stays a nudge on small targets and never
           drags a wide element out of its column */
        const radius = Math.min(Math.max(r.width, 80) * 1.1, 190);
        if (dist < radius) {
          const pull = 1 - dist / radius;
          el.style.transform =
            `translate3d(${(dx * 0.28 * pull).toFixed(1)}px, ${(dy * 0.42 * pull).toFixed(1)}px, 0)`;
        } else if (el.style.transform) {
          el.style.transform = '';
        }
      });
    }

    /* nav: hide going down, return going up */
    if (y > 600 && y - lastY > 3) nav.classList.add('is-hidden');
    else if (y - lastY < -3 || y <= 600) nav.classList.remove('is-hidden');
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

  let scrollQueued = false;
  window.addEventListener('scroll', () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => { scrollQueued = false; });
    render();
  }, { passive: true });
  window.addEventListener('resize', render, { passive: true });
} else {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 40);
  }, { passive: true });
}

/* ─────────── Stat counters ─────────── */
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    counterObserver.unobserve(el);
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';
    if (reducedMotion) { el.textContent = target + suffix; return; }
    const duration = 1400;
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
document.querySelectorAll('.stat-num[data-count]').forEach((el) => counterObserver.observe(el));
