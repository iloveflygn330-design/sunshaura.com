/* =====================================================
   このサイトについて（about/index.html）の中身のデータ
   about/index.html で about.js より先に読み込む。動きは about.js、見た目は about.css。

   ここにあるもの:
     ABOUT_PROFILE  … プロフィールカードの中身
     ABOUT_CREDITS  … クレジット（カードの後ろに並ぶ文字）
     ABOUT_PHYSICS  … カードを投げたときの動き（跳ね返り・減速など）の数値

   文字はここを書き換えるだけで、表示もカードがぶつかったときの散らばり方も自動で付く。
   HTML（about/index.html）を書き換える必要はない。
   ===================================================== */

/* -----------------------------------------------------
   プロフィールカード

   ★拡張予定: プロフィールの項目を増やす・変える手順
     rows に1行追加する（上から順にカードに並ぶ）。書き方は3種類:
       { label: '項目名', text: '表示する文字' }
       { label: '項目名', text: '表示する文字', href: 'avatar/' }
            → href を付けるとリンクになる。サイト内のページは「サイトのトップからの場所」で書く
              （例: 'avatar/'。ページ移動の「ちょっとまってね...」の演出も自動で入る）
              サイトの外は 'https://...' で書く（新しいタブで開く）
       { label: '項目名', since: '2023-03' }
            → 「2023/03 〜（3年7か月）」のように、今日までの長さを自動で計算して表示する

     ※ カードは「レイアウトそのままで縮小」する作りなので、大きさ（幅・高さ）は固定。
       行を増やしすぎるとはみ出すので、5〜6行までにしておく。
       カードの大きさを変える場合は about.css の --card-w / --card-h を書き換える。

   ★拡張予定: リンクのボタンを増やす
     links に1行追加する。 { label: 'ボタンの文字', href: 'https://...' }

   ★拡張予定: 写真（カード左上の正方形の画像）を増やす
     assets/images/about/profile/ に画像を入れて push するだけ。
     ページを開くたびにランダムで1枚選ばれる（一覧は GitHub 上で自動で作られる。
     手順は assets/images/about/profile/README.md）。
     1枚もないときは、トップページのキャラクター画像から選ぶ。

   「今のひとこと」は Discord で変える（手順は .github/scripts/discord-status.js の先頭）。
   Discord からまだ一度も取り込んでいないときは、下の status.fallback を表示する。
   ----------------------------------------------------- */
const ABOUT_PROFILE = {
  name: 'シャウラ',
  nameSub: 'Shaura',                       // 名前の下の小さい文字（読み方・英字表記）

  status: {
    label: '今のひとこと',
    fallback: 'よろしくお願いします！',     // Discord から取り込む前に表示する文字
    file: 'data/status.json'               // Discord から取り込んだ文字の置き場所（about/ から見た場所。自動生成）
  },

  rows: [
    { label: 'VRChat歴',       since: '2023-03' },
    { label: 'メインアバター', text: 'まめひなた', href: 'avatar/' }
  ],

  links: [
    { label: 'X',     href: 'https://x.com/shaura330' },
    { label: 'BOOTH', href: 'https://sunshaura.booth.pm/' }
  ],

  /* 写真の一覧（自動生成。about/ から見た場所）。上から順に探して、画像が入っている一覧を使う */
  photoLists: [
    { file: '../assets/images/about/list.json',   keys: ['profile'] },
    { file: '../assets/images/welcome/list.json', keys: ['left', 'right', 'footer'] }   // 写真が1枚もないときの代わり
  ]
};

/* -----------------------------------------------------
   クレジット

   ★拡張予定: クレジットを追加する手順
     1. 当てはまる見出し（title）の items に1行追加する
          { name: '名前', author: '作者名', url: 'https://...' }
        使える項目（いらないものは書かなくてよい）:
          name     : 1行目（アバター名・曲名など）
          author   : 「作者：〇〇」として表示する
          note     : そのまま表示する補足（ライセンスなど）
          url      : リンク先。書くと【〇〇に移動する】のリンクが出る
          linkText : リンクの文字（省略すると見出しの linkText → 「サイトに移動する」の順で使う）
     2. 見出しごと増やす場合は、{ title: …, side: …, items: [ … ] } を1つ追加する
          side : 'left'（PC は左の列・スマホは上の段）／ 'right'（PC は右の列・スマホは下の段）
          linkText : その見出しの中のリンクの文字（例: 'boothに移動する'）
     3. 並び順は、書いた順番のまま（上から）

     ※ 1行（name・author・note・リンク）がそれぞれ「塊」になって、カードがぶつかると別々に飛び散る。
     ※ 作者名がまだわからないものは author を空（''）にしておくと表示されない。

   ★拡張予定: 作者名・リンクがまだ入っていないもの（author: '' / url: ''）を埋める
   ----------------------------------------------------- */
const ABOUT_CREDITS = [
  {
    title: '使用しているアバター',
    side: 'left',
    linkText: 'boothに移動する',
    items: [
      { name: 'まめひなた',   author: 'もち山金魚様',        url: 'https://booth.pm/ja/items/4340548' },
      { name: 'うささき',     author: 'もち山金魚様',        url: 'https://mukumi.booth.pm/items/3550881' },
      { name: '凪夜 瑠璃',     author: 'STUDIO MOCA様',       url: 'https://booth.pm/ja/items/5351494' },
      { name: 'フォシュニア', author: 'Ama ama 15 ㅊ福様',   url: 'https://booth.pm/ja/items/4580093' },
      { name: 'シャロ',       author: '', url: '' },
      { name: 'ずんだもん',   author: '', url: 'https://zunko.jp/' , linkText: 'サイトに移動する' }
    ]
  },
  {
    title: 'BGM',
    side: 'right',
    items: [
      // ★拡張予定: ニュース動画などで使った曲を追加する（例: { name: '曲名', author: '作者名', url: 'https://...' }）
    ]
  },
  {
    title: 'アイコン',
    side: 'right',
    items: [
      // ★拡張予定: ショップのウィンドウのアイコンなど、借りている画像を追加する
    ]
  },
  {
    title: '音声',
    side: 'left',
    items: [
      { name: 'VOICEVOX:ずんだもん', note: 'ミニゲーム・ニュース動画', url: 'https://voicevox.hiroshiba.jp/' }
    ]
  },
  {
    title: 'フォント',
    side: 'left',
    items: [
      { name: 'M PLUS Rounded 1c', author: 'M+ FONTS PROJECT', note: 'SIL Open Font License', url: 'https://fonts.google.com/specimen/M+PLUS+Rounded+1c' }
    ]
  },
  {
    title: 'プログラム',
    side: 'right',
    items: [
      { name: 'GSAP',                 note: 'トップページの動き',          url: 'https://gsap.com/' },
      { name: 'Matter.js',            author: 'liabru', note: 'MIT License', url: 'https://brm.io/matter-js/' },
      { name: 'lbpcascade_animeface', author: 'nagadomi', note: 'MIT License', url: 'https://github.com/nagadomi/lbpcascade_animeface' }
    ]
  },
  {
    title: 'ご注意',
    side: 'right',
    items: [
      { name: '特記がないものは、シャウラ製ではありません' },
      { name: 'ニュースは AI（Claude）が要約しています' },
      { name: 'アクセス解析に Google アナリティクスを使っています', url: 'https://policies.google.com/technologies/partner-sites?hl=ja', linkText: 'Google のポリシー' }
    ]
  }
];

/* -----------------------------------------------------
   カードを投げたときの動き

   ★拡張予定: 触り心地を変える場合は、下の数字を書き換える
     restitution      : 壁で跳ね返る強さ（0〜1。1 に近いほどよく跳ねる）
     frictionAir      : 空気の重さ（大きいほど早く止まる。0.005〜0.05 くらい）
     maxSpeed         : カードの最高速度（速すぎて壁を突き抜けないための上限）
     grabStiffness    : つかんだ点のついてくる強さ（0〜1。小さいほどふわっと遅れてついてくる＝よく回る）
     scatterSpeed     : この速さ以上でぶつかったときだけ文字が飛び散る（ゆっくり重ねただけでは散らない）
     scatterPower     : 文字が飛び散る勢い（カードの速さに掛ける倍率）
     chunkFrictionAir : 飛び散った文字の空気の重さ（大きいほど早く止まる）
     restoreAfterMs   : カードが止まってから、文字が元の位置に戻るまでの時間（ミリ秒。10000 = 10秒）
     restoreMs        : 文字が元の位置に戻る動きの時間（ミリ秒）
     smallWidthPC / smallWidthSP : 小さくしたカードの幅（px）
     bigTilt / smallTilt         : 大きいとき・小さくした直後のカードの傾き（度）
     doubleTapMs      : この時間内に2回押したら「ダブルクリック」とみなす（ミリ秒）
   ----------------------------------------------------- */
const ABOUT_PHYSICS = {
  restitution: 0.9,
  frictionAir: 0.012,
  maxSpeed: 42,
  grabStiffness: 0.18,
  scatterSpeed: 2.2,
  scatterPower: 1.4,
  chunkFrictionAir: 0.035,
  restoreAfterMs: 10000,
  restoreMs: 900,
  smallWidthPC: 190,
  smallWidthSP: 140,
  bigTilt: -5,
  smallTilt: -8,
  doubleTapMs: 320
};
