// =========================================================
// 収蔵作品のデータ — 作品を追加・差し替えるときはこのファイルだけ編集する
//
// 作品を足す手順
//   1. 画像は assets/art/、動画は assets/works/ に置く（動画はポスター画像 .jpg も一緒に）
//   2. WORKS に 1 件追加し、room に展示する部屋の id を書く
//   3. aspect は「横 ÷ 縦」（正方形 = 1、縦長 4:5 = 0.8）
//   4. 依頼の仕事（ジャケットなど）は credit にアーティスト名などを書く
// =========================================================

export const ARTIST = {
  name: 'An0n.',
  role: 'Illustration & Animation',
  bio: 'Illustration & Animation',
  links: [
    { label: 'Instagram', href: 'https://www.instagram.com/he024mp/' },
    { label: 'Mail', href: 'mailto:hektmp@gmail.com', title: 'hektmp@gmail.com' },
  ],
};

// 全収蔵数（まだ公開していない作品も含めた予定数）。部屋ごとの「搬入中」の表示に使う
export const PLANNED_TOTAL = 20;
// 音（曲・環境音・効果音）を使うか。false なら音の選択画面・ビートボタンも出さない
export const SOUND = true;
// 森のラジオ：SoundCloud のプレイリスト（非公開のシークレットリンクなら secret も）。null にすると、サイトで作った曲（beat.js）を流す
export const RADIO = { playlist: 'https://api.soundcloud.com/playlists/1780502310', secret: 's-hKNoZfx4SXQ' };

// 展示室：朝の森 → 昼の水辺 → 夕暮れ → 夜 と、歩くほど時間が進む
export const ROOMS = [
  { id: 'dapple', no: 'I', ja: '木漏れ日の間', en: 'Dappled Light', scene: 'forest', frame: 'hang', planned: 3,
    lead: '朝の光が葉のすき間から落ちる、いちばん手前の部屋。' },
  { id: 'water', no: 'II', ja: '水辺の間', en: 'Waterside', scene: 'jungle', frame: 'easel', planned: 3,
    lead: '睡蓮の浮かぶ水の上、木のデッキに作品を立てかけて。' },
  { id: 'dusk', no: 'III', ja: '夕凪の間', en: 'Evening Calm', scene: 'cove', frame: 'post', planned: 4,
    lead: '夕焼けと珊瑚の浜辺。吊りランプの灯りの下で。' },
  { id: 'night', no: 'IV', ja: '夜の庭', en: 'Night Garden', scene: 'night', frame: 'lightbox', planned: 5,
    lead: 'ホタルとネオンの灯る庭。この先は、もう閉館後。' },
  { id: 'afterhours', no: 'V', ja: '夜更けの小屋', en: 'Late Night Cabin', scene: 'attic', frame: 'wall', planned: 5,
    lead: '明かりの消えた屋根裏。懐中電灯で、そっと照らしてみてください。' },
];

// sold: true にすると、価格の代わりに SOLD OUT、nfs: true（非売品）なら NOT FOR SALE と表示する
// 並び順＝展示の順路。各部屋の中は、絵の中の時間が明るい順 → 暗い順
export const WORKS = [
  {
    id: 'canopy', room: 'dapple',
    title: 'Self Care.', ja: '', year: '2026', medium: 'Animation',
    type: 'video', src: 'assets/works/canopy.mp4', poster: 'assets/works/canopy.jpg', aspect: 0.8,
    note: '霧の山を見下ろす梢の枝に腰かけて、携帯をながめる。蓄音機とハンモック、黄色い小鳥。',
  },
  {
    id: 'season-goldfish', room: 'dapple',
    sold: true, // 売約済み（価格の代わりに SOLD OUT）
    title: 'King Gyo.', ja: '', year: '2026', medium: 'Animation',
    type: 'video', src: 'assets/works/season-goldfish.mp4', poster: 'assets/works/season-goldfish.jpg', aspect: 704 / 720,
    note: '本棚の下、モンステラに囲まれた金魚鉢。白い帯が部屋を流れていく。',
  },
  {
    id: 'loud-garden', room: 'dapple',
    title: 'Style Wars.', ja: '', year: '2026', medium: 'Animation',
    type: 'video', src: 'assets/works/loud-garden.mp4', poster: 'assets/works/loud-garden.jpg', aspect: 0.8,
    note: '桜の咲く通りの花屋。自転車、スケーター、窓の人影、手を振る工事の人。',
  },
  {
    id: 'cosmic-smoke', room: 'water',
    title: 'L00p. n0.2', ja: '', year: '2026', medium: 'Animation',
    type: 'video', src: 'assets/works/cosmic-smoke.mp4', poster: 'assets/works/cosmic-smoke.jpg', aspect: 1,
    note: 'ひと吸いすると、背中に銀河がひろがる。セーターには太陽と月と土星。',
  },
  {
    id: 'jungle-atelier', room: 'water',
    title: 'L00p n0.1', ja: '', year: '2026', medium: 'Animation',
    type: 'video', src: 'assets/works/jungle.mp4', poster: 'assets/works/jungle.jpg', aspect: 1,
    note: '水辺のデッキでキャンバスに向かう。葉が揺れ、水面に光がゆらぐ。',
  },
  {
    id: 'deep-in', room: 'water',
    nfs: true, // 非売品（価格の代わりに NOT FOR SALE）
    title: 'Deep In.', ja: '', year: '2026', medium: 'Cover Art (Motion)', credit: 'BrotherMacX ft. Kowait',
    type: 'video', src: 'assets/works/deep-in.mp4', poster: 'assets/works/deep-in.jpg', aspect: 1,
    note: '月の光が差す海の底へ、ゆっくり沈んでいく。魚の群れと、海藻と、宝箱。',
  },
  {
    id: 'sunset-session', room: 'dusk',
    title: 'RESONANCE', ja: '', year: '2026', medium: 'Animation',
    type: 'video', src: 'assets/works/sunset.mp4', poster: 'assets/works/sunset.jpg', aspect: 0.8,
    note: '夕焼けの浜、吊りランプの下で機材を鳴らす。両脇にスピーカー、クジラとクラゲと白い蝶が集まってくる。',
  },
  {
    id: 'm03', room: 'dusk',
    title: 'Solid Link.', ja: '', year: '2026', medium: 'Animation',
    type: 'video', src: 'assets/works/m3.mp4', poster: 'assets/works/m3.jpg', aspect: 0.8,
    note: '夕焼けの雪山が見える空港のターミナル。ゲート M03、飛び立つ飛行機、ギターを弾く人、エスカレーターの人々。',
  },
  {
    id: 'hidden-key', room: 'dusk',
    title: 'Hidden Key.', ja: '', year: '2026', medium: 'Animation',
    type: 'video', src: 'assets/works/hidden-key.mp4', poster: 'assets/works/hidden-key.jpg', aspect: 0.8,
    note: '美術館のモナ・リザの前。人の波、赤い警報、警備員。暗転ののち、ガラスケースのネックレスは消えている。',
  },
  {
    id: 'trap', room: 'dusk',
    nfs: true, // 非売品（価格の代わりに NOT FOR SALE）
    title: 'TRAP', ja: '', year: '2026', medium: 'Cover Art', credit: 'BrotherMacX',
    type: 'image', src: 'assets/art/trap.jpg', aspect: 1,
    note: 'FROM THE TRAP TO A BETTER LIFE。影の街から、夕焼けの摩天楼とスタジオへ歩き出す。',
  },
  {
    id: 'moon-window', room: 'night',
    title: 'Hot Space.', ja: '', year: '2026', medium: 'Animation',
    type: 'video', src: 'assets/works/moon-window.mp4', poster: 'assets/works/moon-window.jpg', aspect: 0.8,
    note: '煙のただよう灰色の部屋、窓の向こうに月。のぞき込むと、月と土星と UFO の浮かぶ宇宙が広がる。',
  },
  {
    id: 'paradise-falls', room: 'night',
    nfs: true, // 非売品（価格の代わりに NOT FOR SALE）
    title: 'Paradise Falls', ja: '', year: '2026', medium: 'Cover Art (Motion)', credit: 'Kapsoul feat. BHI',
    type: 'video', src: 'assets/works/paradise.mp4', poster: 'assets/works/paradise.jpg', aspect: 0.8,
    note: '夜の大通りを歩くふたり。ネオンと煙とヤシの木。',
  },
  {
    id: 'night-piano', room: 'night',
    title: 'Lab.', ja: '', year: '2026', medium: 'Animation',
    type: 'video', src: 'assets/works/night-piano.mp4', poster: 'assets/works/night-piano.jpg', aspect: 1,
    note: '青い夜の部屋で、アップライトピアノに向かう背中。スタンドの灯りと、窓の外の月。',
  },
  {
    id: 'mountain-lights', room: 'night',
    nfs: true, // 非売品（価格の代わりに NOT FOR SALE）
    title: '戸倉上山田 湯煙商会', ja: '', year: '2026', medium: 'Animation',
    type: 'video', src: 'assets/works/mountain-lights.mp4', poster: 'assets/works/mountain-lights.jpg', aspect: 0.8,
    note: '真っ暗な山に、社と赤い灯りがひとつずつ灯っていく。',
  },
  {
    id: 'cold-world', room: 'night',
    nfs: true, // 非売品（価格の代わりに NOT FOR SALE）
    title: 'Cold World', ja: '', year: '2026', medium: 'Cover Art (Motion)', credit: 'BrotherMacX',
    type: 'video', src: 'assets/works/cold-world.mp4', poster: 'assets/works/cold-world.jpg', aspect: 0.8,
    note: '雪の降る夜の摩天楼。屋上で手を合わせ、空を見上げる。足もとには白い百合。',
  },
  {
    id: 'yukemuri', room: 'afterhours',
    nfs: true, // 非売品（価格の代わりに NOT FOR SALE）
    title: '戸倉上山田 湯煙商会', ja: '', year: '2026', medium: 'Poster (Motion)', credit: '戸倉上山田 湯煙商会',
    type: 'video', src: 'assets/works/yukemuri.mp4', poster: 'assets/works/yukemuri.jpg', aspect: 0.8,
    note: '月夜の湯けむり。バラクラバの男も、今夜は湯船でひと休み。',
  },
  {
    id: 'snow-moon', room: 'afterhours',
    title: 'Travel', ja: '', year: '2026', medium: 'Animation',
    type: 'video', src: 'assets/works/snow-moon.mp4', poster: 'assets/works/snow-moon.jpg', aspect: 0.8,
    note: '満月の雪山。凍ったつるの下、石の小道の脇の岩で、温かい飲み物をひと口。遠くに赤い車と UFO。',
  },
  {
    id: 'season-attic', room: 'afterhours',
    title: 'Close', ja: '', year: '2025', medium: 'Animation',
    type: 'video', src: 'assets/works/season-attic.mp4', poster: 'assets/works/season-attic.jpg', aspect: 702 / 720,
    note: '段ボールの積まれた屋根裏に、地球と惑星が浮かぶ。箱のカウンターは 1515。',
  },
  {
    id: 'season-nap', room: 'afterhours',
    title: 'Lavinia 1515', ja: '', year: '2025', medium: 'Animation',
    type: 'video', src: 'assets/works/season-nap.mp4', poster: 'assets/works/season-nap.jpg', aspect: 702 / 720,
    note: 'スケートボードの飾られた部屋。ソファの向こうから Zzz… と寝息がのぼる。',
  },
  {
    id: 'kannon', room: 'afterhours',
    title: 'Housaku.', ja: '', year: '2026', medium: 'Animation',
    type: 'video', src: 'assets/works/kannon.mp4', poster: 'assets/works/kannon.jpg', aspect: 0.8,
    note: '満月とホタルの野原。白い装束の人の背に、観音さまが光とともに現れる。',
  },
];

