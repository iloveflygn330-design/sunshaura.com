/* =====================================================
   sunshaura.com トップページ（ようこそ）専用スクリプト
   index.html で読み込む。GSAP + ScrollTrigger（index.html の <head> でCDNから読み込み）を使う。

   キャラクターの画像は、ページを開くたびにランダムに選ぶ。
     キャラクター①（左から傾いて現れる） … assets/images/welcome/left/
     キャラクター②（右から傾いて現れる） … assets/images/welcome/right/
     キャラクター③（フッターに並ぶ）     … assets/images/welcome/footer/
   フォルダの中身の一覧（assets/images/welcome/list.json）は GitHub 上で自動で作られる
   （.github/scripts/welcome-list.js。画像を入れて push するだけでよい。手順は assets/images/welcome/README.md）
   ===================================================== */
(function () {
  'use strict';

  /* ----------------------------------------------------------
     設定値
  ---------------------------------------------------------- */
  var WLC_LIST = 'assets/images/welcome/list.json';

  /* ★拡張予定: フッターに並べるキャラクター③の人数（PC・スマホ別）
       WLC_FOOTER_COUNT : フッターの上に並んで立つ人数
       WLC_FOOTER_SIDE  : 左右の端から傾いて覗き込む人数（0 = 出さない / 2 = 左右に1人ずつ）
       画像は同じ footer/ フォルダから、重ならないように選ぶ */
  var WLC_FOOTER_COUNT = { pc: 4, sp: 2 };
  var WLC_FOOTER_SIDE  = { pc: 0, sp: 2 };

  /* ★拡張予定: キャラクター②が退場する向き（'right' = 右へ / 'left' = 左へ）
       キャラクター①は左へ退場する */
  var WLC_EXIT_R_DIR = 'right';

  /* ----------------------------------------------------------
     画像の一覧を読んで、ランダムに選ぶ
  ---------------------------------------------------------- */
  function loadList() {
    return fetch(WLC_LIST, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; });
  }

  // 配列をシャッフルして先頭から n 個（同じ画像が重ならないように）
  function pick(list, n) {
    var a = (list || []).slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a.slice(0, n);
  }

  // 一覧の1件 → <img>（軽量版の WebP があればそちらを使う）
  function makeImg(item) {
    var img = document.createElement('img');
    img.alt = '';
    img.decoding = 'async';
    img.src = item.webp || item.src;
    return img;
  }

  // キャラクター①②：入れ物に画像を入れる。読み込めたら表示する（読めなければ出さない）
  function fillChar(box, item) {
    if (!box || !item) return;
    var img = makeImg(item);
    img.onload = function () { box.classList.add('has-img'); };
    img.onerror = function () { box.remove(); };
    box.appendChild(img);
  }

  /* ----------------------------------------------------------
     CSS の変数（数字）を読む。例: --wlc-tilt: 16 → 16
  ---------------------------------------------------------- */
  function cssNum(el, name, fallback) {
    var v = parseFloat(getComputedStyle(el).getPropertyValue(name));
    return isNaN(v) ? fallback : v;
  }

  /* ----------------------------------------------------------
     ページ表示時に一度だけ初期化する
  ---------------------------------------------------------- */
  function initWelcomeAnim(list) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.getAll().forEach(function (st) { st.kill(); });

    /* ======================================================
       セクション1: 初期フェードイン（ScrollTrigger不使用）
       ====================================================== */
    var title   = document.getElementById('wlc-title');
    var catchEl = document.getElementById('wlc-catch');
    var noteEl  = document.getElementById('wlc-note');
    var arrows  = document.getElementById('wlc-arrows');
    if (!title) return; // welcomeページが無ければ何もしない

    gsap.set(title, { opacity: 1 });                       // ① タイトルは最初から表示
    gsap.to(catchEl, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', delay: 0.4 });   // ② 0.4秒後
    gsap.to([noteEl, arrows], { opacity: 1, duration: 0.7, ease: 'power2.out', delay: 0.7, stagger: 0.1 }); // ③ 0.7秒後

    /* ======================================================
       セクション2: 自己紹介（スクロール連動アニメ）

       画面は CSS（.wlc-sec2-sticky の position: sticky）で止めたまま、
       見えない余白 .wlc-sec2-runway をスクロールしている間にアニメーションが進む。
       #wlc-scroll を scroller にして、window のスクロールとは切り離している（Edge の引っかかり対策）。

       【アニメの流れ】（進み具合 0〜100%）
         0〜10%  : キャラクター① 左から傾いて現れる / キャラクター② 右から傾いて現れる
         5〜12%  : テキストボックス① 左から滑り込んでくる
         12〜35% : ①の文章 1行ずつ上から順にフワッと出る
         55〜65% : ①のボックス 左へ押し出されて消える
         65〜72% : テキストボックス② 左から飛んでくる
         72〜76% : ②のボックス「ドン」と受け止めて少し揺れる
         88〜100%: キャラクター① 左へ退場 / キャラクター② 右へ退場（向きは WLC_EXIT_R_DIR）

       ★拡張予定: 動きのタイミングを変える場合は、下の tl.to(..., 開始位置) の数字（0〜1）を書き換える
       ★拡張予定: アニメ全体の長さは assets/welcome.css の --wlc-sec2-run（大きいほどゆっくり）
       ====================================================== */
    var wlcScrollEl = document.getElementById('wlc-scroll');
    var sticky      = document.getElementById('wlc-sec2-sticky');
    var textbox     = document.getElementById('wlc-textbox');
    var charL       = document.getElementById('wlc-char-l');
    var charR       = document.getElementById('wlc-char-r');
    if (!sticky || !textbox || !wlcScrollEl) return;

    // キャラクター①②の画像（ランダム）
    fillChar(charL, pick(list.left, 1)[0]);
    fillChar(charR, pick(list.right, 1)[0]);

    ScrollTrigger.defaults({ scroller: wlcScrollEl });

    /* --- テキストボックス②を作る ---
       ★拡張予定: ②の文章を変えたい場合は下の innerHTML を編集する（1行 = <span class="wlc-textbox-line">） */
    var textbox2 = document.getElementById('wlc-textbox2');
    if (!textbox2) {
      textbox2 = document.createElement('div');
      textbox2.className = 'wlc-textbox';
      textbox2.id = 'wlc-textbox2';
      textbox2.innerHTML = [
        '<p class="wlc-textbox-body">',
        '  <span class="wlc-textbox-line" style="opacity:1;transform:none;">自分用のHPが欲しくて、</span>',
        '  <span class="wlc-textbox-line" style="opacity:1;transform:none;">勉強の傍ら開設しました。</span>',
        '  <span class="wlc-textbox-line" style="opacity:1;transform:none;">&nbsp;</span>',
        '  <span class="wlc-textbox-line" style="opacity:1;transform:none;">自分がこれまでやった改変のまとめなど、</span>',
        '  <span class="wlc-textbox-line" style="opacity:1;transform:none;">自分の情報をまとめていこうと思います。</span>',
        '</p>',
        '<div class="wlc-textbox-lines">',
        '  <div class="wlc-textbox-bar"></div>',
        '  <div class="wlc-textbox-bar"></div>',
        '</div>'
      ].join('');
      sticky.appendChild(textbox2);
    }

    // 傾き（assets/welcome.css の --wlc-tilt / --wlc-tilt-enter。PC とスマホで値が違う）
    var tilt      = cssNum(sticky, '--wlc-tilt', 16);
    var tiltEnter = cssNum(sticky, '--wlc-tilt-enter', 40);
    // 画面の外に隠す量（--wlc-peek。キャラクター自身の幅に対する %）
    var peek      = cssNum(sticky, '--wlc-peek', 30);
    var viewW     = window.innerWidth;

    /* --- 初期状態（画面の外） ---
       キャラクター①：左の画面外で、大きく傾いた姿勢
       キャラクター②：右の画面外で、大きく傾いた姿勢（左右反対）
       xPercent は自分の幅に対する割合（-140 = 自分の幅の 1.4 倍ぶん左） */
    gsap.set(charL,    { xPercent: -140, rotation:  tiltEnter, opacity: 1 });
    gsap.set(charR,    { xPercent:  140, rotation: -tiltEnter, opacity: 1 });
    gsap.set(textbox,  { x: -viewW, opacity: 0 });
    gsap.set(textbox2, { x: -viewW, opacity: 0 });

    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        /*
         * 見えない余白 .wlc-sec2-runway の上端が画面の下端に来たとき = 進み具合 0
         * 余白の下端が画面の下端に来たとき                       = 進み具合 1
         * scrub: 0.4 … スクロールに 0.4 秒かけて追いつく（指の細かい動きでカクつかないように）
         */
        trigger: '#wlc-sec2-runway',
        scroller: wlcScrollEl,
        start: 'top bottom',
        end: 'bottom bottom',
        scrub: 0.4,
        invalidateOnRefresh: true
        // markers: true, // ★ デバッグ時はコメントを外す
      }
    });

    // 0〜10%: キャラクター①② 傾いて現れる（倒れた姿勢から起き上がりながら、画面の端から覗き込む位置まで入ってくる）
    tl.to(charL, { xPercent: -peek, rotation:  tilt, duration: 0.10, ease: 'back.out(1.4)' }, 0.00);
    tl.to(charR, { xPercent:  peek, rotation: -tilt, duration: 0.10, ease: 'back.out(1.4)' }, 0.00);

    // 5〜12%: テキストボックス① 左から滑り込んでくる
    tl.to(textbox, { x: 0, opacity: 1, duration: 0.07, ease: 'power2.out' }, 0.05);

    // 12〜35%: ①の文章 1行ずつ上から順にフワッと出る
    var lines    = textbox.querySelectorAll('.wlc-textbox-line');
    var lineStep = (0.35 - 0.12) / Math.max(lines.length, 1);
    lines.forEach(function (line, i) {
      tl.to(line, { opacity: 1, y: 0, duration: lineStep * 0.7, ease: 'power1.out' }, 0.12 + i * lineStep);
    });

    // 55〜65%: ①のボックス 左へ押し出されて消える
    tl.to(textbox, { x: -viewW * 0.8, opacity: 0, duration: 0.10, ease: 'power2.in' }, 0.55);

    // 65〜72%: テキストボックス② 左から飛んでくる
    tl.to(textbox2, { x: 0, opacity: 1, duration: 0.07, ease: 'power2.out' }, 0.65);

    // 72〜76%: ②「ドン」と受け止めて少し揺れる（行き・戻りに分けてスクロールを戻しても崩れないように）
    tl.to(textbox2, { x: 12, duration: 0.02, ease: 'power1.out' }, 0.72);
    tl.to(textbox2, { x:  0, duration: 0.02, ease: 'power1.in'  }, 0.74);

    // 88〜100%: キャラクター① 左へ退場 / キャラクター② 退場（向きは WLC_EXIT_R_DIR）
    var exitR = WLC_EXIT_R_DIR === 'left' ? -1 : 1;
    tl.to(charL, { xPercent: -140,        rotation:  tiltEnter,         duration: 0.12, ease: 'power2.in' }, 0.88);
    tl.to(charR, { xPercent: 140 * exitR, rotation: -tiltEnter * exitR, duration: 0.12, ease: 'power2.in' }, 0.88);

    /* ======================================================
       セクション3: 最後の画面
         見出し       : 画面に入ったら下からスライドイン
         キャラクター③: いちばん下（フッター）までスクロールしたら、フッターの下から順番にスライドイン
                         上に戻ると引っこみ、もう一度下まで来るとまた出てくる
       ====================================================== */
    var sec3Title = document.getElementById('wlc-sec3-title');
    if (sec3Title) {
      gsap.to(sec3Title, {
        scrollTrigger: { trigger: sec3Title, scroller: wlcScrollEl, start: 'top 85%', toggleActions: 'play none none none' },
        opacity: 1, y: 0, duration: 0.7, ease: 'power2.out'
      });
    }

    var footBox = document.getElementById('wlc-foot-chars');
    var footer  = document.getElementById('wlc-footer');
    var sec3    = document.getElementById('wlc-sec3');
    if (footBox && footer && sec3) {
      var isSp   = window.matchMedia('(max-width: 759px)').matches;
      var nStand = isSp ? WLC_FOOTER_COUNT.sp : WLC_FOOTER_COUNT.pc;
      var nSide  = isSp ? WLC_FOOTER_SIDE.sp  : WLC_FOOTER_SIDE.pc;
      var chosen = pick(list.footer, nStand + nSide);

      // フッターの上に並んで立つキャラクター
      var imgs = chosen.slice(0, nStand).map(function (item) {
        var img = makeImg(item);
        img.className = 'wlc-foot-char';
        img.onerror = function () { img.remove(); };
        footBox.appendChild(img);
        return img;
      });
      footBox.style.setProperty('--wlc-foot-n', Math.max(imgs.length, 1));

      // 左右の端から傾いて覗き込むキャラクター（左 → 右の順）
      var sides = chosen.slice(nStand).map(function (item, i) {
        var box = document.createElement('div');
        box.className = 'wlc-foot-side ' + (i % 2 === 0 ? 'wlc-foot-side-l' : 'wlc-foot-side-r');
        box.setAttribute('aria-hidden', 'true');
        fillChar(box, item);
        sec3.appendChild(box);
        return box;
      });

      if (imgs.length || sides.length) {
        // いちばん下（フッターがほぼ全部見えたとき）で、
        //   1. 並んで立つキャラクターがフッターの下から順番にスライドイン
        //   2. 少し遅れて、左右のキャラクターが画面の外から傾いて覗き込む
        // 上に戻ると逆再生で引っこむ
        var sideTilt = cssNum(sec3, '--wlc-side-tilt', 14);
        var sidePeek = cssNum(sec3, '--wlc-side-peek', 30);
        var footTl = gsap.timeline({
          scrollTrigger: {
            trigger: footer, scroller: wlcScrollEl,
            start: 'bottom-=10 bottom',
            toggleActions: 'play none none reverse'
          }
        });
        if (imgs.length) {
          // CSS の translateY(110%) を GSAP の yPercent に置き換える（y: 0 にしないと、ずらしが二重になって出てこない）
          gsap.set(imgs, { y: 0, yPercent: 110 });
          footTl.to(imgs, { yPercent: 0, duration: 0.6, ease: 'back.out(1.3)', stagger: 0.12 }, 0);
        }
        sides.forEach(function (box, i) {
          var dir = box.classList.contains('wlc-foot-side-l') ? -1 : 1;
          gsap.set(box, { xPercent: 140 * dir, rotation: -50 * dir });
          footTl.to(box, { xPercent: sidePeek * dir, rotation: -sideTilt * dir, duration: 0.6, ease: 'back.out(1.4)' }, 0.25 + i * 0.12);
        });
      }
    }
  }

  /* ----------------------------------------------------------
     初期化タイミング
       画像の一覧を読んでから初期化し、ページの画像などが全部読み終わったら位置を測り直す
  ---------------------------------------------------------- */
  var listPromise = loadList();
  document.addEventListener('DOMContentLoaded', function () {
    listPromise.then(function (list) {
      initWelcomeAnim(list || {});
      ScrollTrigger.refresh();
    });
  });
  window.addEventListener('load', function () {
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  });
}());
