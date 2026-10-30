/* =====================================================
   きょうりゅうラン（dinorun）のスキルとショップのアイテム
   minigame/index.html で dinorun.js より先に読み込む。

   ここにあるもの:
     DR_SKILLS … ボタンに割り当てて使うスキル（居合切り・スピンアタック）の基本の数値
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
     cooldown    … クールタイム（秒）。ショップのアイテムで短くなる
     minCooldown … クールタイムがこれ以上は短くならない値
     range / height … （slash）切れる範囲の横幅・高さ（ドット）
     duration    … （spin）回転している時間（秒）

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
    duration: 1.5,
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
       price: 20,                   // 最初の値段（コイン）
       priceUp: 1.8,                // 買うたびに値段を何倍にするか
       weight: 1,                   // （任意）並びやすさ。大きいほど出やすい（ふつうは 1）
       apply(run, skill) { ... },   // 買ったときの効き目（run の数値を書き換える）
     },

   apply の中で書き換えられる数値（run.xxx）:
     run.maxJumps       … ジャンプできる回数（空中ジャンプ込み）
     run.jumpPower      … ジャンプの強さの倍率（1 = ふつう）
     run.lives          … いまのライフ
     run.invincibleTime … ぶつかったあとの無敵時間（秒）
     run.coinMult       … コインを拾ったときの倍率（1 = ふつう）
     run.skills.iai.cooldown など … 覚えたスキルの数値（requires を付けたアイテムでだけ使う）
       ↑ 2つ目の引数 skill には、requires で指定したスキルの数値が入っているので、skill.cooldown のように書ける

   ★ 追加するときは、下の一覧の最後（「ここに追加」の上）に1件コピーして書き換える。
   ----------------------------------------------------- */
const DR_ITEMS = [
  /* --- スキルを覚える（買うと、どのボタンに割り当てるか選ぶ画面が出る） --- */
  {
    id: 'learn_iai', name: '居合切り', desc: '目の前の障害物を切る技を覚える', icon: '🗡',
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
    id: 'jump_high', name: 'ジャンプ高さUP', desc: 'ジャンプが少し高くなる', icon: '🦘',
    type: 'passive', maxLevel: 3, price: 30, priceUp: 1.6,
    apply(run) { run.jumpPower += 0.1; },
  },

  /* --- ライフ・無敵 --- */
  {
    id: 'life_plus', name: 'ライフ+1', desc: 'ハートが1つ増える', icon: '❤',
    type: 'passive', maxLevel: 5, price: 60, priceUp: 1.7,
    apply(run) { run.lives += 1; },
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
    id: 'spin_time', name: 'スピンアタック 持続時間強化', desc: '回転している時間が0.5秒のびる', icon: '⌛',
    type: 'passive', requires: 'spin', maxLevel: 4, price: 40, priceUp: 1.6,
    apply(run, skill) { skill.duration += 0.5; },
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

  /* ↑ ここに追加 ↑ */
];
