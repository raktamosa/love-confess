(() => {
  'use strict';

  const TYPING = 34;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const app = $('#app');
  const fx = $('#fx');
  const pageNo = $('#pageNo');

  function applyPhoto(el, src, pos) {
    const reset = () => {
      el.style.backgroundImage = '';
      el.classList.remove('has-img');
    };
    src = (src || '').trim();
    if (!src) { reset(); return; }
    // pasang foto hanya kalau file-nya benar-benar ada; kalau gagal load, balik ke placeholder
    const probe = new Image();
    probe.onload = () => {
      el.style.backgroundImage = 'url("' + src + '")';
      el.style.backgroundPosition = pos || el.dataset.pos || 'center';
      el.classList.add('has-img');
    };
    probe.onerror = () => {
      reset();
      console.warn('[foto] tidak ketemu:', src);
    };
    probe.src = src;
  }

  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function center(el) {
    const a = fx.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height / 2 };
  }

  function fillContent() {
    $$('[data-src]').forEach((el) => applyPhoto(el, el.dataset.src));
  }

  function buildBouquet() {
    const g = $('#flowers');
    const defs = [
      [136, 272, 19, '#ffffff', '#969696'],
      [184, 272, 19, '#d6d6d6', '#ffffff'],
      [160, 252, 22, '#484848', '#f0f0f0'],
      [150, 282, 17, '#f2f2f2', '#787878'],
      [174, 284, 16, '#ffffff', '#404040']
    ];
    defs.forEach(([x, y, r, petal, centerColor]) => {
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3 + 0.3;
        g.append(svgEl('circle', {
          cx: x + Math.cos(a) * r * 0.58, cy: y + Math.sin(a) * r * 0.58, r: r * 0.46,
          fill: petal, stroke: '#b0b0b0', 'stroke-width': 1
        }));
      }
      g.append(svgEl('circle', { cx: x, cy: y, r: r * 0.36, fill: centerColor, stroke: '#969696', 'stroke-width': 1 }));
    });
  }

  function sprinkleHearts() {
    $$('.screen[data-hearts]').forEach((screen) => {
      const n = parseInt(screen.dataset.hearts, 10) || 0;
      const cols = 3;
      const rows = Math.ceil(n / cols);
      const cells = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push([c, r]);
      for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
      }
      for (let i = 0; i < n; i++) {
        const [c, r] = cells[i];
        const h = document.createElement('span');
        h.className = 'float-heart';
        h.style.left = (4 + (c + rnd(0.1, 0.9)) * (88 / cols)) + '%';
        h.style.top = (6 + (r + rnd(0.1, 0.9)) * (88 / rows)) + '%';
        h.style.fontSize = rnd(13, 30) + 'px';
        h.style.setProperty('--d', rnd(4, 8) + 's');
        h.style.animationDelay = '-' + rnd(0, 6) + 's';
        h.innerHTML = '<svg class="i" aria-hidden="true"><use href="#i-heart"/></svg>';
        screen.prepend(h);
      }
    });
  }

  const screens = {};
  $$('.screen').forEach((s) => { screens[s.id] = s; });
  let current = null;

  function show(id) {
    const next = screens[id];
    if (!next || next === current) return;
    const prev = current;
    current = next;
    if (prev) {
      prev.classList.remove('is-active');
      prev.dispatchEvent(new Event('leave'));
    }
    next.scrollTop = 0;
    next.classList.add('is-active');
    document.body.dataset.screen = id;
    document.body.dataset.sub = next.hasAttribute('data-sub') ? 'true' : 'false';
    const label = next.dataset.page;
    pageNo.textContent = label || '';
    pageNo.classList.toggle('is-on', !!label && id !== 'p1');
    pageNo.classList.toggle('is-dark', next.classList.contains('on-dark'));
    next.dispatchEvent(new Event('enter'));
  }

  function go(id) {
    history.pushState({ id }, '', '#' + id);
    show(id);
  }

  window.addEventListener('popstate', (e) => show((e.state && e.state.id) || 'p1'));
  $('#back').addEventListener('click', () => history.back());
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-go]');
    if (t) go(t.dataset.go);
  });

  const audio = $('#bgm');
  const musicBtn = $('#musicBtn');
  let fadeTimer = null;

  function fadeTo(v, ms = 1800) {
    clearInterval(fadeTimer);
    const from = audio.volume;
    const steps = 20;
    let i = 0;
    fadeTimer = setInterval(() => {
      i++;
      audio.volume = Math.max(0, Math.min(1, from + (v - from) * (i / steps)));
      if (i >= steps) clearInterval(fadeTimer);
    }, ms / steps);
  }

  function playMusic() {
    if (musicBtn.hidden) return;
    const p = audio.play();
    if (p && p.then) p.then(() => fadeTo(0.7)).catch(() => {});
  }

  function initMusic() {
    if (!audio.getAttribute('src')) { musicBtn.hidden = true; return; }
    audio.volume = 0;
    audio.addEventListener('playing', () => musicBtn.classList.add('is-playing'));
    audio.addEventListener('error', () => musicBtn.classList.remove('is-playing'));
    audio.addEventListener('pause', () => musicBtn.classList.remove('is-playing'));
    initFab();
  }

  function initFab() {
    const M = 10;
    let x = 0, y = 0;
    let pid = null, sx = 0, sy = 0, ox = 0, oy = 0, moved = false;
    let idleTimer = null;

    const size = () => musicBtn.offsetWidth || 56;
    const bounds = () => ({ w: app.clientWidth, h: app.clientHeight });
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const put = () => { musicBtn.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)'; };

    function wake() {
      musicBtn.classList.remove('is-idle');
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => { if (pid == null) musicBtn.classList.add('is-idle'); }, 2800);
    }

    function snap() {
      const { w, h } = bounds();
      const s = size();
      const cx = x + s / 2, cy = y + s / 2;
      const d = [cx, w - cx, cy, h - cy];
      const m = d.indexOf(Math.min(...d));
      if (m === 0) x = M;
      else if (m === 1) x = w - s - M;
      else if (m === 2) y = M;
      else y = h - s - M;
      x = clamp(x, M, w - s - M);
      y = clamp(y, M, h - s - M);
      musicBtn.classList.add('is-snap');
      put();
    }

    musicBtn.addEventListener('pointerdown', (e) => {
      if (pid != null) return;
      pid = e.pointerId;
      sx = e.clientX; sy = e.clientY; ox = x; oy = y;
      moved = false;
      musicBtn.setPointerCapture(pid);
      musicBtn.classList.remove('is-snap', 'is-idle');
      clearTimeout(idleTimer);
    });

    musicBtn.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.hypot(dx, dy) > 6) { moved = true; musicBtn.classList.add('is-drag'); }
      if (!moved) return;
      const { w, h } = bounds();
      const s = size();
      x = clamp(ox + dx, 0, w - s);
      y = clamp(oy + dy, 0, h - s);
      put();
    });

    function release(e, cancelled) {
      if (e.pointerId !== pid) return;
      try { musicBtn.releasePointerCapture(pid); } catch (_) {}
      pid = null;
      musicBtn.classList.remove('is-drag');
      if (moved) snap();
      else if (!cancelled) {
        if (audio.paused) { muted = false; playMusic(); } else { muted = true; audio.pause(); }
      }
      wake();
    }

    musicBtn.addEventListener('pointerup', (e) => release(e, false));
    musicBtn.addEventListener('pointercancel', (e) => release(e, true));
    musicBtn.addEventListener('contextmenu', (e) => e.preventDefault());
    musicBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (audio.paused) { muted = false; playMusic(); } else { muted = true; audio.pause(); }
        wake();
      }
    });

    window.addEventListener('resize', () => { if (pid == null) { musicBtn.classList.remove('is-snap'); snap(); } });

    const { w, h } = bounds();
    x = w - size() - M;
    y = Math.round(h * 0.26);
    put();
    requestAnimationFrame(() => {
      musicBtn.classList.add('is-ready', 'is-pop');
      wake();
    });
  }

  function mkPetal() {
    const el = document.createElement('i');
    el.className = 'petal';
    const w = rnd(14, 22);
    el.style.width = w + 'px';
    el.style.height = w * 0.55 + 'px';
    fx.append(el);
    return el;
  }

  function mkHeart(size) {
    const el = document.createElement('span');
    el.className = 'fx-heart';
    el.style.width = size + 'px';
    el.style.height = size * 0.82 + 'px';
    el.innerHTML = '<svg viewBox="0 0 32 26" style="width:100%;height:100%;fill:currentColor"><use href="#i-heart"/></svg>';
    fx.append(el);
    return el;
  }

  function mkDot() {
    const el = document.createElement('i');
    el.className = 'fx-dot';
    const s = rnd(4, 9);
    el.style.width = el.style.height = s + 'px';
    fx.append(el);
    return el;
  }

  const at = (x, y, extra = '') => 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%) ' + extra;

  function burstPetals(x, y, n = 26) {
    for (let i = 0; i < n; i++) {
      const el = mkPetal();
      const ang = rnd(-Math.PI * 1.05, 0.05);
      const dist = rnd(80, 230);
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist * 1.1;
      const rot = rnd(-300, 300);
      el.animate([
        { transform: at(x, y, 'rotate(0deg) scale(.4)'), opacity: 0 },
        { transform: at(x + dx * 0.6, y + dy * 0.6, 'rotate(' + rot * 0.5 + 'deg) scale(1)'), opacity: 1, offset: 0.25 },
        { transform: at(x + dx, y + dy + 40, 'rotate(' + rot + 'deg) scale(1)'), opacity: 1, offset: 0.6 },
        { transform: at(x + dx * 1.1, y + dy + 220, 'rotate(' + rot * 1.3 + 'deg) scale(.9)'), opacity: 0 }
      ], { duration: rnd(1700, 2600), delay: rnd(0, 160), easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' })
        .onfinish = () => el.remove();
    }
  }

  function riseHearts(x, y, n = 14) {
    for (let i = 0; i < n; i++) {
      const el = mkHeart(rnd(14, 30));
      const dx = rnd(-70, 70);
      const dy = rnd(220, 420);
      el.animate([
        { transform: at(x, y, 'scale(.3)'), opacity: 0 },
        { transform: at(x + dx * 0.4, y - dy * 0.3, 'scale(1)'), opacity: 1, offset: 0.2 },
        { transform: at(x + dx, y - dy, 'scale(1)'), opacity: 0 }
      ], { duration: rnd(1800, 2800), delay: i * 90, easing: 'ease-out', fill: 'both' })
        .onfinish = () => el.remove();
    }
  }

  function confettiBurst(x, y, n = 22) {
    for (let i = 0; i < n; i++) {
      const kind = Math.random();
      const el = kind < 0.4 ? mkPetal() : kind < 0.75 ? mkHeart(rnd(12, 24)) : mkDot();
      const ang = rnd(0, Math.PI * 2);
      const dist = rnd(90, 260);
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist;
      const rot = rnd(-360, 360);
      el.animate([
        { transform: at(x, y, 'scale(.3)'), opacity: 0 },
        { transform: at(x + dx * 0.7, y + dy * 0.7, 'rotate(' + rot * 0.6 + 'deg) scale(1)'), opacity: 1, offset: 0.3 },
        { transform: at(x + dx, y + dy + 260, 'rotate(' + rot + 'deg) scale(.9)'), opacity: 0 }
      ], { duration: rnd(1800, 2800), easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' })
        .onfinish = () => el.remove();
    }
  }

  function fallingHearts(n = 26) {
    const W = fx.clientWidth;
    const H = fx.clientHeight;
    for (let i = 0; i < n; i++) {
      const el = mkHeart(rnd(12, 26));
      const x = rnd(10, W - 10);
      const sway = rnd(-40, 40);
      el.animate([
        { transform: at(x, -30), opacity: 0 },
        { transform: at(x + sway, H * 0.3), opacity: 1, offset: 0.15 },
        { transform: at(x - sway, H * 0.7), opacity: 1, offset: 0.7 },
        { transform: at(x + sway, H + 30), opacity: 0 }
      ], { duration: rnd(4500, 7500), delay: rnd(0, 4500), easing: 'linear', fill: 'both' })
        .onfinish = () => el.remove();
    }
  }

  const cover = $('#cover');
  const stage = $('#stage');
  const hero = $('#hero');
  const char = $('.char', hero);
  const bubble = $('#bubble');
  const flash = $('#flash');
  let seq = 0;
  let state = 'idle';
  let nudgeTimer = null;
  let stepTimer = null;
  let audioCtx = null;
  let muted = false;

  function unlockAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function tuk(vol, k) {
    if (!audioCtx || muted) return;
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(k % 2 ? 210 : 170, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.07);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g).connect(audioCtx.destination);
    o.start(t);
    o.stop(t + 0.1);

    const len = Math.floor(audioCtx.sampleRate * 0.03);
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const s = audioCtx.createBufferSource();
    s.buffer = buf;
    const bp = audioCtx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1400;
    const g2 = audioCtx.createGain();
    g2.gain.value = vol * 1.1;
    s.connect(bp).connect(g2).connect(audioCtx.destination);
    s.start(t);
  }

  function startSteps(tok, dur) {
    if (reduced) return;
    const t0 = performance.now();
    let k = 0;
    const tick = () => {
      if (tok !== seq || state !== 'walking') return;
      const elapsed = performance.now() - t0;
      if (elapsed > dur - 100) return;
      k++;
      tuk(0.1 + 0.22 * Math.min(1, elapsed / dur), k);
      stepTimer = setTimeout(tick, Math.max(0, t0 + (k + 1) * 550 - performance.now()));
    };
    stepTimer = setTimeout(tick, 550);
  }

  function resetOpening() {
    seq++;
    state = 'idle';
    clearTimeout(nudgeTimer);
    clearTimeout(stepTimer);
    hero.getAnimations().forEach((a) => a.cancel());
    hero.className = 'hero';
    char.classList.remove('nudge');
    cover.classList.remove('is-hidden');
    stage.classList.remove('is-on');
    stage.setAttribute('aria-hidden', 'true');
    bubble.classList.remove('is-on');
  }

  async function runOpening() {
    const tok = ++seq;
    state = 'walking';
    cover.classList.add('is-hidden');
    stage.classList.add('is-on');
    stage.removeAttribute('aria-hidden');
    hero.classList.add('is-walking');

    const dist = Math.round(app.clientWidth * 0.95);
    const dur = reduced ? 1 : 4400;
    const walk = hero.animate([
      { transform: 'translateX(' + -dist + 'px) scale(.6)', opacity: 0 },
      { transform: 'translateX(' + -dist * 0.88 + 'px) scale(.62)', opacity: 1, offset: 0.08, easing: 'linear' },
      { transform: 'translateX(' + -dist * 0.05 + 'px) scale(.97)', opacity: 1, offset: 0.92, easing: 'ease-out' },
      { transform: 'translateX(0) scale(1)', opacity: 1 }
    ], { duration: dur, easing: 'linear', fill: 'both' });
    startSteps(tok, dur);
    await walk.finished.catch(() => {});
    if (tok !== seq) return;

    hero.classList.remove('is-walking');
    state = 'greeting';
    await sleep(300); if (tok !== seq) return;
    bubble.classList.add('is-on');
    await sleep(1700); if (tok !== seq) return;
    bubble.classList.remove('is-on');
    hero.classList.add('is-waiting');
    state = 'waiting';

    nudgeTimer = setTimeout(() => {
      if (tok === seq && state === 'waiting') {
        char.classList.remove('nudge');
        void char.offsetWidth;
        char.classList.add('nudge');
      }
    }, 7000);
  }

  async function onTapBouquet() {
    if (state !== 'waiting' && state !== 'greeting') return;
    const tok = seq;
    state = 'burst';
    clearTimeout(nudgeTimer);
    bubble.classList.remove('is-on');
    hero.classList.remove('is-waiting');
    hero.classList.add('is-happy');

    const p = center($('#bouquet'));
    flash.animate([{ opacity: 0 }, { opacity: 0.95, offset: 0.25 }, { opacity: 0 }], { duration: 800 });
    if (!reduced) {
      char.animate([
        { transform: 'translateX(0)' }, { transform: 'translateX(-6px)' },
        { transform: 'translateX(6px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }
      ], { duration: 380 });
    }
    burstPetals(p.x, p.y, 28);

    await sleep(380); if (tok !== seq) return;
    hero.classList.add('has-letter');
    await sleep(450); if (tok !== seq) return;
    const q = center($('#heldEnv'));
    riseHearts(q.x, q.y - 40, 16);

    await sleep(reduced ? 300 : 2100); if (tok !== seq) return;
    go('p2');
  }

  $('#p1').addEventListener('enter', resetOpening);
  $('#openBtn').addEventListener('click', () => { unlockAudio(); playMusic(); runOpening(); });
  stage.addEventListener('pointerup', (e) => { if (!e.target.closest('#skip')) onTapBouquet(); });
  $('#skip').addEventListener('click', () => { seq++; state = 'idle'; clearTimeout(stepTimer); go('p2'); });

  const env = $('#env');
  let opening = false;

  function noiseBuf(sec) {
    const len = Math.floor(audioCtx.sampleRate * sec);
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    const chunk = Math.floor(audioCtx.sampleRate * 0.009);
    let lvl = 1;
    for (let i = 0; i < len; i++) {
      if (i % chunk === 0) lvl = Math.pow(Math.random(), 1.6);
      d[i] = (Math.random() * 2 - 1) * lvl;
    }
    return buf;
  }

  function rustle(t, dur, f0, f1, vol) {
    const s = audioCtx.createBufferSource();
    s.buffer = noiseBuf(dur);
    const f = audioCtx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.8;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.22);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(audioCtx.destination);
    s.start(t);
  }

  function envelopeSound() {
    if (!audioCtx || muted) return;
    const t = audioCtx.currentTime + 0.02;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(230, t);
    o.frequency.exponentialRampToValueAtTime(80, t + 0.14);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g).connect(audioCtx.destination);
    o.start(t);
    o.stop(t + 0.18);
    rustle(t, 0.55, 1400, 3600, 0.3);
    rustle(t + 0.55, 0.95, 2800, 1600, 0.22);
    rustle(t + 1.1, 0.4, 2200, 1200, 0.1);
  }

  async function openEnvelope() {
    if (opening) return;
    opening = true;
    unlockAudio();
    envelopeSound();
    env.classList.add('is-open');
    await sleep(reduced ? 150 : 1700);
    if (current && current.id === 'p2') go('s2a');
    opening = false;
  }

  $('#p2').addEventListener('enter', () => { env.classList.remove('is-open'); opening = false; });
  $('#seal').addEventListener('click', openEnvelope);
  $('#openLetter').addEventListener('click', openEnvelope);

  const letterBody = $('#letterBody');
  const letterLines = $$('p', letterBody).map((p) => p.textContent.trim());
  const letterFooter = [$('#letterSign'), $('#letterSong'), $('#letterNext')];
  const pencil = $('#pencil');
  const writer = $('#writer');
  let letterTok = 0;
  let typing = false;

  function pencilOn() {
    writer.classList.add('is-on');
    if (muted) return;
    pencil.currentTime = 0;
    const p = pencil.play();
    if (p && p.catch) p.catch(() => {});
  }

  function pencilOff() {
    writer.classList.remove('is-on');
    pencil.pause();
    pencil.currentTime = 0;
  }

  function letterReset() {
    letterTok++;
    typing = false;
    pencilOff();
    letterBody.replaceChildren();
    letterFooter.forEach((e) => e.classList.remove('is-on'));
  }

  function showAllLetter() {
    letterTok++;
    typing = false;
    pencilOff();
    letterBody.replaceChildren();
    letterLines.forEach((t) => {
      const p = document.createElement('p');
      p.textContent = t;
      letterBody.append(p);
    });
    letterFooter.forEach((e) => e.classList.add('is-on'));
  }

  async function typeLetter() {
    letterReset();
    const tok = letterTok;
    if (reduced) { showAllLetter(); return; }
    typing = true;
    await sleep(900); if (tok !== letterTok) return;
    pencilOn();

    for (const text of letterLines) {
      const p = document.createElement('p');
      const node = document.createTextNode('');
      const cur = document.createElement('span');
      const rest = document.createElement('span');
      cur.className = 'cursor';
      rest.style.visibility = 'hidden';
      rest.textContent = text;
      p.append(node, cur, rest);
      letterBody.append(p);

      const chars = [...text];
      for (let i = 0; i < chars.length; i++) {
        if (tok !== letterTok) return;
        node.data += chars[i];
        rest.textContent = chars.slice(i + 1).join('');
        const br = letterBody.getBoundingClientRect();
        const cr = cur.getBoundingClientRect();
        if (cr.bottom > br.bottom - 8) letterBody.scrollTop += cr.bottom - br.bottom + 8;
        await sleep(/[.,!?]/.test(chars[i]) ? TYPING * 6 : TYPING);
      }
      cur.remove();
      rest.remove();
      await sleep(450); if (tok !== letterTok) return;
    }
    typing = false;
    pencilOff();
    letterFooter.forEach((e) => e.classList.add('is-on'));
  }

  $('#s2a').addEventListener('enter', typeLetter);
  $('#s2a').addEventListener('leave', () => { letterTok++; typing = false; pencilOff(); });
  $('#letter').addEventListener('click', (e) => {
    if (typing && !e.target.closest('button')) showAllLetter();
  });

  const quoteText = $('#quoteText');
  const quotes = [...$('#quoteSrc').content.children].map((p) => p.textContent.trim());
  let qi = 0;
  quoteText.textContent = quotes[0] || '';
  $('#quote').addEventListener('click', () => {
    if (quotes.length < 2) return;
    qi = (qi + 1) % quotes.length;
    quoteText.classList.add('is-swap');
    setTimeout(() => {
      quoteText.textContent = quotes[qi];
      quoteText.classList.remove('is-swap');
    }, 300);
  });

  const pairEl = $('#pair');
  const museA = $('#museA');
  const museB = $('#museB');
  const nameA = $('#nameA');
  const nameB = $('#nameB');
  const namesEl = $('.names');
  const museQuote = $('#museQuote');
  const dots = $('#dots');
  let mi = 0;
  let museBusy = false;

  const museList = [...$('#museSrc').content.children].map((d) => ({
    a: d.dataset.a,
    b: d.dataset.b,
    posA: d.dataset.posA,
    posB: d.dataset.posB,
    nameA: d.children[0].textContent.trim(),
    nameB: d.children[1].textContent.trim(),
    quote: d.children[2].innerHTML
  }));

  museList.forEach((_, i) => {
    const b = document.createElement('button');
    b.setAttribute('aria-label', 'Pasangan foto ' + (i + 1));
    b.addEventListener('click', () => showMuse(i));
    dots.append(b);
  });

  function paintMuse(i) {
    const m = museList[i];
    applyPhoto(museA, m.a, m.posA);
    applyPhoto(museB, m.b, m.posB);
    nameA.textContent = m.nameA;
    nameB.textContent = m.nameB;
    museQuote.innerHTML = m.quote;
    $$('button', dots).forEach((d, k) => d.classList.toggle('is-on', k === i));
  }

  async function showMuse(i) {
    const n = museList.length;
    i = (i + n) % n;
    if (i === mi || museBusy) return;
    museBusy = true;
    const dir = i > mi ? 1 : -1;
    const els = [pairEl, namesEl, museQuote];

    const outs = els.map((el) => el.animate(
      [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(' + -40 * dir + 'px)' }],
      { duration: reduced ? 1 : 220, easing: 'ease-in', fill: 'forwards' }
    ));
    await Promise.all(outs.map((a) => a.finished.catch(() => {})));
    mi = i;
    paintMuse(mi);
    outs.forEach((a) => a.cancel());
    const ins = els.map((el) => el.animate(
      [{ opacity: 0, transform: 'translateX(' + 40 * dir + 'px)' }, { opacity: 1, transform: 'translateX(0)' }],
      { duration: reduced ? 1 : 340, easing: 'cubic-bezier(.22,.8,.24,1)' }
    ));
    await Promise.all(ins.map((a) => a.finished.catch(() => {})));
    museBusy = false;
  }

  let sx = null;
  pairEl.addEventListener('pointerdown', (e) => { sx = e.clientX; });
  pairEl.addEventListener('pointercancel', () => { sx = null; });
  pairEl.addEventListener('pointerup', (e) => {
    if (sx == null) return;
    const dx = e.clientX - sx;
    sx = null;
    if (Math.abs(dx) > 40) showMuse(mi + (dx < 0 ? 1 : -1));
    else if (Math.abs(dx) <= 8) showMuse(mi + 1);
  });

  $('#musePrev').addEventListener('click', () => showMuse(mi - 1));
  $('#museNext').addEventListener('click', () => showMuse(mi + 1));

  const ask = $('#ask');
  const yay = $('#yay');
  const yesBtn = $('#yes');
  const noBtn = $('#no');
  const toast = $('#toast');
  const noLabel = noBtn.textContent;
  const noLines = [...$('#noSrc').content.children].map((p) => p.textContent.trim());
  let noTries = 0;
  let celebrated = false;
  let lastDodge = 0;

  function say(msg) {
    toast.textContent = msg;
    toast.classList.remove('is-on');
    void toast.offsetWidth;
    toast.classList.add('is-on');
  }

  function resetAsk() {
    noTries = 0; celebrated = false;
    ask.classList.remove('is-gone');
    yay.classList.remove('is-on');
    noBtn.classList.remove('is-free');
    noBtn.removeAttribute('style');
    noBtn.textContent = noLabel;
    toast.classList.remove('is-on');
    toast.textContent = '';
  }


  function dodge() {
    lastDodge = performance.now();
    noTries++;
    const screen = $('#p4').getBoundingClientRect();

    if (!noBtn.classList.contains('is-free')) {
      const br = noBtn.getBoundingClientRect();
      noBtn.classList.add('is-free');
      const base0 = noBtn.offsetParent.getBoundingClientRect();
      noBtn.style.left = br.left - base0.left + 'px';
      noBtn.style.top = br.top - base0.top + 'px';
      void noBtn.offsetWidth;
    }

    const base = noBtn.offsetParent.getBoundingClientRect();
    const w = noBtn.offsetWidth, h = noBtn.offsetHeight, pad = 16;
    const avoid = [yesBtn, $('.ask__to'), $('.ask__q'), toast].map((b) => b.getBoundingClientRect());
    const cur = noBtn.getBoundingClientRect();
    let x = cur.left, y = cur.top;
    let found = false;
    let best = null;

    for (let i = 0; i < 40; i++) {
      const tx = rnd(screen.left + pad, screen.right - w - pad);
      const ty = rnd(screen.top + 70, screen.bottom - h - 70);
      const far = Math.hypot(tx - cur.left, ty - cur.top);
      const clear = avoid.every((a) => tx + w < a.left - 12 || tx > a.right + 12 || ty + h < a.top - 12 || ty > a.bottom + 12);
      if (clear && far > 110) { x = tx; y = ty; found = true; break; }
      if (!best || far > best.far) best = { x: tx, y: ty, far };
    }
    if (!found && best) { x = best.x; y = best.y; }

    noBtn.style.left = x - base.left + 'px';
    noBtn.style.top = y - base.top + 'px';
    noBtn.style.transform = 'rotate(' + rnd(-8, 8).toFixed(1) + 'deg)';
    say(noLines[(noTries - 1) % noLines.length]);
  }

  async function celebrate() {
    if (celebrated) return;
    celebrated = true;
    ask.classList.add('is-gone');
    yay.classList.add('is-on');
    noBtn.style.pointerEvents = 'none';
    const W = fx.clientWidth;
    const H = fx.clientHeight;
    for (let k = 0; k < 5; k++) {
      setTimeout(() => { if (celebrated) confettiBurst(rnd(W * 0.2, W * 0.8), rnd(H * 0.3, H * 0.6), 22); }, k * 650);
    }
    fallingHearts(26);
  }

  noBtn.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch' && !celebrated) dodge(); });
  noBtn.addEventListener('pointerdown', (e) => { if (celebrated) return; e.preventDefault(); dodge(); });
  noBtn.addEventListener('touchstart', (e) => { if (celebrated) return; e.preventDefault(); if (performance.now() - lastDodge > 80) dodge(); }, { passive: false });
  noBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (celebrated || performance.now() - lastDodge < 600) return;
    dodge();
  });
  yesBtn.addEventListener('click', celebrate);

  $('#p4').addEventListener('enter', () => { if (!celebrated) resetAsk(); });
  function init() {
    fillContent();
    buildBouquet();
    sprinkleHearts();
    initMusic();
    paintMuse(0);
    history.replaceState({ id: 'p1' }, '', '#p1');
    show('p1');
  }

  init();
})();