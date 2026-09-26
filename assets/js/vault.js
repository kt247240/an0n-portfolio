// =========================================================
// 隠し金庫：夜更けの小屋の隅にある古い金庫。ダイヤルで暗証番号を合わせると扉がひらき、中にネックレス
// 文字は使わない（ダイヤルの数字だけ）。知らない人は気づかずに通り過ぎる
// 中身は assets/vault/vault.json に暗号化して置いてある（tools/seal-vault.mjs）。
// 番号から鍵をつくって復号できたときだけ、画像がその場で現れる（ソースを見ても中身は見えない）
// =========================================================

// 部屋に置く小さな金庫（展示室の床の上）
export const safeSVG = () => `<svg viewBox="0 0 40 44" aria-hidden="true">
  <ellipse cx="20" cy="42.6" rx="18" ry="1.6" fill="#000" opacity=".35"/>
  <rect x="5" y="39" width="5" height="3.4" rx=".8" fill="#1d201c"/><rect x="30" y="39" width="5" height="3.4" rx=".8" fill="#1d201c"/>
  <rect x="2" y="2" width="36" height="38" rx="3" fill="#2f3a33"/>
  <rect x="2" y="2" width="36" height="38" rx="3" fill="none" stroke="#46544a" stroke-width="1"/>
  <rect x="5.5" y="5.5" width="29" height="31" rx="1.6" fill="#28322c" stroke="#1c231f" stroke-width=".8"/>
  ${[[7.5, 7.5], [32.5, 7.5], [7.5, 34.5], [32.5, 34.5]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".8" fill="#5b6a5f"/>`).join('')}
  <circle cx="18" cy="21" r="7.4" fill="#1b211d"/><circle cx="18" cy="21" r="6.2" fill="#b9a27a"/><circle cx="18" cy="21" r="5.2" fill="#8d7955"/>
  ${Array.from({ length: 20 }, (_, i) => { const a = i * 18 * Math.PI / 180; return `<path d="M${(18 + Math.sin(a) * 5.2).toFixed(2)} ${(21 - Math.cos(a) * 5.2).toFixed(2)}L${(18 + Math.sin(a) * 6).toFixed(2)} ${(21 - Math.cos(a) * 6).toFixed(2)}" stroke="#3b3223" stroke-width=".35"/>`; }).join('')}
  <circle cx="18" cy="21" r="2" fill="#c9b48a"/><path d="M18 13.2v1.6" stroke="#e8d6ad" stroke-width=".7"/>
  <rect x="28.5" y="17" width="2.6" height="8" rx="1.3" fill="#9c8a66"/><rect x="29.2" y="18" width="1.2" height="6" rx=".6" fill="#6e6147"/>
  <path d="M4 3.4H36" stroke="#6b7a6f" stroke-width=".6" opacity=".6"/>
</svg>`;

import { SOUND } from './works.js';

let data = null, overlay = null, audio = null;
const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function load() {
  if (!data) data = await (await fetch('assets/vault/vault.json')).json();
  return data;
}
async function unseal(code) {
  const v = await load();
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: b64(v.salt), iterations: v.iter }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(v.iv) }, key, b64(v.data));
    if (v.format !== 'bundle') return [URL.createObjectURL(new Blob([plain], { type: v.type }))];
    const { items } = JSON.parse(new TextDecoder().decode(plain));
    return items.map((it) => URL.createObjectURL(new Blob([b64(it.data)], { type: it.type })));
  } catch { return null; }
}

// ---- 音（ダイヤルのカチ、決めたときのゴトッ、ひらくときのガチャン） ----
function sound(kind) {
  if (!SOUND) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const a = audio, t = a.currentTime, g = a.createGain();
    g.connect(a.destination);
    if (kind === 'tick') {
      const b = a.createBuffer(1, a.sampleRate * .02, a.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * .12));
      const s = a.createBufferSource(), f = a.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 2400; s.buffer = b; s.connect(f); f.connect(g); g.gain.value = .35; s.start(t);
    } else {
      const o = a.createOscillator();
      o.type = kind === 'bad' ? 'square' : 'sine';
      o.frequency.setValueAtTime(kind === 'open' ? 140 : kind === 'bad' ? 70 : 110, t);
      o.frequency.exponentialRampToValueAtTime(kind === 'open' ? 60 : 45, t + .25);
      g.gain.setValueAtTime(kind === 'bad' ? .12 : .4, t); g.gain.exponentialRampToValueAtTime(.001, t + .3);
      o.connect(g); o.start(t); o.stop(t + .32);
    }
  } catch { /* 音が出せない環境では黙って続ける */ }
}

const DIAL = () => `<svg viewBox="-50 -50 100 100" aria-hidden="true">
  <circle r="48" fill="#b9a27a"/><circle r="46" fill="#8d7955"/><circle r="30" fill="#6e5f43"/>
  ${Array.from({ length: 50 }, (_, i) => `<path d="M0 -46V${i % 5 ? -42.5 : -40}" stroke="#2f2718" stroke-width="${i % 5 ? .5 : .9}" transform="rotate(${i * 7.2})"/>`).join('')}
  ${Array.from({ length: 10 }, (_, i) => `<text x="0" y="-31" text-anchor="middle" dominant-baseline="middle" font-size="8.5" font-family="'VT323', ui-monospace, monospace" fill="#221c12" transform="rotate(${i * 36}) rotate(${-i * 36} 0 -31)">${i}</text>`).join('')}
  <circle r="20" fill="#9a8661"/><circle r="17" fill="#c9b48a"/>
</svg>`;

function build(digits) {
  overlay = document.createElement('div');
  overlay.id = 'vault';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', '金庫');
  overlay.innerHTML = `
    <button class="vault-close" aria-label="森へ戻る">×</button>
    <div class="vault-stage">
      <div class="vault-inside"><div class="vault-glow"></div><img class="vault-prize" alt="金のネックレス"></div>
      <div class="vault-door">
        <div class="vault-lamps">${'<i></i>'.repeat(digits)}</div>
        <div class="vault-dialwrap">
          <div class="vault-mark"></div>
          <div class="vault-dial" tabindex="0" role="slider" aria-label="ダイヤル" aria-valuemin="0" aria-valuemax="9" aria-valuenow="0">${DIAL()}</div>
          <button class="vault-knob" aria-label="この数字で決める"></button>
        </div>
        <div class="vault-handle"></div>
        ${[[6, 6], [94, 6], [6, 94], [94, 94]].map(([x, y]) => `<b class="rivet" style="left:${x}%;top:${y}%"></b>`).join('')}
      </div>
    </div>`;
  document.body.append(overlay);
}

export async function openVault() {
  let v;
  try { v = await load(); } catch { return; }
  if (!overlay) build(v.digits);
  const $ = (s) => overlay.querySelector(s);
  const dial = $('.vault-dial'), lamps = [...overlay.querySelectorAll('.vault-lamps i')];
  let rot = 0, num = 0, code = '', busy = false, opened = false;

  const setRot = (r, snap) => {
    rot = snap ? Math.round(r / 36) * 36 : r;
    dial.style.transform = `rotate(${rot}deg)`;
    const n = ((Math.round(-rot / 36) % 10) + 10) % 10;
    if (n !== num) { num = n; dial.setAttribute('aria-valuenow', n); sound('tick'); }
  };
  const reset = () => { code = ''; lamps.forEach((l) => l.className = ''); };
  const enter = async () => {
    if (busy || opened) return;
    code += num; sound('clunk');
    lamps[code.length - 1].className = 'on';
    if (code.length < v.digits) return;
    busy = true; overlay.classList.add('trying');
    const urls = await unseal(code);
    overlay.classList.remove('trying');
    if (!urls) {
      sound('bad'); overlay.classList.add('wrong'); lamps.forEach((l) => l.className = 'bad');
      setTimeout(() => { overlay.classList.remove('wrong'); reset(); busy = false; }, 900);
      return;
    }
    opened = true; sound('open');
    const img = $('.vault-prize');
    img.src = urls[0];
    await img.decode().catch(() => {});
    overlay.classList.add('open');
  };

  // ダイヤル：ドラッグ（指・マウス）で回す。ホイール・矢印キーでも 1 目盛りずつ
  let drag = null;
  dial.onpointerdown = (e) => {
    const r = dial.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    drag = { cx, cy, a: Math.atan2(e.clientY - cy, e.clientX - cx), r0: rot };
    dial.setPointerCapture(e.pointerId);
  };
  dial.onpointermove = (e) => {
    if (!drag) return;
    let d = Math.atan2(e.clientY - drag.cy, e.clientX - drag.cx) - drag.a;
    if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
    drag.r0 += d * 180 / Math.PI; drag.a += d;
    setRot(drag.r0);
  };
  dial.onpointerup = dial.onpointercancel = () => { if (drag) { setRot(rot, true); drag = null; } };
  dial.onwheel = (e) => { e.preventDefault(); setRot(rot + (e.deltaY > 0 ? -36 : 36), true); };
  dial.onkeydown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { setRot(rot - 36, true); e.preventDefault(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { setRot(rot + 36, true); e.preventDefault(); }
    if (e.key === 'Enter' || e.key === ' ') { enter(); e.preventDefault(); }
    if (/^\d$/.test(e.key)) { setRot(-Number(e.key) * 36, true); }
  };
  $('.vault-knob').onclick = enter;

  const close = () => {
    overlay.classList.remove('show');
    document.body.classList.remove('viewing');
    removeEventListener('keydown', onKey);
    setTimeout(() => {
      overlay.querySelectorAll('img').forEach((im) => { if (im.src.startsWith('blob:')) URL.revokeObjectURL(im.src); });
      overlay.remove(); overlay = null;
    }, 600);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  addEventListener('keydown', onKey);
  $('.vault-close').onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };

  setRot(0, true); reset();
  document.body.classList.add('viewing');
  requestAnimationFrame(() => { overlay.classList.add('show'); dial.focus({ preventScroll: true }); });
}
