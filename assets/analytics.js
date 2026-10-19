/* =====================================================
   sunshaura.com アクセス解析（Google アナリティクス 4）

   全ページの <head> でこのファイルを読み込む（ページ数・訪問者数などを Google アナリティクスで見られる）。
   測定 ID はここ1か所だけで管理する。

   読み込んでいるページ:
     index.html / avatar・world・shop・event・minigame・about・gallery・news の index.html /
     news/column/_template/index.html（毎日の記事はこれのコピーなので、自動で入る）
   読み込んでいないページ:
     avatarform/avatar_form.html（自分用の入力ツール）
     avatar/p/<ID>/（共有用ページ。すぐアバター改変ページへ移動するので、二重に数えないよう入れていない）

   ★拡張予定: 新しいページを作ったときは、<head> の viewport の下に次の1行を入れる（相対パスはページの深さに合わせる）
       <script src="../assets/analytics.js"></script>
     （world/index.html をコピーして作れば、最初から入っている）

   ★拡張予定: 自分のアクセスを数えないようにする
     自分のスマホ・PC のブラウザで一度だけ、URL の最後に ?ga=off を付けて開く（例: https://sunshaura.com/?ga=off）
     → そのブラウザからのアクセスは、それ以降ずっと数えられなくなる
     元に戻すときは ?ga=on を付けて開く
     ※ ブラウザの履歴・サイトデータを消すと元に戻るので、そのときはもう一度 ?ga=off を開く

   ※ 本番のサイト（sunshaura.com）以外（自分の PC で確認しているときなど）では送らない
   ===================================================== */
(function () {
  'use strict';

  /* ★拡張予定: 測定 ID を変える場合はここを書き換える（Google アナリティクスの「データストリーム」に表示される G-XXXX） */
  var GA_ID = 'G-J6SG6D331J';

  /* 送るサイトのドメイン（ここ以外では動かない） */
  var HOSTS = ['sunshaura.com', 'www.sunshaura.com'];

  var OPT_OUT_KEY = 'sun-ga-off';

  // ?ga=off / ?ga=on で、このブラウザの計測を止める・戻す
  try {
    var flag = new URLSearchParams(location.search).get('ga');
    if (flag === 'off') localStorage.setItem(OPT_OUT_KEY, '1');
    if (flag === 'on') localStorage.removeItem(OPT_OUT_KEY);
    if (localStorage.getItem(OPT_OUT_KEY) === '1') return;
  } catch (e) { /* 保存できないブラウザでは、普通に計測する */ }

  if (HOSTS.indexOf(location.hostname) < 0) return;

  // ここから下は Google の公式のタグと同じ内容
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
}());
