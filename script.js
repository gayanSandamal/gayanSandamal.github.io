/* ═══════════ Utilities ═══════════ */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ═══════════ Copy to clipboard + snackbar ═══════════ */
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

/* ═══════════ Local time (Colombo) ═══════════ */
const timeEl = document.getElementById('localTime');
if (timeEl) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const tick = () => { timeEl.textContent = `${fmt.format(new Date())} +0530`; };
  tick();
  setInterval(tick, 1000);
}

/* ═══════════ Hero: fit each name line edge-to-edge ═══════════ */
const fitName = () => {
  document.querySelectorAll('.hero-name .line').forEach((line) => {
    const inner = line.querySelector('.line-inner');
    inner.style.fontSize = '100px';
    const w = inner.getBoundingClientRect().width;
    const target = line.getBoundingClientRect().width;
    if (w > 0) inner.style.fontSize = `${Math.floor(100 * (target / w) * 100) / 100}px`;
  });
};
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitName);
fitName();
let fitTimer;
window.addEventListener('resize', () => {
  clearTimeout(fitTimer);
  fitTimer = setTimeout(fitName, 120);
}, { passive: true });

/* ═══════════ Footer year ═══════════ */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ═══════════ Nav scroll state + active link ═══════════ */
const nav = document.getElementById('siteNav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('is-scrolled', window.scrollY > 40);
}, { passive: true });

const navLinks = [...document.querySelectorAll('.site-nav nav a')];
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

/* ═══════════ Scroll reveals ═══════════ */
if (!reducedMotion) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        entry.target.style.transitionDelay = `${Math.min(i * 60, 240)}ms`;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('[data-reveal]').forEach((el) => revealObserver.observe(el));
} else {
  document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
}

/* ═══════════ Animated counters ═══════════ */
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    counterObserver.unobserve(el);
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';
    if (reducedMotion) { el.textContent = target + suffix; return; }
    const duration = 1600;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}, { threshold: 0.4 });
document.querySelectorAll('.stat-num[data-count]').forEach((el) => counterObserver.observe(el));

/* ═══════════ Custom cursor ═══════════ */
if (finePointer && !reducedMotion) {
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  let rx = innerWidth / 2, ry = innerHeight / 2;
  let tx = rx, ty = ry;
  addEventListener('mousemove', (e) => {
    tx = e.clientX; ty = e.clientY;
    dot.style.transform = `translate(${tx - 3}px, ${ty - 3}px)`;
  }, { passive: true });
  const follow = () => {
    rx += (tx - rx) * 0.16;
    ry += (ty - ry) * 0.16;
    ring.style.transform = `translate(${rx - 17}px, ${ry - 17}px)`;
    requestAnimationFrame(follow);
  };
  follow();
  document.querySelectorAll('[data-hover], a, button').forEach((el) => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-active'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-active'));
  });
}

/* ═══════════ Work: cursor-following preview ═══════════ */
if (finePointer && !reducedMotion) {
  const work = document.getElementById('work');
  const preview = work?.querySelector('.work-preview');
  const previewImg = preview?.querySelector('img');
  if (work && preview && previewImg) {
    let px = 0, py = 0, gx = 0, gy = 0, rafOn = false;
    const glide = () => {
      gx += (px - gx) * 0.12;
      gy += (py - gy) * 0.12;
      preview.style.left = `${gx}px`;
      preview.style.top = `${gy}px`;
      if (rafOn) requestAnimationFrame(glide);
    };
    work.querySelectorAll('.work-row').forEach((row) => {
      row.addEventListener('mouseenter', () => {
        const src = row.dataset.preview;
        if (!src) return;
        previewImg.src = src;
        preview.classList.add('is-on');
        if (!rafOn) { rafOn = true; requestAnimationFrame(glide); }
      });
      row.addEventListener('mouseleave', () => {
        preview.classList.remove('is-on');
        rafOn = false;
      });
    });
    work.addEventListener('mousemove', (e) => {
      const offset = 24;
      const w = preview.offsetWidth || 380;
      px = Math.min(e.clientX + offset, innerWidth - w - 16);
      py = e.clientY - preview.offsetHeight / 2;
      if (gx === 0 && gy === 0) { gx = px; gy = py; }
    }, { passive: true });
  }
}

/* ═══════════ Voices: drag to scroll ═══════════ */
const track = document.querySelector('.voices-track');
if (track && finePointer) {
  let down = false, startX = 0, startScroll = 0;
  track.addEventListener('pointerdown', (e) => {
    down = true;
    startX = e.clientX;
    startScroll = track.scrollLeft;
    track.setPointerCapture(e.pointerId);
  });
  track.addEventListener('pointermove', (e) => {
    if (!down) return;
    track.scrollLeft = startScroll - (e.clientX - startX);
  });
  ['pointerup', 'pointercancel'].forEach((ev) =>
    track.addEventListener(ev, () => { down = false; }));
}
