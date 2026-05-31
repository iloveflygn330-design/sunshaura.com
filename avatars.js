// =====================================================
// アバターデータ  avatars.js
//
// ★ アバターを追加する手順
//   1. 必要なら下の「共有リソース」に変数を追加
//   2. このファイルの末尾（]の手前）にエントリを追記
//   3. assets/images/ に対応する画像を配置
//   4. HTML・JS は変更不要
// =====================================================

// ── 共有リソース（複数アバターで使い回す画像を変数化）────────────
// ★ここに追加すればどのアバターからでも参照できます

// const SHARED_BG      = 'assets/images/shared/background.png';
// const SHARED_PATTERN = 'assets/images/shared/pattern.png';

// ── 各アバターのベースパス（アバターごとに定義）─────────────────
// ★ 新しいアバターを追加するときはここにも追記してください
const P01 = 'assets/images/avatar01/'; // テストアバター①
const P02 = 'assets/images/avatar02/'; // テストアバター②
const P03 = 'assets/images/avatar03/'; // テストアバター③
const P04 = 'assets/images/avatar04/'; // テストアバター④


// =====================================================
// アバターデータ本体
// =====================================================
export default [

  /* ──────────────────────────────────────────
     テストアバター①
  ────────────────────────────────────────── */
  {
    id:           'avatar_01',
    name:         'テストアバター①',
    genre:        '元ネタあり（別アバター）', // 元ネタあり（別アバター）/ 元ネタあり（その他）/ 元ネタなし
    category:     'まめひなた',               // まめひなた / フォシュニア / シャロ / その他

    mainImg:      P01 + 'thumbnail/main.png',
    miniImgPC:    P01 + 'thumbnail/mini_pc.png', // PC用サムネ（アスペクト比 2:1.5）
    miniImgSP:    P01 + 'thumbnail/mini_sp.png', // SP用サムネ（アスペクト比 1:1）

    bgImg:        P01 + 'bg.png',            // 背景画像（推奨: 1920×640px）
    bgPattern:    P01 + 'pattern.png',       // 背景パターン（透過PNG・タイル繰り返し）
    frameCTop:    P01 + 'frame_c_top.png',   // 枠C上（推奨: 1920×280px・透過PNG）
    frameCBottom: P01 + 'frame_c_bottom.png',// 枠C下（推奨: 1920×280px・透過PNG）
    infoImg:      P01 + 'info_bg.png',       // 情報枠の透かし画像（推奨: 1920×640px）

    desc: 'テストアバター①の説明テキストです。詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文。',

    // ランダム表示用写真フォルダ内のファイル一覧
    photos: [
      P01 + 'photos/photo_01.png',
      P01 + 'photos/photo_02.png',
    ],

    // 使用アイテム（改変に使ったアイテムのリンク画像）
    orgAvt: [
      { img: P01 + 'refs/ref_01.png', url: 'https://example.com/item1' },
      { img: P01 + 'refs/ref_02.png', url: 'https://example.com/item2' },
      { img: P01 + 'refs/ref_03.png', url: 'https://example.com/item3' },
    ]
  },

  /* ──────────────────────────────────────────
     テストアバター②
  ────────────────────────────────────────── */
  {
    id:           'avatar_02',
    name:         'テストアバター②',
    genre:        '元ネタあり（その他）',
    category:     'フォシュニア',

    mainImg:      P02 + 'thumbnail/main.png',
    miniImgPC:    P02 + 'thumbnail/mini_pc.png',
    miniImgSP:    P02 + 'thumbnail/mini_sp.png',

    bgImg:        P02 + 'bg.png',
    bgPattern:    '',                        // 空文字 = パターンなし
    frameCTop:    P02 + 'frame_c_top.png',
    frameCBottom: P02 + 'frame_c_bottom.png',
    infoImg:      P02 + 'info_bg.png',

    desc: 'テストアバター②の説明テキストです。詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文。',

    photos: [
      P02 + 'photos/photo_01.png',
    ],

    orgAvt: [
      { img: P02 + 'refs/ref_01.png', url: 'https://example.com/item4' },
    ]
  },

  /* ──────────────────────────────────────────
     テストアバター③
  ────────────────────────────────────────── */
  {
    id:           'avatar_03',
    name:         'テストアバター③',
    genre:        '元ネタなし',
    category:     'シャロ',

    mainImg:      P03 + 'thumbnail/main.png',
    miniImgPC:    P03 + 'thumbnail/mini_pc.png',
    miniImgSP:    P03 + 'thumbnail/mini_sp.png',

    bgImg:        P03 + 'bg.png',
    bgPattern:    P03 + 'pattern.png',
    frameCTop:    P03 + 'frame_c_top.png',
    frameCBottom: P03 + 'frame_c_bottom.png',
    infoImg:      P03 + 'info_bg.png',

    desc: 'テストアバター③の説明テキストです。詳細文詳細文詳細文詳細文詳細文詳細文。',

    photos: [],

    orgAvt: [
      { img: P03 + 'refs/ref_01.png', url: 'https://example.com/item5' },
      { img: P03 + 'refs/ref_02.png', url: 'https://example.com/item6' },
      { img: P03 + 'refs/ref_03.png', url: 'https://example.com/item7' },
      { img: P03 + 'refs/ref_04.png', url: 'https://example.com/item8' },
    ]
  },

  /* ──────────────────────────────────────────
     テストアバター④
  ────────────────────────────────────────── */
  {
    id:           'avatar_04',
    name:         'テストアバター④',
    genre:        '元ネタあり（別アバター）',
    category:     'その他',

    mainImg:      P04 + 'thumbnail/main.png',
    miniImgPC:    P04 + 'thumbnail/mini_pc.png',
    miniImgSP:    P04 + 'thumbnail/mini_sp.png',

    bgImg:        P04 + 'bg.png',
    bgPattern:    P04 + 'pattern.png',
    frameCTop:    P04 + 'frame_c_top.png',
    frameCBottom: P04 + 'frame_c_bottom.png',
    infoImg:      P04 + 'info_bg.png',

    desc: 'テストアバター④の説明テキストです。詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文。',

    photos: [
      P04 + 'photos/photo_01.png',
    ],

    orgAvt: []
  },

  // ★ アバターを追加する場合はここに追記
  // {
  //   id:       'avatar_05',
  //   name:     'アバター名',
  //   genre:    '元ネタなし',
  //   category: 'まめひなた',
  //   ...
  // },

];
