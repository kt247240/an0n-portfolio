// =========================================================
// 小ネタ（イースターエッグ）— 一覧は docs/easter-eggs.md
// 音はビートが ON のときだけ鳴らす（勝手に音を出さない）
// =========================================================

const $ = (s, el = document) => el.querySelector(s);
const R = (a, b) => a + Math.random() * (b - a);

/* ---------- 効果音（Web Audio で合成） ---------- */
let actx = null, soundOn = () => false;
function sfx(kind) {
  if (!soundOn()) return;
  actx = actx || new (window.AudioContext || window.webkitAudioContext)();
  const c = actx, t = c.currentTime, out = c.createGain(); out.gain.value = .5; out.connect(c.destination);
  const tone = (type, f0, f1, dur, vol = .3, at = 0) => {
    const o = c.createOscillator(), g = c.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t + at); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + at + dur);
    g.gain.setValueAtTime(vol, t + at); g.gain.exponentialRampToValueAtTime(.001, t + at + dur);
    o.connect(g); g.connect(out); o.start(t + at); o.stop(t + at + dur + .02);
  };
  const noise = (dur, type, freq, vol = .3, at = 0) => {
    const b = c.createBuffer(1, c.sampleRate * dur, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = b; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t + at); g.gain.exponentialRampToValueAtTime(.001, t + at + dur);
    s.connect(f); f.connect(g); g.connect(out); s.start(t + at);
    return s;
  };
  switch (kind) {
    case 'ribbit': tone('square', 180, 120, .09, .12); tone('square', 210, 130, .1, .12, .12); break;
    case 'chirp': [0, .09, .2].forEach((a) => tone('sine', 2600, 3800, .06, .12, a)); break;
    case 'pop': tone('sine', 500, 1400, .08, .3); break;
    case 'splash': noise(.6, 'lowpass', 1800, .35); break;
    case 'sparkle': [0, .07, .14, .21].forEach((a, i) => tone('triangle', 1800 + i * 400, 2600 + i * 400, .15, .08, a)); break;
    // 看板：木の板が当たる、低くやわらかい「コトッ」
    case 'knock': tone('sine', 150, 80, .12, .22); noise(.05, 'lowpass', 900, .12); tone('sine', 120, 70, .09, .1, .16); noise(.04, 'lowpass', 800, .06, .16); break;
    // テレビ：ブラウン管のチャンネルを替えたときの「ザッ」という砂嵐と、低い接点の音
    case 'zap': noise(.22, 'bandpass', 2400, .16); tone('sine', 95, 55, .07, .18); break;
    case 'spray': noise(.5, 'highpass', 5000, .25); break;
    case 'scratch': { const s = noise(.5, 'bandpass', 1200, .5); s.playbackRate.setValueAtTime(.4, t); s.playbackRate.linearRampToValueAtTime(2.2, t + .12); s.playbackRate.linearRampToValueAtTime(.3, t + .26); s.playbackRate.linearRampToValueAtTime(1.8, t + .4); tone('sawtooth', 220, 90, .12, .12); tone('sawtooth', 90, 260, .14, .12, .2); break; }
    case 'rewind': tone('sawtooth', 300, 1400, .5, .06); break;
    default: break;
  }
}

/* =========================================================
   部屋に隠す小物（HTML）— museum.js の小物レイヤーに差し込む
   ========================================================= */
const bottleSVG = `<svg viewBox="0 0 50 30"><g transform="rotate(-18 25 15)"><rect x="6" y="8" width="30" height="14" rx="6" fill="#9fd6d0" opacity=".85"/><rect x="36" y="11" width="8" height="8" rx="2" fill="#9fd6d0" opacity=".85"/><rect x="43" y="12" width="4" height="6" fill="#8f602e"/><rect x="12" y="11" width="16" height="8" rx="1" fill="#f4e6c8"/><path d="M14 14h12M14 16.5h9" stroke="#c9b38a" stroke-width=".8"/></g></svg>`;

// step：部屋の中で 1 つ先の作品までの距離（作品と地面は同じ速さで動く層にある）
export function roomEggHTML(roomId, W, U, itemCount, step = W) {
  const at = (s, x, css, html, egg) => `<button class="egg-prop" data-egg="${egg}" aria-label="?" style="left:${(s * step + x) * U}px;${css}">${html}</button>`;
  switch (roomId) {
    // 小瓶は、同じすき間に引き上げてある小舟と重ならないように、小舟の右の砂の上へ
    case 'dusk': return at(Math.min(itemCount, 2) - .5, W * .5 + Math.min(W * .3, 15), 'bottom:3.5vh;width:7vh', bottleSVG, 'bottle');
    default: return '';
  }
}
// 作品と同じ層に置くもの（懐中電灯で暗くならない）：閉館後の部屋の深夜テレビ
export function roomArtEggHTML(roomId, W, U, itemCount, step = W) {
  if (roomId !== 'afterhours') return '';
  return `<button class="egg-prop tv" data-egg="tv" aria-label="深夜のテレビ" style="left:${(itemCount * step + W * .88) * U}px">
    <svg class="ant" viewBox="0 0 100 50"><path d="M50 50L20 0M50 50L80 4" stroke="#8a8274" stroke-width="3"/></svg>
    <span class="tv-body"><span class="tv-screen"><video muted loop playsinline preload="none"></video><span class="static"></span><span class="lines"></span></span></span></button>`;
}
// 画面に固定の額縁の上の当たり判定（クジラ）
export const frameHotspot = () => '';
// 奥のレイヤーの当たり判定（月）
export const farHotspot = (roomId, fw, U) => (roomId === 'night' ? `<button class="egg-hot" data-egg="moon" aria-label="?" style="left:${(fw * .3 - 6) * U}px;top:8vh;width:12vh;height:12vh"></button>` : '');

/* =========================================================
   すべての小ネタを有効にする
   ========================================================= */
export function initEggs({ parts, toggleBeat, isBeatOn, works, openViewer, beat }) {
  // 深夜テレビのチャンネル：最近届いた 3 作品
  const CHANNELS = ['cosmic-smoke', 'loud-garden', 'mountain-lights'].map((id) => works.find((w) => w.id === id)).filter(Boolean);
  let channel = -1;
  soundOn = isBeatOn;
  const pct = (e) => ({ x: e.clientX / innerWidth * 100, y: e.clientY / innerHeight * 100 });
  const burst = (kind, x, y, n, fn) => { for (let i = 0; i < n; i++) parts.push({ k: kind, x, y, age: 0, ph: R(0, 10), z: 1, ...fn(i) }); };
  let lastPointer = { x: 50, y: 60 };
  let lastActive = performance.now();

  // 小屋の画面つきプレーヤーの曲（最初にタップしたときに読み込む）
  let musicbox = null;
  const mbState = (on) => document.querySelectorAll('.music-stand').forEach((e) => e.classList.toggle('playing', on));
  document.addEventListener('beat', (e) => { if (e.detail && musicbox && !musicbox.paused) musicbox.pause(); });
  // ---- クリックで反応する隠し小物 ----
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-egg]');
    if (!el) return;
    const p = pct(e);
    switch (el.dataset.egg) {
      case 'bottle':
        sfx('pop');
        el.classList.remove('bob'); void el.offsetWidth; el.classList.add('bob');
        burst('glint', p.x, p.y, 10, () => ({ vx: R(-6, 6), vy: R(-10, -3), life: R(.8, 1.4), s: R(.3, .6) }));
        break;
      case 'moon':
        sfx('sparkle');
        burst('star', 0, 0, 14, (i) => ({ x: R(10, 90), y: R(-5, 20), vx: R(22, 34), vy: R(10, 16), life: R(.8, 1.6), s: R(.25, .5), age: -i * .12 }));
        break;
      case 'sneakers':
        el.classList.remove('swing'); void el.offsetWidth; el.classList.add('swing');
        break;
      case 'boombox': toggleBeat(); break;
      // ラジカセ以外の小物でも、ビートを遊べる（Lo-Fi Player のように）
      case 'turntable':
        if (!isBeatOn()) toggleBeat(); else beat.scratch();
        el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
        break;
      case 'cassettes':
        if (!isBeatOn()) toggleBeat();
        beat.nextChords();
        el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
        burst('glint', p.x, p.y - 3, 6, () => ({ vx: R(-5, 5), vy: R(-8, -3), life: R(.6, 1), s: R(.3, .5) }));
        break;
      case 'crate':
        if (!isBeatOn()) toggleBeat();
        beat.nextGroove();
        el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
        break;
      case 'musicbox': {
        // 小屋の画面つきプレーヤー：タップで BHI STORE の曲を流す／止める（ビートやラジオが鳴っていたら止めてから）
        if (!musicbox) { musicbox = new Audio('assets/audio/bhi-store.mp3'); musicbox.loop = true; musicbox.preload = 'auto'; musicbox.addEventListener('pause', () => mbState(false)); musicbox.addEventListener('play', () => mbState(true)); }
        if (musicbox.paused) { if (isBeatOn()) toggleBeat(); musicbox.play().catch(() => mbState(false)); } else musicbox.pause();
        el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
        break;
      }
      case 'tv': {
        const v = el.querySelector('video');
        // 番組が映っているときに画面をダブルクリックすると、作品として大きく見られる
        if (e.detail >= 2 && channel >= 0) { openViewer(CHANNELS[channel], e.clientX, e.clientY); break; }
        channel = channel + 1 >= CHANNELS.length ? -1 : channel + 1;
        sfx('zap');
        el.classList.add('zap');
        setTimeout(() => {
          el.classList.remove('zap');
          if (channel < 0) { v.pause(); v.removeAttribute('src'); v.load(); el.classList.remove('on'); return; }
          const w = CHANNELS[channel];
          v.src = w.src; v.poster = w.poster; v.play().catch(() => {});
          el.classList.add('on');
        }, 260);
        break;
      }
      case 'sign':
        // 看板がくるりと揺れる
        el.classList.remove('swing'); void el.offsetWidth; el.classList.add('swing'); sfx('knock');
        break;
      default: break;
    }
  });

  // ---- キー入力：コナミコマンド / 「anon」でスプレー ----
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let seq = [], typed = '';
  addEventListener('keydown', (e) => {
    lastActive = performance.now();
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    seq = [...seq, k].slice(-KONAMI.length);
    if (seq.join() === KONAMI.join()) { seq = []; party(!document.body.classList.contains('party')); }
    if (e.key === 'Escape' && document.body.classList.contains('party')) party(false);
    typed = (typed + (e.key.length === 1 ? e.key.toLowerCase() : '')).slice(-4);
    if (typed === 'anon') { typed = ''; spray(lastPointer.x, lastPointer.y); }
  });
  // 「anon」と打つと、カーソルの位置にスプレーの飛沫（文字は描かない）
  function spray(x, y) {
    sfx('spray');
    const cols = ['#a5c23e', '#df7418', '#ff7ab8', '#77b2b9', '#f2c14e', '#c7b3e6'];
    burst('paint', x, y, 36, (i) => ({ vx: R(-18, 18), vy: R(-18, 10), life: R(.8, 1.6), s: R(.3, .9), c: cols[i % cols.length] }));
  }
  // コナミコマンド：ビートを流し、画面の光がキックに合わせて脈打つ
  function party(on) {
    document.body.classList.toggle('party', on);
    if (on && !isBeatOn()) toggleBeat();
  }


  // ---- 最後に操作した時間とポインタの位置 ----
  ['pointermove', 'scroll', 'wheel', 'touchstart'].forEach((ev) => addEventListener(ev, (e) => {
    lastActive = performance.now();
    if (e.clientX != null) lastPointer = { x: e.clientX / innerWidth * 100, y: e.clientY / innerHeight * 100 };
  }, { passive: true }));

  // ---- 夜の庭では、カーソルにホタルがついてくる ----
  let trailT = 0;
  addEventListener('pointermove', (e) => {
    const sc = document.body.dataset.scene;
    if (sc !== 'night' || document.body.classList.contains('viewing')) return;
    const now = performance.now(); if (now - trailT < 70) return; trailT = now;
    parts.push({ k: 'firefly', x: e.clientX / innerWidth * 100 + R(-1, 1), y: e.clientY / innerHeight * 100 + R(-1, 1), vx: R(-.8, .8), vy: R(-1.5, -.4), life: R(1.2, 2.2), s: R(.25, .4), age: 0, ph: R(0, 10), z: 1 });
  }, { passive: true });

  // ---- ロゴを 3 回クリックすると、署名を書き直す ----
  let sigClicks = 0, sigT = 0;
  $('.brand').addEventListener('click', (e) => {
    sigClicks = performance.now() - sigT < 600 ? sigClicks + 1 : 1; sigT = performance.now();
    if (sigClicks >= 3) { e.preventDefault(); const s = $('.brand .sig'); s.classList.remove('rewrite'); void s.offsetWidth; s.classList.add('rewrite'); sigClicks = 0; }
  });

  // ---- ビューア：P で一時停止、R で巻き戻し、F で早送り（表示は出さない） ----
  addEventListener('keydown', (e) => {
    if (!document.body.classList.contains('viewing')) return;
    const v = $('#v-screen video');
    if (!v) return;
    const k = e.key.toLowerCase();
    if (k === 'p' || k === ' ') { e.preventDefault(); if (v.paused) v.play().catch(() => {}); else v.pause(); }
    if (k === 'r') {
      sfx('rewind');
      const t0 = v.currentTime, start = performance.now();
      const f = () => { const d = (performance.now() - start) / 1000; v.currentTime = Math.max(0, t0 - d * 4); if (d < 1.1 && v.currentTime > 0) requestAnimationFrame(f); else v.play().catch(() => {}); };
      f();
    }
    if (k === 'f') { v.playbackRate = 4; setTimeout(() => { v.playbackRate = 1; }, 1200); }
  });

  // ---- フッターの © ANON. を 5 回で、葉が舞い落ちる（フッターは絵がかかっていない場面なので） ----
  let footClicks = 0;
  $('footer span').addEventListener('click', () => {
    footClicks++;
    if (footClicks < 5) return;
    footClicks = 0;
    burst('leaf', 0, 0, 40, (i) => ({ x: R(0, 100), y: R(-20, -2), vx: R(-3, 3), vy: R(6, 12), life: R(4, 7), s: R(.6, 1.1), age: -i * .05, col: ['#769721', '#a5c23e', '#47733c', '#2f6a44'][i % 4] }));
    sfx('sparkle');
  });
}
