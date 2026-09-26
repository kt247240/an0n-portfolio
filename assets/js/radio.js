// =========================================================
// 森のラジオ：SoundCloud のプレイリストを、ラジオのように流し続ける（公式の埋め込みプレーヤー Widget API）
// ・再生はプレイリストのどこかの曲から始め、最後まで行ったら最初に戻る
// ・曲の下に、部屋ごとの環境音（ambience.js）を薄く敷く
// ・画面の隅に「いま流れている曲」を小さく出し、SoundCloud へのリンクを添える（SoundCloud の規約上、出どころの表示が要る）
// ・SoundCloud の仕組みは、最初に音を鳴らすときに初めて読み込む（音なしで見る人には一切読み込まない）
// beat.js と同じ形（toggle / playing / setScene …）にしてあるので、museum.js からはどちらも同じように扱える
// =========================================================
import { createAmbience } from './ambience.js';

const API = 'https://w.soundcloud.com/player/api.js';
const loadAPI = () => window.SC ? Promise.resolve() : new Promise((ok, ng) => {
  const s = document.createElement('script'); s.src = API; s.async = true; s.onload = ok; s.onerror = ng; document.head.append(s);
});

export function createRadio({ playlist, secret, volume = 70 }) {
  let frame = null, widget = null, ready = null, playing = false, want = false, scene = 'forest';
  let actx = null, amb = null, ambTimer = 0, gestureWait = 0;
  const bar = document.createElement('div');
  bar.id = 'now-playing'; bar.setAttribute('aria-live', 'polite');
  bar.innerHTML = '<i class="eq" aria-hidden="true"><b></b><b></b><b></b></i><a class="np" target="_blank" rel="noopener" title="SoundCloud で聴く"></a>';
  document.body.append(bar);

  function setup() {
    if (ready) return ready;
    frame = document.createElement('iframe');
    frame.id = 'sc-radio'; frame.title = 'SoundCloud radio'; frame.allow = 'autoplay; encrypted-media';
    const q = new URLSearchParams({ url: playlist, auto_play: 'false', visual: 'false', show_artwork: 'false', show_comments: 'false', show_user: 'true', hide_related: 'true', sharing: 'false', buying: 'false', download: 'false', show_reposts: 'false', show_teaser: 'false' });
    if (secret) q.set('secret_token', secret);
    // プレーヤー本体は画面の外へ。直接タップが要るときだけ、再生ボタンの部分だけを透明にして自前の丸いボタンの下に置く
    const btn = document.createElement('i'); btn.id = 'sc-play'; btn.setAttribute('aria-hidden', 'true');
    // 先に仕組み（api.js）を読み込んでから iframe を付ける（逆だと、準備完了の知らせを取りこぼすことがある）
    ready = loadAPI().then(() => new Promise((ok) => {
      frame.src = `https://w.soundcloud.com/player/?${q}`;
      document.body.append(frame, btn);
      widget = window.SC.Widget(frame);
      const E = window.SC.Widget.Events;
      widget.bind(E.READY, () => {
        widget.setVolume(volume);
        // ラジオらしく、プレイリストのどこかの曲から始める
        widget.getSounds((list) => { if (list && list.length > 1) widget.skip(Math.floor(Math.random() * list.length)); ok(); });
      });
      widget.bind(E.PLAY, () => { playing = true; clearTimeout(gestureWait); document.body.classList.remove('radio-tap'); show(); sync(); });
      widget.bind(E.PAUSE, () => { playing = false; sync(); });
      widget.bind(E.ERROR, () => { if (want) { widget.next(); widget.play(); } }); // 再生できない曲は飛ばす
      // 最後の曲が終わったら、最初に戻って流し続ける
      widget.bind(E.FINISH, () => widget.getCurrentSoundIndex((i) => widget.getSounds((list) => { if (i >= list.length - 1) { widget.skip(0); } })));
    }));
    return ready;
  }
  function show() {
    widget.getCurrentSound((s) => {
      if (!s) return;
      const np = bar.querySelector('.np');
      const text = `${s.title}${s.user ? ` — ${s.user.username}` : ''}`;
      if (np.textContent === text) return;
      np.textContent = text;
      np.href = s.permalink_url || 'https://soundcloud.com';
      // 曲が変わったときだけ曲名を数秒見せ、あとは小さな印だけに（さわると曲名が出る）
      bar.classList.add('peek'); clearTimeout(bar._t); bar._t = setTimeout(() => bar.classList.remove('peek'), 6000);
    });
  }
  function sync() {
    bar.classList.toggle('on', playing);
    document.body.classList.toggle('beat-on', playing);
    if (amb) { if (playing) { amb.scene(scene); amb.start(); } else amb.stop(); }
  }
  // 環境音（曲より控えめに）
  function ensureAmbience() {
    if (actx) return;
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      const g = actx.createGain(); g.gain.value = .7; g.connect(actx.destination);
      amb = createAmbience(actx, g);
      ambTimer = setInterval(() => amb.tick(), 50);
    } catch { actx = null; amb = null; }
  }

  return {
    get playing() { return want; },
    toggle() {
      want = !want;
      ensureAmbience();
      if (actx) (want ? actx.resume() : Promise.resolve()).catch(() => {});
      setup().then(() => {
        if (want) {
          widget.play();
          // 流せない曲（地域や権利の都合で再生できないもの）なら次の曲へ。それでも鳴らないとき
          // （iPhone などで外からの再生が許されなかったとき）は、プレーヤーを見せて直接タップしてもらう
          clearTimeout(gestureWait);
          let tries = 0;
          const check = () => {
            if (!want || playing) return;
            if (tries++ < 2) { widget.next(); widget.play(); gestureWait = setTimeout(check, 3000); } else document.body.classList.add('radio-tap');
          };
          gestureWait = setTimeout(check, 3000);
        } else { widget.pause(); document.body.classList.remove('radio-tap'); }
      }).catch(() => { want = false; document.body.classList.remove('beat-on'); }); // SoundCloud を読み込めなかったとき
      return want;
    },
    setScene(s) { scene = s; if (amb && playing) amb.scene(s); },
    next() { if (widget && want) widget.next(); },
    scratch() { /* ラジオでは、速いスクロールで曲を飛ばさない */ },
    nextChords() { this.next(); },
    nextGroove() { this.next(); },
    stopAmbienceTimer() { clearInterval(ambTimer); },
  };
}
