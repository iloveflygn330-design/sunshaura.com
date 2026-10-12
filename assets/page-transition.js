/* =====================================================
   sunshaura.com ページ間遷移アニメーション（共通）

   サイト内のページ（HTMLファイル）を移動するときの演出を行うスクリプト。全ページで読み込む。
     index.html ⇔ avatar/ ⇔ world/ ⇔ … ⇔ news/ ⇔ 各記事ページ

   流れ:
     【移動元】下からパネルが上がる「ちょっとまってね...」
              → パネルが画面を覆ったら次のページへ移動
     【移動先】最初からパネルで覆った状態で表示（head内の小さなscriptで判定）
              → 中身の準備ができたら「おまたせ！」→ パネルが下がる

   使い方:
     ・リンクに data-transition を付ける → クリック時に自動で演出して移動
         <a href="news/" data-transition>ニュース</a>
     ・JSから移動する場合
         SunTransition.go('news/');
     ・移動先で「準備完了」を知らせる
         <body data-transition-manual-ready> のページは、描画後に SunTransition.ready() を呼ぶ
         （ニュースは記事データの読み込み後に news.js が呼ぶ）
         指定がないページは、画像などの読み込み完了（window load）で自動的に完了扱いになる

   必要なHTML（全ページに設置済み。新しいページは world/index.html をコピーすれば最初から入っている）:
     <div id="loading-bar"><span id="loading-bar-text"></span></div>
     <div id="loading-panel"><div id="panel-icon">🌸</div><div id="panel-message">ちょっとまってね...</div></div>
     本文の要素に data-transition-body（移動中にバーの高さぶん下にずらす）
     <head> 内に「到着判定」の script（下の ARRIVAL_KEY を読むもの）

   パネルのアイコン（丸いキャラクター画像）:
     assets/panel-icons/sets.json に登録された「ちょっとまってね / おまたせ」の2枚セットから、
     ページ移動のたびにランダムに1セットを選んで表示する。
       移動元で「ちょっとまってね...」の画像 → 移動先で同じセットの「おまたせ！」の画像
     セットは Discord に投稿すると毎朝自動で登録される（.github/scripts/discord-panel-icons.py）。
     セットが1つもない・画像が読めないときだけ 🌸 を表示する。

   ★拡張予定: この演出を新しいHTMLページにも付ける手順
     （world/index.html をフォルダごとコピーして作れば、以下は全部入っている）
     1. 上の「必要なHTML」をそのページに入れる（見た目は assets/site-common.css を読み込めばOK）
     2. <head> に到着判定の script をコピーする（world/index.html の <head> 参照）
     3. </body> の直前で <script src="（相対パス）assets/page-transition.js"></script> を読み込む
     4. そのページへのリンクに data-transition を付ける
   ===================================================== */
(function () {
  'use strict';

  /* ★拡張予定: 演出の時間を変える場合はここを書き換える
       （パネル・バーの動く速さは assets/site-common.css の --duration-panel / --duration-ui） */
  var T = {
    PANEL_RISE_MS:  600,   // パネルが上がりきるまで
    COMPLETE_MS:    400,   // 「おまたせ！」の表示時間
    PANEL_DROP_MS:  600,   // パネルが下がりきるまで
    BAR_HIDE_MS:    300,   // 上のバーが隠れるまで
    READY_TIMEOUT: 6000    // 準備完了の合図が来なくても、この時間でパネルを下げる（固まり防止）
  };

  /* ★拡張予定: 表示する文言を変える場合はここを書き換える */
  var TEXT = {
    waitPanel: 'ちょっとまってね...',
    waitBar:   '<span class="dots-anim">移動中</span>',
    donePanel: 'おまたせ！',
    doneBar:   '移動完了！'
  };

  var ARRIVAL_KEY = 'sun-transition'; // head 内の到着判定 script と同じ名前にすること

  /* ★拡張予定: パネルのアイコンの見た目を変える場合はここを書き換える
       ICON.size     : 画像のときの丸の大きさ（px）。🌸 のときは assets/site-common.css の #panel-icon（90px）のまま
       ICON.fallback : セットがない・画像が読めないときに表示する文字 */
  var ICON = { size: 120, fallback: '🌸' };
  var ICON_KEY = 'sun-transition-icon';   // 移動先に「どのセットを使ったか」を引き継ぐ名前
  // assets/panel-icons/ の場所（このスクリプトと同じ assets フォルダの中）
  var ICON_BASE = (function () {
    var src = document.currentScript && document.currentScript.src;
    return src ? new URL('panel-icons/', src).href : null;
  }());

  var bar      = document.getElementById('loading-bar');
  var barText  = document.getElementById('loading-bar-text');
  var panel    = document.getElementById('loading-panel');
  var panelMsg = document.getElementById('panel-message');
  var bodyEl   = document.querySelector('[data-transition-body]');
  var root     = document.documentElement;
  var busy     = false;

  if (!bar || !panel) return; // 必要なHTMLがないページでは何もしない

  function cover(on) {
    bar.classList.toggle('reveal', on);
    panel.classList.toggle('slide-up', on);
    if (bodyEl) bodyEl.classList.toggle('loading', on);
  }

  /* ---------- パネルのアイコン ---------- */
  var iconEl   = document.getElementById('panel-icon');
  var iconSets = null;     // sets.json の中身（読み込み前は null）
  var nextSet  = null;     // 次の移動で使うセット（先に選んで画像を読み込んでおく）
  var curSet   = null;     // いま表示中のセット

  (function injectIconStyle() {
    var st = document.createElement('style');
    st.textContent =
      '#panel-icon.has-img{width:' + ICON.size + 'px;height:' + ICON.size + 'px;background:transparent;}' +
      '#panel-icon.has-img img{width:100%;height:100%;display:block;border-radius:50%;}';
    document.head.appendChild(st);
  }());

  function preload(set) {
    if (!set) return;
    [set.wait, set.done].forEach(function (u) { var im = new Image(); im.src = u; });
  }

  // 前回と違うセットをランダムに選ぶ（セットが1つならそれ）
  function pickSet() {
    if (!iconSets || !iconSets.length) return null;
    var pool = iconSets.length > 1 && curSet
      ? iconSets.filter(function (s) { return s.id !== curSet.id; }) : iconSets;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function showIcon(set, kind) {
    if (!iconEl) return;
    if (!set) {
      iconEl.classList.remove('has-img');
      iconEl.textContent = ICON.fallback;
      return;
    }
    var img = document.createElement('img');
    img.alt = '';
    img.decoding = 'async';
    img.onerror = function () { iconEl.classList.remove('has-img'); iconEl.textContent = ICON.fallback; };
    img.src = set[kind];
    iconEl.textContent = '';
    iconEl.appendChild(img);
    iconEl.classList.add('has-img');
  }

  function loadIconSets() {
    if (!ICON_BASE) return;
    fetch(ICON_BASE + 'sets.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : { sets: [] }; })
      .then(function (data) {
        iconSets = (data.sets || []).map(function (s) {
          return { id: s.id, wait: ICON_BASE + s.wait, done: ICON_BASE + s.done };
        });
        nextSet = pickSet();
        preload(nextSet);
      })
      .catch(function () { iconSets = []; });
  }

  // 「ちょっとまってね...」のアイコンを出す（セットを決めて、移動先にも引き継ぐ）
  function iconWait() {
    curSet = nextSet || pickSet();
    try {
      if (curSet) sessionStorage.setItem(ICON_KEY, JSON.stringify(curSet));
      else sessionStorage.removeItem(ICON_KEY);
    } catch (e) {}
    showIcon(curSet, 'wait');
    nextSet = pickSet();      // 次の移動用を選び直して読み込んでおく
    preload(nextSet);
    return curSet;
  }
  // 「おまたせ！」のアイコンを出す（いまのセットの2枚目）
  function iconDone() { showIcon(curSet, 'done'); }

  /* ---------- 移動元：パネルを上げてから移動 ---------- */
  function go(url) {
    if (busy) return;
    busy = true;
    try { sessionStorage.setItem(ARRIVAL_KEY, String(Date.now())); } catch (e) { /* 保存できなくても移動はする */ }
    barText.innerHTML = TEXT.waitBar;
    panelMsg.textContent = TEXT.waitPanel;
    iconWait();
    requestAnimationFrame(function () { requestAnimationFrame(function () { cover(true); }); });
    setTimeout(function () { location.href = url; }, T.PANEL_RISE_MS);
  }

  /* data-transition 付きリンクのクリックを横取りして演出する */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-transition]');
    if (!a || e.defaultPrevented) return;
    // 新しいタブで開く操作（Ctrl/⌘クリック・中クリック等）は通常どおり
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    // 同じページ内の # だけの移動は演出しない
    if (url.pathname === location.pathname && url.search === location.search) return;
    e.preventDefault();
    go(url.href);
  });

  /* ---------- 移動先：覆った状態から「おまたせ！」で開く ---------- */
  var arriving = root.classList.contains('is-arriving');
  var readyDone = false;

  function ready() {
    if (!arriving || readyDone) return;
    readyDone = true;
    barText.textContent = TEXT.doneBar;
    panelMsg.textContent = TEXT.donePanel;
    iconDone();
    setTimeout(function () {
      cover(false);
      setTimeout(function () { barText.innerHTML = ''; }, T.PANEL_DROP_MS + T.BAR_HIDE_MS);
    }, T.COMPLETE_MS);
  }

  if (arriving) {
    try { sessionStorage.removeItem(ARRIVAL_KEY); } catch (e) {}
    // head の script で「アニメーションなしで覆った状態」にしてあるので、
    // 同じ状態をクラスで作り直してから is-arriving を外す（ここから先はアニメーションが効く）
    barText.innerHTML = TEXT.waitBar;
    panelMsg.textContent = TEXT.waitPanel;
    // 移動元で選んだセットの「ちょっとまってね...」をそのまま表示する（画像は移動元で読み込み済み）
    try { curSet = JSON.parse(sessionStorage.getItem(ICON_KEY) || 'null'); } catch (e) { curSet = null; }
    showIcon(curSet, 'wait');
    cover(true);
    void panel.offsetHeight; // 状態を確定させる（これがないと一瞬パネルが動くことがある）
    root.classList.remove('is-arriving');

    if (!document.body.hasAttribute('data-transition-manual-ready')) {
      if (document.readyState === 'complete') ready();
      else window.addEventListener('load', ready);
    }
    setTimeout(ready, T.READY_TIMEOUT);
  }

  /* ブラウザの「戻る」でキャッシュから復元されたとき、パネルが上がったままにならないようにする */
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    busy = false;
    root.classList.remove('is-arriving');
    cover(false);
    barText.innerHTML = '';
  });

  loadIconSets();

  window.SunTransition = { go: go, ready: ready, isArriving: arriving, iconWait: iconWait, iconDone: iconDone };
}());
