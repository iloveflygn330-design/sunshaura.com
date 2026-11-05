/* =====================================================
   きょうりゅうラン（dinorun）の「あそびかた」（ページ送りの説明）
   minigame/index.html で dinorun.js のあとに読み込む。

   画面: 上に絵、下に短い説明。下のタブで章（基本ルール・そうさ…）に飛び、◀ ▶ でページを送る。
         PC は ← → キー、スマホは絵のところを左右にスワイプでも送れる。Esc でタイトルにもどる。
   絵: minigame/dinorun/howto/ の画像（ゲームの画面を切り取ったもの）。自分で描いたイラストに差し替えてよい。
       横長（16:9 くらい）がいちばんきれいに出る。ちがう形でも、枠に収まるように縮んで出る。
   ===================================================== */

/* ★拡張予定: あそびかたの章（タブ）とページ
   章を足すとき … DR_HOWTO_TABS に1件足す（id は英数字、name はタブに出る名前）
   ページを足すとき … DR_HOWTO_PAGES の、出したい順番のところに1件足す（並んでいる順にページ送りされる）
     {
       tab: 'basic',                       // どの章のページか（DR_HOWTO_TABS の id）
       title: '走ってよけよう',              // ページの見出し
       image: 'dinorun/howto/run.webp',    // 絵（minigame/ からの場所）。絵のかわりにアイコンを並べるときは icons を書く
       icons: [{ icon: '🗡', name: '居合切り', text: '目の前を切る' }, ...],   // （任意）アイコンのカード。image より優先
       text: '説明（短く、2〜3行まで）。<b>…</b> で黄色くできる',
       key: 'PC：Space / ↑',                // （任意）キーボードの操作。説明の下に小さく出る
     },
   文が長いとスマホでスクロールが出るので、1ページの説明は2〜3行におさめる。 */
const DR_HOWTO_TABS = [
  { id: 'basic', name: '基本ルール' },
  { id: 'control', name: 'そうさ' },
  { id: 'item', name: 'アイテム' },
  { id: 'sp1', name: 'スペシャル①' },
  { id: 'sp2', name: 'スペシャル②' },
];

const DR_HOWTO_PAGES = [
  /* --- 基本ルール --- */
  {
    tab: 'basic', title: '走ってよけよう', image: 'dinorun/howto/run.webp',
    text: '恐竜君は自動で走るよ。障害物を<b>ジャンプ</b>と<b>スライディング</b>でよけて、どこまで行けるかな？',
  },
  {
    tab: 'basic', title: 'ハート', image: 'dinorun/howto/heart.webp',
    text: 'ハートは最初2つ。ぶつかると1つへって、少しのあいだ無敵になるよ。0になったらゲームオーバー。',
  },
  {
    tab: 'basic', title: 'スコアとボーナス', image: 'dinorun/howto/score.webp',
    text: 'スコアは「きょり＋コイン＋こわした障害物」。<b>ぎりぎり</b>でよけたり、スライディングでくぐると <b>+5コイン</b>！',
  },
  /* --- そうさ --- */
  {
    tab: 'control', title: 'ジャンプ', image: 'dinorun/howto/jump.webp',
    text: '障害物や<b>穴</b>を飛びこえよう。穴に落ちかけても、すぐジャンプすれば出られるよ。',
    key: 'PC：Space / ↑',
  },
  {
    tab: 'control', title: 'スライディング', image: 'dinorun/howto/slide.webp',
    text: '天井からぶら下がっているものは、スライディングでくぐろう。途中でジャンプすればやめられるよ。',
    key: 'PC：↓',
  },
  {
    tab: 'control', title: 'スキルボタン', image: 'dinorun/howto/skills.webp',
    text: 'お店で覚えた技は、上の3つのボタンで使えるよ。ボタンのバーがたまると、また使える。',
    key: 'PC：A・S・D　一時停止 P',
  },
  {
    tab: 'control', title: 'タップでそうさ（スマホ）', image: 'dinorun/howto/tap.webp',
    text: '大きなエリアを<b>タップ</b>（上へスワイプ）でジャンプ。<b>下へスワイプ</b>でスライディング、<b>左</b>でスキル①、<b>右</b>でスキル③！',
    key: '右上の「操作」ボタンで、ボタンでのそうさに切りかえられるよ',
  },
  /* --- アイテム --- */
  {
    tab: 'item', title: 'コインとショップ', image: 'dinorun/howto/shop.webp',
    text: 'コインを集めて、地面の<b>SHOP</b>に触るとお買いもの。ジャンプで飛びこすと <b>+10コイン</b>。',
  },
  {
    tab: 'item', title: '技を覚える',
    icons: [
      { icon: '🗡', name: '居合切り', text: '目の前を切る。切ったものからコイン' },
      { icon: '🌀', name: 'スピンアタック', text: '回って体当たり' },
      { icon: '🔥', name: '火の玉', text: '前へ飛ばしてこわす' },
      { icon: '🌪', name: 'コイン吸引', text: '画面のコインを全部集める' },
    ],
    text: 'お店で技を覚えると、スキルボタンに入るよ。',
  },
  {
    tab: 'item', title: 'からだを強くする',
    icons: [
      { icon: '⏫', name: 'ジャンプ回数+1', text: '空中でもう1回ジャンプ' },
      { icon: '🦶', name: 'バタ足ジャンプ', text: '長押しで少し浮ける' },
      { icon: '❤', name: 'ライフ+1', text: 'ハートが1つ増える' },
      { icon: '🧪', name: '回復薬', text: '好きなときにハート回復（Q）' },
      { icon: '🧲', name: '磁石', text: '近くのコインを吸い寄せる' },
      { icon: '💰', name: 'アイテム倍率アップ', text: 'もらえるコインが増える' },
    ],
    text: 'ほかにも、いろいろなアイテムがあるよ。',
  },
  /* --- スペシャル① --- */
  {
    tab: 'sp1', title: '急降下コンボ', image: 'dinorun/howto/combo.webp',
    text: '<b>急降下</b>を覚えたら、空中でスライディングボタン。足元が光っている間に技を出すと、もっと強くなる！',
  },
  {
    tab: 'sp1', title: 'ボーナスステージ', image: 'dinorun/howto/bonus.webp',
    text: 'お店に<b>ボーナスチケット</b>が並ぶことがあるよ。障害物のない下り坂で、コインざくざく！',
  },
  {
    tab: 'sp1', title: 'SKILL! のかべ', image: 'dinorun/howto/gate.webp',
    text: 'ときどき<b>SKILL!</b>のシャッターとかべが出てくる。技でかべをこわして通りぬけよう！',
  },
  /* --- スペシャル② --- */
  {
    tab: 'sp2', title: 'ふしぎなアイコン…？', image: 'dinorun/howto/icon.webp',
    text: '5ワールド目をこえると、ときどき地面に<b>ふしぎなアイコン</b>があらわれる…。さわると、いったい何が…？',
  },
  {
    tab: 'sp2', title: 'バトル…？！', image: 'dinorun/howto/battle.webp',
    text: 'まるで<b>RPG</b>のようなバトルが始まる…？！ 勝てば大きなスコア。負けると…？',
  },
  {
    tab: 'sp2', title: 'バトルのコツ', image: 'dinorun/howto/tips.webp',
    text: 'ジャンプボタンでふみつけ。ボスが<b>3回光ったら</b>、4回目に合わせてスライディングボタンで防御！',
  },
  {
    tab: 'sp2', title: 'ほかにも…？！', image: 'dinorun/howto/more.webp',
    text: '色のちがうアイコンを見かけたら…？ ほかの<b>ミニゲーム</b>が始まることも…？！',
  },
];

/* いま見ているページ（0 から） */
let drHowtoIndex = 0;

/* あそびかたを開く（タイトルの「あそびかた」から） */
function drHowtoOpen() {
  drHowtoBuildTabs();
  drHowtoShow(0);
}

/* タブを作る（1回だけ） */
function drHowtoBuildTabs() {
  const box = document.getElementById('dr-howto-tabs');
  if (!box || box.dataset.built) return;
  box.dataset.built = '1';
  box.style.setProperty('--tabs', DR_HOWTO_TABS.length);
  box.innerHTML = DR_HOWTO_TABS.map(t => `<button type="button" class="dr-howto-tab" data-dr="howto-tab" data-tab="${t.id}">${drEscape(t.name)}</button>`).join('');
  // スマホ：絵のところを左右にスワイプしてページを送る
  const pic = document.getElementById('dr-howto-pic');
  if (pic) {
    let sx = null, sy = 0;
    pic.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    pic.addEventListener('touchend', e => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      sx = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) drHowtoMove(dx < 0 ? 1 : -1);
    });
  }
}

/* i ページ目を出す */
function drHowtoShow(i) {
  const n = DR_HOWTO_PAGES.length;
  drHowtoIndex = Math.max(0, Math.min(n - 1, i));
  const pg = DR_HOWTO_PAGES[drHowtoIndex];
  const $ = id => document.getElementById(id);
  const pic = $('dr-howto-pic');
  if (pic) {
    if (pg.icons) {
      pic.className = 'dr-howto-pic is-icons';
      pic.innerHTML = pg.icons.map(c => `<div class="dr-howto-card"><span class="dr-howto-card-icon" aria-hidden="true">${c.icon}</span>`
        + `<span class="dr-howto-card-name">${drEscape(c.name)}</span><span class="dr-howto-card-text">${drEscape(c.text)}</span></div>`).join('');
      pic.dataset.count = pg.icons.length;
    } else {
      pic.className = 'dr-howto-pic';
      pic.innerHTML = pg.image ? `<img src="${pg.image}" alt="${drEscape(pg.title)}の画面" draggable="false">` : '';
    }
  }
  if ($('dr-howto-head')) $('dr-howto-head').textContent = pg.title;
  if ($('dr-howto-desc')) $('dr-howto-desc').innerHTML = pg.text;   // ページの文は DR_HOWTO_PAGES に自分で書いたものなので、<b> をそのまま使う
  if ($('dr-howto-key')) { $('dr-howto-key').textContent = pg.key || ''; $('dr-howto-key').hidden = !pg.key; }
  if ($('dr-howto-count')) $('dr-howto-count').textContent = `${drHowtoIndex + 1} / ${n}`;
  document.querySelectorAll('.dr-howto-tab').forEach(b => b.classList.toggle('is-active', b.dataset.tab === pg.tab));
  document.querySelectorAll('[data-dr="howto-prev"]').forEach(b => { b.disabled = drHowtoIndex === 0; });
  document.querySelectorAll('[data-dr="howto-next"]').forEach(b => { b.disabled = drHowtoIndex === n - 1; });
  // 次のページの絵を先に読みこんでおく（送ったときにすぐ出るように）
  const next = DR_HOWTO_PAGES[drHowtoIndex + 1];
  if (next && next.image) { const im = new Image(); im.src = next.image; }
}

/* d ページ進む（-1 で戻る） */
function drHowtoMove(d) { drHowtoShow(drHowtoIndex + d); }

/* タブを押した：その章の最初のページへ */
function drHowtoTab(id) {
  const i = DR_HOWTO_PAGES.findIndex(p => p.tab === id);
  if (i >= 0) drHowtoShow(i);
}
