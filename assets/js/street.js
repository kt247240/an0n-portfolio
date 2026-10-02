// =========================================================
// 森の中のストリート：ヒップホップの小物を ANON. の作風（輪郭線なしのフラットな面）で描く
// スピーカー（.cone）はビートのキックに合わせて脈打ち、レコード（.spin）は回る
// =========================================================

const cone = (x, y, r) => `<g class="cone" style="transform-origin:${x}px ${y}px"><circle cx="${x}" cy="${y}" r="${r}" fill="#262420"/><circle cx="${x}" cy="${y}" r="${r * .72}" fill="#35322b"/><circle cx="${x}" cy="${y}" r="${r * .3}" fill="#1a1814"/><circle cx="${x - r * .25}" cy="${y - r * .3}" r="${r * .12}" fill="#57524a"/></g>`;

// 水辺の画面つきプレーヤー（樽の台・苔・シダ・竹の枠）。musicBarrel と musicPanel（樽の台の正面にはめ込む版）で使う
function PROPS_MUSIC_BARREL(art) {
      const leaf = (x, y, L, a, c1, c2) => `<path d="M0 0Q${L * .45} ${-L * .19} ${L} 0Z" transform="translate(${x} ${y}) rotate(${a})" fill="${c1}"/><path d="M0 0Q${L * .45} ${L * .19} ${L} 0Z" transform="translate(${x} ${y}) rotate(${a})" fill="${c2}"/>`;
      let staves = '';
      for (let i = 0; i < 7; i++) { const x = 12.5 + i * 5.6; staves += `<path d="M${x} 35.5Q${x - (i - 3) * .5} 52 ${x} 68.4h2.2Q${x + 2.2 - (i - 3) * .5} 52 ${x + 2.2} 35.5Z" fill="${i % 2 ? '#6e4d33' : '#7f5a3c'}" opacity=".55"/>`; }
      const fern = [[-160, 7], [-140, 8.4], [-118, 7.6], [-100, 6]].map(([a, L], i) => leaf(12 + i * .6, 70, L, a, '#6f8f3a', '#4f6a2c')).join('') + [[-20, 7.4], [-42, 8.2], [-64, 6.6]].map(([a, L], i) => leaf(47 - i * .6, 70, L, a, '#7d9a44', '#56722f')).join('');
      return `<svg viewBox="0 0 60 72"><ellipse cx="30" cy="70.4" rx="24" ry="1.8" fill="#000" opacity=".22"/>
      <path d="M11 34Q7.4 52 11 69.4H49Q52.6 52 49 34Z" fill="#7a5638"/>${staves}
      <path d="M11 34Q7.4 52 11 69.4H14Q11.4 52 14 34Z" fill="#5f412a"/><path d="M46 34Q48.6 52 46 69.4H49Q52.6 52 49 34Z" fill="#5f412a"/>
      <path d="M9.6 41.6Q30 43 50.4 41.6V44.2Q30 45.6 9.6 44.2Z" fill="#3a3632"/><path d="M10 61Q30 62.4 50 61V63.6Q30 65 10 63.6Z" fill="#3a3632"/>
      <ellipse cx="30" cy="34" rx="19.4" ry="2.2" fill="#8f6a44"/><ellipse cx="30" cy="34" rx="17" ry="1.5" fill="#6a4a30"/>
      <path d="M10.8 33.6Q14 31.6 18 33.2Q21 34.8 19.4 37.6Q17.6 36 15.6 36.8Q13.4 38.8 11.4 36.4Z" fill="#6f8f3a"/><path d="M40 33.4Q44.6 31.8 49.2 33.6Q50 36 47.6 37.8Q46.4 35.8 44 36.4Q41.6 37.6 40.6 35.6Z" fill="#7d9a44"/><path d="M26 34.6Q29 33.4 32 34.6Q31.4 36 29.4 35.8Q27.4 36.2 26 34.6Z" fill="#6f8f3a"/>
      <ellipse cx="30" cy="31.2" rx="22" ry=".8" fill="#000" opacity=".25"/>
      <rect x="7" y="4" width="46" height="27.4" rx="2.4" fill="#231d19"/>
      ${[7, 50.4].map((x) => `<rect x="${x}" y="3.4" width="2.6" height="28.6" rx="1.3" fill="#a88a52"/><rect x="${x}" y="11" width="2.6" height=".7" fill="#7d6538"/><rect x="${x}" y="21.4" width="2.6" height=".7" fill="#7d6538"/><rect x="${x + .5}" y="3.4" width=".6" height="28.6" fill="#c2a66a" opacity=".6"/>`).join('')}
      <rect x="7.6" y="2.6" width="44.8" height="2.4" rx="1.2" fill="#b39458"/><rect x="26" y="2.6" width=".6" height="2.4" fill="#7d6538"/><rect x="7.6" y="29.8" width="44.8" height="2.2" rx="1.1" fill="#a88a52"/>
      ${[13.4, 46.6].map((x) => `<circle cx="${x}" cy="11.4" r="1.9" fill="#15110f"/><circle cx="${x}" cy="11.4" r="1.1" fill="#3a322c"/><circle cx="${x}" cy="20.8" r="4" fill="#15110f"/><circle cx="${x}" cy="20.8" r="3.2" fill="#3a322c"/><circle cx="${x}" cy="20.8" r="1.3" fill="#4a4038"/><circle cx="${x}" cy="27" r=".75" fill="#c9a36a"/>`).join('')}
      <rect x="18" y="6.2" width="24" height="22.2" rx=".8" fill="#0e0c0b"/>
      <image href="${art}" x="19.1" y="7.2" width="21.8" height="20.2" preserveAspectRatio="xMidYMid slice"/>
      <circle cx="39.4" cy="29.2" r=".45" fill="#e8483b" class="mb-led"/>${fern}</svg>`;
    }
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
    svg: (art = 'assets/art/bhi-store.webp') => `<svg viewBox="0 0 60 72"><ellipse cx="30" cy="70.6" rx="25" ry="1.8" fill="#000" opacity=".2"/>
      <path d="M9 34L10.6 70H13.4L13.6 34ZM46.4 34L46.6 70H49.4L51 34Z" fill="#6b4630"/><path d="M11 34L11.8 70H13.4L13.6 34Z" fill="#7d5438"/>
      <rect x="10" y="52" width="40" height="2.6" fill="#7d5438"/>
      ${['#e8483b', '#2f6a44', '#e4c496', '#385871', '#df7418', '#c7b3e6', '#1f1d1a'].map((c, i) => `<rect x="${14 + i * 4.6}" y="${39.5 + (i % 3) * .8}" width="3.6" height="${12.5 - (i % 3) * .8}" fill="${c}" transform="rotate(${i === 6 ? 8 : 0} ${16 + i * 4.6} 52)"/>`).join('')}
      <rect x="5" y="31" width="50" height="4" rx="1" fill="#8f602e"/><rect x="5" y="31" width="50" height="1.2" rx=".6" fill="#b07a48"/>
      <ellipse cx="30" cy="31.2" rx="23" ry=".8" fill="#000" opacity=".25"/>
      <rect x="7" y="4" width="46" height="27.4" rx="2.2" fill="#5a3b24"/><rect x="7" y="4" width="46" height="1.6" rx=".8" fill="#7a5234"/>
      <rect x="8.4" y="5.8" width="43.2" height="24.2" rx="1.4" fill="#231d19"/>
      ${[12.9, 47.1].map((x) => `<circle cx="${x}" cy="11.6" r="2" fill="#15110f"/><circle cx="${x}" cy="11.6" r="1.2" fill="#3a322c"/><circle cx="${x}" cy="21.4" r="4.3" fill="#15110f"/><circle cx="${x}" cy="21.4" r="3.4" fill="#3a322c"/><circle cx="${x}" cy="21.4" r="1.4" fill="#4a4038"/><circle cx="${x}" cy="27.6" r=".8" fill="#c9a36a"/>`).join('')}
      <rect x="17.6" y="6.6" width="24.8" height="22.6" rx=".8" fill="#0e0c0b"/>
      <image href="${art}" x="18.8" y="7.6" width="22.4" height="20.6" preserveAspectRatio="xMidYMid slice"/>
      <rect x="20" y="29.6" width="4" height=".7" rx=".35" fill="#c9a36a" opacity=".8"/><circle cx="39.4" cy="29.95" r=".45" fill="#e8483b" class="mb-led"/></svg>`,
  },
  // 水辺用：作品と同じ木の樽を台にして（縁に苔、足もとにシダ）、竹の枠のプレーヤーをのせる
  musicBarrel: {
    w: 12, h: 13,
    svg: (art) => PROPS_MUSIC_BARREL(art),
  },
  // 作品の台（樽）の正面にはめ込む、竹の枠のプレーヤーだけ（樽の台の絵は描かない）
  musicPanel: { svg: (art) => PROPS_MUSIC_BARREL(art).replace('viewBox="0 0 60 72"', 'viewBox="6 2.4 48 30.2"') },
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
  // 電線に掛かったスニーカー：靴ひもを結んで電線にかけた一足。かかとの口がひもで吊られ、つま先が下へ（重さのかかる向き）
  // 色は入口の案内人の靴と同じ深い緑に、生成りのソール。光は左上から
  sneakers: {
    w: 12, h: 30, hang: true,
    svg: () => {
      // 靴 1 つ（横から見て、つま先が右）。原点はかかとの口の後ろの上
      const shoe = (dark) => {
        const U = dark ? ['#25624a', '#1d503c', '#173f30'] : ['#2f7a5c', '#276a4f', '#1f5a43'];
        return `<path d="M1 12.2Q0 12.4 0 14.6Q0 17.2 3 17.2H29.6Q33.4 17.2 33.4 14.6Q33.4 12.6 30.6 12.2Z" fill="#ece0c6"/>`
          + `<path d="M0.4 16Q1 17.2 3 17.2H29.6Q32.6 17.2 33.2 15.8Z" fill="#cbbb9a"/><path d="M0.6 13.4H33.1V14.1H0.6Z" fill="#d9cbab"/>`
          + `<path d="M1.6 12.4V3.6Q1.6 0 5 0H10.6Q12.6 0 13.6 1.8L16.8 6Q24.4 7 29.2 9.2Q32 10.6 31.4 12.4Z" fill="${U[0]}"/>`
          + `<path d="M1.6 9.6Q12 11.2 31.6 11.4L31.4 12.4H1.6Z" fill="${U[1]}"/>`
          + `<path d="M21.6 7.6Q27.6 8.4 30.4 10.2Q31.8 11.2 31.4 12.4H21.4Q22.6 10 21.6 7.6Z" fill="${U[1]}"/>`
          + `<path d="M1.6 12.4V5.4Q5.2 5.6 7.4 8.2L8.4 12.4Z" fill="${U[2]}"/>`
          + `<path d="M7.6 11Q15 6.6 24.4 8.4L24.6 9.6Q16 8.6 9.2 12.2Z" fill="#efe3c8"/>`
          + `<path d="M10.6 0Q12.8 -3 15.8 -1.4L17 5.6L13.6 1.8Q12.6 0 10.6 0Z" fill="${dark ? '#2d7457' : '#3a8b69'}"/>`
          + `<ellipse cx="6.2" cy=".5" rx="4.4" ry="1.1" fill="${U[2]}"/>`
          + `<path d="M2.6 1.2Q5 .2 9.8 .6L10.4 1.6Q5.4 1.2 2.6 2.6Z" fill="#5aa585" opacity=".55"/>`
          // ほどけたひもの先が、ひと房たれる
          + `<path d="M16.4 5.2Q19.6 7.6 18.6 11.4Q18 13.6 19.4 15.2" stroke="#e9dcbf" stroke-width=".7" fill="none" stroke-linecap="round"/><path d="M15.8 5.6Q17 9 15.6 12" stroke="#d9cbab" stroke-width=".6" fill="none" stroke-linecap="round"/>`
          + [[12.6, 1.6], [14.2, 3], [15.6, 4.4]].map(([x, y]) => `<path d="M${x - 1.2} ${y - .9}L${x + 1.6} ${y + .5}L${x + 1.3} ${y + 1.1}L${x - 1.5} ${y - .3}Z" fill="#efe3c8"/><circle cx="${x - 1.1}" cy="${y - .4}" r=".42" fill="${U[2]}"/>`).join('');
      };
      // 結んだひも：電線から 2 本に分かれて、それぞれの靴のかかとの口へ
      const knot = [30, 5.2];
      const lace = (x, y, bend) => `<path d="M${knot[0] - .5} ${knot[1]}Q${(knot[0] + x) / 2 + bend} ${(knot[1] + y) / 2} ${x} ${y}" stroke="#e9dcbf" stroke-width=".9" fill="none" stroke-linecap="round"/>`;
      return `<svg viewBox="0 0 60 150"><path d="M-40 4Q30 14 100 2" stroke="#1d1a14" stroke-width="1.2" fill="none"/>`
        + lace(25.4, 60, -3) + lace(34.6, 63, 3)
        // 2 足ともつま先が下、ソールは外側。奥の 1 足（右・少し暗い）は鏡に返して、少し回す
        + `<g transform="translate(34.6 63) scale(-1 1) rotate(76) translate(-6.2 -.4)">${shoe(true)}</g>`
        + `<g transform="translate(25.4 60) rotate(82) translate(-6.2 -.4)">${shoe(false)}</g>`
        // 電線に巻きついた結び目
        + `<ellipse cx="${knot[0]}" cy="${knot[1] + .2}" rx="1.7" ry="1.4" fill="#e9dcbf"/><ellipse cx="${knot[0] - .4}" cy="${knot[1] - .2}" rx=".8" ry=".6" fill="#f6eedb"/>`
        + `</svg>`;
    },
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
