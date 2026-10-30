/* =====================================================
   きょうりゅうラン（dinorun）の自機（恐竜）の絵
   minigame/index.html で dinorun-worlds.js のあと、dinorun.js より先に読み込む。
   （色は dinorun-worlds.js の DR_PALETTE を使う）

   ★拡張予定: 本番のドット絵（PNG）に差し替える手順
     1. 1コマ 24 × 24 ドットで描く（足の裏が一番下の行にくるように）
     2. 1枚の PNG に、動きごとに「行」、コマを「横」に並べる（スプライトシート）
          1行目: 走る（4コマ）
          2行目: 跳ぶ（2コマ。上がる → 落ちる）
          3行目: しゃがむ（2コマ）
          4行目: 切る（3コマ）
          5行目: スピン（4コマ）
          6行目: やられる（2コマ）
        → 画像の大きさは 横 24×（いちばん多いコマ数）、縦 24×6
        行やコマ数を変えたいときは、下の anims の row・frames を書き換える
     3. PNG を minigame/dinorun/sprites/ に置き（フォルダがなければ作る）、image にその場所を書く
          例: image: 'dinorun/sprites/dino.png',
     4. 当たり判定（hit）は絵に合わせて調整する
        （ページの URL の最後に ?game=dinorun&drdebug を付けて開くと、当たり判定の枠が赤で見える）
   image が空のあいだは、下の「仮のドット絵」（placeholder）が使われる。
   ===================================================== */

const DR_PLAYER = {
  frameW: 24,
  frameH: 24,
  image: '',   // ★ 本番の PNG の場所（例: 'dinorun/sprites/dino.png'）。空なら仮のドット絵

  /* 動きごとの、PNG の何行目か（0 から数える）・コマ数・速さ（1秒に何コマ） */
  anims: {
    run:   { row: 0, frames: 4, fps: 12 },
    jump:  { row: 1, frames: 2, fps: 0 },    // fps: 0 … 上がっているとき1コマ目、落ちているとき2コマ目
    duck:  { row: 2, frames: 2, fps: 10 },
    slash: { row: 3, frames: 3, fps: 15 },
    spin:  { row: 4, frames: 4, fps: 20 },
    hurt:  { row: 5, frames: 2, fps: 6 },
  },

  /* 当たり判定 [左, 上, 幅, 高さ]（24×24 のコマの中の位置） */
  hit: {
    stand: [7, 3, 12, 21],
    duck:  [4, 11, 19, 13],
  },
};

/* -----------------------------------------------------
   仮のドット絵（image が空のときだけ使う）
     胴体（上の19行）と足（下の5行）を組み合わせてコマを作っている。
     切る・スピン・やられるのコマは、仮の絵では「走る／跳ぶ」の絵を回したり色を変えたりして代用する。
   ----------------------------------------------------- */
(function () {
  const BODY = [
    '........................',
    '........................',
    '............gggggg......',
    '...........gGGGGGGg.....',
    '..........gGGGGGWKGg....',
    '..........gGGGGGWKGGg...',
    '..........gGGGGGGGGGGg..',
    '..........gGGGGRGGGGGg..',
    '..........gGGGGGGGGgg...',
    '....O.....gGGGGGGgg.....',
    '...OOg...gGGGGGGg.......',
    '...gGGg.gGGGNNGGGg......',
    '....gGGgGGGNNNNGgGg.....',
    '.....gGGGGGNNNNGg.g.....',
    '......gGGGGNNNNGg.......',
    '.......gGGGGNNGGg.......',
    '.......gGGGGGGGg........',
    '........gGGGGGg.........',
    '........gGGGGGg.........',
  ];
  const LEGS_A = [
    '........gGg..gGg........',
    '........gGg..gGg........',
    '.......gGg....gGg.......',
    '.......gGg....gGg.......',
    '......gOOg....gOOg......',
  ];
  const LEGS_B = [
    '........gGg..gGg........',
    '........gGg..gGg........',
    '........gGg..gGg........',
    '........gGg.gGg.........',
    '.......gOOg.gOOg........',
  ];
  const LEGS_C = [
    '........gGg..gGg........',
    '........gGg...gGg.......',
    '........gGg....gGg......',
    '.......gGg.....gGg......',
    '......gOOg.....gOOg.....',
  ];
  const LEGS_JUMP = [
    '........gGGg.gGGg.......',
    '........gOOg.gOOg.......',
    '........................',
    '........................',
    '........................',
  ];
  const DUCK_TOP = [
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '..............gggggg....',
    '....O........gGGGGGGg...',
    '...OOgggggggggGGGGWKGg..',
    '...gGGGGGGGGGGGGGGWKGGg.',
    '....gGGGGGGGGGGGGGGGGGGg',
    '.....gGGGGNNNNNGGGRGGGg.',
    '......gGGGNNNNNGGGGGgg..',
    '.......gGGGGGGGGGgg.....',
  ];
  DR_PLAYER.placeholder = {
    run:   [BODY.concat(LEGS_A), BODY.concat(LEGS_B), BODY.concat(LEGS_C), BODY.concat(LEGS_B)],
    jump:  [BODY.concat(LEGS_JUMP), BODY.concat(LEGS_JUMP)],
    duck:  [DUCK_TOP.concat(LEGS_A), DUCK_TOP.concat(LEGS_C)],
    slash: [BODY.concat(LEGS_B), BODY.concat(LEGS_A), BODY.concat(LEGS_A)],
    spin:  [BODY.concat(LEGS_JUMP)],
    hurt:  [BODY.concat(LEGS_JUMP), BODY.concat(LEGS_JUMP)],
  };
})();
