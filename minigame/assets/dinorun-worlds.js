/* =====================================================
   きょうりゅうラン（dinorun）のワールド・障害物・コイン・ショップアイコン
   minigame/index.html で dinorun.js より先に読み込む。

   ここにあるもの:
     DR_PALETTE   … 仮のドット絵で使う色（1文字 = 1色）
     DR_OBSTACLES … ★拡張予定: 障害物の一覧（地面に置くもの・空を飛ぶもの）
     DR_WORLDS    … ★拡張予定: ワールドの一覧（走った距離で順番に切り替わる。最後まで行ったら最初に戻る）
     DR_BONUS_WORLD … ボーナスステージの見た目
     DR_TUTORIAL  … ★拡張予定: 走り始めのチュートリアル（説明の文と、出す障害物・コイン）
     DR_PICKUPS   … コインとショップアイコンの見た目

   ■ 絵（sprite）の書き方 — いまは全部「仮のドット絵」。あとから PNG に差し替えられる
     sprite: {
       pixels: [ '..KK..', '.KWWK.', ... ],   // 仮のドット絵。1文字 = 1ドット。色は DR_PALETTE（'.' は透明）
                                              // コマ送りしたいときは [ [1コマ目の行...], [2コマ目の行...] ] のように配列を並べる
       fps: 8,                                // コマ送りの速さ（1秒に何コマ）。1コマなら不要
       image: '',                             // ★ PNG に差し替えるときは、ここに minigame/ から見た場所を書く
       frames: 1,                             //   PNG の中のコマ数（コマは横に並べる。1コマの幅 = 画像の幅 ÷ frames）
     }
     PNG を書いたら pixels は使われなくなる（消さずに残しておいてよい）。
     PNG の置き場所は minigame/dinorun/sprites/（フォルダがなければ作る）。
     PNG の1コマの大きさは、その障害物の w × h と同じにする（ドット絵をそのままの大きさで描く。拡大はゲームがする）。
   ===================================================== */

/* -----------------------------------------------------
   仮のドット絵の色（1文字 = 1色。'.' は透明）
   ★拡張予定: 色を増やすときは、使っていない1文字を選んで1行足す
   ----------------------------------------------------- */
const DR_PALETTE = {
  K: '#1B1B2F',  // 黒（ふち）
  W: '#FFFFFF',  // 白
  L: '#CFE9FF',  // 水色（明るい）
  B: '#4FA3FF',  // 青
  b: '#2B6CC4',  // 青（暗い）
  C: '#7FFFD4',  // 光るシアン
  P: '#B07CFF',  // むらさき
  p: '#6B3FC9',  // むらさき（暗い）
  G: '#6CD96C',  // 緑
  g: '#3A9E46',  // 緑（暗い）
  Y: '#FFD84A',  // 黄色
  y: '#D9A21B',  // 黄色（暗い）
  O: '#FF9A3C',  // オレンジ
  R: '#FF5A7A',  // ピンク
  r: '#C7305A',  // ピンク（暗い）
  S: '#9AA4B5',  // グレー
  s: '#5C6577',  // グレー（暗い）
  N: '#FFE3C2',  // クリーム（おなか）
};

/* -----------------------------------------------------
   ★拡張予定: 障害物

   1件の書き方:
     {
       id: 'mirror',            // 英数字の名前（ワールドの obstacles に書く名前）
       name: 'ミラー',           // 日本語の名前（ゲームオーバーのとき「ミラーにぶつかってしまった…」と出る）
       deathText: '…',          // （任意）ゲームオーバーのときの文を変えたいとき（書かなければ「○○にぶつかってしまった…」、穴は「○○に落ちてしまった…」）
       w: 14, h: 30,            // 大きさ（ドット）
       fly: null,               // 地面に置くものは null
                                // 空を飛ぶものは、地面からの高さの候補を [6, 18, 38] のように書く（出るたびにどれか1つ）
                                //   6 前後 … ジャンプでよける高さ
                                //   18 前後 … しゃがみでくぐる高さ（しゃがんだ自機の高さは 13）
                                //   38 前後 … 立っていれば下を通れる（ジャンプするとぶつかる）
                                // 天井から下がっていて、スライディングでしかくぐれないものは、
                                //   h を DR_CONFIG.groundY - 15（= 169）にして fly: [15] にする（下の screen・banner を参照）
       hit: [2, 2, 10, 28],     // （任意）当たり判定 [左, 上, 幅, 高さ]。書かなければ、絵の外側1ドットを除いた範囲
       breakable: true,         // 居合切り・スピンアタック・赤い火の玉で壊せるか（false にすると壊せない。青い火の玉だけは消せる）
       dashCut: true,           // （任意）breakable: false でも、急降下のあとのダッシュ切りなら切れる（天井から下がっているもの）
       minMeter: 0,             // （任意）この距離（m）より後でだけ出る
       label: { text: 'SKILL!', x: 24, y: 146, color: '#FFD84A' },
                                // （任意）絵の上に小さいドット文字を重ねる（x・y は絵の左上からの位置。x を書かなければ真ん中）
       pit: true,               // （任意）落下穴にする。絵（sprite）はいらない（地面に黒い穴を描く）。幅は出るたびに速さで決まる
                                //   （dinorun-config.js の pitTimeMin など）。w・h は使わない
       weight: 1,               // （任意）出やすさ。大きいほど出やすい
       sprite: { pixels: [...] },  // 絵（上の「絵の書き方」を参照）
     }
   追加したら、出したいワールドの obstacles に id を書く。
   ----------------------------------------------------- */
/* 天井から下がっている障害物の絵を作る（ひも＋下の板）。
     w … 幅、panel … 下の板の絵（行の配列。幅は w に合わせる）、rope … ひもの色の文字
   ひもの部分は自動でのばすので、板の絵だけ描けばよい */
function drHangingPixels(w, panel, rope) {
  const h = 169;                         // DR_CONFIG.groundY(184) - 15。地面から15ドット上まで下がる
  const ropeRow = '.'.repeat(Math.floor(w / 2) - 1) + rope + rope + '.'.repeat(w - Math.floor(w / 2) - 1);
  const rows = [];
  for (let i = 0; i < h - panel.length; i++) rows.push(ropeRow);
  return rows.concat(panel);
}

/* スキルを使わないと通れない区画の、上から下りているシャッターの絵を作る（たての格子＋下の注意の板）。
     格子のすき間も当たり判定があるので、通れないように見える絵にしている。
     w … 幅、h … 高さ（地面からどれだけ上まで下がるかで決まる） */
function drGateRoofPixels(w, h) {
  const rows = [];
  const panelH = 15;
  for (let y = 0; y < h - panelH; y++) {
    let r = '';
    for (let x = 0; x < w; x++) {
      if (x === 0 || x === w - 1) r += 'K';
      else if (y % 16 < 2) r += y % 16 === 0 ? 'S' : 's';     // よこの棒
      else if (x % 6 === 2) r += 'S';                          // たての棒
      else if (x % 6 === 3) r += 's';
      else r += '.';
    }
    rows.push(r);
  }
  const stripe = y => { let r = 'K'; for (let x = 1; x < w - 1; x++) r += ((x + y) % 8 < 4 ? 'Y' : 'K'); return r + 'K'; };
  rows.push('K'.repeat(w));
  for (let y = 0; y < 3; y++) rows.push(stripe(y));
  rows.push('K'.repeat(w));
  for (let y = 0; y < 6; y++) rows.push('K' + 's'.repeat(w - 2) + 'K');
  rows.push('K'.repeat(w));
  for (let y = 0; y < 2; y++) rows.push(stripe(y + 3));
  rows.push('K'.repeat(w));
  return rows;
}
/* スキルを使わないと通れない区画の、壊せるかべ（レンガ）の絵を作る */
function drBrickPixels(w, h) {
  const rows = ['K'.repeat(w)];
  for (let y = 1; y < h - 1; y++) {
    let r = 'K';
    for (let x = 1; x < w - 1; x++) {
      const row = Math.floor((y - 1) / 4), off = row % 2 ? 3 : 0;
      r += ((y - 1) % 4 === 3 || (x + off) % 6 === 0) ? 'r' : (x + y) % 9 === 0 ? 'R' : 'O';
    }
    rows.push(r + 'K');
  }
  rows.push('K'.repeat(w));
  return rows;
}

const DR_OBSTACLES = [
  /* --- 地面に置くもの --- */
  {
    id: 'pedestal', name: 'アバターペデスタル', w: 14, h: 24, fly: null, breakable: true,
    hit: [2, 0, 10, 24],
    sprite: { pixels: [
      '....LLLLLL....',
      '...LBBBBBBL...',
      '...LBWBBWBL...',
      '...LBBBBBBL...',
      '....LBBBBL....',
      '..LLBBBBBBLL..',
      '.LBBBBBBBBBBL.',
      '.LB.BBBBBB.BL.',
      '...LBBBBBBL...',
      '...LBBLLBBL...',
      '...LBL..LBL...',
      '....L....L....',
      '..............',
      '...CCCCCCCC...',
      '..CCCCCCCCCC..',
      '.ssSSSSSSSSss.',
      '.sSSSSSSSSSSs.',
      '..sSSSSSSSSs..',
      '...sSSSSSSs...',
      '....sSSSSs....',
      '....sSSSSs....',
      '...sSSSSSSs...',
      '..sSSSSSSSSs..',
      '.ssssssssssss.',
    ] },
  },
  {
    id: 'collider', name: '当たり判定ボックス', w: 16, h: 16, fly: null, breakable: true,
    sprite: { fps: 4, pixels: [[
      'GGGGGGGGGGGGGGGG',
      'GG............GG',
      'G.G..........G.G',
      'G..G........G..G',
      'G...G......G...G',
      'G....G....G....G',
      'G.....G..G.....G',
      'G......GG......G',
      'G......GG......G',
      'G.....G..G.....G',
      'G....G....G....G',
      'G...G......G...G',
      'G..G........G..G',
      'G.G..........G.G',
      'GG............GG',
      'GGGGGGGGGGGGGGGG',
    ], [
      'gggggggggggggggg',
      'gg............gg',
      'g.g..........g.g',
      'g..g........g..g',
      'g...g......g...g',
      'g....g....g....g',
      'g.....g..g.....g',
      'g......gg......g',
      'g......gg......g',
      'g.....g..g.....g',
      'g....g....g....g',
      'g...g......g...g',
      'g..g........g..g',
      'g.g..........g.g',
      'gg............gg',
      'gggggggggggggggg',
    ]] },
  },
  {
    id: 'penlight', name: 'ペンライト', w: 6, h: 20, fly: null, breakable: true, weight: 1.2,
    sprite: { fps: 6, pixels: [[
      '..WW..', '.WRRW.', '.RRRR.', '.RRRR.', '.RRRR.', '.RRRR.', '.RRRR.', '.RRRR.', '.RRRR.', '.RRRR.',
      '.RRRR.', '.WRRW.', '..ss..', '.sSSs.', '.sSSs.', '.sSSs.', '.sSSs.', '.sSSs.', '.sSSs.', '.ssss.',
    ], [
      '..WW..', '.WrrW.', '.rrrr.', '.rrrr.', '.rrrr.', '.rrrr.', '.rrrr.', '.rrrr.', '.rrrr.', '.rrrr.',
      '.rrrr.', '.WrrW.', '..ss..', '.sSSs.', '.sSSs.', '.sSSs.', '.sSSs.', '.sSSs.', '.sSSs.', '.ssss.',
    ]] },
  },
  {
    id: 'mirror', name: 'ミラー', w: 14, h: 30, fly: null, breakable: true, minMeter: 150,
    sprite: { pixels: [
      'ssssssssssssss',
      'sLLLLLLLLLLLLs',
      'sLWLLLLLLLLLLs',
      'sLLWLLLLLLLLLs',
      'sLWLWLLLLLLLLs',
      'sLLWLWLLLLLLLs',
      'sLLLWLWLLLLLLs',
      'sLLLLWLWLLLLLs',
      'sLLLLLWLLLLLLs',
      'sLLLLLLLLLLLLs',
      'sLLLLLLLLLLLLs',
      'sLLLLLLLLLLLLs',
      'sLLLLLLLLLLLLs',
      'sLLLLLLLLLLLLs',
      'sLLLLLLLLWLLLs',
      'sLLLLLLLWLWLLs',
      'sLLLLLLLLWLWLs',
      'sLLLLLLLLLWLLs',
      'sLLLLLLLLLLLLs',
      'sLLLLLLLLLLLLs',
      'sLLLLLLLLLLLLs',
      'sLLLLLLLLLLLLs',
      'ssssssssssssss',
      '......ss......',
      '......ss......',
      '......ss......',
      '......ss......',
      '....ssssss....',
      '...sSSSSSSs...',
      '..ssssssssss..',
    ] },
  },
  {
    id: 'portal', name: 'ポータル', w: 18, h: 28, fly: null, breakable: false, minMeter: 400,
    sprite: { fps: 6, pixels: [[
      '......PPPPPP......',
      '....PPppppppPP....',
      '...PppCCCCCCppP...',
      '..PpCCCCCCCCCCpP..',
      '..PpCCWWCCCCCCpP..',
      '.PpCCWCCCCCCCCCpP.',
      '.PpCCCCCCCCCCCCpP.',
      '.PpCCCCCCCCCCCCpP.',
      'PpCCCCCCCCCCCCCCpP',
      'PpCCCCCCCPPCCCCCpP',
      'PpCCCCCCPCCPCCCCpP',
      'PpCCCCCPCCCCPCCCpP',
      'PpCCCCCPCCCCCCCCpP',
      'PpCCCCCPCCPPCCCCpP',
      'PpCCCCCCPCCCPCCCpP',
      'PpCCCCCCCPPPCCCCpP',
      'PpCCCCCCCCCCCCCCpP',
      'PpCCCCCCCCCCCCCCpP',
      'PpCCCCCCCCCCCCCCpP',
      '.PpCCCCCCCCCCCCpP.',
      '.PpCCCCCCCCCCCCpP.',
      '.PpCCCCCCCCCCWCpP.',
      '..PpCCCCCCCCCCpP..',
      '..PpCCCCCCCCCCpP..',
      '...PppCCCCCCppP...',
      '....PPppppppPP....',
      '......PPPPPP......',
      '.....pppppppp.....',
    ], [
      '......PPPPPP......',
      '....PPppppppPP....',
      '...PppCCCCCCppP...',
      '..PpCCCCCCCCCCpP..',
      '..PpCCCCCCCCWCpP..',
      '.PpCCCCCCCCCCWCpP.',
      '.PpCCCCCCCCCCCCpP.',
      '.PpCCCCCCCCCCCCpP.',
      'PpCCCCCCCCCCCCCCpP',
      'PpCCCCCPPPCCCCCCpP',
      'PpCCCCPCCCPCCCCCpP',
      'PpCCCCCPPCCPCCCCpP',
      'PpCCCCCCCCCPCCCCpP',
      'PpCCCCPCCCCPCCCCpP',
      'PpCCCCCPCCPCCCCCpP',
      'PpCCCCCCPPCCCCCCpP',
      'PpCCCCCCCCCCCCCCpP',
      'PpCCCCCCCCCCCCCCpP',
      'PpCCCCCCCCCCCCCCpP',
      '.PpCCCCCCCCCCCCpP.',
      '.PpCCCCCCCCCCCCpP.',
      '.PpCWCCCCCCCCCCpP.',
      '..PpCCCCCCCCCCpP..',
      '..PpCCCCCCCCCCpP..',
      '...PppCCCCCCppP...',
      '....PPppppppPP....',
      '......PPPPPP......',
      '.....pppppppp.....',
    ]] },
  },

  /* --- 空を飛ぶもの（Chrome の恐竜ゲームの翼竜の代わり） --- */
  {
    id: 'drone', name: 'カメラドローン', w: 16, h: 10, fly: [6, 18, 38], breakable: true,
    sprite: { fps: 12, pixels: [[
      'KKKKK......KKKKK',
      '..s..........s..',
      '..s.ssssssss.s..',
      '..ssSSSSSSSSss..',
      '...sSSbbbbSSs...',
      '...sSbBWBbbSs...',
      '...sSSbbbbSSs...',
      '...sSSSSSSRSs...',
      '....ssssssss....',
      '................',
    ], [
      '..KKK......KKK..',
      '..s..........s..',
      '..s.ssssssss.s..',
      '..ssSSSSSSSSss..',
      '...sSSbbbbSSs...',
      '...sSbBWBbbSs...',
      '...sSSbbbbSSs...',
      '...sSSSSSSSSs...',
      '....ssssssss....',
      '................',
    ]] },
  },
  {
    id: 'menu', name: 'メニューUI', w: 22, h: 14, fly: [8, 20, 40], breakable: true, minMeter: 150,
    sprite: { pixels: [
      'pppppppppppppppppppppp',
      'pKKKKKKKKKKKKKKKKKKKKp',
      'pKWWWWWWKKKKKKKKKKRRKp',
      'pKKKKKKKKKKKKKKKKKKKKp',
      'pKBBBBKKBBBBKKBBBBKKKp',
      'pKBLLBKKBLLBKKBLLBKKKp',
      'pKBBBBKKBBBBKKBBBBKKKp',
      'pKKKKKKKKKKKKKKKKKKKKp',
      'pKBBBBKKBBBBKKBBBBKKKp',
      'pKBLLBKKBLLBKKBLLBKKKp',
      'pKBBBBKKBBBBKKBBBBKKKp',
      'pKKKKKKKKKKKKKKKKKKKKp',
      'pppppppppppppppppppppp',
      '..........pp..........',
    ] },
  },
  /* --- 天井から下がっているもの（スライディングでしかくぐれない。ふだんは壊せないが、急降下のあとのダッシュ切りなら切れる） --- */
  {
    id: 'screen', name: 'ビデオプレイヤーの画面', w: 34, h: 169, fly: [15], breakable: false, dashCut: true, minMeter: 120, weight: 0.9,
    hit: [3, 0, 28, 169],
    sprite: { pixels: drHangingPixels(34, [
      'KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK',
      'KbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbK',
      'KbBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBbK',
      'KbBLLBBBBBBBBBBBBBBBBBBBBBBBBBBBbK',
      'KbBLBBBBBBBBBBBWWBBBBBBBBBBBBBBBbK',
      'KbBBBBBBBBBBBBBWWWWBBBBBBBBBBBBBbK',
      'KbBBBBBBBBBBBBBWWWWWWBBBBBBBBBBBbK',
      'KbBBBBBBBBBBBBBWWWWBBBBBBBBBBBBBbK',
      'KbBBBBBBBBBBBBBWWBBBBBBBBBBBBBBBbK',
      'KbBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBbK',
      'KbBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBbK',
      'KbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbK',
      'KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK',
      'KSSRRRRRRRRRRRRRRSSSSSSSSSSSSSSSSK',
      'KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK',
    ], 'S') },
  },
  {
    id: 'banner', name: 'ワールドの垂れ幕', w: 22, h: 169, fly: [15], breakable: false, dashCut: true, minMeter: 300, weight: 0.8,
    hit: [2, 0, 18, 169],
    sprite: { pixels: drHangingPixels(22, [
      'ssssssssssssssssssssss',
      '.PPPPPPPPPPPPPPPPPPPP.',
      '.PppppppppppppppppppP.',
      '.PpWWWWpWWWWpWWWWWppP.',
      '.PpWppppWppWppppWpppP.',
      '.PpWWWppWWWWpppWppppP.',
      '.PppppppppppppppppppP.',
      '.PpCCCCCCCCCCCCCCCCpP.',
      '.PppppppppppppppppppP.',
      '..PppppppppppppppppP..',
      '...PpppppppppppppPP...',
      '....PPPPPPPPPPPPPP....',
    ], 'S') },
  },
  {
    id: 'nameplate', name: 'ネームプレート', w: 24, h: 8, fly: [8, 20, 40], breakable: true, minMeter: 300,
    sprite: { pixels: [
      '..KKKKKKKKKKKKKKKKKKKK..',
      '.KWWWWWWWWWWWWWWWWWWWWK.',
      'KWWGGWWKKWKKWKKKWKKWWWWK',
      'KWWGGWWWWWWWWWWWWWWWWWWK',
      '.KWWWWWWWWWWWWWWWWWWWWK.',
      '..KKKKKKKKKKKKKKKKKKKK..',
      '...........KK...........',
      '..........K..K..........',
    ] },
  },

  /* --- 落下穴（地面にあいた穴。ジャンプで飛び越す。動きは dinorun-config.js の「落下穴」）--- */
  { id: 'pit', name: '落下穴', w: 40, h: 32, fly: null, pit: true, breakable: false, minMeter: 200, weight: 0.7 },

  /* --- スキルを使わないと通れない区画の部品（ワールドの obstacles には書かない。dinorun.js の drSpawnGate() が出す）---
       上から下りているシャッター（gate_roof）の下に、壊せるかべ（gate_wall）がある。シャッターがあるのでジャンプで越えられない */
  {
    id: 'gate_roof', name: '下りているシャッター', w: 76, h: 154, fly: [30], breakable: false,
    hit: [0, 0, 76, 154],
    label: { text: 'SKILL!', y: 144, color: '#FFD84A' },
    sprite: { pixels: drGateRoofPixels(76, 154) },
  },
  {
    id: 'gate_wall', name: 'レンガのかべ', w: 12, h: 26, fly: null, breakable: true,
    hit: [0, 0, 12, 26],
    sprite: { pixels: drBrickPixels(12, 26) },
  },
];

/* -----------------------------------------------------
   ★拡張予定: ワールド（走った距離で順番に切り替わる。DR_CONFIG.worldLength m ごと）

   1件の書き方:
     {
       id: 'home',
       name: 'ホームワールド',            // ワールド移動の演出で出る名前
       sky: ['#9FD8FF', '#E8F6FF'],      // 空の色（上 → 下のグラデーション）
       far: { style: 'hills', color: '#8FCBEF', color2: '#B9E1F7' },
                                          // 遠くの景色（ゆっくり流れる）。style は
                                          //   'hills'（丘） / 'city'（ビルと窓） / 'stars'（星と月） / 'pillars'（柱） / 'none'
       ground: { style: 'grid', color: '#7BC96F', line: '#5DAE53' },
                                          // 地面。style は 'grid'（方眼） / 'tile'（市松模様） / 'stripe'（しま） / 'plain'（無地）
       bgImage: '',                      // （任意）遠くの景色を絵にするとき。横にくり返して流れる。高さ 216 ドットの PNG
       groundImage: '',                  // （任意）地面を絵にするとき。横にくり返して流れる。高さ 32 ドットの PNG
                                          //   どちらも minigame/ から見た場所（例: 'dinorun/worlds/home_bg.png'）。書くと style より優先
       obstacles: ['pedestal', 'drone'], // このワールドに出る障害物（DR_OBSTACLES の id）
       bgm: '',                          // （任意）このワールドで流す BGM（dinorun-config.js の DR_SOUNDS の id）
     }
   ★ 新しいワールドは、下の一覧の好きな位置に1件足す（並び順 = 出てくる順番）。
   ----------------------------------------------------- */
const DR_WORLDS = [
  {
    id: 'home', name: 'ホームワールド',
    sky: ['#9FD8FF', '#E8F6FF'],
    far: { style: 'hills', color: '#8FCBEF', color2: '#B9E1F7' },
    ground: { style: 'grid', color: '#7BC96F', line: '#5DAE53' },
    bgImage: '', groundImage: '',
    obstacles: ['pedestal', 'collider', 'penlight', 'drone', 'menu', 'screen', 'pit'],
    bgm: '',
  },
  {
    id: 'mirror', name: 'ミラーの部屋',
    sky: ['#D9D2F5', '#F6F2FF'],
    far: { style: 'pillars', color: '#BFB4E8', color2: '#E3DCFA' },
    ground: { style: 'tile', color: '#C9C2E6', line: '#A79ED2' },
    bgImage: '', groundImage: '',
    obstacles: ['mirror', 'collider', 'pedestal', 'drone', 'menu', 'screen', 'banner', 'pit'],
    bgm: '',
  },
  {
    id: 'night', name: '夜景ワールド',
    sky: ['#0E1438', '#3A3F7A'],
    far: { style: 'city', color: '#1E2453', color2: '#FFD84A' },
    ground: { style: 'stripe', color: '#2C3166', line: '#3B4280' },
    bgImage: '', groundImage: '',
    obstacles: ['penlight', 'portal', 'pedestal', 'drone', 'nameplate', 'banner', 'screen', 'pit'],
    bgm: '',
  },
  {
    id: 'portal', name: 'ポータルの間',
    sky: ['#2A0F4A', '#7A3FB0'],
    far: { style: 'stars', color: '#FFFFFF', color2: '#FFE9A8' },
    ground: { style: 'grid', color: '#4B2380', line: '#7FFFD4' },
    bgImage: '', groundImage: '',
    obstacles: ['portal', 'mirror', 'collider', 'menu', 'nameplate', 'drone', 'screen', 'banner', 'pit'],
    bgm: '',
  },
];

/* -----------------------------------------------------
   ★拡張予定: ボーナスステージの見た目（書き方は DR_WORLDS と同じ。obstacles はいらない）
     ボーナスチケットを買うと、次のワールドの前に入る。長さ・速さ・傾き・コインの数は dinorun-config.js の「ボーナスステージ」
     bgm に DR_SOUNDS の id を書けば、ボーナスステージだけの BGM にできる
   ----------------------------------------------------- */
const DR_BONUS_WORLD = {
  id: 'bonus', name: 'ボーナスステージ',
  sky: ['#FF9E5E', '#FFE7A8'],
  far: { style: 'hills', color: '#F7B267', color2: '#FFD6A0' },
  ground: { style: 'stripe', color: '#E8B04B', line: '#C98F2E' },
  bgImage: '', groundImage: '',
  bgm: '',
};

/* -----------------------------------------------------
   ★拡張予定: チュートリアル（ゲームを始めてから endMeter m のあいだ）
     ふつうの障害物・コインは出さず、下の steps を順番に出す。説明の文は画面の左上に出る（次の説明が出るまで）。
     最初のショップもここで出す（steps に shop: true がないと、チュートリアルのあいだショップは出ない）。
     チュートリアルをなくしたいときは、dinorun-config.js の tutorial を false にする。

   1件の書き方:
     {
       at: 8,                     // 何 m で出すか（画面の右から流れてくるので、自機に届くのは約 30m 先）
       obstacle: 'pedestal',      // （任意）出す障害物（DR_OBSTACLES の id）。天井から下がるもの・穴も使える
       lift: 23,                  // （任意）空を飛ぶ障害物の、地面からの高さ（書かなければ fly の最初の値）
       coins: 'arc',              // （任意）コインの並べ方
                                  //   'arc'    … 障害物の上に山なり（ちょうどいいジャンプで全部取れる）
                                  //   'ground' … 障害物の下の地面に1列（スライディングで取れる）
                                  //   'row'    … 地面に3枚（ショップの手前など）
                                  //   'under'  … 障害物の下を通る、走っている高さの1列（立ったまま走れば取れる）
       shop: true,                // （任意）ショップを出す
       title: 'ゲームの説明',      // （任意）説明のまどの見出し（書かなければ「ゲームの説明」）
       text: '...',               // 説明の文。\n で改行。{grazeCoin} {slideCoin} は、もらえるコインの数に置きかわる
     },
   ----------------------------------------------------- */
const DR_TUTORIAL = {
  endMeter: 270,
  steps: [
    { at: 8, obstacle: 'pedestal', coins: 'arc',
      text: 'ジャンプで障害物をよけよう！\n\nPC: ジャンプボタン or SPACEキー\nSP: ジャンプボタン' },
    // スレスレ：ドローンを、立っている自機の頭のすぐ上（すき間 3 ドット）に浮かべる。
    // コインの通りに（ジャンプせずに）走ると、ちょうどスレスレでくぐれてボーナスがもらえる
    { at: 58, obstacle: 'drone', lift: 23, coins: 'under',
      text: '障害物をスレスレでよけると、\nボーナスコインがもらえるよ！\nコインの通りに進んでみよう！\n\n+{grazeCoin}コイン' },
    { at: 108, obstacle: 'screen', coins: 'ground',
      text: '中には、スライディングでよける必要があるオブジェクトがあるよ！\n\nスライディングもぎりぎりでよけると、ボーナスコインがもらえるよ！\n+{slideCoin}コイン\n\nPC: スライディングボタン or ↓キー\nSP: スライディングボタン' },
    { at: 163, obstacle: 'pit', coins: 'arc',
      text: '穴にも注意！\nジャンプで飛び越えよう！' },
    { at: 213, coins: 'row', shop: true,
      text: 'ショップでいろんな強化ができるよ！\nいろんな能力を身に着けて、\n遠くまで行こう！' },
  ],
};

/* -----------------------------------------------------
   コインとショップアイコンの見た目（書き方は上の「絵の書き方」と同じ）
   ----------------------------------------------------- */
const DR_PICKUPS = {
  coin: {
    w: 8, h: 8,
    sprite: { fps: 8, pixels: [[
      '..yyyy..', '.yYYYYy.', 'yYYWYYYy', 'yYWYYYYy', 'yYYYYYYy', 'yYYYYYYy', '.yYYYYy.', '..yyyy..',
    ], [
      '...yy...', '..yYYy..', '..yWYy..', '..yYYy..', '..yYYy..', '..yYYy..', '..yYYy..', '...yy...',
    ], [
      '...yy...', '...yy...', '...yy...', '...yy...', '...yy...', '...yy...', '...yy...', '...yy...',
    ], [
      '...yy...', '..yYYy..', '..yYWy..', '..yYYy..', '..yYYy..', '..yYYy..', '..yYYy..', '...yy...',
    ]] },
  },
  shop: {
    w: 20, h: 18,
    sprite: { pixels: [
      'RRWWRRWWRRWWRRWWRRWW',
      'RRWWRRWWRRWWRRWWRRWW',
      'RRWWRRWWRRWWRRWWRRWW',
      '.RW..RW..RW..RW..RW.',
      '.s................s.',
      '.s.......yy.......s.',
      '.s.....yyYYyy.....s.',
      '.s....yYYYYYYy....s.',
      '.s....yYYyyYYy....s.',
      '.s....yYYyyyyy....s.',
      '.s....yyYYYYyy....s.',
      '.s....yyyyyYYy....s.',
      '.s....yYYyyYYy....s.',
      '.s....yYYYYYYy....s.',
      '.s.....yyYYyy.....s.',
      '.s.......yy.......s.',
      'ssssssssssssssssssss',
      'sSSSSSSSSSSSSSSSSSSs',
    ] },
  },
};
