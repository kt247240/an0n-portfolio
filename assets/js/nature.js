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
  });
}
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
  const sh = tones[0], body = tones[Math.min(1, tones.length - 1)], hi = tones[2] || light(body, .14), rimHi = tones[3] || hi;
  const id = `cp${gid++}`, k = r > 9 ? 9 : 7, lobes = [[cx, cy, r * .56]];
  for (let i = 0; i < k; i++) { const a = (i / k) * 360 + R(-14, 14), d = r * R(.4, .56); lobes.push([cx + Math.sin(a * D) * d, cy - Math.cos(a * D) * d * .8, r * R(.3, .42)]); }
  const circ = (dx, dy) => lobes.map(([x, y, rr]) => `<circle cx="${n1(x + dx)}" cy="${n1(y + dy)}" r="${n1(rr)}"/>`).join('');
  track(cx, cy, r * 1.08);
  let s = `<defs><clipPath id="${id}">${circ(0, 0)}</clipPath></defs><g fill="${dark(sh, .1)}">${circ(r * .04, r * .1)}</g>`;
  s += `<g clip-path="url(#${id})"><rect x="${n1(cx - r * 1.2)}" y="${n1(cy - r * 1.2)}" width="${n1(r * 2.4)}" height="${n1(r * 2.4)}" fill="${hi}"/><g fill="${body}">${circ(r * .1, r * .14)}</g><ellipse cx="${n1(cx + r * .1)}" cy="${n1(cy + r * .72)}" rx="${n1(r * 1.05)}" ry="${n1(r * .52)}" fill="${sh}" opacity=".75"/></g>`;
  // 中の葉（ふくらみの境目に少しだけ）
  for (let i = 0; i < Math.round(n * .22); i++) {
    const a = R(-120, 120), d = r * R(.1, .45), x = cx + Math.sin(a * D) * d, y = cy - Math.cos(a * D) * d * .8;
    s += oval(x, y, r * R(.16, .22), r * R(.07, .09), a + R(-20, 20), Math.cos(a * D) > .3 ? hi : body);
  }
  // 縁の葉：ふくらみの輪郭を葉の形でくずす
  for (let i = 0; i < Math.round(n * .78); i++) {
    const a = R(-160, 160), e = R(.72, .88), x = cx + Math.sin(a * D) * r * e, y = cy - Math.cos(a * D) * r * .8 * e, up = Math.cos(a * D);
    const c = up > .25 ? (a < 0 ? rimHi : hi) : up > -.45 ? body : sh;
    s += oval(x, y, r * R(.24, .32), r * R(.1, .13), a + R(-16, 16), c);
  }
  return anim(cls, cx, cy + r, s);
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
  const body = `<path d="M0 0C${n1(s * .15)} ${n1(-s * .55)} ${n1(s * .85)} ${n1(-s * .6)} ${n1(s)} ${n1(-s * .05)}C${n1(s * .85)} ${n1(s * .5)} ${n1(s * .15)} ${n1(s * .45)} 0 0Z" fill="${c}"/>
    <path d="M0 0C${n1(s * .15)} ${n1(-s * .55)} ${n1(s * .85)} ${n1(-s * .6)} ${n1(s)} ${n1(-s * .05)}Z" fill="${light(c, .07)}"/>
    <path d="M0 0L${n1(s * .96)} ${n1(-s * .04)}" stroke="${vein}" stroke-width="${n1(s * .025)}"/><path d="${cut}" stroke="${vein}" stroke-width="${n1(s * .05)}" stroke-linecap="round"/>`;
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
  return `<path d="${d}" fill="${c}" class="${cls}" style="transform-origin:${n1((x0 + x1) / 2)}px 0px;animation-delay:${n1(-R(0, 5))}s"/>`;
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
  return `<path class="${cls}" style="animation-delay:${n1(-R(0, 4))}s" d="M${n1(x)} ${n1(y)}L${p(b)}A${n1(r)} ${n1(r * .38)} 0 1 1 ${p(a)}Z" fill="${c}"/><path d="M${n1(x)} ${n1(y)}L${p(b)}A${n1(r)} ${n1(r * .38)} 0 0 1 ${p(b + 90)}Z" fill="${light(c, .12)}" opacity=".7"/>`;
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
  if (rnd() < .6) { const t = R(.2, .6); s += `<ellipse cx="${n1(x + (tx - x) * t)}" cy="${n1(base - h * t)}" rx="${n1(w * .16)}" ry="${n1(w * .25)}" fill="${dark(trunkC, .35)}"/>`; }
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
    s += `<path d="M${n1(bx)} ${n1(by - bw)}Q${n1(bx + dir * 3)} ${n1(by - 1 - bw)} ${n1(ex)} ${n1(ey)}Q${n1(bx + dir * 3)} ${n1(by - 1 + bw)} ${n1(bx)} ${n1(by + bw)}Z" fill="${trunkC}"/>`;
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
function dapple(x0, x1, y0, y1, n, c = '#fff6c8', a = .3) {
  let s = '';
  for (let i = 0; i < n; i++) s += `<ellipse cx="${n1(R(x0, x1))}" cy="${n1(R(y0, y1))}" rx="${n1(R(1, 4.5))}" ry="${n1(R(.3, .9))}" fill="${c}" opacity="${a}"/>`;
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
function pebbles(x0, x1, y0, y1, n) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = R(x0, x1), y = R(y0, y1), rx = R(.3, .9), c = pick(['#a39478', '#8f836b', '#b8ab8e']);
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
function forestFrame(W, P, zones, { big = 1, split = false } = {}) {
  let s = '', g = '';
  const T = [P.deep, P.dark, P.mid, P.leaf];
  for (const side of [-1, 1]) {
    const ex = side < 0 ? 0 : W;
    s += guard(zones, (k) => edgeTrunk(ex + side * R(0, 1.5), R(5.5, 7.5) * k * big, pick(['#4a3322', '#3f2c1d']), side * -R(0, 2)), { min: .55 });
    s += guard(zones, (k) => sprig(ex - side * R(1, 3), R(30, 52), R(14, 19) * k * big, -side * R(40, 65), [P.dark, P.mid, P.leaf, P.fresh], { leaf: 4 * k * big, n: 6, stem: '#3a2a1a' }));
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
    if (cy + cr > -4) { mid += bushMass(x, cy, cr, tones, 26) + bushMass(x - side * cr * .7, cy + cr * .45, cr * .7, tones, 18) + bushMass(x + side * cr * .6, cy + cr * .5, cr * .6, tones, 16); }
    if (t > .2) mid += shrub(x + side * w * 1.5, yb + .5, 3 + t * 9, [P.dark, P.mid, P.leaf, P.fresh].map((c) => mixC(c, hazeC, z * .7)), { leaf: .6 + t * 1.2, n: t > .6 ? 5 : 4 });
    if (t > .45 && rnd() < .6) mid += fern(x - side * w * 1.4, yb + .5, 4 + t * 9, -side * R(20, 50), mixC(P.leaf, hazeC, z * .5), { cls: '' });
  }
  mid += flowers(-5, cx - pw * .6, hz + 4, 104, 30, ['#fffaf2', '#f6d7e0', '#f2c14e', '#c7b3e6'], { scale: (y) => .35 + (y - hz) / deep * 1.6 });
  mid += flowers(cx + pw * .6, mw, hz + 4, 104, 30, ['#fffaf2', '#f6d7e0', '#f2c14e', '#c7b3e6'], { scale: (y) => .35 + (y - hz) / deep * 1.6 });
  for (let x = -6; x < mw + 6; x += R(8, 13)) mid += bushMass(x, R(-7, -2), R(8, 12), [P.deep, P.dark, P.mid, P.leaf], 22);
  mid += beams(cx - 70, cx + 20, 7, '#fffbe0', { opacity: .12, slant: [16, 30] });
  const frame = forestFrame(W, P, [[cx - 34, 5, cx + 34, 97]], { big: 1.15 });
  return {
    sky: 'radial-gradient(110% 85% at 51% 60%, #fffbe8 0%, #f4f0d3 28%, #e3e9c4 62%, #cddaa9 100%)',
    far: [fw, far], mid: [mw, mid], move: [0, ''], frame, fx: 'forest', glowDefault: [255, 244, 200],
    curtain: ['#132a1e', '#1e4630', '#2f6a44', '#47733c', '#769721'],
  };
}

export function sceneForest(W, stops, { entrance = false } = {}) {
  if (entrance) return sceneEntrance(W);
  reseed(11 + stops);
  const P = PAL.forest, fw = planeW(W, stops, FACTORS.far), mw = planeW(W, stops, FACTORS.mid), vw = planeW(W, stops, FACTORS.move);
  let far = forestFar(fw, 64), mid = '', move = '';
  far += groundPath(-10, fw + 10, 65, 1, '#cad79d', '#b3c581');
  // 中景：地面、小道、木、根元の茂み、草、花
  mid += groundPath(-5, mw + 5, 76.5, 1.2, '#a3bd6b', '#6a8c42');
  mid += trail(-5, mw + 5, 86.5, 6.5);
  mid += dapple(-5, mw, 80, 100, Math.round(mw / 3), '#fff4c0', .25);
  mid += grassEdge(-5, mw + 5, 77.4, [P.leaf, P.fresh, P.olive, '#8fb24e'], 2.4);
  // 奥の並木（霞んだ細い幹）：手前の木と遠い森のあいだに奥行きの層をもう 1 枚
  for (let x = R(0, 6); x < mw; x += R(6, 11)) {
    const z = R(.45, .65), hazeC = '#e3e9c4';
    mid += tree(x, R(76.5, 78), R(70, 90), { trunkC: mixC(pick([P.trunk, '#7a5638', '#86623f']), hazeC, z), tones: null, w: R(.7, 1.3), lean: R(-.6, .6), branches: 0 });
  }
  const treeXs = [];
  for (let x = R(0, 8); x < mw; x += R(16, 27)) if (clearOfWorks(W, stops, x, 4)) treeXs.push(x);
  for (let s = 1; s < stops; s++) { const [a, , b] = artZone(W, at(W, FACTORS.mid)(s, W / 2), 0, 0); treeXs.push(a - 1, b + 1); }
  treeXs.sort((a, b) => a - b);
  for (const x of treeXs) {
    const base = R(79.5, 82);
    mid += tree(x, base, R(92, 106), { trunkC: pick([P.trunk, '#7a5638', '#5c4027', '#86623f']), tones: [P.dark, P.mid, P.leaf, P.fresh], w: R(2.6, 4.4) });
    if (rnd() < .6) mid += shrub(x + R(-4, 4), base + .6, R(7, 11), [P.dark, P.mid, P.leaf, P.fresh], { leaf: R(1.1, 1.4), n: 4 });
  }
  for (let x = R(0, 10); x < mw; x += R(14, 24)) mid += fern(x, 85, R(8, 12), R(-50, 50), pick([P.leaf, P.olive, P.fresh]), { cls: '' });
  mid += grassEdge(-5, mw + 5, 86.8, [P.leaf, P.fresh, P.olive, '#8fb24e'], 2.2);
  mid += grassEdge(-5, mw + 5, 93.6, [P.mid, P.leaf, P.fresh, P.olive], 3.2);
  mid += litter(-5, mw, 79, 86, Math.round(mw * 1.1), ['#8a6a3a', '#a5813e', '#6f7d2e', '#b8923e', '#5c6a2a']);
  mid += litter(-5, mw, 92, 104, Math.round(mw * 1.3), ['#8a6a3a', '#a5813e', '#6f7d2e', '#b8923e', '#5c6a2a']);
  mid += pebbles(-5, mw, 87.4, 91.5, Math.round(mw * .6));
  mid += flowers(-5, mw, 80, 85, Math.round(mw / 7), ['#fffaf2', '#f6d7e0', '#f2c14e', '#c7b3e6']);
  mid += flowers(-5, mw, 95, 101, Math.round(mw / 6), ['#fffaf2', '#f6d7e0', '#f2c14e', '#c7b3e6'], { scale: 1.3 });
  for (let x = -5; x < mw; x += R(9, 14)) mid += bushMass(x, R(-5, -1), R(9, 13), [P.deep, P.dark, P.mid, P.leaf], 22);
  for (let x = R(0, 10); x < mw; x += R(22, 36)) mid += sprig(x, -3, R(12, 20), 180 + R(-20, 20), [P.leaf, P.fresh, P.lime, P.pale], { leaf: 2.8, cls: 'hang', stem: '#3d5a2a' });
  mid += beams(-10, mw, Math.round(mw / 18), '#fffbe0', { opacity: .08 });
  // 手前を横切る茂み（作品と作品のあいだ。作品の前には来ない）
  for (let s = 0; s < stops - 1; s++) {
    const x = at(W, FACTORS.move)(s + .5, W / 2), Z = moveZones(W, s, 4, 82);
    move += guard(Z, (k) => shrub(x + R(-6, 6), 108, R(34, 42) * k, [P.deep, P.dark, P.mid, P.leaf], { leaf: 4.4 * k }));
    move += guard(Z, (k) => fern(x + R(-14, 14), 110, R(28, 36) * k, R(-30, 30), P.dark, { cls: '' }));
    move += guard(Z, (k) => sprig(x + R(-10, 10), -6, R(28, 36) * k, 180 + R(-20, 20), [P.deep, P.dark, P.mid, P.leaf], { leaf: 5 * k, cls: 'hang', stem: '#233a26' }));
  }
  const [frame, ground] = forestFrame(W, P, [artZone(W, W / 2, 4, 82)], { split: true });
  move += tileGround(W, stops, ground);
  return {
    sky: 'linear-gradient(#eef1d6 0%, #f3e8c6 52%, #dfe6b5 100%)',
    far: [fw, far], mid: [mw, mid], move: [vw, move], frame, fx: 'forest', glowDefault: [255, 244, 200],
    curtain: ['#132a1e', '#1e4630', '#2f6a44', '#47733c', '#769721'],
  };
}

export function sceneJungle(W, stops) {
  reseed(21 + stops);
  const P = PAL.forest, Q = PAL.water, fw = planeW(W, stops, FACTORS.far), mw = planeW(W, stops, FACTORS.mid), vw = planeW(W, stops, FACTORS.move);
  let far = '', mid = '', move = '';
  // 奥：水面に映る木の影、水中の枝、ゆらめき
  const [rg, rd] = lgrad([[0, '#4f5a35', .28], [.6, '#4f5a35', .12], [1, '#4f5a35', 0]]);
  far += `<defs>${rd}</defs>`;
  for (let x = R(0, 10); x < fw; x += R(9, 16)) { const w = R(1.5, 3.5), l = R(-2, 2); far += `<path d="M${n1(x)} -2L${n1(x + w)} -2Q${n1(x + w + l)} 50 ${n1(x + w * .8 + l * 2)} 102L${n1(x + w * .2 + l * 2)} 102Q${n1(x + l)} 50 ${n1(x)} -2Z" fill="url(#${rg})"/>`; }
  far += caustics(-5, fw, 5, 100, Math.round(fw * 1.2), 'rgba(210,222,170,.35)');
  for (let i = 0; i < fw / 12; i++) far += `<path d="M${n1(R(0, fw))} ${n1(R(10, 90))}q${n1(R(-8, 8))} ${n1(R(4, 10))} ${n1(R(-10, 10))} ${n1(R(10, 20))}" stroke="#5f6a40" stroke-width="${n1(R(.4, 1))}" fill="none" opacity=".45" stroke-linecap="round"/>`;
  for (let i = 0; i < fw / 7; i++) { const x = R(0, fw), y = R(15, 95); far += lily(x, y, R(1.5, 3), pick(['#9fb86a', '#8aa35a', '#b3c97a'])); }
  // 中景：太い枝と苔、つる、睡蓮と花、波紋、葦
  const [bG, bD] = lgrad([[0, '#8a6442'], [1, '#5a3b2a']]);
  mid += `<defs>${bD}</defs><path d="M-5 6Q${n1(mw * .25)} -1 ${n1(mw * .5)} 8T${n1(mw + 5)} 6L${n1(mw + 5)} 11Q${n1(mw * .75)} 14 ${n1(mw * .5)} 12T-5 10Z" fill="url(#${bG})"/>`;
  for (let x = 0; x < mw; x += R(3, 6)) mid += `<path d="M${n1(x)} ${n1(8 + Math.sin(x * .02) * 2)}l${n1(R(1, 3))} ${n1(R(-.3, .3))}" stroke="#9a7650" stroke-width=".3" opacity=".7" stroke-linecap="round"/>`;
  mid += drape(-5, mw + 5, 5, 16, P.fresh) + drape(-5, mw + 5, 2, 10, P.lime);
  for (let x = R(0, 8); x < mw; x += R(7, 13)) if (clearOfWorks(W, stops, x, 2)) mid += vine(x, 6, R(20, 48), '#4c5a2a', [P.fresh, P.lime, P.leaf]);
  for (let i = 0; i < mw / 4.5; i++) {
    const x = R(0, mw), y = R(34, 98), r = R(2.5, 5);
    if (rnd() < .35) mid += ripple(x, y + .4, r * .9);
    mid += lily(x, y, r, pick([Q.pad, Q.padDark, '#bcd65f']));
    if (rnd() < .12) mid += waterLily(x + r * .3, y - .2, r * .5);
  }
  // 水面の描き込み：ウキクサの群れ、浮いた落ち葉、藻のすじ
  for (let i = 0; i < mw / 9; i++) {
    const cx = R(0, mw), cy = R(40, 98), sp = R(2, 6);
    for (let k = 0; k < 14; k++) mid += `<circle cx="${n1(cx + R(-sp, sp))}" cy="${n1(cy + R(-sp, sp) * .3)}" r="${n1(R(.12, .3))}" fill="${pick(['#a5c23e', '#8aa35a', '#c9d77a'])}" opacity=".8"/>`;
  }
  mid += litter(-5, mw, 36, 98, Math.round(mw * .35), ['#8a6a3a', '#a5813e', '#b8923e', '#6f7d2e']);
  for (let i = 0; i < mw / 10; i++) { const x = R(0, mw), y = R(30, 98); mid += `<path d="M${n1(x)} ${n1(y)}q${n1(R(3, 7))} ${n1(R(-.6, .6))} ${n1(R(7, 14))} 0" stroke="#4f5a35" stroke-width=".25" fill="none" opacity=".35"/>`; }
  for (let s = 0; s < stops; s++) {
    const cx = at(W, FACTORS.mid)(s, W / 2);
    mid += reeds(cx - W * .34, 100, 7, '#6f8a3a') + reeds(cx + W * .36, 100, 6, '#7c9a40');
  }
  for (let i = 0; i < mw / 3; i++) mid += `<path d="M${n1(R(0, mw))} ${n1(R(30, 100))}h${n1(R(2, 6))}" stroke="#e8efd0" stroke-width=".25" opacity=".35" stroke-linecap="round"/>`;
  // 水ぎわの桟橋：部屋の端から端まで続く板の道。作品はこの上の台に立つ
  mid += `<path d="M-5 87.6H${n1(mw + 5)}V91.6H-5Z" fill="#a47a4e"/><path d="M-5 87.6H${n1(mw + 5)}V88.2H-5Z" fill="#c9a276"/><path d="M-5 91.6H${n1(mw + 5)}V93H-5Z" fill="#5a3b2a"/>`;
  for (let x = -5; x < mw + 5; x += R(2.6, 3.4)) mid += `<path d="M${n1(x)} 88.2L${n1(x - .4)} 91.6" stroke="#7d5a38" stroke-width=".3" opacity=".7"/>`;
  for (let x = R(0, 6); x < mw; x += R(14, 20)) mid += `<path d="M${n1(x)} 93H${n1(x + 1.4)}V101H${n1(x)}Z" fill="#4a3322"/>` + ripple(x + .7, 101, 2.4);
  // 手前を横切る茂みとバナナの葉
  for (let s = 0; s < stops - 1; s++) {
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
    far: [fw, far], mid: [mw, mid], move: [vw, move], frame, fx: 'jungle', glowDefault: [214, 232, 150],
    curtain: ['#1a3322', '#244d33', '#47733c', '#769721', '#a5c23e'],
  };
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
function cloudBand(x, y, w, h, c, lit) {
  let s = '';
  for (let i = 0; i < 5; i++) { const cx = x + R(-w * .35, w * .35), rw = w * R(.25, .45), rh = h * R(.5, 1); s += `<ellipse cx="${n1(cx)}" cy="${n1(y + R(-h * .3, h * .2))}" rx="${n1(rw)}" ry="${n1(rh)}" fill="${c}"/><ellipse cx="${n1(cx + rw * .1)}" cy="${n1(y + rh * .55)}" rx="${n1(rw * .85)}" ry="${n1(rh * .35)}" fill="${lit}" opacity=".85"/>`; }
  return `<g filter="url(#soft)">${s}</g>`;
}
// 水面に映る光の道（太陽・月・灯り）：手前ほど幅が広い、短い横線の集まり
function glitter(x, y0, y1, c, { spread = .45, n = 90, a = .8 } = {}) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const t = Math.pow(rnd(), .8), y = y0 + (y1 - y0) * t, w = 1.5 + (y - y0) * spread, xx = x + R(-w, w) * (1 - Math.abs(R(-1, 1)) * .3), l = R(.6, 2.8) * (1 + t * 2);
    s += `<path class="shimmer" style="animation-delay:${n1(-R(0, 4))}s" d="M${n1(xx - l / 2)} ${n1(y)}h${n1(l)}" stroke="${c}" stroke-width="${n1(.18 + t * .35)}" stroke-linecap="round" opacity="${n1(a * (1 - t * .55) * 100) / 100}"/>`;
  }
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
  let s = `<path d="${top}L${n1(x1 + 10)} ${n1(y + 5)}L${n1(x0)} ${n1(y + 5)}Z" fill="${wet}"/>`;
  s += `<path class="shimmer" d="${top}" stroke="${foam}" stroke-width=".7" fill="none" opacity=".85"/>`;
  s += `<path d="M${pts.map((p) => `${n1(p[0])} ${n1(p[1] - 1.4 + R(-.4, .4))}`).join('L')}" stroke="${foam}" stroke-width=".3" fill="none" opacity=".45" stroke-dasharray="3 2"/>`;
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

export function sceneCove(W, stops) {
  reseed(31 + stops);
  const P = PAL.dusk, fw = planeW(W, stops, FACTORS.far), mw = planeW(W, stops, FACTORS.mid), vw = planeW(W, stops, FACTORS.move), hz = 62;
  let far = '', mid = '', move = '';
  // 奥：夕焼けの雲、低い太陽、霞む岬、光の道と遠い波
  far += `<defs><filter id="soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="1.1"/></filter></defs>`;
  for (let x = R(-10, 10); x < fw; x += R(26, 46)) far += cloudBand(x, R(12, 40), R(24, 50), R(1.8, 3.6), pick(['#e9b9ae', '#f0c3ad', '#dcaeb6', '#f3cfb3']), pick(['#ffe0b0', '#ffd49a', '#ffe8c4']));
  const sx = at(W, FACTORS.far)(1, W * .62);
  far += rglow(sx, hz - 6, 40, '#ffe3a6', .6) + `<circle cx="${n1(sx)}" cy="${hz - 6}" r="6.5" fill="#fff0bf" opacity=".6"/><circle cx="${n1(sx)}" cy="${hz - 6}" r="4.8" fill="#fff4cf"/>`;
  far += mountains(-10, fw + 10, hz, 40, 55, '#b3c6cc', '#eef3f2', { wmin: 30, wmax: 70 });
  far += haze(-10, fw + 10, 38, hz, '#f6dcc6', .05, .6);
  far += mountains(-10, fw + 10, hz + .5, 53, 59, '#8eaeb5', null, { wmin: 22, wmax: 48 });
  const [sg, sd] = lgrad([[0, '#f4d9bd'], [.18, '#bfd9d3'], [1, '#86b3b3']]);
  far += `<defs>${sd}</defs><rect x="-5" y="${hz}" width="${n1(fw + 10)}" height="${n1(106 - hz)}" fill="url(#${sg})"/>`;
  far += glitter(sx, hz + .5, 100, '#fff6d8', { spread: .35, n: 170, a: 1 });
  for (let k = 0; k < 3; k++) { const x = R(fw * .1, fw * .9), hh = R(1.6, 2.6); far += `<path d="M${n1(x)} ${n1(hz - .2)}L${n1(x + hh * .15)} ${n1(hz - hh)}L${n1(x + hh * .7)} ${n1(hz - .4)}Z" fill="#8a97a8" opacity=".7"/><path d="M${n1(x - .6)} ${n1(hz)}h${n1(hh * 1.1)}" stroke="#8a97a8" stroke-width=".3" opacity=".7"/>`; }
  far += waveLines(-5, fw + 5, hz + 1, 100, '#ffffff', Math.round(fw * 1.4));
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
  for (let x = R(-5, 5); x < mw; x += R(6, 14)) mid += `<path d="M${n1(x)} ${n1(R(81, 83))}h${n1(R(3, 9))}" stroke="#fff6ea" stroke-width=".22" opacity=".55" stroke-linecap="round"/>`;
  for (let k = 0; k < 2; k++) { let d = `M-5 ${n1(79.6 + k * 1.2)}`; for (let x = -5; x < mw + 5; x += 3) d += `Q${n1(x + 1.5)} ${n1(79.6 + k * 1.2 + R(-.5, .5))} ${n1(x + 3)} ${n1(79.6 + k * 1.2 + R(-.3, .3))}`; mid += `<path d="${d}" stroke="#fffaf2" stroke-width=".3" fill="none" opacity="${k ? .35 : .6}"/>`; }
  // 乾いた砂の上：小石、貝のかけら、打ち上げられた海藻
  mid += pebbles(-5, mw, 85, 103, Math.round(mw * .5));
  for (let i = 0; i < mw * .35; i++) { const x = R(0, mw), y = R(84, 102); mid += `<path d="M${n1(x)} ${n1(y)}a.6 .45 0 0 1 1.2 0Z" fill="#f4e9da" opacity=".85"/>`; }
  for (let i = 0; i < mw / 16; i++) {
    const x = R(0, mw), y = R(83.8, 87.5);
    let d = '';
    for (let k = 0; k < 6; k++) { const a = R(-.5, .5), l = R(1.2, 2.6), ox = R(-1.2, 1.2), oy = R(-.3, .3); d += `M${n1(x + ox)} ${n1(y + oy)}q${n1(l * .5)} ${n1(a - .5)} ${n1(l)} ${n1(a)}`; }
    mid += `<path d="${d}" stroke="${pick(['#4f5a2e', '#5c5a34', '#6b6a3a'])}" stroke-width=".3" fill="none" opacity=".75" stroke-linecap="round"/>`;
  }
  for (let i = 0; i < mw * 1.5; i++) mid += `<circle cx="${n1(R(0, mw))}" cy="${n1(R(84, 104))}" r="${n1(R(.08, .22))}" fill="${pick(['#b9a27c', '#f6ead2', '#a8916b'])}" opacity=".7"/>`;
  for (let x = R(4, 30); x < mw; x += R(45, 90)) {
    const y = R(85, 94), c = pick(['#6f6a6a', '#7c746c', '#5f5f66']);
    mid += rock(x, y, R(7, 13), R(3.5, 6), c);
    if (rnd() < .6) mid += rock(x + R(4, 8), y + R(.5, 1.5), R(3, 6), R(1.6, 3), mixC(c, '#8a8278', .3));
  }
  for (let x = R(10, 30); x < mw; x += R(40, 70)) mid += driftwood(x, R(92, 98), R(8, 14), R(-8, 8));
  for (let x = R(0, 10); x < mw; x += R(12, 22)) mid += tuft(x, 101 + R(-1, 2), R(3, 5), ['#a39866', '#8a8a5a', '#c2b27a', '#b7a36e'], 7);
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
  return {
    sky: 'linear-gradient(#aebbd6 0%, #e3b8b3 28%, #f3c69c 46%, #f8dcb0 58%, #f6e2c4 62%, #bfd9d3 66%, #86b3b3 100%)',
    far: [fw, far], mid: [mw, mid], move: [vw, move], frame, fx: 'cove', glowDefault: [255, 214, 170],
    curtain: ['#1c3a3a', '#2a5550', '#3f7f73', '#5aa77a', '#7cc0a0'],
  };
}

export function sceneNight(W, stops) {
  reseed(41 + stops);
  const P = PAL.night, fw = planeW(W, stops, FACTORS.far), mw = planeW(W, stops, FACTORS.mid), vw = planeW(W, stops, FACTORS.move), hz = 66;
  let far = '', mid = '', move = '';
  // 奥：星、月と光の輪、岬の町と灯台、海に映る月の道
  far += stars(fw, Math.round(fw * 1.2));
  const mx = fw * .3;
  far += rglow(mx, 16, 22, '#fdf1d6', .3) + `<circle cx="${n1(mx)}" cy="16" r="4.5" fill="#fdf1d6"/><circle cx="${n1(mx + 1.8)}" cy="14.8" r="4" fill="#1b1d3c"/>`;
  far += `<path d="M-5 106L-5 ${hz - 4}${smoothD(Array.from({ length: 9 }, (_, i) => [-5 + (fw + 10) * i / 8, hz - 6 + R(-3, 2)]))}L${n1(fw + 5)} 106Z" fill="#282c55"/>`;
  for (let i = 0; i < fw / 1.4; i++) far += `<circle cx="${n1(R(0, fw))}" cy="${n1(R(hz - 7, hz - 1))}" r="${n1(R(.1, .22))}" fill="${pick(['#ffd79a', '#ffb45a', '#fff1d0'])}" opacity="${n1(R(.4, .9) * 100) / 100}"/>`;
  for (let s = 0; s < stops; s += 1) { const x = at(W, FACTORS.far)(s, W * R(.15, .85)); far += townRow(x - R(10, 16), x + R(10, 16), hz, '#1d1f3c', { hmin: 2.5, hmax: 7 }); }
  { const lx = at(W, FACTORS.far)(stops - 1, W * .85); far += `<path d="M${n1(lx - 1)} ${hz}L${n1(lx - .6)} ${hz - 9}H${n1(lx + .6)}L${n1(lx + 1)} ${hz}Z" fill="#e8e2d8"/><path d="M${n1(lx - .7)} ${hz - 6}h1.4v1h-1.4Z" fill="#b3261e"/><circle cx="${n1(lx)}" cy="${hz - 9.6}" r=".7" fill="#ffe7a8"/>` + rglow(lx, hz - 9.6, 8, '#ffe7a8', .35); }
  const [sg, sd] = lgrad([[0, '#2d3263'], [1, '#141733']]);
  far += `<defs>${sd}</defs><rect x="-5" y="${hz}" width="${n1(fw + 10)}" height="${n1(106 - hz)}" fill="url(#${sg})"/>`;
  far += glitter(mx, hz + .5, 100, '#fdf1d6', { spread: .25, n: 110, a: .7 });
  far += waveLines(-5, fw + 5, hz + 1, 100, '#8f98c9', Math.round(fw));
  for (let i = 0; i < fw / 2.2; i++) { const x = R(0, fw), y = R(hz + .8, hz + 6); far += `<path d="M${n1(x)} ${n1(y)}v${n1(R(.6, 1.6))}" stroke="${pick(['#ffd79a', '#ffb45a'])}" stroke-width=".22" opacity="${n1(R(.25, .55) * 100) / 100}"/>`; }
  for (let k = 0; k < Math.max(2, Math.round(fw / 60)); k++) { const x = R(fw * .05, fw * .95), y = hz + R(2.5, 5); far += `<path d="M${n1(x - 2)} ${n1(y)}h4l-.6 .8h-2.8Z" fill="#141733"/><path d="M${n1(x)} ${n1(y)}v-3" stroke="#141733" stroke-width=".2"/><circle cx="${n1(x)}" cy="${n1(y - 3)}" r=".25" fill="#ffe7a8"/>` + rglow(x, y - 3, 2, '#ffe7a8', .35); }
  far += haze(-10, fw + 10, hz - 14, hz + 2, '#3c3f73', 0, .35);
  // 中景：海沿いの遊歩道（手すり、街灯、ヤシ、電球の紐）と植え込み
  // 作品の後ろ（と台座のまわり）にはヤシも街灯も立てない。作品は遊歩道の上にすっきり立つ
  const clear = (x, m = 0) => clearOfWorks(W, stops, x, m);
  const palmXs = [];
  for (let x = R(0, 10); x < mw; x += R(18, 30)) {
    const h = R(42, 60), lean = R(-7, 7);
    if (!clear(x, 6) || !clear(x + lean * 1.6, 10)) { palmXs.push(null); continue; }
    mid += palm(x, 86, h, lean, '#2a2119', '#1c2614', '#2d3a1f');
    palmXs.push([x + lean, 86 - h]);
  }
  for (let i = 1; i < palmXs.length; i++) if (palmXs[i - 1] && palmXs[i]) mid += strands(palmXs[i - 1][0], palmXs[i][0], Math.max(palmXs[i - 1][1], palmXs[i][1]) + 5, R(2, 5), 9);
  mid += railing(-5, mw + 5, 84, '#15141d');
  const [pg, pd] = lgrad([[0, '#2a2733'], [1, '#141219']]);
  mid += `<defs>${pd}</defs><rect x="-5" y="84" width="${n1(mw + 10)}" height="22" fill="url(#${pg})"/><rect x="-5" y="84" width="${n1(mw + 10)}" height=".5" fill="#3a3646"/>`;
  // 遊歩道の石畳（目地）と、街灯の光が濡れた石に映る筋
  for (let y = 88.5; y < 106; y += 2.6) mid += `<path d="M-5 ${n1(y)}H${n1(mw + 5)}" stroke="#35313f" stroke-width=".18" opacity=".7"/>`;
  for (let y = 86, r = 0; y < 106; y += 2.6, r++) for (let x = -5 + (r % 2) * 2.5; x < mw + 5; x += 5) mid += `<path d="M${n1(x)} ${n1(y)}v2.6" stroke="#35313f" stroke-width=".15" opacity=".55"/>`;
  for (let x = R(4, 12); x < mw; x += R(22, 30)) if (clear(x, 2)) {
    const h = R(10, 13);
    mid += `<ellipse cx="${n1(x)}" cy="${n1(96)}" rx="${n1(1.2)}" ry="${n1(7)}" fill="#ffc873" opacity=".12"/>` + streetLamp(x, 88, h);
  }
  for (let i = 0; i < mw * .8; i++) mid += `<rect x="${n1(R(0, mw))}" y="${n1(R(89, 104))}" width="${n1(R(1, 3))}" height=".2" fill="#3a3646" opacity=".6"/>`;
  for (let x = R(-5, 5); x < mw; x += R(10, 16)) mid += shrub(x, 92, R(6, 9), ['#0c1209', '#131b0e', '#1a2413', '#233019'], { leaf: R(.9, 1.2), n: 5 });
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
    sky: 'linear-gradient(#0c0d20 0%, #181c40 40%, #2b3162 70%, #3c3f73 100%)',
    far: [fw, far], mid: [mw, mid], move: [vw, move], frame, fx: 'night', glowDefault: [255, 180, 110],
    curtain: ['#0b100a', '#141d0f', '#1f2b15', '#2f3a1a', '#3f4a22'],
  };
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
function skateboard(x, y, h, c, c2) {
  return `<rect x="${n1(x - h * .13)}" y="${n1(y)}" width="${n1(h * .26)}" height="${n1(h)}" rx="${n1(h * .13)}" fill="${c}"/><path d="M${n1(x - h * .08)} ${n1(y + h * .3)}q${n1(h * .08)} ${n1(h * .15)} ${n1(h * .16)} 0M${n1(x - h * .08)} ${n1(y + h * .6)}q${n1(h * .08)} ${n1(h * .12)} ${n1(h * .16)} 0" stroke="${c2}" stroke-width="${n1(h * .05)}" fill="none"/>`;
}
function pot(x, y, s, c = '#b08a64') {
  track(x - s * 1.4, y - s * 2.2); track(x + s * 1.4, y);
  let out = `<path d="M${n1(x - s * .5)} ${n1(y - s * .9)}h${n1(s)}l${n1(-s * .12)} ${n1(s * .9)}h${n1(-s * .76)}Z" fill="${c}"/><path d="M${n1(x - s * .5)} ${n1(y - s * .9)}h${n1(s * .45)}l${n1(-s * .04)} ${n1(s * .9)}h${n1(-s * .3)}Z" fill="${light(c, .12)}"/>`;
  for (let i = 0; i < 5; i++) out += monstera(x, y - s * .9, s * R(1.1, 1.6), -90 + (i - 2) * 38 + R(-8, 8), pick(['#4f7a45', '#3d5c36', '#5a8a48']), { cls: '' });
  return out;
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

export function sceneAttic(W, stops) {
  reseed(51 + stops);
  const fw = planeW(W, stops, FACTORS.far), mw = planeW(W, stops, FACTORS.mid), vw = planeW(W, stops, FACTORS.move);
  const workX = (k) => at(W, FACTORS.mid)(k, W / 2);
  const facade0 = workX(1) - W * .36, wallX = (workX(1) + workX(2)) / 2, hz = 64;
  let far = '', mid = '', move = '';
  // 奥：左から右へ、夜から夜明けへ。月と星は左、朝焼けは右
  const [skG, skD] = lgrad([[0, '#0d1027'], [.3, '#20264f'], [.5, '#5b5a8f'], [.68, '#c79aa8'], [.85, '#f3bf9c'], [1, '#fbd9b0']], [0, 0, 1, 0]);
  const [hzG, hzD] = lgrad([[0, '#ffffff', 0], [1, '#ffd9b3', .55]]);
  far += `<defs>${skD}${hzD}</defs><rect x="-5" y="-5" width="${n1(fw + 10)}" height="110" fill="url(#${skG})"/><rect x="-5" y="30" width="${n1(fw + 10)}" height="${hz - 28}" fill="url(#${hzG})"/>`;
  for (let i = 0; i < fw * 1.4; i++) { const x = R(0, fw); if (rnd() > 1.1 - x / fw * 1.2 && x > fw * .5) continue; far += `<circle class="twinkle" style="animation-delay:${n1(-R(0, 4))}s" cx="${n1(x)}" cy="${n1(R(0, 50))}" r="${n1(R(.08, .26))}" fill="#fff6e0" opacity="${n1((1 - x / fw * .9) * 100) / 100}"/>`; }
  far += rglow(fw * .16, 18, 18, '#fdf3da', .35) + `<circle cx="${n1(fw * .16)}" cy="18" r="4.6" fill="#fbf1d2"/><circle cx="${n1(fw * .16 - 1.2)}" cy="17" r="1" fill="#e9dcb4" opacity=".6"/><circle cx="${n1(fw * .16 + 1.4)}" cy="19.2" r=".7" fill="#e9dcb4" opacity=".6"/>`;
  far += rglow(fw * .98, hz - 2, 30, '#ffd2a6', .6);
  far += mountains(-10, fw + 10, hz, 38, 52, '#6f7aa3', '#eef1fa', { wmin: 28, wmax: 60 });
  far += mountains(-10, fw + 10, hz + 1, 50, 58, '#5a6590', '#dfe4f2', { wmin: 20, wmax: 40 });
  for (let x = R(-4, 4); x < fw; x += R(3, 6)) far += pine(x, hz + 3 + R(-1, 1), R(8, 13), '#3b4670', '#c9d1ea');
  far += `<rect x="-5" y="${hz + 2}" width="${n1(fw + 10)}" height="${n1(106 - hz)}" fill="#c9d1e6"/>`;
  // 中景（外）：雪の地面、雪をかぶった森、小屋へ続く足あと
  const [snG, snD] = lgrad([[0, '#dfe5f3'], [1, '#b9c3dc']]);
  mid += `<defs>${snD}</defs><path d="M-5 106L-5 78${smoothD(Array.from({ length: 8 }, (_, i) => [-5 + (wallX + 5) * i / 7, 78 + R(-1.5, 1.5)]))}L${n1(wallX)} 106Z" fill="url(#${snG})"/>`;
  for (let x = R(-5, 5); x < facade0 - 4; x += R(9, 16)) mid += pine(x, R(78, 81), R(40, 70), pick(['#24344a', '#2b3d52', '#1f2d40']));
  for (let x = R(-5, 5); x < facade0; x += R(5, 9)) mid += `<ellipse cx="${n1(x)}" cy="${n1(R(80, 84))}" rx="${n1(R(3, 7))}" ry="${n1(R(.6, 1.2))}" fill="#f4f6fc" opacity=".8"/>`;
  for (let x = W * .3, i = 0; x < workX(1) - 4; x += 2.6, i++) mid += `<ellipse cx="${n1(x)}" cy="${n1(92 + (i % 2 ? 1.1 : -1.1) + Math.sin(x * .05))}" rx=".7" ry=".32" fill="#9aa6c4" opacity=".75"/>`;
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
  const mids = []; for (let k = 2; k < stops - 1; k++) mids.push((workX(k) + workX(k + 1)) / 2);
  const wins = mids.slice(1).map((m) => [m - 8, 16, 16, 40]);
  mid += wallWithWindows(wallX, mw + 5, -5, 80, '#5a3e2a', wins);
  for (let x = wallX; x < mw + 5; x += R(4, 6)) mid += `<path d="M${n1(x)} -5V80" stroke="#3f2a1c" stroke-width=".35"/>` + (rnd() < .5 ? `<circle cx="${n1(x + 1)}" cy="${n1(R(5, 75))}" r=".18" fill="#2a1c12"/>` : '');
  mid += wins.map((w) => windowFrame(...w)).join('');
  for (const [wx, wy, ww, wh] of wins) for (const side of [-1, 1]) {
    const cx = side < 0 ? wx - 1 : wx + ww + 1;
    mid += `<path d="M${n1(cx - 2.2)} ${n1(wy - 2)}H${n1(cx + 2.2)}Q${n1(cx + 1.4 * side)} ${n1(wy + wh * .5)} ${n1(cx + 2.6)} ${n1(wy + wh + 2)}H${n1(cx - 2.6)}Q${n1(cx - 1.4 * side)} ${n1(wy + wh * .5)} ${n1(cx - 2.2)} ${n1(wy - 2)}Z" fill="#6e3a2e"/><path d="M${n1(cx - 1)} ${n1(wy - 1)}Q${n1(cx - .6)} ${n1(wy + wh * .5)} ${n1(cx - 1.2)} ${n1(wy + wh + 1.5)}M${n1(cx + .8)} ${n1(wy - 1)}Q${n1(cx + 1.2)} ${n1(wy + wh * .5)} ${n1(cx + .9)} ${n1(wy + wh + 1.5)}" stroke="#4e2820" stroke-width=".35" fill="none"/>`;
  }
  for (const [wx, wy, ww] of wins) mid += `<rect x="${n1(wx - 4)}" y="${n1(wy - 2.8)}" width="${n1(ww + 8)}" height=".8" rx=".4" fill="#2a1c12"/>`;
  mid += `<rect x="${n1(wallX)}" y="-5" width="3" height="87" fill="#2e2016"/>`;
  const [flG, flD] = lgrad([[0, '#6b4a30'], [1, '#4a3322']]);
  mid += `<defs>${flD}</defs><rect x="${n1(wallX)}" y="80" width="${n1(mw - wallX + 5)}" height="26" fill="url(#${flG})"/><rect x="${n1(wallX)}" y="80" width="${n1(mw - wallX + 5)}" height=".8" fill="#2e2016"/>`;
  for (let y = 83; y < 106; y += 3.2) mid += `<path d="M${n1(wallX)} ${n1(y)}H${n1(mw + 5)}" stroke="#3f2a1c" stroke-width=".25"/>`;
  // 床板の継ぎ目と木目、巾木、額灯が床に落とす光
  for (let y = 80, r = 0; y < 106; y += 3.2, r++) for (let x = wallX + (r % 3) * 7; x < mw + 5; x += R(16, 24)) mid += `<path d="M${n1(x)} ${n1(y)}v3.2" stroke="#2e2016" stroke-width=".25" opacity=".8"/>`;
  for (let i = 0; i < (mw - wallX) / 3; i++) { const x = R(wallX, mw), y = R(81, 105); mid += `<path d="M${n1(x)} ${n1(y)}q${n1(R(2, 4))} ${n1(R(-.3, .3))} ${n1(R(5, 9))} 0" stroke="#7a5638" stroke-width=".18" fill="none" opacity=".45"/>`; }
  mid += `<rect x="${n1(wallX)}" y="78.4" width="${n1(mw - wallX + 5)}" height="1.6" fill="#3a2718"/><rect x="${n1(wallX)}" y="78.4" width="${n1(mw - wallX + 5)}" height=".35" fill="#7a5638" opacity=".7"/>`;
  for (let k = 2; k < stops; k++) mid += rglow(workX(k), 86, 22, '#ffcf85', .16);
  for (let k = 2; k < stops; k++) { const x = workX(k); mid += `<ellipse cx="${n1(x)}" cy="94" rx="${n1(W * .18)}" ry="3.2" fill="#7a3f33"/><ellipse cx="${n1(x)}" cy="94" rx="${n1(W * .15)}" ry="2.4" fill="none" stroke="#d9a35a" stroke-width=".5" stroke-dasharray="1.2 .8"/>`; }
  if (mids.length) { const m = mids[0]; mid += shelf(m - 11, 26, 22) + shelf(m - 11, 40, 22) + rglow(m, 74, 16, '#ff9a4a', .45) + `<path d="M${n1(m - 4)} 80v-9h8v9Z" fill="#1d1916"/><rect x="${n1(m - 2.6)}" y="73.5" width="5.2" height="3.4" fill="#ff8a3a"/><path d="M${n1(m + 2)} 71V52h1.4V71Z" fill="#1d1916"/>`; }
  mid += skateboard(wallX + 8, 26, 20, '#d4d0b5', '#382a1d') + skateboard(wallX + 14, 27, 20, '#e3dcc0', '#7f6032');
  // 手前：外は雪の枝、中は鉢植え
  for (let s = 0; s < stops - 1; s++) {
    const x = at(W, FACTORS.move)(s + .5, W / 2), Z = moveZones(W, s, 0, 84);
    move += s === 0 ? guard(Z, (k) => pine(x, 112, 60 * k, '#16212f')) : guard(Z, (k) => pot(x, 108, 10 * k, '#8e6e4f'));
  }
  return {
    sky: '#0d1027',
    far: [fw, far], mid: [mw, mid], move: [vw, move], frame: '', fx: 'attic', glowDefault: [255, 206, 140],
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
