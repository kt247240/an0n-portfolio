// =========================================================
// 部屋の入口：部屋の名前の代わりに、その部屋らしい小さなアニメーションで迎える
// 文字は使わない。形は nature.js と同じ作風（輪郭線なし、光は左上から）
// 座標は viewBox 0 0 200 100（画面いっぱいに slice で敷く）
// =========================================================

let s = 7;
const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
const R = (a, b) => a + rnd() * (b - a);
const f1 = (v) => Math.round(v * 10) / 10;

// 朝の森：小鳥の群れが弧を描いて横切り、葉が一枚ひらひら落ちる
function forest() {
  s = 11;
  let birds = '';
  for (let i = 0; i < 7; i++) {
    const y = R(22, 40), sc = R(.7, 1.15), d = R(0, 1.6);
    birds += `<g class="ib-fly" style="--y:${f1(y)}px;--d:${f1(d)}s;--dur:${f1(R(7, 9))}s"><g transform="scale(${f1(sc)})"><g class="ib-flap" style="--d:${f1(R(0, .4))}s">
      <path d="M0 0Q-3 -3.2 -6 -1.6Q-3 -1.4 0 .6Z" fill="#3f5a3a"/><path d="M0 0Q3 -3.2 6 -1.6Q3 -1.4 0 .6Z" fill="#4d6b45"/></g><ellipse cx="0" cy=".4" rx="1.6" ry=".9" fill="#2f4630"/></g></g>`;
  }
  const leaves = [0, 1, 2].map((i) => `<g class="ib-fall" style="--x:${f1(R(70, 130))}px;--d:${i * 2.4}s"><g class="ib-spin"><path d="M0 0C1.6 -.6 1.6 -3.4 0 -4.2C-1.6 -3.4 -1.6 -.6 0 0Z" fill="${['#a5c23e', '#769721', '#c9d77a'][i]}"/></g></g>`).join('');
  return birds + leaves;
}
// 水辺：水面に波紋がひろがり、落ち葉が一枚、ゆっくり流れていく
function jungle() {
  const rip = [0, 1, 2, 3].map((i) => `<ellipse class="ib-ripple" style="--d:${i * .9}s" cx="100" cy="66" rx="16" ry="4" fill="none" stroke="#eef3d8" stroke-width=".5"/>`).join('');
  const leaf = `<g class="ib-drift"><path d="M0 0C2 -1 5 -1 7 0C5 1 2 1 0 0Z" fill="#8a9a3a"/><path d="M0 0L7 0" stroke="#5f6a28" stroke-width=".2"/><ellipse cx="3.5" cy=".6" rx="4" ry=".6" fill="#000" opacity=".12"/></g>`;
  return rip + leaf;
}
// 夕凪：水平線の上を、カモメが一羽ゆっくり渡っていく
function cove() {
  return `<g class="ib-gull"><g class="ib-flap" style="--d:0s"><path d="M0 0Q-3 -2.6 -6.5 -1Q-3 -1 0 .5Z" fill="#fffaf2"/><path d="M0 0Q3 -2.6 6.5 -1Q3 -1 0 .5Z" fill="#f1e6da"/></g></g>`;
}
// 夜の庭：ホタルが集まってきて、ゆっくり輪を描いてのぼる
function night() {
  s = 41;
  let out = '<defs><radialGradient id="ib-ff"><stop offset="0" stop-color="#f5ff9e" stop-opacity=".9"/><stop offset=".35" stop-color="#e8ff7a" stop-opacity=".35"/><stop offset="1" stop-color="#e8ff7a" stop-opacity="0"/></radialGradient></defs>';
  for (let i = 0; i < 16; i++) {
    out += `<g class="ib-ff" style="--x:${f1(R(60, 140))}px;--y:${f1(R(50, 80))}px;--r:${f1(R(4, 14))}px;--d:${f1(-R(0, 8))}s;--dur:${f1(R(6, 10))}s"><circle r="3" fill="url(#ib-ff)"/><circle r=".45" fill="#fbffd8"/></g>`;
  }
  return out;
}
// 夜更けの小屋：雪山の夜空を、流れ星がすっと流れる（雪原は An0n の絵なので、絵の上には何も描かない）
function attic() {
  const tail = '<defs><linearGradient id="ib-sg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="12" y2="-5"><stop offset="0" stop-color="#fffbe8"/><stop offset=".25" stop-color="#e8ecff" stop-opacity=".7"/><stop offset="1" stop-color="#c8d2ff" stop-opacity="0"/></linearGradient></defs>';
  const star = (x0, y0, x1, y1, d) => `<g class="ib-star" style="--x0:${x0}px;--y0:${y0}px;--x1:${x1}px;--y1:${y1}px;--d:${d}s"><path d="M0 0L12 -5" stroke="url(#ib-sg)" stroke-width=".32" stroke-linecap="round"/><circle r=".3" fill="#fffbe8"/></g>`;
  return tail + star(128, 5, 90, 21, 1.2) + star(112, 10, 80, 23, 6.4);
}

const BUILD = { forest, jungle, cove, night, attic };
export const introSVG = (scene) => `<svg class="room-intro intro-${scene}" viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${(BUILD[scene] || forest)()}</svg>`;
