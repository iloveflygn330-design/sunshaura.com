/* =====================================================
   きょうりゅうラン（dinorun）の調整値・ランキングの接続先・音
   minigame/index.html で dinorun.js より先に読み込む。

   きょうりゅうランのファイル一覧（すべて minigame/assets/）:
     dinorun-config.js  … このファイル。スピード・重力・ショップの間隔・スコアの計算・ランキングの接続先・音
     dinorun-items.js   … ★拡張予定: ショップのアイテムとスキル（1件足せばショップに並ぶ）
     dinorun-worlds.js  … ★拡張予定: ワールド（背景・地面）と障害物・コイン・ショップアイコンの見た目
     dinorun-sprites.js … ★拡張予定: 自機（恐竜）の絵。いまは仮のドット絵。PNG に差し替えられる
     dinorun-ranking.js … ランキングの読み書き（Google Apps Script とのやりとり）
     dinorun.js         … ゲームの動き（ふつうは触らなくてよい）
     dinorun.css        … ボタン・ショップ・名前入力などの見た目
   ランキングのサーバー側（Google Apps Script）のコードと設定手順: tools/dinorun-ranking/

   単位について:
     ゲーム画面の中は「384 × 216 ドット」の小さな画面として計算し、それを拡大して表示している。
     長さ・速さの px は、この 384 × 216 の中のドット数。1m = 10px として距離を数える。
   ===================================================== */

const DR_CONFIG = {
  /* --- ゲーム画面の大きさ（ドット）。変えると絵の位置もずれるので、ふつうは触らない --- */
  width: 384,
  height: 216,
  groundY: 184,            // 地面の高さ（上から何ドット目が地面の表面か）
  playerX: 44,             // 自機の左端の位置

  /* --- スピード（px/秒） --- */
  speedStart: 140,         // 走り始めの速さ
  speedMax: 440,           // いちばん速いとき
  speedAccel: 0.5,         // 1秒ごとに速くなる量（0.5 なら 10分で最高速）
  pxPerMeter: 10,          // 距離の計算（10px = 1m）

  /* --- ジャンプ・スライディング --- */
  gravity: 1500,           // 重力（大きいほど早く落ちる）
  jumpVelocity: 460,       // ジャンプの強さ
  slideTime: 0.55,         // スライディングの長さ（秒）。ジャンプで途中でやめられる
  slideLock: false,        // true … すべり終わるまで次のスライディングを出せない（もとの動き）
                           // false … すべっている途中でも押せる（押すと、そこからまた slideTime 秒すべる）
  slideBuffer: 0.15,       // 空中で押したとき、この秒数以内に着地したら着地と同時にすべる
  // バタ足ジャンプ（パッシブ。浮いていられる秒数は dinorun-items.js の flutter アイテムで決める）
  //   ジャンプボタンを押しっぱなしにすると、ジャンプのいちばん高いところでバタ足して、その高さのまま浮く
  //   空中でジャンプ回数を使い切ってから押しなおしても、その高さで浮く（ボタンを離すか、時間が切れると落ちる）
  //   1回の空中で使えるのは、合わせて flutter の秒数まで（着地すると元に戻る）

  /* --- 落下穴（障害物の pit。dinorun-worlds.js） ---
       穴の上を走ると落ちる。落ちかけたときはジャンプ回数を使っていない扱いなので、すぐジャンプすれば出られる。
       穴の底（pitDepth ドット）まで落ちるか、穴の向こう側の壁にぶつかるとダメージ（そのあと、ぴょんと穴から出る）。
       無敵の間は穴に落ちない。 */
  pitDepth: 26,            // この深さまで落ちたらダメージ（ドット）
  pitStepUp: 6,            // 向こう側の壁に着いたとき、この深さまでなら（ほとんど落ちていないので）ダメージなしで上がれる
  pitBounce: 520,          // ダメージのあと、穴から飛び出す強さ
  pitTimeMin: 0.2, pitTimeMax: 0.3,    // 穴の幅（そのときの速さで何秒ぶんか。速くなるほど広い穴になる）
  pitWidthMin: 36, pitWidthMax: 130,   // 穴の幅の下限・上限（ドット）

  /* --- 急降下コンボ（急降下のすぐあと＝足元が光っている間に技を出すと強くなる） ---
       居合切り   … 前へ「ぎゅんっ」と出ながら切る（ダッシュ切り。天井から下がっているものも切れる）
       スピン     … 回転しながら本当に前へ spinRushMeters m 進む（画面が一気に流れる。距離にも入る）
       スライディング … 勢いで本当に前へ slideRushMeters m 進む。そのぶん、すべる時間ものびる
       火の玉     … 青い火の玉になる（dinorun-items.js の DR_SKILLS.fire） */
  diveComboTime: 0.8,      // 急降下を使ってから、コンボにできる時間（秒）
  dashDistance: 56,        // ダッシュ切りで前に出る距離（ドット）
  dashTime: 0.16,          // 前に出るのにかかる時間（秒）
  dashReturnSpeed: 36,     // 元の位置に戻る速さ（ドット/秒）
  spinRushMeters: 15,      // スピンで前へ進む距離（m）
  spinRushTime: 0.3,       // それにかける時間（秒）。スピンの長さ（最初 0.8 秒）より短くすること（進んだ先でぶつからないように）
  slideRushMeters: 8,      // スライディングで前へ進む距離（m）
  slideRushTime: 0.3,      // それにかける時間（秒）。すべる時間もこのぶんのびる
  // ※ ランキングのサーバー（tools/dinorun-ranking/Code.gs）の MAX_METERS_PER_SEC は、この「前へ進む」ぶんの余裕を入れてある。
  //    進む距離を大きく増やしたら、Code.gs のほうも増やす

  /* --- 障害物の出方 ---
       次の障害物までの間隔は「秒」で決めている（速くなっても飛べる間隔を保つため）。
       最初は Start の範囲、最高速に近づくほど End の範囲に近づく。 */
  gapStartMin: 1.0,  gapStartMax: 1.9,
  gapEndMin:   0.62, gapEndMax:   1.05,
  clusterChanceMax: 0.35,  // 障害物が2〜3個つながって出る確率（最高速のとき）
  flyingFromMeter: 250,    // 空を飛ぶ障害物が出始める距離（m）

  /* --- スキルを使わないと通れない区画（ワールド hardFromWorld から、ときどき出る） ---
       シャッターが下りているところに、壊せるかべがある（ジャンプもスライディングもできない）。
       居合切り・スピンアタック・火の玉のどれかで壊して通る。
       そのどれかをスキルボタンに入れていて、着くまでにクールタイムが終わるときだけ出る（持っていなければ出ない）。
       見た目は dinorun-worlds.js の gate_roof / gate_wall */
  hardFromWorld: 5,        // 何ワールド目から出すか
  hardGapMin: 220, hardGapMax: 420,    // 次の区画までの間隔（m）
  gateHintCount: 3,        // 1回のプレイで、最初の何回まで「スキルをつかって！」の札を出すか

  /* --- コイン --- */
  coinGapMin: 1.1, coinGapMax: 2.4,   // コインの列が出る間隔（秒）
  coinRowMin: 3,   coinRowMax: 6,     // 1列のコインの数
  // ※ 山なりのコインは、ジャンプしたときに通る道すじに並べている（速くなるほど横に広がる）
  slashCoinDrop: 3,                   // 居合切りで切った障害物から出るコインの数（前のほうへ飛んで、走っていると拾える）

  /* --- ライフ・無敵 --- */
  startLives: 2,           // 最初のライフ（＝最初の最大ライフ。ライフ+1 で最大ライフも増える）
  invincibleTime: 3.0,     // ぶつかったあとの無敵時間（秒）。アイテムで延びる
  invincibleWarnTime: 1.0, // 無敵が切れる何秒前から、点滅を速くして知らせるか

  /* --- ショップ（距離ごとに、地面にショップが流れてくる。そのまま触ると入る／ジャンプで飛び越すとスキップ） --- */
  shopFirstMeter: 250,     // 最初のショップが出る距離（m）
  shopInterval: 500,       // 2回目以降の間隔（m）
  shopIntervalGrow: 1.12,  // 1回ごとに間隔を何倍にのばすか（後半はショップが少しずつ遠くなる）
  shopOffers: 3,           // ショップに並ぶアイテムの数
  firstShopDiscount: 0.5,  // 最初のショップだけ、値段にこの倍率をかける（0.5 = 半額。1 にすると割引なし）
                           // チュートリアルで約30コイン集まるので、何か買えるようにしている。ショップに「初回だけ割引！」と出る
  skipBonusBase: 10,       // ショップに寄らなかったときにもらえるコイン
  skipBonusPerShop: 0,     // ショップが出るたびに、スキップボーナスが増える量（0 = いつも同じ）
  shopClearBefore: 1.2,    // ショップの手前、障害物を出さない長さ（秒。そのときの速さで走る距離に直して使う）
  shopClearAfter: 2.0,     // ショップのうしろ、障害物を出さない長さ（秒）。ショップから戻ってすぐぶつからないように

  /* --- ワールド移動（距離ごとに背景と地面が次のワールドに切り替わる。中身は dinorun-worlds.js） --- */
  worldLength: 1000,       // 1つのワールドの長さ（m）
  worldCalmTime: 1.6,      // ワールド移動の演出中、障害物を出さない時間（秒）

  /* --- ボーナスステージ（ショップのボーナスチケットを買うと、次のワールドの前に入る。見た目は dinorun-worlds.js の DR_BONUS_WORLD） ---
       障害物なし・コインたくさん。下り坂をすべっていく（ずっとスライディングの姿勢）。
       地面のコインはすべっているだけで取れる。地面の光る矢印のところでジャンプすると、空中のコインの山をまるごと取れる。
       ボーナスステージはワールドの数に入らない（終わると、本来の次のワールドに進む） */
  bonusLength: 400,        // ボーナスステージの長さ（m）
  bonusSpeedMult: 1.25,    // 流れる速さの倍率（下り坂なので速い。speedMax は超えない）
  bonusTilt: 7,            // 画面の傾き（度）
  bonusRaise: 36,          // 地面を画面の上のほうへ持ち上げる量（ドット。下り坂で地面が下がって見えにくくならないように）
  bonusTrailMin: 4, bonusTrailMax: 7,  // 地面に並ぶコインの数
  bonusArcCoins: 9,        // ジャンプで取る空中のコインの数（ふつうのジャンプ1回ぶん。長い道すじはそのぶん増える）
  // 空中ジャンプ（ジャンプ回数+1）・バタ足ジャンプを持っていると、ときどき、それを使わないと取れない道すじになる
  //   空中ジャンプ … 目印に「X2」。落ちてきて足の高さが bonusDoubleAt ドットになったところで、もう一度ジャンプする道すじ
  //   バタ足       … 目印に「HOLD」。ジャンプボタンを押しっぱなしにして、てっぺんで浮く道すじ
  bonusSpecialChance: 0.5, // 持っているときに、その道すじになる確率
  bonusDoubleAt: 36,       // 空中ジャンプの道すじで、2回目のジャンプをする高さ（てっぺんで跳ぶと画面の上に出てしまうので、落ちてきたところ）
  bonusHoverMax: 0.7,      // バタ足の道すじで浮いている長さの上限（秒。バタ足の秒数のほうが短ければそちら）

  /* --- スコア = 距離(m) + 拾ったコインの数 × scoreCoin + 倒した障害物の数 × scoreKill
                + かすりの回数 × scoreGraze + スライディングでくぐった回数 × scoreSlide
       いまは、かすり・スライディングはスコアではなくコインがもらえる（scoreGraze・scoreSlide は 0）。
       0 より大きくすると、またスコアにも入る（結果画面にも行が出る）
       ※ 変えたら、サーバー側（tools/dinorun-ranking/Code.gs）の SCORE_COIN / SCORE_KILL / SCORE_GRAZE / SCORE_SLIDE も同じ値にする --- */
  scoreCoin: 10,
  scoreKill: 25,
  scoreGraze: 0,
  scoreSlide: 0,

  /* --- スライディングボーナス（立っていたらぶつかる障害物を、スライディングでくぐり抜けるともらえる）---
       ※ かすりボーナスとは重ならない（くぐった障害物は、かすりにしない） */
  slideCoin: 5,            // スライディングボーナスでもらえるコイン（コイン倍率はかからない。スコアのコイン数にも入らない）

  /* --- かすりボーナス（障害物にぶつからず、ぎりぎりでよけるともらえる） ---
       自機と障害物の当たり判定のすき間が grazeDistance ドット以内ですれ違ったら「かすり」。
       スピンアタック中にすれ違った障害物・壊した障害物・ぶつかった障害物は数えない。
       2〜3個つながって出た障害物は、まとめて1回だけ数える。 */
  grazeDistance: 6,
  grazeCoin: 5,            // かすりでもらえるコイン（コイン倍率はかからない。スコアのコイン数にも入らない）

  /* --- ランキング ---
       rankingUrl: Google Apps Script を「ウェブアプリ」として公開したときの URL（…/exec で終わるもの）
         空のままだと、このブラウザの中だけの仮ランキングになる（テスト用）。
         設定のしかたは tools/dinorun-ranking/README.md
       ※ この URL は公開されても大丈夫（書き込みのチェックはサーバー側でしている）。
         Discord の Webhook URL は秘密なので、ここではなく Apps Script のスクリプト プロパティに入れる。 */
  rankingUrl: '',
  rankingSize: 10,         // 何位まで表示するか（サーバー側の RANK_SIZE と合わせる）
  nameLetters: 3,          // 名前の文字数
  nameChars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',  // 名前に使える文字（サーバー側の NAME_PATTERN と合わせる）

  /* --- チュートリアル（走り始めの DR_TUTORIAL.endMeter m。中身は dinorun-worlds.js の DR_TUTORIAL） --- */
  tutorial: true,          // false にすると、チュートリアルなしで最初からふつうに障害物が出る

  /* --- そのほか --- */
  readyCountSec: 3,        // ゲーム開始のときのカウントダウン（秒）
  resumeCountSec: 1.2,     // 一時停止から戻るときのカウントダウン（秒。3・2・1・GO! をこの時間で出す）
  titleRankingSec: 6,      // タイトル画面で、ランキングと「PRESS START」を切り替える間隔（秒）
};

/* -----------------------------------------------------
   ★拡張予定: 音
     いまは、音のファイルがない音は「仮の電子音（tone）」で鳴らしている。
     画面の 🔊 ボタンで、音のオン・オフができる（このブラウザに覚えておく）。

   本物の音に差し替えるには:
     1. 音のファイルを minigame/dinorun/sounds/ に置く（.mp3 か .ogg か .wav。フォルダがなければ作る）
     2. 下の該当する行の src に、minigame/ から見た場所を書く
          例: jump: { src: 'dinorun/sounds/jump.mp3', volume: 0.6, tone: ... },
        src を書いた音は、tone ではなくファイルが鳴る（tone は消さずに残しておいてよい）
     3. src も tone もない音は鳴らさない

   仮の電子音（tone）の書き方:
     tone: { wave: 'square', freq: 660, to: 990, dur: 0.08 }
       wave … 音色。'square'（ピコピコ）/ 'triangle'（やわらかい）/ 'sawtooth'（ジャリッ）/ 'sine'（ポー）
       freq … 高さ（Hz。440 がラの音。大きいほど高い）
       to   … （任意）音の終わりの高さ。書くと、そこまで音が滑る
       dur  … 長さ（秒）
     いくつかの音を順番に鳴らすとき:
     tone: { wave: 'square', notes: [[523, 0.06], [784, 0.1]] }   … [高さ, 長さ, 終わりの高さ（任意）] を並べる

   音の id とタイミング（dinorun.js が drSound('id') で呼ぶ）:
     jump … ジャンプ / slide … スライディング / coin … コインを拾った / graze … かすりボーナス
     slidebonus … スライディングボーナス / flutter … バタ足 / fall … 穴に落ちた / hit … ぶつかった / slash … 居合切り / spin … スピンアタック
     dive … 急降下 / dash … ダッシュ・前へ進む / vacuum … コイン吸引 / kill … 障害物を壊した
     fire … 赤い火の玉 / bluefire … 青い火の玉
     shop … ショップに入った / buy … アイテムを買った / reroll … 品ぞろえの入れ替え / skip … ショップをスキップした
     world … ワールド移動 / bonus … ボーナスステージに入った / gameover … ゲームオーバー / select … ボタン / start … ゲーム開始

   BGM（ワールドごとに変えたいとき）:
     dinorun-worlds.js の各ワールドの bgm に、下の id を書く（例: bgm: 'bgm_home'）。
     ここに bgm_home: { src: 'dinorun/sounds/bgm_home.mp3', volume: 0.4, loop: true }, のように1行足す。
     loop: true を付けた音はくり返し流れ、ワールドが変わると切り替わる（BGM は電子音なし）。
   ----------------------------------------------------- */
const DR_SOUNDS = {
  jump:       { src: '', volume: 0.5, tone: { wave: 'square', freq: 330, to: 660, dur: 0.09 } },
  slide:      { src: '', volume: 0.4, tone: { wave: 'sawtooth', freq: 260, to: 120, dur: 0.14 } },
  coin:       { src: '', volume: 0.4, tone: { wave: 'square', notes: [[988, 0.04], [1319, 0.08]] } },
  graze:      { src: '', volume: 0.5, tone: { wave: 'triangle', notes: [[1047, 0.05], [1568, 0.09]] } },
  slidebonus: { src: '', volume: 0.5, tone: { wave: 'triangle', notes: [[784, 0.05], [1175, 0.09]] } },
  flutter:    { src: '', volume: 0.4, tone: { wave: 'triangle', notes: [[880, 0.04], [988, 0.04], [880, 0.04], [988, 0.06]] } },
  fall:       { src: '', volume: 0.5, tone: { wave: 'triangle', freq: 600, to: 120, dur: 0.3 } },
  hit:        { src: '', volume: 0.7, tone: { wave: 'sawtooth', freq: 220, to: 60, dur: 0.25 } },
  slash:      { src: '', volume: 0.5, tone: { wave: 'sawtooth', freq: 1800, to: 300, dur: 0.12 } },
  spin:       { src: '', volume: 0.5, tone: { wave: 'triangle', freq: 300, to: 900, dur: 0.2 } },
  dive:       { src: '', volume: 0.5, tone: { wave: 'square', freq: 900, to: 150, dur: 0.12 } },
  dash:       { src: '', volume: 0.6, tone: { wave: 'sawtooth', freq: 200, to: 1200, dur: 0.12 } },
  fire:       { src: '', volume: 0.5, tone: { wave: 'sawtooth', freq: 500, to: 180, dur: 0.14 } },
  bluefire:   { src: '', volume: 0.6, tone: { wave: 'square', notes: [[700, 0.05], [1400, 0.12, 300]] } },
  vacuum:     { src: '', volume: 0.5, tone: { wave: 'sine', freq: 300, to: 1500, dur: 0.3 } },
  kill:       { src: '', volume: 0.5, tone: { wave: 'square', freq: 600, to: 100, dur: 0.1 } },
  shop:       { src: '', volume: 0.5, tone: { wave: 'square', notes: [[523, 0.07], [659, 0.07], [784, 0.12]] } },
  buy:        { src: '', volume: 0.5, tone: { wave: 'square', notes: [[784, 0.06], [1047, 0.1]] } },
  reroll:     { src: '', volume: 0.5, tone: { wave: 'triangle', notes: [[440, 0.05], [554, 0.05], [659, 0.08]] } },
  skip:       { src: '', volume: 0.5, tone: { wave: 'square', notes: [[659, 0.06], [523, 0.1]] } },
  world:      { src: '', volume: 0.5, tone: { wave: 'triangle', notes: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.2]] } },
  bonus:      { src: '', volume: 0.5, tone: { wave: 'square', notes: [[784, 0.08], [988, 0.08], [1175, 0.08], [1568, 0.25]] } },
  gameover:   { src: '', volume: 0.6, tone: { wave: 'square', notes: [[392, 0.15], [330, 0.15], [262, 0.35]] } },
  select:     { src: '', volume: 0.3, tone: { wave: 'square', freq: 880, dur: 0.04 } },
  start:      { src: '', volume: 0.5, tone: { wave: 'square', notes: [[523, 0.08], [784, 0.08], [1047, 0.14]] } },
};
