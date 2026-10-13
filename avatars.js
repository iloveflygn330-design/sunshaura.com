// =====================================================
// アバターデータ  avatars.js
// avatar_form.html から自動生成
// 生成日時: 2026/10/13 23:42:20  /  144件
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
my_avatarid = '1010_akahinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '赤まめひなた',
  genre:        genre_org,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

  bgImg:        DicBase + 'ShareImg_bg/red.png',
  bgPattern:    DicBase + 'ShareImg_pattern/pattern.png',
  frameCTop:    DicBase + 'ShareImg_frame/frame_c_top_cir.png',
  frameCBottom: DicBase + 'ShareImg_frame/frame_c_bottom_cir.png',
  infoImg:      defo_infoImg,

  desc: 'パブリックで見かけるまめひなたがひたすらかわいくて、耐え切れず購入。\nせっかくなら自分好みの要素を入れたくて、赤色や海の要素を入れた。',

  photos: [],

  orgAvt: [
    Item_Mamehinata,
  ]
});

/* ─── 次のアバター ─── */
my_avatarid = '1020_momohinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '桃まめひなた',
  genre:        genre_org,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

  bgImg:        DicBase + 'ShareImg_bg/pink.png',
  bgPattern:    DicBase + 'ShareImg_pattern/pattern.png',
  frameCTop:    DicBase + 'ShareImg_frame/frame_c_top_cir.png',
  frameCBottom: DicBase + 'ShareImg_frame/frame_c_bottom_cir.png',
  infoImg:      defo_infoImg,

  desc: '赤色改変しているときに、通りがかった桃色がかわいくて、似合いそうだな～って勢いで改変した。\nかわいい色になって気に入っている。',

  photos: [],

  orgAvt: [
    Item_Mamehinata,
  ]
});

/* ─── 次のアバター ─── */
my_avatarid = '1030_shiroHinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '白まめひなた',
  genre:        genre_org,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

  bgImg:        DicBase + 'ShareImg_bg/purple.png',
  bgPattern:    DicBase + 'ShareImg_pattern/hobagi.png',
  bgPatternSize: '',
  frameCTop:    DicBase + 'ShareImg_frame/frame_c_top_6.png',
  frameCBottom: DicBase + 'ShareImg_frame/frame_c_bottom_6.png',
  infoImg:      defo_infoImg,

  nameStyle:    { color: 'white', shadow: true, outline: false },
  descStyle:    { color: 'white', shadow: false, outline: false },

  desc: 'ハロウィンの時期に、「まめひなた集会」なるものが存在することを認知。\n赤・桃と続けて改変をして、色をテーマにしようとこの頃は意気込んでいた。\nお化けって白色のイメージあるな、白基調かな。\n一見黒基調だけど、中身が白系っていいかもしれないな、よし。',

  photos: [],

  orgAvt: [
    Item_Mamehinata,
  ]
});

/* ─── 次のアバター ─── */
my_avatarid = '1040_neruHinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '寝るひなた',
  genre:        genre_org,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

  bgImg:        defo_bgImg,
  bgPattern:    defo_bgPattern,
  frameCTop:    DicBase + 'ShareImg_frame/frame_c_top_cir.png',
  frameCBottom: DicBase + 'ShareImg_frame/frame_c_bottom_cir.png',
  infoImg:      defo_infoImg,

  desc: 'フレンドからV眠に誘われるようになってきた。\n当時は寝方を知らず、「die」モーションで何とかしていた。\nほどなくごろ寝システムを教えてもらい、組み込むにあたって、「寝る」をテーマにした改変をした。',

  photos: [],

  orgAvt: [
    Item_Mamehinata,
  ]
});

/* ─── 次のアバター ─── */
my_avatarid = '1050_Torofinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'トロフィなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

  bgImg:        DicBase + 'ShareImg_bg/yellow.png',
  bgPattern:    DicBase + 'ShareImg_pattern/spana.png',
  frameCTop:    defo_frameCTop,
  frameCBottom: defo_frameCBottom,
  infoImg:      defo_infoImg,

  desc: 'この頃仲良くしていたフレンドに、何かサプライズがしたいな～と考えてたところ。\nまめひなたに心酔してまめひなたしか使いたくない病を発症しつつほかのアバターも使いたいなと思っていたころに、（まめひなたで、フレンドがよく使うアバターのコスプレ改変をすれば、良いとこどりで結構いいのでは？）とを思案。\n存外いい感じになり、コスプレ改変にハマるきっかけになった。',

  photos: [],

  orgAvt: [
    Item_Mamehinata,
    { img: my_Dic + '/thumbnail/ref_01.png', url: 'https://booth.pm/ja/items/3145167' },
  ]
});

/* ─── 次のアバター ─── */
my_avatarid = '1060_hitonokohinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ヒトノコひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

  bgImg:        DicBase + 'ShareImg_bg/water.png',
  bgPattern:    defo_bgPattern,
  frameCTop:    DicBase + 'ShareImg_frame/frame_c_top_6.png',
  frameCBottom: DicBase + 'ShareImg_frame/frame_c_bottom_6.png',
  infoImg:      defo_infoImg,

  desc: 'まめひなたの前に一番気に入っていたヒトノコちゃん。\nまめひなたしか使いたくない病を患って使用機会が減っていたが、トロフィエひなたが上手くいったことで、ヒトノコでも同じことができそうと着手。\nかわいいアバターを組み合わせたらかわいくなるので良い。',

  photos: [],

  orgAvt: [
    Item_Mamehinata,
    { img: my_Dic + '/thumbnail/ref_01.png', url: 'https://uri880.booth.pm/items/4717337' },
  ]
});

/* ─── 次のアバター ─── */
my_avatarid = '1070_VketHinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'Vケットひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

  bgImg:        DicBase + 'ShareImg_bg/yellow.png',
  bgPattern:    DicBase + 'ShareImg_pattern/spana.png',
  frameCTop:    defo_frameCTop,
  frameCBottom: defo_frameCBottom,
  infoImg:      defo_infoImg,

  desc: 'Vketに興味を持っていろいろ調べていたら、Vketにゃんというすごくかわいいキャラクターがいることを認知。しかも０円？！もうすぐVketが開催するし…これは、今（自分の中で）流行りのコスプレ改変するしかないな。で、これ。',

  photos: [],

  orgAvt: [
    Item_Mamehinata,
    { img: my_Dic + '/thumbnail/ref_01.png', url: 'https://booth.pm/ja/items/6691155' },
  ]
});

/* ─── 次のアバター ─── */
my_avatarid = '1080_SoraHinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ソラまめひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

  bgImg:        DicBase + 'ShareImg_bg/green.png',
  bgPattern:    DicBase + 'ShareImg_pattern/cloud.png',
  frameCTop:    DicBase + 'ShareImg_frame/frame_c_top_glass.png',
  frameCBottom: DicBase + 'ShareImg_frame/frame_c_bottom_glass.png',
  infoImg:      defo_infoImg,

  desc: 'コスプレ改変に慣れてきて、いろんな改変をしようとしていた。\nヒトノコちゃん伝いで羊鯨座さんのとこのアバターを好んでおり、ソーラちゃんも気に入っていたので、そのコスプレ改変。',

  photos: [],

  orgAvt: [
    Item_Mamehinata,
    { img: my_Dic + '/thumbnail/ref_01.png', url: 'https://uri880.booth.pm/items/5032831' },
  ]
});

/* ─── 次のアバター ─── */
my_avatarid = '1090_HoloHinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ホロひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

  bgImg:        DicBase + 'ShareImg_bg/water.png',
  bgPattern:    DicBase + 'ShareImg_pattern/pattern.png',
  frameCTop:    DicBase + 'ShareImg_frame/frame_c_top_6.png',
  frameCBottom: DicBase + 'ShareImg_frame/frame_c_bottom_6.png',
  infoImg:      defo_infoImg,

  desc: 'Hologroidをそもそも気に入っているということを前提に。\nコスプレ改変に結構慣れてきた。\nしかしアニメーションやマテリアルの動きをよくわかっていない。\n勉強がてら改変できそうだなーと考え改変に着手した。',

  photos: [],

  orgAvt: [
    Item_Mamehinata,
    { img: my_Dic + '/thumbnail/ref_01.png', url: 'https://nyarbera.booth.pm/items/4076902' },
  ]
});

/* ─── 次のアバター ─── */
my_avatarid = '1100_NEUHinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'NEUひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

  bgImg:        DicBase + 'ShareImg_bg/orange.png',
  bgPattern:    DicBase + 'ShareImg_pattern/pattern.png',
  frameCTop:    DicBase + 'ShareImg_frame/frame_c_top_6.png',
  frameCBottom: DicBase + 'ShareImg_frame/frame_c_bottom_6.png',
  infoImg:      defo_infoImg,

  desc: 'フレンドがよく使うシャムシールNEU君がすごくかわいい。\nかなり固有の雰囲気を持っているけどこういうコスプレ改変もできるかな？という動機。',

  photos: [],

  orgAvt: [
    Item_Mamehinata,
    { img: my_Dic + '/thumbnail/ref_01.png', url: 'https://booth.pm/ja/items/4236463' },
  ]
});

/* ─── 次のアバター ─── */
my_avatarid = '1170_syagaHinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'シャガひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

  bgImg:        DicBase + 'ShareImg_bg/water.png',
  bgPattern:    DicBase + 'ShareImg_pattern/pattern.png',
  bgPatternSize: '40',
  frameCTop:    DicBase + 'ShareImg_frame/frame_c_top_6.png',
  frameCBottom: DicBase + 'ShareImg_frame/frame_c_bottom_6.png',
  infoImg:      defo_infoImg,

  nameStyle:    { color: 'white', shadow: true, outline: false },
  descStyle:    { color: 'white', shadow: false, outline: false },

  desc: 'お正月の時期に改変。\nお正月系のアバターでコスプレ改変をしようといろいろ検索し、良いケモノを発見（シャガ）。\nコスプレするぞ～ってあれ、おお、これ、こんな衣装になってるのか。',

  photos: [],

  orgAvt: [
    Item_Mamehinata,
  ]
});

/* ─── 次のアバター ─── */
my_avatarid = '1180_HareHinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '晴れひなた',
  genre:        genre_org,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

  bgImg:        DicBase + 'ShareImg_bg/water.png',
  bgPattern:    DicBase + 'ShareImg_pattern/cloud.png',
  bgPatternSize: '40',
  frameCTop:    DicBase + 'ShareImg_frame/frame_c_top_squ.png',
  frameCBottom: DicBase + 'ShareImg_frame/frame_c_bottom_squ.png',
  infoImg:      defo_infoImg,

  nameStyle:    { color: 'white', shadow: true, outline: false },
  descStyle:    { color: 'white', shadow: false, outline: false },

  desc: '晴れ着のまめひなた。晴れ着で会ってる？間違えてるかも。\nシャガひなたに男の子っぽい印象があったので、\n女の子っぽくもしたいと思い改変。\n白い毛がきれいなヒトノコちゃんの耳を借りています。',

  photos: [],

  orgAvt: [
    Item_Mamehinata,
  ]
});

/* ─── 次のアバター ─── */
my_avatarid = '1190_ShipiHinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'シピひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

  bgImg:        DicBase + 'ShareImg_bg/purple.png',
  bgPattern:    DicBase + 'ShareImg_pattern/cloud.png',
  bgPatternSize: '',
  frameCTop:    defo_frameCTop,
  frameCBottom: defo_frameCBottom,
  infoImg:      defo_infoImg,

  nameStyle:    { color: 'white', shadow: true, outline: false },
  descStyle:    { color: 'white', shadow: false, outline: false },

  desc: 'シピルカ',

  photos: [],

  orgAvt: [
    Item_Mamehinata,
    { img: my_Dic + '/thumbnail/ref_01.png', url: 'https://booth.pm/ja/items/4593994' },
  ]
});

/* ─── 次のアバター ─── */
my_avatarid = '1200_DaruHinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ダルひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

  bgImg:        DicBase + 'ShareImg_bg/water.png',
  bgPattern:    DicBase + 'ShareImg_pattern/power.png',
  frameCTop:    DicBase + 'ShareImg_frame/frame_c_top_cir.png',
  frameCBottom: DicBase + 'ShareImg_frame/frame_c_bottom_cir.png',
  infoImg:      defo_infoImg,

  desc: 'コピー先のアバターがセクシーなので、衣装の追加が必須だった',

  photos: [],

  orgAvt: [
    Item_Mamehinata,
  ]
});

/* ─── 次のアバター ─── */
my_avatarid = '1210_Rag';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ラグひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

  bgImg:        DicBase + 'ShareImg_bg/purple.png',
  bgPattern:    defo_bgPattern,
  frameCTop:    DicBase + 'ShareImg_frame/frame_c_top_6.png',
  frameCBottom: DicBase + 'ShareImg_frame/frame_c_bottom_6.png',
  infoImg:      defo_infoImg,

  desc: 'テキスト',

  photos: [],

  orgAvt: [
    Item_Mamehinata,
  ]
});

/* ─── 次のアバター ─── */
my_avatarid = '1230_Rasyu';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ラシュひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

  bgImg:        DicBase + 'ShareImg_bg/purple.png',
  bgPattern:    defo_bgPattern,
  frameCTop:    DicBase + 'ShareImg_frame/frame_c_top_6.png',
  frameCBottom: DicBase + 'ShareImg_frame/frame_c_bottom_6.png',
  infoImg:      defo_infoImg,

  desc: 'フレンドのラシューシャに会うために',

  photos: [],

  orgAvt: [
    Item_Mamehinata,
  ]
});

/* ─── 次のアバター ─── */
my_avatarid = '1240_Str';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ストラひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

  bgImg:        DicBase + 'ShareImg_bg/red.png',
  bgPattern:    defo_bgPattern,
  frameCTop:    DicBase + 'ShareImg_frame/frame_c_top_cir.png',
  frameCBottom: DicBase + 'ShareImg_frame/frame_c_bottom_cir.png',
  infoImg:      defo_infoImg,

  desc: 'フレンドのため',

  photos: [],

  orgAvt: [
    Item_Mamehinata,
  ]
});

/* ─── 次のアバター ─── */
my_avatarid = '1250_Mur';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'メルひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

  bgImg:        DicBase + 'ShareImg_bg/water.png',
  bgPattern:    defo_bgPattern,
  frameCTop:    DicBase + 'ShareImg_frame/frame_c_top_6.png',
  frameCBottom: DicBase + 'ShareImg_frame/frame_c_bottom_6.png',
  infoImg:      defo_infoImg,

  desc: 'コピー元の質感とデザインが好きで',

  photos: [],

  orgAvt: [
    Item_Mamehinata,
  ]
});

/* ─── 次のアバター ─── */
my_avatarid = '1310_Kuroneko_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '黒猫ひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1320_MMD_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'MMDひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1330_Meido_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'メイドひなた',
  genre:        genre_copy_game,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1340_Rask_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ラスクひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1350_Haishima_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '灰島ひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1360_ruruko_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'るるこひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1370_formal_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'フォーマルひなた',
  genre:        genre_org,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1380_mame_pato';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'まめパト',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1420_remifa_nata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'レミファなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1430_kutoru_nata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'クトルなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1440_hodo_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ホドひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1450_foti_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'フォティひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1450_kure_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'クレひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1500_ton_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'TONひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1510_pato_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'パトひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1520_hitonoko_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ヒトノコひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1530_natsu_rask_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '夏ラスクひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1540_staf_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ホールひなた',
  genre:        genre_org,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1550_chalo_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'シャロひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1560_guidance_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ガイダンスひなた',
  genre:        genre_copy_game,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1560_taokaka_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'タオカカひなた',
  genre:        genre_copy_game,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1570_boo_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'おばけひなた',
  genre:        genre_org,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1580_mame_ruvas';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'まめルヴァス',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1590_mame_zunda';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'まめずんだ',
  genre:        genre_copy_game,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1600_kip_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'キプひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1610_cyber_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'サイバーひなた',
  genre:        genre_org,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1620_mame_friends';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'まめフレンズ',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1630_mimi_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ミミひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1640_nopu_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ノプカひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1650_fosyu_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'フォシュひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1660_hitonoko_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ヒトノコひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1670_mahuyu_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '真冬ひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1680_hitonoko_mini';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ミニヒトノこ',
  genre:        genre_org,
  category:     cate_other,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1690_kapusu_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'カピスひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1700_rarantesu_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ラランテスひなた',
  genre:        genre_copy_game,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1710_holo_hiinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ホログラムひなた',
  genre:        genre_org,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1720_nasu_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ナスひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1730_cheer_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'チアひなた',
  genre:        genre_org,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1740_sans_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'サンズひなた',
  genre:        genre_copy_game,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1750_onbu_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'おんぶひなた',
  genre:        genre_org,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1760_mimi_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ミミノこひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1770_test_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'レシーバひなた',
  genre:        genre_org,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1780_GBhinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'GBひなた',
  genre:        genre_copy_game,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1790_task_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'タスクひなた',
  genre:        genre_org,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1800_sister_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'シスターひなた',
  genre:        genre_org,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1810_switch2_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'スイッチ2ひなた',
  genre:        genre_copy_game,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1820_mahuyu_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '真冬ひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1830_emoken_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'えも研ひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1840_kuro_yoku_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '黒浴衣ひなた',
  genre:        genre_org,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1850_chibitora_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ちびとらひなた',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1860_mistely_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '遺跡ひなた',
  genre:        genre_org,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1870_ral_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ラルひなた',
  genre:        genre_copy_game,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1880_boy_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'まめキッサー',
  genre:        genre_copy_game,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1890_pop_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ポプひなた',
  genre:        genre_copy_game,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1900_shizue_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'しずえひなた',
  genre:        genre_copy_game,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1910_booster_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ブースターひなた',
  genre:        genre_copy_game,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1920_kuroneko_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '黒猫ひなた',
  genre:        genre_copy_game,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1930_halloween_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ハロウィンひなた',
  genre:        genre_org,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1940_moude_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '初詣ひなた',
  genre:        genre_org,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1950_dan_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ダンボールひなた',
  genre:        genre_org,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1960_school_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'スクールひなた',
  genre:        genre_org,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1970_usu_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'うすひなた',
  genre:        genre_copy_game,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1980_fotn_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'フォトンひなた',
  genre:        genre_org,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '1990_abusol_hinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'アブソルひなた',
  genre:        genre_copy_game,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '4000_QuestHinata';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'クエスト対応まめひなた',
  genre:        genre_org,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '4010_kaiga_ruri';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '絵画るい',
  genre:        genre_org,
  category:     cate_ruri,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '4020_kimana_ruri';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'きまなるり',
  genre:        genre_copy_avatar,
  category:     cate_ruri,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '4030_dakko_ruri';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'だっこるり',
  genre:        genre_org,
  category:     cate_ruri,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '4040_cool_ruri';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'クールるり',
  genre:        genre_org,
  category:     cate_ruri,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '4050_flower_ruri';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '花屋るり',
  genre:        genre_org,
  category:     cate_ruri,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '4060_wear_ruri';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '着せ替えるり',
  genre:        genre_org,
  category:     cate_ruri,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '4070_meido_ruri';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'メイドるり',
  genre:        genre_org,
  category:     cate_ruri,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '4080_shihuku_ruri';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '部屋着るり',
  genre:        genre_org,
  category:     cate_ruri,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '4090_yan_ruri';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'グラサンるり',
  genre:        genre_org,
  category:     cate_ruri,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '4100_val_ruri';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ヴァレンタインるり',
  genre:        genre_org,
  category:     cate_ruri,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '4110_zol_ruri';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'るりゾロアーク',
  genre:        genre_copy_game,
  category:     cate_ruri,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '4120_bukatsu_ruri';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '部活るり',
  genre:        genre_org,
  category:     cate_ruri,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '5000_gill_chalo_mon';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ギルシャロモン',
  genre:        genre_copy_game,
  category:     cate_chalo,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '5010_fligon_fosyu';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'フライゴンフォシュ',
  genre:        genre_copy_game,
  category:     cate_foshu,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '5020_halloween_fosyu';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ハロウィンフォシュ',
  genre:        genre_org,
  category:     cate_foshu,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '5030_kid_fosyu';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '子供フォシュ',
  genre:        genre_org,
  category:     cate_foshu,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '5040_rask_fosyu';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ラスクフォシュ',
  genre:        genre_copy_avatar,
  category:     cate_foshu,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '5050_kuro_fosyu';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '黒フォシュ',
  genre:        genre_org,
  category:     cate_foshu,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '5060_abusol_fosyu';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'アブソルフォシュ',
  genre:        genre_copy_game,
  category:     cate_foshu,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '5070_pato_fosyu';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'パトフォシュ',
  genre:        genre_copy_avatar,
  category:     cate_foshu,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '5080_NovaNia';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'novaニア',
  genre:        genre_copy_avatar,
  category:     cate_foshu,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '5090_kirby_fosyu';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'カービィフォシュ',
  genre:        genre_copy_game,
  category:     cate_foshu,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '5100_skall_fosyu';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'スカルニア',
  genre:        genre_org,
  category:     cate_foshu,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '5110_mame_nia';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'まめニア',
  genre:        genre_copy_avatar,
  category:     cate_foshu,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '5120_ane_nia';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '姉ニア',
  genre:        genre_org,
  category:     cate_foshu,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '5130_cake_fosyu';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'フォシュケーキ',
  genre:        genre_org,
  category:     cate_foshu,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '5140_chalonia';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'シャロニア',
  genre:        genre_copy_avatar,
  category:     cate_foshu,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '5150_dakko_fosyu';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'だっこフォシュ',
  genre:        genre_org,
  category:     cate_foshu,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '5160_zunda_nia';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ずんだニア',
  genre:        genre_copy_game,
  category:     cate_foshu,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '6010_Zudanoko';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ヒトノコずんだもん',
  genre:        genre_copy_game,
  category:     cate_other,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '6020_Slime_chalo';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'スライムシャロ',
  genre:        genre_org,
  category:     cate_chalo,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '6030_kuro_chalo';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '黒シャロ',
  genre:        genre_org,
  category:     cate_chalo,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '6040_daihuku_fosyu';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'フォシュ大福',
  genre:        genre_copy_avatar,
  category:     cate_foshu,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '6050_ruka_chalo';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ルカリオシャロ',
  genre:        genre_copy_game,
  category:     cate_chalo,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '6060_hai_chalo';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '灰シャロ',
  genre:        genre_copy_avatar,
  category:     cate_chalo,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '6070_zil_chalo';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ジルシャロ',
  genre:        genre_copy_avatar,
  category:     cate_chalo,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '6080_pato_chalo';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'パトシャロ',
  genre:        genre_copy_avatar,
  category:     cate_chalo,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '6090_muru_chalo';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ムルシャロ',
  genre:        genre_copy_avatar,
  category:     cate_foshu,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '6100_fire_fosyu';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'フレアニア',
  genre:        genre_org,
  category:     cate_foshu,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '6110_yue_chalo';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ユエシャロ',
  genre:        genre_copy_avatar,
  category:     cate_chalo,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '7010_LunerBoard';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '看板ネコtest',
  genre:        genre_org,
  category:     cate_other,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

  bgImg:        DicBase + 'ShareImg_bg/red.png',
  bgPattern:    DicBase + 'ShareImg_pattern/cloud.png',
  bgPatternSize: '100',
  frameCTop:    DicBase + 'ShareImg_frame/frame_c_top_6.png',
  frameCBottom: DicBase + 'ShareImg_frame/frame_c_bottom_6.png',
  infoImg:      defo_infoImg,

  nameStyle:    { color: 'white', shadow: true, outline: true },
  descStyle:    { color: 'black', shadow: false, outline: false },

  desc: '初めて改変したアバター\n月食ちゃんに一目ぼれして、好きな色を差し込んだ\n無言勢で生きるため、コミュニケpションように8種の言葉が書かれた看板を持っている',

  photos: [],

  orgAvt: [
    { img: my_Dic + '/thumbnail/ref_01.png', url: 'https://hoshinekonikki.booth.pm/items/2597163' },
  ]
});

/* ─── 次のアバター ─── */
my_avatarid = '7020_MeryuFlygon';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'メリュー（フライゴン色）',
  genre:        genre_copy_game,
  category:     cate_other,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

  bgImg:        DicBase + 'ShareImg_bg/green.png',
  bgPattern:    defo_bgPattern,
  frameCTop:    DicBase + 'ShareImg_frame/frame_c_top_glass.png',
  frameCBottom: DicBase + 'ShareImg_frame/frame_c_bottom_glass.png',
  infoImg:      defo_infoImg,

  desc: '月食ちゃんに続いて一目ぼれ。\n2人目に購入したアバター。\n改変で好きな要素をいれたいなーと思い、フライゴンと同じ配色にしようとした。\nFUJIYAMAでずんだもんのアバターを見かけて何となく遠目に見ていたら、ずんだもん仲間として受け入れてもらえた（？）',

  photos: [],

  orgAvt: [
    { img: my_Dic + '/thumbnail/ref_01.png', url: 'https://hoshinekonikki.booth.pm/items/4580792' },
  ]
});

/* ─── 次のアバター ─── */
my_avatarid = '7030_zundaRED';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '2Pずんだもん',
  genre:        genre_copy_game,
  category:     cate_other,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

  bgImg:        DicBase + 'ShareImg_bg/red.png',
  bgPattern:    DicBase + 'ShareImg_pattern/cloud.png',
  frameCTop:    DicBase + 'ShareImg_frame/frame_c_top_cir.png',
  frameCBottom: DicBase + 'ShareImg_frame/frame_c_bottom_cir.png',
  infoImg:      defo_infoImg,

  desc: 'フライゴンメリューの時に見かけたずんだもんアバターから、VRChatにずんだもんの公式アバターがあることを認知して、公式ストアを覗いてすぐにDL。\n赤色が好きなので改変で赤色を加えたら、「あんこもんだ！」と言われた。\nずんだもんに亜種がいたんだね。',

  photos: [],

  orgAvt: [
    { img: my_Dic + '/thumbnail/ref_01.png', url: 'https://booth.pm/ja/items/3733351' },
    { img: my_Dic + '/thumbnail/ref_02.png', url: 'https://zunko.jp/' },
  ]
});

/* ─── 次のアバター ─── */
my_avatarid = '7040_karen';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'カリン（失敗）',
  genre:        genre_org,
  category:     cate_other,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

  bgImg:        DicBase + 'ShareImg_bg/purple.png',
  bgPattern:    DicBase + 'ShareImg_pattern/watch.png',
  frameCTop:    DicBase + 'ShareImg_frame/frame_c_top_6.png',
  frameCBottom: DicBase + 'ShareImg_frame/frame_c_bottom_6.png',
  infoImg:      defo_infoImg,

  desc: '少し頭身が高いアバターを改変しようと思考。\n含みを持たせようとリボンで顔を隠したりして試行錯誤をしていたところ「セーラームーンにいそうだね」と言われて、これでいいかと落ち着いた。',

  photos: [],

  orgAvt: [
    { img: my_Dic + '/thumbnail/ref_01.png', url: 'https://booth.pm/ja/items/3470989' },
  ]
});

/* ─── 次のアバター ─── */
my_avatarid = '7050_Mamesha';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'まめーシャ',
  genre:        genre_copy_avatar,
  category:     cate_other,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

  bgImg:        DicBase + 'ShareImg_bg/purple.png',
  bgPattern:    defo_bgPattern,
  frameCTop:    defo_frameCTop,
  frameCBottom: defo_frameCBottom,
  infoImg:      defo_infoImg,

  desc: 'ラシューシャにまめひなたの格好',

  photos: [],

  orgAvt: []
});

/* ─── 次のアバター ─── */
my_avatarid = '7060_meido_neu';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'メイドNEU',
  genre:        genre_org,
  category:     cate_other,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '7070_kuro_phie';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'クロフィエ',
  genre:        genre_copy_avatar,
  category:     cate_other,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '7080_uzu_shipi';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ウズルカ',
  genre:        genre_copy_avatar,
  category:     cate_mame,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '7090_mame_mururu';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'まめムルル',
  genre:        genre_copy_avatar,
  category:     cate_other,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '7100_yokui_kip';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '浴衣キプ',
  genre:        genre_org,
  category:     cate_other,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '7110_rask_kip';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ラスクキプ',
  genre:        genre_copy_avatar,
  category:     cate_other,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '7120_rakugaki_guidance';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'らくがきガイダンス',
  genre:        genre_copy_game,
  category:     cate_other,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '7130_aki_mato';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '秋マト',
  genre:        genre_org,
  category:     cate_other,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '7140_Vket_zil';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'Vketジル',
  genre:        genre_copy_game,
  category:     cate_other,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '7150_yue_lop';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ユエロップ',
  genre:        genre_copy_game,
  category:     cate_other,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '7160_rati_aru';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ラティアル',
  genre:        genre_copy_game,
  category:     cate_other,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '7170_sukip';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         'ｽｷﾌﾟ',
  genre:        genre_copy_game,
  category:     cate_other,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '7180_profile2430';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '2430',
  genre:        genre_org,
  category:     cate_other,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
my_avatarid = '7190_profile2440';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '2440',
  genre:        genre_org,
  category:     cate_other,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    my_Dic + '/thumbnail/mini_pc.png',
  miniImgSP:    my_Dic + '/thumbnail/mini_sp.png',

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
