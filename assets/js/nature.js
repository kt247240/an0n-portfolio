// =========================================================
// ANON. の作風キット
// 作品から読み取った描き方のルール（docs/style-guide.md に詳しく）
//   - 輪郭線は引かない。形は色の面と、となり合う色の明暗差だけで見せる
//   - 葉は 1 枚 1 色のフラットな面。光の来る側（左上）の半分だけ少し明るくする
//   - 葉は枝に沿ってつける。手前ほど暗く大きく、奥ほど明るく小さく霞ませる
//   - 主役（作品）は中央。植物は画面の縁にだけ置き、作品には決してかけない
//   - 全体に紙の粒子。光は斜めの薄い帯と、ぼんやりした丸い光
// 座標は「画面の高さ = 100」。幅 W も同じ単位（W = 画面の幅 ÷ 画面の高さ × 100）
// =========================================================

let seed = 1;
export const reseed = (s) => { seed = s; };
const rnd = () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
// 描き込み用の乱数：場所（数値）から決まる別の乱数。今の配置（rnd の並び）を変えずに細部を足すために使う
function hrng(k) { let t0 = (Math.floor(k * 1000) ^ 0x9E3779B9) | 0; return () => { t0 = t0 + 0x6D2B79F5 | 0; let t = Math.imul(t0 ^ t0 >>> 15, 1 | t0); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const R = (a, b) => a + rnd() * (b - a);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const n1 = (v) => Math.round(v * 10) / 10;
const n2 = (v) => Math.round(v * 100) / 100;
const D = Math.PI / 180;

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (a) => `#${a.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;
export const mixC = (a, b, t) => { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };

// ---------- 色の仕上げ（ヒップホップの夜の、暗く怪しい色調） ----------
// 背景の SVG / CSS の色を、描いたあとに一度だけ変換する（スクロール中の負担はない。作品の色には触れない）
// b: 明るさ, s: 彩度, k: コントラスト, t: 影に紫を混ぜる量
export const GRADES = {
  forest: { b: .9, s: .88, k: 1.05, t: .08 },
  jungle: { b: .89, s: .88, k: 1.05, t: .08 },
  cove: { b: .91, s: .9, k: 1.04, t: .08 },
  night: { b: .97, s: .95, k: 1.03, t: .05 },
  attic: { b: .96, s: .94, k: 1.03, t: .05 },
};
const SHADOW = [46, 14, 66];
function gradeRGB([r, g, b], G) {
  const L = (.299 * r + .587 * g + .114 * b) / 255;
  return [r, g, b].map((v, i) => {
    let c = v / 255;
    c = L + (c - L) * G.s;
    c *= G.b;
    c = (c - .5) * G.k + .5;
    c = c + (SHADOW[i] / 255 - c) * G.t * (1 - L);
    return Math.round(Math.min(1, Math.max(0, c)) * 255);
  }).map((v, i, o) => {
    if (!G.moon) return v;
    // 月夜：色を少し抜き、青く暗く沈める（暗いところにはほんの少し青い光が残る）
    const L2 = (.299 * o[0] + .587 * o[1] + .114 * o[2]) / 255;
    let c = v / 255;
    c = L2 + (c - L2) * .7;
    c = c * MOON[i] + MOON_LIFT[i];
    return Math.round(Math.min(1, Math.max(0, c)) * 255);
  });
}
const MOON = [.4, .46, .7], MOON_LIFT = [.012, .018, .045];
export function gradeColors(str, G) {
  if (!G) return str;
  return str
    .replace(/(?<!url\()#([0-9a-f]{6}|[0-9a-f]{3})(?![0-9a-z_-])/gi, (m, h) => {
      const x = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
      return toHex(gradeRGB(hex('#' + x), G));
    })
    .replace(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*[\d.]+\s*)?\)/g, (m, r, g, b, a) => {
      const [R2, G2, B2] = gradeRGB([+r, +g, +b], G);
      return a ? `rgba(${R2},${G2},${B2}${a})` : `rgb(${R2},${G2},${B2})`;
    });
}
const light = (c, t = .12) => mixC(c, '#ffffff', t);
const dark = (c, t = .15) => mixC(c, '#000000', t);

// ---------- パレット（作品の画素を k-means で分けて抽出した色） ----------
export const PAL = {
  forest: { deep: '#1a3326', dark: '#204d33', mid: '#2f6a44', leaf: '#47733c', olive: '#5f7d2e', fresh: '#769721', lime: '#a5c23e', pale: '#c9d77a', trunk: '#6b4a2e', bark: '#8f602e' },
  water: { base: '#758055', light: '#96a276', deep: '#5d6642', pad: '#a8c94f', padDark: '#7da03a' },
  dusk: { peach: '#e4c496', mauve: '#cebfbf', mist: '#adbec1', mint: '#cce4e2', teal: '#77b2b9', sea: '#608a8a', deep: '#385871', gold: '#e1b76a', coral: '#9b8ad0', coralLight: '#c7b3e6', pink: '#e9a7b4', kelp: '#5aa77a', sand: '#dccbb0' },
  night: { sky: '#151113', indigo: '#333a68', violet: '#5c597b', mist: '#969eb8', warm: '#df7418', amber: '#d2a268', palm: '#3f4a22', palmDark: '#232a14', ink: '#0e0c12', trunk: '#35281b' },
};

// ---------- 作品にかけないための「立入禁止の枠」 ----------
// 部品は描きながら自分の外形（BB）を記録する。guard() は外形が枠に重なったら
// 小さくして描き直し、それでも重なるなら描かない（葉を途中で切ることはしない）
let BB = null;
function track(x, y, r = 0) {
  if (!BB) return;
  if (x - r < BB[0]) BB[0] = x - r;
  if (y - r < BB[1]) BB[1] = y - r;
  if (x + r > BB[2]) BB[2] = x + r;
  if (y + r > BB[3]) BB[3] = y + r;
}
function guard(zones, gen, { min = .4 } = {}) {
  for (let k = 1; k >= min - 1e-6; k -= .15) {
    const s0 = seed, outer = BB;
    BB = [1e9, 1e9, -1e9, -1e9];
    const s = gen(k), b = BB;
    BB = outer;
    if (!zones.some((z) => b[0] < z[2] && b[2] > z[0] && b[1] < z[3] && b[3] > z[1])) {
      track(b[0], b[1]); track(b[2], b[3]);
      return s;
    }
    seed = s0;
  }
  return '';
}
// 作品のまわりの枠（cx = 作品の中心。y0/y1 は額の飾りまで含めた上下）
function artZone(W, cx, y0, y1) {
  const half = Math.min(60, W * .78) / 2 + 3;
  return [cx - half, y0, cx + half, y1];
}

// ---------- 基本の部品 ----------
// 葉の形は 1 つだけ定義して使い回す（高さ 1・幅 1 の葉を、長さと幅に合わせて伸ばす）
// oh / lh は光の当たる半分（白を薄く重ねる）、or は葉脈
const tuftDef = (n) => {
  let r = n * 7919, out = '';
  const rr = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; }, f3 = (v) => Math.round(v * 1000) / 1000;
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1), a = -34 + 68 * f + (rr() - .5) * 14, hh = (.62 + .38 * rr()) * (1 - Math.abs(a) / 34 * .32), w = .075, bx = (f - .5) * w * 2.4;
    const tx = bx + Math.sin(a * D) * hh + a * .012 * hh, ty = -Math.cos(a * D) * hh * (1 - Math.abs(a) * .004), cx = bx + Math.sin(a * D) * hh * .25, cy = -hh * .58;
    out += `<path d="M${f3(bx - w)} 0Q${f3(cx - w * .3)} ${f3(cy)} ${f3(tx)} ${f3(ty)}Q${f3(cx + w * .6)} ${f3(cy)} ${f3(bx + w)} 0Z"${(i + (Math.abs(a) > 18 ? 0 : 1)) % 2 ? ' fill="currentColor"' : ''}/>`;
  }
  return `<g id="t${n}">${out}</g>`;
};
export const LEAF_DEFS = '<defs>' + [5, 6, 7, 8, 9].map(tuftDef).join('') + '<path id="o" d="M0 0C1 -.18 .95 -.8 0 -1C-.95 -.8 -1 -.18 0 0Z"/><path id="oh" d="M0 0C1 -.18 .95 -.8 0 -1Z" fill="#fff" fill-opacity=".12"/><path id="or" d="M-.05 -.06Q.07 -.5 0 -.86Q-.01 -.5 .05 -.06Z" fill="#000" fill-opacity=".16"/><path id="l" d="M0 0C1 -.3 .55 -.78 0 -1C-.55 -.78 -1 -.3 0 0Z"/><path id="lh" d="M0 0C1 -.3 .55 -.78 0 -1Z" fill="#fff" fill-opacity=".1"/></defs>';
const g = (x, y, a, body, cls = '', style = '') =>
  `<g transform="translate(${n1(x)} ${n1(y)}) rotate(${n1(a)})"${cls ? ` class="${cls}"` : ''}${style ? ` style="${style}"` : ''}>${body}</g>`;
const anim = (cls, x, y, body, span = 6) => (cls ? `<g class="${cls}" style="transform-origin:${n1(x)}px ${n1(y)}px;animation-delay:${n1(-R(0, span))}s">${body}</g>` : body);
// 光は左上から。葉の右半分（ローカル +x 側）が光を向いていれば右を、そうでなければ左を明るくする
const litSide = (a) => (-Math.cos(a * D) * .6 - Math.sin(a * D) * .8 > 0 ? 1 : -1);

// 丸い葉（フィカス・ポトス）。0° が上向き
export function oval(x, y, l, w, a, c, { half = true, rib = false, cls = '' } = {}) {
  track(x, y, w); track(x + Math.sin(a * D) * l, y - Math.cos(a * D) * l, w);
  const k = half ? litSide(a) : 1;
  return `<g transform="translate(${n1(x)} ${n1(y)}) rotate(${Math.round(a)}) scale(${n2(k * w)} ${n2(l)})" fill="${c}"${cls ? ` class="${cls}"` : ''}><use href="#o"/>${half ? '<use href="#oh"/>' : ''}${rib ? '<use href="#or"/>' : ''}</g>`;
}
// 細長い葉
export function lance(x, y, l, w, a, c, { half = true, cls = '' } = {}) {
  track(x, y, w); track(x + Math.sin(a * D) * l, y - Math.cos(a * D) * l, w);
  const k = half ? litSide(a) : 1;
  return `<g transform="translate(${n1(x)} ${n1(y)}) rotate(${Math.round(a)}) scale(${n2(k * w)} ${n2(l)})" fill="${c}"${cls ? ` class="${cls}"` : ''}><use href="#l"/>${half ? '<use href="#lh"/>' : ''}</g>`;
}

// 枝：先細りの茎に、先へ向かって小さくなる葉を対につける（作品の茂みの描き方）
// 奥側の葉は暗く茎の下に、手前側の葉は明るく茎の上に重ねる
function twig(x, y, len, ang, tones, o, depth = 0) {
  const n = o.n, step = len / n, pts = [[x, y, ang]];
  let px = x, py = y, dir = ang;
  for (let i = 0; i < n; i++) { dir += o.bend; px += Math.sin(dir * D) * step; py -= Math.cos(dir * D) * step; pts.push([px, py, dir]); }
  const half = Math.ceil(tones.length / 2), backT = tones.slice(0, half), frontT = tones.slice(tones.length - half);
  const back = [], front = [];
  const leafOf = (lx, ly, sz, a, c) => (o.kind === 'lance' ? lance(lx, ly, sz * 1.7, sz * .3, a, c) : oval(lx, ly, sz, sz * .46, a, c, { rib: sz > 2.6 }));
  for (let i = 1; i < n; i++) {
    const [lx, ly, ld] = pts[i], t = i / n, sz = o.leaf * (1 - o.shrink * t) * R(.94, 1.06);
    if (i === 1 && depth === 0 && n > 4) continue; // 付け根は茎だけ見せる
    for (const side of [-1, 1]) {
      if (o.alt && (i + (side > 0 ? 1 : 0)) % 2) continue;
      const a = ld + side * o.spread * R(.88, 1.06), isBack = side === o.backSide;
      (isBack ? back : front).push(leafOf(lx, ly, sz, a, pick(isBack ? backT : frontT)));
    }
  }
  front.push(leafOf(px, py, o.leaf * (1 - o.shrink) * 1.15, dir, pick(frontT)));
  let subs = '';
  if (!depth && o.twigs) {
    for (const f of [.34, .58]) {
      if (rnd() > .7) continue;
      const [sx, sy, sd] = pts[Math.round(n * f)];
      subs += twig(sx, sy, len * R(.32, .42), sd + (rnd() < .5 ? -1 : 1) * R(30, 46), tones, { ...o, n: Math.max(3, Math.round(n * .5)), leaf: o.leaf * .8, bend: o.bend * 1.4 }, 1);
    }
  }
  const sw = Math.max(.16, len * .015) * (depth ? .7 : 1), L = [], Rt = [];
  pts.forEach(([sx, sy, sd], i) => { const w = sw * (1 - .8 * i / n) / 2, nx = Math.cos(sd * D) * w, ny = Math.sin(sd * D) * w; L.push(`${n1(sx - nx)} ${n1(sy - ny)}`); Rt.unshift(`${n1(sx + nx)} ${n1(sy + ny)}`); });
  const stem = `<path d="M${L.join('L')}L${Rt.join('L')}Z" fill="${o.stem}"/>`;
  track(x, y, sw);
  return back.join('') + subs + stem + front.join('');
}
// 茎に対の葉がつく小枝。ang 0° = 上
export function sprig(x, y, len, ang, tones, { leaf = 4, n = 8, stem = '#2d4a2a', spread = 50, shrink = .5, bend = R(-4, 4), kind = 'oval', cls = 'sway', twigs = true, alt = false } = {}) {
  const body = twig(x, y, len, ang, tones, { leaf, n, stem, spread, shrink, bend, kind, twigs, alt, backSide: rnd() < .5 ? -1 : 1 });
  return anim(cls, x, y, body);
}
// 株：根元から扇状に枝を出す茂み。奥の枝は暗く、手前の枝は明るく
export function shrub(x, y, s, tones, { spread = 68, n = 7, cls = 'sway slow', leaf = s * .12, kind = 'oval' } = {}) {
  const stem = dark(tones[0], .35), bt = tones.slice(0, Math.max(2, tones.length - 1)), ft = tones.slice(1);
  let back = '', front = '';
  for (let i = 0; i < n; i++) {
    const a = -spread + 2 * spread * (i + R(-.25, .25)) / (n - 1), l = s * R(.8, 1) * (1 - Math.abs(a) / spread * .28);
    back += twig(x + R(-s * .06, s * .06), y, l, a, bt, { n: 7, leaf, spread: 50, shrink: .42, bend: a * .03 + R(-1.5, 1.5), kind, stem, twigs: true, backSide: 1 });
  }
  for (let i = 0; i < n - 2; i++) {
    const a = (-spread + 2 * spread * (i + .5 + R(-.3, .3)) / (n - 2)) * .72, l = s * R(.5, .7);
    front += twig(x + R(-s * .08, s * .08), y + s * .03, l, a, ft, { n: 6, leaf: leaf * 1.06, spread: 52, shrink: .38, bend: a * .04 + R(-1.5, 1.5), kind, stem, twigs: rnd() < .5, backSide: -1 });
  }
  return anim(cls, x, y, back + front);
}
// 葉のかたまり（梢や遠くの茂み）：丸いふくらみの集まりに、左上の縁だけ明るい光、下に影、縁に葉
let gid = 0;
export function bushMass(cx, cy, r, tones, n = 26, { cls = '' } = {}) {
  // 樹冠・茂み：入口と同じ描き方（crownMass）。ふくらみの位置は前と同じ乱数で決め、前の葉のぶんの乱数も同じ回数だけ呼ぶ（ほかの配置を変えないため）
  const k = r > 9 ? 9 : 7, lobes = [[cx, cy, r * .56]];
  for (let i = 0; i < k; i++) { const a = (i / k) * 360 + R(-14, 14), d = r * R(.4, .56); lobes.push([cx + Math.sin(a * D) * d, cy - Math.cos(a * D) * d * .8, r * R(.3, .42)]); }
  track(cx, cy, r * 1.08);
  for (let i = 0; i < Math.round(n * .22); i++) { R(-120, 120); R(.1, .45); R(.16, .22); R(.07, .09); R(-20, 20); }
  for (let i = 0; i < Math.round(n * .78); i++) { R(-160, 160); R(.72, .88); R(.24, .32); R(.1, .13); R(-16, 16); }
  return anim(cls, cx, cy + r, crownMass(cx, cy, r, tones, hrng(cx * 7.3 + cy * 3.1 + r), lobes));
}
// 入口の並木の樹冠（ていねいな版）：丸いふくらみを重ね、ふちは小さな葉のふくらみで細かく波打たせる（浮いた葉は置かない）。
// 光は左上から：ふくらみごとに左上が明るく、下へなめらかに暗くなる。葉の形の明るい面は、ふくらみの中にだけ
function crownMass(cx, cy, r, tones, g, given = null) {
  const [sh, body, hi, rimHi] = [tones[0], tones[1], tones[2] || light(tones[1], .14), tones[3] || tones[2] || light(tones[1], .2)], id = `cm${gid++}`;
  const k = r > 9 ? 9 : 7, lobes = given || [[cx, cy, r * .56]];
  if (!given) for (let i = 0; i < k; i++) { const a = (i / k) * 360 + (g() - .5) * 28, d = r * (.4 + g() * .16); lobes.push([cx + Math.sin(a * D) * d, cy - Math.cos(a * D) * d * .8, r * (.3 + g() * .12)]); }
  // ふちの小さなふくらみ（葉のかたまり）：ふくらみの外周の上側に並べる
  const bumps = [];
  for (const [x, y, rr] of lobes) {
    const n = Math.max(6, Math.round(rr * 1.6));
    for (let i = 0; i < n; i++) { const a = -150 + 300 * (i + .2 + g() * .6) / n, br = rr * (.16 + g() * .08); bumps.push([x + Math.sin(a * D) * rr * .96, y - Math.cos(a * D) * rr * .96, br]); }
  }
  const all = lobes.concat(bumps), circ = (list, dx = 0, dy = 0, k2 = 1) => list.map(([x, y, rr]) => `<circle cx="${n1(x + dx)}" cy="${n1(y + dy)}" r="${n2(rr * k2)}"/>`).join('');
  track(cx, cy, r * 1.12);
  const [sg, sd] = lgrad([[0, sh, 0], [.55, sh, .35], [1, sh, .85]]);
  let s = `<defs><clipPath id="${id}">${circ(all)}</clipPath>${sd}</defs>`;
  // 地面側に落ちる、樹冠の影（少し右下にずらした同じ形）
  s += `<g fill="${dark(sh, .08)}" opacity=".3">${circ(bumps.filter(([, y]) => y > cy), r * .02, r * .05)}</g>`;
  s += `<g clip-path="url(#${id})"><rect x="${n1(cx - r * 1.3)}" y="${n1(cy - r * 1.3)}" width="${n1(r * 2.6)}" height="${n1(r * 2.6)}" fill="${hi}"/>`;
  // ふくらみごとの陰：右下にずらした形で覆い、左上のふちだけ明るく残す
  s += `<g fill="${body}">${circ(lobes, r * .07, r * .1, .97)}${circ(bumps, r * .05, r * .07)}</g>`;
  // ふくらみどうしの境目：上のふくらみの下のふちに沿って、少し暗い面（奥行き）
  s += `<g fill="${mixC(body, sh, .45)}" opacity=".5">${lobes.filter(([, y]) => y > cy - r * .5).map(([x, y, rr]) => `<path d="M${n1(x - rr * .95)} ${n1(y + rr * .1)}A${n2(rr)} ${n2(rr)} 0 0 0 ${n1(x + rr * .95)} ${n1(y + rr * .1)}A${n2(rr)} ${n2(rr * .7)} 0 0 1 ${n1(x - rr * .95)} ${n1(y + rr * .1)}Z"/>`).join('')}</g>`;
  // 下へなめらかに暗く
  s += `<rect x="${n1(cx - r * 1.3)}" y="${n1(cy - r * .1)}" width="${n1(r * 2.6)}" height="${n1(r * 1.3)}" fill="url(#${sg})"/>`;
  // 光の当たるふくらみの中に、作品の葉（葉脈で明るい半分と暗い半分に塗り分けた葉）を、下向きにそろえて少しだけ
  for (const [x, y, rr] of lobes) { if (y > cy + r * .15 || r < 3.5) continue; for (let i = 0; i < 4; i++) { const lx = x - rr * (.5 - g() * .8), ly = y - rr * (.3 - g() * .6); { const L = rr * (.2 + g() * .08); s += splitLeaf(lx, ly, L, L * .42, 100 + g() * 50, mixC(hi, rimHi, .5), body, .75); } } }
  s += '</g>';
  // ふちの葉：ふくらみのふちから外へ生える形で並べる（かたまりから離れた葉は置かない）。上は光の色、下は陰の色
  const warm = mixC(rimHi, '#f2e6a6', .25);
  bumps.forEach(([x, y, br], i) => {
    if (i % 2) return;
    const [lx, ly] = [x, y], near = lobes.reduce((m, q) => (Math.hypot(q[0] - x, q[1] - y) - q[2] < Math.hypot(m[0] - x, m[1] - y) - m[2] ? q : m), lobes[0]);
    const ang = Math.atan2(y - near[1], x - near[0]) * 180 / Math.PI, up = -(y - near[1]) / (near[2] || 1), left = -(x - near[0]) / (near[2] || 1);
    const lit = up > .3, a = ang + 25 * (ang > -90 && ang < 90 ? 1 : -1) * .5 + (g() - .5) * 20;
    if (up < -.35) return; // 下のふちには葉を出さない（暗いトゲに見えるので）
    const [cl, cd] = lit ? [left > .2 ? warm : hi, body] : [hi, body];
    const L = br * (1.35 + g() * .5); s += splitLeaf(lx, ly, L, L * .42, a, cl, cd, 1);
  });
  return s;
}
// 作品の葉の描き方：先のとがった葉を、葉脈で明るい半分と暗い半分に塗り分ける（根もとが x, y）
function splitLeaf(x, y, L, w, a, cLight, cDark, op = 1) {
  const t = `transform="translate(${n1(x)} ${n1(y)}) rotate(${n1(a)})"`, o = op < 1 ? ` opacity="${op}"` : '';
  return `<path d="M0 0Q${n2(L * .45)} ${n2(-w * 1.25)} ${n2(L)} 0Z" ${t} fill="${cLight}"${o}/><path d="M0 0Q${n2(L * .45)} ${n2(w * 1.25)} ${n2(L)} 0Z" ${t} fill="${cDark}"${o}/>`;
}
// シダ：羽片は根元と先が短く、真ん中が長い
export function fern(x, y, len, a, c, { cls = 'sway', n = 16 } = {}) {
  const bend = R(2.2, 4.5) * (rnd() < .5 ? -1 : 1), step = len / n, pts = [[x, y, a]];
  let px = x, py = y, dir = a;
  for (let i = 0; i < n; i++) { dir += bend; px += Math.sin(dir * D) * step; py -= Math.cos(dir * D) * step; pts.push([px, py, dir]); }
  const cl = light(c, .08), cd = dark(c, .14);
  let back = '', front = '';
  for (let i = 1; i < n; i++) {
    const [lx, ly, ld] = pts[i], t = i / n, sz = len * .24 * Math.sin(Math.PI * Math.min(.96, t * .88 + .1));
    back += lance(lx, ly, sz, sz * .19, ld - 66 + t * 22, cd, { half: false });
    front += lance(lx, ly, sz, sz * .19, ld + 66 - t * 22, cl);
  }
  const rach = `<path d="M${pts.map((p) => `${n1(p[0])} ${n1(p[1])}`).join('L')}" stroke="${cd}" stroke-width="${n1(Math.max(.15, len * .013))}" fill="none" stroke-linecap="round"/>`;
  return anim(cls, x, y, back + rach + front + lance(px, py, len * .07, len * .014, dir, cl, { half: false }));
}
// モンステラ
export function monstera(x, y, s, a, c, { cls = 'sway slow' } = {}) {
  track(x, y, s * 1.05);
  const vein = dark(c, .25), cut = [.28, .5, .72].map((t) => `M${n1(s * t)} ${n1(-s * .03)}L${n1(s * (t + .09))} ${n1(-s * .36)}M${n1(s * t)} ${n1(s * .03)}L${n1(s * (t + .08))} ${n1(s * .3)}`).join('');
  // 切れ込みの線は葉の形の中だけに描く（葉先に近い切れ込みが縁から飛び出さないように、葉の形で切り取る）
  const leaf = `M0 0C${n1(s * .15)} ${n1(-s * .55)} ${n1(s * .85)} ${n1(-s * .6)} ${n1(s)} ${n1(-s * .05)}C${n1(s * .85)} ${n1(s * .5)} ${n1(s * .15)} ${n1(s * .45)} 0 0Z`, clip = `mc${gid++}`;
  const body = `<defs><clipPath id="${clip}"><path d="${leaf}"/></clipPath></defs><path d="${leaf}" fill="${c}"/>
    <path d="M0 0C${n1(s * .15)} ${n1(-s * .55)} ${n1(s * .85)} ${n1(-s * .6)} ${n1(s)} ${n1(-s * .05)}Z" fill="${light(c, .07)}"/>
    <g clip-path="url(#${clip})"><path d="M0 0L${n1(s * .96)} ${n1(-s * .04)}" stroke="${vein}" stroke-width="${n1(s * .025)}"/><path d="${cut}" stroke="${vein}" stroke-width="${n1(s * .05)}" stroke-linecap="round"/></g>`;
  return anim(cls, x, y, g(x, y, a, body));
}
// ヤシの葉（夜の街の作品の、太い帯状の葉）
export function palmFan(x, y, len, a, c, c2, { n = 11, cls = 'sway slow' } = {}) {
  track(x, y, len * 1.05);
  let s = '';
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), ang = -100 + t * 200 + R(-6, 6), L = len * R(.75, 1.05), w = len * R(.05, .075);
    const droop = L * R(.25, .4), col = i % 3 === 1 ? c2 : c;
    s += `<g transform="rotate(${n1(ang)})"><path d="M0 ${n1(-w)}Q${n1(L * .45)} ${n1(-droop - w)} ${n1(L)} ${n1(droop * .5)}Q${n1(L * .45)} ${n1(-droop + w * 1.6)} 0 ${n1(w)}Z" fill="${col}"/><path d="M0 0Q${n1(L * .45)} ${n1(-droop + w * .3)} ${n1(L * .96)} ${n1(droop * .48)}" stroke="${light(col, .1)}" stroke-width="${n1(w * .22)}" fill="none" opacity=".7"/></g>`;
  }
  return anim(cls, x, y, g(x, y, a, s));
}
// 上から垂れる苔のカーテン（ジャングルの作品の上辺）
export function drape(x0, x1, y, depth, c, { cls = 'hang' } = {}) {
  track(x0, y); track(x1, y + depth * 1.35);
  const pts = [];
  for (let x = x0; x <= x1; x += R(2, 5)) {
    const drip = rnd() < .22 ? R(depth * .7, depth * 1.3) : R(depth * .15, depth * .5);
    pts.push([x, y + drip]);
  }
  let d = `M${n1(x0)} -5L${n1(x0)} ${n1(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    d += `Q${n1(ax + (bx - ax) * .5)} ${n1(Math.max(ay, by) + depth * .1)} ${n1(bx)} ${n1(by)}`;
  }
  d += `L${n1(x1)} -5Z`;
  // 描き込み（位置から決まる別の乱数で。前の乱数の呼び出しは変えない）：
  // 上ほど暗く先ほど明るい色、垂れの左のふちに光、長い垂れの先に小さな葉
  const g = hrng(x0 * 1.9 + y * 3.3 + depth), id = `dr${gid++}`, [gg, gd] = lgrad([[0, dark(c, .22)], [.5, c], [1, light(c, .06)]], [0, 0, 0, 1]);
  let inner = `<rect x="${n1(x0 - 2)}" y="-5" width="${n1(x1 - x0 + 4)}" height="${n1(y + depth * 1.4 + 6)}" fill="${light(c, .16)}"/><path d="${d}" transform="translate(.55 .15)" fill="url(#${gg})"/>`;
  let tips = '';
  pts.forEach(([px, py], i) => {
    const long = py - y > depth * .62;
    if (long) {
      g(); g(); // （苔の筋の線はやめた：線の表現は使わない）
      if (g() < .7) tips += splitLeaf(px + (g() - .5) * .6, py - .4, .9 + g() * .7, .38, 70 + g() * 40, light(c, .1), dark(c, .08));
    } else if (g() < .3) inner += `<ellipse cx="${n1(px)}" cy="${n1(py - .5)}" rx="${n2(.5 + g() * .5)}" ry=".25" fill="${dark(c, .12)}" opacity=".4"/>`;
  });
  return `<g class="${cls}" style="transform-origin:${n1((x0 + x1) / 2)}px 0px;animation-delay:${n1(-R(0, 5))}s"><defs>${gd}<clipPath id="${id}"><path d="${d}"/></clipPath></defs><path d="${d}" fill="${c}"/><g clip-path="url(#${id})">${inner}</g>${tips}</g>`;
}
// つる
export function vine(x, y0, len, stem, tones, { cls = 'hang' } = {}) {
  let d = `M${n1(x)} ${n1(y0)}`, leaves = '';
  const n = Math.max(4, Math.round(len / 4));
  for (let i = 1; i <= n; i++) {
    const yy = y0 + len * i / n, xx = x + Math.sin(i * 1.2 + x) * 1.1;
    d += `L${n1(xx)} ${n1(yy)}`;
    leaves += oval(xx, yy, R(2.2, 3.4) * (1 - i / n * .3), 1.1 * (1 - i / n * .3), (i % 2 ? 1 : -1) * R(110, 140), pick(tones));
  }
  track(x, y0, 1); track(x, y0 + len, 3.4);
  return `<g class="${cls}" style="transform-origin:${n1(x)}px ${n1(y0)}px;animation-delay:${n1(-R(0, 5))}s"><path d="${d}" stroke="${stem}" stroke-width=".35" fill="none"/>${leaves}</g>`;
}
// 睡蓮の葉
export function lily(x, y, r, c, { cls = 'bob' } = {}) {
  const a = R(0, 360), b = a + 28;
  const p = (ang) => `${n1(x + Math.cos(ang * D) * r)} ${n1(y + Math.sin(ang * D) * r * .38)}`;
  // 葉脈：切れ込みを避けて、中心から放射状に。縁は少し暗く
  const veins = Array.from({ length: 7 }, (_, i) => b + 25 + i * 42).filter((g) => (g - a + 720) % 360 > 20).map((g) => `M${n1(x)} ${n1(y)}L${n1(x + Math.cos(g * D) * r * .88)} ${n1(y + Math.sin(g * D) * r * .38 * .88)}`).join('');
  return `<path class="${cls}" style="animation-delay:${n1(-R(0, 4))}s" d="M${n1(x)} ${n1(y)}L${p(b)}A${n1(r)} ${n1(r * .38)} 0 1 1 ${p(a)}Z" fill="${c}" stroke="${dark(c, .18)}" stroke-width="${n1(r * .04)}"/><path d="M${n1(x)} ${n1(y)}L${p(b)}A${n1(r)} ${n1(r * .38)} 0 0 1 ${p(b + 90)}Z" fill="${light(c, .12)}" opacity=".7"/><path d="${veins}" stroke="${light(c, .2)}" stroke-width="${n1(r * .035)}" opacity=".55"/>`;
}
// 木漏れ日の光の帯：上ほど明るく、下へ消えていく
export function beams(x0, x1, n, color = '#fffbe0', { opacity = .14, slant = [10, 24] } = {}) {
  const [id, d] = lgrad([[0, color, 1], [.7, color, .35], [1, color, 0]]);
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = R(x0, x1), w = R(1.5, 5), sl = R(slant[0], slant[1]);
    s += `<path class="beam" style="animation-delay:${n1(-R(0, 6))}s" d="M${n1(x)} -5L${n1(x + w)} -5L${n1(x + w * 1.6 + sl)} 105L${n1(x + sl - w * .3)} 105Z" fill="url(#${id})" opacity="${n1(opacity * R(.6, 1.2) * 100) / 100}"/>`;
  }
  return `<defs>${d}</defs><g style="mix-blend-mode:screen">${s}</g>`;
}
// 水面のゆらめき（コースティクス）
export function caustics(x0, x1, y0, y1, n, c) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = R(x0, x1), y = R(y0, y1), w = R(2, 7);
    s += `<path class="shimmer" style="animation-delay:${n1(-R(0, 4))}s" d="M${n1(x)} ${n1(y)}q${n1(w * .5)} ${n1(-R(.3, 1))} ${n1(w)} 0q${n1(-w * .5)} ${n1(R(.3, 1))} ${n1(-w)} 0Z" fill="${c}"/>`;
  }
  return s;
}
// 紙を切り抜いたような珊瑚（白い点線の模様つき）
export function coral(x, y, s, c, { dashes = true, cls = 'sway slow' } = {}) {
  track(x - s * .55, y - s * .95); track(x + s * .55, y);
  let out = '', marks = '';
  const branch = (bx, by, ang, len, w, depth) => {
    const ex = bx + Math.sin(ang * D) * len, ey = by - Math.cos(ang * D) * len;
    const nx = Math.cos(ang * D), ny = Math.sin(ang * D), w0 = w / 2, w1 = w * .34, mx = (bx + ex) / 2 + R(-len * .12, len * .12), my = (by + ey) / 2, wm = (w0 + w1) / 2;
    out += `<path d="M${n1(bx - nx * w0)} ${n1(by - ny * w0)}Q${n1(mx - nx * wm)} ${n1(my - ny * wm)} ${n1(ex - nx * w1)} ${n1(ey - ny * w1)}A${n1(w1)} ${n1(w1)} 0 0 1 ${n1(ex + nx * w1)} ${n1(ey + ny * w1)}Q${n1(mx + nx * wm)} ${n1(my + ny * wm)} ${n1(bx + nx * w0)} ${n1(by + ny * w0)}Z" fill="${c}"/>`;
    if (depth === 3) out += `<path d="M${n1(bx + nx * w0 * .2)} ${n1(by + ny * w0 * .2)}Q${n1(mx + nx * wm * .5)} ${n1(my + ny * wm * .5)} ${n1(ex + nx * w1 * .4)} ${n1(ey + ny * w1 * .4)}" stroke="${dark(c, .12)}" stroke-width="${n1(w * .22)}" fill="none" stroke-linecap="round" opacity=".6"/>`;
    if (dashes) for (let k = 0; k < len / 2.2; k++) {
      const t = R(.1, .95), mx = bx + (ex - bx) * t + R(-w * .25, w * .25), my = by + (ey - by) * t;
      marks += `<rect x="${n1(mx)}" y="${n1(my)}" width="${n1(w * .12)}" height="${n1(w * .38)}" rx="${n1(w * .06)}" fill="#ffffff" opacity=".55" transform="rotate(${n1(ang)} ${n1(mx)} ${n1(my)})"/>`;
    }
    if (depth > 0) for (let i = 0; i < 2 + (rnd() < .35 ? 1 : 0); i++) branch(ex, ey, ang + (i ? 1 : -1) * R(14, 40), len * R(.62, .8), w * .68, depth - 1);
  };
  branch(x, y, R(-10, 10), s * .3, s * .13, 3);
  return anim(cls, x, y, out + marks);
}
export function kelp(x, y, h, c, { cls = 'sway' } = {}) {
  track(x - h * .22, y - h * 1.05); track(x + h * .22, y);
  let d = `M${n1(x)} ${n1(y)}`, blades = '';
  for (let i = 1; i <= 8; i++) d += `Q${n1(x + (i % 2 ? 1.6 : -1.6))} ${n1(y - h * (i - .5) / 8)} ${n1(x)} ${n1(y - h * i / 8)}`;
  for (let i = 0; i < 7; i++) blades += lance(x, y - h * (i + 1.2) / 8, h * .2, h * .045, i % 2 ? 55 : -55, c, { half: false });
  return anim(cls, x, y, `<path d="${d}" stroke="${c}" stroke-width="${n1(h * .025)}" fill="none"/>${blades}`);
}
// 山：少しえぐれた斜面、光の当たらない右の面に影、峰に雪
export function mountains(x0, x1, base, peakMin, peakMax, c, snow, { wmin = 16, wmax = 32 } = {}) {
  let d = `M${n1(x0)} 105L${n1(x0)} ${n1(base)}`, sh = '', sn = '';
  let x = x0, vy = base - R(0, 4);
  const shade = dark(c, .1);
  while (x < x1) {
    const w = R(wmin, wmax), py = R(peakMin, peakMax), px = x + w * R(.35, .65), nx = x + w, ny = base - R(0, (base - py) * .45);
    const c1 = [x + (px - x) * .62, vy - (vy - py) * .28], c2 = [px + (nx - px) * .38, ny - (ny - py) * .28];
    d += `Q${n1(c1[0])} ${n1(c1[1])} ${n1(px)} ${n1(py)}Q${n1(c2[0])} ${n1(c2[1])} ${n1(nx)} ${n1(ny)}`;
    sh += `<path d="M${n1(px)} ${n1(py)}Q${n1(c2[0])} ${n1(c2[1])} ${n1(nx)} ${n1(ny)}L${n1(nx)} 105L${n1(px + w * .08)} 105Q${n1(px + w * .02)} ${n1(py + (base - py) * .5)} ${n1(px)} ${n1(py)}Z" fill="${shade}"/>`;
    if (snow) {
      const q = (A, C, B, t) => [(1 - t) * (1 - t) * A[0] + 2 * (1 - t) * t * C[0] + t * t * B[0], (1 - t) * (1 - t) * A[1] + 2 * (1 - t) * t * C[1] + t * t * B[1]];
      const L = q([x, vy], c1, [px, py], .74), Rr = q([px, py], c2, [nx, ny], .26);
      const jag = [.2, .4, .6, .8].map((t, i) => [L[0] + (Rr[0] - L[0]) * t, L[1] + (Rr[1] - L[1]) * t - (i % 2 ? R(1.2, 2.2) : R(-.6, .4))]);
      sn += `<path d="M${n1(px)} ${n1(py)}Q${n1(c1[0] + (px - c1[0]) * .6)} ${n1(c1[1] + (py - c1[1]) * .6)} ${n1(L[0])} ${n1(L[1])}${jag.map((p) => `L${n1(p[0])} ${n1(p[1])}`).join('')}L${n1(Rr[0])} ${n1(Rr[1])}Q${n1(px + (c2[0] - px) * .4)} ${n1(py + (c2[1] - py) * .4)} ${n1(px)} ${n1(py)}Z" fill="${snow}"/>`;
    }
    x = nx; vy = ny;
  }
  d += `L${n1(x)} 105Z`;
  return `<path d="${d}" fill="${c}"/>${sh}${sn}`;
}
// 空を泳ぐ魚の群れ
export function fishSchool(cx, cy, n, c, spread = 14) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = cx + R(-spread, spread), y = cy + R(-spread * .35, spread * .35), l = R(1.1, 2);
    s += `<path d="M${n1(x)} ${n1(y)}q${n1(l * .5)} ${n1(-l * .35)} ${n1(l)} 0l${n1(l * .35)} ${n1(-l * .25)}v${n1(l * .5)}l${n1(-l * .35)} ${n1(-l * .25)}q${n1(-l * .5)} ${n1(l * .35)} ${n1(-l)} 0Z" fill="${c}"/>`;
  }
  track(cx - spread, cy - spread * .4); track(cx + spread + 2, cy + spread * .4);
  return `<g class="swim">${s}</g>`;
}
export function jelly(x, y, r, { cls = 'float' } = {}) {
  let tent = '';
  for (let k = -2; k <= 2; k++) tent += `<path d="M${n1(x + k * r * .3)} ${n1(y)}q${n1(r * .2)} ${n1(r * .8)} 0 ${n1(r * 1.8)}" stroke="#e6fbff" stroke-width="${n1(r * .08)}" fill="none" opacity=".7"/>`;
  return `<g class="${cls}" style="animation-delay:${n1(-R(0, 6))}s"><ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(r * 2.2)}" ry="${n1(r * 2.2)}" fill="#bff6ff" opacity=".18"/><path d="M${n1(x - r)} ${n1(y)}a${n1(r)} ${n1(r * .85)} 0 0 1 ${n1(r * 2)} 0Z" fill="#e6fbff" opacity=".85"/>${tent}</g>`;
}
function stars(W, n) {
  let s = '';
  for (let i = 0; i < n; i++) s += `<circle class="twinkle" style="animation-delay:${n1(-R(0, 4))}s" cx="${n1(R(0, W))}" cy="${n1(R(0, 55))}" r="${n1(R(.08, .28))}" fill="#fff6e0"/>`;
  return s;
}
// ---------- 夜空：星（明るさ 3 段階）、天の川、月明かりの薄雲、オーロラ ----------
// 奥の層に焼く分（ぼかさない）と、画面に直接置いてくっきり見せる分（明るい星・月）に分けて返す
const n2s = (v) => Math.round(v * 100) / 100;
export function nightSky(x0, x1, y0, y1, { density = 1, fade = null, milky = null } = {}) {
  let s = '';
  const bright = [], span = x1 - x0, keep = (x) => !fade || rnd() < fade(x);
  const depth = (y) => 1 - (y - y0) / (y1 - y0) * .55; // 地平線に近いほど淡く
  // かすかな星（たくさん、ごく小さく）
  for (let i = 0; i < span * 2.4 * density; i++) {
    const x = R(x0, x1); if (!keep(x)) continue;
    const y = y0 + (y1 - y0) * Math.pow(rnd(), 1.25);
    s += `<circle cx="${n2s(x)}" cy="${n2s(y)}" r="${n2s(R(.03, .085))}" fill="${pick(['#ffffff', '#e6edff', '#fff2da'])}" opacity="${n2s(R(.35, .9) * depth(y))}"/>`;
  }
  // 中くらいの星（小さな光のにじみ付き）
  for (let i = 0; i < span * .32 * density; i++) {
    const x = R(x0, x1); if (!keep(x)) continue;
    const y = y0 + (y1 - y0) * Math.pow(rnd(), 1.5), r = R(.09, .16), c = pick(['#ffffff', '#dfe8ff', '#ffecc8', '#cfdcff']);
    s += `<circle cx="${n2s(x)}" cy="${n2s(y)}" r="${n2s(r * 2.6)}" fill="${c}" opacity="${n2s(.04 * depth(y))}"/><circle cx="${n2s(x)}" cy="${n2s(y)}" r="${n2s(r * 1.6)}" fill="${c}" opacity="${n2s(.1 * depth(y))}"/><circle cx="${n2s(x)}" cy="${n2s(y)}" r="${n2s(r)}" fill="${c}" opacity="${n2s(depth(y))}"/>`;
  }
  // 明るい星（またたかせるので、画面に直接置く）：[x, y, 大きさ, 色, 遅れ]
  for (let i = 0; i < Math.max(3, span * .055 * density); i++) {
    const x = R(x0 + 2, x1 - 2); if (!keep(x)) continue;
    bright.push([n2s(x), n2s(y0 + (y1 - y0) * Math.pow(rnd(), 1.7) * .75), n2s(R(1.4, 2.4)), pick(['#fffaf0', '#e3ebff', '#ffe9c8']), n2s(R(0, 5))]);
  }
  // 天の川：ぼかした光の帯と、暗い塵の筋、帯に沿って密に集まる小さな星
  if (milky) {
    // ぼかし（フィルター）は焼くのが重いので使わず、中心から外へ透明になるグラデーションで柔らかくする
    const [ax, ay, bx, by, wd] = milky, ang = Math.atan2(by - ay, bx - ax) * 180 / Math.PI, id = `mw${gid++}`;
    const soft = (c, k) => `<radialGradient id="${id}${k}"><stop offset="0" stop-color="${c}"/><stop offset=".5" stop-color="${c}" stop-opacity=".45"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
    const cols = ['#b9b4ff', '#d8c9ff', '#c6d6ff', '#f0dcc8'];
    const along = (t, off = 0) => { const nx = -(by - ay), ny = bx - ax, L = Math.hypot(nx, ny); return [ax + (bx - ax) * t + nx / L * off, ay + (by - ay) * t + Math.sin(t * Math.PI) * wd * .5 + ny / L * off]; };
    let band = '';
    for (let i = 0; i < 34; i++) { const t = i / 33 + R(-.01, .01), [x, y] = along(t, R(-wd * .15, wd * .15)); band += `<ellipse cx="${n2s(x)}" cy="${n2s(y)}" rx="${n2s(R(wd * 1.4, wd * 2.4))}" ry="${n2s(R(wd * .5, wd * .85))}" transform="rotate(${n2s(ang)} ${n2s(x)} ${n2s(y)})" fill="url(#${id}${Math.floor(rnd() * 4)})" opacity="${n2s(R(.1, .2))}"/>`; }
    for (let i = 0; i < 12; i++) { const t = R(.05, .95), [x, y] = along(t, R(-wd * .1, wd * .1)); band += `<ellipse cx="${n2s(x)}" cy="${n2s(y)}" rx="${n2s(R(wd * .9, wd * 1.8))}" ry="${n2s(R(wd * .1, wd * .22))}" transform="rotate(${n2s(ang + R(-8, 8))} ${n2s(x)} ${n2s(y)})" fill="url(#${id}d)" opacity="${n2s(R(.25, .45))}"/>`; }
    s += `<defs>${cols.map((c, k) => soft(c, k)).join('')}${soft('#070820', 'd')}</defs>${band}`;
    for (let i = 0; i < 380 * density; i++) { const t = rnd(), off = (rnd() + rnd() + rnd() - 1.5) * wd * .75, [x, y] = along(t, off); if (x < x0 || x > x1 || !keep(x)) continue; s += `<circle cx="${n2s(x)}" cy="${n2s(y)}" r="${n2s(R(.025, .07))}" fill="#fff" opacity="${n2s(R(.3, .85))}"/>`; }
  }
  return { svg: s, bright };
}
// 月明かりの薄い雲（横に長く、両端が消える）
function wisps(x0, x1, y0, y1, n, c = '#cfcaf2') {
  const id = `ws${gid++}`;
  let s = '';
  for (let i = 0; i < n; i++) { const x = R(x0, x1), y = R(y0, y1), w = R(12, 30), h = R(.9, 2); s += `<ellipse cx="${n2s(x)}" cy="${n2s(y)}" rx="${n2s(w)}" ry="${n2s(h)}" fill="url(#${id})" opacity="${n2s(R(.3, .6))}" transform="rotate(${n2s(R(-4, 2))} ${n2s(x)} ${n2s(y)})"/>`; }
  return `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity=".55"/><stop offset=".55" stop-color="${c}" stop-opacity=".2"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs>${s}`;
}
// オーロラ：下の縁が明るく、上へ淡く消えていく光のカーテン。縦の筋を重ね、ゆるく波打たせる
function aurora(x0, x1, yBot, h) {
  const [gi, gd] = lgrad([[0, '#a88cff', 0], [.35, '#9a86ff', .14], [.7, '#56e6b4', .5], [.9, '#b6ffe0', .75], [1, '#b6ffe0', 0]]);
  let a = '';
  for (let k = 0; k < 3; k++) {
    const base = yBot - k * R(2.5, 5), amp = R(1.5, 4), ph = R(0, 6), f = R(1.1, 1.8), hk = h * R(.7, 1.05);
    for (let x = x0; x < x1; x += R(.3, .7)) {
      const t = (x - x0) / (x1 - x0), yb = base + Math.sin(t * Math.PI * 2 * f + ph) * amp, hh = hk * R(.55, 1.05) * (.6 + .4 * Math.sin(t * 9 + ph * 2) ** 2);
      a += `<rect x="${n2s(x - .3)}" y="${n2s(yb - hh)}" width="${n2s(R(.7, 1.3))}" height="${n2s(hh)}" fill="url(#${gi})" opacity="${n2s(R(.12, .42) * (k ? .7 : 1))}"/>`;
    }
  }
  return `<defs>${gd}</defs><g opacity=".85">${a}</g>`;
}
// 夕焼けの雲：上がもこもこ、下が平らな 1 枚の形。上は夕日に照らされて明るく、下は影の色。
// 太陽側の上の縁にもう一段明るい面を重ね、外側にうすい縁を付けて、フィルターなしでやわらかく見せる
function sunsetCloud(x, y, w, h, sunX, tones) {
  const [top, mid, under, rim] = tones, id = `sc${gid++}`, side = sunX > x ? 1 : -1;
  const n = Math.max(3, Math.round(w / 7)), x0 = x - w / 2, pts = [];
  for (let i = 0; i <= n; i++) pts.push(x0 + w * i / n + (i && i < n ? R(-w / n * .2, w / n * .2) : 0));
  const shape = (k, dy) => {
    let d = `M${n1(x0 + w * (1 - k) / 2)} ${n1(y + dy)}`;
    for (let i = 0; i < n; i++) {
      const a = x + (pts[i] - x) * k, b = x + (pts[i + 1] - x) * k, t = (i + .5) / n, hh = h * (.55 + Math.sin(t * Math.PI) * .9) * R(.8, 1.15) * k;
      d += `C${n1(a)} ${n1(y + dy - hh)} ${n1(b)} ${n1(y + dy - hh)} ${n1(b)} ${n1(y + dy - h * .12 * k)}`;
    }
    return d + `Q${n1(x)} ${n1(y + dy + h * .18 * k)} ${n1(x0 + w * (1 - k) / 2)} ${n1(y + dy)}Z`;
  };
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${under}"/></linearGradient></defs>`
    + `<path d="${shape(1.06, h * .04)}" fill="${mid}" opacity=".22"/>`
    + `<path d="${shape(1, 0)}" fill="url(#${id})"/>`
    + `<path d="${shape(.62, -h * .3)}" fill="${rim}" opacity=".32" transform="translate(${n1(side * w * .12)} 0)"/>`;
}
// 筆でなでたような横長の雲（作品 Sunset Session の空の描き方）：両端がすっと消える細長い帯を、少しずつずらして重ねる。
// 輪郭の線もぼかしも使わず、帯の芯・まわり・下の縁（夕日の照り返し）を透明度の違う面で重ねて柔らかく見せる
function brushCloud(x, y, w, h, g, sunX, tones) {
  const [body, core, under, rim] = tones, id = `bc${gid++}`, ids = [body, core, under, rim].map((c, i) => [`${id}${i}`, c]);
  let s = `<defs>${ids.map(([k, c]) => `<linearGradient id="${k}"><stop offset="0" stop-color="${c}" stop-opacity="0"/><stop offset=".22" stop-color="${c}" stop-opacity=".85"/><stop offset=".7" stop-color="${c}" stop-opacity=".9"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient>`).join('')}</defs>`;
  // 1 本の帯：上下の縁がゆるく波打ち、両端は細くなる
  const streak = (cx, cy, L, t, fill, op) => {
    const N = 14, ph = g() * 6, top = [], bot = [];
    for (let i = 0; i <= N; i++) { const u = i / N, xx = cx - L / 2 + L * u, taper = Math.pow(Math.sin(Math.PI * u), .55), wave = Math.sin(u * 5 + ph) * t * .18; top.push([xx, cy - t / 2 * taper + wave]); bot.push([xx, cy + t / 2 * taper * .8 + wave * .6]); }
    return `<path d="M${top.map((q) => `${n1(q[0])} ${n2(q[1])}`).join('L')}L${bot.reverse().map((q) => `${n1(q[0])} ${n2(q[1])}`).join('L')}Z" fill="url(#${fill})" opacity="${n2(op)}"/>`;
  };
  const toSun = Math.max(0, 1 - Math.abs(x - sunX) / 90); // 太陽に近い雲ほど芯が明るい
  const n = 3 + Math.floor(g() * 3);
  for (let i = 0; i < n; i++) {
    const cx = x + (g() - .5) * w * .4, cy = y + (i - (n - 1) / 2) * h * .38 + (g() - .5) * h * .2, L = w * (.55 + g() * .6), t = h * (.35 + g() * .3);
    s += streak(cx, cy, L * 1.12, t * 1.9, ids[0][0], .28);                         // まわりのかすみ
    s += streak(cx + (g() - .5) * 2, cy, L, t, ids[0][0], .75);                      // 帯
    s += streak(cx + (g() - .5) * 3, cy - t * .12, L * .62, t * .42, ids[1][0], .45 + toSun * .35); // 芯の明るいところ
    s += streak(cx + (g() - .5) * 3, cy + t * .34, L * .7, t * .3, ids[2][0], .5);   // 下の影
    s += streak(cx + (g() - .5) * 3, cy + t * .5, L * .5, t * .16, ids[3][0], .25 + toSun * .45); // 下の縁の夕日の照り返し
  }
  track(x - w, y - h); track(x + w, y + h);
  return s;
}
// 細くたなびく雲（地平線近く）：下の縁が夕日に照らされる
function streakCloud(x0, x1, y, h, c, lit) {
  const id = `st${gid++}`;
  let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity="0"/><stop offset=".55" stop-color="${c}" stop-opacity=".75"/><stop offset=".8" stop-color="${lit}" stop-opacity=".9"/><stop offset="1" stop-color="${lit}" stop-opacity="0"/></linearGradient></defs>`;
  for (let x = x0; x < x1; x += R(18, 40)) { const w = R(20, 46), hh = h * R(.6, 1.2), yy = y + R(-h, h); s += `<path d="M${n1(x)} ${n1(yy)}Q${n1(x + w * .3)} ${n1(yy - hh)} ${n1(x + w * .6)} ${n1(yy - hh * .6)}Q${n1(x + w * .85)} ${n1(yy - hh * .9)} ${n1(x + w)} ${n1(yy)}Q${n1(x + w * .5)} ${n1(yy + hh * .35)} ${n1(x)} ${n1(yy)}Z" fill="url(#${id})" opacity="${n1(R(.5, .9))}"/>`; }
  return s;
}
// 夕日：光冠と、放射状に伸びる淡い光の筋。円盤は中心が白く、縁が金色
function setSun(x, y, r) {
  const id = `sn${gid++}`;
  let s = `<defs><radialGradient id="${id}d"><stop offset="0" stop-color="#fffdf0"/><stop offset=".6" stop-color="#fff2c8"/><stop offset="1" stop-color="#ffd98f"/></radialGradient>`
    + `<radialGradient id="${id}c"><stop offset="0" stop-color="#fff0c4" stop-opacity=".75"/><stop offset=".2" stop-color="#ffe0a4" stop-opacity=".45"/><stop offset=".5" stop-color="#ffc98e" stop-opacity=".16"/><stop offset="1" stop-color="#ffb482" stop-opacity="0"/></radialGradient>`
    + `<linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff1c8" stop-opacity=".22"/><stop offset="1" stop-color="#fff1c8" stop-opacity="0"/></linearGradient></defs>`;
  for (let i = 0; i < 14; i++) { const a = -Math.PI + (i + .5) / 14 * Math.PI + R(-.08, .08), L = r * R(7, 13), w = R(.035, .08); s += `<path d="M${n1(x)} ${n1(y)}L${n1(x + Math.cos(a - w) * L)} ${n1(y + Math.sin(a - w) * L)}L${n1(x + Math.cos(a + w) * L)} ${n1(y + Math.sin(a + w) * L)}Z" fill="#fff1c8" opacity="${n2s(R(.025, .055))}"/>`; }
  s += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r * 9)}" fill="url(#${id}c)"/><circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r)}" fill="url(#${id}d)"/>`;
  return s;
}
// 梢の間から差し込む光の筋（上が明るく、下へ消える）
function godRays(x0, x1, y0, y1, n, c = '#fff8dc', slant = -.35) {
  const id = `gr${gid++}`;
  let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".55"/><stop offset=".6" stop-color="${c}" stop-opacity=".18"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs>`;
  for (let i = 0; i < n; i++) { const x = R(x0, x1), w0 = R(1, 3), w1 = w0 * R(2.2, 3.6), dx = (y1 - y0) * slant; s += `<path d="M${n1(x)} ${n1(y0)}L${n1(x + w0)} ${n1(y0)}L${n1(x + dx + w1)} ${n1(y1)}L${n1(x + dx)} ${n1(y1)}Z" fill="url(#${id})" opacity="${n1(R(.25, .6))}"/>`; }
  return s;
}
// 水面に映る雲（上から見下ろす池に、空の雲がゆっくり映り込む）
function cloudReflections(x0, x1, y0, y1, n, c = '#f4f6e4') {
  const id = `cr${gid++}`;
  let s = `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity=".3"/><stop offset=".5" stop-color="${c}" stop-opacity=".12"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs>`;
  for (let i = 0; i < n; i++) { const x = R(x0, x1), y = R(y0, y1), w = R(14, 28); for (let k = 0; k < 3; k++) s += `<ellipse cx="${n1(x + R(-w * .4, w * .4))}" cy="${n1(y + R(-1.5, 1.5))}" rx="${n1(w * R(.45, .7))}" ry="${n1(w * R(.12, .2))}" fill="url(#${id})"/>`; }
  return s;
}
// ---------- 足もとの小物 ----------
// 巻き貝・二枚貝・ヒトデ・シーグラス
function beachShell(x, y, s, kind) {
  if (kind === 0) return `<path d="M${n1(x)} ${n1(y)}q${n1(s * .1)} ${n1(-s * .9)} ${n1(s * .55)} ${n1(-s * .9)}q${n1(s * .45)} 0 ${n1(s * .45)} ${n1(s * .9)}Z" fill="#f3e3cc"/>` + [.25, .5, .75].map((t) => `<path d="M${n1(x + s * .5)} ${n1(y - s * .85)}L${n1(x + s * t * 1.1)} ${n1(y)}" stroke="#d2b894" stroke-width=".1"/>`).join('') + `<path d="M${n1(x)} ${n1(y)}h${n1(s * 1.02)}" stroke="#c7a57c" stroke-width=".14"/>`;
  if (kind === 1) return `<path d="M${n1(x)} ${n1(y)}q${n1(s * .2)} ${n1(-s * .8)} ${n1(s * .7)} ${n1(-s * .55)}q${n1(s * .4)} ${n1(s * .3)} ${n1(s * .1)} ${n1(s * .55)}Z" fill="#e9cfae"/><path d="M${n1(x + s * .2)} ${n1(y - s * .15)}q${n1(s * .25)} ${n1(-s * .35)} ${n1(s * .45)} ${n1(-s * .1)}" stroke="#b58e66" stroke-width=".12" fill="none"/><circle cx="${n1(x + s * .62)}" cy="${n1(y - s * .45)}" r="${n1(s * .1)}" fill="#fbf3e6"/>`;
  if (kind === 2) { let d = ''; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5, b = a + Math.PI / 5; d += `${i ? 'L' : 'M'}${n1(x + Math.cos(a) * s)} ${n1(y + Math.sin(a) * s * .6)}L${n1(x + Math.cos(b) * s * .4)} ${n1(y + Math.sin(b) * s * .24)}`; } return `<path d="${d}Z" fill="#e59a7a"/><circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(s * .12)}" fill="#f6c0a0"/>`; }
  return `<path d="M${n1(x)} ${n1(y)}l${n1(s * .5)} ${n1(-s * .35)}l${n1(s * .45)} ${n1(s * .15)}l${n1(-s * .2)} ${n1(s * .3)}Z" fill="${pick(['#9fd8c8', '#b9e0f0', '#e8d6a8'])}" opacity=".75"/><path d="M${n1(x + s * .2)} ${n1(y - s * .1)}l${n1(s * .3)} ${n1(-s * .15)}" stroke="#fff" stroke-width=".1" opacity=".8"/>`;
}
// 砂に残る足あと（波打ちぎわに沿って）
function footprints(x0, x1, y, n, keep = () => true) {
  let s = '';
  for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * i / n, yy = y + (i % 2 ? .7 : -.7) + Math.sin(i * .4) * 1.2; if (!keep(x, yy)) continue; s += `<ellipse cx="${n1(x)}" cy="${n1(yy)}" rx=".75" ry=".32" fill="#b99f7c" opacity=".45"/><ellipse cx="${n1(x + .5)}" cy="${n1(yy - .05)}" rx=".22" ry=".18" fill="#b99f7c" opacity=".45"/>`; }
  return s;
}
// 濡れた石畳に落ちる街灯の光と、水たまりの映り込み
function puddle(x, y, w, c) {
  const id = `pd${gid++}`;
  return `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity=".55"/><stop offset=".6" stop-color="${c}" stop-opacity=".18"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs><ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(w)}" ry="${n1(w * .16)}" fill="#0b0a12" opacity=".45"/><ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(w * .9)}" ry="${n1(w * .13)}" fill="url(#${id})"/><path d="M${n1(x - w * .5)} ${n1(y - w * .02)}h${n1(w * .35)}M${n1(x + w * .1)} ${n1(y + w * .03)}h${n1(w * .3)}" stroke="#fff3d6" stroke-width=".12" opacity=".5"/>`;
}
// 作家の欄の結び：森の稜線と小屋のシルエット（窓にひとつ灯り）。横長の帯（viewBox 0 0 200 40、下端が地面）
export function farewellSVG() {
  reseed(97);
  // 小屋はスマホでも切れないよう真ん中寄り（x = 104〜124）に建てる
  const cx = 114, id = `fw${gid++}`;
  let back = '', front = '';
  for (let x = -4; x < 204; x += R(2.2, 4)) back += pine(x, 40, R(9, 16), '#141838', '#1d2350');
  for (let x = -4; x < 204; x += R(3, 5.5)) { if (x > cx - 13 && x < cx + 13) continue; front += pine(x, 41, R(14, 24), '#0a0c20', '#12163a'); }
  const cabin = `<defs><radialGradient id="${id}"><stop offset="0" stop-color="#ffc873" stop-opacity=".35"/><stop offset=".35" stop-color="#ffb45a" stop-opacity=".12"/><stop offset="1" stop-color="#ffb45a" stop-opacity="0"/></radialGradient></defs>`
    + `<circle class="fw-glow" cx="${cx - 4}" cy="33" r="14" fill="url(#${id})"/>`
    + `<path d="M${cx - 10} 41V29L${cx} 21L${cx + 10} 29V41Z" fill="#0a0c20"/><path d="M${cx - 12} 29.6L${cx} 19.6L${cx + 12} 29.6" stroke="#0a0c20" stroke-width="1.6" fill="none"/><path d="M${cx + 5.5} 24.2V19.6H${cx + 8}V26.2" fill="#0a0c20"/>`
    + `<rect class="fw-win" x="${cx - 6}" y="31" width="4" height="4" fill="#ffc873"/><path d="M${cx - 4} 31v4M${cx - 6} 33h4" stroke="#0a0c20" stroke-width=".4"/>`
;
  const anim = [0, 1, 2].map((k) => `<circle class="fw-puff" style="--d:${n1(-k * 2.3)}s" cx="${cx + 6.7}" cy="18.6" r=".7" fill="#8a90b8" opacity="0"/>`).join('')
    + Array.from({ length: 7 }, (_, k) => `<circle class="fw-fly" style="--d:${n1(-k * 1.7)}s;--dx:${n1(R(-6, 6))}px;--dy:${n1(R(-4, 2))}px" cx="${n1(R(10, 190))}" cy="${n1(R(28, 39))}" r=".38" fill="#d9e28a"/>`).join('')
    + `<path class="fw-star" d="M0 -.25H9V.25H0Z" fill="#fff"/>`;
  // 動くもの（煙・ホタル・流れ星）は別の薄い絵に分ける：動くたびに森と小屋まで描き直さないように
  return `<svg class="fw-land" viewBox="0 0 200 40" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${back}${cabin}${front}<rect x="-5" y="40.5" width="210" height="5" fill="#0a0c20"/></svg><svg class="fw-anim" viewBox="0 0 200 40" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${anim}</svg>`;
}
// 月（画面に直接置く、ぼやけない月）。viewBox は -50〜50、月の半径は 10。kind：'full' 満月 / 'crescent' 三日月（欠けた側も地球照でほのかに見える）
// 今夜の本当の月の満ち欠け（0 = 新月、.5 = 満月）。基準の新月（2000-01-06 18:14 UTC）からの日数を、平均の朔望月で割った余り
export function moonAge(date = new Date()) {
  const days = (date.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5;
  return ((days / 29.530588853) % 1 + 1) % 1;
}
// 今夜の月の光っている割合（0 = 新月、1 = 満月）
export const moonLit = (date) => (1 - Math.cos(moonAge(date) * Math.PI * 2)) / 2;
export function moonSVG(kind = 'full', halo = false) {
  const id = `mn${gid++}`;
  // 'real'：今夜の本当の形。光っている側は、日本から見た向き（満ちていくときは右、欠けていくときは左）
  const age = kind === 'real' ? moonAge() : null, lit = age == null ? 1 : (1 - Math.cos(age * Math.PI * 2)) / 2;
  const maria = [[-3.2, -3.4, 3.4, 2.5, 20], [2.6, -2.4, 2.6, 2.1, -15], [.8, 3, 3.3, 2.3, 10], [-4.4, 2.4, 1.9, 2.8, 0], [5, 1.4, 1.5, 1.9, 30], [-.8, -6.6, 1.6, 1, 0]];
  const craters = [[-5.8, -5.2, .55], [4.2, 5.6, .7], [-2, 6.8, .45], [6.4, -3.8, .4], [-6.9, 1, .42], [2.2, -7, .35]];
  const disc = `<circle r="10" fill="url(#${id}b)"/><g filter="url(#${id}s)">${maria.map(([x, y, rx, ry, a]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${a} ${x} ${y})" fill="#c9bb98" opacity=".55"/>`).join('')}</g>`
    + craters.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#d9cca9" opacity=".6"/><path d="M${x - r * .7} ${y + r * .45}A${r} ${r} 0 0 0 ${x + r * .6} ${y + r * .55}" stroke="#fffaf0" stroke-width=".16" fill="none" opacity=".55"/>`).join('')
    + `<circle r="10" fill="url(#${id}l)"/>`;
  const defs = `<defs><radialGradient id="${id}b" cx=".4" cy=".38" r=".7"><stop offset="0" stop-color="#fffdf3"/><stop offset=".6" stop-color="#f7efd6"/><stop offset="1" stop-color="#e6d8b2"/></radialGradient>`
    + `<radialGradient id="${id}l"><stop offset=".72" stop-color="#8a7650" stop-opacity="0"/><stop offset="1" stop-color="#8a7650" stop-opacity=".35"/></radialGradient>`
    + `<radialGradient id="${id}g"><stop offset=".18" stop-color="#fff3d2" stop-opacity=".5"/><stop offset=".32" stop-color="#fff0cc" stop-opacity=".18"/><stop offset=".6" stop-color="#e8e4ff" stop-opacity=".06"/><stop offset="1" stop-color="#e8e4ff" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="${id}h"><stop offset=".84" stop-color="#fff" stop-opacity="0"/><stop offset=".88" stop-color="#ffd6c4" stop-opacity=".07"/><stop offset=".905" stop-color="#fff6e6" stop-opacity=".09"/><stop offset=".935" stop-color="#cfe0ff" stop-opacity=".05"/><stop offset=".97" stop-color="#cfe0ff" stop-opacity="0"/></radialGradient>`
    + `<filter id="${id}s" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".7"/></filter><filter id="${id}t" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".55"/></filter>`
    + (kind === 'crescent' ? `<mask id="${id}m"><circle r="10.2" fill="#fff"/><circle cx="4" cy="-2.7" r="8.9" fill="#000" filter="url(#${id}t)"/></mask>` : '')
    + (age != null ? `<mask id="${id}m"><path d="${phasePath(age, 10.15)}" fill="#fff" filter="url(#${id}t)"/></mask>` : '') + '</defs>';
  // 光のにじみは、光っている面の広さに合わせて（新月に近いほど、ほとんど光らない）
  const gk = kind === 'crescent' ? .6 : age != null ? .08 + lit * .92 : 1;
  const glow = `<circle r="50" fill="url(#${id}g)"${gk < 1 ? ` opacity="${gk.toFixed(2)}"` : ''}/>` + (halo ? `<circle r="46" fill="url(#${id}h)"/>` : '');
  const body = kind === 'crescent' || age != null
    ? `<g opacity="${age != null ? n2(.05 + .15 * Math.min(1, lit * 8)) : .2}"><circle r="10" fill="#9aa4cf"/>${maria.map(([x, y, rx, ry, a]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${a} ${x} ${y})" fill="#6f78a6" opacity=".5"/>`).join('')}</g><g mask="url(#${id}m)">${disc}</g>`
    : disc;
  return `<svg viewBox="-50 -50 100 100" aria-hidden="true">${defs}${glow}${body}</svg>`;
}
// 月の光っている部分の形：半円（満ちていくときは右半分）と、明暗の境め（楕円の半分）でかこむ
function phasePath(age, r) {
  const waxing = age < .5, k = Math.cos(age * Math.PI * 2), rx = Math.abs(k) * r, crescent = k > 0;
  // 外側の半円：上 → 右 → 下（満ちていく）／上 → 左 → 下（欠けていく）。境めは下 → 上へ、三日月なら光っている側へ、半月より太ければ反対側へふくらむ
  const outer = waxing ? 1 : 0, term = waxing === crescent ? 0 : 1;
  return `M0 ${-r}A${r} ${r} 0 0 ${outer} 0 ${r}A${n2(rx)} ${r} 0 0 ${term} 0 ${-r}Z`;
}
function strands(x0, x1, y, sag, n) {
  let s = `<path d="M${n1(x0)} ${n1(y)}Q${n1((x0 + x1) / 2)} ${n1(y + sag * 2)} ${n1(x1)} ${n1(y)}" stroke="#1a1410" stroke-width=".2" fill="none"/>`;
  for (let i = 1; i < n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t, yy = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * (y + sag * 2) + t * t * y;
    s += `<circle class="twinkle" style="animation-delay:${n1(-R(0, 3))}s" cx="${n1(x)}" cy="${n1(yy + .5)}" r=".45" fill="#ffd79a"/><circle cx="${n1(x)}" cy="${n1(yy + .5)}" r="1.6" fill="#ffb45a" opacity=".18"/>`;
  }
  return s;
}

// ---------- 光と空気 ----------
function lgrad(stops, dir = [0, 0, 0, 1]) {
  const id = `lg${gid++}`;
  return [id, `<linearGradient id="${id}" x1="${dir[0]}" y1="${dir[1]}" x2="${dir[2]}" y2="${dir[3]}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`];
}
function rglow(x, y, r, c, a = .5) {
  const id = `rg${gid++}`;
  return `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity="${a}"/><stop offset=".5" stop-color="${c}" stop-opacity="${n1(a * 40) / 100}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs><circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r)}" fill="url(#${id})"/>`;
}
// 空気遠近：奥ほど霞む
export function haze(x0, x1, y0, y1, c, a0 = 0, a1 = .55) {
  const [id, d] = lgrad([[0, c, a0], [1, c, a1]]);
  return `<defs>${d}</defs><rect x="${n1(x0)}" y="${n1(y0)}" width="${n1(x1 - x0)}" height="${n1(y1 - y0)}" fill="url(#${id})"/>`;
}
// なだらかな地面（上辺がゆるく波打つ面。グラデーションで奥を明るく）
function groundPath(x0, x1, y, amp, c0, c1) {
  const [id, gd] = lgrad([[0, c0], [1, c1]]);
  let d = `M${n1(x0)} 106L${n1(x0)} ${n1(y)}`, x = x0;
  while (x < x1) { const w = R(30, 60); d += `Q${n1(x + w / 2)} ${n1(y + R(-amp, amp))} ${n1(x + w)} ${n1(y + R(-amp * .4, amp * .4))}`; x += w; }
  return `<defs>${gd}</defs><path d="${d}L${n1(x)} 106Z" fill="url(#${id})"/>`;
}

// ---------- 森の遠景：梢の帯、霞む幹、根元の下草（四角は使わない） ----------
function forestBand(x0, x1, { top, depth, ground, c, trunkC, tw = .8, gap = [3, 7], bump = [5, 11], shrubC = c, shrubH = 4 }) {
  let t = '';
  for (let x = x0 + R(0, gap[1]); x < x1; x += R(gap[0], gap[1])) {
    const w = tw * R(.5, 1.6), lean = R(-.8, .8), yt = top + depth * .5, tc = mixC(trunkC, c, R(0, .5));
    if (rnd() < .18) x += gap[1];
    t += `<path d="M${n1(x - w / 2)} ${n1(ground + 1)}Q${n1(x - w * .42)} ${n1((ground + yt) / 2)} ${n1(x - w * .28 + lean)} ${n1(yt)}L${n1(x + w * .28 + lean)} ${n1(yt)}Q${n1(x + w * .42)} ${n1((ground + yt) / 2)} ${n1(x + w / 2)} ${n1(ground + 1)}Z" fill="${tc}"/>`;
  }
  // 梢：上辺は丸い樹冠が並び、下辺はゆるく垂れる
  let x = x0, yp = top + R(-3, 3), d = `M${n1(x0)} ${n1(top + depth)}L${n1(x0)} ${n1(yp)}`;
  while (x < x1) { const w = R(bump[0], bump[1]), y2 = top + R(-3.5, 3.5); d += `Q${n1(x + w * .5)} ${n1(Math.min(yp, y2) - w * R(.45, .7))} ${n1(x + w)} ${n1(y2)}`; x += w; yp = y2; }
  d += `L${n1(x)} ${n1(top + depth)}`;
  while (x > x0) { const w = R(bump[0], bump[1]) * .8, yb = top + depth + R(-2.5, 2.5); d += `Q${n1(x - w * .5)} ${n1(yb + w * .38)} ${n1(x - w)} ${n1(yb)}`; x -= w; }
  d += 'Z';
  let sb = '';
  if (shrubH) {
    x = x0; sb = `M${n1(x0)} ${n1(ground + 2)}L${n1(x0)} ${n1(ground - shrubH * .5)}`;
    while (x < x1) { const w = R(2.5, 6); sb += `Q${n1(x + w / 2)} ${n1(ground - shrubH * R(.5, 1) - w * .3)} ${n1(x + w)} ${n1(ground - shrubH * R(.15, .5))}`; x += w; }
    sb = `<path d="${sb}L${n1(x)} ${n1(ground + 2)}Z" fill="${shrubC}"/>`;
  }
  return t + `<path d="${d}" fill="${c}"/>` + sb;
}

// ---------- 近景の部品 ----------
// 描き込んだ木：根の張り、樹皮、枝、葉のかたまり
// 奥の並木の幹：根もとは少し広がり、上へ細く、ゆるく S 字に曲がる。上のほうで二股に分かれ、淡い樹皮の筋と、左に光
// 梢の下のふち：葉の房が垂れ下がる（房ごとに 5〜8 枚の葉。奥ほど暗く）。すき間からこぼれる光の点
function canopyFringe(x0, x1, tones) {
  const d = hrng(x0 * 1.7 + x1), leaf = (cx, cy, l, a, c) => `<path d="M0 0Q${n1(l * .5)} ${n1(-l * .28)} ${n1(l)} 0Q${n1(l * .5)} ${n1(l * .28)} 0 0Z" transform="translate(${n1(cx)} ${n1(cy)}) rotate(${n1(a)})" fill="${c}"/>`;
  let s = '';
  for (let x = x0; x < x1; x += 2.6 + d() * 3.4) {
    const y = 5 + d() * 7, n = 5 + Math.floor(d() * 4), base = Math.floor(d() * 3);
    // 房の葉は、作品の葉の描き方（葉脈で明るい半分と暗い半分）。房ごとに下へ垂れる向きをそろえる
    const lean = (d() - .5) * 30;
    for (let k = 0; k < n; k++) { const a = 90 + lean + (k - n / 2) * 9 + (d() - .5) * 14, l = 1.6 + d() * 1.6, ci = Math.min(tones.length - 1, base + Math.floor(d() * 2.4)); s += splitLeaf(x + (d() - .5) * 3, y + d() * 2.2, l, l * .42, a, tones[Math.min(tones.length - 1, ci + 1)], tones[ci]); }
  }
  for (let x = x0; x < x1; x += 4 + d() * 7) s += `<ellipse cx="${n1(x)}" cy="${n1(1 + d() * 7)}" rx="${n1(.35 + d() * .6)}" ry="${n1(.25 + d() * .4)}" fill="#fff6c8" opacity="${n1(.35 + d() * .35)}"/>`;
  return s;
}
// 小道の描き込み：土の色むら、落ち葉、ところどころ小道を横切る木の根（上のふちに光）
function trailDetail(x0, x1, y, h) {
  const d = hrng(x0 * 2.3 + y + x1);
  let s = '';
  for (let x = x0; x < x1; x += 3 + d() * 6) s += `<ellipse cx="${n1(x)}" cy="${n1(y + 1 + d() * (h - 2))}" rx="${n1(2 + d() * 5)}" ry="${n1(.4 + d() * .7)}" fill="${d() < .5 ? '#a8905e' : '#e2d3a4'}" opacity="${n1(.18 + d() * .2)}"/>`;
  for (let x = x0; x < x1; x += 1.4 + d() * 2.6) { const cy = y + .6 + d() * (h - 1), l = .7 + d() * .8, a = d() * 180; s += `<path d="M0 0Q${n1(l * .5)} ${n1(-l * .35)} ${n1(l)} 0Q${n1(l * .5)} ${n1(l * .35)} 0 0Z" transform="translate(${n1(x)} ${n1(cy)}) rotate(${n1(a)})" fill="${['#b8793a', '#9a6a36', '#c9954a', '#7d6a3a', '#a5813e'][Math.floor(d() * 5)]}" opacity=".85"/>`; }
  for (let x = x0 + 8 + d() * 20; x < x1; x += 34 + d() * 40) {
    const dir = d() < .5 ? -1 : 1, w = .55 + d() * .35, y0 = y - .6, y1 = y + h - .4, x2 = x + dir * (4 + d() * 5);
    s += `<path d="M${n1(x - w)} ${n1(y0)}C${n1(x - w + dir)} ${n1(y0 + h * .4)} ${n1(x2 - dir * 2)} ${n1(y1 - h * .3)} ${n1(x2)} ${n1(y1)}L${n1(x2 + w * .5)} ${n1(y1)}C${n1(x2 - dir * 1.6)} ${n1(y1 - h * .35)} ${n1(x + w + dir)} ${n1(y0 + h * .35)} ${n1(x + w)} ${n1(y0)}Z" fill="#6a4a2c"/>`;
    s += `<path d="M${n1(x - w * .4)} ${n1(y0)}C${n1(x - w * .4 + dir)} ${n1(y0 + h * .4)} ${n1(x2 - dir * 2)} ${n1(y1 - h * .3)} ${n1(x2)} ${n1(y1 - .2)}" stroke="#a07a4e" stroke-width=".22" fill="none" opacity=".7"/>`;
  }
  return s;
}
// 水面らしさ：線は描かず、空の明るさが映るふちのぼやけた大きな光のむらと、手前ほど深くなる色
function waterSheen(x0, x1, y0, y1) {
  const d = hrng(x0 * 3.1 + x1 * .7), id = `ws${gid++}`, dp = `wd${gid++}`;
  let s = `<defs><radialGradient id="${id}"><stop offset="0" stop-color="#eef4dc" stop-opacity=".22"/><stop offset=".55" stop-color="#eef4dc" stop-opacity=".08"/><stop offset="1" stop-color="#eef4dc" stop-opacity="0"/></radialGradient><linearGradient id="${dp}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f2a18" stop-opacity="0"/><stop offset="1" stop-color="#1f2a18" stop-opacity=".22"/></linearGradient></defs>`;
  s += `<rect x="${n1(x0)}" y="${n1(y0 + (y1 - y0) * .35)}" width="${n1(x1 - x0)}" height="${n1((y1 - y0) * .65)}" fill="url(#${dp})"/>`;
  for (let x = x0; x < x1; x += 7 + d() * 12) { const y = y0 + 4 + d() * (y1 - y0 - 8), t = (y - y0) / (y1 - y0), rx = 6 + d() * 12 * (1.2 - t * .5); s += `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(rx)}" ry="${n1(rx * (.07 + d() * .05))}" fill="url(#${id})"/>`; }
  return s;
}
function hazeTrunk(x, base, h, w, lean, c) {
  const d = hrng(x * 5.3 + h), top = base - h - 6, fork = base - h * (.55 + d() * .2), bend = (d() - .5) * w * 1.6;
  const X = (y) => { const t = (base - y) / (base - top); return x + lean * t * 4 + Math.sin(t * Math.PI) * bend; }, Wd = (y) => { const t = (base - y) / (base - top); return w * (1 - t * .45) * (t < .04 ? 1.5 - t * 12 : 1); };
  const ys = Array.from({ length: 13 }, (_, i) => base - (base - fork) * i / 12);
  let s = `<path d="M${ys.map((y) => `${n1(X(y) - Wd(y) / 2)} ${n1(y)}`).join('L')}L${[...ys].reverse().map((y) => `${n1(X(y) + Wd(y) / 2)} ${n1(y)}`).join('L')}Z" fill="${c}"/>`;
  // 二股：左右に分かれて画面の上へ
  const fx = X(fork), fw = Wd(fork);
  for (const dir of [-1, 1]) { const ex = fx + dir * (2 + d() * 4), ew = fw * (dir < 0 ? .62 : .5); s += `<path d="M${n1(fx - fw / 2)} ${n1(fork + 1)}Q${n1(fx + dir * .8)} ${n1(fork - (fork - top) * .4)} ${n1(ex - ew / 2)} ${n1(top)}L${n1(ex + ew / 2)} ${n1(top)}Q${n1(fx + dir * 1.4)} ${n1(fork - (fork - top) * .4)} ${n1(fx + fw / 2)} ${n1(fork + 1)}Z" fill="${c}"/>`; }
  s += `<path d="M${ys.slice(1, 11).map((y) => `${n1(X(y) - Wd(y) * .25)} ${n1(y)}`).join('L')}" stroke="${light(c, .1)}" stroke-width="${n1(w * .18)}" fill="none" opacity=".55"/>`;
  for (let k = 0; k < 2; k++) { const y0 = base - 2 - d() * 8, y1 = y0 - 8 - d() * 14; s += `<path d="M${n1(X(y0) + w * (.05 + k * .12))} ${n1(y0)}L${n1(X(y1) + w * (.05 + k * .12))} ${n1(y1)}" stroke="${dark(c, .12)}" stroke-width="${n1(w * .07)}" opacity=".5" stroke-linecap="round"/>`; }
  return s;
}
function tree(x, base, h, { trunkC = '#6b4a2e', tones, lean = R(-3, 3), w = R(2.4, 4.2), branches = 3 } = {}) {
  const tx = x + lean, ty = base - h, tw = w * .55;
  track(x - w * 1.2, base); track(tx + tw, ty);
  let s = `<path d="M${n1(x - w * 1.15)} ${n1(base)}Q${n1(x - w * .5)} ${n1(base - w * .5)} ${n1(x - w * .42)} ${n1(base - w * 1.8)}C${n1(x - w * .45)} ${n1(base - h * .4)} ${n1(tx - tw * .6)} ${n1(ty + h * .35)} ${n1(tx - tw / 2)} ${n1(ty)}L${n1(tx + tw / 2)} ${n1(ty)}C${n1(tx + tw * .6)} ${n1(ty + h * .35)} ${n1(x + w * .45)} ${n1(base - h * .4)} ${n1(x + w * .42)} ${n1(base - w * 1.8)}Q${n1(x + w * .5)} ${n1(base - w * .5)} ${n1(x + w * 1.15)} ${n1(base)}Z" fill="${trunkC}"/>`;
  s += `<path d="M${n1(x + w * .1)} ${n1(base)}C${n1(x + w * .14)} ${n1(base - h * .4)} ${n1(tx + tw * .08)} ${n1(ty + h * .35)} ${n1(tx + tw * .1)} ${n1(ty)}L${n1(tx + tw / 2)} ${n1(ty)}C${n1(tx + tw * .6)} ${n1(ty + h * .35)} ${n1(x + w * .45)} ${n1(base - h * .4)} ${n1(x + w * .42)} ${n1(base - w * 1.8)}Q${n1(x + w * .5)} ${n1(base - w * .5)} ${n1(x + w * 1.15)} ${n1(base)}Z" fill="${dark(trunkC, .2)}"/>`;
  s += `<path d="M${n1(x - w * .3)} ${n1(base - w)}C${n1(x - w * .32)} ${n1(base - h * .4)} ${n1(tx - tw * .3)} ${n1(ty + h * .35)} ${n1(tx - tw * .25)} ${n1(ty)}" stroke="${light(trunkC, .12)}" stroke-width="${n1(w * .12)}" fill="none" opacity=".7"/>`;
  for (let k = 0; k < h / 5; k++) {
    const t = R(.05, .95), xx = x + (tx - x) * t + R(-w * .3, w * .15), yy = base - h * t;
    s += `<path d="M${n1(xx)} ${n1(yy)}q.3 -1.2 0 -${n1(R(1.5, 3.5))}" stroke="${rnd() < .5 ? light(trunkC, .16) : dark(trunkC, .3)}" stroke-width=".28" fill="none" stroke-linecap="round" opacity=".75"/>`;
  }
  if (rnd() < .6) { const t = R(.2, .6), kx = x + (tx - x) * t, ky = base - h * t; s += `<ellipse cx="${n1(kx)}" cy="${n1(ky)}" rx="${n1(w * .26)}" ry="${n1(w * .4)}" fill="none" stroke="${dark(trunkC, .22)}" stroke-width="${n1(w * .05)}" opacity=".7"/><ellipse cx="${n1(kx)}" cy="${n1(ky)}" rx="${n1(w * .16)}" ry="${n1(w * .25)}" fill="${dark(trunkC, .35)}"/>`; }
  if (w > 1.6) { // 樹皮：幹に沿って伸びる、ゆるく波打つ縦の筋（根もとから上へ、ところどころ途切れる）
    const d = hrng(x * 3.7 + base * 1.3), n = 5 + Math.floor(d() * 4);
    for (let k = 0; k < n; k++) {
      const off = -.35 + k / (n - 1) * .75, t0 = .02 + d() * .25, t1 = t0 + .25 + d() * .45, seg = 6;
      let dd = '';
      for (let q = 0; q <= seg; q++) { const t = t0 + (t1 - t0) * q / seg, cx = x + (tx - x) * t + off * w * (1 - t * .45) + Math.sin(t * 22 + k) * w * .04; dd += `${q ? 'L' : 'M'}${n1(cx)} ${n1(base - h * t)}`; }
      const litSide = off < -.1 && d() < .6; // 光の当たる左側は明るい筋、ほかは深い溝
      s += `<path d="${dd}" stroke="${litSide ? light(trunkC, .22) : dark(trunkC, .42)}" stroke-width="${n1(w * (.05 + d() * .045))}" fill="none" stroke-linecap="round" opacity="${n1(litSide ? .45 + d() * .2 : .55 + d() * .3)}"/>`;
    }
  }
  // 根の張り出し（左右に 2〜3 本、地面に潜る）
  if (w > 1.6) for (const dir of [-1, 1]) for (let k = 0; k < (rnd() < .5 ? 2 : 1); k++) {
    const rx = x + dir * w * R(.5, .9), len = w * R(1.2, 2.2);
    s += `<path d="M${n1(rx - dir * w * .3)} ${n1(base - w * .9)}Q${n1(rx + dir * len * .4)} ${n1(base - w * .4)} ${n1(rx + dir * len)} ${n1(base + .2)}L${n1(rx + dir * len * .5)} ${n1(base + .2)}Q${n1(rx)} ${n1(base - w * .2)} ${n1(rx - dir * w * .5)} ${n1(base - w * .3)}Z" fill="${dir > 0 ? dark(trunkC, .2) : trunkC}"/>`;
  }
  // 根もとの苔（光の当たる左側は明るく）
  if (w > 1.6 && rnd() < .75) {
    // 低く、こんもり丸く（いくつかの小山を重ねる）
    for (let k = 0; k < 3; k++) {
      const cx = x + w * R(-1, .7), rw = w * R(.45, .8), rh = w * R(.3, .55);
      s += `<ellipse cx="${n1(cx)}" cy="${n1(base - rh * .35)}" rx="${n1(rw)}" ry="${n1(rh)}" fill="${pick(['#5f7d2e', '#6f8a3a', '#4f6a2a'])}" opacity=".7"/>`;
      s += `<ellipse cx="${n1(cx - rw * .25)}" cy="${n1(base - rh * .7)}" rx="${n1(rw * .5)}" ry="${n1(rh * .35)}" fill="#a5c23e" opacity=".35"/>`;
    }
  }
  // 幹に落ちる木漏れ日（左の明るい側に、いくつか）
  if (w > 1.6) for (let k = 0; k < 3; k++) {
    const t = R(.12, .7), xx = x + (tx - x) * t - w * R(.05, .3), yy = base - h * t;
    s += `<ellipse cx="${n1(xx)}" cy="${n1(yy)}" rx="${n1(w * R(.1, .18))}" ry="${n1(w * R(.25, .5))}" fill="#fff4c8" opacity="${n1(R(.18, .32) * 100) / 100}"/>`;
  }
  for (let i = 0; i < branches; i++) {
    const t = R(.5, .85), bx = x + (tx - x) * t, by = base - h * t, dir = i % 2 ? 1 : -1;
    const ex = bx + dir * R(5, 10), ey = by - R(3, 8), bw = w * .24;
    { // 枝：根もとは太く、先へ細く、少し上へ反る。途中から上向きの小枝が 1 本
      const d = hrng(bx * 7.1 + by), mx = bx + (ex - bx) * .55, my = by + (ey - by) * .35 - 1.2, tip = bw * .16;
      s += `<path d="M${n1(bx)} ${n1(by - bw)}Q${n1(mx)} ${n1(my - bw * .55)} ${n1(ex)} ${n1(ey - tip)}L${n1(ex)} ${n1(ey + tip)}Q${n1(mx)} ${n1(my + bw * .55)} ${n1(bx)} ${n1(by + bw)}Z" fill="${trunkC}"/>`;
      s += `<path d="M${n1(bx)} ${n1(by - bw * .6)}Q${n1(mx)} ${n1(my - bw * .45)} ${n1(ex)} ${n1(ey - tip * .4)}" stroke="${light(trunkC, .14)}" stroke-width="${n1(bw * .22)}" fill="none" opacity=".6"/>`;
      const fx = bx + (ex - bx) * (.45 + d() * .2), fy = by + (ey - by) * .5 - .6, sx = fx + dir * (1.5 + d() * 2.5), sy = fy - 3 - d() * 3, sw = bw * .32;
      s += `<path d="M${n1(fx - sw)} ${n1(fy)}Q${n1(fx + dir * .6)} ${n1(fy - 1.6)} ${n1(sx)} ${n1(sy)}Q${n1(fx + dir * 1.2)} ${n1(fy - 1)} ${n1(fx + sw)} ${n1(fy + .2)}Z" fill="${trunkC}"/>`;
    }
    if (tones) s += twig(ex, ey, R(9, 14), dir * R(35, 65), tones, { n: 6, leaf: R(2.4, 3), spread: 52, shrink: .35, bend: -dir * R(2, 5), kind: 'oval', stem: trunkC, twigs: true, backSide: -dir });
  }
  if (tones) s += bushMass(tx, ty + 3, R(9, 13), tones, 28) + bushMass(tx + R(-7, 7), ty - 3, R(6, 9), tones, 20);
  return s;
}
// 草むら：根元から扇状に広がる葉。外側ほど低く、外へ反る（形は TUFT_DEFS に 5 種類）
function tuft(x, y, h, tones, n = 7) {
  track(x - h * .75, y - h); track(x + h * .75, y);
  const v = Math.max(5, Math.min(9, n)), f = rnd() < .5 ? -1 : 1, c1 = pick(tones.slice(0, 2)), c2 = pick(tones.slice(2).length ? tones.slice(2) : tones);
  return `<g transform="translate(${n1(x)} ${n1(y)}) scale(${n2(f * h)} ${n2(h)})" fill="${c1}" color="${c2}"><use href="#t${v}"/></g>`;
}
// 地面のふちの草：草むらを間をあけて並べる
function grassEdge(x0, x1, y, tones, hmax = 3) {
  let s = '';
  for (let x = x0 + R(0, 2); x < x1; x += R(1.6, 3.4)) {
    if (rnd() < .2) { x += R(1, 3); continue; }
    s += tuft(x, y + R(-.5, .8), hmax * R(.55, 1.05), tones, 5 + Math.floor(rnd() * 4));
  }
  return s;
}
function flowers(x0, x1, y0, y1, n, colors, { scale = 1 } = {}) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = R(x0, x1), y = R(y0, y1), k = typeof scale === 'function' ? scale(y) : scale, r = R(.28, .5) * k, c = pick(colors);
    track(x, y, r * 3);
    s += `<path d="M${n1(x)} ${n1(y + r * 3)}Q${n1(x + r * .4)} ${n1(y + r * 1.5)} ${n1(x)} ${n1(y)}" stroke="#4f7a38" stroke-width="${n1(.16 * k)}" fill="none"/>`;
    s += oval(x, y + r * 2.4, r * 1.8, r * .6, 40, '#5f8a3e', { half: false });
    for (let j = 0; j < 5; j++) { const a = j / 5 * Math.PI * 2 - Math.PI / 2; s += `<ellipse cx="${n1(x + Math.cos(a) * r * .75)}" cy="${n1(y + Math.sin(a) * r * .75)}" rx="${n1(r * .55)}" ry="${n1(r * .42)}" transform="rotate(${n1(a / D + 90)} ${n1(x + Math.cos(a) * r * .75)} ${n1(y + Math.sin(a) * r * .75)})" fill="${j % 2 ? light(c, .15) : c}"/>`; }
    s += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r * .38)}" fill="#e9b53e"/>`;
  }
  return s;
}
function mushroom(x, y, sz, cap = '#c9543a') {
  return `<path d="M${n1(x - sz * .2)} ${n1(y)}Q${n1(x - sz * .12)} ${n1(y - sz * .4)} ${n1(x - sz * .14)} ${n1(y - sz * .8)}L${n1(x + sz * .14)} ${n1(y - sz * .8)}Q${n1(x + sz * .12)} ${n1(y - sz * .4)} ${n1(x + sz * .22)} ${n1(y)}Z" fill="#efe3c8"/><path d="M${n1(x - sz * .62)} ${n1(y - sz * .72)}Q${n1(x - sz * .5)} ${n1(y - sz * 1.55)} ${n1(x)} ${n1(y - sz * 1.55)}Q${n1(x + sz * .5)} ${n1(y - sz * 1.55)} ${n1(x + sz * .62)} ${n1(y - sz * .72)}Q${n1(x)} ${n1(y - sz * .86)} ${n1(x - sz * .62)} ${n1(y - sz * .72)}Z" fill="${cap}"/>
    <path d="M${n1(x - sz * .62)} ${n1(y - sz * .72)}Q${n1(x - sz * .5)} ${n1(y - sz * 1.55)} ${n1(x)} ${n1(y - sz * 1.55)}Q${n1(x - sz * .2)} ${n1(y - sz * 1.2)} ${n1(x - sz * .62)} ${n1(y - sz * .72)}Z" fill="${light(cap, .15)}"/>
    <circle cx="${n1(x - sz * .18)}" cy="${n1(y - sz * 1.15)}" r="${n1(sz * .09)}" fill="#fff4e0"/><circle cx="${n1(x + sz * .24)}" cy="${n1(y - sz * 1.02)}" r="${n1(sz * .07)}" fill="#fff4e0"/>`;
}
function dapple(x0, x1, y0, y1, n, c = '#fff6c8', a = .3, { rx = [1, 4.5], ry = [.3, .9] } = {}) {
  let s = '';
  for (let i = 0; i < n; i++) s += `<ellipse cx="${n1(R(x0, x1))}" cy="${n1(R(y0, y1))}" rx="${n1(R(rx[0], rx[1]))}" ry="${n1(R(ry[0], ry[1]))}" fill="${c}" opacity="${a}"/>`;
  return s;
}
// 森の小道（横に続く土の帯）
// 森の地面の細かいもの：落ち葉、小枝、苔のかたまり
function litter(x0, x1, y0, y1, n, colors) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = R(x0, x1), y = R(y0, y1), k = .6 + (y - y0) / (y1 - y0) * .9, r = R(-60, 60), c = pick(colors), kind = rnd();
    if (kind < .6) s += `<path d="M0 0C.5 -.35 1.3 -.35 1.8 0C1.3 .35 .5 .35 0 0Z" fill="${c}" transform="translate(${n1(x)} ${n1(y)}) rotate(${n1(r)}) scale(${n1(k * R(.7, 1.2))})"/>`;
    else if (kind < .8) s += `<path d="M${n1(x)} ${n1(y)}l${n1(R(1.5, 3.5) * k)} ${n1(R(-.6, .6))}" stroke="#5c4027" stroke-width="${n1(.22 * k)}" stroke-linecap="round" opacity=".75"/>`;
    else s += `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(R(1, 2.4) * k)}" ry="${n1(R(.3, .6) * k)}" fill="#5f7d2e" opacity=".5"/>`;
  }
  return s;
}
// 小道の小石
function pebbles(x0, x1, y0, y1, n, keep = () => true) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = R(x0, x1), y = R(y0, y1), rx = R(.3, .9), c = pick(['#a39478', '#8f836b', '#b8ab8e']);
    if (!keep(x, y)) continue;
    s += `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(rx)}" ry="${n1(rx * .55)}" fill="${c}"/><ellipse cx="${n1(x - rx * .25)}" cy="${n1(y - rx * .2)}" rx="${n1(rx * .45)}" ry="${n1(rx * .2)}" fill="#e6dcc2" opacity=".6"/>`;
  }
  return s;
}
function trail(x0, x1, y, h, c = '#cdbb8a') {
  const [id, gd] = lgrad([[0, light(c, .12)], [1, dark(c, .08)]]);
  let top = `M${n1(x0)} ${n1(y)}`, bot = '', x = x0;
  const pts = [];
  while (x < x1 + 20) { pts.push([x, y + R(-1, 1), y + h + R(-1.2, 1.2)]); x += R(12, 26); }
  for (let i = 1; i < pts.length; i++) top += `Q${n1((pts[i - 1][0] + pts[i][0]) / 2)} ${n1(pts[i - 1][1] + R(-.6, .6))} ${n1(pts[i][0])} ${n1(pts[i][1])}`;
  for (let i = pts.length - 1; i >= 0; i--) bot += `${i === pts.length - 1 ? 'L' : 'Q'}${i === pts.length - 1 ? '' : `${n1((pts[i + 1][0] + pts[i][0]) / 2)} ${n1(pts[i + 1][2] + R(-.6, .6))} `}${n1(pts[i][0])} ${n1(pts[i][2])}`;
  let s = `<defs>${gd}</defs><path d="${top}${bot}Z" fill="url(#${id})"/>`;
  for (let i = 0; i < (x1 - x0) / 3; i++) { const px = R(x0, x1), py = R(y + 1, y + h - 1), r = R(.2, .55); s += `<ellipse cx="${n1(px)}" cy="${n1(py)}" rx="${n1(r * 1.6)}" ry="${n1(r)}" fill="${pick([dark(c, .15), light(c, .2), '#b3a070'])}" opacity=".8"/>`; }
  return s;
}
function cloudPuff(x, y, w, c, hl) {
  let s = `<ellipse cx="${n1(x)}" cy="${n1(y - w * .05)}" rx="${n1(w * .5)}" ry="${n1(w * .07)}" fill="${c}"/>`;
  const n = 5;
  for (let i = 0; i < n; i++) { const cx = x - w / 2 + w * (i + .5) / n, r = w * R(.13, .22) * (1 - Math.abs(i - 2) * .18); s += `<circle cx="${n1(cx)}" cy="${n1(y - r * .6)}" r="${n1(r)}" fill="${c}"/>`; if (hl) s += `<circle cx="${n1(cx - r * .25)}" cy="${n1(y - r * .9)}" r="${n1(r * .55)}" fill="${hl}"/>`; }
  return s;
}
function bananaLeaf(x, y, len, a, c, { cls = 'sway slow' } = {}) {
  track(x, y, len * 1.02);
  const w = len * .2;
  let b = `<path d="M0 0C${n1(w)} ${n1(-len * .25)} ${n1(w * .9)} ${n1(-len * .8)} 0 ${n1(-len)}C${n1(-w * .9)} ${n1(-len * .8)} ${n1(-w)} ${n1(-len * .25)} 0 0Z" fill="${c}"/><path d="M0 0C${n1(w)} ${n1(-len * .25)} ${n1(w * .9)} ${n1(-len * .8)} 0 ${n1(-len)}Z" fill="${light(c, .08)}"/>`;
  b += `<path d="M0 0L0 ${n1(-len * .97)}" stroke="${dark(c, .25)}" stroke-width="${n1(len * .018)}"/>`;
  for (let k = 0; k < 9; k++) { const t = .16 + k * .085; b += `<path d="M0 ${n1(-len * t)}Q${n1(w * .45)} ${n1(-len * (t + .02))} ${n1(w * .82 * Math.sin(Math.PI * Math.min(.95, t)))} ${n1(-len * (t + .07))}M0 ${n1(-len * t)}Q${n1(-w * .45)} ${n1(-len * (t + .02))} ${n1(-w * .82 * Math.sin(Math.PI * Math.min(.95, t)))} ${n1(-len * (t + .07))}" stroke="${dark(c, .14)}" stroke-width="${n1(len * .006)}" fill="none" opacity=".6"/>`; }
  for (let k = 0; k < 2; k++) { const t = R(.35, .75), side = rnd() < .5 ? 1 : -1, ww = w * .9 * Math.sin(Math.PI * t); b += `<path d="M${n1(side * ww * .35)} ${n1(-len * t)}L${n1(side * ww * 1.1)} ${n1(-len * (t + .03))}L${n1(side * ww * 1.1)} ${n1(-len * (t + .05))}Z" fill="${dark(c, .3)}" opacity=".6"/>`; }
  return anim(cls, x, y, g(x, y, a, b));
}
function reeds(x, y, n, c) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const xx = x + R(-2, 2), h = R(9, 18), lean = R(-2, 2);
    s += `<path d="M${n1(xx)} ${n1(y)}Q${n1(xx + lean * .4)} ${n1(y - h * .5)} ${n1(xx + lean)} ${n1(y - h)}" stroke="${c}" stroke-width=".45" fill="none"/>`;
    if (rnd() < .45) s += `<ellipse cx="${n1(xx + lean * .95)}" cy="${n1(y - h + 1.2)}" rx=".55" ry="1.6" fill="#7a5638"/>`;
    else s += lance(xx + lean * .5, y - h * .45, h * .55, .5, lean * 6, c, { half: false });
  }
  return s;
}
function ripple(x, y, r, c = '#e9f0d0', a = .3) {
  return [1, 1.5, 2.1].map((k, i) => `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(r * k)}" ry="${n1(r * k * .32)}" fill="none" stroke="${c}" stroke-width="${n1(.3 - i * .06)}" opacity="${n1((a - i * .08) * 100) / 100}"/>`).join('');
}
function waterLily(x, y, r) {
  let s = '';
  for (let k = 0; k < 7; k++) { const a = -150 + k * 20; s += lance(x, y, r * R(.9, 1.2), r * .22, a + 90, k % 2 ? '#f4c3d0' : '#fbe0e6', { half: false }); }
  return s + `<circle cx="${n1(x)}" cy="${n1(y - r * .2)}" r="${n1(r * .18)}" fill="#f2c14e"/>`;
}
function stoneWall(x0, x1, y, h, c = '#cfc9c0') {
  let s = `<rect x="${n1(x0)}" y="${n1(y)}" width="${n1(x1 - x0)}" height="${n1(h)}" fill="${dark(c, .12)}"/>`;
  const rows = 2, rh = h / rows;
  for (let r = 0; r < rows; r++) for (let x = x0 + (r % 2 ? -2 : 0); x < x1;) {
    const bw = R(3.5, 7);
    s += `<rect x="${n1(x + .15)}" y="${n1(y + r * rh + .15)}" width="${n1(bw - .3)}" height="${n1(rh - .3)}" rx=".5" fill="${mixC(c, pick(['#bfb8ac', '#d9d3c9', '#c6c0b4']), .5)}"/><rect x="${n1(x + .15)}" y="${n1(y + r * rh + .15)}" width="${n1(bw - .3)}" height=".35" rx=".2" fill="${light(c, .25)}"/>`;
    x += bw;
  }
  return s + `<rect x="${n1(x0)}" y="${n1(y - .6)}" width="${n1(x1 - x0)}" height=".9" fill="${light(c, .18)}"/>`;
}
function starfish(x, y, r, c = '#e8906a') {
  track(x, y, r * 1.2);
  let d = '';
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * .45 : r; d += `${k ? 'L' : 'M'}${n1(x + Math.cos(a) * rr)} ${n1(y + Math.sin(a) * rr * .6)}`; }
  return `<path d="${d}Z" fill="${c}" stroke="${c}" stroke-width="${n1(r * .25)}" stroke-linejoin="round"/>`;
}
function shell(x, y, r, c = '#f6e1d0') {
  track(x, y, r * 1.5);
  let s = `<path d="M${n1(x)} ${n1(y)}L${n1(x - r)} ${n1(y - r * .6)}Q${n1(x)} ${n1(y - r * 1.5)} ${n1(x + r)} ${n1(y - r * .6)}Z" fill="${c}"/>`;
  for (let k = -2; k <= 2; k++) s += `<path d="M${n1(x)} ${n1(y)}L${n1(x + k * r * .38)} ${n1(y - r * 1.05 + Math.abs(k) * r * .12)}" stroke="${dark(c, .15)}" stroke-width="${n1(r * .08)}"/>`;
  return s;
}
function lantern(x, y, h) {
  return rglow(x, y - h, h * .7, '#ffc46b', .45) + `<path d="M${n1(x - .3)} ${n1(y)}L${n1(x - .22)} ${n1(y - h)}L${n1(x + .22)} ${n1(y - h)}L${n1(x + .3)} ${n1(y)}Z" fill="#1a1410"/><path d="M${n1(x - 1.1)} ${n1(y - h - .1)}L${n1(x - .9)} ${n1(y - h - 2.3)}H${n1(x + .9)}L${n1(x + 1.1)} ${n1(y - h - .1)}Z" fill="#ffd98a"/><path d="M${n1(x - 1.5)} ${n1(y - h - 2.2)}H${n1(x + 1.5)}L${n1(x)} ${n1(y - h - 3.4)}Z" fill="#1a1410"/><path d="M${n1(x - 1.2)} ${n1(y - h)}H${n1(x + 1.2)}" stroke="#1a1410" stroke-width=".4"/>`;
}
function palmTree(x, base, h, lean, trunkC, c, c2) {
  let s = '';
  const n = Math.round(h / 3);
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    const x0 = x + lean * t0 * t0, x1 = x + lean * t1 * t1, y0 = base - h * t0, y1 = base - h * t1, w = 1.8 - t0 * .7;
    s += `<path d="M${n1(x0 - w / 2)} ${n1(y0)}L${n1(x1 - w * .45)} ${n1(y1)}Q${n1(x1)} ${n1(y1 + .5)} ${n1(x1 + w * .45)} ${n1(y1)}L${n1(x0 + w / 2)} ${n1(y0)}Z" fill="${i % 2 ? trunkC : light(trunkC, .08)}"/>`;
  }
  return s + palmFan(x + lean, base - h, h * .32, 0, c, c2);
}

// なめらかな線（Catmull-Rom を 3 次ベジェに）。M は含まない
function smoothD(pts) {
  let d = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += `C${n1(p1[0] + (p2[0] - p0[0]) / 6)} ${n1(p1[1] + (p2[1] - p0[1]) / 6)} ${n1(p2[0] - (p3[0] - p1[0]) / 6)} ${n1(p2[1] - (p3[1] - p1[1]) / 6)} ${n1(p2[0])} ${n1(p2[1])}`;
  }
  return d;
}
// 画面の端に立つ、手前の太い幹（額縁の柱）
function edgeTrunk(x, w, c, lean = 0) {
  track(x - w, -5); track(x + w, 105);
  const hl = light(c, .1), sh = dark(c, .25);
  let s = `<path d="M${n1(x - w * .62)} 106C${n1(x - w * .5)} 70 ${n1(x - w * .46 + lean)} 30 ${n1(x - w * .44 + lean)} -6L${n1(x + w * .44 + lean)} -6C${n1(x + w * .46 + lean)} 30 ${n1(x + w * .5)} 70 ${n1(x + w * .62)} 106Z" fill="${c}"/>`;
  s += `<path d="M${n1(x + w * .08)} 106C${n1(x + w * .14)} 70 ${n1(x + w * .1 + lean)} 30 ${n1(x + w * .1 + lean)} -6L${n1(x + w * .44 + lean)} -6C${n1(x + w * .46 + lean)} 30 ${n1(x + w * .5)} 70 ${n1(x + w * .62)} 106Z" fill="${sh}"/>`;
  s += `<path d="M${n1(x - w * .3)} 106C${n1(x - w * .26)} 70 ${n1(x - w * .26 + lean)} 30 ${n1(x - w * .24 + lean)} -6" stroke="${hl}" stroke-width="${n1(w * .1)}" fill="none" opacity=".8"/>`;
  for (let y = R(0, 8); y < 104; y += R(4, 9)) s += `<path d="M${n1(x + R(-w * .35, w * .3) + lean * (1 - y / 100))} ${n1(y)}q${n1(R(-.3, .3))} ${n1(R(1.5, 3.5))} 0 ${n1(R(3, 6))}" stroke="${rnd() < .5 ? hl : dark(c, .35)}" stroke-width="${n1(w * .05)}" fill="none" stroke-linecap="round" opacity=".8"/>`;
  return s;
}

// =========================================================
// 各展示室の風景
// W: 画面の幅, stops: 立ち止まる場所の数（部屋の入口 + 作品）
// 返り値: sky（CSS）、far・mid・move（奥から手前の SVG レイヤー）、frame（画面に固定の額縁）
// 作品は stop 1 以降の画面中央。move と frame は作品の枠（artZone）に入らない
// =========================================================
// 中景（地面）と作品・小物は同じ速さ。作品が地面の上を滑って浮いて見えないように
export const FACTORS = { far: .18, mid: 1, move: 1.45 };
const planeW = (W, stops, f) => W + (stops - 1) * W * f + 40;
const at = (W, f) => (s, x) => x + s * W * f;
// 作品の後ろ（中景）をあける：x がどの作品の枠からも m 以上離れているか
// 画面の下の縁の草木（地面に生えているもの）は、額縁（画面に固定）ではなく手前の層に置く。
// 立ち止まる場所ごとに、額縁と同じ並びで置くので、止まったときの見え方は変わらず、歩くと地面と一緒に流れる
const tileGround = (W, stops, g) => g ? Array.from({ length: stops }, (_, s) => `<g transform="translate(${n1(at(W, FACTORS.move)(s, 0))} 0)">${g}</g>`).join('') : '';
const clearOfWorks = (W, stops, x, m = 0) => { for (let s = 1; s < stops; s++) { const [a, , b] = artZone(W, at(W, FACTORS.mid)(s, W / 2), 0, 0); if (x > a - m && x < b + m) return false; } return true; };
// move の各すき間（stop s と s+1 の間）から見た、両どなりの作品の枠
const moveZones = (W, s, y0, y1) => [artZone(W, at(W, FACTORS.move)(s, W / 2), y0, y1), artZone(W, at(W, FACTORS.move)(s + 1, W / 2), y0, y1)];

// ---------- 森の描き込み：倒木、切り株、つた、洞のふくろう、地面の霧、うさぎ、鹿、蝶 ----------
// 倒木：横たわる丸太。右の切り口に年輪、上に苔ときのこ、両端に草
function fallenLog(x, y, len, r, c = '#6b4a2e', { tilt = R(-4, 4) } = {}) {
  track(x - len * .55, y - r * 2.4); track(x + len * .55, y + r * .8);
  const cl = light(c, .14), cd = dark(c, .22);
  let s = `<g transform="translate(${n1(x)} ${n1(y)}) rotate(${n1(tilt)})">`;
  s += `<ellipse cx="0" cy="${n1(r * .5)}" rx="${n1(len * .56)}" ry="${n1(r * .55)}" fill="#2f4a22" opacity=".35"/>`;
  s += `<path d="M${n1(-len / 2)} ${n1(-r)}Q${n1(-len * .25)} ${n1(-r * 1.2)} 0 ${n1(-r * 1.05)}T${n1(len / 2)} ${n1(-r * .95)}L${n1(len / 2)} ${n1(r)}Q0 ${n1(r * 1.15)} ${n1(-len / 2)} ${n1(r)}Z" fill="${c}"/>`;
  s += `<path d="M${n1(-len / 2)} ${n1(r * .2)}Q0 ${n1(r * .45)} ${n1(len / 2)} ${n1(r * .15)}L${n1(len / 2)} ${n1(r)}Q0 ${n1(r * 1.15)} ${n1(-len / 2)} ${n1(r)}Z" fill="${cd}"/>`;
  s += `<path d="M${n1(-len * .45)} ${n1(-r * .75)}Q0 ${n1(-r * .95)} ${n1(len * .45)} ${n1(-r * .7)}" stroke="${cl}" stroke-width="${n1(r * .18)}" fill="none" opacity=".6"/>`;
  for (let i = 0; i < len / 2.2; i++) { const bx = R(-len * .45, len * .38), by = R(-r * .6, r * .7); s += `<path d="M${n1(bx)} ${n1(by)}q${n1(R(1.2, 2.6))} ${n1(R(-.3, .3))} ${n1(R(2.6, 4.5))} 0" stroke="${rnd() < .5 ? cd : cl}" stroke-width=".22" fill="none" stroke-linecap="round" opacity=".7"/>`; }
  const ex = len / 2;
  s += `<ellipse cx="${n1(ex)}" cy="0" rx="${n1(r * .42)}" ry="${n1(r)}" fill="#d9b98a"/>`;
  for (let k = .8; k > .15; k -= .22) s += `<ellipse cx="${n1(ex)}" cy="0" rx="${n1(r * .42 * k)}" ry="${n1(r * k)}" stroke="#a8875a" stroke-width=".18" fill="none"/>`;
  for (let k = 0; k < 4; k++) { const mx = R(-len * .42, len * .3), mw = R(2, 4.5); s += `<ellipse cx="${n1(mx)}" cy="${n1(-r * .95)}" rx="${n1(mw)}" ry="${n1(r * .3)}" fill="${pick(['#5f7d2e', '#6f8a3a', '#7a9a3c'])}" opacity=".85"/><ellipse cx="${n1(mx - mw * .3)}" cy="${n1(-r * 1.05)}" rx="${n1(mw * .5)}" ry="${n1(r * .16)}" fill="#a5c23e" opacity=".45"/>`; }
  s += mushroom(R(-len * .3, len * .15), -r * .95, R(1.1, 1.6), pick(['#b8604a', '#c98a5a', '#d4b884']));
  if (rnd() < .6) s += mushroom(R(-len * .1, len * .3), -r * .9, R(.7, 1), pick(['#b8604a', '#d4b884']));
  s += tuft(-len / 2 + R(-.5, .5), r * .7, r * 1.5, ['#47733c', '#5f7d2e', '#769721'], 6) + tuft(len / 2 + R(0, 1), r * .8, r * 1.3, ['#47733c', '#5f7d2e', '#769721'], 5);
  return s + '</g>';
}
// 切り株：年輪の見える切り口、根もとに苔と草
function stump(x, y, r, c = '#6b4a2e') {
  track(x - r * 1.9, y - r * 1.8); track(x + r * 1.9, y + r * .6);
  const h = r * 1.1, cd = dark(c, .22), cl = light(c, .12);
  let s = `<ellipse cx="${n1(x)}" cy="${n1(y + r * .25)}" rx="${n1(r * 1.6)}" ry="${n1(r * .45)}" fill="#2f4a22" opacity=".35"/>`;
  s += `<path d="M${n1(x - r * 1.3)} ${n1(y + .1)}Q${n1(x - r * .75)} ${n1(y - r * .35)} ${n1(x - r * .9)} ${n1(y - h)}L${n1(x + r * .9)} ${n1(y - h)}Q${n1(x + r * .75)} ${n1(y - r * .35)} ${n1(x + r * 1.3)} ${n1(y + .1)}Q${n1(x)} ${n1(y + r * .4)} ${n1(x - r * 1.3)} ${n1(y + .1)}Z" fill="${c}"/>`;
  s += `<path d="M${n1(x + r * .15)} ${n1(y - h)}L${n1(x + r * .9)} ${n1(y - h)}Q${n1(x + r * .75)} ${n1(y - r * .35)} ${n1(x + r * 1.3)} ${n1(y + .1)}Q${n1(x + r * .7)} ${n1(y + r * .35)} ${n1(x + r * .15)} ${n1(y + r * .35)}Z" fill="${cd}"/>`;
  for (let k = 0; k < 5; k++) { const bx = x + R(-r * .8, r * .8); s += `<path d="M${n1(bx)} ${n1(y - h * .15)}q.2 -${n1(h * .3)} 0 -${n1(h * .7)}" stroke="${rnd() < .5 ? cd : cl}" stroke-width=".22" fill="none" opacity=".7"/>`; }
  s += `<ellipse cx="${n1(x)}" cy="${n1(y - h)}" rx="${n1(r * .9)}" ry="${n1(r * .36)}" fill="#dcbd8e"/>`;
  for (let k = .78; k > .12; k -= .2) s += `<ellipse cx="${n1(x + r * .06)}" cy="${n1(y - h)}" rx="${n1(r * .9 * k)}" ry="${n1(r * .36 * k)}" stroke="#a8875a" stroke-width=".17" fill="none"/>`;
  s += `<ellipse cx="${n1(x - r * .55)}" cy="${n1(y - h * .4)}" rx="${n1(r * .5)}" ry="${n1(r * .32)}" fill="#6f8a3a" opacity=".8"/><ellipse cx="${n1(x - r * .7)}" cy="${n1(y - h * .5)}" rx="${n1(r * .25)}" ry="${n1(r * .14)}" fill="#a5c23e" opacity=".45"/>`;
  s += tuft(x - r * 1.25, y + .3, r * .9, ['#47733c', '#5f7d2e', '#769721'], 6) + tuft(x + r * 1.3, y + .3, r * .8, ['#47733c', '#5f7d2e', '#769721'], 5);
  if (rnd() < .7) s += mushroom(x + r * R(1.2, 1.7), y + .2, R(.8, 1.2), pick(['#b8604a', '#c98a5a']));
  return s;
}
// 幹に巻きつくつた（下から上へ、左右に揺れながら。葉は下向き）
function ivy(x, y0, y1, w, tones) {
  const n = Math.round((y1 - y0) / 2.6);
  let d = `M${n1(x)} ${n1(y1)}`, leaves = '';
  for (let i = 1; i <= n; i++) {
    const t = i / n, yy = y1 - (y1 - y0) * t, xx = x + Math.sin(t * 8 + x) * w * .42;
    d += `L${n1(xx)} ${n1(yy)}`;
    const sz = R(1.5, 2.3) * (1 - t * .35);
    leaves += oval(xx + R(-.3, .3), yy, sz, sz * .48, (i % 2 ? 1 : -1) * R(70, 130), pick(tones), { rib: false });
  }
  return `<path d="${d}" stroke="#3d5a2a" stroke-width=".32" fill="none" stroke-linecap="round"/>` + leaves;
}
// 幹の洞（うろ）
function hollow(x, y, w) {
  const h = w * 1.5;
  let s = `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(w)}" ry="${n1(h)}" fill="#2a1a10"/><path d="M${n1(x - w)} ${n1(y)}Q${n1(x - w * .6)} ${n1(y - h * 1.1)} ${n1(x)} ${n1(y - h)}Q${n1(x + w * .6)} ${n1(y - h * 1.1)} ${n1(x + w)} ${n1(y)}" stroke="#8f602e" stroke-width="${n1(w * .25)}" fill="none" opacity=".8"/>`;
  s += `<path d="M${n1(x - w)} ${n1(y)}Q${n1(x)} ${n1(y + h * 1.15)} ${n1(x + w)} ${n1(y)}Q${n1(x)} ${n1(y + h * .7)} ${n1(x - w)} ${n1(y)}Z" fill="#5a3f25"/>`;
  return s;
}
// 地面近くの霧：ぼかしは使わず、丸いグラデーションを横に並べる
function mist(x0, x1, y, h, c = '#eef2da', a = .5) {
  const id = `mi${gid++}`;
  let s = `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity="${n1(a * 100) / 100}"/><stop offset=".55" stop-color="${c}" stop-opacity="${n1(a * 45) / 100}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs>`;
  for (let x = x0; x < x1; x += R(9, 16)) s += `<ellipse cx="${n1(x)}" cy="${n1(y + R(-h * .25, h * .25))}" rx="${n1(R(14, 26))}" ry="${n1(h * R(.6, 1.1))}" fill="url(#${id})"/>`;
  return s;
}
// 小道のわきにすわるうさぎ（左向き）
function rabbit(x, y, s, c = '#bfa98c') {
  track(x - s * 1.2, y - s * 2.5); track(x + s * 1.3, y + s * .3);
  const cd = dark(c, .15), cl = light(c, .22), ear = (dx, a) => { const ex = x - s * .6 + s * dx, ey = y - s * 1.9; return `<ellipse cx="${n1(ex)}" cy="${n1(ey)}" rx="${n1(s * .14)}" ry="${n1(s * .52)}" fill="${c}" transform="rotate(${a} ${n1(ex)} ${n1(ey)})"/><ellipse cx="${n1(ex)}" cy="${n1(ey)}" rx="${n1(s * .06)}" ry="${n1(s * .36)}" fill="#d9bdb2" transform="rotate(${a} ${n1(ex)} ${n1(ey)})"/>`; };
  let o = `<ellipse cx="${n1(x)}" cy="${n1(y + .2)}" rx="${n1(s * 1.15)}" ry="${n1(s * .25)}" fill="#2f4a22" opacity=".3"/>`;
  o += ear(-.08, -16) + ear(.16, 4);
  o += `<ellipse cx="${n1(x + s * .15)}" cy="${n1(y - s * .6)}" rx="${n1(s * .95)}" ry="${n1(s * .62)}" fill="${c}"/>`;
  o += `<circle cx="${n1(x + s * .55)}" cy="${n1(y - s * .5)}" r="${n1(s * .42)}" fill="${cd}" opacity=".55"/>`;
  o += `<circle cx="${n1(x - s * .6)}" cy="${n1(y - s * 1.15)}" r="${n1(s * .44)}" fill="${c}"/><ellipse cx="${n1(x - s * .6)}" cy="${n1(y - s * .95)}" rx="${n1(s * .3)}" ry="${n1(s * .2)}" fill="${cl}"/>`;
  o += `<circle cx="${n1(x - s * .78)}" cy="${n1(y - s * 1.22)}" r="${n1(s * .065)}" fill="#1a1208"/><circle cx="${n1(x - s * 1.02)}" cy="${n1(y - s * 1.05)}" r="${n1(s * .05)}" fill="#b9948a"/>`;
  o += `<circle cx="${n1(x + s * 1.08)}" cy="${n1(y - s * .68)}" r="${n1(s * .2)}" fill="${cl}"/>`;
  o += `<ellipse cx="${n1(x - s * .3)}" cy="${n1(y - s * .1)}" rx="${n1(s * .4)}" ry="${n1(s * .14)}" fill="${cd}"/>`;
  return o;
}
// 遠くに立つ鹿（霞んだシルエット。h = 肩までの高さ、左向き）
function deer(x, y, h, c) {
  const L = h * 1.15, cd = dark(c, .08);
  let s = '';
  for (const [dx, dy] of [[-L * .36, 0], [-L * .26, .25], [L * .3, 0], [L * .4, .25]]) s += `<path d="M${n1(x + dx)} ${n1(y - h * .6)}L${n1(x + dx - h * .02)} ${n1(y + dy)}L${n1(x + dx + h * .06)} ${n1(y + dy)}L${n1(x + dx + h * .1)} ${n1(y - h * .6)}Z" fill="${cd}"/>`;
  s += `<ellipse cx="${n1(x)}" cy="${n1(y - h * .74)}" rx="${n1(L * .5)}" ry="${n1(h * .26)}" fill="${c}"/>`;
  s += `<path d="M${n1(x - L * .42)} ${n1(y - h * .9)}Q${n1(x - L * .52)} ${n1(y - h * 1.1)} ${n1(x - L * .6)} ${n1(y - h * 1.32)}L${n1(x - L * .42)} ${n1(y - h * 1.34)}Q${n1(x - L * .36)} ${n1(y - h * 1.05)} ${n1(x - L * .28)} ${n1(y - h * .78)}Z" fill="${c}"/>`;
  s += `<path d="M${n1(x - L * .62)} ${n1(y - h * 1.36)}L${n1(x - L * .82)} ${n1(y - h * 1.27)}Q${n1(x - L * .84)} ${n1(y - h * 1.2)} ${n1(x - L * .74)} ${n1(y - h * 1.19)}L${n1(x - L * .42)} ${n1(y - h * 1.3)}Z" fill="${c}"/>`;
  s += `<path d="M${n1(x - L * .5)} ${n1(y - h * 1.35)}l${n1(-h * .05)} ${n1(-h * .15)}l${n1(h * .1)} ${n1(h * .1)}Z" fill="${c}"/>`;
  s += `<path d="M${n1(x - L * .57)} ${n1(y - h * 1.36)}q${n1(h * .03)} ${n1(-h * .2)} ${n1(h * .14)} ${n1(-h * .32)}M${n1(x - L * .55)} ${n1(y - h * 1.5)}l${n1(h * .1)} ${n1(-h * .04)}M${n1(x - L * .52)} ${n1(y - h * 1.58)}l${n1(-h * .07)} ${n1(-h * .08)}" stroke="${c}" stroke-width="${n1(h * .035)}" fill="none" stroke-linecap="round"/>`;
  s += `<ellipse cx="${n1(x + L * .5)}" cy="${n1(y - h * .84)}" rx="${n1(h * .06)}" ry="${n1(h * .09)}" fill="${c}"/>`;
  return s;
}
// 蝶（上から見た形。0° が上向き）
function butterfly(x, y, s, c = '#f2c14e', a = R(-30, 30)) {
  track(x, y, s * 1.5);
  const cd = dark(c, .09);
  let b = `<g transform="translate(${n1(x)} ${n1(y)}) rotate(${n1(a)})">`;
  for (const d of [-1, 1]) b += `<path d="M0 0Q${n1(d * s * 1.25)} ${n1(-s * 1.55)} ${n1(d * s * 1.4)} ${n1(-s * .3)}Q${n1(d * s * 1.1)} ${n1(s * .1)} 0 0Z" fill="${d < 0 ? c : cd}"/><path d="M0 ${n1(s * .1)}Q${n1(d * s * 1.15)} ${n1(s * .1)} ${n1(d * s * .9)} ${n1(s * .95)}Q${n1(d * s * .4)} ${n1(s * 1.05)} 0 ${n1(s * .1)}Z" fill="${cd}"/>`;
  b += `<ellipse cx="0" cy="${n1(s * .1)}" rx="${n1(s * .1)}" ry="${n1(s * .65)}" fill="#6b6a5a"/><path d="M0 ${n1(-s * .5)}l${n1(-s * .3)} ${n1(-s * .5)}M0 ${n1(-s * .5)}l${n1(s * .3)} ${n1(-s * .5)}" stroke="#6b6a5a" stroke-width="${n1(s * .04)}" fill="none"/></g>`;
  return b;
}
// 木立の奥の下草の帯（幹のあいだの平らな帯を埋める）：ゆるく波打つ低い茂みの面に、ところどころ丸い茂みとシダ
function understory(x0, x1, y, tones, hazeC) {
  const T = tones.map((c) => mixC(c, hazeC, .3));
  let x = x0, d = `M${n1(x0)} ${n1(y + 3)}L${n1(x0)} ${n1(y - 1)}`;
  while (x < x1) { const w = R(3, 7), h = R(1.2, 3.2); d += `Q${n1(x + w / 2)} ${n1(y - h - w * .25)} ${n1(x + w)} ${n1(y - h * R(.2, .6))}`; x += w; }
  let s = `<path d="${d}L${n1(x)} ${n1(y + 3)}Z" fill="${T[1]}"/>`;
  x = x0; d = `M${n1(x0)} ${n1(y + 3)}L${n1(x0)} ${n1(y + .4)}`;
  while (x < x1) { const w = R(2.5, 6), h = R(.8, 2.2); d += `Q${n1(x + w / 2)} ${n1(y + .6 - h - w * .2)} ${n1(x + w)} ${n1(y + .6 - h * R(.2, .5))}`; x += w; }
  s += `<path d="${d}L${n1(x)} ${n1(y + 3)}Z" fill="${T[2]}"/>`;
  for (let bx = x0 + R(2, 8); bx < x1; bx += R(9, 16)) {
    const r = R(2, 3.4);
    s += bushMass(bx, y + .2 - r * .5, r, T, 12);
    if (rnd() < .5) s += fern(bx + R(-4, 4), y + 1, R(3, 5), R(-40, 40), mixC(pick(tones), hazeC, .28), { cls: '', n: 10 });
  }
  return s;
}
// 森の奥：霞む梢の帯を 2 重に
function forestFar(fw, horizon = 64) {
  let far = '';
  far += forestBand(-10, fw + 10, { top: 25, depth: 14, ground: horizon, c: '#d8e0bd', trunkC: '#d3d9b6', tw: .45, gap: [1.6, 5], bump: [3.5, 7], shrubC: '#d2dcb3', shrubH: 2.2 });
  far += haze(-10, fw + 10, 14, horizon + 2, '#f5f1da', .15, .55);
  far += forestBand(-10, fw + 10, { top: 12, depth: 22, ground: horizon + 1.5, c: '#b9cc95', trunkC: '#a3b07f', tw: .95, gap: [3, 10], bump: [6, 12], shrubC: '#abc186', shrubH: 4 });
  far += haze(-10, fw + 10, horizon - 18, horizon + 4, '#eff1d6', 0, .6);
  return far;
}
// 森の額縁：上に梢、両脇に幹と茂みとシダ、上の角から垂れる枝、下に草
function forestFrame(W, P, zones, { big = 1, split = false, sides = true } = {}) {
  let s = '', g = '';
  const T = [P.deep, P.dark, P.mid, P.leaf];
  for (const side of [-1, 1]) {
    const ex = side < 0 ? 0 : W;
    // 両脇の幹と、そこから伸びる枝（部屋の中では画面についてきて作品にかぶるので、部屋では置かない）
    if (sides) {
      s += guard(zones, (k) => edgeTrunk(ex + side * R(0, 1.5), R(5.5, 7.5) * k * big, pick(['#4a3322', '#3f2c1d']), side * -R(0, 2)), { min: .55 });
      s += guard(zones, (k) => sprig(ex - side * R(1, 3), R(30, 52), R(14, 19) * k * big, -side * R(40, 65), [P.dark, P.mid, P.leaf, P.fresh], { leaf: 4 * k * big, n: 6, stem: '#3a2a1a' }));
    }
    s += guard(zones, (k) => sprig(ex - side * R(2, 12), -5, R(26, 36) * k * big, 180 + side * R(8, 28), [P.dark, P.mid, P.leaf, P.fresh], { leaf: 4.2 * k * big, cls: 'hang', stem: '#2d3a22' }));
    s += guard(zones, (k) => sprig(ex - side * R(10, 22), -5, R(18, 26) * k * big, 180 + side * R(5, 20), [P.mid, P.leaf, P.fresh, P.lime], { leaf: 3.2 * k * big, cls: 'hang', stem: '#2d3a22' }));
    g += guard(zones, (k) => shrub(ex - side * R(4, 10), 107, R(30, 38) * k * big, T, { leaf: 3.8 * k * big }));
    g += guard(zones, (k) => fern(ex - side * R(12, 22), 108, R(24, 32) * k * big, -side * R(14, 34), P.mid, { cls: '' }));
    g += guard(zones, (k) => shrub(ex - side * R(18, 30), 108, R(16, 22) * k * big, [P.dark, P.mid, P.leaf, P.fresh], { leaf: 2.8 * k * big }));
  }
  for (let x = -6; x < W + 6; x += R(7, 12)) s += guard(zones, (k) => bushMass(x, R(-9, -6), R(8, 11) * k, T, 22));
  for (let x = -2; x < W + 2; x += R(2.2, 4)) g += tuft(x, 104 + R(-.5, 1), R(3.5, 6), [P.dark, P.mid, P.leaf, P.olive], 6);
  g += guard(zones, () => flowers(0, W * .22, 96, 102, 6, ['#fffaf2', '#f6d7e0'], { scale: 1.8 })) + guard(zones, () => flowers(W * .78, W, 96, 102, 6, ['#fffaf2', '#f2c14e'], { scale: 1.8 }));
  return split ? [s, g] : s + g;
}

// 入口の小道の中心線（t＝0 が奥の消失点、1 が手前）。案内人もこの線の上を歩く
export const ENTRANCE_PATH = (W) => (t) => [W / 2 + 4 * Math.sin(t * Math.PI) * (1 - t * .3) - 2 * t, 64 + 1.2 + t * 43];
// 入口：森の奥へ消えていく小道。木々は遠くほど小さく、細く、霞む
function sceneEntrance(W) {
  reseed(111);
  const P = PAL.forest, fw = planeW(W, 1, FACTORS.far), mw = planeW(W, 1, FACTORS.mid), cx = W / 2, hz = 64, deep = 106 - hz;
  const hazeC = '#e9edd2';
  let far = forestFar(fw, hz);
  far += rglow(cx + 2, hz - 6, 34, '#fffbe6', .85);
  let mid = groundPath(-5, mw + 5, hz + 1, .5, '#d3dea6', '#6d8f45');
  // 小道：中心線は少しうねり、手前ほど広い
  const pw = Math.min(W * .3, 32), edge = (t, side) => { const [x, y] = ENTRANCE_PATH(W)(t); return [x + side * (pw * Math.pow(t, 1.15) + .5), y]; };
  const ts = Array.from({ length: 15 }, (_, i) => i / 14), L = ts.map((t) => edge(t, -1)), Rt = ts.map((t) => edge(t, 1)).reverse();
  const [pg, pd] = lgrad([[0, '#f1e9c8'], [.35, '#dccaa0'], [1, '#bea675']]);
  mid += `<defs>${pd}</defs><path d="M${n1(L[0][0])} ${n1(L[0][1])}${smoothD(L)}L${n1(Rt[0][0])} ${n1(Rt[0][1])}${smoothD(Rt)}Z" fill="url(#${pg})"/>`;
  for (let i = 0; i < 70; i++) {
    const t = Math.pow(rnd(), .7), [lx] = edge(t, -1), [rx, y] = edge(t, 1), x = lx + (rx - lx) * R(.1, .9), r = (.12 + t * .7) * R(.6, 1.2);
    mid += `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(r * 1.7)}" ry="${n1(r * .7)}" fill="${pick(['#b09a6a', '#efe3bf', '#c9b485'])}" opacity=".85"/>`;
  }
  mid += dapple(cx - pw, cx + pw, 84, 104, 14, '#fff4c8', .3);
  // 小道のふちの草（遠くほど小さく、霞む）
  for (const side of [-1, 1]) for (let t = .04; t < 1.02; t += .012 + t * .03) {
    const [x, y] = edge(t, side), f = 1 - t;
    mid += tuft(x + side * R(-.3, 1) * (1 + t * 2), y + R(0, .6), .5 + 4.6 * t * R(.7, 1.1), [P.leaf, P.fresh, P.olive, '#8fb24e'].map((c) => mixC(c, hazeC, f * .7)), 5 + Math.round(t * 3));
  }
  // 並木：遠い順に描く
  const trees = [];
  for (const side of [-1, 1]) for (let k = 0; k < 10; k++) trees.push({ side, d: 34 * Math.pow(.72, k) * R(.9, 1.1) });
  trees.sort((a, b) => a.d - b.d);
  const stretch = Math.max(1, W / 160);
  for (const { side, d } of trees) {
    const t = d / 34, z = 1 - t, yb = hz + d, X = R(38, 84) * stretch, x = cx + side * X * t + side * pw * .2 * t, w = .35 + t * 6.2, H = d * 6.4;
    const trunkC = mixC(pick([P.trunk, '#7a5638', '#5c4027', '#86623f']), hazeC, z * .72);
    const tones = [P.dark, P.mid, P.leaf, P.fresh].map((c) => mixC(c, hazeC, z * .7));
    mid += tree(x, yb, H, { trunkC, tones: null, w, lean: side * R(0, 1.5) * t, branches: 0 });
    const top = yb - H, cy = top + H * .24, cr = H * .2;
    // 樹冠は crownMass で描く（前の bushMass は乱数の呼び出しだけ残して、並木の配置を変えない）
    // 木ごとに緑の色味を少し変える（黄みの強い木、青みの強い木）。樹冠の下に、幹から分かれる 2 本の枝をのぞかせる
    const gT = hrng(x * 1.3 + d), tint = gT() < .5 ? '#c4c86a' : '#6f9a8c', tt = tones.map((c) => mixC(c, mixC(tint, hazeC, z * .6), .08 + gT() * .1));
    if (cy + cr > -4 && t > .25) { const bc = mixC(trunkC, '#000000', .15), bw = w * .42, by = cy + cr * .55; for (const sd of [-1, 1]) mid += `<path d="M${n1(x - bw * .5)} ${n1(by + cr * .25)}Q${n1(x + sd * cr * .15)} ${n1(by)} ${n1(x + sd * cr * .42)} ${n1(by - cr * .3)}L${n1(x + sd * cr * .42 + bw * .35)} ${n1(by - cr * .3 - bw * .2)}Q${n1(x + sd * cr * .12 + bw * .4)} ${n1(by - bw * .2)} ${n1(x + bw * .5)} ${n1(by + cr * .25)}Z" fill="${bc}"/>`; }
    if (cy + cr > -4) { bushMass(x, cy, cr, tones, 26); bushMass(x - side * cr * .7, cy + cr * .45, cr * .7, tones, 18); bushMass(x + side * cr * .6, cy + cr * .5, cr * .6, tones, 16); const gC = hrng(x * 3.7 + cy); mid += crownMass(x, cy, cr, tt, gC) + crownMass(x - side * cr * .7, cy + cr * .45, cr * .7, tt, gC) + crownMass(x + side * cr * .6, cy + cr * .5, cr * .6, tt, gC); }
    if (t > .2) mid += shrub(x + side * w * 1.5, yb + .5, 3 + t * 9, [P.dark, P.mid, P.leaf, P.fresh].map((c) => mixC(c, hazeC, z * .7)), { leaf: .6 + t * 1.2, n: t > .6 ? 5 : 4 });
    if (t > .45 && rnd() < .6) mid += fern(x - side * w * 1.4, yb + .5, 4 + t * 9, -side * R(20, 50), mixC(P.leaf, hazeC, z * .5), { cls: '' });
  }
  mid += flowers(-5, cx - pw * .6, hz + 4, 104, 30, ['#fffaf2', '#f6d7e0', '#f2c14e', '#c7b3e6'], { scale: (y) => .35 + (y - hz) / deep * 1.6 });
  mid += flowers(cx + pw * .6, mw, hz + 4, 104, 30, ['#fffaf2', '#f6d7e0', '#f2c14e', '#c7b3e6'], { scale: (y) => .35 + (y - hz) / deep * 1.6 });
  for (let x = -6; x < mw + 6; x += R(8, 13)) { const y = R(-7, -2), rr = R(8, 12); bushMass(x, y, rr, [P.deep, P.dark, P.mid, P.leaf], 22); mid += crownMass(x, y, rr, [P.deep, P.dark, P.mid, P.leaf], hrng(x * 5.1 + 3)); }
  mid += beams(cx - 70, cx + 20, 7, '#fffbe0', { opacity: .12, slant: [16, 30] });
  // 小道のわき：切り株ときのこ、倒木（手前ほど大きく。案内人の道の上には置かない）
  mid += stump(cx - pw * 1.75, 93.5, 2.2, '#7a5638') + mushroom(cx - pw * 1.75 + 4, 93.8, 1, '#b8604a') + mushroom(cx - pw * 1.75 + 5.4, 94.1, .7, '#d4b884');
  mid += fallenLog(cx + pw * 2, 91.5, 14, 1.7, '#6b4a2e', { tilt: -6 });
  for (let k = 0; k < 4; k++) { const t = R(.45, .8), [x, y] = edge(t, k % 2 ? 1 : -1); mid += mushroom(x + (k % 2 ? 1 : -1) * R(3, 6) * t, y + R(0, 1), (.5 + t) * R(.7, 1), pick(['#b8604a', '#c98a5a', '#d4b884'])); }
  const frame = forestFrame(W, P, [[cx - 34, 5, cx + 34, 97]], { big: 1.15 });
  return {
    sky: 'radial-gradient(110% 85% at 51% 60%, #fffbe8 0%, #f4f0d3 28%, #e3e9c4 62%, #cddaa9 100%)',
    far: [fw, far], mid: [mw, mid], move: [0, ''], frame, fx: 'forest', glowDefault: [255, 244, 200],
    curtain: ['#132a1e', '#1e4630', '#2f6a44', '#47733c', '#769721'],
  };
}

export function sceneForest(W, stops, { entrance = false, birdGap = -1 } = {}) {
  if (entrance) return sceneEntrance(W);
  reseed(11 + stops);
  const P = PAL.forest, fw = planeW(W, stops, FACTORS.far), mw = planeW(W, stops, FACTORS.mid), vw = planeW(W, stops, FACTORS.move);
  let far = forestFar(fw, 64), mid = '', move = '';
  far += groundPath(-10, fw + 10, 65, 1, '#cad79d', '#b3c581');
  // 遠くの草地に立つ鹿（霞んだ影）と、朝の霧
  far += mist(-10, fw + 10, 66, 4, '#eef2da', .32);
  // 梢の間から差し込む朝の光の筋（遠い森の上に、斜めに）
  far += godRays(-10, fw + 10, -5, 80, Math.round(fw / 9), '#fff6d2', -.3);
  // 中景：地面、小道、木、根元の茂み、草、花
  mid += groundPath(-5, mw + 5, 76.5, 1.2, '#a3bd6b', '#6a8c42');
  mid += trail(-5, mw + 5, 86.5, 6.5) + trailDetail(-5, mw + 5, 86.5, 6.5);
  mid += dapple(-5, mw, 80, 100, Math.round(mw / 3), '#fff4c0', .25);
  // 光だまり：梢のすき間から落ちる大きめの光（小道と草地に）
  mid += dapple(-5, mw, 82, 99, Math.round(mw / 14), '#fff6c8', .2, { rx: [5, 9], ry: [1.1, 2] });
  mid += grassEdge(-5, mw + 5, 77.4, [P.leaf, P.fresh, P.olive, '#8fb24e'], 2.4);
  // 奥の並木（霞んだ細い幹）：手前の木と遠い森のあいだに奥行きの層をもう 1 枚
  for (let x = R(0, 6); x < mw; x += R(6, 11)) {
    const z = R(.45, .65), hazeC = '#e3e9c4';
    const bb = R(76.5, 78), hh = R(70, 90), tc = mixC(pick([P.trunk, '#7a5638', '#86623f']), hazeC, z), ww = R(.7, 1.3), ll = R(-.6, .6);
    tree(x, bb, hh, { trunkC: tc, tones: null, w: ww, lean: ll, branches: 0 }); // 乱数の並びを変えないために呼ぶ（絵は下の hazeTrunk で描く）
    mid += hazeTrunk(x, bb, hh, ww * 1.15, ll, tc);
  }
  // 奥の下草の列と、幹のあいだにたまる朝の霧
  mid += understory(-5, mw + 5, 78.2, [P.dark, P.mid, P.leaf, P.fresh], '#e3e9c4');
  mid += mist(-5, mw + 5, 75, 4, '#eef2da', .2);
  const treeXs = [];
  for (let x = R(0, 8); x < mw; x += R(16, 27)) if (clearOfWorks(W, stops, x, 4)) treeXs.push(x);
  for (let s = 1; s < stops; s++) { const [a, , b] = artZone(W, at(W, FACTORS.mid)(s, W / 2), 0, 0); treeXs.push(a - 1, b + 1); }
  treeXs.sort((a, b) => a - b);
  // ふくろうの木：2 つめの作品を過ぎたあたりで、作品から離れている幹をひとつ選ぶ
  const owlX = treeXs.find((x) => x > W * 1.6 && clearOfWorks(W, stops, x, 9)) ?? treeXs.find((x) => x > W * 1.6 && clearOfWorks(W, stops, x, 3)) ?? treeXs.find((x) => x > W * 1.6);
  for (const x of treeXs) {
    const base = R(79.5, 82), h = R(92, 106), w = x === owlX ? R(3.9, 4.4) : R(2.6, 4.4), trunkC = pick([P.trunk, '#7a5638', '#5c4027', '#86623f']);
    mid += tree(x, base, h, { trunkC, tones: [P.dark, P.mid, P.leaf, P.fresh], w });
    // 太い幹のひとつに洞（うろ）とふくろう。ほかの幹には、ときどきつた
    if (x === owlX) mid += hollow(x + w * .05, base - h * .4, w * .48);
    else if (rnd() < .35) mid += ivy(x + R(-w * .3, w * .3), base - h * R(.35, .5), base - 1, w, [P.mid, P.leaf, P.fresh, P.lime]);
    if (rnd() < .6) mid += shrub(x + R(-4, 4), base + .6, R(7, 11), [P.dark, P.mid, P.leaf, P.fresh], { leaf: R(1.1, 1.4), n: 4 });
  }
  // 作品と作品のあいだ（小道の手前の縁、作品の下）：最初のすき間に倒木、あとは岩のわきに切り株とうさぎ
  for (let s = 0; s < stops - 1; s++) {
    const x = at(W, FACTORS.mid)(s + .5, W / 2);
    if (s === 0) mid += fallenLog(x + R(-2, 2), 88.2, R(16, 20), R(1.9, 2.3), pick([P.trunk, '#7a5638', '#5c4027']));
    else {
      mid += stump(x + (s % 2 ? 1 : -1) * R(13, 16), 88.6, R(2.1, 2.6), pick([P.trunk, '#7a5638']));
    }
  }
  // 小道ぎわのシダ：根もとに影と草を添えて、地面から生えて見えるように（葉だけが浮いて見えないように）
  for (let x = R(0, 10); x < mw; x += R(14, 24)) {
    const y = R(85.6, 86.6), h = R(8, 12);
    mid += `<ellipse cx="${n1(x)}" cy="${n1(y + .3)}" rx="${n1(h * .42)}" ry="${n1(h * .07)}" fill="#3f5a2a" opacity=".35"/>`;
    mid += fern(x, y, h, R(-50, 50), pick([P.leaf, P.olive, P.fresh]), { cls: '' });
    mid += tuft(x + R(-1, 1), y + .4, R(2.2, 3.2), [P.mid, P.leaf, P.fresh], 5);
  }
  mid += grassEdge(-5, mw + 5, 86.8, [P.leaf, P.fresh, P.olive, '#8fb24e'], 2.2);
  mid += grassEdge(-5, mw + 5, 93.6, [P.mid, P.leaf, P.fresh, P.olive], 3.2);
  mid += litter(-5, mw, 79, 86, Math.round(mw * 1.1), ['#8a6a3a', '#a5813e', '#6f7d2e', '#b8923e', '#5c6a2a']);
  mid += litter(-5, mw, 92, 104, Math.round(mw * 1.3), ['#8a6a3a', '#a5813e', '#6f7d2e', '#b8923e', '#5c6a2a']);
  mid += pebbles(-5, mw, 87.4, 91.5, Math.round(mw * .6));
  // 小道のわきのきのこ（木の根もとや草のかげに、ぽつぽつと）
  for (let x = R(2, 12); x < mw; x += R(18, 34)) { const y = R(93.5, 97); mid += mushroom(x, y, R(.8, 1.3), pick(['#b8604a', '#c98a5a', '#d4b884'])); if (rnd() < .5) mid += mushroom(x + R(1.2, 2.2), y + R(-.3, .5), R(.5, .8), pick(['#b8604a', '#d4b884'])); }
  mid += flowers(-5, mw, 80, 85, Math.round(mw / 7), ['#fffaf2', '#f6d7e0', '#f2c14e', '#c7b3e6']);
  mid += flowers(-5, mw, 95, 101, Math.round(mw / 6), ['#fffaf2', '#f6d7e0', '#f2c14e', '#c7b3e6'], { scale: 1.3 });
  // 花の上を舞う蝶（作品の下の草地に）
  for (let s = 0; s < stops; s++) {
    const x = at(W, FACTORS.mid)(s, W / 2);
  }
  for (let x = -5; x < mw; x += R(9, 14)) mid += bushMass(x, R(-5, -1), R(9, 13), [P.deep, P.dark, P.mid, P.leaf], 22);
  mid += canopyFringe(-5, mw + 5, [P.deep, P.dark, P.mid, P.leaf, P.fresh]);
  for (let x = R(0, 10); x < mw; x += R(22, 36)) mid += sprig(x, -3, R(12, 20), 180 + R(-20, 20), [P.leaf, P.fresh, P.lime, P.pale], { leaf: 2.8, cls: 'hang', stem: '#3d5a2a' });
  mid += beams(-10, mw, Math.round(mw / 18), '#fffbe0', { opacity: .08 });
  // 手前を横切る茂み（作品と作品のあいだ。作品の前には来ない）
  for (let s = 0; s < stops - 1; s++) {
    if (s === birdGap) continue; // インコがいるすき間は、手前に茂みを置かない
    const x = at(W, FACTORS.move)(s + .5, W / 2), Z = moveZones(W, s, 4, 82);
    move += guard(Z, (k) => shrub(x + R(-6, 6), 108, R(34, 42) * k, [P.deep, P.dark, P.mid, P.leaf], { leaf: 4.4 * k }));
    move += guard(Z, (k) => fern(x + R(-14, 14), 110, R(28, 36) * k, R(-30, 30), P.dark, { cls: '' }));
    move += guard(Z, (k) => sprig(x + R(-10, 10), -6, R(28, 36) * k, 180 + R(-20, 20), [P.deep, P.dark, P.mid, P.leaf], { leaf: 5 * k, cls: 'hang', stem: '#233a26' }));
  }
  const [frame, ground] = forestFrame(W, P, [artZone(W, W / 2, 4, 82)], { split: true, sides: false });
  move += tileGround(W, stops, ground);
  return {
    sky: 'linear-gradient(#eef1d6 0%, #f3e8c6 52%, #dfe6b5 100%)',
    far: [fw, far], mid: [mw, mid], move: [vw, move], frame, fx: 'forest', glowDefault: [255, 244, 200],
    curtain: ['#132a1e', '#1e4630', '#2f6a44', '#47733c', '#769721'],
  };
}

export function sceneJungle(W, stops, { birdGap = -1 } = {}) {
  reseed(21 + stops);
  const P = PAL.forest, Q = PAL.water, fw = planeW(W, stops, FACTORS.far), mw = planeW(W, stops, FACTORS.mid), vw = planeW(W, stops, FACTORS.move);
  let far = '', mid = '', move = '';
  const rings = [], srings = []; // 水面の波紋の場所 [x, y, 大きさ]（rings は葉と水草のまわり、srings は飛び石と杭のまわり）
  // 奥：水面に映る木の影、水中の枝、ゆらめき
  const [rg, rd] = lgrad([[0, '#4f5a35', .28], [.6, '#4f5a35', .12], [1, '#4f5a35', 0]]);
  far += `<defs>${rd}</defs>`;
  for (let x = R(0, 10); x < fw; x += R(9, 16)) { const w = R(1.5, 3.5), l = R(-2, 2); far += `<path d="M${n1(x)} -2L${n1(x + w)} -2Q${n1(x + w + l)} 50 ${n1(x + w * .8 + l * 2)} 102L${n1(x + w * .2 + l * 2)} 102Q${n1(x + l)} 50 ${n1(x)} -2Z" fill="url(#${rg})"/>`; }
  // 水面に映る空の雲（見下ろした池に、白い雲がやわらかく映り込む）
  far += cloudReflections(-10, fw + 10, 8, 95, Math.round(fw / 14));
  // 対岸の茂み（上のほう）と、その映り込み
  far += farBank(-10, fw + 10, 28, ['#1f3a22', '#2b5230', '#3d6b3a', '#5a8a3c']);
  // （鯉は背景に焼かず、museum.js のスクロールで泳ぐ鯉だけにする：止まった鯉が混ざらないように）
  far += caustics(-5, fw, 29, 100, Math.round(fw * 1.2), 'rgba(210,222,170,.35)');
  for (let i = 0; i < fw / 12; i++) far += `<path d="M${n1(R(0, fw))} ${n1(R(30, 90))}q${n1(R(-8, 8))} ${n1(R(4, 10))} ${n1(R(-10, 10))} ${n1(R(10, 20))}" stroke="#5f6a40" stroke-width="${n1(R(.4, 1))}" fill="none" opacity=".45" stroke-linecap="round"/>`;
  for (let i = 0; i < fw / 7; i++) { const x = R(0, fw), y = R(31, 95); far += lily(x, y, R(1.5, 3), pick(['#9fb86a', '#8aa35a', '#b3c97a'])); }
  // 中景：太い枝と苔、つる、睡蓮と花、波紋、葦
  const [bG, bD] = lgrad([[0, '#8a6442'], [1, '#5a3b2a']]);
  mid += `<defs>${bD}</defs><path d="M-5 6Q${n1(mw * .25)} -1 ${n1(mw * .5)} 8T${n1(mw + 5)} 6L${n1(mw + 5)} 11Q${n1(mw * .75)} 14 ${n1(mw * .5)} 12T-5 10Z" fill="url(#${bG})"/>`;
  for (let x = 0; x < mw; x += R(3, 6)) mid += `<path d="M${n1(x)} ${n1(8 + Math.sin(x * .02) * 2)}l${n1(R(1, 3))} ${n1(R(-.3, .3))}" stroke="#9a7650" stroke-width=".3" opacity=".7" stroke-linecap="round"/>`;
  mid += drape(-5, mw + 5, 5, 16, P.fresh) + drape(-5, mw + 5, 2, 10, P.lime);
  for (let x = R(0, 8); x < mw; x += R(7, 13)) if (clearOfWorks(W, stops, x, 2)) mid += vine(x, 6, R(20, 48), '#4c5a2a', [P.fresh, P.lime, P.leaf]);
  for (let i = 0; i < mw / 4.5; i++) {
    const x = R(0, mw), y = R(34, 98), r = R(2.5, 5);
    if (rnd() < .35) rings.push([x, y, r]); // 葉のまわりの波紋（止まった輪ではなく、museum.js がゆっくり広げて動かす）
    mid += lily(x, y, r, pick([Q.pad, Q.padDark, '#bcd65f']));
    if (rnd() < .12) mid += waterLily(x + r * .3, y - .2, r * .5);
  }
  // 水面の描き込み：ウキクサの群れ、浮いた落ち葉、藻のすじ
  for (let i = 0; i < mw / 9; i++) {
    const cx = R(0, mw), cy = R(40, 98), sp = R(2, 6);
    for (let k = 0; k < 14; k++) mid += `<circle cx="${n1(cx + R(-sp, sp))}" cy="${n1(cy + R(-sp, sp) * .3)}" r="${n1(R(.12, .3))}" fill="${pick(['#a5c23e', '#8aa35a', '#c9d77a'])}" opacity=".8"/>`;
  }
  mid += litter(-5, mw, 36, 98, Math.round(mw * .35), ['#8a6a3a', '#a5813e', '#b8923e', '#6f7d2e']);
  for (let i = 0; i < mw / 10; i++) { R(0, mw); R(30, 98); R(3, 7); R(-.6, .6); R(7, 14); } // （水面の暗い線はやめた。乱数の並びだけ残す）
  for (let s = 0; s < stops; s++) {
    const cx = at(W, FACTORS.mid)(s, W / 2);
    // 葦は台（桟橋の上の木の台）の横に重ならないところだけ（狭い画面では台の縁にかかるので置かない）
    for (const [dx, n, c] of [[-.34, 7, '#6f8a3a'], [.36, 6, '#7c9a40']]) { const x = cx + W * dx; if (clearOfWorks(W, stops, x - 3, 2) && clearOfWorks(W, stops, x + 3, 2)) { mid += reeds(x, 100, n, c); rings.push([x, 99.2, 3.6]); } } // 水草の根もとにも波紋
  }
  for (let i = 0; i < mw / 3; i++) { R(0, mw); R(30, 100); R(2, 6); } // （白い横線はやめた：チープに見えるので。乱数の並びだけ残す）
  // 浅瀬の底：水の中にうっすら透けて見える小石（手前ほど大きく、はっきり。水の色にとけこむ淡い色で）
  { const g = hrng(mw + 3.7), G = (a, b) => a + g() * (b - a);
    for (let i = 0; i < mw / 2.2; i++) {
      const y = G(66, 87), t = (y - 66) / 21, x = G(-3, mw + 3), w = G(.8, 2.2) * (.55 + t * .9), a = .2 + t * .28;
      mid += `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n2(w)}" ry="${n2(w * .55)}" fill="${['#4e5a3a', '#5d6646', '#6b6a4e'][Math.floor(g() * 3)]}" opacity="${n2(a)}"/><ellipse cx="${n1(x - w * .2)}" cy="${n1(y - w * .18)}" rx="${n2(w * .55)}" ry="${n2(w * .26)}" fill="#c8d2a0" opacity="${n2(a * .55)}"/>`;
    }
  }
  mid += waterSheen(-5, mw + 5, 30, 100);
  // 生きもの：蓮の葉のカエル、水面のトンボとアメンボ、丸太のカメ、浅瀬のサギ、つるの先のカワセミ（作品の枠にはかからないところに）
  for (let s = 0; s < stops; s++) {
    // 立入禁止の枠：作品そのもの（上のほう）と、その下の台（細い）。台の横の水面は使える
    const cx = at(W, FACTORS.mid)(s, W / 2), nx = at(W, FACTORS.mid)(s + 1, W / 2), Z = [artZone(W, cx, 15, 66), [cx - 9, 60, cx + 9, 94], artZone(W, nx, 15, 66), [nx - 9, 60, nx + 9, 94]];
    const gx = cx + W * FACTORS.mid * .5;
    mid += guard(Z, () => { const r = R(3.5, 4.5), x = gx + R(-12, 12), y = R(66, 78); return lily(x, y, r, Q.pad) + waterLily(x + r * .2, y - .3, r * .5); }, { min: 1 });
    if (s % 3 === 0 && s > 0) mid += guard(Z, () => { const x = gx + R(-8, 8), len = R(24, 34); return vine(x, 6, len, '#4c5a2a', [P.fresh, P.lime, P.leaf], { cls: '' }); }, { min: 1 });
  }
  // 手前の水ぎわ：苔むした石と、蓮のつぼみ
  for (let x = R(0, 8); x < mw; x += R(12, 22)) if (clearOfWorks(W, stops, x, 6)) { const y = R(80, 86), w = R(3, 5); mid += `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(w)}" ry="${n1(w * .45)}" fill="#6f6a58"/><ellipse cx="${n1(x - w * .2)}" cy="${n1(y - w * .18)}" rx="${n1(w * .7)}" ry="${n1(w * .25)}" fill="#8a8672"/><ellipse cx="${n1(x - w * .3)}" cy="${n1(y - w * .3)}" rx="${n1(w * .4)}" ry="${n1(w * .16)}" fill="#7a9a3c" opacity=".85"/>`; srings.push([x, y + w * .3, w * 1.05]); } // 飛び石のまわりの波紋も museum.js が動かす
  for (let i = 0; i < mw / 14; i++) { const x = R(0, mw), y = R(40, 96); mid += `<path d="M${n1(x)} ${n1(y)}L${n1(x + .3)} ${n1(y - 3.5)}" stroke="#4f7a38" stroke-width=".3"/><ellipse cx="${n1(x + .3)}" cy="${n1(y - 4.2)}" rx=".7" ry="1.3" fill="#f4c3d0"/><ellipse cx="${n1(x + .1)}" cy="${n1(y - 4.2)}" rx=".35" ry="1.1" fill="#fbe0e6"/>`; }
  // 水ぎわの桟橋：部屋の端から端まで続く板の道。作品はこの上の台に立つ
  mid += `<path d="M-5 87.6H${n1(mw + 5)}V91.6H-5Z" fill="#a47a4e"/><path d="M-5 87.6H${n1(mw + 5)}V88.2H-5Z" fill="#c9a276"/><path d="M-5 91.6H${n1(mw + 5)}V93H-5Z" fill="#5a3b2a"/>`;
  for (let x = -5; x < mw + 5; x += R(2.6, 3.4)) mid += `<path d="M${n1(x)} 88.2L${n1(x - .4)} 91.6" stroke="#7d5a38" stroke-width=".3" opacity=".7"/>`;
  for (let x = R(0, 6); x < mw; x += R(14, 20)) { mid += `<path d="M${n1(x)} 93H${n1(x + 1.4)}V101H${n1(x)}Z" fill="#4a3322"/>`; srings.push([x + .7, 101, 2.6]); } // 杭のまわりの波紋も動かす
  // 手前を横切る茂みとバナナの葉
  for (let s = 0; s < stops - 1; s++) {
    if (s === birdGap) continue; // インコがいるすき間は、手前に茂みを置かない
    const x = at(W, FACTORS.move)(s + .5, W / 2), Z = moveZones(W, s, 15, 92);
    move += guard(Z, (k) => shrub(x, 108, R(36, 44) * k, [P.deep, P.dark, P.mid, P.leaf], { leaf: 4.6 * k }));
    move += guard(Z, (k) => bananaLeaf(x - 10, 112, R(34, 44) * k, R(-30, -10), P.mid)) + guard(Z, (k) => bananaLeaf(x + 10, 112, R(30, 40) * k, R(10, 30), P.leaf));
    move += guard(Z, (k) => drape(x - 20 * k, x + 20 * k, -2, 22 * k, P.olive));
  }
  // 額縁：左に幹とつる、右に茂み、下にバナナの葉、上に苔
  const Z = [artZone(W, W / 2, 15, 92)];
  let frame = '', ground = '';
  // 左の縁は幹を立てず、上から垂れるつると、下からの茂みだけ（作品の横をあける）
  for (let i = 0; i < 4; i++) { const x = R(-1, W * .1); frame += guard(Z, (k) => vine(x, -2, R(30, 70) * k, '#4c5a2a', [P.fresh, P.lime, P.leaf])); }
  ground += guard(Z, (k) => shrub(W - R(0, 4), 108, R(34, 42) * k, [P.deep, P.dark, P.mid, '#2e5a3a'], { leaf: 4.2 * k }));
  ground += guard(Z, (k) => shrub(W - R(14, 22), 109, R(20, 26) * k, [P.dark, P.mid, P.leaf, P.fresh], { leaf: 3 * k }));
  ground += guard(Z, (k) => shrub(R(6, 12), 109, R(22, 28) * k, [P.dark, P.mid, P.leaf, P.fresh], { leaf: 3.2 * k }));
  ground += guard(Z, (k) => bananaLeaf(W * .1, 112, 36 * k, 30, P.mid)) + guard(Z, (k) => bananaLeaf(W * .9, 112, 40 * k, -34, P.leaf));
  frame += drape(-5, W + 5, -2, 3.5, P.fresh);
  frame += guard(Z, (k) => drape(-5, W * .3, -2, 16 * k, P.olive)) + guard(Z, (k) => drape(W * .7, W + 5, -2, 18 * k, P.olive));
  for (let i = 0; i < 10; i++) { const x = R(-4, W + 4); ground += guard(Z, (k) => sprig(x, 108, R(16, 26) * k, R(-40, 40), [P.fresh, P.lime, '#8fbf3f', P.leaf], { leaf: R(3.2, 4.4) * k, kind: rnd() < .4 ? 'lance' : 'oval', stem: '#4c5a2a' })); }
  move += tileGround(W, stops, ground);
  return {
    sky: `linear-gradient(${Q.light} 0%, ${Q.base} 55%, ${Q.deep} 100%)`,
    far: [fw, far], mid: [mw, mid], move: [vw, move], frame, fx: 'jungle', glowDefault: [214, 232, 150], rings, srings,
    curtain: ['#1a3322', '#244d33', '#47733c', '#769721', '#a5c23e'],
  };
}

// ---------- 水辺の描き込み：対岸の茂み、水中の鯉、カエル、トンボ、カワセミ、サギ、カメ、アメンボ ----------
// 対岸：暗い茂みの帯に丸い茂みとモンステラ。下に水面への映り込み（上下を反転して薄く）
// 対岸の奥：霞んだ背の高い木々（幹と樹冠）、ヤシとバナナの大きな葉の影、上にうすい霧
function farBankBackdrop(x0, x1, y, tones) {
  const d = hrng(x0 * .9 + x1 * 1.7 + y), haze = (c, t) => mixC(c, '#c3d2a2', t);
  let s = '';
  for (let x = x0 + d() * 6; x < x1; x += 7 + d() * 9) { // 奥の木：細い幹と、重なる丸い樹冠
    const h = 12 + d() * 9, top = y - h, c = haze(tones[1], .62), w = .5 + d() * .5;
    s += `<path d="M${n1(x - w)} ${n1(y)}L${n1(x - w * .5)} ${n1(top + 3)}L${n1(x + w * .5)} ${n1(top + 3)}L${n1(x + w)} ${n1(y)}Z" fill="${haze(tones[0], .6)}"/>`;
    for (let k = 0; k < 4; k++) s += `<ellipse cx="${n1(x + (d() - .5) * 5)}" cy="${n1(top + 1 + d() * 4)}" rx="${n1(2.2 + d() * 2.6)}" ry="${n1(1.6 + d() * 1.6)}" fill="${k % 2 ? c : haze(tones[2], .6)}"/>`;
  }
  for (let x = x0 + 3 + d() * 10; x < x1; x += 14 + d() * 16) { // ヤシ：細い幹が少し傾き、上に大きな羽の葉
    const h = 13 + d() * 7, lean = (d() - .5) * 4, tx = x + lean, ty = y - h, c = haze(tones[1], .5);
    s += `<path d="M${n1(x)} ${n1(y)}Q${n1(x + lean * .3)} ${n1(y - h * .5)} ${n1(tx)} ${n1(ty)}" stroke="${haze(tones[0], .5)}" stroke-width=".45" fill="none"/>`;
    for (let k = 0; k < 7; k++) { const a = -170 + k * 27 + (d() - .5) * 10, L = 3 + d() * 2.2, ex = tx + Math.cos(a * Math.PI / 180) * L, ey = ty + Math.sin(a * Math.PI / 180) * L * .6 + L * .35; s += `<path d="M${n1(tx)} ${n1(ty)}Q${n1((tx + ex) / 2)} ${n1(Math.min(ty, ey) - .9)} ${n1(ex)} ${n1(ey)}Q${n1((tx + ex) / 2)} ${n1(Math.min(ty, ey) - .2)} ${n1(tx)} ${n1(ty + .25)}Z" fill="${c}"/>`; }
  }
  for (let x = x0 + 8 + d() * 12; x < x1; x += 18 + d() * 22) { // バナナの葉：大きく垂れる幅広の葉
    const bx = x, by = y - 4 - d() * 3, c = haze(tones[2], .45);
    for (const dir of [-1, 1]) { const L = 4 + d() * 2.5, ex = bx + dir * L, ey = by - 1 + d() * 3; s += `<path d="M${n1(bx)} ${n1(by)}Q${n1(bx + dir * L * .5)} ${n1(by - 3)} ${n1(ex)} ${n1(ey)}Q${n1(bx + dir * L * .45)} ${n1(by + .6)} ${n1(bx)} ${n1(by + .5)}Z" fill="${c}"/><path d="M${n1(bx)} ${n1(by + .1)}Q${n1(bx + dir * L * .5)} ${n1(by - 1.6)} ${n1(ex)} ${n1(ey)}" stroke="${haze(tones[1], .55)}" stroke-width=".12" fill="none"/>`; }
  }
  s += `<rect x="${n1(x0)}" y="${n1(y - 22)}" width="${n1(x1 - x0)}" height="14" fill="#d4dfb4" opacity=".22"/>`; // うすい霧
  return s;
}
// 対岸の手前：岸から立つ太い幹と水に下りる根、水ぎわの苔むした岩、細長い水草の葉、濡れた土の帯
// 対岸の植物（いろいろな種類を順ぐりに）：竹、パピルス、木生シダ、クワズイモ、ヘリコニア。くすんだ色で、影絵に近く
function bankPlants(x0, x1, y, tones) {
  const d = hrng(x0 * 2.7 + x1 * .3 + y * 5), deep = tones[0], mid = tones[1], lt = tones[2], lite = tones[3];
  const leaf = (x, yy, L, a, w, c) => `<path d="M0 0Q${n1(L * .5)} ${n1(-w)} ${n1(L)} 0Q${n1(L * .5)} ${n1(w)} 0 0Z" transform="translate(${n1(x)} ${n1(yy)}) rotate(${n1(a)})" fill="${c}"/>`;
  const kinds = {
    bamboo(x) { let o = ''; const n = 4 + Math.floor(d() * 3); for (let k = 0; k < n; k++) { const bx = x + (k - n / 2) * .9 + (d() - .5) * .5, h = 12 + d() * 7, lean = (d() - .5) * 1.6, c = k % 2 ? mid : lt; o += `<path d="M${n1(bx - .22)} ${n1(y + .5)}L${n1(bx + lean - .16)} ${n1(y - h)}L${n1(bx + lean + .16)} ${n1(y - h)}L${n1(bx + .22)} ${n1(y + .5)}Z" fill="${c}"/>`; for (let j = 1; j < 6; j++) { const t = j / 6, jy = y - h * t, jx = bx + lean * t; o += `<path d="M${n1(jx - .3)} ${n1(jy)}H${n1(jx + .3)}" stroke="${deep}" stroke-width=".14"/>`; if (j > 2) for (const dir of [-1, 1]) if (d() < .6) o += leaf(jx, jy, 1.6 + d() * .9, dir < 0 ? 180 + 25 + d() * 25 : -25 - d() * 25 + 360, .28, d() < .5 ? lt : lite); } } return o; },
    papyrus(x) { let o = ''; for (let k = 0; k < 5; k++) { const bx = x + (k - 2) * .8 + (d() - .5) * .6, h = 5 + d() * 4, tx = bx + (d() - .5) * 2, ty = y - h; o += `<path d="M${n1(bx)} ${n1(y + .5)}Q${n1((bx + tx) / 2)} ${n1(y - h * .5)} ${n1(tx)} ${n1(ty)}" stroke="${mid}" stroke-width=".16" fill="none"/>`; for (let j = 0; j < 11; j++) { const a = -165 + j * 15, L = 1.3 + d() * .6; o += `<path d="M${n1(tx)} ${n1(ty)}l${n1(Math.cos(a * Math.PI / 180) * L)} ${n1(Math.sin(a * Math.PI / 180) * L * .7)}" stroke="${j % 2 ? lt : lite}" stroke-width=".12" stroke-linecap="round"/>`; } } return o; },
    treeFern(x) { const h = 6 + d() * 4, tx = x + (d() - .5), ty = y - h; let o = `<path d="M${n1(x - .35)} ${n1(y + .5)}L${n1(tx - .25)} ${n1(ty)}L${n1(tx + .25)} ${n1(ty)}L${n1(x + .35)} ${n1(y + .5)}Z" fill="${deep}"/>`; for (let k = 0; k < 9; k++) { const a = -175 + k * 21 + (d() - .5) * 8, L = 3 + d() * 1.5, ex = tx + Math.cos(a * Math.PI / 180) * L, ey = ty + Math.sin(a * Math.PI / 180) * L * .55 + L * .3; o += `<path d="M${n1(tx)} ${n1(ty)}Q${n1((tx + ex) / 2)} ${n1(Math.min(ty, ey) - .8)} ${n1(ex)} ${n1(ey)}Q${n1((tx + ex) / 2)} ${n1(Math.min(ty, ey) - .1)} ${n1(tx)} ${n1(ty + .3)}Z" fill="${k % 2 ? lt : mid}"/>`; for (let j = 1; j < 5; j++) { const t = j / 5, px = tx + (ex - tx) * t, py = ty + (ey - ty) * t - Math.sin(t * Math.PI) * .6; o += `<path d="M${n1(px)} ${n1(py)}l${n1(-.2)} ${n1(.45)}M${n1(px)} ${n1(py)}l${n1(.2)} ${n1(.45)}" stroke="${deep}" stroke-width=".08" opacity=".6"/>`; } } return o; },
    elephantEar(x) { let o = ''; for (let k = 0; k < 4; k++) { const bx = x + (k - 1.5) * 1.3, h = 2.6 + d() * 2.2, lx = bx + (d() - .5) * 1.4, ly = y - h, s2 = 1.5 + d() * .8, c = k % 2 ? lt : mid; o += `<path d="M${n1(bx)} ${n1(y + .5)}Q${n1(bx)} ${n1(y - h * .6)} ${n1(lx)} ${n1(ly)}" stroke="${mid}" stroke-width=".13" fill="none"/><path d="M${n1(lx)} ${n1(ly)}C${n1(lx - s2 * 1.1)} ${n1(ly - s2 * .2)} ${n1(lx - s2 * .7)} ${n1(ly + s2 * 1.1)} ${n1(lx)} ${n1(ly + s2 * 1.5)}C${n1(lx + s2 * .7)} ${n1(ly + s2 * 1.1)} ${n1(lx + s2 * 1.1)} ${n1(ly - s2 * .2)} ${n1(lx)} ${n1(ly)}Z" fill="${c}"/><path d="M${n1(lx)} ${n1(ly)}V${n1(ly + s2 * 1.4)}" stroke="${deep}" stroke-width=".08" opacity=".5"/>`; } return o; },
    heliconia(x) { let o = ''; for (let k = 0; k < 3; k++) { const bx = x + (k - 1) * 1.6, h = 5 + d() * 3, ty = y - h; o += `<path d="M${n1(bx)} ${n1(y + .5)}L${n1(bx)} ${n1(ty)}" stroke="${mid}" stroke-width=".18"/>` + leaf(bx, ty + 1.6, 3 + d(), -40 - d() * 30, .55, lt) + leaf(bx, ty + 2.6, 2.8 + d(), 200 + d() * 30, .5, mid); for (let j = 0; j < 4; j++) { const jy = ty + .2 + j * .75, dir = j % 2 ? 1 : -1; o += `<path d="M${n1(bx)} ${n1(jy)}l${n1(dir * .75)} ${n1(.2)}l${n1(-dir * .5)} ${n1(.45)}Z" fill="${j % 2 ? '#b8683e' : '#c98a3e'}" opacity=".85"/>`; } } return o; },
  };
  const order = ['bamboo', 'treeFern', 'papyrus', 'elephantEar', 'heliconia'];
  let s = '', i = Math.floor(d() * order.length);
  for (let x = x0 + 4 + d() * 8; x < x1; x += 11 + d() * 12) s += kinds[order[i++ % order.length]](x);
  return s;
}
function farBankFront(x0, x1, y, tones) {
  const d = hrng(x0 * 1.3 + x1 * .4 + y * 2);
  let s = `<path d="M${n1(x0)} ${n1(y + .2)}H${n1(x1)}V${n1(y + 1.1)}H${n1(x0)}Z" fill="#2a3420" opacity=".55"/>`;
  for (let x = x0 + 5 + d() * 14; x < x1; x += 24 + d() * 30) { // 太い幹と根
    const w = 1 + d() * .7, h = 9 + d() * 6, c = '#3a3a28';
    s += `<path d="M${n1(x - w)} ${n1(y + .5)}Q${n1(x - w * .6)} ${n1(y - h * .5)} ${n1(x - w * .4)} ${n1(y - h)}L${n1(x + w * .4)} ${n1(y - h)}Q${n1(x + w * .7)} ${n1(y - h * .5)} ${n1(x + w)} ${n1(y + .5)}Z" fill="${c}"/><path d="M${n1(x - w * .5)} ${n1(y)}Q${n1(x - w * .35)} ${n1(y - h * .5)} ${n1(x - w * .25)} ${n1(y - h)}" stroke="#5a5a3c" stroke-width=".18" fill="none" opacity=".7"/>`;
    for (const dir of [-1, 1, -1]) { const rx = x + dir * (w + d() * 2.5); s += `<path d="M${n1(x + dir * w * .5)} ${n1(y - 1.2)}Q${n1(rx)} ${n1(y - .8)} ${n1(rx + dir * .8)} ${n1(y + 1.4)}" stroke="${c}" stroke-width="${n1(.28 + d() * .2)}" fill="none" stroke-linecap="round"/>`; }
  }
  s += bankPlants(x0, x1, y, tones);
  for (let x = x0 + d() * 8; x < x1; x += 9 + d() * 14) { // 水ぎわの岩（半分水に沈み、上に苔）
    const w = 1.6 + d() * 2.2, h = w * (.45 + d() * .2), cy = y + .9;
    s += `<path d="M${n1(x - w)} ${n1(cy)}Q${n1(x - w * .8)} ${n1(cy - h)} ${n1(x)} ${n1(cy - h)}Q${n1(x + w * .8)} ${n1(cy - h)} ${n1(x + w)} ${n1(cy)}Z" fill="#5a5f4a"/><path d="M${n1(x - w * .7)} ${n1(cy - h * .7)}Q${n1(x)} ${n1(cy - h * 1.15)} ${n1(x + w * .5)} ${n1(cy - h * .8)}Q${n1(x)} ${n1(cy - h * .55)} ${n1(x - w * .7)} ${n1(cy - h * .7)}Z" fill="${tones[3]}" opacity=".75"/><path d="M${n1(x + w * .2)} ${n1(cy - h * .2)}Q${n1(x + w * .7)} ${n1(cy - h * .4)} ${n1(x + w * .9)} ${n1(cy)}" stroke="#3a3e30" stroke-width=".25" fill="none" opacity=".6"/>`;
  }
  for (let x = x0 + d() * 4; x < x1; x += 3 + d() * 6) { // 細長い水草の葉（線ではなく、先の細い葉の形）
    const n = 2 + Math.floor(d() * 3);
    for (let k = 0; k < n; k++) { const bx = x + (d() - .5) * 1.4, h = 2.2 + d() * 2.8, lean = (d() - .5) * 1.8, wd = .16 + d() * .1; s += `<path d="M${n1(bx - wd)} ${n1(y + .8)}Q${n1(bx + lean * .4)} ${n1(y + .8 - h * .6)} ${n1(bx + lean)} ${n1(y + .8 - h)}Q${n1(bx + lean * .4 + wd)} ${n1(y + .8 - h * .55)} ${n1(bx + wd)} ${n1(y + .8)}Z" fill="${d() < .5 ? tones[2] : tones[3]}"/>`; }
  }
  return s;
}
function farBank(x0, x1, y, tones) {
  const id = `bk${gid++}`;
  let x = x0, d = `M${n1(x0)} ${n1(y + 2)}L${n1(x0)} ${n1(y - 3)}`;
  while (x < x1) { const w = R(4, 9), h = R(3, 7); d += `Q${n1(x + w / 2)} ${n1(y - h - w * .3)} ${n1(x + w)} ${n1(y - h * R(.2, .6))}`; x += w; }
  let b = farBankBackdrop(x0, x1, y, tones) + `<path d="${d}L${n1(x)} ${n1(y + 2)}Z" fill="${tones[0]}"/>`;
  for (let bx = x0 + R(2, 6); bx < x1; bx += R(6, 12)) { const r = R(2.5, 4.5); b += bushMass(bx, y - r * .7, r, tones, 14); }
  for (let bx = x0 + R(4, 10); bx < x1; bx += R(12, 22)) b += monstera(bx, y - R(1, 3), R(4, 6.5), R(-60, -20), pick([tones[1], tones[2]]), { cls: '' }) + monstera(bx + R(1, 3), y - R(.5, 2), R(3.5, 5.5), R(20, 60), pick([tones[2], tones[3]]), { cls: '' });
  for (let bx = x0; bx < x1; bx += R(1.5, 3)) b += tuft(bx, y + .8, R(1.5, 3), [tones[1], tones[2], tones[3]], 5);
  b += farBankFront(x0, x1, y, tones);
  // 水ぎわの土と、映り込み
  return `<g id="${id}">${b}</g><path d="M${n1(x0)} ${n1(y + .5)}H${n1(x1)}V${n1(y + 2.2)}H${n1(x0)}Z" fill="#3f4a2c" opacity=".6"/><g transform="translate(0 ${n1((y + 2.2) * 2)}) scale(1 -.75)" opacity=".28"><use href="#${id}"/></g>`;
}
// 水中を泳ぐ鯉（真上から見た紅白。a = 向き（0° が上））。
// 紡錘形の胴に鱗の模様、背びれ、大きく透ける胸びれと腹びれ、長い尾びれ（すべて別のグループで CSS が振る）。
// 紅の斑はふちが不ぞろいな面をいくつか重ねて、鱗の模様を透かす。輪郭線は引かない
function koi(x, y, len, a, colors) {
  const id = `ko${gid++}`, w = len * .15, [c1, c2] = colors, cd = dark(c1, .14), cl = light(c1, .1);
  const body = `M0 ${n1(-len * .5)}C${n1(w * .75)} ${n1(-len * .5)} ${n1(w * 1.05)} ${n1(-len * .24)} ${n1(w)} ${n1(-len * .08)}C${n1(w * .92)} ${n1(len * .18)} ${n1(w * .5)} ${n1(len * .36)} ${n1(w * .2)} ${n1(len * .44)}L${n1(-w * .2)} ${n1(len * .44)}C${n1(-w * .5)} ${n1(len * .36)} ${n1(-w * .92)} ${n1(len * .18)} ${n1(-w)} ${n1(-len * .08)}C${n1(-w * 1.05)} ${n1(-len * .24)} ${n1(-w * .75)} ${n1(-len * .5)} 0 ${n1(-len * .5)}Z`;
  // ひれ：透ける生成りに、ひれすじと先の紅
  const fin = (d, ox, oy, L, Wd, ang, cls) => {
    const path = `M0 0Q${n1(Wd * .9)} ${n1(-L * .15)} ${n1(Wd)} ${n1(L * .55)}Q${n1(Wd * .55)} ${n1(L * 1.02)} 0 ${n1(L)}Q${n1(-Wd * .25)} ${n1(L * .55)} 0 0Z`;
    let rays = '';
    for (let k = 1; k <= 4; k++) rays += `<path d="M0 0Q${n1(Wd * .25 * k)} ${n1(L * .3)} ${n1(Wd * .22 * k)} ${n1(L * (.95 - k * .05))}" stroke="${cd}" stroke-width="${n1(w * .04)}" fill="none" opacity=".35"/>`;
    return `<g class="${cls}" transform="translate(${n1(d * ox)} ${n1(oy)}) rotate(${n1(d * ang)}) scale(${d} 1)"><path d="${path}" fill="${cl}" opacity=".8"/><path d="${path}" fill="${cd}" opacity=".18"/><path d="M${n1(Wd * .55)} ${n1(L * .5)}Q${n1(Wd * .9)} ${n1(L * .55)} ${n1(Wd)} ${n1(L * .55)}Q${n1(Wd * .55)} ${n1(L * 1.02)} 0 ${n1(L)}Q${n1(Wd * .5)} ${n1(L * .78)} ${n1(Wd * .55)} ${n1(L * .5)}Z" fill="${c2}" opacity=".55"/>${rays}</g>`;
  };
  // 尾びれ：ふたつに分かれて長く流れる。ひれすじと先の紅
  const tail = `M${n1(-w * .2)} ${n1(len * .42)}Q${n1(-w * 1.4)} ${n1(len * .58)} ${n1(-w * 1.15)} ${n1(len * .96)}Q${n1(-w * .35)} ${n1(len * .74)} 0 ${n1(len * .7)}Q${n1(w * .35)} ${n1(len * .74)} ${n1(w * 1.15)} ${n1(len * .96)}Q${n1(w * 1.4)} ${n1(len * .58)} ${n1(w * .2)} ${n1(len * .42)}Z`;
  let tailRays = '';
  for (const d of [-1, 1]) for (let k = 1; k <= 3; k++) tailRays += `<path d="M0 ${n1(len * .46)}Q${n1(d * w * .3 * k)} ${n1(len * .66)} ${n1(d * w * (.25 + .28 * k))} ${n1(len * (.98 - k * .04))}" stroke="${cd}" stroke-width="${n1(w * .04)}" fill="none" opacity=".4"/>`;
  const tailTip = `M${n1(-w * 1.15)} ${n1(len * .96)}Q${n1(-w * 1.05)} ${n1(len * .8)} ${n1(-w * .7)} ${n1(len * .72)}Q${n1(-w * .8)} ${n1(len * .88)} ${n1(-w * 1.15)} ${n1(len * .96)}ZM${n1(w * 1.15)} ${n1(len * .96)}Q${n1(w * 1.05)} ${n1(len * .8)} ${n1(w * .7)} ${n1(len * .72)}Q${n1(w * .8)} ${n1(len * .88)} ${n1(w * 1.15)} ${n1(len * .96)}Z`;
  let s = `<g transform="translate(${n1(x)} ${n1(y)}) rotate(${n1(a)})"><defs><clipPath id="${id}"><path d="${body}"/></clipPath></defs>`;
  // 水底に落ちる影
  s += `<g class="shadow" opacity=".2" transform="translate(${n1(w * .5)} ${n1(len * .14)})"><path d="${body}" fill="#1a2a14"/><path d="${tail}" fill="#1a2a14"/></g>`;
  // 尾びれ・腹びれ・胸びれ（胴の下に）
  s += `<g class="tail"><path d="${tail}" fill="${cl}" opacity=".85"/><path d="${tailTip}" fill="${c2}" opacity=".6"/>${tailRays}</g>`;
  s += fin(-1, w * .6, len * .18, len * .24, w * .8, 48, 'fin l pelvic') + fin(1, w * .6, len * .18, len * .24, w * .8, 48, 'fin r pelvic');
  s += fin(-1, w * .9, -len * .2, len * .42, w * 1.5, 62, 'fin l') + fin(1, w * .9, -len * .2, len * .42, w * 1.5, 62, 'fin r');
  // 胴：地の色、鱗、紅の斑（ふちの不ぞろいな面をいくつか）、背の暗さ、頭の明るさ
  s += `<path d="${body}" fill="${c1}"/><g clip-path="url(#${id})">`;
  const blobs = 2 + Math.floor(rnd() * 2);
  for (let k = 0; k < blobs; k++) {
    const cx = R(-w * .5, w * .5), cy = R(-len * .34, len * .3), rx = w * R(.55, .95), ry = len * R(.1, .19);
    const pts = Array.from({ length: 12 }, (_, i) => { const t = i / 12 * Math.PI * 2, rr = 1 + (rnd() - .5) * .4; return [cx + Math.cos(t) * rx * rr, cy + Math.sin(t) * ry * rr]; });
    let d = `M${n1((pts[11][0] + pts[0][0]) / 2)} ${n1((pts[11][1] + pts[0][1]) / 2)}`;
    for (let i = 0; i < 12; i++) { const q = pts[i], nx = pts[(i + 1) % 12]; d += `Q${n1(q[0])} ${n1(q[1])} ${n1((q[0] + nx[0]) / 2)} ${n1((q[1] + nx[1]) / 2)}`; }
    s += `<path d="${d}Z" fill="${c2}"/>`;
  }
  for (let yy = -len * .3; yy < len * .4; yy += w * .3) s += `<path d="M${n1(-w)} ${n1(yy)}q${n1(w * .25)} ${n1(-w * .12)} ${n1(w * .5)} 0t${n1(w * .5)} 0t${n1(w * .5)} 0t${n1(w * .5)} 0" stroke="${cd}" stroke-width="${n1(w * .035)}" fill="none" opacity=".4"/>`;
  s += `<path d="M0 ${n1(-len * .5)}C${n1(w * .75)} ${n1(-len * .5)} ${n1(w * 1.05)} ${n1(-len * .24)} ${n1(w)} ${n1(-len * .08)}L${n1(w * .35)} ${n1(-len * .08)}Q${n1(w * .3)} ${n1(-len * .35)} 0 ${n1(-len * .5)}Z" fill="#000" opacity=".07"/>`;
  s += `<ellipse cx="0" cy="${n1(-len * .38)}" rx="${n1(w * .8)}" ry="${n1(len * .1)}" fill="#fff" opacity=".18"/>`;
  s += `</g>`;
  // 背びれ（背の中心線に沿う低いひれ）と、えらの線、目、ひげ
  s += `<path d="M0 ${n1(-len * .16)}Q${n1(w * .12)} ${n1(len * .02)} ${n1(w * .1)} ${n1(len * .3)}L${n1(-w * .1)} ${n1(len * .3)}Q${n1(-w * .12)} ${n1(len * .02)} 0 ${n1(-len * .16)}Z" fill="${cd}" opacity=".28"/>`;
  s += `<path d="M${n1(-w * .95)} ${n1(-len * .22)}Q${n1(-w * .6)} ${n1(-len * .26)} ${n1(-w * .45)} ${n1(-len * .38)}M${n1(w * .95)} ${n1(-len * .22)}Q${n1(w * .6)} ${n1(-len * .26)} ${n1(w * .45)} ${n1(-len * .38)}" stroke="${cd}" stroke-width="${n1(w * .05)}" fill="none" opacity=".5"/>`;
  s += `<circle cx="${n1(-w * .62)}" cy="${n1(-len * .4)}" r="${n1(w * .09)}" fill="#2a2018"/><circle cx="${n1(w * .62)}" cy="${n1(-len * .4)}" r="${n1(w * .09)}" fill="#2a2018"/>`;
  s += `<path d="M${n1(-w * .35)} ${n1(-len * .49)}q${n1(-w * .3)} ${n1(-len * .02)} ${n1(-w * .45)} ${n1(len * .04)}M${n1(w * .35)} ${n1(-len * .49)}q${n1(w * .3)} ${n1(-len * .02)} ${n1(w * .45)} ${n1(len * .04)}" stroke="${cd}" stroke-width="${n1(w * .04)}" fill="none" opacity=".6"/>`;
  return s + '</g>';
}
// 蓮の葉にすわるカエル（横向き）
function frog(x, y, s, c = '#5f9a3a', flip = false) {
  track(x - s * 1.4, y - s * 1.3); track(x + s * 1.4, y);
  const cd = dark(c, .18), cl = light(c, .25);
  let f = `<g transform="translate(${n1(x)} ${n1(y)}) scale(${flip ? -1 : 1} 1)">`;
  f += `<ellipse cx="${n1(s * .1)}" cy="${n1(-s * .45)}" rx="${n1(s * .95)}" ry="${n1(s * .5)}" fill="${c}"/>`;
  f += `<ellipse cx="${n1(s * .75)}" cy="${n1(-s * .35)}" rx="${n1(s * .48)}" ry="${n1(s * .36)}" fill="${cd}"/>`; // 後ろ足
  f += `<path d="M${n1(s * .9)} ${n1(-s * .1)}L${n1(s * 1.35)} 0M${n1(s * .9)} ${n1(-s * .1)}L${n1(s * 1.2)} ${n1(s * .06)}" stroke="${cd}" stroke-width="${n1(s * .1)}" stroke-linecap="round"/>`;
  f += `<ellipse cx="${n1(-s * .55)}" cy="${n1(-s * .75)}" rx="${n1(s * .55)}" ry="${n1(s * .38)}" fill="${c}"/>`; // 頭
  f += `<ellipse cx="${n1(-s * .1)}" cy="${n1(-s * .25)}" rx="${n1(s * .7)}" ry="${n1(s * .2)}" fill="${cl}" opacity=".7"/>`; // おなか
  f += `<circle cx="${n1(-s * .55)}" cy="${n1(-s * 1.05)}" r="${n1(s * .2)}" fill="${c}"/><circle cx="${n1(-s * .55)}" cy="${n1(-s * 1.05)}" r="${n1(s * .13)}" fill="#f2e7a0"/><circle cx="${n1(-s * .58)}" cy="${n1(-s * 1.06)}" r="${n1(s * .07)}" fill="#1a1a14"/>`;
  f += `<path d="M${n1(-s * .3)} ${n1(-s * .2)}L${n1(-s * .5)} 0M${n1(-s * .3)} ${n1(-s * .2)}L${n1(-s * .2)} 0" stroke="${cd}" stroke-width="${n1(s * .09)}" stroke-linecap="round"/>`; // 前足
  return f + '</g>';
}
// トンボ（上から見た形。羽は薄く）
function dragonfly(x, y, s, a = R(-40, 40)) {
  track(x, y, s * 1.6);
  const wing = (dx, dy, rot, l) => `<ellipse cx="${n1(dx)}" cy="${n1(dy)}" rx="${n1(l)}" ry="${n1(s * .18)}" transform="rotate(${rot} ${n1(dx)} ${n1(dy)})" fill="#eef5f6" opacity=".6"/>`;
  let d = `<g transform="translate(${n1(x)} ${n1(y)}) rotate(${n1(a)})">`;
  d += wing(-s * .7, -s * .15, -22, s * .75) + wing(s * .7, -s * .15, 22, s * .75) + wing(-s * .65, s * .2, -8, s * .65) + wing(s * .65, s * .2, 8, s * .65);
  d += `<path d="M0 ${n1(-s * .35)}L0 ${n1(s * 1.5)}" stroke="#5a8f9a" stroke-width="${n1(s * .13)}" stroke-linecap="round"/><ellipse cx="0" cy="${n1(-s * .2)}" rx="${n1(s * .16)}" ry="${n1(s * .3)}" fill="#4a7a86"/><circle cx="0" cy="${n1(-s * .55)}" r="${n1(s * .17)}" fill="#3f6b78"/>`;
  return d + '</g>';
}
// つるの先にとまるカワセミ（横向き。flip で右向き）
function kingfisher(x, y, s, flip = false) {
  track(x - s * 1.6, y - s * 1.3); track(x + s * 1.6, y + s * .4);
  let k = `<g transform="translate(${n1(x)} ${n1(y)}) scale(${flip ? -1 : 1} 1)">`;
  k += `<path d="M${n1(s * .5)} ${n1(-s * .25)}L${n1(s * 1.45)} ${n1(-s * .05)}L${n1(s * 1.4)} ${n1(s * .3)}L${n1(s * .55)} ${n1(s * .2)}Z" fill="#3f7a95"/>`; // 尾
  k += `<ellipse cx="0" cy="0" rx="${n1(s * .8)}" ry="${n1(s * .55)}" fill="#d9944e"/>`; // 胸（橙）
  k += `<path d="M${n1(-s * .5)} ${n1(-s * .3)}Q0 ${n1(-s * .75)} ${n1(s * .8)} ${n1(-s * .1)}Q${n1(s * .3)} ${n1(s * .1)} ${n1(-s * .3)} ${n1(-s * .05)}Z" fill="#4f97b8"/>`; // 背と羽
  k += `<circle cx="${n1(-s * .55)}" cy="${n1(-s * .5)}" r="${n1(s * .42)}" fill="#4f97b8"/><ellipse cx="${n1(-s * .5)}" cy="${n1(-s * .32)}" rx="${n1(s * .28)}" ry="${n1(s * .16)}" fill="#f4f1e6"/>`; // 頭
  k += `<path d="M${n1(-s * .85)} ${n1(-s * .5)}L${n1(-s * 1.7)} ${n1(-s * .35)}L${n1(-s * .85)} ${n1(-s * .32)}Z" fill="#3a3a40"/>`; // くちばし
  k += `<circle cx="${n1(-s * .66)}" cy="${n1(-s * .58)}" r="${n1(s * .07)}" fill="#111"/>`;
  k += `<path d="M${n1(-s * .1)} ${n1(s * .5)}L${n1(-s * .15)} ${n1(s * .85)}M${n1(s * .15)} ${n1(s * .5)}L${n1(s * .12)} ${n1(s * .85)}" stroke="#b8764a" stroke-width="${n1(s * .08)}"/>`;
  return k + '</g>';
}
// 浅瀬に立つサギ（横向き、左を向く。h = 全体の高さ）
function heron(x, y, h, flip = false) {
  track(x - h * .5, y - h); track(x + h * .5, y);
  const c = '#c9d0d8', cd = '#8f9aa8', cl = '#eef1f4';
  let s = `<g transform="translate(${n1(x)} ${n1(y)}) scale(${flip ? -1 : 1} 1)">`;
  s += `<path d="M${n1(-h * .04)} ${n1(-h * .42)}L${n1(-h * .02)} 0M${n1(h * .08)} ${n1(-h * .42)}L${n1(h * .12)} ${n1(-h * .2)}" stroke="#6b6a4a" stroke-width="${n1(h * .025)}" stroke-linecap="round"/>`; // 脚（1 本は曲げて）
  s += `<ellipse cx="${n1(h * .05)}" cy="${n1(-h * .5)}" rx="${n1(h * .27)}" ry="${n1(h * .15)}" fill="${c}"/>`; // 胴
  s += `<path d="M${n1(-h * .1)} ${n1(-h * .58)}Q${n1(h * .2)} ${n1(-h * .7)} ${n1(h * .34)} ${n1(-h * .45)}Q${n1(h * .15)} ${n1(-h * .42)} ${n1(-h * .1)} ${n1(-h * .58)}Z" fill="${cd}"/>`; // 翼
  s += `<path d="M${n1(-h * .18)} ${n1(-h * .55)}C${n1(-h * .4)} ${n1(-h * .6)} ${n1(-h * .1)} ${n1(-h * .8)} ${n1(-h * .2)} ${n1(-h * .93)}L${n1(-h * .1)} ${n1(-h * .95)}C${n1(-h * .02)} ${n1(-h * .78)} ${n1(-h * .28)} ${n1(-h * .68)} ${n1(-h * .1)} ${n1(-h * .58)}Z" fill="${cl}"/>`; // S 字の首
  s += `<ellipse cx="${n1(-h * .16)}" cy="${n1(-h * .95)}" rx="${n1(h * .09)}" ry="${n1(h * .06)}" fill="${cl}"/>`; // 頭
  s += `<path d="M${n1(-h * .22)} ${n1(-h * .95)}L${n1(-h * .48)} ${n1(-h * .92)}L${n1(-h * .22)} ${n1(-h * .91)}Z" fill="#c9a45a"/>`; // くちばし
  s += `<circle cx="${n1(-h * .17)}" cy="${n1(-h * .965)}" r="${n1(h * .012)}" fill="#3a3a40"/>`;
  return s + '</g>';
}
// 水面から出た丸太で日なたぼっこするカメ
function turtleLog(x, y, len, tones) {
  track(x - len / 2, y - 4); track(x + len / 2, y + 1.5);
  const c = '#5c4027';
  let s = `<path d="M${n1(x - len / 2)} ${n1(y - 1.4)}Q${n1(x)} ${n1(y - 2.2)} ${n1(x + len / 2)} ${n1(y - 1.2)}L${n1(x + len / 2)} ${n1(y + .6)}Q${n1(x)} ${n1(y + 1.2)} ${n1(x - len / 2)} ${n1(y + .6)}Z" fill="${c}"/><path d="M${n1(x - len / 2)} ${n1(y + .2)}Q${n1(x)} ${n1(y + .5)} ${n1(x + len / 2)} ${n1(y)}L${n1(x + len / 2)} ${n1(y + .6)}Q${n1(x)} ${n1(y + 1.2)} ${n1(x - len / 2)} ${n1(y + .6)}Z" fill="${dark(c, .25)}"/>`;
  s += `<ellipse cx="${n1(x + len / 2)}" cy="${n1(y - .3)}" rx=".5" ry="1.1" fill="#c9a97e"/>`;
  s += ripple(x, y + 1.4, len * .5, '#e9f0d0', .25);
  return s;
}
// アメンボ：水面の小さな点と、足もとの丸いくぼみ
function striders(x0, x1, y0, y1, n) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = R(x0, x1), y = R(y0, y1);
    s += `<path d="M${n1(x)} ${n1(y)}l-1.4 -.5M${n1(x)} ${n1(y)}l1.4 -.5M${n1(x)} ${n1(y)}l-1.2 .6M${n1(x)} ${n1(y)}l1.2 .6" stroke="#4f6a3a" stroke-width=".14" opacity=".6"/><ellipse cx="${n1(x)}" cy="${n1(y)}" rx=".35" ry=".16" fill="#3a5a2a" opacity=".8"/>`;
    for (const [dx, dy] of [[-1.4, -.5], [1.4, -.5], [-1.2, .6], [1.2, .6]]) s += `<ellipse cx="${n1(x + dx)}" cy="${n1(y + dy)}" rx=".5" ry=".2" fill="none" stroke="#e9f0d0" stroke-width=".12" opacity=".5"/>`;
  }
  return s;
}

// ---------- 夕暮れの浜の描き込み：砂丘の柵、小舟、焚き火、カニ、カモメ、潮だまり、遠くの桟橋と帆船 ----------
// 砂丘の柵：細い杭に横木 2 本（ところどころ傾く）
function duneFence(x0, x1, y, h, c = '#a8916e') {
  track(x0, y - h); track(x1, y + .5);
  let s = '';
  const xs = []; for (let x = x0; x <= x1; x += R(2.2, 3.2)) xs.push([x, h * R(.8, 1.05), R(-5, 5)]);
  for (const [x, hh, a] of xs) s += `<path d="M${n1(x - .25)} ${n1(y + .3)}L${n1(x - .2)} ${n1(y - hh)}L${n1(x + .2)} ${n1(y - hh)}L${n1(x + .25)} ${n1(y + .3)}Z" fill="${c}" transform="rotate(${a} ${n1(x)} ${n1(y)})"/><path d="M${n1(x - .2)} ${n1(y - hh)}L${n1(x + .2)} ${n1(y - hh)}" stroke="${dark(c, .2)}" stroke-width=".2" transform="rotate(${a} ${n1(x)} ${n1(y)})"/>`;
  for (const t of [.35, .7]) s += `<path d="M${n1(x0 - .5)} ${n1(y - h * t)}L${n1(x1 + .5)} ${n1(y - h * t + R(-.3, .3))}" stroke="${dark(c, .12)}" stroke-width=".28" stroke-linecap="round"/>`;
  s += `<path d="M${n1(x0)} ${n1(y + .5)}Q${n1((x0 + x1) / 2)} ${n1(y + 1.4)} ${n1(x1)} ${n1(y + .5)}" stroke="#8b7a5c" stroke-width=".4" fill="none" opacity=".25"/>`;
  return s;
}
// 砂に引き上げた小舟（横向き）。中にオールと丸めたロープ
function rowboat(x, y, len, c = '#d9a06a') {
  track(x - len * .55, y - len * .3); track(x + len * .55, y + 1.5);
  const h = len * .22, cd = dark(c, .22), cl = light(c, .15);
  let s = `<ellipse cx="${n1(x + len * .06)}" cy="${n1(y + .5)}" rx="${n1(len * .5)}" ry="${n1(h * .2)}" fill="#8a6a4a" opacity=".35"/>`;
  s += `<path d="M${n1(x - len * .5)} ${n1(y - h)}Q${n1(x - len * .42)} ${n1(y + .2)} ${n1(x - len * .3)} ${n1(y + .4)}L${n1(x + len * .3)} ${n1(y + .4)}Q${n1(x + len * .48)} ${n1(y + .2)} ${n1(x + len * .52)} ${n1(y - h * 1.15)}L${n1(x + len * .5)} ${n1(y - h * 1.15)}Q${n1(x)} ${n1(y - h * .55)} ${n1(x - len * .5)} ${n1(y - h)}Z" fill="${c}"/>`;
  s += `<path d="M${n1(x - len * .5)} ${n1(y - h)}Q${n1(x)} ${n1(y - h * .55)} ${n1(x + len * .5)} ${n1(y - h * 1.15)}Q${n1(x)} ${n1(y - h * .85)} ${n1(x - len * .5)} ${n1(y - h)}Z" fill="#7a5a3a"/>`;
  s += `<path d="M${n1(x - len * .46)} ${n1(y - h * .55)}Q${n1(x)} ${n1(y - h * .1)} ${n1(x + len * .5)} ${n1(y - h * .7)}" stroke="${cd}" stroke-width=".25" fill="none"/><path d="M${n1(x - len * .42)} ${n1(y - h * .2)}Q${n1(x)} ${n1(y + h * .15)} ${n1(x + len * .45)} ${n1(y - h * .3)}" stroke="${cd}" stroke-width=".25" fill="none"/>`;
  s += `<path d="M${n1(x - len * .5)} ${n1(y - h)}Q${n1(x)} ${n1(y - h * .72)} ${n1(x + len * .5)} ${n1(y - h * 1.15)}" stroke="${cl}" stroke-width=".3" fill="none"/>`;
  s += `<path d="M${n1(x - len * .1)} ${n1(y - h * .6)}L${n1(x + len * .36)} ${n1(y - h * 1.6)}" stroke="#b58a5a" stroke-width=".35" stroke-linecap="round"/><path d="M${n1(x + len * .3)} ${n1(y - h * 1.5)}l${n1(len * .1)} ${n1(-h * .25)}l${n1(len * .06)} ${n1(h * .2)}Z" fill="#c9a276"/>`;
  s += `<circle cx="${n1(x + len * .12)}" cy="${n1(y - h * .72)}" r="${n1(h * .22)}" fill="none" stroke="#e6d3a6" stroke-width=".28"/><circle cx="${n1(x + len * .12)}" cy="${n1(y - h * .72)}" r="${n1(h * .1)}" fill="none" stroke="#e6d3a6" stroke-width=".22"/>`;
  return s;
}
// 焚き火：石で囲んだ薪と火、まわりの砂に落ちる暖かい光
function campfire(x, y, s) {
  track(x - s * 1.6, y - s * 2.2); track(x + s * 1.6, y + s * .6);
  let f = rglow(x, y - s * .4, s * 3.2, '#ffb060', .4);
  for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, rx = x + Math.cos(a) * s * 1.25, ry = y + Math.sin(a) * s * .45; f += `<ellipse cx="${n1(rx)}" cy="${n1(ry)}" rx="${n1(s * .32)}" ry="${n1(s * .2)}" fill="${pick(['#6f6a6a', '#7c746c', '#5f5f66'])}"/>`; }
  f += `<path d="M${n1(x - s * .9)} ${n1(y - s * .05)}l${n1(s * 1.8)} ${n1(-s * .3)}" stroke="#5c4027" stroke-width="${n1(s * .22)}" stroke-linecap="round"/><path d="M${n1(x - s * .8)} ${n1(y - s * .35)}l${n1(s * 1.7)} ${n1(s * .25)}" stroke="#6b4a2e" stroke-width="${n1(s * .22)}" stroke-linecap="round"/>`;
  f += `<path d="M${n1(x - s * .55)} ${n1(y - s * .2)}Q${n1(x - s * .5)} ${n1(y - s * 1.1)} ${n1(x)} ${n1(y - s * 1.9)}Q${n1(x + s * .55)} ${n1(y - s * 1)} ${n1(x + s * .55)} ${n1(y - s * .2)}Z" fill="#e8874a"/><path d="M${n1(x - s * .3)} ${n1(y - s * .2)}Q${n1(x - s * .28)} ${n1(y - s * .85)} ${n1(x + s * .05)} ${n1(y - s * 1.3)}Q${n1(x + s * .32)} ${n1(y - s * .8)} ${n1(x + s * .3)} ${n1(y - s * .2)}Z" fill="#f2c56a"/>`;
  for (let k = 0; k < 5; k++) f += `<circle cx="${n1(x + R(-s * .5, s * .6))}" cy="${n1(y - s * R(1.8, 2.6))}" r="${n1(s * R(.05, .09))}" fill="#ffd36a" opacity=".85"/>`;
  return f;
}
// 浜の小物（作品の台の手前の砂に置く）：ヒトデ（5 本の腕、まん中が明るい）
function beachStar(x, y, r, rot, c) {
  const pts = Array.from({ length: 10 }, (_, i) => { const a = (i * 36 + rot - 90) * Math.PI / 180, rr = i % 2 ? r * .42 : r; return `${n2(x + Math.cos(a) * rr)},${n2(y + Math.sin(a) * rr * .62)}`; }).join(' ');
  return `<ellipse cx="${n2(x + r * .15)}" cy="${n2(y + r * .3)}" rx="${n2(r * 1.05)}" ry="${n2(r * .32)}" fill="#7d6348" opacity=".18"/><polygon points="${pts}" fill="${c}" stroke="${c}" stroke-width="${n2(r * .22)}" stroke-linejoin="round"/>`
    + `<ellipse cx="${n2(x - r * .08)}" cy="${n2(y - r * .08)}" rx="${n2(r * .32)}" ry="${n2(r * .22)}" fill="#f6c39a" opacity=".55"/>`;
}
// ホタテの貝殻：扇の形に、放射のすじを濃淡の細い面で（線は引かない）
function scallop(x, y, w, rot, c) {
  const ribs = [-.55, -.18, .18, .55].map((t) => `<path d="M${n2(x)} ${n2(y + w * .25)}L${n2(x + t * w * 1.05 - w * .07)} ${n2(y - w * .55 + Math.abs(t) * w * .35)}L${n2(x + t * w * 1.05 + w * .07)} ${n2(y - w * .55 + Math.abs(t) * w * .35)}Z" fill="#000" opacity=".07"/>`).join('');
  return `<g transform="rotate(${n1(rot)} ${n2(x)} ${n2(y)})"><ellipse cx="${n2(x + w * .2)}" cy="${n2(y + w * .32)}" rx="${n2(w * 1.05)}" ry="${n2(w * .25)}" fill="#7d6348" opacity=".18"/>`
    + `<path d="M${n2(x - w)} ${n2(y)}Q${n2(x - w * .9)} ${n2(y - w * .95)} ${n2(x)} ${n2(y - w * 1.02)}Q${n2(x + w * .9)} ${n2(y - w * .95)} ${n2(x + w)} ${n2(y)}Q${n2(x)} ${n2(y + w * .45)} ${n2(x - w)} ${n2(y)}Z" fill="${c}"/>${ribs}`
    + `<path d="M${n2(x - w * .28)} ${n2(y + w * .1)}H${n2(x + w * .28)}L${n2(x + w * .2)} ${n2(y + w * .38)}H${n2(x - w * .2)}Z" fill="${c}"/><path d="M${n2(x - w * .7)} ${n2(y - w * .45)}Q${n2(x - w * .3)} ${n2(y - w * .88)} ${n2(x + w * .1)} ${n2(y - w * .9)}Q${n2(x - w * .3)} ${n2(y - w * .7)} ${n2(x - w * .7)} ${n2(y - w * .45)}Z" fill="#fff" opacity=".35"/></g>`;
}
// シーグラス：波に磨かれた、すりガラスの小さなかけら
function seaGlass(x, y, w, c) {
  return `<ellipse cx="${n2(x + w * .2)}" cy="${n2(y + w * .35)}" rx="${n2(w * 1.1)}" ry="${n2(w * .3)}" fill="#7d6348" opacity=".16"/><path d="M${n2(x - w)} ${n2(y)}Q${n2(x - w * .8)} ${n2(y - w * .7)} ${n2(x + w * .1)} ${n2(y - w * .6)}Q${n2(x + w * 1.1)} ${n2(y - w * .4)} ${n2(x + w)} ${n2(y + w * .1)}Q${n2(x + w * .2)} ${n2(y + w * .5)} ${n2(x - w)} ${n2(y)}Z" fill="${c}" opacity=".88"/>`
    + `<ellipse cx="${n2(x - w * .3)}" cy="${n2(y - w * .35)}" rx="${n2(w * .35)}" ry="${n2(w * .14)}" fill="#fff" opacity=".55"/>`;
}
// カニ（上から見た形）
function crab(x, y, s, c = '#e07a5a') {
  track(x - s * 1.5, y - s * .9); track(x + s * 1.5, y + s * .6);
  const cd = dark(c, .2);
  let b = '';
  for (const d of [-1, 1]) {
    for (const [dx, dy] of [[1.1, -.3], [1.25, .05], [1.15, .4]]) b += `<path d="M${n1(x + d * s * .5)} ${n1(y + dy * s * .5)}Q${n1(x + d * s * dx)} ${n1(y + dy * s)} ${n1(x + d * s * (dx + .25))} ${n1(y + dy * s + s * .35)}" stroke="${cd}" stroke-width="${n1(s * .12)}" fill="none" stroke-linecap="round"/>`;
    b += `<path d="M${n1(x + d * s * .5)} ${n1(y - s * .25)}Q${n1(x + d * s * 1.1)} ${n1(y - s * .8)} ${n1(x + d * s * 1.35)} ${n1(y - s * .55)}" stroke="${cd}" stroke-width="${n1(s * .14)}" fill="none" stroke-linecap="round"/><path d="M${n1(x + d * s * 1.35)} ${n1(y - s * .55)}l${n1(d * s * .2)} ${n1(-s * .3)}l${n1(-d * s * .35)} ${n1(s * .05)}Z" fill="${cd}"/>`;
  }
  b += `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(s * .65)}" ry="${n1(s * .45)}" fill="${c}"/><ellipse cx="${n1(x - s * .12)}" cy="${n1(y - s * .12)}" rx="${n1(s * .35)}" ry="${n1(s * .18)}" fill="${light(c, .2)}" opacity=".7"/>`;
  for (const d of [-1, 1]) b += `<circle cx="${n1(x + d * s * .25)}" cy="${n1(y - s * .5)}" r="${n1(s * .1)}" fill="#1a1a14"/><path d="M${n1(x + d * s * .25)} ${n1(y - s * .45)}L${n1(x + d * s * .22)} ${n1(y - s * .25)}" stroke="${cd}" stroke-width="${n1(s * .06)}"/>`;
  return b;
}
// 砂に立つカモメ（横向き）
function gull(x, y, s, flip = false) {
  track(x - s * 1.4, y - s * 1.4); track(x + s * 1.4, y);
  let g2 = `<g transform="translate(${n1(x)} ${n1(y)}) scale(${flip ? -1 : 1} 1)">`;
  g2 += `<path d="M${n1(-s * .1)} ${n1(-s * .35)}L${n1(-s * .15)} 0M${n1(s * .15)} ${n1(-s * .35)}L${n1(s * .2)} 0" stroke="#c9a45a" stroke-width="${n1(s * .07)}"/>`;
  g2 += `<ellipse cx="0" cy="${n1(-s * .55)}" rx="${n1(s * .62)}" ry="${n1(s * .32)}" fill="#f4f2ec"/>`;
  g2 += `<path d="M${n1(-s * .3)} ${n1(-s * .75)}Q${n1(s * .3)} ${n1(-s * .95)} ${n1(s * .9)} ${n1(-s * .55)}Q${n1(s * .3)} ${n1(-s * .5)} ${n1(-s * .3)} ${n1(-s * .6)}Z" fill="#b9bcc2"/><path d="M${n1(s * .55)} ${n1(-s * .55)}L${n1(s * 1.05)} ${n1(-s * .5)}L${n1(s * .6)} ${n1(-s * .38)}Z" fill="#2a2a30"/>`;
  g2 += `<path d="M${n1(-s * .45)} ${n1(-s * .65)}Q${n1(-s * .6)} ${n1(-s * 1.1)} ${n1(-s * .55)} ${n1(-s * 1.25)}" stroke="#f4f2ec" stroke-width="${n1(s * .3)}" fill="none" stroke-linecap="round"/><circle cx="${n1(-s * .58)}" cy="${n1(-s * 1.25)}" r="${n1(s * .22)}" fill="#f4f2ec"/>`;
  g2 += `<path d="M${n1(-s * .78)} ${n1(-s * 1.25)}L${n1(-s * 1.25)} ${n1(-s * 1.15)}L${n1(-s * .78)} ${n1(-s * 1.12)}Z" fill="#c9a45a"/><circle cx="${n1(-s * .62)}" cy="${n1(-s * 1.3)}" r="${n1(s * .045)}" fill="#3a3a40"/>`;
  return g2 + '</g>';
}
// 潮だまり：夕焼けを映す浅い水（砂の上に）
function tidePool(x, y, w, sky = '#f3c69c') {
  const id = `tp${gid++}`;
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky}"/><stop offset="1" stop-color="#9ac4c0"/></linearGradient></defs><ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(w)}" ry="${n1(w * .22)}" fill="#b8a27e" opacity=".5"/><ellipse cx="${n1(x)}" cy="${n1(y - .2)}" rx="${n1(w * .94)}" ry="${n1(w * .19)}" fill="url(#${id})" opacity=".9"/><path d="M${n1(x - w * .5)} ${n1(y - .3)}h${n1(w * .3)}M${n1(x + w * .05)} ${n1(y - .1)}h${n1(w * .35)}" stroke="#fff6e6" stroke-width=".14" opacity=".7"/>`;
}
// 遠くの桟橋（影絵。杭と、先に小さな灯り）と帆船
function pierFar(x, y, len, c = '#6f6a7a') {
  let s = `<path d="M${n1(x)} ${n1(y - 1.2)}H${n1(x + len)}V${n1(y - .7)}H${n1(x)}Z" fill="${c}"/>`;
  for (let px = x + 1; px < x + len; px += 2.4) s += `<path d="M${n1(px)} ${n1(y - .7)}V${n1(y + .6)}" stroke="${c}" stroke-width=".3"/>`;
  s += `<path d="M${n1(x + len - 1.5)} ${n1(y - 1.2)}V${n1(y - 3.6)}" stroke="${c}" stroke-width=".3"/><circle cx="${n1(x + len - 1.5)}" cy="${n1(y - 3.7)}" r=".35" fill="#ffd9a0"/>` + rglow(x + len - 1.5, y - 3.7, 1.6, '#ffd9a0', .5);
  return s;
}
function sailboat(x, y, h, c = '#7a7488') {
  return `<path d="M${n1(x - h * .5)} ${n1(y)}L${n1(x + h * .5)} ${n1(y)}L${n1(x + h * .4)} ${n1(y + h * .18)}L${n1(x - h * .4)} ${n1(y + h * .18)}Z" fill="${c}"/><path d="M${n1(x + h * .05)} ${n1(y - .1)}L${n1(x + h * .05)} ${n1(y - h)}L${n1(x + h * .45)} ${n1(y - .1)}Z" fill="#f3e6d6" opacity=".9"/><path d="M${n1(x - h * .05)} ${n1(y - .1)}L${n1(x - h * .05)} ${n1(y - h * .85)}L${n1(x - h * .38)} ${n1(y - .1)}Z" fill="#e6d2bd" opacity=".9"/>`;
}

// ---------- 夕凪の浜の遠景（作品の山の描き方：光の面と影の面を平らな色で塗り分け、麓は木々の粒で埋める） ----------
// 1 つの峰：稜線で左右の面に分け、太陽の側の面を明るく。面の中に小さな面を重ねて岩の起伏を出す。上に雪、麓に木の粒
function facetPeak(x, base, w, h, g, sunX, c) {
  const a = .38 + g() * .24, L = [x - w * a, base], Rr = [x + w * (1 - a), base], P = [x + w * (g() - .5) * .08, base - h];
  const kink = (A, B, t, o) => [A[0] + (B[0] - A[0]) * t + o, A[1] + (B[1] - A[1]) * t - h * (.02 + g() * .06)];
  const l1 = kink(P, L, .34 + g() * .1, -w * .02), l2 = kink(P, L, .68 + g() * .1, -w * .03), r1 = kink(P, Rr, .3 + g() * .1, w * .02), r2 = kink(P, Rr, .66 + g() * .1, w * .03);
  const S = [x + w * (g() * .3 - .08), base], M = [P[0] + (S[0] - P[0]) * .45 + w * .04, P[1] + (S[1] - P[1]) * .45];
  const litLeft = sunX < x, [cl, cr] = litLeft ? [c.lit, c.shade] : [c.shade, c.lit];
  const pt = (q) => `${n1(q[0])} ${n1(q[1])}`, poly = (pts, f, o = 1) => `<path d="M${pts.map(pt).join('L')}Z" fill="${f}"${o < 1 ? ` opacity="${o}"` : ''}/>`;
  track(L[0], P[1]); track(Rr[0], base);
  let s = poly([P, l1, l2, L, S, M], cl) + poly([P, M, S, Rr, r2, r1], cr);
  // 面の中の小さな面（明るい面には少し暗い面、暗い面には少し明るい面）
  s += poly([l1, [l1[0] + w * .1, l1[1] + h * .18], [l2[0] + w * .14, l2[1] + h * .1], l2], mixC(cl, cr, .28));
  s += poly([r1, [r1[0] - w * .08, r1[1] + h * .2], [r2[0] - w * .12, r2[1] + h * .12], r2], mixC(cr, cl, .22));
  s += poly([M, [M[0] + w * .06, M[1] + h * .2], S], mixC(cr, cl, .12));
  if (c.snowLit && h > c.snowMin) {
    // 雪：頂から肩までを覆い、下の縁はぎざぎざ。稜線で光と影に分ける
    const t = .3 + g() * .12, sl = [P[0] + (l1[0] - P[0]) * (t / .34) * .9, P[1] + (l1[1] - P[1]) * (t / .34) * .9], sr = [P[0] + (r1[0] - P[0]) * (t / .3) * .9, P[1] + (r1[1] - P[1]) * (t / .3) * .9];
    const sm = [P[0] + (M[0] - P[0]) * .62, P[1] + (M[1] - P[1]) * .62];
    const jag = (A, B, n) => Array.from({ length: n }, (_, i) => { const u = (i + 1) / (n + 1); return [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u + (i % 2 ? h * (.04 + g() * .05) : -h * g() * .03)]; });
    const [sL, sR] = litLeft ? [c.snowLit, c.snowShade] : [c.snowShade, c.snowLit];
    s += poly([P, sl, ...jag(sl, sm, 3), sm], sL) + poly([P, sm, ...jag(sm, sr, 3), sr], sR);
  }
  // 麓の木々：面の色より少し暗い／明るい小さな粒（遠くなので輪郭は描かない）
  if (c.trees) {
    const n = Math.round(w * h * .06);
    for (let i = 0; i < n; i++) {
      const u = g(), yy = base - h * (.02 + Math.pow(g(), 1.6) * .34), half = (base - yy) / h, xl = x - w * a * (1 - half * .9), xr = x + w * (1 - a) * (1 - half * .9), xx = xl + (xr - xl) * u, r = w * (.012 + g() * .014);
      s += `<ellipse cx="${n1(xx)}" cy="${n1(yy)}" rx="${n2(r)}" ry="${n2(r * 1.25)}" fill="${c.trees[Math.floor(g() * c.trees.length)]}" opacity="${n2(.2 + g() * .25)}"/>`;
    }
  }
  return s;
}
function facetRange(x0, x1, base, hMin, hMax, wMin, wMax, g, sunX, c) {
  const peaks = [];
  for (let x = x0 + g() * wMin * .5; x < x1; x += wMin * (.4 + g() * .55)) { const k = Math.pow(g(), 1.8); peaks.push([x, wMin + (wMax - wMin) * (.3 + .7 * k) * (.8 + g() * .4), hMin + (hMax - hMin) * k]); }
  // 低い峰を手前に（高い峰の麓に低い峰が重なる）
  return peaks.sort((p, q) => q[2] - p[2]).map(([x, w, h]) => facetPeak(x, base, w, h, g, sunX, c)).join('');
}
// かすむ島：低く丸い背に、光と影の 2 面
function hazeIsland(x, base, w, h, g, sunX, c) {
  const p = [[x - w / 2, base]];
  for (let i = 1; i < 6; i++) { const u = i / 6; p.push([x - w / 2 + w * u, base - h * Math.sin(Math.PI * Math.pow(u, .9)) * (.75 + g() * .35)]); }
  p.push([x + w / 2, base]);
  const top = p.reduce((m, q) => q[1] < m[1] ? q : m), d = `M${p.map((q) => `${n1(q[0])} ${n1(q[1])}`).join('L')}Z`;
  const sh = sunX < x ? `M${n1(top[0])} ${n1(top[1])}${p.filter((q) => q[0] > top[0]).map((q) => `L${n1(q[0])} ${n1(q[1])}`).join('')}L${n1(top[0] + w * .06)} ${n1(base)}Z` : `M${n1(top[0])} ${n1(top[1])}${p.filter((q) => q[0] < top[0]).reverse().map((q) => `L${n1(q[0])} ${n1(q[1])}`).join('')}L${n1(top[0] - w * .06)} ${n1(base)}Z`;
  track(x - w / 2, base - h); track(x + w / 2, base);
  let s = `<path d="${d}" fill="${c.lit}"/><path d="${sh}" fill="${c.shade}"/>`;
  for (let i = 0; i < w * h * .12; i++) { const xx = x - w * .42 + g() * w * .84, yy = base - g() * h * .55; s += `<circle cx="${n1(xx)}" cy="${n1(yy)}" r="${n2(.18 + g() * .22)}" fill="${c.tree}" opacity="${n2(.35 + g() * .3)}"/>`; }
  return s;
}
// 遠くのヤシ：細い幹と、垂れた葉を平らな形で
function farPalm(x, y, h, lean, c, g) {
  const tx = x + lean * h * .35, ty = y - h;
  let s = `<path d="M${n1(x - h * .035)} ${n1(y)}Q${n1(x + lean * h * .05)} ${n1(y - h * .55)} ${n1(tx - h * .02)} ${n1(ty)}L${n1(tx + h * .02)} ${n1(ty)}Q${n1(x + lean * h * .05 + h * .05)} ${n1(y - h * .55)} ${n1(x + h * .035)} ${n1(y)}Z" fill="${c}"/>`;
  for (let i = 0; i < 7; i++) {
    const a = -170 + i * 28 + (g() - .5) * 14, L = h * (.38 + g() * .14), ex = tx + Math.cos(a * D) * L, ey = ty + Math.sin(a * D) * L * .55 + L * .32, mx = tx + Math.cos(a * D) * L * .5, my = ty + Math.sin(a * D) * L * .4 - L * .06, wv = h * .05;
    s += `<path d="M${n1(tx)} ${n1(ty)}Q${n1(mx)} ${n1(my - wv)} ${n1(ex)} ${n1(ey)}Q${n1(mx)} ${n1(my + wv)} ${n1(tx)} ${n1(ty + h * .02)}Z" fill="${c}"/>`;
  }
  track(tx - h * .5, ty - h * .1); track(tx + h * .5, y);
  return s;
}
// 岬：海に突き出た丘。先は低い岩の崖で海へ落ち、なだらかに登って丸い頂、奥へまた下って霞に消える。
// 上は木々のこんもりした丸みで縁どり、尾根にヤシ。水面にうっすら映る
function headland(tipX, base, len, hgt, dir, g, sunX, c) {
  const xAt = (u) => tipX + dir * len * u, sm = (e0, e1, v) => { const t = Math.max(0, Math.min(1, (v - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  const prof = (u) => .16 + .84 * sm(0, .42, u) - .62 * sm(.55, 1, u) + .04 * Math.sin(u * 23 + 1.7);
  const N = 28, crest = Array.from({ length: N + 1 }, (_, i) => { const u = .03 + i / N * .97; return [xAt(u), base - hgt * prof(u)]; });
  const foot = [[xAt(1), base + .3], [xAt(0), base + .3], [xAt(0), base - hgt * .08], [xAt(.015), base - hgt * .15]];
  const P = (q) => `${n1(q[0])} ${n1(q[1])}`, d = `M${[...foot, ...crest].map(P).join('L')}Z`;
  track(Math.min(xAt(0), xAt(1)), base - hgt * 1.1); track(Math.max(xAt(0), xAt(1)), base + 2.5);
  const topAt = (xx) => { for (let i = 1; i < crest.length; i++) { const [ax, ay] = crest[i - 1], [bx, by] = crest[i]; if ((xx - ax) * (xx - bx) <= 0) return ay + (by - ay) * ((xx - ax) / ((bx - ax) || 1)); } return base; };
  const [gid0, gdef] = lgrad([[0, c.lit], [.45, c.body], [1, c.low]]);
  let s = `<defs>${gdef}</defs>`;
  // 水面の映り込み（上下逆さの淡い影）
  s += `<path d="M${P([xAt(0), base + .3])}${crest.map((q) => `L${n1(q[0])} ${n1(base + .3 + (base - q[1]) * .2)}`).join('')}L${P([xAt(1), base + .3])}Z" fill="${c.refl}" opacity=".3"/>`;
  // 尾根のこんもりした木々（輪郭を丸く盛り上げる）
  let crown = '';
  for (let u = .05; u < .97; u += .018 + g() * .02) { const xx = xAt(u), yy = topAt(xx), r = hgt * (.045 + g() * .04) * (1.1 - u * .5); crown += `<circle cx="${n1(xx)}" cy="${n1(yy + r * .45)}" r="${n2(r)}"/>`; }
  s += `<g fill="url(#${gid0})">${crown}<path d="${d}"/></g>`;
  // 影の側（太陽と反対の斜面）を少し暗く：頂から先への斜面、または奥への斜面
  const peakU = .42, sunOnTip = (sunX < tipX) === (dir > 0);
  const shadeSeg = sunOnTip ? crest.filter((q) => (q[0] - xAt(peakU)) * dir > 0) : crest.filter((q) => (q[0] - xAt(peakU)) * dir <= 0);
  // 影の面の内側の縁は、頂から麓へ斜めに下ろす（縦の継ぎ目に見えないように）
  if (shadeSeg.length > 1) { const pk = sunOnTip ? shadeSeg[0] : shadeSeg[shadeSeg.length - 1], toward = sunOnTip ? -dir : dir, foot = [pk[0] + toward * len * .1, base + .3], far0 = sunOnTip ? shadeSeg[shadeSeg.length - 1] : shadeSeg[0];
    s += `<path d="M${shadeSeg.map(P).join('L')}L${P(sunOnTip ? [far0[0], base + .3] : foot)}L${P(sunOnTip ? foot : [far0[0], base + .3])}Z" fill="${c.shade}" opacity=".4"/>`; }
  // 木々の粒：明るい粒は上、暗い粒は下
  for (let i = 0; i < len * hgt * .22; i++) {
    const u = .04 + g() * .94, xx = xAt(u), ty = topAt(xx), depth = g(), yy = ty + (base - ty) * (.12 + depth * .8), r = (.22 + g() * .3) * (1.1 - depth * .4);
    s += `<circle cx="${n1(xx)}" cy="${n1(yy)}" r="${n2(r)}" fill="${depth < .35 ? c.trees[2] : c.trees[depth < .7 ? 1 : 0]}" opacity="${n2(.35 + g() * .3)}"/>`;
  }
  // 先の岩の崖（光の面と影の面）と、波が当たる白っぽい岩の裾
  const cliffW = len * .07;
  // 岩は低く、裾は木々に隠れるように（尖った三角に見えないように）
  s += `<path d="M${P([xAt(0), base + .3])}L${P([xAt(0), base - hgt * .06])}L${P([xAt(.02), base - hgt * .13])}L${P([xAt(.05), base - hgt * .12])}L${P([xAt(0) + dir * cliffW * 1.3, base + .3])}Z" fill="${sunOnTip ? c.rockLit : c.rock}" opacity=".85"/>`;
  // 斜面の小さな家（岬の先寄りの低いところに寄り添って）。夜は窓に灯りがともる（灯りは museum.js）
  if (c.houses && hgt > 4) {
    const n = Math.round(2 + hgt * .45 + g() * 2), cols = ['#eadfd2', '#dccbc2', '#e4d6c3', '#cdbdb8'], roofs = ['#b8715f', '#8d8196', '#6f8886', '#a8826a'];
    const hs = [];
    for (let i = 0; i < n; i++) { const u = .05 + g() * .38, xx = xAt(u), ty = topAt(xx), yy = ty + (base - ty) * (.45 + g() * .4); hs.push([xx, yy]); }
    hs.sort((a, b) => a[1] - b[1]).forEach(([xx, yy]) => {
      const w = .9 + g() * .7, h = .6 + g() * .35, rh = .35 + g() * .2, col = cols[Math.floor(g() * 4)], rf = roofs[Math.floor(g() * 4)];
      s += `<path d="M${n1(xx - w / 2)} ${n1(yy)}V${n1(yy - h)}H${n1(xx + w / 2)}V${n1(yy)}Z" fill="${col}"/><path d="M${n1(xx + w * .12)} ${n1(yy)}V${n1(yy - h)}H${n1(xx + w / 2)}V${n1(yy)}Z" fill="${mixC(col, '#8f8aa3', .28)}"/>`;
      s += `<path d="M${n1(xx - w / 2 - .12)} ${n1(yy - h)}L${n1(xx - w * .1)} ${n1(yy - h - rh)}H${n1(xx + w * .2)}L${n1(xx + w / 2 + .12)} ${n1(yy - h)}Z" fill="${rf}"/>`;
      c.houses.push([n2(xx - w * .18), n2(yy - h * .5)]);
    });
  }
  // 尾根のヤシ（頂の手前、先の側に寄せて）
  for (let i = 0, np = hgt > 6 ? 4 : hgt > 4 ? 2 : 0; i < np; i++) { const u = .12 + i * .07 + g() * .04, xx = xAt(u); s += farPalm(xx, topAt(xx) + .4, hgt * (.24 + g() * .12), dir * -(.2 + g() * .5), c.palm, g); }
  return s;
}
// 防波堤と、先の小さな灯台（灯りは museum.js がゆっくり明滅させる）
function breakwater(x0, x1, base, g, c) {
  const a = Math.min(x0, x1), b = Math.max(x0, x1), lx = x1;
  let s = `<path d="M${n1(a)} ${n1(base - .55)}H${n1(b)}V${n1(base + .35)}H${n1(a)}Z" fill="${c.face}"/><path d="M${n1(a)} ${n1(base - .55)}H${n1(b)}V${n1(base - .25)}H${n1(a)}Z" fill="${c.top}"/>`;
  for (let x = a + .8 + g(); x < b - 1; x += 1.4 + g() * 1.2) s += `<path d="M${n1(x)} ${n1(base - .25)}h${n2(.18)}V${n1(base + .35)}h${n2(-.18)}Z" fill="${c.gap}"/>`;
  s += `<path d="M${n1(a)} ${n1(base + .45)}H${n1(b)}V${n1(base + 1.1)}H${n1(a)}Z" fill="${c.face}" opacity=".22"/>`;
  // 灯台：白い塔（影の側はうす紫）、赤い帯と頭、灯室は暗く
  const H = 4.2, bw = .62, tw = .42, y0 = base - .55;
  s += `<path d="M${n1(lx - bw)} ${n1(y0)}L${n1(lx - tw)} ${n1(y0 - H)}H${n1(lx + tw)}L${n1(lx + bw)} ${n1(y0)}Z" fill="${c.tower}"/><path d="M${n1(lx)} ${n1(y0)}V${n1(y0 - H)}H${n1(lx + tw)}L${n1(lx + bw)} ${n1(y0)}Z" fill="${c.towerShade}"/>`;
  s += `<path d="M${n1(lx - bw * .9)} ${n1(y0 - H * .38)}L${n1(lx - bw * .82)} ${n1(y0 - H * .55)}H${n1(lx + bw * .82)}L${n1(lx + bw * .9)} ${n1(y0 - H * .38)}Z" fill="${c.red}"/>`;
  s += `<path d="M${n1(lx - tw - .18)} ${n1(y0 - H)}h${n2(tw * 2 + .36)}v.22h${n2(-(tw * 2 + .36))}Z" fill="${c.red}"/><path d="M${n1(lx - tw * .75)} ${n1(y0 - H - 1)}h${n2(tw * 1.5)}v1h${n2(-tw * 1.5)}Z" fill="${c.lamp}"/><path d="M${n1(lx - tw)} ${n1(y0 - H - 1)}L${n1(lx)} ${n1(y0 - H - 1.6)}L${n1(lx + tw)} ${n1(y0 - H - 1)}Z" fill="${c.red}"/>`;
  track(a, y0 - H - 1.6); track(b, base + 1.1);
  return { svg: s, light: [lx, y0 - H - .5] };
}

// ---------- 海辺の部品（夕凪の浜・夜の海辺の街） ----------
// ヤシの葉 1 枚：垂れ下がる葉軸に、小葉が重力で下向きに垂れる
function frond(x, y, len, ang, c, hi, { droop = 1, n = 18 } = {}) {
  let s = '', px = x, py = y, dir = ang;
  const step = len / n, pts = [[x, y, ang]];
  for (let i = 0; i < n; i++) { const toward = Math.sin(dir * D) >= 0 ? 1 : -1; dir += toward * 3.2 * droop; px += Math.sin(dir * D) * step; py -= Math.cos(dir * D) * step; pts.push([px, py, dir]); }
  track(x, y, 1); track(px, py, len * .3);
  const leafs = [], back = [];
  for (let i = 2; i < n; i++) {
    const [lx, ly, ld] = pts[i], t = i / n, L = len * .3 * Math.sin(Math.PI * Math.min(.95, t * .9 + .08));
    for (const side of [-1, 1]) {
      let a = ld + side * R(62, 84);
      const down = 180 * Math.sign(Math.sin(a * D) || 1);
      a = a + (down - a) * .22;
      (side < 0 ? back : leafs).push(lance(lx, ly, L, L * .1, a + R(-5, 5), side < 0 ? c : hi, { half: false }));
    }
  }
  const spine = `<path d="M${pts.map((p) => `${n1(p[0])} ${n1(p[1])}`).join('L')}" stroke="${dark(c, .15)}" stroke-width="${n1(Math.max(.18, len * .012))}" fill="none" stroke-linecap="round"/>`;
  return back.join('') + spine + leafs.join('');
}
function palmCrown(x, y, len, c, hi, { n = 9 } = {}) {
  let s = '';
  for (let i = 0; i < n; i++) { const a = -150 + 300 * i / (n - 1) + R(-10, 10); s += frond(x, y, len * R(.8, 1.05), a, i % 2 ? c : dark(c, .1), hi, { droop: R(.8, 1.3), n: 13 }); }
  for (let k = 0; k < 3; k++) s += `<circle cx="${n1(x + R(-1, 1))}" cy="${n1(y + R(.3, 1.4))}" r="${n1(len * .035)}" fill="${dark(c, .35)}"/>`;
  return s;
}
function palm(x, base, h, lean, trunkC, c, hi) {
  const tx = x + lean, ty = base - h, w0 = 2.1, w1 = 1.2;
  track(x - w0, base); track(tx, ty);
  const cx = x + lean * .15, cy = base - h * .55;
  let s = `<path d="M${n1(x - w0 / 2)} ${n1(base)}Q${n1(cx - w0 * .45)} ${n1(cy)} ${n1(tx - w1 / 2)} ${n1(ty)}L${n1(tx + w1 / 2)} ${n1(ty)}Q${n1(cx + w0 * .45)} ${n1(cy)} ${n1(x + w0 / 2)} ${n1(base)}Z" fill="${trunkC}"/>`;
  s += `<path d="M${n1(x + w0 * .1)} ${n1(base)}Q${n1(cx + w0 * .15)} ${n1(cy)} ${n1(tx + w1 * .1)} ${n1(ty)}L${n1(tx + w1 / 2)} ${n1(ty)}Q${n1(cx + w0 * .45)} ${n1(cy)} ${n1(x + w0 / 2)} ${n1(base)}Z" fill="${dark(trunkC, .25)}"/>`;
  for (let t = .06; t < .96; t += .045) {
    const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * cx + t * t * tx, py = (1 - t) * (1 - t) * base + 2 * (1 - t) * t * cy + t * t * ty, w = w0 + (w1 - w0) * t;
    s += `<path d="M${n1(px - w / 2)} ${n1(py)}q${n1(w / 2)} ${n1(w * .22)} ${n1(w)} 0" stroke="${light(trunkC, .12)}" stroke-width=".18" fill="none" opacity=".8"/>`;
  }
  return s + palmCrown(tx, ty, h * .36, c, hi);
}
// 夕焼けの雲：ぼかした帯の重なり。下側が夕日で明るい
// 水面に映る光の道（太陽・月・灯り）：手前ほど幅が広い、短い横線の集まり
function glitter(x, y0, y1, c, { spread = .45, n = 90, a = .8 } = {}) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const t = Math.pow(rnd(), .8), y = y0 + (y1 - y0) * t, w = 1.5 + (y - y0) * spread, xx = x + R(-w, w) * (1 - Math.abs(R(-1, 1)) * .3), l = R(.6, 2.8) * (1 + t * 2);
    s += `<path class="shimmer" style="animation-delay:${n1(-R(0, 4))}s" d="M${n1(xx - l / 2)} ${n1(y)}h${n1(l)}" stroke="${c}" stroke-width="${n1(.18 + t * .35)}" stroke-linecap="round" opacity="${n1(a * (1 - t * .55) * 100) / 100}"/>`;
  }
  return s;
}
// 夕凪の海の面：白い筋は使わず、空を映す明るいゆらぎと、うねりの少し暗い帯を、ぼかした細長い楕円で重ねる（奥ほど細く短く）
function seaSheen(x0, x1, hz, y1, g, { light = '#fbe4cf', dark = '#5f8f93', la = .5, da = .32 } = {}) {
  const L = `ss${gid++}`, Dk = `sd${gid++}`;
  let s = `<defs><radialGradient id="${L}"><stop offset="0" stop-color="${light}" stop-opacity="${la}"/><stop offset=".6" stop-color="${light}" stop-opacity="${n2(la * .3)}"/><stop offset="1" stop-color="${light}" stop-opacity="0"/></radialGradient><radialGradient id="${Dk}"><stop offset="0" stop-color="${dark}" stop-opacity="${da}"/><stop offset=".6" stop-color="${dark}" stop-opacity="${n2(da * .3)}"/><stop offset="1" stop-color="${dark}" stop-opacity="0"/></radialGradient></defs>`;
  // 細い横線に見えないように、ゆらぎは縦にも厚みのある、ふちのぼけた面にする
  for (let t = .03; t < 1; t += .06 + t * .08) {
    const y = hz + .5 + (y1 - hz) * t * t, w = 3 + t * 24, h = .45 + t * 2.4;
    for (let x = x0 + g() * w; x < x1; x += w * (1.2 + g() * 1.6)) {
      const dk = g() < .45;
      s += `<ellipse cx="${n1(x)}" cy="${n1(y + (g() - .5) * h)}" rx="${n1(w * (.5 + g() * .6))}" ry="${n2(h * (.6 + g() * .5))}" fill="url(#${dk ? Dk : L})"/>`;
    }
  }
  return s;
}
// 夕日が海に落とす光の道（動かない下地）：水平線から手前へ、横長のやわらかな光の帯が広がる。揺らぎは museum.js が重ねる
function sunColumn(x, hz, y1, c = ['#fff0cf', '#ffe2b4', '#ffd9a6'], k = 1) {
  const id = `sc${gid++}`;
  let s = `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${c[0]}" stop-opacity="${n2(.55 * k)}"/><stop offset=".5" stop-color="${c[1]}" stop-opacity="${n2(.2 * k)}"/><stop offset="1" stop-color="${c[2]}" stop-opacity="0"/></radialGradient></defs>`;
  // 横長の帯を重ねず、縦にやわらかく広がる光の面にする（線に見えないように）
  for (let i = 0; i < 9; i++) { const t = i / 8, y = hz + .8 + (y1 - hz) * t * t, w = 1.6 + t * 8; s += `<ellipse cx="${n1(x + Math.sin(i * 2.3) * t * 1.2)}" cy="${n1(y)}" rx="${n1(w)}" ry="${n2(1 + t * 3.2)}" fill="url(#${id})" opacity="${n2(.9 - t * .4)}"/>`; }
  return s;
}
// 遠い波：奥ほど細かく、手前ほど長い白い筋
function waveLines(x0, x1, y0, y1, c, n) {
  let s = '';
  for (let i = 0; i < n; i++) { const t = rnd(), y = y0 + (y1 - y0) * t * t, l = R(1, 4) * (1 + t * 4); s += `<path d="M${n1(R(x0, x1))} ${n1(y)}q${n1(l / 2)} ${n1(-.25 - t * .4)} ${n1(l)} 0" stroke="${c}" stroke-width="${n1(.15 + t * .3)}" fill="none" opacity="${n1((.25 + t * .35) * 100) / 100}" stroke-linecap="round"/>`; }
  return s;
}
// 波打ちぎわ：白い泡の線と、濡れた砂
function shoreline(x0, x1, y, foam, wet) {
  const pts = []; for (let x = x0; x <= x1 + 10; x += R(8, 16)) pts.push([x, y + R(-1.2, 1.2)]);
  const top = `M${n1(pts[0][0])} ${n1(pts[0][1])}${smoothD(pts)}`;
  // 波打ちぎわ：線は引かない。濡れた砂は水ぎわほど暗く、水の色がうっすら残る。寄せては返す波と泡は museum.js が動かす
  const [g, gd] = lgrad([[0, '#a9c4bc', .55], [.35, wet], [1, wet]]);
  let s = `<defs>${gd}</defs><path d="${top}L${n1(x1 + 10)} ${n1(y + 5)}L${n1(x0)} ${n1(y + 5)}Z" fill="url(#${g})"/>`;
  pts.forEach(() => R(-.4, .4)); // もとの点線のぶんの乱数（ほかの小物の位置を変えないために、呼ぶ回数だけ合わせる）
  return s;
}
// なめらかな岩：影の面と、上の明るい面
function rock(x, y, w, h, c) {
  track(x - w / 2, y - h); track(x + w / 2, y);
  const d = `M${n1(x - w / 2)} ${n1(y)}C${n1(x - w / 2)} ${n1(y - h * .7)} ${n1(x - w * .2)} ${n1(y - h)} ${n1(x + w * .05)} ${n1(y - h)}C${n1(x + w * .35)} ${n1(y - h)} ${n1(x + w / 2)} ${n1(y - h * .6)} ${n1(x + w / 2)} ${n1(y)}Z`;
  return `<ellipse cx="${n1(x + w * .08)}" cy="${n1(y + .2)}" rx="${n1(w * .6)}" ry="${n1(h * .14)}" fill="#000" opacity=".18"/><path d="${d}" fill="${c}"/><path d="M${n1(x - w * .42)} ${n1(y - h * .5)}C${n1(x - w * .3)} ${n1(y - h * .92)} ${n1(x - w * .05)} ${n1(y - h * .98)} ${n1(x + w * .1)} ${n1(y - h * .95)}C${n1(x - w * .1)} ${n1(y - h * .8)} ${n1(x - w * .3)} ${n1(y - h * .65)} ${n1(x - w * .42)} ${n1(y - h * .5)}Z" fill="${light(c, .18)}"/>`;
}
function driftwood(x, y, l, a, c = '#a8927a') {
  track(x - l / 2, y - 2); track(x + l / 2, y + 1);
  return `<g transform="rotate(${n1(a)} ${n1(x)} ${n1(y)})"><path d="M${n1(x - l / 2)} ${n1(y)}q${n1(l * .3)} ${n1(-1.4)} ${n1(l)} ${n1(-.3)}l${n1(-.2)} ${n1(1.4)}q${n1(-l * .5)} .8 ${n1(-l + .2)} ${n1(.4)}Z" fill="${c}"/><path d="M${n1(x - l * .35)} ${n1(y - .3)}h${n1(l * .5)}" stroke="${light(c, .2)}" stroke-width=".25"/><path d="M${n1(x + l * .2)} ${n1(y - .6)}l${n1(l * .12)} -2" stroke="${c}" stroke-width=".5" stroke-linecap="round"/></g>`;
}
// 海辺の家並み：切妻屋根と平屋根の家、窓の灯り
function townRow(x0, x1, base, c, { lit = '#ffc56b', hmin = 3, hmax = 9, density = .45 } = {}) {
  let s = '', x = x0;
  while (x < x1) {
    const w = R(3, 7), h = R(hmin, hmax), gable = rnd() < .5, col = mixC(c, '#000000', R(0, .15));
    s += gable ? `<path d="M${n1(x)} ${n1(base)}V${n1(base - h)}L${n1(x + w / 2)} ${n1(base - h - w * .35)}L${n1(x + w)} ${n1(base - h)}V${n1(base)}Z" fill="${col}"/>` : `<path d="M${n1(x)} ${n1(base)}V${n1(base - h)}H${n1(x + w)}V${n1(base)}Z" fill="${col}"/>`;
    for (let wy = base - h + 1; wy < base - .8; wy += 1.4) for (let wx = x + .6; wx < x + w - .6; wx += 1.2) if (rnd() < density) s += `<rect x="${n1(wx)}" y="${n1(wy)}" width=".55" height=".7" fill="${pick([lit, '#ffe2a8', '#ff9f4a'])}" opacity="${n1(R(.6, 1) * 100) / 100}"/>`;
    x += w + R(-.5, 1.2);
  }
  return s;
}
function streetLamp(x, y, h) {
  return rglow(x, y - h, h * .9, '#ffc873', .5) + `<ellipse cx="${n1(x)}" cy="${n1(y + .3)}" rx="${n1(h * .7)}" ry="${n1(h * .12)}" fill="#ffc873" opacity=".22"/>
    <path d="M${n1(x - .25)} ${n1(y)}L${n1(x - .18)} ${n1(y - h)}H${n1(x + .18)}L${n1(x + .25)} ${n1(y)}Z" fill="#0f0d14"/><path d="M${n1(x - .6)} ${n1(y)}h1.2v-.5h-1.2Z" fill="#0f0d14"/>
    <path d="M${n1(x - 1.1)} ${n1(y - h - .2)}L${n1(x - .8)} ${n1(y - h - 2.2)}H${n1(x + .8)}L${n1(x + 1.1)} ${n1(y - h - .2)}Z" fill="#ffe0a0"/><path d="M${n1(x - 1.4)} ${n1(y - h - 2.1)}H${n1(x + 1.4)}L${n1(x)} ${n1(y - h - 3.2)}Z" fill="#0f0d14"/>`;
}
function railing(x0, x1, y, c = '#1b1a24') {
  let s = `<path d="M${n1(x0)} ${n1(y - 3)}H${n1(x1)}" stroke="${c}" stroke-width=".35"/><path d="M${n1(x0)} ${n1(y - 1.6)}H${n1(x1)}" stroke="${c}" stroke-width=".2"/>`;
  for (let x = x0; x < x1; x += 2.2) s += `<path d="M${n1(x)} ${n1(y)}V${n1(y - 3)}" stroke="${c}" stroke-width=".22"/>`;
  return s;
}

export function sceneCove(W, stops, { night = false } = {}) {
  reseed(31 + stops);
  const P = PAL.dusk, fw = planeW(W, stops, FACTORS.far), mw = planeW(W, stops, FACTORS.mid), vw = planeW(W, stops, FACTORS.move), hz = 62;
  let far = '', mid = '', move = '';
  // 奥：夕焼けの雲、低い太陽、霞む岬、光の道と遠い波
  // 夕焼けの雲：高いところは淡い藤色、低いところほど夕日に染まる。太陽側の縁が金色に光る（重いぼかしは使わない）
  const sx = at(W, FACTORS.far)(1, W * .62);
  far += streakCloud(-10, fw + 10, 9, 1.1, '#d9c3dc', '#f3d6d8') + streakCloud(-10, fw + 10, 20, 1, '#e0bfcf', '#fbd9c6');
  // 雲は作品の空のように、筆でなでた横長の帯で（前のもこもこの雲は、乱数の呼び出しだけ残して描かない）
  const gC = hrng(fw + 1.9);
  for (let x = R(-12, 4); x < fw + 20; x += R(16, 30)) { const y = R(12, 46), k = (y - 12) / 34, big = R(.8, 1.5); const cw = R(20, 34) * big, ch = R(3, 5) * big; sunsetCloud(x, y, cw, ch, sx, ['#fff', '#fff', '#fff', '#fff']); far += brushCloud(x, y, cw * 1.5, ch * 1.1, gC, sx, [mixC('#d6bdd6', '#efbcb6', k), mixC('#f4dde2', '#ffe2c4', k), mixC('#b7a0c0', '#d49fa8', k), mixC('#ffd9c4', '#ffd09a', k)]); }
  far += streakCloud(-10, fw + 10, hz - 13, 1.4, '#e7b6ae', '#ffcf8f');
  // 夜（入口のランプで夜にしたとき）は夕日を描かない（乱数の呼び出しだけ合わせる）
  { const sun = setSun(sx, hz - 6, 4.8); if (!night) far += sun; }
  // 遠くを渡る鳥
  // 遠景は 3 段：奥の雪山、真ん中のかすむ島々、手前の緑の岬（作品の山の描き方で、光の面と影の面を塗り分ける）。
  // 前の山の乱数の呼び出しはそのまま残す（浜の小物の位置を変えないため）。絵は位置から決まる別の乱数で
  mountains(-10, fw + 10, hz, 40, 55, '#b3c6cc', '#eef3f2', { wmin: 30, wmax: 70 });
  const gM = hrng(fw + 3.1), big = W < 80 ? .7 : 1;
  far += facetRange(-10, fw + 10, hz, 9 * big + 3, 27 * big + 3, 30 * big, 70 * big, gM, sx, { lit: '#dcc3c3', shade: '#a6a8c4', snowLit: '#f7e6dd', snowShade: '#d5d2e4', snowMin: 12 * big });
  far += haze(-10, fw + 10, 38, hz, '#f6dcc6', .05, .5);
  mountains(-10, fw + 10, hz + .5, 53, 59, '#8eaeb5', null, { wmin: 22, wmax: 48 });
  for (let x = -6 + gM() * 10; x < fw + 10; x += (18 + gM() * 26) * big) far += hazeIsland(x, hz + .2, (10 + gM() * 16) * big, (2.4 + gM() * 3.2) * big, gM, sx, { lit: '#c9b9c3', shade: '#aeaec4', tree: '#a3a3bb' });
  far += haze(-10, fw + 10, hz - 8, hz + .3, '#f6dcc6', 0, .35);
  const [sg, sd] = lgrad([[0, '#f4d9bd'], [.18, '#bfd9d3'], [1, '#86b3b3']]);
  far += `<defs>${sd}</defs><rect x="-5" y="${hz}" width="${n1(fw + 10)}" height="${n1(106 - hz)}" fill="url(#${sg})"/>`;
  // 海の面と夕日の光の道（前の粒と白い筋は、乱数の呼び出しだけ残して描かない）
  glitter(sx, hz + .5, 100, '#fff6d8', { spread: .35, n: 170, a: 1 });
  { const gS = hrng(fw + 7.7); far += seaSheen(-5, fw + 5, hz, 84, gS) + (night ? '' : sunColumn(sx, hz, 80)); }
  // 水平線の帆船と、遠くの桟橋（先に灯りがともる）
  // 手前の緑の岬：作品と作品のあいだ（立ち止まると画面の真ん中）に岬の先が来るように。どれも先を夕日の側（左）へ向け、
  // 次の岬に重ならない長さに。最初の岬の先に防波堤と小さな灯台
  let harbor = null, lightSvg = '';
  const houses = [];
  // 岬の後ろに、霞んだ緑の丘の連なり（海岸線が続いて見えるように。ところどころ切れて海と島が見える）
  for (let x = -8 + gM() * 6; x < fw + 10; x += (12 + gM() * 20) * big) { if (gM() < .22) continue; far += hazeIsland(x, hz + .15, (16 + gM() * 22) * big, (3.2 + gM() * 3.4) * big, gM, sx, { lit: '#b3b9a6', shade: '#9aaba5', tree: '#93a49b' }); }
  // 立ち止まる場所ごとに岬を 1 つ。大きさはまちまちで、右の岬ほど手前に重なる（左の岬の奥の裾を隠す）
  for (let s = -.5, k = 0; s < stops; s += 1, k++) {
    const dir = 1, tip = at(W, FACTORS.far)(s, W * .5), bwl = W < 80 ? 4 : 7, isHarbor = s === 1.5, size = isHarbor ? 1 : [.55, .8, .45, .95, .6][k % 5] * (.85 + gM() * .3);
    const len = Math.min(W < 80 ? 26 : 56, W * FACTORS.far * 2.1) * (.6 + size * .4), hgt = (W < 80 ? 6.5 : 10) * size;
    const tipX = isHarbor ? tip + dir * bwl : tip + dir * (gM() * 4 - 1) * big;
    far += headland(tipX, hz + .1, len, hgt, dir, gM, sx, { body: '#86a092', lit: '#a9b095', low: '#6f8d88', shade: '#5f7c7d', rock: '#7f8a86', rockLit: '#a9a497', refl: '#5f8583', trees: ['#6f8c84', '#8aa18f', '#a7b096'], palm: '#5a7169', houses });
    if (isHarbor) { const bw = breakwater(tipX, tip, hz + .1, gM, { top: '#c9b8b0', face: '#948a96', gap: '#7d7482', tower: '#efe4da', towerShade: '#d2c7cf', red: '#bd6a5c', lamp: '#6b6170' }); lightSvg = bw.svg; harbor = bw.light; }
  }
  // 灯台は最後に描く（後ろの岬に隠れないように）
  far += lightSvg;
  for (let k = 0; k < 3; k++) far += sailboat(R(fw * .1, fw * .9), hz - .2, R(2, 3.2), pick(['#8a97a8', '#7a7488']));
  far += pierFar(fw * .78, hz + 3.5, Math.min(26, fw * .18), '#6f6a7a');
  waveLines(-5, fw + 5, hz + 1, 100, '#ffffff', Math.round(fw * 1.4));
  // 中景：浅瀬の珊瑚、波打ちぎわ、濡れた砂と乾いた砂、岩と流木
  // 珊瑚は作品（Sunset Session）の色で、波打ちぎわに群れで。根もとは水に沈める
  for (let x = R(0, 20); x < mw; x += R(38, 64)) {
    for (let k = 0; k < 3 + Math.floor(rnd() * 3); k++) mid += coral(x + R(-7, 7), 80.5, R(9, 17), pick(['#b29ad6', '#c7b3e6', '#e9a7b4', '#9b8ad0', '#f0c0cc']), { cls: '' });
  }
  const [wg, wd] = lgrad([[0, '#a9d0cb', 0], [1, '#a9d0cb', .85]]);
  mid += `<defs>${wd}</defs><rect x="-5" y="74" width="${n1(mw + 10)}" height="7" fill="url(#${wg})"/>`;
  mid += shoreline(-5, mw + 5, 79, '#fbf6ea', '#c7b595');
  const [dg, dd] = lgrad([[0, '#dcc6a2'], [1, '#e9d8b8']]);
  mid += `<defs>${dd}</defs><path d="M-5 106L-5 83${smoothD(Array.from({ length: 10 }, (_, i) => [-5 + (mw + 10) * i / 9, 83 + R(-.8, .8)]))}L${n1(mw + 5)} 106Z" fill="url(#${dg})"/>`;
  // 濡れた砂に映る夕焼け、波が引いたあとのレースのような泡の線
  mid += `<rect x="-5" y="80.6" width="${n1(mw + 10)}" height="3.2" fill="#f0c3ad" opacity=".28"/>`;
  // （泡の線・砂の上の白い線はやめた：線に見えてチープなので。波と泡は動く絵で。乱数の呼び出しだけ残して、ほかの小物の位置を変えない）
  for (let x = R(-5, 5); x < mw; x += R(6, 14)) { R(81, 83); R(3, 9); }
  for (let k = 0; k < 2; k++) for (let x = -5; x < mw + 5; x += 3) { R(-.5, .5); R(-.3, .3); }
  // 乾いた砂の上：小石、貝のかけら、打ち上げられた海藻
  // 看板（流木の台）の下の縁に切られる帯（台の真下で、地面の y が 92 より上）には、砂の上の小物を置かない：
  // 板の下から半分だけのぞいて、台の下にもぐり込んでいるように見えるので
  const open = (x, y) => y >= 92 || clearOfWorks(W, stops, x, 3);
  // 小瓶の置き場所（eggs.js の roomEggHTML と同じ計算：2 つ目のすき間の真ん中から右へ）
  const bottleX = at(W, FACTORS.mid)(Math.min(stops - 1, 2) - .5, W * .5) + Math.min(W * .3, 15);
  mid += pebbles(-5, mw, 85, 103, Math.round(mw * .5), open);
  for (let i = 0; i < mw * .35; i++) { const x = R(0, mw), y = R(84, 102); if (!open(x, y)) continue; mid += `<path d="M${n1(x)} ${n1(y)}a.6 .45 0 0 1 1.2 0Z" fill="#f4e9da" opacity=".85"/>`; }
  for (let i = 0; i < mw / 16; i++) {
    const x = R(0, mw), y = R(83.8, 87.5);
    if (!open(x - 2, y) || !open(x + 3, y)) continue;
    let d = '';
    for (let k = 0; k < 6; k++) { const a = R(-.5, .5), l = R(1.2, 2.6), ox = R(-1.2, 1.2), oy = R(-.3, .3); d += `M${n1(x + ox)} ${n1(y + oy)}q${n1(l * .5)} ${n1(a - .5)} ${n1(l)} ${n1(a)}`; }
    mid += `<path d="${d}" stroke="${pick(['#4f5a2e', '#5c5a34', '#6b6a3a'])}" stroke-width=".3" fill="none" opacity=".75" stroke-linecap="round"/>`;
  }
  for (let i = 0; i < mw * 1.5; i++) { const x = R(0, mw), y = R(84, 104); if (open(x, y)) mid += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(R(.08, .22))}" fill="${pick(['#b9a27c', '#f6ead2', '#a8916b'])}" opacity=".7"/>`; }
  for (let x = R(4, 30); x < mw; x += R(45, 90)) {
    // 看板（流木の台）の足もとには置かない：板の下から岩がのぞいて、台が岩に乗っているように見えるので
    if (!clearOfWorks(W, stops, x - 7, 10) || !clearOfWorks(W, stops, x + 16, 10)) continue;
    const y = R(85, 94), c = pick(['#6f6a6a', '#7c746c', '#5f5f66']), rw = R(7, 13);
    // 夕日の長い影（太陽は左の奥なので、右手前へ長く）
    // 小瓶（museum.js の隠し小物）を置く場所には、岩と流木を置かない（乱数の呼び出しは同じまま、描くかどうかだけ変える）
    let rk = `<ellipse cx="${n1(x + rw * .9)}" cy="${n1(y + .6)}" rx="${n1(rw * 1.1)}" ry="${n1(rw * .12)}" fill="#7a5a5a" opacity=".22"/>`;
    rk += rock(x, y, rw, R(3.5, 6), c);
    if (rnd() < .6) rk += rock(x + R(4, 8), y + R(.5, 1.5), R(3, 6), R(1.6, 3), mixC(c, '#8a8278', .3));
    if (x + rw * 2 < bottleX - 5 || x - 2 > bottleX + 5) mid += rk;
  }
  for (let x = R(10, 30); x < mw; x += R(40, 70)) if (clearOfWorks(W, stops, x - 7, 10) && clearOfWorks(W, stops, x + 7, 10)) { const dw = driftwood(x, R(92, 98), R(8, 14), R(-8, 8)); if (Math.abs(x - bottleX) > 12) mid += dw; }
  // 貝殻・ヒトデ・シーグラス、波打ちぎわの足あとと泡
  for (let i = 0; i < mw / 7; i++) { const x = R(0, mw), y = R(84.5, 103), k = rnd(); if (!open(x - 1, y) || !open(x + 2, y)) continue; mid += beachShell(x, y, R(1.4, 2.4) * (1 + (y - 84) / 22), k < .45 ? 0 : k < .75 ? 1 : k < .85 ? 2 : 3); }
  for (let x = R(0, 40); x < mw; x += R(70, 130)) mid += footprints(x, x + R(26, 44), R(82.6, 84), Math.round(R(12, 20)), open);
  for (let i = 0; i < mw * .8; i++) mid += `<circle cx="${n1(R(0, mw))}" cy="${n1(R(79.2, 81.2))}" r="${n1(R(.08, .24))}" fill="none" stroke="#fffaf2" stroke-width=".06" opacity=".7"/>`;
  for (let x = R(0, 10); x < mw; x += R(12, 22)) mid += tuft(x, 101 + R(-1, 2), R(3, 5), ['#a39866', '#8a8a5a', '#c2b27a', '#b7a36e'], 7);
  // 砂浜の小物：潮だまり、カニ、立っているカモメ、砂丘の柵、引き上げた小舟、焚き火（作品の下の台のわきに）
  for (let s = 0; s < stops; s++) {
    // 浜の作品は幅の広い木箱の台に立つので、台の枠は広め
    const cx = at(W, FACTORS.mid)(s, W / 2), nx = at(W, FACTORS.mid)(s + 1, W / 2), Z = [artZone(W, cx, 2, 64), [cx - 15.5, 58, cx + 15.5, 92], artZone(W, nx, 2, 64), [nx - 15.5, 58, nx + 15.5, 92]];
    const gx = cx + W * FACTORS.mid * .5;
    mid += guard(Z, () => tidePool(gx + R(-10, 10), R(84, 86.5), R(5, 8)), { min: 1 });
    if (s % 3 === 0) mid += guard(Z, (k) => duneFence(gx - R(9, 12) * k, gx + R(9, 12) * k, R(98, 101), R(4, 5)), { min: .55 });
    // 小舟は、台の足もと（砂に埋まった根もと）にもかからないように、台の範囲を下まで広げてよける
    const Zb = [Z[0], [cx - 16.5, 58, cx + 16.5, 99], Z[2], [nx - 16.5, 58, nx + 16.5, 99]];
    if (s % 3 === 1) mid += guard(Zb, (k) => rowboat(gx + R(-3, 3), R(94, 97), R(16, 20) * k, pick(['#d9a06a', '#c98a7a', '#8fb0b8'])), { min: .6 });
    if (s % 3 === 2) mid += guard(Z, () => campfire(gx + R(-4, 4), R(95, 98), R(1.8, 2.2)), { min: 1 });
  }
  // 作品の台の手前の砂：ヒトデ、ホタテの貝殻、波に磨かれたシーグラス（スマホの縦長の画面でも、台の足もとに見えるところ）。瓶のまわりはあける
  for (let s = 1; s < stops; s++) {
    const cx = at(W, FACTORS.mid)(s, W / 2), g = hrng(cx * 1.7 + s), G = (a, b) => a + g() * (b - a), span = Math.min(W * .34, 20);
    const spots = [];
    const free = (x) => Math.abs(x - bottleX) > 7 && spots.every((q) => Math.abs(q - x) > 4.2);
    const put = (fn) => { for (let t = 0; t < 6; t++) { const x = cx + G(-span, span); if (free(x)) { spots.push(x); mid += fn(x, G(93.5, 98.5)); return; } } };
    put((x, y) => beachStar(x, y, G(1.7, 2.3), G(0, 72), ['#e08a6a', '#d9775a', '#e3a06a'][Math.floor(g() * 3)]));
    for (let k = 0; k < 3; k++) put((x, y) => scallop(x, y, G(1.2, 1.7), G(-25, 25), ['#f3e6cf', '#efd2c4', '#e9dcc0'][Math.floor(g() * 3)]));
    if (g() < .85) put((x, y) => seaGlass(x, y, G(.7, 1), ['#9cc8b6', '#8fb4cf', '#b8d6a6'][Math.floor(g() * 3)]));
  }
  // 手前：浜辺の草と流木（作品と作品のあいだ）
  for (let s = 0; s < stops - 1; s++) {
    const x = at(W, FACTORS.move)(s + .5, W / 2), Z = moveZones(W, s, 2, 88);
    move += guard(Z, (k) => tuft(x - 6, 108, 14 * k, ['#6f6a45', '#857d52', '#9c9061'], 9) + tuft(x + 5, 108, 11 * k, ['#6f6a45', '#857d52', '#9c9061'], 8));
    move += guard(Z, (k) => driftwood(x, 104, 22 * k, R(-6, 6), '#8d7a66'));
  }
  // 額縁：上の角から暗いヤシの葉、下の角に浜の草
  const Z = [artZone(W, W / 2, 2, 88)];
  let frame = '', ground = '';
  frame += guard(Z, (k) => frond(-3, -3, 38 * k, 150, '#3b4a3f', '#4d5d4c', { droop: 1.2 })) + guard(Z, (k) => frond(-2, 4, 30 * k, 120, '#34423a', '#46574a', { droop: 1.1 }));
  frame += guard(Z, (k) => frond(W + 3, -3, 40 * k, -150, '#3b4a3f', '#4d5d4c', { droop: 1.2 })) + guard(Z, (k) => frond(W + 2, 6, 28 * k, -118, '#34423a', '#46574a', { droop: 1.1 }));
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) { const x = side < 0 ? R(-3, W * .14) : W - R(-3, W * .14); ground += guard(Z, (k) => tuft(x, 106, R(12, 18) * k, ['#5f5b3c', '#77704a', '#8f8558'], 9)); }
  move += tileGround(W, stops, ground);
  // 夜：夕日の代わりに満月と、またたく星（どちらも画面に直接置くので、夜の色に変換されずに光る）。月の光の道は museum.js
  let skyDom = null, moonAt = null;
  if (night) {
    const gN = hrng(fw + 5.3), mr = W < 80 ? 3.1 : 3.9, mx = at(W, FACTORS.far)(.35, W * .5), my = W < 80 ? 22 : 20;
    moonAt = [mx, hz];
    const bright = [];
    for (let i = 0; i < fw * .09; i++) { const x = gN() * fw, y = 3 + Math.pow(gN(), 1.4) * 34; if (Math.hypot(x - mx, y - my) < 11) continue; bright.push([n1(x), n1(y), n2(.9 + gN() * 1.2), ['#fffaf0', '#e3ebff', '#ffe9c8'][Math.floor(gN() * 3)], n2(gN() * 5)]); }
    skyDom = { moon: { x: mx, y: my, r: mr, kind: 'full', halo: true }, bright };
  }
  return {
    skyDom,
    sky: 'linear-gradient(#aebbd6 0%, #e3b8b3 28%, #f3c69c 46%, #f8dcb0 58%, #f6e2c4 62%, #bfd9d3 66%, #86b3b3 100%)',
    far: [fw, far], mid: [mw, mid], move: [vw, move], frame, fx: 'cove', glowDefault: [255, 214, 170], foam: 79, harbor, plane: true, houses, sunpath: night ? moonAt : [sx, hz], moonpath: night,
    curtain: ['#1c3a3a', '#2a5550', '#3f7f73', '#5aa77a', '#7cc0a0'],
  };
}

export function sceneNight(W, stops) {
  reseed(41 + stops);
  const P = PAL.night, fw = planeW(W, stops, FACTORS.far), mw = planeW(W, stops, FACTORS.mid), vw = planeW(W, stops, FACTORS.move), hz = 66;
  let far = '', mid = '', move = '';
  // 奥：星空（天の川と月明かりの薄雲）、岬の町と灯台、海に映る月の道。
  // 空はぼかさずに焼き、明るい星と三日月は画面に直接置いてくっきり見せる（museum.js）
  const mx = fw * .3;
  const SKY = nightSky(-5, fw + 5, 0, hz - 8, { milky: [fw * .02, 3, fw * .98, 30, 4.5] });
  const skyArt = SKY.svg + wisps(mx - 24, mx + 36, 9, 30, 6);
  const skyDom = { moon: { x: mx, y: 16, r: 4.5, kind: 'real' }, bright: SKY.bright.filter(([x, y]) => Math.hypot(x - mx, y - 16) > 12) };
  far += `<path d="M-5 106L-5 ${hz - 4}${smoothD(Array.from({ length: 9 }, (_, i) => [-5 + (fw + 10) * i / 8, hz - 6 + R(-3, 2)]))}L${n1(fw + 5)} 106Z" fill="#282c55"/>`;
  for (let i = 0; i < fw / 1.4; i++) far += `<circle cx="${n1(R(0, fw))}" cy="${n1(R(hz - 7, hz - 1))}" r="${n1(R(.1, .22))}" fill="${pick(['#ffd79a', '#ffb45a', '#fff1d0'])}" opacity="${n1(R(.4, .9) * 100) / 100}"/>`;
  let towns = ''; // 水面に逆さに映すので、町の並びをとっておく
  for (let s = 0; s < stops; s += 1) { const x = at(W, FACTORS.far)(s, W * R(.15, .85)); const tr = townRow(x - R(10, 16), x + R(10, 16), hz, '#1d1f3c', { hmin: 2.5, hmax: 7 }); far += tr; towns += tr; }
  // 観覧車：対岸の水ぎわに立つ（脚の足もとが水平線）。museum.js が脚・回る輪・ゴンドラ・水面の映り込みを置く
  // 作品と作品のあいだで立ち止まったとき、画面の真ん中（作品のない所）に見える位置。狭い画面では小さく
  const ferris = { x: at(W, FACTORS.far)(Math.max(1, Math.floor(stops / 2)) + .5, W * .5), r: W < 80 ? 7 : 10, base: hz };
  ferris.y = ferris.base - ferris.r - 3.8; // いちばん下のゴンドラが足もとの台にかからない高さ
  const lighthouse = { x: at(W, FACTORS.far)(stops - 1, W * .85), y: hz - 9.6 };
  { const lx = lighthouse.x; towns += `<path d="M${n1(lx - 1)} ${hz}L${n1(lx - .6)} ${hz - 9}H${n1(lx + .6)}L${n1(lx + 1)} ${hz}Z" fill="#8e8a98"/><circle cx="${n1(lx)}" cy="${hz - 9.6}" r=".7" fill="#ffe7a8"/>`; far += `<path d="M${n1(lx - 1)} ${hz}L${n1(lx - .6)} ${hz - 9}H${n1(lx + .6)}L${n1(lx + 1)} ${hz}Z" fill="#e8e2d8"/><path d="M${n1(lx - .7)} ${hz - 6}h1.4v1h-1.4Z" fill="#b3261e"/><circle cx="${n1(lx)}" cy="${hz - 9.6}" r=".7" fill="#ffe7a8"/>` + rglow(lx, hz - 9.6, 8, '#ffe7a8', .35); }
  const [sg, sd] = lgrad([[0, '#2d3263'], [1, '#141733']]);
  far += `<defs>${sd}</defs><rect x="-5" y="${hz}" width="${n1(fw + 10)}" height="${n1(106 - hz)}" fill="url(#${sg})"/>`;
  // 水面：白い横線（遠い波・月の光の粒）はやめて、やわらかな光と影のゆらぎと、月の光の道に（乱数の呼び出しは残す）
  glitter(mx, hz + .5, 100, '#fdf1d6', { spread: .25, n: 110, a: .7 });
  waveLines(-5, fw + 5, hz + 1, 100, '#8f98c9', Math.round(fw));
  // 水面のゆらぎは白くしない（紺の濃淡だけ）。光るのは月明かりと建物の映り込みだけにする
  { const gS = hrng(fw + 9.1); far += seaSheen(-5, fw + 5, hz, 96, gS, { light: '#3a4180', dark: '#0b0d26', la: .3, da: .38 }); }
  // 建物の映り込み：町並みと灯台を上下さかさに、少し縦に伸ばして、水平線から下へ淡く消えていく形で
  { const mk = `rf${gid++}`, [mg, md] = lgrad([[0, '#ffffff', .75], [.35, '#ffffff', .35], [1, '#ffffff', 0]]);
    far += `<defs>${md}<mask id="${mk}" maskUnits="userSpaceOnUse" x="-5" y="${hz}" width="${n1(fw + 10)}" height="16"><rect x="-5" y="${hz}" width="${n1(fw + 10)}" height="16" fill="url(#${mg})"/></mask></defs><g mask="url(#${mk})" opacity=".55"><g transform="translate(0 ${n1(hz * 2.35 + .2)}) scale(1 -1.35)">${towns}</g></g>`; }
  // 月明かりの反射：月の真下に、淡い黄みの光が水平線から手前へひろがる（白く強くしない）
  // 月の光の道は、焼かずに画面に直接置く（今夜の月の明るさに合わせて濃さを変えるので。新月の夜はほとんど見えない）
  skyDom.column = { x: mx, hz, svg: sunColumn(mx, hz, 90, ['#efe3bd', '#b9b6d2', '#8e94c4'], .6) };
  // 町の灯りの映り込み：線ではなく、縦に少し伸びたぼけた光
  for (let i = 0; i < fw / 2.2; i++) { const x = R(0, fw), y = R(hz + .8, hz + 6), l = R(.6, 1.6), c = pick(['#ffd79a', '#ffb45a']), o = R(.25, .55); far += `<ellipse cx="${n1(x)}" cy="${n1(y + l * .7)}" rx=".3" ry="${n1(l * 1.1)}" fill="${c}" opacity="${n2(o * .45)}"/>`; }
  for (let k = 0; k < Math.max(2, Math.round(fw / 60)); k++) { const x = R(fw * .05, fw * .95), y = hz + R(2.5, 5); far += `<path d="M${n1(x - 2)} ${n1(y)}h4l-.6 .8h-2.8Z" fill="#141733"/><path d="M${n1(x)} ${n1(y)}v-3" stroke="#141733" stroke-width=".2"/><circle cx="${n1(x)}" cy="${n1(y - 3)}" r=".25" fill="#ffe7a8"/>` + rglow(x, y - 3, 2, '#ffe7a8', .35); }
  far += haze(-10, fw + 10, hz - 14, hz + 2, '#3c3f73', 0, .35);
  // 中景：海沿いの遊歩道（手すり、街灯、ヤシ、電球の紐）と植え込み
  // 作品の後ろ（と台座のまわり）にはヤシも街灯も立てない。作品は遊歩道の上にすっきり立つ
  const clear = (x, m = 0) => clearOfWorks(W, stops, x, m), puddles = [];
  mid += railing(-5, mw + 5, 84, '#15141d');
  const [pg, pd] = lgrad([[0, '#2a2733'], [1, '#141219']]);
  mid += `<defs>${pd}</defs><rect x="-5" y="84" width="${n1(mw + 10)}" height="22" fill="url(#${pg})"/><rect x="-5" y="84" width="${n1(mw + 10)}" height=".5" fill="#3a3646"/>`;
  // ヤシは遊歩道の上（手すりの手前）に、石の植木枡に植えて立てる。根もとが石畳に見えるので、海から生えて見えない
  const palmXs = [], palmY = 93.5;
  for (let x = R(0, 10); x < mw; x += R(18, 30)) {
    const h = R(44, 60), lean = R(-7, 7);
    if (!clear(x, 6) || !clear(x + lean * 1.6, 10)) { palmXs.push(null); continue; }
    const w = 7.5;
    mid += `<path d="M${n1(x - w / 2)} ${n1(palmY - 2.2)}h${n1(w)}l.4 2.8h${n1(-w - .8)}Z" fill="#2c2937"/><path d="M${n1(x - w / 2 - .4)} ${n1(palmY + .6)}h${n1(w + .8)}v.5h${n1(-w - .8)}Z" fill="#1b1924"/><rect x="${n1(x - w / 2 - .35)}" y="${n1(palmY - 2.7)}" width="${n1(w + .7)}" height=".7" rx=".2" fill="#3b3748"/><rect x="${n1(x - w / 2 + .3)}" y="${n1(palmY - 2.1)}" width="${n1(w - .6)}" height=".5" fill="#17130f"/>`;
    mid += palm(x, palmY - 1.9, h, lean, '#2a2119', '#1c2614', '#2d3a1f');
    palmXs.push([x + lean, palmY - 1.9 - h]);
  }
  for (let i = 1; i < palmXs.length; i++) if (palmXs[i - 1] && palmXs[i]) mid += strands(palmXs[i - 1][0], palmXs[i][0], Math.max(palmXs[i - 1][1], palmXs[i][1]) + 5, R(2, 5), 9);
  // 遊歩道の石畳（目地）と、街灯の光が濡れた石に映る筋
  for (let y = 88.5; y < 106; y += 2.6) mid += `<path d="M-5 ${n1(y)}H${n1(mw + 5)}" stroke="#35313f" stroke-width=".18" opacity=".7"/>`;
  for (let y = 86, r = 0; y < 106; y += 2.6, r++) for (let x = -5 + (r % 2) * 2.5; x < mw + 5; x += 5) mid += `<path d="M${n1(x)} ${n1(y)}v2.6" stroke="#35313f" stroke-width=".15" opacity=".55"/>`;
  { const d = hrng(mw * 1.3 + 41); for (let y = 86, r = 0; y < 106; y += 2.6, r++) for (let x = -5 + (r % 2) * 2.5; x < mw + 5; x += 5) { const k = d(); if (k < .45) mid += `<rect x="${n1(x + .12)}" y="${n1(y + .12)}" width="4.76" height="2.36" rx=".35" fill="${k < .2 ? '#3d3848' : '#1c1a24'}" opacity="${n1(.25 + d() * .3)}"/>`; else if (k < .55) mid += `<path d="M${n1(x)} ${n1(y + .4)}v1.8" stroke="#2d3a24" stroke-width=".35" opacity=".6"/>`; } }
  for (let x = R(4, 12); x < mw; x += R(22, 30)) if (clear(x, 2)) {
    const h = R(10, 13);
    mid += `<ellipse cx="${n1(x)}" cy="${n1(96)}" rx="${n1(1.2)}" ry="${n1(7)}" fill="#ffc873" opacity=".12"/>` + rglow(x, 93, 12, '#ffc873', .2) + streetLamp(x, 88, h); // 街灯の下の石畳に、やわらかい光のたまり
    { const px = x + R(-2, 2), py = R(96, 100), pw = R(6, 9); mid += puddle(px, py, pw, '#ffc873'); puddles.push([px, py, pw]); } // 街灯の下の、濡れた石畳の水たまり
  }
  // 石畳の上：ところどころ濡れて光る石、落ちたヤシの葉、散った花びら
  for (let i = 0; i < mw * .5; i++) { const x = R(0, mw), y = R(88, 104); mid += `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(R(1.5, 3.5))}" height="${n1(R(.6, 1.4))}" rx=".3" fill="${pick(['#3b3749', '#2f2c3b', '#46405a'])}" opacity=".55"/>`; }
  for (let x = R(8, 30); x < mw; x += R(36, 60)) if (clear(x, 4)) mid += `<g opacity=".9">${frond(x, R(96, 102), R(10, 14), R(-100, -75), '#2a3419', '#35421f', { droop: .15, n: 11 })}</g>`;
  for (let i = 0; i < mw / 6; i++) mid += `<ellipse cx="${n1(R(0, mw))}" cy="${n1(R(88, 104))}" rx=".35" ry=".2" fill="${pick(['#e9a7b4', '#f4d2dc', '#d98aa0'])}" opacity=".55"/>`;
  for (let i = 0; i < mw * .8; i++) mid += `<rect x="${n1(R(0, mw))}" y="${n1(R(89, 104))}" width="${n1(R(1, 3))}" height=".2" fill="#3a3646" opacity=".6"/>`;
  // 遊歩道の植え込み：石の植木枡（土が見える）に、こんもりした低い茂み。枝葉だけが石畳の上に浮いて見えないように、根もとを枡に入れる
  for (let x = R(-5, 5); x < mw; x += R(10, 16)) {
    if (!clearOfWorks(W, stops, x, 5)) continue; // 台座の真下には植え込みを置かない（茂みの上が台座の足もとに切られるので）
    const w = R(5, 7.5), y = 93 + R(-.6, .6);
    mid += `<path d="M${n1(x - w / 2)} ${n1(y - 1.8)}h${n1(w)}l.35 2.4h${n1(-w - .7)}Z" fill="#2c2937"/><path d="M${n1(x - w / 2 - .35)} ${n1(y + .6)}h${n1(w + .7)}v.5h${n1(-w - .7)}Z" fill="#1b1924"/><rect x="${n1(x - w / 2 - .3)}" y="${n1(y - 2.3)}" width="${n1(w + .6)}" height=".7" rx=".2" fill="#3b3748"/><rect x="${n1(x - w / 2 + .3)}" y="${n1(y - 1.7)}" width="${n1(w - .6)}" height=".5" fill="#17130f"/>`;
    mid += shrub(x, y - 1.6, R(4.5, 6), ['#0c1209', '#131b0e', '#1a2413', '#233019', '#2b3a1f'], { leaf: R(1.1, 1.4), n: 7, spread: 62 });
  }
  // 遊歩道の小物：ベンチと猫、手すりに立てかけた自転車（作品と台座のわき）
  for (let s = 0; s < stops; s++) {
    const cx = at(W, FACTORS.mid)(s, W / 2), nx = at(W, FACTORS.mid)(s + 1, W / 2), Z = [artZone(W, cx, 15, 62), [cx - 13, 56, cx + 13, 94], artZone(W, nx, 15, 62), [nx - 13, 56, nx + 13, 94]];
    const gx = cx + W * FACTORS.mid * .5;
    if (s % 2 === 0) mid += guard(Z, (k) => { const bx = gx + R(-3, 3); return bench(bx, 97, 13 * k); }, { min: .7 });
  }
  // 手前：暗いヤシの葉の影
  for (let s = 0; s < stops - 1; s++) {
    const x = at(W, FACTORS.move)(s + .5, W / 2), Z = moveZones(W, s, 15, 92);
    move += guard(Z, (k) => frond(x - 4, 112, 34 * k, R(-30, -10), '#0e140a', '#151d0e', { droop: .9 }) + frond(x + 4, 112, 30 * k, R(10, 30), '#0e140a', '#151d0e', { droop: .9 }));
  }
  // 額縁：上の角からヤシの葉、両脇にモンステラ、下に暗い茂み
  const Z = [artZone(W, W / 2, 15, 92)];
  let frame = '', ground = '';
  frame += guard(Z, (k) => frond(-3, -4, 40 * k, 145, '#1c2614', '#26331b')) + guard(Z, (k) => frond(-2, 6, 30 * k, 115, '#18200f', '#222d17'));
  frame += guard(Z, (k) => frond(W + 3, -4, 42 * k, -145, '#1c2614', '#26331b')) + guard(Z, (k) => frond(W + 2, 8, 28 * k, -112, '#18200f', '#222d17'));
  for (let i = 0; i < 4; i++) { const x = rnd() < .5 ? R(-4, W * .1) : R(W * .9, W + 4); ground += guard(Z, (k) => monstera(x, R(84, 104), R(14, 20) * k, R(-140, -40), '#141c0e')); }
  for (const side of [-1, 1]) ground += guard(Z, (k) => shrub(side < 0 ? R(2, 8) : W - R(2, 8), 108, R(28, 36) * k, ['#0a1008', '#10170c', '#161f10', '#1d2814'], { leaf: 3.8 * k }));
  for (let x = -2; x < W + 2; x += R(2.2, 4)) ground += tuft(x, 105 + R(-.5, 1), R(4, 7), ['#0a1008', '#10170c', '#161f10'], 6);
  move += tileGround(W, stops, ground);
  return {
    sky: 'radial-gradient(120% 38% at 50% 66%, rgba(150, 104, 158, .5), rgba(90, 70, 140, .18) 55%, transparent 80%), linear-gradient(#04051a 0%, #0a0d2e 28%, #151a45 50%, #252a5c 64%, #3a3a6c 74%, #2b3162 100%)', skyArt, skyDom,
    far: [fw, far], mid: [mw, mid], move: [vw, move], frame, fx: 'night', glowDefault: [255, 180, 110], puddles, ferris, lighthouse, sunpath: [mx, hz], moonpath: true,
    curtain: ['#0b100a', '#141d0f', '#1f2b15', '#2f3a1a', '#3f4a22'],
  };
}

// ---------- 夜の庭の描き込み：対岸の観覧車、ベンチと猫、自転車、街灯の蛾 ----------
function ferrisWheel(x, y, r, c = '#1d1f3c') {
  let s = `<path d="M${n1(x - r * .55)} ${n1(y + r + 1)}L${n1(x)} ${n1(y)}L${n1(x + r * .55)} ${n1(y + r + 1)}" stroke="${c}" stroke-width=".5" fill="none"/>`;
  s += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r)}" stroke="#3d3f6e" stroke-width=".35" fill="none"/><circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r * .82)}" stroke="#3d3f6e" stroke-width=".2" fill="none"/>`;
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, gx = x + Math.cos(a) * r, gy = y + Math.sin(a) * r; s += `<path d="M${n1(x)} ${n1(y)}L${n1(gx)} ${n1(gy)}" stroke="#3d3f6e" stroke-width=".18"/><circle cx="${n1(gx)}" cy="${n1(gy)}" r=".55" fill="${pick(['#ffb45a', '#e88ab8', '#ffe7a8', '#f0c890'])}"/>`; }
  for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; s += `<circle cx="${n1(x + Math.cos(a) * r * .82)}" cy="${n1(y + Math.sin(a) * r * .82)}" r=".2" fill="#ffe7a8" opacity=".8"/>`; }
  s += `<circle cx="${n1(x)}" cy="${n1(y)}" r=".7" fill="#ffe7a8"/>` + rglow(x, y, r * 1.5, '#ff9ad0', .16);
  return s;
}
// 遊歩道のベンチ（横向き）
function bench(x, y, w, c = '#5a3b2a') {
  track(x - w / 2 - 1, y - 6); track(x + w / 2 + 1, y + .5);
  const cl = light(c, .18), h = 3.2;
  let s = `<ellipse cx="${n1(x)}" cy="${n1(y + .3)}" rx="${n1(w * .55)}" ry=".6" fill="#000" opacity=".3"/>`;
  for (const d of [-1, 1]) s += `<path d="M${n1(x + d * w * .42)} ${n1(y)}V${n1(y - h)}M${n1(x + d * w * .42)} ${n1(y - h)}Q${n1(x + d * w * .44)} ${n1(y - h - 2.4)} ${n1(x + d * w * .36)} ${n1(y - h - 2.8)}" stroke="#2a2733" stroke-width=".5" fill="none" stroke-linecap="round"/>`;
  for (let k = 0; k < 3; k++) s += `<rect x="${n1(x - w / 2)}" y="${n1(y - h - k * .95)}" width="${n1(w)}" height=".7" rx=".2" fill="${k ? c : cl}"/>`;
  for (let k = 0; k < 2; k++) s += `<rect x="${n1(x - w / 2 + .3)}" y="${n1(y - h - 2.9 + k * .95)}" width="${n1(w - .6)}" height=".6" rx=".2" fill="${c}"/>`;
  return s;
}
// すわっている猫の影絵（左向き）。目だけ光る
function cat(x, y, s, flip = false, c = '#0e0c12') {
  track(x - s * 1.4, y - s * 2.6); track(x + s * 1.8, y);
  let k = `<g transform="translate(${n1(x)} ${n1(y)}) scale(${flip ? -1 : 1} 1)">`;
  k += `<path d="M${n1(-s * .9)} 0Q${n1(-s * 1.05)} ${n1(-s * 1.6)} ${n1(-s * .2)} ${n1(-s * 1.7)}Q${n1(s * .6)} ${n1(-s * 1.7)} ${n1(s * .75)} 0Z" fill="${c}"/>`;
  k += `<path d="M${n1(s * .6)} ${n1(-s * .3)}Q${n1(s * 1.7)} ${n1(-s * .2)} ${n1(s * 1.6)} ${n1(-s * 1.4)}" stroke="${c}" stroke-width="${n1(s * .22)}" fill="none" stroke-linecap="round"/>`;
  k += `<circle cx="${n1(-s * .55)}" cy="${n1(-s * 1.95)}" r="${n1(s * .5)}" fill="${c}"/><path d="M${n1(-s * .95)} ${n1(-s * 2.1)}l${n1(-s * .1)} ${n1(-s * .6)}l${n1(s * .45)} ${n1(s * .3)}ZM${n1(-s * .2)} ${n1(-s * 2.2)}l${n1(s * .18)} ${n1(-s * .55)}l${n1(-s * .5)} ${n1(s * .2)}Z" fill="${c}"/>`;
  k += `<ellipse cx="${n1(-s * .72)}" cy="${n1(-s * 1.95)}" rx="${n1(s * .07)}" ry="${n1(s * .1)}" fill="#d9dc9a"/><ellipse cx="${n1(-s * .42)}" cy="${n1(-s * 1.95)}" rx="${n1(s * .07)}" ry="${n1(s * .1)}" fill="#d9dc9a"/>`;
  return k + '</g>';
}
// 手すりに立てかけた自転車（横向き）
// 街灯のまわりを飛ぶ蛾（小さな薄い点）
function moths(x, y, n) {
  let s = '';
  for (let i = 0; i < n; i++) { const mx = x + R(-3, 3), my = y + R(-2.5, 2.5); s += `<ellipse cx="${n1(mx)}" cy="${n1(my)}" rx=".45" ry=".22" fill="#fff1d0" opacity="${n1(R(.35, .7) * 100) / 100}" transform="rotate(${n1(R(-40, 40))} ${n1(mx)} ${n1(my)})"/>`; }
  return s;
}

// ---------- スクロールに合わせて動く生きもの（museum.js が小さな SVG として置き、歩くと進む） ----------
// 羽ばたく鳥（影絵）：胴を真ん中に、左右の翼を別々に描いて、付け根を軸に上下に振る（CSS の .wing）
function birdSVG(c, delay) {
  const wing = (d) => `<path class="wing" style="animation-delay:${n1(-delay)}s" d="M${n1(d * .3)} 0Q${n1(d * 2.8)} -2.6 ${n1(d * 5.6)} -.8Q${n1(d * 2.8)} -1 ${n1(d * .3)} .6Z" fill="${c}"/>`;
  return `<svg viewBox="-6 -3.2 12 6.4" xmlns="http://www.w3.org/2000/svg">${wing(-1)}${wing(1)}<ellipse cx="0" cy=".2" rx=".9" ry=".38" fill="${c}"/><path d="M.7 .1l.9 -.1l-.7 .35Z" fill="${c}"/></svg>`;
}
export function swimmerSVG(kind, seed = 0) {
  reseed(700 + seed);
  if (kind === 'koi') return `<svg viewBox="-5 -5.5 10 14.5" xmlns="http://www.w3.org/2000/svg">${koi(0, 0, 8, 0, [['#efe4d2', '#d9452c'], ['#efe4d2', '#d9452c'], ['#efe4d2', '#e08a3c'], ['#d9452c', '#efe4d2'], ['#efe4d2', '#3f3a36'], ['#f4ecdc', '#d9452c']][seed % 6])}</svg>`;
  // 飛んでいるカモメ（上から見た形ではなく、横から見た翼の形。影絵）
  if (kind === 'gull') return birdSVG(pick(['#7a7488', '#6f5a6e']), R(0, .4));
  // 夜の海の小舟（影絵。灯りをひとつ）
  if (kind === 'boat') return `<svg viewBox="-3 -4.2 6 5" xmlns="http://www.w3.org/2000/svg"><path d="M-2.6 0L2.6 0L2 .8L-2 .8Z" fill="#141733"/><path d="M-.2 -.1V-3.2" stroke="#141733" stroke-width=".22"/><path d="M0 -3.1L1.9 -.2H0Z" fill="#1d1f3c"/><circle cx="-.2" cy="-3.3" r=".28" fill="#ffe7a8"/>${rglow(-.2, -3.3, 1.6, '#ffe7a8', .4)}</svg>`;
  // トンボ（ホバリング）
  if (kind === 'dragonfly') return `<svg viewBox="-3 -3 6 6" xmlns="http://www.w3.org/2000/svg">${dragonfly(0, 0, 1.3, 0)}</svg>`;
  // 白い蝶（作品の蝶と同じ、白い 2 枚の羽）
  if (kind === 'butterfly') return `<svg viewBox="-3 -3 6 6" xmlns="http://www.w3.org/2000/svg">${butterfly(0, 0.6, 1.6, pick(['#fbf7ea', '#f4ecd6']), 0)}</svg>`;
  return '';
}

// 観覧車（回るもの）：脚は止まり、輪だけが回る。r を半径として、viewBox は -r-1.5 〜 r+1.5、下は脚のぶん
// 観覧車：脚（止まる）・輪（回る）・ゴンドラ（輪と逆に回って、いつも下向きに吊り下がる）を別の絵にする。
// 回るものは要素ごと回すので、中身を描き直さない。viewBox の原点が輪の中心
export const FERRIS_N = 12;
export function ferrisSVG(r, part = 'wheel') {
  const c = '#1d1f3c', steel = '#3d3f6e', R2 = r + 3, lamp = ['#ffb45a', '#e88ab8', '#ffe7a8', '#f0c890'];
  if (part === 'legs') {
    const h = r + 3.8; // 中心から地面まで（いちばん下のゴンドラが台にかからないように）
    let s = rglow(0, 0, r * 1.7, '#ff9ad0', .14);
    // A 字の脚を前後 2 組（奥は細く暗く）、筋交い、足もとの台と切符売り場
    for (const [dx, w, col] of [[.6, .35, '#15173a'], [0, .55, c]]) {
      s += `<path d="M${n1(-r * .62 + dx)} ${n1(h)}L${n1(dx)} 0L${n1(r * .62 + dx)} ${n1(h)}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linejoin="round"/>`;
      for (let t = .3; t < 1; t += .23) s += `<path d="M${n1(-r * .62 * t + dx)} ${n1(h * t)}L${n1(r * .62 * t + dx)} ${n1(h * t)}" stroke="${col}" stroke-width="${n1(w * .6)}"/>`;
      for (let t = .3; t < .95; t += .23) s += `<path d="M${n1(-r * .62 * t + dx)} ${n1(h * t)}L${n1(r * .62 * (t + .23) + dx)} ${n1(h * (t + .23))}M${n1(r * .62 * t + dx)} ${n1(h * t)}L${n1(-r * .62 * (t + .23) + dx)} ${n1(h * (t + .23))}" stroke="${col}" stroke-width="${n1(w * .35)}" opacity=".8"/>`;
    }
    s += `<path d="M${n1(-r * .9)} ${n1(h)}h${n1(r * 1.8)}v.8h${n1(-r * 1.8)}Z" fill="#15173a"/>`;
    s += `<path d="M${n1(-r * .28)} ${n1(h)}v-1.8h${n1(r * .56)}v1.8Z" fill="#20224a"/><path d="M${n1(-r * .32)} ${n1(h - 1.8)}h${n1(r * .64)}l-.4 -.6h${n1(-r * .56)}Z" fill="#e88ab8" opacity=".85"/><rect x="${n1(-r * .18)}" y="${n1(h - 1.4)}" width="${n1(r * .36)}" height=".7" fill="#ffe7a8" opacity=".9"/>`;
    for (let k = 0; k < 7; k++) s += `<circle cx="${n1(-r * .85 + k * r * .28)}" cy="${n1(h - .15)}" r=".18" fill="${lamp[k % 4]}"/>`;
    s += `<circle r="1" fill="#2a2c55"/><circle r=".55" fill="#ffe7a8"/>`;
    return `<svg viewBox="${n1(-R2)} ${n1(-R2)} ${n1(R2 * 2)} ${n1(R2 + h + 1)}" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
  }
  if (part === 'gondola') {
    // 吊り金具（原点）から下がる小さな箱。窓に灯り、屋根
    return `<svg viewBox="-1.3 0 2.6 3.4" xmlns="http://www.w3.org/2000/svg"><path d="M0 0v.7" stroke="${steel}" stroke-width=".18"/><path d="M-1 .9Q0 .4 1 .9V1Z" fill="${c}"/><rect x="-1" y=".95" width="2" height="2.1" rx=".35" fill="${c}"/><rect x="-.72" y="1.25" width="1.44" height=".95" rx=".15" fill="#ffd9a0" opacity=".9"/><path d="M0 1.25v.95" stroke="${c}" stroke-width=".12"/></svg>`;
  }
  let s = '';
  // 外と内の二重の輪、そのあいだの格子、中心からのスポーク
  s += `<circle r="${n1(r)}" stroke="${steel}" stroke-width=".4" fill="none"/><circle r="${n1(r * .86)}" stroke="${steel}" stroke-width=".25" fill="none"/><circle r="${n1(r * .22)}" stroke="${steel}" stroke-width=".3" fill="none"/>`;
  for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, b = (k + .5) / 24 * Math.PI * 2; s += `<path d="M${n1(Math.cos(a) * r * .86)} ${n1(Math.sin(a) * r * .86)}L${n1(Math.cos(b) * r)} ${n1(Math.sin(b) * r)}L${n1(Math.cos(a + Math.PI / 12) * r * .86)} ${n1(Math.sin(a + Math.PI / 12) * r * .86)}" stroke="${steel}" stroke-width=".12" fill="none"/>`; }
  for (let k = 0; k < FERRIS_N; k++) { const a = k / FERRIS_N * Math.PI * 2; s += `<path d="M${n1(Math.cos(a) * r * .22)} ${n1(Math.sin(a) * r * .22)}L${n1(Math.cos(a) * r)} ${n1(Math.sin(a) * r)}" stroke="${steel}" stroke-width=".18"/>`; }
  // 輪の電飾：外周に 36 個、スポークに沿って 4 個ずつ
  for (let k = 0; k < 36; k++) { const a = k / 36 * Math.PI * 2; s += `<circle cx="${n1(Math.cos(a) * r)}" cy="${n1(Math.sin(a) * r)}" r=".26" fill="${lamp[k % 4]}"/>`; }
  for (let k = 0; k < FERRIS_N; k++) for (let t = .38; t < .86; t += .14) { const a = k / FERRIS_N * Math.PI * 2; s += `<circle cx="${n1(Math.cos(a) * r * t)}" cy="${n1(Math.sin(a) * r * t)}" r=".14" fill="#ffe7a8" opacity=".75"/>`; }
  return `<svg viewBox="${n1(-R2)} ${n1(-R2)} ${n1(R2 * 2)} ${n1(R2 * 2)}" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
}
// 薪ストーブ（鋳物）：脚つきの箱、縁の張り出した天板、焚き口の扉（蝶番と取っ手）、灰受け、煙突は壁の丸い受け口へ。
// 焚き口のガラスの奥は、おき火で下ほど明るく、薪が 2 本交差する。炎と火の粉、壁と床に広がる火の光は museum.js
function woodStove(m, k, sw, sh, room = 30) {
  const top = 80 - sh, L = m - sw / 2, gx = m - sw * .32, gy = top + sh * .3, gw = sw * .64, gh = sh * .42, id = `ws${gid++}`;
  const P = (d, f, o) => `<path d="${d}" fill="${f}"${o != null ? ` opacity="${o}"` : ''}/>`;
  const dd = hrng(m * 3.3 + k);
  let s = stoveSurround(m, k, sw, sh, room, dd) + rglow(m, 80 - sh * .6, 16 * k, '#ff9a4a', .45);
  s += `<defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a2014"/><stop offset=".45" stop-color="#a8431f"/><stop offset=".8" stop-color="#f08a3a"/><stop offset="1" stop-color="#ffc56a"/></linearGradient>`
    + `<linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#171311"/><stop offset=".5" stop-color="#231d19"/><stop offset="1" stop-color="#1a1512"/></linearGradient></defs>`;
  // 脚（少し外に反る）
  for (const sx of [-1, 1]) s += P(`M${n1(m + sx * (sw / 2 - 1.1 * k))} 78.6L${n1(m + sx * (sw / 2 - .4 * k))} 78.6L${n1(m + sx * (sw / 2 - .05 * k))} 80.3L${n1(m + sx * (sw / 2 - .7 * k))} 80.3Z`, '#1a1512');
  // 胴（角を少し丸く）と、左右の縁の暗い面
  s += `<rect x="${n1(L)}" y="${n1(top + .9 * k)}" width="${n1(sw)}" height="${n1(sh - 1.5 * k)}" rx="${n1(.35 * k)}" fill="url(#${id}b)"/>`;
  s += P(`M${n1(L)} ${n1(top + 1 * k)}h${n1(.55 * k)}V${n1(78.8)}h${n1(-.55 * k)}Z`, '#120f0d') + P(`M${n1(L + sw - .55 * k)} ${n1(top + 1 * k)}h${n1(.55 * k)}V${n1(78.8)}h${n1(-.55 * k)}Z`, '#120f0d');
  // 天板：縁が張り出し、上の面は火の熱でほんのり赤い
  s += `<rect x="${n1(L - .45 * k)}" y="${n1(top + .15 * k)}" width="${n1(sw + .9 * k)}" height="${n1(.8 * k)}" rx="${n1(.2 * k)}" fill="#2b2420"/>` + P(`M${n1(L - .3 * k)} ${n1(top + .15 * k)}h${n1(sw + .6 * k)}v${n1(.22 * k)}h${n1(-sw - .6 * k)}Z`, '#5a4034', .8);
  // 胴の飾りの帯
  s += P(`M${n1(L + .8 * k)} ${n1(top + 1.6 * k)}h${n1(sw - 1.6 * k)}v${n1(.28 * k)}h${n1(-sw + 1.6 * k)}Z`, '#2c2521');
  // 焚き口の扉（ガラスより一回り大きい板）と蝶番・取っ手
  s += `<rect x="${n1(gx - .7 * k)}" y="${n1(gy - .7 * k)}" width="${n1(gw + 1.4 * k)}" height="${n1(gh + 1.4 * k)}" rx="${n1(.4 * k)}" fill="#2a2320"/>`;
  for (const t of [.22, .78]) s += `<rect x="${n1(gx - 1.05 * k)}" y="${n1(gy + gh * t - .35 * k)}" width="${n1(.5 * k)}" height="${n1(.7 * k)}" rx="${n1(.12 * k)}" fill="#3a302a"/>`;
  s += `<rect x="${n1(gx + gw + .25 * k)}" y="${n1(gy + gh * .28)}" width="${n1(.34 * k)}" height="${n1(gh * .44)}" rx="${n1(.17 * k)}" fill="#4a3b31"/>`;
  // ガラスの奥：おき火で下ほど明るい。交差する 2 本の薪と、薪の下の縁のおき火
  s += `<rect x="${n1(gx)}" y="${n1(gy)}" width="${n1(gw)}" height="${n1(gh)}" rx="${n1(.3 * k)}" fill="url(#${id}g)"/>`;
  const ly = gy + gh * .8;
  s += `<g transform="rotate(-9 ${n1(m)} ${n1(ly)})"><rect x="${n1(gx + gw * .1)}" y="${n1(ly - .45 * k)}" width="${n1(gw * .72)}" height="${n1(.9 * k)}" rx="${n1(.45 * k)}" fill="#2c1a12"/><rect x="${n1(gx + gw * .14)}" y="${n1(ly + .2 * k)}" width="${n1(gw * .64)}" height="${n1(.25 * k)}" rx="${n1(.12 * k)}" fill="#ff8a3a" opacity=".85"/></g>`;
  s += `<g transform="rotate(11 ${n1(m)} ${n1(ly)})"><rect x="${n1(gx + gw * .2)}" y="${n1(ly - .35 * k)}" width="${n1(gw * .7)}" height="${n1(.8 * k)}" rx="${n1(.4 * k)}" fill="#3a2116"/><rect x="${n1(gx + gw * .24)}" y="${n1(ly + .22 * k)}" width="${n1(gw * .6)}" height="${n1(.2 * k)}" rx="${n1(.1 * k)}" fill="#ffb356" opacity=".8"/></g>`;
  s += `<ellipse cx="${n1(m)}" cy="${n1(gy + gh - .25 * k)}" rx="${n1(gw * .42)}" ry="${n1(.35 * k)}" fill="#ffd27a" opacity=".75"/>`;
  // ガラスの上の縁は煤で暗く
  s += P(`M${n1(gx)} ${n1(gy + .3 * k)}Q${n1(gx)} ${n1(gy)} ${n1(gx + .3 * k)} ${n1(gy)}H${n1(gx + gw - .3 * k)}Q${n1(gx + gw)} ${n1(gy)} ${n1(gx + gw)} ${n1(gy + .3 * k)}V${n1(gy + gh * .22)}H${n1(gx)}Z`, '#2a120b', .45);
  // 灰受けの引き出し
  s += `<rect x="${n1(gx - .2 * k)}" y="${n1(gy + gh + 1.2 * k)}" width="${n1(gw + .4 * k)}" height="${n1(1.1 * k)}" rx="${n1(.2 * k)}" fill="#2a2320"/><rect x="${n1(m - .6 * k)}" y="${n1(gy + gh + 1.55 * k)}" width="${n1(1.2 * k)}" height="${n1(.35 * k)}" rx="${n1(.17 * k)}" fill="#4a3b31"/>`;
  // 扉のまわりに当たる火の照り返し
  s += P(`M${n1(gx - .7 * k)} ${n1(gy + gh + .7 * k)}h${n1(gw + 1.4 * k)}v${n1(.22 * k)}h${n1(-gw - 1.4 * k)}Z`, '#ff9a4a', .35);
  // 胴の横の空気の調整つまみと、角の鋲
  s += `<circle cx="${n1(L + sw - 1.3 * k)}" cy="${n1(gy + gh + 1.75 * k)}" r="${n1(.32 * k)}" fill="#3a302a"/><circle cx="${n1(L + sw - 1.3 * k)}" cy="${n1(gy + gh + 1.75 * k)}" r="${n1(.14 * k)}" fill="#5a4a3e"/>`;
  for (const [cx, cy] of [[L + .9 * k, top + 1.25 * k], [L + sw - .9 * k, top + 1.25 * k], [L + .9 * k, 78.2], [L + sw - .9 * k, 78.2]]) s += `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(.13 * k)}" fill="#3a302a"/>`;
  // 天板の上のやかん（銅。胴に夕方の火の照り返し、取っ手と注ぎ口）。湯気は museum.js
  { const kx = m - sw * .22, ky = top + .15 * k, kw = 3.2 * k, kh = 2.2 * k;
    s += `<ellipse cx="${n1(kx)}" cy="${n1(ky - .05 * k)}" rx="${n1(kw * .42)}" ry="${n1(.18 * k)}" fill="#1a1512" opacity=".6"/>`;
    s += P(`M${n1(kx - kw / 2)} ${n1(ky)}Q${n1(kx - kw * .55)} ${n1(ky - kh * .8)} ${n1(kx - kw * .2)} ${n1(ky - kh)}H${n1(kx + kw * .2)}Q${n1(kx + kw * .55)} ${n1(ky - kh * .8)} ${n1(kx + kw / 2)} ${n1(ky)}Z`, '#8f5236');
    s += P(`M${n1(kx - kw * .46)} ${n1(ky - kh * .2)}Q${n1(kx - kw * .5)} ${n1(ky - kh * .78)} ${n1(kx - kw * .18)} ${n1(ky - kh * .96)}H${n1(kx - kw * .02)}Q${n1(kx - kw * .3)} ${n1(ky - kh * .7)} ${n1(kx - kw * .26)} ${n1(ky - kh * .2)}Z`, '#b06a42', .9);
    s += P(`M${n1(kx + kw * .12)} ${n1(ky)}Q${n1(kx + kw * .5)} ${n1(ky - kh * .3)} ${n1(kx + kw * .45)} ${n1(ky - kh * .85)}Q${n1(kx + kw * .55)} ${n1(ky - kh * .3)} ${n1(kx + kw / 2)} ${n1(ky)}Z`, '#6e3d28', .8);
    s += `<rect x="${n1(kx - kw * .16)}" y="${n1(ky - kh - .35 * k)}" width="${n1(kw * .32)}" height="${n1(.4 * k)}" rx="${n1(.15 * k)}" fill="#6e3d28"/>`;
    s += `<path d="M${n1(kx - kw * .34)} ${n1(ky - kh * .9)}Q${n1(kx)} ${n1(ky - kh * 1.9)} ${n1(kx + kw * .34)} ${n1(ky - kh * .9)}" stroke="#2a2320" stroke-width="${n1(.28 * k)}" fill="none" stroke-linecap="round"/>`;
    s += P(`M${n1(kx - kw * .44)} ${n1(ky - kh * .45)}L${n1(kx - kw * .82)} ${n1(ky - kh * .95)}L${n1(kx - kw * .74)} ${n1(ky - kh * 1.02)}L${n1(kx - kw * .36)} ${n1(ky - kh * .7)}Z`, '#7d4630');
    woodStove.kettle = [kx - kw * .8, ky - kh * 1.02];
  }
  // 煙突：天板から上へ。途中に継ぎ目の帯、上は曲がって壁の丸い受け口へ入る
  const px = m + 2 * k, pw = 1.4 * k, py = 55;
  s += P(`M${n1(px)} ${n1(top + .2 * k)}V${n1(py)}h${n1(pw)}V${n1(top + .2 * k)}Z`, '#1d1916') + P(`M${n1(px + pw * .62)} ${n1(top + .2 * k)}V${n1(py)}h${n1(pw * .38)}V${n1(top + .2 * k)}Z`, '#15110f');
  for (const yy of [top - 2.2 * k, py + 2.4 * k]) s += `<rect x="${n1(px - .15 * k)}" y="${n1(yy)}" width="${n1(pw + .3 * k)}" height="${n1(.45 * k)}" rx="${n1(.1 * k)}" fill="#2a2522"/>`;
  s += `<circle cx="${n1(px + pw / 2)}" cy="${n1(py - .3 * k)}" r="${n1(1.55 * k)}" fill="#2a2320"/><circle cx="${n1(px + pw / 2)}" cy="${n1(py - .3 * k)}" r="${n1(1.2 * k)}" fill="#1c1714"/>`;
  s += P(`M${n1(px)} ${n1(py + .5 * k)}V${n1(py - .3 * k)}A${n1(pw / 2)} ${n1(pw / 2)} 0 0 1 ${n1(px + pw)} ${n1(py - .3 * k)}V${n1(py + .5 * k)}Z`, '#1d1916');
  // 煙突のダンパーの取っ手と、煙突の温度計（丸い文字盤、針は火の強さのあたり）
  const dy = (top + py) / 2;
  s += `<rect x="${n1(px - .9 * k)}" y="${n1(dy - .12 * k)}" width="${n1(pw + 1.8 * k)}" height="${n1(.24 * k)}" rx="${n1(.12 * k)}" fill="#2a2522"/><circle cx="${n1(px + pw + .9 * k)}" cy="${n1(dy)}" r="${n1(.28 * k)}" fill="#3a302a"/>`;
  const ty = top - 1 * k;
  s += `<circle cx="${n1(px + pw / 2)}" cy="${n1(ty)}" r="${n1(.62 * k)}" fill="#3a302a"/><circle cx="${n1(px + pw / 2)}" cy="${n1(ty)}" r="${n1(.5 * k)}" fill="#d9c9a8"/><path d="M${n1(px + pw / 2 - .35 * k)} ${n1(ty + .1 * k)}A${n1(.36 * k)} ${n1(.36 * k)} 0 0 1 ${n1(px + pw / 2 + .35 * k)} ${n1(ty + .1 * k)}" stroke="#c7703e" stroke-width="${n1(.1 * k)}" fill="none"/><path d="M${n1(px + pw / 2)} ${n1(ty)}L${n1(px + pw / 2 + .22 * k)} ${n1(ty - .28 * k)}" stroke="#2a2320" stroke-width="${n1(.07 * k)}" stroke-linecap="round"/>`;
  return s;
}
// ストーブのまわり：背の壁に耐熱のレンガ（上に石の笠木）、床に石の炉台、左に薪を積んだ鉄のラック、右に火かき棒などの道具立て
function stoveSurround(m, k, sw, sh, room, d) {
  const top = 80 - sh;
  let s = '';
  // 耐熱のレンガの壁（目地は暗い色の地に、レンガを少しずつ色違いで並べる）
  const bw = Math.min(sw + 7 * k, room * 2 - 2), bx0 = m - bw / 2, by0 = 52, by1 = 79.4, rh = .95 * k, bl = 2.3 * k;
  s += `<rect x="${n1(bx0)}" y="${n1(by0)}" width="${n1(bw)}" height="${n1(by1 - by0)}" fill="#3a2620"/>`;
  s += `<clipPath id="brk${gid}"><rect x="${n1(bx0)}" y="${n1(by0)}" width="${n1(bw)}" height="${n1(by1 - by0)}"/></clipPath><g clip-path="url(#brk${gid++})">`;
  for (let y = by0 + .12, r = 0; y < by1; y += rh, r++) for (let x = bx0 - (r % 2) * bl / 2; x < bx0 + bw; x += bl) s += `<rect x="${n1(x + .1)}" y="${n2(y)}" width="${n1(bl - .2)}" height="${n2(rh - .2)}" rx=".08" fill="${['#6e4434', '#7a4a38', '#5f3a2d', '#744636', '#664033'][Math.floor(d() * 5)]}"/>`;
  s += '</g>';
  // レンガの下ほど、火の熱で煤けて暗い
  const [cg, cd] = lgrad([[0, '#1a110c', 0], [1, '#1a110c', .35]]);
  s += `<defs>${cd}</defs><rect x="${n1(bx0)}" y="${n1(top - 4)}" width="${n1(bw)}" height="${n1(by1 - top + 4)}" fill="url(#${cg})"/>`;
  s += `<rect x="${n1(bx0 - .5)}" y="${n1(by0 - .9)}" width="${n1(bw + 1)}" height=".9" rx=".2" fill="#6f665c"/><rect x="${n1(bx0 - .5)}" y="${n1(by0 - .9)}" width="${n1(bw + 1)}" height=".25" fill="#8c8276"/>`;
  // 石の炉台：奥が狭く手前が広い台形。厚みの面と、石の継ぎ目
  const hb = m - (sw / 2 + 3 * k), hf = m + (sw / 2 + 3 * k), fy0 = 79.3, fy1 = 84.2, sp = 1.8 * k;
  s += `<path d="M${n1(hb)} ${fy0}L${n1(hf)} ${fy0}L${n1(hf + sp)} ${fy1}L${n1(hb - sp)} ${fy1}Z" fill="#4a4540"/>`;
  s += `<path d="M${n1(hb - sp)} ${fy1}L${n1(hf + sp)} ${fy1}V${n1(fy1 + .8)}H${n1(hb - sp)}Z" fill="#2c2926"/>`;
  for (let i = 1; i < 4; i++) { const t = i / 4, xa = hb + (hf - hb) * t, xb = hb - sp + (hf - hb + sp * 2) * t; s += `<path d="M${n1(xa)} ${fy0}L${n1(xb)} ${fy1}" stroke="#34302c" stroke-width=".22"/>`; }
  s += `<path d="M${n1(hb - sp * .5)} ${n1((fy0 + fy1) / 2)}H${n1(hf + sp * .5)}" stroke="#34302c" stroke-width=".2"/>`;
  for (let i = 0; i < 6; i++) { const t = d(), yy = fy0 + (fy1 - fy0) * d(); s += `<ellipse cx="${n1(hb + (hf - hb) * t)}" cy="${n1(yy)}" rx="${n1(.6 + d() * 1.2)}" ry=".25" fill="${d() < .5 ? '#57514b' : '#3e3a36'}" opacity=".7"/>`; }
  s += `<path d="M${n1(m - gwOf(sw) / 2)} ${fy0 + .2}H${n1(m + gwOf(sw) / 2)}L${n1(m + gwOf(sw) * .8)} ${fy1}H${n1(m - gwOf(sw) * .8)}Z" fill="#ff9a4a" opacity=".16"/>`;
  // 右（道具立てのさらに右）：鉄の薪ラック（2 本の脚）に、割った薪を俵に積む（切り口は明るい木の色に年輪）。左は床のレコードの山があるので置かない
  const lx = hf + sp + 6.2 * k;
  if (lx - m + 2.2 * k < room - 1) {
    const lw = 3.6 * k, ly = 83, lh = 3.4 * k;
    for (let r = 0, row = 0; r < 3; r++) for (let i = 0; i < 3 - r; i++, row++) { const cx = lx - lw / 2 + lw * (i + .5 + r * .5) / 3, cy = ly - .5 * k - r * .82 * k - .45 * k, rr = .5 * k * (.9 + d() * .2); s += `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(rr)}" fill="#6b4a30"/><circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(rr * .78)}" fill="#c69a64"/><circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(rr * .45)}" fill="none" stroke="#a87c4c" stroke-width="${n1(.06 * k)}"/><path d="M${n1(cx - rr * .1)} ${n1(cy - rr * .1)}l${n1(rr * .5)} ${n1(-rr * .35)}" stroke="#8a6440" stroke-width="${n1(.05 * k)}"/>`; }
    for (const sx of [-1, 1]) s += `<path d="M${n1(lx + sx * lw * .55)} ${n1(ly)}V${n1(ly - lh * .72)}" stroke="#1d1916" stroke-width="${n1(.22 * k)}" stroke-linecap="round"/>`;
    s += `<path d="M${n1(lx - lw * .55)} ${n1(ly - .1)}Q${n1(lx)} ${n1(ly + .5)} ${n1(lx + lw * .55)} ${n1(ly - .1)}" stroke="#1d1916" stroke-width="${n1(.22 * k)}" fill="none"/>`;
    s += `<ellipse cx="${n1(lx)}" cy="${n1(ly + .2)}" rx="${n1(lw * .6)}" ry=".35" fill="#1a110a" opacity=".45"/>`;
  }
  // 右：道具立て（火かき棒・ほうき・シャベル）
  const tx = hf + sp + 1.6 * k;
  if (tx - m < room - 1) {
    const ty = 82.6, th = 8 * k;
    s += `<ellipse cx="${n1(tx)}" cy="${n1(ty + .2)}" rx="${n1(1.1 * k)}" ry=".3" fill="#1a110a" opacity=".45"/><rect x="${n1(tx - .9 * k)}" y="${n1(ty - .3 * k)}" width="${n1(1.8 * k)}" height="${n1(.35 * k)}" rx="${n1(.15 * k)}" fill="#1d1916"/>`;
    s += `<path d="M${n1(tx)} ${n1(ty - .2 * k)}V${n1(ty - th)}" stroke="#1d1916" stroke-width="${n1(.16 * k)}"/><circle cx="${n1(tx)}" cy="${n1(ty - th - .25 * k)}" r="${n1(.3 * k)}" fill="#3a302a"/>`;
    s += `<path d="M${n1(tx - .9 * k)} ${n1(ty - th * .82)}H${n1(tx + .9 * k)}" stroke="#1d1916" stroke-width="${n1(.14 * k)}"/>`;
    s += `<path d="M${n1(tx - .6 * k)} ${n1(ty - th * .82)}L${n1(tx - .75 * k)} ${n1(ty - .9 * k)}" stroke="#2a2522" stroke-width="${n1(.1 * k)}"/><path d="M${n1(tx - .75 * k)} ${n1(ty - .9 * k)}l${n1(-.3 * k)} ${n1(.5 * k)}" stroke="#2a2522" stroke-width="${n1(.1 * k)}"/>`;
    s += `<path d="M${n1(tx + .6 * k)} ${n1(ty - th * .82)}L${n1(tx + .7 * k)} ${n1(ty - 1.8 * k)}" stroke="#6b4a30" stroke-width="${n1(.12 * k)}"/><path d="M${n1(tx + .4 * k)} ${n1(ty - 1.9 * k)}h${n1(.6 * k)}l${n1(.2 * k)} ${n1(1.3 * k)}h${n1(-1 * k)}Z" fill="#8a6a3e"/>`;
    s += `<path d="M${n1(tx + .1 * k)} ${n1(ty - th * .82)}L${n1(tx + .15 * k)} ${n1(ty - 1.2 * k)}" stroke="#2a2522" stroke-width="${n1(.1 * k)}"/><path d="M${n1(tx - .25 * k)} ${n1(ty - 1.3 * k)}h${n1(.8 * k)}l${n1(-.1 * k)} ${n1(.9 * k)}h${n1(-.6 * k)}Z" fill="#2a2522"/>`;
  }
  return s;
}
function gwOf(sw) { return sw * .64; }
// 薪ストーブの火（揺れる炎と、舞い上がる火の粉）
export function fireSVG() {
  let s = '<svg viewBox="-4 -12 8 13" xmlns="http://www.w3.org/2000/svg">';
  s += `<g class="flame"><path d="M-2.4 0Q-2.4 -3 -1 -4.5Q-1.4 -2 0 -1Q.4 -3.6 1.6 -5.2Q2.4 -2.6 2.4 0Z" fill="#e8874a"/><path d="M-1.2 0Q-1.3 -2 -.4 -3Q0 -1.6 .8 -2.6Q1.2 -1.2 1.2 0Z" fill="#f2c56a"/></g>`;
  for (let k = 0; k < 6; k++) s += `<circle class="ember" style="--d:${n1(k * .45)}s;--dx:${n1((k % 3 - 1) * .8)}px" cx="${n1(-1.5 + k * .6)}" cy="-1" r=".18" fill="#ffd36a"/>`;
  return s + '</svg>';
}
// 窓の外に舞う雪（窓の枠の中だけ）
export function windowSnowSVG(w, h) {
  let s = `<svg viewBox="0 0 ${n1(w)} ${n1(h)}" xmlns="http://www.w3.org/2000/svg">`;
  reseed(77);
  for (let k = 0; k < 22; k++) s += `<circle class="wsnow" style="--d:${n1(-R(0, 9))}s;--t:${n1(R(6, 10))}s;--dx:${n1(R(-1.5, 1.5))}px" cx="${n1(R(0, w))}" cy="0" r="${n1(R(.18, .4))}" fill="#eef2fb" opacity="${n1(R(.5, .9) * 100) / 100}"/>`;
  return s + '</svg>';
}
// 灯台の光の帯（回る）。viewBox の中心が灯台の灯り
export function beamSVG() {
  return `<svg viewBox="-40 -40 80 80" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bm" x1="0" x2="1"><stop offset="0" stop-color="#ffe7a8" stop-opacity=".8"/><stop offset=".6" stop-color="#ffe7a8" stop-opacity=".25"/><stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/></linearGradient></defs><g><path d="M0 -.8L40 -9L40 9L0 .8Z" fill="url(#bm)"/></g></svg>`;
}
// 立ち止まったときの小さな動き：鳥（影絵）、トンボ、流れ星、火の粉のはじけ、跳ねる鯉
export function flyerSVG(kind) {
  if (kind === 'koijump') { reseed(3); return `<svg viewBox="-3 -5 6 12" xmlns="http://www.w3.org/2000/svg">${koi(0, 0, 8, 0, ['#e07a48', '#f2eee2'])}</svg>`; }
  if (kind === 'bird') return birdSVG('#2f3a26', 0);
  if (kind === 'dragonfly') { reseed(5); return `<svg viewBox="-3 -3 6 6" xmlns="http://www.w3.org/2000/svg">${dragonfly(0, 0, 1.4, 0)}</svg>`; }
  if (kind === 'star') return `<svg viewBox="-12 -1 14 2" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="st" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient></defs><path d="M-12 -.3H0V.3H-12Z" fill="url(#st)"/><circle r=".6" fill="#fff"/></svg>`;
  if (kind === 'spark') return `<svg viewBox="-3 -3 6 6" xmlns="http://www.w3.org/2000/svg"><circle r=".5" fill="#ffd36a"/><circle cx="1.2" cy="-1" r=".3" fill="#ffb45a"/><circle cx="-1" cy="-1.4" r=".25" fill="#ffd36a"/></svg>`;
  return '';
}

// ---------- 幕：部屋の出入りで閉じる、葉のカーテン ----------
// 1 枚の絵をスライドさせると、ふちが縦一直線に切れて見える。
// そこで葉のかたまりを 1 つずつ別の絵にして、中央から順に、奥行きごとに違う速さ・回転で左右へかき分ける
// （パララックスで葉をかき分けるリビールの定番の作り方）。どのかたまりも絵の中に収まるよう余白をとって描く
// 葉のまり：外側の輪から内側へ、明るくなりながら重ねて、こんもりしたふくらみを出す
function leafBall(cx, cy, r, tones) {
  let s = '';
  const base = [[0, 0, .62], ...Array.from({ length: 8 }, (_, i) => { const a = i / 8 * Math.PI * 2 + R(-.2, .2); return [Math.cos(a) * r * .42, Math.sin(a) * r * .42, R(.4, .5)]; })];
  s += base.map(([x, y, k]) => `<circle cx="${n1(cx + x)}" cy="${n1(cy + y)}" r="${n1(r * k)}" fill="${tones[0]}"/>`).join('');
  const rings = [[.8, 16, .44, [0, 1]], [.6, 13, .42, [1, 1, 2]], [.38, 10, .38, [1, 2, 3]], [.18, 5, .34, [2, 3]]];
  for (const [rad, cnt, len, ti] of rings) {
    const off = R(0, 360);
    for (let i = 0; i < cnt; i++) {
      const a = off + i / cnt * 360 + R(-9, 9), d = r * rad * R(.9, 1.08);
      const x = cx + Math.sin(a * D) * d, y = cy - Math.cos(a * D) * d, l = r * len * R(.88, 1.1);
      const c = tones[Math.min(tones.length - 1, pick(ti))];
      s += oval(x, y, l, l * .46, a + R(-32, 32), c, { rib: l > 4 });
    }
  }
  return s;
}
export function curtainLeaves(W, tones) {
  reseed(71);
  const T = [...tones, light(tones[tones.length - 1], .12)];
  const pieces = [];
  const add = (x, y, r, body, depth) => {
    const side = x < W / 2 ? -1 : 1, box = r * 2.7, dist = side < 0 ? x + box / 2 + 4 : W - x + box / 2 + 4;
    pieces.push({
      x: x - box / 2, y: y - box / 2, box, depth,
      dx: side * (dist + R(4, 18) * depth), dy: (y - 50) * R(.1, .45) + R(-8, 8),
      rot: side * R(10, 28) * depth, sc: .04 + depth * .08,
      delay: Math.max(0, .5 * Math.abs(x - W / 2) / (W / 2) + R(-.1, .12)),
      svg: [box, body(box / 2, box / 2)],
    });
  };
  // 奥：暗いまりを六角形の格子に並べて、閉じたときに必ずすき間なく覆う
  const sp = 21;
  for (let row = 0, y = -4; y < 110; row++, y += sp * .87) {
    for (let x = -6 + (row % 2) * sp / 2; x < W + 12; x += sp) {
      const r = R(15, 18), xx = x + R(-2, 2), yy = y + R(-2, 2);
      add(xx, yy, r, (cx, cy) => leafBall(cx, cy, r, [T[0], T[0], T[1], T[1], T[2]]), 1);
    }
  }
  // 中：少し明るいまりを散らす
  for (let i = 0; i < Math.round(W / 7); i++) {
    const r = R(9, 13), x = R(-4, W + 4), y = R(-2, 104);
    add(x, y, r, (cx, cy) => leafBall(cx, cy, r, [T[1], T[1], T[2], T[3], T[4]]), 1.35);
  }
  // 手前：大きな葉の枝が上下から
  for (let i = 0; i < Math.round(W / 14); i++) {
    const top = i % 2 === 0, x = R(0, W), r = R(13, 17), len = r * 1.1, ang = top ? 180 + R(-35, 35) : R(-35, 35);
    add(x, top ? R(4, 16) : R(84, 96), r, (cx, cy) => twig(cx - Math.sin(ang * D) * len * .5, cy + Math.cos(ang * D) * len * .5, len, ang, [T[1], T[2], T[3], T[4]], { n: 6, leaf: r * .36, spread: 50, shrink: .3, bend: R(-4, 4), kind: 'oval', stem: dark(T[0], .3), twigs: true, backSide: 1 }), 1.7);
  }
  // 舞う葉
  for (let i = 0; i < Math.round(W / 6); i++) {
    const r = R(1.6, 2.6), x = R(0, W), y = R(0, 100), a = R(0, 360), c = pick(T.slice(2));
    add(x, y, r, (cx, cy) => oval(cx - Math.sin(a * D) * r * .5, cy + Math.cos(a * D) * r * .5, r, r * .46, a, c, { rib: true }), 2.4);
    const q = pieces[pieces.length - 1]; q.rot = R(-220, 220); q.dy += R(-20, 30); q.delay *= .6; q.leaf = true;
  }
  return pieces;
}

// ---------- 夜更けの森の小屋（最後の部屋） ----------
function shelf(x, y, w) {
  let s = `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="1.4" fill="#8a5f3a"/><rect x="${n1(x)}" y="${n1(y + 1.4)}" width="${n1(w)}" height=".5" fill="#5e3f26"/>`;
  let bx = x + 1;
  while (bx < x + w - 3) {
    if (rnd() < .18) { s += oval(bx + 1.8, y, R(3, 4.5), 1.4, R(-20, 20), pick(['#699053', '#3d5534', '#5a8a48'])); bx += 3.5; continue; }
    const bw = R(1.2, 2.4), bh = R(5, 8.5);
    s += `<rect x="${n1(bx)}" y="${n1(y - bh)}" width="${n1(bw)}" height="${n1(bh)}" fill="${pick(['#a8764a', '#6e4526', '#9e5f55', '#b99653', '#6f8a73', '#8c8d78'])}"/><rect x="${n1(bx + bw * .2)}" y="${n1(y - bh * .75)}" width="${n1(bw * .6)}" height=".4" fill="rgba(255,255,255,.3)"/>`;
    bx += bw + R(.1, .4);
  }
  return s;
}
// 壁に掛けたスケートボード（裏を見せて縦に掛ける）：丸いノーズとテール、トラックとウィール、デッキ裏のグラフィック
function skateboard(x, y, h, c, c2) {
  const w = h * .26, r = w / 2, cx = x;
  let s = `<rect x="${n1(cx - w / 2 + .3)}" y="${n1(y + .5)}" width="${n1(w)}" height="${n1(h)}" rx="${n1(r)}" fill="#000" opacity=".25"/>`; // 壁に落ちる影
  s += `<rect x="${n1(cx - w / 2)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}" rx="${n1(r)}" fill="${c}"/>`;
  s += `<rect x="${n1(cx - w / 2)}" y="${n1(y)}" width="${n1(w * .22)}" height="${n1(h)}" rx="${n1(r * .3)}" fill="#000" opacity=".12"/>`; // 板の厚み
  // デッキ裏のグラフィック：斜めの太い帯と丸（作品の色で）
  s += `<path d="M${n1(cx - w / 2)} ${n1(y + h * .52)}L${n1(cx + w / 2)} ${n1(y + h * .36)}L${n1(cx + w / 2)} ${n1(y + h * .48)}L${n1(cx - w / 2)} ${n1(y + h * .64)}Z" fill="${c2}" opacity=".85"/>`;
  s += `<circle cx="${n1(cx)}" cy="${n1(y + h * .72)}" r="${n1(w * .22)}" fill="none" stroke="${c2}" stroke-width="${n1(w * .07)}" opacity=".85"/>`;
  // トラックとウィール（前後）
  for (const t of [.2, .8]) {
    const ty = y + h * t;
    s += `<rect x="${n1(cx - w * .42)}" y="${n1(ty - w * .1)}" width="${n1(w * .84)}" height="${n1(w * .2)}" rx="${n1(w * .06)}" fill="#8a8a92"/>`;
    for (const d of [-1, 1]) s += `<rect x="${n1(cx + d * w * .5 - w * .14)}" y="${n1(ty - w * .2)}" width="${n1(w * .28)}" height="${n1(w * .4)}" rx="${n1(w * .1)}" fill="#e8dcc0"/>`;
  }
  s += `<path d="M${n1(cx)} ${n1(y - 1.2)}v1.4" stroke="#2a1c12" stroke-width=".3"/><circle cx="${n1(cx)}" cy="${n1(y - 1.3)}" r=".35" fill="#b8925e"/>`; // 掛けている釘
  return s;
}
function pot(x, y, s, c = '#b08a64') {
  track(x - s * 1.4, y - s * 2.2); track(x + s * 1.4, y);
  let out = `<path d="M${n1(x - s * .5)} ${n1(y - s * .9)}h${n1(s)}l${n1(-s * .12)} ${n1(s * .9)}h${n1(-s * .76)}Z" fill="${c}"/><path d="M${n1(x - s * .5)} ${n1(y - s * .9)}h${n1(s * .45)}l${n1(-s * .04)} ${n1(s * .9)}h${n1(-s * .3)}Z" fill="${light(c, .12)}"/>`;
  for (let i = 0; i < 5; i++) out += monstera(x, y - s * .9, s * R(1.1, 1.6), -90 + (i - 2) * 38 + R(-8, 8), pick(['#4f7a45', '#3d5c36', '#5a8a48']), { cls: '' });
  return out;
}
// ---------- 小屋の描き込み：ギター、スツールとマグ、レコードの山、眠る猫、スキー板、コート掛け、壁の灯り、窓辺の小物、ドライハーブ ----------
// 壁に立てかけたアコースティックギター（少し傾けて）
function guitar(x, y, h, c = '#c98a4a') {
  track(x - h * .3, y - h); track(x + h * .3, y + .5);
  const cd = dark(c, .25), bw = h * .22;
  let g2 = `<g transform="rotate(-8 ${n1(x)} ${n1(y)})">`;
  g2 += `<ellipse cx="${n1(x)}" cy="${n1(y + .4)}" rx="${n1(bw * 1.1)}" ry=".7" fill="#000" opacity=".3"/>`;
  g2 += `<path d="M${n1(x - bw)} ${n1(y - bw * .9)}C${n1(x - bw * 1.1)} ${n1(y - bw * 2.1)} ${n1(x - bw * .55)} ${n1(y - bw * 2.1)} ${n1(x - bw * .6)} ${n1(y - bw * 2.5)}C${n1(x - bw * .65)} ${n1(y - bw * 3.3)} ${n1(x + bw * .65)} ${n1(y - bw * 3.3)} ${n1(x + bw * .6)} ${n1(y - bw * 2.5)}C${n1(x + bw * .55)} ${n1(y - bw * 2.1)} ${n1(x + bw * 1.1)} ${n1(y - bw * 2.1)} ${n1(x + bw)} ${n1(y - bw * .9)}C${n1(x + bw)} ${n1(y + .2)} ${n1(x - bw)} ${n1(y + .2)} ${n1(x - bw)} ${n1(y - bw * .9)}Z" fill="${c}"/>`;
  g2 += `<circle cx="${n1(x)}" cy="${n1(y - bw * 1.6)}" r="${n1(bw * .38)}" fill="#3a2718"/><circle cx="${n1(x)}" cy="${n1(y - bw * 1.6)}" r="${n1(bw * .46)}" fill="none" stroke="${cd}" stroke-width=".18"/>`;
  g2 += `<rect x="${n1(x - bw * .18)}" y="${n1(y - h)}" width="${n1(bw * .36)}" height="${n1(h - bw * 3)}" fill="#3a2718"/><rect x="${n1(x - bw * .22)}" y="${n1(y - h)}" width="${n1(bw * .44)}" height="${n1(bw * .7)}" fill="#1d140d"/>`;
  g2 += `<rect x="${n1(x - bw * .5)}" y="${n1(y - bw * .8)}" width="${n1(bw)}" height="${n1(bw * .22)}" fill="#1d140d"/>`;
  for (let k = -2; k <= 2; k++) g2 += `<path d="M${n1(x + k * bw * .06)} ${n1(y - h + bw * .3)}L${n1(x + k * bw * .08)} ${n1(y - bw * .7)}" stroke="#e8dcc0" stroke-width=".08"/>`;
  return g2 + '</g>';
}
// 小さなスツールと、湯気の立つマグ
function stoolMug(x, y, s) {
  track(x - s * 1.2, y - s * 2.6); track(x + s * 1.2, y + .4);
  let o = `<ellipse cx="${n1(x)}" cy="${n1(y + .3)}" rx="${n1(s * 1.1)}" ry=".5" fill="#000" opacity=".3"/>`;
  o += `<path d="M${n1(x - s * .85)} ${n1(y)}L${n1(x - s * .6)} ${n1(y - s * 1.6)}M${n1(x + s * .85)} ${n1(y)}L${n1(x + s * .6)} ${n1(y - s * 1.6)}M${n1(x)} ${n1(y)}V${n1(y - s * 1.6)}" stroke="#4a3322" stroke-width="${n1(s * .16)}" stroke-linecap="round"/>`;
  o += `<ellipse cx="${n1(x)}" cy="${n1(y - s * 1.6)}" rx="${n1(s)}" ry="${n1(s * .32)}" fill="#8a5f3a"/><ellipse cx="${n1(x)}" cy="${n1(y - s * 1.7)}" rx="${n1(s * .95)}" ry="${n1(s * .28)}" fill="#a8764a"/>`;
  const mw = s * .42, my = y - s * 1.75;
  o += `<rect x="${n1(x - mw / 2)}" y="${n1(my - mw * 1.1)}" width="${n1(mw)}" height="${n1(mw * 1.1)}" rx=".1" fill="#e8e0d0"/><path d="M${n1(x + mw / 2)} ${n1(my - mw * .85)}q${n1(mw * .5)} ${n1(-mw * .05)} 0 ${n1(mw * .5)}" stroke="#e8e0d0" stroke-width=".18" fill="none"/><rect x="${n1(x - mw / 2)}" y="${n1(my - mw * .5)}" width="${n1(mw)}" height="${n1(mw * .18)}" fill="#b8604a"/>`;
  o += `<path d="M${n1(x - mw * .15)} ${n1(my - mw * 1.3)}q${n1(-mw * .3)} ${n1(-mw * .6)} 0 ${n1(-mw * 1.2)}M${n1(x + mw * .15)} ${n1(my - mw * 1.4)}q${n1(mw * .3)} ${n1(-mw * .6)} 0 ${n1(-mw * 1.1)}" stroke="#fff" stroke-width=".12" fill="none" opacity=".45"/>`;
  return o;
}
// レコードの山（斜めに重ねたジャケット）と、立てかけた 1 枚
function vinylStack(x, y, s) {
  track(x - s * 1.4, y - s * 2.4); track(x + s * 1.4, y + .3);
  let o = `<ellipse cx="${n1(x)}" cy="${n1(y + .2)}" rx="${n1(s * 1.2)}" ry=".45" fill="#000" opacity=".3"/>`;
  const cols = ['#b8604a', '#3f5d59', '#d4b884', '#6b4a7a', '#2a2733', '#8fa8b0'];
  for (let k = 0; k < 6; k++) o += `<rect x="${n1(x - s + R(-.15, .15))}" y="${n1(y - (k + 1) * s * .14)}" width="${n1(s * 2)}" height="${n1(s * .14)}" fill="${cols[k % cols.length]}"/>`;
  pick(cols); // 立てかけたジャケットはやめた（本人の希望）。乱数の順番を変えないように、選ぶ処理だけ残す
  return o;
}
// クッションの上で丸くなって眠る猫
function catSleeping(x, y, s, c = '#4a3a30') {
  track(x - s * 1.8, y - s * 1.3); track(x + s * 1.8, y + .3);
  let o = `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(s * 1.8)}" ry="${n1(s * .6)}" fill="#7a3f33"/><ellipse cx="${n1(x)}" cy="${n1(y - s * .15)}" rx="${n1(s * 1.6)}" ry="${n1(s * .45)}" fill="#8d4a3a"/>`;
  o += `<ellipse cx="${n1(x)}" cy="${n1(y - s * .55)}" rx="${n1(s * 1.15)}" ry="${n1(s * .6)}" fill="${c}"/>`;
  o += `<path d="M${n1(x + s * .9)} ${n1(y - s * .35)}Q${n1(x + s * 1.5)} ${n1(y - s * .1)} ${n1(x + s * .3)} ${n1(y - s * .05)}" stroke="${c}" stroke-width="${n1(s * .22)}" fill="none" stroke-linecap="round"/>`;
  o += `<circle cx="${n1(x - s * .75)}" cy="${n1(y - s * .7)}" r="${n1(s * .42)}" fill="${c}"/><path d="M${n1(x - s * 1.05)} ${n1(y - s * .95)}l${n1(-s * .12)} ${n1(-s * .45)}l${n1(s * .38)} ${n1(s * .22)}ZM${n1(x - s * .5)} ${n1(y - s * 1.02)}l${n1(s * .18)} ${n1(-s * .42)}l${n1(-s * .42)} ${n1(s * .15)}Z" fill="${c}"/>`;
  o += `<path d="M${n1(x - s * .95)} ${n1(y - s * .68)}q${n1(s * .1)} ${n1(s * .08)} ${n1(s * .2)} 0M${n1(x - s * .68)} ${n1(y - s * .68)}q${n1(s * .1)} ${n1(s * .08)} ${n1(s * .2)} 0" stroke="#1a1512" stroke-width=".1" fill="none"/>`;
  o += `<ellipse cx="${n1(x - s * .2)}" cy="${n1(y - s * .85)}" rx="${n1(s * .5)}" ry="${n1(s * .2)}" fill="${light(c, .18)}" opacity=".6"/>`;
  return o;
}
// 壁に立てかけたスキー板とストック、そばのブーツ
function skis(x, y, h) {
  track(x - 3, y - h); track(x + 4, y + .4);
  let o = `<ellipse cx="${n1(x + .5)}" cy="${n1(y + .2)}" rx="3" ry=".5" fill="#000" opacity=".3"/>`;
  for (const [dx, c] of [[-.6, '#3f5d59'], [.6, '#4a6d68']]) o += `<g transform="rotate(-6 ${n1(x + dx)} ${n1(y)})"><rect x="${n1(x + dx - .55)}" y="${n1(y - h)}" width="1.1" height="${n1(h)}" rx=".5" fill="${c}"/><rect x="${n1(x + dx - .35)}" y="${n1(y - h * .55)}" width=".7" height="${n1(h * .12)}" fill="#1d1916"/><path d="M${n1(x + dx - .3)} ${n1(y - h * .92)}h.6" stroke="#e2b36f" stroke-width=".3"/></g>`;
  for (const dx of [2.2, 2.9]) o += `<path d="M${n1(x + dx)} ${n1(y)}L${n1(x + dx - .6)} ${n1(y - h * .8)}" stroke="#8a8a8a" stroke-width=".22"/><circle cx="${n1(x + dx - .55)}" cy="${n1(y - h * .78)}" r=".35" fill="#2a2733"/><circle cx="${n1(x + dx - .05)}" cy="${n1(y - 1.2)}" r=".6" fill="none" stroke="#2a2733" stroke-width=".18"/>`;
  o += `<path d="M${n1(x - 3.2)} ${n1(y)}v-2.6q0 -.8 .8 -.8h1.4v1.6h.8v1.8Z" fill="#6b4a2e"/><path d="M${n1(x - 3.2)} ${n1(y - 1)}h3" stroke="#3a2718" stroke-width=".25"/><path d="M${n1(x - 2.6)} ${n1(y - 3.1)}h1.2" stroke="#e8dcc0" stroke-width=".35"/>`;
  return o;
}
// コート掛け：壁の板に木のフック、ニット帽とジャケットとマフラー
// 小屋の壁：天井の太い梁、腰板と見切りの縁、壁の上下の暗がり（奥行き）
function cabinWallDetail(x0, x1) {
  const d = hrng(x0 * 4.1 + x1);
  let s = `<rect x="${n1(x0)}" y="-5" width="${n1(x1 - x0)}" height="85" fill="url(#cabShade)"/>`;
  s = `<defs><linearGradient id="cabShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140c07" stop-opacity=".45"/><stop offset=".3" stop-color="#140c07" stop-opacity="0"/><stop offset=".72" stop-color="#140c07" stop-opacity="0"/><stop offset="1" stop-color="#140c07" stop-opacity=".3"/></linearGradient></defs>` + s;
  // 腰板：横に張った板（色むら）と、上の見切りの縁
  s += `<rect x="${n1(x0)}" y="62" width="${n1(x1 - x0)}" height="16.4" fill="#4a3222" opacity=".85"/>`;
  for (let y = 62, r = 0; y < 78; y += 3.3, r++) { s += `<path d="M${n1(x0)} ${n1(y)}H${n1(x1)}" stroke="#2e1f14" stroke-width=".22"/>`; for (let x = x0 + (r % 2) * 9; x < x1; x += 14 + d() * 10) { s += `<rect x="${n1(x)}" y="${n1(y + .2)}" width="${n1(8 + d() * 12)}" height="3" fill="${d() < .5 ? '#5a3e2a' : '#3e2a1c'}" opacity="${n1(.25 + d() * .3)}"/><path d="M${n1(x)} ${n1(y)}v3.3" stroke="#2e1f14" stroke-width=".2"/>`; } }
  s += `<rect x="${n1(x0)}" y="60.6" width="${n1(x1 - x0)}" height="1.6" fill="#6a4a30"/><rect x="${n1(x0)}" y="60.6" width="${n1(x1 - x0)}" height=".4" fill="#94704a" opacity=".8"/><rect x="${n1(x0)}" y="62.2" width="${n1(x1 - x0)}" height=".6" fill="#1d130c" opacity=".5"/>`;
  // 天井の梁：太い角材に木目と、下の角の光
  s += `<rect x="${n1(x0)}" y="-5" width="${n1(x1 - x0)}" height="6.6" fill="#3a2718"/><rect x="${n1(x0)}" y="1.2" width="${n1(x1 - x0)}" height=".45" fill="#7a5638" opacity=".7"/><rect x="${n1(x0)}" y="1.65" width="${n1(x1 - x0)}" height="1" fill="#140c07" opacity=".35"/>`;
  for (let x = x0; x < x1; x += 5 + d() * 9) s += `<path d="M${n1(x)} ${n1(-1 + d() * 1.6)}q${n1(2 + d() * 3)} ${n1((d() - .5) * .6)} ${n1(6 + d() * 7)} 0" stroke="#261a10" stroke-width=".2" fill="none" opacity=".7"/>`;
  return s;
}
// 小屋の床：板ごとの色むら（明るい板・暗い板）と、継ぎ目の釘
// 床板（遠近）：壁ぎわの板は細く、手前ほど太く見える。板の長さも手前ほど長く、継ぎ目は目の高さの消失点へ向かって傾く
// （消失点は立ち止まる場所ごとの画面の真ん中。立ち止まる場所の中間では傾きを 0 に戻して、つなぎ目が目立たないように）
function cabinFloorDetail(x0, x1, W) {
  const d = hrng(x0 * 6.7 + x1), n = 11, VY = 36, rows = Array.from({ length: n + 1 }, (_, i) => 80 + 27 * Math.pow(i / n, 1.55));
  const persp = (x, yA, yB) => { const vx = Math.round((x - W / 2) / W) * W + W / 2, dx = x - vx, c = Math.cos(Math.PI * dx / W); return x + dx * c * c * ((yB - VY) / (yA - VY) - 1); };
  // 壁ぎわの影（奥ほど暗い）
  const [ag, ad] = lgrad([[0, '#1d130c', .55], [1, '#1d130c', 0]]);
  let s = `<defs>${ad}</defs><rect x="${n1(x0)}" y="80" width="${n1(x1 - x0)}" height="6" fill="url(#${ag})"/>`;
  for (let r = 0; r < n; r++) {
    const yA = rows[r], yB = rows[r + 1], h = yB - yA, tones = ['#8a6444', '#2e1f14', '#7a5638', '#3a2718'];
    let x = x0 - d() * h * 8;
    while (x < x1) {
      const L = h * (7 + d() * 6), xb = x + L;
      // 板 1 枚（色むら）
      s += `<path d="M${n1(x)} ${n2(yA)}L${n1(xb)} ${n2(yA)}L${n1(persp(xb, yA, yB))} ${n2(yB)}L${n1(persp(x, yA, yB))} ${n2(yB)}Z" fill="${tones[Math.floor(d() * 4)]}" opacity="${n2(.06 + d() * .16)}"/>`;
      // 継ぎ目（端）と、釘 2 つ
      s += `<path d="M${n1(xb)} ${n2(yA)}L${n1(persp(xb, yA, yB))} ${n2(yB)}" stroke="#2e2016" stroke-width="${n2(.1 + h * .05)}" opacity=".85"/>`;
      if (d() < .6) for (const t of [.28, .72]) { const yy = yA + h * t, xx = persp(xb, yA, yy) - .25 - h * .08; s += `<circle cx="${n1(xx)}" cy="${n2(yy)}" r="${n2(.05 + h * .035)}" fill="#1a110a"/>`; }
      x = xb;
    }
    // 板と板の境（下の縁は少し暗く、上の縁はほんのり明るい）
    s += `<path d="M${n1(x0)} ${n2(yB)}H${n1(x1)}" stroke="#2e1d12" stroke-width="${n2(.1 + h * .06)}"/><path d="M${n1(x0)} ${n2(yA + .08 + h * .03)}H${n1(x1)}" stroke="#8a6444" stroke-width="${n2(.05 + h * .025)}" opacity=".35"/>`;
  }
  return s;
}
// 壁の掛け物：木の釘掛けに、ニット帽とマフラー
function scarfHook(x, y, s) {
  track(x - s * .6, y - s * .1); track(x + s * .6, y + s * 1.3);
  const d = hrng(x * 2.9 + y), rail = `<rect x="${n1(x - s * .55)}" y="${n1(y)}" width="${n1(s * 1.1)}" height="${n1(s * .1)}" rx="${n1(s * .03)}" fill="#6a4a30"/><rect x="${n1(x - s * .55)}" y="${n1(y)}" width="${n1(s * 1.1)}" height="${n1(s * .025)}" fill="#94704a"/>`;
  const pegs = [-.28, .28].map((o) => `<rect x="${n1(x + o * s - s * .03)}" y="${n1(y + s * .08)}" width="${n1(s * .06)}" height="${n1(s * .14)}" fill="#3a2718"/>`).join('');
  // ニット帽（リブの折り返しと、ぽんぽん）
  const bx = x - s * .28, by = y + s * .2, hat = `<path d="M${n1(bx - s * .2)} ${n1(by + s * .36)}Q${n1(bx - s * .22)} ${n1(by)} ${n1(bx)} ${n1(by - s * .02)}Q${n1(bx + s * .22)} ${n1(by)} ${n1(bx + s * .2)} ${n1(by + s * .36)}Z" fill="#b8623e"/><rect x="${n1(bx - s * .21)}" y="${n1(by + s * .28)}" width="${n1(s * .42)}" height="${n1(s * .12)}" rx="${n1(s * .03)}" fill="#9a4e32"/>${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${n1(bx - s * .18 + i * s * .072)} ${n1(by + s * .29)}v${n1(s * .1)}" stroke="#7d3f28" stroke-width="${n1(s * .012)}"/>`).join('')}<circle cx="${n1(bx)}" cy="${n1(by - s * .04)}" r="${n1(s * .07)}" fill="#e8d3ad"/>`;
  // マフラー（釘に掛けて、左右に垂れる。縞と房）
  const mx = x + s * .28, my = y + s * .2, cols = ['#3f5d59', '#d9a35a'], L1 = s * (.9 + d() * .15), L2 = s * .7;
  let scarf = `<path d="M${n1(mx - s * .09)} ${n1(my)}Q${n1(mx - s * .16)} ${n1(my + L1 * .5)} ${n1(mx - s * .12)} ${n1(my + L1)}L${n1(mx - s * .01)} ${n1(my + L1)}Q${n1(mx - s * .05)} ${n1(my + L1 * .5)} ${n1(mx + s * .02)} ${n1(my)}Z" fill="${cols[0]}"/><path d="M${n1(mx)} ${n1(my)}Q${n1(mx + s * .1)} ${n1(my + L2 * .5)} ${n1(mx + s * .06)} ${n1(my + L2)}L${n1(mx + s * .17)} ${n1(my + L2)}Q${n1(mx + s * .2)} ${n1(my + L2 * .5)} ${n1(mx + s * .1)} ${n1(my)}Z" fill="${dark(cols[0], .12)}"/>`;
  for (const t of [.55, .7, .85]) scarf += `<path d="M${n1(mx - s * .15)} ${n1(my + L1 * t)}h${n1(s * .15)}" stroke="${cols[1]}" stroke-width="${n1(s * .035)}"/>`;
  scarf += [0, 1, 2, 3].map((i) => `<path d="M${n1(mx - s * .11 + i * s * .03)} ${n1(my + L1)}v${n1(s * .07)}" stroke="${cols[0]}" stroke-width="${n1(s * .012)}"/>`).join('');
  return `<ellipse cx="${n1(x)}" cy="${n1(y + s * 1.25)}" rx="${n1(s * .5)}" ry="${n1(s * .05)}" fill="#000" opacity="0"/>` + rail + pegs + scarf + hat;
}
// 壁の掛け物：交差させて掛けた古いスノーシュー（木の枠と、格子に張った革ひも）
function snowshoes(x, y, s) {
  track(x - s * .55, y - s * .05); track(x + s * .55, y + s * 1.3);
  const shoe = (a) => { let o = `<g transform="rotate(${a} ${n1(x)} ${n1(y + s * .05)})"><path d="M${n1(x)} ${n1(y + s * .08)}Q${n1(x + s * .26)} ${n1(y + s * .3)} ${n1(x + s * .22)} ${n1(y + s * .75)}Q${n1(x + s * .1)} ${n1(y + s * 1.15)} ${n1(x)} ${n1(y + s * 1.25)}Q${n1(x - s * .1)} ${n1(y + s * 1.15)} ${n1(x - s * .22)} ${n1(y + s * .75)}Q${n1(x - s * .26)} ${n1(y + s * .3)} ${n1(x)} ${n1(y + s * .08)}Z" fill="none" stroke="#9a7a52" stroke-width="${n1(s * .035)}"/>`;
    for (let i = 1; i < 7; i++) { const yy = y + s * (.2 + i * .14); o += `<path d="M${n1(x - s * .2)} ${n1(yy)}L${n1(x + s * .2)} ${n1(yy + s * .08)}M${n1(x + s * .2)} ${n1(yy)}L${n1(x - s * .2)} ${n1(yy + s * .08)}" stroke="#c9a877" stroke-width="${n1(s * .01)}" opacity=".8"/>`; }
    o += `<rect x="${n1(x - s * .14)}" y="${n1(y + s * .62)}" width="${n1(s * .28)}" height="${n1(s * .05)}" fill="#6a4a30"/></g>`; return o; };
  return `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(s * .03)}" fill="#8a7a62"/><path d="M${n1(x)} ${n1(y)}L${n1(x - s * .06)} ${n1(y + s * .12)}M${n1(x)} ${n1(y)}L${n1(x + s * .06)} ${n1(y + s * .12)}" stroke="#3a2718" stroke-width="${n1(s * .015)}"/>` + shoe(-16) + shoe(16);
}
// 壁の掛け物：マクラメの吊り紐に、葉の垂れる鉢
function macrame(x, y, s) {
  track(x - s * .45, y - s * .05); track(x + s * .45, y + s * 1.45);
  const d = hrng(x * 1.9 + y * 3), py = y + s * .8;
  let o = `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(s * .035)}" fill="#8a7a62"/><circle cx="${n1(x)}" cy="${n1(y + s * .06)}" r="${n1(s * .05)}" fill="none" stroke="#d9c49a" stroke-width="${n1(s * .015)}"/>`;
  for (const o2 of [-.2, -.07, .07, .2]) o += `<path d="M${n1(x)} ${n1(y + s * .1)}Q${n1(x + o2 * s * .6)} ${n1(y + s * .45)} ${n1(x + o2 * s)} ${n1(py)}" stroke="#d9c49a" stroke-width="${n1(s * .014)}" fill="none"/>`;
  for (const t of [.35, .55]) o += `<circle cx="${n1(x - s * .1)}" cy="${n1(y + s * t)}" r="${n1(s * .02)}" fill="#c9b184"/><circle cx="${n1(x + s * .1)}" cy="${n1(y + s * t)}" r="${n1(s * .02)}" fill="#c9b184"/>`;
  o += `<path d="M${n1(x - s * .22)} ${n1(py)}H${n1(x + s * .22)}L${n1(x + s * .17)} ${n1(py + s * .28)}H${n1(x - s * .17)}Z" fill="#a8704a"/><path d="M${n1(x - s * .22)} ${n1(py)}H${n1(x + s * .22)}V${n1(py + s * .05)}H${n1(x - s * .22)}Z" fill="#8a5a3a"/>`;
  for (let i = 0; i < 9; i++) { const sx = x + (d() - .5) * s * .4, len = s * (.2 + d() * .5), dir = d() < .5 ? -1 : 1; let st = `M${n1(sx)} ${n1(py)}`; const ex = sx + dir * s * (.05 + d() * .2), ey = py + len; st += `Q${n1(sx + dir * s * .12)} ${n1(py + len * .4)} ${n1(ex)} ${n1(ey)}`; o += `<path d="${st}" stroke="#4f6a2a" stroke-width="${n1(s * .012)}" fill="none"/>`; for (let q = 1; q <= 3; q++) { const t = q / 3.4, lx = sx + (ex - sx) * t + dir * s * .02, ly = py + len * t; o += `<ellipse cx="${n1(lx)}" cy="${n1(ly)}" rx="${n1(s * .035)}" ry="${n1(s * .022)}" fill="${['#5f7d2e', '#6f8a3a', '#4f6a2a'][q % 3]}" transform="rotate(${n1(dir * 30)} ${n1(lx)} ${n1(ly)})"/>`; } }
  for (let i = 0; i < 6; i++) o += `<ellipse cx="${n1(x + (d() - .5) * s * .36)}" cy="${n1(py - s * .03 - d() * s * .08)}" rx="${n1(s * .06)}" ry="${n1(s * .03)}" fill="${['#5f7d2e', '#6f8a3a', '#7d9a46'][i % 3]}" transform="rotate(${n1((d() - .5) * 60)} ${n1(x)} ${n1(py)})"/>`;
  return o;
}
// 壁の掛け物：丸い木の時計（文字盤は目盛りだけ）
// 壁時計：場所の大きさだけ取っておき、絵は描かない（文字盤も針も museum.js が、両隣の額のちょうど真ん中に置く）
function wallClock(x, y, s) {
  const r = s * .32, cy = y + s * .45; track(x - r * 1.1, cy - r * 1.1); track(x + r * 1.1, cy + r * 1.2);
  return '<g/>';
}
function coatRack(x, y, w) {
  track(x - w / 2, y - 2); track(x + w / 2, y + 16);
  let o = `<rect x="${n1(x - w / 2)}" y="${n1(y)}" width="${n1(w)}" height="1.6" rx=".3" fill="#8a5f3a"/>`;
  const hooks = [x - w * .32, x, x + w * .32];
  for (const hx of hooks) o += `<path d="M${n1(hx)} ${n1(y + 1.6)}v1.2q0 .6 .6 .6" stroke="#3a2718" stroke-width=".35" fill="none" stroke-linecap="round"/>`;
  // ニット帽
  o += `<path d="M${n1(hooks[0] - 1.6)} ${n1(y + 6)}q0 -3.4 1.9 -3.6q1.9 .2 1.9 3.6Z" fill="#b8604a"/><rect x="${n1(hooks[0] - 1.7)}" y="${n1(y + 5.6)}" width="3.8" height=".9" rx=".3" fill="#d4b884"/><circle cx="${n1(hooks[0] + .3)}" cy="${n1(y + 2.3)}" r=".45" fill="#f4efe4"/>`;
  // ジャケット（肩から垂れる）
  o += `<path d="M${n1(hooks[1] - 2.6)} ${n1(y + 4)}q.5 -1.2 2.9 -1.4q2.4 .2 2.9 1.4l.6 9.5h-7Z" fill="#3f5d59"/><path d="M${n1(hooks[1] + .3)} ${n1(y + 3)}v10.4" stroke="#2c4340" stroke-width=".3"/><path d="M${n1(hooks[1] - 2.2)} ${n1(y + 5)}l-.7 5M${n1(hooks[1] + 2.8)} ${n1(y + 5)}l.7 5" stroke="#2c4340" stroke-width=".9" stroke-linecap="round"/>`;
  // マフラー
  o += `<path d="M${n1(hooks[2] - .5)} ${n1(y + 2.6)}q-.9 3 -.4 7.5h1.2q.5 -4.2 -.1 -7.5Z" fill="#d4b884"/><path d="M${n1(hooks[2] - .2)} ${n1(y + 4)}h.7M${n1(hooks[2] - .3)} ${n1(y + 6)}h.8M${n1(hooks[2] - .35)} ${n1(y + 8)}h.9" stroke="#b8604a" stroke-width=".3"/>`;
  return o;
}
// 壁のランプ（受け皿の上のろうそく型の灯り）と、壁に落ちる光
function sconce(x, y, s) {
  return rglow(x, y - s * .6, s * 3.2, '#ffcf85', .35) + `<path d="M${n1(x - s * .5)} ${n1(y + s * .5)}h${n1(s)}l${n1(-s * .15)} ${n1(s * .35)}h${n1(-s * .7)}Z" fill="#2a1c12"/><rect x="${n1(x - s * .12)}" y="${n1(y - s * .45)}" width="${n1(s * .24)}" height="${n1(s * .95)}" fill="#f4efe4"/><ellipse cx="${n1(x)}" cy="${n1(y - s * .65)}" rx="${n1(s * .14)}" ry="${n1(s * .28)}" fill="#ffd98a"/><ellipse cx="${n1(x)}" cy="${n1(y - s * .6)}" rx="${n1(s * .06)}" ry="${n1(s * .14)}" fill="#fff6e0"/><path d="M${n1(x - s * .25)} ${n1(y + s * .5)}v${n1(s * .6)}h${n1(s * .5)}v${n1(-s * .6)}" stroke="#2a1c12" stroke-width=".25" fill="none"/>`;
}
// 窓辺：ろうそくと小さなサボテンの鉢
function sillItems(wx, wy, ww, wh) {
  const y = wy + wh + 1.2;
  let o = `<rect x="${n1(wx - 1.5)}" y="${n1(y - .2)}" width="${n1(ww + 3)}" height="1" rx=".2" fill="#6e4a2e"/>`;
  o += `<rect x="${n1(wx + 1.5)}" y="${n1(y - 3.4)}" width="1.2" height="3.2" fill="#f4efe4"/><ellipse cx="${n1(wx + 2.1)}" cy="${n1(y - 4)}" rx=".45" ry=".8" fill="#ffd98a"/>` + rglow(wx + 2.1, y - 4, 4, '#ffcf85', .3);
  const px = wx + ww - 2.5;
  o += `<path d="M${n1(px - 1.3)} ${n1(y - .2)}l.2 -2.2h2.2l.2 2.2Z" fill="#b08a64"/><rect x="${n1(px - .55)}" y="${n1(y - 5.4)}" width="1.1" height="3.2" rx=".55" fill="#5a8a48"/><rect x="${n1(px + .1)}" y="${n1(y - 4.4)}" width=".7" height="1.6" rx=".35" fill="#699053"/><circle cx="${n1(px)}" cy="${n1(y - 5.5)}" r=".35" fill="#e9a7b4"/>`;
  return o;
}
// 天井から吊るしたドライハーブの束
function herbBundle(x, y, s) {
  track(x - s * .6, y); track(x + s * .6, y + s * 2.4);
  let o = `<path d="M${n1(x)} ${n1(y)}v${n1(s * .6)}" stroke="#b9a27c" stroke-width=".18"/>`;
  for (let k = -2; k <= 2; k++) o += lance(x + k * s * .12, y + s * .55, s * 1.7, s * .18, 180 + k * 9 + R(-3, 3), pick(['#6f7d2e', '#8a8a5a', '#5c6a2a', '#a39866']), { half: false });
  o += `<path d="M${n1(x - s * .3)} ${n1(y + s * .7)}h${n1(s * .6)}" stroke="#c9543a" stroke-width=".28"/>`;
  return o;
}

// 雪をかぶった針葉樹：段になった枝葉、右側に影、各段の上に雪
function pine(x, base, h, c, snow = '#eef2fb') {
  track(x - h * .45, base - h); track(x + h * .45, base);
  const n = Math.max(4, Math.round(h / 7)), sh = dark(c, .28);
  let s = `<path d="M${n1(x - h * .03)} ${n1(base)}V${n1(base - h * .2)}H${n1(x + h * .03)}V${n1(base)}Z" fill="#3b2a1e"/><ellipse cx="${n1(x)}" cy="${n1(base)}" rx="${n1(h * .16)}" ry="${n1(h * .035)}" fill="${snow}"/>`;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), ty = base - h + i * (h * .78 / n), th = h * .78 / n * 1.75, tw = h * (.08 + t * .34);
    const tier = `M${n1(x)} ${n1(ty)}L${n1(x + tw)} ${n1(ty + th)}Q${n1(x + tw * .3)} ${n1(ty + th * .82)} ${n1(x)} ${n1(ty + th * .92)}Q${n1(x - tw * .3)} ${n1(ty + th * .82)} ${n1(x - tw)} ${n1(ty + th)}Z`;
    s += `<path d="${tier}" fill="${c}"/><path d="M${n1(x)} ${n1(ty)}L${n1(x + tw)} ${n1(ty + th)}Q${n1(x + tw * .3)} ${n1(ty + th * .82)} ${n1(x)} ${n1(ty + th * .92)}Z" fill="${sh}"/>`;
    s += `<path d="M${n1(x)} ${n1(ty - .2)}L${n1(x + tw * .55)} ${n1(ty + th * .5)}Q${n1(x + tw * .1)} ${n1(ty + th * .36)} ${n1(x - tw * .15)} ${n1(ty + th * .55)}Q${n1(x - tw * .5)} ${n1(ty + th * .5)} ${n1(x - tw * .72)} ${n1(ty + th * .7)}Z" fill="${snow}"/>`;
  }
  return s;
}
// 窓をくり抜いた壁（窓の向こうに奥の空が見える）
function wallWithWindows(x0, x1, y0, y1, fill, wins) {
  const holes = wins.map(([wx, wy, ww, wh]) => `M${n1(wx)} ${n1(wy)}h${n1(ww)}v${n1(wh)}h${n1(-ww)}Z`).join('');
  return `<path fill-rule="evenodd" d="M${n1(x0)} ${n1(y0)}H${n1(x1)}V${n1(y1)}H${n1(x0)}Z${holes}" fill="${fill}"/>`;
}
function windowFrame(wx, wy, ww, wh, c = '#4a3322') {
  return `<path fill-rule="evenodd" d="M${n1(wx - 1)} ${n1(wy - 1)}h${n1(ww + 2)}v${n1(wh + 2)}h${n1(-ww - 2)}ZM${n1(wx)} ${n1(wy)}v${n1(wh)}h${n1(ww)}v${n1(-wh)}Z" fill="${c}"/><path d="M${n1(wx + ww / 2)} ${n1(wy)}v${n1(wh)}M${n1(wx)} ${n1(wy + wh / 2)}h${n1(ww)}" stroke="${c}" stroke-width=".7"/><rect x="${n1(wx - 1.8)}" y="${n1(wy + wh + .8)}" width="${n1(ww + 3.6)}" height="1" fill="${light(c, .15)}"/>`;
}

// 小屋の前の雪景色の絵（assets/scene/snow-*.webp。An0n の絵を夜の色にし、空を抜いたもの。幅 1055px）を置く位置と大きさ。
// s は絵の 1px が画面の高さ 100 に対していくつか。絵の 1322 行目（雪原の下端）を画面の下端に合わせる。
// スマホでは小屋の外壁までの幅にちょうど収め、広い画面では高さ 100 ほどにして、入ってきたときの画面の真ん中に置く
export function snowPanel(W) {
  const facade0 = W * 1.14, IW = 1055;
  const s = Math.min(100 / 1300, (facade0 - .5) / IW), pw = IW * s;
  const x = Math.min(facade0 - pw, Math.max(0, W / 2 - pw / 2));
  const y = (row) => 100.5 - (1322 - row) * s;
  // 絵の左右には、鏡に映した絵（家・ベンチ・熊を消したもの）を交互に並べて続ける（k が奇数は鏡の絵、0 以外の偶数はそれをさらに裏返したもの）
  // （見える幅が 1.5 に満たないものは置かない。スマホでは絵 1 枚だけ）
  const tiles = (x0, x1) => { const ks = []; for (let k = Math.floor((x0 - x) / pw); x + k * pw < x1 - 1.5; k++) if (k && x + (k + 1) * pw > x0 + 1.5) ks.push(k); return ks; };
  return { x, s, pw, facade0, y, plainY: y(640), farTiles: tiles(0, W * 1.05), midTiles: tiles(0, facade0) };
}
export function sceneAttic(W, stops, { birdGap = -1 } = {}) {
  reseed(51 + stops);
  const fw = planeW(W, stops, FACTORS.far), mw = planeW(W, stops, FACTORS.mid), vw = planeW(W, stops, FACTORS.move);
  const workX = (k) => at(W, FACTORS.mid)(k, W / 2);
  const facade0 = workX(1) - W * .36, wallX = (workX(1) + workX(2)) / 2, hz = 64;
  let far = '', mid = '', move = '';
  // 奥：左から右へ、夜から夜明けへ。月と星は左、朝焼けは右
  const [skG, skD] = lgrad([[0, '#060920'], [.18, '#0f1535'], [.34, '#20264f'], [.5, '#5b5a8f'], [.68, '#c79aa8'], [.85, '#f3bf9c'], [1, '#fbd9b0']], [0, 0, 1, 0]);
  const [skV, skVD] = lgrad([[0, '#000010', .45], [.55, '#000010', 0]]);
  const [hzG, hzD] = lgrad([[0, '#ffffff', 0], [1, '#ffd9b3', .55]]);
  // 空はぼかさずに焼く（museum.js が skyArt を奥の層のいちばん下に敷く）。雪山の上には星空とオーロラ、満月は画面に直接置く
  const peakY = snowPanel(W).y(268);
  const SKY = nightSky(-5, fw + 5, 0, 52, { density: 1.1, fade: (x) => (x < fw * .42 ? 1 : Math.max(0, 1.1 - x / fw * 1.35)), milky: [-4, 26, W * 1.2, 4, 4] });
  const skyArt = `<defs>${skD}${skVD}${hzD}</defs><rect x="-5" y="-5" width="${n1(fw + 10)}" height="110" fill="url(#${skG})"/><rect x="-5" y="-5" width="${n1(fw + 10)}" height="60" fill="url(#${skV})"/><rect x="-5" y="30" width="${n1(fw + 10)}" height="${hz - 28}" fill="url(#${hzG})"/>`
    + SKY.svg + aurora(-5, W * 1.15, peakY + 13, 26);
  const moonY = Math.min(18, peakY - 9);
  const skyDom = { moon: { x: fw * .16, y: moonY, r: 4.6, kind: 'full', halo: true }, bright: SKY.bright.filter(([x, y]) => Math.hypot(x - fw * .16, y - moonY) > 13) };
  far += rglow(fw * .98, hz - 2, 30, '#ffd2a6', .6);
  // 小屋の窓から見える山並み（外の雪景色の山は絵なので、それより右から）
  far += mountains(W * 1.1, fw + 10, hz, 38, 52, '#6f7aa3', '#eef1fa', { wmin: 28, wmax: 60 });
  far += mountains(W * 1.1, fw + 10, hz + 1, 50, 58, '#5a6590', '#dfe4f2', { wmin: 20, wmax: 40 });
  for (let x = W * 1.1 + R(0, 4); x < fw; x += R(3, 6)) far += pine(x, hz + 3 + R(-1, 1), R(8, 13), '#3b4670', '#c9d1ea');
  far += `<rect x="-5" y="${hz + 2}" width="${n1(fw + 10)}" height="${n1(106 - hz)}" fill="#c9d1e6"/>`;
  // 小屋の前の雪景色：An0n の絵を夜の色にしたもの（遠くの山は奥の層、雪原・家・木・ベンチは中景の層に museum.js が置く）。
  // 広い画面では、絵の左右に鏡に映した絵（家・ベンチ・熊を消したもの）を続ける。ここではその下地の雪原を描く
  const SP = snowPanel(W), py = SP.plainY;
  const [snG, snD] = lgrad([[0, '#a3b5f1'], [.35, '#9eb0ec'], [1, '#95a7e2']]);
  mid += `<defs>${snD}</defs><path d="M-5 106L-5 ${n1(py)}${smoothD(Array.from({ length: 8 }, (_, i) => [-5 + (wallX + 5) * i / 7, py + R(-.8, .8)]))}L${n1(wallX)} 106Z" fill="url(#${snG})"/>`;
  for (const [y, c] of [[py + 8, '#a6b8f3'], [py + 18, '#9aaceb'], [py + 30, '#a3b5f1'], [py + 42, '#97a9e5']]) mid += `<path d="M-5 106L-5 ${n1(y)}${smoothD(Array.from({ length: 7 }, (_, i) => [-5 + (facade0 + 5) * i / 6, y + R(-2.5, 2.5)]))}L${n1(facade0)} 106Z" fill="${c}"/>`;
  // 雪景色の絵と小屋のつなぎ目（絵の上に重ねる）：外壁の角から突き出た丸太の端と、壁ぎわに吹き寄せた雪
  let corner = '';
  for (let y = -5, i = 0; y < 82; y += 3.4, i++) {
    if (i % 2) continue;
    const L = facade0 - R(2, 2.8);
    corner += `<path d="M${n1(facade0 + .5)} ${n1(y)}H${n1(L + 1)}Q${n1(L)} ${n1(y + 1.55)} ${n1(L + 1)} ${n1(y + 3.1)}H${n1(facade0 + .5)}Z" fill="${pick(['#6b4a30', '#744f33', '#62432b'])}"/><ellipse cx="${n1(L + .9)}" cy="${n1(y + 1.55)}" rx=".7" ry="1.35" fill="#c9a276"/><ellipse cx="${n1(L + .9)}" cy="${n1(y + 1.55)}" rx=".28" ry=".6" fill="#96704a" opacity=".7"/><path d="M${n1(L + .6)} ${n1(y + .15)}H${n1(facade0 + .3)}" stroke="#e3ecf7" stroke-width=".55" stroke-linecap="round" opacity=".85"/>`;
  }
  {
    const [dG, dD] = lgrad([[0, '#b4c4f6'], [.4, '#a3b5f1'], [1, '#97a9e5']]);
    const a = facade0 - 16, b = facade0 + 16;
    corner += `<defs>${dD}</defs><path d="M${n1(a - 6)} 106Q${n1(a + 1)} 104.5 ${n1(a + 4)} 99.6Q${n1(a + 8)} 94.4 ${n1(facade0 - 5)} 90Q${n1(facade0 - 1.5)} 86.4 ${n1(facade0 + .5)} 84.6L${n1(facade0 + 4)} 85Q${n1(facade0 + 9.5)} 86.8 ${n1(facade0 + 12)} 92.5Q${n1(b - 1.8)} 100.5 ${n1(b - .6)} 106Z" fill="url(#${dG})"/>`;
    corner += `<path d="M${n1(a + 3)} 99.2Q${n1(a + 8)} 94.6 ${n1(facade0 - 5)} 90.4Q${n1(facade0 - 1.5)} 87 ${n1(facade0 + .5)} 85.3" stroke="#c6d3fa" stroke-width=".7" fill="none" stroke-linecap="round" opacity=".8"/>`;
    for (let k = 0; k < 7; k++) corner += `<ellipse cx="${n1(R(a + 5, facade0 + 7))}" cy="${n1(R(96, 104))}" rx="${n1(R(1.5, 3.5))}" ry="${n1(R(.3, .6))}" fill="#8b9ddb" opacity=".55"/>`;
  }
  // 小屋の外壁（丸太）と軒、窓の灯り、少し開いた扉
  const logs = [];
  for (let y = -5; y < 82; y += 3.4) logs.push(`<rect x="${n1(facade0)}" y="${n1(y)}" width="${n1(wallX - facade0)}" height="3.1" rx="1.5" fill="${pick(['#6b4a30', '#744f33', '#62432b'])}"/><rect x="${n1(facade0)}" y="${n1(y + .3)}" width="${n1(wallX - facade0)}" height=".7" rx=".35" fill="#8c6644" opacity=".7"/>`);
  mid += `<rect x="${n1(facade0)}" y="-5" width="${n1(wallX - facade0)}" height="88" fill="#3b2a1c"/>` + logs.join('');
  const fwin = [facade0 + W * .04, 24, 9, 12];
  mid += `<rect x="${fwin[0]}" y="${fwin[1]}" width="${fwin[2]}" height="${fwin[3]}" fill="#ffcf85"/>` + rglow(fwin[0] + 4.5, 30, 14, '#ffc56b', .45) + windowFrame(...fwin, '#3b2a1c');
  // 扉の枠と、中の灯り（扉そのものは museum.js が前に重ね、近づくとひらく）
  const door = [workX(1) - 6, 44, 12, 38];
  mid += `<rect x="${n1(door[0] - 1.2)}" y="${door[1] - 1.2}" width="${door[2] + 2.4}" height="${door[3] + 1.2}" fill="#2e2016"/><rect x="${n1(door[0])}" y="${door[1]}" width="${door[2]}" height="${door[3]}" fill="#ffcf85"/>`;
  mid += `<rect x="${n1(door[0] + 1)}" y="${door[1] + 3}" width="${door[2] - 2}" height="${door[3] - 3}" fill="#f2b566" opacity=".5"/>` + rglow(workX(1), 64, 16, '#ffc56b', .3);
  mid += `<rect x="${n1(facade0 - 2)}" y="-5" width="${n1(wallX - facade0 + 4)}" height="9" fill="#2e2016"/><path d="M${n1(facade0 - 3)} 3.6H${n1(wallX + 1)}" stroke="#eef2fb" stroke-width="1.4" stroke-linecap="round"/>`;
  for (let x = facade0; x < wallX; x += R(1.5, 3.2)) mid += `<path d="M${n1(x)} 4L${n1(x + .35)} ${n1(4 + R(1, 5))}L${n1(x + .7)} 4Z" fill="#e3ecf7" opacity=".9"/>`;
  mid += `<rect x="${n1(facade0 - 2)}" y="82" width="${n1(wallX - facade0 + 4)}" height="3" fill="#5b4028"/><rect x="${n1(facade0 - 2)}" y="82" width="${n1(wallX - facade0 + 4)}" height=".6" fill="#eef2fb"/>`;
  // 扉の右横（扉がひらかない側）に積んだ薪（切り口が見える）
  { const rr = Math.min(1.7, Math.max(.85, W * .011)), fx = workX(1) + 6 + 1.6 + rr; for (let r = 0; r < 5; r++) for (let c = 0; c < 6 - (r % 2); c++) { const lx = fx + c * rr * 2.05 + (r % 2) * rr, ly = 81.4 - r * rr * 1.8; mid += `<circle cx="${n1(lx)}" cy="${n1(ly)}" r="${rr}" fill="${pick(['#8a6440', '#7a5638', '#96704a'])}"/><circle cx="${n1(lx)}" cy="${n1(ly)}" r="${n1(rr * .7)}" fill="${pick(['#c9a276', '#d6b58a', '#b8925e'])}"/><circle cx="${n1(lx)}" cy="${n1(ly)}" r="${n1(rr * .28)}" fill="#8a6440" opacity=".6"/>`; } mid += `<path d="M${n1(fx - rr * 1.2)} ${n1(81.4 - 4 * rr * 1.8 - rr * .8)}Q${n1(fx + rr * 5)} ${n1(81.4 - 4 * rr * 1.8 - rr * 2)} ${n1(fx + rr * 11.4)} ${n1(81.4 - 4 * rr * 1.8 - rr * .8)}" stroke="#eef2fb" stroke-width="1.4" fill="none" stroke-linecap="round"/>`; }
  mid += `<path d="M${n1(workX(1) + W * .22)} 58v-6" stroke="#1d1510" stroke-width=".3"/><path d="M${n1(workX(1) + W * .22 - 1.2)} 58h2.4l-.4 3h-1.6Z" fill="#ffd98a"/>` + rglow(workX(1) + W * .22, 59, 9, '#ffc56b', .4);
  // 中景（内）：板壁と窓（窓の外は奥の空）、床、ラグ、ストーブ、棚
  // 作品と作品のあいだの壁：1 つ目に本棚とストーブ、2 つ目以降は窓（右ほど空が明けていく）
  const clocks = [];
  let stove = null, mug = null;
  const mids = []; for (let k = 2; k < stops - 1; k++) mids.push((workX(k) + workX(k + 1)) / 2);
  // 作品と作品のすき間の幅（作品の枠の外側どうし）。狭い画面では窓や棚を小さくし、入らなければ置かない（絵に重ねない）
  const zoneHalf = artZone(W, 0, 0, 0)[2], gap = W * FACTORS.mid - zoneHalf * 2;
  const winW = Math.min(16, gap - 7.5);
  const wins = winW >= 7 ? mids.slice(1).map((m) => [m - winW / 2, 16, winW, 40]) : [];
  mid += wallWithWindows(wallX, mw + 5, -5, 80, '#5a3e2a', wins);
  for (let x = wallX; x < mw + 5; x += R(4, 6)) mid += `<path d="M${n1(x)} -5V80" stroke="#3f2a1c" stroke-width=".35"/>` + (rnd() < .5 ? `<circle cx="${n1(x + 1)}" cy="${n1(R(5, 75))}" r=".18" fill="#2a1c12"/>` : '');
  // 板壁の木目（ゆるく波打つ細い線と、ところどころの節）と、板ごとのわずかな色むら
  for (let x = wallX; x < mw + 5; x += R(4, 6)) { const w = R(3.5, 5.5); if (rnd() < .5) mid += `<rect x="${n1(x)}" y="-5" width="${n1(w)}" height="85" fill="${pick(['#6a4a33', '#4e3524', '#5f412c'])}" opacity=".35"/>`; for (let k = 0; k < 2; k++) { const gx = x + R(.6, w - .6); mid += `<path d="M${n1(gx)} -5C${n1(gx + R(-.6, .6))} 20 ${n1(gx + R(-.6, .6))} 50 ${n1(gx + R(-.4, .4))} 80" stroke="#4a3222" stroke-width=".12" fill="none" opacity=".6"/>`; } if (rnd() < .3) { const ky = R(8, 72), kx = x + R(1, w - 1); mid += `<ellipse cx="${n1(kx)}" cy="${n1(ky)}" rx=".45" ry=".9" fill="#3a2718" opacity=".7"/><ellipse cx="${n1(kx)}" cy="${n1(ky)}" rx=".8" ry="1.6" fill="none" stroke="#4a3222" stroke-width=".1" opacity=".6"/>`; } }
  mid += cabinWallDetail(wallX, mw + 5);
  // 天井の梁に沿って、暖かい電球の飾り（ゆるく垂れる）
  { let d = `M${n1(wallX + 3)} 2`, bulbs = ''; for (let x = wallX + 3; x < mw; x += 12) { d += `Q${n1(x + 6)} 6 ${n1(x + 12)} 2`; for (const t of [.25, .5, .75]) { const bx = x + 12 * t, by = 2 + 4 * 2 * t * (1 - t) + .9; bulbs += `<circle cx="${n1(bx)}" cy="${n1(by)}" r="1.6" fill="#ffcf85" opacity=".16"/><circle cx="${n1(bx)}" cy="${n1(by)}" r=".42" fill="#ffe6b0"/>`; } } mid += `<path d="${d}" stroke="#1d140d" stroke-width=".18" fill="none"/>${bulbs}`; }
  mid += wins.map((w) => windowFrame(...w)).join('');
  mid += wins.map((w) => sillItems(...w)).join('');
  for (const [wx, wy, ww, wh] of wins) for (const side of [-1, 1]) {
    const cx = side < 0 ? wx - 1 : wx + ww + 1;
    mid += `<path d="M${n1(cx - 2.2)} ${n1(wy - 2)}H${n1(cx + 2.2)}Q${n1(cx + 1.4 * side)} ${n1(wy + wh * .5)} ${n1(cx + 2.6)} ${n1(wy + wh + 2)}H${n1(cx - 2.6)}Q${n1(cx - 1.4 * side)} ${n1(wy + wh * .5)} ${n1(cx - 2.2)} ${n1(wy - 2)}Z" fill="#6e3a2e"/><path d="M${n1(cx - 1)} ${n1(wy - 1)}Q${n1(cx - .6)} ${n1(wy + wh * .5)} ${n1(cx - 1.2)} ${n1(wy + wh + 1.5)}M${n1(cx + .8)} ${n1(wy - 1)}Q${n1(cx + 1.2)} ${n1(wy + wh * .5)} ${n1(cx + .9)} ${n1(wy + wh + 1.5)}" stroke="#4e2820" stroke-width=".35" fill="none"/>`;
  }
  for (const [wx, wy, ww] of wins) mid += `<rect x="${n1(wx - 4)}" y="${n1(wy - 2.8)}" width="${n1(ww + 8)}" height=".8" rx=".4" fill="#2a1c12"/>`;
  mid += `<rect x="${n1(wallX)}" y="-5" width="3" height="87" fill="#2e2016"/>`;
  const [flG, flD] = lgrad([[0, '#6b4a30'], [1, '#4a3322']]);
  mid += `<defs>${flD}</defs><rect x="${n1(wallX)}" y="80" width="${n1(mw - wallX + 5)}" height="26" fill="url(#${flG})"/><rect x="${n1(wallX)}" y="80" width="${n1(mw - wallX + 5)}" height=".8" fill="#2e2016"/>`;
  // 床板の継ぎ目と木目、巾木、額灯が床に落とす光
  // 床板は遠近をつけて描く（cabinFloorDetail）。前の等間隔の継ぎ目は、乱数の呼び出しだけ残す
  for (let y = 80, r = 0; y < 106; y += 3.2, r++) for (let x = wallX + (r % 3) * 7; x < mw + 5; x += R(16, 24));
  for (let i = 0; i < (mw - wallX) / 3; i++) { const x = R(wallX, mw), y = R(81, 105); mid += `<path d="M${n1(x)} ${n1(y)}q${n1(R(2, 4))} ${n1(R(-.3, .3))} ${n1(R(5, 9))} 0" stroke="#7a5638" stroke-width=".18" fill="none" opacity=".45"/>`; }
  mid += cabinFloorDetail(wallX, mw + 5, W);
  mid += `<rect x="${n1(wallX)}" y="78.4" width="${n1(mw - wallX + 5)}" height="1.6" fill="#3a2718"/><rect x="${n1(wallX)}" y="78.4" width="${n1(mw - wallX + 5)}" height=".35" fill="#7a5638" opacity=".7"/>`;
  for (let k = 2; k < stops; k++) mid += rglow(workX(k), 86, 22, '#ffcf85', .16);
  // ラグ：部屋の奥まで続く 1 本の長い敷物（ランナー）。縁取り、内側の二重線、菱形の模様、両端のフリンジ
  {
    const x0 = wallX + 6, x1 = mw + 6, y0 = 90.6, y1 = 97.4;
    mid += `<rect x="${n1(x0 + .4)}" y="${n1(y0 + .6)}" width="${n1(x1 - x0)}" height="${n1(y1 - y0)}" fill="#2a1a12" opacity=".35"/>`;
    mid += `<rect x="${n1(x0)}" y="${n1(y0)}" width="${n1(x1 - x0)}" height="${n1(y1 - y0)}" fill="#7a3f33"/><rect x="${n1(x0)}" y="${n1(y0 + .9)}" width="${n1(x1 - x0)}" height="${n1(y1 - y0 - 1.8)}" fill="#8d4a3a"/>`;
    mid += `<path d="M${n1(x0)} ${n1(y0 + .45)}H${n1(x1)}M${n1(x0)} ${n1(y1 - .45)}H${n1(x1)}" stroke="#d9a35a" stroke-width=".35" stroke-dasharray="1.2 .8"/>`;
    mid += `<path d="M${n1(x0)} ${n1(y0 + 1.6)}H${n1(x1)}M${n1(x0)} ${n1(y1 - 1.6)}H${n1(x1)}" stroke="#e8c18a" stroke-width=".18"/>`;
    const cy = (y0 + y1) / 2;
    for (let x = x0 + 2, i = 0; x < x1 - 2; x += 3.2, i++) {
      mid += `<path d="M${n1(x)} ${n1(cy - 1.3)}l1.2 1.3l-1.2 1.3l-1.2 -1.3Z" fill="${i % 3 === 1 ? '#3f5d59' : '#e2b36f'}" opacity=".85"/>`;
      if (i % 3 === 1) mid += `<path d="M${n1(x)} ${n1(cy - .5)}l.45 .5l-.45 .5l-.45 -.5Z" fill="#e8d3ad" opacity=".8"/>`;
    }
    for (const ex of [x0]) for (let f = y0 + .4; f < y1; f += .55) mid += `<path d="M${n1(ex)} ${n1(f)}h-1" stroke="#e8d3ad" stroke-width=".14" opacity=".75"/>`;
    // すり切れた毛足：ところどころ明るく
    for (let i = 0; i < (x1 - x0) / 6; i++) mid += `<ellipse cx="${n1(R(x0 + 2, x1 - 2))}" cy="${n1(R(y0 + 2, y1 - 2))}" rx="${n1(R(1, 2.5))}" ry=".35" fill="#a85a48" opacity=".35"/>`;
  }
  // 床と壁の小物（作品と作品のあいだ。レコードプレーヤー・ソファ・木箱のあるすき間は避ける）
  for (let k = 1; k < stops - 1; k++) {
    if (k === 3 || k === 4 || k === 5) continue;
    const gx = (workX(k) + workX(k + 1)) / 2, Zk = [artZone(W, workX(k), 0, 80), artZone(W, workX(k + 1), 0, 80)];
    // 手前の鉢植えがすき間の真ん中に来るので、床の小物は左右に寄せる
    const off = Math.max(12, W * .11), FK = W < 80 ? 1.25 : 2.1; // 家具の大きさ（絵と比べて部屋が大きすぎて見えないように）
    // 1 つ目のすき間は左半分が小屋の外（雪の中）なので、ギターは置かない。スツールとマグは小屋の中にあるときだけ
    if (k === 1) { const sz = 3.4 * FK; if (gx + off > wallX + 3) { mid += stoolMug(gx + off, 90.5, sz); mug = [gx + off, 90.5 - sz * 1.75 - sz * .42 * 1.1]; } } // スツールとマグは、薪ストーブやソファと比べて小さすぎないように（スツールは膝くらいの高さ）
    else if (k === 2) { mid += vinylStack(gx - off - (W < 80 ? 0 : 9), 90, 4.6 * FK); } // 広い画面では薪ストーブから離す // 床のレコードの山：ジャケットがストーブの半分くらいの高さ
    else { mid += skis(gx - off, 90, 30 * Math.min(FK, 1.6)); }
    // 壁の小物は、作品にかからないときだけ（広い画面）
    if (k === 1) mid += guard(Zk, () => coatRack(gx, 30, 14 * Math.min(FK, 1.4)), { min: 1 });
    if (k === 2) mid += guard(Zk, () => sconce(gx, 38, 2.6), { min: 1 });
  }
  // 空いた壁（窓も棚も掛け物もない作品のあいだ）に、小屋らしい掛け物。作品にかからない大きさで（入らなければ置かない）
  {
    const kinds = [scarfHook, snowshoes, macrame, wallClock];
    for (let k = 1, i = 0; k < stops - 1; k++) {
      if (k === 2) continue; // 薪ストーブの煙突と棚のある壁
      if (k >= 3 && wins.length) continue; // 窓のある壁
      if (k === 1 && W >= 80) continue; // 広い画面ではコート掛けがある
      const gx = (workX(k) + workX(k + 1)) / 2, Zk = [artZone(W, workX(k), 0, 80), artZone(W, workX(k + 1), 0, 80)];
      const f = kinds[i++ % kinds.length];
      let last = null; const got = guard(Zk, (kk) => { last = 12 * kk; return f(gx, 24, last); }, { min: .45 });
      mid += got;
      if (got && f === wallClock) clocks.push([gx, 24 + last * .45, last * .32]); // 壁時計の中心と半径（針は museum.js が置く）
    }
  }
  // 天井のドライハーブ：電球のあいだに、作品にかからないところへ
  for (let x = wallX + 9; x < mw; x += 12) if (clearOfWorks(W, stops, x, 5)) mid += herbBundle(x, 4.2, 2.6);
  if (mids.length) {
    const m = mids[0], shW = Math.min(22, gap - 2);
    if (shW >= 10) mid += shelf(m - shW / 2, 26, shW) + shelf(m - shW / 2, 40, shW);
    // 薪ストーブは床に置き、煙突は壁ぞいに天井へ（すき間が狭いときは置かない）
    // 薪ストーブ（鋳物の箱に脚、焚き口のガラス、上に煙突）。家具に合わせて大きめに
    if (gap >= 11) { const k = 2.1, sw = 8 * k, sh = 9 * k; mid += woodStove(m, k, sw, sh, gap / 2); stove = [m, 80, k, woodStove.kettle]; }
  }
  // 壁に掛けたスケートボード：作品の枠にかからないときだけ
  const sk = [[wallX + 8, 26, '#d4d0b5', '#b8604a'], [wallX + 14, 27, '#3f5d59', '#e2b36f']];
  if (sk.every(([x]) => clearOfWorks(W, stops, x - 2, 1) && clearOfWorks(W, stops, x + 3, 1))) mid += sk.map(([x, y, c, c2]) => skateboard(x, y, 20, c, c2)).join('');
  // 手前：外は雪の枝、中は鉢植え
  for (let s = 0; s < stops - 1; s++) {
    const x = at(W, FACTORS.move)(s + .5, W / 2), Z = moveZones(W, s, 0, 84);
    // 鉢植えは、鉢が画面の下に隠れて葉だけが床に落ちて見えないよう、鉢が見える高さに置く
    // 4 つ目のすき間（ビートメイカーが立つところ）は、手前に鉢を置かない
    if (s === 3 || s === 4 || s === 5 || s === birdGap || (s === 2 && stove)) continue; // レコードプレーヤー・ソファ・木箱・薪ストーブの前には鉢を置かない
    // 外の手前の木は、雪景色の絵の木と同じ色
    move += s === 0 ? guard(Z, (k) => pine(x, 112, 60 * k, '#061a0c', '#6c78a6')) : guard(Z, (k) => pot(x, 98.5, 10 * k, '#8e6e4f'));
  }
  return {
    sky: '#0d1027', skyArt, skyDom,
    far: [fw, far], mid: [mw, mid], move: [vw, move], frame: '', fx: 'attic', glowDefault: [255, 206, 140], snow: { ...SP, corner: [facade0 - 17, 34, corner] }, stove, wins, mug, clocks,
    curtain: ['#0f1a14', '#16261c', '#223a2a', '#2f4f38', '#3f6547'],
  };
}

// ---------- 目録の標本箱に添える押し葉（部屋ごとの植物。色は少し褪せさせる） ----------
export function pressedSpecimen(scene) {
  reseed(90 + scene.length);
  const fade = (c) => mixC(c, '#d9ceb4', .28);
  let body = '';
  switch (scene) {
    case 'forest': body = sprig(20, 58, 50, 4, ['#47733c', '#5f7d2e', '#769721'].map(fade), { leaf: 6, n: 7, cls: '', stem: fade('#4a3a22') }); break;
    case 'jungle': body = fern(20, 58, 54, 3, fade('#5f7d2e'), { cls: '' }); break;
    case 'cove': body = coral(20, 58, 44, fade('#b8a0d0'), { cls: '' }); break;
    case 'night': body = frond(20, 58, 56, 2, fade('#4a5a3a'), fade('#62744c'), { droop: .35, n: 14 }); break;
    default: body = sprig(20, 58, 48, -3, ['#2f4a3a', '#3d5c46', '#4f6e52'].map(fade), { leaf: 3.2, n: 10, kind: 'lance', spread: 58, shrink: .2, cls: '', stem: fade('#4a3a22') });
  }
  return `<svg viewBox="0 0 40 62" aria-hidden="true">${LEAF_DEFS}${body}<rect x="13" y="44" width="14" height="4" fill="#efe6cf" opacity=".85" transform="rotate(-8 20 46)"/></svg>`;
}

export const SCENES = { forest: sceneForest, jungle: sceneJungle, cove: sceneCove, night: sceneNight, attic: sceneAttic };
