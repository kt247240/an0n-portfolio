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
// 夕焼けの屋外会場：燃えるような空と流れる雲、古い建物とヤシと白い教会の影、トラスの櫓とライト、光るパネル、DJ ブース、煙、何列もの観客
// 人物はいまは影絵。本人が描いた人物の絵ができたら、DJ と観客をその絵に差し替える
function crowdRow(n, r, H, seed, k, tone) {
  let o = '';
  for (let i = k; i < n; i += 3) {
    const t = (i + .5) / n, x = t * 400 + Math.sin(i * 12.9 + seed) * 400 / n * .35, rr = r * (.85 + ((Math.sin(i * 7.7 + seed) + 1) / 2) * .3), by = H + r * .2;
    const hy = by - rr * 2.7, up = ((i * 5 + seed) % 7) === 0, phone = ((i * 3 + seed) % 11) === 0;
    o += `<path d="M${x - rr * 2.3} ${by + 2}Q${x - rr * 2.2} ${by - rr * 1.3} ${x - rr * .8} ${by - rr * 1.6}L${x + rr * .8} ${by - rr * 1.6}Q${x + rr * 2.2} ${by - rr * 1.3} ${x + rr * 2.3} ${by + 2}Z"/><ellipse cx="${x}" cy="${hy}" rx="${rr}" ry="${rr * 1.12}"/>`;
    o += `<path d="M${x - rr * .8} ${hy - rr * .7}Q${x} ${hy - rr * 1.25} ${x + rr * .7} ${hy - rr * .8}" stroke="${tone}" stroke-width="${rr * .22}" fill="none" opacity=".55"/>`;
    if (up || phone) { // 上げた腕（肩から頭の少し上まで、細く）。スマホを掲げる人は、手もとに小さな光
      const sx = x + rr * 1.1, sy = by - rr * 1.5, hx = x + rr * 1.75, hyy = hy - rr * 1.7, w = rr * .22;
      o += `<path d="M${sx - w} ${sy}Q${sx + rr * .2} ${(sy + hyy) / 2} ${hx - w} ${hyy}L${hx + w} ${hyy}Q${sx + rr * .55} ${(sy + hyy) / 2} ${sx + w * 1.4} ${sy}Z"/><circle cx="${hx}" cy="${hyy}" r="${w * 1.3}"/>`;
      if (phone) o += `<rect x="${hx - rr * .22}" y="${hyy - rr * .95}" width="${rr * .44}" height="${rr * .7}" rx="${rr * .08}" fill="#ffd9b0" opacity=".75"/>`;
    }
  }
  return o;
}
function clubHTML() {
  const main = WORKS.find((w) => w.id === 'sunset-session');
  const rows = [
    ['back', 34, 3.4, 40, 3, '#ff9a5a'], ['mid', 22, 5.4, 52, 8, '#ff8a4a'], ['front', 12, 9, 70, 5, '#ff7a3a'],
  ].map(([cls, n, r, H, seed, tone]) => `<div class="ov-crowd ${cls}">${[0, 1, 2].map((k) => `<svg viewBox="0 0 400 ${H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true" style="animation-delay:${(-k * .23).toFixed(2)}s">${crowdRow(n, r, H, seed, k, tone)}</svg>`).join('')}</div>`).join('');
  // 櫓：柱と梁は 2 本の線と、あいだのジグザグ
  const post = (x, y0, y1) => { let z = `M${x} ${y0}V${y1}M${x + 4} ${y0}V${y1}M${x} ${y0}`; for (let y = y0; y < y1; y += 4) z += `L${x + 4} ${y + 2}L${x} ${y + 4}`; return z; };
  const beam = (x0, x1, y) => { let z = `M${x0} ${y}H${x1}M${x0} ${y + 5}H${x1}M${x0} ${y}`; for (let x = x0; x < x1; x += 5) z += `L${x + 2.5} ${y + 5}L${x + 5} ${y}`; return z; };
  const truss = post(46, 22, 150) + post(108, 22, 150) + beam(40, 118, 22) + post(188, 22, 150) + post(250, 22, 150) + beam(182, 260, 22);
  const pct = (x, y) => `left:${(x / 300 * 100).toFixed(2)}%;top:${(y / 160 * 100).toFixed(2)}%`;
  const pars = [...[52, 60, 68, 76, 84, 92, 100], ...[194, 202, 210, 218, 226, 234, 242]].map((x, i) => `<i class="par" style="${pct(x, 29)};animation-delay:${(-i * .19).toFixed(2)}s"></i>`).join('');
  const panels = [62, 74, 86, 204, 216, 228].map((x, i) => `<i class="pnl" style="${pct(x, 34)};width:${(9 / 300 * 100).toFixed(2)}%;height:${(56 / 160 * 100).toFixed(2)}%;animation-delay:${(-i * .3).toFixed(1)}s"></i>`).join('');
  const beams = [[56, -1], [80, 1], [98, -1], [202, 1], [222, -1], [244, 1]].map(([x, a], i) => `<i class="bm" style="${pct(x, 29)};--a:${a};animation-delay:${(-i * .8).toFixed(1)}s"></i>`).join('');
  return `<div class="ov-sky"></div>
    <svg class="ov-clouds" viewBox="0 0 400 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <path d="M-20 34Q60 22 140 30T300 26T430 32L430 38Q330 34 250 38T90 40T-20 42Z" fill="#7a3444" opacity=".55"/>
      <path d="M-20 52Q80 40 170 48T340 44T430 50L430 56Q320 52 230 56T60 58T-20 60Z" fill="#c95a55" opacity=".55"/>
      <path d="M20 16Q100 8 190 14T360 12L360 16Q260 16 170 19T20 20Z" fill="#9a4050" opacity=".45"/>
      <path d="M-10 70Q90 60 190 68T420 64L420 69Q300 68 200 72T-10 75Z" fill="#f09a72" opacity=".5"/>
      <path d="M60 84Q150 78 250 83T420 80L420 84Q320 85 240 87T60 88Z" fill="#f6b88a" opacity=".45"/></svg>
    <svg class="ov-city" viewBox="0 0 400 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <path d="M0 120V70H20V62H60V74H90V66H120V78H150V70H180V120Z" fill="#4a2228" opacity=".7"/><path d="M220 120V74H250V66H280V76H320V68H360V78H400V120Z" fill="#4a2228" opacity=".7"/>
      <path d="M-10 120V40L20 22L52 40V48H74V120Z" fill="#2a1216"/><path d="M20 22V6" stroke="#2a1216" stroke-width=".8"/><path d="M20 6L28 9L20 12Z" fill="#2a1216"/>
      ${[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4].map((c) => `<path d="M${-2 + c * 11} ${58 + r * 14}v-5a2.4 2.4 0 0 1 4.8 0v5Z" fill="#b8583a" opacity="${(.25 + ((r + c) % 3) * .15).toFixed(2)}"/>`).join('')).join('')}
      <path d="M318 120V84H346V120Z" fill="#d7b0a0" opacity=".85"/><path d="M324 84V66L332 58L340 66V84Z" fill="#e3c0ae" opacity=".9"/><path d="M332 58V52M330 54H334" stroke="#e3c0ae" stroke-width=".8"/><path d="M329 72a3 3 0 0 1 6 0v5h-6Z" fill="#7a3a34"/>
      ${[[300, 30, -4], [364, 22, 5], [386, 34, -3]].map(([x, h, l]) => `<path d="M${x} 120Q${x + l * .5} ${120 - h * .5} ${x + l} ${120 - h}" stroke="#1e0d10" stroke-width="1.6" fill="none"/>${[-70, -30, 10, 50, 150, 190, 230].map((a) => `<path d="M${x + l} ${120 - h}q${(Math.cos(a * Math.PI / 180) * 7).toFixed(1)} ${(Math.sin(a * Math.PI / 180) * 4 - 1).toFixed(1)} ${(Math.cos(a * Math.PI / 180) * 12).toFixed(1)} ${(Math.sin(a * Math.PI / 180) * 6 + 3).toFixed(1)}" stroke="#1e0d10" stroke-width="1.3" fill="none" stroke-linecap="round"/>`).join('')}`).join('')}</svg>
    <div class="ov-glow"></div>
    <div class="ov-stage">
      <div class="ov-beams">${beams}</div>
      <svg class="rig" viewBox="0 0 300 160" aria-hidden="true">
        <path d="${truss}" stroke="#3a2226" stroke-width=".7" fill="none"/>
        <rect x="20" y="96" width="16" height="54" fill="#0b0608"/><rect x="264" y="96" width="16" height="54" fill="#0b0608"/><rect x="22" y="100" width="12" height="12" rx="6" fill="#1a0f12"/><rect x="266" y="100" width="12" height="12" rx="6" fill="#1a0f12"/>
        <path d="M14 128H286V150H14Z" fill="#140a0c"/><path d="M14 128H286V130H14Z" fill="#3a1e1c"/></svg>
      ${panels}${pars}
      <span class="ov-screen" style="${pct(132, 32)};width:${(36 / 300 * 100).toFixed(2)}%"><video src="${main.src}" poster="${main.poster}" muted loop playsinline autoplay></video></span>
      <svg class="dj" viewBox="0 0 300 160" aria-hidden="true"><path d="M150 84a8 8.6 0 1 1 0 17.2a8 8.6 0 1 1 0-17.2Z"/><path d="M141 88Q150 78 159 88L158 91Q150 86 142 91Z"/><path d="M132 128Q132 104 150 101Q168 104 168 128Z"/><path d="M136 112Q126 116 128 122L133 122Q132 118 140 116Z"/></svg>
      <svg class="booth" viewBox="0 0 300 160" aria-hidden="true"><path d="M122 114H178L180 128H120Z" fill="#0b0608"/><path d="M122 114H178V116H122Z" fill="#ffcf9a" opacity=".55"/></svg>
      <i class="spill"></i>
      <svg class="fence" viewBox="0 0 300 160" aria-hidden="true"><path d="M0 146H300M0 152H300${Array.from({ length: 61 }, (_, i) => `M${i * 5} 146V156`).join('')}" stroke="#8a6a60" stroke-width=".5" opacity=".8"/></svg>
    </div>
    <div class="ov-smoke a"></div><div class="ov-smoke b"></div>
    ${rows}
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
  if (!clubBeat) { clubBeat = createBeat({ onKick: pulse, ambience: false }); clubBeat.setScene('cove'); } // 夕焼けの会場なので、サビのパート（ホーンのメロディとクラップ）
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
