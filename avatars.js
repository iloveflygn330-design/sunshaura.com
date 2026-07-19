// =====================================================
// アバターデータ  avatars.js
// avatar_form.html から自動生成
// 生成日時: 2026/7/19 15:25:56  /  23件
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
  miniImgPC:    defo_miniImgPC,
  miniImgSP:    defo_miniImgSP,

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
  miniImgPC:    defo_miniImgPC,
  miniImgSP:    defo_miniImgSP,

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
  miniImgPC:    defo_miniImgPC,
  miniImgSP:    defo_miniImgSP,

  bgImg:        DicBase + 'ShareImg_bg/purple.png',
  bgPattern:    DicBase + 'ShareImg_pattern/hobagi.png',
  frameCTop:    DicBase + 'ShareImg_frame/frame_c_top_6.png',
  frameCBottom: DicBase + 'ShareImg_frame/frame_c_bottom_6.png',
  infoImg:      defo_infoImg,

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
  miniImgPC:    defo_miniImgPC,
  miniImgSP:    defo_miniImgSP,

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
  miniImgPC:    defo_miniImgPC,
  miniImgSP:    defo_miniImgSP,

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
  miniImgPC:    defo_miniImgPC,
  miniImgSP:    defo_miniImgSP,

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
  miniImgPC:    defo_miniImgPC,
  miniImgSP:    defo_miniImgSP,

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
  miniImgPC:    defo_miniImgPC,
  miniImgSP:    defo_miniImgSP,

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
  miniImgPC:    defo_miniImgPC,
  miniImgSP:    defo_miniImgSP,

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
  miniImgPC:    defo_miniImgPC,
  miniImgSP:    defo_miniImgSP,

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
  miniImgPC:    defo_miniImgPC,
  miniImgSP:    defo_miniImgSP,

  bgImg:        DicBase + 'ShareImg_bg/water.png',
  bgPattern:    DicBase + 'ShareImg_pattern/pattern.png',
  frameCTop:    DicBase + 'ShareImg_frame/frame_c_top_6.png',
  frameCBottom: DicBase + 'ShareImg_frame/frame_c_bottom_6.png',
  infoImg:      defo_infoImg,

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
  miniImgPC:    defo_miniImgPC,
  miniImgSP:    defo_miniImgSP,

  bgImg:        DicBase + 'ShareImg_bg/water.png',
  bgPattern:    DicBase + 'ShareImg_pattern/cloud.png',
  frameCTop:    DicBase + 'ShareImg_frame/frame_c_top_squ.png',
  frameCBottom: DicBase + 'ShareImg_frame/frame_c_bottom_squ.png',
  infoImg:      defo_infoImg,

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
  miniImgPC:    defo_miniImgPC,
  miniImgSP:    defo_miniImgSP,

  bgImg:        DicBase + 'ShareImg_bg/purple.png',
  bgPattern:    DicBase + 'ShareImg_pattern/cloud.png',
  frameCTop:    defo_frameCTop,
  frameCBottom: defo_frameCBottom,
  infoImg:      defo_infoImg,

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
  miniImgPC:    defo_miniImgPC,
  miniImgSP:    defo_miniImgSP,

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
  miniImgPC:    defo_miniImgPC,
  miniImgSP:    defo_miniImgSP,

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
my_avatarid = '7010_LunerBoard';
my_Dic      = DicBase + my_avatarid;
_avatars.push({
  id:           my_avatarid,
  name:         '看板ネコtest',
  genre:        genre_org,
  category:     cate_other,

  mainImg:      my_Dic + '/thumbnail/main.png',
  miniImgPC:    defo_miniImgPC,
  miniImgSP:    defo_miniImgSP,

  bgImg:        DicBase + 'ShareImg_bg/red.png',
  bgPattern:    DicBase + 'ShareImg_pattern/cloud.png',
  frameCTop:    DicBase + 'ShareImg_frame/frame_c_top_6.png',
  frameCBottom: DicBase + 'ShareImg_frame/frame_c_bottom_6.png',
  infoImg:      defo_infoImg,

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
  miniImgPC:    defo_miniImgPC,
  miniImgSP:    defo_miniImgSP,

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
  miniImgPC:    defo_miniImgPC,
  miniImgSP:    defo_miniImgSP,

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
  miniImgPC:    defo_miniImgPC,
  miniImgSP:    defo_miniImgSP,

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
