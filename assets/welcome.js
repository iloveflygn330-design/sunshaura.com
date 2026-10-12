/* =====================================================
   sunshaura.com トップページ（ようこそ）専用スクリプト
   index.html で読み込む。GSAP + ScrollTrigger（index.html の <head> でCDNから読み込み）を使う。
   ===================================================== */
(function () {
  'use strict';

  /* ----------------------------------------------------------
     定数・設定値
     スプライトシートやアニメの尺を変える場合はここを編集する
  ---------------------------------------------------------- */

  /*
   * ★拡張予定: スプライトシートのコマ数
   *   スプライトシート画像を用意したら、この値を実際のコマ数に変更する。
   *   例: 8コマのシートなら WLC_SPRITE_TOTAL = 8;
   *
   * コマ割りの目安（8コマの場合）:
   *   0: 待機・初期表示（スライドイン直後）
   *   1: テキストボックスに気づく
   *   2: テキストボックスに手をかける
   *   3: 左へ押す
   *   4: 左から飛んできたテキストを受け止める
   *   5: ポーズ（笑顔）
   *   6: 上へ退場準備
   *   7: 退場完了
   */
  var WLC_SPRITE_TOTAL = 1; // ← スプライトシート差し替え時に変更

  /* ----------------------------------------------------------
     ページ表示時に一度だけ初期化する
  ---------------------------------------------------------- */
  function initWelcomeAnim() {
    gsap.registerPlugin(ScrollTrigger);

    // 再初期化時に前回のScrollTriggerが残らないようクリーンアップ
    // （ページ切り替えで戻ってきたとき二重登録を防ぐ）
    ScrollTrigger.getAll().forEach(function (st) { st.kill(); });

    /* ======================================================
       セクション1: 初期フェードイン（ScrollTrigger不使用）
       ====================================================== */
    var title   = document.getElementById('wlc-title');
    var catchEl = document.getElementById('wlc-catch');
    var noteEl  = document.getElementById('wlc-note');
    var arrows  = document.getElementById('wlc-arrows');

    if (!title) return; // welcomeページが非表示なら何もしない

    // ① タイトルは初期から表示（CSSでopacity:1）
    gsap.set(title, { opacity: 1 });

    // ② キャッチコピー: 0.4秒後にフェードイン
    gsap.to(catchEl, {
      opacity: 1, y: 0, duration: 0.7,
      ease: 'power2.out', delay: 0.4
    });

    // ③ 注意書き + 矢印: 0.7秒後にフェードイン
    gsap.to([noteEl, arrows], {
      opacity: 1, duration: 0.7,
      ease: 'power2.out', delay: 0.7,
      stagger: 0.1
    });

    /* ======================================================
       セクション2: 自己紹介（スクロール連動アニメ・方法B）

       #wlc-scroll を scroller に指定することで、
       window スクロールと GSAPが完全分離し Edge の引っかかりが解消される。

       【アニメの流れ】
         progress 0.00-0.10: キャラ右スライドイン
         progress 0.05-0.12: テキストボックス右スライドイン
         progress 0.12-0.35: テキスト各行 順次フェードイン
         progress 0.38-0.43: テキストボックス揺れ（気づき）
         progress 0.55-0.65: テキストボックスを左へ押し飛ばす
         progress 0.65-0.72: 2枚目テキストが左から飛んでくる
         progress 0.72-0.76: 受け止め「ドン」演出
         progress 0.88-1.00: キャラ・テキスト上へ退場

       ★アニメの長さを変えたい場合:
         end の '+=3000' を変更する（大きいほどゆっくり）
       ====================================================== */
    var wlcScrollEl = document.getElementById('wlc-scroll');
    var sec2        = document.getElementById('wlc-sec2');
    var textbox     = document.getElementById('wlc-textbox');
    var chara       = document.getElementById('wlc-chara');
    if (!sec2 || !textbox || !chara || !wlcScrollEl) return;

    var viewW = window.innerWidth;

    /*
     * 全ScrollTriggerのデフォルトscrollerを#wlc-scrollに設定
     * これにより window スクロールへの干渉がゼロになる
     *
     * ★注意: このページを離れる際に ScrollTrigger.defaults({ scroller: window })
     *   でリセットする必要がある（他ページのScrollTriggerに影響しないよう）
     *   → initWelcomeAnim() の先頭で getAll().kill() しているため現状は問題なし
     */
    ScrollTrigger.defaults({ scroller: wlcScrollEl });

    /* --- 2枚目テキストボックスを動的生成 ---
       ★拡張予定: テキストを変更したい場合は下記 innerHTML を編集する
         1行 = <span class="wlc-textbox-line"> で囲む */
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
      document.getElementById('wlc-sec2-sticky').appendChild(textbox2);
    }

    /* --- 初期状態 --- */
    gsap.set(chara,    { x: viewW * 0.6,  opacity: 0 });
    gsap.set(textbox,  { x: viewW * 0.6,  opacity: 0 });
    gsap.set(textbox2, { x: -viewW * 0.7, opacity: 0 });

    /* --- スプライット進捗追跡 --- */
    var currentFrame = -1;

    /* --- タイムライン本体 ---
       scroller: wlcScrollEl … #wlc-scroll がスクロール源
       pin: true             … .wlc-sec2-sticky を#wlc-scroll内で固定
       scrub: true           … スクロール量にアニメを即時連動
       invalidateOnRefresh   … リサイズ時に位置を再計算
    */
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: '.wlc-sec2-sticky',
        scroller: wlcScrollEl,
        start: 'top top',
        end: '+=3000',
        pin: true,
        pinSpacing: true,
        scrub: true,
        invalidateOnRefresh: true,
        // markers: true, // ★ デバッグ時はコメントを外す

        /*
         * onUpdate でスプライットコマを進捗から直接決定
         * ★拡張予定: コマ割りを変えたい場合は if/else のしきい値を変更する
         */
        onUpdate: function (self) {
          var p = self.progress;
          var frame =
            p < 0.35 ? 0 :
            p < 0.45 ? 1 :
            p < 0.55 ? 2 :
            p < 0.72 ? 3 :
            p < 0.80 ? 4 :
            p < 0.88 ? 5 : 6;
          if (frame !== currentFrame) {
            currentFrame = frame;
            setSprite(chara, frame);
          }
        }
      }
    });

    // 0.00→0.10: キャラ右スライドイン
    tl.to(chara,   { x: 0, opacity: 1, duration: 0.10, ease: 'power2.out' }, 0.00);
    // 0.05→0.12: テキストボックス右スライドイン
    tl.to(textbox, { x: 0, opacity: 1, duration: 0.07, ease: 'power2.out' }, 0.05);

    // 0.12→0.35: テキスト各行 順次フェードイン
    var lines    = textbox.querySelectorAll('.wlc-textbox-line');
    var lineStep = (0.35 - 0.12) / Math.max(lines.length, 1);
    lines.forEach(function (line, i) {
      tl.to(line, { opacity: 1, y: 0, duration: lineStep * 0.7, ease: 'power1.out' },
        0.12 + i * lineStep);
    });

    // 0.38→0.43: テキストボックス揺れ（「行き」「戻り」分割でscrub対応）
    tl.to(textbox, { y: -10, duration: 0.025, ease: 'power1.out' }, 0.38);
    tl.to(textbox, { y:   0, duration: 0.025, ease: 'power1.in'  }, 0.405);

    // 0.55→0.65: テキストボックスを左へ押し飛ばす
    tl.to(textbox, { x: -viewW * 0.7, opacity: 0, duration: 0.10, ease: 'power2.in' }, 0.55);

    // 0.65→0.72: 2枚目テキストボックスが左から飛んでくる
    tl.to(textbox2, { x: 0, opacity: 1, duration: 0.07, ease: 'power2.out' }, 0.65);

    // 0.72→0.76: 受け止め「ドン」演出（「行き」「戻り」分割）
    tl.to(textbox2, { x: 10, duration: 0.02, ease: 'power1.out' }, 0.72);
    tl.to(textbox2, { x:  0, duration: 0.02, ease: 'power1.in'  }, 0.74);

    // 0.88→1.00: キャラ・テキスト上へ退場
    tl.to(chara,    { y: -viewW * 0.5, opacity: 0, duration: 0.12, ease: 'power2.in' }, 0.88);
    tl.to(textbox2, { y: -viewW * 0.5, opacity: 0, duration: 0.12, ease: 'power2.in' }, 0.90);

    /* ======================================================
       セクション3: コンテンツ紹介（下からスライドイン）
       ====================================================== */
    var sec3Title = document.getElementById('wlc-sec3-title');
    var cards     = document.querySelectorAll('#wlc-sec3-grid .wlc-preview-card');

    if (sec3Title) {
      gsap.to(sec3Title, {
        scrollTrigger: {
          trigger: sec3Title,
          scroller: wlcScrollEl,
          start: 'top 85%',
          toggleActions: 'play none none none'
        },
        opacity: 1, y: 0, duration: 0.7, ease: 'power2.out'
      });
    }

    if (cards.length) {
      gsap.to(cards, {
        scrollTrigger: {
          trigger: '#wlc-sec3-grid',
          scroller: wlcScrollEl,
          start: 'top 88%',
          toggleActions: 'play none none none'
        },
        opacity: 1, y: 0, duration: 0.55,
        ease: 'power2.out',
        stagger: 0.12 // ← カード間の表示ディレイ（秒）
      });
    }
  }

  /* ----------------------------------------------------------
     スプライトシート コマ切り替えヘルパー
     ★拡張予定: スプライトシート差し替え後に動作確認する関数

     引数:
       el    - キャラ要素（.wlc-chara）
       frame - 0始まりのコマ番号

     仕組み:
       スプライトシートは横並びを想定。
       background-position の x を (-100% * frame) にずらすことで
       指定コマを表示する。
  ---------------------------------------------------------- */
  function setSprite(el, frame) {
    if (WLC_SPRITE_TOTAL <= 1) return; // 1コマ（未設定）なら何もしない
    var pct = (frame / (WLC_SPRITE_TOTAL - 1)) * 100;
    el.style.backgroundPositionX = pct + '%';
  }

  /* ----------------------------------------------------------
     初期化タイミングの制御

     GitHub Pages では以下の順で処理が完了する:
       1. DOMContentLoaded … HTML解析完了（フォント・画像はまだ）
       2. load             … 全リソース読み込み完了（ページ高さが確定）

     ScrollTrigger.refresh() は「ページ高さ確定後」に呼ぶ必要がある。
     DOMContentLoaded だけでは不十分で、load 後に refresh することで
     pin の位置ズレ・スクロール量のズレが解消される。
  ---------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    // DOM構築直後に一度初期化（暫定値で）
    initWelcomeAnim();
  });

  window.addEventListener('load', function () {
    // フォント・画像込みの高さ確定後に再計算
    // #wlc-scroll コンテナの高さも確定してから refresh することで
    // pin 位置・end 値のズレが修正される
    ScrollTrigger.refresh();
  });

}());
