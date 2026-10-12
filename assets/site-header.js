/* =====================================================
   sunshaura.com 共通パーツ（ヘッダー・フッター）スクリプト

   全ページのヘッダー（ロゴ・ナビボタン）とフッターを、このファイル1か所だけで管理する。
   各ページは「空の入れ物」を置いて、このファイルを読み込んで SunHeader.render() を呼ぶだけ。
       <header id="header"></header>                       ← ヘッダーの入れ物
       <footer class="site-footer" data-site-footer></footer> ← フッターの入れ物
       <script src="（相対パス）assets/site-header.js"></script>
       <script>SunHeader.render({ root: '../', current: 'avatar' });</script>
     ・ニュース（news.js）・ギャラリー（gallery.js）は、それぞれのJSの中から render() を呼んでいる
     ・見た目（CSS）は assets/site-common.css

   ★拡張予定: ナビボタン（＝ページ）を追加・並べ替えする手順
     1. 下の SITE_NAV_ITEMS に1行追加する（上から順に左から並ぶ）
          { id: 'フォルダ名', label: 'ボタン名', href: 'フォルダ名/' }
          → href はサイトのトップからのパス。最後の / を忘れない
     2. そのフォルダに index.html を作る（world/index.html をコピーして中身を書き換えるのが早い）
          → コピー元には「ちょっとまってね...」の遷移演出・ヘッダー・フッターが最初から入っている
          → render() の current をそのフォルダ名（= 上の id）にする
     3. 既存のページのHTMLは書き換えなくてよい（全ページのヘッダーに自動で反映される）
   ===================================================== */
(function () {
  'use strict';

  var SITE_NAV_ITEMS = [
    { id: 'avatar',   label: 'アバター改変',       href: 'avatar/' },
    { id: 'world',    label: '作ったワールド',     href: 'world/' },
    { id: 'shop',     label: 'ショップ',           href: 'shop/' },
    { id: 'gallery',  label: 'フォトギャラリー',   href: 'gallery/' },
    { id: 'event',    label: 'イベント',           href: 'event/' },
    { id: 'minigame', label: 'ミニゲーム',         href: 'minigame/' },
    { id: 'about',    label: 'このサイトについて', href: 'about/' },
    { id: 'news',     label: 'ニュース',           href: 'news/' }
  ];

  /* ★拡張予定: ロゴを画像に差し替える場合
       ここを画像のHTMLにする。{ROOT} はサイトのトップへの相対パスに自動で置き換わる。
         例: '<img src="{ROOT}assets/logo.png" alt="sunshaura" style="height:32px">'
       全ページのヘッダーに反映される。大きさの調整は assets/site-common.css の #logo-area */
  var SITE_LOGO_HTML = 'サイトロゴ';

  /* ★拡張予定: ロゴの右側（PCではナビボタンの下に隠れる場所 / スマホではロゴの右）に出すもの
       SNSアイコンなどを入れる場合はここにHTMLを書く。{ROOT} はサイトのトップへの相対パスに置き換わる。
         例: '<a href="https://x.com/..." target="_blank" rel="noopener">X</a>'
       空のままなら何も表示しない。 */
  var SITE_HEADER_EXTRA_HTML = '';

  /* ★拡張予定: フッターの中身（全ページ共通）
       リンクや著作権表記を足す場合はここに書く。{ROOT} はサイトのトップへの相対パスに置き換わる。
         例: 'sunshaura.com　<a href="{ROOT}about/" data-transition>このサイトについて</a>'
       ※ サイト内リンクには data-transition を付けると「ちょっとまってね...」の演出が入る */
  var SITE_FOOTER_HTML = 'sunshaura.com';

  /* 矢印を出す基準のボタン数（これより多いとナビの左右に ‹ › が出る） */
  var NAV_VISIBLE = 3;

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* -----------------------------------------------------
     フッター：data-site-footer を付けた要素の中身を入れる
     （ニュース・ギャラリーの古いページでフッターに印がなくても、元の文字のまま表示される）
  ----------------------------------------------------- */
  function renderFooter(ROOT) {
    var html = SITE_FOOTER_HTML.replace(/\{ROOT\}/g, ROOT);
    Array.prototype.forEach.call(document.querySelectorAll('[data-site-footer]'), function (el) {
      el.innerHTML = html;
    });
  }

  /* -----------------------------------------------------
     ヘッダー＋フッターを組み立てる（全ページ共通）
       options.root    : そのページからサイトのトップへの相対パス（トップは './'、avatar/ などは '../'）
       options.current : 選択中にするボタンの id（例: 'news'）。トップページは指定なし
  ----------------------------------------------------- */
  function render(options) {
    var ROOT = (options && options.root) || './';
    var current = options && options.current;

    renderFooter(ROOT);

    var header = document.getElementById('header');
    if (!header) return;

    // data-transition を付けたリンクは、移動時に「ちょっとまってね...」の演出が入る（assets/page-transition.js）
    var logo = '<a id="logo-area" data-transition href="' + ROOT + 'index.html">' +
      SITE_LOGO_HTML.replace(/\{ROOT\}/g, ROOT) + '</a>';
    var extra = SITE_HEADER_EXTRA_HTML
      ? '<div id="header1-extra">' + SITE_HEADER_EXTRA_HTML.replace(/\{ROOT\}/g, ROOT) + '</div>' : '';
    var buttons = SITE_NAV_ITEMS.map(function (item) {
      return '<a class="nav-btn' + (item.id === current ? ' active' : '') + '" data-page="' + item.id +
        '" data-transition href="' + ROOT + item.href + '">' + escapeHtml(item.label) + '</a>';
    }).join('');

    header.innerHTML =
      '<div id="header1">' + logo + extra + '</div>' +
      '<div id="header2">' +
        '<button class="nav-arrow" id="nav-prev" aria-label="前のボタンへ">‹</button>' +
        '<div id="nav-scroll-wrap"><div id="nav-buttons-wrap">' + buttons + '</div></div>' +
        '<button class="nav-arrow" id="nav-next" aria-label="次のボタンへ">›</button>' +
      '</div>';

    var navOffset = 0;

    /*
     * ボタンの位置を実測して送る方式
     *   ボタンの幅は文字数で130pxより広がる（例:「このサイトについて」）ため、
     *   固定幅で計算せず、各ボタンの実際の左端位置まで動かす。
     */
    function measure() {
      var wrapper    = document.getElementById('nav-buttons-wrap');
      var scrollWrap = document.getElementById('nav-scroll-wrap');
      var prevBtn    = document.getElementById('nav-prev');
      var btns       = Array.prototype.slice.call(wrapper.children);
      var base       = btns[0].offsetLeft;
      var lefts      = btns.map(function (b) { return b.offsetLeft - base; });
      var last       = btns[btns.length - 1];
      // 矢印ボタンがまだ非表示のとき（初回）は、矢印2個ぶん（約72px）狭くなる前提で計算する
      var visibleW   = scrollWrap.clientWidth - (prevBtn.style.display === 'flex' ? 0 : 72);
      var totalW     = last.offsetLeft + last.offsetWidth - base;
      // 最後のボタンが見える最小の送り数 = 最大移動量
      var maxOffset  = lefts.findIndex(function (l) { return totalW - l <= visibleW; });
      if (maxOffset < 0) maxOffset = btns.length - 1;
      return { btns: btns, lefts: lefts, visibleW: visibleW, maxOffset: maxOffset };
    }

    function update() {
      var wrapper    = document.getElementById('nav-buttons-wrap');
      var scrollWrap = document.getElementById('nav-scroll-wrap');
      var prevBtn    = document.getElementById('nav-prev');
      var nextBtn    = document.getElementById('nav-next');
      if (SITE_NAV_ITEMS.length > NAV_VISIBLE) {
        prevBtn.style.display = 'flex'; nextBtn.style.display = 'flex';
        wrapper.style.marginLeft = '0'; wrapper.style.marginRight = '0';
        var m = measure();
        navOffset = Math.max(0, Math.min(navOffset, m.maxOffset));
        wrapper.style.transform = 'translateX(-' + m.lefts[navOffset] + 'px)';
        prevBtn.disabled = navOffset <= 0; nextBtn.disabled = navOffset >= m.maxOffset;
        var FADE = 30;
        var l = navOffset <= 0 ? 'black 0px' : 'transparent 0px, black ' + FADE + 'px';
        var r = navOffset >= m.maxOffset ? 'black 100%' : 'black calc(100% - ' + FADE + 'px), transparent 100%';
        scrollWrap.style.webkitMaskImage = scrollWrap.style.maskImage = 'linear-gradient(to right, ' + l + ', ' + r + ')';
      } else {
        prevBtn.style.display = 'none'; nextBtn.style.display = 'none';
        wrapper.style.transform = 'translateX(0)';
      }
    }
    document.getElementById('nav-prev').onclick = function () { navOffset--; update(); };
    document.getElementById('nav-next').onclick = function () { navOffset++; update(); };
    update();
    window.addEventListener('resize', update);
    // Webフォントの読み込みでボタン幅が変わるので、読み込み後にもう一度測り直す
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);

    // 選択中のボタンが画面外にあれば、見える位置までずらす
    var activeBtn = header.querySelector('.nav-btn.active');
    if (activeBtn) {
      var m0 = measure();
      var idx = m0.btns.indexOf(activeBtn);
      var activeRight = m0.lefts[idx] + activeBtn.offsetWidth;
      if (activeRight > m0.visibleW) {
        navOffset = m0.lefts.findIndex(function (l) { return activeRight - l <= m0.visibleW; });
        update();
      }
    }
  }

  window.SunHeader = { items: SITE_NAV_ITEMS, render: render };
}());
