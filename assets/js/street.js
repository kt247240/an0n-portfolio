// =========================================================
// 森の中のストリート：ヒップホップの小物を ANON. の作風（輪郭線なしのフラットな面）で描く
// スピーカー（.cone）はビートのキックに合わせて脈打ち、レコード（.spin）は回る
// =========================================================

const cone = (x, y, r) => `<g class="cone" style="transform-origin:${x}px ${y}px"><circle cx="${x}" cy="${y}" r="${r}" fill="#262420"/><circle cx="${x}" cy="${y}" r="${r * .72}" fill="#35322b"/><circle cx="${x}" cy="${y}" r="${r * .3}" fill="#1a1814"/><circle cx="${x - r * .25}" cy="${y - r * .3}" r="${r * .12}" fill="#57524a"/></g>`;

export const PROPS = {
  boombox: {
    w: 20, h: 12,
    svg: () => `<svg viewBox="0 0 120 72"><path d="M30 16Q60 -6 90 16" stroke="#2a2822" stroke-width="5" fill="none"/><path d="M96 16L114 -12" stroke="#a9a397" stroke-width="1.6"/>
      <rect x="4" y="16" width="112" height="54" rx="6" fill="#d8d0bc"/><rect x="4" y="16" width="112" height="11" rx="5" fill="#c3baa4"/>
      ${[48, 56, 64, 72].map((x, i) => `<rect x="${x}" y="19" width="6" height="4" rx="1" fill="${['#df7418', '#2a2822', '#2a2822', '#a5c23e'][i]}"/>`).join('')}
      ${cone(29, 46, 19)}${cone(91, 46, 19)}
      <rect x="48" y="32" width="24" height="17" rx="2" fill="#2a2822"/><circle cx="55" cy="40" r="3" fill="#d8d0bc"/><circle cx="65" cy="40" r="3" fill="#d8d0bc"/><rect x="49" y="45" width="22" height="2" fill="#df7418"/>
      <rect x="50" y="54" width="20" height="3" rx="1.5" fill="#9e9582"/><circle cx="60" cy="63" r="2" fill="#e8483b" class="led"/></svg>`,
  },
  // 入口の森：小さな木のサイドテーブルに載せたレコードプレーヤー（下の段にはレコード）
  recordStand: {
    w: 11, h: 13,
    svg: () => `<svg viewBox="0 0 60 72"><ellipse cx="30" cy="70.6" rx="25" ry="1.8" fill="#000" opacity=".2"/>
      <path d="M9 34L10.6 70H13.4L13.6 34ZM46.4 34L46.6 70H49.4L51 34Z" fill="#6b4630"/><path d="M11 34L11.8 70H13.4L13.6 34Z" fill="#7d5438"/>
      <rect x="10" y="52" width="40" height="2.6" fill="#7d5438"/>
      ${['#e8483b', '#2f6a44', '#e4c496', '#385871', '#df7418', '#c7b3e6', '#1f1d1a'].map((c, i) => `<rect x="${14 + i * 4.6}" y="${39.5 + (i % 3) * .8}" width="3.6" height="${12.5 - (i % 3) * .8}" fill="${c}" transform="rotate(${i === 6 ? 8 : 0} ${16 + i * 4.6} 52)"/>`).join('')}
      <rect x="5" y="31" width="50" height="4" rx="1" fill="#8f602e"/><rect x="5" y="31" width="50" height="1.2" rx=".6" fill="#b07a48"/>
      <rect x="8" y="22" width="44" height="9.4" rx="1.4" fill="#5a3b24"/><rect x="8" y="22" width="44" height="2" rx="1" fill="#7a5234"/>
      <rect x="9.5" y="20.4" width="41" height="3" rx="1" fill="#26221e"/>
      <g transform="translate(27 21.4) scale(1 .32)"><g class="spin"><circle r="16" fill="#141210"/><circle r="12.5" fill="none" stroke="#2a2621" stroke-width=".8"/><circle r="9" fill="none" stroke="#2a2621" stroke-width=".8"/><circle r="5" fill="#df7418"/><circle r=".8" fill="#e8e2d2"/><path d="M-1 -16h2v5h-2z" fill="#3a3630"/></g></g>
      <g class="arm"><path d="M47 17.6L45 21L37 21.4" stroke="#d8d0bc" stroke-width=".9" fill="none" stroke-linecap="round"/><rect x="35.6" y="20.6" width="2.2" height="1.4" rx=".3" fill="#bdb5a0"/></g><circle cx="47" cy="17.6" r="1.6" fill="#bdb5a0"/>
      <circle cx="47.6" cy="27" r="1.1" fill="#c9a36a"/><rect x="11" y="26.4" width="6" height="1.2" rx=".6" fill="#c9a36a" opacity=".8"/></svg>`,
  },
  // 夜更けの小屋：同じサイドテーブルに、画面つきの小さなプレーヤー（左右にスピーカー、真ん中の画面に BHI STORE の絵）。
  // 画面（どこでも）をタップすると曲が流れる／止まる（eggs.js の musicbox）
  musicStand: {
    w: 12, h: 13,
    svg: () => `<svg viewBox="0 0 60 72"><ellipse cx="30" cy="70.6" rx="25" ry="1.8" fill="#000" opacity=".2"/>
      <path d="M9 34L10.6 70H13.4L13.6 34ZM46.4 34L46.6 70H49.4L51 34Z" fill="#6b4630"/><path d="M11 34L11.8 70H13.4L13.6 34Z" fill="#7d5438"/>
      <rect x="10" y="52" width="40" height="2.6" fill="#7d5438"/>
      ${['#e8483b', '#2f6a44', '#e4c496', '#385871', '#df7418', '#c7b3e6', '#1f1d1a'].map((c, i) => `<rect x="${14 + i * 4.6}" y="${39.5 + (i % 3) * .8}" width="3.6" height="${12.5 - (i % 3) * .8}" fill="${c}" transform="rotate(${i === 6 ? 8 : 0} ${16 + i * 4.6} 52)"/>`).join('')}
      <rect x="5" y="31" width="50" height="4" rx="1" fill="#8f602e"/><rect x="5" y="31" width="50" height="1.2" rx=".6" fill="#b07a48"/>
      <ellipse cx="30" cy="31.2" rx="23" ry=".8" fill="#000" opacity=".25"/>
      <rect x="7" y="4" width="46" height="27.4" rx="2.2" fill="#5a3b24"/><rect x="7" y="4" width="46" height="1.6" rx=".8" fill="#7a5234"/>
      <rect x="8.4" y="5.8" width="43.2" height="24.2" rx="1.4" fill="#231d19"/>
      ${[12.9, 47.1].map((x) => `<circle cx="${x}" cy="11.6" r="2" fill="#15110f"/><circle cx="${x}" cy="11.6" r="1.2" fill="#3a322c"/><circle cx="${x}" cy="21.4" r="4.3" fill="#15110f"/><circle cx="${x}" cy="21.4" r="3.4" fill="#3a322c"/><circle cx="${x}" cy="21.4" r="1.4" fill="#4a4038"/><circle cx="${x}" cy="27.6" r=".8" fill="#c9a36a"/>`).join('')}
      <rect x="17.6" y="6.6" width="24.8" height="22.6" rx=".8" fill="#0e0c0b"/>
      <image href="assets/art/bhi-store.webp" x="18.8" y="7.6" width="22.4" height="20.6" preserveAspectRatio="xMidYMid slice"/>
      <rect x="20" y="29.6" width="4" height=".7" rx=".35" fill="#c9a36a" opacity=".8"/><circle cx="39.4" cy="29.95" r=".45" fill="#e8483b" class="mb-led"/></svg>`,
  },
  turntable: {
    w: 22, h: 12,
    svg: () => `<svg viewBox="0 0 130 70"><rect x="2" y="30" width="126" height="38" rx="3" fill="#8f602e"/><rect x="2" y="30" width="126" height="6" fill="#a8764a"/>
      <rect x="6" y="18" width="118" height="16" rx="3" fill="#2a2520"/>
      <g transform="translate(52 24) scale(1 .3)"><g class="spin"><circle r="40" fill="#141210"/><circle r="30" fill="none" stroke="#24211c" stroke-width="2"/><circle r="20" fill="none" stroke="#24211c" stroke-width="2"/><circle r="13" fill="#df7418"/><rect x="-2" y="-40" width="4" height="12" fill="#3a3630"/></g></g>
      <path d="M112 20L106 26L84 24" stroke="#d8d0bc" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="112" cy="20" r="3.5" fill="#bdb5a0"/>
      <circle cx="116" cy="50" r="4" fill="#2a2520"/><rect x="12" y="48" width="18" height="3" rx="1.5" fill="#6b4a2e"/></svg>`,
  },
  crate: {
    w: 15, h: 13,
    svg: () => `<svg viewBox="0 0 80 70">${['#e8483b', '#2f6a44', '#c7b3e6', '#e4c496', '#385871', '#df7418'].map((c, i) => `<rect x="${8 + i * 10}" y="${4 + (i % 3) * 3}" width="22" height="30" fill="${c}" transform="rotate(${-8 + i * 3} ${19 + i * 10} 34)"/>`).join('')}
      <rect x="2" y="22" width="76" height="46" rx="3" fill="#df7418"/>
      ${[0, 1, 2].map((r) => [0, 1, 2, 3, 4].map((c) => `<rect x="${8 + c * 14}" y="${28 + r * 13}" width="9" height="8" rx="2" fill="#b95c10"/>`).join('')).join('')}
      <rect x="2" y="22" width="76" height="4" fill="#f08a2c"/></svg>`,
  },
  cans: {
    w: 14, h: 11,
    svg: () => `<svg viewBox="0 0 80 60">${[['#a5c23e', 6, 0], ['#e8483b', 26, 0], ['#4588a6', 46, 0]].map(([c, x]) => `<rect x="${x}" y="14" width="16" height="44" rx="4" fill="${c}"/><rect x="${x}" y="30" width="16" height="10" fill="#fffaf2" opacity=".85"/><rect x="${x + 3}" y="6" width="10" height="9" rx="2" fill="#e9e3d6"/><rect x="${x + 6}" y="2" width="4" height="5" fill="#2a2822"/>`).join('')}
      <g transform="rotate(-78 70 54)"><rect x="62" y="30" width="15" height="40" rx="4" fill="#c7b3e6"/><rect x="65" y="23" width="9" height="8" rx="2" fill="#e9e3d6"/></g>
      <path d="M0 58Q40 54 80 58" stroke="#a5c23e" stroke-width="2" fill="none" opacity=".6"/></svg>`,
  },
  cassettes: {
    w: 13, h: 9,
    svg: () => `<svg viewBox="0 0 70 50">${[['#2a2822', '#e4c496', 0, -3], ['#d8d0bc', '#df7418', 10, 4], ['#385871', '#fffaf2', 20, -2]].map(([c, l, y, r]) => `<g transform="rotate(${r} 35 ${40 - y})"><rect x="6" y="${26 - y}" width="58" height="18" rx="2" fill="${c}"/><rect x="11" y="${29 - y}" width="48" height="8" fill="${l}"/><circle cx="24" cy="${38 - y}" r="2.5" fill="#1a1814"/><circle cx="46" cy="${38 - y}" r="2.5" fill="#1a1814"/></g>`).join('')}</svg>`,
  },
  // 小屋の家具：くたっとした一人がけのソファと、真鍮のサイドランプ、読みかけの本
  armchair: {
    w: 21, h: 17,
    svg: () => `<svg viewBox="0 0 100 80"><ellipse cx="44" cy="78.6" rx="42" ry="2" fill="#000" opacity=".25"/>
      <path d="M12 72V78M70 72V78" stroke="#2e1f14" stroke-width="3"/>
      <path d="M8 30Q8 14 24 13H58Q74 14 74 30V52H8Z" fill="#8a4a32"/><path d="M8 30Q8 14 24 13H40V52H8Z" fill="#9b573b"/>
      ${[26, 42, 58].map((x) => `<circle cx="${x}" cy="28" r=".9" fill="#5e2f1f"/><circle cx="${x}" cy="40" r=".9" fill="#5e2f1f"/>`).join('')}
      <path d="M4 44Q4 38 10 38H72Q78 38 78 44V72H4Z" fill="#7a3f2a"/>
      <path d="M13 46H69Q72 46 72 50V56H10V50Q10 46 13 46Z" fill="#a1603f"/><path d="M13 46H69Q72 46 72 48H10Q10 46 13 46Z" fill="#b8734e"/>
      <path d="M0 42Q0 34 7 34Q14 34 14 42V72H0Z" fill="#8f4b33"/><path d="M68 42Q68 34 75 34Q82 34 82 42V72H68Z" fill="#6f3825"/>
      <path d="M18 36Q24 30 34 33L32 44Q24 42 18 44Z" fill="#d9c49f"/><path d="M20 38L31 36" stroke="#b09a74" stroke-width=".6"/>
      <g transform="translate(90 0)"><path d="M0 78V26" stroke="#b08a4a" stroke-width="1.6"/><path d="M-5 78H5" stroke="#8a6a36" stroke-width="2.4"/>
      <path d="M-7 26L-4 12H4L7 26Z" fill="#e8d7b0"/><path d="M-7 26H7" stroke="#cbb58a" stroke-width="1"/><ellipse cx="0" cy="27" rx="6" ry="1.2" fill="#ffe2a8" class="lit"/></g></svg>`,
  },
  // 本とレコードを積んだ低い木箱
  bookcrate: {
    w: 13, h: 9.3,
    svg: () => `<svg viewBox="0 0 70 50"><ellipse cx="35" cy="49" rx="33" ry="1.6" fill="#000" opacity=".25"/>
      <rect x="4" y="20" width="62" height="29" rx="1.5" fill="#8f602e"/><rect x="4" y="20" width="62" height="3" fill="#a8764a"/>
      <path d="M4 34H66" stroke="#6b4630" stroke-width="1"/>${[8, 22, 36, 50].map((x) => `<rect x="${x}" y="25" width="10" height="4" rx="1" fill="#5a3b24"/>`).join('')}
      ${['#e8483b', '#2f6a44', '#e4c496', '#385871', '#c7b3e6'].map((c, i) => `<rect x="${9 + i * 4}" y="${3 + (i % 2) * 2}" width="3.4" height="${17 - (i % 2) * 2}" fill="${c}"/>`).join('')}
      <g transform="rotate(-10 44 14)"><rect x="32" y="9" width="24" height="3.2" fill="#df7418"/><rect x="33" y="12.2" width="22" height="3" fill="#d9c49f"/><rect x="34" y="15.2" width="20" height="3" fill="#385871"/></g>
      <circle cx="60" cy="16" r="3.6" fill="#141210"/><circle cx="60" cy="16" r="1.2" fill="#df7418"/></svg>`,
  },
  sneakers: {
    w: 12, h: 30, hang: true,
    svg: () => `<svg viewBox="0 0 60 150"><path d="M-40 4Q30 14 100 2" stroke="#1d1a14" stroke-width="1.2" fill="none"/>
      <path d="M28 9L20 96M32 9L40 104" stroke="#f1e6cf" stroke-width="1.1"/>
      <g transform="rotate(12 20 110)"><path d="M8 96h20q8 0 10 10l2 8H6Z" fill="#2f7a5c"/><rect x="5" y="112" width="36" height="6" rx="2" fill="#efe3c8"/><path d="M14 100h10M13 104h12" stroke="#efe3c8" stroke-width="1.4"/></g>
      <g transform="rotate(-8 40 118)"><path d="M28 104h20q8 0 10 10l2 8H26Z" fill="#2f7a5c"/><rect x="25" y="120" width="36" height="6" rx="2" fill="#efe3c8"/><path d="M34 108h10M33 112h12" stroke="#efe3c8" stroke-width="1.4"/></g></svg>`,
  },
};

// 苔むした岩（文字は描かない）。光は左上から、右下に影
export const ROCK = {
  w: 26, h: 15,
  svg: (v = 0) => `<svg viewBox="0 0 160 90"><ellipse cx="82" cy="84" rx="74" ry="6" fill="#1f2a14" opacity=".28"/>
    <path d="M10 84C4 66 14 44 34 34C48 22 70 14 92 18C116 22 140 34 150 56C156 70 154 80 148 84Z" fill="#8c8a7c"/>
    <path d="M92 18C116 22 140 34 150 56C156 70 154 80 148 84H86C104 70 108 44 92 18Z" fill="#747266"/>
    <path d="M10 84C4 66 14 44 34 34C40 30 46 28 52 27C34 40 26 60 30 84Z" fill="#a19f90"/>
    <path d="M58 84C62 70 70 62 80 58" stroke="#6a685c" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".7"/>
    <path d="M28 40C40 26 62 16 88 18C104 20 118 26 128 34C112 30 96 32 86 38C72 30 50 32 28 40Z" fill="#6f8f3c"/>
    <path d="M34 36C46 26 62 20 80 20C66 24 54 30 46 38Z" fill="#94b04c"/>
    <path d="M128 34C136 40 142 48 146 56C138 50 130 46 122 44Z" fill="#5f7d2e"/>
    ${v % 2 ? '<g transform="translate(118 36) rotate(18)"><path d="M0 0C3 -2 3 -8 0 -11C-3 -8 -3 -2 0 0Z" fill="#769721"/></g><g transform="translate(122 38) rotate(52)"><path d="M0 0C2.6 -2 2.6 -7 0 -9C-2.6 -7 -2.6 -2 0 0Z" fill="#a5c23e"/></g>' : '<g transform="translate(40 34) rotate(-30)"><path d="M0 0C3 -2 3 -8 0 -11C-3 -8 -3 -2 0 0Z" fill="#769721"/></g><g transform="translate(44 33) rotate(8)"><path d="M0 0C2.6 -2 2.6 -7 0 -9C-2.6 -7 -2.6 -2 0 0Z" fill="#a5c23e"/></g>'}
    <path d="M6 86Q20 78 30 84Q40 76 52 86Z" fill="#47733c"/><path d="M118 86Q132 78 142 84Q150 80 158 86Z" fill="#47733c"/></svg>`,
};
