/* =====================================================
   恐竜ボイスゲーム（dinovoice）のデータ
   minigame/index.html で dinovoice.js より先に読み込む。

   ここにあるもの（ゲームの中身。動きは dinovoice.js）:
     DV_SETTINGS … 合格ライン・挑戦回数などの調整値
     DV_SOUNDS   … 口の形（母音）の一覧と、素材ファイル名のルール
     DV_DINOS    … 恐竜の一覧（声の特徴・色・目の位置・シルエットの形）
     DV_LINES    … ずんだもんのセリフ（文字と音声ファイル）

   素材（ずんだもん音声）の置き場所: minigame/dinovoice/sounds/
     ファイルがなくてもゲームは動く（仮の合成音で鳴る）。置けば自動でそちらが使われる。
   ===================================================== */

/* -----------------------------------------------------
   調整値
   ----------------------------------------------------- */
const DV_SETTINGS = {
  passPercent: 80,       // この％以上の一致で成功
  maxTries: 3,           // 挑戦できる回数
  voiceSeconds: 2.0,     // 「お手本のこえ」「自分のこえ」を鳴らす長さ（秒）
  soundDir: 'dinovoice/sounds/',        // 鳴き声の元の素材フォルダ（minigame/ から見た場所）
  lineDir:  'dinovoice/sounds/lines/',  // セリフ音声のフォルダ
  credit: 'VOICEVOX:ずんだもん',         // 画面下に出すクレジット（音源規約で必須。消さないこと）

  // 一致率の計算で、どの項目をどれだけ重く見るか（合計 1 になるように）
  weights: { throat: 0.35, mouth: 0.30, close: 0.20, breath: 0.15 },

  // 喉の長さスライダー（0〜1）を再生速度に変える範囲。0 = 短い喉（高い声）、1 = 長い喉（低い声）
  rateShortThroat: 1.35,
  rateLongThroat:  0.32,
};

/* -----------------------------------------------------
   口の形（母音）
     x, y … 口の形パッド上の位置（0〜1）。x: 左=舌が前（い・え）／右=舌が奥（う・お）、y: 上=口がせまい／下=口が大きい
     file … 素材ファイル名の母音部分。実際のファイル名は
              voice_<file>_normal.wav（ノーマル）/ voice_<file>_whisper.wav（ささやき系）
     formants … 素材がないときの仮の合成音の響き（Hz）。素材を置けば使われない

   ★拡張予定: 口の形を増やす場合
     1. 下に { id, label, x, y, file, formants } を1行追加（x・y は他と重ならない位置に）
     2. minigame/dinovoice/sounds/ に voice_<file>_normal.wav と voice_<file>_whisper.wav を置く
     3. 恐竜の sounds に id を足すと、その恐竜の出題に使われる
   ※「ん」は口を閉じた音なので、パッドではなく「口のとじ具合」スライダーで混ざる（下の DV_CLOSED_SOUND）
   ----------------------------------------------------- */
const DV_SOUNDS = [
  { id: 'a', label: 'あ', x: 0.50, y: 0.92, file: 'a', formants: [800, 1250, 2600] },
  { id: 'i', label: 'い', x: 0.12, y: 0.10, file: 'i', formants: [300, 2300, 3000] },
  { id: 'u', label: 'う', x: 0.88, y: 0.12, file: 'u', formants: [340, 1300, 2400] },
  { id: 'e', label: 'え', x: 0.22, y: 0.55, file: 'e', formants: [500, 1900, 2600] },
  { id: 'o', label: 'お', x: 0.82, y: 0.62, file: 'o', formants: [500,  850, 2600] },
];
const DV_CLOSED_SOUND = { id: 'n', label: 'ん', file: 'n', formants: [250, 1000, 2300] };

/* -----------------------------------------------------
   鳴き始めの勢い（任意）
     恐竜の attack に id を書くと、声の出だしにこの音を重ねる（喉の長さに合わせて低くなる）。
     ファイルがなければ何も鳴らさない（仮の合成音はなし）。

   ★拡張予定: 出だしの音を増やす場合
     1. 下に { id, file } を1行追加し、sounds/ に attack_<file>.wav を置く
     2. 恐竜の attack にその id を書く
   ----------------------------------------------------- */
const DV_ATTACKS = [
  { id: 'gu', file: 'gu' },
  { id: 'ga', file: 'ga' },
  { id: 'bo', file: 'bo' },
  { id: 'bu', file: 'bu' },
];

/* -----------------------------------------------------
   恐竜の一覧
     voice … その恐竜のお手本の声。すべて 0〜1
       throat … 喉の長さ（0=短い・高い声 / 1=長い・低い声）
       close  … 口のとじ具合（0=開いている / 1=閉じた「ん」の声）
       breath … 息の量（0=はっきりした声 / 1=ささやき声）
     sounds … 出題に使う口の形（DV_SOUNDS の id）。この中からランダムに1つ選ばれる
     attack … 鳴き始めの勢い（DV_ATTACKS の id。なしなら null）
     color  … 答え合わせ後の体の色
     eye    … 目の中心の位置（シルエットの座標 400×280 の中）
     shape  … シルエットの形（SVGの図形。右向き・地面 y=270）
     hint   … 答え合わせ後に出す一言

   ★拡張予定: 恐竜を増やす場合
     1. 下の配列に { ... } を1件コピーして追加（id は英小文字で重複しないように）
     2. voice の3つの値を、他の恐竜と近すぎないように決める（近いと聞き分けられない）
     3. shape に右向きのシルエットの図形を書く（viewBox 0 0 400 280、地面 y=270）
     4. eye に頭の中の目の位置を書く
     5. 紹介セリフを付ける場合は DV_LINES.intro に id を追加
   ----------------------------------------------------- */
const DV_DINOS = [
  {
    id: 'velociraptor', name: 'ヴェロキラプトル',
    voice: { throat: 0.08, close: 0.10, breath: 0.60 },
    sounds: ['i', 'e', 'a'], attack: 'ga',
    color: '#3fa7d6', eye: [302, 106],
    hint: '小さくて鳥に近い恐竜。シャーッと息の多い高い声だったかも。',
    shape: `
      <path d="M150 140 Q85 130 12 118 Q16 128 30 132 Q90 152 150 172 Z"/>
      <ellipse cx="190" cy="152" rx="56" ry="28" transform="rotate(-12 190 152)"/>
      <path d="M226 142 Q246 112 266 100 L302 98 Q324 102 336 110 Q324 117 304 117 L284 120 Q262 138 244 162 Z"/>
      <path d="M222 156 Q246 172 262 182 L254 186 L246 190 L236 186 Q222 176 212 162 Z"/>
      <path d="M152 140 Q214 150 206 190 L214 236 L228 258 L246 262 L244 270 L200 270 L190 244 Q170 214 156 176 Z"/>
      <path d="M206 266 Q192 256 198 244 Q204 254 214 262 Z"/>`,
  },
  {
    id: 'lambeosaurus', name: 'ランベオサウルス',
    voice: { throat: 0.40, close: 0.25, breath: 0.20 },
    sounds: ['o', 'u', 'a'], attack: 'bo',
    color: '#9b6ad6', eye: [338, 83],
    hint: '斧のようなトサカの中が空洞。パラサウロロフスより短い管で鳴らしていたかも。',
    shape: `
      <path d="M110 140 Q60 152 12 188 Q60 182 118 196 Z"/>
      <ellipse cx="190" cy="165" rx="95" ry="52"/>
      <path d="M250 132 Q285 110 296 80 L322 86 Q318 125 278 178 Z"/>
      <path d="M292 70 Q318 58 344 70 Q364 79 374 92 Q360 101 340 99 Q314 101 298 96 Z"/>
      <path d="M300 74 Q296 40 318 26 Q340 20 344 36 Q344 56 324 70 Z"/>
      <path d="M302 72 L270 60 L276 70 L300 84 Z"/>
      <path d="M140 160 Q205 172 196 215 L186 258 L206 262 L206 270 L160 270 L166 215 Q128 196 140 160 Z"/>
      <path d="M250 182 L264 186 L276 260 L292 268 L264 270 L252 215 Z"/>`,
  },
  {
    id: 'parasaurolophus', name: 'パラサウロロフス',
    voice: { throat: 0.58, close: 0.35, breath: 0.05 },
    sounds: ['o', 'u', 'a'], attack: 'bu',
    color: '#e8833a', eye: [330, 80],
    hint: '長いトサカの中の管をラッパのように響かせていたと考えられている恐竜。',
    shape: `
      <path d="M110 140 Q60 152 12 188 Q60 182 118 196 Z"/>
      <ellipse cx="190" cy="165" rx="95" ry="52"/>
      <path d="M250 132 Q285 110 296 80 L322 86 Q318 125 278 178 Z"/>
      <path d="M292 70 Q318 58 344 70 Q364 79 374 92 Q360 101 340 99 Q314 101 298 96 Z"/>
      <path d="M302 74 Q268 56 226 38 Q216 35 214 43 Q218 50 228 53 Q266 66 298 88 Z"/>
      <path d="M140 160 Q205 172 196 215 L186 258 L206 262 L206 270 L160 270 L166 215 Q128 196 140 160 Z"/>
      <path d="M250 182 L264 186 L276 260 L292 268 L264 270 L252 215 Z"/>`,
  },
  {
    id: 'ankylosaurus', name: 'アンキロサウルス',
    voice: { throat: 0.62, close: 0.70, breath: 0.55 },
    sounds: ['u', 'o', 'e'], attack: 'gu',
    color: '#d4a72c', eye: [326, 160],
    hint: '鼻の中がぐねぐねの通り道。鼻にかかったこもった声だったかも。',
    shape: `
      <path d="M90 168 Q55 166 34 160 L32 176 Q58 182 92 190 Z"/>
      <ellipse cx="24" cy="168" rx="22" ry="16"/>
      <path d="M80 188 Q92 118 190 110 Q286 114 304 176 L304 192 L80 194 Z"/>
      <path d="M298 150 Q326 142 344 158 Q348 178 326 184 L298 186 Z"/>
      <path d="M312 152 L322 132 L328 154 Z"/>
      <path d="M84 186 L70 202 L96 192 Z M120 192 L110 210 L134 194 Z M160 194 L154 214 L176 195 Z M206 194 L204 214 L222 194 Z M252 193 L254 212 L268 192 Z M290 190 L298 206 L304 188 Z"/>
      <circle cx="110" cy="138" r="9"/><circle cx="145" cy="120" r="10"/><circle cx="190" cy="112" r="10"/><circle cx="235" cy="118" r="10"/><circle cx="272" cy="135" r="9"/>
      <path d="M108 188 L140 188 L138 270 L112 270 Z"/>
      <path d="M240 186 L270 186 L268 270 L242 270 Z"/>`,
  },
  {
    id: 'tyrannosaurus', name: 'ティラノサウルス',
    voice: { throat: 0.82, close: 0.85, breath: 0.25 },
    sounds: ['o', 'a', 'u'], attack: 'gu',
    color: '#c94a3f', eye: [332, 100],
    hint: '口を閉じたまま喉を響かせる「ゴゴゴ…」という低い声だった説が有力。',
    shape: `
      <path d="M125 118 Q65 116 8 136 Q65 150 130 168 Z"/>
      <ellipse cx="190" cy="142" rx="88" ry="46" transform="rotate(-6 190 142)"/>
      <path d="M248 118 Q262 92 296 84 L360 86 Q380 90 384 104 L382 118 Q366 122 350 120 L352 130 Q334 138 306 134 Q286 150 268 166 Z"/>
      <path d="M252 142 L270 168 L282 164 L266 136 Z"/>
      <path d="M138 140 Q222 146 204 200 L194 252 L222 260 L224 270 L168 270 L174 204 Q124 188 138 140 Z"/>
      <path d="M160 150 L200 162 L184 240 L198 262 L196 270 L152 270 L164 236 Z"/>`,
  },
  {
    id: 'brachiosaurus', name: 'ブラキオサウルス',
    voice: { throat: 1.00, close: 0.45, breath: 0.10 },
    sounds: ['o', 'a', 'u'], attack: 'bo',
    color: '#b5e61d', eye: [310, 27],
    hint: '首が長い＝声の通り道がとても長い。人に聞こえないほど低い声だったかも。',
    shape: `
      <path d="M100 168 Q55 190 8 236 Q62 208 112 202 Z"/>
      <ellipse cx="170" cy="175" rx="88" ry="50" transform="rotate(-10 170 175)"/>
      <path d="M212 148 Q250 96 282 34 L304 40 Q278 112 252 186 Z"/>
      <path d="M280 32 Q284 14 302 14 Q318 16 336 30 Q334 42 316 43 L298 46 Z"/>
      <path d="M224 168 L250 168 L250 270 L222 270 Z"/>
      <path d="M204 178 L222 178 L223 266 L205 266 Z"/>
      <path d="M106 186 L134 186 L134 270 L106 270 Z"/>
      <path d="M134 192 L152 192 L152 266 L134 266 Z"/>`,
  },
];

/* -----------------------------------------------------
   ずんだもんのセリフ
     text … 吹き出しに出す文字
     file … minigame/dinovoice/sounds/lines/ に置く音声ファイル名（なければ文字だけ出る）
     同じ場面に複数あるときは、その中からランダムに1つ使う

   ★拡張予定: セリフを増やす場合
     1. 場面の配列に { text: '...', file: '....mp3' } を1行追加
     2. VOICEVOX（ずんだもん）で同じ文を読み上げた音声を lines/ に置く
     恐竜ごとの紹介（intro）は、恐竜の id をキーにして追加する
   ----------------------------------------------------- */
const DV_LINES = {
  start:    [ { text: '仲間の恐竜が鳴いてるのだ！ 同じ声で返事をしてあげるのだ！', file: 'start_01.mp3' } ],
  retry:    [ { text: 'うーん、ちょっと違うみたいなのだ…もう一回なのだ！', file: 'retry_01.mp3' },
              { text: 'おしいのだ！ よーく聴き比べるのだ！', file: 'retry_02.mp3' } ],
  success:  [ { text: 'やったのだ！ ちゃんと通じたのだ！', file: 'success_01.mp3' } ],
  gameover: [ { text: '通じなかったのだ…しょんぼりなのだ…', file: 'gameover_01.mp3' } ],
  intro: {
    velociraptor:    [ { text: 'ヴェロキラプトルだったのだ！', file: 'intro_velociraptor.mp3' } ],
    lambeosaurus:    [ { text: 'ランベオサウルスだったのだ！', file: 'intro_lambeosaurus.mp3' } ],
    parasaurolophus: [ { text: 'パラサウロロフスだったのだ！', file: 'intro_parasaurolophus.mp3' } ],
    ankylosaurus:    [ { text: 'アンキロサウルスだったのだ！', file: 'intro_ankylosaurus.mp3' } ],
    tyrannosaurus:   [ { text: 'ティラノサウルスだったのだ！', file: 'intro_tyrannosaurus.mp3' } ],
    brachiosaurus:   [ { text: 'ブラキオサウルスだったのだ！', file: 'intro_brachiosaurus.mp3' } ],
  },
};
