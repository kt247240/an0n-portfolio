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
export const PLANNED_TOTAL = 18;

// 展示室：朝の森 → 昼の水辺 → 夕暮れ → 夜 と、歩くほど時間が進む
export const ROOMS = [
  { id: 'dapple', no: 'I', ja: '木漏れ日の間', en: 'Dappled Light', scene: 'forest', frame: 'hang', planned: 3,
    lead: '朝の光が葉のすき間から落ちる、いちばん手前の部屋。' },
  { id: 'water', no: 'II', ja: '水辺の間', en: 'Waterside', scene: 'jungle', frame: 'easel', planned: 3,
    lead: '睡蓮の浮かぶ水の上、木のデッキに作品を立てかけて。' },
  { id: 'dusk', no: 'III', ja: '夕凪の間', en: 'Evening Calm', scene: 'cove', frame: 'post', planned: 3,
    lead: '夕焼けと珊瑚の浜辺。吊りランプの灯りの下で。' },
  { id: 'night', no: 'IV', ja: '夜の庭', en: 'Night Garden', scene: 'night', frame: 'lightbox', planned: 5,
    lead: 'ホタルとネオンの灯る庭。この先は、もう閉館後。' },
  { id: 'afterhours', no: 'V', ja: '夜更けの小屋', en: 'Late Night Cabin', scene: 'attic', frame: 'wall', planned: 4,
    lead: '明かりの消えた屋根裏。懐中電灯で、そっと照らしてみてください。' },
];

// 並び順＝展示の順路。各部屋の中は、絵の中の時間が明るい順 → 暗い順
export const WORKS = [
  {
    id: 'balaclava', room: 'dapple',
    title: 'Balaclava', ja: 'バラクラバ', year: '', medium: 'Illustration',
    type: 'image', src: 'assets/art/balaclava.jpg', aspect: 0.75,
    note: '葉巻をくゆらせる、この森の主。すべての作品に出てくる、An0n. の分身。',
    tentative: true,
  },
  {
    id: 'canopy', room: 'dapple',
    title: 'Canopy', ja: '梢の上', year: '', medium: 'Animation',
    type: 'video', src: 'assets/works/canopy.mp4', poster: 'assets/works/canopy.jpg', aspect: 0.8,
    note: '霧の山を見下ろす梢の枝に腰かけて、携帯をながめる。蓄音機とハンモック、黄色い小鳥。',
    tentative: true,
  },
  {
    id: 'loud-garden', room: 'dapple',
    title: 'Loud Garden', ja: 'ラウド・ガーデン', year: '', medium: 'Animation',
    type: 'video', src: 'assets/works/loud-garden.mp4', poster: 'assets/works/loud-garden.jpg', aspect: 0.8,
    note: '桜の咲く通りの花屋。自転車、スケーター、窓の人影、手を振る工事の人。',
  },
  {
    id: 'jungle-atelier', room: 'water',
    title: 'Jungle Atelier', ja: 'ジャングルのアトリエ', year: '', medium: 'Animation',
    type: 'video', src: 'assets/works/jungle.mp4', poster: 'assets/works/jungle.jpg', aspect: 1,
    note: '水辺のデッキでキャンバスに向かう。葉が揺れ、水面に光がゆらぐ。',
    tentative: true,
  },
  {
    id: 'giraffe', room: 'water',
    title: 'Giraffe', ja: 'キリン', year: '', medium: 'Illustration',
    type: 'image', src: 'assets/art/giraffe.jpg', aspect: 0.8,
    note: '夕焼けの水辺に立つキリン。手前の大きな葉のすき間から、そっとのぞく。',
    tentative: true,
  },
  {
    id: 'deep-in', room: 'water',
    title: 'Deep In.', ja: 'ディープ・イン', year: '', medium: 'Cover Art (Motion)', credit: 'BrotherMacX ft. Kowait',
    type: 'video', src: 'assets/works/deep-in.mp4', poster: 'assets/works/deep-in.jpg', aspect: 1,
    note: '月の光が差す海の底へ、ゆっくり沈んでいく。魚の群れと、海藻と、宝箱。',
  },
  {
    id: 'sunset-session', room: 'dusk',
    title: 'Sunset Session', ja: '夕凪のセッション', year: '', medium: 'Animation',
    type: 'video', src: 'assets/works/sunset.mp4', poster: 'assets/works/sunset.jpg', aspect: 0.8,
    note: '夕焼けの浜でターンテーブルを回す。クジラとクラゲと白い蝶が集まってくる。',
    tentative: true,
  },
  {
    id: 'm03', room: 'dusk',
    title: 'M03', ja: 'ターミナル', year: '', medium: 'Animation',
    type: 'video', src: 'assets/works/m3.mp4', poster: 'assets/works/m3.jpg', aspect: 0.8,
    note: '夕焼けの雪山が見える空港のターミナル。ゲート M03、飛び立つ飛行機、ギターを弾く人、エスカレーターの人々。',
    tentative: true,
  },
  {
    id: 'trap', room: 'dusk',
    title: 'TRAP', ja: 'トラップ', year: '', medium: 'Cover Art', credit: 'BrotherMacX',
    type: 'image', src: 'assets/art/trap.jpg', aspect: 1,
    note: 'FROM THE TRAP TO A BETTER LIFE。影の街から、夕焼けの摩天楼とスタジオへ歩き出す。',
  },
  {
    id: 'paradise-falls', room: 'night',
    title: 'Paradise Falls', ja: 'パラダイス・フォールズ', year: '', medium: 'Animation',
    type: 'video', src: 'assets/works/paradise.mp4', poster: 'assets/works/paradise.jpg', aspect: 0.8,
    note: '夜の大通りを歩くふたり。ネオンと煙とヤシの木。',
  },
  {
    id: 'cosmic-smoke', room: 'night',
    title: 'Cosmic Smoke', ja: '宇宙の煙', year: '', medium: 'Animation',
    type: 'video', src: 'assets/works/cosmic-smoke.mp4', poster: 'assets/works/cosmic-smoke.jpg', aspect: 1,
    note: 'ひと吸いすると、背中に銀河がひろがる。セーターには太陽と月と土星。',
    tentative: true,
  },
  {
    id: 'yukemuri', room: 'night',
    title: '湯煙商会', ja: 'ゆけむりしょうかい', year: '', medium: 'Poster (Motion)', credit: '湯の町 戸倉上山田',
    type: 'video', src: 'assets/works/yukemuri.mp4', poster: 'assets/works/yukemuri.jpg', aspect: 0.8,
    note: '月夜の湯けむり。バラクラバの男も、今夜は湯船でひと休み。',
  },
  {
    id: 'kannon', room: 'night',
    title: 'Moonlit Kannon', ja: '月夜の観音', year: '', medium: 'Animation',
    type: 'video', src: 'assets/works/kannon.mp4', poster: 'assets/works/kannon.jpg', aspect: 0.8,
    note: '満月とホタルの野原。白い装束の人の背に、観音さまが光とともに現れる。',
    tentative: true,
  },
  {
    id: 'mountain-lights', room: 'night',
    title: 'Mountain Lights', ja: '山の灯り', year: '', medium: 'Animation',
    type: 'video', src: 'assets/works/mountain-lights.mp4', poster: 'assets/works/mountain-lights.jpg', aspect: 0.8,
    note: '真っ暗な山に、社と赤い灯りがひとつずつ灯っていく。',
    tentative: true,
  },
  {
    id: 'snow-moon', room: 'afterhours',
    title: 'Snow Moon', ja: '雪の月夜', year: '', medium: 'Animation',
    type: 'video', src: 'assets/works/snow-moon.mp4', poster: 'assets/works/snow-moon.jpg', aspect: 0.8,
    note: '満月の雪山。凍ったつるの下、石の小道の脇の岩で、温かい飲み物をひと口。遠くに赤い車と UFO。',
    tentative: true,
  },
  {
    id: 'season-goldfish', room: 'afterhours',
    title: 'Season. I', ja: '金魚鉢', year: '', medium: 'Animation',
    type: 'video', src: 'assets/works/season-goldfish.mp4', poster: 'assets/works/season-goldfish.jpg', aspect: 1,
    note: '本棚の下、モンステラに囲まれた金魚鉢。白い帯が部屋を流れていく。',
    tentative: true,
  },
  {
    id: 'season-nap', room: 'afterhours',
    title: 'Season. II', ja: '昼寝', year: '', medium: 'Animation',
    type: 'video', src: 'assets/works/season-nap.mp4', poster: 'assets/works/season-nap.jpg', aspect: 1,
    note: 'スケートボードの飾られた部屋。ソファの向こうから Zzz… と寝息がのぼる。',
    tentative: true,
  },
  {
    id: 'season-attic', room: 'afterhours',
    title: 'Season. III', ja: '屋根裏', year: '', medium: 'Animation',
    type: 'video', src: 'assets/works/season-attic.mp4', poster: 'assets/works/season-attic.jpg', aspect: 1,
    note: '段ボールの積まれた屋根裏に、地球と惑星が浮かぶ。箱のカウンターは 1515。',
    tentative: true,
  },
];

