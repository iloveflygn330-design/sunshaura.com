/* =====================================================
   ショップ（shop/index.html）の商品データ
   shop/index.html で shop.js より先に読み込む。動き・見た目は shop.js / shop.css。

   ここにあるもの:
     SHOP_SETTINGS … 全商品共通の設定（動きの時間など）
     SHOP_ITEMS    … 商品の一覧（BOOTH の商品を1画面に1つずつ表示する）

   並び順は「発売日が新しい順」に自動で並ぶ（書く順番は気にしなくてよい）。
   ページの URL は shop/?id=<商品ID> で、その商品を最初に開く（X などで共有するとき用）。
   ===================================================== */

/* -----------------------------------------------------
   全商品共通の設定

   ★拡張予定: 動きの速さを変える場合は、下の数字（ミリ秒。1000 = 1秒）を書き換える
     「>」を押したとき（「<」は左右が逆になる）
       1. 今の商品が右へ加速しながら退場する
            chara  … キャラクター（フェードアウト動画を再生しながら）
            window … 商品情報ウィンドウ
            bg     … 背景
       2. 全部が退場してから gap だけ待つ
       3. 次の商品が左から減速しながら入場する（キャラクターはフェードイン動画を再生しながら）
     アイドル状態になったら、ボタンが押されるまでそのまま待つ。
   ----------------------------------------------------- */
const SHOP_SETTINGS = {
  exitMs:  { chara: 400, window: 500, bg: 600 },   // 退場の時間
  gapMs:   100,                                     // 退場しきってから入場が始まるまで
  enterMs: { chara: 600, window: 500, bg: 400 },   // 入場の時間
  itemDir: 'items/',            // 素材フォルダ（shop/ から見た場所）。中身は .github/scripts/shop-build.js が作る
  pagerNumberFrom: 10,          // 商品がこの数以上になったら、下の点の代わりに「3 / 12」の表示にする
  swipePx: 50                   // スマホでこれ以上横になぞったら商品を切り替える（px）
};

/* -----------------------------------------------------
   商品の一覧

   ★拡張予定: 商品を追加する手順
     1. 元の素材を PC の %USERPROFILE%\Documents\MyWebSites_shop\<商品ID>\ に置く
          bg.png（背景） / thumb.png（サムネイル・正方形） / in.avi（フェードイン） / out.avi（フェードアウト）
     2. 変換して push する（Claude に頼むか、自分で node .github/scripts/shop-build.js。説明はそのファイルの先頭）
          → shop/items/<商品ID>/ に軽い版ができる
     3. 下の SHOP_ITEMS に { ... } を1件追加する（いちばん下の「書き方の見本」をコピーして書き換えるのが早い）

     id      : 商品ID。素材フォルダ名と同じにする（例: '0010_matsuge'）。URL の ?id= にも使う
     name    : 商品名
     genre   : 商品種別（商品名の下に小さく出る。例: 'シェイプキー' / '3D小物'。書かなければ出ない）
     url     : BOOTH の商品ページ（「boothで開く」ボタンで新しいタブに開く）
     price   : 値段（円・数字だけ）。0 にすると「無料」と表示する
     date    : 発売日（'YYYY-MM-DD'）。この日付の新しい順に並ぶ
     desc    : 詳細文。改行したいところは「\n」を書く
     layout  : キャラクターと背景の配置。PC（pc）とスマホ（sp）で別々に指定する
                 x      … キャラクター動画の「画面の中心」を、表示エリアの左から何％の位置に置くか
                           （50 = 真ん中。小さくすると左へ、大きくすると右へ動く）
                 bottom … キャラクター動画の下端を、表示エリアの下から何％上げるか（0 = 下にぴったり。マイナスで下にはみ出す）
                 height … キャラクター動画の高さを、表示エリアの高さの何％にするか（100 = ぴったり。大きくするとアップになる）
                 bg     … 背景画像のどこを中心に見せるか（CSS の background-position。'50% 50%' = 真ん中、'80% 50%' = 右寄り）
                 win    … 商品情報ウィンドウの位置 { left: 左から何％, top: 上から何％ }（書かなければ shop.css の位置）
                           PC の既定は右上（left: 59, top: 16）、スマホの既定は上（left・top は書かない方が収まりがよい）
               ※ 動画（1920×1080 など）はキャラクターの周りの透明な部分も含めた大きさで配置される
               ※ 数字を変えて保存 → ページを再読み込みすると確認できる
   ----------------------------------------------------- */
const SHOP_ITEMS = [
  {
    id: '0010_matsuge',
    name: 'まめひなたのまつげをのばす',
    genre: 'シェイプキー',
    url: 'https://sunshaura.booth.pm/items/8780832',
    price: 100,
    date: '2026-08-29',
    desc: 'まめひなたのまつげをのばす！\nガーリーな改変にいかが？\n（まつげ用のシェイプキーを追加します。）',
    layout: {
      pc: { x: 46, bottom: 0, height: 100, bg: '50% 50%' },
      sp: { x: 56, bottom: 0, height: 64,  bg: '62% 50%' }
    }
  },
  {
    id: '0020_switsh2',
    name: '【MA設定済】すいっさ2',
    genre: '3D小物',
    url: 'https://sunshaura.booth.pm/items/7037886',
    price: 0,
    date: '2025-06-12',
    desc: 'ちまたで噂のアレ！\nVRChatでもコレで遊ぼう！\n（アバターギミックです）',
    layout: {
      pc: { x: 50, bottom: 0, height: 100, bg: '50% 50%', win: { left: 15, top: 18 } },
      sp: { x: 20, bottom: 0, height: 76,  bg: '60% 50%' }
    }
  },
  {
    id: '0030_balloon',
    name: 'ずんだもんのあいさつバルーン',
    genre: '3D小物',
    url: 'https://sunshaura.booth.pm/items/7500070',
    price: 300,
    date: '2025-10-04',
    desc: 'ふきだしとずんだもんの声で楽しくあいさつ！\nずんだもんのあいさつバルーン！',
    layout: {
      pc: { x: 50, bottom: 0,  height: 100, bg: '50% 50%', win: { left: 51, top: 15 } },
      sp: { x: 62, bottom: 16, height: 61,  bg: '50% 50%' }
    }
  },
  {
    id: '0040_uniuni',
    name: 'うにうにチーク',
    genre: '3D装飾品',
    url: 'https://sunshaura.booth.pm/items/7342942',
    price: 0,
    date: '2025-08-24',
    desc: 'うにうに動く、アニメチックなチーク！\nかわいさ、わんぱくさを強調しよう。',
    layout: {
      pc: { x: 50, bottom: 0, height: 100, bg: '50% 50%', win: { left: 50, top: 6 } },
      sp: { x: 62, bottom: 3, height: 77,  bg: '50% 50%' }
    }
  },
  {
    id: '0050_aiueo',
    name: 'ずんだもんのあいうえおボード',
    genre: '3D小物',
    url: 'https://sunshaura.booth.pm/items/6964850',
    price: 300,
    date: '2025-05-24',
    desc: 'ずんだもんの声で楽しくおしゃべり！\nずんだもんのあいうえおボード！',
    layout: {
      pc: { x: 53, bottom: -5, height: 106, bg: '50% 50%', win: { left: 48, top: 7 } },
      sp: { x: 57, bottom: -2, height: 77,  bg: '50% 50%' }
    }
  },

  /* ---- 書き方の見本（コピーして上に貼り、/* と * / を外して書き換える） ----
  {
    id: '0020_xxxx',
    name: '商品名',
    genre: '商品種別',
    url: 'https://sunshaura.booth.pm/items/0000000',
    price: 0,
    date: '2026-12-01',
    desc: '1行目\n2行目',
    layout: {
      pc: { x: 46, bottom: 0, height: 100, bg: '50% 50%' },
      sp: { x: 56, bottom: 0, height: 64,  bg: '50% 50%' }
    }
  },
  */
];
