// =========================================================
// 部屋の環境音：その場所で録ったように聞こえる音を、音の成り立ちから合成する（録音素材は使わない）
// 朝の森＝葉ずれと風、遠くの小鳥 / 水辺＝小川のせせらぎ（泡のはじける音）と遠くのカエル
// 夕凪＝寄せては返す波と泡 / 夜の街＝コオロギと遠い車の音 / 小屋＝屋根を打つ雨と薪のはぜる音
// 同じ繰り返しに聞こえないよう、強さや明るさはたえず揺らし、鳥や波は 1 回ずつ形を変える
// 今いる部屋の音だけを鳴らし、離れた部屋の音はフェードして止める（iPhone でも軽く）
// =========================================================
const r = Math.random, rr = (a, b) => a + r() * (b - a);

// 部屋ごとの音量（曲との釣り合い。ここだけ触れば全体のバランスを変えられる）
const LEVEL = { forest: 2.0, jungle: 2.6, cove: 2.2, night: 2.8, attic: 2.0 };

export function createAmbience(ctx, out) {
  const bus = ctx.createGain(); bus.gain.value = 0; bus.connect(out);

  // 屋外の広がり（遠くの音ほどこちらを多めに通す）
  const space = ctx.createConvolver(), sr = ctx.sampleRate, il = Math.floor(sr * 3.2), ir = ctx.createBuffer(2, il, sr);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = Math.floor(sr * .02); i < il; i++) d[i] = (r() * 2 - 1) * Math.exp(-i / (sr * .55)); }
  space.buffer = ir;
  const spaceOut = ctx.createGain(); spaceOut.gain.value = .45; space.connect(spaceOut); spaceOut.connect(bus);

  // 左右で別々の、長めのノイズ（短いと繰り返しが耳につく）
  const makeNoise = (sec, color) => {
    const b = ctx.createBuffer(2, Math.floor(sr * sec), sr);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c); let b0 = 0, b1 = 0, b2 = 0, br = 0;
      for (let i = 0; i < d.length; i++) {
        const w = r() * 2 - 1;
        if (color === 'white') d[i] = w * .5;
        else if (color === 'pink') { b0 = .99765 * b0 + w * .099046; b1 = .963 * b1 + w * .2965164; b2 = .57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * .1848) * .11; }
        else { br = (br + .02 * w) / 1.02; d[i] = br * 3.2; }
      }
    }
    return b;
  };
  const N = { white: makeNoise(4, 'white'), pink: makeNoise(6, 'pink'), brown: makeNoise(6, 'brown') };

  let cur = null, want = null, running = false;

  // ---- 部品 ----
  const filt = (type, f, q = .7) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
  const pan = (p) => { if (!ctx.createStereoPanner) return ctx.createGain(); const n = ctx.createStereoPanner(); n.pan.value = p; return n; };
  const chain = (...nodes) => { for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); return nodes[nodes.length - 1]; };
  const src = (color, loop = true) => { const s = ctx.createBufferSource(); s.buffer = N[color]; s.loop = loop; return s; };

  // 鳴りっぱなしの地の音（風、せせらぎ、雨…）。強さと明るさをゆっくり揺らす
  function bed(S, color, filters, vol, { wander = .4, bright = null, p = 0, far = 0 } = {}) {
    const s = src(color); s.playbackRate.value = rr(.96, 1.04);
    const fs = filters.map(([t, f, q]) => filt(t, f, q)), g = ctx.createGain(); g.gain.value = vol;
    chain(s, ...fs, g, pan(p), S.near);
    if (far) { const w = ctx.createGain(); w.gain.value = far; g.connect(w); w.connect(S.wet); }
    s.start(0, r() * s.buffer.duration);
    S.srcs.push(s);
    const last = fs[fs.length - 1];
    S.drift.push({ param: g.gain, lo: vol * (1 - wander), hi: vol * (1 + wander * .6), tau: [.8, 2.4], every: [1.2, 4], next: 0 });
    if (bright) S.drift.push({ param: last.frequency, lo: bright[0], hi: bright[1], tau: [1, 3], every: [1.5, 5], next: 0 });
  }

  // 短い音の粒（泡、雨粒、薪のはぜ）
  function grain(S, t, { color = 'white', type = 'bandpass', f, q = 1, amp, dec, p = 0, wet = 0 }) {
    const s = src(color, false), b = filt(type, f, q), g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + .0015); g.gain.exponentialRampToValueAtTime(.0001, t + .0015 + dec);
    chain(s, b, g, pan(p), S.near);
    if (wet) { const w = ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(S.wet); }
    s.start(t, r() * 3); s.stop(t + dec + .05);
  }

  // 鳥の一声：なめらかな立ち上がりと、細かいビブラート。倍音を少し足して笛っぽさを消す
  function syllable(S, t, f0, f1, dur, amp, p, trill = 0) {
    const o = ctx.createOscillator(), h = ctx.createOscillator(), hg = ctx.createGain(), g = ctx.createGain();
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    h.frequency.setValueAtTime(f0 * 2, t); h.frequency.exponentialRampToValueAtTime(f1 * 2, t + dur); hg.gain.value = .1;
    if (trill) {
      const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = trill; lg.gain.value = f0 * .045;
      l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + .02);
    }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + dur * .3); g.gain.linearRampToValueAtTime(amp * .7, t + dur * .7); g.gain.linearRampToValueAtTime(0, t + dur);
    const hp = filt('highpass', 1400), pn = pan(p), w = ctx.createGain(); w.gain.value = .9;
    o.connect(g); h.connect(hg); hg.connect(g); chain(g, hp, pn); pn.connect(S.near); pn.connect(w); w.connect(S.wet);
    o.start(t); h.start(t); o.stop(t + dur + .02); h.stop(t + dur + .02);
  }
  // 森の鳥は 3 羽。声の高さと歌い方は 1 羽ごとに決まっていて、毎回少しずつ違う歌になる
  const birds = [
    { kind: 'song', f: 2900, p: -.55, amp: .016 },
    { kind: 'trill', f: 4700, p: .5, amp: .009 },
    { kind: 'chip', f: 6200, p: .15, amp: .008 },
  ];
  function bird(S, t) {
    const b = birds[Math.floor(r() * birds.length)], f = b.f * rr(.94, 1.06);
    if (b.kind === 'song') {
      let x = t; const n = 3 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const d = rr(.09, .2), a = f * rr(.85, 1.2);
        syllable(S, x, a, a * rr(.8, 1.3), d, b.amp * rr(.7, 1), b.p, i === n - 1 && r() < .5 ? rr(28, 40) : 0); x += d + rr(.05, .13);
      }
    } else if (b.kind === 'trill') {
      const n = 7 + Math.floor(r() * 10), d = rr(.035, .05);
      for (let i = 0; i < n; i++) syllable(S, t + i * d * 1.25, f * (i % 2 ? 1.12 : 1), f * (i % 2 ? .98 : 1.1), d, b.amp * (1 - i / n * .5), b.p);
    } else {
      for (let i = 0; i < 1 + Math.floor(r() * 3); i++) syllable(S, t + i * rr(.14, .3), f, f * .72, rr(.025, .04), b.amp, b.p);
    }
  }

  // カエル：声帯が震える「ブルルッ」を、細かい拍の連なりで作る。水面をわたって遠くから
  function frog(S, t) {
    const f = rr(95, 140), n = 2 + Math.floor(r() * 2), p = rr(-.7, .7);
    for (let k = 0; k < n; k++) {
      const t0 = t + k * rr(.32, .45), o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t0); o.frequency.linearRampToValueAtTime(f * 1.08, t0 + .22);
      g.gain.setValueAtTime(0, t0);
      const pulses = 6 + Math.floor(r() * 4);
      for (let i = 0; i < pulses; i++) { const tp = t0 + i * .032; g.gain.linearRampToValueAtTime(.05, tp + .008); g.gain.linearRampToValueAtTime(0, tp + .026); }
      const f1 = filt('bandpass', rr(650, 850), 5), f2 = filt('bandpass', rr(1500, 1800), 6), mix = ctx.createGain(), lp = filt('lowpass', 2400), pn = pan(p), w = ctx.createGain();
      o.connect(g); g.connect(f1); g.connect(f2); f1.connect(mix); f2.connect(mix); mix.gain.value = .6;
      chain(mix, lp, pn); pn.connect(S.near); w.gain.value = 1.2; pn.connect(w); w.connect(S.wet);
      o.start(t0); o.stop(t0 + pulses * .032 + .05);
    }
  }

  // 波：沖から盛り上がって（こもった低い音が明るくなる）、砕けて、泡が引いていく
  function wave(S, t) {
    const p = rr(-.35, .35), body = src('pink'), lp = filt('lowpass', 220, .5), g = ctx.createGain(), pk = rr(.09, .15);
    lp.frequency.setValueAtTime(220, t); lp.frequency.exponentialRampToValueAtTime(rr(1600, 2600), t + 2.5); lp.frequency.setTargetAtTime(420, t + 2.9, 1.4);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pk * .3, t + 1.6); g.gain.linearRampToValueAtTime(pk, t + 2.6); g.gain.setTargetAtTime(0, t + 2.9, 1.5);
    chain(body, lp, g, pan(p), S.near);
    const foam = src('white'), hp = filt('highpass', 2400, .5), soft = filt('lowpass', 8500, .5), fg = ctx.createGain();
    fg.gain.setValueAtTime(0, t); fg.gain.setValueAtTime(0, t + 2.3); fg.gain.linearRampToValueAtTime(pk * .2, t + 2.8); fg.gain.setTargetAtTime(0, t + 3, 2);
    chain(foam, hp, soft, fg, pan(-p * .6), S.near);
    [body, foam].forEach((s) => { s.start(t, r() * 4); s.stop(t + 11); });
  }

  // コオロギ：ずっと鳴っている高い音を、3〜4 回ずつ細かく刻む（1 匹ごとに高さと間合いが違う）
  function crickets(S) {
    return [0, 1, 2].map((i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), far = i === 2;
      o.frequency.value = rr(4300, 5100); g.gain.value = 0;
      chain(o, g, far ? filt('lowpass', 3800) : ctx.createGain(), pan([-.6, .45, .05][i]), S.near);
      if (far) { const w = ctx.createGain(); w.gain.value = 1.4; g.connect(w); w.connect(S.wet); }
      o.start(); S.srcs.push(o);
      return { g, per: rr(.55, .95), amp: far ? .006 : rr(.008, .012), next: ctx.currentTime + r() };
    });
  }
  function chirp(c, t) {
    const n = 3 + (r() < .4 ? 1 : 0);
    for (let i = 0; i < n; i++) { const tp = t + i * .027; c.g.gain.setValueAtTime(0, tp); c.g.gain.linearRampToValueAtTime(c.amp, tp + .006); c.g.gain.linearRampToValueAtTime(0, tp + .017); }
  }

  // 遠くを通る車：こもった音が近づいて、左から右へ抜けていく
  function car(S, t) {
    const s = src('pink'), bp = filt('bandpass', 260, .8), g = ctx.createGain(), pn = pan(0), dir = r() < .5 ? 1 : -1, d = rr(5, 8);
    bp.frequency.setValueAtTime(240, t); bp.frequency.linearRampToValueAtTime(rr(600, 800), t + d / 2); bp.frequency.linearRampToValueAtTime(260, t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(rr(.035, .05), t + d / 2); g.gain.linearRampToValueAtTime(0, t + d);
    if (pn.pan) { pn.pan.setValueAtTime(-.8 * dir, t); pn.pan.linearRampToValueAtTime(.8 * dir, t + d); }
    chain(s, bp, g, pn, S.near); const w = ctx.createGain(); w.gain.value = .8; g.connect(w); w.connect(S.wet);
    s.start(t, r() * 4); s.stop(t + d + .1);
  }

  // ---- 部屋ごとの音 ----
  const SCENES = {
    forest: {
      build(S) {
        bed(S, 'pink', [['highpass', 600], ['lowpass', 3800]], .05, { wander: .7, bright: [2400, 5200], p: .1 }); // 葉ずれ
        bed(S, 'brown', [['lowpass', 300]], .09, { wander: .5 }); // 風の低いうなり
      },
      events: [{ every: [1.2, 4.2], fn: bird }],
    },
    jungle: {
      build(S) {
        bed(S, 'white', [['bandpass', 1100, .5], ['lowpass', 3600]], .035, { wander: .25, bright: [2800, 4400] }); // せせらぎの地
        bed(S, 'brown', [['lowpass', 380]], .06, { wander: .3 });
      },
      events: [
        // 泡：小さな空気の粒がはじけて、音程が一瞬だけ上がる（本物の水音の正体）
        { every: [.02, .08], fn(S, t) {
          const o = ctx.createOscillator(), g = ctx.createGain(), f = rr(500, 1700), d = rr(.02, .07);
          o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * rr(1.3, 1.9), t + d);
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(rr(.004, .014), t + .003); g.gain.exponentialRampToValueAtTime(.0001, t + d);
          chain(o, g, pan(rr(-.6, .6)), S.near); o.start(t); o.stop(t + d + .02);
        } },
        { every: [3.5, 9], fn: frog },
      ],
    },
    cove: {
      build(S) { bed(S, 'brown', [['lowpass', 480]], .08, { wander: .35, far: .5 }); }, // 沖の低い海鳴り
      events: [{ every: [6.5, 10.5], fn: wave, first: .3 }],
    },
    night: {
      build(S) {
        bed(S, 'brown', [['lowpass', 150]], .06, { wander: .2 }); // 街の遠いうなり
        bed(S, 'pink', [['highpass', 1800], ['lowpass', 6000]], .008, { wander: .8, p: -.3 }); // ヤシの葉ずれ
        S.crickets = crickets(S);
      },
      events: [{ every: [13, 26], fn: car, first: 4 }],
      tick(S, until) { S.crickets.forEach((c) => { while (c.next < until) { chirp(c, c.next); c.next += c.per * rr(.94, 1.08); } }); },
    },
    attic: {
      build(S) {
        bed(S, 'pink', [['highpass', 900], ['lowpass', 7000]], .03, { wander: .3, bright: [5000, 8000] }); // 雨
        bed(S, 'brown', [['lowpass', 170]], .07, { wander: .25 }); // 屋根に響く低い音
        bed(S, 'brown', [['bandpass', 380, .6]], .018, { wander: .6, p: .35 }); // 薪の火のゴーッという音
      },
      events: [
        // 屋根や窓を打つ雨粒
        { every: [.03, .09], fn: (S, t) => grain(S, t, { f: rr(2200, 7000), q: 1.4, amp: rr(.006, .03), dec: rr(.006, .02), p: rr(-.8, .8) }) },
        // 薪のはぜ：小さなパチパチの連なりと、ときどき大きめのパチッ
        { every: [.08, .7], fn(S, t) {
          const big = r() < .06, n = big ? 1 : 1 + Math.floor(r() * 3);
          for (let i = 0; i < n; i++) grain(S, t + i * rr(.01, .05), big ? { f: rr(700, 1300), q: .7, amp: .16, dec: .05, p: .35, wet: .3 } : { f: rr(1500, 5000), q: .9, amp: rr(.03, .09), dec: rr(.004, .015), p: .35 });
        } },
      ],
    },
  };

  function open(name) {
    const def = SCENES[name]; if (!def) return null;
    const S = { name, srcs: [], drift: [], g: ctx.createGain(), near: ctx.createGain(), wet: ctx.createGain(), ev: [] };
    // 近い音はそのまま、遠い音は広がり（space）へ。どちらも部屋が変わるときに一緒にフェードする
    const toSpace = ctx.createGain(); toSpace.gain.value = 0; S.toSpace = toSpace;
    S.g.gain.value = 0; S.near.connect(S.g); S.g.connect(bus); S.wet.connect(toSpace); toSpace.connect(space);
    def.build(S);
    const now = ctx.currentTime;
    S.ev = def.events.map((e) => ({ ...e, next: now + (e.first ?? rr(.2, 1.5)) }));
    S.g.gain.setTargetAtTime(LEVEL[name], now, 1.1); toSpace.gain.setTargetAtTime(LEVEL[name], now, 1.1);
    return S;
  }
  function close(S) {
    if (!S) return;
    const now = ctx.currentTime;
    S.g.gain.setTargetAtTime(0, now, .9); S.toSpace.gain.setTargetAtTime(0, now, .9);
    setTimeout(() => { S.srcs.forEach((s) => { try { s.stop(); } catch { /* 止まっていれば何もしない */ } }); S.g.disconnect(); S.toSpace.disconnect(); }, 5000);
  }

  return {
    // 部屋が変わったら、前の部屋の音をフェードして止め、次の部屋の音を立ち上げる
    scene(name) {
      want = name;
      if (!running || (cur && cur.name === name)) return;
      close(cur); cur = open(name);
    },
    start() { running = true; bus.gain.setTargetAtTime(1, ctx.currentTime, .8); close(cur); cur = open(want); },
    stop() { running = false; bus.gain.setTargetAtTime(0, ctx.currentTime, .25); close(cur); cur = null; },
    tick() {
      if (!running || !cur) return;
      const now = ctx.currentTime, until = now + .15, def = SCENES[cur.name];
      cur.ev.forEach((e) => { while (e.next < until) { e.fn(cur, Math.max(e.next, now + .01)); e.next += rr(...e.every); } });
      cur.drift.forEach((d) => { if (now >= d.next) { d.param.setTargetAtTime(rr(d.lo, d.hi), now, rr(...d.tau)); d.next = now + rr(...d.every); } });
      if (def.tick) def.tick(cur, until);
    },
  };
}
