// =========================================================
// 仮のビート：Web Audio でその場で鳴らす lo-fi ブーンバップ
// 自作ビートができたら works.js の ROOMS に beat: 'assets/beats/xxx.mp3' を書くと、そちらを優先して流す
// =========================================================

// 部屋ごとのコード進行（MIDI ノート番号）、こもり具合、レコードのノイズ量
const SCENES = {
  forest: { chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60, 64], [48, 52, 55, 59]], cutoff: 2600, crackle: .5 },
  jungle: { chords: [[57, 60, 64, 67, 71], [50, 54, 57, 60, 64], [55, 59, 62, 66], [48, 52, 55, 59]], cutoff: 2200, crackle: .6 },
  cove: { chords: [[51, 55, 58, 62], [50, 53, 57, 60], [48, 51, 55, 58, 62], [46, 50, 53, 57]], cutoff: 3000, crackle: .45 },
  night: { chords: [[48, 51, 55, 58, 62], [44, 48, 51, 55], [41, 44, 48, 51, 55], [43, 47, 50, 53, 58]], cutoff: 1900, crackle: .7 },
  attic: { chords: [[50, 53, 57, 60, 64], [43, 47, 50, 53, 57], [48, 52, 55, 59, 62], [45, 49, 52, 55, 58]], cutoff: 1400, crackle: 1 },
};
const BPM = 86, STEP = 60 / BPM / 4;
const hz = (m) => 440 * 2 ** ((m - 69) / 12);

export function createBeat({ onKick = () => {}, onSnare = () => {}, files = {} } = {}) {
  let ctx, master, filter, verb, crackleGain, noise, timer = 0, amb, beds = {}, ambT = 0;
  let playing = false, scene = 'forest', want = 'forest', step = 0, bar = 0, nextT = 0;
  let groove = 0, flip = 0; // 小物で切り替える：ドラムの型、コードの転回
  const fileEls = {};
  let fileNow = null;

  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3; comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0;
    filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 2400; filter.Q.value = .4;
    master.connect(filter); filter.connect(comp);
    // 部屋の響き（短いリバーブ）
    const len = ctx.sampleRate * 1.8, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6; }
    verb = ctx.createConvolver(); verb.buffer = ir;
    const vg = ctx.createGain(); vg.gain.value = .35; verb.connect(vg); vg.connect(filter);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // レコードのパチパチ音
    const cb = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), cd = cb.getChannelData(0);
    for (let i = 0; i < cd.length; i++) cd[i] = (Math.random() * 2 - 1) * .015 + (Math.random() < .0004 ? (Math.random() * 2 - 1) * .9 : 0);
    const cs = ctx.createBufferSource(); cs.buffer = cb; cs.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = .6;
    crackleGain = ctx.createGain(); crackleGain.gain.value = .03;
    cs.connect(bp); bp.connect(crackleGain); crackleGain.connect(master); cs.start();
    document.addEventListener('visibilitychange', () => { if (!playing) return; document.hidden ? ctx.suspend() : ctx.resume(); });
    initAmbience(comp);
  }

  // ---------- 部屋の環境音（ビートの下に薄く敷く）----------
  // 森＝風と小鳥、水辺＝せせらぎとカエル、夕凪＝寄せては返す波とカモメ、夜＝虫の声、屋根裏＝屋根を打つ雨
  function initAmbience(out) {
    amb = ctx.createGain(); amb.gain.value = 0; amb.connect(out);
    const bed = (type, freq, q, vol, lfo = 0, rate = .1) => {
      const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0;
      s.connect(f); f.connect(g); g.connect(amb); s.start(0, Math.random());
      if (lfo) { const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = rate; og.gain.value = lfo; o.connect(og); og.connect(f.frequency); o.start(); }
      return { g, vol };
    };
    beds = {
      forest: [bed('lowpass', 420, .5, .09, 180, .07)],
      jungle: [bed('bandpass', 1300, 1.4, .07, 500, 1.7), bed('lowpass', 300, .5, .05)],
      cove: [bed('lowpass', 520, .6, .16, 420, .12)],
      night: [bed('lowpass', 260, .4, .05, 90, .05)],
      attic: [bed('lowpass', 380, .5, .07, 140, .06), bed('lowpass', 200, .4, .05)],
    };
  }
  const chirp = (t, f0, f1, d, v) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d); env(g, t, v, .005, d); o.connect(g); g.connect(amb); o.start(t); o.stop(t + d + .05); };
  // 薪がはぜる音（短いノイズの粒）
  function noiseHitAmb(t, freq, vol) {
    const s = ctx.createBufferSource(); s.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
    const g = ctx.createGain(); env(g, t, vol, .001, .03 + Math.random() * .04);
    s.connect(f); f.connect(g); g.connect(amb); s.start(t, Math.random() * .5); s.stop(t + .1);
  }
  function ambEvent(t) {
    const r = Math.random;
    switch (scene) {
      case 'forest': { const n = 2 + Math.floor(r() * 4), base = 2600 + r() * 2200; for (let i = 0; i < n; i++) chirp(t + i * (.08 + r() * .06), base * (1 + r() * .3), base * (.7 + r() * .6), .06 + r() * .05, .05); return .8 + r() * 2.4; }
      case 'jungle': if (r() < .5) chirp(t, 900 + r() * 400, 260, .09, .08); else { const f = 170 + r() * 40; [0, .16].forEach((d) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = f; env(g, t + d, .02, .005, .09); o.connect(g); g.connect(amb); o.start(t + d); o.stop(t + d + .12); }); } return 1.2 + r() * 3;
      case 'cove': if (r() < .35) { chirp(t, 1400, 2100, .18, .03); chirp(t + .22, 2000, 1300, .3, .03); } return 3 + r() * 5;
      case 'night': { const f = 4100 + r() * 500; for (let k = 0; k < 3; k++) for (let i = 0; i < 4; i++) chirp(t + k * .32 + i * .03, f, f * .98, .018, .018); return .5 + r() * 1.2; }
      case 'attic': for (let i = 0; i < 1 + Math.floor(r() * 3); i++) noiseHitAmb(t + r() * .2, 900 + r() * 2400, .05 + r() * .06); return .15 + r() * .6;
      default: return 2;
    }
  }
  function ambTick() {
    if (!amb) return;
    while (ambT < ctx.currentTime + .15) ambT += ambEvent(Math.max(ambT, ctx.currentTime + .01));
  }
  function ambScene(s) {
    if (!amb) return;
    Object.entries(beds).forEach(([k, list]) => list.forEach((b) => b.g.gain.setTargetAtTime(k === s ? b.vol : 0, ctx.currentTime, 1.2)));
  }
  const env = (g, t, peak, a, d) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0008, t + a + d); };
  function noiseHit(t, type, freq, peak, dec, send = 0) {
    const s = ctx.createBufferSource(); s.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ctx.createGain(); env(g, t, peak, .002, dec);
    s.connect(f); f.connect(g); g.connect(master); if (send) { const sg = ctx.createGain(); sg.gain.value = send; g.connect(sg); sg.connect(verb); }
    s.start(t, Math.random() * .5); s.stop(t + dec + .05);
  }
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(128, t); o.frequency.exponentialRampToValueAtTime(42, t + .13);
    env(g, t, .95, .003, .42); o.connect(g); g.connect(master); o.start(t); o.stop(t + .5);
    setTimeout(onKick, Math.max(0, (t - ctx.currentTime) * 1000));
  }
  function snare(t, v = 1) {
    noiseHit(t, 'highpass', 1400, .5 * v, .2, .35);
    if (v > .5) setTimeout(onSnare, Math.max(0, (t - ctx.currentTime) * 1000));
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = 185;
    env(g, t, .22 * v, .002, .12); o.connect(g); g.connect(master); o.start(t); o.stop(t + .2);
  }
  const hat = (t, v, open) => noiseHit(t, 'highpass', 7800, .16 * v, open ? .26 : .045);
  function keys(t, notes, dur) {
    notes.forEach((m, i) => {
      [0, 4].forEach((cents, k) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = k ? 'triangle' : 'sine'; o.frequency.value = hz(m); o.detune.value = cents + (Math.random() - .5) * 6;
        env(g, t + i * .012, (k ? .018 : .045) / Math.sqrt(notes.length) * 2, .02, dur);
        o.connect(g); g.connect(master); const sg = ctx.createGain(); sg.gain.value = .4; g.connect(sg); sg.connect(verb);
        o.start(t); o.stop(t + dur + .1);
      });
    });
  }
  function bass(t, m, dur) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = hz(m);
    env(g, t, .32, .01, dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .1);
  }
  function play(s, t) {
    if (s % 2 === 1) t += STEP * .2; // スイング（ヨレ）
    const S = SCENES[scene], chord = S.chords[bar % 4], root = chord[0] - 12;
    if (s === 0) {
      if (want !== scene && SCENES[want]) {
        scene = want; ambScene(scene);
        filter.frequency.setTargetAtTime(SCENES[scene].cutoff, t, .6);
        crackleGain.gain.setTargetAtTime(SCENES[scene].crackle * .06, t, .6);
      }
      const C = SCENES[scene].chords[(bar + flip) % 4].map((m, i) => (flip % 2 && i === 0 ? m + 12 : m));
      keys(t, C, STEP * 15);
      bass(t, C[0] - 12, STEP * 5);
    }
    if (s === 10) bass(t, root + (bar % 2 ? 7 : 0), STEP * 3);
    // ドラムの型：0＝定番のブーンバップ、1＝跳ねるキック、2＝ハーフタイム
    const K = [[0, 10], [0, 3, 10, 11], [0, 11]][groove], SN = [[4, 12], [4, 12], [8]][groove];
    if (K.includes(s) || (groove === 0 && s === 7 && bar % 2)) kick(t);
    if (SN.includes(s)) snare(t);
    if (s === 15 && bar % 2) snare(t, .22);
    if (s % 2 === 0) hat(t, s % 4 === 0 ? .8 : .5, s === 14 && bar % 4 === 3);
    else if (Math.random() < .3) hat(t, .18);
  }
  function tick() {
    ambTick();
    while (nextT < ctx.currentTime + .12) {
      play(step % 16, nextT);
      nextT += STEP; step++;
      if (step % 16 === 0) bar++;
    }
  }
  // 自作ビート（音声ファイル）を使う部屋
  function fileFor(s) {
    if (!files[s]) return null;
    if (!fileEls[s]) { const a = new Audio(files[s]); a.loop = true; a.volume = 0; fileEls[s] = a; }
    return fileEls[s];
  }
  function fadeTo(a, v, ms = 800) {
    const from = a.volume, t0 = performance.now();
    const f = () => { const k = Math.min(1, (performance.now() - t0) / ms); a.volume = from + (v - from) * k; if (k < 1) requestAnimationFrame(f); else if (!v) a.pause(); };
    if (v) a.play().catch(() => {});
    f();
  }
  function syncFile() {
    const a = playing ? fileFor(want) : null;
    if (a === fileNow) return;
    if (fileNow) fadeTo(fileNow, 0);
    fileNow = a;
    if (a) fadeTo(a, .9);
    if (ctx) master.gain.setTargetAtTime(playing && !a ? .85 : 0, ctx.currentTime, .3);
  }

  // レコードの針を落とす音
  function needle() {
    const t = ctx.currentTime;
    noiseHit(t, 'lowpass', 180, .5, .12);
    noiseHit(t + .02, 'bandpass', 2600, .25, .5);
  }
  // スクラッチ：レコードを前後にこする（ビートを一瞬しずめる）
  function scratch() {
    if (!ctx || !playing) return;
    const t = ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 2.2;
    [0, .09, .16, .27, .34].forEach((d, i) => s.playbackRate.linearRampToValueAtTime(i % 2 ? .35 : 2.4, t + d));
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.55, t + .02); g.gain.setValueAtTime(.55, t + .3); g.gain.linearRampToValueAtTime(0, t + .42);
    s.connect(f); f.connect(g); g.connect(filter); s.start(t); s.stop(t + .5);
    master.gain.setTargetAtTime(.25, t, .02); master.gain.setTargetAtTime(fileNow ? 0 : .85, t + .4, .05);
  }

  return {
    get playing() { return playing; },
    scratch,
    nextGroove() { groove = (groove + 1) % 3; return groove; },
    nextChords() { flip = (flip + 1) % 4; return flip; },
    toggle() {
      if (!ctx) init();
      playing = !playing;
      if (playing) {
        ctx.resume();
        filter.frequency.cancelScheduledValues(ctx.currentTime); filter.frequency.setValueAtTime(SCENES[scene].cutoff, ctx.currentTime);
        needle();
        nextT = ctx.currentTime + .32; step = 0; ambT = ctx.currentTime + .5;
        amb.gain.setTargetAtTime(1, ctx.currentTime, .8); ambScene(scene);
        clearInterval(timer); timer = setInterval(tick, 25);
      } else {
        // テープが止まるように、音がこもって沈んでいく
        const t = ctx.currentTime;
        filter.frequency.cancelScheduledValues(t); filter.frequency.setValueAtTime(filter.frequency.value, t); filter.frequency.exponentialRampToValueAtTime(90, t + .7);
        master.gain.setTargetAtTime(0, t + .25, .18); amb.gain.setTargetAtTime(0, t, .25);
        setTimeout(() => { if (!playing) { clearInterval(timer); ctx.suspend(); } }, 1400);
      }
      syncFile();
      return playing;
    },
    setScene(s) { if (s === want) return; want = s; if (playing) syncFile(); },
  };
}
