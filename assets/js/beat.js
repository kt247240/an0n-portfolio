// =========================================================
// 森を歩くと 1 曲が進む：Web Audio でその場で鳴らす、J Dilla 風のジャジーなヒップホップ「An0n. — forest walk」
// ヨレたドラム（キックは前のめり、スネアは後ろに寝かせ、ハットは 1 打ずつ揺れる）、ネオソウルのコード、ソウルのサンプルを刻んだような上もの
// 部屋ごとに曲のパートが変わる（朝の森＝イントロ/A メロ、水辺＝B メロ、夕凪＝サビ、夜＝ブリッジ、小屋＝アウトロ）
// 8 小節ごとにフィル、16 小節ごとに一瞬ドラムが抜ける。部屋が変わると、フィルとせり上がりで次のパートへ
// 自作の曲ができたら works.js の ROOMS に beat: 'assets/beats/xxx.mp3' を書くと、そちらを優先して流す
// =========================================================
import { createAmbience } from './ambience.js';

const BPM = 88, STEP = 60 / BPM / 4; // ハネ方は下の「Dilla time」で、楽器ごとに変える
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
// 本物の楽器の録音から作ったネタとドラム（tools/make-beat.mjs で作る）。ネタは 2 半音高く・少し速く録ってあり、遅く回して使う
const BEATS = 'assets/beats/', RATE = 2 ** (-2 / 12), BASS_MIDI = 35.93;

// キーは F マイナー（A♭ メジャー）。コードは MIDI ノート番号（下から）
const DB9 = [49, 53, 56, 60, 63], CM11 = [48, 51, 55, 58, 65], BBM9 = [46, 49, 53, 56, 60], EB13 = [51, 55, 61, 65, 72], EBS = [51, 56, 58, 63, 65];
const FM11 = [53, 56, 60, 63, 70], EBM9 = [51, 54, 58, 61, 65], AB13 = [44, 56, 60, 65, 66], C7S9 = [48, 52, 58, 63], FM9 = [53, 56, 60, 63, 67];
const BBM9EB = [51, 56, 61, 65], GM7B5 = [55, 58, 61, 65], C7B9 = [48, 52, 55, 58, 61], DB7S11 = [49, 53, 56, 60, 67], ABM9 = [56, 60, 63, 67, 70];

// メロディは [16 分の位置, 音, 長さ（16 分）]。2 小節ずつ、4 つで 8 小節のフレーズ
const HOOK = [
  [[0, 72, 4], [6, 75, 2], [8, 77, 6], [20, 75, 2], [22, 72, 2], [24, 70, 6]],
  [[0, 68, 3], [4, 70, 2], [6, 72, 4], [12, 75, 4], [16, 72, 8], [26, 70, 2], [28, 68, 4]],
  [[0, 72, 4], [6, 75, 2], [8, 77, 4], [12, 80, 4], [20, 79, 2], [22, 77, 2], [24, 75, 6]],
  [[0, 72, 3], [4, 70, 2], [6, 68, 4], [12, 70, 4], [16, 65, 10]],
];
const HUM = [ // A メロの控えめな上ものの旋律（エレピの一番上）
  [[8, 72, 6], [24, 70, 6]], [[8, 68, 6], [24, 67, 6]], [[8, 72, 4], [12, 75, 4], [24, 72, 6]], [[8, 70, 6], [20, 68, 10]],
];

const PARTS = {
  // 朝の森：イントロ〜A メロ。ローズとギターのネタ、軽めのドラム
  forest: { chords: [DB9, CM11, BBM9, EB13], cutoff: 3000, crackle: .6, drums: 'light', chop: [0, 7, 10], kal: 0, lead: null, pad: 0, box: 0 },
  // 水辺：B メロ。ネタにホーンの合いの手が入り、ドラムもふくらむ
  jungle: { chords: [FM11, BBM9, EBM9, AB13], cutoff: 2800, crackle: .6, drums: 'full', chop: [0, 3, 8, 11], kal: 0, lead: null, pad: 0, box: 0 },
  // 夕凪：サビ。ネタのホーンがメロディを吹く。クラップを重ねる
  cove: { chords: [DB9, C7S9, FM9, BBM9EB], cutoff: 3400, crackle: .55, drums: 'hook', chop: [0, 3, 6, 10], kal: 0, lead: null, pad: 0, box: 0 },
  // 夜：ブリッジ。オルガンのネタ、暗いコード、重めのブーンバップ
  night: { chords: [GM7B5, C7B9, FM11, DB7S11], cutoff: 2200, crackle: .8, drums: 'heavy', chop: [0, 6, 10], kal: 0, lead: null, pad: 0, box: 0, scratch: true },
  // 小屋：アウトロ。ローズとストリングスのネタをそのまま流し、ドラムは引く。最後は A♭ で解決
  attic: { chords: [DB9, CM11, BBM9, EBS, DB9, CM11, BBM9, ABM9], cutoff: 1800, crackle: 1, drums: 'sparse', chop: [0, 10], kal: 0, lead: null, pad: 0, box: 0 },
};
// ドラムの型（16 分の位置）。groove は小物で切り替える
const DRUMS = {
  light: { k: [0, 9, 11], s: [4, 12], ghost: [15], hat: 1 },
  full: { k: [0, 6, 9, 11], s: [4, 12], ghost: [7, 14], hat: 1, open: true },
  hook: { k: [0, 3, 9, 11], s: [4, 12], ghost: [7, 15], hat: 1, clap: true },
  heavy: { k: [0, 7, 10], s: [4, 12], ghost: [2, 14], hat: 1, open: true },
  sparse: { k: [0, 11], s: [12], ghost: [], hat: 2 },
};
const GROOVES = [null, { k: [0, 3, 10, 11], s: [4, 12] }, { k: [0, 11], s: [8] }];
// 制作ツール（tools/make-beat.mjs）が、同じテンポ・コード・メロディでネタのレコードを録るために読む
export const SONG = { BPM, PARTS, HOOK };

export function createBeat({ onKick = () => {}, onSnare = () => {}, files = {}, ambience = true } = {}) { // ambience: false で森や海の環境音を鳴らさない（クラブなど）
  let ctx, master, music, drums, filter, verb, crackleGain, noise, timer = 0, amb, wow, rec, recLp, bassBus, hv = [];
  const smp = { rec: {}, off: {}, drum: {}, bass: null, rev: new Map() }; // ネタのレコード、ドラム、ベース（assets/beats）
  let playing = false, scene = 'forest', want = 'forest', step = 0, bar = 0, nextT = 0, fillBar = -1, partBar = 0;
  let groove = 0, flip = 0; // 小物で切り替える：ドラムの型、コードの転回
  const fileEls = {};
  let fileNow = null;

  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3.5; comp.attack.value = .01; comp.release.value = .2; comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0;
    filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 2800; filter.Q.value = .5;
    // 少しだけ歪ませて、テープに録ったような温かさを出す
    const sat = ctx.createWaveShaper(), curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 1.6) / Math.tanh(1.6); }
    sat.curve = curve;
    // 低音を太く（ドープな重さ）
    const low = ctx.createBiquadFilter(); low.type = 'lowshelf'; low.frequency.value = 95; low.gain.value = 3.5;
    master.connect(filter); filter.connect(low); low.connect(sat); sat.connect(comp);
    // 上もの（エレピ・ベース・メロディ）は、キックのたびに少し沈む（サイドチェイン）
    music = ctx.createGain(); music.gain.value = 1; music.connect(master);
    // 上ものは「レコードからサンプリングした音」として鳴らす：低音を削り、MPC のフィルターでこもらせ、軽く歪ませる
    // （ベースは別に弾く。ディラはサンプルの低音を抜いて、自分のシンセベースを足していた）
    rec = ctx.createGain();
    // ベースは少し歪ませて、スマホのスピーカーでも聞こえる倍音を足す
    bassBus = ctx.createGain();
    const bd = ctx.createWaveShaper(), bc = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; bc[i] = Math.tanh(x * 1.5) / Math.tanh(1.5); }
    bd.curve = bc;
    const blp = ctx.createBiquadFilter(); blp.type = 'lowpass'; blp.frequency.value = 2400; blp.Q.value = .4;
    const bOut = ctx.createGain(); bOut.gain.value = 6.5;
    bassBus.connect(bd); bd.connect(blp); blp.connect(bOut); bOut.connect(music);
    const recHp = ctx.createBiquadFilter(); recHp.type = 'highpass'; recHp.frequency.value = 90; recHp.Q.value = .5;
    recLp = ctx.createBiquadFilter(); recLp.type = 'lowpass'; recLp.frequency.value = 5500; recLp.Q.value = .6;
    const recSat = ctx.createWaveShaper(), rc = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; rc[i] = Math.tanh(x * 1.6) / Math.tanh(1.6); }
    recSat.curve = rc;
    const recOut = ctx.createGain(); recOut.gain.value = .95;
    rec.connect(recHp); recHp.connect(recLp); recLp.connect(recSat); recSat.connect(recOut); recOut.connect(music);
    // ドラムはサンプラーで鳴らしたように、少しビットを粗くして歪ませる（SP-1200 / MPC の質感）
    // ドラムは丸く温かく：軽く飽和させて、耳に痛い高域を落とす（MPC で鳴らしたレコードの音）
    const crush = ctx.createWaveShaper(), cc = new Float32Array(2048), bits = 512;
    for (let i = 0; i < 2048; i++) { const x = i / 1024 - 1; cc[i] = Math.tanh(Math.round(x * bits) / bits * 1.4) / Math.tanh(1.4); }
    crush.curve = cc;
    const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 6200; dlp.Q.value = .3;
    drums = ctx.createGain(); drums.gain.value = 1.05; drums.connect(crush); crush.connect(dlp); dlp.connect(master);
    // ドラムをもう一本、思いきり潰して混ぜる（パラレル・コンプ）。キックとスネアが前に「ノック」してくる
    const smash = ctx.createDynamicsCompressor(); smash.threshold.value = -32; smash.ratio.value = 12; smash.attack.value = .004; smash.release.value = .12; smash.knee.value = 4;
    const smashG = ctx.createGain(); smashG.gain.value = .55; dlp.connect(smash); smash.connect(smashG); smashG.connect(master);
    // 部屋の響き（短いリバーブ）
    const len = ctx.sampleRate * 2.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.8; }
    verb = ctx.createConvolver(); verb.buffer = ir;
    const vg = ctx.createGain(); vg.gain.value = .32; verb.connect(vg); vg.connect(filter);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // テープのゆるい揺れ（音程がほんの少し波打つ）
    wow = ctx.createGain(); wow.gain.value = 7;
    const wl = ctx.createOscillator(); wl.frequency.value = .45; wl.connect(wow); wl.start();
    // レコードのパチパチ音
    const cb = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), cd = cb.getChannelData(0);
    for (let i = 0; i < cd.length; i++) cd[i] = (Math.random() * 2 - 1) * .015 + (Math.random() < .0004 ? (Math.random() * 2 - 1) * .9 : 0);
    const cs = ctx.createBufferSource(); cs.buffer = cb; cs.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = .6;
    crackleGain = ctx.createGain(); crackleGain.gain.value = .03;
    cs.connect(bp); bp.connect(crackleGain); crackleGain.connect(master); cs.start();
    document.addEventListener('visibilitychange', () => { if (!playing) return; document.hidden ? ctx.suspend() : ctx.resume(); });
    amb = ambience ? createAmbience(ctx, comp) : { scene() {}, start() {}, stop() {}, tick() {} };
    prepareSamples();
  }
  // ネタのレコードとドラムを読み込む（今いる部屋のレコードから先に）。読めるまでは合成の音で鳴らす
  async function prepareSamples() {
    const get = async (p) => { const a = await (await fetch(BEATS + p)).arrayBuffer(); return new Promise((ok, ng) => ctx.decodeAudioData(a, ok, ng)); };
    try {
      const names = ['kick', 'snare', 'ghost', 'rim', 'hat1', 'hat2', 'hat3', 'open', 'tamb'];
      (await Promise.all(names.map((n) => get(`drums/${n}.wav`)))).forEach((b, i) => { smp.drum[names[i]] = b; });
      smp.bass = await get('bass.wav');
      for (const k of [want, ...Object.keys(PARTS).filter((k) => k !== want)]) {
        const b = await get(`rec-${k}.mp3`), d = b.getChannelData(0);
        // レコードの頭（最初の和音）の位置。mp3 はデコーダーによって頭の無音の長さが変わるので、実際に探す
        let i = 0; while (i < d.length && Math.abs(d[i]) < .02) i++;
        smp.off[k] = Math.max(0, i / b.sampleRate - .002); smp.rec[k] = b;
      }
    } catch { /* 読めない環境では合成の音のまま */ }
  }

  const env = (g, t, peak, a, d) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0008, t + a + d); };
  const send = (node, amt) => { if (!amt) return; const sg = ctx.createGain(); sg.gain.value = amt; node.connect(sg); sg.connect(verb); };
  // 鳴り終わったら、テープの揺れから外す（つないだままだと音の部品が残り続ける）
  const osc = (type, f, t, stop) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; wow.connect(o.detune); o.onended = () => { try { wow.disconnect(o.detune); } catch { /* 外れていれば何もしない */ } }; o.start(t); o.stop(stop); return o; };

  // ---------- ドラム ----------
  function noiseHit(t, type, freq, peak, dec, rev = 0, out = drums, q = .7) {
    const s = ctx.createBufferSource(); s.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); env(g, t, peak, .002, dec);
    s.connect(f); f.connect(g); g.connect(out); send(g, rev);
    s.start(t, Math.random() * .5); s.stop(t + dec + .05);
  }
  // 録っておいた一発ものを鳴らす（MPC のパッドを叩くのと同じ）
  function hitSample(name, t, v, rev = 0) {
    if (name === 'hat') name = 'hat' + (1 + Math.floor(Math.random() * 3)); // ハットは 3 つの録音を順不同に（同じ音が続かない）
    const b = smp.drum[name]; if (!b) return false;
    const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; g.gain.value = v;
    s.connect(g); g.connect(drums); send(g, rev); s.start(t);
    return true;
  }
  function kick(t, v = 1) {
    if (!hitSample('kick', t, v)) synthKick(t, v);
    // 上ものを一瞬沈める（サイドチェイン）
    music.gain.cancelScheduledValues(t); music.gain.setValueAtTime(music.gain.value, t);
    music.gain.linearRampToValueAtTime(.75, t + .01); music.gain.setTargetAtTime(1, t + .05, .08);
    if (v > .6) setTimeout(onKick, Math.max(0, (t - ctx.currentTime) * 1000));
  }
  function synthKick(t, v) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(47, t + .09);
    env(g, t, .95 * v, .004, .5); o.connect(g); g.connect(drums); o.start(t); o.stop(t + .6);
    const sub = ctx.createOscillator(), sg = ctx.createGain(); sub.frequency.value = 50; env(sg, t, .3 * v, .01, .4); sub.connect(sg); sg.connect(drums); sub.start(t); sub.stop(t + .5);
    noiseHit(t, 'lowpass', 1400, .12 * v, .02, 0, drums, .7); // 丸いアタック
  }
  function snare(t, v = 1, clap = false) {
    if (smp.drum.snare) {
      if (v < .5) hitSample('ghost', t, v * 2.2, .1); // 小さい音は、そっと叩いたスネアの録音
      else hitSample('snare', t, v, .22);
      if (clap && v >= .5) hitSample('tamb', t + .006, v * .8, .15); // サビはタンバリンを重ねる（ソウルの定番）
      if (v > .5) setTimeout(onSnare, Math.max(0, (t - ctx.currentTime) * 1000));
      return;
    }
    noiseHit(t, 'bandpass', 1700, .55 * v, .2, .32, drums, .7);
    noiseHit(t, 'highpass', 5200, .12 * v, .07);
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(165, t + .07);
    env(g, t, .24 * v, .002, .1); o.connect(g); g.connect(drums); o.start(t); o.stop(t + .18);
    if (v < .5) { const r = ctx.createOscillator(), rg = ctx.createGain(); r.type = 'square'; r.frequency.value = 820; env(rg, t, .05 * v * 4, .001, .025); r.connect(rg); rg.connect(drums); r.start(t); r.stop(t + .05); } // 小さい音はリムの「コッ」
    if (clap) [.014, .024, .036].forEach((d) => noiseHit(t + d, 'bandpass', 1300, .22 * v, .07, .4, drums, 1.4)); // クラップはスネアから遅れて重ねる
    if (v > .5) setTimeout(onSnare, Math.max(0, (t - ctx.currentTime) * 1000));
  }
  const hat = (t, v, open) => hitSample(open ? 'open' : 'hat', t, v, .05) || noiseHit(t, 'highpass', 7200, .13 * v, open ? .34 : .03, .05, drums, .6);
  // 次のフレーズへ入る前の、逆再生のようなせり上がり
  function swell(t, dur) {
    const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(600, t); f.frequency.exponentialRampToValueAtTime(7000, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.16, t + dur * .95); g.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(f); f.connect(g); g.connect(drums); send(g, .5); s.start(t); s.stop(t + dur + .05);
  }

  // フレーズの区切りに入れるスクラッチ（ブーンバップのお約束）
  function scratchFill(t) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 2.4;
    [0, .07, .12, .2, .26, .33].forEach((d, i) => s.playbackRate.linearRampToValueAtTime(i % 2 ? .4 : 2.2, t + d));
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.3, t + .015); g.gain.setValueAtTime(.3, t + .3); g.gain.linearRampToValueAtTime(0, t + .38);
    s.connect(f); f.connect(g); g.connect(drums); s.start(t); s.stop(t + .45);
  }

  // ---------- 上もの ----------
  // エレピ（Rhodes 風）：FM で金属的なアタック、ゆっくりしたトレモロ、少しずつずらして弾く
  function keys(t, notes, dur, vel = 1) {
    const trem = ctx.createGain(); trem.gain.value = .85; send(trem, .35);
    // サンプルを刻んだように、刻むたびに音程がわずかにずれ、こもり具合も少し変わる
    const drift = (Math.random() - .5) * 18, chopLp = ctx.createBiquadFilter(); chopLp.type = 'lowpass'; chopLp.frequency.value = 2600 + Math.random() * 1600;
    // 切り出したサンプルのように、刻みの終わりでスパッと切る（余韻を残さない）
    const gate = ctx.createGain(); gate.gain.setValueAtTime(1, t); gate.gain.setValueAtTime(1, t + dur - .012); gate.gain.linearRampToValueAtTime(0, t + dur);
    trem.connect(gate); gate.connect(chopLp); chopLp.connect(rec);
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 4.2; lg.gain.value = .15; lfo.connect(lg); lg.connect(trem.gain); lfo.start(t); lfo.stop(t + dur + .3);
    const n = notes.length;
    notes.forEach((m, i) => {
      const at = t + i * .014 + Math.random() * .006, f = hz(m);
      const car = osc('sine', f, at, at + dur + .3), mod = osc('sine', f, at, at + dur + .3), mg = ctx.createGain(); car.detune.value = drift - 22; mod.detune.value = drift - 22; // レコードを少し遅く回したように、ほんの少し低く
      mg.gain.setValueAtTime(f * 1.4, at); mg.gain.exponentialRampToValueAtTime(f * .08, at + .35);
      mod.connect(mg); mg.connect(car.frequency);
      const g = ctx.createGain(); env(g, at, .07 * vel / Math.sqrt(n) * 1.6, .006, dur * 2.5);
      car.connect(g); g.connect(trem);
    });
  }
  // ベース：丸いサインに少し倍音。次の音へすべる
  function bass(t, m, dur, slideTo) {
    if (smp.bass) { // コントラバスのピチカート（録音）の音程を変えて弾く
      const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = smp.bass; s.playbackRate.value = 2 ** ((m - BASS_MIDI) / 12);
      g.gain.setValueAtTime(.9, t); g.gain.setValueAtTime(.9, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + .09);
      s.connect(g); g.connect(bassBus); s.start(t); s.stop(t + dur + .12);
      return;
    }
    // ムーグのようなシンセベース：のこぎり波をこもらせて、弾いた瞬間だけ少し明るく。次の音へはなめらかにすべる
    const f = hz(m), end = t + dur + .12;
    const saw = osc('sawtooth', f, t, end + .05), sub = osc('sine', f, t, end + .05);
    if (slideTo) [saw, sub].forEach((x) => { x.frequency.setValueAtTime(f, t + dur * .65); x.frequency.exponentialRampToValueAtTime(hz(slideTo), t + dur); });
    const lp1 = ctx.createBiquadFilter(), lp2 = ctx.createBiquadFilter(); lp1.type = lp2.type = 'lowpass'; lp1.Q.value = 1.1; lp2.Q.value = .5;
    lp1.frequency.setValueAtTime(950, t); lp1.frequency.setTargetAtTime(240, t + .01, .09); lp2.frequency.value = 700;
    const gs = ctx.createGain(), gb = ctx.createGain(), g = ctx.createGain(); gs.gain.value = .32; gb.gain.value = .5;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.44, t + .008); g.gain.setTargetAtTime(.36, t + .02, .15);
    g.gain.setValueAtTime(.36, t + dur); g.gain.linearRampToValueAtTime(0, end);
    saw.connect(gs); gs.connect(lp1); lp1.connect(lp2); lp2.connect(g); sub.connect(gb); gb.connect(g); g.connect(bassBus);
  }
  // カリンバ：短い減衰と、少しずれた倍音
  function kalimba(t, m, v = 1) {
    [[1, .5], [2.76, .12], [5.4, .04]].forEach(([r, a]) => {
      const o = osc('sine', hz(m) * r, t, t + 1.2), g = ctx.createGain(); env(g, t, a * .22 * v, .002, r > 1 ? .18 : .9);
      o.connect(g); g.connect(rec); send(g, .45);
    });
  }
  // オルゴール：高く澄んだベル
  function musicBox(t, m) {
    [[1, .5], [4, .08]].forEach(([r, a]) => { const o = osc('sine', hz(m + 12) * r, t, t + 1.6), g = ctx.createGain(); env(g, t, a * .16, .002, 1.3); o.connect(g); g.connect(rec); send(g, .6); });
  }
  // リード：口笛のような柔らかい音（ビブラートと息の音）。エレピで口ずさむ版も
  // ボーカルチョップ：声の「アー」を切り刻んだような音（のこぎり波を、母音の響きの帯域で絞る）
  function vox(t, m, dur) {
    const o = osc('sawtooth', hz(m), t, t + dur + .2), o2 = osc('sawtooth', hz(m) * 1.004, t, t + dur + .2);
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 5; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(18, t + .2);
    vib.connect(vg); vg.connect(o.detune); vib.start(t); vib.stop(t + dur + .2);
    const mix = ctx.createGain(); mix.gain.value = .5; o.connect(mix); o2.connect(mix);
    const out = ctx.createGain(); out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(.05, t + .03); out.gain.setValueAtTime(.05, t + Math.max(.05, dur - .06)); out.gain.linearRampToValueAtTime(0, t + dur);
    [[750, 6, 1], [1150, 7, .55], [2600, 9, .18]].forEach(([f, q, a]) => { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; const ga = ctx.createGain(); ga.gain.value = a; mix.connect(bp); bp.connect(ga); ga.connect(out); });
    out.connect(rec); send(out, .55);
  }
  function lead(t, m, dur, voice) {
    if (voice === 'keys') { keys(t, [m], dur * .9, .9); return; }
    if (voice === 'vox') { vox(t, m, Math.min(dur, STEP * 3)); if (dur > STEP * 4) vox(t + STEP * 4, m, STEP * 2); return; }
    const o = osc('triangle', hz(m), t, t + dur + .2), o2 = osc('sine', hz(m) * 2, t, t + dur + .2);
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 5.2; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(14, t + .25);
    vib.connect(vg); vg.connect(o.detune); vg.connect(o2.detune); vib.start(t); vib.stop(t + dur + .2);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.075, t + .06); g.gain.setValueAtTime(.075, t + dur * .8); g.gain.exponentialRampToValueAtTime(.001, t + dur + .15);
    const g2 = ctx.createGain(); g2.gain.value = .12;
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(lp); lp.connect(rec); send(lp, .5);
    noiseHit(t, 'bandpass', hz(m) * 2, .012, dur * .7, .3, music, 6); // 息の音
  }
  // パッド：ゆっくり立ち上がる、こもった和音
  function pad(t, notes, dur, v) {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(rec); send(lp, .6);
    notes.forEach((m) => [-8, 8].forEach((c) => {
      const o = osc('sawtooth', hz(m), t, t + dur + .8); o.detune.value = c;
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.012 * v, t + dur * .4); g.gain.linearRampToValueAtTime(0, t + dur + .6);
      o.connect(g); g.connect(lp);
    }));
  }

  // ---------- サンプルを切り刻む ----------
  const CHOP_GAIN = 3.6; // レコードの音量（ドラム・ベースとの釣り合い）
  // レコードの bar 小節目の from（16 分）から len（16 分）ぶんを、遅く回して鳴らす。頭と終わりはごく短くフェード
  function chop(t, bar, from, len, v = 1) {
    const b = smp.rec[scene]; if (!b) return;
    const s = ctx.createBufferSource(), g = ctx.createGain(), dur = len * STEP;
    s.buffer = b; s.playbackRate.value = RATE; v *= CHOP_GAIN;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .004); g.gain.setValueAtTime(v, t + dur - .01); g.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(g); g.connect(rec); send(g, .12);
    s.start(t, smp.off[scene] + (bar * 16 + from) * STEP * RATE, dur * RATE + .02);
  }
  // 次の小節の頭を逆回しにして、フレーズの終わりに吸いこむように鳴らす
  function reverseChop(t, bar, len) {
    const b = smp.rec[scene]; if (!b) return;
    const key = scene + bar;
    if (!smp.rev.has(key)) {
      const sr = b.sampleRate, n = Math.floor(len * STEP * RATE * sr), from = Math.floor((smp.off[scene] + bar * 16 * STEP * RATE) * sr);
      const rb = ctx.createBuffer(1, n, sr), src = b.getChannelData(0), dst = rb.getChannelData(0);
      for (let i = 0; i < n; i++) dst[i] = src[Math.min(src.length - 1, from + n - 1 - i)] || 0;
      smp.rev.set(key, rb);
    }
    const s = ctx.createBufferSource(), g = ctx.createGain(), dur = len * STEP;
    s.buffer = smp.rev.get(key); s.playbackRate.value = RATE;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.9 * CHOP_GAIN, t + dur * .9); g.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(g); g.connect(rec); s.start(t); s.stop(t + dur + .02);
  }

  // ---------- 曲の進行 ----------
  function changePart(t) {
    scene = want; partBar = 0; amb.scene(scene);
    const P = PARTS[scene];
    filter.frequency.cancelScheduledValues(t); filter.frequency.setTargetAtTime(P.cutoff, t, .5);
    crackleGain.gain.setTargetAtTime(P.crackle * .06, t, .6);
    sampleIntro(t); smp.rev.clear();
  }
  // 新しいパートの頭は、サンプルをこもらせてから 2 小節かけて開く（ディラの定番。ベースは 2 小節目から入る）
  function sampleIntro(t) {
    recLp.frequency.cancelScheduledValues(t); recLp.frequency.setValueAtTime(380, t); recLp.frequency.exponentialRampToValueAtTime(5500, t + STEP * 30);
  }
  // Dilla time：ふたつの時間を同時に走らせる。ハットはまっすぐ（手で叩いたような揺れと強弱）、
  // キックとベースは三連に近いほど強くハネて少し遅れ、スネアはほんの少し前のめり（クラップは遅れて重なる）
  // この食い違いが「酔っぱらったような」ディラのノリになる
  const jit = (a) => (Math.random() - .5) * a;
  const hang = (s, amt) => (s % 2 ? STEP * amt : 0); // 裏の 16 分をどれだけ後ろへずらすか（.33 でほぼ三連）
  const SW = .2; // MPC のスウィング 60%
  const STUT = [0, 3, 6, 8, 10, 11, 14]; // 細かく切り刻む小節（レコードが録れるまでの合成版）
  // レコードの刻み方 [鳴らす位置, レコードのどこから, 長さ]（16 分）。同じ頭を何度も叩き直すのがディラ流
  const CHOPS = {
    forest: [[0, 0, 7], [7, 0, 3], [10, 8, 6]],
    jungle: [[0, 0, 3], [3, 6, 5], [8, 0, 3], [11, 10, 5]],
    cove: [[0, 0, 8], [8, 8, 8]], // サビはホーンのメロディを切らない
    night: [[0, 0, 6], [6, 0, 4], [10, 6, 6]],
    attic: [[0, 0, 16]], // 最後はレコードをそのまま流す
    stut: [[0, 0, 3], [3, 0, 3], [6, 0, 2], [8, 4, 2], [10, 0, 1], [11, 0, 1], [12, 8, 4]],
  };
  function play(s, tGrid) {
    const t = tGrid + hang(s, SW); // MPC のスウィング（約 60%）
    if (s === 0 && want !== scene && PARTS[want]) changePart(t);
    if (s === 0) hv = Array.from({ length: 16 }, (_, i) => (i % 4 === 0 ? .8 : i % 4 === 2 ? .6 : .38) * (.75 + Math.random() * .4) * (i % 2 && Math.random() < .05 ? 0 : 1));
    const P = PARTS[scene], ph = partBar % 8, n = P.chords.length;
    const chord = P.chords[(partBar + flip) % n].map((m, i) => (flip % 2 && i === 0 ? m + 12 : m));
    const nextChord = P.chords[(partBar + flip + 1) % n];
    const brk = partBar % 16 === 15; // 16 小節目はドラムが抜ける（ブレイク）
    const fill = ph === 7 || fillBar === bar;
    // 上もの
    // 上もの：レコードから切り出したサンプルのように、コードを短く刻む（最後の刻みだけ長く伸ばす）
    const stut = ph === 3 && scene !== 'attic' && scene !== 'cove', hits = stut ? STUT : P.chop, ci = hits.indexOf(s);
    const cb = (partBar + flip) % n;
    if (smp.rec[scene]) {
      // 録っておいたレコードを刻む。フィルの小節は 12 で切って、次の小節の頭の逆回しを入れる
      (stut ? CHOPS.stut : CHOPS[scene]).forEach(([at, from, len]) => { if (at === s) chop(t, cb, from, fill && at < 12 ? Math.min(len, 12 - at) : len, at ? .9 : 1); });
      if (fill && s === 12 && scene !== 'attic') reverseChop(t, (cb + 1) % n, 4);
    } else if (ci >= 0) {
      const nextHit = hits[ci + 1] ?? 16, len = nextHit - s;
      // 切り刻む小節は、同じコードの上の音だけを短く連打する
      const notes = stut && ci > 0 ? chord.slice(-3) : chord;
      keys(t, notes, STEP * (stut ? Math.max(.8, len - .3) : Math.max(2, len - .5) * (ci === hits.length - 1 ? 1.4 : .9)), scene === 'attic' ? .8 : ci ? .85 : 1);
    }
    if (s === 0 && P.pad) pad(t, chord.slice(0, 3), STEP * 16, P.pad);
    // ベースはキックと一緒に弾く（ブーンバップの「ドン」を太くする）
    // ベース：シンセベースのような丸い音。付点のリズムで動き、コードの切れ目では半音で次へ近づく
    if ((!brk || s < 8) && partBar !== 0) {
      const tb = tGrid + hang(s, SW) + .008; // ベースはほんの少しだけ後ろ
      const root = chord[0] < 50 ? chord[0] - 12 : chord[0] - 24, nroot = nextChord[0] < 50 ? nextChord[0] - 12 : nextChord[0] - 24;
      if (s === 0) bass(tb, root, STEP * 5);
      if (s === 7 && P.drums !== 'sparse') bass(tb, root + (partBar % 2 ? 12 : 7), STEP * 2.6);
      if (s === 10) bass(tb, root + (partBar % 2 ? 10 : 7), STEP * 3);
      if (s === 13 && P.drums !== 'sparse') bass(tb, nroot + (nroot > root ? -1 : 1), STEP * 2.6, nroot);
    }
    if (P.kal && [0, 3, 6, 10, 12, 14].includes(s) && Math.random() < P.kal) {
      const tones = chord.slice(1).concat(chord.slice(1).map((m) => m + 12));
      kalimba(t, tones[(s + partBar * 3) % tones.length] + 12, s % 4 === 0 ? 1 : .7);
    }
    if (P.box && [0, 6, 10].includes(s)) musicBox(t, chord[(s / 2 + partBar) % chord.length]);
    if (P.lead) {
      const phrase = P.lead[Math.floor(ph / 2) % P.lead.length], off = (ph % 2) * 16;
      phrase.forEach(([p, m, len]) => { if (p === s + off) lead(t, m, len * STEP, P.leadVoice); });
    }
    // ドラム
    if (brk && s >= 4) { if (s === 12) swell(t, STEP * 4); return; }
    const D = DRUMS[P.drums], G = groove ? GROOVES[groove] : null, K = G ? G.k : D.k, SN = G ? G.s : D.s;
    if (fill && P.scratch && s === 12 && partBar % 16 === 7) { scratchFill(tGrid); kick(tGrid, .9); return; }
    if (fill && P.scratch && s > 12 && partBar % 16 === 7) { if (s === 14) snare(tGrid - .008, .9, D.clap); return; }
    if (fill && s >= 12) {
      // フィル：スネアの連打と、次の小節の頭へのせり上がり
      snare(tGrid + .004, .35 + (s - 12) * .2, D.clap);
      if (s === 12) swell(tGrid, STEP * 4);
      if (s === 14) kick(tGrid + .012, .8);
      return;
    }
    // MPC で打ち込んだように、全部を同じスウィングにそろえる（しっかり、タイトに）。ハットだけ指で叩いた強弱
    const tk = tGrid + hang(s, SW) + jit(.003), ts = tGrid + .004 + jit(.003), th = tGrid + hang(s, SW) + jit(.004);
    if (K.includes(s)) kick(tk, (P.drums === 'sparse' ? .8 : 1) * (s === 0 ? 1 : .86 + Math.random() * .12));
    else if ((s === 7 || s === 15) && P.drums !== 'sparse' && Math.random() < .15) kick(tk, .45); // ゴーストのキック
    if (SN.includes(s)) snare(ts, (P.drums === 'sparse' ? .6 : 1) * (.9 + Math.random() * .1), D.clap);
    if (D.ghost.includes(s)) snare(tGrid + hang(s, SW) + .004, .14 + Math.random() * .06);
    if (s % D.hat === 0 && hv[s]) hat(th, hv[s], D.open && s === 14 && partBar % 2 === 1);
  }
  function tick() {
    amb.tick();
    while (nextT < ctx.currentTime + .12) {
      play(step % 16, nextT);
      nextT += STEP; step++;
      if (step % 16 === 0) { bar++; partBar++; }
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
    if (a !== fileNow) {
      if (fileNow) fadeTo(fileNow, 0);
      fileNow = a;
      if (a) fadeTo(a, .9);
    }
    // 合成の曲の音量は毎回ここで決める（ファイルが無い部屋でも、再生を始めたら必ず上げる）
    if (ctx) master.gain.setTargetAtTime(playing && !a ? .14 : 0, ctx.currentTime, .3);
  }

  // レコードの針を落とす音
  function needle() {
    const t = ctx.currentTime;
    noiseHit(t, 'lowpass', 180, .5, .12, 0, master);
    noiseHit(t + .02, 'bandpass', 2600, .25, .5, 0, master);
  }
  // スクラッチ：レコードを前後にこする（曲を一瞬しずめる）
  function scratch() {
    if (!ctx || !playing) return;
    const t = ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 2.2;
    [0, .09, .16, .27, .34].forEach((d, i) => s.playbackRate.linearRampToValueAtTime(i % 2 ? .35 : 2.4, t + d));
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.55, t + .02); g.gain.setValueAtTime(.55, t + .3); g.gain.linearRampToValueAtTime(0, t + .42);
    s.connect(f); f.connect(g); g.connect(filter); s.start(t); s.stop(t + .5);
    master.gain.setTargetAtTime(.25, t, .02); master.gain.setTargetAtTime(fileNow ? 0 : .14, t + .4, .05);
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
        scene = want; partBar = 0;
        filter.frequency.cancelScheduledValues(ctx.currentTime); filter.frequency.setValueAtTime(PARTS[scene].cutoff, ctx.currentTime);
        crackleGain.gain.setValueAtTime(PARTS[scene].crackle * .06, ctx.currentTime);
        needle(); sampleIntro(ctx.currentTime);
        nextT = ctx.currentTime + .32; step = 0;
        amb.scene(scene); amb.start();
        clearInterval(timer); timer = setInterval(tick, 25);
      } else {
        // テープが止まるように、音がこもって沈んでいく
        const t = ctx.currentTime;
        filter.frequency.cancelScheduledValues(t); filter.frequency.setValueAtTime(filter.frequency.value, t); filter.frequency.exponentialRampToValueAtTime(90, t + .7);
        master.gain.setTargetAtTime(0, t + .25, .18); amb.stop();
        setTimeout(() => { if (!playing) { clearInterval(timer); ctx.suspend(); } }, 1400);
      }
      syncFile();
      return playing;
    },
    // 部屋が変わったら、今の小節の終わりにフィルを入れて、次の小節から次のパートへ
    setScene(s) {
      if (s === want) return;
      want = s;
      if (playing && ctx && PARTS[s]) fillBar = bar;
      if (playing) syncFile();
    },
  };
}
