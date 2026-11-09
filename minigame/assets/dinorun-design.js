/* =====================================================
   きょうりゅうラン（dinorun）の「設計書」の写し
   minigame/index.html で dinorun-worlds.js のあと、dinorun.js より先に読み込む。

   ■ 設計書（もと）
     Google スプレッドシート「きょうりゅうラン 設計書」（シャウラの Google ドライブ）。
     仕様を変えるときは、まずスプレッドシートを書きかえて、Claude に「設計書を反映して」と頼む。
     → このファイルの数字を、スプレッドシートと同じにする。
     このファイルを先に書きかえたときは、スプレッドシートにも同じ数字を書いて、両方をそろえる。

   ■ このファイルにあるもの（スプレッドシートのタブ → ここの名前）
     「ワールドの進行」      → DR_DESIGN.progression / lifeUpWorlds
     「ワールド一覧」        → DR_DESIGN.firstWorld / worlds（feature・from・weight・gapMult）
     「障害物の出やすさ」    → DR_DESIGN.worlds の obstacles
     「BPMとリズム」        → DR_DESIGN.progression の bpm / rhythm
     「素材のルール」        → DR_DESIGN.bgmBeatStart
     「RPG」                → DR_DESIGN.rpgPhase / rpgArea
     ワールドの見た目（空・地面の色、BGM）は dinorun-worlds.js の DR_WORLDS（id でつながる）。
   ===================================================== */

const DR_DESIGN = {
  /* -----------------------------------------------------
     ★拡張予定: ワールドの進行（タブ「ワールドの進行」）
       1行 = ワールドの番号1つぶん。上から ワールド1, 2, 3 …。最後の行は、それより先のワールドすべてに使う。
         bpm      … そのワールドの BPM（障害物の間隔を「8分音符いくつ」から秒に直すのに使う）
         gapMin / gapMax … 次の障害物までの間隔（8分音符いくつ）。この範囲の整数で毎回ランダム
                           障害物は、真ん中が恐竜君の真ん中を通るタイミングが8分音符の拍にそろうように出る
         cluster  … 小さい障害物が2〜3個つながって出る確率（0〜1）
       行を足すと、そのワールドまで細かく決められる（例: ワールド6 の行を足して、最後の行を「7以降」にする）。
     ----------------------------------------------------- */
  progression: [
    { bpm: 144, gapMin: 6, gapMax: 10, cluster: 0.08 },   // ワールド1
    { bpm: 148, gapMin: 5, gapMax: 9,  cluster: 0.15 },   // ワールド2
    { bpm: 152, gapMin: 5, gapMax: 8,  cluster: 0.22 },   // ワールド3
    { bpm: 156, gapMin: 4, gapMax: 7,  cluster: 0.30 },   // ワールド4
    { bpm: 156, gapMin: 4, gapMax: 6,  cluster: 0.38 },   // ワールド5以降
  ],

  /* 新しいワールドに入ったときに「ライフ+1」するワールドの番号（タブ「ワールドの進行」の「入ったときライフ+1」）
       ライフが減っていれば1回復。満タンなら、ハートの枠が1つ増えて回復する。 */
  lifeUpWorlds: [2, 3, 4, 5],

  /* -----------------------------------------------------
     ★拡張予定: リズム（タブ「BPMとリズム」）
       rpgBpm      … RPGフェイズ（ボスとのバトル）の BPM
       obstacleNote … 障害物をそろえる音符（8 = 8分音符、4 = 4分音符）
       shopNote    … ショップをそろえる音符
       bossAttacks … ボスの攻撃の種類ごとのリズム（dinorun-rpg-data.js の attacks の type と同じ名前）
         note  … 予告で光る音符（4 = 4分音符、8 = 8分音符）
         warns … 予告で光る回数。そのつぎ（warns + 1 回目）の拍で当たる
         光り始めは、その音符の拍の頭にそろう
       スキル攻撃（type: 'skill'）は予告なし（dinorun-rpg-data.js の wind 秒後に当たる）
     ----------------------------------------------------- */
  rhythm: {
    rpgBpm: 172,
    obstacleNote: 8,
    shopNote: 4,
    bossAttacks: {
      normal: { note: 4, warns: 3 },   // 4分音符で3回光って、4回目で攻撃
      strong: { note: 8, warns: 6 },   // 8分音符で6回光って、7回目で攻撃
    },
  },

  /* BGM の「拍の始まり」（秒。タブ「素材のルール」）。曲の頭からこの秒数のところで、最初の小節の1拍目が鳴る素材にそろえる。
     ゲームは BGM が鳴っている間、この位置を拍の0として、障害物やボスの攻撃のタイミングを曲に合わせる。
     曲ごとに変えたいときは、dinorun-config.js の DR_SOUNDS の BGM に beatStart: 0.2 のように書く */
  bgmBeatStart: 0.1,

  /* -----------------------------------------------------
     ★拡張予定: RPGフェイズ（タブ「RPG」の上半分）
       ボスとは走りながら戦う（背景は流れて、距離は進む。ワールドは進まない）。
         resultTime  … 勝ったあと、結果（VICTORY!）を出しておく秒数。そのあと、境目なくノーマルに戻る
         blendTime   … ノーマルに戻るときのフェードチェンジの長さ（秒）。恐竜君は走りつづけたまま、
                       背景・床がノーマルフェイズのものにフェードで切りかわり、恐竜君の位置と大きさもノーマルフェイズの位置へ動く
     ----------------------------------------------------- */
  rpgPhase: {
    resultTime: 3,
    blendTime: 1.5,
  },

  /* -----------------------------------------------------
     ★拡張予定: RPGエリア（タブ「RPG」の下半分）
       RPGフェイズに勝つと始まる。RPG の BGM が鳴りつづけて、BPM は rhythm.rpgBpm のまま。
       ふしぎなアイコンは、RPGフェイズに入るものだけが出る。
         worlds   … 長さ。勝ったワールドから数えて、この数だけ先のワールドに入ったらノーマルに戻る
         note     … リズム技で合わせる音符（4 = 4分音符）
         window   … 拍に合ったとする幅（秒。拍の前後）。大きいほど合わせやすい
         ctMult   … スキルのクールタイムの倍率（0.7 なら 3割短い）
         feature  … RPGエリアに入ったときに出す説明
       リズム技 … 拍に合わせてスキルを出すと、急降下コンボと同じように強くなる（ダッシュ切り・青い火の玉など）
     ----------------------------------------------------- */
  rpgArea: {
    worlds: 2,
    note: 4,
    window: 0.07,
    ctMult: 0.7,
    feature: '拍に合わせて技を出すと強くなる！ クールタイムも短い',
  },

  /* ワールド1 はいつもこのワールド（タブ「ワールド一覧」の「ワールドの決め方」） */
  firstWorld: 'home',

  /* -----------------------------------------------------
     ★拡張予定: ワールド一覧と、障害物の出やすさ（タブ「ワールド一覧」「障害物の出やすさ」）
       ワールド2 からは、この中から抽選する（同じワールドは2回つづけて出ない）。
         名前（id）… dinorun-worlds.js の DR_WORLDS の id と同じにする（見た目はそちら）
         feature  … ワールド名と一緒に出る、ワールドの特徴（短く）
         from     … このワールドから抽選に入る（ワールドの番号）
         weight   … 抽選の重み（大きいほど出やすい。0 で出ない）
         gapMult  … 障害物の間隔の倍率（1.4 なら 1.4倍あく＝障害物が少ない）
         obstacles … 出る障害物と、その出やすさ（dinorun-worlds.js の DR_OBSTACLES の id: 数字）。書いていないものは出ない
       ワールドを足すとき:
         1. dinorun-worlds.js の DR_WORLDS に見た目を1件足す（id を決める）
         2. ここに同じ id で1件足す
         3. スプレッドシートの「ワールド一覧」に1行、「障害物の出やすさ」に1列足す
     ----------------------------------------------------- */
  worlds: {
    home: {
      feature: 'いろいろな障害物が、バランスよく出る',
      from: 2, weight: 1, gapMult: 1,
      obstacles: { pedestal: 1, collider: 1, penlight: 1.2, drone: 1, menu: 1, screen: 0.9, pit: 0.7 },
    },
    mirror: {
      feature: 'ミラーと落とし穴が多め',
      from: 2, weight: 1, gapMult: 1,
      obstacles: { pedestal: 1, collider: 1, mirror: 3, drone: 1, menu: 1, screen: 0.9, banner: 0.8, pit: 2 },
    },
    chill: {
      feature: 'ペンライトが多いけど、障害物は少なめ',
      from: 2, weight: 1, gapMult: 1.4,
      obstacles: { pedestal: 0.6, collider: 0.6, penlight: 4, drone: 0.5, screen: 0.5, pit: 0.4 },
    },
    night: {
      feature: '空を飛ぶものが多め',
      from: 3, weight: 1, gapMult: 1,
      obstacles: { pedestal: 1, penlight: 1.2, portal: 1, drone: 2, nameplate: 2, screen: 0.9, banner: 0.8, pit: 0.7 },
    },
    portal: {
      feature: 'こわせないポータルと垂れ幕が多め',
      from: 4, weight: 1, gapMult: 0.95,
      obstacles: { collider: 1, mirror: 1, portal: 2.5, drone: 1, menu: 1, nameplate: 1, screen: 0.9, banner: 1.6, pit: 0.7 },
    },
  },
};
