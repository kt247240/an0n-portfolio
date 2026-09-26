// =========================================================
// 森の美術館 — スクロールで森の小道を歩き、作品の前で立ち止まる
// =========================================================
import { ARTIST, ROOMS, WORKS, SOUND, RADIO } from './works.js';
import { createRadio } from './radio.js';
import { SCENES, FACTORS, sceneForest, curtainLeaves, LEAF_DEFS, ENTRANCE_PATH, pressedSpecimen, GRADES, gradeColors, moonSVG, nightSky, farewellSVG } from './nature.js';
import { createBeat } from './beat.js';
import { PROPS, ROCK } from './street.js';
import { introSVG } from './intros.js';
import { safeSVG, openVault } from './vault.js';
import { initEggs, roomEggHTML, roomArtEggHTML, frameHotspot, farHotspot } from './eggs.js';

const $ = (s, el = document) => el.querySelector(s);
// 毎フレームの書き込みは、値が変わったときだけ（同じ値でも書くと、スタイルの計算し直しが起きることがある）
const put = (el, k, v) => { const c = el._put || (el._put = {}); if (c[k] === v) return; c[k] = v; if (k[0] === '-') el.style.setProperty(k, v); else el.style[k] = v; };
// 部屋の中の決まった要素は、一度探したら覚えておく
const q = (r, sel) => { const m = r._q || (r._q = {}); return m[sel] || (m[sel] = $(sel, r.el)); };
// 位置と大きさは、フレームの最初（まだ何も書き換えていないとき）にまとめて測る。
// 書き換えのあとに測ると、そのたびにブラウザがレイアウトを計算し直すので、かくつきの元になる
const GEO = { entH: 0, cat: 0, art: 0, docH: 1, lamp: null, workRects: null };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease3 = (k) => k * k * k;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DPR = Math.min(devicePixelRatio || 1, 2);
const COARSE = matchMedia('(pointer: coarse)').matches;
const FXD = COARSE ? Math.min(DPR, 1.5) : DPR; // 粒の canvas の密度（スマホは控えめに）
// 画面の高さは CSS の 100vh と同じもので測る。スマホでアドレスバーが出入りしても変わらない
// （innerHeight はスクロールのたびに変わるので、そのたびに絵を描き直すと、リロードしたように見えてメモリも跳ねる）
const vhProbe = document.createElement('div');
vhProbe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100vh;visibility:hidden;pointer-events:none';
document.documentElement.append(vhProbe);
const measureVH = () => vhProbe.offsetHeight || innerHeight;
let vh = measureVH(), vw = innerWidth, U = vh / 100, W = vw / U;

const splitTitle = (txt) => { let i = 0; return txt.split(' ').map((word) => `<span class="w">${[...word].map((ch) => `<span style="--i:${i++}">${esc(ch)}</span>`).join('')}</span>`).join(' '); };
// 描いた SVG の表示
// ・パソコン：<img> で表示（一度だけラスタライズされ、スクロール中は軽い）
// ・スマホ・タブレット：<img> だと画面の密度（iPhone は 3 倍）で描かれ、メモリが 9 倍になって落ちる。
//   そこで 1.5 倍の密度で <canvas> に一度だけ焼き付けて表示する（メモリはおよそ 1/4）。
//   横に長い層は、幅 4096px 以下のタイルに分けて焼く（iOS の canvas の大きさの上限をこえないように）
const RASTER = COARSE ? Math.min(DPR, 1.5) : 0;
const SVG_STORE = new Map();
let svgSeq = 0;
// いま組み立てている場面の色調（GRADES）。背景の絵を描くときに色を変換する
let GRADE = null;
const svgDoc = (vbW, vbH, pxW, pxH, body, x0 = 0, vbSpan = vbW) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n2(x0)} 0 ${n2(vbSpan)} ${n2(vbH)}" width="${Math.round(pxW)}" height="${Math.round(pxH)}" preserveAspectRatio="none">${LEAF_DEFS}${body}</svg>`;
const rasterBox = (vbW, vbH, cssW, cssH, body, cls, style, dens = RASTER) => {
  const id = `s${svgSeq++}`;
  SVG_STORE.set(id, { vbW, vbH, cssW, cssH, body, dens });
  return `<div class="raster ${cls}" data-svg="${id}" style="${style}"></div>`;
};
const svgImg = (w, body, cls = '') => {
  body = gradeColors(body, GRADE);
  // 奥の層（空・山・町）も、中景と同じ細かさで焼く（月と明るい星は焼かずに画面に直接置くので、どの画面でもくっきり）
  if (RASTER) return rasterBox(w, 100, w * U, 100 * U, body, cls, `width:${w * U}px`, RASTER);
  const svg = svgDoc(w, 100, w * U, 100 * U, body);
  return `<img class="${cls}" alt="" decoding="async" draggable="false" style="width:${w * U}px" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}">`;
};
// 明るい星（またたく）と月は、焼いた絵ではなく画面に直接置く（どの画面でもくっきり）
const skyDomHTML = (sd) => !sd ? '' : `<div class="skydom" aria-hidden="true">${sd.bright.map(([x, y, sz, c, d]) => `<i class="sky-star" style="left:${(x * U).toFixed(1)}px;top:${(y * U).toFixed(1)}px;width:${(sz * U).toFixed(1)}px;--c:${c};animation-delay:-${d}s"></i>`).join('')}`
  + (sd.moon ? `<div class="sky-moon" style="left:${((sd.moon.x - sd.moon.r * 5) * U).toFixed(1)}px;top:${((sd.moon.y - sd.moon.r * 5) * U).toFixed(1)}px;width:${(sd.moon.r * 10 * U).toFixed(1)}px">${moonSVG(sd.moon.kind, sd.moon.halo)}</div>` : '') + '</div>';
// 葉のカーテンの 1 かたまり（正方形の絵）
const leafImg = (q) => {
  const [w, raw] = q.svg, body = gradeColors(raw, GRADE);
  const style = `left:${q.x * U}px;top:${q.y * U}px;width:${q.box * U}px;height:${q.box * U}px`;
  // 葉のカーテンは動いている間しか見えないので 1 倍の密度で十分
  if (RASTER) return rasterBox(w, w, q.box * U, q.box * U, body, 'leaf', style, 1);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n2(w)} ${n2(w)}" width="${Math.round(w * U)}" height="${Math.round(w * U)}">${LEAF_DEFS}${body}</svg>`;
  return `<img alt="" draggable="false" decoding="async" style="left:${q.x * U}px;top:${q.y * U}px;width:${q.box * U}px" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}">`;
};
// <div class="raster"> に、SVG を焼いた canvas（タイル）を入れる。1 枚ずつ順番に（同時に焼くとメモリが跳ねる）
const rasterQueue = [];
let rastering = false;
function hydrate(root) {
  if (!RASTER) return;
  root.querySelectorAll('.raster[data-svg]').forEach((el) => rasterQueue.push(el));
  if (!rastering) pumpRaster();
}
// 1 枚のタイルを焼く。
// 層の絵（SVG）は層ごとに 1 回だけ読み込み、タイルはそこから切り出して描く。
// タイルごとに別の SVG として読むと、そのたびに絵全体の解析（重い）がやり直しになり、歩いている途中でかくつく
// 焼く大きさ（画面の密度に合わせる）
function svgSize(d) {
  const dens = d.dens || RASTER;
  Object.assign(d, { dens, pxW: Math.max(1, Math.round(d.cssW * dens)), pxH: Math.max(1, Math.round(d.cssH * dens)) });
}
// 層の絵を読み込む（解析は重いので、1 つの絵につき 1 回だけ。先読みしたものはそのまま使う）
function loadSVG(d) {
  if (!d.img) {
    if (!d.pxW) svgSize(d);
    const img = new Image();
    d.img = img;
    d.ready = new Promise((ok) => { img.onload = () => ok(true); img.onerror = () => ok(false); });
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgDoc(d.vbW, d.vbH, d.pxW, d.pxH, d.body))}`;
  }
  return d.img;
}
function dropSVG(d) { if (d?.img) { d.img.src = ''; d.img = null; d.ready = null; } }
async function drawTile(el, d, t) {
  const img = loadSVG(d);
  if (!(await d.ready) || !el.isConnected || t.canvas || d.img !== img) return;
  const c = document.createElement('canvas');
  c.width = t.tw; c.height = d.pxH;
  c.style.cssText = `position:absolute;top:0;left:${t.tx / d.dens}px;width:${t.tw / d.dens + .5}px;height:100%`;
  c.getContext('2d').drawImage(img, t.tx, 0, t.tw, d.pxH, 0, 0, t.tw, d.pxH);
  el.append(c); t.canvas = c;
  // 全部のタイルを焼き終えた（横に長くない）層は、元の絵を手放す
  if (!el._tiles.some((x) => !x.canvas) && !virtBoxes.has(el)) dropSVG(d);
}
// 横に長い層（画面 1.6 枚ぶんより広いもの）は、画面 2.6 枚ぶんの幅の canvas 1 枚を、歩くのに合わせて横へずらして使う。
// ずらすときは、今ある絵をそのまま横へ写し、新しく見えてくる端の帯だけを描き足す（部屋がどれだけ長くてもメモリは画面数枚ぶん）。
// 画面 1 枚ずつの canvas を並べると、境目のピクセルが透けて細い縦線が出るので、1 枚にしている
const virtBoxes = new Set();
async function drawWindow(el) {
  const d = el._d, w = el._win, img = loadSVG(d);
  if (!(await d.ready) || !el.isConnected || d.img !== img) return;
  const ox = w.want, cw = w.cw, H = d.pxH;
  if (ox === w.ox && w.c) return;
  // 絵の一部 [sx, sx + sw) を、canvas の同じ位置に描く（少し広めに描いて端を切り、帯の境目をなじませる）
  const paint = (g, sx, sw) => {
    const m = 4, a = Math.max(0, sx - m), b = Math.min(d.pxW, sx + sw + m);
    g.save(); g.beginPath(); g.rect(sx - ox, 0, sw, H); g.clip();
    g.drawImage(img, a, 0, b - a, H, a - ox, 0, b - a, H);
    g.restore();
  };
  let c = w.c;
  if (!c) {
    c = document.createElement('canvas'); c.width = cw; c.height = H;
    c.style.cssText = `position:absolute;top:0;width:${cw / d.dens}px;height:100%`;
    paint(c.getContext('2d'), ox, cw);
    el.append(c); w.c = c;
  } else {
    const g = c.getContext('2d'), dx = ox - w.ox;
    if (Math.abs(dx) >= cw) { g.clearRect(0, 0, cw, H); paint(g, ox, cw); }
    else {
      // 今ある絵を横へ写す（'copy' なので、はみ出して空いたところは透明になる）
      g.globalCompositeOperation = 'copy'; g.drawImage(c, -dx, 0); g.globalCompositeOperation = 'source-over';
      if (dx > 0) paint(g, ox + cw - dx, dx); else paint(g, ox, -dx);
    }
  }
  w.ox = ox;
  c.style.left = `${ox / d.dens}px`;
}
async function pumpRaster() {
  rastering = true;
  while (rasterQueue.length) {
    const item = rasterQueue.shift();
    if (item.win) { item.el._win.queued = false; if (item.el.isConnected) await drawWindow(item.el); continue; }
    if (item.tile) {
      item.tile.queued = false;
      if (item.el.isConnected && !item.tile.canvas && item.tile.want) await drawTile(item.el, item.el._d, item.tile);
      continue;
    }
    const el = item;
    const id = el.dataset.svg, d = SVG_STORE.get(id);
    if (!d || !el.isConnected) continue;
    el.removeAttribute('data-svg');
    svgSize(d);
    const dens = d.dens;
    const virt = d.cssW > vw * 1.6;
    const tilePx = virt ? Math.min(4096, Math.round(vw * dens)) : 4096;
    const n = Math.ceil(d.pxW / tilePx);
    el._d = d;
    el._tiles = Array.from({ length: n }, (_, t) => { const tx = Math.round(d.pxW * t / n); return { tx, tw: Math.round(d.pxW * (t + 1) / n) - tx, canvas: null, queued: false, want: !virt }; });
    if (virt) { el._win = { c: null, ox: -1, want: 0, cw: Math.min(d.pxW, Math.round(vw * dens * 2.6)), queued: false }; virtBoxes.add(el); tickTiles(); continue; }
    for (const t of el._tiles) { await drawTile(el, d, t); if (!el.isConnected) break; }
  }
  rastering = false;
}
function tickTiles() {
  if (!virtBoxes.size) return;
  let added = false;
  for (const el of virtBoxes) {
    if (!el.isConnected) { virtBoxes.delete(el); continue; }
    const r = el.getBoundingClientRect(), k = r.width / (el._d.cssW || 1) || 1, d = el._d, w = el._win;
    // いま見えている範囲（層の中の px）。見えている範囲の少し外まで canvas に入っていなければ、画面の真ん中に来るようにずらす
    const x0 = -r.left / k * d.dens, x1 = (vw - r.left) / k * d.dens, m = vw * .15 / k * d.dens;
    const inside = w.c && x0 - m >= w.ox && x1 + m <= w.ox + w.cw;
    if (!inside) {
      const want = Math.round(Math.max(0, Math.min(d.pxW - w.cw, (x0 + x1) / 2 - w.cw / 2)));
      if (want !== w.want || !w.c) { w.want = want; if (!w.queued) { w.queued = true; rasterQueue.push({ el, win: true }); added = true; } }
    }
  }
  if (added && !rastering) pumpRaster();
}
const n2 = (v) => Math.round(v * 100) / 100;
// 部屋を表すアイコン（文字の代わり）
const ICON = {
  forest: '<path d="M10 18C6 14 4 10 6 5C9 3 14 3 16 6C17 11 14 15 10 18Z"/><path d="M10 18L12 8" stroke="#0000" />',
  jungle: '<path d="M10 4A7 5 0 1 0 17 9L10 10Z"/><circle cx="14.5" cy="14.5" r="2" opacity=".7"/>',
  cove: '<circle cx="10" cy="9" r="4"/><path d="M2 14Q6 12 10 14T18 14V16Q14 14 10 16T2 16Z"/>',
  night: '<path d="M13 3A7 7 0 1 0 17 14A6 6 0 1 1 13 3Z"/>',
  attic: '<path d="M3 11L10 4L17 11V17H3Z"/><rect x="8.5" y="12" width="3" height="5" fill="#0000"/>',
};
const icon = (scene) => `<svg viewBox="0 0 20 20" aria-hidden="true">${ICON[scene] || ''}</svg>`;
const worksIn = (roomId) => WORKS.filter((w) => w.room === roomId);
const workNo = (w) => String(WORKS.indexOf(w) + 1).padStart(2, '0');
const mediaHTML = (w, { autoplay = false } = {}) => (w.type === 'video'
  ? `<video muted loop playsinline preload="${autoplay ? 'auto' : 'none'}" ${autoplay ? 'autoplay' : ''} poster="${esc(w.poster)}" src="${esc(w.src)}"></video>`
  : `<img src="${esc(w.src)}" alt="${esc(w.title)}" decoding="async">`);

/* ---------- 作品の色を読む（空間の光の色にする） ---------- */
const glowOf = new Map();
function sampleGlow(w) {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = 24;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0, 24, 24);
      const d = x.getImageData(0, 0, 24, 24).data; let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) {
        const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
        const wgt = (mx - mn) / 255 + .05; // 彩度の高い色を重く
        r += d[i] * wgt; g += d[i + 1] * wgt; b += d[i + 2] * wgt; n += wgt;
      }
      const k = Math.min(2.4, 240 / Math.max(r / n, g / n, b / n));
      glowOf.set(w.id, [r, g, b].map((v) => Math.round(clamp(v / n * k, 0, 255))));
      res();
    };
    img.onerror = res;
    img.src = w.poster || w.src;
  });
}

/* =========================================================
   組み立て
   ========================================================= */
const roomsEl = $('#rooms');
const rooms = ROOMS.map((room, ri) => {
  const works = worksIn(room.id);
  const pending = Math.max(0, room.planned - works.length);
  // 夜更けの小屋：最初の立ち止まる場所は作品を置かず、小屋の扉の前（扉がひらいて中へ）
  const items = [...(room.scene === 'attic' ? [{ door: true }] : []), ...works.map((w) => ({ work: w })), ...(pending ? [{ pending }] : [])];
  const el = document.createElement('section');
  el.className = `room scene-${room.scene} frame-${room.frame}`;
  el.id = `room-${room.id}`;
  el.innerHTML = `<div class="sticky">
      <div class="sky"></div>
      <div class="plane far"></div>${room.scene === 'jungle' ? '<div class="water-glow" aria-hidden="true"><i class="tint"></i><canvas class="caust"></canvas><i class="haze"></i></div>' : ''}<div class="plane mid"></div>
      <div class="plane props" aria-hidden="true"></div>
      <div class="flash" aria-hidden="true"></div>
      <div class="neon" aria-hidden="true"></div><div class="grain-under" aria-hidden="true"></div>
      <div class="lightplay" aria-hidden="true"><i class="l1"></i><i class="l2"></i></div><div class="hush" aria-hidden="true"></div><div class="nextglow" aria-hidden="true"></div>
      ${gradeColors(introSVG(room.scene), GRADES[room.scene])}
      <div class="plane art"></div>
      <div class="plane move"></div>
      <div class="frame"></div>
      <div class="curtain" aria-hidden="true"></div>
      <div class="curtain curtain-leave" aria-hidden="true"></div>
      <div class="veil"></div>
      <div class="vig" aria-hidden="true"></div>
    </div>`;
  roomsEl.append(el);
  return { room, ri, el, items, stops: items.length + 1, c: 0, glow: [255, 230, 200], sceneData: null, live: false, capIdx: -2 };
});

function frameDeco(kind) {
  switch (kind) {
    case 'hang': return `<svg class="deco top" viewBox="0 0 100 30" preserveAspectRatio="none"><path d="M28 2.6L34 30M72 3.2L66 30" stroke="#efe6d2" stroke-width=".5"/><path d="M-22 1.6Q20 -2.6 50 1.2T122 4.6L122 5.8Q88 4.2 50 4T-22 6.2Z" fill="#5a3b2a"/><path d="M-22 2.6Q20 -1.6 50 2.1T122 5" stroke="#8a6440" stroke-width=".5" fill="none"/><path d="M84 3.6Q88 0 92 -3L93 -2.4Q90 1 86 4.4Z" fill="#5a3b2a"/><circle cx="28" cy="2.8" r=".9" fill="#d9ccae"/><circle cx="72" cy="3.4" r=".9" fill="#d9ccae"/></svg>`;
    // 水辺：桟橋の上に据えた木の台。中が詰まっているので、作品の下に水は見えない
    case 'easel': return `<svg class="deco under" viewBox="0 0 100 40" preserveAspectRatio="none"><defs><linearGradient id="pedestal" x1="0" x2="1"><stop offset="0" stop-color="#b58a5a"/><stop offset=".5" stop-color="#96704a"/><stop offset="1" stop-color="#6e4f31"/></linearGradient></defs><path d="M27 0H73V36H27Z" fill="url(#pedestal)"/>${[36, 45, 54, 63].map((x) => `<path d="M${x} 3V35" stroke="#6e4f31" stroke-width=".5" opacity=".55"/>`).join('')}<path d="M23 0H77V2.6H23Z" fill="#c9a276"/><path d="M23 2.6H77V3.4H23Z" fill="#5a3b2a" opacity=".5"/><path d="M25 35H75V38H25Z" fill="#5a3b2a"/></svg>`;
    case 'lamp': return `<svg class="deco top lamp" viewBox="0 0 40 60" preserveAspectRatio="xMidYMax meet"><path d="M20 -200V26" stroke="#3a3a3a" stroke-width=".4"/><path d="M13 26Q20 19 27 26L25 36H15Z" fill="#f2b441"/><path d="M14 29H26M14.5 32H25.5" stroke="#d98f2b" stroke-width=".5"/></svg>`;
    // 夜更けの小屋：壁の釘から紐で吊るし、上に小さな真鍮の額灯
    case 'wall': return `<svg class="deco top wall" viewBox="0 0 60 30" preserveAspectRatio="xMidYMax meet"><path d="M30 6L12 30M30 6L48 30" stroke="#2a1e14" stroke-width=".5"/><circle cx="30" cy="5.5" r="1.2" fill="#9a8a6a"/><path d="M22 1H38L36 4H24Z" fill="#b8925e"/><path d="M24 4L14 16H46L36 4Z" fill="rgba(255,220,160,.22)"/></svg>`;
    // 夜の海辺：遊歩道に据えた石の台座の上に立て、足もとを灯りで照らす
    case 'lightbox': return `<svg class="deco under" viewBox="0 0 100 40" preserveAspectRatio="none"><defs><linearGradient id="plinth" x1="0" x2="1"><stop offset="0" stop-color="#2a2632"/><stop offset=".45" stop-color="#1d1a24"/><stop offset="1" stop-color="#121017"/></linearGradient></defs><ellipse cx="50" cy="37.5" rx="44" ry="2.6" fill="#ffc873" opacity=".16"/><path d="M26 0H74V35H26Z" fill="url(#plinth)"/><path d="M22 0H78V2.4H22Z" fill="#34303e"/><path d="M22 2.4H78V3.2H22Z" fill="#0d0b11" opacity=".6"/><path d="M23 34H77V37.5H23Z" fill="#1a1720"/><path d="M26 3.2H27.2V34H26Z" fill="#3c3848" opacity=".7"/></svg>`;
    // 夕凪の浜：流木の 2 本の柱を砂に立て、作品を縄で結ぶ。下は流木の板を渡してふさぐ（海から出て見えないように）
    case 'post': return `<svg class="deco under" viewBox="0 0 100 40" preserveAspectRatio="none"><ellipse cx="50" cy="37.5" rx="48" ry="2.6" fill="#6b5a44" opacity=".25"/>${[0, 1, 2, 3, 4, 5].map((k) => `<path d="M11 ${k * 6}H89V${k * 6 + 5.4}H11Z" fill="${['#b39c7c', '#a58e70', '#bba585'][k % 3]}"/><path d="M11 ${k * 6 + 5.4}H89" stroke="#7d6a52" stroke-width=".5"/>`).join('')}<path d="M8 0Q7 20 9 38H14Q13 20 13.5 0ZM86.5 0Q87 20 86 38H91Q93 20 92 0Z" fill="#9a8466"/><path d="M10 2Q9.5 20 10.5 36M88.5 2Q89 20 88 36" stroke="#c2ab8a" stroke-width=".6" fill="none"/><path d="M4 38Q11 34 18 38ZM82 38Q89 34 96 38Z" fill="#d9c49f"/></svg><svg class="deco top post" viewBox="0 0 100 20" preserveAspectRatio="none"><path d="M8 20Q7 8 9 0H14Q13 8 13.5 20ZM86.5 20Q87 8 86 0H91Q93 8 92 20Z" fill="#9a8466"/><path d="M5 3Q50 7 95 3" stroke="#8a7458" stroke-width="2.2" fill="none"/><path d="M30 5L33 20M70 5L67 20" stroke="#efe6d2" stroke-width=".6"/></svg>`;
    default: return '';
  }
}

// 入口のランプで夜にしたとき、朝〜夕方の部屋（森・水辺・夕凪）も夜の色で描く。
// 膜を重ねるのではなく、背景の絵そのものを月夜の色に変換して描き直すので、メモリは増えない
// （作品と、水辺の光る水は背景とは別の層なので、色は変わらない）
const NIGHTABLE = ['forest', 'jungle', 'cove'];
let forestNight = false;
const gradeOf = (scene) => (forestNight && NIGHTABLE.includes(scene) ? { ...GRADES[scene], moon: true } : GRADES[scene]);
function setForestNight(on) {
  if (forestNight === on) return;
  forestNight = on;
  document.body.classList.toggle('forest-night', on); // 夜のまま小屋まで行くと、ビートメイカーの SP-404 が光る
  // 葉のカーテンは部屋どうしで受け渡しているので、いったん全部外す（次に閉じるときに新しい色で作り直す）
  const clearC = (c) => { if (!c) return; const box = c.box || $('.curtain', c.el); if (box) box.innerHTML = ''; c.leafEls = null; c.curShown = -1; };
  clearC(entranceCurtain); rooms.forEach((r) => { clearC(r); clearC(r.leaveC); });
  rooms.filter((r) => NIGHTABLE.includes(r.room.scene)).forEach((r) => {
    const was = r.attached, old = r.svgRange;
    if (was) detachLayers(r);
    buildRoomScene(r);
    if (was) attachLayers(r);
    if (old) for (let i = old[0]; i < old[1]; i++) SVG_STORE.delete(`s${i}`); // 前の色の絵の元データは捨てる
  });
}
function buildRoomScene(r) {
  const svgFrom = svgSeq;
  const S = SCENES[r.room.scene](W, r.stops, { birdGap: BIRD_SPOTS[r.room.id] ? Math.floor(BIRD_SPOTS[r.room.id][0]) : -1 });
  r.sceneData = S;
  const moonlit = forestNight && NIGHTABLE.includes(r.room.scene);
  r.el.classList.toggle('moonlit', moonlit);
  if (moonlit) S.glowDefault = [255, 208, 150]; // 夜は、作品のうしろの光を暖かいスポットライトの色に
  GRADE = gradeOf(r.room.scene);
  $('.sky', r.el).style.background = gradeColors(S.sky, GRADE);
  // 背景の絵は HTML として用意だけしておき、部屋に近づいたときに付ける（attachLayers）
  // 奥の層は、描くときに一度だけ薄くぼかしておく（被写界深度。スクロール中の負担はない）
  r.leaves = S.curtain ? curtainLeaves(W, S.curtain) : null;
  r.layerHTML = {
    // 空（skyArt）はぼかさずにいちばん下へ。その上の遠景（山・町）だけを薄くぼかす
    '.far': svgImg(S.far[0], `${S.skyArt || ''}<defs><filter id="dof" x="-2%" y="-2%" width="104%" height="104%"><feGaussianBlur stdDeviation=".12"/></filter></defs><g filter="url(#dof)">${S.far[1]}</g>`, 'far-r') + skyDomHTML(S.skyDom) + farHotspot(r.room.id, S.far[0], U),
    '.mid': svgImg(...S.mid),
    '.move': svgImg(...S.move),
    '.frame': svgImg(W, S.frame, 'wind') + frameHotspot(r.room.id),
  };
  r.curtainHTML = r.leaves ? r.leaves.map((q) => leafImg(q)).join('') : '';
  GRADE = null;
  if (S.snow) {
    // 小屋の前の雪景色（An0n の絵）：遠くの山は奥の層に、雪原から手前は中景の層に。どちらも入ってきたときの位置で重なる。
    // 雪原は小屋の外壁の手前で切る。扉の左の外壁には、絵のスノーボードを立てかける
    const P = S.snow, im = (src, w, h) => `<img src="assets/scene/${src}" alt="" decoding="async" draggable="false" style="width:${w * U}px;height:${h * U}px">`;
    const box = (x, y, w, h) => `left:${x * U}px;top:${y * U}px;width:${w * U}px;height:${h * U}px`;
    // 絵どうしのつなぎ目に細い線が出ないよう、左右に少しだけ重ねる
    const part = (src, x, y, h, clipR = Infinity, flip = false) => `<div class="snowcut${flip ? ' flip' : ''}" style="${box(x - .15, y, Math.min(P.pw + .3, clipR - x + .15), h)}">${im(src, P.pw + .3, h)}</div>`;
    // 広い画面では左右に鏡の絵を交互に（奇数番目は鏡の絵、偶数番目はそれを裏返して元の向きに）
    const sides = (ks, name, y, h, clipR) => ks.map((k) => part(`snow-${name}-ext.webp`, P.x + k * P.pw, y, h, clipR, k % 2 === 0)).join('');
    r.layerHTML['.far'] += part('snow-mount.webp', P.x, P.y(240), 480 * P.s) + sides(P.farTiles, 'mount', P.y(240), 480 * P.s);
    const bh = W < 80 ? 22 : 28, bw = bh * 136 / 640, bx = W * 1.5 - 6 - 1.2 - (W < 80 ? 3.4 : 5) - bw / 2;
    r.layerHTML['.mid'] += part('snow-ground.webp', P.x, P.y(600), 722 * P.s, P.facade0) + sides(P.midTiles, 'ground', P.y(600), 722 * P.s, P.facade0)
      + `<svg class="snowcut" viewBox="${P.corner[0]} 0 ${P.corner[1]} 100" preserveAspectRatio="none" style="${box(P.corner[0], 0, P.corner[1], 100)};overflow:visible" aria-hidden="true">${gradeColors(P.corner[2], GRADES.attic)}</svg>`
      + `<div class="snowcut board" style="${box(bx - bw / 2, 83.2 - bh, bw, bh)}">${im('snow-board.webp', bw, bh)}</div>`;
  }

  r.glow = S.glowDefault;
  const art = $('.art', r.el);
  art.innerHTML = '';
  r.itemEls = r.items.map((it, i) => {
    const el = document.createElement('div');
    const x = (i + 1) * W * FACTORS.mid + W / 2;
    el.style.left = `${x * U}px`;
    if (it.work) {
      const w = it.work;
      let h = Math.min(56, (W * .74) / w.aspect);
      if (W < 70) h = Math.min(h, 46);
      el.className = 'work';
      const standing = ['easel', 'lamp', 'lightbox', 'post'].includes(r.room.frame);
      el.innerHTML = `<div class="halo"></div>${standing ? '<div class="ground-shadow"></div>' : ''}${gradeColors(frameDeco(r.room.frame), gradeOf(r.room.scene))}<button class="canvas" style="width:${h * w.aspect * U}px;height:${h * U}px" aria-label="${esc(w.title)} を見る">${mediaHTML(w)}</button>`;
      // 台座・柱が、作品の大きさによらず地面（遊歩道・桟橋・砂浜）まで届くように
      const groundY = { lightbox: 89, easel: 89, post: 88 }[r.room.frame];
      if (groundY) { const plinth = Math.max(10, groundY - ((vw <= 760 ? 38 : 46) + h / 2 + 1)); el.querySelector('.deco.under').style.height = `${plinth}vh`; el.querySelector('.ground-shadow').style.top = `calc(100% + ${plinth - 1}vh)`; }
      const wv = el.querySelector('video');
      if (wv) { wv.dataset.vsrc = wv.getAttribute('src'); wv.removeAttribute('src'); }
      el.querySelector('.canvas').addEventListener('click', (e) => openViewer(w, e.clientX, e.clientY));
    } else if (it.door) {
      // 小屋の扉：蝶番を左に、近づくとゆっくり内側へひらく。ひらくほど中の灯りが雪に漏れる
      el.className = 'cabin-door';
      el.style.left = `${(x - 6) * U}px`;
      el.innerHTML = gradeColors(`<svg class="spill" viewBox="0 0 40 18" preserveAspectRatio="none" aria-hidden="true"><path d="M14 0H26L40 18H0Z" fill="#ffd9a0"/></svg><div class="leaf"><svg viewBox="0 0 12 38" preserveAspectRatio="none" aria-hidden="true"><rect width="12" height="38" fill="#4a3322"/>${[3, 6, 9].map((v) => `<path d="M${v} 0V38" stroke="#3a2718" stroke-width=".35"/>`).join('')}<path d="M1.4 7H10.6M1.4 30H10.6M1.4 30L10.6 7" stroke="#5e4029" stroke-width="1.1"/><circle cx="10" cy="20" r=".6" fill="#c9a36a"/></svg></div>`, GRADES.attic);
    } else {
      el.className = 'work pending';
      el.innerHTML = `<svg class="covered" viewBox="0 0 60 72" aria-label="搬入中"><path d="M8 70L14 30M52 70L46 30M30 70V40" stroke="#8a5a3b" stroke-width="2.4" stroke-linecap="round"/><path d="M10 8Q30 2 50 8L54 56Q46 60 40 55Q34 61 28 55Q21 61 15 55Q10 59 6 56Z" fill="#efe6d2"/><path d="M10 8Q30 2 50 8L52 30Q30 20 10 30Z" fill="#faf3e4"/><path d="M20 10Q22 30 18 55M34 8Q36 30 34 56M44 9Q42 32 44 55" stroke="#d8ccb2" stroke-width="1" fill="none"/><path d="M28 2Q30 -1 32 2L31 6H29Z" fill="#6b4630"/></svg>`;
    }
    art.append(el);
    return el;
  });
  art.insertAdjacentHTML('beforeend', roomArtEggHTML(r.room.id, W, U, r.items.length, W * FACTORS.mid));
  // 夜更けの小屋：最後の作品の左下、床の上に古い金庫（知っている人だけが開ける）
  if (r.room.scene === 'attic') {
    art.insertAdjacentHTML('beforeend', `<button class="vault-safe" aria-label="?" style="left:${(r.items.length * W * FACTORS.mid + W * .5 - Math.min(W * .36, 40) - 5.5) * U}px">${gradeColors(safeSVG(), GRADES.attic)}</button>`);
    $('.vault-safe', art).addEventListener('click', () => openVault());
  }
  buildProps(r);
  r.svgRange = [svgFrom, svgSeq];
  // はじめは絵も動画も外しておき、近づいたら付ける
  r.attached = true; detachLayers(r);
}

/* ---------- 森の中のストリート ---------- */
// ヒップホップの小物は、森に自然に置けるものを各部屋 1 つまで（あとは苔むした岩など自然のもの）
const STREET = {
  dapple: { intro: 'boombox', pool: ['rock'] },
  water: { intro: null, pool: [] },
  dusk: { intro: null, pool: [] },
  night: { intro: 'sneakers', pool: [] },
  afterhours: { intro: 'recordStand', introAt: 3.5, pool: [], extra: [[4.5, 'armchair', 0], [5.5, 'bookcrate', -15]] }, // 小屋の家具 // 小屋のレコードプレーヤーは台に載せる
};
function propHTML(kind, scene) {
  if (kind === 'rock') return { html: ROCK.svg(Math.floor(Math.random() * 2)), cls: 'rock', w: ROCK.w, bottom: 5 };
  if (kind === 'armchair' || kind === 'bookcrate') return { html: PROPS[kind].svg(), cls: '', w: PROPS[kind].w, bottom: kind === 'armchair' ? 7.4 : 7.8 };
  if (kind === 'recordStand') return { html: PROPS.recordStand.svg(), cls: '', w: PROPS.recordStand.w, bottom: 8 }; // 上にインコがとまるので高さを決めておく
  const P = PROPS[kind];
  return { html: P.svg(), cls: P.hang ? 'hang-prop' : '', w: P.w, bottom: P.hang ? null : 7 + Math.random() * 3 };
}
function buildProps(r) {
  const L = $('.props', r.el), cfg = STREET[r.room.id];
  if (!cfg) return;
  // 部屋の入口の小物は左寄りに。狭い画面でも画面の外にはみ出さないように（小物の幅の半分 + 余白より内側）
  const introX = (kind) => Math.max(W * .16, (PROPS[kind]?.w || 0) / 2 + 3);
  const spots = cfg.intro ? [cfg.introAt != null ? [cfg.introAt, W / 2, cfg.intro] : [0, introX(cfg.intro), cfg.intro]] : [];
  if (cfg.pool.length) for (let i = 1; i < r.items.length; i++) spots.push([i + .5, W / 2, cfg.pool[(i - 1) % cfg.pool.length]]);
  (cfg.extra || []).forEach(([s, kind, dx]) => spots.push([s, W / 2 + dx, kind])); // dx：金庫などとぶつからないよう横にずらす（vh）
  L.innerHTML = spots.map(([s, x, kind]) => {
    const p = propHTML(kind, r.room.scene);
    p.html = gradeColors(p.html, gradeOf(r.room.scene));
    const pos = p.bottom == null ? 'top:0' : `bottom:${p.bottom}vh`;
    const eggKind = kind === 'recordStand' ? 'turntable' : kind;
    const egg = ['boombox', 'sneakers', 'turntable'].includes(eggKind) ? ` data-egg="${eggKind}"` : '';
    return `<div class="prop ${p.cls}${egg ? ' egg-prop' : ''}"${egg} style="left:${(s * W * FACTORS.mid + x) * U}px;${pos};width:${p.w}vh">${p.html}</div>`;
  }).join('') + roomEggHTML(r.room.id, W, U, r.items.length, W * FACTORS.mid) + birdHTML(r);
}
// インコ：入口の看板の上にいて、森の奥の部屋でもときどき見かける（同じ鳥がついてくる）
// [部屋, 作品と作品のあいだの位置, 横のずれ（vh）, 足もとの高さ（vh）, 左右反転]
const BIRD_SPOTS = { dapple: [1.5, 3, 15.6, false], water: [2.5, -2, 12.4, true] };
function birdHTML(r) {
  const b = BIRD_SPOTS[r.room.id]; if (!b) return '';
  const [s, dx, bottom, flip] = b;
  return `<button class="prop bird-prop${flip ? ' flip' : ''}" aria-label="インコ" style="left:${(s * W * FACTORS.mid + W / 2 + dx) * U}px;bottom:${bottom}vh"><img src="assets/bird.webp" alt="" draggable="false"></button>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('.bird-prop, .sign-bird'); if (!b) return;
  e.stopPropagation();
  // タップすると小さく跳ねる
  b.classList.remove('hop'); void b.getBoundingClientRect(); b.classList.add('hop');
}, true);

/* ---------- 入口 ---------- */
const entrance = $('#entrance');
function buildEntrance() {
  const S = sceneForest(W, 1, { entrance: true });
  GRADE = GRADES.forest;
  $('.sky', entrance).style.background = gradeColors(S.sky, GRADE);
  entrance.layerHTML = { '.far': svgImg(S.far[0], S.far[1], 'far-r'), '.mid': svgImg(...S.mid), '.frame': svgImg(W, S.frame, 'wind') };
  GRADE = null;
  entrance.attached = false; attachEntrance();
}

/* ---------- 収蔵目録 ---------- */
function buildCatalog() {
  // 森の標本箱：部屋ごとに木の箱。布張りの底に、台紙に載せた作品を元の比率のまま並べ、隅に押し葉
  const grid = $('#catalog-grid');
  grid.innerHTML = ROOMS.map((room) => {
    const specs = WORKS.map((w, i) => [w, i]).filter(([w]) => w.room === room.id).map(([w, i]) => `<button class="spec" data-i="${i}" data-id="${w.id}" aria-label="${esc(w.title)} を見る" style="--ar:${w.aspect}">
        <span class="mount">${w.type === 'video' ? `<img src="${esc(w.poster)}" alt="" loading="lazy"><video muted loop playsinline preload="none" data-src="${esc(w.src)}"></video>` : `<img src="${esc(w.src)}" alt="" loading="lazy">`}</span><i class="pin" aria-hidden="true"></i><i class="ask${w.sold ? ' sold' : w.nfs ? ' nfs' : ''}" aria-hidden="true">${w.sold ? 'SOLD OUT' : w.nfs ? 'NOT FOR SALE' : 'ASK'}</i></button>`).join('');
    return `<section class="specimen" data-room="${room.id}" aria-label="${esc(room.ja)}"><div class="box"><div class="bed">${specs}<span class="pressed">${pressedSpecimen(room.scene)}</span></div></div></section>`;
  }).join('');
  grid.addEventListener('click', (e) => {
    const c = e.target.closest('.spec[data-i]'); if (!c) return;
    openViewer(WORKS[+c.dataset.i], e.clientX, e.clientY);
  });
  grid.querySelectorAll('.spec').forEach((c) => {
    const v = c.querySelector('video'); if (!v) return;
    // 触れている間だけ動画を読み込む（離れたら手放して、メモリを空ける）
    c.addEventListener('pointerenter', () => { if (!v.getAttribute('src')) v.src = v.dataset.src; v.play().catch(() => {}); c.classList.add('playing'); });
    c.addEventListener('pointerleave', () => { v.pause(); v.removeAttribute('src'); v.load(); c.classList.remove('playing'); });
  });
}

function buildArtist() {
  const LOGO = {
    Instagram: '<rect x="3" y="3" width="14" height="14" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="10" cy="10" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="14.2" cy="5.8" r="1"/>',
    Mail: '<rect x="2.5" y="4.5" width="15" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 6l6.5 5 6.5-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    GitHub: '<path d="M10 2a8 8 0 0 0-2.5 15.6c.4.1.5-.2.5-.4v-1.4c-2.2.5-2.7-1-2.7-1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.2 1.9.9 2.4.7.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-3.9 0-.9.3-1.6.8-2.1-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8a7.6 7.6 0 0 1 4 0c1.5-1 2.2-.8 2.2-.8.4 1.1.2 1.9.1 2.1.5.6.8 1.3.8 2.1 0 3-1.8 3.7-3.6 3.9.3.3.5.8.5 1.5v2.2c0 .2.1.5.6.4A8 8 0 0 0 10 2Z"/>',
  };
  // メールは新しいタブではなくメールアプリで開く。アドレスはマウスを乗せると見える
  // 作家の欄の結び：星空に満月、森と小屋のシルエット（窓にひとつ灯り）。文字は増やさない
  { const sky = nightSky(0, 100, 0, 60, { density: .5 }); $('#artist').insertAdjacentHTML('afterbegin', `<div class="farewell" aria-hidden="true"><svg class="fw-stars" viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice">${sky.svg}</svg><div class="fw-moon">${moonSVG('full')}</div>${farewellSVG()}</div>`); }
  $('#artist-links').innerHTML = ARTIST.links.map((l) => `<a href="${esc(l.href)}"${l.href.startsWith('mailto:') ? '' : ' target="_blank" rel="noopener"'} aria-label="${esc(l.title ? `${l.label}: ${l.title}` : l.label)}"${l.title ? ` title="${esc(l.title)}"` : ''}><svg viewBox="0 0 20 20" aria-hidden="true">${LOGO[l.label] || ''}</svg></a>`).join('');
}

/* ---------- 右側の部屋ナビ ---------- */
const nav = $('#room-nav');
nav.innerHTML = rooms.map((r) => `<a href="#room-${r.room.id}" data-i="${r.ri}" aria-label="${esc(r.room.ja)}">${icon(r.room.scene)}</a>`).join('');

/* =========================================================
   スクロールで歩く
   ========================================================= */
let sy = scrollY, mouse = { x: 0, y: 0, tx: 0, ty: 0 };
// 作品の前で少し立ち止まるように、区間の真ん中だけ進む
const dwell = (t) => { const k = Math.floor(t), f = t - k; return k + smooth(.22, .78, f); };
function roomMetrics(r) {
  const top = r.top ?? r.el.offsetTop, len = (r.h ?? r.el.offsetHeight) - vh;
  return { top, len };
}
function layoutSizes() {
  rooms.forEach((r) => { r.el.style.height = `${(r.stops - 1) * 115 + 170}vh`; });
}

// 葉のカーテン：中央のかたまりから順に、手前ほど速く大きく回りながら左右へかき分ける
const ease = (k) => k * k * (3 - 2 * k);
function updateCurtain(r, cur) {
  if (!r.leaves) return;
  const c = Math.round(cur * 400) / 400;
  if (c === r.curShown) return;
  r.curShown = c;
  const box = r.box || $('.curtain', r.el);
  box.style.visibility = c > 0 ? 'visible' : 'hidden';
  // 葉のカーテンは閉じかけている間だけ付ける（開いたら外してメモリを空ける）
  if (c <= 0) { if (r.leafEls) { box.innerHTML = ''; r.leafEls = null; } return; }
  if (!r.leafEls) {
    // 前の部屋（や入口）で閉じきっている同じ葉があれば、焼いた絵ごと引き継ぐ（同じ葉を 2 回焼かない）
    const donor = [entranceCurtain, ...rooms.map((x) => x.leaveC)].find((d) => d && d !== r && d.leaves === r.leaves && d.leafEls && d.curShown >= 1);
    if (donor) {
      donor.leafEls.forEach((el) => box.append(el));
      r.leafEls = donor.leafEls; donor.leafEls = null; donor.curShown = -1;
      donor.box = donor.box || $('.curtain', donor.el); donor.box.innerHTML = ''; donor.box.style.visibility = 'hidden';
    } else { box.innerHTML = r.curtainHTML; r.leafEls = [...box.children]; hydrate(box); }
  }
  const o = 1 - c;
  r.leaves.forEach((q, i) => {
    const k = ease(clamp(o * (1 + q.delay) - q.delay));
    // 葉は真横にだけひらく（のれんのように、その高さのまま左右へ。下へずれたり回ったりはしない）
    r.leafEls[i].style.transform = k <= 0 ? '' : `translate3d(${(q.dx * k) * U}px, 0, 0)`;
  });
}

// 水辺の水：奥へ歩くほど、淡い緑に光り、水底の光の網目（揺らめき）が浮かび上がる。
// 水面（空と奥の層）と、睡蓮・桟橋（中景）のあいだに重ねるので、睡蓮や作品にはかからない
let causticURL = null; // 光の網目の元になる小さな正方形（256px の canvas 1 枚）
// 網目の画素を計算する（重いので、ふつうは Worker で。この関数はそのまま Worker にも渡す）
function causticPixels(N) {
  const data = new Uint8ClampedArray(N * N * 4), pts = [], TAU = Math.PI * 2;
  for (let i = 0; i < 20; i++) pts.push([Math.random() * N, Math.random() * N]);
  // 周期 N でくり返す揺れ（タイルの継ぎ目が出ないように）
  const ph = Array.from({ length: 6 }, () => Math.random() * TAU), wave = (v, k, i) => Math.sin(TAU * k * v / N + ph[i]);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    // 線をうねらせる（ゆるい曲がりと、細かい曲がり）
    const q = N / 192, wx = x + (wave(y, 2, 0) * 7 + wave(y + x, 5, 1) * 2.2) * q, wy = y + (wave(x, 2, 2) * 7 + wave(x - y, 4, 3) * 2.2) * q;
    let d1 = 1e9, d2 = 1e9;
    for (const [px, py] of pts) for (let ox = -N; ox <= N; ox += N) for (let oy = -N; oy <= N; oy += N) {
      const d = Math.hypot(wx - px - ox, wy - py - oy);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    // 明るさと太さにムラ（光が集まるところは太く明るく、ほかは細く淡く）
    const m = .5 + .5 * wave(x, 1, 4) * wave(y, 1, 5), w = (1.1 + 1.9 * m) * q, e = d2 - d1;
    const v = Math.exp(-((e / w) ** 2)) * (.55 + .45 * m) + Math.exp(-e / (7 * q)) * .14, i = (y * N + x) * 4;
    data[i] = 236; data[i + 1] = 255; data[i + 2] = 214; data[i + 3] = Math.min(255, v * 255);
  }
  return data;
}
function causticFrom(data) {
  const c = document.createElement('canvas'); c.width = c.height = TILE;
  c.getContext('2d').putImageData(new ImageData(data, TILE, TILE), 0, 0);
  return c;
}
function causticTile() {
  // Worker がまだ終わっていないとき（や使えないとき）だけ、ここで計算する
  return causticURL || (causticURL = causticFrom(causticPixels(TILE)));
}
// 森を歩きはじめたころに、別のスレッドで先に作っておく（画面を止めない。水辺に着いたときに引っかからないように）
function prepareCaustic() {
  if (causticURL) return;
  try {
    const src = `${causticPixels.toString()}\nonmessage = (e) => { const d = causticPixels(e.data); postMessage(d, [d.buffer]); };`;
    const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    const wk = new Worker(url);
    wk.onmessage = (e) => { if (!causticURL) causticURL = causticFrom(e.data); wk.terminate(); URL.revokeObjectURL(url); };
    wk.onerror = () => { wk.terminate(); URL.revokeObjectURL(url); };
    wk.postMessage(TILE);
  } catch { /* Worker が使えないときは、水辺に着いたときに作る */ }
}
// 光の網目は、画面の半分ほどの解像度の canvas 1 枚に毎フレーム描く（大きな層を 3D で傾けると、
// iPhone はそれを丸ごと画像として持つので数百 MB になり落ちる。canvas なら 1MB 未満）。
// 奥へ倒した水平な水面に見えるよう、横に細い帯ごとに網目の大きさを変える：手前は大きく、奥ほど小さく詰まり、薄れる
const WQ = Math.min(devicePixelRatio || 1, 2), TILE = 256; // canvas は画面と同じ細かさ（最大 2 倍）。1 枚だけなので約 5MB
function drawWater(el, t, wx) {
  const cv = el._cv, g = el._g, Wc = cv.width, Hc = cv.height;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Wc, Hc);
  const yh = -.42 * Hc, span = Hc - yh, SQ = .5, bands = 44; // 地平線は画面の上の外。SQ は網目のつぶれ具合（水面の傾き）
  const layers = [[34, 2, 1.4, .8 + .2 * Math.sin(t * .7)], [52, -1.5, -1.8, .42 + .16 * Math.sin(t * .5 + 1.3)]];
  for (const [size, vx, vy, alpha] of layers) {
    const k = size * U * WQ / TILE; // 手前での網目の大きさ（タイルに対する倍率）
    for (let i = 0; i < bands; i++) {
      const y0 = Hc * (i / bands) ** 1.25, y1 = Hc * ((i + 1) / bands) ** 1.25, ym = (y0 + y1) / 2;
      const s = (ym - yh) / span, depth = Math.min(1, ym / Hc);
      const a = alpha * Math.min(1, Math.max(0, (depth - .04) / .6)) ** 1.3; // 奥ほど薄く
      if (a < .01) continue;
      const sx = k * s, sy = k * s * SQ;
      // 水面上の位置：奥ほど同じ画面の高さで遠くまで見えるので、縦は対数で進む
      const V0 = (span / (k * SQ)) * Math.log((y0 - yh) / span) + t * vy * U * WQ / k;
      const U0 = (wx * WQ + t * vx * U * WQ) / sx;
      g.globalAlpha = a;
      g.setTransform(sx, 0, 0, sy, -U0 * sx, y0 - V0 * sy);
      g.fillRect(U0, V0, Wc / sx, (y1 - y0) / sy + 1);
    }
  }
  g.globalAlpha = 1;
}
function updateWater(r, p, cam, mx, now) {
  const el = r.water || (r.water = $('.water-glow', r.el)); if (!el) return;
  // 歩いた分だけ明るくする。ただしスクロールにぴったり付けず、少し遅れてふわっと追いかける（フェード）
  const target = smooth(.03, .88, p), dt = Math.min(.1, (now - (el._t ?? now)) / 1000); el._t = now;
  el._k = el._k == null ? target : el._k + (target - el._k) * (1 - Math.exp(-dt / (REDUCED ? .05 : 1.1)));
  if (Math.abs(el._k - target) < .002) el._k = target;
  const k = el._k, ease = k * k * (3 - 2 * k);
  if (Math.abs(ease - (el._shown ?? -1)) > .002) {
    el._shown = ease;
    el.style.opacity = Math.min(1, ease * 1.15).toFixed(3); // 先に水の色が明るくなり
    el.style.setProperty('--caust', smooth(.2, 1, ease).toFixed(3)); // あとから光の網目が浮かぶ
  }
  const cv = el._cv || (el._cv = $('.caust', el));
  if (k <= .01 || !r.live) { if (cv.width) { cv.width = 0; cv.height = 0; el._g = null; } return; } // 見えないときは canvas を空にする
  const Wc = Math.round(vw * WQ), Hc = Math.round(vh * WQ);
  if (cv.width !== Wc || cv.height !== Hc) { cv.width = Wc; cv.height = Hc; el._g = null; }
  if (!el._g) { el._g = cv.getContext('2d'); el._g.imageSmoothingQuality = 'high'; el._g.fillStyle = el._g.createPattern(causticTile(), 'repeat'); }
  // 横に歩くと、水面は奥の層と一緒に流れる
  const t = REDUCED ? 0 : now / 1000, wx = (cam * W * FACTORS.far) * U + mx * FACTORS.far * 2 * U;
  drawWater(el, t, wx);
}

function updateRoom(r, now) {
  manageMemory(r);
  const { top, len } = roomMetrics(r);
  const p = clamp((sy - top) / len);
  const onScreen = sy + vh > top && sy < top + len + vh;
  if (onScreen !== r.live) { r.live = onScreen; r.el.classList.toggle('live', onScreen); }
  if (!onScreen) { pauseRoomVideos(r); updateCurtain(r, 0); if (r.leaveC) updateCurtain(r.leaveC, 0); r.curS = null; return; }
  const t = clamp((p * 1.08 - .04) * (r.stops - 1), 0, r.stops - 1);
  r.c = dwell(t);
  const mx = mouse.x * 1.2, my = mouse.y;
  // 歩いている間だけ、足取りに合わせてほんの少し上下に揺れる
  const moving = Math.min(1, Math.abs(r.c - (r.pc ?? r.c)) * 80);
  r.pc = r.c; r.bob = lerp(r.bob || 0, REDUCED ? 0 : moving, .08);
  const bob = Math.sin(r.c * Math.PI * 7) * .5 * r.bob;
  // 夜更けの小屋：扉の前で立ち止まったまま扉の中へ吸い込まれ（ズームと灯り）、灯りが引くと室内にいる
  let cam = r.c;
  if (r.room.scene === 'attic') {
    const c = r.c, sticky = q(r, '.sticky'), flash = q(r, '.flash');
    if (c > 1 && c < 2) cam = c < 1.5 ? 1 : 2;
    const zin = c > 1 && c < 1.5 ? smooth(1.02, 1.47, c) : 0;
    const settle = c >= 1.5 && c < 2 ? 1 - smooth(1.5, 1.95, c) : 0;
    // スマホは寄りを控えめに（大きく拡大した層はメモリを食うので。灯りが先に画面を満たす）
    const scale = zin > 0 ? Math.pow(COARSE ? 3.2 : 5.5, zin) : 1 + settle * .18;
    put(sticky, 'transformOrigin', zin > 0 ? '50% 63%' : '50% 55%');
    put(sticky, 'transform', scale > 1.0005 ? `scale(${scale.toFixed(4)})` : '');
    put(flash, 'opacity', (c < 1.5 ? smooth(1.26, 1.48, c) : 1 - smooth(1.5, 1.72, c)).toFixed(3));
  }
  r.cam = cam;
  // 小屋の中の最初の作品の前では、画面の左端がちょうど外壁との境目。
  // マウスや傾きで背景が右へずれると外の雪がのぞくので、室内にいる間はその向きのずれを止める
  const mxc = r.room.scene === 'attic' && cam >= 1.5 && cam < 2.6 ? Math.max(mx, 0) : mx;
  const tr = (sel, f, extra = '') => put(q(r, sel), 'transform', `translate3d(${((-(cam * W * f) - mxc * f * 2) * U).toFixed(2)}px, ${((my * f * -1.2 + bob * f) * U).toFixed(2)}px, 0)${extra}`);
  tr('.far', FACTORS.far); tr('.mid', FACTORS.mid); tr('.props', FACTORS.mid); tr('.art', FACTORS.mid); tr('.move', FACTORS.move);
  if (r.room.scene === 'jungle') updateWater(r, p, cam, mxc, now);
  // 部屋の出入りで、手前の植物をくぐる
  const enter = 1 - smooth(0, .035, p), leave = smooth(.95, 1, p);
  // 葉のカーテンは、スクロールに遅れてゆっくりひらく／閉じる（速くスワイプしても葉がふわっと動く）
  const dtc = Math.min(.1, (now - (r.lastNow ?? now)) / 1000); r.lastNow = now;
  // 入るときのカーテン（この部屋の葉）はゆっくり追いかけてひらく。
  // 出るときは、次の部屋の葉のカーテンがスクロールどおりに閉じる。閉じきったところで次の部屋（真下に重ねてある）に入れ替わり、
  // そのまま同じ葉がひらくので、部屋の切り替わりが見えない（最後の部屋だけは自分の葉で閉じる）
  const next = rooms[rooms.indexOf(r) + 1];
  const target = next ? enter : Math.max(enter, leave);
  r.curS = r.curS == null ? target : r.curS + (target - r.curS) * (1 - Math.exp(-dtc / .9));
  if (Math.abs(r.curS - target) < .015) r.curS = target; // ほぼ開いた（閉じた）ら、そこで止める（端に葉が残らないように）
  // 作品の前では、手前の植物が少しひらいて作品に場所をゆずる
  const at = 1 - smooth(.05, .35, Math.abs(r.c - Math.round(r.c)));
  const focus = r.c > .5 ? at : 0;
  // 作品の前の暗がり（周辺の減光と、しずまり）。部屋全体ではなく、使う要素にだけ渡す
  const fv = focus.toFixed(3); put(q(r, '.vig'), '--focus', fv); put(q(r, '.hush'), '--focus', fv);
  // 光の流れ・次の部屋の気配は、部屋の中にいる間だけ（葉のカーテンが開いている間）。いま見ている部屋だけに付けて軽く
  r.el.classList.toggle('lit', p > .015 && p < .985);
  put(q(r, '.lightplay'), '--p', p.toFixed(3));
  // 部屋の終わりが近づくと、次の部屋の光の色が右からこぼれてくる（葉のカーテンが閉じると引く）
  put(q(r, '.nextglow'), '--nextk', (next ? smooth(.76, .93, p) * (1 - smooth(.965, .995, p)) : 0).toFixed(3));
  r.el.classList.toggle('focus', focus > .6);
  const fs = 1 + Math.max(r.curS * .45, leave * .6) + focus * .05;
  put(q(r, '.frame'), 'transform', `translate3d(${(-mx * 2.4 * U).toFixed(2)}px, ${(-my * 1.6 * U).toFixed(2)}px, 0) scale(${(fs + kick * .006).toFixed(4)})`);
  // 部屋の出入りで、葉のカーテンが閉じて開く
  // 真上の部屋（入口）がまだ見えている間は、自分のカーテンを作らない（閉じきったら、その葉を引き継ぐ）
  const above = rooms.indexOf(r) ? rooms[rooms.indexOf(r) - 1].el : entrance;
  if (above.classList.contains('gone')) updateCurtain(r, r.curS);
  if (next && next.leaves) {
    r.leaveC = r.leaveC || { el: r.el, box: $('.curtain-leave', r.el), leafEls: null, curShown: -1 };
    r.leaveC.leaves = next.leaves; r.leaveC.curtainHTML = next.curtainHTML;
    // 隠した部屋（次の部屋に入れ替わった後）では作らない。作ると、閉じた葉だけが上へ流れていき、下の端がまっすぐ見える
    updateCurtain(r.leaveC, r.el.classList.contains('gone') ? 0 : leave);
  }
  put(q(r, '.veil'), 'opacity', (Math.max(r.curS, next ? 0 : leave) * .35).toFixed(3));
  // 部屋の入口のアニメーション（部屋の名前の代わり）
  const intro = q(r, '.room-intro');
  const to = 1 - smooth(.12, .5, r.c);
  put(intro, 'opacity', to.toFixed(3));
  put(intro, 'visibility', to < .01 ? 'hidden' : 'visible');
  // 作品：近づくほど大きく、はっきり
  let near = -1, best = 9, glow = r.sceneData.glowDefault;
  r.itemEls.forEach((el, i) => {
    const d = Math.abs(r.c - (i + 1));
    put(el, 'opacity', (1 - Math.min(d, 1) * .35).toFixed(3));
    el.classList.toggle('near', d < .25);
    if (d < best) { best = d; near = i; }
    const v = el.querySelector('video');
    if (v) {
      if (d < 1.1) {
        if (!v.getAttribute('src') && v.dataset.vsrc) { v.src = v.dataset.vsrc; delete v.dataset.vsrc; }
        if (v.paused) v.play().catch(() => {});
      } else {
        if (!v.paused) v.pause();
        // 離れた動画は読み込んだ中身ごと手放す（止めるだけだとメモリに残る）。表紙の絵はそのまま見える
        if (d > 1.6 && v.getAttribute('src')) { v.dataset.vsrc = v.getAttribute('src'); v.removeAttribute('src'); v.load(); }
      }
    }
  });
  const doorEl = r.itemEls[0]?.classList.contains('cabin-door') ? r.itemEls[0] : null;
  if (doorEl) {
    const want = smooth(.45, 1, r.c);
    r.doorO = r.doorO == null ? want : r.doorO + (want - r.doorO) * (1 - Math.exp(-dtc / .5));
    put(doorEl, '--open', r.doorO.toFixed(3));
  }
  const it = r.items[near];
  if (it?.work && glowOf.has(it.work.id)) glow = glowOf.get(it.work.id);
  const k = 1 - smooth(.3, 1, best);
  r.glow = r.glow.map((v, i) => lerp(v, lerp(r.sceneData.glowDefault[i], glow[i], k), .08));
  put(q(r, '.art'), '--glow', r.glow.map(Math.round).join(',')); // 作品のうしろの光（作品の層だけが使う）
  if (sy > top - vh * .5 && sy < top + len + vh * .5) currentRoom = r;
}
function pauseRoomVideos(r) { r.el.querySelectorAll('video').forEach((v) => { if (!v.paused) v.pause(); }); }


let currentRoom = null;
const entranceCurtain = { el: entrance, leaves: null, curtainHTML: '', leafEls: null, curShown: -1 };
function updateEntrance() {
  const len = GEO.entH - vh, p = clamp(sy / len);
  const mx = mouse.x, my = mouse.y;
  $('.far', entrance).style.transform = `translate3d(${-mx * .6 * U}px, ${-my * .4 * U}px, 0) scale(${1 + p * .08})`;
  // 地面（中景）は、看板の足もとを中心に寄っていく。看板の足もとの地面は動かないので、画面に立てたままの看板が地面から離れない
  const sign = $('.sign', entrance);
  if (!sign._foot) { const cs = getComputedStyle(sign); sign._foot = [(parseFloat(cs.left) + parseFloat(cs.width) / 2) / U, 100 - parseFloat(cs.bottom) / U - .6]; }
  const [FX, FY] = sign._foot, zoom = .22;
  const midEl = $('.mid', entrance);
  midEl.style.transformOrigin = `${FX * U}px ${FY * U}px`;
  midEl.style.transform = `translate3d(${-mx * 1.4 * U}px, ${-my * .8 * U}px, 0) scale(${1 + p * zoom})`;
  sign.style.translate = $('.sign-bird', entrance).style.translate = `${-mx * 1.4 * U}px ${-my * .8 * U}px`; // マウスの視差だけは地面と一緒に
  $('.frame', entrance).style.transform = `translate3d(${-mx * 3 * U}px, ${-my * 2 * U}px, 0) scale(${1 + p * 1.7})`;
  // 案内人は小道の中心線の上を、奥へ歩いていく（中景と同じ拡大・視差をかけて、道から外れないように）
  const t0 = .507, tg = t0 - Math.min(p, .9) * .42, [X, Y] = ENTRANCE_PATH(W)(tg), s = 1 + p * zoom;
  // 中景の 1 点 (x, y) が、いま画面のどこに見えるか（中景と同じ拡大・視差）
  const onGround = (x, y) => [FX + (x - FX) * s - mx * 1.4, FY + (y - FY) * s - my * .8];
  const guide = $('.guide', entrance);
  if (guide._feetU !== U) { guide._feetU = U; guide._feetY = 100 - parseFloat(getComputedStyle(guide).bottom) / U; }
  const feetY = guide._feetY;
  const [xs, ys] = onGround(X, Y), k = (Y - 64) / (ENTRANCE_PATH(W)(t0)[1] - 64) * (1 + p * .4);
  guide.style.transform = `translate(-50%, 0) translate(${(xs - W / 2) * U}px, ${(ys - feetY) * U}px) scale(${k})`;
  guide.style.opacity = 1 - smooth(.6, .85, p);
  // 足取り：進んだ距離に合わせてコマを送る（止まれば足も止まる）。最初は両足がそろったコマで立っている
  const WALK_FRAMES = 23, frameNo = (11 + Math.floor(p * 7 * WALK_FRAMES)) % WALK_FRAMES;
  if (frameNo !== guide._frame) { guide._frame = frameNo; guide.firstElementChild.style.backgroundPosition = `${(frameNo / (WALK_FRAMES - 1)) * 100}% 0`; }
  // レコードプレーヤーとランプは地面に置いたもの：足もと（下端の中央）を中景と同じように動かす
  // transform は揺れ・ホバーの演出に使うので、translate / scale のプロパティで動かす
  // 看板は画面の同じ位置に立てたまま（足もとの草むらで地面に刺さって見える）
  for (const el of [$('#player'), $('#lamp')]) {
    if (!el._foot) { const cs = getComputedStyle(el); el._foot = [(parseFloat(cs.left) + el.offsetWidth / 2) / U, 100 - parseFloat(cs.bottom) / U]; }
    const [fx, fy] = el._foot, [gx, gy] = onGround(fx, fy);
    // 位置は地面についていくが、大きさは変えない（奥へ進むにつれて看板が大きくなって見えないように）
    el.style.translate = `${(gx - fx) * U}px ${(gy - fy) * U}px`;
  }
  // 夜の森：暗さと灯りの中心を、ランプのかさの位置に合わせる
  // （ランプの位置はフレームの最初に測ったもの。入口全体ではなく、暗がりと灯りの 2 枚にだけ渡す）
  if (entrance.classList.contains('night') && GEO.lamp) {
    const b = GEO.lamp, lx = `${(b.left + b.width / 2).toFixed(1)}px`, ly = `${(b.top + b.height * .16).toFixed(1)}px`;
    entrance.querySelectorAll('.nightfall, .lamplight').forEach((el) => { put(el, '--lx', lx); put(el, '--ly', ly); });
  }
  // 案内人が奥へ消えたら、最初の部屋と同じ葉のカーテンが左右から閉じる。
  // 閉じきったところで最初の部屋（入口の真下に重ねてある）へ入れ替わるので、つなぎ目は見えない
  const r0 = rooms[0];
  if (r0?.leaves) {
    entranceCurtain.leaves = r0.leaves; entranceCurtain.curtainHTML = r0.curtainHTML;
    updateCurtain(entranceCurtain, smooth(.68, .96, p));
  }
  $('.scroll-cue', entrance).style.opacity = 1 - smooth(0, .1, p);
}

/* =========================================================
   空気のパーティクル（部屋ごと）
   ========================================================= */
const fx = $('#fx'), fctx = fx.getContext('2d');
const parts = [];
const R = (a, b) => a + Math.random() * (b - a);
const THEMES = {
  forest: [[5, () => ({ k: 'mote', vx: R(-.5, .5), vy: R(-.6, .2), life: R(5, 9), s: R(.15, .35), x: R(0, 100), y: R(10, 90) })],
    [2, () => ({ k: 'leaf', vx: R(-1, 2), vy: R(3, 6), life: R(8, 12), s: R(.8, 1.3), x: R(0, 100), y: -5, col: ['#a5c23e', '#769721', '#c9d77a'][Math.floor(R(0, 3))] })]],
  jungle: [[4, () => ({ k: 'glint', vx: 0, vy: 0, life: R(1.2, 2.4), s: R(.3, .7), x: R(0, 100), y: R(30, 98) })], [4, () => ({ k: 'leaf', vx: R(-1, 2), vy: R(3, 6), life: R(8, 12), s: R(.8, 1.4), x: R(0, 100), y: -5, col: ['#a5c23e', '#769721', '#47733c'][Math.floor(R(0, 3))] })],
    [3, () => ({ k: 'firefly', vx: R(-.8, .8), vy: R(-.6, .6), life: R(4, 7), s: R(.25, .4), x: R(0, 100), y: R(30, 85) })]],
  cove: [[5, () => ({ k: 'glint', vx: 0, vy: 0, life: R(1, 2.2), s: R(.3, .6), x: R(0, 100), y: R(66, 98) })]],
  // 小屋の外は雪、中はランプに照らされたほこり
  snow: [[9, () => ({ k: 'snow', vx: R(-1.2, 1.2), vy: R(3, 6), life: R(8, 14), s: R(.18, .45), x: R(-5, 105), y: -3 })]],
  attic: [[3, () => ({ k: 'mote', vx: R(-.4, .4), vy: R(-.4, .2), life: R(5, 9), s: R(.12, .28), x: R(30, 70), y: R(15, 80) })]],
  night: [[4, () => ({ k: 'glint', vx: 0, vy: 0, life: R(1.5, 3), s: R(.2, .45), x: R(0, 100), y: R(2, 50) })], [5, () => ({ k: 'firefly', vx: R(-.8, .8), vy: R(-.6, .4), life: R(4, 8), s: R(.25, .45), x: R(0, 100), y: R(40, 95) })],
    [1, () => ({ k: 'smoke', vx: R(.6, 1.6), vy: R(-.8, -.3), life: R(7, 10), s: R(4, 7), x: R(0, 100), y: R(55, 85) })]],
};
function spawn(theme, rate, dt, list, zRange = [1, 1]) {
  if (REDUCED) return;
  THEMES[theme].forEach(([r, make]) => {
    let n = r * rate * dt;
    while (n > 0) { if (Math.random() < n) list.push({ ...make(), age: 0, ph: R(0, 10), z: R(...zRange), theme }); n -= 1; }
  });
}
function drawP(c, q, sx, sy2, s, t) {
  const a = Math.sin(Math.min(1, q.age / q.life) * Math.PI);
  c.globalAlpha = a;
  switch (q.k) {
    case 'drop': c.fillStyle = '#dff6ff'; c.beginPath(); c.ellipse(sx, sy2, s * .7, s, 0, 0, 7); c.fill(); break;
    case 'star': { c.strokeStyle = '#fff6d8'; c.lineWidth = Math.max(1, s * .5); c.shadowColor = '#fff'; c.shadowBlur = s * 6; c.beginPath(); c.moveTo(sx, sy2); c.lineTo(sx - q.vx * s * .9, sy2 - q.vy * s * .9); c.stroke(); c.shadowBlur = 0; break; }
    case 'glint': c.fillStyle = '#fffdf2'; c.beginPath(); c.moveTo(sx, sy2 - s * 2); c.quadraticCurveTo(sx, sy2, sx + s * 2, sy2); c.quadraticCurveTo(sx, sy2, sx, sy2 + s * 2); c.quadraticCurveTo(sx, sy2, sx - s * 2, sy2); c.quadraticCurveTo(sx, sy2, sx, sy2 - s * 2); c.fill(); break;
    case 'zzz': c.strokeStyle = 'rgba(240,236,220,.7)'; c.lineWidth = Math.max(1, s * .22); c.beginPath(); c.arc(sx, sy2, s * .9, Math.PI * .2, Math.PI * 1.7); c.stroke(); break;
    case 'planet': c.fillStyle = q.col; c.beginPath(); c.arc(sx, sy2, s, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = s * .25; c.beginPath(); c.ellipse(sx, sy2, s * 1.7, s * .45, -.3, 0, 7); c.stroke(); break;
    case 'puff': { const gr = c.createRadialGradient(sx, sy2, 0, sx, sy2, s); gr.addColorStop(0, 'rgba(245,242,236,.55)'); gr.addColorStop(1, 'rgba(245,242,236,0)'); c.fillStyle = gr; c.beginPath(); c.arc(sx, sy2, s, 0, 7); c.fill(); break; }
    case 'paint': c.fillStyle = q.c; c.beginPath(); c.arc(sx, sy2, s, 0, 7); c.fill(); c.fillRect(sx - s * .18, sy2, s * .36, s * 2.4 * Math.min(1, q.age / q.life * 2)); break;
    case 'snow': c.fillStyle = 'rgba(245,248,255,.9)'; c.beginPath(); c.arc(sx, sy2, s, 0, 7); c.fill(); break;
    case 'mote': c.fillStyle = '#fffbe0'; c.shadowColor = '#fffbe0'; c.shadowBlur = s * 4; c.beginPath(); c.arc(sx, sy2, s, 0, 7); c.fill(); c.shadowBlur = 0; break;
    case 'leaf': c.save(); c.translate(sx, sy2); c.rotate(t * 1.3 + q.ph); c.fillStyle = q.col; c.beginPath(); c.ellipse(0, 0, s * 1.3, s * .55, 0, 0, 7); c.fill(); c.restore(); break;
    case 'firefly': c.globalAlpha = a * (.45 + .55 * Math.sin(t * 4 + q.ph)); c.fillStyle = '#f5ff9e'; c.shadowColor = '#e8ff7a'; c.shadowBlur = s * 8; c.beginPath(); c.arc(sx, sy2, s, 0, 7); c.fill(); c.shadowBlur = 0; break;
    case 'bubble': c.globalAlpha = a * .7; c.strokeStyle = '#f2feff'; c.lineWidth = Math.max(1, s * .14); c.beginPath(); c.arc(sx, sy2, s, 0, 7); c.stroke(); break;
    case 'smoke': { const gr = c.createRadialGradient(sx, sy2, 0, sx, sy2, s); gr.addColorStop(0, 'rgba(240,236,230,.12)'); gr.addColorStop(1, 'rgba(240,236,230,0)'); c.fillStyle = gr; c.beginPath(); c.arc(sx, sy2, s, 0, 7); c.fill(); break; }
  }
  c.globalAlpha = 1;
}
// 作品の上には何も重ねない：作品の枠（＋少しの余白）をくり抜いて、その外にだけ粒を描く
// フレームの最初に、位置と大きさをまとめて測る（このあとは書き換えだけ）
function measureGeo() {
  GEO.entH = entrance.offsetHeight; GEO.cat = $('#catalog').offsetTop; GEO.art = $('#artist').offsetTop; GEO.docH = document.documentElement.scrollHeight;
  rooms.forEach((r) => { r.top = r.el.offsetTop; r.h = r.el.offsetHeight; });
  GEO.lamp = entrance.classList.contains('night') && sy < GEO.entH ? $('#lamp').getBoundingClientRect() : null;
  // 画面の粒子をよける作品の枠（前のフレームの位置。1 フレームの遅れは、よける幅を少し広げて吸収する）
  GEO.workRects = parts.length && currentRoom ? [...currentRoom.el.querySelectorAll('.work .canvas')].map((el) => el.getBoundingClientRect()).filter((b) => b.width && b.right > 0 && b.left < innerWidth) : null;
  if (RASTER) tickTiles();
}
function clipOutRects(c, rects, pad = 0) {
  if (!rects.length) return false;
  c.save(); c.beginPath(); c.rect(0, 0, c.canvas.width, c.canvas.height);
  rects.forEach((b) => c.rect(b.left - pad, b.top - pad, b.width + pad * 2, b.height + pad * 2));
  c.clip('evenodd');
  return true;
}
function clipOutWorks(c, els, scale = 1, pad = 0) {
  const rects = [];
  els.forEach((el) => { const b = el.getBoundingClientRect(); if (b.width && b.right > 0 && b.left < innerWidth) rects.push(b); });
  if (!rects.length) return false;
  c.save(); c.beginPath(); c.rect(0, 0, c.canvas.width, c.canvas.height);
  rects.forEach((b) => c.rect((b.left - pad) * scale, (b.top - pad) * scale, (b.width + pad * 2) * scale, (b.height + pad * 2) * scale));
  c.clip('evenodd');
  return true;
}
function stepP(list, dt) {
  for (let i = list.length - 1; i >= 0; i--) {
    const q = list[i]; q.age += dt;
    if (q.age > q.life) { list.splice(i, 1); continue; }
    q.x += (q.vx + (q.k === 'leaf' ? Math.sin(q.age * 1.8 + q.ph) * 2.5 : 0)) * dt;
    q.y += q.vy * dt;
    if (q.k === 'puff') q.s += dt * 2.2;
    if (q.k === 'drop') q.vy += 40 * dt;
  }
}

/* =========================================================
   作品の中へ（没入ビューア）
   ========================================================= */
const viewer = $('#viewer'), vScreen = $('#v-screen'), wash = $('#v-wash'), wctx = wash.getContext('2d', { willReadFrequently: true });
const vWalls = [...viewer.querySelectorAll('.v-wall, .v-floor')].map((c) => ({ c, x: c.getContext('2d') }));
const vfx = $('#v-fx'), vctx = vfx.getContext('2d');
let vOpenedAt = 0, vPoster = null, vOpen = false, vWork = null, vMedia = null, vParts = [], vGlow = [255, 220, 180], vTarget = [255, 220, 180], vSample = 0;
function setViewer(w) {
  // 作品ごとの URL（#w=作品の id）。Instagram などから、その作品が開いた状態で来てもらえる
  try { history.replaceState(null, '', `#w=${encodeURIComponent(w.id)}`); } catch { /* 使えない環境では何もしない */ }
  vOpenedAt = performance.now() / 1000;
  vWork = w;
  vScreen.innerHTML = mediaHTML(w, { autoplay: true });
  vMedia = vScreen.firstElementChild;
  vPoster = null;
  if (w.type === 'video') {
    vMedia.play().catch(() => {});
    const img = new Image(); img.src = w.poster; vPoster = img;
  }
  const room = ROOMS.find((r) => r.id === w.room);
  $('#v-meta').textContent = w.credit || '';
  // 価格はすべて ASK：Instagram の DM か、作品名入りのメッセージ（メール）で問い合わせ
  const ig = ARTIST.links.find((l) => l.label === 'Instagram'), mail = ARTIST.links.find((l) => l.label === 'Mail');
  const ask = $('.v-ask', viewer);
  ask.classList.toggle('sold', !!w.sold); ask.classList.toggle('nfs', !!w.nfs);
  ask.querySelector('.tag').textContent = w.sold ? 'SOLD OUT' : w.nfs ? 'NOT FOR SALE' : 'Price: ASK';
  ask.querySelector('.dm').href = ig ? ig.href : '#';
  ask.querySelector('.msg').href = mail ? `${mail.href}?subject=${encodeURIComponent(`Inquiry: ${w.title}`)}&body=${encodeURIComponent(`${w.title}${w.ja ? `（${w.ja}）` : ''}\n${location.origin}${location.pathname}#w=${w.id}\n\n`)}` : '#';
  viewer.dataset.scene = room.scene;
  vParts = [];
  if (glowOf.has(w.id)) vTarget = glowOf.get(w.id);
}
function openViewer(w, x, y) {
  if (vOpen) return;
  viewer.style.setProperty('--ox', `${x ?? vw / 2}px`); viewer.style.setProperty('--oy', `${y ?? vh / 2}px`);
  setViewer(w);
  vfx.width = vw * DPR; vfx.height = vh * DPR;
  viewer.classList.remove('closing');
  viewer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('viewing');
  requestAnimationFrame(() => viewer.classList.add('open', 'cap'));
  vOpen = true;
  $('#v-close').focus({ preventScroll: true });
}
function closeViewer() {
  if (!vOpen) return;
  viewer.classList.add('closing'); viewer.classList.remove('open', 'cap');
  document.body.classList.remove('viewing');
  viewer.setAttribute('aria-hidden', 'true');
  vOpen = false;
  try { history.replaceState(null, '', location.pathname + location.search); } catch { /* 同上 */ }
  setTimeout(() => { if (!vOpen) { viewer.classList.remove('closing'); vScreen.innerHTML = ''; vMedia = null; } }, 1100);
}
function viewerStep(d) {
  const i = WORKS.indexOf(vWork), n = WORKS[(i + d + WORKS.length) % WORKS.length];
  viewer.classList.remove('cap');
  vScreen.style.opacity = 0;
  setTimeout(() => { setViewer(n); vScreen.style.opacity = 1; viewer.classList.add('cap'); }, 330);
}
$('#v-close').addEventListener('click', closeViewer);
$('#v-prev').addEventListener('click', () => viewerStep(-1));
$('#v-next').addEventListener('click', () => viewerStep(1));

function viewerFrame(dt, t) {
  if (!vMedia) return;
  let src = vMedia;
  if (vMedia.tagName === 'VIDEO' && vMedia.readyState < 2) src = vPoster;
  const ok = src && (src.tagName === 'VIDEO' ? src.readyState >= 2 : src.complete && src.naturalWidth);
  if (ok) {
    const mw = src.videoWidth || src.naturalWidth, mh = src.videoHeight || src.naturalHeight;
    const cover = (c, x) => { const s = Math.max(c.width / mw, c.height / mh); x.drawImage(src, (c.width - mw * s) / 2, (c.height - mh * s) / 2, mw * s, mh * s); };
    cover(wash, wctx);
    vWalls.forEach(({ c, x }, k) => {
      x.save();
      if (k === 0) { x.translate(c.width, 0); x.scale(-1, 1); }
      if (k === 2) { x.translate(0, c.height); x.scale(1, -1); }
      cover(c, x); x.restore();
    });
    vSample -= dt;
    if (vSample <= 0 && src.tagName === 'VIDEO') {
      vSample = .4;
      const d = wctx.getImageData(0, 0, wash.width, wash.height).data; let r = 0, g = 0, b = 0;
      for (let i = 0; i < d.length; i += 16) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
      const n = d.length / 16, k = Math.min(2.2, 235 / (Math.max(r, g, b) / n || 1));
      vTarget = [r, g, b].map((v) => Math.round(clamp(v / n * k, 0, 255)));
    }
  }
  vGlow = vGlow.map((v, i) => lerp(v, vTarget[i], Math.min(1, dt * 2.5)));
  viewer.style.setProperty('--glow', vGlow.map(Math.round).join(','));
  $('#v-space').style.transform = `rotateY(${mouse.x * -6}deg) rotateX(${mouse.y * 3}deg)`;

  spawn(viewer.dataset.scene, 2.2, dt, vParts, [.6, 1.7]);
  stepP(vParts, dt);
  vctx.setTransform(1, 0, 0, 1, 0, 0); vctx.clearRect(0, 0, vfx.width, vfx.height);
  const u = vfx.height / 100, wu = vfx.width / 100;
  const vClip = clipOutWorks(vctx, [...vScreen.querySelectorAll('img, video')], vfx.width / innerWidth, 10);
  vParts.forEach((q) => drawP(vctx, q, (q.x - mouse.x * 3 * q.z) * wu, (q.y - mouse.y * 2 * q.z) * u, q.s * u * q.z, t));
  if (vClip) vctx.restore();
}

/* =========================================================
   入力
   ========================================================= */
// スマホは端末の傾きで、奥行きがずれて見える（iOS は最初のタップで許可をもらう）
function onTilt(e) {
  if (e.gamma == null) return;
  mouse.tx = clamp(e.gamma / 22, -1, 1); mouse.ty = clamp((e.beta - 40) / 22, -1, 1);
}
if (matchMedia('(pointer: coarse)').matches && 'DeviceOrientationEvent' in window) {
  const ask = () => {
    const D = window.DeviceOrientationEvent;
    if (typeof D.requestPermission === 'function') D.requestPermission().then((s) => { if (s === 'granted') addEventListener('deviceorientation', onTilt); }).catch(() => {});
    else addEventListener('deviceorientation', onTilt);
  };
  addEventListener('touchend', ask, { once: true });
}
addEventListener('pointermove', (e) => {
  mouse.tx = e.clientX / vw * 2 - 1; mouse.ty = e.clientY / vh * 2 - 1;
  document.documentElement.style.setProperty('--fx', `${e.clientX}px`);
  document.documentElement.style.setProperty('--fy', `${e.clientY}px`);
}, { passive: true });
// 小ネタ：入口の案内人をクリックすると、大きく煙を吐く
$('.guide', entrance).addEventListener('click', (e) => {
  for (let i = 0; i < 14; i++) parts.push({ k: 'puff', vx: R(-2.5, 1), vy: R(-5, -2), life: R(2, 3.4), s: R(1.2, 3), x: e.clientX / vw * 100 + R(-1, 1), y: e.clientY / vh * 100 - 6 + R(-1, 1), age: 0, ph: 0, z: 1 });
  $('.guide', entrance).classList.remove('huff'); void $('.guide', entrance).offsetWidth; $('.guide', entrance).classList.add('huff');
});
addEventListener('keydown', (e) => {
  if (vOpen) {
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowRight') viewerStep(1);
    if (e.key === 'ArrowLeft') viewerStep(-1);
    return;
  }
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  // ← → で、ひとつ前・次の作品の前へ
  const stopsY = [];
  rooms.forEach((r) => {
    const { top, len } = roomMetrics(r);
    for (let s = 0; s < r.stops; s++) stopsY.push(top + ((s / (r.stops - 1)) + .04) / 1.08 * len);
  });
  const cur = scrollY, d = e.key === 'ArrowRight' ? 1 : -1;
  const next = d > 0 ? stopsY.find((y) => y > cur + 8) : [...stopsY].reverse().find((y) => y < cur - 8);
  if (next != null) { e.preventDefault(); scrollTo({ top: next, behavior: REDUCED ? 'auto' : 'smooth' }); }
});
let resizeT = 0;
// 描き直すのは、画面の幅か 100vh が本当に変わったとき（向きの変更・ウィンドウの大きさの変更）だけ
addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => {
  if (innerWidth === vw && Math.abs(measureVH() - vh) < 2) return;
  [$('.sign', entrance), $('#player'), $('#lamp')].forEach((el) => { el._foot = null; });
  rebuild();
}, 200); });
/* ---------- メモリを守る：近くの部屋の絵だけを付ける ----------
   背景の絵は画面の何倍も横に長く、全部屋ぶんを一度に持つとスマホのメモリを超えて落ちる。
   近づいた部屋（前後 1.5 画面）だけ絵と動画を付け、2.5 画面以上離れたら外す。見た目は変わらない */
function attachLayers(r) {
  if (r.attached) return;
  r.attached = true;
  // 背景の層は 1 フレームに 1 枚ずつ付ける（まとめて付けると、その 1 フレームが長くなってかくつく）。部屋に着く 1 画面ほど手前から始まるので間に合う
  r.pending = Object.entries(r.layerHTML);
  attachNext(r);
  r.curShown = -1;
  // 作品の動画は、その作品に近づいたときにだけ読み込む（updateRoom）
}
const svgIds = (r) => { const [a, b] = r.svgRange || [0, 0], out = []; for (let i = a; i < b; i++) out.push(`s${i}`); return out; };
// 立ち止まっている間（作品を見ているとき）に、次の部屋の背景の絵を 1 枚ずつ先に読み込んでおく。
// 読み込み（絵の解析）は重く、その間は画面が止まるので、歩いている途中ではなく止まっているときに済ませる
let prefetching = false;
function prefetchNext(from) {
  if (!RASTER || prefetching) return;
  const i = from ? rooms.indexOf(from) + 1 : 0, r = rooms[i];
  if (!r || !r.svgRange) return;
  const d = svgIds(r).map((id) => SVG_STORE.get(id)).find((x) => x && !x.img && x.body.length > 20000);
  if (!d) return;
  prefetching = true; r.prefetched = true;
  loadSVG(d);
  d.ready.then(() => { prefetching = false; });
}
function attachNext(r) {
  if (!r.pending?.length) return;
  const [sel, html] = r.pending.shift(), el = $(sel, r.el);
  el.innerHTML = html; hydrate(el);
}
function detachLayers(r) {
  r.attached = false; r.pending = null; r.prefetched = false;
  svgIds(r).forEach((id) => dropSVG(SVG_STORE.get(id))); // 読み込んだ絵も手放す
  Object.keys(r.layerHTML).forEach((sel) => { $(sel, r.el).innerHTML = ''; });
  $('.curtain', r.el).innerHTML = ''; r.leafEls = null; r.curShown = -1;
  if (r.leaveC) { r.leaveC.box.innerHTML = ''; r.leaveC.leafEls = null; r.leaveC.curShown = -1; }
  r.el.querySelectorAll('.work video[src]').forEach((v) => { v.pause(); v.dataset.vsrc = v.getAttribute('src'); v.removeAttribute('src'); v.load(); });
}
function attachEntrance() {
  if (entrance.attached) return;
  entrance.attached = true;
  Object.entries(entrance.layerHTML).forEach(([sel, html]) => { $(sel, entrance).innerHTML = html; });
  hydrate(entrance);
  entrance.querySelectorAll('video[data-src]').forEach((v) => { v.src = v.dataset.src; v.removeAttribute('data-src'); });
}
function manageEntrance() {
  const d = sy - GEO.entH;
  if (d < vh * 1.5) attachEntrance();
  else if (d > vh * 4 && entrance.attached) {
    entrance.attached = false;
    Object.keys(entrance.layerHTML).forEach((sel) => { $(sel, entrance).innerHTML = ''; });
    entrance.querySelectorAll('video[src]').forEach((v) => { v.pause(); v.dataset.src = v.getAttribute('src'); v.removeAttribute('src'); v.load(); });
  }
}
function manageMemory(r) {
  const { top, len } = roomMetrics(r);
  const d = sy < top ? top - sy : sy > top + len ? sy - (top + len) : 0;
  // スマホは、次の部屋を 1 画面手前で用意し、通り過ぎた部屋はカーテンが閉じたらすぐ手放す（2 部屋ぶんが重なる時間を短く）
  if (d < vh * (COARSE ? .8 : 1.5)) { if (r.attached) attachNext(r); else attachLayers(r); }
  else if (d > vh * (COARSE ? 1.05 : 2.5) && r.attached) detachLayers(r);
  // 先読みしたまま入らなかった部屋から遠ざかったら、読み込んだ絵を手放す
  if (r.prefetched && !r.attached && d > vh * 3) { r.prefetched = false; svgIds(r).forEach((id) => dropSVG(SVG_STORE.get(id))); }
}

function rebuild() {
  vh = measureVH(); vw = innerWidth; U = vh / 100; W = vw / U;
  fx.width = vw * FXD; fx.height = vh * FXD;
  buildEntrance();
  rooms.forEach(buildRoomScene);
  layoutSizes();
}

/* =========================================================
   ビート（音は最初は OFF。ボタンかラジカセで ON）
   ========================================================= */
let kick = 0, snare = 0, lastSY = scrollY, scratchAt = 0, fxDirty = true, movedAt = 0;
// SoundCloud のラジオがあればそれを、なければサイトで作った曲を流す（どちらも同じ形で扱える）
const beat = RADIO ? createRadio(RADIO) : createBeat({
  onKick: () => { kick = 1; },
  onSnare: () => { snare = 1; },
  files: Object.fromEntries(ROOMS.filter((r) => r.beat).map((r) => [r.scene, r.beat])),
});
const beatBtn = $('#beat');
function toggleBeat() {
  if (!SOUND) return false;
  const on = beat.toggle();
  beatBtn.setAttribute('aria-pressed', on);
  beatBtn.setAttribute('aria-label', on ? (RADIO ? 'ラジオを止める' : 'ビートを止める') : (RADIO ? 'ラジオを流す' : 'ビートを流す'));
  document.body.classList.toggle('beat-on', on);
}
beatBtn.addEventListener('click', toggleBeat);
if (!SOUND) document.body.classList.add('no-sound'); // ビートボタン・音の選択・ラジカセの「▶」を出さない
$('#player').innerHTML = PROPS.recordStand.svg();
initEggs({ parts, toggleBeat, isBeatOn: () => beat.playing, works: WORKS, openViewer, beat });


$('#player').addEventListener('click', toggleBeat); // 音を使うときは、レコードプレーヤーで曲を流す

/* ---------- 入口のフロアランプ：押すと灯りがともり、入口の森が夜になる ---------- */
{
  const lamp = $('#lamp');
  lamp.innerHTML = `<svg viewBox="0 0 40 150" aria-hidden="true"><defs>
    <linearGradient id="lampLit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7b8"/><stop offset="1" stop-color="#ffc56e"/></linearGradient>
    <linearGradient id="lampCone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd690" stop-opacity=".55"/><stop offset="1" stop-color="#ffd690" stop-opacity="0"/></linearGradient></defs>
    <path class="cone" d="M5 38H35L52 148H-12Z" fill="url(#lampCone)"/>
    <ellipse cx="20" cy="147.4" rx="12" ry="2.2" fill="#000" opacity=".22"/>
    <path d="M9.5 147Q20 139.5 30.5 147Z" fill="#3b3028"/><path d="M11.5 146Q20 141 28.5 146" stroke="#5a4a3b" stroke-width=".8" fill="none"/>
    <rect x="19" y="36" width="2" height="106" fill="#9a7a45"/><rect x="19.6" y="36" width=".6" height="106" fill="#c9a86a" opacity=".6"/>
    <rect x="18.2" y="92" width="3.6" height="2.6" rx="1" fill="#7a5d33"/>
    <path d="M8 8H32L36.5 38H3.5Z" fill="#eadfc6"/>
    <path d="M8 8H32L32.5 11.4H7.5Z" fill="#d6c6a4"/><path d="M3.5 38H36.5" stroke="#cbb993" stroke-width="1.1"/>
    ${[12, 17, 22, 27].map((x) => `<path d="M${x} 11.4L${x - (x - 20) * .12 - (20 - x) * .1} 37.5" stroke="#d9cbac" stroke-width=".35"/>`).join('')}
    <g class="lit"><path d="M8 8H32L36.5 38H3.5Z" fill="url(#lampLit)"/><ellipse cx="20" cy="38.4" rx="16.2" ry="1.6" fill="#fff4d6"/></g>
  </svg>`;
  // 空の星と月（夜のときだけ見える）
  const stars = Array.from({ length: 70 }, () => `<circle cx="${(Math.random() * 100).toFixed(1)}" cy="${(Math.random() * 62).toFixed(1)}" r="${(.08 + Math.random() * .18).toFixed(2)}" fill="#fff" opacity="${(.4 + Math.random() * .6).toFixed(2)}"/>`).join('');
  $('.night-sky', entrance).innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">${stars}<circle cx="72" cy="16" r="6" fill="#fff3cf" opacity=".08"/><circle cx="72" cy="16" r="3.2" fill="#f4ecd2"/></svg>`;
  // ホタル
  $('.fireflies', entrance).innerHTML = Array.from({ length: 14 }, () => `<i style="left:${(8 + Math.random() * 84).toFixed(1)}%;top:${(45 + Math.random() * 45).toFixed(1)}%;--dx:${(Math.random() * 8 - 4).toFixed(1)}vh;--dy:${(Math.random() * 6 - 4).toFixed(1)}vh;--d:${(4 + Math.random() * 5).toFixed(1)}s;--b:${(1.6 + Math.random() * 2.4).toFixed(1)}s;animation-delay:${(-Math.random() * 6).toFixed(1)}s,${(-Math.random() * 3).toFixed(1)}s"></i>`).join('');
  lamp.addEventListener('click', () => {
    const on = !entrance.classList.contains('night');
    entrance.classList.toggle('night', on);
    setForestNight(on); // この先の朝〜夕方の部屋も夜に
    lamp.setAttribute('aria-pressed', on);
    lamp.setAttribute('aria-label', on ? 'ランプを消して、朝の森にもどす' : 'ランプをつけて、夜の森にする');
    lamp.classList.remove('bump'); void lamp.offsetWidth; lamp.classList.add('bump');
  });
}

/* =========================================================
   メインループ
   ========================================================= */
let last = performance.now(), activeTheme = 'forest', lastTheme = 'forest';
const header = $('#site-head');
let pointerEdge = false;
addEventListener('pointermove', (e) => { pointerEdge = e.clientY < 90 || e.clientX > innerWidth - 90; }, { passive: true });
function frame(now) {
  const dt = Math.min(.05, Math.max(.001, (now - last) / 1000)), t = now / 1000; last = now;
  // スクロール位置と、位置・大きさは、何かを書き換える前にここで一度だけ読む（途中で読むと、そのたびにレイアウトの計算が走る）
  const SY = scrollY;
  if (!vOpen) measureGeo();
  mouse.x = lerp(mouse.x, mouse.tx, Math.min(1, dt * 4)); mouse.y = lerp(mouse.y, mouse.ty, Math.min(1, dt * 4));
  kick *= Math.exp(-dt * 9); snare *= Math.exp(-dt * 6);
  put(document.documentElement, '--kick', kick < .01 ? '0' : kick.toFixed(2));
  put(document.documentElement, '--snare', snare < .01 ? '0' : snare.toFixed(2));
  // 勢いよく戻るようにスクロールすると、レコードをスクラッチする（音が出ているときだけ）
  const vel = (SY - lastSY) / dt;
  if (Math.abs(SY - lastSY) > .5) movedAt = now;
  lastSY = SY;
  if (vel < -vh * 5 && now - scratchAt > 900 && !vOpen) {
    scratchAt = now;
    if (beat.playing) beat.scratch();
  }
  if (vOpen || viewer.classList.contains('closing')) viewerFrame(dt, t);
  if (!vOpen) {
    sy = REDUCED ? SY : lerp(sy, SY, Math.min(1, dt * 9));
    if (Math.abs(sy - SY) < .5) sy = SY;
    manageEntrance();
    if (sy < GEO.entH) updateEntrance();
    // 入口を過ぎたら隠す（真下の最初の部屋が、同じ閉じたカーテンのまま現れる）
    // 判定は、実際のスクロール位置となめらかにした位置の先に進んでいる方で（速いスワイプで、流れていく部屋の下の端が見えないように）
    const sd = Math.max(sy, SY);
    const gone = sd >= GEO.entH - vh - 1;
    entrance.classList.toggle('gone', gone);
    // 部屋も同じ：次の部屋の葉のカーテンが閉じきったら、この部屋を隠す（真下の次の部屋が同じカーテンのまま現れる）
    rooms.forEach((r, i) => { if (rooms[i + 1]) r.el.classList.toggle('gone', sd >= r.top + r.h - vh - 1); });
    if (gone && entranceCurtain.leafEls) updateCurtain(entranceCurtain, 0);
    currentRoom = null;
    rooms.forEach((r) => updateRoom(r, now));
    // 0.4 秒ほど立ち止まっていたら、次の部屋の絵を先に読み込む（入口にいるときは最初の部屋）
    if (now - movedAt > 400 && Math.abs(sy - SY) < .5 && (currentRoom || sy < GEO.entH)) prefetchNext(currentRoom);
    // 右の部屋ナビ・ヘッダーの色
    nav.querySelectorAll('a').forEach((a, i) => a.classList.toggle('on', currentRoom && currentRoom.ri === i));
    const inArtist = sy > GEO.art - vh * .6, inEntrance = sy < GEO.entH - vh * .5;
    activeTheme = currentRoom ? (currentRoom.room.scene === 'attic' && currentRoom.c < 1.5 ? 'snow' : currentRoom.room.scene) : inEntrance ? 'forest' : 'night';
    const theme = activeTheme;
    // 部屋が変わったら、前の部屋の空気はすぐに消えていく
    if (theme !== lastTheme) { parts.forEach((q) => { if (q.theme && q.theme !== theme) q.life = Math.min(q.life, q.age + .8); }); lastTheme = theme; }
    if (document.body.dataset.scene !== theme) document.body.dataset.scene = theme;
    beat.setScene(theme === 'snow' ? 'attic' : theme);
    nav.classList.toggle('show', !!currentRoom);
    // 部屋の中を歩いている間は、ヘッダーとナビを引っ込める（画面の上か右端にポインタを寄せると出てくる）
    document.body.classList.toggle('walking', !!currentRoom && !pointerEdge);
    // パーティクル（画面に固定）
    spawn(activeTheme, currentRoom || inEntrance || inArtist ? 1 : 0, dt, parts);
    stepP(parts, dt);
    // 粒子がひとつもないときは、画面いっぱいの canvas を消し直さない
    if (parts.length || fxDirty) {
      fctx.setTransform(FXD, 0, 0, FXD, 0, 0); fctx.clearRect(0, 0, vw, vh);
      const u = vh / 100, wu = vw / 100;
      const fClip = parts.length && currentRoom && GEO.workRects ? clipOutRects(fctx, GEO.workRects, u * 2.5) : false;
      parts.forEach((q) => drawP(fctx, q, q.x * wu - mouse.x * 8, q.y * u - mouse.y * 5, q.s * u, t));
      if (fClip) fctx.restore();
      fxDirty = parts.length > 0;
    }
    put($('#progress'), 'transform', `scaleX(${clamp(SY / (GEO.docH - vh)).toFixed(4)})`);
    const inCatalog = sy > GEO.cat - vh && sy < GEO.art - 80;
    header.classList.toggle('solid', sy > GEO.cat - 80 && sy < GEO.art - 80);
    // 作品が見えている場所では、画面全体の粒子を消す（作品の上には何も重ねない）
    document.body.classList.toggle('grain-off', !!currentRoom || inCatalog);
  }
  requestAnimationFrame(frame);
}

/* ---------- 出現アニメーション（目録・作家） ---------- */
const io = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .15 });

/* ---------- カーソル（作品の上では ▶） ---------- */
if (matchMedia('(pointer: fine)').matches && !REDUCED) {
  const cur = document.createElement('div');
  cur.id = 'cursor'; cur.setAttribute('aria-hidden', 'true'); cur.innerHTML = '<span>▶</span>';
  document.body.append(cur); document.body.classList.add('has-cursor');
  let cx = -100, cy = -100, tx = -100, ty = -100;
  addEventListener('pointermove', (e) => {
    tx = e.clientX; ty = e.clientY;
    cur.classList.toggle('view', !!e.target.closest('.work .canvas, .spec, #v-screen'));
    cur.classList.toggle('link', !e.target.closest('.work .canvas, .spec') && !!e.target.closest('a, button, [data-egg]'));
  }, { passive: true });
  const loop = () => { cx += (tx - cx) * .25; cy += (ty - cy) * .25; cur.style.transform = `translate(${cx}px, ${cy}px)`; requestAnimationFrame(loop); };
  loop();
}

/* ---------- 起動 ---------- */
buildCatalog();
buildArtist();
rebuild();
document.querySelectorAll('.reveal-up, #catalog-grid').forEach((el) => io.observe(el));
requestAnimationFrame((n) => { last = n; frame(n); });
Promise.all(WORKS.map(sampleGlow)).then(() => {
  // レコードのラベルを作品の色に
  document.querySelectorAll('.spec[data-id]').forEach((c) => { const g = glowOf.get(c.dataset.id); if (g) c.style.setProperty('--lab', `rgb(${g.join(',')})`); });
});
// #w=作品の id で来たら、その作品の前まで移動してから作品を開く
function openFromHash() {
  const m = location.hash.match(/^#w=(.+)$/);
  const w = m && WORKS.find((x) => x.id === decodeURIComponent(m[1]));
  if (!w) return;
  const r = rooms.find((rr) => rr.items.some((it) => it.work === w));
  if (r) {
    const stop = r.items.findIndex((it) => it.work === w) + 1, { top, len } = roomMetrics(r);
    const y = top + ((stop / (r.stops - 1)) + .04) / 1.08 * len;
    scrollTo(0, y); sy = y;
  }
  setTimeout(() => openViewer(w), 700);
}
const ready = Promise.race([Promise.all([document.fonts.ready, new Promise((r) => { const i = new Image(); i.onload = i.onerror = r; i.src = 'assets/guide-walk.webp'; })]), new Promise((r) => setTimeout(r, 3500))]);
// 入口の儀式：サインが書き終わったら、音あり／音なしのアイコンを出し、選んでから森に入る
// （音を鳴らすには一度さわってもらう必要があるので、この一押しで最初から環境音とビートを鳴らせる）
function enterForest(withSound) {
  if (document.body.classList.contains('loaded')) return;
  if (withSound && !beat.playing) toggleBeat();
  document.body.classList.remove('choosing');
  document.body.classList.add('loaded');
  setTimeout(prepareCaustic, 2500); // 水辺の光の網目は、森を歩きはじめたころに別のスレッドで先に作っておく
  setTimeout(() => $('#loader')?.remove(), 1600);
  openFromHash();
}
$('#enter-sound').addEventListener('click', () => enterForest(true));
$('#enter-silent').addEventListener('click', () => enterForest(false));
ready.then(() => {
  setTimeout(() => {
    if (!SOUND) { enterForest(false); return; } // 音を使わないときは、サインが書き終わったらそのまま森へ
    document.body.classList.add('choosing');
    $('#enter-sound').focus({ preventScroll: true });
  }, REDUCED ? 0 : 1500);
});
