/* =====================================================
   きょうりゅうラン（dinorun）の RPG フェイズの数値・ボス・入り口の敵
   minigame/index.html で dinorun.js のあと、dinorun-rpg.js より先に読み込む。

   RPG フェイズとは:
     5ワールド目から、ときどき地面に「入り口の敵」が出てくる。触れると RPG のバトルに切りかわる（ジャンプでよければ戦わない）。
     バトルはリアルタイム。技ごとのクールタイム（CT）が終わればいつでも押せる。
       ジャンプボタン     … ふみつけ（基本の攻撃。ジャンプ回数のぶん踏む）
       スライディングボタン … 防御（ボスの攻撃が当たる直前に押すと半減、ぎりぎりならパーフェクトで 0）
       小さいボタン       … 走るときに覚えたスキル（控えも含めて全部）がバトルの技になる。回復薬・にげる
     走るときに持っているもの（パッシブ）も効く:
       急降下 … ふみつけの最後の1回がスタンピングになり「溜め」になる。溜めのときに技を使うと強くなる
       磁石 … ふみつけに麻痺がつく / バタ足ジャンプ … ふみつけに小さいダメージが足される
       アイテム倍率アップ … 会心率が上がる / 被弾後無敵時間UP … 防御のタイミングがゆるくなる / ライフ+1 … HP が増える
     勝つ … スコアとコインがもらえ、ハートが全回復して、ノーマルフェイズのその場から再開
     負ける … ハートが残っていてもゲームオーバー
     逃げる … ハートが 1 になって、ノーマルフェイズに戻る

   ここにあるもの:
     DR_RPG        … 数値（恐竜君のステータス・防御の判定・CT・ごほうび・演出の長さ）
     DR_BOSSES     … ★拡張予定: ボスの一覧
     DR_ENCOUNTERS … ★拡張予定: 入り口の敵の一覧（色でどのフェイズになるか分ける）
   バトルの動きは dinorun-rpg.js。
   ===================================================== */

const DR_RPG = {
  /* --- 恐竜君のステータス（Lv = いまのワールドの番号） ---
       最大HP = hpBase + Lv × hpPerLv + 残っているハートの数 × hpPerHeart
       攻撃力 = atkBase + Lv × atkPerLv */
  playerName: 'きょうりゅう',
  hpBase: 100, hpPerLv: 20, hpPerHeart: 20,
  atkBase: 10, atkPerLv: 2,

  /* --- 防御（スライディングボタン） ---
       ボスの攻撃が当たる guardWindow 秒前から当たる瞬間までに押していれば半減、
       perfectWindow 秒前からなら「パーフェクト」でダメージ 0。早く押しすぎると CT だけ使ってしまう。
       ショップの「被弾後無敵時間UP」1段階ごとに、半減の幅が guardWindowPerInv、パーフェクトの幅が perfectWindowPerInv 広がる */
  guardWindow: 0.4,
  perfectWindow: 0.1,
  guardWindowPerInv: 0.05,
  perfectWindowPerInv: 0.01,
  guardCT: 0.8,            // 防御のクールタイム（秒）

  /* --- ふみつけ（ジャンプボタン） --- */
  jumpCT: 1.0,             // クールタイム（秒）
  stompPower: 1.0,         // 1回踏むときのダメージ = 攻撃力 × stompPower（±10% ぶれる）

  /* --- 技（小さいボタン。走るときに覚えたスキルが、バトルではこの技になる） ---
       キーは画面の並び順に 1・2・3…（スキルボタン①②③ → 控え の順）。
       スキルの動き（dinorun-items.js の DR_SKILLS の action）ごとに1つ。ここにない動きのスキル（急降下など）はボタンにならない
         name … ボタンに出る名前 / short … 画面がせまいとき（スマホ）の短い名前 / sub … ボタンの下の小さい説明 / ct … クールタイム（秒）
         power … ダメージ = 攻撃力 × power（±10% ぶれる）
         「溜め」のときに使うと強くなる（溜めは使うと消える。回復魔法は溜めを使わない）
           居合切り … chargedPower（威力特大）/ 火の玉 … 全体攻撃・威力 × chargedMult / スピン … 全体に chargedHits 回
         火の玉は、ショップの「火の玉 強化」1段階ごとに power が powerPerLv 上がる
         回復魔法 … 最大HPの heal の割合を回復
       ★拡張予定: 新しいスキルの動きを足したら、ここに同じ名前で1件足し、dinorun-rpg.js の drRpgUseSkill() に動きを書く */
  skills: {
    slash:  { name: '居合切り', short: '居合', sub: '単体・大', ct: 3.0, power: 3.0, chargedPower: 5.0 },
    fire:   { name: '火の玉', short: '火の玉', sub: '単体・中', ct: 2.5, power: 1.6, powerPerLv: 0.4, chargedMult: 1.8 },
    spin:   { name: 'スピン', short: 'スピン', sub: '全体・小', ct: 4.0, power: 1.2, chargedHits: 2 },
    vacuum: { name: '回復魔法', short: '回復', sub: 'HP30%', ct: 12.0, heal: 0.3 },
  },

  /* --- 溜め（急降下を覚えているとき、ふみつけの最後の1回がスタンピングになる） --- */
  stampPower: 1.5,         // スタンピングのダメージの倍率

  /* --- 会心の一撃（どの攻撃にもある） ---
       会心率 = critBase + ショップの「アイテム倍率アップ」の Lv × critPerLv。会心ならダメージ × critMult */
  critBase: 0.10, critPerLv: 0.05, critMult: 1.5,

  /* --- 麻痺（磁石を持っているとき、ふみつけ・バタ足のダメージ1回ごとに抽選） ---
       確率 = paraBase + (磁石の Lv - 1) × paraPerLv。会心のときは × critMult
       麻痺するとボスは paraTime 秒動けない（出しかけの技も止まる）。麻痺中にまた麻痺すると時間がのびる（最大 paraMax 秒） */
  paraBase: 0.03, paraPerLv: 0.02, paraTime: 5, paraMax: 15,

  /* --- バタ足（バタ足ジャンプを持っているとき、ふみつけ1回ごとに Lv × flutterHitsPerLv 回の小さいダメージ。麻痺の抽選もある） --- */
  flutterHitsPerLv: 2, flutterPower: 0.1,

  /* --- ★拡張予定: 負けたときのヒント（持っていないものの中から1つ出す） ---
       skill … そのスキルを覚えていなければ出す / item … そのアイテムを1回も買っていなければ出す / potion … 回復薬を持っていなければ出す */
  tips: [
    { skill: 'iai', text: 'ヒント：居合切りを覚えると、バトルで大ダメージの技が使えるよ！' },
    { skill: 'fire', text: 'ヒント：火の玉を覚えると、バトルで遠くから攻撃できるよ！ 強化すると威力アップ' },
    { skill: 'spin', text: 'ヒント：スピンアタックを覚えると、バトルで全体攻撃ができるよ！' },
    { skill: 'vacuum', text: 'ヒント：コイン吸引を覚えると、バトルでは回復魔法になるよ！' },
    { skill: 'dive', text: 'ヒント：急降下を覚えると、ふみつけの最後がスタンピングになって「溜め」が使えるよ！' },
    { item: 'magnet', text: 'ヒント：磁石を持っていると、ふみつけでボスを麻痺させられることがあるよ！' },
    { item: 'flutter', text: 'ヒント：バタ足ジャンプを持っていると、ふみつけに追加のダメージが入るよ！' },
    { item: 'jump_plus', text: 'ヒント：ジャンプ回数を増やすと、ふみつける回数も増えるよ！' },
    { item: 'coin_mult', text: 'ヒント：アイテム倍率アップで、会心の一撃が出やすくなるよ！' },
    { item: 'inv_up', text: 'ヒント：被弾後無敵時間UPで、防御のタイミングがゆるくなるよ！' },
    { potion: true, text: 'ヒント：回復薬を持っていれば、バトル中にHPを全回復できるよ！' },
  ],

  /* --- 逃げる --- */
  escapeDelay: 1.0,        // 押してから逃げられるまでの秒数（その間に攻撃を受けることがある）

  /* --- 勝ったときのごほうび ---
       スコア = ボスの score ＋ タイムボーナス（(timeBonusLimit - 倒すまでの秒数) × timeBonusPerSec。0 より小さくはならない）
       コイン = winCoinBase + ワールドの番号 × winCoinPerWorld（コイン倍率はかからない）
       ※ スコアの上限はランキングのサーバー（tools/dinorun-ranking/Code.gs の MAX_BOSS_SCORE）でも確かめている。
          ボスの score やタイムボーナスを大きくしたら、Code.gs のほうも増やす */
  timeBonusLimit: 60,
  timeBonusPerSec: 50,
  winCoinBase: 30,
  winCoinPerWorld: 5,

  /* --- 負けたときの文（ボスの残りHPの割合で分ける） --- */
  loseCloseUnder: 0.25,    // これ未満なら「惜敗」
  loseBigFrom: 0.7,        // これ以上なら「惨敗」（あいだは「敗北」）

  /* --- 演出の長さ（秒） --- */
  closeTime: 0.5,          // 黒い画面が上下から迫ってきて暗転するまで
  introTime: 1.0,          // 暗転が開けて、回りながら近づき、キャラクターがそろうまで
  fightTime: 1.0,          // 「FIGHT!」を出している時間
  winTime: 1.6,            // 勝ったあと、結果を出すまで
  loseTime: 1.4,           // 負けたあと、ゲームオーバーの画面を出すまで
  escapeRunTime: 0.6,      // 逃げるときに走り去る時間

  bgm: '',                 // バトル中の BGM（dinorun-config.js の DR_SOUNDS の id。空ならなし）
  bgImage: '',             // ★ バトルの背景の PNG（384 × 216。例: 'dinorun/rpg/bg.png'）。空なら仮の背景（クリーム色の空とオレンジの床）
};

/* -----------------------------------------------------
   ★拡張予定: ボス
     バトルが始まるとき、fromWorld ～ toWorld に当てはまるボスの中からランダムに1体選ぶ。
     ワールドが fromWorld より1つ進むごとに、HP と攻撃力が growth の割合で上がる（0.15 なら +15%）。

   1件の書き方:
     {
       id: 'dummy',               // 英数字の名前
       name: 'かりのボス',          // 画面に出る名前（ゲームオーバーの「〇〇にやられてしまった…」にも使う）
       fromWorld: 5, toWorld: 99, // 出てくるワールドの範囲（1 から数える）
       hp: 600, atk: 18,          // fromWorld のときの HP と攻撃力
       growth: 0.15,
       score: 10000,              // 倒したときのスコア（タイムボーナスは別）
       gapMin: 0.8, gapMax: 1.8,  // 技を出し終わってから、次の技を出すまでの秒数（毎回この範囲でぶれる）
       attacks: [                 // 出す技（weight が大きいほど出やすい）
         { type: 'normal', name: 'ひっかき', weight: 3, power: 1.0, bpm: 120 },
         { type: 'strong', name: 'しっぽアタック', weight: 1, power: 2.2, bpm: 100 },
       ],
         // type: 'normal'（通常攻撃）/ 'strong'（強攻撃）… どちらも3回光ってから、4拍目に当たる（防御できる）
         //        光る間隔は bpm で決まる（120 なら 0.5 秒ごと）。ダメージ = 攻撃力 × power
         //       'skill'（スキル攻撃）… 防御できない。技の名前を出して、wind 秒後に当たる
       w: 144, h: 120,            // 画面に描く大きさ（ドット。最大 192 × 160。足元がゲーム画面の床にそろう）
       image: '',                 // ★ PNG に差し替えるときの場所（例: 'dinorun/rpg/boss_dummy.png'）。大きさは w × h で描く
       sprite: { pixels: [...] }, // image が空のときの仮のドット絵（w × h に拡大して描く）
     },
   ★ 新しいボスは、下の一覧の最後（「ここに追加」の上）に1件足す。
   ----------------------------------------------------- */

/* 仮のボスのドット絵（48 × 40）を作る。左向きの竜。PNG を用意したら使わなくなる */
function drRpgPlaceholderBoss() {
  const W = 48, H = 40;
  const g = [];
  for (let y = 0; y < H; y++) g.push(new Array(W).fill('.'));
  const put = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c; };
  const ellipse = (cx, cy, rx, ry, c) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) put(x, y, c);
      }
    }
  };
  // 翼（うしろ）
  for (let y = 3; y <= 22; y++) {
    const from = 26 + Math.max(0, (y - 3) * 0.3), to = 46 - Math.max(0, (22 - y) * 0.15) - (y < 8 ? (8 - y) * 2 : 0);
    for (let x = Math.floor(from); x <= to; x++) put(x, y, (x + y) % 5 === 0 ? 'P' : 'p');
  }
  // しっぽ
  ellipse(39, 30, 5, 3, 'P'); ellipse(44, 27, 3, 2, 'P'); ellipse(46, 24, 1.5, 1.5, 'P');
  // 足
  for (let y = 33; y <= 39; y++) { for (let x = 17; x <= 21; x++) put(x, y, 'p'); for (let x = 29; x <= 33; x++) put(x, y, 'p'); }
  // 胴体・首・頭
  ellipse(25, 27, 14, 9, 'P');
  ellipse(22, 30, 8, 5, 'N');
  ellipse(16, 19, 5, 7, 'P');
  ellipse(13, 12, 8, 6, 'P');
  // 角
  for (let i = 0; i < 6; i++) { put(9 - Math.floor(i / 2), 6 - i, 'Y'); put(10 - Math.floor(i / 2), 6 - i, 'Y'); put(16 + Math.floor(i / 2), 6 - i, 'Y'); put(17 + Math.floor(i / 2), 6 - i, 'Y'); }
  // 目・口・つめ
  put(9, 10, 'R'); put(10, 10, 'R'); put(9, 11, 'R'); put(10, 11, 'K');
  for (let x = 5; x <= 9; x++) put(x, 15, 'K');
  put(6, 16, 'W'); put(8, 16, 'W');
  for (const x of [17, 19, 21, 29, 31, 33]) put(x, 39, 'W');
  // ふち取り（何もないところで、となりに色があれば黒）
  const out = g.map(r => r.slice());
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (g[y][x] !== '.') continue;
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const v = g[y + dy] && g[y + dy][x + dx]; return v && v !== '.' && v !== 'K'; });
    if (n) out[y][x] = 'K';
  }
  return out.map(r => r.join(''));
}

const DR_BOSSES = [
  {
    id: 'dummy', name: 'かりのボス', fromWorld: 5, toWorld: 99,
    hp: 600, atk: 18, growth: 0.15, score: 10000,
    gapMin: 0.8, gapMax: 1.8,
    attacks: [
      { type: 'normal', name: 'ひっかき', weight: 3, power: 1.0, bpm: 120 },
      { type: 'strong', name: 'しっぽアタック', weight: 1, power: 2.2, bpm: 100 },
      { type: 'skill', name: 'ほのおのブレス', weight: 0.7, power: 1.5, wind: 1.2 },
    ],
    w: 144, h: 120,
    image: '',
    sprite: { pixels: drRpgPlaceholderBoss() },
  },

  /* ↑ ここに追加 ↑ */
];

/* -----------------------------------------------------
   ★拡張予定: 入り口の敵（ノーマルフェイズの地面に出てくる。触れるとフェイズが切りかわる）
     ワールドが切りかわるたびに、下から順に「出るか」を chance の確率で決める（1ワールドに1体まで）。
     出ると決まったら、そのワールドの途中（長さの 25%～75% のどこか）で地面に出てくる。
     ボーナスステージには出ない。壊せない（居合切り・火の玉でも消えない）。スピン中・無敵中に触れてもフェイズが始まる。

   1件の書き方:
     {
       id: 'enc_blue',            // 英数字の名前
       name: '青いモンスター',      // 日本語の名前（メモ用）
       phase: 'rpg',              // 始まるフェイズ（dinorun.js の DR_PHASES の名前）。色でフェイズを見分けられるようにする（青 = RPG）
       fromWorld: 5,              // このワールド（1 から数える）から出る
       chance: 0.4,               // 1つのワールドで出る確率（0.4 = 40%）
       w: 16, h: 20,              // 大きさ（ドット）
       sprite: { ... },           // 絵（書き方は dinorun-worlds.js の「絵の書き方」と同じ。PNG にもできる）
     },
   音ゲーなどのフェイズを足すときは、色の違う敵をここに1件足し、phase にそのフェイズの名前を書く。
   ----------------------------------------------------- */
const DR_ENCOUNTERS = [
  {
    id: 'enc_blue', name: '青いモンスター', phase: 'rpg', fromWorld: 5, chance: 0.4,
    w: 16, h: 20,
    sprite: { fps: 4, pixels: [[
      '...KK......KK...',
      '...KK......KK...',
      '.....K....K.....',
      '.....K....K.....',
      '....KK....KK....',
      '.bbbbbbbbbbbbbb.',
      '.bBBBBBBBBBBBBb.',
      '.bBKKBBBBBBKKBb.',
      '.bBKKBBBBBBKKBb.',
      '.bBBBKKBBKKBBBb.',
      '.bBBBKKBBKKBBBb.',
      '.bBBBBBBBBBBBBb.',
      '.bBBBBBBBBBBBBb.',
      '.bbbbbbbbbbbbbb.',
      '..bbb......bbb..',
      '..bbb......bbb..',
      '.bbb........bbb.',
      '.bbb........bbb.',
      'bbb..........bbb',
      'bbb..........bbb',
    ], [
      '..KK........KK..',
      '..KK........KK..',
      '....K......K....',
      '.....K....K.....',
      '....KK....KK....',
      '.bbbbbbbbbbbbbb.',
      '.bBBBBBBBBBBBBb.',
      '.bBKKBBBBBBKKBb.',
      '.bBKKBBBBBBKKBb.',
      '.bBBBKKBBKKBBBb.',
      '.bBBBKKBBKKBBBb.',
      '.bBBBBBBBBBBBBb.',
      '.bBBBBBBBBBBBBb.',
      '.bbbbbbbbbbbbbb.',
      '...bbb....bbb...',
      '...bbb....bbb...',
      '..bbb......bbb..',
      '..bbb......bbb..',
      '.bbb........bbb.',
      '.bbb........bbb.',
    ]] },
  },

  /* ↑ ここに追加 ↑ */
];
