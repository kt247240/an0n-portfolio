// =========================================================
// 歩く速さ：スクロールの速さに上限を付ける
// 指やホイールの動きはそのまま受け取り、ページは「上限の速さ」までで追いかける。
// 速くはじいても、森の中を歩くくらいの速さでしか進まない（通り過ぎるだけの部屋や作品を一度に読み込まないので、iPhone でも落ちにくい）
// ・指を離したあとの惰性（慣性スクロール）も自前で付ける
// ・作品を開いているとき・金庫などの画面では、何もしない（ふつうのスクロール）
// =========================================================
export function paceScroll({ maxSpeed, active }) {
  let target = scrollY, cur = scrollY, running = false, last = 0, setY = -1;
  let touchY = null, touchT = 0, vel = 0, lastMoveY = 0;
  const maxY = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);
  const clampY = (y) => Math.min(maxY(), Math.max(0, y));
  const kick = () => { if (!running) { running = true; last = performance.now(); requestAnimationFrame(step); } };
  function step(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    // ナビのリンクなど、ほかの方法でスクロール位置が変わっていたら、そちらを優先して止まる
    if (setY >= 0 && Math.abs(scrollY - setY) > 2 && touchY == null) { cur = target = scrollY; vel = 0; running = false; setY = -1; return; }
    const max = maxSpeed();
    if (touchY == null && vel !== 0) {
      // 指を離したあとの惰性：iPhone のふつうのスクロールと同じく、速さが少しずつ弱まっていく（強くはじくほど遠くまで）。
      // ただし進む速さは上限まで。上限を超える勢いのあいだは上限の速さで進み、弱まってきたらなめらかに止まる
      const v = Math.sign(vel) * Math.min(Math.abs(vel), max);
      cur = clampY(cur + v * dt); target = cur;
      vel *= Math.exp(-dt * 2.1);
      if (Math.abs(vel) < 6 || cur <= 0 || cur >= maxY()) { vel = 0; running = false; }
    } else {
      // 指でなぞっているあいだ・ホイール：行き先へ、上限の速さを超えないように追いかける（近づいたらなめらかに）
      const d = target - cur, lim = max * dt;
      const move = Math.sign(d) * Math.min(Math.abs(d), Math.max(lim * Math.min(1, Math.abs(d) / (innerHeight * .25)), Math.min(Math.abs(d), touchY == null ? .6 : 2)));
      cur += move;
      if (Math.abs(target - cur) < .5 && touchY == null) { cur = target; running = false; }
    }
    scrollTo(0, Math.round(cur)); setY = scrollY;
    if (running) requestAnimationFrame(step); else setY = -1;
  }
  // ほかの方法（ナビのリンク、キーボード、スクロールバー）で動いたときは、そこから始める
  addEventListener('scroll', () => { if (!running && touchY == null) { cur = target = scrollY; } }, { passive: true });
  addEventListener('touchstart', (e) => {
    if (!active(e) || e.touches.length > 1) { touchY = null; return; }
    touchY = lastMoveY = e.touches[0].clientY; touchT = performance.now(); vel = 0;
    if (!running) cur = target = scrollY; else target = cur; // 惰性で動いている途中にさわったら、そこで止めて指に合わせる
  }, { passive: true });
  addEventListener('touchmove', (e) => {
    if (touchY == null || e.touches.length > 1) return;
    e.preventDefault();
    const y = e.touches[0].clientY, now = performance.now(), dy = lastMoveY - y, dt = Math.max(1, now - touchT);
    target = clampY(target + dy * 1.15); // 指の動きより少しだけ多めに進む（画面いっぱいなぞらなくても次へ行けるように）
    vel = vel * .4 + (dy / dt * 1000) * .6; // 指の速さ（なめらかにならす）
    lastMoveY = y; touchT = now; kick();
  }, { passive: false });
  // 指を離したとき：指の速さをそのまま惰性の速さにする（止まってから離したときは惰性なし）
  const end = () => {
    if (touchY == null) return; touchY = null;
    if (performance.now() - touchT > 120 || Math.abs(vel) < 40) vel = 0;
    vel *= 1.15; // なぞる量と同じだけ、少し多めに
    kick();
  };
  addEventListener('touchend', end, { passive: true });
  addEventListener('touchcancel', end, { passive: true });
  addEventListener('wheel', (e) => {
    if (!active(e) || e.ctrlKey) return;
    e.preventDefault();
    const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
    if (!running) cur = target = scrollY;
    vel = 0;
    target = clampY(target + e.deltaY * k * 1.15);
    kick();
  }, { passive: false });
}
