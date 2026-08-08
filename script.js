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
    timeZone: 'Asia/Colombo',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  });
  const tick = () => { timeEl.textContent = `${fmt.format(new Date())} in Colombo`; };
  tick();
  setInterval(tick, 30000);
}

/* ─────────── Footer year ─────────── */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ─────────── Nav: scrolled state + active section ─────────── */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('is-scrolled', window.scrollY > 40);
}, { passive: true });

const navLinks = [...document.querySelectorAll('.nav-links a')];
const sections = navLinks
  .map((a) => document.getElementById(a.getAttribute('href').slice(1)))
  .filter(Boolean);

const setActive = () => {
  const y = window.scrollY + window.innerHeight * 0.35;
  let current = null;
  sections.forEach((s) => { if (s.offsetTop <= y) current = s.id; });
  navLinks.forEach((a) =>
    a.classList.toggle('is-active', a.getAttribute('href') === `#${current}`));
};
window.addEventListener('scroll', setActive, { passive: true });
setActive();

/* ─────────── Scroll reveals (fail-open) ───────────
   Position checks are the source of truth; IntersectionObserver is an
   optimisation, and a low-frequency interval guarantees nothing can
   stay hidden if either misbehaves (anchor jumps, odd embedders). */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
{
  const pending = new Set(document.querySelectorAll('[data-reveal]'));

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
    const onScroll = () => {
      if (queued || !pending.size) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; sweep(false); });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pageshow', () => sweep(false));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) sweep(false);
    });

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) reveal(entry.target);
        });
      }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });
      pending.forEach((el) => io.observe(el));
    }

    const guard = setInterval(() => {
      sweep(false);
      if (!pending.size) clearInterval(guard);
    }, 700);
  }
}

/* ─────────── Motion engine ───────────
   One rAF loop drives everything scroll-linked: the progress bar,
   parallax depth inside image frames, velocity skew on display type,
   and the hide-on-scroll nav. Transform/opacity only — no layout. */
if (!reducedMotion) {
  const progressBar = document.querySelector('.progress span');
  const skewEls = [...document.querySelectorAll('.hero-statement, .contact-title')];
  const parallaxEls = [...document.querySelectorAll('[data-parallax]')].map((el) => ({
    el,
    strength: parseFloat(el.dataset.parallax) || 20,
    top: 0, h: 0, scale: 1.1,
  }));

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const measure = () => {
    parallaxEls.forEach((p) => {
      const r = p.el.parentElement.getBoundingClientRect();
      p.top = r.top + window.scrollY;
      p.h = r.height || 1;
      p.scale = 1 + (p.strength * 2.4) / p.h;
    });
  };
  measure();
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('load', () => { measure(); setTimeout(measure, 1000); });

  let smoothY = window.scrollY;
  let lastY = window.scrollY;

  const frame = () => {
    const y = window.scrollY;
    const vh = window.innerHeight;
    smoothY += (y - smoothY) * 0.12;
    const vel = y - smoothY;

    if (progressBar) {
      const max = document.documentElement.scrollHeight - vh;
      progressBar.style.transform = `scaleX(${clamp(y / Math.max(max, 1), 0, 1)})`;
    }

    parallaxEls.forEach((p) => {
      const centerDelta = (p.top + p.h / 2 - smoothY) - vh / 2;
      const prog = clamp(centerDelta / (vh / 2 + p.h / 2), -1, 1);
      p.el.style.transform =
        `translate3d(0, ${(prog * p.strength).toFixed(2)}px, 0) scale(${p.scale.toFixed(3)})`;
    });

    const skew = clamp(vel * 0.05, -2.5, 2.5);
    skewEls.forEach((el) => { el.style.transform = `skewY(${skew.toFixed(3)}deg)`; });

    if (y > 600 && y - lastY > 3) nav.classList.add('is-hidden');
    else if (y - lastY < -3 || y <= 600) nav.classList.remove('is-hidden');
    lastY = y;

    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
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
