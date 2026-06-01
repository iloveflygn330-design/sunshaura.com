/*
// アバターデータ  avatars.js

// アバターデータ　テンプレート====================================================//
// ★アバターを足すときは、ここのものを複製すること====================================================//

  my_avatarid = 'avatarAA'; // アバター識別子 基本的にはAAを連番にする
  my_Dic = DicBase + my_avatarid;
  {
    id:           my_avatarid,
    name:         'アバターネーム',
    genre:        '元ネタあり（別アバター）',     // 元ネタあり（別アバター）/ 元ネタあり（その他）/ 元ネタなし
    category:     'まめひなた',                  // まめひなた / フォシュニア / シャロ / その他

    mainImg:      my_Dic + '/thumbnail/main.png',   // アバターの立ち絵　投下画像
    miniImgPC:    defo_miniImgPC , // PC用サムネ（アスペクト比 2:1.5） デフォじゃないなら　'/thumbnail/mini_pc.png'
    miniImgSP:    defo_miniImgSP , // SP用サムネ（アスペクト比 1:1）　デフォじゃないなら　'/thumbnail/mini_sp.png'
    
    bgImg:        defo_bgImg,            // 背景画像（推奨: 1920×640px）　　デフォじゃないなら　'/bg.png'
    bgPattern:    defo_bgPattern ,       // 背景パターン（透過PNG・タイル繰り返し）　　デフォじゃないなら　'/pattern.png'
    frameCTop:    defo_frameCTop ,   // 枠C上（推奨: 1920×280px・透過PNG）　　デフォじゃないなら　'/frame_c_top.png'
    frameCBottom: defo_frameCBottom ,// 枠C下（推奨: 1920×280px・透過PNG）　　デフォじゃないなら　'/frame_c_bottom.png'
    infoImg:      defo_infoImg ,       // 情報枠の透かし画像（推奨: 1920×640px）　　デフォじゃないなら　'/info_bg.png'

    desc: 'テストアバター①の説明テキストです。詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文。',

    // ランダム表示用写真フォルダ内のファイル一覧
    photos: [
      my_Dic + 'photos/photo_01.png',
      my_Dic + 'photos/photo_02.png',
    ],

    // 使用アイテム（改変に使ったアイテムのリンク画像）
    orgAvt: [
      Item_Mamehinata,
      Item_foshunia,
      Item_charo
    ]
  },

*/

// =====================================================
// 変数エリア（アバター用画像）
// =====================================================
const DicBase = 'assets/images/'; // 画像格納フォルダ
const DicDefo = 'assets/images/ShareImg/'; // デフォルト画像格納フォルダ

//ジャンル
const genre_copy_avatar = '元ネタあり（別アバター）';
const genre_copy_game = '元ネタあり（その他）';
const genre_org = '元ネタなし';

//カテゴリ
const cate_mame = 'まめひなた';
const cate_foshu = 'フォシュニア';
const cate_chalo = 'シャロ';
const cate_other = 'その他';

//描写用画像
const defo_miniImgPC= DicDefo + 'mini_pc.png'
const defo_miniImgSP= DicDefo + 'mini_sp.png'

const defo_bgImg= DicDefo + 'bg.png'
const defo_bgPattern= DicDefo + 'pattern.png'
const defo_frameCTop= DicDefo + 'frame_c_top'
const defo_frameCBottom= DicDefo + 'frame_c_bottom.png'
const defo_infoImg= DicDefo + 'info_bg.png'

// =====================================================
// 変数エリア（リンク付き画像）
// =====================================================
const Item_Mamehinata = { img: DicBase + 'categories/mame_hinata.png', url: 'https://booth.pm/ja/items/4340548' };
const Item_foshunia = { img: DicBase + 'categories/charo.png', url: 'https://booth.pm/ja/items/4580093' };
const Item_charo = { img: DicBase + 'categories/foshunia.png', url: 'https://booth.pm/...' };

// =====================================================
// 変数エリア（使いまわし用変数　指定）
// =====================================================
let my_avatarid;
let my_Dic;

// =====================================================
// アバターデータ本体
// =====================================================
export default [

  /* ──────────────────────────────────────────
     テストアバター①
  ────────────────────────────────────────── */
  my_avatarid = 'avatar01'; // アバター識別子 基本的にはAAを連番にする
  my_Dic = DicBase + my_avatarid;
  {
    id:           my_avatarid,
    name:         'テストアバター①',
    genre:        '元ネタあり（別アバター）', // 元ネタあり（別アバター）/ 元ネタあり（その他）/ 元ネタなし
    category:     'まめひなた',               // まめひなた / フォシュニア / シャロ / その他

    mainImg:      my_Dic + '/thumbnail/main.png',
    miniImgPC:    my_Dic + '/thumbnail/mini_pc.png', // PC用サムネ（アスペクト比 2:1.5）
    miniImgSP:    my_Dic + '/thumbnail/mini_sp.png', // SP用サムネ（アスペクト比 1:1）

    bgImg:        my_Dic + '/bg.png',            // 背景画像（推奨: 1920×640px）
    bgPattern:    my_Dic + '/pattern.png',       // 背景パターン（透過PNG・タイル繰り返し）
    frameCTop:    my_Dic + '/frame_c_top.png',   // 枠C上（推奨: 1920×280px・透過PNG）
    frameCBottom: my_Dic + '/frame_c_bottom.png',// 枠C下（推奨: 1920×280px・透過PNG）
    infoImg:      my_Dic + '/info_bg.png',       // 情報枠の透かし画像（推奨: 1920×640px）

    desc: 'テストアバター①の説明テキストです。詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文。',

    // ランダム表示用写真フォルダ内のファイル一覧
    photos: [
      P01 + 'photos/photo_01.png',
      P01 + 'photos/photo_02.png',
    ],

    // 使用アイテム（改変に使ったアイテムのリンク画像）
    orgAvt: [
      Item_Mamehinata,
      Item_Mamehinata,
      Item_Mamehinata,
    ]
  },

  /* ──────────────────────────────────────────
     テストアバター②
  ────────────────────────────────────────── */
  my_avatarid = 'avatar02'; // アバター識別子 基本的にはAAを連番にする
  my_Dic = DicBase + my_avatarid;
  {
    id:           my_avatarid,
    name:         'テストアバター①',
    genre:        '元ネタあり（別アバター）', // 元ネタあり（別アバター）/ 元ネタあり（その他）/ 元ネタなし
    category:     'まめひなた',               // まめひなた / フォシュニア / シャロ / その他

    mainImg:      my_Dic + '/thumbnail/main.png',
    miniImgPC:    my_Dic + '/thumbnail/mini_pc.png', // PC用サムネ（アスペクト比 2:1.5）
    miniImgSP:    my_Dic + '/thumbnail/mini_sp.png', // SP用サムネ（アスペクト比 1:1）

    bgImg:        my_Dic + '/bg.png',            // 背景画像（推奨: 1920×640px）
    bgPattern:    my_Dic + '/pattern.png',       // 背景パターン（透過PNG・タイル繰り返し）
    frameCTop:    my_Dic + '/frame_c_top.png',   // 枠C上（推奨: 1920×280px・透過PNG）
    frameCBottom: my_Dic + '/frame_c_bottom.png',// 枠C下（推奨: 1920×280px・透過PNG）
    infoImg:      my_Dic + '/info_bg.png',       // 情報枠の透かし画像（推奨: 1920×640px）

    desc: 'テストアバター①の説明テキストです。詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文。',

    // ランダム表示用写真フォルダ内のファイル一覧
    photos: [
      P01 + 'photos/photo_01.png',
      P01 + 'photos/photo_02.png',
    ],

    // 使用アイテム（改変に使ったアイテムのリンク画像）
    orgAvt: [
      Item_Mamehinata,
      Item_Mamehinata,
      Item_Mamehinata,
    ]
  },

  /* ──────────────────────────────────────────
     テストアバター③
  ────────────────────────────────────────── */
  my_avatarid = 'avatar03'; // アバター識別子 基本的にはAAを連番にする
  my_Dic = DicBase + my_avatarid;
  {
    id:           my_avatarid,
    name:         'テストアバター①',
    genre:        '元ネタあり（別アバター）', // 元ネタあり（別アバター）/ 元ネタあり（その他）/ 元ネタなし
    category:     'まめひなた',               // まめひなた / フォシュニア / シャロ / その他

    mainImg:      my_Dic + '/thumbnail/main.png',
    miniImgPC:    my_Dic + '/thumbnail/mini_pc.png', // PC用サムネ（アスペクト比 2:1.5）
    miniImgSP:    my_Dic + '/thumbnail/mini_sp.png', // SP用サムネ（アスペクト比 1:1）

    bgImg:        my_Dic + '/bg.png',            // 背景画像（推奨: 1920×640px）
    bgPattern:    my_Dic + '/pattern.png',       // 背景パターン（透過PNG・タイル繰り返し）
    frameCTop:    my_Dic + '/frame_c_top.png',   // 枠C上（推奨: 1920×280px・透過PNG）
    frameCBottom: my_Dic + '/frame_c_bottom.png',// 枠C下（推奨: 1920×280px・透過PNG）
    infoImg:      my_Dic + '/info_bg.png',       // 情報枠の透かし画像（推奨: 1920×640px）

    desc: 'テストアバター①の説明テキストです。詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文。',

    // ランダム表示用写真フォルダ内のファイル一覧
    photos: [
      P01 + 'photos/photo_01.png',
      P01 + 'photos/photo_02.png',
    ],

    // 使用アイテム（改変に使ったアイテムのリンク画像）
    orgAvt: [
      Item_Mamehinata,
      Item_Mamehinata,
      Item_Mamehinata,
    ]
  },

  /* ──────────────────────────────────────────
     テストアバター④
  ────────────────────────────────────────── */
  my_avatarid = 'avatar04'; // アバター識別子 基本的にはAAを連番にする
  my_Dic = DicBase + my_avatarid;
  {
    id:           my_avatarid,
    name:         'テストアバター①',
    genre:        '元ネタあり（別アバター）', // 元ネタあり（別アバター）/ 元ネタあり（その他）/ 元ネタなし
    category:     'まめひなた',               // まめひなた / フォシュニア / シャロ / その他

    mainImg:      my_Dic + '/thumbnail/main.png',
    miniImgPC:    my_Dic + '/thumbnail/mini_pc.png', // PC用サムネ（アスペクト比 2:1.5）
    miniImgSP:    my_Dic + '/thumbnail/mini_sp.png', // SP用サムネ（アスペクト比 1:1）

    bgImg:        my_Dic + '/bg.png',            // 背景画像（推奨: 1920×640px）
    bgPattern:    my_Dic + '/pattern.png',       // 背景パターン（透過PNG・タイル繰り返し）
    frameCTop:    my_Dic + '/frame_c_top.png',   // 枠C上（推奨: 1920×280px・透過PNG）
    frameCBottom: my_Dic + '/frame_c_bottom.png',// 枠C下（推奨: 1920×280px・透過PNG）
    infoImg:      my_Dic + '/info_bg.png',       // 情報枠の透かし画像（推奨: 1920×640px）

    desc: 'テストアバター①の説明テキストです。詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文。',

    // ランダム表示用写真フォルダ内のファイル一覧
    photos: [
      P01 + 'photos/photo_01.png',
      P01 + 'photos/photo_02.png',
    ],

    // 使用アイテム（改変に使ったアイテムのリンク画像）
    orgAvt: [
      Item_Mamehinata,
      Item_Mamehinata,
      Item_Mamehinata,
    ]
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
