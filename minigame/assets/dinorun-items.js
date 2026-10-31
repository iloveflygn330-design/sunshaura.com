/* =====================================================
   きょうりゅうラン（dinorun）のスキルとショップのアイテム
   minigame/index.html で dinorun.js より先に読み込む。

   ここにあるもの:
     DR_SKILLS … ボタンに割り当てて使うスキル（居合切り・スピンアタック・火の玉など）の基本の数値
     DR_ITEMS  … ★拡張予定: ショップに並ぶアイテムの一覧

   強化はそのプレイの中だけ（ゲームオーバーでリセット）。
   ===================================================== */

/* -----------------------------------------------------
   スキル（スキルボタン①②③に割り当てて使う）
     name     … ボタンやショップに出る名前
     label    … ボタンが小さいとき（スマホ横持ち）に出る短い名前
     action   … 動きの種類。dinorun.js の DR_SKILL_ACTIONS に同じ名前の処理がある
                  'slash' … 目の前の一定範囲の障害物を切る
                  'spin'  … 一定時間、自機が回転して、ぶつかった障害物を壊す（その間はダメージなし）
                  'dive'  … 空中から一気に着地する（地面では使えない）。すぐあとの技が強くなる（急降下コンボ）
                  'vacuum' … 画面に出ているコインを全部吸い寄せる
                  'fire'  … 前へ火の玉を飛ばす。急降下コンボだと青い火の玉
     button      … （任意）'slide' と書くと、①②③ではなくスライディングボタンに付く（空中で押すと出る）。いまは急降下だけ
     cooldown    … クールタイム（秒）。ショップのアイテムで短くなる
     minCooldown … クールタイムがこれ以上は短くならない値
     range / height … （slash）切れる範囲の横幅・高さ（ドット）
     duration    … （spin）回転している時間（秒）
     speed       … （dive）落ちる速さ（ドット/秒）／（fire）赤い火の玉の速さ（ドット/秒）
     radius / pierce / range … （fire）火の玉の大きさ（半径ドット）・壊せる数・飛ぶ距離（ドット）
     blueSpeed   … （fire）青い火の玉の速さ。青い火の玉は画面の端まで飛び、触れたものを全部消す

   ★拡張予定: 新しいスキルを増やす場合
     1. 下に1件追加する（例: slow: { name: 'スロー', label: 'スロー', action: 'slow', cooldown: 15, minCooldown: 6, duration: 3 }）
     2. action が 'slash' か 'spin' なら、それだけで動く（同じ動きで数値違いのスキルになる）
        新しい動きにしたいときは、dinorun.js の DR_SKILL_ACTIONS に同じ名前の処理を追加する
        （そこに書き方の説明がある）
     3. DR_ITEMS に「覚える」アイテム（type: 'skill'）と、強化アイテム（requires でそのスキルを指定）を足す
   ----------------------------------------------------- */
const DR_SKILLS = {
  iai: {
    name: '居合切り', label: '居合', action: 'slash',
    cooldown: 6.0, minCooldown: 1.5,
    range: 44, height: 64,
  },
  spin: {
    name: 'スピンアタック', label: 'スピン', action: 'spin',
    cooldown: 12.0, minCooldown: 4.0,
    duration: 0.8,
  },
  dive: {
    name: '急降下', label: '急降下', action: 'dive', button: 'slide',
    cooldown: 0, minCooldown: 0,         // クールタイムなし（空中ならいつでも急降下できる）
    speed: 900,
  },
  vacuum: {
    name: 'コイン吸引', label: '吸引', action: 'vacuum',
    cooldown: 20.0, minCooldown: 8.0,
  },
  fire: {
    name: '火の玉', label: '火の玉', action: 'fire',
    cooldown: 4.0, minCooldown: 4.0,
    radius: 3, pierce: 1, range: 170, speed: 300,
    blueSpeed: 560,
  },
};

/* -----------------------------------------------------
   ★拡張予定: ショップのアイテム

   ショップでは、この中から「いま買えるもの」をランダムに3つ並べる（ヴァンサバ風）。
   同じアイテムは買うたびに値段が上がり、maxLevel まで買える。

   1件の書き方:
     {
       id: 'jump_plus',             // 英数字の名前（ほかと重ならないように）
       name: 'ジャンプ回数+1',       // ショップに出る名前
       desc: '空中でもう1回ジャンプできる',  // 説明（短く）
       icon: '⤴',                   // ショップのカードに出る絵文字（あとでドット絵にしたいときは image: 'dinorun/items/xxx.png' を足す）
       type: 'passive',             // 'passive' … 持っているだけで効く / 'skill' … スキルを覚える（ボタンに割り当てる）
       skill: 'iai',                // type: 'skill' のとき、覚えるスキル（DR_SKILLS の名前）
       requires: 'iai',             // （任意）このスキルを覚えているときだけ並ぶ
       maxLevel: 2,                 // 何回まで買えるか
       consumable: true,            // （任意）使いきりのアイテム（何回でも買える。maxLevel は使わない。カードに「1回きり」と出る）
       minWorld: 3,                 // （任意）このワールド（1 から数える）以降のショップにだけ並ぶ
       available(run) { ... },      // （任意）並べてよいときだけ true を返す（例: すでに使う予定があるときは並べない）
       price: 20,                   // 最初の値段（コイン）
       priceUp: 1.8,                // 買うたびに値段を何倍にするか
       weight: 1,                   // （任意）並びやすさ。大きいほど出やすい（ふつうは 1）
       apply(run, skill) { ... },   // 買ったときの効き目（run の数値を書き換える）
     },

   apply の中で書き換えられる数値（run.xxx）:
     run.maxJumps       … ジャンプできる回数（空中ジャンプ込み）
     run.flutterTime    … バタ足ジャンプで浮いていられる秒数（0 = 覚えていない）
     run.bonusNext      … true にすると、次のワールドの前にボーナスステージが入る
     run.lives          … いまのライフ
     run.maxLives       … 最大ライフ（回復薬はここまで回復する。ハートの空きの数にもなる）
     run.potion         … 持っている回復薬の数（1個まで）
     run.invincibleTime … ぶつかったあとの無敵時間（秒）
     run.coinMult       … コインを拾ったときの倍率（1 = ふつう）
     run.magnet         … 磁石の範囲（ドット。0 = 磁石なし）
     run.rerolls        … 1回のショップで品ぞろえを入れ替えられる回数
     run.skills.iai.cooldown など … 覚えたスキルの数値（requires を付けたアイテムでだけ使う）
       ↑ 2つ目の引数 skill には、requires で指定したスキルの数値が入っているので、skill.cooldown のように書ける

   ★ 追加するときは、下の一覧の最後（「ここに追加」の上）に1件コピーして書き換える。
   ----------------------------------------------------- */
const DR_ITEMS = [
  /* --- スキルを覚える（買うと、どのボタンに割り当てるか選ぶ画面が出る） --- */
  {
    id: 'learn_iai', name: '居合切り', desc: '目の前の障害物を切る技を覚える。切った障害物からコインが出る', icon: '🗡',
    type: 'skill', skill: 'iai', maxLevel: 1, price: 40, priceUp: 1, weight: 3,
  },
  {
    id: 'learn_spin', name: 'スピンアタック', desc: '回転して体当たりで障害物を壊す技を覚える', icon: '🌀',
    type: 'skill', skill: 'spin', maxLevel: 1, price: 60, priceUp: 1, weight: 2,
  },

  /* --- ジャンプ --- */
  {
    id: 'jump_plus', name: 'ジャンプ回数+1', desc: '空中でもう1回ジャンプできる', icon: '⏫',
    type: 'passive', maxLevel: 2, price: 50, priceUp: 2.0,
    apply(run) { run.maxJumps += 1; },
  },
  {
    // 浮いていられる秒数は Lv1 から順に 0.6 / 0.9 / 1.2。動きの説明は dinorun-config.js の「バタ足ジャンプ」
    id: 'flutter', name: 'バタ足ジャンプ', desc: 'ジャンプボタンを長押しすると、空中でバタ足してしばらく浮いていられる', icon: '🦶',
    type: 'passive', maxLevel: 3, price: 40, priceUp: 1.6,
    apply(run) { run.flutterTime = [0, 0.6, 0.9, 1.2][run.levels.flutter] || 1.2; run.flutterLeft = run.flutterTime; },
  },

  /* --- ライフ・無敵 --- */
  {
    id: 'life_plus', name: 'ライフ+1', desc: 'ハートが1つ増える', icon: '❤',
    type: 'passive', maxLevel: 5, price: 60, priceUp: 1.7,
    apply(run) { run.maxLives += 1; run.lives += 1; },
  },
  {
    // 1個まで持てる（持っている間は並ばない）。使うのはいつでも：ハートの横のボタン・Q キー（dinorun.js の drUsePotion）
    id: 'potion', name: '回復薬', desc: '1個だけ持てる。好きなときに使うと、ライフが最大まで回復（バトル中はHPが全回復）', icon: '🧪',
    type: 'passive', consumable: true, price: 40, priceUp: 1.25, weight: 1.5,
    available(run) { return !(run.potion > 0); },
    apply(run) { run.potion = 1; },
  },
  {
    id: 'inv_up', name: '被弾後無敵時間UP', desc: 'ぶつかったあとの無敵が0.75秒のびる', icon: '✨',
    type: 'passive', maxLevel: 4, price: 30, priceUp: 1.5,
    apply(run) { run.invincibleTime += 0.75; },
  },

  /* --- 居合切りの強化（居合切りを覚えているときだけ並ぶ） --- */
  {
    id: 'iai_range', name: '居合切り 範囲強化', desc: '切れる範囲が広くなる', icon: '📏',
    type: 'passive', requires: 'iai', maxLevel: 4, price: 35, priceUp: 1.6,
    apply(run, skill) { skill.range += 16; },
  },
  {
    id: 'iai_ct', name: '居合切り クールタイム短縮', desc: 'もう一度使えるまでの時間が0.8秒短くなる', icon: '⏱',
    type: 'passive', requires: 'iai', maxLevel: 4, price: 35, priceUp: 1.6,
    apply(run, skill) { skill.cooldown = Math.max(skill.minCooldown, skill.cooldown - 0.8); },
  },

  /* --- スピンアタックの強化（スピンアタックを覚えているときだけ並ぶ） --- */
  {
    id: 'spin_time', name: 'スピンアタック 持続時間強化', desc: '回転している時間が0.4秒のびる', icon: '⌛',
    type: 'passive', requires: 'spin', maxLevel: 4, price: 40, priceUp: 1.6,
    apply(run, skill) { skill.duration += 0.4; },
  },
  {
    id: 'spin_ct', name: 'スピンアタック クールタイム短縮', desc: 'もう一度使えるまでの時間が1.5秒短くなる', icon: '⏲',
    type: 'passive', requires: 'spin', maxLevel: 4, price: 45, priceUp: 1.6,
    apply(run, skill) { skill.cooldown = Math.max(skill.minCooldown, skill.cooldown - 1.5); },
  },

  /* --- コイン --- */
  {
    id: 'coin_mult', name: 'アイテム倍率アップ', desc: 'コインを拾ったときにもらえる数が増える（+25%）', icon: '💰',
    type: 'passive', maxLevel: 5, price: 25, priceUp: 1.8,
    apply(run) { run.coinMult += 0.25; },
  },

  /* --- 急降下（空中から一気に着地。すぐあとに居合切り・スピンでダッシュ） --- */
  {
    id: 'learn_dive', name: '急降下', desc: 'スライディングボタンに付く。空中で押すと一気に着地（クールタイムなし）。直後の技が強くなる', icon: '⏬',
    type: 'skill', skill: 'dive', maxLevel: 1, price: 45, priceUp: 1, weight: 2,
  },

  /* --- コイン吸引・磁石 --- */
  {
    id: 'learn_vacuum', name: 'コイン吸引', desc: '画面に出ているコインを一瞬で全部集める', icon: '🌪',
    type: 'skill', skill: 'vacuum', maxLevel: 1, price: 50, priceUp: 1, weight: 2,
  },
  {
    id: 'vacuum_ct', name: 'コイン吸引 クールタイム短縮', desc: 'もう一度使えるまでの時間が3秒短くなる', icon: '⏲',
    type: 'passive', requires: 'vacuum', maxLevel: 3, price: 35, priceUp: 1.6,
    apply(run, skill) { skill.cooldown = Math.max(skill.minCooldown, skill.cooldown - 3); },
  },
  {
    // 範囲（ドット）は Lv1 から順に 20 / 26 / 32 / 40。apply の時点で run.levels.magnet は買ったあとの Lv になっている
    id: 'magnet', name: '磁石', desc: '近くのコインを自動で吸い寄せる（買うたびに範囲が広がる）', icon: '🧲',
    type: 'passive', maxLevel: 4, price: 35, priceUp: 1.6,
    apply(run) { run.magnet = [0, 20, 26, 32, 40][run.levels.magnet] || 40; },
  },

  /* --- ショップ --- */
  {
    id: 'reroll', name: 'リロール', desc: 'ショップの品ぞろえを1回入れ替えられる（毎回のショップで使える）', icon: '🔄',
    type: 'passive', maxLevel: 2, price: 40, priceUp: 2.0,
    apply(run) { run.rerolls += 1; },
  },

  /* --- 火の玉（前へ飛ばして障害物を壊す。急降下のすぐあとなら青い火の玉） --- */
  {
    id: 'learn_fire', name: '火の玉', desc: '前へ火の玉を飛ばして障害物を壊す。急降下の直後なら青い火の玉', icon: '🔥',
    type: 'skill', skill: 'fire', maxLevel: 1, price: 55, priceUp: 1, weight: 2,
  },
  {
    id: 'fire_power', name: '火の玉 強化', desc: '火の玉が大きくなり、壊せる数が1つ増える', icon: '☄',
    type: 'passive', requires: 'fire', maxLevel: 4, price: 40, priceUp: 1.6,
    apply(run, skill) { skill.radius += 1.5; skill.pierce += 1; },
  },

  /* --- ボーナスチケット（3ワールド目からのショップに並ぶ。使いきり） ---
       買うと、次のワールドの前にボーナスステージが入る（中身は dinorun-config.js の「ボーナスステージ」）。
       使う前（ボーナスステージに入る前）は、もう1枚は並ばない */
  {
    id: 'bonus_ticket', name: 'ボーナスチケット', desc: '次のワールドがボーナスステージになる（障害物なし・コインざくざく）', icon: '🎫',
    type: 'passive', consumable: true, minWorld: 3, price: 60, priceUp: 1.3, weight: 1.5,
    available(run) { return !run.bonusNext && !run.bonus; },
    apply(run) { run.bonusNext = true; },
  },

  /* ↑ ここに追加 ↑ */
];
