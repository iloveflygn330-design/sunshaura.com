/* =====================================================
   sunshaura.com ニュースページ 共通JS
   トップ（news/index.html）と各記事ページの両方で読み込む。

   仕組み:
     ・全記事の一覧は news/data/articles.json に入っている
     ・各記事の本文は news/column/YYYYMM/DD/article.json に入っている
     ・HTML側は <body data-news-page="top|article" data-news-root="news/までの相対パス">
       だけを持ち、中身はすべてこのJSが組み立てる
   ===================================================== */
(function () {
  'use strict';

  /* -----------------------------------------------------
     ★拡張予定: 記事カテゴリ
       カテゴリを増やすときは、ここに1行追加するだけ。
       毎日の記事作成タスクは news/GUIDE.md のカテゴリ一覧から選ぶので、
       GUIDE.md の「カテゴリ」にも同じ名前を追記すること。
         color     : カテゴリ帯・サムネイルの色
         colorDark : サムネイルのグラデーションの濃い側
         icon      : 画像がない記事のサムネイルに出すアイコン（絵文字1つ）
       一覧にない名前が来た場合は「その他」の見た目になる。
  ----------------------------------------------------- */
  var NEWS_CATEGORIES = {
    'VRChat公式':      { color: '#1F8FD6', colorDark: '#105A8C', icon: '🛠️' },
    'イベント':        { color: '#E8590C', colorDark: '#9C3A06', icon: '🎪' },
    'アバター・制作':  { color: '#C2255C', colorDark: '#7D1239', icon: '🧸' },
    'ワールド':        { color: '#2B9348', colorDark: '#1A5C2C', icon: '🌍' },
    'VR機器・技術':    { color: '#6741D9', colorDark: '#3E2490', icon: '🥽' },
    'AI':              { color: '#0CA678', colorDark: '#066B4D', icon: '🤖' },
    'その他':          { color: '#FF9500', colorDark: '#B86A00', icon: '📰' }
  };

  /* -----------------------------------------------------
     ★拡張予定: 月ごとの季節配色
       値は news.css の [data-season="..."] の名前と一致させる。
       特別な配色を作りたい月（例：12月だけクリスマス）は、ここを書き換え、
       news.css に [data-season="新しい名前"] ブロックを追加する。
  ----------------------------------------------------- */
  var NEWS_SEASON_BY_MONTH = {
    1: 'winter', 2: 'winter', 3: 'spring', 4: 'spring', 5: 'spring', 6: 'summer',
    7: 'summer', 8: 'summer', 9: 'autumn', 10: 'autumn', 11: 'autumn', 12: 'winter'
  };

  var body     = document.body;
  var ROOT     = body.dataset.newsRoot || './';     // news/ フォルダへの相対パス
  var SITE     = ROOT + '../';                        // サイトのトップへの相対パス
  var PAGE     = body.dataset.newsPage || 'top';

  /* =====================================================
     汎用ヘルパー
     ===================================================== */
  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text; // 記事の文字は必ず textContent で入れる（HTMLとして解釈させない）
    return e;
  }
  function safeUrl(url) {
    // http / https 以外（javascript: など）はリンクにしない
    return /^https?:\/\//i.test(String(url || '')) ? url : null;
  }
  function todayJST() {
    var parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
    return parts; // "2026-10-10"
  }
  function monthKey(date) { return String(date).slice(0, 7); }               // "2026-10"
  function dotDate(date)  { return String(date).replace(/-/g, '.'); }         // "2026.10.10"
  function articlePath(date) {                                                 // "column/202610/10/"
    var d = String(date).split('-');
    return 'column/' + d[0] + d[1] + '/' + d[2] + '/';
  }
  function catInfo(name) { return NEWS_CATEGORIES[name] || NEWS_CATEGORIES['その他']; }

  function fetchJSON(url) {
    // 毎日更新されるので、ブラウザのキャッシュを使わない
    return fetch(url, { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) throw new Error(url + ' : ' + res.status);
      return res.json();
    });
  }

  /* =====================================================
     季節の配色
     ===================================================== */
  function applySeason() {
    var month = parseInt(todayJST().slice(5, 7), 10);
    document.documentElement.dataset.season = NEWS_SEASON_BY_MONTH[month] || 'spring';
  }

  /* =====================================================
     ヘッダー
       ナビボタンの並び・ロゴは assets/site-header.js で全ページ共通管理している。
       ★拡張予定: ボタンを追加・並べ替えする場合は assets/site-header.js の SITE_NAV_ITEMS を編集する
         （このファイルは書き換え不要）
       HTML 側で site-header.js を読み込んでいないページ（古いテンプレートからコピーした記事など）でも
       表示されるよう、無ければここで読み込んでから組み立てる。
     ===================================================== */
  function renderHeader() {
    function draw() { window.SunHeader.render({ root: SITE, current: 'news' }); }
    if (window.SunHeader) { draw(); return; }
    var s = document.createElement('script');
    s.src = SITE + 'assets/site-header.js';
    s.onload = draw;
    s.onerror = function () { console.error('assets/site-header.js を読み込めませんでした'); };
    document.head.appendChild(s);
  }

  /* =====================================================
     サムネイル（カテゴリ帯 + 画像）
     記事に thumb（画像パス）があればその画像、なければカテゴリ色＋アイコンで自動生成。
     ★拡張予定: 自分で用意した画像は news/assets/thumbs/<カテゴリ>/ に入れておくと、
       毎日のタスクが選んで article.json と articles.json の "thumb" に
       news/ からの相対パス（例: "assets/thumbs/world/world-sunset-01.jpg"）を書く。
       手順は news/GUIDE.md「5. サムネイル」、画像の形式は news/assets/thumbs/README.md を参照。
       他サイトの画像を転載するのは不可。
     ===================================================== */
  function buildThumb(entry, withDate) {
    var info  = catInfo(entry.category);
    var thumb = el('div', 'news-thumb');
    thumb.style.setProperty('--cat-color', info.color);
    thumb.style.setProperty('--cat-color-dark', info.colorDark);

    thumb.appendChild(el('div', 'news-thumb-cat', entry.category || 'その他'));

    var img = el('div', 'news-thumb-img');
    if (entry.thumb) {
      var image = el('img');
      image.src = ROOT + entry.thumb;
      image.alt = '';
      image.loading = 'lazy';
      image.onerror = function () { image.remove(); }; // 画像が無ければアイコン表示に戻す
      img.appendChild(image);
    }
    img.appendChild(el('span', 'news-thumb-icon', info.icon));
    if (withDate) img.appendChild(el('span', 'news-thumb-date', dotDate(entry.date)));
    thumb.appendChild(img);
    return thumb;
  }

  /* =====================================================
     記事カード
     ===================================================== */
  function buildCard(entry) {
    var card = el('a', 'news-card');
    card.setAttribute('data-transition', '');
    card.href = ROOT + articlePath(entry.date);
    card.appendChild(buildThumb(entry, false));
    card.appendChild(el('p', 'news-card-title', entry.title));
    var foot = el('div', 'news-card-foot');
    foot.appendChild(el('span', 'news-card-date', dotDate(entry.date)));
    foot.appendChild(el('span', 'news-card-arrow', '>'));
    card.appendChild(foot);
    return card;
  }

  /* =====================================================
     月別リスト（右サイド）
       onSelectMonth: 月をクリックしたときに呼ぶ関数（トップではカード一覧を切り替える）
       currentDate  : 記事ページで表示中の記事の日付（太字にする）
     ===================================================== */
  function groupByMonth(list) {
    var groups = {};
    list.forEach(function (a) {
      var key = monthKey(a.date);
      (groups[key] = groups[key] || []).push(a);
    });
    return groups;
  }

  function renderSide(list, openMonth, onSelectMonth, currentDate) {
    var side = document.getElementById('news-side');
    if (!side) return;
    side.innerHTML = '';
    side.appendChild(el('p', 'news-side-title', 'ARCHIVE'));

    var groups = groupByMonth(list);
    var months = Object.keys(groups).sort(); // 古い月 → 新しい月の順（上から 2026/09, 2026/10 ...）
    if (months.length === 0) {
      side.appendChild(el('p', 'news-card-date', 'まだ記事がありません'));
      return;
    }

    var ul = el('ul', 'news-side-month');
    months.forEach(function (key) {
      var li  = el('li');
      var btn = el('button', 'news-side-month-btn', key.replace('-', '/'));
      btn.type = 'button';
      btn.appendChild(el('span', 'news-side-count', groups[key].length + '件'));

      var sub = el('ul', 'news-side-list');
      groups[key]
        .slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }) // 月内は日付の古い順
        .forEach(function (a) {
          var item = el('li');
          var link = el('a', a.date === currentDate ? 'current' : '', a.title);
          link.setAttribute('data-transition', '');
          link.href = ROOT + articlePath(a.date);
          link.title = dotDate(a.date);
          item.appendChild(link);
          sub.appendChild(item);
        });

      if (key === openMonth) { btn.classList.add('open'); sub.classList.add('open'); }

      btn.onclick = function () {
        var willOpen = !sub.classList.contains('open');
        // 開くのは1か月分だけ（他の月は閉じる）
        side.querySelectorAll('.news-side-list').forEach(function (s) { s.classList.remove('open'); });
        side.querySelectorAll('.news-side-month-btn').forEach(function (b) { b.classList.remove('open'); });
        if (willOpen) { btn.classList.add('open'); sub.classList.add('open'); }
        if (willOpen && onSelectMonth) onSelectMonth(key);
      };

      li.appendChild(btn);
      li.appendChild(sub);
      ul.appendChild(li);
    });
    side.appendChild(ul);
  }

  /* =====================================================
     スマホ用：右下の年月選択ボタン（折り畳み式）
       スマホ（759px以下）では右サイドの月別リストを隠し、
       代わりに右下の丸ボタンから年月を選ぶ。PCでは表示されない（news.css で制御）。
         activeKey : 現在表示中の年月（"2026-10"）。パネル内で強調表示する
         onSelect  : 年月を選んだときに呼ぶ関数（引数は "2026-10"）

     ★拡張予定: パネルに項目を追加したい場合（例：カテゴリで絞り込み）
       下の「パネル本体」の中で sheet.appendChild(...) を追記する。
       ボタンの見た目は news.css の #news-fab、パネルは .news-picker-* を編集する。
     ===================================================== */
  function renderPicker(list, activeKey, onSelect) {
    var old = document.getElementById('news-picker-root');
    if (old) old.remove();

    var root = el('div');
    root.id = 'news-picker-root';

    // 右下の丸ボタン
    var fab = el('button');
    fab.id = 'news-fab';
    fab.type = 'button';
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-controls', 'news-picker');
    fab.appendChild(el('span', 'news-fab-icon', '📅'));
    fab.appendChild(el('span', 'news-fab-label', activeKey.replace('-', '/')));

    // パネル本体（背景の暗幕 + 下から出るシート）
    var overlay = el('div', 'news-picker-overlay');
    var sheet   = el('div', 'news-picker-sheet');
    sheet.id = 'news-picker';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-label', '年月を選ぶ');

    var head = el('div', 'news-picker-head');
    head.appendChild(el('p', 'news-picker-title', '年月を選ぶ'));
    var close = el('button', 'news-picker-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', '閉じる');
    head.appendChild(close);
    sheet.appendChild(head);

    // 年ごとにまとめて、月のボタンを並べる（新しい年が上）
    var groups = groupByMonth(list);
    var months = Object.keys(groups);
    if (months.indexOf(activeKey) < 0) months.push(activeKey); // 記事がない今月も選べるように
    var years = {};
    months.forEach(function (k) { (years[k.slice(0, 4)] = years[k.slice(0, 4)] || []).push(k); });

    Object.keys(years).sort().reverse().forEach(function (y) {
      sheet.appendChild(el('p', 'news-picker-year', y + '年'));
      var row = el('div', 'news-picker-months');
      years[y].sort().forEach(function (k) {
        var btn = el('button', 'news-picker-month' + (k === activeKey ? ' active' : ''));
        btn.type = 'button';
        btn.appendChild(el('span', '', parseInt(k.slice(5, 7), 10) + '月'));
        btn.appendChild(el('small', '', (groups[k] ? groups[k].length : 0) + '件'));
        btn.onclick = function () { setOpen(false); onSelect(k); };
        row.appendChild(btn);
      });
      sheet.appendChild(row);
    });

    function setOpen(open) {
      root.classList.toggle('open', open);
      fab.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('news-picker-lock', open); // 開いている間は背面をスクロールさせない
    }
    fab.onclick     = function () { setOpen(!root.classList.contains('open')); };
    overlay.onclick = function () { setOpen(false); };
    close.onclick   = function () { setOpen(false); };
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });

    root.appendChild(overlay);
    root.appendChild(sheet);
    root.appendChild(fab);
    document.body.appendChild(root);
  }

  /* =====================================================
     トップページ
     ===================================================== */
  function renderTop(list) {
    var band = document.getElementById('news-month-band');
    var grid = document.getElementById('news-grid');

    function showMonth(key) {
      var m = parseInt(key.slice(5, 7), 10);
      band.textContent = key.slice(0, 4) + '年' + m + '月の記事';
      grid.innerHTML = '';
      var items = list
        .filter(function (a) { return monthKey(a.date) === key; })
        .sort(function (a, b) { return a.date < b.date ? 1 : -1; }); // 新しい記事が先頭
      if (items.length === 0) {
        grid.appendChild(el('div', 'news-empty', 'この月の記事はまだありません。\n毎朝7時ごろに更新されます。'));
        grid.lastChild.style.whiteSpace = 'pre-line';
      } else {
        items.forEach(function (a) { grid.appendChild(buildCard(a)); });
      }
      if (history.replaceState) history.replaceState(null, '', '#' + key);
    }

    // 表示する月: URLの #2026-10 指定 → なければ今月
    var hash = location.hash.slice(1);
    var openMonth = /^\d{4}-\d{2}$/.test(hash) ? hash : monthKey(todayJST());

    // 年月を切り替える（PCの月別リスト・スマホの年月ボタンの両方から呼ばれる）
    function selectMonth(key) {
      showMonth(key);
      renderSide(list, key, selectMonth, null);
      renderPicker(list, key, selectMonth);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    showMonth(openMonth);
    renderSide(list, openMonth, selectMonth, null);
    renderPicker(list, openMonth, selectMonth);
  }

  /* =====================================================
     ずんだもんの読み上げ動画
     記事フォルダに video.json（GitHub Actions が音声と一緒に作る）があるときだけ、
     サムネイルの下に動画プレイヤーを表示する。ない記事では何も表示しない。
     プレイヤー本体（assets/video/news-video.js）は、動画がある記事でだけ読み込む。

     ★拡張予定: 動画の見た目を変える場合は tools/news-video/src/NewsVideo.jsx を編集し、
       tools/news-video で npm run build を実行して news-video.js を作り直す
     ===================================================== */
  // tools/news-video の npm run build が自動で書き換える（手で変えなくてよい）
  var VIDEO_PLAYER_VERSION = '1dc52e1688';

  function loadVideoPlayer() {
    if (window.SunNewsVideo) return Promise.resolve(window.SunNewsVideo);
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      // ?v= はプレイヤーを作り直すたびに自動で変わる（ブラウザに古い版が残らないように）
      s.src = ROOT + 'assets/video/news-video.js?v=' + VIDEO_PLAYER_VERSION;
      s.onload = function () { resolve(window.SunNewsVideo); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function mountVideo(box, article) {
    var wrap = el('section', 'news-video');
    wrap.hidden = true;
    var label = el('p', 'news-video-label', '▶ ずんだもんが読み上げる動画版');
    var stage = el('div', 'news-video-stage');
    wrap.appendChild(label);
    wrap.appendChild(stage);
    box.appendChild(wrap);

    fetch('./video.json', { method: 'HEAD', cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) return; // 動画がない記事
        wrap.hidden = false;
        return loadVideoPlayer().then(function (api) {
          return api.mount(stage, { videoUrl: './video.json', article: article, base: ROOT });
        });
      })
      .catch(function (e) {
        console.warn('動画を表示できませんでした:', e);
        wrap.remove();
      });
  }

  /* =====================================================
     記事ページ
     article.json の形式は news/GUIDE.md の「記事データの形式」を参照
     ===================================================== */
  function renderArticle(article, list) {
    var box = document.getElementById('news-article');
    box.innerHTML = '';
    document.title = article.title + ' | sunshaura ニュース';

    box.appendChild(el('div', 'news-article-topline'));
    box.appendChild(el('p', 'news-article-date', dotDate(article.date)));
    box.appendChild(el('h1', 'news-article-title', article.title));
    box.appendChild(buildThumb(article, true));
    mountVideo(box, article);
    if (article.intro) box.appendChild(el('p', 'news-article-intro', article.intro));

    (article.items || []).forEach(function (item, i) {
      var sec  = el('section', 'news-item');
      var head = el('div', 'news-item-head');
      head.appendChild(el('span', 'news-item-no', String(i + 1)));
      var titleWrap = el('div');
      titleWrap.appendChild(el('h2', 'news-item-title', item.headline));
      if (item.category) {
        var cat = el('span', 'news-item-cat', item.category);
        cat.style.setProperty('--cat-color', catInfo(item.category).color);
        titleWrap.appendChild(cat);
      }
      head.appendChild(titleWrap);
      sec.appendChild(head);

      // ★拡張予定: ニュース1件に表示する項目を増やす場合は、ここに同じ形で追記し、
      //   GUIDE.md の「記事データの形式」にも項目を追加すること
      sec.appendChild(el('p', 'news-item-label', '概要'));
      sec.appendChild(el('p', 'news-item-overview', item.overview));

      if (item.points && item.points.length) {
        sec.appendChild(el('p', 'news-item-label', 'ポイント'));
        var ul = el('ul', 'news-item-points');
        item.points.forEach(function (p) { ul.appendChild(el('li', '', p)); });
        sec.appendChild(ul);
      }

      if (item.sources && item.sources.length) {
        sec.appendChild(el('p', 'news-item-label', '出典'));
        var src = el('ul', 'news-item-sources');
        item.sources.forEach(function (s) {
          var li = el('li');
          var url = safeUrl(s.url);
          if (url) {
            var a = el('a', '', s.name || url);
            a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
            li.appendChild(a);
          } else {
            li.textContent = s.name || '';
          }
          src.appendChild(li);
        });
        sec.appendChild(src);
      }
      box.appendChild(sec);
    });

    if (article.outro) box.appendChild(el('p', 'news-article-outro', article.outro));
    box.appendChild(el('p', 'news-disclaimer',
      'この記事は、公開情報をもとにAI（Claude）が要約・作成しています。正確な情報は各出典をご確認ください。'));

    // 前後の記事
    var sorted = list.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var idx = sorted.findIndex(function (a) { return a.date === article.date; });
    var pager = document.getElementById('news-pager');
    if (pager) {
      pager.innerHTML = '';
      function pagerLink(entry, label, cls) {
        var a = el('a', cls);
        a.setAttribute('data-transition', '');
        a.href = ROOT + articlePath(entry.date);
        a.appendChild(el('small', '', label + '　' + dotDate(entry.date)));
        a.appendChild(document.createTextNode(entry.title));
        return a;
      }
      if (idx > 0) pager.appendChild(pagerLink(sorted[idx - 1], '← 前の記事', 'news-pager-prev'));
      var top = el('a', '');
      top.setAttribute('data-transition', '');
      top.href = ROOT + '#' + monthKey(article.date);
      top.appendChild(el('small', '', '一覧'));
      top.appendChild(document.createTextNode(monthKey(article.date).replace('-', '年') + '月の記事一覧へ'));
      top.style.textAlign = 'center';
      pager.appendChild(top);
      if (idx >= 0 && idx < sorted.length - 1) pager.appendChild(pagerLink(sorted[idx + 1], '次の記事 →', 'news-pager-next'));
    }

    renderSide(list, monthKey(article.date), null, article.date);
    // スマホの年月ボタン：選んだ年月の一覧（トップ）へ移動する
    renderPicker(list, monthKey(article.date), function (key) {
      var url = ROOT + '#' + key;
      if (window.SunTransition) SunTransition.go(url); else location.href = url;
    });
  }

  /* =====================================================
     起動
     ===================================================== */
  applySeason();
  renderHeader();

  var indexPromise = fetchJSON(ROOT + 'data/articles.json').catch(function (e) {
    console.error('articles.json の読み込みに失敗:', e);
    return [];
  });

  /* 中身の描画が終わったら、遷移パネルに「おまたせ！」を出して開く
     （直接URLを開いた場合など、演出なしで来たときは何もしない） */
  function notifyReady() {
    if (window.SunTransition) SunTransition.ready();
  }

  if (PAGE === 'top') {
    indexPromise.then(renderTop).then(notifyReady, notifyReady);
  } else if (PAGE === 'article') {
    Promise.all([fetchJSON('./article.json'), indexPromise])
      .then(function (r) { renderArticle(r[0], r[1]); })
      .then(notifyReady)
      .catch(function (e) {
        notifyReady();
        console.error(e);
        var box = document.getElementById('news-article');
        if (box) {
          box.innerHTML = '';
          box.appendChild(el('p', 'news-empty', '記事の読み込みに失敗しました。GitHub Pages またはローカルサーバー上で開いてください。'));
        }
      });
  }
}());
