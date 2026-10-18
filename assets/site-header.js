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
     ・ナビボタンは ‹ › の矢印のほか、スワイプ（指でなぞる・マウスでドラッグ）でも動かせる（enableSwipe()）

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

  /* ★拡張予定: ボタンを一時的に隠す・また出す
       隠したい行の最後に hidden: true を付けると、そのボタンはヘッダーに出なくなる（ページ自体は残る。URLを直接開けば見られる）。
       また出すときは hidden: true を消すだけ。 */
  var SITE_NAV_ITEMS = [
    { id: 'avatar',   label: 'アバター改変',       href: 'avatar/' },
    { id: 'world',    label: '作ったワールド',     href: 'world/', hidden: true },  // 準備中のため非表示
    { id: 'shop',     label: 'ショップ',           href: 'shop/' },
    { id: 'gallery',  label: 'フォトギャラリー',   href: 'gallery/' },
    { id: 'event',    label: 'イベント',           href: 'event/', hidden: true },  // 準備中のため非表示
    { id: 'minigame', label: 'ミニゲーム',         href: 'minigame/' },
    { id: 'about',    label: 'このサイトについて', href: 'about/' },
    { id: 'news',     label: 'ニュース',           href: 'news/' }
  ];
  // ヘッダーに実際に並べるボタン（hidden: true のものを除く）
  var NAV_SHOWN = SITE_NAV_ITEMS.filter(function (item) { return !item.hidden; });

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
    var buttons = NAV_SHOWN.map(function (item) {
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
      if (NAV_SHOWN.length > NAV_VISIBLE) {
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
    enableSwipe();

    /*
     * スワイプ（指でなぞる）でナビボタンを動かす
     *   ・なぞっている間はボタンが指についてくる
     *   ・指を離すと、いちばん近いボタンの左端にピタッと止まる
     *     （素早くはじいたときは、はじいた向きに1つ以上送る）
     *   ・縦方向のスクロールはそのまま（横に動かしたときだけ反応する）
     *   ・なぞった直後は、ボタンを押したことにしない（うっかりページ移動を防ぐ）
     *   ・マウスでドラッグしても同じように動く
     *
     * ★拡張予定: スワイプの感度を変える場合は SWIPE の値を書き換える
     *   START_PX : これ以上横に動いたら「スワイプ」とみなす距離（px）。小さいほど反応が早い
     *   FLICK_PX : 指を離したとき、これ以上動かしていたら向きの方へ必ず1つ送る距離（px）
     *   EDGE_RESIST : 端より先に引っぱったときの重さ（0〜1。小さいほど重い）
     */
    function enableSwipe() {
      var SWIPE = { START_PX: 8, FLICK_PX: 30, EDGE_RESIST: 0.3 };
      var scrollWrap = document.getElementById('nav-scroll-wrap');
      var wrapper    = document.getElementById('nav-buttons-wrap');
      var drag = null;          // なぞっている間の情報
      var suppressClick = false;

      // 横スワイプはこちらで処理し、縦スクロールはブラウザに任せる
      scrollWrap.style.touchAction = 'pan-y';

      scrollWrap.addEventListener('pointerdown', function (e) {
        if (NAV_SHOWN.length <= NAV_VISIBLE) return;           // ボタンが全部見えているときは動かさない
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        var m = measure();
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY, base: m.lefts[navOffset],
                 max: m.lefts[m.maxOffset], m: m, moving: false, dx: 0 };
      });

      scrollWrap.addEventListener('pointermove', function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.moving) {
          if (Math.abs(dx) < SWIPE.START_PX) return;
          if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; }   // 縦の動きならスワイプにしない
          drag.moving = true;
          wrapper.style.transition = 'none';                         // 指に直接ついてくるようにする
          try { scrollWrap.setPointerCapture(e.pointerId); } catch (err) {}
        }
        drag.dx = dx;
        var pos = drag.base - dx;
        if (pos < 0) pos *= SWIPE.EDGE_RESIST;                                       // 左端より先は重く
        if (pos > drag.max) pos = drag.max + (pos - drag.max) * SWIPE.EDGE_RESIST;   // 右端より先も重く
        wrapper.style.transform = 'translateX(' + (-pos) + 'px)';
      });

      function endDrag(e) {
        if (!drag || e.pointerId !== drag.id) return;
        var d = drag; drag = null;
        if (!d.moving) return;                                       // ただのタップ → 通常どおりボタンを押す
        wrapper.style.transition = '';
        suppressClick = true;                                        // この直後のクリックは無視する
        setTimeout(function () { suppressClick = false; }, 0);

        // 指を離した位置にいちばん近いボタンを探す
        var pos = d.base - d.dx, best = 0;
        d.m.lefts.forEach(function (l, i) {
          if (Math.abs(l - pos) < Math.abs(d.m.lefts[best] - pos)) best = i;
        });
        // 少しでも大きく動かしていたら、その向きに最低1つは送る
        if (best === navOffset && Math.abs(d.dx) >= SWIPE.FLICK_PX) best += d.dx < 0 ? 1 : -1;
        navOffset = best;
        update();
      }
      scrollWrap.addEventListener('pointerup', endDrag);
      scrollWrap.addEventListener('pointercancel', endDrag);

      // なぞった直後に指を離したボタンへ移動しないようにする
      scrollWrap.addEventListener('click', function (e) {
        if (suppressClick) { e.preventDefault(); e.stopPropagation(); suppressClick = false; }
      }, true);

      // リンクや画像を「つかんで」ドラッグする標準の動きを止める（マウス用）
      scrollWrap.addEventListener('dragstart', function (e) { e.preventDefault(); });
    }
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
