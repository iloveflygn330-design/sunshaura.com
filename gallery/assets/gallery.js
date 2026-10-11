/* =====================================================
   sunshaura.com フォトギャラリー JS（gallery/index.html で読み込む）

   仕組み:
     1. 写真の一覧（gallery/data/photos.json）を読む
     2. 選んだアルバムの写真から、ランダムに3枚選ぶ（「画像を変更」では直前の3枚は選ばない）
     3. 毎回ちがう位置・角度に、重なりすぎないように配置する
     4. 1枚ずつ、透明な状態から横にスライドインして表示する
     5. 写真をクリックすると、背景をうす暗くして拡大表示する

   表示する画像:
     並べるとき   … 軽量版（gallery/generated/thumb/ … 横960pxのWebP）
     拡大表示     … 大きめ版（gallery/generated/large/ … 長辺1920pxのWebP）
     元の写真は容量が大きいので GitHub には上げていない（PCの MyWebSites_photo フォルダにだけある）。
     圧縮版と一覧は .github/scripts/gallery-build.js で作る（手順はそのファイルの先頭コメント）。
   ===================================================== */
(function () {
  'use strict';

  /* -----------------------------------------------------
     ★拡張予定: アルバム（元の写真フォルダ MyWebSites_photo の中のフォルダ）
       MyWebSites_photo\<フォルダ名>\ に写真を入れて圧縮すると、そのフォルダが1つのアルバムになる。
       ここに書いたアルバムは、この順番・この表示名でボタンが並ぶ。
       ここに書いていないフォルダも自動で表示される（ボタン名＝フォルダ名、上のものの後ろに名前順）。
         dir   : MyWebSites_photo の中のフォルダ名（半角英数字・_・- がおすすめ）
         label : ボタンに表示する名前（日本語OK）
       写真が1枚もないアルバムはボタンを出さない。
       アルバムが1つしかないときは、アルバムのボタン自体を出さない。
  ----------------------------------------------------- */
  var GALLERY_ALBUMS = [
    { dir: 'event', label: 'イベント' },
    { dir: 'world', label: 'ワールド' }
  ];
  /* MyWebSites_photo の直下（フォルダに入れていない写真）のアルバム名 */
  var ROOT_ALBUM_LABEL = 'その他';
  /* 全アルバムをまとめたボタンの名前（最初はこれが選ばれている） */
  var ALL_ALBUM_LABEL = 'すべて';

  /* 一度に表示する枚数（ワイヤーどおり3枚。変える場合は LAYOUT の PC_COLUMNS も同じ数にする） */
  var SHOW_COUNT = 3;

  /* -----------------------------------------------------
     ★拡張予定: 写真の並べ方（大きさ・散らばり具合・角度）
       数値は「台の幅」に対する割合。値を変えるだけで見た目を調整できる。

       PC（760px以上）: 横に3列。列ごとに上下の高さをずらして、ワイヤーのように散らす
         PC_PHOTO_WIDTH : 写真1枚の幅（0.36 = 台の幅の36%）
         PC_COLUMNS     : 各写真の中心の横位置（左・中・右）
         PC_JITTER_X    : 横位置のゆれ幅（±）
         PC_STAGE_RATIO : 台の高さ（台の幅に対する割合）
         PC_Y_MIN/MAX   : 写真の中心の縦位置の範囲（台の高さに対する割合）
         PC_Y_GAP       : となりの写真との縦位置の最低差（大きいほど重なりにくい）
         PC_ROTATE      : 角度の最大値（±度）
       SP（759px以下）: 縦に3枚。少しずつ重ねて、左右にずらす
         SP_PHOTO_WIDTH : 写真1枚の幅
         SP_OVERLAP     : 下の写真が上の写真に重なる割合（写真の高さに対して）
         SP_JITTER_X    : 左右のずれ幅（±）
         SP_ROTATE      : 角度の最大値（±度）
       ANIM_*           : 登場・退場アニメーションの時間（ミリ秒）と、横から入ってくる距離（px）
  ----------------------------------------------------- */
  var LAYOUT = {
    PC_PHOTO_WIDTH: 0.36,
    PC_COLUMNS:     [0.21, 0.50, 0.79],
    PC_JITTER_X:    0.025,
    PC_STAGE_RATIO: 0.54,
    PC_Y_MIN:       0.30,
    PC_Y_MAX:       0.70,
    PC_Y_GAP:       0.20,
    PC_ROTATE:      10,

    SP_PHOTO_WIDTH: 0.80,
    SP_OVERLAP:     0.10,
    SP_JITTER_X:    0.08,
    SP_ROTATE:      6,

    ANIM_IN_MS:     700,   // 1枚がスライドインする時間
    ANIM_STAGGER:   260,   // 次の写真が動き出すまでの間隔
    ANIM_OUT_MS:    320,   // 「画像を変更」で消えるときの時間
    ANIM_DISTANCE:  140    // 横から入ってくる距離
  };
  var SP_QUERY = window.matchMedia('(max-width: 759px)');

  /* =====================================================
     要素
     ===================================================== */
  var stage      = document.getElementById('gal-stage');
  var message    = document.getElementById('gal-message');
  var albumsNav  = document.getElementById('gal-albums');
  var shuffleBtn = document.getElementById('gal-shuffle');
  var countText  = document.getElementById('gal-count');
  var modal      = document.getElementById('gal-modal');
  var modalImg   = document.getElementById('gal-modal-img');
  var modalCap   = document.getElementById('gal-modal-caption');
  var modalPrev  = document.getElementById('gal-modal-prev');
  var modalNext  = document.getElementById('gal-modal-next');

  var ALL = '*';        // 「すべて」を表すアルバムID
  var allPhotos = [];   // 全写真 [{ id, album, thumb, large }]
  var albums    = [];   // [{ dir, label, count }]
  var current   = ALL;  // 選択中のアルバム
  var shown     = [];   // いま表示中の写真 [{ photo, el, pc:{...}, sp:{...}, from }]
  var busy      = false;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =====================================================
     汎用ヘルパー
     ===================================================== */
  function rand(min, max) { return min + Math.random() * (max - min); }
  function shuffle(list) {   // Fisher–Yates（偏りのないシャッフル）
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function showMessage(text) {
    message.textContent = text;
    message.hidden = !text;
  }
  /* "generated/thumb/event/a b.png.webp" → "generated/thumb/event/a%20b.png.webp"（フォルダ区切りの / は残す） */
  function encodePath(path) {
    return path.split('/').map(encodeURIComponent).join('/');
  }
  function albumLabel(dir) {
    if (dir === '') return ROOT_ALBUM_LABEL;
    for (var i = 0; i < GALLERY_ALBUMS.length; i++) {
      if (GALLERY_ALBUMS[i].dir === dir) return GALLERY_ALBUMS[i].label;
    }
    return dir;
  }

  /* =====================================================
     写真の一覧を取得（gallery/data/photos.json）
     photos.json は .github/scripts/gallery-build.js が自動で作るので、手で書き換えないこと。
     ===================================================== */
  function loadPhotoList() {
    return fetch('data/photos.json', { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) throw new Error('photos.json : ' + res.status);
      return res.json();
    }).then(function (data) {
      return (data.photos || [])
        .filter(function (p) { return p && p.thumb && p.large; })
        .map(function (p) {
          return {
            id: p.thumb,
            album: p.album || '',
            thumb: encodePath(p.thumb),
            large: encodePath(p.large)
          };
        });
    });
  }

  /* アルバムの一覧を作る（GALLERY_ALBUMS の順 → 書いていないフォルダの名前順 → 直下の写真） */
  function buildAlbums() {
    var counts = {};
    allPhotos.forEach(function (p) { counts[p.album] = (counts[p.album] || 0) + 1; });
    var listed = GALLERY_ALBUMS.map(function (a) { return a.dir; }).filter(function (d) { return counts[d]; });
    var others = Object.keys(counts).filter(function (d) { return d !== '' && listed.indexOf(d) < 0; }).sort();
    var dirs = listed.concat(others);
    if (counts['']) dirs.push('');
    return dirs.map(function (d) { return { dir: d, label: albumLabel(d), count: counts[d] }; });
  }

  function poolOf(album) {
    return album === ALL ? allPhotos : allPhotos.filter(function (p) { return p.album === album; });
  }

  /* =====================================================
     アルバムのボタン
     ★拡張予定: ボタンの見た目は gallery.css の .gal-albums / .gal-album-btn を編集する
     ===================================================== */
  function renderAlbums() {
    albumsNav.innerHTML = '';
    if (albums.length <= 1) { albumsNav.hidden = true; return; }
    albumsNav.hidden = false;
    var items = [{ dir: ALL, label: ALL_ALBUM_LABEL, count: allPhotos.length }].concat(albums);
    items.forEach(function (a) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gal-album-btn' + (a.dir === current ? ' active' : '');
      btn.setAttribute('aria-pressed', String(a.dir === current));
      btn.appendChild(document.createTextNode(a.label));
      var n = document.createElement('small');
      n.textContent = a.count;
      btn.appendChild(n);
      btn.addEventListener('click', function () { selectAlbum(a.dir); });
      albumsNav.appendChild(btn);
    });
  }

  /* URL の #album=フォルダ名 で、最初に開くアルバムを指定できる（共有用）
       例: gallery/#album=event    直下の写真は #album=_ */
  function albumFromHash() {
    var m = /album=([^&]+)/.exec(location.hash);
    if (!m) return ALL;
    var dir = decodeURIComponent(m[1]);
    if (dir === '_') dir = '';
    return albums.some(function (a) { return a.dir === dir; }) ? dir : ALL;
  }
  function writeHash() {
    if (!history.replaceState) return;
    var h = current === ALL ? location.pathname : '#album=' + encodeURIComponent(current === '' ? '_' : current);
    history.replaceState(null, '', h);
  }

  function selectAlbum(dir) {
    if (busy || dir === current) return;
    current = dir;
    renderAlbums();
    writeHash();
    changePhotos();
  }

  /* =====================================================
     写真の選び方
       選択中のアルバムから、直前に表示していた写真（exclude）を除いてランダムに選ぶ。
       写真が少なくて足りない場合だけ、直前の写真からも補う。
     ===================================================== */
  function pickPhotos(exclude) {
    var ex = exclude.map(function (p) { return p.id; });
    var pool = poolOf(current);
    var fresh = shuffle(pool.filter(function (p) { return ex.indexOf(p.id) < 0; }));
    var rest  = shuffle(pool.filter(function (p) { return ex.indexOf(p.id) >= 0; }));
    return fresh.concat(rest);   // 先頭から順に使う（読み込めなかった写真は飛ばして次へ）
  }

  /* 画像を読み込んでから表示する。どちらも読めなかった写真は飛ばして次の候補へ */
  function loadImage(urls) {
    return new Promise(function (resolve) {
      var i = 0;
      var img = new Image();
      img.decoding = 'async';
      img.onload  = function () { resolve(img); };
      img.onerror = function () { i++; if (i < urls.length) img.src = urls[i]; else resolve(null); };
      img.src = urls[0];
    });
  }
  function loadSet(candidates) {
    var result = [];
    var i = 0;
    function next() {
      if (result.length >= SHOW_COUNT || i >= candidates.length) return Promise.resolve(result);
      var need = SHOW_COUNT - result.length;
      var batch = candidates.slice(i, i + need);
      i += need;
      return Promise.all(batch.map(function (p) {
        return loadImage([p.thumb, p.large]);   // 軽量版が読めなければ大きめ版で表示
      })).then(function (imgs) {
        imgs.forEach(function (img, k) {
          if (img) result.push({ photo: batch[k], img: img });
          else console.warn('写真を読み込めませんでした:', batch[k].src);
        });
        return next();
      });
    }
    return next();
  }

  /* =====================================================
     配置（位置・角度）
       PC 用と SP 用の両方を選んだ時点で決めておき、
       画面幅が変わったら同じ配置のまま大きさだけ計算し直す。
     ===================================================== */
  function makePcSlots(count) {
    // 縦位置: となり同士が PC_Y_GAP 以上離れるように選ぶ（重なりすぎ防止）
    var ys;
    for (var tries = 0; tries < 60; tries++) {
      ys = [];
      for (var i = 0; i < count; i++) ys.push(rand(LAYOUT.PC_Y_MIN, LAYOUT.PC_Y_MAX));
      var ok = ys.every(function (y, k) { return k === 0 || Math.abs(y - ys[k - 1]) >= LAYOUT.PC_Y_GAP; });
      if (ok) break;
    }
    // どの写真をどの列に置くかもランダム
    var cols = shuffle(LAYOUT.PC_COLUMNS.slice(0, count).map(function (x, k) { return k; }));
    return cols.map(function (col) {
      return {
        col: col,
        x: LAYOUT.PC_COLUMNS[col] + rand(-LAYOUT.PC_JITTER_X, LAYOUT.PC_JITTER_X),
        y: ys[col],
        rot: rand(-LAYOUT.PC_ROTATE, LAYOUT.PC_ROTATE)
      };
    });
  }
  function makeSpSlots(count) {
    var side = Math.random() < 0.5 ? -1 : 1;   // 左右交互にずらす（1枚目の向きはランダム）
    var slots = [];
    for (var i = 0; i < count; i++) {
      slots.push({
        row: i,
        x: 0.5 + side * rand(LAYOUT.SP_JITTER_X * 0.3, LAYOUT.SP_JITTER_X),
        rot: side * rand(1.5, LAYOUT.SP_ROTATE)
      });
      side *= -1;
    }
    return slots;
  }

  /* 決めておいた配置を、いまの画面幅で px に直して書き込む */
  function applyLayout() {
    if (!shown.length) return;
    var W = stage.clientWidth;
    var isSp = SP_QUERY.matches;
    var pw = W * (isSp ? LAYOUT.SP_PHOTO_WIDTH : LAYOUT.PC_PHOTO_WIDTH);

    shown.forEach(function (s) { s.el.style.width = pw + 'px'; });
    var ph = shown[0].el.offsetHeight;   // 白フチ込みの高さ（CSSの3:2 + フチ）

    if (isSp) {
      var step = ph * (1 - LAYOUT.SP_OVERLAP);
      var top0 = ph * 0.06;              // 回転して上にはみ出す分の余白
      shown.forEach(function (s) {
        var cx = W * s.sp.x;
        s.el.style.left = (cx - pw / 2) + 'px';
        s.el.style.top  = (top0 + s.sp.row * step) + 'px';
        s.el.style.setProperty('--rot', s.sp.rot.toFixed(2) + 'deg');
        s.from = cx < W / 2 ? -1 : 1;    // 左寄りの写真は左から、右寄りは右から入ってくる
      });
      stage.style.height = (top0 * 2 + (shown.length - 1) * step + ph) + 'px';
    } else {
      var H = W * LAYOUT.PC_STAGE_RATIO;
      shown.forEach(function (s) {
        var cx = W * s.pc.x, cy = H * s.pc.y;
        s.el.style.left = (cx - pw / 2) + 'px';
        s.el.style.top  = (cy - ph / 2) + 'px';
        s.el.style.setProperty('--rot', s.pc.rot.toFixed(2) + 'deg');
        s.from = s.pc.col === 0 ? -1 : s.pc.col === LAYOUT.PC_COLUMNS.length - 1 ? 1 : (Math.random() < 0.5 ? -1 : 1);
      });
      stage.style.height = H + 'px';
    }
  }

  /* =====================================================
     写真の要素を作る
     ===================================================== */
  function buildPhoto(item, index) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gal-photo';
    btn.setAttribute('aria-label', '写真' + (index + 1) + 'を拡大表示');
    btn.style.opacity = '0';   // 登場アニメーションまでは見せない

    var frame = document.createElement('span');
    frame.className = 'gal-photo-frame';
    var img = item.img;
    img.className = 'gal-photo-img';
    img.alt = '';              // 説明は付けない（ボタンの aria-label で写真であることを伝える）
    img.draggable = false;
    frame.appendChild(img);
    btn.appendChild(frame);

    btn.addEventListener('click', function () { openModal(index); });
    return btn;
  }

  /* =====================================================
     アニメーション
       登場: 1枚ずつ、透明＋横にずれた位置 → 本来の位置へスライドイン
       退場: 入ってきたのと同じ方向へ、すばやくスライドアウト
       回転は CSS の --rot で付けているので、アニメーションでも同じ角度を保つ
     ===================================================== */
  function animateIn() {
    // 重なり順 = 登場順（あとから入ってきた写真が上に乗る）。順番は毎回ランダム
    var order = shuffle(shown.map(function (s, k) { return k; }));
    var anims = order.map(function (k, n) {
      var s = shown[k];
      s.el.style.zIndex = String(n + 1);
      s.el.style.opacity = '';
      var rot = 'rotate(' + s.el.style.getPropertyValue('--rot') + ')';
      if (reduceMotion) return Promise.resolve();
      var a = s.el.animate([
        { opacity: 0, transform: 'translateX(' + (s.from * LAYOUT.ANIM_DISTANCE) + 'px) ' + rot },
        { opacity: 1, transform: 'translateX(0) ' + rot }
      ], {
        duration: LAYOUT.ANIM_IN_MS,
        delay: n * LAYOUT.ANIM_STAGGER,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'backwards'   // 動き出すまでは透明のまま待つ
      });
      return a.finished.catch(function () {});
    });
    return Promise.all(anims);
  }

  function animateOut() {
    var anims = shown.map(function (s) {
      if (reduceMotion) return Promise.resolve();
      var rot = 'rotate(' + s.el.style.getPropertyValue('--rot') + ')';
      var a = s.el.animate([
        { opacity: 1, transform: 'translateX(0) ' + rot },
        { opacity: 0, transform: 'translateX(' + (s.from * LAYOUT.ANIM_DISTANCE * 0.6) + 'px) ' + rot }
      ], { duration: LAYOUT.ANIM_OUT_MS, easing: 'ease-in', fill: 'forwards' });
      return a.finished.catch(function () {});
    });
    return Promise.all(anims).then(function () {
      shown.forEach(function (s) { s.el.remove(); });
      shown = [];
    });
  }

  /* =====================================================
     表示する（初回・「画像を変更」・アルバム切り替え共通）
     ===================================================== */
  function showSet(exclude, waitBeforeIn) {
    var candidates = pickPhotos(exclude);
    return loadSet(candidates).then(function (loaded) {
      if (!loaded.length) {
        showMessage('写真を読み込めませんでした。\n時間をおいてもう一度開いてみてください。');
        stage.style.height = '';
        return;
      }
      showMessage('');
      var pcSlots = makePcSlots(loaded.length);
      var spSlots = makeSpSlots(loaded.length);
      shown = loaded.map(function (item, k) {
        var el = buildPhoto(item, k);
        stage.appendChild(el);
        return { photo: item.photo, el: el, pc: pcSlots[k], sp: spSlots[k], from: -1 };
      });
      applyLayout();
      return (waitBeforeIn ? waitBeforeIn() : Promise.resolve()).then(animateIn);
    });
  }

  /* いまの写真を消して、新しい3枚を出す（直前の写真は選ばない） */
  function changePhotos() {
    busy = true;
    updateControls();
    var previous = shown.map(function (s) { return s.photo; });
    return animateOut()
      .then(function () { return showSet(previous); })
      .catch(function (e) { console.error(e); })
      .then(function () { busy = false; updateControls(); });
  }

  function updateControls() {
    var pool = poolOf(current);
    var canChange = pool.length > shown.length;
    shuffleBtn.disabled = busy || !canChange;
    shuffleBtn.title = canChange ? '' : '写真が' + (SHOW_COUNT + 1) + '枚以上になると入れ替えられます';
    var name = current === ALL ? '' : '「' + albumLabel(current) + '」';
    countText.textContent = pool.length ? name + '全' + pool.length + '枚の中からランダムに表示中' : '';
    Array.prototype.forEach.call(albumsNav.querySelectorAll('button'), function (b) { b.disabled = busy; });
  }

  shuffleBtn.addEventListener('click', function () { if (!busy) changePhotos(); });

  /* 画面幅が変わったら配置を計算し直す（PC ⇔ SP の切り替えも含む） */
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyLayout, 120);
  });

  /* =====================================================
     拡大表示（モーダル）
       背景クリック・×ボタン・Escキーで閉じる。
       ‹ › ボタン・← → キー・スワイプで、いま表示中の3枚を切り替えられる。
       大きめ版（generated/large）を表示する。読めなければ軽量版で表示する。
     ===================================================== */
  var modalIndex = 0;
  var lastFocus = null;

  function showInModal(index) {
    var n = shown.length;
    modalIndex = (index + n) % n;
    var p = shown[modalIndex].photo;
    var urls = [p.large, p.thumb];
    var k = 0;
    modalImg.onerror = function () { k++; if (k < urls.length) modalImg.src = urls[k]; };
    modalImg.src = urls[0];
    modalImg.alt = '';
    modalCap.textContent = (modalIndex + 1) + ' / ' + n;
    modalPrev.hidden = modalNext.hidden = n <= 1;
  }
  function openModal(index) {
    if (busy) return;
    lastFocus = document.activeElement;
    showInModal(index);
    modal.hidden = false;
    document.body.classList.add('gal-modal-lock');
    requestAnimationFrame(function () { requestAnimationFrame(function () { modal.classList.add('open'); }); });
    modal.querySelector('.gal-modal-close').focus();
  }
  function closeModal() {
    if (modal.hidden) return;
    modal.classList.remove('open');
    document.body.classList.remove('gal-modal-lock');
    setTimeout(function () { modal.hidden = true; modalImg.removeAttribute('src'); }, reduceMotion ? 0 : 300);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  Array.prototype.forEach.call(modal.querySelectorAll('[data-gal-close]'), function (b) {
    b.addEventListener('click', closeModal);
  });
  modalPrev.addEventListener('click', function () { showInModal(modalIndex - 1); });
  modalNext.addEventListener('click', function () { showInModal(modalIndex + 1); });
  document.addEventListener('keydown', function (e) {
    if (modal.hidden) return;
    if (e.key === 'Escape')     closeModal();
    if (e.key === 'ArrowLeft')  showInModal(modalIndex - 1);
    if (e.key === 'ArrowRight') showInModal(modalIndex + 1);
  });
  var touchX = null;
  modal.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
  modal.addEventListener('touchend', function (e) {
    if (touchX == null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 50 && shown.length > 1) showInModal(modalIndex + (dx < 0 ? 1 : -1));
  });

  /* =====================================================
     起動
     ===================================================== */
  // ヘッダー（ナビボタンの並びは assets/site-header.js で全ページ共通管理）
  if (window.SunHeader) SunHeader.render({ root: '../', current: 'gallery' });

  /* 中身の準備ができたら遷移パネルに「おまたせ！」を出す。
     演出つきで来た場合は、パネルが下がりきってから写真を登場させる */
  var readyCalled = false;
  function notifyReady() {
    if (readyCalled) return;
    readyCalled = true;
    if (window.SunTransition) SunTransition.ready();
  }
  function waitForPanel() {
    notifyReady();
    var arriving = window.SunTransition && SunTransition.isArriving;
    return wait(arriving ? 1100 : 150);   // 1100 = 「おまたせ！」400ms + パネルが下がる 600ms + 少し
  }

  busy = true;
  loadPhotoList()
    .then(function (list) {
      allPhotos = list;
      albums = buildAlbums();
      current = albumFromHash();
      renderAlbums();
      if (!allPhotos.length) {
        showMessage('まだ写真がありません。');
        return;
      }
      return showSet([], waitForPanel);
    })
    .catch(function (e) {
      console.error(e);
      showMessage('写真の一覧を読み込めませんでした。\n時間をおいてもう一度開いてみてください。');
    })
    .then(function () {
      notifyReady();
      busy = false;
      updateControls();
    });
}());
