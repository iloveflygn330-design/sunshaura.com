/* =====================================================
   このサイトについて（about/index.html）の動き

   やること:
     1. about-data.js の中身から、プロフィールカードとクレジットの文字を作る
     2. 物理演算（Matter.js）で、カードを投げて遊べるようにする
          ・大きいカードのリンク以外をクリック → 小さくなってドラッグできる
          ・つかんだ点をバネでつなぐので、端を持って振り回すとその点を軸にくるくる回る
          ・勢いをつけて離すと飛んでいき、壁で跳ね返りながら減速する
          ・カードがぶつかったクレジットの文字（1行ずつの塊）は、勢いを受けて飛び散る
            飛んでいる塊同士がぶつかると、それも飛び散る
          ・カードが止まって 10 秒たつと、文字はふわっと元の位置へ戻る（「元に戻す」ボタンでもすぐ戻る）
          ・小さいカードをダブルクリック（ダブルタップ）→ 真ん中に戻って大きくなる
     3. OS の「視差効果を減らす」がオンのとき・Matter.js が読み込めなかったときは、動きなしで普通に並べる

   座標のしくみ（直すとき用のメモ）:
     ・物理演算の世界 = .about-stage の「今見えている四角」。左上が (0, 0)。壁はこの四角の外側に置く
     ・スマホはクレジットが横にスクロールするので、文字の「元の位置」はスクロール込みの座標（ox, oy）で覚え、
       物理演算の世界では ox - スクロール量 の場所に置く
     ・飛んでいる文字は、元の場所からのずれを transform で描く（HTML の並びは変えない）

   ★拡張予定: 触り心地（跳ね返り・減速・回りやすさ・戻るまでの時間）を変える → about-data.js の ABOUT_PHYSICS
   ★拡張予定: プロフィール・クレジットの中身を変える → about-data.js の ABOUT_PROFILE / ABOUT_CREDITS
   ===================================================== */
(function () {
  'use strict';

  var ROOT = '../';   // このページからサイトのトップへの場所
  /* 物理演算ライブラリ（MIT License）。バージョンを変えるときは cdnjs の URL を書き換える */
  var MATTER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.20.0/matter.min.js';

  var P  = ABOUT_PROFILE;
  var CR = ABOUT_CREDITS;
  var PH = ABOUT_PHYSICS;

  var stage    = document.getElementById('about-stage');
  var scroller = document.getElementById('about-scroller');
  var card     = document.getElementById('about-card');
  var inner    = document.getElementById('about-card-inner');
  var resetBtn = document.getElementById('about-reset');
  var hint     = document.getElementById('about-hint');
  if (!stage || !card) return;

  var mqSP     = window.matchMedia('(max-width: 759px)');
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- 小さな道具 ---------- */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function isExternal(href) { return /^https?:\/\//.test(href); }
  function makeLink(href, text) {
    var a = el('a', '', text);
    if (isExternal(href)) {
      a.href = href; a.target = '_blank'; a.rel = 'noopener';
    } else {
      a.href = ROOT + href;
      a.setAttribute('data-transition', '');   // サイト内は「ちょっとまってね...」の演出つき
    }
    a.draggable = false;
    return a;
  }

  /* =====================================================
     1. クレジットの文字を作る
        1行（見出し・名前・作者・補足・リンク）＝「塊」1つ（.about-chunk）
     ===================================================== */
  function buildCredits() {
    var cols = { left: document.getElementById('about-col-left'), right: document.getElementById('about-col-right') };
    CR.forEach(function (sec) {
      var col = cols[sec.side] || cols.right;
      var s = el('section', 'about-sec');
      s.appendChild(el('h2', 'about-sec-title about-chunk', sec.title));
      if (!sec.items || !sec.items.length) {
        s.appendChild(el('p', 'about-empty about-chunk', '（準備中）'));
      }
      (sec.items || []).forEach(function (it) {
        var item = el('div', 'about-item');
        if (it.name)   item.appendChild(el('div', 'about-item-name about-chunk', it.name));
        if (it.author) item.appendChild(el('div', 'about-item-sub about-chunk', '作者：' + it.author));
        if (it.note)   item.appendChild(el('div', 'about-item-sub about-chunk', it.note));
        if (it.url) {
          var c = el('div', 'about-item-link about-chunk');
          c.appendChild(makeLink(it.url, '【' + (it.linkText || sec.linkText || 'サイトに移動する') + '】'));
          item.appendChild(c);
        }
        s.appendChild(item);
      });
      col.appendChild(s);
    });
  }

  /* =====================================================
     2. プロフィールカードを作る
     ===================================================== */
  function sinceText(ym) {
    var m = /^(\d{4})-(\d{1,2})$/.exec(ym || '');
    if (!m) return ym || '';
    var y = +m[1], mo = +m[2];
    var now = new Date();
    var months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - mo);
    var len = months >= 12 ? Math.floor(months / 12) + '年' + (months % 12 ? (months % 12) + 'か月' : '') : Math.max(0, months) + 'か月';
    return { main: y + '/' + String(mo).padStart(2, '0') + ' 〜', sub: '（' + len + '）' };
  }

  var statusTextEl, statusDateEl, photoEl;

  function buildCard() {
    inner.appendChild(el('span', 'about-card-tag', 'PROFILE'));

    photoEl = el('div', 'about-card-photo');
    photoEl.setAttribute('role', 'img');
    photoEl.setAttribute('aria-label', P.name + 'の写真');
    inner.appendChild(photoEl);

    var head = el('div', 'about-card-head');
    head.appendChild(el('p', 'about-card-name', P.name));
    if (P.nameSub) head.appendChild(el('p', 'about-card-name-sub', P.nameSub));
    var st = el('div', 'about-card-status');
    var lb = el('p', 'about-card-status-label', P.status.label);
    statusDateEl = el('span', 'about-card-status-date', '');
    lb.appendChild(statusDateEl);
    st.appendChild(lb);
    statusTextEl = el('p', 'about-card-status-text', P.status.fallback);
    st.appendChild(statusTextEl);
    head.appendChild(st);
    inner.appendChild(head);

    var body = el('div', 'about-card-body');
    P.rows.forEach(function (r) {
      var row = el('div', 'about-card-row');
      row.appendChild(el('span', 'about-card-row-label', r.label));
      var v = el('span', 'about-card-row-value');
      if (r.since) {
        var t = sinceText(r.since);
        v.textContent = t.main || t;
        if (t.sub) v.appendChild(el('small', '', t.sub));
      } else if (r.href) {
        v.appendChild(makeLink(r.href, r.text));
      } else {
        v.textContent = r.text || '';
      }
      row.appendChild(v);
      body.appendChild(row);
    });
    var links = el('div', 'about-card-links');
    P.links.forEach(function (l) { links.appendChild(makeLink(l.href, l.label)); });
    body.appendChild(links);
    inner.appendChild(body);
  }

  /* 今のひとこと（Discord から取り込んだ文字。.github/scripts/discord-status.js が about/data/status.json に書く） */
  function loadStatus() {
    // 10分ごとに変わる番号を付けて、ブラウザの古い保存を使わないようにする
    fetch(P.status.file + '?t=' + Math.floor(Date.now() / 600000))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.text) return;
        statusTextEl.textContent = d.text;
        if (d.updatedAt) {
          var dt = new Date(d.updatedAt);
          if (!isNaN(dt)) statusDateEl.textContent = (dt.getMonth() + 1) + '/' + dt.getDate() + ' 更新';
        }
      })
      .catch(function () {});
  }

  /* 写真（一覧から毎回ランダムに1枚） */
  function loadPhoto() {
    var lists = P.photoLists.slice();
    (function next() {
      var L = lists.shift();
      if (!L) return;
      fetch(L.file).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        var items = [];
        if (d) L.keys.forEach(function (k) { if (Array.isArray(d[k])) items = items.concat(d[k]); });
        if (!items.length) return next();
        var it = items[Math.floor(Math.random() * items.length)];
        photoEl.style.backgroundImage = 'url("' + ROOT + (it.webp || it.src) + '")';
      }).catch(next);
    })();
  }

  /* =====================================================
     3. 動きなし（視差効果を減らす・読み込み失敗）
     ===================================================== */
  function staticMode() {
    stage.classList.add('is-static');
    card.classList.add('is-ready');
    function fit() {   // スマホでは、カードを画面の幅に合わせて縮める（レイアウトはそのまま）
      var z = Math.min(1, (stage.clientWidth - 24) / card.offsetWidth || 1);
      stage.style.setProperty('--about-static-zoom', z.toFixed(3));
    }
    fit();
    window.addEventListener('resize', fit);
  }

  /* =====================================================
     4. 物理演算
     ===================================================== */
  var M, engine;
  var CAT = { WALL: 1, CARD: 2, REST: 4, FLY: 8 };   // 当たり判定のグループ（REST=止まっている文字、FLY=飛んでいる文字）
  var view = { w: 0, h: 0 };          // 世界（今見えている .about-stage）の大きさ
  var scrollX = 0;                    // クレジットの横スクロール量（スマホ）
  var walls = [];
  var chunks = [];                    // { el, body, ox, oy, state: 'rest' | 'fly' }
  var cardBody = null;
  var cardW = 0, cardH = 0;           // カードの元の大きさ（--card-w / --card-h）
  var mode = 'big';                   // 'big' 大きい / 'small' 小さい（物理演算中） / 'anim' 切り替え中
  var cardPose = { x: 0, y: 0, a: 0, s: 1 };
  var down = null;                    // 押している指・マウスの情報
  var grab = null;                    // つかんでいるバネ（Matter.Constraint）
  var suppressClick = false;
  var lastTap = 0;
  var idleMs = 0;
  var DEG = Math.PI / 180;

  function stagePoint(e) {
    var r = stage.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  /* カードの見た目を置く（中心 x, y・角度 a（ラジアン）・倍率 s） */
  function drawCard(x, y, a, s) {
    cardPose = { x: x, y: y, a: a, s: s };
    card.style.transform = 'translate(' + (x - cardW / 2).toFixed(2) + 'px,' + (y - cardH / 2).toFixed(2) + 'px) rotate(' +
      a.toFixed(4) + 'rad) scale(' + s.toFixed(4) + ')';
  }

  /* 大きいカードの場所と倍率（今見えている範囲の真ん中） */
  function bigPose() {
    var sr = stage.getBoundingClientRect();
    var visibleH = Math.max(200, Math.min(view.h, window.innerHeight - Math.max(0, sr.top)));
    if (mqSP.matches) {
      // スマホ：上の段と下の段のあいだ（.about-col-gap）に収める
      var g = stage.querySelector('.about-col-gap').getBoundingClientRect();
      var gTop = g.top - sr.top, gH = Math.max(120, g.height);
      // 傾けたぶん少しはみ出すので 1.15 倍の余裕を見る
      var ss = Math.min(1, (view.w - 28) / cardW, (gH - 8) / (cardH * 1.15));
      return { x: view.w / 2, y: gTop + gH / 2, a: PH.bigTilt * DEG, s: ss };
    }
    var s = Math.min(1, (view.w - 48) / cardW, (visibleH - 90) / cardH);
    return { x: view.w / 2, y: visibleH / 2 - 10, a: PH.bigTilt * DEG, s: s };
  }

  /* 大きいカードのすぐ下に、操作のヒントを置く */
  function placeHint(pose) {
    hint.style.top = (pose.y + cardH * pose.s * 0.62) + 'px';
  }
  function smallScale() { return (mqSP.matches ? PH.smallWidthSP : PH.smallWidthPC) / cardW; }

  function measureView() {
    view.w = stage.clientWidth;
    view.h = stage.clientHeight;
    scrollX = scroller.scrollLeft || 0;
    cardW = card.offsetWidth;
    cardH = card.offsetHeight;
  }

  function buildWalls() {
    var T = 400, B = M.Bodies, W = view.w, H = view.h;
    if (walls.length) M.Composite.remove(engine.world, walls);
    var opt = { isStatic: true, friction: 0.1, restitution: 0, collisionFilter: { category: CAT.WALL } };
    walls = [
      B.rectangle(W / 2, -T / 2, W + T * 2, T, opt),
      B.rectangle(W / 2, H + T / 2, W + T * 2, T, opt),
      B.rectangle(-T / 2, H / 2, T, H + T * 2, opt),
      B.rectangle(W + T / 2, H / 2, T, H + T * 2, opt)
    ];
    M.Composite.add(engine.world, walls);
  }

  /* 文字の塊を測って、止まっている（すり抜ける）当たり判定を作る */
  function buildChunks() {
    chunks.forEach(function (c) { M.Composite.remove(engine.world, c.body); });
    chunks = [];
    var sr = stage.getBoundingClientRect();
    Array.prototype.forEach.call(stage.querySelectorAll('.about-chunk'), function (e) {
      e.style.transform = '';
      e.classList.remove('is-flying', 'is-restoring');
      var r = e.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      var ox = r.left - sr.left + r.width / 2 + scrollX;
      var oy = r.top - sr.top + r.height / 2;
      var body = M.Bodies.rectangle(ox - scrollX, oy, r.width, r.height, {
        isSensor: true, frictionAir: PH.chunkFrictionAir, restitution: 0.6, friction: 0.05, density: 0.0006,
        collisionFilter: { category: CAT.REST, mask: CAT.CARD | CAT.FLY }
      });
      M.Body.setStatic(body, true);   // 一度動く体として作ってから止める（あとで動かすときに重さが戻るように）
      var c = { el: e, body: body, ox: ox, oy: oy, state: 'rest' };
      body.plugin.chunk = c;
      chunks.push(c);
    });
    M.Composite.add(engine.world, chunks.map(function (c) { return c.body; }));
  }

  /* 文字の塊を飛ばす */
  function scatter(c, hitter) {
    var V = M.Vector, B = M.Body;
    c.state = 'fly';
    c.el.classList.remove('is-restoring');
    c.el.classList.add('is-flying');
    B.setStatic(c.body, false);
    c.body.isSensor = false;
    c.body.collisionFilter = { category: CAT.FLY, mask: CAT.WALL | CAT.CARD | CAT.FLY | CAT.REST, group: 0 };
    var v = hitter.velocity;
    var sp = V.magnitude(v);
    var dir = V.normalise(V.sub(c.body.position, hitter.position));
    var k = PH.scatterPower;
    B.setVelocity(c.body, {
      x: v.x * k * 0.7 + dir.x * sp * k * 0.6 + (Math.random() - 0.5) * 2,
      y: v.y * k * 0.7 + dir.y * sp * k * 0.6 + (Math.random() - 0.5) * 2
    });
    B.setAngularVelocity(c.body, (Math.random() - 0.5) * Math.min(0.35, 0.03 + sp * 0.012));
    resetBtn.hidden = false;
  }

  /* 文字を元の位置に戻す（instant = true なら動きなしで一瞬で戻す） */
  function restoreAll(instant) {
    chunks.forEach(function (c) {
      if (c.state !== 'fly') return;
      var B = M.Body;
      B.setVelocity(c.body, { x: 0, y: 0 });
      B.setAngularVelocity(c.body, 0);
      B.setStatic(c.body, true);
      c.body.isSensor = true;
      c.body.collisionFilter = { category: CAT.REST, mask: CAT.CARD | CAT.FLY, group: 0 };
      B.setAngle(c.body, 0);
      B.setPosition(c.body, { x: c.ox - scrollX, y: c.oy });
      c.state = 'rest';
      c.el.classList.remove('is-flying');
      if (!instant) {
        c.el.classList.add('is-restoring');
        setTimeout(function () { if (c.state === 'rest') c.el.classList.remove('is-restoring'); }, PH.restoreMs + 50);
      }
      c.el.style.transform = '';
    });
    idleMs = 0;
    resetBtn.hidden = true;
  }

  /* 大きい → 小さい */
  function shrink() {
    if (mode !== 'big' || !engine) return;
    mode = 'anim';
    hint.classList.add('is-hidden');
    var s = smallScale();
    var x = cardPose.x, y = cardPose.y, a = PH.smallTilt * DEG;
    card.classList.add('is-animating');
    drawCard(x, y, a, s);
    setTimeout(function () {
      card.classList.remove('is-animating');
      cardBody = M.Bodies.rectangle(x, y, cardW * s, cardH * s, {
        angle: a, frictionAir: PH.frictionAir, restitution: PH.restitution, friction: 0.1,
        density: 0.002, chamfer: { radius: 14 * s },
        collisionFilter: { category: CAT.CARD, mask: CAT.WALL | CAT.REST | CAT.FLY }
      });
      M.Composite.add(engine.world, cardBody);
      card.classList.add('is-small');
      mode = 'small';
    }, 520);
  }

  /* 小さい → 大きい（真ん中に戻る） */
  function enlarge() {
    if (mode !== 'small') return;
    releaseGrab();
    mode = 'anim';
    var a = cardBody.angle, target = bigPose();
    M.Composite.remove(engine.world, cardBody);
    cardBody = null;
    card.classList.remove('is-small');
    // 何周も回って戻らないよう、いちばん近い向きにそろえてから動かす
    a = a - Math.round((a - target.a) / (Math.PI * 2)) * Math.PI * 2;
    drawCard(cardPose.x, cardPose.y, a, cardPose.s);
    void card.offsetWidth;
    card.classList.add('is-animating');
    drawCard(target.x, target.y, target.a, target.s);
    setTimeout(function () {
      card.classList.remove('is-animating');
      mode = 'big';
    }, 520);
  }

  function releaseGrab() {
    if (grab) { M.Composite.remove(engine.world, grab); grab = null; }
    card.classList.remove('is-dragging');
  }

  /* ---------- 指・マウスの操作 ---------- */
  function onDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    down = { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), moved: false,
             onLink: !!(e.target.closest && e.target.closest('a')) };
    if (mode === 'small' && cardBody) {
      var p = stagePoint(e);
      grab = M.Constraint.create({
        pointA: p, bodyB: cardBody,
        pointB: { x: p.x - cardBody.position.x, y: p.y - cardBody.position.y },
        length: 0, stiffness: PH.grabStiffness, damping: 0.1
      });
      M.Composite.add(engine.world, grab);
      card.classList.add('is-dragging');
      if (e.pointerType !== 'mouse') e.preventDefault();
    }
  }
  function onMove(e) {
    if (!down || e.pointerId !== down.id) return;
    if (Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) > 6) down.moved = true;
    if (grab) grab.pointA = stagePoint(e);
  }
  function onUp(e) {
    if (!down || e.pointerId !== down.id) return;
    var d = down; down = null;
    releaseGrab();
    if (e.type === 'pointercancel') return;
    if (d.moved) { suppressClick = true; setTimeout(function () { suppressClick = false; }, 0); return; }
    if (Date.now() - d.t > 600) return;   // 長押しはクリック扱いにしない
    if (mode === 'big') {
      if (!d.onLink) shrink();
    } else if (mode === 'small') {
      var now = Date.now();
      if (now - lastTap < PH.doubleTapMs) { lastTap = 0; enlarge(); }
      else lastTap = now;
    }
  }

  /* ---------- 毎フレームの処理 ---------- */
  var lastT = 0;
  function tick(t) {
    var dt = lastT ? Math.min(50, t - lastT) : 16.7;
    lastT = t;
    var steps = dt > 25 ? 2 : 1;
    for (var i = 0; i < steps; i++) M.Engine.update(engine, 1000 / 60);

    // カード
    if (cardBody && mode === 'small') {
      var v = cardBody.velocity, sp = Math.hypot(v.x, v.y);
      if (sp > PH.maxSpeed) M.Body.setVelocity(cardBody, { x: v.x * PH.maxSpeed / sp, y: v.y * PH.maxSpeed / sp });
      if (Math.abs(cardBody.angularVelocity) > 0.6) M.Body.setAngularVelocity(cardBody, Math.sign(cardBody.angularVelocity) * 0.6);
      keepInside(cardBody);
      drawCard(cardBody.position.x, cardBody.position.y, cardBody.angle, cardPose.s);
    }

    // 飛んでいる文字
    var anyFly = false;
    for (var j = 0; j < chunks.length; j++) {
      var c = chunks[j];
      if (c.state !== 'fly') continue;
      anyFly = true;
      keepInside(c.body);
      var b = c.body;
      c.el.style.transform = 'translate(' + (b.position.x - (c.ox - scrollX)).toFixed(1) + 'px,' +
        (b.position.y - c.oy).toFixed(1) + 'px) rotate(' + b.angle.toFixed(4) + 'rad)';
    }

    // カードが止まって ○秒たったら、文字を元に戻す
    var cardStill = mode !== 'small' || (cardBody && cardBody.speed < 0.25 && !grab);
    if (anyFly && cardStill && !down) {
      idleMs += dt;
      if (idleMs >= PH.restoreAfterMs) restoreAll(false);
    } else {
      idleMs = 0;
    }
    requestAnimationFrame(tick);
  }

  /* 速すぎて壁を突き抜けたときの保険：外に出たら中に戻して向きを反転 */
  function keepInside(b) {
    var p = b.position, v = b.velocity, x = p.x, y = p.y, vx = v.x, vy = v.y, out = false;
    if (x < 0) { x = 4; vx = Math.abs(vx); out = true; }
    if (x > view.w) { x = view.w - 4; vx = -Math.abs(vx); out = true; }
    if (y < 0) { y = 4; vy = Math.abs(vy); out = true; }
    if (y > view.h) { y = view.h - 4; vy = -Math.abs(vy); out = true; }
    if (out) { M.Body.setPosition(b, { x: x, y: y }); M.Body.setVelocity(b, { x: vx, y: vy }); }
  }

  /* 画面の大きさが変わったとき：文字は一瞬で元に戻して、測り直す */
  function relayout() {
    if (!engine) return;
    restoreAll(true);
    measureView();
    buildWalls();
    buildChunks();
    if (mode === 'big') {
      var bp = bigPose(); drawCard(bp.x, bp.y, bp.a, bp.s); placeHint(bp);
    } else if (cardBody) {
      keepInside(cardBody);
    }
  }

  /* スマホの横スクロール：止まっている文字の当たり判定を、見えている位置に合わせて動かす */
  function onScroll() {
    scrollX = scroller.scrollLeft || 0;
    if (!engine) return;
    chunks.forEach(function (c) {
      if (c.state === 'rest') M.Body.setPosition(c.body, { x: c.ox - scrollX, y: c.oy });
    });
  }

  function initPhysics() {
    M = window.Matter;
    if (!M) return staticMode();
    engine = M.Engine.create({ enableSleeping: false });
    engine.gravity.x = 0; engine.gravity.y = 0;

    M.Events.on(engine, 'collisionStart', function (ev) {
      ev.pairs.forEach(function (pair) { hit(pair.bodyA, pair.bodyB); hit(pair.bodyB, pair.bodyA); });
    });
    function hit(target, hitter) {
      var c = target.plugin && target.plugin.chunk;
      if (!c || c.state !== 'rest') return;
      var isCard = hitter === cardBody;
      var isFly = hitter.plugin && hitter.plugin.chunk && hitter.plugin.chunk.state === 'fly';
      if (!isCard && !isFly) return;
      if (hitter.speed < PH.scatterSpeed) return;
      scatter(c, hitter);
    }

    measureView();
    buildWalls();
    buildChunks();
    requestAnimationFrame(tick);
  }

  /* =====================================================
     はじめに
     ===================================================== */
  buildCredits();
  buildCard();
  loadStatus();
  loadPhoto();
  stage.style.setProperty('--about-restore-ms', PH.restoreMs + 'ms');

  // フッターの高さに合わせて、領域の高さを決める
  var foot = document.querySelector('[data-site-footer]');
  if (foot) document.body.style.setProperty('--about-foot-h', foot.offsetHeight + 'px');

  if (mqReduce.matches) { staticMode(); return; }

  // 物理演算を読み込む前に、大きいカードだけ先に出しておく
  measureView();
  var bp = bigPose();
  drawCard(bp.x, bp.y, bp.a, bp.s);
  placeHint(bp);
  card.classList.add('is-ready');

  card.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  // ドラッグした直後は、リンクを押したことにしない（ページ移動の演出より先に止める）
  card.addEventListener('click', function (e) {
    if (suppressClick || mode === 'anim') { e.preventDefault(); e.stopPropagation(); }
  }, true);
  card.addEventListener('dragstart', function (e) { e.preventDefault(); });
  resetBtn.addEventListener('click', function () { if (engine) restoreAll(false); });
  scroller.addEventListener('scroll', onScroll, { passive: true });

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      if (foot) document.body.style.setProperty('--about-foot-h', foot.offsetHeight + 'px');
      if (engine) relayout();
      else { measureView(); var p = bigPose(); drawCard(p.x, p.y, p.a, p.s); placeHint(p); }
    }, 200);
  });

  // 文字の大きさはフォントの読み込みで変わるので、読み込み終わってから測る
  var s = document.createElement('script');
  s.src = MATTER_SRC;
  s.onload = function () {
    var go = function () { initPhysics(); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go, go); else go();
  };
  s.onerror = staticMode;
  document.head.appendChild(s);
})();
