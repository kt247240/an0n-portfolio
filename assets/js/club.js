// =========================================================
// 試作：浜のボトルメール → 鍵 → 砂の魔法陣 → クラブへ（magic.html だけが読み込む。index.html には入れていない）
//   1. 夕凪の浜の瓶をタップすると、栓が抜けて鍵が飛び出し、画面の右下に入る。同時に、そばの砂に魔法陣が描かれていく
//   2. 魔法陣をタップすると、鍵が飛んでいって真ん中に立つ。魔法陣が回り出し、光の柱が上へ伸びて、画面が光に包まれる
//   3. 光が引くと、音楽の鳴っているクラブの中。右上の輪で浜へ戻る（鍵は魔法陣に立ったまま。もう一度タップでまた行ける）
// 文字は出さない（動きだけ）。動きは要素ごとの transform と opacity。クラブは入るときに組み立て、出るときに片づける
// =========================================================
import { createBeat } from './beat.js';
import { WORKS } from './works.js';

const $ = (s, r = document) => r.querySelector(s);
const store = { get() { try { return sessionStorage.getItem('an0n-key') || ''; } catch { return ''; } }, set(v) { try { sessionStorage.setItem('an0n-key', v); } catch { /* 使えない環境では、その場かぎり */ } } };
let state = store.get(); // '' → 'held'（鍵を持っている）→ 'set'（魔法陣に立てた）
let busy = false, inClub = false, siteBeatWasOn = false, clubBeat = null;

// ---------- 絵 ----------
// 鍵：チラシの人が首に下げているのと同じ、金の古い鍵
const KEY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 60"><defs><linearGradient id="kg" x1="0" x2="1"><stop offset="0" stop-color="#f7d58a"/><stop offset=".5" stop-color="#d9a441"/><stop offset="1" stop-color="#9c6b22"/></linearGradient></defs>
  <circle cx="12" cy="10" r="8.2" fill="none" stroke="url(#kg)" stroke-width="3.4"/><circle cx="12" cy="10" r="3" fill="url(#kg)"/>
  <rect x="10.2" y="17" width="3.6" height="36" rx="1.2" fill="url(#kg)"/><path d="M13.8 40h6v3.2h-6zM13.8 46h4.4v3.2h-4.4zM13.8 51h6.4v3.4h-6.4z" fill="url(#kg)"/><rect x="11" y="19" width="1" height="32" fill="#fff2c8" opacity=".5"/></svg>`;
const KEY_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(KEY_SVG)}`;

// 魔法陣（上から見た形。置くときに縦につぶして、砂に寝かせる）。外の二重の輪、印の帯、六芒星、内の輪と小さな星。文字ではない幾何の印だけ
function circleSVG() {
  const ring = (r, w, o = 1) => `<circle r="${r}" fill="none" stroke-width="${w}" opacity="${o}" pathLength="1"/>`;
  let marks = '';
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * 360, t = i % 4;
    const g = t === 0 ? '<path d="M-1.6 0h3.2M0 -1.8v3.6"/>' : t === 1 ? '<path d="M-1.6 1.2L0 -1.6L1.6 1.2Z"/>' : t === 2 ? '<circle r="1.1"/><path d="M-1.8 0h3.6"/>' : '<path d="M-1.4 -1.4L1.4 1.4M-1.4 1.4L1.4 -1.4"/>';
    marks += `<g transform="rotate(${a}) translate(0 -40.5)" fill="none" stroke-width=".55" pathLength="1">${g}</g>`;
  }
  const tri = (rot) => `<path d="M0 -33L28.6 16.5L-28.6 16.5Z" transform="rotate(${rot})" fill="none" stroke-width=".7" pathLength="1"/>`;
  let dots = ''; for (let i = 0; i < 6; i++) dots += `<circle cx="0" cy="-33" r="2.2" transform="rotate(${i * 60})" fill="none" stroke-width=".6" pathLength="1"/>`;
  const star = '<path d="M0 -9L2.2 -2.2L9 0L2.2 2.2L0 9L-2.2 2.2L-9 0L-2.2 -2.2Z" fill="none" stroke-width=".6" pathLength="1"/>';
  const body = ring(47, 1.1) + ring(44.5, .45) + marks + ring(36.8, .8) + tri(0) + tri(180) + dots + ring(19, .6) + ring(14, .35) + star;
  // 下にぼかした太い線を重ねて、にじむ光に（線そのものは細く）
  return `<svg class="mc-rune" viewBox="-50 -50 100 100" aria-hidden="true"><g class="glow" stroke="#ffb45a" opacity=".35" stroke-width="2.4">${body.replace(/stroke-width="[\d.]+"/g, 'stroke-width="2.2"')}</g><g class="lines" stroke="#ffe7b0">${body}</g></svg>`;
}

// ---------- 画面の部品 ----------
function ensureUI() {
  if (!$('#mc-inv')) {
    document.body.insertAdjacentHTML('beforeend', `<button id="mc-inv" aria-label="鍵"><img src="${KEY_URL}" alt=""></button><div id="mc-warp" aria-hidden="true"></div>`);
    $('#mc-inv').addEventListener('click', () => { const b = $('#mc-inv'); b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge'); const c = $('.mc'); if (c) { c.classList.remove('hint'); void c.offsetWidth; c.classList.add('hint'); } });
  }
  $('#mc-inv').classList.toggle('show', state === 'held');
}
// 魔法陣は、浜の瓶のそばの砂に置く（部屋の小物の層に。画面の大きさが変わって小物が置き直されたら、また置く）
function placeCircle(appear = false) {
  const bottle = $('#room-dusk .props [data-egg="bottle"]');
  if (!bottle || !state) return null;
  let c = bottle.parentElement.querySelector('.mc');
  if (!c) {
    bottle.insertAdjacentHTML('beforebegin', `<button class="mc${state === 'set' ? ' set' : ''}" aria-label="魔法陣" style="left:${bottle.style.left}">
      <i class="mc-glow"></i><span class="mc-flat">${circleSVG()}</span><i class="mc-pillar"></i><span class="mc-rings"><i></i><i></i><i></i></span>
      <img class="mc-key" src="${KEY_URL}" alt="">${'<i class="mc-spark"></i>'.repeat(7)}</button>`);
    c = bottle.parentElement.querySelector('.mc');
    c.addEventListener('click', onCircle);
  }
  if (appear) { c.classList.remove('appear'); void c.offsetWidth; c.classList.add('appear'); }
  return c;
}
setInterval(() => { if (state && !$('#room-dusk .props .mc')) placeCircle(false); }, 800);

// 画面の上を飛ぶ鍵（Web Animations。終わったら消える）
function flyKey(from, to, { arc = -80, ms = 900, spin = 360 } = {}) {
  const k = document.createElement('img'); k.src = KEY_URL; k.className = 'mc-fly'; document.body.append(k);
  const dx = to.x - from.x, dy = to.y - from.y;
  const a = k.animate([
    { transform: `translate(${from.x}px, ${from.y}px) rotate(0deg) scale(.9)`, opacity: 0 },
    { transform: `translate(${from.x + dx * .3}px, ${from.y + dy * .3 + arc}px) rotate(${spin * .4}deg) scale(1.25)`, opacity: 1, offset: .35 },
    { transform: `translate(${to.x}px, ${to.y}px) rotate(${spin}deg) scale(1)`, opacity: 1 },
  ], { duration: ms, easing: 'cubic-bezier(.3,.6,.35,1)', fill: 'forwards' });
  return a.finished.then(() => k.remove());
}
const center = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

// 1. 瓶：栓が抜けて鍵が飛び出す → 右下へ。砂に魔法陣が描かれる
document.addEventListener('click', async (e) => {
  const bottle = e.target.closest('#room-dusk [data-egg="bottle"]');
  if (!bottle || state || busy) return;
  busy = true; state = 'held'; store.set(state);
  ensureUI(); $('#mc-inv').classList.remove('show');
  const from = center(bottle);
  setTimeout(() => placeCircle(true), 250);
  await flyKey({ x: from.x - 12, y: from.y - 30 }, (() => { const r = $('#mc-inv').getBoundingClientRect(); return { x: r.left + r.width / 2 - 12, y: r.top + r.height / 2 - 30 }; })(), { arc: -140, ms: 1500, spin: 540 });
  $('#mc-inv').classList.add('show');
  busy = false;
}, true);

// 2. 魔法陣：鍵を立てて、光の柱でクラブへ
async function onCircle(e) {
  e.stopPropagation();
  if (busy || inClub) return;
  const c = e.currentTarget;
  busy = true;
  if (state === 'held') {
    const inv = $('#mc-inv'), to = center(c.querySelector('.mc-key'));
    inv.classList.remove('show');
    await flyKey({ x: center(inv).x - 12, y: center(inv).y - 30 }, { x: to.x - 12, y: to.y - 30 }, { arc: -120, ms: 1000, spin: 720 });
    state = 'set'; store.set(state); c.classList.add('set');
    await wait(350);
  }
  c.classList.add('charge');
  await wait(900);
  c.classList.add('rise');
  await wait(800);
  $('#mc-warp').classList.add('on');
  await wait(520);
  enterClub();
  await wait(250);
  $('#mc-warp').classList.remove('on');
  busy = false;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- クラブ ----------
function clubHTML() {
  const pick = (id) => WORKS.find((w) => w.id === id);
  const main = pick('sunset-session'), l = pick('loud-garden'), r = pick('cosmic-smoke');
  const crowd = Array.from({ length: 15 }, (_, i) => {
    const up = i % 4 === 1, x = i / 14 * 104 - 2, s = .8 + ((i * 37) % 10) / 30, d = -((i * 0.23) % 0.68).toFixed(2);
    return `<i class="cr${up ? ' up' : ''}" style="left:${x.toFixed(1)}%;--s:${s.toFixed(2)};animation-delay:${d}s"><svg viewBox="0 0 40 60" aria-hidden="true"><path d="M20 4a8 9 0 1 1 0 18a8 9 0 1 1 0-18Z"/><path d="M4 60Q4 30 20 26Q36 30 36 60Z"/>${up ? '<path d="M8 36L2 8L6 7L13 32Z"/>' : ''}</svg></i>`;
  }).join('');
  const beams = ['#ff4fd8', '#39d8ff', '#ffb347', '#8b5bff', '#39d8ff', '#ff4fd8'].map((c, i) => `<i class="beam" style="left:${10 + i * 16}%;--c:${c};animation-delay:${(-i * .9).toFixed(1)}s;--a:${i % 2 ? 1 : -1}"></i>`).join('');
  const lasers = Array.from({ length: 6 }, (_, i) => `<i class="laser" style="--r:${-40 + i * 16}deg;animation-delay:${(-i * .4).toFixed(1)}s"></i>`).join('');
  const sparks = Array.from({ length: 14 }, (_, i) => `<i style="--a:${i * 26}deg;--d:${(8 + (i % 5) * 7)}vh;--t:${(1.5 + (i % 4) * .6).toFixed(1)}s"></i>`).join('');
  return `<div class="club-bg"></div>
    <div class="club-wall">
      <span class="scr side"><img src="${l.poster}" alt=""></span>
      <span class="scr main"><video src="${main.src}" poster="${main.poster}" muted loop playsinline autoplay></video></span>
      <span class="scr side"><img src="${r.poster}" alt=""></span>
    </div>
    <div class="club-ball"><i class="ball"></i><span class="refl">${sparks}</span></div>
    <div class="club-beams">${beams}</div>
    <div class="club-lasers">${lasers}</div>
    <div class="club-booth">
      <svg class="dj" viewBox="0 0 200 120" aria-hidden="true"><path d="M100 18a13 14 0 1 1 0 28a13 14 0 1 1 0-28Z"/><path d="M86 22Q100 6 114 22L112 28Q100 20 88 28Z"/><path d="M70 120Q70 58 100 52Q130 58 130 120Z"/><path d="M76 74Q60 82 64 92L72 92Q70 84 84 80Z"/></svg>
      <svg class="desk" viewBox="0 0 200 120" aria-hidden="true"><path d="M20 78H180L186 120H14Z" fill="#0d0814"/><path d="M20 78H180V82H20Z" fill="#2a1a3a"/><circle cx="58" cy="80" r="11" fill="#1a1024"/><circle cx="142" cy="80" r="11" fill="#1a1024"/></svg>
      <i class="led" style="left:29%;top:66.7%"></i><i class="led b" style="left:71%;top:66.7%"></i><i class="led c" style="left:46%;top:81%"></i><i class="led" style="left:50%;top:81%"></i><i class="led b" style="left:54%;top:81%"></i></div>
    <div class="club-haze"></div>
    <div class="club-crowd">${crowd}</div>
    <div class="club-floor"></div>
    <button class="club-exit" aria-label="浜へもどる">${circleSVG()}</button>`;
}
function pulse() { const el = $('#club'); if (!el) return; el.classList.remove('kick'); void el.offsetWidth; el.classList.add('kick'); }
function enterClub() {
  inClub = true;
  const el = document.createElement('div'); el.id = 'club'; el.innerHTML = clubHTML(); document.body.append(el);
  // クラブの中では、後ろの美術館がスクロールしたり、さわって反応したりしないように
  for (const ev of ['touchstart', 'touchmove', 'wheel', 'click', 'pointerdown']) el.addEventListener(ev, (e) => { e.stopPropagation(); if (ev === 'touchmove' || ev === 'wheel') e.preventDefault(); }, { passive: false });
  $('.club-exit', el).addEventListener('click', exitClub);
  document.body.classList.add('in-club');
  // 美術館の音が鳴っていたら止めて、クラブの曲に（出るときに戻す）
  siteBeatWasOn = document.body.classList.contains('beat-on');
  if (siteBeatWasOn) $('#beat')?.click();
  if (!clubBeat) { clubBeat = createBeat({ onKick: pulse, ambience: false }); clubBeat.setScene('night'); }
  if (!clubBeat.playing) clubBeat.toggle();
  $('video', el)?.play().catch(() => {});
}
async function exitClub() {
  if (busy) return; busy = true;
  $('#mc-warp').classList.add('on');
  await wait(450);
  if (clubBeat?.playing) clubBeat.toggle();
  const el = $('#club'); el?.querySelector('video')?.removeAttribute('src'); el?.remove();
  document.body.classList.remove('in-club');
  const c = $('#room-dusk .props .mc'); c?.classList.remove('rise', 'charge');
  if (siteBeatWasOn && !document.body.classList.contains('beat-on')) $('#beat')?.click();
  inClub = false;
  await wait(200);
  $('#mc-warp').classList.remove('on');
  busy = false;
}

// はじめに：前にこのページで鍵を取っていたら、そのまま続きから
ensureUI();
if (state) placeCircle(false);
