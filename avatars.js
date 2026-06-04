// =====================================================
// アバターデータ  avatars.js
// avatar_form.html から自動生成
// 生成日時: 2026/6/5 0:23:26  /  3件
// =====================================================

// アバターデータ　テンプレート ================================================
// ★ アバターを足すときは、ここのものを複製すること
/*
  my_avatarid = 'avatarAA';
  my_Dic      = DicBase + my_avatarid;
  _avatars.push({
    id:           my_avatarid,
    name:         'アバターネーム',
    genre:        genre_copy_avatar,
    category:     cate_mame,
    mainImg:      my_Dic + '/thumbnail/main.png',
    miniImgPC:    defo_miniImgPC,
    miniImgSP:    defo_miniImgSP,
    bgImg:        defo_bgImg,
    bgPattern:    defo_bgPattern,
    frameCTop:    defo_frameCTop,
    frameCBottom: defo_frameCBottom,
    infoImg:      defo_infoImg,
    desc: '説明テキスト',
    photos: [],
    orgAvt: [ Item_Mamehinata ]
  });
*/


// =====================================================
// 定数エリア：パス
// =====================================================
const DicBase = 'assets/images/';
const DicDefo = 'assets/images/ShareImg/';


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
const cate_ruri  = '凪夜瑠璃';
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
const defo_frameCTop    = DicDefo + 'frame_c_top.png';
const defo_frameCBottom = DicDefo + 'frame_c_bottom.png';
const defo_infoImg      = DicDefo + 'info_bg.png';


// =====================================================
// 定数エリア：リンク付きアイテム画像
// =====================================================
const Item_Mamehinata = { img: DicBase + 'categories/mame_hinata.png', url: 'https://booth.pm/ja/items/4340548' };
const Item_foshunia   = { img: DicBase + 'categories/foshunya.png',    url: 'https://booth.pm/ja/items/4580093' };
const Item_charo      = { img: DicBase + 'categories/sharo.png',       url: 'https://booth.pm/...' };


// =====================================================
// 変数エリア：使いまわし用
// =====================================================
let my_avatarid;
let my_Dic;


// =====================================================
// アバターデータ本体
// =====================================================
const _avatars = [];

/* ─── 看板ネコ ─── */
my_avatarid = '1010';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '看板ネコ',
  genre:        genre_org,
  category:     cate_other,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    defo_miniImgPC,
  miniImgSP:    defo_miniImgSP,

  bgImg:        defo_bgImg,
  bgPattern:    defo_bgPattern,
  frameCTop:    defo_frameCTop,
  frameCBottom: defo_frameCBottom,
  infoImg:      defo_infoImg,

  desc: '初めて改変したアバター
無言勢で生きるため、コミュニケpションように8種の言葉が書かれた看板を持っている',

  photos: [],

  orgAvt: []
});

/* ─── test ─── */
my_avatarid = 'vrchat_20260307_004043964_1920x1080';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'test',
  genre:        genre_org,
  category:     cate_other,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    defo_miniImgPC,
  miniImgSP:    defo_miniImgSP,

  bgImg:        defo_bgImg,
  bgPattern:    defo_bgPattern,
  frameCTop:    defo_frameCTop,
  frameCBottom: defo_frameCBottom,
  infoImg:      defo_infoImg,

  desc: 'アバターの説明テキスト。',

  photos: [],

  orgAvt: []
});

/* ─── test ─── */
my_avatarid = 'vrchat_20260315_021642369_1080x1920';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'test',
  genre:        genre_org,
  category:     cate_other,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    defo_miniImgPC,
  miniImgSP:    defo_miniImgSP,

  bgImg:        defo_bgImg,
  bgPattern:    defo_bgPattern,
  frameCTop:    defo_frameCTop,
  frameCBottom: defo_frameCBottom,
  infoImg:      defo_infoImg,

  desc: 'tset',

  photos: [],

  orgAvt: []
});

// ★ アバターを追加する場合はここに追記


export default _avatars;
