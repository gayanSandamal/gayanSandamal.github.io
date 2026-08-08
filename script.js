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

  /* cursor */
  const cursor = document.getElementById('cursor');
  let mx = -100, my = -100, cx = -100, cy = -100;
  if (finePointer && cursor) {
    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      cursor.classList.add('is-on');
    }, { passive: true });
    document.addEventListener('mouseleave', () => cursor.classList.remove('is-on'));
    document.addEventListener('mouseover', (e) => {
      const view = e.target.closest('[data-cursor]');
      const link = e.target.closest('a, button');
      cursor.classList.toggle('is-view', !!view);
      cursor.classList.toggle('is-link', !view && !!link);
    });
  }

  let smoothY = window.scrollY;
  let lastY = window.scrollY;
  let marqueeX = 0;

  const frame = () => {
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

    /* gallery: vertical scroll becomes horizontal travel */
    if (gallery && galleryTrack) {
      const p = sceneProgress(gallery);
      galleryTrack.style.transform = `translate3d(${(-p * galleryMaxX).toFixed(1)}px, 0, 0)`;
      if (galleryCount && galleryPlates > 0) {
        const idx = Math.min(galleryPlates, Math.floor(p * galleryPlates) + 1);
        galleryCount.textContent =
          `${String(idx).padStart(2, '0')} / ${String(galleryPlates).padStart(2, '0')}`;
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

    /* marquee: always moving, faster with scroll velocity */
    if (marqueeTrack && marqueeHalf > 0) {
      marqueeX -= 0.6 + Math.min(Math.abs(vel) * 0.06, 4);
      if (marqueeX <= -marqueeHalf) marqueeX += marqueeHalf;
      marqueeTrack.style.transform = `translate3d(${marqueeX.toFixed(1)}px, 0, 0)`;
    }

    /* cursor chase */
    if (finePointer && cursor) {
      cx += (mx - cx) * 0.22;
      cy += (my - cy) * 0.22;
      cursor.style.left = `${cx.toFixed(1)}px`;
      cursor.style.top = `${cy.toFixed(1)}px`;
    }

    /* nav: hide going down, return going up */
    if (y > 600 && y - lastY > 3) nav.classList.add('is-hidden');
    else if (y - lastY < -3 || y <= 600) nav.classList.remove('is-hidden');
    nav.classList.toggle('is-scrolled', y > 40);
    lastY = y;

    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
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
