/* =====================================================
   sunshaura.com ヘッダー（ナビボタン）共通スクリプト

   ナビボタンの並びを、このファイルの SITE_NAV_ITEMS 1か所だけで管理する。
   次の3種類のページがこのファイルを読み込んで、同じボタンを並べる。
     ・index.html              … SunHeader.renderIndexButtons()（ボタンだけ作る。矢印の動きは index.html 側）
     ・news/ のトップ・各記事   … news.js が SunHeader.render() を呼ぶ（ヘッダー全体を作る）
     ・gallery/                … gallery.js が SunHeader.render() を呼ぶ（ヘッダー全体を作る）

   ★拡張予定: ナビボタンを追加・並べ替えする手順
     1. 下の SITE_NAV_ITEMS に1行追加する（上から順に左から並ぶ）
          index.html の中のページ   : { id: 'ページID', label: 'ボタン名', page: 'ページID' }
                                      → index.html に <div class="page" id="page-ページID"> も追加すること
          別フォルダの独立ページ    : { id: 'フォルダ名', label: 'ボタン名', href: 'フォルダ名/' }
                                      → href はサイトのトップからのパス。最後の / を忘れない
                                      → そのページを作るときは「ちょっとまってね...」の遷移演出も付ける
                                        （手順は assets/page-transition.js の先頭コメント）
     2. index.html・ニュース・ギャラリーのどれも書き換える必要はない（全ページに自動で反映される）
   ===================================================== */
(function () {
  'use strict';

  var SITE_NAV_ITEMS = [
    { id: 'avatar',   label: 'アバター改変',       page: 'avatar' },
    { id: 'world',    label: '作ったワールド',     page: 'world' },
    { id: 'shop',     label: 'ショップ',           page: 'shop' },
    { id: 'gallery',  label: 'フォトギャラリー',   href: 'gallery/' },
    { id: 'event',    label: 'イベント',           page: 'event' },
    { id: 'minigame', label: 'ミニゲーム',         page: 'minigame' },
    { id: 'about',    label: 'このサイトについて', page: 'about' },
    { id: 'news',     label: 'ニュース',           href: 'news/' }
  ];

  /* ★拡張予定: ロゴを画像に差し替える場合（ニュース・ギャラリーのヘッダー用）
       ここを画像のHTMLにする。{ROOT} はサイトのトップへの相対パスに自動で置き換わる。
         例: '<img src="{ROOT}assets/logo.png" alt="sunshaura" style="height:32px">'
       index.html のロゴは index.html の #logo-area に直接書いてあるので、そちらも同じ内容にする。 */
  var SITE_LOGO_HTML = 'サイトロゴ';

  /* 矢印を出す基準のボタン数（index.html の CONFIG.NAV_VISIBLE と同じ値） */
  var NAV_VISIBLE = 3;

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* -----------------------------------------------------
     index.html 用：#nav-buttons-wrap の中にボタンを作る
       index.html の中のページ → navigateTo()（ページ内の切り替え）
       別フォルダのページ     → SunTransition.go()（演出つきで移動）
  ----------------------------------------------------- */
  function renderIndexButtons(wrap) {
    if (!wrap) return;
    wrap.innerHTML = '';
    SITE_NAV_ITEMS.forEach(function (item) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nav-btn';
      btn.dataset.page = item.id;
      btn.textContent = item.label;
      btn.addEventListener('click', function () {
        if (item.href) {
          if (window.SunTransition) SunTransition.go(item.href); else location.href = item.href;
        } else if (typeof window.navigateTo === 'function') {
          window.navigateTo(item.page, btn);
        }
      });
      wrap.appendChild(btn);
    });
  }

  /* -----------------------------------------------------
     別フォルダのページ用：<header id="header"> の中身を全部作る
       options.root    : そのページからサイトのトップへの相対パス（例: '../'）
       options.current : 選択中にするボタンの id（例: 'news'）
  ----------------------------------------------------- */
  function render(options) {
    var header = document.getElementById('header');
    if (!header) return;
    var ROOT = (options && options.root) || './';
    var current = options && options.current;

    // data-transition を付けたリンクは、移動時に「ちょっとまってね...」の演出が入る（assets/page-transition.js）
    var logo = '<a id="logo-area" data-transition href="' + ROOT + 'index.html">' +
      SITE_LOGO_HTML.replace(/\{ROOT\}/g, ROOT) + '</a>';
    var buttons = SITE_NAV_ITEMS.map(function (item) {
      var href = item.href ? ROOT + item.href : ROOT + 'index.html#' + item.page;
      return '<a class="nav-btn' + (item.id === current ? ' active' : '') + '" data-transition href="' + href + '">' +
        escapeHtml(item.label) + '</a>';
    }).join('');

    header.innerHTML =
      '<div id="header1">' + logo + '</div>' +
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

  window.SunHeader = { items: SITE_NAV_ITEMS, render: render, renderIndexButtons: renderIndexButtons };
}());
