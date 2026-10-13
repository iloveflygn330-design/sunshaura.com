/* =====================================================
   sunshaura.com アバター改変ページ専用スクリプト（ES module）
   avatar/index.html で <script type="module"> として読み込む。
   アバターのデータはサイトのトップの avatars.js（avatar_form.html が自動生成）。
   ===================================================== */
const AVT_CONFIG = {
  SITE_ROOT:   '../',          // ★ このページ（avatar/）からサイトのトップへの相対パス
  DATA_PATH:   'avatars.js',   // ★ アバターデータのパス（サイトのトップから見た場所）
  DOOR_DUR_MS: 400,            // ★ CSS の --avt-door-dur: 0.4s と合わせること
};

/*
 * avatars.js の画像パス（'assets/images/...'）はサイトのトップから見た書き方なので、
 * avatar/ フォルダのページで使うときはトップ基準の正しいURLに直す。
 * （https:// で始まるURLはそのまま。空のときは空文字を返す）
 */
const AVT_SITE_URL = new URL(AVT_CONFIG.SITE_ROOT, location.href);

/*
 * 軽量版（WebP）の一覧
 *   assets/images/webp.json に載っている画像は、同じ場所の .webp を使う（PNG の 1/10 くらいの重さ）。
 *   一覧は GitHub 上で自動で作られる（.github/scripts/avatar-webp.js）。
 *   載っていない画像（追加した直後など）は、元の PNG をそのまま使う。
 */
const AVT_WEBP_LIST = 'assets/images/webp.json';
const AVT_IMAGES_DIR = 'assets/images/';
let avtWebp = new Set();
async function avtLoadWebpList() {
  try {
    const res = await fetch(new URL(AVT_WEBP_LIST, AVT_SITE_URL), { cache: 'no-cache' });
    if (res.ok) avtWebp = new Set((await res.json()).files || []);
  } catch (e) { /* 一覧が読めなくても、PNG で表示できる */ }
}

function avtUrl(path) {
  if (!path) return '';
  if (path.startsWith(AVT_IMAGES_DIR) && avtWebp.has(path.slice(AVT_IMAGES_DIR.length))) {
    path = path.replace(/\.(png|jpe?g)$/i, '.webp');
  }
  return new URL(path, AVT_SITE_URL).href;
}

/* 画像が読めなかったときに出す画像（サムネイルが自動で作られる前など） */
const AVT_FALLBACK = {
  miniImgPC: 'assets/images/ShareImg/mini_pc.png',
  miniImgSP: 'assets/images/ShareImg/mini_sp.png',
};

/*
 * アバターごとの URL
 *   avatar/?id=<アバターID> で開くと、そのアバターを最初に表示する。
 *   アバターを切り替えると、アドレスバーの URL も ?id=<アバターID> に変わる（そのままブックマーク・コピーできる）。
 *   「共有」ボタンでは、SNS でカード表示される avatar/p/<アバターID>/ の URL を共有する
 *   （そのページは .github/scripts/avatar-share.mjs が自動で作る）。
 */
function avtIdFromUrl() {
  return new URLSearchParams(location.search).get('id');
}
function avtSetUrl(id) {
  const url = new URL(location.href);
  url.searchParams.set('id', id);
  history.replaceState(null, '', url);
}
function avtShareUrl(id) {
  return new URL('p/' + encodeURIComponent(id) + '/', new URL('./', location.href)).href;
}

let avtData = [], avtCurrentId = null;
let avtActiveGenres = new Set(), avtActiveCats = new Set();
let avtDoorBusy = false, avtLoaded = false;

async function avtLoadData() {
  if (avtLoaded) return;
  try {
    const [module] = await Promise.all([
      import(new URL(AVT_CONFIG.DATA_PATH, AVT_SITE_URL).href),
      avtLoadWebpList(),
    ]);
    avtData = module.default;
    avtLoaded = true;
    if (avtData.length > 0) {
      // URL で指定されたアバター（?id=...）があればそれを、なければランダムに1体表示する
      const wanted = avtData.find(a => a.id === avtIdFromUrl());
      avtShowAvatar(wanted || avtData[Math.floor(Math.random() * avtData.length)], false);
      // 共有リンクから来た人には、アバターの表示エリアを見せる
      if (wanted) requestAnimationFrame(() => document.getElementById('avt-display-area')?.scrollIntoView({ block: 'start' }));
    }
    avtRenderThumbs();
  } catch (e) {
    console.error('avatars.js の読み込みに失敗:', e);
    const grid = document.getElementById('avt-thumb-grid');
    if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--color-placeholder);padding:20px;font-size:13px;">データの読み込みに失敗しました。<br>GitHub Pages またはローカルサーバー上で開いてください。</div>';
  }
}

function avtGetFiltered() {
  return avtData.filter(a => {
    const genreOk = avtActiveGenres.size === 0 || avtActiveGenres.has(a.genre);
    const catOk   = avtActiveCats.size   === 0 || avtActiveCats.has(a.category);
    return genreOk && catOk;
  });
}

function avtToggleGenre(genre, btnEl) {
  avtActiveGenres.has(genre) ? avtActiveGenres.delete(genre) : avtActiveGenres.add(genre);
  btnEl.classList.toggle('active', avtActiveGenres.has(genre));
  avtRenderThumbs();
}

function avtToggleCat(cat, btnEl) {
  avtActiveCats.has(cat) ? avtActiveCats.delete(cat) : avtActiveCats.add(cat);
  btnEl.classList.toggle('active', avtActiveCats.has(cat));
  avtRenderThumbs();
}

function avtRenderThumbs() {
  const grid = document.getElementById('avt-thumb-grid');
  if (!grid) return;
  const filtered = avtGetFiltered();
  if (filtered.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--color-placeholder);padding:20px;font-size:13px;">該当するアバターがありません</div>';
    return;
  }
  grid.innerHTML = '';
  filtered.forEach(avatar => {
    const item = document.createElement('div');
    item.className = 'avt-thumb-item' + (avatar.id === avtCurrentId ? ' selected' : '');
    item.onclick = () => avtSelectAvatar(avatar.id);
    const imgPC = document.createElement('img');
    imgPC.className = 'avt-thumb-pc'; imgPC.loading = 'lazy'; imgPC.src = avtUrl(avatar.miniImgPC);
    imgPC.onerror = () => { imgPC.onerror = null; imgPC.src = avtUrl(AVT_FALLBACK.miniImgPC); }; imgPC.alt = avatar.name;
    const imgSP = document.createElement('img');
    imgSP.className = 'avt-thumb-sp'; imgSP.loading = 'lazy'; imgSP.src = avtUrl(avatar.miniImgSP);
    imgSP.onerror = () => { imgSP.onerror = null; imgSP.src = avtUrl(AVT_FALLBACK.miniImgSP); }; imgSP.alt = avatar.name;
    item.appendChild(imgPC); item.appendChild(imgSP);

    /* アバター名ラベル（PC専用・CSSで SP は非表示） */
    const nameEl = document.createElement('div');
    nameEl.className = 'avt-thumb-name';
    nameEl.textContent = avatar.name;
    item.appendChild(nameEl);

    grid.appendChild(item);
  });
}

function avtSelectAvatar(id) {
  if (id === avtCurrentId || avtDoorBusy) return;
  const avatar = avtData.find(a => a.id === id);
  if (!avatar) return;
  avtDoorBusy = true;

  // ① タップした瞬間にスクロール開始（ドアアニメーションと並行して進む）
  scrollToDisplayArea();

  const doorTop = document.getElementById('avt-door-top');
  const doorBot = document.getElementById('avt-door-bottom');
  doorTop.classList.add('door-closed'); doorBot.classList.add('door-closed');
  setTimeout(() => {
    avtShowAvatar(avatar, true);
    doorTop.classList.remove('door-closed'); doorBot.classList.remove('door-closed');
    setTimeout(() => { avtDoorBusy = false; }, AVT_CONFIG.DOOR_DUR_MS);
  }, AVT_CONFIG.DOOR_DUR_MS);
}

/* テキストのシャドー・縁取りを text-shadow で統合して返す
   （-webkit-text-stroke + paint-order は HTML要素では
     ブラウザによって効かないため、text-shadow 多方向重ねで代替） */
function buildTextShadow(shadow, outline) {
  const parts = [];
  if (outline) {
    const c = 'rgba(0,0,0,0.85)';
    parts.push(`-1px -1px 0 ${c}`, ` 1px -1px 0 ${c}`,
               `-1px  1px 0 ${c}`, ` 1px  1px 0 ${c}`);
  }
  if (shadow) { parts.push('0 2px 5px rgba(0,0,0,0.6)'); }
  return parts.length ? parts.join(', ') : 'none';
}

function avtShowAvatar(avatar, updateThumb) {
  avtCurrentId = avatar.id;
  avtSetUrl(avatar.id);
  document.title = `${avatar.name} | アバター改変 | sunshaura.com`;

  /* ⑦ 背景 */
  document.getElementById('avt-bg-img').style.backgroundImage = avatar.bgImg ? `url('${avtUrl(avatar.bgImg)}')` : '';
  const bgPat = document.getElementById('avt-bg-pattern');
  if (avatar.bgPattern) {
    bgPat.style.backgroundImage = `url('${avtUrl(avatar.bgPattern)}')`;
    bgPat.style.animationPlayState = 'running';
    /* bgPatternSize: フォームで設定したタイルサイズを適用（空文字=デフォルト） */
    bgPat.style.backgroundSize = avatar.bgPatternSize || '';
  } else {
    bgPat.style.backgroundImage = 'none';
    bgPat.style.animationPlayState = 'paused';
    bgPat.style.backgroundSize = '';
  }

  /* ⑥ 枠C */
  document.getElementById('avt-frame-c-top').style.backgroundImage    = avatar.frameCTop    ? `url('${avtUrl(avatar.frameCTop)}')` : 'none';
  document.getElementById('avt-frame-c-bottom').style.backgroundImage = avatar.frameCBottom ? `url('${avtUrl(avatar.frameCBottom)}')` : 'none';

  /* ⑤ 情報テキスト */
  const nameEl = document.getElementById('avt-name');
  const descEl = document.getElementById('avt-desc');
  nameEl.textContent = avatar.name || '';
  descEl.textContent = avatar.desc || '';

  /* ⑤ テキストスタイル（nameStyle / descStyle）
     フォームで設定した色・シャドー・縁取りを動的に適用
     デフォルト: 白文字・シャドーあり・縁取りなし */
  const ns = avatar.nameStyle || { color: 'white', shadow: true,  outline: false };
  const ds = avatar.descStyle || { color: 'white', shadow: false, outline: false };

  nameEl.style.color      = ns.color === 'black' ? 'rgba(0,0,0,0.9)' : 'var(--color-white)';
  nameEl.style.textShadow = buildTextShadow(ns.shadow, ns.outline);

  /* CSS変数で設定（-webkit-box との干渉を回避 / シャドー・縁取りは統合text-shadow） */
  descEl.style.setProperty('--avt-desc-color',  ds.color === 'black' ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.88)');
  descEl.style.setProperty('--avt-desc-tshadow', buildTextShadow(ds.shadow, ds.outline));

  /* ⑤ infoImg 透かし背景 */
  const bgLayer = document.getElementById('avt-info-bg-layer');
  bgLayer.style.backgroundImage = avatar.infoImg ? `url('${avtUrl(avatar.infoImg)}')` : 'none';

  /* ④ リファレンス枠 */
  const refs = document.getElementById('avt-refs');
  refs.innerHTML = '';
  (avatar.orgAvt || []).forEach(ref => {
    const a = document.createElement('a');
    a.href = ref.url || '#'; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.className = 'avt-ref-item';
    const img = document.createElement('img');
    img.src = avtUrl(ref.img); img.alt = '';
    a.appendChild(img); refs.appendChild(a);
  });

  /* ③ アバター枠 */
  document.getElementById('avt-main-img').style.backgroundImage = avatar.mainImg ? `url('${avtUrl(avatar.mainImg)}')` : '';

  if (updateThumb) avtRenderThumbs();
  // 視聴者オプションを再適用（per-avatar設定を上書き）
  applyViewerOpts();
}


// ================================================================
// 視聴者オプション（表示設定・ローカル保持）
// ================================================================
const viewerOpts = {
  autoScroll: true,  // アバター切替時に自動スクロール
  bold:       false, // 文字の太さ
  outline:    false, // 縁取り
};

// オプションパネルの折り畳み開閉
function toggleAvtOptions() {
  const panel = document.getElementById('avt-options-panel');
  const arrow = document.getElementById('avt-opts-arrow');
  const isOpen = panel.classList.contains('open');
  panel.classList.toggle('open', !isOpen);
  arrow.classList.toggle('open', !isOpen);
}

// ON/OFFトグルボタン（ラベルも切り替え）
// btnId: ボタンのID / labelOn: ON時のテキスト / labelOff: OFF時のテキスト
function toggleOpt(key, btnId, labelOn, labelOff) {
  viewerOpts[key] = !viewerOpts[key];
  const btn = document.getElementById(btnId);
  if (btn) {
    btn.classList.toggle('active', viewerOpts[key]);
    btn.textContent = viewerOpts[key] ? labelOn : labelOff;
  }
  applyViewerOpts();
}

// スライダー値（0〜100）を rgb グレー値に変換
function sliderToGray(id) {
  const val = parseInt(document.getElementById(id)?.value ?? 100);
  const v = Math.round(val * 255 / 100);
  return `rgb(${v},${v},${v})`;
}

// オプションをアバター表示領域に反映
// avtShowAvatar() の最後に呼ばれるほか、各オプション変更時にも呼ばれる
function applyViewerOpts() {
  const nameEl  = document.getElementById('avt-name');
  const descEl  = document.getElementById('avt-desc');
  const labelEl = document.getElementById('avt-items-label');

  // 文字色
  const textColor = sliderToGray('opt-text-color');
  if (nameEl)  nameEl.style.color  = textColor;
  if (labelEl) labelEl.style.color = textColor;
  if (descEl)  descEl.style.setProperty('--avt-desc-color', textColor);

  // 文字の太さ（デフォルトはそれぞれのCSSに任せる）
  const fw = viewerOpts.bold ? '800' : '';
  [nameEl, descEl, labelEl].forEach(el => { if (el) el.style.fontWeight = fw; });

  // 縁取り（縁取り色スライダーで色指定、text-shadow 多方向重ねで実装）
  const outlineColor = sliderToGray('opt-outline-color');
  const c = outlineColor;
  const outlineShadow = viewerOpts.outline
    ? `-1px -1px 0 ${c}, 1px -1px 0 ${c}, -1px 1px 0 ${c}, 1px 1px 0 ${c}`
    : 'none';
  if (nameEl)  nameEl.style.textShadow = outlineShadow;
  if (descEl)  descEl.style.setProperty('--avt-desc-tshadow', outlineShadow);
}

// ================================================================
// 共有ボタン
//   「このアバターを共有」: スマホは共有メニュー（LINE・X・Discord など）を開く。
//                           共有メニューが無いブラウザ（PC など）はリンクをコピーする。
//   「X でポスト」       : X の投稿画面を開く
// ★拡張予定: 共有するときの文言を変える場合は avtShareText() を書き換える
// ================================================================
function avtShareText(a) {
  return `シャウラのアバター改変「${a.name}」`;
}

async function avtShare() {
  const a = avtData.find(x => x.id === avtCurrentId);
  if (!a) return;
  const url = avtShareUrl(a.id);
  if (navigator.share) {
    try { await navigator.share({ title: a.name, text: avtShareText(a), url }); return; }
    catch (e) { if (e.name === 'AbortError') return; /* 共有がキャンセルされた */ }
  }
  try {
    await navigator.clipboard.writeText(url);
    avtToast('リンクをコピーしました');
  } catch (e) {
    window.prompt('このリンクをコピーしてください', url);
  }
}

function avtShareX() {
  const a = avtData.find(x => x.id === avtCurrentId);
  if (!a) return;
  const intent = 'https://x.com/intent/post?text=' + encodeURIComponent(avtShareText(a)) +
    '&url=' + encodeURIComponent(avtShareUrl(a.id));
  window.open(intent, '_blank', 'noopener');
}

// 画面下に少しだけ出るお知らせ
function avtToast(msg) {
  let el = document.getElementById('avt-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'avt-toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2000);
}

// アバター表示領域の上端にスクロール（ヘッダー高さ分オフセット）
function scrollToDisplayArea() {
  if (!viewerOpts.autoScroll) return;
  const el = document.getElementById('avt-display-area');
  if (!el) return;
  // scroll-margin-top でヘッダー分のオフセットを吸収しているため
  // scrollIntoView だけで確実にスクロールできる
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// グローバルに公開（onclick から呼び出すため）
window.toggleAvtOptions  = toggleAvtOptions;
window.toggleOpt         = toggleOpt;
window.applyViewerOpts   = applyViewerOpts;

// モジュールscriptはDOMが準備されてから実行されるため、直接呼び出しでOK
avtLoadData();

// onclick から呼び出せるようにグローバルに公開
// （type="module" の関数はそのままだと外から見えないため）
window.avtToggleGenre = avtToggleGenre;
window.avtShare       = avtShare;
window.avtShareX      = avtShareX;
window.avtToggleCat   = avtToggleCat;
