/* ─── Copy to clipboard ─── */
const copyToClipBoard = (copyText) => {
  navigator.clipboard.writeText(copyText);
  showToast({ msg: `Copied: ${copyText}`, type: 'success' });
};

function showToast({ msg, type }) {
  const el = document.getElementById('snackbar');
  document.querySelector('#snackbar > span').innerText = msg;
  el.className = `show alert alert-${type} d-flex align-items-center`;
  setTimeout(() => { el.className = el.className.replace('show', ''); }, 3000);
}

/* ─── Typewriter ─── */
const typeWriter = (elementId, text, speed, onComplete) => {
  let i = 0;
  const el = document.getElementById(elementId);
  if (!el) return;
  const tick = () => {
    if (i < text.length) {
      el.innerHTML += text.charAt(i);
      i++;
      setTimeout(tick, speed);
    } else if (onComplete) {
      onComplete();
    }
  };
  tick();
};

typeWriter('im', "I'm Gayan", 50, () => {
  typeWriter('fullstack', 'a Senior Technical Lead — Vue, React & Angular', 50, () => {
    typeWriter('se', 'Building for millions of users', 50);
  });
});

/* ─── Scroll Reveal (Intersection Observer) ─── */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('active');
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .stagger-children').forEach(el => {
  revealObserver.observe(el);
});

/* ─── Animated Counters ─── */
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      if (el.dataset.animated) return;
      el.dataset.animated = 'true';
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || '';
      const duration = 1800;
      const steps = 60;
      const increment = target / steps;
      let current = 0;
      const interval = duration / steps;

      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        el.textContent = Math.floor(current) + suffix;
      }, interval);
    }
  });
}, { threshold: 0.3 });

document.querySelectorAll('.stat-number[data-count]').forEach(el => {
  counterObserver.observe(el);
});

/* ─── Active Nav Highlight ─── */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('header .nav-link');

const highlightNav = () => {
  const scrollY = window.scrollY + 100;
  sections.forEach(section => {
    const top = section.offsetTop;
    const height = section.offsetHeight;
    const id = section.getAttribute('id');
    const link = document.querySelector(`header .nav-link[href="#${id}"]`);
    if (link) {
      if (scrollY >= top && scrollY < top + height) {
        link.style.color = 'var(--accent-tertiary)';
      } else {
        link.style.color = '';
      }
    }
  });
};

window.addEventListener('scroll', highlightNav, { passive: true });
highlightNav();

/* ─── Header shrink on scroll ─── */
const header = document.querySelector('header.sticky-top');
if (header) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.style.padding = '0.5rem 1rem';
    } else {
      header.style.padding = '';
    }
  }, { passive: true });
}
