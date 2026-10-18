/* =====================================================
   ショップ（shop/index.html）の動き
   商品データ・動きの時間は shop-data.js（SHOP_ITEMS / SHOP_SETTINGS）、見た目は shop.css。

   やること:
     ・商品を1画面に1つずつ表示する（新しい順。最後の次は最初に戻る）
     ・切り替えは ‹ › ボタン / 下の点（または「3 / 12」）/ スマホの横なぞり / キーボードの ← →
         「>」・右になぞる・→ … 今の商品が右へ退場し、次の商品が左から入場する
         「<」・左になぞる・← … 左右が逆
     ・キャラクターは「フェードイン動画 → アイドル（動画の最後のコマ）→ フェードアウト動画」と動く
         iPhone・iPad・Mac の Safari は透過動画を表示できないので、静止画をフェードさせて動かす
     ・URL を shop/?id=<商品ID> にして、その商品から開けるようにする
   ===================================================== */
(function () {
  'use strict';

  var S = SHOP_SETTINGS;
  var DIR = S.itemDir;
  var EASE_IN  = 'cubic-bezier(0.55, 0, 1, 0.45)';   // 加速しながら退場
  var EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';   // 減速しながら入場

  /* 動きを減らす設定のブラウザでは、スライドをほぼ一瞬にする */
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ms(v) { return REDUCED ? Math.min(v, 120) : v; }

  /* 透過動画（WebM VP9）を表示できないブラウザ（Safari。iPhone・iPad はどのブラウザも中身が Safari） */
  var NO_ALPHA_VIDEO = (function () {
    var ua = navigator.userAgent;
    var iOS = /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    var safari = /Safari\//.test(ua) && !/(Chrome|Chromium|Edg|OPR|Firefox|Android)\//.test(ua);
    var v = document.createElement('video');
    var vp9 = v.canPlayType && v.canPlayType('video/webm; codecs="vp9"');
    return iOS || safari || !vp9;
  }());

  /* 新しい順に並べる（同じ日付なら ID の大きい方が先） */
  var items = SHOP_ITEMS.slice().sort(function (a, b) {
    return a.date === b.date ? (a.id < b.id ? 1 : -1) : (a.date < b.date ? 1 : -1);
  });

  var stage   = document.getElementById('shop-stage');
  var bgWrap  = document.getElementById('shop-bg-wrap');
  var bgEl    = document.getElementById('shop-bg');
  var chara   = document.getElementById('shop-chara');
  var idleImg = document.getElementById('shop-idle');
  var vIn     = document.getElementById('shop-vin');
  var vOut    = document.getElementById('shop-vout');
  var win     = document.getElementById('shop-window');
  var pager   = document.getElementById('shop-pager');
  var btnPrev = document.getElementById('shop-prev');
  var btnNext = document.getElementById('shop-next');

  var cur = 0;          // 表示中の商品の番号
  var busy = false;     // 切り替え中（この間の操作は受け付けない）

  if (!items.length) {
    stage.innerHTML = '<div class="shop-empty">商品はまだありません</div>';
    if (window.SunTransition) SunTransition.ready();
    return;
  }

  /* -----------------------------------------------------
     小さな道具
  ----------------------------------------------------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function src(item, file) { return DIR + encodeURIComponent(item.id) + '/' + file; }
  function priceText(p) { return Number(p) === 0 ? '無料' : '¥' + Number(p).toLocaleString('ja-JP'); }
  function dateText(d) { return String(d).replace(/-/g, '/'); }
  function isSP() { return window.matchMedia('(max-width: 759px)').matches; }
  function wait(t) { return new Promise(function (r) { setTimeout(r, t); }); }

  /* 部品を動かす（Web Animations API）。終わったら次へ進めるよう Promise を返す */
  function move(el, from, to, dur, ease) {
    el.getAnimations().forEach(function (old) { old.cancel(); });   // 前の動きの残りを消す
    var a = el.animate([from, to], { duration: ms(dur), easing: ease, fill: 'forwards' });
    return a.finished.catch(function () {});
  }

  /* -----------------------------------------------------
     素材の先読み（動画は丸ごと読み込んでおき、押した瞬間に再生できるようにする）
  ----------------------------------------------------- */
  var blobCache = {};
  function loadVideo(url) {
    if (NO_ALPHA_VIDEO) return Promise.resolve(null);
    if (!blobCache[url]) {
      blobCache[url] = fetch(url).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.blob();
      }).then(function (b) { return URL.createObjectURL(b); }).catch(function () { return null; });
    }
    return blobCache[url];
  }
  var imgCache = {};
  function loadImage(url) {
    if (!imgCache[url]) {
      imgCache[url] = new Promise(function (resolve) {
        var im = new Image();
        im.onload = function () { resolve(url); };
        im.onerror = function () { resolve(null); };
        im.src = url;
      });
    }
    return imgCache[url];
  }
  function preload(i) {
    var it = items[i];
    return Promise.all([
      loadImage(src(it, 'bg.webp')), loadImage(src(it, 'idle.webp')), loadImage(src(it, 'thumb.webp')),
      loadVideo(src(it, 'in.webm')), loadVideo(src(it, 'out.webm'))
    ]);
  }
  function preloadAround(i) {
    var n = items.length;
    if (n > 1) { preload((i + 1) % n); preload((i - 1 + n) % n); }
  }

  /* -----------------------------------------------------
     商品の中身をはめ込む
  ----------------------------------------------------- */
  function applyLayout(item) {
    var l = (item.layout && (isSP() ? item.layout.sp : item.layout.pc)) || {};
    chara.style.left   = (l.x != null ? l.x : 50) + '%';
    chara.style.bottom = (l.bottom != null ? l.bottom : 0) + '%';
    chara.style.height = (l.height != null ? l.height : 100) + '%';
    bgEl.style.backgroundPosition = l.bg || '50% 50%';
    // ウィンドウの位置（指定がなければ shop.css の位置のまま）
    var w = l.win || {};
    win.style.left  = w.left != null ? w.left + '%' : '';
    win.style.top   = w.top  != null ? w.top  + '%' : '';
  }

  function fill(item) {
    bgEl.style.backgroundImage = 'url("' + src(item, 'bg.webp') + '")';
    idleImg.src = src(item, 'idle.webp');
    idleImg.alt = item.name;
    applyLayout(item);

    win.innerHTML =
      '<div class="shop-win-head">' +
        '<div class="shop-win-title">' + esc(item.name) + '</div>' +
        (item.genre ? '<div class="shop-win-genre">' + esc(item.genre) + '</div>' : '') +
      '</div>' +
      '<div class="shop-win-body">' +
        '<div class="shop-win-main">' +
          '<a class="shop-win-btn" href="' + esc(item.url) + '" target="_blank" rel="noopener">' +
            '<img src="assets/icons/link.png" alt="">boothで開く</a>' +
          '<p class="shop-win-desc">' + esc(item.desc || '') + '</p>' +
          '<div class="shop-win-meta">' +
            '<span><img src="assets/icons/coin.png" alt="値段">' + esc(priceText(item.price)) + '</span>' +
            '<span><img src="assets/icons/cloud.png" alt="発売日">' + esc(dateText(item.date)) + '</span>' +
          '</div>' +
        '</div>' +
        '<img class="shop-win-thumb" src="' + src(item, 'thumb.webp') + '" alt="' + esc(item.name) + '">' +
      '</div>';

    document.title = item.name + ' | ショップ | sunshaura.com';
  }

  /* -----------------------------------------------------
     何番目かの表示（少ないときは点、多いときは「3 / 12」）
  ----------------------------------------------------- */
  function renderPager() {
    if (items.length <= 1) { pager.innerHTML = ''; return; }
    if (items.length >= S.pagerNumberFrom) {
      pager.innerHTML = '<span class="shop-count">' + (cur + 1) + ' / ' + items.length + '</span>';
      return;
    }
    pager.innerHTML = items.map(function (it, i) {
      return '<button class="shop-dot' + (i === cur ? ' is-active' : '') + '" data-index="' + i +
        '" aria-label="' + esc(it.name) + '"' + (i === cur ? ' aria-current="true"' : '') + '></button>';
    }).join('');
  }

  function setURL() {
    try {
      var u = new URL(location.href);
      u.searchParams.set('id', items[cur].id);
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    } catch (e) {}
  }

  /* -----------------------------------------------------
     キャラクターの動画
  ----------------------------------------------------- */
  function stopVideo(v) { v.pause(); v.classList.remove('is-playing'); }

  /* フェードイン動画を再生し、終わったら idle（最後のコマ）に切り替える */
  function playIn(item) {
    stopVideo(vOut);
    return loadVideo(src(item, 'in.webm')).then(function (url) {
      if (!url) { idleImg.classList.remove('is-hidden'); return false; }
      idleImg.classList.add('is-hidden');
      vIn.src = url;
      vIn.currentTime = 0;
      vIn.onended = function () { idleImg.classList.remove('is-hidden'); stopVideo(vIn); };
      return vIn.play().then(function () { vIn.classList.add('is-playing'); return true; })
        .catch(function () { idleImg.classList.remove('is-hidden'); return false; });
    });
  }

  /* フェードアウト動画を再生する（退場の動きと同時。途中で画面外に出てもよい） */
  function playOut(item) {
    stopVideo(vIn);
    return loadVideo(src(item, 'out.webm')).then(function (url) {
      if (!url) return false;
      vOut.src = url;
      vOut.currentTime = 0;
      return vOut.play().then(function () {
        vOut.classList.add('is-playing');
        idleImg.classList.add('is-hidden');
        return true;
      }).catch(function () { return false; });
    });
  }

  /* -----------------------------------------------------
     入場・退場
       dir = +1 … 「>」：右へ退場 → 左から入場
       dir = -1 … 「<」：左へ退場 → 右から入場
  ----------------------------------------------------- */
  function enter(dir) {
    var item = items[cur];
    var w = stage.clientWidth;
    var from = 'translateX(' + (-dir * w) + 'px)';
    var still = 'translateX(0px)';
    var E = S.enterMs;
    var playing = NO_ALPHA_VIDEO ? Promise.resolve(false) : playIn(item);
    return playing.then(function (videoOK) {
      // 動画がないときは静止画をフェードさせる（iPhone など）
      var cFrom = { transform: from, opacity: videoOK ? 1 : 0 };
      var cTo   = { transform: still, opacity: 1 };
      if (!videoOK) idleImg.classList.remove('is-hidden');
      return Promise.all([
        move(bgWrap, { transform: from }, { transform: still }, E.bg, EASE_OUT),
        move(win,    { transform: from }, { transform: still }, E.window, EASE_OUT),
        move(chara,  cFrom, cTo, E.chara, EASE_OUT)
      ]);
    });
  }

  function exit(dir) {
    var item = items[cur];
    var w = stage.clientWidth;
    var to = 'translateX(' + (dir * w) + 'px)';
    var still = 'translateX(0px)';
    var X = S.exitMs;
    var playing = NO_ALPHA_VIDEO ? Promise.resolve(false) : playOut(item);
    return playing.then(function (videoOK) {
      return Promise.all([
        move(chara,  { transform: still, opacity: 1 }, { transform: to, opacity: videoOK ? 1 : 0 }, X.chara, EASE_IN),
        move(win,    { transform: still }, { transform: to }, X.window, EASE_IN),
        move(bgWrap, { transform: still }, { transform: to }, X.bg, EASE_IN)
      ]);
    }).then(function () { stopVideo(vOut); });
  }

  /* 商品を切り替える。dir は動く向き（+1 = 「>」、-1 = 「<」） */
  function goTo(index, dir) {
    var n = items.length;
    index = ((index % n) + n) % n;
    if (busy || index === cur || n <= 1) return;
    busy = true;
    var next = index;
    var ready = preload(next);
    exit(dir).then(function () {
      return Promise.all([ready, wait(ms(S.gapMs))]);
    }).then(function () {
      cur = next;
      fill(items[cur]);
      renderPager();
      setURL();
      return enter(dir);
    }).then(function () {
      busy = false;
      preloadAround(cur);
    });
  }
  function goNext() { goTo(cur + 1, +1); }   // 最後の次は最初へ（右へ1つ進むだけ）
  function goPrev() { goTo(cur - 1, -1); }   // 最初の前は最後へ（左へ1つ戻るだけ）

  /* -----------------------------------------------------
     操作
  ----------------------------------------------------- */
  btnNext.addEventListener('click', goNext);
  btnPrev.addEventListener('click', goPrev);
  pager.addEventListener('click', function (e) {
    var dot = e.target.closest('.shop-dot');
    if (!dot) return;
    var i = Number(dot.getAttribute('data-index'));
    goTo(i, i > cur ? +1 : -1);
  });

  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
  });

  /* スマホの横なぞり：動く向きとなぞる向きをそろえる（右になぞる = 「>」） */
  (function () {
    var sx = 0, sy = 0, tracking = false;
    stage.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') return;
      if (e.target.closest('a, button')) return;
      tracking = true; sx = e.clientX; sy = e.clientY;
    });
    stage.addEventListener('pointerup', function (e) {
      if (!tracking) return;
      tracking = false;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) < S.swipePx || Math.abs(dx) < Math.abs(dy)) return;
      if (dx > 0) goNext(); else goPrev();
    });
    stage.addEventListener('pointercancel', function () { tracking = false; });
  }());

  /* 画面の向き・大きさが変わったら、PC 用 / スマホ用の配置を付け直す */
  window.addEventListener('resize', function () { applyLayout(items[cur]); });

  /* -----------------------------------------------------
     はじめの表示
       ?id= があればその商品から。なければいちばん新しい商品
       「おまたせ！」のパネルが下がってから入場させる
  ----------------------------------------------------- */
  (function start() {
    try {
      var id = new URLSearchParams(location.search).get('id');
      var found = items.findIndex(function (it) { return it.id === id; });
      if (found >= 0) cur = found;
    } catch (e) {}

    busy = true;
    // 入場前は画面の外（左）に置いておく
    var hide = { transform: 'translateX(' + (-stage.clientWidth) + 'px)' };
    [bgWrap, win, chara].forEach(function (el) { el.animate([hide, hide], { duration: 1, fill: 'forwards' }); });
    [btnNext, btnPrev].forEach(function (el) { el.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 1, fill: 'forwards' }); });

    fill(items[cur]);
    renderPager();
    setURL();

    preload(cur).then(function () {
      var arriving = window.SunTransition && SunTransition.isArriving;
      if (window.SunTransition) SunTransition.ready();
      // ★拡張予定: 別のページから来たとき、入場を始めるまでの待ち時間（「おまたせ！」の表示 + パネルが下がる時間）
      return wait(arriving ? 1000 : 0);
    }).then(function () {
      // ‹ › ボタンも外側から減速しながら入ってくる（「>」は右から左へ、「<」は左から右へ）
      move(btnNext, { transform: 'translateX(90px)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }, 600, EASE_OUT);
      move(btnPrev, { transform: 'translateX(-90px)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }, 600, EASE_OUT);
      return enter(+1);
    }).then(function () {
      busy = false;
      preloadAround(cur);
    });
  }());
}());
