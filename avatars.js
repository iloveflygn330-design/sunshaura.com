// =====================================================
// アバターデータ  avatars.js
// avatar_form.html から自動生成
// 生成日時: 2026/6/5 19:18:22  /  5件
// =====================================================

// テンプレート ========================================================
/*
  my_avatarid = 'avatarAA';
  my_Dic      = DicBase + my_avatarid;
  _avatars.push({
    id: my_avatarid, name: 'アバターネーム',
    genre: genre_copy_avatar, category: cate_mame,
    mainImg:      my_Dic + '/thumbnail/main.png',
    miniImgPC:    defo_miniImgPC,  miniImgSP: defo_miniImgSP,
    bgImg:        defo_bgImg,      bgPattern: defo_bgPattern,
    frameCTop:    defo_frameCTop,  frameCBottom: defo_frameCBottom,
    infoImg:      defo_infoImg,
    desc: '説明テキスト\n改行もできます',
    photos: [ my_Dic + '/photos/photo_01.png' ],
    orgAvt: [ { img: my_Dic + '/thumbnail/ref_01.png', url: 'https://...' } ]
  });
*/


// =====================================================
// 定数：パス
// =====================================================
const DicBase = 'assets/images/';
const DicDefo = 'assets/images/ShareImg/';


// =====================================================
// 定数：ジャンル
// =====================================================
const genre_copy_avatar = '元ネタあり（別アバター）';
const genre_copy_game   = '元ネタあり（その他）';
const genre_org         = '元ネタなし';


// =====================================================
// 定数：カテゴリ
// =====================================================
const cate_mame  = 'まめひなた';
const cate_ruri  = '凪夜瑠璃';
const cate_foshu = 'フォシュニア';
const cate_chalo = 'シャロ';
const cate_other = 'その他';


// =====================================================
// 定数：デフォルト画像（共有）
// =====================================================
const defo_miniImgPC    = DicDefo + 'mini_pc.png';
const defo_miniImgSP    = DicDefo + 'mini_sp.png';
const defo_bgImg        = DicDefo + 'bg.png';
const defo_bgPattern    = DicDefo + 'pattern.png';
const defo_frameCTop    = DicDefo + 'frame_c_top.png';
const defo_frameCBottom = DicDefo + 'frame_c_bottom.png';
const defo_infoImg      = DicDefo + 'info_bg.png';


// =====================================================
// 定数：リンク付きアイテム
// =====================================================
const Item_Mamehinata = { img: DicBase + 'categories/mame_hinata.png', url: 'https://booth.pm/ja/items/4340548' };
const Item_foshunia   = { img: DicBase + 'categories/foshunya.png',    url: 'https://booth.pm/ja/items/4580093' };
const Item_charo      = { img: DicBase + 'categories/sharo.png',       url: 'https://booth.pm/...' };


// =====================================================
// 変数：使いまわし用
// =====================================================
let my_avatarid;
let my_Dic;


// =====================================================
// アバターデータ本体
// =====================================================
const _avatars = [];

/* ─── 次のアバター ─── */
my_avatarid = '1010';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '看板ネコtest',
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

  desc: '初めて改変したアバター\n無言勢で生きるため、コミュニケpションように8種の言葉が書かれた看板を持っている',

  photos: [],

  orgAvt: []
});

/* ─── 次のアバター ─── */
my_avatarid = '4000_QuestHinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'クエスト対応まめひなた',
  genre:        genre_org,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    defo_miniImgPC,
  miniImgSP:    defo_miniImgSP,

  bgImg:        defo_bgImg,
  bgPattern:    defo_bgPattern,
  frameCTop:    defo_frameCTop,
  frameCBottom: defo_frameCBottom,
  infoImg:      defo_infoImg,

  desc: 'クエスト対応の仕様を知った頃。\nそれぞれのアバターをクエスト対応するの大変だな～って思って、クエストアバターを一律で設定できるアバターを用意しよう、ってこうなった。\n謝らせてごめん。',

  photos: [],

  orgAvt: [
    Item_Mamehinata,
  ]
});

/* ─── 次のアバター ─── */
my_avatarid = '6010_Zudanoko';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ヒトノコずんだもん',
  genre:        genre_copy_game,
  category:     cate_other,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    defo_miniImgPC,
  miniImgSP:    defo_miniImgSP,

  bgImg:        my_Dic + '/bg.png',
  bgPattern:    defo_bgPattern,
  frameCTop:    defo_frameCTop,
  frameCBottom: defo_frameCBottom,
  infoImg:      defo_infoImg,

  desc: 'ヒトノコを頻繁に使っていたころ、\nずんだもん集会に参加にあわせてした改変。',

  photos: [],

  orgAvt: [
    { img: my_Dic + '/thumbnail/ref_01.png', url: 'https://uri880.booth.pm/items/4717337' },
  ]
});

/* ─── 次のアバター ─── */
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

/* ─── 次のアバター ─── */
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
