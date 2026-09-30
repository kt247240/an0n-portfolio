// =========================================================
// 森の美術館 — スクロールで森の小道を歩き、作品の前で立ち止まる
// =========================================================
import { ARTIST, ROOMS, WORKS, SOUND, RADIO, PLANNED_TOTAL } from './works.js';
import { createRadio } from './radio.js';
import { paceScroll } from './pace.js';
import PRE_MANIFEST from './pre-manifest.js';
import WORK_COLORS from './work-colors.js';
import { SCENES, FACTORS, sceneForest, curtainLeaves, LEAF_DEFS, ENTRANCE_PATH, pressedSpecimen, GRADES, gradeColors, moonSVG, moonLit, nightSky, farewellSVG, swimmerSVG, ferrisSVG, fireSVG, windowSnowSVG, flyerSVG, beamSVG, FERRIS_N } from './nature.js';
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
// 画面いっぱいの canvas は、画素の数に上限をつける（パソコンの大きな Retina 画面で、毎コマ 500 万画素を描き直さないように）
const pxCap = (budget) => Math.sqrt(budget / Math.max(1, innerWidth * innerHeight));
const FXD = COARSE ? Math.min(DPR, 1.5) : Math.max(1, Math.min(DPR, pxCap(2.2e6))); // 粒の canvas の密度（スマホは控えめに）
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
// 背景の書き出し（tools/prerender.mjs）のときは、パソコンの画面でも同じ焼き方の層を用意する
const RASTER = COARSE ? Math.min(DPR, 1.5) : location.search.includes('prerender') ? 1.5 : 0;
// 前もって描いておいた背景（lite.html）：背景の層を、その場で SVG から組み立てるのではなく、書き出し済みの画像（タイル）で置く。
// 画面の縦横比ごとに用意してあるので、いちばん近いものを選ぶ（近いものがなければ、ふつうに SVG から組み立てる）
const PRE_BUCKET0 = (() => {
  // パソコンは、いつも書き出し済みの背景を使う（その場で SVG を描くと、スクロールのたびに細かい絵の描き直しで止まるので）。
  // スマホは lite.html のときだけ（スマホはその場で canvas に焼く方式で軽く動いている）
  if (document.documentElement.dataset.pre !== '1' && (COARSE || location.search.includes('prerender'))) return null;
  let best = null;
  for (const k of Object.keys(PRE_MANIFEST)) { const bw = PRE_MANIFEST[k].W, e = Math.abs(W - bw) / bw; if (e < .14 && (!best || e < best.e)) best = { k, e }; }
  return best ? best.k : null;
})();
// パソコンでは、その画面の型の画像が本当に置いてあるかを 1 枚だけ確かめてから使う（置いていない場所に載せたときは、ふつうに SVG から組み立てる）
const PRE_BUCKET = PRE_BUCKET0 && document.documentElement.dataset.pre !== '1' ? await fetch(`assets/pre/${PRE_BUCKET0}/entrance-frame-0.webp`).then((r) => (r.ok ? PRE_BUCKET0 : null), () => null) : PRE_BUCKET0;
const PRE = PRE_BUCKET ? PRE_MANIFEST[PRE_BUCKET].layers : null;
const preBox = (key, w, cls = '') => (PRE && PRE[key] ? `<div class="raster pre ${cls}" data-pre="${key}" style="width:${w * U}px"></div>` : null);
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
  // 海に映る月の光の道（今夜の月の明るさで濃さが変わる）
  + (sd.column ? `<svg class="moon-column" viewBox="${n2(sd.column.x - 12)} ${n2(sd.column.hz)} 24 ${n2(100 - sd.column.hz)}" preserveAspectRatio="none" style="left:${((sd.column.x - 12) * U).toFixed(1)}px;top:${(sd.column.hz * U).toFixed(1)}px;width:${(24 * U).toFixed(1)}px;height:${((100 - sd.column.hz) * U).toFixed(1)}px;opacity:${(.06 + moonLit() * .94).toFixed(2)}">${gradeColors(sd.column.svg, GRADE)}</svg>` : '')
  + (sd.moon ? `<div class="sky-moon" style="left:${((sd.moon.x - sd.moon.r * 5) * U).toFixed(1)}px;top:${((sd.moon.y - sd.moon.r * 5) * U).toFixed(1)}px;width:${(sd.moon.r * 10 * U).toFixed(1)}px">${moonSVG(sd.moon.kind, sd.moon.halo)}</div>` : '') + '</div>';
// 葉のカーテンの 1 かたまり（正方形の絵）
// 葉のかたまりの画像は、正方形のままだと四隅の透明なところが広い。描いた葉の外形ぎりぎりまで切り詰めて、画像を小さくする（見た目は同じ）
let bbSvg = null;
function leafBounds(q) {
  if (q.bb) return q.bb;
  const w = q.svg[0];
  try {
    if (!bbSvg) {
      bbSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      bbSvg.setAttribute('style', 'position:absolute;left:-9999px;top:0;width:10px;height:10px;visibility:hidden;pointer-events:none');
      bbSvg.setAttribute('aria-hidden', 'true');
      document.body.append(bbSvg);
    }
    bbSvg.innerHTML = `<g>${q.svg[1]}</g>`;
    const b = bbSvg.firstElementChild.getBBox(), pad = 1; // 線の太さや、ふちのやわらかさの分の余白
    const x0 = Math.max(0, b.x - pad), y0 = Math.max(0, b.y - pad), x1 = Math.min(w, b.x + b.width + pad), y1 = Math.min(w, b.y + b.height + pad);
    q.bb = x1 > x0 && y1 > y0 ? [x0, y0, x1 - x0, y1 - y0] : [0, 0, w, w];
  } catch { q.bb = [0, 0, w, w]; }
  bbSvg.innerHTML = '';
  return q.bb;
}
const leafImg = (q) => {
  const [bx, by, bw, bh] = leafBounds(q), body = `<g transform="translate(${n2(-bx)} ${n2(-by)})">${gradeColors(q.svg[1], GRADE)}</g>`;
  const style = `left:${(q.x + bx) * U}px;top:${(q.y + by) * U}px;width:${bw * U}px;height:${bh * U}px`;
  // 葉のカーテンは動いている間しか見えないので 1 倍の密度で十分
  if (RASTER) return rasterBox(bw, bh, bw * U, bh * U, body, 'leaf', style, 1);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n2(bw)} ${n2(bh)}" width="${Math.round(bw * U)}" height="${Math.round(bh * U)}">${LEAF_DEFS}${body}</svg>`;
  return `<img alt="" draggable="false" decoding="async" style="${style}" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}">`;
};
// <div class="raster"> に、SVG を焼いた canvas（タイル）を入れる。1 枚ずつ順番に（同時に焼くとメモリが跳ねる）
const rasterQueue = [];
let rastering = false;
function hydrate(root) {
  root.querySelectorAll('.raster.pre[data-pre]').forEach(setupPre);
  if (!RASTER) return;
  root.querySelectorAll('.raster[data-svg]').forEach((el) => rasterQueue.push(el));
  if (!rastering) pumpRaster();
}
// 書き出し済みの背景：層をタイル（画面 1 枚ぶんの幅の画像）に分けてあり、見えているあたりのタイルだけを置く（遠いタイルは外す）
const preBoxes = new Set();
function setupPre(el) {
  const key = el.dataset.pre, L = PRE[key]; el.removeAttribute('data-pre');
  el._tiles = L.tiles.map((t, i) => ({ x: t.x, w: t.w, src: `assets/pre/${PRE_BUCKET}/${key}-${i}.webp`, img: null }));
  if (el._tiles.length === 1) { placePre(el, el._tiles[0]); return; }
  preBoxes.add(el); tickPre();
}
function placePre(el, t) {
  const img = new Image(); img.decoding = 'async'; img.draggable = false;
  img.style.cssText = `position:absolute;top:0;left:${(t.x * 100).toFixed(4)}%;width:${(t.w * 100).toFixed(4)}%;height:100%;max-width:none`;
  img.src = t.src; el.append(img); t.img = img;
}
function tickPre() {
  for (const el of preBoxes) {
    if (!el.isConnected) { preBoxes.delete(el); el._tiles.forEach((t) => { if (t.img) { t.img.src = ''; t.img = null; } }); continue; }
    const r = el.getBoundingClientRect(); if (!r.width) continue;
    const x0 = -r.left / r.width, x1 = (vw - r.left) / r.width, pad = vw * .8 / r.width;
    for (const t of el._tiles) {
      const want = t.x + t.w > x0 - pad && t.x < x1 + pad;
      if (want && !t.img) placePre(el, t);
      else if (!want && t.img && (t.x + t.w < x0 - pad * 2 || t.x > x1 + pad * 2)) { t.img.src = ''; t.img.remove(); t.img = null; }
    }
  }
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
// 読み込んだら、描き上がった画像（ImageBitmap）だけを残して、元の SVG はすぐに手放す。
// SVG の画像を持ち続けると、iPhone は元の図形（数万個）ごとメモリに抱えたままになり、次の部屋の分と重なると落ちる
function loadSVG(d) {
  if (!d.ready) {
    if (!d.pxW) svgSize(d);
    const gen = d.gen = (d.gen || 0) + 1;
    d.ready = new Promise((ok) => {
      const img = new Image();
      img.onload = async () => {
        let out = img;
        try { if (window.createImageBitmap) { out = await createImageBitmap(img); img.src = ''; } } catch { out = img; }
        if (d.gen !== gen) { out.close?.(); img.src = ''; ok(null); return; } // 待っている間に手放された
        d.img = out; ok(out);
      };
      img.onerror = () => ok(null);
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgDoc(d.vbW, d.vbH, d.pxW, d.pxH, d.body))}`;
    });
  }
  return d.ready;
}
// 点検用（?memdebug のときだけ）：いま持っている背景の元画像の大きさ（MB）
if (location.search.includes('memdebug')) window.__bitmapMB = () => { let px = 0; SVG_STORE.forEach((d) => { if (d.img && d.pxW) px += d.pxW * d.pxH; }); return Math.round(px * 4 / 1e5) / 10; };
function dropSVG(d) {
  if (!d) return;
  d.gen = (d.gen || 0) + 1;
  if (d.img) { if (d.img.close) d.img.close(); else d.img.src = ''; }
  d.img = null; d.ready = null;
}
async function drawTile(el, d, t) {
  const img = await loadSVG(d);
  if (!img || !el.isConnected || t.canvas || d.img !== img) return;
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
let scrollMovedAt = 0, scrollDir = 1; // 最後にスクロールが動いた時刻（立ち止まっているかどうか）と、進んでいる向き
// スマホ：部屋全体の元画像は持たず、画面 4 枚ぶんの範囲だけを SVG から直接描く（元画像を持ち続けると部屋 1 つで 50〜130MB になり、落ちる）。
// 描き直しは、立ち止まっているときに、いまの位置を真ん中にして行う（tickTiles）
async function paintRegion(el) {
  const d = el._d, w = el._win, ox = w.want, cw = w.cw, H = d.pxH;
  const img = new Image();

  const ok = await new Promise((res) => { img.onload = () => res(true); img.onerror = () => res(false); img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgDoc(d.vbW, d.vbH, cw, H, d.body, d.vbW * ox / d.pxW, d.vbW * cw / d.pxW))}`; });
  if (!ok || !el.isConnected) { img.src = ''; return; }
  let c = w.c;
  if (!c || c.width !== cw) {
    // 幅が変わるときは新しい canvas に描いてから入れ替える（今の canvas の幅を変えると中身が消えて、描き終わるまで空白になる）
    const nc = document.createElement('canvas'); nc.width = cw; nc.height = H; nc.style.cssText = `position:absolute;top:0;left:${ox / d.dens}px;width:${cw / d.dens}px;height:100%`;
    nc.getContext('2d').drawImage(img, 0, 0, cw, H);
    if (c) { c.width = 0; c.remove(); }
    el.append(nc); c = w.c = nc;
  } else {
    const g = c.getContext('2d'); g.clearRect(0, 0, cw, H); g.drawImage(img, 0, 0, cw, H);
    c.style.left = `${ox / d.dens}px`;
  }
  img.src = '';
  w.ox = ox; w.dirty = false;
}
async function drawWindow(el) {
  if (COARSE) return paintRegion(el);
  const d = el._d, w = el._win, img = await loadSVG(d);
  if (!img || !el.isConnected || d.img !== img) return;
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
    if (virt) { el._win = { c: null, ox: -1, want: 0, cw: Math.min(d.pxW, Math.round(vw * dens * (COARSE ? 1.6 : 2.6))), queued: false }; virtBoxes.add(el); tickTiles(); continue; }
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
    // いま見えている範囲（層の中の px）
    const x0 = -r.left / k * d.dens, x1 = (vw - r.left) / k * d.dens, S = vw / k * d.dens; // S：画面 1 枚ぶん
    let want = null;
    if (COARSE) {
      // 入る前の部屋は画面 1.6 枚ぶん、入ったら 4 枚ぶん（入る前の部屋のぶんが、今の部屋のぶんと重なっても小さく済むように）
      const room = el._room || (el._room = rooms.find((x) => x.el.contains(el)));
      const cwWant = Math.min(d.pxW, Math.round(S * (room && !room.entered ? 1.6 : 4)));
      if (cwWant !== w.cw) { w.cw = cwWant; w.dirty = true; } // 幅が変わったら描き直す
      // スマホ：描いてある範囲（画面 4 枚ぶん）を、進んでいる向きの先に多めにとる（後ろは画面 0.5 枚ぶん）。
      // 描き直しは立ち止まっているあいだに。次の作品まで歩くあいだ（中景で画面 1.2 枚、手前で 1.7 枚ぶん）は描き直さずに済む
      const dir = scrollDir, idle = performance.now() - scrollMovedAt > 450;
      const edge = dir > 0 ? w.ox + w.cw >= d.pxW : w.ox <= 0; // 進む先がもう層の端まで描いてある
      const ahead = dir > 0 ? w.ox + w.cw - x1 : x0 - w.ox;
      const place = () => Math.round(Math.max(0, Math.min(d.pxW - w.cw, dir > 0 ? x0 - S * .5 : x1 + S * .5 - w.cw)));
      if (!w.c || w.dirty || x0 < w.ox || x1 > w.ox + w.cw || (!edge && ahead < S * 1.1)) want = place(); // 端に近い（歩いている途中でも）
      else if (idle && !edge && ahead < w.cw - S * 1.8) want = place(); // 立ち止まっているあいだに、先へ多めに描いておく
    } else {
      // パソコン：見えている範囲の少し外まで入っていなければ、画面の真ん中に来るようにずらす
      const m = S * .15;
      if (!(w.c && x0 - m >= w.ox && x1 + m <= w.ox + w.cw)) want = Math.round(Math.max(0, Math.min(d.pxW - w.cw, (x0 + x1) / 2 - w.cw / 2)));
    }
    if (want != null && (want !== w.want || !w.c || w.dirty)) { w.want = want; if (!w.queued) { w.queued = true; rasterQueue.push({ el, win: true }); added = true; } }
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
// （表紙の絵を部屋に入ってから付ける lazy は使わない：付くまで作品が黒く見える）
// 部屋の作品の動画は、表紙の絵（img）を前に重ねておき、動画が実際に動き出してから動画を見せる
// （iPhone は動画を読み込みはじめると表紙を外して黒くなるので、その黒を見せない）
const mediaHTML = (w, { autoplay = false } = {}) => (w.type === 'video'
  ? `${autoplay ? '' : `<img class="poster" src="${esc(w.poster)}" alt="" decoding="async">`}<video muted loop playsinline preload="${autoplay ? 'auto' : 'none'}" ${autoplay ? 'autoplay' : ''} poster="${esc(w.poster)}" src="${esc(w.src)}"></video>`
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
  el.innerHTML = `<div class="sticky"><div class="stage">
      <div class="sky"></div>
      <div class="plane far"></div><div class="plane drift" aria-hidden="true"></div>${room.scene === 'jungle' ? '<div class="water-glow" aria-hidden="true"><i class="tint"></i><canvas class="caust"></canvas><i class="haze"></i></div>' : ''}<div class="plane mid"></div>
      <div class="plane props" aria-hidden="true"></div>
      <div class="flash" aria-hidden="true"></div>
      <div class="neon" aria-hidden="true"></div><div class="grain-under" aria-hidden="true"></div>
      <div class="lightplay" aria-hidden="true"><i class="l1"></i><i class="l2"></i><i class="l3"></i></div><div class="hush" aria-hidden="true"></div><div class="bleed" aria-hidden="true"></div><div class="nextglow" aria-hidden="true"></div>
      ${gradeColors(introSVG(room.scene), GRADES[room.scene])}
      <div class="plane art"></div>
      <div class="plane move"></div>
      <div class="frame"></div>
      <div class="curtain" aria-hidden="true"></div>
      <div class="curtain curtain-leave" aria-hidden="true"></div>
      <div class="veil"></div>
      <div class="vig" aria-hidden="true"></div>
    </div></div>`;
  roomsEl.append(el);
  return { room, ri, el, items, stops: items.length + 1, c: 0, glow: [255, 230, 200], sceneData: null, live: false, capIdx: -2 };
});

function frameDeco(kind) {
  switch (kind) {
    // 森：太い枝から縄で吊るす。枝には樹皮の筋と節、苔、葉の小枝。縄は撚りと結び目
    case 'hang': return `<svg class="deco top" viewBox="0 0 100 30" preserveAspectRatio="none">
      <path d="M28 3.4L34 30M72 4L66 30" stroke="#e6d8bb" stroke-width=".9"/><path d="M28 3.4L34 30M72 4L66 30" stroke="#b9a27c" stroke-width=".9" stroke-dasharray=".6 1.1"/>
      <path d="M-22 1Q20 -3.4 50 1T122 4.8L122 7.4Q88 5.6 50 5.4T-22 8.2Z" fill="#5a3b2a"/><path d="M-22 2.4Q20 -1.6 50 2.4T122 5.6" stroke="#8a6440" stroke-width=".6" fill="none" opacity=".8"/><path d="M-22 6.6Q20 3.6 50 4.6T122 6.6" stroke="#3b2416" stroke-width=".5" fill="none" opacity=".7"/>
      <path d="M8 2.2q3 -.6 6 .2M40 1.6q4 -.5 8 .3M58 2.2q4 -.4 7 .4M92 4q3 -.6 6 .1" stroke="#3b2416" stroke-width=".35" fill="none" opacity=".6"/><ellipse cx="18" cy="3.6" rx="1.3" ry=".8" fill="#3b2416" opacity=".7"/><ellipse cx="80" cy="5" rx="1.1" ry=".7" fill="#3b2416" opacity=".7"/>
      <path d="M84 3.8Q88 0 92 -3L93 -2.4Q90 1 86 4.6Z" fill="#5a3b2a"/><path d="M12 2.6Q9 -1 5 -3.4L4 -2.6Q8 0 10 3.2Z" fill="#5a3b2a"/>
      <ellipse cx="34" cy="1.2" rx="4" ry="1.1" fill="#5f7d2e" opacity=".8"/><ellipse cx="33" cy=".6" rx="2" ry=".5" fill="#8fb24e" opacity=".6"/><ellipse cx="62" cy="1.6" rx="3" ry=".9" fill="#5f7d2e" opacity=".8"/>
      <g fill="#47733c"><ellipse cx="7" cy="-1.5" rx="1.7" ry=".8" transform="rotate(-40 7 -1.5)"/><ellipse cx="4.6" cy="-2.6" rx="1.5" ry=".7" transform="rotate(-70 4.6 -2.6)"/><ellipse cx="90" cy="-1" rx="1.7" ry=".8" transform="rotate(40 90 -1)"/><ellipse cx="92.6" cy="-2.4" rx="1.5" ry=".7" transform="rotate(70 92.6 -2.4)"/></g>
      <g fill="#769721" opacity=".9"><ellipse cx="7.4" cy="-1.8" rx=".8" ry=".35" transform="rotate(-40 7.4 -1.8)"/><ellipse cx="90.4" cy="-1.3" rx=".8" ry=".35" transform="rotate(40 90.4 -1.3)"/></g>
      <path d="M26.4 2.6q1.6 2 3.2 0M26.4 4q1.6 2 3.2 0M70.4 3.2q1.6 2 3.2 0M70.4 4.6q1.6 2 3.2 0" stroke="#e6d8bb" stroke-width=".9" fill="none"/><circle cx="28" cy="3.4" r="1.1" fill="#d9ccae"/><circle cx="72" cy="4" r="1.1" fill="#d9ccae"/><circle cx="34" cy="29" r="1.2" fill="#d9ccae"/><circle cx="66" cy="29" r="1.2" fill="#d9ccae"/></svg>`;
    // 水辺：桟橋の上に据えた木の台。天板は面取り、板は木目と節、鉄の帯金、根もとに苔とシダ（中が詰まっているので、作品の下に水は見えない）
    case 'easel': return `<svg class="deco under" viewBox="0 0 100 40" preserveAspectRatio="none"><defs><linearGradient id="pedestal" x1="0" x2="1"><stop offset="0" stop-color="#b58a5a"/><stop offset=".5" stop-color="#96704a"/><stop offset="1" stop-color="#6e4f31"/></linearGradient></defs>
      <ellipse cx="50" cy="38.6" rx="34" ry="1.6" fill="#1f2a18" opacity=".35"/>
      <path d="M27 0H73V36H27Z" fill="url(#pedestal)"/>${[36, 45, 54, 63].map((x) => `<path d="M${x} 3.6V34.6" stroke="#5a3f28" stroke-width=".6" opacity=".7"/>`).join('')}
      ${[30.5, 33, 39, 42.5, 48, 51, 57, 60, 66, 69.5].map((x, i) => `<path d="M${x} 6C${x + .5} 14 ${x - .5} 22 ${x + .3} 32" stroke="${i % 2 ? '#7d5a38' : '#b08a5a'}" stroke-width=".3" fill="none" opacity=".55"/>`).join('')}
      <ellipse cx="40" cy="14" rx=".9" ry="1.6" fill="#5a3f28" opacity=".8"/><ellipse cx="40" cy="14" rx="1.5" ry="2.4" fill="none" stroke="#7d5a38" stroke-width=".2" opacity=".6"/><ellipse cx="66" cy="26" rx=".8" ry="1.3" fill="#5a3f28" opacity=".8"/>
      <defs><linearGradient id="pedWet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e2a24" stop-opacity="0"/><stop offset="1" stop-color="#1e2a24" stop-opacity=".45"/></linearGradient></defs><path d="M27 24H73V34.6H27Z" fill="url(#pedWet)"/><path d="M33 34.4C33.3 31 32.8 29 33.2 26" stroke="#4f6a3a" stroke-width=".35" fill="none" opacity=".55"/><path d="M41 34.4C41.3 31 40.8 29 41.2 26" stroke="#4f6a3a" stroke-width=".35" fill="none" opacity=".55"/><path d="M49 34.4C49.3 31 48.8 29 49.2 26" stroke="#4f6a3a" stroke-width=".35" fill="none" opacity=".55"/><path d="M62 34.4C62.3 31 61.8 29 62.2 26" stroke="#4f6a3a" stroke-width=".35" fill="none" opacity=".55"/><path d="M69 34.4C69.3 31 68.8 29 69.2 26" stroke="#4f6a3a" stroke-width=".35" fill="none" opacity=".55"/><path d="M26.2 9.5H73.8V11.5H26.2Z" fill="#3a3630"/><path d="M26.2 27H73.8V29H26.2Z" fill="#3a3630"/><ellipse cx="31.0" cy="10.50" rx="1.20" ry=".45" fill="#8a4a2a" opacity="0.55"/><ellipse cx="44.0" cy="10.30" rx="0.80" ry=".45" fill="#8a4a2a" opacity="0.45"/><ellipse cx="58.0" cy="10.70" rx="1.50" ry=".45" fill="#8a4a2a" opacity="0.50"/><ellipse cx="67.0" cy="10.40" rx="0.70" ry=".45" fill="#8a4a2a" opacity="0.40"/><ellipse cx="35.0" cy="28.00" rx="1.40" ry=".45" fill="#8a4a2a" opacity="0.50"/><ellipse cx="52.0" cy="27.80" rx="0.90" ry=".45" fill="#8a4a2a" opacity="0.45"/><ellipse cx="64.0" cy="28.20" rx="1.10" ry=".45" fill="#8a4a2a" opacity="0.55"/>${[28.5, 71.5].map((x) => `<circle cx="${x}" cy="10.5" r=".45" fill="#8a8072"/><circle cx="${x}" cy="28" r=".45" fill="#8a8072"/>`).join('')}
      <path d="M23 0H77V2.6H23Z" fill="#c9a276"/><path d="M23 0H77V.8H23Z" fill="#dcbb8e"/><path d="M23 2.6H77V3.6H23Z" fill="#5a3b2a" opacity=".6"/>
      <path d="M25 34.6H75V38H25Z" fill="#5a3b2a"/><path d="M25 34.6H75V35.3H25Z" fill="#7d5a38"/>
      <ellipse cx="29" cy="35.2" rx="4" ry="1.4" fill="#5f7d2e" opacity=".85"/><ellipse cx="28" cy="34.6" rx="2" ry=".6" fill="#8fb24e" opacity=".5"/><ellipse cx="70" cy="35.4" rx="3.2" ry="1.2" fill="#5f7d2e" opacity=".85"/><ellipse cx="46" cy="35" rx="2.4" ry=".8" fill="#4f6a2a" opacity=".7"/>
      <g fill="#5a8a48"><path d="M23.5 38.2q-1.5 -4 -4.5 -6q1.6 3.4 2.6 6.4Z"/><path d="M22.5 38.4q-3 -3.2 -6.5 -3.4q2.6 1.8 4.6 4Z"/><path d="M76.5 38.2q1.5 -4 4.5 -6q-1.6 3.4 -2.6 6.4Z"/><path d="M77.5 38.4q3 -3.2 6.5 -3.4q-2.6 1.8 -4.6 4Z"/></g><g fill="#699053"><path d="M24 38q-.6 -3 -2.4 -4.6q.8 2.6 1.4 4.8Z"/><path d="M76 38q.6 -3 2.4 -4.6q-.8 2.6 -1.4 4.8Z"/></g></svg>`;
    case 'lamp': return `<svg class="deco top lamp" viewBox="0 0 40 60" preserveAspectRatio="xMidYMax meet"><path d="M20 -200V26" stroke="#3a3a3a" stroke-width=".4"/><path d="M13 26Q20 19 27 26L25 36H15Z" fill="#f2b441"/><path d="M14 29H26M14.5 32H25.5" stroke="#d98f2b" stroke-width=".5"/></svg>`;
    // 夜更けの小屋：壁の真鍮の釘から撚った紐で吊るし、上に真鍮の額灯（笠に光の帯、下に小さな電球）
    case 'wall': return `<svg class="deco top wall" viewBox="0 0 60 30" preserveAspectRatio="xMidYMax meet">
      <path d="M30 6L12 30M30 6L48 30" stroke="#2a1e14" stroke-width=".7"/><path d="M30 6L12 30M30 6L48 30" stroke="#5a4a36" stroke-width=".7" stroke-dasharray=".7 .9"/>
      <circle cx="30" cy="5.6" r="1.5" fill="#6a5a3a"/><circle cx="30" cy="5.4" r="1.1" fill="#b8925e"/><circle cx="29.6" cy="5" r=".4" fill="#e6d3a6"/>
      <path d="M29.4 -6H30.6V1H29.4Z" fill="#8a6a3a"/><path d="M21 1H39L37.2 4.4H22.8Z" fill="#b8925e"/><path d="M21 1H39V1.9H21Z" fill="#d4b884"/><path d="M22.8 4.4H37.2V5.2H22.8Z" fill="#7a5a30"/>
      <ellipse cx="30" cy="5.6" rx="1.6" ry=".7" fill="#ffe6b0"/><path d="M24 4.6L14 16H46L36 4.6Z" fill="rgba(255,220,160,.22)"/><path d="M26 4.6L22 10H38L34 4.6Z" fill="rgba(255,230,180,.16)"/></svg>`;
    // 夜の海辺：遊歩道に据えた黒い石の台座。真鍮の縁、天板の下の光の帯、二段の足もと、磨いた面の映り込み
    case 'lightbox': return `<svg class="deco under" viewBox="0 0 100 40" preserveAspectRatio="none"><defs><linearGradient id="plinth" x1="0" x2="1"><stop offset="0" stop-color="#2a2632"/><stop offset=".45" stop-color="#1d1a24"/><stop offset="1" stop-color="#121017"/></linearGradient><linearGradient id="plinthGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7a8" stop-opacity=".35"/><stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/></linearGradient></defs>
      <ellipse cx="50" cy="38.2" rx="46" ry="2.8" fill="#ffc873" opacity=".16"/><path d="M26 38.2H74L71 40H29Z" fill="#2a2632" opacity=".45"/><path d="M33 38.4H44L43 40H34Z" fill="#ffe7a8" opacity=".08"/>
      <path d="M26 0H74V34H26Z" fill="url(#plinth)"/><path d="M26 3.6H74V12H26Z" fill="url(#plinthGlow)"/><path d="M30 7H70V30H30Z" fill="none" stroke="#3c3848" stroke-width=".35" opacity=".8"/><path d="M30.6 7.6H69.4V29.4H30.6Z" fill="#0d0b11" opacity=".22"/><path d="M30 30H70" stroke="#5a5468" stroke-width=".25" opacity=".6"/><circle cx="41.9" cy="9.1" r="0.24" fill="#4a4558" opacity="0.73"/><circle cx="31.3" cy="20.7" r="0.28" fill="#4a4558" opacity="0.41"/><circle cx="46.9" cy="6.9" r="0.14" fill="#0b0a0f" opacity="0.42"/><circle cx="53.0" cy="30.6" r="0.23" fill="#5a5468" opacity="0.78"/><circle cx="53.5" cy="15.7" r="0.30" fill="#4a4558" opacity="0.62"/><circle cx="33.1" cy="16.3" r="0.22" fill="#5a5468" opacity="0.52"/><circle cx="64.5" cy="9.9" r="0.22" fill="#5a5468" opacity="0.48"/><circle cx="31.5" cy="24.2" r="0.22" fill="#5a5468" opacity="0.48"/><circle cx="58.3" cy="16.5" r="0.18" fill="#5a5468" opacity="0.77"/><circle cx="43.6" cy="11.7" r="0.15" fill="#4a4558" opacity="0.43"/><circle cx="40.8" cy="18.4" r="0.18" fill="#0b0a0f" opacity="0.52"/><circle cx="72.1" cy="8.2" r="0.20" fill="#0b0a0f" opacity="0.46"/><circle cx="49.5" cy="6.1" r="0.24" fill="#5a5468" opacity="0.63"/><circle cx="67.3" cy="13.5" r="0.25" fill="#5a5468" opacity="0.60"/><circle cx="63.7" cy="6.9" r="0.14" fill="#0b0a0f" opacity="0.59"/><circle cx="57.6" cy="6.6" r="0.25" fill="#5a5468" opacity="0.63"/><circle cx="58.3" cy="17.0" r="0.25" fill="#5a5468" opacity="0.54"/><circle cx="70.3" cy="14.6" r="0.23" fill="#0b0a0f" opacity="0.42"/><circle cx="62.3" cy="8.5" r="0.16" fill="#0b0a0f" opacity="0.77"/><circle cx="49.8" cy="9.5" r="0.19" fill="#0b0a0f" opacity="0.75"/><circle cx="64.7" cy="28.3" r="0.17" fill="#0b0a0f" opacity="0.79"/><circle cx="58.4" cy="15.3" r="0.16" fill="#4a4558" opacity="0.47"/><circle cx="37.7" cy="11.3" r="0.21" fill="#5a5468" opacity="0.47"/><circle cx="40.0" cy="8.9" r="0.22" fill="#5a5468" opacity="0.63"/><circle cx="70.8" cy="23.6" r="0.21" fill="#5a5468" opacity="0.66"/><circle cx="61.0" cy="17.3" r="0.28" fill="#5a5468" opacity="0.72"/><circle cx="45.0" cy="15.8" r="0.14" fill="#5a5468" opacity="0.56"/><circle cx="35.8" cy="31.6" r="0.20" fill="#4a4558" opacity="0.54"/><circle cx="29.4" cy="5.0" r="0.15" fill="#4a4558" opacity="0.78"/><circle cx="55.2" cy="6.9" r="0.16" fill="#0b0a0f" opacity="0.46"/><circle cx="38.6" cy="14.4" r="0.19" fill="#4a4558" opacity="0.45"/><circle cx="49.5" cy="31.4" r="0.21" fill="#0b0a0f" opacity="0.43"/><circle cx="31.7" cy="14.3" r="0.17" fill="#5a5468" opacity="0.46"/><circle cx="28.1" cy="30.7" r="0.22" fill="#4a4558" opacity="0.68"/><circle cx="69.1" cy="25.5" r="0.17" fill="#5a5468" opacity="0.75"/><circle cx="59.0" cy="12.1" r="0.19" fill="#4a4558" opacity="0.54"/><circle cx="37.2" cy="19.6" r="0.21" fill="#5a5468" opacity="0.49"/><circle cx="64.3" cy="31.6" r="0.27" fill="#4a4558" opacity="0.73"/><circle cx="61.0" cy="11.1" r="0.21" fill="#0b0a0f" opacity="0.69"/><circle cx="72.5" cy="26.3" r="0.21" fill="#4a4558" opacity="0.68"/><circle cx="71.0" cy="17.1" r="0.29" fill="#0b0a0f" opacity="0.78"/><circle cx="43.8" cy="11.0" r="0.16" fill="#4a4558" opacity="0.54"/><circle cx="49.2" cy="31.6" r="0.23" fill="#4a4558" opacity="0.59"/><circle cx="57.0" cy="26.6" r="0.14" fill="#5a5468" opacity="0.45"/><circle cx="44.9" cy="24.2" r="0.16" fill="#4a4558" opacity="0.57"/><circle cx="56.2" cy="7.3" r="0.29" fill="#5a5468" opacity="0.56"/><circle cx="45.5" cy="30.6" r="0.25" fill="#4a4558" opacity="0.80"/><circle cx="28.3" cy="21.0" r="0.20" fill="#5a5468" opacity="0.46"/><circle cx="65.0" cy="31.5" r="0.24" fill="#0b0a0f" opacity="0.46"/><circle cx="52.2" cy="5.6" r="0.26" fill="#5a5468" opacity="0.66"/><circle cx="51.2" cy="30.2" r="0.20" fill="#4a4558" opacity="0.73"/><circle cx="36.7" cy="11.8" r="0.17" fill="#4a4558" opacity="0.71"/><circle cx="42.0" cy="19.7" r="0.27" fill="#4a4558" opacity="0.76"/><circle cx="43.3" cy="17.4" r="0.23" fill="#5a5468" opacity="0.57"/><circle cx="69.2" cy="18.5" r="0.22" fill="#5a5468" opacity="0.60"/><circle cx="67.1" cy="26.0" r="0.23" fill="#4a4558" opacity="0.47"/><circle cx="48.8" cy="24.6" r="0.22" fill="#0b0a0f" opacity="0.67"/><circle cx="51.4" cy="18.0" r="0.26" fill="#5a5468" opacity="0.42"/><circle cx="35.8" cy="6.1" r="0.14" fill="#0b0a0f" opacity="0.62"/><circle cx="62.0" cy="29.6" r="0.20" fill="#5a5468" opacity="0.79"/><circle cx="54.9" cy="10.4" r="0.17" fill="#5a5468" opacity="0.61"/><circle cx="49.0" cy="30.4" r="0.25" fill="#0b0a0f" opacity="0.77"/><circle cx="68.1" cy="10.5" r="0.20" fill="#0b0a0f" opacity="0.45"/><circle cx="47.3" cy="7.0" r="0.16" fill="#4a4558" opacity="0.49"/><circle cx="40.9" cy="8.3" r="0.26" fill="#5a5468" opacity="0.66"/><circle cx="43.8" cy="11.8" r="0.14" fill="#0b0a0f" opacity="0.49"/><circle cx="70.8" cy="15.8" r="0.21" fill="#5a5468" opacity="0.73"/><circle cx="34.4" cy="16.7" r="0.21" fill="#0b0a0f" opacity="0.57"/><circle cx="43.4" cy="7.5" r="0.19" fill="#0b0a0f" opacity="0.62"/><circle cx="47.3" cy="5.5" r="0.18" fill="#5a5468" opacity="0.52"/><path d="M22 0H24.6L23.2 1.4L22 1.2Z" fill="#0d0b11"/><path d="M78 0H75.8L76.6 1.6L78 1.1Z" fill="#0d0b11"/><path d="M26 33L27.8 32.2L28.4 33Z" fill="#0d0b11" opacity=".8"/>
      <path d="M31 6V31" stroke="#3c3848" stroke-width=".5" opacity=".6"/><path d="M69 6V31" stroke="#0d0b11" stroke-width=".5" opacity=".8"/><path d="M34 8C33.6 16 34.4 24 34 30" stroke="#3c3848" stroke-width="2" opacity=".18"/>
      <path d="M22 0H78V2.4H22Z" fill="#34303e"/><path d="M22 0H78V.7H22Z" fill="#b89a5a"/><path d="M22 2.4H78V3.2H22Z" fill="#0d0b11" opacity=".7"/><path d="M26.4 3.2H73.6V3.9H26.4Z" fill="#ffe7a8" opacity=".9"/>
      <path d="M25 33H75V35.6H25Z" fill="#1a1720"/><path d="M25 33H75V33.6H25Z" fill="#b89a5a" opacity=".8"/><path d="M22 35.6H78V38H22Z" fill="#120f16"/><path d="M22 35.6H78V36.1H22Z" fill="#3c3848"/>
      <circle cx="28.5" cy="1.2" r=".5" fill="#d4b884"/><circle cx="71.5" cy="1.2" r=".5" fill="#d4b884"/><circle cx="28.5" cy="34.3" r=".5" fill="#d4b884"/><circle cx="71.5" cy="34.3" r=".5" fill="#d4b884"/></svg>`;
    // 夕凪の浜：流木の 2 本の柱を砂に立て、作品を縄で結ぶ。下は流木の板（木目・節・縄の縛り）でふさぎ、柱の足もとは砂の山に貝と流木のかけら
    case 'post': return `<svg class="deco under" viewBox="0 0 100 40" preserveAspectRatio="none"><ellipse cx="50" cy="38" rx="50" ry="2.4" fill="#6b5a44" opacity=".22"/><path d="M11 0H89V36H11Z" fill="#7d6a52"/>${[0, 1, 2, 3, 4, 5].map((k) => `<path d="M11 ${k * 6}H89V${k * 6 + 5.4}H11Z" fill="${['#b39c7c', '#a58e70', '#bba585'][k % 3]}"/>`).join('')}
      ${[0, 1, 2, 3, 4, 5].map((k) => `<path d="M14 ${k * 6 + 1.6}q20 -.5 40 .3t32 -.2M18 ${k * 6 + 3.8}q24 .5 50 -.2" stroke="#8f7a5e" stroke-width=".3" fill="none" opacity=".55"/>`).join('')}
      <ellipse cx="30" cy="9.5" rx="1.2" ry=".8" fill="#7a664c"/><ellipse cx="30" cy="9.5" rx="2" ry="1.3" fill="none" stroke="#8f7a5e" stroke-width=".25"/><ellipse cx="64" cy="27.4" rx="1" ry=".7" fill="#7a664c"/><ellipse cx="72" cy="15.6" rx=".9" ry=".6" fill="#7a664c"/>
      <path d="M8 0Q7 20 9 38H14Q13 20 13.5 0ZM86.5 0Q87 20 86 38H91Q93 20 92 0Z" fill="#9a8466"/><path d="M10 2Q9.5 20 10.5 36M88.5 2Q89 20 88 36" stroke="#c2ab8a" stroke-width=".6" fill="none"/><path d="M12.6 4Q12.2 20 12.8 34M87.6 4Q87.4 20 87.8 34" stroke="#7a664c" stroke-width=".4" fill="none" opacity=".7"/>
      ${[4, 30].map((y) => `<path d="M7.6 ${y}h7M7.6 ${y + 1.4}h7M7.6 ${y + 2.8}h7M85.6 ${y}h7M85.6 ${y + 1.4}h7M85.6 ${y + 2.8}h7" stroke="#e6d8bb" stroke-width=".9"/><path d="M7.6 ${y + .7}h7M7.6 ${y + 2.1}h7M85.6 ${y + .7}h7M85.6 ${y + 2.1}h7" stroke="#b39c7c" stroke-width=".4" opacity=".7"/>`).join('')}
      <defs><linearGradient id="postSeat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2c1e" stop-opacity="0"/><stop offset="1" stop-color="#3a2c1e" stop-opacity=".32"/></linearGradient><linearGradient id="postSand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3ccb6"/><stop offset=".5" stop-color="#dec6af"/><stop offset="1" stop-color="#dfc7b0"/></linearGradient></defs>
      <path d="M11 31H89V37H11Z" fill="url(#postSeat)"/>
      <path d="M0 40Q3 36.4 8 35.9Q12 34.9 16 35.8Q30 36.7 48 36.1Q66 35.5 84 36Q88 34.9 92 35.8Q97 36.4 100 40Z" fill="url(#postSand)"/>
      <path d="M3 38Q5 36.2 8 35.9Q12 34.9 16 35.8Q30 36.7 48 36.1Q66 35.5 84 36Q88 34.9 92 35.8Q95 36.2 97 38Q94 36.8 92 36.9Q88 36.2 84 37Q66 36.6 48 37.2Q30 37.8 16 37Q12 36.2 8 37Q6 36.9 3 38Z" fill="#e8d4c0" opacity=".7"/>
      <path d="M6 39.6Q20 38.6 34 39.3Q50 38.8 66 39.3Q80 38.7 94 39.6Z" fill="#cbb29e" opacity=".3"/>
      <path d="M4.5 39.2q.3 -1.6 1.4 -1.6q1 0 1.1 1.6Z" fill="#f3e3cc"/><path d="M5 39.2h2" stroke="#c7a57c" stroke-width=".25"/><path d="M15.5 39.3l.9 -1.2l1.2 .2l.6 1Z" fill="#e59a7a"/><path d="M93 39.1q.4 -1.4 1.5 -1.3q.9 .2 .9 1.3Z" fill="#e9cfae"/><path d="M83 39.3l3 -.8l2.5 .8Z" fill="#a8927a"/><path d="M84 38.7q1 -.5 3.4 -.3" stroke="#c9b59a" stroke-width=".3" fill="none"/></svg><svg class="deco top post" viewBox="0 0 100 20" preserveAspectRatio="none"><path d="M8 20Q7 8 9 0H14Q13 8 13.5 20ZM86.5 20Q87 8 86 0H91Q93 8 92 20Z" fill="#9a8466"/><path d="M5 3Q50 7 95 3L95 5.4Q50 9.2 5 5.4Z" fill="#8f7a5e"/><path d="M5 3Q50 7 95 3L95 3.9Q50 7.6 5 3.9Z" fill="#b39c7c"/><path d="M6.5 2.2q3 6 3 9M92.5 2.2q-3 6 -3 9M6.2 3.6L11.6 9.4M12.4 3L7.2 9.2M93.6 3.6L88.2 9.4M87.4 3L92.6 9.2" stroke="#e6d8bb" stroke-width=".9" fill="none"/><path d="M6.2 3.6L11.6 9.4M12.4 3L7.2 9.2M93.6 3.6L88.2 9.4M87.4 3L92.6 9.2" stroke="#b39c7c" stroke-width=".35" fill="none" opacity=".7"/><path d="M30 6L34 20M70 6L66 20" stroke="#e6d8bb" stroke-width=".8"/><path d="M30 6L34 20M70 6L66 20" stroke="#b39c7c" stroke-width=".8" stroke-dasharray=".6 1"/><circle cx="30" cy="5.8" r="1" fill="#e6d8bb"/><circle cx="70" cy="5.8" r="1" fill="#e6d8bb"/><path d="M89 9.6v4.4" stroke="#7a664c" stroke-width=".35"/><circle cx="89" cy="15.6" r="1.8" fill="#c97a66"/><path d="M87.3 15.2h3.4" stroke="#f3e3cc" stroke-width=".6"/></svg>`;
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
  const S = SCENES[r.room.scene](W, r.stops, { birdGap: BIRD_SPOTS[r.room.id] ? Math.floor(BIRD_SPOTS[r.room.id][0]) : -1, night: forestNight && NIGHTABLE.includes(r.room.scene) });
  r.sceneData = S;
  const moonlit = forestNight && NIGHTABLE.includes(r.room.scene);
  r.el.classList.toggle('moonlit', moonlit);
  if (moonlit) S.glowDefault = [255, 208, 150]; // 夜は、作品のうしろの光を暖かいスポットライトの色に
  GRADE = gradeOf(r.room.scene);
  $('.sky', r.el).style.background = gradeColors(S.sky, GRADE);
  // 背景の絵は HTML として用意だけしておき、部屋に近づいたときに付ける（attachLayers）
  // 奥の層は、描くときに一度だけ薄くぼかしておく（被写界深度。スクロール中の負担はない）
  r.leaves = S.curtain ? curtainLeaves(W, S.curtain) : null;
  // 書き出し済みの背景（lite.html）があれば、その場で SVG を組み立てずに画像を置く
  const pk = (l) => `${r.room.id}-${l}${moonlit ? '-night' : ''}`;
  r.layerHTML = {
    // 空（skyArt）はぼかさずにいちばん下へ。その上の遠景（山・町）だけを薄くぼかす
    '.far': (preBox(pk('far'), S.far[0], 'far-r') || svgImg(S.far[0], `${S.skyArt || ''}<defs><filter id="dof" x="-2%" y="-2%" width="104%" height="104%"><feGaussianBlur stdDeviation=".12"/></filter></defs><g filter="url(#dof)">${S.far[1]}</g>`, 'far-r')) + skyDomHTML(S.skyDom) + farHotspot(r.room.id, S.far[0], U),
    '.mid': preBox(pk('mid'), S.mid[0]) || svgImg(...S.mid),
    '.move': preBox(pk('move'), S.move[0]) || svgImg(...S.move),
    '.frame': (preBox(pk('frame'), W, 'wind') || svgImg(W, S.frame, 'wind')) + frameHotspot(r.room.id),
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
    // スノーボードは、小屋の前の雪に縦に刺す
    const bh = W < 80 ? 32 : 38, bw = bh * 136 / 640, bx = P.facade0 + 1.2 + bw / 2, by = 97; // 小屋の前の雪に刺す（扉の左、角の雪だまりの手前。根もとは土台より下の雪の中） // 扉（高さ 38）と比べて、人の背丈より少し低いくらいに見える大きさ
    r.boardX = bx - bw / 2; // 帰り道の跡は、狭い画面ではボードの左に
    r.layerHTML['.mid'] += part('snow-ground.webp', P.x, P.y(600), 722 * P.s, P.facade0) + sides(P.midTiles, 'ground', P.y(600), 722 * P.s, P.facade0)
      + `<svg class="snowcut" viewBox="${P.corner[0]} 0 ${P.corner[1]} 100" preserveAspectRatio="none" style="${box(P.corner[0], 0, P.corner[1], 100)};overflow:visible" aria-hidden="true">${gradeColors(P.corner[2], GRADES.attic)}</svg>`
      + `<div class="snowcut board" style="${box(bx - bw / 2, by - bh, bw, bh)}">${im('snow-board.webp', bw, bh)}</div>`
      // ボードの根もとの雪：角の雪だまりと同じ色・同じ影の模様で、足もとを小さく盛り上げて隠す。縁の線は引かず、雪だまりの内側に収める（境目が見えないように）
      + gradeColors(`<svg class="snowcut" viewBox="${bx - 10} 0 20 100" preserveAspectRatio="none" style="${box(bx - 10, 0, 20, 100)};overflow:visible" aria-hidden="true"><defs><linearGradient id="boardDrift" gradientUnits="userSpaceOnUse" x1="0" y1="84.6" x2="0" y2="106"><stop offset="0" stop-color="#b4c4f6"/><stop offset=".4" stop-color="#a3b5f1"/><stop offset="1" stop-color="#97a9e5"/></linearGradient></defs><path d="M${bx - 5.6} 104L${bx - 5.6} 93.4Q${bx - 4.4} 92 ${bx - 2.8} 91.9Q${bx - .6} 91.6 ${bx + 1.4} 91.8Q${bx + 3.4} 91.9 ${bx + 4.6} 92.2Q${bx + 5.6} 92.6 ${bx + 5.9} 93.6L${bx + 5.9} 104Z" fill="url(#boardDrift)"/><ellipse cx="${bx - 1.8}" cy="96.6" rx="1.9" ry=".35" fill="#8b9ddb" opacity=".45"/><ellipse cx="${bx + 2.4}" cy="99.2" rx="2.4" ry=".4" fill="#8b9ddb" opacity=".4"/></svg>`, GRADES.attic);
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
      // 作品の台の正面に掛ける画面つきプレーヤー（Deep In. の樽の台）
      const onPlinth = PLINTH_MUSIC[w.id];
      if (onPlinth && groundY) {
        // 樽の台の 2 本の鉄の帯（台の高さの 28.75% と 67.5%）のあいだに、壁掛けのように掛ける
        const plinth = Math.max(10, groundY - ((vw <= 760 ? 38 : 46) + h / 2 + 1)), gapH = plinth * (27 - 11.5) / 40;
        const ph = Math.min(gapH * .82, h * w.aspect * .598 * .86 * 30.2 / 48), pw = ph * 48 / 30.2, top = plinth * 11.5 / 40 + (gapH - ph) / 2;
        el.insertAdjacentHTML('beforeend', `<button class="music-stand pedestal-player egg-prop" data-egg="musicbox" data-track="${onPlinth.track}" aria-label="曲を流す" style="width:${pw.toFixed(2)}vh;top:calc(100% + ${top.toFixed(2)}vh)"><i class="mb-brk l" aria-hidden="true"></i><i class="mb-brk r" aria-hidden="true"></i>${gradeColors(PROPS.musicPanel.svg(onPlinth.art), gradeOf(r.room.scene))}<i class="mb-glow" aria-hidden="true"></i></button>`);
      }
      const wv = el.querySelector('video');
      if (wv) { wv.dataset.vsrc = wv.getAttribute('src'); wv.removeAttribute('src'); wv.addEventListener('playing', () => wv.classList.add('ready')); wv.addEventListener('emptied', () => wv.classList.remove('ready')); }
      const cv = el.querySelector('.canvas');
      cv.addEventListener('click', (e) => { if (cv._held) { cv._held = false; e.preventDefault(); return; } openViewer(w, e.clientX, e.clientY); });
      // 長押し：まわりが暗く沈み、作品だけが照らされる（離すと戻る。長押ししたときはビューアを開かない）
      cv.addEventListener('pointerdown', () => { clearTimeout(cv._hold); cv._hold = setTimeout(() => { cv._held = true; r.el.classList.add('spot'); }, 420); });
      for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) cv.addEventListener(ev, () => { clearTimeout(cv._hold); r.el.classList.remove('spot'); });
      cv.addEventListener('contextmenu', (e) => { if (cv._held) e.preventDefault(); });
    } else if (it.door) {
      // 小屋の扉：蝶番を左に、近づくとゆっくり内側へひらく。ひらくほど中の灯りが雪に漏れる
      el.className = 'cabin-door';
      el.style.left = `${(x - 6) * U}px`;
      el.innerHTML = gradeColors(`<i class="spill" aria-hidden="true"></i><svg class="step" viewBox="0 0 16 4" preserveAspectRatio="none" aria-hidden="true"><path d="M.6 1.1H15.4V4H.6Z" fill="#3e2a1b"/><path d="M.6 1.1H15.4V1.7H.6Z" fill="#6a4a31"/><path d="M1.5 2.5H14.5M1.5 3.3H14.5" stroke="#2e1f14" stroke-width=".18"/><path d="M0 1.3Q1 .2 4 .5T9 .4T14 .5Q15.6 .4 16 1.3Q12 1 8 1.2T0 1.3Z" fill="#dfe6f2"/><path d="M4.5 .9Q8 .5 11.5 .9" stroke="#ffd9a0" stroke-width=".35" stroke-linecap="round" opacity=".55" class="step-lit"/></svg><div class="leaf"><svg viewBox="0 0 12 38" preserveAspectRatio="none" aria-hidden="true"><rect width="12" height="38" fill="#4a3322"/>${[3, 6, 9].map((v) => `<path d="M${v} 0V38" stroke="#3a2718" stroke-width=".35"/>`).join('')}<path d="M1.4 7H10.6M1.4 30H10.6M1.4 30L10.6 7" stroke="#5e4029" stroke-width="1.1"/><circle cx="10" cy="20" r=".6" fill="#c9a36a"/></svg></div>`, GRADES.attic);
    } else {
      el.className = 'work pending';
      el.innerHTML = `<svg class="covered" viewBox="0 0 60 72" aria-label="搬入中"><path d="M8 70L14 30M52 70L46 30M30 70V40" stroke="#8a5a3b" stroke-width="2.4" stroke-linecap="round"/><path d="M10 8Q30 2 50 8L54 56Q46 60 40 55Q34 61 28 55Q21 61 15 55Q10 59 6 56Z" fill="#efe6d2"/><path d="M10 8Q30 2 50 8L52 30Q30 20 10 30Z" fill="#faf3e4"/><path d="M20 10Q22 30 18 55M34 8Q36 30 34 56M44 9Q42 32 44 55" stroke="#d8ccb2" stroke-width="1" fill="none"/><path d="M28 2Q30 -1 32 2L31 6H29Z" fill="#6b4630"/></svg>`;
    }
    art.append(el);
    return el;
  });
  art.insertAdjacentHTML('beforeend', roomArtEggHTML(r.room.id, W, U, r.items.length, W * FACTORS.mid));
  // 夕凪の浜：Hidden Key. の続きの 1 枚を、作品ではなく砂の上のチラシとして置く（Hidden Key. と次の作品の台のあいだ。浜風でめくれ、ときどき少し飛ばされる。タップでも飛ぶ）
  if (r.room.id === 'dusk') {
    const i = r.items.findIndex((it) => it.work?.id === 'hidden-key');
    if (i >= 0) {
      const cw = parseFloat(r.itemEls[i].querySelector('.canvas').style.width) / U, fw = W < 70 ? 4.6 : 6.2;
      const x = (i + 1) * W * FACTORS.mid + W / 2 + Math.min(W / 2, cw / 2 + 15);
      art.insertAdjacentHTML('beforeend', `<button class="sand-flyer" aria-label="チラシ" style="left:${((x - fw / 2) * U).toFixed(1)}px;width:${fw}vh"><img src="assets/art/hidden-key-flyer.webp" alt="" draggable="false"></button>`);
    }
  }
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
  afterhours: { intro: 'musicStand', introAt: 3.5, pool: [], extra: [[4.5, 'armchair', 0], [5.5, 'bookcrate', -15]] }, // 小屋の家具 // 小屋のレコードプレーヤーは台に載せる
};
const PLINTH_MUSIC = { 'deep-in': { art: 'assets/works/deep-in.jpg', track: 'assets/audio/deep-in.mp3' } }; // 作品の台にはめ込むプレーヤー
const MUSIC = {
  musicStand: { art: 'assets/art/bhi-store.webp', track: 'assets/audio/bhi-store.mp3' },
  musicStandDeep: { art: 'assets/works/deep-in.jpg', track: 'assets/audio/deep-in.mp3', bottom: 9.5, prop: 'musicBarrel' }, // 水辺は、作品と同じ樽の台に竹の枠のプレーヤー
};
function propHTML(kind, scene) {
  if (kind === 'rock') return { html: ROCK.svg(Math.floor(Math.random() * 2)), cls: 'rock', w: ROCK.w, bottom: 5 };
  if (kind === 'armchair' || kind === 'bookcrate') return { html: PROPS[kind].svg(), cls: '', w: PROPS[kind].w, bottom: kind === 'armchair' ? 7.4 : 7.8 };
  if (kind === 'recordStand') return { html: PROPS.recordStand.svg(), cls: '', w: PROPS.recordStand.w, bottom: 8 };
  // 画面つきプレーヤー（曲ごとに、画面の絵と曲を変える）。小屋は BHI STORE、水辺は Deep In.
  if (MUSIC[kind]) return { html: PROPS[MUSIC[kind].prop || 'musicStand'].svg(MUSIC[kind].art) + '<i class="mb-glow" aria-hidden="true"></i>', cls: 'music-stand', w: PROPS.musicStand.w, bottom: MUSIC[kind].bottom ?? 8, track: MUSIC[kind].track }; // 画面の光は、流れているあいだだけ
  const P = PROPS[kind];
  return { html: P.svg(), cls: P.hang ? 'hang-prop' : '', w: P.w, bottom: P.hang ? null : 7 + Math.random() * 3 };
}
// スクロールに合わせて動く生きもの：水辺の鯉（歩くと先へ泳ぐ）、夕凪のカモメ（夕日のほうへ渡る）、森の白い蝶（ひらひらと先へ）
// [種類, 数, 高さの範囲（vh）, 大きさ（vh）, 歩く速さ（vh／立ち止まる場所 1 つぶん）, 向き（1＝右へ）, 置く層（奥＝swim、中景＝props。蝶は木の前を飛ぶので中景）]
const SWIMMERS = {
  water: [['koi', 5, [64, 84], [10, 13], [8, 16], 1, 'drift'], ['dragonfly', 2, [38, 60], [1.6, 2.1], [12, 20], 1, 'props']],
  dusk: [['gull', 4, [12, 38], [3, 4.4], [40, 70], -1, 'drift']],
  dapple: [['butterfly', 3, [64, 92], [2, 2.8], [30, 50], 1, 'props']],
  night: [['boat', 2, [68.5, 71.5], [3, 4.2], [6, 10], -1, 'drift']],
};
const NO_TURN = new Set(['gull', 'boat']); // 横向きの影絵は回さず、進む向きに反転するだけ
const SWIM_URL = new Map();
function swimURL(kind, i, scene) {
  const k = `${kind}-${i}-${scene}-${forestNight ? 1 : 0}`;
  if (!SWIM_URL.has(k)) SWIM_URL.set(k, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(gradeColors(swimmerSVG(kind, i), gradeOf(scene)))}`);
  return SWIM_URL.get(k);
}
function buildSwimmers(r) {
  // 作り直すときは、前に置いた奥の動くもの（観覧車・灯台・鯉など）を先に片づける（画面の大きさが変わると二重になっていた）
  const DR = $('.drift', r.el); if (DR) DR.innerHTML = '';
  const cfgs = SWIMMERS[r.room.id]; if (!cfgs) return;
  r.swimmers = [];
  for (const [kind, n0, ys, ws, sp, dir, plane] of cfgs) {
    const n = COARSE && kind === 'koi' ? 3 : n0;
    const L = $(`.${plane}`, r.el), f = plane === 'drift' ? FACTORS.far : FACTORS.mid, fw = W + (r.stops - 1) * W * f + 40;
    for (let i = 0; i < n; i++) {
      const w = ws[0] + Math.random() * (ws[1] - ws[0]);
      const el = document.createElement('div'); el.className = `swimmer ${kind}`; el.style.width = `${w}vh`;
      // 絵は一度だけ画像にして使い回す（中身の SVG を毎回描かない）
      el.innerHTML = `<img alt="" draggable="false" src="${swimURL(kind, i, r.room.scene)}">`;
      L.append(el);
      // 部屋の端から端まで均等に散らす（最初の作品から、どこでも鯉が見えるように）
      const x0 = (i + .2 + Math.random() * .6) / n * fw, y0 = ys[0] + Math.random() * (ys[1] - ys[0]);
      r.swimmers.push({ el, L, kind, i, n, x0, y0, x: x0, y: y0, a: dir > 0 ? 90 : -90, w, sp: sp[0] + Math.random() * (sp[1] - sp[0]), ph: Math.random() * 10, dir, fw, f, gather: kind === 'koi' || kind === 'butterfly', gy: kind === 'koi' ? [72, 83] : [86, 94], lastRipple: 0 });
    }
  }
}
// 泳ぐ・飛ぶ：歩いた分だけ先へ進み、立ち止まっている間もゆっくり動く。作品の前で立ち止まると、鯉と蝶はその足もとへ集まってくる
function updateSwimmers(r, now, focus) {
  if (!r.swimmers) return;
  const t = REDUCED ? 0 : now / 1000, dt = Math.min(.1, (now - (r.swimT ?? now)) / 1000); r.swimT = now;
  const k = 1 - Math.exp(-dt / 1.4), stop = Math.round(r.c);
  r.swimmers.forEach((s) => {
    let dx, dy; const i = s.i;
    const home = r.c * W * s.f + W / 2;
    // 集まるのは、すでに近くにいる鯉・蝶だけ（画面の外から一気に泳いでこないように）
    if (s.gather && focus > .6 && Math.abs(s.x - home) < W * .75) {
      // 作品の足もと：奥の層での作品の位置 = 歩いた分のずれ + 画面の真ん中
      const tx = r.c * W * s.f + W / 2 + (i - (s.n - 1) / 2) * 7 + Math.sin(t * .5 + s.ph) * 2, ty = s.gy[0] + (s.gy[1] - s.gy[0]) * ((i * .37 + .2) % 1) + Math.sin(t * .8 + s.ph) * 1;
      dx = tx - s.x; dy = ty - s.y;
    } else {
      // トンボはその場でホバリング（小さくふらつく）。ほかは先へ進む
      const hov = s.kind === 'dragonfly' ? Math.sin(t * 2.3 + s.ph) * 2.5 : 0;
      // 鯉は、ひと蹴りして滑る泳ぎ方（速さが波打つ）。ゆるく蛇行する
      const koiT = s.kind === 'koi' ? t * 1.2 + Math.sin(t * .9 + s.ph) * .9 : t * (s.kind === 'boat' ? .25 : 1.2);
      const wx = (((s.x0 + s.dir * (r.c * s.sp + koiT) + hov) % s.fw) + s.fw) % s.fw, wy = s.y0 + Math.sin(t * .7 + s.ph) * (s.kind === 'boat' ? .25 : s.kind === 'koi' ? 3 : 1.4) + (s.kind === 'dragonfly' ? Math.sin(t * 3.1 + s.ph) * 1.2 : 0);
      dx = wx - s.x; dy = wy - s.y;
      if (Math.abs(dx) > s.fw / 2) { s.x = wx; dx = 0; } // 端で折り返すときは飛ぶ
    }
    let mx = dx * k, my = dy * k;
    // 泳ぐ速さに上限（ゆっくり寄ってくる）
    if (s.kind === 'koi' || s.kind === 'butterfly') { const cap = (s.kind === 'koi' ? 7 : 12) * dt, m = Math.hypot(mx, my); if (m > cap) { mx *= cap / m; my *= cap / m; } }
    if (s.flee) { const f = s.flee; mx += f.vx * dt * f.t; my += f.vy * dt * f.t * .4; f.t -= dt; if (f.t <= 0) s.flee = null; }
    s.x += mx; s.y += my;
    if (Math.hypot(mx, my) > .01) { const ta = Math.atan2(my, mx) * 180 / Math.PI + 90; let da = ((ta - s.a + 540) % 360) - 180; s.a += da * Math.min(1, dt * 4); }
    // 鯉は体を左右に小さく振って泳ぐ（速く泳ぐほど速く）。要素ごとの回転だけなので軽い
    if (s.kind === 'koi') { const v = Math.hypot(mx, my) / Math.max(dt, .001); s.wagT = (s.wagT || 0) + dt * (3 + Math.min(6, v * .35)); }
    const wob = s.kind === 'koi' ? Math.sin(s.wagT || 0) * 4 : Math.sin(t * 1.1 + s.ph) * 6;
    // 鯉は奥（上）ほど小さく見せる（遠近）
    const depth = s.kind === 'koi' ? `scale(${(.72 + (s.y - 64) / 20 * .28).toFixed(3)}) ` : '';
    // 鳥は作品と同じ横向きの影絵なので回さず、進む向きに反転して少し傾けるだけ
    const turn = NO_TURN.has(s.kind) ? `scaleX(${s.dir}) rotate(${(wob * (s.kind === 'boat' ? .15 : .5)).toFixed(1)}deg)` : `rotate(${(s.a + wob).toFixed(1)}deg)`;
    put(s.el, 'transform', `translate3d(${(s.x * U).toFixed(1)}px, ${(s.y * U).toFixed(1)}px, 0) ${depth}${turn}`);
    // 鯉が通ったあとに波紋（動いているときだけ、1 匹あたり 1.3 秒に 1 つ。同時に多く残さない）
    if (s.kind === 'koi' && !REDUCED && !COARSE && now - s.lastRipple > 2200 && Math.hypot(mx, my) > .02 && (r.rippleN || 0) < 4) {
      s.lastRipple = now;
      const rp = document.createElement('i'); rp.className = 'ripple'; rp.style.left = `${(s.x + s.w / 2) * U}px`; rp.style.top = `${(s.y + s.w * .6) * U}px`;
      r.rippleN = (r.rippleN || 0) + 1; rp.addEventListener('animationend', () => { rp.remove(); r.rippleN--; }, { once: true }); s.L.append(rp);
    }
  });
}
// 部屋の中の小さな動き：夜の庭の観覧車と水たまりの光、小屋の火と窓の外の雪
// 寄せる波の絵（横に繰り返せる 48×6 の絵）。上は海の水に溶け、先は波打った泡のふち。泡には小さな穴（レースのよう）と、水の上の細い泡の筋
let swashCache = {};
function swashURL(scene) {
  if (swashCache[scene]) return swashCache[scene];
  const Wt = 48, f = (x) => 3.5 + .42 * Math.sin(x / Wt * Math.PI * 4) + .26 * Math.sin(x / Wt * Math.PI * 10 + 1) + .12 * Math.sin(x / Wt * Math.PI * 22 + 2);
  const band = (x) => .42 + .2 * Math.sin(x / Wt * Math.PI * 6 + .5) + .1 * Math.sin(x / Wt * Math.PI * 18);
  const xs = Array.from({ length: 97 }, (_, i) => i * Wt / 96), n = (v) => v.toFixed(2);
  const edge = xs.map((x) => `${n(x)} ${n(f(x))}`).join('L');
  const sheet = `M0 0H${Wt}V${n(f(Wt))}L${[...xs].reverse().map((x) => `${n(x)} ${n(f(x))}`).join('L')}Z`;
  const foam = `M${xs.map((x) => `${n(x)} ${n(f(x) - band(x))}`).join('L')}L${[...xs].reverse().map((x) => `${n(x)} ${n(f(x) + .12)}`).join('L')}Z`;
  let holes = '', streaks = '';
  for (let i = 0; i < 44; i++) { const x = (i * 1.09 + Math.sin(i * 7.3) * .4 + Wt) % Wt, y = f(x) - band(x) * (.3 + .4 * ((Math.sin(i * 3.1) + 1) / 2)); holes += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(.12 + .1 * ((Math.sin(i * 5.7) + 1) / 2))}" ry=".07" fill="#b9d6cf" opacity=".75"/>`; }
  // （波の上の細い白い筋はやめた：横線に見えるので）
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Wt} 6" preserveAspectRatio="none" width="480" height="60"><defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9d0cb" stop-opacity="0"/><stop offset=".45" stop-color="#b3d6cf" stop-opacity=".35"/><stop offset=".62" stop-color="#c4ded6" stop-opacity=".55"/></linearGradient></defs>`
    + `<path d="${sheet}" fill="url(#w)"/>${streaks}<path d="${foam}" fill="#fbf6ea" opacity=".9"/>${holes}</svg>`; // 泡のふちをなぞる線も引かない
  return (swashCache[scene] = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(gradeColors(svg, gradeOf(scene)))}`);
}
// 小さな決まった乱数（波紋の出るタイミングをずらすため。部屋を組み直しても同じ）
function hrand(k) { let t0 = k | 0; return () => { t0 = t0 + 0x6D2B79F5 | 0; let t = Math.imul(t0 ^ t0 >>> 15, 1 | t0); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// 壁時計の針：今の時刻（見ている人の端末の時計）に。20 秒ごとに合わせ直す
// 壁時計の文字盤（木の縁、生成りの文字盤、目盛り。数字は描かない）
function clockFaceSVG() {
  let t = '';
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r1 = i % 3 ? .74 : .68; t += `<path d="M${(Math.sin(a) * r1).toFixed(3)} ${(-Math.cos(a) * r1).toFixed(3)}L${(Math.sin(a) * .8).toFixed(3)} ${(-Math.cos(a) * .8).toFixed(3)}" stroke="#3a2718" stroke-width="${i % 3 ? .03 : .06}"/>`; }
  return `<svg class="face" viewBox="-1.12 -1.12 2.24 2.24" aria-hidden="true"><circle cx=".06" cy=".08" r="1.05" fill="#000" opacity=".25"/><circle r="1.05" fill="#6a4a30"/><circle r=".86" fill="#e8dcc0"/>${t}</svg>`;
}
// 遠くの旅客機（横向き、左へ飛ぶ）：上面は夕日を受けて明るく、下は影。線は描かない
function planeSVG() {
  return `<svg viewBox="0 0 40 12"><path d="M2 6.6Q2.4 5.3 4.6 5.1L31 4.7L35.6 1.2H37.4L36 5L37.6 5.4Q38.2 6.2 37 6.6L33 7.2H5Q2.4 7.2 2 6.6Z" fill="#8f8aa3"/><path d="M4.6 5.1L31 4.7L35.6 1.2H37.4L36 5L31 5.6H5.2Q3.4 5.7 4.6 5.1Z" fill="#c9b7bc"/><path d="M14 6.4L22.5 6.3L27 10.6H24.8Z" fill="#7b7690"/><path d="M15 5.4L21 5.3L24.2 3.4H23Z" fill="#a49db3"/><path d="M33 5.6L38.4 5.2L38.6 6H33.4Z" fill="#7b7690"/><circle class="nav" cx="26.6" cy="10.4" r=".55" fill="#e76a5a"/><circle class="strobe" cx="37.2" cy="1.5" r=".5" fill="#ffe6c4"/></svg>`;
}
function tickClocks() {
  const now = new Date(), m = now.getMinutes() + now.getSeconds() / 60, h = (now.getHours() % 12) + m / 60;
  document.querySelectorAll('.wclock').forEach((c) => { c.querySelector('.mh').style.transform = `rotate(${(m * 6).toFixed(1)}deg)`; c.querySelector('.hh').style.transform = `rotate(${(h * 30).toFixed(1)}deg)`; });
  clearTimeout(tickClocks.t); tickClocks.t = setTimeout(tickClocks, 20000);
}
function buildLiving(r) {
  const D = r.sceneData, P = $('.props', r.el), S = $('.drift', r.el);
  if (D.ferris) {
    const { x, y, r: rr } = D.ferris, R2 = rr + 3, h = rr + 3.8, G = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(gradeColors(svg, gradeOf(r.room.scene)))}`;
    const gon = Array.from({ length: FERRIS_N }, (_, k) => { const a = k / FERRIS_N * Math.PI * 2; return `<img class="gondola" alt="" src="${G(ferrisSVG(rr, 'gondola'))}" style="left:${((R2 + Math.cos(a) * rr - 1.3) / (R2 * 2) * 100).toFixed(2)}%;top:${((R2 + Math.sin(a) * rr) / (R2 * 2) * 100).toFixed(2)}%;width:${(2.6 / (R2 * 2) * 100).toFixed(2)}%">`; }).join('');
    // 水面の映り込み：色の違う灯りの短い横線を、水平線の下に縦に並べる（ゆらゆら）
    const refl = Array.from({ length: 9 }, (_, k) => `<i style="top:${(k * 11).toFixed(0)}%;width:${(70 - k * 6).toFixed(0)}%;background:${['#ffb45a', '#e88ab8', '#ffe7a8'][k % 3]};animation-delay:${(-k * .4).toFixed(1)}s"></i>`).join('');
    S.insertAdjacentHTML('beforeend', `<img class="living ferris" alt="" src="${G(ferrisSVG(rr, 'legs'))}" style="left:${((x - R2) * U).toFixed(1)}px;top:${((y - R2) * U).toFixed(1)}px;width:${R2 * 2}vh;height:${(R2 + h + 1).toFixed(2)}vh"><div class="living ferris-wheel" style="left:${((x - R2) * U).toFixed(1)}px;top:${((y - R2) * U).toFixed(1)}px;width:${R2 * 2}vh;height:${R2 * 2}vh"><img alt="" src="${G(ferrisSVG(rr))}">${gon}</div><div class="living ferris-refl" style="left:${((x - rr * .6) * U).toFixed(1)}px;top:${((D.ferris.base + .6) * U).toFixed(1)}px;width:${rr * 1.2}vh;height:${rr * .9}vh">${refl}</div>`);
  }
  if (D.puddles) P.insertAdjacentHTML('beforeend', D.puddles.map(([x, y, w], i) => `<i class="living puddle-shine" style="left:${((x - w * .9) * U).toFixed(1)}px;top:${((y - w * .13) * U).toFixed(1)}px;width:${(w * 1.8).toFixed(2)}vh;height:${(w * .26).toFixed(2)}vh;animation-delay:${-(i * .7)}s"></i>`).join(''));
  if (D.lighthouse) { const { x, y } = D.lighthouse; S.insertAdjacentHTML('beforeend', `<div class="living lighthouse" style="left:${((x - 40) * U).toFixed(1)}px;top:${((y - 40) * U).toFixed(1)}px;width:80vh">${beamSVG()}</div>`); }
  // 夕凪の浜：防波堤の先の小さな灯台が、ゆっくり明滅する（光の輪と、水面に落ちる細い光）
  if (D.harbor) { const [x, y] = D.harbor; S.insertAdjacentHTML('beforeend', `<i class="living harborlight" style="left:${((x - 3) * U).toFixed(1)}px;top:${((y - 3) * U).toFixed(1)}px"><b></b><s style="top:${((63 - y + 3) / 6 * 100).toFixed(0)}%"></s></i>`); }
  // 夕凪の浜：夕日の光の道。横長のやわらかな光の帯が、波に合わせて左右にゆらいで明滅する（色は部屋の色合いに合わせる。夜は月の光の色に）
  if (D.sunpath) {
    const [x, hz] = D.sunpath, n = COARSE ? 9 : 14;
    const bars = Array.from({ length: n }, (_, i) => { const t = i / (n - 1), w = 14 + t * 76; return `<i style="top:${(t * t * 92).toFixed(1)}%;left:${(50 - w / 2 + Math.sin(i * 2.1) * t * 6).toFixed(1)}%;width:${w.toFixed(1)}%;height:${(1.1 + t * 2.6).toFixed(2)}vh;margin-top:-${(.5 + t * 1.3).toFixed(2)}vh;animation-duration:${(2.6 + (i * 1.7) % 2.4).toFixed(1)}s;animation-delay:${(-(i * .83) % 3).toFixed(2)}s"></i>`; }).join('');
    S.insertAdjacentHTML('beforeend', gradeColors(`<div class="living sunpath${D.moonpath ? ' moon' : ''}" style="left:${((x - 9) * U).toFixed(1)}px;top:${((hz + .4) * U).toFixed(1)}px;width:18vh;height:17vh${D.skyDom?.moon?.kind === 'real' ? `;opacity:${(.05 + moonLit() * .95).toFixed(2)}` : ''}">${bars}</div>`, gradeOf(r.room.scene)));
  }
  // 夕凪の浜：海の面のゆらぎ。空を映す明るいゆらぎと、うねりの暗い帯が、ゆっくり寄っては離れて明滅する（奥ほど細く短く、ゆっくり）
  if (D.sunpath) {
    const hz = D.sunpath[1], fw = W + (r.stops - 1) * W * FACTORS.far + 40, rows = COARSE ? 7 : 10, sw = [];
    for (let k = 0; k < rows; k++) {
      const t = (k + .6) / rows, y = hz + .6 + (80 - hz) * t * t, w = 3.5 + t * 20, h = .6 + t * 1.8, gap = w * (COARSE ? 3.2 : 2.4);
      for (let x = Math.random() * gap; x < fw; x += gap * (.7 + Math.random() * .6)) sw.push(`<i class="living swell${Math.random() < .42 ? ' dk' : ''}" style="left:${((x - w / 2) * U).toFixed(1)}px;top:${((y - h / 2) * U).toFixed(1)}px;width:${w.toFixed(1)}vh;height:${h.toFixed(2)}vh;animation-duration:${(5 + t * 3 + Math.random() * 3).toFixed(1)}s;animation-delay:${(-Math.random() * 8).toFixed(1)}s;--dx:${(w * .12).toFixed(2)}vh"></i>`);
    }
    S.insertAdjacentHTML('beforeend', sw.join(''));
  }
  // 夕凪の浜（夜）：岬の家の窓に灯り。いくつかはときどき消えたり点いたりする（夜の部屋でだけ見える）
  if (D.houses && D.houses.length) S.insertAdjacentHTML('beforeend', D.houses.map(([x, y], i) => `<i class="living townlight${i % 3 === 0 ? ' blink' : ''}" style="left:${((x - .8) * U).toFixed(1)}px;top:${((y - .8) * U).toFixed(1)}px;animation-delay:${(-(i * 7.3) % 37).toFixed(1)}s;--c:${['#ffcf85', '#ffe0a6', '#ffbd78'][i % 3]}"></i>`).join(''));
  // 夕凪の浜：遠くの空を、飛行機が飛行機雲を引いてゆっくり横切る（空は動かない層なので、いつ見ても画面の中を通る）
  if (D.plane && !REDUCED) { const sky = $('.sky', r.el); sky.querySelector('.airplane')?.remove(); sky.insertAdjacentHTML('beforeend', `<div class="airplane" aria-hidden="true"><i class="trail"></i><i class="trail t2"></i>${gradeColors(planeSVG(), gradeOf(r.room.scene))}</div>`); }
  if (D.foam) {
    // 波打ちぎわ：寄せては返す 2 枚の波（奥の水から砂を上って、薄く引いていく）と、引いたあとに光る濡れた砂。
    // 波の絵は 1 枚の横に繰り返す絵（48vh 幅）。動きは要素ごとの transform と opacity だけ
    const mw = W + (r.stops - 1) * W * FACTORS.mid + 40, tile = swashURL(r.room.scene);
    const sheet = (cls, pos) => `<i class="living swash${cls}" style="left:-5vh;top:${((D.foam - 1.6) * U).toFixed(1)}px;width:${mw + 10}vh;height:6vh;background-image:url(&quot;${tile}&quot;);background-size:48vh 6vh;background-position:${pos}vh 0"></i>`;
    P.insertAdjacentHTML('beforeend', `<i class="living wetshine" style="left:-5vh;top:${((D.foam + .8) * U).toFixed(1)}px;width:${mw + 10}vh;height:3.2vh"></i>` + sheet('', 0) + sheet(' s2', -19));
  }
  // やかんの注ぎ口から湯気
  if (D.stove && D.stove[3]) { const [x, y] = D.stove[3]; P.insertAdjacentHTML('beforeend', `<div class="living steam kettle" style="left:${((x - 1.6) * U).toFixed(1)}px;top:${((y - 6) * U).toFixed(1)}px"><i></i><i></i><i></i></div>`); }
  if (D.mug) { const [x, y] = D.mug; P.insertAdjacentHTML('beforeend', `<div class="living steam" style="left:${((x - 1) * U).toFixed(1)}px;top:${((y - 4) * U).toFixed(1)}px"><i></i><i></i><i></i></div>`); }
  // 薪ストーブの火の光：焚き口から壁へ広がる光と、床に落ちる光だまりが、炎に合わせて不規則に揺らめく（周期の違う 2 枚を重ねて、同じ揺れのくり返しに見えないように）
  if (D.stove) { const [x, y, k = 1] = D.stove, sh = 9 * k, gy = y - sh + sh * .51, ww = 44 * k * (W < 80 ? .8 : 1), wh = 34 * k, fw2 = 30 * k * (W < 80 ? .8 : 1);
    P.insertAdjacentHTML('beforeend', `<div class="living firelight wall" style="left:${((x - ww / 2) * U).toFixed(1)}px;top:${((gy - wh / 2) * U).toFixed(1)}px;width:${ww.toFixed(1)}vh;height:${wh.toFixed(1)}vh"><i></i><i></i></div><div class="living firelight floor" style="left:${((x - fw2 / 2) * U).toFixed(1)}px;top:${((y - .6) * U).toFixed(1)}px;width:${fw2.toFixed(1)}vh;height:${(9 * k * .55).toFixed(1)}vh"><i></i><i></i></div>`); }
  if (D.stove) { const [x, y, k = 1] = D.stove, sh = 9 * k, fw = 4.8 * k * .9; P.insertAdjacentHTML('beforeend', `<div class="living stove-fire" style="left:${((x - fw / 2) * U).toFixed(1)}px;top:${((y - sh + sh * .3 + sh * .42 - fw * 13 / 8 + .3) * U).toFixed(1)}px;width:${fw.toFixed(2)}vh">${fireSVG()}</div>`); } // 炎の根もとが焚き口（y−3.2）に来るように
  // 水辺：蓮の葉と水草のまわりに、ゆっくり広がって消える波紋（2 重の輪を時間をずらして）。数は画面の広さに合わせて控えめに
  // 桟橋の板（y 87〜92.6）にかかる波紋は出さない（いちばん広がったときの輪の大きさで判定）
  // 飛び石と杭のまわりの波紋：数が多いので間引かず、輪は 1 本ずつ（ゆっくり）
  if (D.srings) { const d = hrand(11); P.insertAdjacentHTML('beforeend', D.srings.map(([x, y, r]) => { if (y > 92.6) return [x, y, r]; const rm = (87 - .3 - y) / (.38 * 1.95); return rm * 1.12 >= r / 1.05 ? [x, y, Math.min(r, rm)] : null; }).filter(Boolean).map(([x, y, r]) => `<i class="living lring one" style="left:${((x - r) * U).toFixed(1)}px;top:${((y - r * .38) * U).toFixed(1)}px;width:${(r * 2).toFixed(2)}vh;height:${(r * .76).toFixed(2)}vh;--d:${(-d() * 7).toFixed(2)}s"><i></i></i>`).join('')); }
  if (D.rings) { const d = hrand(7), clearOfDeck = ([, y, r]) => { const e = r * .38 * 1.95 + .3; return y + e < 87 || y - e > 92.6; }, list = D.rings.filter(clearOfDeck).filter((_, i, all) => i % Math.max(1, Math.ceil(all.length / (W < 80 ? 10 : 18))) === 0); P.insertAdjacentHTML('beforeend', list.map(([x, y, r]) => `<i class="living lring" style="left:${((x - r) * U).toFixed(1)}px;top:${((y - r * .38) * U).toFixed(1)}px;width:${(r * 2).toFixed(2)}vh;height:${(r * .76).toFixed(2)}vh;--d:${(-d() * 7).toFixed(2)}s"><i></i><i></i></i>`).join('')); }
  // 小屋の壁時計：長針と短針を置いて、見ている人の今の時刻に合わせて回す
  // 置く場所は、両隣の額（枠の外側）のちょうど真ん中。作品の中心どうしの真ん中だと、幅の違う絵のあいだでずれるので
  if (D.clocks?.length) {
    const face = gradeColors(clockFaceSVG(), gradeOf(r.room.scene));
    const edges = r.itemEls.map((el) => { const c = el.querySelector('.canvas'); if (!c) return null; const x = parseFloat(el.style.left), half = parseFloat(c.style.width) / 2 + 1.4 * U; return [x - half, x + half]; });
    P.insertAdjacentHTML('beforeend', D.clocks.map(([x, y, rr]) => {
      let cx = x * U;
      for (let i = 0; i < edges.length - 1; i++) { const a = edges[i], b = edges[i + 1]; if (a && b && a[1] < cx && cx < b[0]) { cx = (a[1] + b[0]) / 2; break; } }
      return `<i class="living wclock" style="left:${(cx - rr * U).toFixed(1)}px;top:${((y - rr) * U).toFixed(1)}px;width:${(rr * 2).toFixed(2)}vh;height:${(rr * 2).toFixed(2)}vh">${face}<i class="hh"></i><i class="mh"></i><i class="cap"></i></i>`;
    }).join(''));
    tickClocks();
  }
  if (D.wins) P.insertAdjacentHTML('beforeend', D.wins.map(([x, y, w, h]) => `<div class="living win-snow" style="left:${(x * U).toFixed(1)}px;top:${(y * U).toFixed(1)}px;width:${w}vh;height:${h}vh">${windowSnowSVG(w, h)}</div>`).join(''));
}
// 立ち止まったときだけ現れる小さな動き（立ち止まる場所ごとに 1 回）：森は鳥が枝から飛び立つ、水辺はトンボが横切る、夕凪はカモメが砂から飛び立つ、夜の庭は流れ星、小屋は火の粉がはじける
const IDLE = { dapple: ['bird', 'props', [-.36, .62], [.45, .05], 2.6], water: ['koijump', 'drift', [-.22, .74], [.22, .74], 1.6], dusk: ['bird', 'props', [-.34, .84], [.5, .1], 2.8], night: ['star', 'drift', [.1, .06], [-.4, .3], 1.4], afterhours: ['spark', 'props', [.3, .78], [.34, .55], 1.8] };
function fireIdle(r, stop) {
  const cfg = IDLE[r.room.id]; if (!cfg || REDUCED) return;
  const [kind, plane, from, to, dur] = cfg, L = $(`.${plane}`, r.el), f = plane === 'drift' ? FACTORS.far : FACTORS.mid, cx = stop * W * f + W / 2;
  const el = document.createElement('div'); el.className = `flyer ${kind}`; el.innerHTML = gradeColors(flyerSVG(kind), gradeOf(r.room.scene));
  el.style.cssText = `--x0:${((cx + from[0] * W) * U).toFixed(0)}px;--y0:${(from[1] * 100 * U).toFixed(0)}px;--x1:${((cx + to[0] * W) * U).toFixed(0)}px;--y1:${(to[1] * 100 * U).toFixed(0)}px;--d:${dur}s`;
  el.addEventListener('animationend', () => el.remove(), { once: true }); L.append(el);
}
function buildProps(r) {
  const L = $('.props', r.el), cfg = STREET[r.room.id];
  if (!cfg) { buildSwimmers(r); buildLiving(r); return; }
  // 部屋の入口の小物は左寄りに。狭い画面でも画面の外にはみ出さないように（小物の幅の半分 + 余白より内側）
  const introX = (kind) => Math.max(W * .16, (PROPS[kind]?.w || 0) / 2 + 3);
  const spots = cfg.intro ? [cfg.introAt != null ? [cfg.introAt, W / 2, cfg.intro] : [0, introX(cfg.intro), cfg.intro]] : [];
  if (cfg.pool.length) for (let i = 1; i < r.items.length; i++) spots.push([i + .5, W / 2, cfg.pool[(i - 1) % cfg.pool.length]]);
  (cfg.extra || []).forEach(([s, kind, dx]) => spots.push([s, W / 2 + (dx === 'right' ? (W < 80 ? 0 : 7) : dx), kind])); // 'right'：広い画面では少し右へ、狭い画面では真ん中（台にかからないように） // dx：金庫などとぶつからないよう横にずらす（vh）
  L.innerHTML = spots.map(([s, x, kind]) => {
    const p = propHTML(kind, r.room.scene);
    if (MUSIC[kind]) p.w *= W < 80 ? 1.9 : 2.1; // 画面つきプレーヤーは、スマホでも画面の絵が見えてタップしやすい大きさに
    else if (r.room.scene === 'attic') p.w *= W < 80 ? 1.25 : 2.1; // 小屋の家具は、絵と比べて小さすぎないように（画面つきプレーヤーは、スマホでも画面の絵が見えてタップしやすい大きさに）
    p.html = gradeColors(p.html, gradeOf(r.room.scene));
    const pos = p.bottom == null ? 'top:0' : `bottom:${p.bottom}vh`;
    const eggKind = kind === 'recordStand' ? 'turntable' : MUSIC[kind] ? 'musicbox' : kind;
    const egg = ['boombox', 'sneakers', 'turntable', 'musicbox'].includes(eggKind) ? ` data-egg="${eggKind}"` : '';
    return `<div class="prop ${p.cls}${egg ? ' egg-prop' : ''}"${egg}${p.track ? ` data-track="${p.track}"` : ''} style="left:${(s * W * FACTORS.mid + x) * U}px;${pos};width:${p.w}vh">${p.html}</div>`;
  }).join('') + roomEggHTML(r.room.id, W, U, r.items.length, W * FACTORS.mid) + birdHTML(r);
  buildSwimmers(r); buildLiving(r); // 小物を置いたあとに足す（innerHTML で消えないように）
}
// インコ：入口の看板の上にいて、森の奥の部屋でもときどき見かける（同じ鳥がついてくる）
// [部屋, 作品と作品のあいだの位置, 横のずれ（vh）, 足もとの高さ（vh）, 左右反転]
const BIRD_SPOTS = { dapple: [1.5, 3, 15.6, false], water: [2.5, -2, 12.4, true] };
function birdHTML(r) {
  const b = BIRD_SPOTS[r.room.id]; if (!b) return '';
  const [s, dx, bottom, flip] = b;
  return `<button class="prop bird-prop${flip ? ' flip' : ''}" aria-label="インコ" style="left:${(s * W * FACTORS.mid + W / 2 + dx) * U}px;bottom:${bottom}vh"><img src="assets/bird.webp" alt="" draggable="false"></button>`;
}
// 砂の上のチラシ：タップすると、砂から拾い上げるように起き上がって画面の真ん中で大きく見られる（もう一度タップか × で砂に戻る）
let flyerView = null, flyerFrom = null;
function flyerRectVars(el, from) {
  // 拾い上げる前のチラシの位置と大きさ（砂の上）から、大きく見る位置まで動かすための差
  el.style.transition = 'none'; el.style.transform = 'none'; // 変形をはずした、大きく見るときの位置を測る
  const to = el.getBoundingClientRect(), sx = from.width / to.width;
  el.style.transform = ''; void el.offsetWidth; el.style.transition = '';
  el.style.setProperty('--fx', `${(from.left + from.width / 2 - (to.left + to.width / 2)).toFixed(1)}px`);
  el.style.setProperty('--fy', `${(from.top + from.height / 2 - (to.top + to.height / 2)).toFixed(1)}px`);
  el.style.setProperty('--fs', sx.toFixed(4));
}
function openFlyer(f) {
  if (!flyerView) {
    flyerView = document.createElement('div');
    flyerView.id = 'flyer-view';
    flyerView.innerHTML = `<button class="fv-close" aria-label="閉じる">×</button><img alt="Hidden Key. のチラシ" src="assets/art/hidden-key-flyer-lg.webp" draggable="false">`;
    document.body.append(flyerView);
    flyerView.addEventListener('click', closeFlyer);
    for (const ev of ['touchmove', 'wheel']) flyerView.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
  }
  flyerFrom = f; f.classList.add('picked');
  const img = flyerView.querySelector('img');
  const go = () => {
    flyerView.classList.remove('open', 'closing'); flyerView.classList.add('show');
    flyerRectVars(img, f.getBoundingClientRect());
    void img.offsetWidth; flyerView.classList.add('open');
  };
  if (img.complete && img.naturalWidth) go(); else img.addEventListener('load', go, { once: true });
}
function closeFlyer() {
  if (!flyerView?.classList.contains('open')) return;
  const img = flyerView.querySelector('img');
  if (flyerFrom) flyerRectVars(img, flyerFrom.getBoundingClientRect());
  flyerView.classList.add('closing'); flyerView.classList.remove('open');
  setTimeout(() => { flyerView.classList.remove('show', 'closing'); flyerFrom?.classList.remove('picked'); flyerFrom = null; }, 560);
}
document.addEventListener('click', (e) => {
  const f = e.target.closest('.sand-flyer'); if (!f) return;
  e.stopPropagation();
  openFlyer(f);
}, true);
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeFlyer(); });
document.addEventListener('click', (e) => {
  const b = e.target.closest('.bird-prop, .sign-bird'); if (!b) return;
  e.stopPropagation();
  // タップすると小さく跳ねる
  b.classList.remove('hop'); void b.getBoundingClientRect(); b.classList.add('hop');
}, true);

// 部屋の背景をタップ／クリックしたときの、小さな反応（作品やボタンの上では何もしない）
// 森＝光の粒がふわっと舞う（絵がかかっている部屋なので、葉は落とさない）、水辺＝波紋と鯉が散る、夕凪＝砂が舞いカモメが飛び立つ、夜の庭＝ホタルが散る、小屋＝ほこりが舞う
document.addEventListener('click', (e) => {
  if (vOpen || e.target.closest('.work, button, a, [data-egg], #viewer, #vault, header, nav')) return;
  const r = currentRoom; if (!r || !e.target.closest('.room')) return;
  const x = e.clientX / vw * 100, y = e.clientY / vh * 100, sc = r.room.scene;
  const add = (n, mk) => { for (let i = 0; i < n; i++) parts.push({ ...mk(), age: 0, ph: R(0, 10), z: 1, theme: sc }); };
  if (sc === 'forest') add(6, () => ({ k: 'mote', vx: R(-1.5, 1.5), vy: R(-3, -1), life: R(1.6, 2.8), s: R(.18, .35), x: x + R(-3, 3), y: y + R(-2, 2) }));
  else if (sc === 'jungle') { add(3, () => ({ k: 'ring', vx: 0, vy: 0, life: R(.9, 1.4), s: R(.6, 1.2), x: x + R(-1, 1), y: y + R(-.5, .5) })); scatter(r, x, y); }
  else if (sc === 'cove') { add(10, () => ({ k: 'sand', vx: R(6, 22), vy: R(-4, -1), life: R(.8, 1.6), s: R(.14, .3), x: x + R(-3, 3), y: y + R(-1, 1) })); scatter(r, x, y); }
  else if (sc === 'night') add(8, () => ({ k: 'firefly', vx: R(-4, 4), vy: R(-4, 2), life: R(2, 4), s: R(.25, .45), x: x + R(-2, 2), y: y + R(-2, 2) }));
  else if (sc === 'attic') add(10, () => ({ k: 'mote', vx: R(-1.5, 1.5), vy: R(-1.2, .3), life: R(3, 6), s: R(.12, .28), x: x + R(-3, 3), y: y + R(-2, 2) }));
});
// 鯉とカモメが、触れたところから逃げる（画面の位置を層の位置に直して、近いものだけ）
function scatter(r, x, y) {
  if (!r.swimmers) return;
  for (const s of r.swimmers) {
    if (s.kind !== 'koi' && s.kind !== 'gull') continue;
    const sx = s.x - r.c * W * s.f, sy = s.y, dx = sx - x, dy = sy - y, d = Math.hypot(dx, dy);
    if (d > 26) continue;
    s.flee = { vx: dx / (d || 1) * 60, vy: dy / (d || 1) * 20, t: 1.2 };
  }
}
// 背景の書き出し（tools/prerender.mjs）用：組み立てた SVG を外から読めるように
if (location.search.includes('prerender')) window.__pre = { W, U, vw, vh, store: SVG_STORE, rooms, get entrance() { return entrance.layerHTML; }, setForestNight, svgDoc };
/* ---------- 入口 ---------- */
const entrance = $('#entrance');
function buildEntrance() {
  const S = sceneForest(W, 1, { entrance: true });
  GRADE = GRADES.forest;
  $('.sky', entrance).style.background = gradeColors(S.sky, GRADE);
  entrance.layerHTML = { '.far': preBox('entrance-far', S.far[0], 'far-r') || svgImg(S.far[0], S.far[1], 'far-r'), '.mid': preBox('entrance-mid', S.mid[0]) || svgImg(...S.mid), '.frame': preBox('entrance-frame', W, 'wind') || svgImg(W, S.frame, 'wind') };
  GRADE = null;
  entrance.attached = false; attachEntrance();
}

/* ---------- 収蔵目録 ---------- */
function buildCatalog() {
  // 森の標本箱：部屋ごとに木の箱。布張りの底に、台紙に載せた作品を元の比率のまま並べ、隅に押し葉
  const grid = $('#catalog-grid');
  grid.innerHTML = ROOMS.map((room) => {
    const specs = WORKS.map((w, i) => [w, i]).filter(([w]) => w.room === room.id).map(([w, i]) => `<button class="spec" data-i="${i}" data-id="${w.id}" aria-label="${esc(w.title)} を見る" style="--ar:${w.aspect}">
        <span class="mount">${w.type === 'video' ? `<img src="${esc(w.poster)}" alt="" loading="lazy"><video muted loop playsinline preload="none" data-src="${esc(w.src)}"></video>` : `<img src="${esc(w.src)}" alt="" loading="lazy">`}</span><i class="pin" aria-hidden="true"></i><span class="name" aria-hidden="true">${esc(w.title)}${w.year ? `<small>${esc(w.year)}</small>` : ''}</span><i class="ask${w.sold ? ' sold' : w.nfs ? ' nfs' : ''}" aria-hidden="true">${w.sold ? 'SOLD OUT' : w.nfs ? 'NOT FOR SALE' : 'ASK'}</i></button>`).join('');
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
  // 開いていく途中で葉がすべて画面の外へ出たら、もう手放してある。また閉じはじめるまでは作り直さない
  if (r.offAt != null) { if (c > 0 && c <= r.offAt + .01) { r.curShown = c; return; } r.offAt = null; }
  r.curShown = c;
  const box = r.box || $('.curtain', r.el);
  box.style.visibility = c > 0 ? 'visible' : 'hidden';
  // 葉のカーテンは閉じかけている間だけ付ける（開いたら外してメモリを空ける）
  if (c <= 0) { if (r.leafEls) { box.innerHTML = ''; r.leafEls = null; } return; }
  if (!r.leafEls) {
    // 前の部屋（や入口）で閉じきっている同じ葉があれば、焼いた絵ごと引き継ぐ（同じ葉を 2 回焼かない）
    // （引き継いだ葉は、このあとすぐこの部屋の開き具合に置き直すので、前の部屋でどこまで閉じていたかは問わない）
    const donor = [entranceCurtain, ...rooms.map((x) => x.leaveC)].find((d) => d && d !== r && d.leaves === r.leaves && d.leafEls && d.curShown > 0);
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
  // 開いていく途中で、葉がすべて画面の外へ出たら、止まるのを待たずに手放す（開ききるまでの数秒、画像を持ち続けないように）
  if (r.lastC != null && c < r.lastC && r.leaves.every((q) => { const [bx, , bw] = q.bb || [0, 0, q.box], k = ease(clamp(o * (1 + q.delay) - q.delay)), x0 = q.x + bx + q.dx * k; return x0 + bw < 0 || x0 > W; })) {
    box.innerHTML = ''; r.leafEls = null; box.style.visibility = 'hidden'; r.offAt = c;
  }
  r.lastC = c;
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
const WQ = Math.min(devicePixelRatio || 1, 2, Math.max(.75, pxCap(1.6e6))), TILE = 256; // canvas は画面と同じ細かさ（最大 2 倍、画素の数は 160 万まで）。光の網目はやわらかいので、パソコンでは少し粗くしても見分けがつかない
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

// 絵の色が部屋ににじみ出す：作品の前でしばらく立ち止まると、作品の上下左右のふちの色が、まわりの空気にじわっと広がる
// （作品より奥の層。作品そのものには何も重ねない）。歩きだすと、ゆっくり元の景色に戻る
function updateBleed(r, focus, now) {
  const el = r.bleedEl || (r.bleedEl = q(r, '.bleed')); if (!el) return;
  const k = Math.round(r.c), it = r.items[k - 1];
  const want = focus > .85 && it?.work && WORK_COLORS[it.work.id] ? k : null;
  if (want !== r.bleedWant) { r.bleedWant = want; r.bleedSince = now; if (r.bleedShown != null) { el.classList.remove('on'); r.el.classList.remove('bleeding'); r.bleedShown = null; } return; }
  if (want == null || r.bleedShown === want || now - r.bleedSince < 1400) return;
  const cv = r.itemEls?.[k - 1]?.querySelector('.canvas'); if (!cv) return;
  const b = cv.getBoundingClientRect(); if (!b.width) return;
  const [ct, cr, cb, cl] = WORK_COLORS[it.work.id];
  // 位置と大きさは画面に対する %（スマホで層を小さくして拡大する仕組みでも、同じ見た目になるように）
  const X = (v) => (v / vw * 100).toFixed(2), Y = (v) => (v / vh * 100).toFixed(2);
  const cx = X(b.left + b.width / 2), cy = Y(b.top + b.height / 2), bw = b.width / vw * 100, bh = b.height / vh * 100;
  const g = (x, y, rx, ry, c) => `radial-gradient(${rx.toFixed(1)}% ${ry.toFixed(1)}% at ${x}% ${y}%, ${c}cc, ${c}4d 50%, ${c}00 100%)`;
  el.style.background = [
    g(cx, Y(b.top), bw * .95, bh * .55, ct), g(X(b.right), cy, bw * .75, bh * .85, cr),
    g(cx, Y(b.bottom), bw * .95, bh * .45, cb), g(X(b.left), cy, bw * .75, bh * .85, cl),
  ].join(', ');
  el.classList.add('on'); r.el.classList.add('bleeding'); r.bleedShown = want;
}

// 帰り道の跡を置く場所：最初の作品（小屋は扉）の左どなりの、作品の枠や台・小物に重ならないところ
const TRACE_FEET = { forest: 93, jungle: 91, cove: 90.5, night: 91.5, attic: 93.5 };
function traceSpot(r) {
  const sc = r.room.scene, w0 = r.items[0]?.work;
  let half = 9;
  if (w0) { let wh = Math.min(56, (W * .74) / w0.aspect); if (W < 70) wh = Math.min(wh, 46); half = wh * w0.aspect / 2; }
  const x = sc === 'attic' && W < 70 && r.boardX != null ? r.boardX - 5 : W + W / 2 - half - (W < 70 ? 5.5 : 9); // 小屋の前：広い画面はボードと扉のあいだ、狭い画面はボードの左
  return [x, TRACE_FEET[sc] || 93];
}
// 帰り道：小屋の中まで行って引き返すと、行きには無かったものが残っている
// （森はランタン、水辺は紙の舟、浜と雪は奥へ続く足あと、夜の庭は湯気の立つコーヒー）
let returning = false;
const prints = (x, y, c, n = 7) => Array.from({ length: n }, (_, i) => { const k = 1 - i * .09, s = i % 2 ? 1 : -1; return `<ellipse cx="${n2(x + s * .85 * k + i * .35)}" cy="${n2(y - i * 1.7 * k)}" rx="${n2(.72 * k)}" ry="${n2(.34 * k)}" fill="${c}" opacity="${n2(.62 - i * .06)}"/>`; }).join(''); // 奥へ続く足あと（奥ほど小さく薄く）
function traceHTML(r) {
  const sc = r.room.scene, [x, y] = traceSpot(r), G = (svg) => gradeColors(svg, gradeOf(sc));
  if (x == null) return '';
  // sc：絵の大きさの倍率（足もとを基準に大きくする）
  const box = (x0, y0, w, h, body, cls = '', sc = 1) => `<svg class="living trace ${cls}" viewBox="${n2(x0)} ${n2(y0)} ${w} ${h}" style="left:${(x0 * U).toFixed(1)}px;top:${(y0 * U).toFixed(1)}px;width:${w}vh;height:${h}vh${sc !== 1 ? `;transform:scale(${sc});transform-origin:50% 100%` : ''}" aria-hidden="true">${G(body)}</svg>`;
  switch (sc) {
    case 'forest': { // ランタン（小屋から持ってきた灯り）。台の上の光がゆらぐ
      const lx = x + 1.5, ly = y;
      return `<i class="living trace lantern-glow" style="left:${((lx - 7) * U).toFixed(1)}px;top:${((ly - 11.5) * U).toFixed(1)}px"></i>`
        + box(lx - 1.3, ly - 4.2, 2.6, 4.4, `<path d="M${n2(lx - .45)} ${n2(ly - 3.9)}h.9v.5h-.9z" fill="#34322d"/><path d="M${n2(lx - .5)} ${n2(ly - 3.95)}a.5 .45 0 0 1 1 0h-.25a.25 .22 0 0 0-.5 0z" fill="#34322d"/><rect x="${n2(lx - 1.05)}" y="${n2(ly - 3.4)}" width="2.1" height="3" rx=".3" fill="#2f2d29"/><rect x="${n2(lx - .78)}" y="${n2(ly - 3.1)}" width="1.56" height="2.4" rx=".15" fill="#f6c46a"/><path d="M${n2(lx)} ${n2(ly - 2.6)}c.35 .5 .35 1 0 1.5c-.35-.5-.35-1 0-1.5z" fill="#fff0c4"/><rect x="${n2(lx - 1.2)}" y="${n2(ly - .45)}" width="2.4" height=".45" rx=".1" fill="#2f2d29"/>`, 'lantern', 1.9);
    }
    case 'jungle': // 紙の舟：桟橋の手前の水に、ゆっくり揺れる
      return box(x + 2, 83.6, 4, 2.6, `<path d="M${n2(x + 2.2)} 84.9h3.6l-.55 1H${n2(x + 2.75)}z" fill="#e6e0cf"/><path d="M${n2(x + 3.2)} 84.9l.8-1.15.8 1.15z" fill="#f3efe2"/><path d="M${n2(x + 4)} 83.75v1.15l.8 0z" fill="#d9d2bf"/><ellipse cx="${n2(x + 4)}" cy="86.05" rx="2" ry=".2" fill="#1d2a1c" opacity=".25"/>`, 'paperboat', 1.5);
    case 'cove': { const px = x - (W < 70 ? 1 : 3), py = 97.5; return box(px - 3, py - 11, 7, 11.8, prints(px, py + .2, '#5e4630'), '', 1.7); } // 岩や潮だまりをよけて、手前の砂の上に
    case 'attic': return box(x - 3, y - 11, 7, 11.8, prints(x, y + .2, '#6f76a3'), '', 1.6);
    case 'night': // 手すりの前に、湯気の立つ紙のコップ
      return box(x + .8, y - 2.1, 1.6, 2.2, `<path d="M${n2(x + 1)} ${n2(y - 1.75)}h1.2l-.15 1.7h-.9z" fill="#e8e0cf"/><path d="M${n2(x + .95)} ${n2(y - 2)}h1.3v.3h-1.3z" fill="#5b4334"/><path d="M${n2(x + 1.06)} ${n2(y - 1.2)}h1.08l-.05.6h-.98z" fill="#8a5a3c"/>`, '', 1.8)
        + `<div class="living trace steam" style="left:${((x + 1.6 - 1) * U).toFixed(1)}px;top:${((y - 3.9 - 4) * U).toFixed(1)}px"><i></i><i></i><i></i></div>`;
    default: return '';
  }
}
function updateTraces(r) {
  if (!returning || r.room.scene === 'attic' && r.c >= 1.5) return;
  const P = q(r, '.props'); if (!P || P.querySelector('.trace')) return;
  P.insertAdjacentHTML('beforeend', traceHTML(r));
}

function updateRoom(r, now) {
  manageMemory(r);
  const { top, len } = roomMetrics(r);
  const p = clamp((sy - top) / len);
  const onScreen = sy + vh > top && sy < top + len + vh;
  if (onScreen !== r.live) { r.live = onScreen; r.el.classList.toggle('live', onScreen); }
  if (!onScreen) {
    pauseRoomVideos(r); updateCurtain(r, 0); if (r.leaveC) updateCurtain(r.leaveC, 0); r.curS = null;
    // 水辺の光る水の canvas も空にする（部屋を離れたあとも画像を持ち続けないように）
    const cv = r.water?._cv; if (cv?.width) { cv.width = 0; cv.height = 0; r.water._g = null; }
    return;
  }
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
    const c = r.c, sticky = q(r, '.stage'), flash = q(r, '.flash'); // 拡大は .sticky ではなく中の .stage に（iPhone の Safari は、貼りつく要素そのものを拡大すると位置と大きさがずれて、画面の端が抜ける）
    if (c > 1 && c < 2) cam = c < 1.5 ? 1 : 2;
    const zin = c > 1 && c < 1.5 ? smooth(1.02, 1.47, c) : 0;
    const settle = c >= 1.5 && c < 2 ? 1 - smooth(1.5, 1.95, c) : 0;
    // スマホは寄りを控えめに：何画面ぶんもある横長の層をまとめて大きく拡大すると、iPhone が描き切れずに画面の端が抜ける。
    // 寄りは 1.9 倍までにして、そのぶん灯りを早めに満たす（寄り切る前に暖かい光が画面を包む）
    const scale = zin > 0 ? Math.pow(COARSE ? 1.9 : 5.5, zin) : 1 + settle * .18;
    put(sticky, 'transformOrigin', zin > 0 ? '50% 63%' : '50% 55%');
    put(sticky, 'transform', scale > 1.0005 ? `scale(${scale.toFixed(4)})` : '');
    put(flash, 'opacity', (c < 1.5 ? (COARSE ? smooth(1.12, 1.38, c) : smooth(1.26, 1.48, c)) : 1 - smooth(1.5, 1.72, c)).toFixed(3));
  }
  r.cam = cam;
  // 小屋の中の最初の作品の前では、画面の左端がちょうど外壁との境目。
  // マウスや傾きで背景が右へずれると外の雪がのぞくので、室内にいる間はその向きのずれを止める
  const mxc = r.room.scene === 'attic' && cam >= 1.5 && cam < 2.6 ? Math.max(mx, 0) : mx;
  // 傾き・マウスの視差で層を動かすとき、層の絵の端が画面の内側に入らないように、はみ出している分までに抑える
  // （縦は層の絵が画面ぴったりなので動かさない：上下の端に奥の空が帯のように見えてしまう）
  const tr = (sel, f, extra = '') => { const pw = W + (r.stops - 1) * W * f + 40, x = Math.min(0, Math.max(-(pw - W), -(cam * W * f) - mxc * f * 2)); put(q(r, sel), 'transform', `translate3d(${(x * U).toFixed(2)}px, 0px, 0)${extra}`); };
  tr('.far', FACTORS.far); tr('.drift', FACTORS.far); tr('.mid', FACTORS.mid); tr('.props', FACTORS.mid); tr('.art', FACTORS.mid); tr('.move', FACTORS.move);
  if (r.room.scene === 'jungle') updateWater(r, p, cam, mxc, now);
  // 部屋の出入りで、手前の植物をくぐる
  const enter = 1 - smooth(0, .035, p), leave = smooth(.95, 1, p);
  // 葉のカーテンは、スクロールに遅れてゆっくりひらく／閉じる（速くスワイプしても葉がふわっと動く）
  const dtc = Math.min(.1, (now - (r.lastNow ?? now)) / 1000); r.lastNow = now;
  // 入るときのカーテン（この部屋の葉）はゆっくり追いかけてひらく。
  // 出るときは、次の部屋の葉のカーテンがスクロールどおりに閉じる。閉じきったところで次の部屋（真下に重ねてある）に入れ替わり、
  // そのまま同じ葉がひらくので、部屋の切り替わりが見えない（最後の部屋だけは自分の葉で閉じる）
  const next = rooms[rooms.indexOf(r) + 1];
  // 部屋の絵がまだ描き終わっていなければ、葉のカーテンは閉じたまま待つ（描きかけの部屋を見せない）。ただし待つのは 2.5 秒まで
  const painted = layersPainted(r);
  if (painted) r.holdSince = null; else if (r.holdSince == null) r.holdSince = now;
  const hold = !painted && now - r.holdSince < 2500;
  const target = hold ? 1 : next ? enter : Math.max(enter, leave);
  r.curS = r.curS == null ? target : r.curS + (target - r.curS) * (1 - Math.exp(-dtc / .9));
  if (Math.abs(r.curS - target) < .015) r.curS = target; // ほぼ開いた（閉じた）ら、そこで止める（端に葉が残らないように）
  // 作品の前では、手前の植物が少しひらいて作品に場所をゆずる
  const at = 1 - smooth(.05, .35, Math.abs(r.c - Math.round(r.c)));
  const focus = r.c > .5 ? at : 0;
  // 作品の前の暗がり（周辺の減光と、しずまり）。部屋全体ではなく、使う要素にだけ渡す
  const fv = focus.toFixed(3); put(q(r, '.vig'), '--focus', fv); put(q(r, '.hush'), '--focus', fv);
  updateBleed(r, focus, now);
  if (!returning && r.room.scene === 'attic' && r.c >= 2) returning = true; // 小屋の中の作品の前まで来たら、帰り道に跡が出る
  updateTraces(r);
  // 光の流れ・次の部屋の気配は、部屋の中にいる間だけ（葉のカーテンが開いている間）。いま見ている部屋だけに付けて軽く
  r.el.classList.toggle('lit', p > .015 && p < .985);
  put(q(r, '.lightplay'), '--p', p.toFixed(3));
  // 部屋の入口の小さなアニメーション（落ち葉・カモメ・ホタルなど）は、入口にいる間だけ。最初の作品へ歩き出すと消える（作品に重ならないように）
  { const io = Math.max(0, Math.min(1, 1 - r.c / .4)); const el = q(r, '.room-intro'); if (el) { put(el, 'opacity', io.toFixed(3)); put(el, 'visibility', io > 0 ? 'visible' : 'hidden'); } }
  // 部屋の終わりが近づくと、次の部屋の光の色が右からこぼれてくる（葉のカーテンが閉じると引く）
  put(q(r, '.nextglow'), '--nextk', (next ? smooth(.76, .93, p) * (1 - smooth(.965, .995, p)) : 0).toFixed(3));
  r.el.classList.toggle('focus', focus > .6);
  updateSwimmers(r, now, focus);
  // 立ち止まって 2.5 秒たったら、その場所で 1 回だけ小さな動き
  if (focus > .6 && currentRoom === r) { const k = Math.round(r.c); if (r.idleAt !== k) { r.idleAt = k; r.idleSince = now; r.idleFired = false; } else if (!r.idleFired && now - r.idleSince > 2500) { r.idleFired = true; fireIdle(r, k); } } else r.idleAt = -1;
  const fs = 1 + Math.max(r.curS * .45, leave * .6) + focus * .05;
  // 額縁（手前の葉）は、拡大してはみ出している分の中でだけ動かす
  { const sc = fs + kick * .006, ox = (sc - 1) / 2 * W, oy = (sc - 1) / 2 * 100, fx = Math.max(-ox, Math.min(ox, -mx * 2.4)), fy = Math.max(-oy, Math.min(oy, -my * 1.6));
    put(q(r, '.frame'), 'transform', `translate3d(${(fx * U).toFixed(2)}px, ${(fy * U).toFixed(2)}px, 0) scale(${sc.toFixed(4)})`); }
  // 部屋の出入りで、葉のカーテンが閉じて開く
  // 真上の部屋（入口）がまだ見えている間は、自分のカーテンを作らない（閉じきったら、その葉を引き継ぐ）
  const above = rooms.indexOf(r) ? rooms[rooms.indexOf(r) - 1].el : entrance;
  if (above.classList.contains('gone')) updateCurtain(r, r.curS);
  if (next && next.leaves) {
    r.leaveC = r.leaveC || { el: r.el, box: $('.curtain-leave', r.el), leafEls: null, curShown: -1 };
    r.leaveC.leaves = next.leaves; r.leaveC.curtainHTML = next.curtainHTML;
    // 隠した部屋（次の部屋に入れ替わった後）では作らない。作ると、閉じた葉だけが上へ流れていき、下の端がまっすぐ見える
    // 隠した部屋（次の部屋に入れ替わった後）では、閉じきった形のまま置いておき、次の部屋に葉を渡す（渡したあとは作り直さない）
    if (r.el.classList.contains('gone')) { if (r.leaveC.leafEls) updateCurtain(r.leaveC, 1); } else updateCurtain(r.leaveC, leave);
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
    // （離れた作品を薄くはしない：板や額が半透明になって、後ろの砂や海が透けて見えるので）
    el.classList.toggle('near', d < .25);
    if (d < best) { best = d; near = i; }
    const v = el.querySelector('video');
    if (v) {
      // 動画は、作品に近づく少し前から読み込みはじめ（着いたときに待たせない）、作品の前で立ち止まっているときは
      // その作品の動画だけを動かす（隣の作品は画面の外）。作品と作品のあいだでは両方が動く
      if (d < 1.6 && !v.getAttribute('src') && v.dataset.vsrc) { v.src = v.dataset.vsrc; delete v.dataset.vsrc; v.preload = 'auto'; v.load(); }
      if (d < (COARSE ? .8 : 1.1)) {
        if (v.paused && v.getAttribute('src')) v.play().catch(() => {});
      } else {
        if (!v.paused) v.pause();
        // 離れた動画は読み込んだ中身ごと手放す（止めるだけだとメモリに残る）。表紙の絵はそのまま見える
        if (d > 1.9 && v.getAttribute('src')) { v.dataset.vsrc = v.getAttribute('src'); v.removeAttribute('src'); v.load(); }
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
if (location.search.includes('memdebug')) { window.__rooms = rooms; window.__entC = entranceCurtain; } // 点検用
// 入口で動くもの：遠くの空を渡る小鳥の群れ、小道のわきの花にとまる白い蝶。中景と同じ拡大・視差で動く
let entLife = null;
function buildEntranceLife() {
  const L = $('.life', entrance); if (!L || entLife) return;
  L.innerHTML = Array.from({ length: 5 }, (_, i) => `<div class="swimmer gull ent-bird" style="width:${(1.3 + Math.random() * .7).toFixed(2)}vh"><img alt="" src="${swimURL('gull', i, 'forest')}"></div>`).join('')
    + [0, 1, 2].map((i) => `<div class="swimmer butterfly" style="width:1.6vh"><img alt="" src="${swimURL('butterfly', i, 'forest')}"></div>`).join('')
    // 小道の木漏れ日：梢の葉が風に揺れるのに合わせて、光のまだらがちらちら明るくなったり小さくなったりする（小道の上だけ）
    + Array.from({ length: 12 }, (_, i) => { const t = .45 + Math.random() * .55, [px, py] = ENTRANCE_PATH(W)(t), half = Math.min(W * .3, 32) * Math.pow(t, 1.15) * .8, w = (1.2 + t * 4.5) * (.7 + Math.random() * .6);
      return `<i class="fleck" style="left:${((px + (Math.random() * 2 - 1) * half - w / 2) * U).toFixed(1)}px;top:${((py - w * .12) * U).toFixed(1)}px;width:${w.toFixed(2)}vh;height:${(w * .3).toFixed(2)}vh;animation-duration:${(2.2 + Math.random() * 2.4).toFixed(1)}s;animation-delay:${(-Math.random() * 4).toFixed(1)}s"></i>`; }).join('');
  const birds = [...L.querySelectorAll('.ent-bird')].map((el, i) => ({ el, x0: Math.random() * W, y0: 22 + Math.random() * 14, sp: 1.6 + Math.random() * .8, ph: Math.random() * 6 }));
  const flies = [...L.querySelectorAll('.butterfly')].map((el, i) => ({ el, x0: i < 2 ? W * (.12 + Math.random() * .18) : W * (.68 + Math.random() * .2), y0: 86 + Math.random() * 8, ph: Math.random() * 6 }));
  entLife = { L, birds, flies };
}
function updateEntranceLife(origin, transform) {
  if (!entLife) return;
  const t = REDUCED ? 0 : performance.now() / 1000;
  entLife.L.style.transformOrigin = origin; entLife.L.style.transform = transform;
  for (const b of entLife.birds) { const x = ((b.x0 + t * b.sp) % (W + 20)) - 10, y = b.y0 + Math.sin(t * .6 + b.ph) * 1.2; put(b.el, 'transform', `translate3d(${(x * U).toFixed(1)}px, ${(y * U).toFixed(1)}px, 0)`); }
  for (const f of entLife.flies) { const x = f.x0 + Math.sin(t * .5 + f.ph) * 4, y = f.y0 + Math.sin(t * 1.3 + f.ph) * 1.5 - Math.abs(Math.sin(t * .5 + f.ph)) * 3; put(f.el, 'transform', `translate3d(${(x * U).toFixed(1)}px, ${(y * U).toFixed(1)}px, 0) rotate(${(90 + Math.cos(t * .5 + f.ph) * 25).toFixed(1)}deg)`); }
}
function updateEntrance() {
  buildEntranceLife();
  const len = GEO.entH - vh, p = clamp(sy / len);
  const mx = mouse.x, my = mouse.y;
  // 傾き・マウスの視差は、拡大してはみ出している分までに抑える（絵の端が画面の内側に入って隙間が見えないように）
  const lim = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  { const sf = 1 + p * .08, fwE = W + 40, fx = lim(-mx * .6, -((sf - 1) * fwE * .5 + fwE - W), (sf - 1) * fwE * .5), fy = lim(-my * .4, -(sf - 1) * 30, (sf - 1) * 70);
    $('.far', entrance).style.transform = `translate3d(${fx * U}px, ${fy * U}px, 0) scale(${sf})`; }
  // 地面（中景）は、看板の足もとを中心に寄っていく。看板の足もとの地面は動かないので、画面に立てたままの看板が地面から離れない
  const sign = $('.sign', entrance);
  if (!sign._foot) { const cs = getComputedStyle(sign); sign._foot = [(parseFloat(cs.left) + parseFloat(cs.width) / 2) / U, 100 - parseFloat(cs.bottom) / U - .6]; }
  const [FX, FY] = sign._foot, zoom = .22;
  const midEl = $('.mid', entrance);
  midEl.style.transformOrigin = `${FX * U}px ${FY * U}px`;
  const sm = 1 + p * zoom, mwE = W + 40, gx0 = lim(-mx * 1.4, -((sm - 1) * (mwE - FX) + mwE - W), (sm - 1) * FX), gy0 = lim(-my * .8, -(sm - 1) * (100 - FY), (sm - 1) * FY);
  midEl.style.transform = `translate3d(${gx0 * U}px, ${gy0 * U}px, 0) scale(${sm})`;
  updateEntranceLife(midEl.style.transformOrigin, midEl.style.transform);
  sign.style.translate = $('.sign-bird', entrance).style.translate = `${gx0 * U}px ${gy0 * U}px`; // マウスの視差だけは地面と一緒に
  { const sfr = 1 + p * 1.7, ox = (sfr - 1) / 2 * W, oy = (sfr - 1) / 2 * 100;
    $('.frame', entrance).style.transform = `translate3d(${lim(-mx * 3, -ox, ox) * U}px, ${lim(-my * 2, -oy, oy) * U}px, 0) scale(${sfr})`; }
  // 案内人は小道の中心線の上を、奥へ歩いていく（中景と同じ拡大・視差をかけて、道から外れないように）
  const t0 = .507, tg = t0 - Math.min(p, .9) * .42, [X, Y] = ENTRANCE_PATH(W)(tg), s = 1 + p * zoom;
  // 中景の 1 点 (x, y) が、いま画面のどこに見えるか（中景と同じ拡大・視差）
  const onGround = (x, y) => [FX + (x - FX) * s + gx0, FY + (y - FY) * s + gy0];
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
    // 暗がりと灯りの層は、入口の奥へ進むにつれて拡大される。画面上のランプの位置を、その層の中の位置に直して渡す
    // （そのまま渡すと、拡大のぶんだけ光の中心がランプから上へずれていく）
    const b = GEO.lamp, cx = b.left + b.width / 2, cy = b.top + b.height * .16;
    entrance.querySelectorAll('.nightfall, .lamplight').forEach((el) => {
      const r = el.getBoundingClientRect(), kx = r.width / (el.offsetWidth || 1) || 1, ky = r.height / (el.offsetHeight || 1) || 1;
      put(el, '--lx', `${((cx - r.left) / kx).toFixed(1)}px`); put(el, '--ly', `${((cy - r.top) / ky).toFixed(1)}px`);
    });
  }
  // 案内人が奥へ消えたら、最初の部屋と同じ葉のカーテンが左右から閉じる。
  // 閉じきったところで最初の部屋（入口の真下に重ねてある）へ入れ替わるので、つなぎ目は見えない
  // （入口を過ぎて隠したあとは、葉は最初の部屋に渡してあるので、ここでは作り直さない）
  const r0 = rooms[0];
  if (r0?.leaves && !entrance.classList.contains('gone')) {
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
if (location.search.includes('memdebug')) window.__parts = parts; // 点検用
const R = (a, b) => a + Math.random() * (b - a);
const THEMES = {
  // 落ち葉は、絵がかかっていない場面（入口・部屋の入口）でだけ。作品が画面に入ったら出さない（spawn で止める）
  forest: [[5, () => ({ k: 'mote', vx: R(-.5, .5), vy: R(-.6, .2), life: R(5, 9), s: R(.15, .35), x: R(0, 100), y: R(10, 90) })],
    [2, () => ({ k: 'leaf', vx: R(-1, 2), vy: R(3, 6), life: R(8, 12), s: R(.8, 1.3), x: R(0, 100), y: -5, col: ['#a5c23e', '#769721', '#c9d77a'][Math.floor(R(0, 3))] })]],
  // （部屋の中を漂うキラキラ（四つ星の光）は出さない：作品の前で浮いて見えるので。さわったときの小さな反応だけに残す）
  jungle: [[4, () => ({ k: 'leaf', vx: R(-1, 2), vy: R(3, 6), life: R(8, 12), s: R(.8, 1.4), x: R(0, 100), y: -5, col: ['#a5c23e', '#769721', '#47733c'][Math.floor(R(0, 3))] })],
    [3, () => ({ k: 'firefly', vx: R(-.8, .8), vy: R(-.6, .6), life: R(4, 7), s: R(.25, .4), x: R(0, 100), y: R(30, 85) })]],
  cove: [[6, () => ({ k: 'sand', vx: R(18, 30), vy: R(-1, 1), life: R(1.5, 2.5), s: R(.12, .28), x: R(-10, 60), y: R(78, 100) })]],
  // 小屋の外は雪。中には漂う粒を出さない（ほこりの白い点は、壁の前で雪のように浮いて見えて不自然なので。背景をさわったときの反応だけ残す）
  snow: [[9, () => ({ k: 'snow', vx: R(-1.2, 1.2), vy: R(3, 6), life: R(8, 14), s: R(.18, .45), x: R(-5, 105), y: -3 })]],
  attic: [],
  night: [[5, () => ({ k: 'firefly', vx: R(-.8, .8), vy: R(-.6, .4), life: R(4, 8), s: R(.25, .45), x: R(0, 100), y: R(40, 95) })],
    [1, () => ({ k: 'smoke', vx: R(.6, 1.6), vy: R(-.8, -.3), life: R(7, 10), s: R(4, 7), x: R(0, 100), y: R(55, 85) })]],
};
// 落ち葉は、作品の枠の列には落とさない（枠の後ろに消えていくように見えるので）。作品と作品のあいだの空いたところだけを落ちる
const LEAF_PAD = 7; // 枠の左右の余白（画面の幅の %）。葉は落ちながら少し横に流れるので、そのぶんも見込む
function leafGaps() {
  const rects = GEO.workRects; if (!rects || !rects.length) return null;
  const bands = rects.map((b) => [b.left / vw * 100 - LEAF_PAD, b.right / vw * 100 + LEAF_PAD]).sort((a, b) => a[0] - b[0]);
  const gaps = []; let x = 0;
  for (const [l, r] of bands) { if (l - x > 4) gaps.push([x, l]); x = Math.max(x, r); }
  if (100 - x > 4) gaps.push([x, 100]);
  return gaps;
}
// 天候は通り雨のように、ときどきだけ（40 秒ごとに 9 秒ほど。強まって弱まる）。雪の吹雪も同じ波で強弱をつける
const WEATHER = new Set(['sand']);
function gust(now) { const t = (now / 1000) % 40; return t < 9 ? Math.sin(t / 9 * Math.PI) : 0; }
function spawn(theme, rate, dt, list, zRange = [1, 1]) {
  if (REDUCED) return;
  const gaps = leafGaps(), g = gust(performance.now());
  THEMES[theme].forEach(([r, make]) => {
    const probe = make();
    let n = r * rate * dt * (WEATHER.has(probe.k) ? g : probe.k === 'snow' ? .6 + g * 1.2 : 1);
    if (n <= 0) return;
    while (n > 0) {
      if (Math.random() < n) {
        const q = { ...make(), age: 0, ph: R(0, 10), z: R(...zRange), theme };
        if (q.k === 'leaf' && (GEO.workRects?.length || list !== parts)) { n -= 1; continue; } // 絵がかかっている場面（とビューア）では、葉を落とさない
        if (q.k === 'leaf' && gaps) {
          if (!gaps.length) { n -= 1; continue; }
          const total = gaps.reduce((a, [l, r]) => a + (r - l), 0); let pick = Math.random() * total, g = gaps[0];
          for (const gg of gaps) { if (pick < gg[1] - gg[0]) { g = gg; break; } pick -= gg[1] - gg[0]; }
          q.x = g[0] + 1 + Math.random() * Math.max(0, g[1] - g[0] - 2); q.vx = R(-.4, .5);
        }
        list.push(q);
      }
      n -= 1;
    }
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
    case 'rain': c.strokeStyle = 'rgba(235,242,236,.45)'; c.lineWidth = Math.max(1, s * .28); c.beginPath(); c.moveTo(sx, sy2); c.lineTo(sx + q.vx * s * .08, sy2 - s * 5); c.stroke(); break;
    case 'ring': c.globalAlpha = a * .5; c.strokeStyle = 'rgba(233,240,208,.8)'; c.lineWidth = 1; c.beginPath(); c.ellipse(sx, sy2, s * (1 + q.age * 6), s * .32 * (1 + q.age * 6), 0, 0, 7); c.stroke(); break;
    case 'sand': c.globalAlpha = a * .5; c.fillStyle = '#e6d6b8'; c.beginPath(); c.ellipse(sx, sy2, s * 3, s * .5, 0, 0, 7); c.fill(); break;
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
  GEO.workRects = currentRoom ? [...currentRoom.el.querySelectorAll('.work .canvas')].map((el) => el.getBoundingClientRect()).filter((b) => b.width && b.right > 0 && b.left < innerWidth) : null;
  if (RASTER) tickTiles();
  if (PRE) tickPre();
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
    // 水面に落ちた雨粒は、そこに波紋を残す
    if (q.ring && q.y > R(40, 96)) { q.ring = false; q.k = 'ring'; q.vx = 0; q.vy = 0; q.age = 0; q.life = .9; q.s = .6; }
  }
}

/* =========================================================
   作品の中へ（没入ビューア）
   ========================================================= */
const viewer = $('#viewer'), vScreen = $('#v-screen'), wash = $('#v-wash'), wctx = wash.getContext('2d', { willReadFrequently: true });
const vWalls = [...viewer.querySelectorAll('.v-wall, .v-floor')].map((c) => ({ c, x: c.getContext('2d') }));
const vfx = $('#v-fx'), vctx = vfx.getContext('2d');
let vOpenedAt = 0, vPoster = null, vOpen = false, vWork = null, vMedia = null, vParts = [], vGlow = [255, 220, 180], vTarget = [255, 220, 180], vSample = 0;
// 作品の裏：木枠に張った麻布。木枠は木目と四隅の斜めの継ぎ目、くさび。麻布は木枠の外側へ巻き込んでホッチキスで留め、角は折りたたむ。
// その上に作品ラベル（サイン・題名・年・技法・通し番号）とマスキングテープ、ギャラリーのスタンプ
let backSeq = 0;
function backSVG(w) {
  const id = `bk${backSeq++}`, X = 1000, Y = Math.round(1000 / w.aspect), m = Math.min(X, Y), B = m * .115, wr = B * .34;
  const n = (v) => Math.round(v * 10) / 10;
  // 木枠：上下は横向き、左右は縦向きの木目。四隅は 45 度で合わせる
  const bars = [
    [`0,0 ${X},0 ${n(X - B)},${n(B)} ${n(B)},${n(B)}`, 'h'], [`0,${Y} ${X},${Y} ${n(X - B)},${n(Y - B)} ${n(B)},${n(Y - B)}`, 'h'],
    [`0,0 0,${Y} ${n(B)},${n(Y - B)} ${n(B)},${n(B)}`, 'v'], [`${X},0 ${X},${Y} ${n(X - B)},${n(Y - B)} ${n(X - B)},${n(B)}`, 'v'],
  ];
  const brace = w.aspect < .9 ? [`${n(B)},${n(Y / 2 - B * .45)} ${n(X - B)},${n(Y / 2 - B * .45)} ${n(X - B)},${n(Y / 2 + B * .45)} ${n(B)},${n(Y / 2 + B * .45)}`, 'h'] : null;
  const wood = ([pts, dir]) => `<polygon points="${pts}" fill="url(#${id}w${dir})"/><polygon points="${pts}" fill="#000" filter="url(#${id}g${dir})" clip-path="none" style="mix-blend-mode:multiply" opacity=".9"/>`;
  // 木枠の内側のふち：面取りの明るい帯と、麻布に落ちる影
  const inner = (x, y, ww, hh, dir) => `<rect x="${n(x)}" y="${n(y)}" width="${n(ww)}" height="${n(hh)}" fill="url(#${id}s${dir})"/>`;
  const sh = B * .55;
  // ホッチキスの針（巻き込んだ麻布の帯の上に、等間隔に）
  const staples = [];
  const st = (x, y, rot) => staples.push(`<g transform="translate(${n(x)} ${n(y)}) rotate(${rot})"><rect x="-13" y="-2.6" width="26" height="5.2" rx="1.4" fill="url(#${id}m)"/><rect x="-13" y="-2.6" width="26" height="1.6" rx=".8" fill="#fff" opacity=".35"/></g>`);
  for (let x = B * 1.6; x < X - B * 1.4; x += 110) { st(x, wr * .5, 0); st(x, Y - wr * .5, 0); }
  for (let y = B * 1.6; y < Y - B * 1.4; y += 110) { st(wr * .5, y, 90); st(X - wr * .5, y, 90); }
  // 角の折りたたみ（麻布を三角に折って重ねる）
  const f = wr * 2.1, corners = [[0, 0, 1, 1], [X, 0, -1, 1], [0, Y, 1, -1], [X, Y, -1, -1]].map(([cx, cy, sx, sy]) => `<polygon points="${cx},${cy} ${n(cx + sx * f)},${cy} ${cx},${n(cy + sy * f)}" fill="url(#${id}lin)"/><polygon points="${cx},${cy} ${n(cx + sx * f)},${cy} ${cx},${n(cy + sy * f)}" fill="url(#${id}fold)" transform="translate(${cx} ${cy}) scale(${sx} ${sy}) translate(${-cx} ${-cy})"/>`).join('');
  // くさび（四隅の継ぎ目の内側に 2 枚ずつ）
  const wedge = (x, y, a) => `<g transform="translate(${n(x)} ${n(y)}) rotate(${a})"><polygon points="0,-6 ${n(B * .55)},-9 ${n(B * .55)},9 0,6" fill="#9c7243"/><polygon points="0,-6 ${n(B * .55)},-9 ${n(B * .55)},-4 0,-2" fill="#c49a66" opacity=".7"/></g>`;
  const wedges = [[B, B, 45], [X - B, B, 135], [B, Y - B, -45], [X - B, Y - B, -135]].map(([x, y, a]) => wedge(x, y, a + 180)).join('');
  // 吊り金具（左右の木枠の上から 1/3）
  const ring = (x, y) => `<g transform="translate(${n(x)} ${n(y)})"><rect x="-14" y="-18" width="28" height="22" rx="4" fill="url(#${id}m)"/><circle cx="-7" cy="-11" r="2.4" fill="#5d6166"/><circle cx="7" cy="-11" r="2.4" fill="#5d6166"/><circle cx="0" cy="14" r="15" fill="none" stroke="url(#${id}m)" stroke-width="5"/></g>`;
  const px = (B - wr) / 2 + wr;
  return `<svg class="v-back-art" viewBox="0 0 ${X} ${Y}" preserveAspectRatio="none" aria-hidden="true"><defs>`
    + `<linearGradient id="${id}wh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2c79c"/><stop offset=".5" stop-color="#d3b283"/><stop offset="1" stop-color="#b28d5d"/></linearGradient>`
    + `<linearGradient id="${id}wv" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e2c79c"/><stop offset=".5" stop-color="#d3b283"/><stop offset="1" stop-color="#b28d5d"/></linearGradient>`
    + `<filter id="${id}gh" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency=".0032 .11" numOctaves="3" seed="${(WORKS.indexOf(w) * 7) % 97}"/><feColorMatrix values="0 0 0 0 .42  0 0 0 0 .29  0 0 0 0 .15  2.6 0 0 0 -1.05"/><feComposite in2="SourceGraphic" operator="in"/></filter>`
    + `<filter id="${id}gv" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency=".11 .0032" numOctaves="3" seed="${(WORKS.indexOf(w) * 7 + 3) % 97}"/><feColorMatrix values="0 0 0 0 .42  0 0 0 0 .29  0 0 0 0 .15  2.6 0 0 0 -1.05"/><feComposite in2="SourceGraphic" operator="in"/></filter>`
    + `<filter id="${id}t" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency=".9 .06" numOctaves="2" seed="11" result="a"/><feTurbulence type="fractalNoise" baseFrequency=".06 .9" numOctaves="2" seed="5" result="b"/><feBlend in="a" in2="b" mode="multiply"/><feColorMatrix values="0 0 0 0 .36  0 0 0 0 .3  0 0 0 0 .2  -1.1 0 0 0 .62"/><feComposite in2="SourceGraphic" operator="in"/></filter>`
    + `<radialGradient id="${id}lin" cx=".45" cy=".4" r=".8"><stop offset="0" stop-color="#e6dcc4"/><stop offset=".7" stop-color="#d9ccb0"/><stop offset="1" stop-color="#c7b894"/></radialGradient>`
    + `<linearGradient id="${id}fold" x1="0" y1="0" x2=".5" y2=".5"><stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset=".92" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".35"/></linearGradient>`
    + `<linearGradient id="${id}sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2a16" stop-opacity=".32"/><stop offset="1" stop-color="#3a2a16" stop-opacity="0"/></linearGradient>`
    + `<linearGradient id="${id}sv" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a2a16" stop-opacity=".3"/><stop offset="1" stop-color="#3a2a16" stop-opacity="0"/></linearGradient>`
    + `<linearGradient id="${id}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9dcdf"/><stop offset=".5" stop-color="#9ea3a8"/><stop offset="1" stop-color="#6d7277"/></linearGradient>`
    + `</defs>`
    // 麻布（織り目と、中ほどが少し明るいたるみ）
    + `<rect width="${X}" height="${Y}" fill="url(#${id}lin)"/><rect width="${X}" height="${Y}" fill="#000" filter="url(#${id}t)"/>`
    // 麻布に落ちる木枠の影（内側）
    + inner(B, B, X - B * 2, sh, 'h') + `<g transform="translate(0 ${Y}) scale(1 -1)">${inner(B, B, X - B * 2, sh, 'h')}</g>`
    + inner(B, B, sh, Y - B * 2, 'v') + `<g transform="translate(${X} 0) scale(-1 1)">${inner(B, B, sh, Y - B * 2, 'v')}</g>`
    + (brace ? `<rect x="${n(B)}" y="${n(Y / 2 + B * .45)}" width="${n(X - B * 2)}" height="${n(sh * .7)}" fill="url(#${id}sh)"/>` : '')
    // 木枠
    + bars.map(wood).join('') + (brace ? wood(brace) : '')
    // 節（木枠ごとに 1 つ、位置は作品ごとに変える）
    + [[.3, B * .62, 'h'], [.68, Y - B * .6, 'h'], [.42, B * .6, 'v'], [.7, X - B * .6, 'v']].map(([t, c, d], i) => { const k = ((WORKS.indexOf(w) * 13 + i * 29) % 40) / 100 - .2, x = d === 'h' ? X * (t + k * .5) : c, y = d === 'h' ? c : Y * (t + k * .5), rx = d === 'h' ? B * .34 : B * .16, ry = d === 'h' ? B * .16 : B * .34; return `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx * 1.9)}" ry="${n(ry * 1.9)}" fill="#8a6238" opacity=".16"/><ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="#7a5530" opacity=".55"/><ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx * .45)}" ry="${n(ry * .45)}" fill="#5c3d20" opacity=".6"/>`; }).join('')
    // 面取り（内側のふちの明るい帯）
    + `<rect x="${n(B - 5)}" y="${n(B - 5)}" width="${n(X - B * 2 + 10)}" height="5" fill="#e8c893" opacity=".7"/><rect x="${n(B - 5)}" y="${n(B - 5)}" width="5" height="${n(Y - B * 2 + 10)}" fill="#e8c893" opacity=".6"/>`
    + `<rect x="${n(B - 5)}" y="${n(Y - B)}" width="${n(X - B * 2 + 10)}" height="5" fill="#7c5732" opacity=".45"/><rect x="${n(X - B)}" y="${n(B - 5)}" width="5" height="${n(Y - B * 2 + 10)}" fill="#7c5732" opacity=".4"/>`
    + wedges
    // 木枠へ巻き込んだ麻布の帯（外側）と、帯が木枠に落とす影
    + `<g><rect width="${X}" height="${n(wr)}" fill="url(#${id}lin)"/><rect y="${n(Y - wr)}" width="${X}" height="${n(wr)}" fill="url(#${id}lin)"/><rect width="${n(wr)}" height="${Y}" fill="url(#${id}lin)"/><rect x="${n(X - wr)}" width="${n(wr)}" height="${Y}" fill="url(#${id}lin)"/></g>`
    + `<g fill="#000" filter="url(#${id}t)"><rect width="${X}" height="${n(wr)}"/><rect y="${n(Y - wr)}" width="${X}" height="${n(wr)}"/><rect width="${n(wr)}" height="${Y}"/><rect x="${n(X - wr)}" width="${n(wr)}" height="${Y}"/></g>`
    + `<rect x="${n(wr)}" y="${n(wr)}" width="${n(X - wr * 2)}" height="7" fill="url(#${id}sh)"/><rect x="${n(wr)}" y="${n(wr)}" width="7" height="${n(Y - wr * 2)}" fill="url(#${id}sv)"/>`
    + `<g transform="translate(0 ${Y}) scale(1 -1)"><rect x="${n(wr)}" y="${n(wr)}" width="${n(X - wr * 2)}" height="7" fill="url(#${id}sh)"/></g><g transform="translate(${X} 0) scale(-1 1)"><rect x="${n(wr)}" y="${n(wr)}" width="7" height="${n(Y - wr * 2)}" fill="url(#${id}sv)"/></g>`
    + corners + staples.join('')
    // 吊り金具
    + ring(px, Y / 3) + ring(X - px, Y / 3)
    + `</svg>`;
}
function backHTML(w) {
  const no = WORKS.indexOf(w) + 1;
  return `<div class="v-back" aria-hidden="true">${backSVG(w)}`
    + `<div class="v-label"><i class="tape a"></i><i class="tape b"></i><span class="lb-sig">An0n.</span><span class="lb-title">${esc(w.title)}</span>`
    + `<span class="lb-meta">${esc([w.year, w.medium, w.credit].filter(Boolean).join(' · '))}</span><span class="lb-no">No. ${String(no).padStart(2, '0')} / ${PLANNED_TOTAL}</span></div>`
    + '<div class="v-stamp"><span>AN0N.<br>ONLINE<br>GALLERY</span></div></div>';
}
function flipWork(on = !viewer.classList.contains('flipped')) {
  viewer.classList.toggle('flipped', on);
  $('.v-ask .flip', viewer)?.setAttribute('aria-pressed', on);
}
function setViewer(w) {
  // 作品ごとの URL（#w=作品の id）。Instagram などから、その作品が開いた状態で来てもらえる
  try { history.replaceState(null, '', `#w=${encodeURIComponent(w.id)}`); } catch { /* 使えない環境では何もしない */ }
  vOpenedAt = performance.now() / 1000;
  vWork = w;
  // 作品は表（絵）と裏（キャンバスの裏）を持つカードに入れる。裏返すボタンで、くるっと回る
  vScreen.innerHTML = `<div class="v-card">${mediaHTML(w, { autoplay: true })}${backHTML(w)}</div>`;
  vMedia = vScreen.querySelector('img, video');
  viewer.classList.remove('flipped');
  vPoster = null;
  if (w.type === 'video') {
    vMedia.play().catch(() => {});
    const img = new Image(); img.src = w.poster; vPoster = img;
  }
  const room = ROOMS.find((r) => r.id === w.room);
  // 作品名（と制作年）、その下に依頼作品のクレジット
  { const m = $('#v-meta'); m.textContent = ''; const t = document.createElement('span'); t.className = 'v-title'; t.textContent = w.title; m.append(t); if (w.year) { const y = document.createElement('span'); y.className = 'v-year'; y.textContent = w.year; m.append(y); } if (w.credit) { const c = document.createElement('span'); c.className = 'v-credit'; c.textContent = w.credit; m.append(c); } }
  // 価格はすべて ASK：Instagram の DM か、作品名入りのメッセージ（メール）で問い合わせ
  const ig = ARTIST.links.find((l) => l.label === 'Instagram'), mail = ARTIST.links.find((l) => l.label === 'Mail');
  const ask = $('.v-ask', viewer);
  ask.classList.toggle('sold', !!w.sold); ask.classList.toggle('nfs', !!w.nfs);
  ask.querySelector('.tag').textContent = w.sold ? 'SOLD OUT' : w.nfs ? 'NOT FOR SALE' : 'Price: ASK';
  ask.querySelector('.dm').href = ig ? ig.href : '#';
  ask.querySelector('.msg').href = mail ? `${mail.href}?subject=${encodeURIComponent(`Inquiry: ${w.title}`)}&body=${encodeURIComponent(`${w.title}${w.ja ? `（${w.ja}）` : ''}\n${location.origin}${location.pathname}#w=${w.id}\n\n`)}` : '#';
  ask.querySelector('.share').classList.remove('copied');
  viewer.dataset.scene = room.scene;
  fitVScreen();
  vParts = [];
  if (glowOf.has(w.id)) vTarget = glowOf.get(w.id);
}
// 作品は、上の見出し（サインと閉じるボタン）と下の作品名の欄のあいだの空きに収める（作品名が作品に重ならないように）。
// 作品名の欄は作品ごとに高さが変わる（長い題名は 2 行、クレジットの有無）ので、測ってから決める
const vCap = $('.v-cap', viewer), vTop = $('.v-top', viewer);
function fitVScreen() {
  const H = viewer.clientHeight, W = viewer.clientWidth;
  const top = vTop.getBoundingClientRect().bottom + 14, bottom = vCap.getBoundingClientRect().top - 22;
  const avail = Math.max(120, bottom - top);
  // 奥行き（translateZ）で少し大きく見えるぶんと、額の白い縁（6px）のぶんを引く
  const maxH = Math.min(H * (W <= 760 ? .56 : .72), avail / 1.06 - 14);
  viewer.style.setProperty('--v-top', `${Math.round(top + avail / 2)}px`);
  viewer.style.setProperty('--v-maxh', `${Math.round(maxH)}px`);
}
if ('ResizeObserver' in window) new ResizeObserver(() => { if (vOpen || viewer.classList.contains('open')) fitVScreen(); }).observe(vCap);
addEventListener('resize', () => { if (vOpen) fitVScreen(); });
// 共有：作品ごとの共有ページ（w/<id>.html）の URL を渡す。リンクを貼ると、その作品の画像と題名が出る
$('.v-ask .share', viewer).addEventListener('click', async (e) => {
  const btn = e.currentTarget, w = vWork; if (!w) return;
  const url = new URL(`w/${encodeURIComponent(w.id)}.html`, location.href).href, title = `${w.title} — ${ARTIST.name}`;
  try {
    if (navigator.share) { await navigator.share({ title, url }); return; }
    await navigator.clipboard.writeText(url);
    btn.classList.add('copied'); setTimeout(() => btn.classList.remove('copied'), 1600);
  } catch { /* 共有をやめたときなど。何もしない */ }
});
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
  viewer.classList.add('closing'); viewer.classList.remove('open', 'cap', 'flipped');
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
$('.v-ask .flip', viewer)?.addEventListener('click', () => flipWork());
vScreen.addEventListener('click', () => { if (viewer.classList.contains('flipped')) flipWork(false); }); // 裏を見ているときは、作品をタップすると表に戻る
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
  const d = svgIds(r).map((id) => SVG_STORE.get(id)).find((x) => x && !x.ready && x.body.length > 20000);
  if (!d) return;
  prefetching = true; r.prefetched = true;
  loadSVG(d).then(() => { prefetching = false; });
}
// 部屋の背景（奥・中・手前の層）がすべて描き終わっているか
function layersPainted(r) {
  if (!r.attached || r.pending?.length) return false;
  for (const el of r.el.querySelectorAll('.plane > .raster')) {
    if (el.dataset.pre) return false;
    if (el._tiles && el._tiles[0]?.src) { if (!el._tiles.some((t) => t.img && t.img.complete)) return false; continue; } // 書き出し済みの画像：1 枚でも読み込めていれば
    if (el.dataset.svg) return false; // まだ焼く順番が来ていない
    if (el._win ? !el._win.c : !(el._tiles && el._tiles.every((t) => t.canvas))) return false;
  }
  return true;
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
  else if (d > vh * (COARSE ? .6 : 4) && entrance.attached) { // スマホは、最初の部屋のカーテンが開いたらすぐ手放す（入口はもう見えない）
    entrance.attached = false;
    Object.keys(entrance.layerHTML).forEach((sel) => { $(sel, entrance).innerHTML = ''; });
    updateCurtain(entranceCurtain, 0);
    entrance.querySelectorAll('video[src]').forEach((v) => { v.pause(); v.dataset.src = v.getAttribute('src'); v.removeAttribute('src'); v.load(); });
  }
}
function manageMemory(r) {
  const { top, len } = roomMetrics(r);
  const d = sy < top ? top - sy : sy > top + len ? sy - (top + len) : 0;
  // スマホは、次の部屋を 1 画面手前で用意し、通り過ぎた部屋はカーテンが閉じたらすぐ手放す（2 部屋ぶんが重なる時間を短く）。
  // 通り過ぎた部屋は、カーテンが閉じきった先（次の部屋に入れ替わったあと）ではもう見えないので、画面 0.3 枚ぶん進んだら手放す
  const passed = sy > top + len;
  r.entered = sy >= top - vh * .05; // 部屋に入った（入る直前）かどうか。入る前は、背景を画面 1.6 枚ぶんだけ描いておく
  const near = passed && COARSE ? vh * .12 : vh * (COARSE ? .8 : 1.5), far = passed && COARSE ? vh * .3 : vh * (COARSE ? 1.05 : 2.5);
  if (d < near) { if (r.attached) attachNext(r); else attachLayers(r); }
  else if (d > far && r.attached) detachLayers(r);

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
  document.dispatchEvent(new CustomEvent('beat', { detail: on })); // 小屋のプレーヤーの曲は、ビート／ラジオが始まったら止める
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
  if (Math.abs(SY - lastSY) > .5) { movedAt = scrollMovedAt = now; scrollDir = SY > lastSY ? 1 : -1; }
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
    // （入口の葉のカーテンは、ここでは外さない。最初の部屋がそのまま引き継いで開く。入口の絵を手放すときに一緒に外す）
    currentRoom = null;
    rooms.forEach((r) => updateRoom(r, now));
    // 入口の葉が最初の部屋に渡されずに残っていたら外す（部屋の更新のあとで。先に外すと渡せない）
    if (gone && entranceCurtain.leafEls) updateCurtain(entranceCurtain, 0);
    // 0.4 秒ほど立ち止まっていたら、次の部屋の絵を先に読み込む（入口にいるときは最初の部屋）
    // （スマホではしない：次の部屋の元画像を持ったまま歩くと、今の部屋のぶんと重なってメモリが足りなくなる）
    if (!COARSE && now - movedAt > 400 && Math.abs(sy - SY) < .5 && (currentRoom || sy < GEO.entH)) prefetchNext(currentRoom);
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
    // 落ちながら作品の枠の列に入りそうな葉は、枠の手前で薄れて消える（枠の後ろへ回らない）
    if (GEO.workRects?.length) for (const q of parts) { if (q.k === 'leaf') q.life = Math.min(q.life, q.age + .6); } // 作品が画面に入ったら、落ちている葉はすぐ消す
    if (GEO.workRects?.length) for (const q of parts) { if (q.k !== 'leaf') continue; for (const b of GEO.workRects) { const l = b.left / vw * 100 - 3, r = b.right / vw * 100 + 3; if (q.x > l && q.x < r && q.y > b.top / vh * 100 - 12) { q.life = Math.min(q.life, q.age + .8); break; } } }
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
// 歩く速さ：速くはじいても、1 秒に画面 1.9 枚ぶんまでしか進まない（作品を開いているとき・金庫・入口の儀式のあいだ・目録と作家の欄は、ふつうのスクロール）
paceScroll({
  maxSpeed: () => vh * 1.9,
  // 目録と作家の欄（いちばん下）は、ふつうのスクロール。作品を飾っている部屋までは今のまま
  active: (e) => !vOpen && !flyerView?.classList.contains('show') && document.body.classList.contains('loaded') && !e.target.closest?.('#viewer, #vault') && scrollY < $('#catalog').offsetTop - 2,
});
$('#enter-sound').addEventListener('click', () => enterForest(true));
$('#enter-silent').addEventListener('click', () => enterForest(false));
ready.then(() => {
  setTimeout(() => {
    if (!SOUND) { enterForest(false); return; } // 音を使わないときは、サインが書き終わったらそのまま森へ
    document.body.classList.add('choosing');
    $('#enter-sound').focus({ preventScroll: true });
  }, REDUCED ? 0 : 1500);
});
