// =====================================================
// アバターデータ  avatars.js
//
// ★ アバターを追加する手順
//   1. 「アバターデータ本体」セクションに
//      my_avatarid と _avatars.push({...}) を追記
//   2. assets/images/avatarAA/ に対応する画像を配置
//   3. HTML・index.js は変更不要
// =====================================================

// アバターデータ　テンプレート ================================================
// ★ アバターを足すときは、ここのものを複製すること
/*
  my_avatarid = 'avatarAA';          // ← AA を連番にする
  my_Dic      = DicBase + my_avatarid;
  _avatars.push({
    id:           my_avatarid,
    name:         'アバターネーム',
    genre:        genre_copy_avatar,   // 下の定数から選ぶ
    category:     cate_mame,           // 下の定数から選ぶ

    mainImg:      my_Dic + '/thumbnail/main.png',
    miniImgPC:    defo_miniImgPC,      // 個別にするなら my_Dic + '/thumbnail/mini_pc.png'
    miniImgSP:    defo_miniImgSP,      // 個別にするなら my_Dic + '/thumbnail/mini_sp.png'

    bgImg:        defo_bgImg,          // 個別にするなら my_Dic + '/bg.png'
    bgPattern:    defo_bgPattern,      // 個別にするなら my_Dic + '/pattern.png'
    frameCTop:    defo_frameCTop,      // 個別にするなら my_Dic + '/frame_c_top.png'
    frameCBottom: defo_frameCBottom,   // 個別にするなら my_Dic + '/frame_c_bottom.png'
    infoImg:      defo_infoImg,        // 個別にするなら my_Dic + '/info_bg.png'

    desc: '説明テキスト',

    photos: [
      my_Dic + '/photos/photo_01.png',
      my_Dic + '/photos/photo_02.png',
    ],

    orgAvt: [
      Item_Mamehinata,
      Item_foshunia,
    ]
  });
*/
// ============================================================ テンプレートここまで


// =====================================================
// 定数エリア：パス
// =====================================================
const DicBase = 'assets/images/';          // 画像格納ベースフォルダ
const DicDefo = 'assets/images/ShareImg/'; // デフォルト共有画像フォルダ


// =====================================================
// 定数エリア：ジャンル
// =====================================================
const genre_copy_avatar = '元ネタあり（別アバター）';
const genre_copy_game   = '元ネタあり（その他）';
const genre_org         = '元ネタなし';


// =====================================================
// 定数エリア：カテゴリ
// =====================================================
const cate_mame  = 'まめひなた';
const cate_foshu = 'フォシュニア';
const cate_chalo = 'シャロ';
const cate_other = 'その他';


// =====================================================
// 定数エリア：デフォルト画像（共有）
// =====================================================
const defo_miniImgPC    = DicDefo + 'mini_pc.png';
const defo_miniImgSP    = DicDefo + 'mini_sp.png';
const defo_bgImg        = DicDefo + 'bg.png';
const defo_bgPattern    = DicDefo + 'pattern.png';
const defo_frameCTop    = DicDefo + 'frame_c_top.png';    // ★ .png 追加
const defo_frameCBottom = DicDefo + 'frame_c_bottom.png';
const defo_infoImg      = DicDefo + 'info_bg.png';


// =====================================================
// 定数エリア：リンク付きアイテム画像
// ★ 複数アバターで使い回せます
// =====================================================
const Item_Mamehinata = { img: DicBase + 'categories/mame_hinata.png', url: 'https://booth.pm/ja/items/4340548' };
const Item_foshunia   = { img: DicBase + 'categories/foshunya.png',    url: 'https://booth.pm/ja/items/4580093' };
const Item_charo      = { img: DicBase + 'categories/sharo.png',       url: 'https://booth.pm/...' };


// =====================================================
// 変数エリア：使いまわし用（アバターごとに上書き）
// =====================================================
let my_avatarid; // アバター識別子
let my_Dic;      // そのアバターの画像フォルダパス


// =====================================================
// アバターデータ本体
// ★ アバターを追加する場合は以下に push を追記するだけ
// =====================================================
const _avatars = [];


/* ──────────────────────────────────────────
   テストアバター①
────────────────────────────────────────── */
my_avatarid = 'avatar01';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'テストアバター①',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

  bgImg:        my_Dic + '/bg.png',
  bgPattern:    my_Dic + '/pattern.png',
  frameCTop:    my_Dic + '/frame_c_top.png',
  frameCBottom: my_Dic + '/frame_c_bottom.png',
  infoImg:      my_Dic + '/info_bg.png',

  desc: 'テストアバター①の説明テキストです。詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文。',

  photos: [
    my_Dic + '/photos/photo_01.png',
    my_Dic + '/photos/photo_02.png',
  ],

  orgAvt: [
    Item_Mamehinata,
    Item_foshunia,
    Item_charo,
  ]
});


/* ──────────────────────────────────────────
   テストアバター②
────────────────────────────────────────── */
my_avatarid = 'avatar02';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'テストアバター②',
  genre:        genre_copy_game,
  category:     cate_foshu,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

  bgImg:        defo_bgImg,       // ← デフォルト共有画像を使用
  bgPattern:    defo_bgPattern,
  frameCTop:    my_Dic + '/frame_c_top.png',
  frameCBottom: my_Dic + '/frame_c_bottom.png',
  infoImg:      defo_infoImg,     // ← デフォルト共有画像を使用

  desc: 'テストアバター②の説明テキストです。詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文。',

  photos: [
    my_Dic + '/photos/photo_01.png',
  ],

  orgAvt: [
    Item_foshunia,
  ]
});


/* ──────────────────────────────────────────
   テストアバター③
────────────────────────────────────────── */
my_avatarid = 'avatar03';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'テストアバター③',
  genre:        genre_org,
  category:     cate_chalo,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

  bgImg:        my_Dic + '/bg.png',
  bgPattern:    my_Dic + '/pattern.png',
  frameCTop:    my_Dic + '/frame_c_top.png',
  frameCBottom: my_Dic + '/frame_c_bottom.png',
  infoImg:      my_Dic + '/info_bg.png',

  desc: 'テストアバター③の説明テキストです。詳細文詳細文詳細文詳細文詳細文詳細文。',

  photos: [
    my_Dic + '/photos/photo_01.png',
    my_Dic + '/photos/photo_02.png',
    my_Dic + '/photos/photo_03.png',
  ],

  orgAvt: [
    Item_Mamehinata,
    Item_foshunia,
    Item_charo,
    Item_Mamehinata,  // 同じアイテムを複数入れることも可能
  ]
});


/* ──────────────────────────────────────────
   テストアバター④
────────────────────────────────────────── */
my_avatarid = 'avatar04';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'テストアバター④',
  genre:        genre_copy_avatar,
  category:     cate_other,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

  bgImg:        my_Dic + '/bg.png',
  bgPattern:    defo_bgPattern,   // ← デフォルト共有画像を使用
  frameCTop:    my_Dic + '/frame_c_top.png',
  frameCBottom: my_Dic + '/frame_c_bottom.png',
  infoImg:      my_Dic + '/info_bg.png',

  desc: 'テストアバター④の説明テキストです。詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文詳細文。',

  photos: [],

  orgAvt: []
});


// ★ アバターを追加する場合はここに追記
// my_avatarid = 'avatar05';
// my_Dic      = DicBase + my_avatarid;
// _avatars.push({ ... });


export default _avatars;
