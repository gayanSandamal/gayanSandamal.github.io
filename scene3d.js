/* ═══════════════════════════════════════════════════════════
   WebGL layer — three.js, scroll-driven.

   Two acts share one scene, one camera and one render loop:
     · Hero  — a faceted bronze form that turns with scroll and
               leans toward the pointer.
     · Work  — the projects as textured planes the camera travels
               through sideways as you scroll the pinned section.
   A dust field spans both for depth.

   Everything is progressive: no WebGL, a failed import, a lost
   context or reduced-motion all leave the DOM site fully intact.
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';

const canvas = document.getElementById('gl');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const PROJECTS = [
  './assets/projects/pixelflow.svg',
  './assets/projects/easyrent.png',
  './assets/projects/paradigm360-1.jpeg',
  './assets/projects/planning-poker.png',
];

const SPACING = 4.6;          /* world units between plates */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function boot() {
  if (!canvas || reduced) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
  } catch (err) {
    canvas.remove();
    return;                    /* no WebGL — the DOM site stands alone */
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  /* ── lighting: one warm key, one cool fill, faint ambient ── */
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xd9b077, 2.4);
  key.position.set(3, 4, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x6f7f9a, 0.9);
  fill.position.set(-5, -2, 2);
  scene.add(fill);

  /* ── ACT ONE · the hero form ── */
  const heroGroup = new THREE.Group();
  scene.add(heroGroup);

  const crystal = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.05, 1),
    new THREE.MeshStandardMaterial({
      color: 0x8a6b3f,
      metalness: 0.92,
      roughness: 0.34,
      flatShading: true,
    })
  );
  heroGroup.add(crystal);

  const halo = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.5, 1),
    new THREE.MeshBasicMaterial({
      color: 0xc2a06a,
      wireframe: true,
      transparent: true,
      opacity: 0.14,
    })
  );
  heroGroup.add(halo);

  /* ── ACT TWO · the projects ── */
  const workGroup = new THREE.Group();
  workGroup.visible = false;
  scene.add(workGroup);

  const loader = new THREE.TextureLoader();
  const plates = [];

  /* Fallback texture drawn on a 2D canvas, so a missing or
     undecodable image still yields a legible plate. */
  const placeholder = (label) => {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 640;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1a1714';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = 'rgba(194,160,106,0.5)';
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 24, c.width - 48, c.height - 48);
    ctx.fillStyle = '#c2a06a';
    ctx.font = '300 64px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, c.width / 2, c.height / 2);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  PROJECTS.forEach((url, i) => {
    const geo = new THREE.PlaneGeometry(5.4, 3.4, 24, 16);
    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.x = i * SPACING;
    workGroup.add(mesh);
    plates.push(mesh);

    const applied = (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
      mat.map = tex;
      mat.needsUpdate = true;
      /* fit the plate to the texture's aspect so nothing stretches */
      const img = tex.image;
      const aspect = (img && img.width && img.height) ? img.width / img.height : 1.6;
      const h = 3.4;
      mesh.scale.set((h * aspect) / 5.4, 1, 1);
    };

    loader.load(
      url,
      (tex) => {
        const img = tex.image;
        if (!img || !img.width) { applied(placeholder(`0${i + 1}`)); return; }
        applied(tex);
      },
      undefined,
      () => applied(placeholder(`0${i + 1}`))
    );
  });

  /* ── dust ── */
  const DUST = 700;
  const pos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 34;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 22;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 18 - 4;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      color: 0xc2a06a,
      size: 0.032,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    })
  );
  scene.add(dust);

  /* ── sizing ── */
  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  /* ── pointer (lean only, never a hard follow) ── */
  let px = 0, py = 0, tx = 0, ty = 0;
  window.addEventListener('mousemove', (e) => {
    tx = (e.clientX / window.innerWidth - 0.5) * 2;
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  /* ── scroll ranges ── */
  const heroScene = document.querySelector('[data-scene="hero"]');
  const workScene = document.querySelector('[data-scene="work"]');
  const tally = document.getElementById('workTally');
  const showcase = document.getElementById('showcase');
  const panels = showcase ? [...showcase.children] : [];

  const progressOf = (el) => {
    if (!el) return -1;
    const r = el.getBoundingClientRect();
    const range = r.height - window.innerHeight;
    if (r.bottom < 0 || r.top > window.innerHeight) return -1;
    return range > 0 ? clamp(-r.top / range, 0, 1) : 0;
  };

  /* ── loop ── */
  let smooth = 0;
  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) requestAnimationFrame(tick);
  });

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    running = false;
    canvas.style.opacity = '0';
  });

  function tick() {
    if (!running) return;
    const t = performance.now() * 0.001;

    /* ACT ONE */
    const hp = progressOf(heroScene);
    const heroOn = hp >= 0;
    heroGroup.visible = heroOn;
    if (heroOn) {
      px += (tx - px) * 0.05;
      py += (ty - py) * 0.05;
      /* held to the right of the copy, and pushed further out and
         smaller on narrow screens so it never crowds the type */
      const wide = window.innerWidth > 900;
      const bias = wide ? 2.4 : 1.9;
      heroGroup.position.set(bias + px * 0.5, -py * 0.4 - hp * 3.2, -hp * 5);
      crystal.rotation.y = t * 0.16 + hp * 2.2;
      crystal.rotation.x = 0.32 + py * 0.22 + hp * 0.6;
      halo.rotation.y = -t * 0.1 - hp * 1.4;
      halo.rotation.x = -0.2 - py * 0.16;
      heroGroup.scale.setScalar((wide ? 1 : 0.66) * (1 - hp * 0.28));
      crystal.material.opacity = 1;
    }

    /* ACT TWO */
    const wp = progressOf(workScene);
    const workOn = wp >= 0;
    workGroup.visible = workOn;
    if (workOn) {
      const span = (plates.length - 1) * SPACING;
      const target = -wp * span;
      smooth += (target - smooth) * 0.09;
      /* Composition sits right of centre on wide screens so the copy
         column on the left is never covered; centred when narrow. */
      const bias = window.innerWidth > 900 ? 2.6 : 0;
      workGroup.position.x = smooth + bias;
      workGroup.position.y = 0.55;
      workGroup.scale.setScalar(window.innerWidth > 900 ? 0.88 : 0.7);

      const active = Math.round(wp * (plates.length - 1));
      plates.forEach((m, i) => {
        const d = (i * SPACING + smooth) / SPACING;   /* plates from centre */
        const near = clamp(1 - Math.abs(d) * 0.55, 0, 1);
        m.material.opacity = near;
        m.rotation.y = clamp(d, -1.6, 1.6) * -0.42;
        m.position.z = -Math.abs(d) * 1.5;
        m.position.y = Math.sin(t * 0.6 + i) * 0.05;
      });

      if (tally) {
        tally.textContent =
          `${String(active + 1).padStart(2, '0')} / ${String(plates.length).padStart(2, '0')}`;
      }
      /* the DOM copy is driven from the same progress, so text and
         plate can never disagree */
      panels.forEach((p, i) => {
        const d = Math.abs(wp * (plates.length - 1) - i);
        p.style.opacity = clamp(1 - d * 1.7, 0, 1).toFixed(3);
        p.style.transform = `translate3d(0, ${((wp * (plates.length - 1) - i) * -26).toFixed(1)}px, 0)`;
      });
    }

    dust.rotation.y = t * 0.012;
    dust.position.y = (window.scrollY % 2000) * 0.0016;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  document.documentElement.classList.add('gl-on');
  requestAnimationFrame(tick);
}

boot();
