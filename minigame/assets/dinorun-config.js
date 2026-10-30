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

  /* --- ジャンプ・しゃがみ --- */
  gravity: 1500,           // 重力（大きいほど早く落ちる）
  jumpVelocity: 460,       // ジャンプの強さ（ジャンプ高さUPで倍率がかかる）
  fastFallRate: 3,         // 空中でしゃがむと、重力が何倍になるか（急降下）

  /* --- 障害物の出方 ---
       次の障害物までの間隔は「秒」で決めている（速くなっても飛べる間隔を保つため）。
       最初は Start の範囲、最高速に近づくほど End の範囲に近づく。 */
  gapStartMin: 1.0,  gapStartMax: 1.9,
  gapEndMin:   0.62, gapEndMax:   1.05,
  clusterChanceMax: 0.35,  // 障害物が2〜3個つながって出る確率（最高速のとき）
  flyingFromMeter: 250,    // 空を飛ぶ障害物が出始める距離（m）

  /* --- コイン --- */
  coinGapMin: 1.1, coinGapMax: 2.4,   // コインの列が出る間隔（秒）
  coinRowMin: 3,   coinRowMax: 6,     // 1列のコインの数

  /* --- ライフ・無敵 --- */
  startLives: 1,           // 最初のライフ
  invincibleTime: 3.0,     // ぶつかったあとの無敵時間（秒）。アイテムで延びる
  invincibleWarnTime: 1.0, // 無敵が切れる何秒前から、点滅を速くして知らせるか

  /* --- ショップ（距離ごとに、地面にショップが流れてくる。そのまま触ると入る／ジャンプで飛び越すとスキップ） --- */
  shopFirstMeter: 250,     // 最初のショップが出る距離（m）
  shopInterval: 500,       // 2回目以降の間隔（m）
  shopIntervalGrow: 1.12,  // 1回ごとに間隔を何倍にのばすか（後半はショップが少しずつ遠くなる）
  shopOffers: 3,           // ショップに並ぶアイテムの数
  skipBonusBase: 5,        // ショップに寄らなかったときにもらえるコイン
  skipBonusPerShop: 2,     // ショップが出るたびに、スキップボーナスが増える量
  shopClearBefore: 1.2,    // ショップの手前、障害物を出さない長さ（秒。そのときの速さで走る距離に直して使う）
  shopClearAfter: 2.0,     // ショップのうしろ、障害物を出さない長さ（秒）。ショップから戻ってすぐぶつからないように

  /* --- ワールド移動（距離ごとに背景と地面が次のワールドに切り替わる。中身は dinorun-worlds.js） --- */
  worldLength: 1000,       // 1つのワールドの長さ（m）
  worldCalmTime: 1.6,      // ワールド移動の演出中、障害物を出さない時間（秒）

  /* --- スコア = 距離(m) + 拾ったコインの数 × scoreCoin + 倒した障害物の数 × scoreKill + かすりの回数 × scoreGraze
       ※ 変えたら、サーバー側（tools/dinorun-ranking/Code.gs）の SCORE_COIN / SCORE_KILL / SCORE_GRAZE も同じ値にする --- */
  scoreCoin: 10,
  scoreKill: 25,
  scoreGraze: 15,

  /* --- かすりボーナス（障害物にぶつからず、ぎりぎりでよけるともらえる） ---
       自機と障害物の当たり判定のすき間が grazeDistance ドット以内ですれ違ったら「かすり」。
       スピンアタック中にすれ違った障害物・壊した障害物・ぶつかった障害物は数えない。
       2〜3個つながって出た障害物は、まとめて1回だけ数える。 */
  grazeDistance: 6,
  grazeCoin: 1,            // かすりでもらえるコイン（コイン倍率はかからない。スコアのコイン数にも入らない）

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

  /* --- そのほか --- */
  readyCountSec: 3,        // ゲーム開始のときのカウントダウン（秒）
  resumeCountSec: 1.2,     // 一時停止から戻るときのカウントダウン（秒。3・2・1・GO! をこの時間で出す）
  titleRankingSec: 6,      // タイトル画面で、ランキングと「PRESS START」を切り替える間隔（秒）
};

/* -----------------------------------------------------
   ★拡張予定: 音（いまは鳴らさない。ファイルを置いて src を書けば鳴るようになる）

   使い方:
     1. 音のファイルを minigame/dinorun/sounds/ に置く（.mp3 か .ogg か .wav。フォルダがなければ作る）
     2. 下の該当する行の src に、minigame/ から見た場所を書く
          例: jump: { src: 'dinorun/sounds/jump.mp3', volume: 0.6 },
     3. src が空（''）の音は鳴らさない（エラーにもならない）

   音の id とタイミング（dinorun.js が drSound('id') で呼ぶ）:
     jump … ジャンプ / coin … コインを拾った / graze … かすりボーナス / hit … ぶつかった / slash … 居合切り / spin … スピンアタック
     kill … 障害物を壊した / shop … ショップに入った / buy … アイテムを買った / skip … ショップをスキップした
     world … ワールド移動 / gameover … ゲームオーバー / select … 名前入力などのボタン / start … ゲーム開始

   BGM（ワールドごとに変えたいとき）:
     dinorun-worlds.js の各ワールドの bgm に、下の id を書く（例: bgm: 'bgm_home'）。
     ここに bgm_home: { src: 'dinorun/sounds/bgm_home.mp3', volume: 0.4, loop: true }, のように1行足す。
     loop: true を付けた音はくり返し流れ、ワールドが変わると切り替わる。
   ----------------------------------------------------- */
const DR_SOUNDS = {
  jump:     { src: '', volume: 0.6 },
  coin:     { src: '', volume: 0.5 },
  graze:    { src: '', volume: 0.6 },
  hit:      { src: '', volume: 0.8 },
  slash:    { src: '', volume: 0.7 },
  spin:     { src: '', volume: 0.7 },
  kill:     { src: '', volume: 0.6 },
  shop:     { src: '', volume: 0.7 },
  buy:      { src: '', volume: 0.7 },
  skip:     { src: '', volume: 0.6 },
  world:    { src: '', volume: 0.7 },
  gameover: { src: '', volume: 0.8 },
  select:   { src: '', volume: 0.5 },
  start:    { src: '', volume: 0.7 },
};
