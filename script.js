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
