/* =====================================================
   きょうりゅうラン（dinorun）のゲーム本体
   minigame/index.html で、dinorun-config / items / worlds / sprites / ranking のあとに読み込む。

   遊び方:
     恐竜が右へ走り続ける。障害物をジャンプ・しゃがみ・スキルでよける。
     走り始めの約 270m はチュートリアル（説明の文を出しながら、決まった障害物を出す。dinorun-worlds.js の DR_TUTORIAL）。
     コインを集めて、途中で地面に出てくるショップに触ると、ショップで強化を買える（ジャンプで飛び越すとスキップ）。
     障害物にぶつからず、ぎりぎりでよけると「かすりボーナス」（コイン）。地面の穴（落下穴）はジャンプで飛び越す。
     走った距離でワールドが切り替わる。ボーナスチケットを買うと、次のワールドの前にボーナスステージ（障害物なし・下り坂）。
     5ワールド目からは、ときどきスキルを使わないと通れない区画（シャッター＋かべ）が出る。ライフが 0 になったらゲームオーバー → 名前（英字3文字）を入れてランキングへ。

   操作:
     PC     … Space / ↑ ジャンプ（バタ足ジャンプを覚えたら、長押しで空中に浮く）、↓ スライディング（急降下を覚えたら、空中では急降下）、A / S / D スキル①②③、P / Esc 一時停止
              ボタンをクリックしても操作できる
     スマホ … 画面下のボタンをタップ（横持ちのときは左右どちらにも同じボタンが出る）

   画面の流れ（dr.mode）:
     title（タイトル）→ ready（カウントダウン）→ play（プレイ中）
       ⇄ shop（ショップ。ゲームは止まる）/ pause（一時停止）
       → dying（やられ演出）→ over（結果）→ entry（名前入力）→ ranking（ランキング）→ title

   ふつうは、このファイルは触らなくてよい。中身を増やすときは:
     アイテム・スキル → dinorun-items.js / ワールド・障害物 → dinorun-worlds.js
     恐竜の絵 → dinorun-sprites.js / スピード・音・ランキング → dinorun-config.js
   ===================================================== */

/* -----------------------------------------------------
   ★拡張予定: スキルの動き（DR_SKILLS の action と同じ名前で呼ばれる）
     新しい動きを足すときは、ここに  名前(run, skill) { ... }  を1つ追加する。
       run   … いまのプレイの状態（下の drNewRun() に中身の一覧がある）
       skill … そのスキルの数値（DR_SKILLS からコピーしたもの。ショップの強化で書き換わる）
     例: 数秒間スピードを落とす 'slow' を作るなら
       slow(run, skill) { run.slowT = skill.duration; }
       → drUpdate() の速さの計算で run.slowT > 0 のときに速さを下げる処理も足す
       → 効果時間をバーで出したいときは、drEffectBars() に1行足す
     ※ 使えないとき（急降下を地面で押したなど）は false を返すと、クールタイムが減らない（空振りにならない）
   ----------------------------------------------------- */
const DR_SKILL_ACTIONS = {
  /* 居合切り：目の前の range × height の範囲にある、壊せる障害物を切る。切ったものからコインが出る
     （急降下のすぐあとなら「ダッシュ切り」：前へ dashDistance 進みながら、その道のりもまとめて切る。
       ダッシュ切りのときは、天井から下がっているもの（障害物の dashCut: true）も切れる） */
  slash(run, skill) {
    const dash = drTryDash(run);
    run.dashCut = dash > 0;
    run.slashT = 0.28;
    run.slashRange = skill.range + dash;
    const p = drPlayerBox(run);
    const area = { x: p.x + p.w - 2, y: DR_CONFIG.groundY - skill.height, w: skill.range + dash, h: skill.height };
    run.obstacles.forEach(o => {
      if (!o.dead && drCanCut(run, o) && drOverlap(area, drObstacleBox(o))) { drKillObstacle(run, o); drDropCoins(run, o); }
    });
    drSound('slash');
  },
  /* スピンアタック：duration 秒のあいだ回転。ぶつかった障害物を壊し、ダメージを受けない
     （急降下のすぐあとなら、回転しながら本当に前へ spinRushMeters m 進む＝画面が一気に流れる） */
  spin(run, skill) {
    if (run.comboT > 0) { run.comboT = 0; drStartRush(run, DR_CONFIG.spinRushMeters, DR_CONFIG.spinRushTime); }
    run.spinT = skill.duration;
    run.spinTotal = skill.duration;
    drSound('spin');
  },
  /* 急降下：空中から一気に着地する（地面にいるときは使えない）。ショップの「急降下 Lv2」でクールタイムが 0 になる。
     スライディングボタンに付くスキル（空中でスライディングボタンを押すと出る。drSlide() から呼ばれる）。
     このあと DR_CONFIG.diveComboTime 秒以内に、居合切り・スピンアタック・火の玉・スライディングを使うと強くなる */
  dive(run, skill) {
    if (run.onGround) return false;
    run.vy = -skill.speed;
    run.diving = true;
    run.fluttering = false;
    run.slideT = 0;
    run.comboT = DR_CONFIG.diveComboTime;
    drSound('dive');
  },
  /* コイン吸引：画面に出ているコインを全部、自機に吸い寄せる */
  vacuum(run, skill) {
    run.coins.forEach(c => { if (c.x < DR_CONFIG.width) c.vac = true; });
    run.vacuumFx = 0.35;
    drSound('vacuum');
  },
  /* 火の玉：前へ火の玉を飛ばす。
       赤い火の玉 … range ドット飛ぶ。壊せる障害物に当たると壊し、pierce 個壊したら消える。壊せないものに当たると消える
       青い火の玉 … 急降下のすぐあとに撃つと青くなる。画面の端まで消えず、触れた障害物を（壊せないものも）全部消す。速さは blueSpeed */
  fire(run, skill) {
    const blue = run.comboT > 0;
    if (blue) run.comboT = 0;
    const p = drPlayerBox(run);
    const r = skill.radius + (blue ? 2 : 0);
    run.shots.push({
      x: p.x + p.w + r - 2, y: Math.min(p.y + 7, DR_CONFIG.groundY - r - 1), r, blue, t: 0, dist: 0,
      speed: blue ? skill.blueSpeed : skill.speed,
      range: blue ? Infinity : skill.range,
      pierce: skill.pierce, hit: new Set(),
    });
    drSound(blue ? 'bluefire' : 'fire');
  },
};

/* 居合切りで切れるか（ふつうは breakable のものだけ。ダッシュ切りなら dashCut のものも） */
function drCanCut(run, o) { return !o.def.pit && (o.def.breakable !== false || (run.dashCut && o.def.dashCut)); }

/* 急降下のすぐあとなら、前へダッシュする（進む距離を返す。ダッシュしなければ 0）。居合切りで使う */
function drTryDash(run) {
  if (!(run.comboT > 0)) return 0;
  run.comboT = 0;
  run.dashT = DR_CONFIG.dashTime;
  run.dashFrom = run.dashX;
  drSound('dash');
  return DR_CONFIG.dashDistance;
}
/* 本当に前へ進む（画面が time 秒のあいだ速く流れて、meters m ぶん余分に進む）。スピン・スライディングの急降下コンボで使う */
function drStartRush(run, meters, time) {
  run.rushT = time;
  run.rushSpeed = meters * DR_CONFIG.pxPerMeter / time;
  drSound('dash');
}
function drPX(run) { return DR_CONFIG.playerX + ((run && run.dashX) || 0); }   // 自機の左端（ダッシュで前に出ている分を足す）

/* =====================================================
   ここから下はゲームの仕組み
   ===================================================== */
const dr = {
  ready: false,       // 画面の部品を作り終えたか（1回だけ）
  active: false,      // いまこのゲームの画面を開いているか
  mode: 'title',
  canvas: null, ctx: null,
  raf: 0, lastT: 0, clock: 0,
  run: null,          // いまのプレイ（drNewRun() で作る）
  demo: null,         // タイトル画面の後ろで流れている見本
  slideBufT: 0,            // 空中でスライディングを押したとき、着地したらすぐ出せるように覚えておく時間
  jumpHeld: new Set(),     // いま押しっぱなしのジャンプボタン・キー（バタ足ジャンプ用。'k'+キー名 / 'p'+指の番号）
  ranking: { all: [], month: [], local: true, ok: true, loaded: false },
  rankTab: 'month',
  entry: null,        // 名前入力中の状態
  readyT: 0, readyNext: 'play',
  shop: null,         // ショップを開いている間の状態
  shake: 0,
  debug: /[?&]drdebug\b/.test(location.search),
  uiCache: {},
  titleSwapT: 0,
};

/* ---------- ミニゲームページから呼ばれる入口 ---------- */

/* ゲーム選択でこのゲームを選んだとき（minigame.js の mgStartGame から） */
function dinorunInit() {
  if (!dr.ready) drSetup();
  dr.active = true;
  document.body.classList.add('dr-active');
  drAutoHeader();
  drShowTitle();
  drLoadRanking();
  if (!dr.raf) { dr.lastT = performance.now(); dr.raf = requestAnimationFrame(drLoop); }
}

/* ゲーム選択に戻るとき・ほかのゲームを選んだとき */
function dinorunStop() {
  if (!dr.active) return;
  dr.active = false;
  cancelAnimationFrame(dr.raf); dr.raf = 0;
  drBgm(null);
  document.body.classList.remove('dr-active', 'dr-header-hidden', 'dr-modal');
  drUpdateHeaderToggle();
  dr.run = null;
  drSetMode('title');
}

/* ---------- 準備（1回だけ） ---------- */
function drSetup() {
  dr.ready = true;
  dr.canvas = document.getElementById('dr-canvas');
  dr.canvas.width = DR_CONFIG.width;
  dr.canvas.height = DR_CONFIG.height;
  dr.ctx = dr.canvas.getContext('2d');
  dr.ctx.imageSmoothingEnabled = false;

  drCheckData();
  drBuildPads();
  drBindInput();
  drBuildEntry();
  drUpdateSoundBtn();

  // スキル・アイテムの画像（PNG）を指定していれば先に読み込んでおく
  drPreloadImages();
}

/* データの書き間違いを見つけたら、ブラウザの開発者ツール（Console）に出す */
function drCheckData() {
  const obIds = new Set(DR_OBSTACLES.map(o => o.id));
  DR_WORLDS.forEach(w => (w.obstacles || []).forEach(id => {
    if (!obIds.has(id)) console.warn(`[dinorun] ワールド「${w.name}」の障害物 ${id} が DR_OBSTACLES にありません`);
  }));
  DR_ITEMS.forEach(it => {
    if (it.type === 'skill' && !DR_SKILLS[it.skill]) console.warn(`[dinorun] アイテム ${it.id} のスキル ${it.skill} が DR_SKILLS にありません`);
    if (it.requires && !DR_SKILLS[it.requires]) console.warn(`[dinorun] アイテム ${it.id} の requires ${it.requires} が DR_SKILLS にありません`);
    if (it.type !== 'skill' && typeof it.apply !== 'function') console.warn(`[dinorun] アイテム ${it.id} に apply がありません`);
  });
  Object.entries(DR_SKILLS).forEach(([id, s]) => {
    if (!DR_SKILL_ACTIONS[s.action]) console.warn(`[dinorun] スキル ${id} の action ${s.action} が DR_SKILL_ACTIONS にありません`);
  });
}

/* ---------- 操作ボタン（PC・スマホ縦は1セット、スマホ横は左右に同じものを2セット） ---------- */
function drBuildPads() {
  const keys = ['A', 'S', 'D'];
  document.querySelectorAll('#dr-pads .dr-pad').forEach(pad => {
    let html = '<div class="dr-skill-row">';
    for (let i = 0; i < 3; i++) {
      html += `<button type="button" class="dr-btn dr-skill-btn is-empty" data-act="skill${i}" data-slot="${i}">
          <span class="dr-key">${keys[i]}</span>
          <span class="dr-skill-num">${'①②③'[i]}</span>
          <span class="dr-skill-name">スキル${'①②③'[i]}</span>
          <span class="dr-ct"><span class="dr-ct-fill"></span></span>
        </button>`;
    }
    html += '</div>';
    html += `<button type="button" class="dr-btn dr-jump-btn" data-act="jump">
        <span class="dr-key">Space</span><span class="dr-btn-label">ジャンプ</span>
        <span class="dr-jump-count" aria-label="ジャンプ回数"></span>
      </button>`;
    // スライディングボタン。急降下を覚えると下半分に「急降下」が増える（空中で押すと急降下）。
    // 上半分・下半分それぞれ、使えないあいだは灰色で、使えるようになるまで左から色が戻っていく（.dr-half-fill）
    html += `<button type="button" class="dr-btn dr-duck-btn" data-act="slide">
        <span class="dr-duck-half is-slide"><span class="dr-half-fill"></span>
          <span class="dr-key">↓</span><span class="dr-btn-label">スライディング</span></span>
        <span class="dr-duck-half is-dive"><span class="dr-half-fill"></span>
          <span class="dr-key">↓（空中）</span><span class="dr-btn-label">急降下<small>（空中で）</small></span></span>
      </button>`;
    pad.innerHTML = html;
  });
}

/* ---------- 入力 ---------- */
function drBindInput() {
  // ボタン（押した瞬間に反応させるため click ではなく pointerdown）
  const pads = document.getElementById('dr-pads');
  pads.addEventListener('pointerdown', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    e.preventDefault();
    try { btn.setPointerCapture(e.pointerId); } catch (err) { /* 古いブラウザ */ }
    drPress(btn.dataset.act, 'p' + e.pointerId);
  });
  pads.addEventListener('contextmenu', e => e.preventDefault());
  // 指・マウスを離したら、ジャンプの押しっぱなしをやめる（バタ足ジャンプ）
  const release = e => dr.jumpHeld.delete('p' + e.pointerId);
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  // ゲーム画面をタップ／クリック：プレイ中はジャンプ
  document.getElementById('dr-stage').addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    if (dr.mode === 'play') { e.preventDefault(); drPress('jump', 'p' + e.pointerId); }
  });

  // キーボード
  window.addEventListener('keydown', drOnKeyDown);
  window.addEventListener('keyup', e => dr.jumpHeld.delete('k' + e.code));
  window.addEventListener('blur', () => dr.jumpHeld.clear());

  // 画面上のボタン（data-dr="..."）
  document.getElementById('dr-root').addEventListener('click', e => {
    const b = e.target.closest('[data-dr]');
    if (!b) return;
    drUiAction(b.dataset.dr, b);
  });

  // ヘッダーを隠す／出す（スマホ用）
  document.getElementById('dr-header-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dr-header-hidden');
    drUpdateHeaderToggle();
  });

  // ほかのタブに切り替えたら一時停止
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && dr.active && (dr.mode === 'play' || dr.mode === 'ready')) drPause();
  });
  window.addEventListener('pagehide', () => { if (dr.active && dr.mode === 'play') drPause(); });
}

/* スマホ横持ちは高さが足りないので、ヘッダーを自動で隠す（縦持ちに戻したら出す）。
   「▲ ヘッダーを隠す」ボタンで、いつでも手で切り替えられる */
const drLandscapeMq = window.matchMedia('(orientation: landscape) and (max-height: 520px)');
function drAutoHeader() {
  document.body.classList.toggle('dr-header-hidden', drLandscapeMq.matches);
  drUpdateHeaderToggle();
}
if (drLandscapeMq.addEventListener) drLandscapeMq.addEventListener('change', () => { if (dr.active) drAutoHeader(); });

function drUpdateHeaderToggle() {
  const b = document.getElementById('dr-header-toggle');
  if (b) b.textContent = document.body.classList.contains('dr-header-hidden') ? '▼ ヘッダーを出す' : '▲ ヘッダーを隠す';
}

function drOnKeyDown(e) {
  if (!dr.active) return;
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  const c = e.code;
  const gameKeys = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  if (gameKeys.includes(c)) e.preventDefault();   // ページがスクロールしないように
  if (e.repeat && c !== 'ArrowUp' && c !== 'ArrowDown') return;

  switch (dr.mode) {
    case 'title':
      if (c === 'Space' || c === 'Enter' || c === 'ArrowUp') drStartGame();
      else if (c === 'KeyR') drShowRanking();
      break;
    case 'play':
      if (c === 'Space' || c === 'ArrowUp' || c === 'KeyW' || c === 'KeyK') {
        if (!dr.jumpHeld.has('k' + c)) drPress('jump', 'k' + c);   // 押しっぱなしのキーリピートでは跳ばない
      }
      else if (c === 'ArrowDown' || c === 'KeyJ') drPress('slide');
      else if (c === 'KeyA') drPress('skill0');
      else if (c === 'KeyS') drPress('skill1');
      else if (c === 'KeyD') drPress('skill2');
      else if (c === 'KeyP' || c === 'Escape') drPause();
      break;
    case 'pause':
      if (c === 'KeyP' || c === 'Escape' || c === 'Enter' || c === 'Space') drResume();
      break;
    case 'shop':
      if (dr.shop && dr.shop.picking) {
        if (c === 'Digit1' || c === 'KeyA') drPickSlot(0);
        else if (c === 'Digit2' || c === 'KeyS') drPickSlot(1);
        else if (c === 'Digit3' || c === 'KeyD') drPickSlot(2);
      } else if (c === 'Digit1') drBuy(0);
      else if (c === 'Digit2') drBuy(1);
      else if (c === 'Digit3') drBuy(2);
      else if (c === 'Digit4') drBuy(3);
      else if (c === 'KeyR') drReroll();
      else if (c === 'Enter' || c === 'Escape') drCloseShop();
      break;
    case 'entry':
      drEntryKey(e);
      break;
    case 'over':
      if (c === 'Space' || c === 'Enter') drUiAction('over-next');
      else if (c === 'KeyR') drUiAction('retry');
      break;
    case 'ranking':
      if (c === 'Space' || c === 'Enter' || c === 'Escape') drShowTitle();
      else if (c === 'ArrowLeft' || c === 'ArrowRight' || c === 'Tab') { e.preventDefault(); drSetRankTab(dr.rankTab === 'month' ? 'all' : 'month'); }
      break;
  }
}

/* 操作（ボタン・キー共通） */
function drPress(act, src) {
  if (dr.mode === 'title' && act === 'jump') { drStartGame(); return; }
  if (dr.mode !== 'play' || !dr.run) return;
  const run = dr.run;
  if (act === 'jump') { if (src) dr.jumpHeld.add(src); drJump(run); }
  else if (act === 'slide') drSlide(run);
  else if (act.startsWith('skill')) drUseSkill(run, +act.slice(5));
}

/* 画面のボタン（data-dr）の処理 */
function drUiAction(act, el) {
  drSound('select');
  switch (act) {
    case 'start': drStartGame(); break;
    case 'ranking': drShowRanking(); break;
    case 'howto': drSetMode('howto'); break;
    case 'title': drShowTitle(); break;
    case 'pause': if (dr.mode === 'play') drPause(); break;
    case 'resume': drResume(); break;
    case 'quit': drBgm(null); dr.run = null; drShowTitle(); break;
    case 'shop-close': drCloseShop(); break;
    case 'reroll': drReroll(); break;
    case 'retry': drStartGame(); break;
    case 'sound': drToggleSound(); break;
    case 'buy': drBuy(+el.dataset.index); break;
    case 'pick-slot': drPickSlot(+el.dataset.slot); break;
    case 'swap-slot': drSwapSelect(+el.dataset.slot); break;
    case 'over-next': drAfterResult(); break;
    case 'tab-month': drSetRankTab('month'); break;
    case 'tab-all': drSetRankTab('all'); break;
    case 'entry-up': drEntryChange(+el.dataset.i, 1); break;
    case 'entry-down': drEntryChange(+el.dataset.i, -1); break;
    case 'entry-ok': drEntrySubmit(); break;
    case 'entry-skip': drShowTitle(); break;
  }
}

/* ---------- 画面の切り替え ---------- */
function drSetMode(mode) {
  dr.mode = mode;
  const root = document.getElementById('dr-root');
  if (!root) return;
  root.dataset.mode = mode;
  // overlay の表示（data-show に書いたモードのときだけ出す）
  root.querySelectorAll('[data-show]').forEach(el => {
    el.hidden = !el.dataset.show.split(' ').includes(mode);
  });
  root.classList.toggle('dr-menu-open', !['play', 'ready', 'dying'].includes(mode));
  // タイトル以外のメニューを出している間（スマホではヘッダーの上に重ねる。dinorun.css の body.dr-modal）
  document.body.classList.toggle('dr-modal', dr.active && !['play', 'ready', 'dying', 'title'].includes(mode));
}

function drShowTitle() {
  drBgm(null);
  dr.run = null;
  dr.titleSwapT = 0;
  document.getElementById('dr-title').classList.remove('is-ranking');
  drSetMode('title');
  drRenderRankingLists();
  drUpdateHud(true);
}

function drShowRanking(highlight) {
  dr.highlight = highlight || null;
  drSetMode('ranking');
  drRenderRankingLists();
  drLoadRanking();
}

function drSetRankTab(tab) {
  dr.rankTab = tab;
  drRenderRankingLists();
}

/* ---------- プレイの開始 ---------- */
function drNewRun() {
  return {
    t: 0,                  // 遊んだ時間（秒。ショップ・一時停止中は進まない）
    dist: 0,               // 走った距離（px）
    speed: DR_CONFIG.speedStart,
    y: 0, vy: 0,           // 自機の高さ（地面から上へ px）と縦の速さ
    onGround: true, jumpsUsed: 0, ducking: false,
    slideT: 0,             // スライディングの残り時間（0 より大きい間はスライディング中。終わるまで次は出せない）
    slideTotal: 0,         // いまのスライディングの長さ（ボタンの表示用）
    diving: false,         // 急降下中
    comboT: 0,             // 急降下のあと、ダッシュにできる残り時間
    dashT: 0, dashX: 0, dashFrom: 0,   // ダッシュ切り（前に出ている距離 dashX。だんだん元の位置に戻る）
    dashCut: false,        // ダッシュ切りの途中（天井から下がっているものも切れる）
    rushT: 0, rushSpeed: 0,  // 本当に前へ進んでいる残り時間と、そのとき足す速さ（スピン・スライディングの急降下コンボ）
    shots: [],             // 飛んでいる火の玉
    magnet: 0,             // 磁石の範囲（ドット。0 なら磁石なし）
    rerolls: 0,            // ショップで品ぞろえを入れ替えられる回数（1回のショップあたり）
    slides: 0,             // スライディングでくぐったボーナスの回数
    vacuumFx: 0,
    maxJumps: 1,           // ジャンプできる回数
    flutterTime: 0,        // バタ足ジャンプで浮いていられる秒数（0 = 覚えていない）
    flutterLeft: 0,        // いまの空中で、あと何秒浮いていられるか（着地で flutterTime に戻る）
    fluttering: false,     // バタ足で浮いている途中
    bonusNext: false,      // ボーナスチケットを使った（次のワールドの前にボーナスステージ）
    bonus: false,          // ボーナスステージの途中
    tilt: 0,               // 画面の傾き（度。ボーナスステージの下り坂）
    scroll: DR_CONFIG.speedStart,   // いま画面が流れている速さ（ボーナスステージでは速い）
    marks: [],             // ボーナスステージの、ジャンプの目印
    nextHardAt: 0,         // 次の「スキルを使わないと通れない区画」を出す距離（m。0 = まだ決めていない）
    lives: DR_CONFIG.startLives,
    maxLives: DR_CONFIG.startLives,   // 最大ライフ（回復薬はここまで回復する）
    deathBy: null,         // 最後にぶつかった障害物（ゲームオーバーの原因の表示に使う）
    lastPit: null,         // いま落ちかけている穴
    tutStep: 0,            // チュートリアルの、次に出す番号（DR_TUTORIAL.steps）
    invincibleTime: DR_CONFIG.invincibleTime,
    invT: 0,               // 無敵の残り時間
    coinMult: 1,           // コイン倍率
    wallet: 0,             // 持っているコイン（倍率がかかるので小数もある。表示は切り捨て）
    coinsPicked: 0,        // 拾ったコインの個数（スコア用。倍率はかからない）
    kills: 0,              // 壊した障害物の数
    grazes: 0,             // かすりボーナスの回数
    skills: {},            // 覚えたスキル（id → 数値のコピー）
    cooldowns: {},         // スキルの残りクールタイム（id → 秒）
    slots: [null, null, null],   // スキルボタン①②③に入っているスキルの id
    bench: [],             // ボタンから外したスキル（ショップで入れ直せる）
    levels: {},            // アイテムを何回買ったか（id → 回数）
    spinT: 0, spinTotal: 0, slashT: 0, slashRange: 0,
    obstacles: [], coins: [], effects: [], shopIcon: null,
    nextObstacleIn: DR_CONFIG.speedStart * 1.4,
    nextCoinIn: DR_CONFIG.speedStart * 0.8,
    nextShopAt: DR_CONFIG.tutorial ? Infinity : DR_CONFIG.shopFirstMeter,   // チュートリアルがあるときは、最初のショップはチュートリアルが出す
    groupSeq: 0,           // つながって出た障害物をまとめる番号
    shopCount: 0,
    worldIndex: 0,
    nextWorldAt: DR_CONFIG.worldLength,
    worldFx: null,         // ワールド移動の演出中
    calmT: 0,              // 障害物を出さない残り時間
    deadT: 0,
    token: null,           // ランキングの受付番号
  };
}

function drStartGame() {
  drSound('start');
  dr.run = drNewRun();
  dr.jumpHeld.clear();
  DRRanking.startSession().then(tok => { if (dr.run) dr.run.token = tok; });
  drBgm(drWorld(dr.run).bgm);
  drShowBanner(drWorld(dr.run).name, 'WORLD 1');
  drUpdateHud(true);
  drStartReady('play');
}

/* カウントダウン（3・2・1・GO!）を sec 秒で出してから next のモードにする */
function drStartReady(next, sec) {
  dr.readyTotal = sec || DR_CONFIG.readyCountSec;
  dr.readyT = dr.readyTotal;
  dr.readyNext = next;
  drSetMode('ready');
}

function drPause() {
  if (dr.mode !== 'play' && dr.mode !== 'ready') return;
  drSetMode('pause');
}
function drResume() {
  if (dr.mode !== 'pause') return;
  drStartReady('play', DR_CONFIG.resumeCountSec);
}

/* ---------- ループ ---------- */
function drLoop(now) {
  if (!dr.active) { dr.raf = 0; return; }
  dr.raf = requestAnimationFrame(drLoop);
  let dt = (now - dr.lastT) / 1000;
  dr.lastT = now;
  if (dt > 0.05) dt = 0.05;    // 重くなったときにワープしないように
  if (dt < 0) dt = 0;
  dr.clock += dt;

  if (dr.mode === 'play') drUpdate(dr.run, dt);
  else if (dr.mode === 'ready') {
    dr.readyT -= dt;
    if (dr.readyT <= 0) drSetMode(dr.readyNext);
  } else if (dr.mode === 'dying') {
    drUpdateDying(dr.run, dt);
  } else if (dr.mode === 'title' || dr.mode === 'ranking' || dr.mode === 'howto') {
    drUpdateDemo(dt);
    if (dr.mode === 'title') {
      dr.titleSwapT += dt;
      if (dr.titleSwapT > DR_CONFIG.titleRankingSec) {
        dr.titleSwapT = 0;
        document.getElementById('dr-title').classList.toggle('is-ranking');
      }
    }
  }
  if (dr.shake > 0) dr.shake = Math.max(0, dr.shake - dt);

  drRender();
  drUpdateHud(false);
  drUpdatePads();
  drUpdateCount();
  drUpdateTip();
}

/* ---------- ゲームの計算 ---------- */
function drWorld(run) { return run.bonus ? DR_BONUS_WORLD : DR_WORLDS[run.worldIndex % DR_WORLDS.length]; }
function drMeters(run) { return run.dist / DR_CONFIG.pxPerMeter; }
function drScore(run) {
  const C = DR_CONFIG;
  return Math.floor(drMeters(run)) + run.coinsPicked * C.scoreCoin + run.kills * C.scoreKill
    + run.grazes * C.scoreGraze + run.slides * C.scoreSlide;
}
function drDifficulty(run) { return Math.min(1, (run.speed - DR_CONFIG.speedStart) / (DR_CONFIG.speedMax - DR_CONFIG.speedStart)); }
function drLerp(a, b, t) { return a + (b - a) * t; }
function drRand(a, b) { return a + Math.random() * (b - a); }
function drPickWeighted(list) {
  const total = list.reduce((s, x) => s + (x.weight || 1), 0);
  let r = Math.random() * total;
  for (const x of list) { r -= (x.weight || 1); if (r <= 0) return x; }
  return list[list.length - 1];
}

function drUpdate(run, dt) {
  const C = DR_CONFIG;
  run.t += dt;
  run.speed = Math.min(C.speedMax, C.speedStart + C.speedAccel * run.t);
  // ボーナスステージは下り坂なので速く流れる（最高速は超えない）。画面もだんだん傾ける
  run.scroll = run.bonus ? Math.min(C.speedMax, run.speed * C.bonusSpeedMult) : run.speed;
  run.tilt += ((run.bonus ? C.bonusTilt : 0) - run.tilt) * Math.min(1, dt * 4);
  let move = run.scroll * dt;
  // 急降下コンボで前へ進んでいる間は、画面が速く流れる（そのぶん距離も進む）
  if (run.rushT > 0) {
    move += run.rushSpeed * Math.min(dt, run.rushT);
    run.rushT = Math.max(0, run.rushT - dt);
    if (Math.random() < 0.7) run.effects.push({ type: 'ghost', pose: run.spinT > 0 ? 'spin' : (run.ducking ? 'duck' : 'run'), x: drPX(run) - 4, y: C.groundY - run.y - DR_PLAYER.frameH, vx: -260, t: 0, life: 0.2 });
  }
  run.dist += move;

  // --- 自機 ---
  const held = dr.jumpHeld.size > 0;
  // 落下穴の上に来たら落ちる（ジャンプ回数は使っていない扱いなので、すぐジャンプすれば出られる）
  if (run.onGround && drPitOpen(run)) { run.onGround = false; run.y = -0.01; run.vy = 0; }
  if (!run.onGround) {
    // バタ足：ボタンを離すか、時間が切れたら落ちる
    if (run.fluttering) {
      if (!held || run.flutterLeft <= 0) run.fluttering = false;
      else {
        run.flutterLeft = Math.max(0, run.flutterLeft - dt);
        run.vy = 0;
        if (Math.random() < 0.5) run.effects.push({ type: 'dot', x: drPX(run) + drRand(7, 17), y: C.groundY - run.y, vx: drRand(-60, -30), vy: drRand(10, 40), t: 0, life: 0.25, color: '#FFFFFF' });
      }
    }
    if (!run.fluttering && !run.diving) {   // 急降下中は一定の速さで落ちる
      const before = run.vy;
      run.vy -= C.gravity * dt;
      // ジャンプボタンを押しっぱなしなら、いちばん高いところでバタ足（バタ足ジャンプを覚えているとき）
      if (before > 0 && run.vy <= 0 && held && run.flutterLeft > 0 && run.y > 0) drStartFlutter(run);
    }
    const prevY = run.y;
    run.y += run.vy * dt;
    if (run.y <= 0) {
      const open = drPitOpen(run);
      if (prevY >= 0 && run.vy <= 0 && !open) drLand(run);                // ふつうの着地
      else if (open) { if (run.y < -C.pitDepth) drPitHit(run); }           // 穴の中を落ちている → 底まで落ちたらダメージ
      else if (run.y > -C.pitStepUp) { if (run.vy <= 0) drLand(run); else run.y = 0.01; }   // ほとんど落ちていない → 上がれる
      else drPitHit(run);                                                  // 穴の向こう側の壁にぶつかった
      if (dr.mode !== 'play') return;
    }
  }
  if (dr.slideBufT > 0) dr.slideBufT = Math.max(0, dr.slideBufT - dt);
  if (run.slideT > 0) run.slideT = Math.max(0, run.slideT - dt);
  // ボーナスステージでは、地面にいる間はずっとすべっている（下り坂）
  run.ducking = run.onGround && (run.slideT > 0 || run.bonus);
  if (run.bonus && run.onGround && Math.random() < 0.6) {
    run.effects.push({ type: 'dot', x: drPX(run) + drRand(3, 8), y: C.groundY - 2, vx: drRand(-110, -50), vy: drRand(-40, -10), g: 200, t: 0, life: 0.3, color: Math.random() < 0.5 ? '#FFFFFF' : '#FFD84A' });
  }

  // --- ダッシュ（急降下のあとの居合切り・スピン）：前に出て、だんだん元の位置に戻る ---
  if (run.dashT > 0) {
    run.dashT = Math.max(0, run.dashT - dt);
    const p = 1 - run.dashT / C.dashTime;
    run.dashX = run.dashFrom + (C.dashDistance - run.dashFrom) * (1 - (1 - p) * (1 - p));
    // 前に出ている途中でぶつかった障害物は、まとめて切る（切ったものからコインが出る）
    const pb = drPlayerBox(run);
    run.obstacles.forEach(o => { if (!o.dead && drCanCut(run, o) && drOverlap(pb, drObstacleBox(o))) { drKillObstacle(run, o); drDropCoins(run, o); } });
    if (Math.random() < 0.8) run.effects.push({ type: 'ghost', x: drPX(run) - 6, y: C.groundY - run.y - DR_PLAYER.frameH, t: 0, life: 0.18 });
    if (run.dashT <= 0) run.dashCut = false;
  } else if (run.dashX > 0) {
    run.dashX = Math.max(0, run.dashX - C.dashReturnSpeed * dt);
  }
  if (run.comboT > 0) run.comboT = Math.max(0, run.comboT - dt);
  if (run.vacuumFx > 0) run.vacuumFx = Math.max(0, run.vacuumFx - dt);

  // --- タイマー ---
  if (run.invT > 0) run.invT = Math.max(0, run.invT - dt);
  if (run.spinT > 0) run.spinT = Math.max(0, run.spinT - dt);
  if (run.slashT > 0) run.slashT = Math.max(0, run.slashT - dt);
  if (run.calmT > 0) run.calmT = Math.max(0, run.calmT - dt);
  for (const id in run.cooldowns) run.cooldowns[id] = Math.max(0, run.cooldowns[id] - dt);

  // --- ワールド移動 ---
  // ボーナスチケットを使っていたら、次のワールドの前にボーナスステージ（bonusLength m）が入る。
  // ボーナスステージはワールドの数に入らない（終わったら、本来の次のワールドへ）
  if (!run.worldFx && drMeters(run) >= run.nextWorldAt) {
    const toBonus = !run.bonus && run.bonusNext;
    run.worldFx = { t: 0, dur: 1.2, switched: false, toBonus };
    run.calmT = C.worldCalmTime;
    run.nextWorldAt += toBonus ? C.bonusLength : C.worldLength;
    drSound(toBonus ? 'bonus' : 'world');
  }
  if (run.worldFx) {
    run.worldFx.t += dt;
    if (!run.worldFx.switched && run.worldFx.t >= run.worldFx.dur / 2) {
      run.worldFx.switched = true;
      if (run.worldFx.toBonus) {
        run.bonusNext = false;
        run.bonus = true;
        // 残っている障害物は消す（ボーナスステージは障害物なし）
        run.obstacles = run.obstacles.filter(o => !o.def.pit);
        run.obstacles.forEach(o => { if (!o.dead) { o.dead = true; o.deadT = 0; o.noGraze = true; drSparkle(run, o.x + o.def.w / 2, o.y + o.def.h / 2, '#FFD84A', 6); } });
        run.nextCoinIn = Math.min(run.nextCoinIn, run.scroll * 0.4);
      } else {
        if (run.bonus) { run.bonus = false; run.marks = []; }
        run.worldIndex++;
      }
      const w = drWorld(run);
      drShowBanner(w.name, run.bonus ? 'BONUS STAGE' : 'WORLD ' + (run.worldIndex + 1));
      drBgm(w.bgm);
    }
    if (run.worldFx.t >= run.worldFx.dur) run.worldFx = null;
  }

  // --- 出現 ---
  run.nextObstacleIn -= move;
  // ショップの手前（shopClearBefore 秒ぶん）は障害物を出さない
  const shopSoon = !run.shopIcon && drMeters(run) >= run.nextShopAt - C.shopClearBefore * run.speed / C.pxPerMeter;
  // チュートリアル：決まった障害物・コインを順番に出す（そのあいだ、ふつうの障害物・コインは出さない）
  const tutorial = drInTutorial(run);
  if (tutorial) {
    const steps = DR_TUTORIAL.steps;
    while (run.tutStep < steps.length && drMeters(run) >= steps[run.tutStep].at) drTutorialSpawn(run, steps[run.tutStep++]);
  }
  if (run.nextObstacleIn <= 0) {
    let extra = 0;   // 長い障害物（スキルの区画）を出したら、その長さのぶん次をあける
    if (run.calmT <= 0 && !shopSoon && !run.bonus && !tutorial) extra = drSpawnObstacle(run) || 0;
    const d = drDifficulty(run);
    const gap = drRand(drLerp(C.gapStartMin, C.gapEndMin, d), drLerp(C.gapStartMax, C.gapEndMax, d));
    run.nextObstacleIn = gap * run.speed + extra;
  }
  run.nextCoinIn -= move;
  if (run.nextCoinIn <= 0) {
    if (run.bonus) run.nextCoinIn = drSpawnBonusCoins(run);
    else if (tutorial) run.nextCoinIn = run.speed;
    else {
      drSpawnCoins(run);
      run.nextCoinIn = drRand(C.coinGapMin, C.coinGapMax) * run.speed;
    }
  }
  if (!run.shopIcon && !run.bonus && drMeters(run) >= run.nextShopAt) drSpawnShop(run);

  // --- 動かす ---
  run.obstacles.forEach(o => {
    o.x -= move;
    if (o.dead) { o.deadT += dt; o.y -= 40 * dt; }
  });
  run.obstacles = run.obstacles.filter(o => o.x + o.w > -10 && (!o.dead || o.deadT < 0.4));
  run.marks.forEach(m => { m.x -= move; });
  run.marks = run.marks.filter(m => m.x > -20);
  run.coins.forEach(c => {
    c.x -= move;
    // 切った障害物から飛び出したコイン：はねて、地面の少し上で止まる
    if (c.pop) {
      c.vy += 420 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
      const floor = C.groundY - DR_PICKUPS.coin.h - 2;
      if (c.y >= floor) { c.y = floor; c.pop = false; }
    }
  });
  drPullCoins(run, dt);
  drUpdateShots(run, dt);
  run.coins = run.coins.filter(c => c.x > -12 && !c.taken);
  run.effects.forEach(fx => { fx.t += dt; fx.x += (fx.vx || 0) * dt - (fx.scroll ? move : 0); fx.y += (fx.vy || 0) * dt; if (fx.g) fx.vy += fx.g * dt; });
  run.effects = run.effects.filter(fx => fx.t < fx.life);

  if (run.shopIcon) {
    const s = run.shopIcon;
    s.x -= move;
    if (s.x + DR_PICKUPS.shop.w < 0) {
      // ショップに寄らずに通り過ぎた → スキップボーナス
      const bonus = C.skipBonusBase + C.skipBonusPerShop * run.shopCount;
      run.wallet += bonus;
      drFloatText(run, `SKIP +${bonus}`, drPX(run) + 10, C.groundY - 50, '#FFD84A');
      drSound('skip');
      drAfterShop(run);
    }
  }

  // --- 当たり判定 ---
  const pb = drPlayerBox(run);
  const standBox = drPlayerBoxAs(run, 'stand');
  for (const o of run.obstacles) {
    if (o.dead || o.hitDone || o.def.pit) continue;   // 落下穴は「自機」のところで判定している
    drTrackGraze(run, pb, o);
    // 立っていたらぶつかっていた障害物の下を、スライディングでくぐっている
    if (run.ducking && drOverlap(standBox, drObstacleBox(o))) o.slidUnder = true;
    if (!drOverlap(pb, drObstacleBox(o))) continue;
    o.noGraze = true;
    if (run.spinT > 0) {
      if (o.def.breakable !== false) drKillObstacle(run, o);
      else o.hitDone = true;
      continue;
    }
    if (run.invT > 0) continue;
    o.hitDone = true;
    drDamage(run, o.def);
    if (dr.mode !== 'play') return;
  }
  drJudgeSlides(run, pb);
  drJudgeGrazes(run, pb);
  for (const c of run.coins) {
    if (!c.taken && drOverlap(pb, { x: c.x, y: c.y, w: DR_PICKUPS.coin.w, h: DR_PICKUPS.coin.h })) {
      c.taken = true;
      run.wallet += run.coinMult;
      run.coinsPicked++;
      drSparkle(run, c.x + 4, c.y + 4, '#FFD84A', 4);
      drSound('coin');
    }
  }
  if (run.shopIcon) {
    const s = run.shopIcon;
    if (drOverlap(pb, { x: s.x + 2, y: s.y + 2, w: DR_PICKUPS.shop.w - 4, h: DR_PICKUPS.shop.h - 4 })) drOpenShop(run);
  }
}

/* ---------- かすりボーナス ----------
   障害物ごとに「自機といちばん近づいたすき間」を覚えておき、自機の後ろへ通り過ぎたときに判定する。
   もらえるのはコイン（DR_CONFIG.grazeCoin。スライディングボーナスは slideCoin）。
   すき間が DR_CONFIG.grazeDistance 以内で、ぶつかっていなければ「かすり」。
   スピンアタック中に近くを通った障害物は数えない（スピンで壊すのと二重にならないように）。 */
function drBoxGap(a, b) {
  const dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), 0);
  const dy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h), 0);
  return Math.max(dx, dy);
}
function drTrackGraze(run, pb, o) {
  const gap = drBoxGap(pb, drObstacleBox(o));
  if (gap < o.minGap) o.minGap = gap;
  if (run.spinT > 0 && gap <= DR_CONFIG.grazeDistance * 2) o.noGraze = true;
}
function drJudgeGrazes(run, pb) {
  const C = DR_CONFIG;
  const done = new Set();   // このフレームでかすりにしたグループ
  for (const o of run.obstacles) {
    if (o.judged) continue;
    const ob = drObstacleBox(o);
    if (ob.x + ob.w >= pb.x) continue;       // まだ自機の後ろまで来ていない
    o.judged = true;
    if (o.dead || o.hitDone || o.noGraze || o.slidUnder || o.minGap > C.grazeDistance) continue;
    if (o.group && (done.has(o.group) || run.obstacles.some(x => x !== o && x.group === o.group && x.grazed))) continue;
    o.grazed = true;
    if (o.group) done.add(o.group);
    run.grazes++;
    run.wallet += C.grazeCoin;
    drFloatText(run, 'GRAZE +' + C.grazeCoin, drPX(run) + 4, C.groundY - run.y - 34, '#FFD84A');
    drSparkle(run, ob.x + ob.w, ob.y + ob.h / 2, '#FFD84A', 5);
    drSound('graze');
  }
}

/* 自機の当たり判定の箱（画面の中の位置） */
function drPlayerBox(run) { return drPlayerBoxAs(run, run.ducking ? 'duck' : 'stand'); }
function drPlayerBoxAs(run, pose) {
  const h = DR_PLAYER.hit[pose];
  const top = DR_CONFIG.groundY - run.y - DR_PLAYER.frameH;
  return { x: drPX(run) + h[0], y: top + h[1], w: h[2], h: h[3] };
}

/* ---------- スライディング（＋急降下） ----------
   ボタンを押すと DR_CONFIG.slideTime 秒すべる（長押しはいらない）。
   DR_CONFIG.slideLock が true なら、すべり終わるまで次は出せない。false なら途中で押すと、そこからまた slideTime 秒すべる。
   すべっている間もジャンプ（＝スライディングをやめて跳ぶ）とスキルは使える。
   空中で押したとき:
     急降下を覚えていて、クールタイムが終わっていれば → 急降下（DR_SKILL_ACTIONS.dive）
     そうでなければ → 着地してすぐ出せるよう少しだけ覚えておく（DR_CONFIG.slideBuffer 秒）
   急降下のすぐあと（足元が光っている間）にすべると、勢いで本当に前へ進む（slideRushMeters m）。
   画面が一瞬速く流れ、そのぶんすべっている時間ものびる。 */
function drSlide(run) {
  const C = DR_CONFIG;
  if (!run.onGround) {
    const dive = run.skills.dive;
    if (dive && !(run.cooldowns.dive > 0)) {
      if (DR_SKILL_ACTIONS.dive(run, dive) !== false) run.cooldowns.dive = dive.cooldown;
      return;
    }
    if (run.slideT <= 0) dr.slideBufT = C.slideBuffer;
    return;
  }
  if (run.slideT > 0 && C.slideLock) return;
  let time = C.slideTime;
  if (run.comboT > 0) {
    run.comboT = 0;
    drStartRush(run, C.slideRushMeters, C.slideRushTime);
    time += C.slideRushTime;
  }
  run.slideT = Math.max(run.slideT, time);
  run.slideTotal = run.slideT;
  run.ducking = true;
  drPuff(run, 4);
  drSound('slide');
}

/* スライディングでくぐったボーナス：立っていたらぶつかっていた障害物を、すべってくぐり抜けたらもらえる
   （つながって出た障害物はまとめて1回。くぐった障害物は、かすりボーナスにはしない） */
function drJudgeSlides(run, pb) {
  const C = DR_CONFIG;
  for (const o of run.obstacles) {
    if (o.slideJudged || !o.slidUnder) continue;
    const ob = drObstacleBox(o);
    if (ob.x + ob.w >= pb.x) continue;
    o.slideJudged = true;
    if (o.dead || o.hitDone) continue;
    if (o.group && run.obstacles.some(x => x !== o && x.group === o.group && x.slideAwarded)) continue;
    o.slideAwarded = true;
    run.slides++;
    run.wallet += C.slideCoin;
    drFloatText(run, 'SLIDE +' + C.slideCoin, drPX(run) + 2, C.groundY - 40, '#FFD84A');
    drSound('slidebonus');
  }
}

/* ---------- 切った障害物からコインを出す（居合切り）----------
   DR_CONFIG.slashCoinDrop 個のコインが、障害物のあった場所からはねて出る（拾うとふつうのコインと同じ） */
function drDropCoins(run, o) {
  const C = DR_CONFIG, ob = drObstacleBox(o);
  const y = Math.min(ob.y + ob.h, C.groundY) - 12;
  for (let i = 0; i < C.slashCoinDrop; i++) {
    run.coins.push({ x: ob.x + ob.w / 2 - 4 + i * 5, y, taken: false, pop: true, vx: drRand(-10, 50), vy: -drRand(90, 150) });
  }
}

/* ---------- 火の玉 ---------- */
function drUpdateShots(run, dt) {
  for (const s of run.shots) {
    const step = s.speed * dt;
    s.x += step; s.dist += step; s.t += dt;
    const box = { x: s.x - s.r, y: s.y - s.r, w: s.r * 2, h: s.r * 2 };
    for (const o of run.obstacles) {
      if (o.dead || o.def.pit || s.hit.has(o) || !drOverlap(box, drObstacleBox(o))) continue;
      s.hit.add(o);
      if (s.blue) { drKillObstacle(run, o); continue; }                // 青：なんでも消す
      if (o.def.breakable === false) { s.done = true; break; }          // 赤：壊せないものに当たったら消える
      drKillObstacle(run, o);
      if (--s.pierce <= 0) { s.done = true; break; }
    }
    if (s.blue && Math.random() < 0.9) run.effects.push({ type: 'dot', x: s.x - s.r, y: s.y + drRand(-s.r, s.r), vx: -40, t: 0, life: 0.25, color: '#9FE8FF' });
    if (s.dist > s.range || s.x - s.r > DR_CONFIG.width) s.done = true;
    if (s.done) drSparkle(run, s.x, s.y, s.blue ? '#9FE8FF' : '#FF9A3C', 5);
  }
  run.shots = run.shots.filter(s => !s.done);
}

/* ---------- コインを引き寄せる（磁石・コイン吸引） ---------- */
function drPullCoins(run, dt) {
  const pb = drPlayerBox(run);
  const cx = pb.x + pb.w / 2, cy = pb.y + pb.h / 2;
  for (const c of run.coins) {
    if (c.taken) continue;
    const dx = cx - (c.x + 4), dy = cy - (c.y + 4);
    const d = Math.hypot(dx, dy);
    const mag = run.bonus ? Math.max(run.magnet, 16) : run.magnet;   // ボーナスステージでは少しだけ磁石が効く（ジャンプの空中コインを取りやすく）
    if (!c.vac && !(mag > 0 && d < mag)) continue;
    const sp = (c.vac ? 520 : 260) * dt + (c.vac ? 0 : run.scroll * dt * 0.5);
    if (d <= sp) { c.x = cx - 4; c.y = cy - 4; continue; }
    c.x += dx / d * sp;
    c.y += dy / d * sp;
  }
}
function drObstacleBox(o) {
  const d = o.def;
  const h = d.hit || [1, 1, d.w - 2, d.h - 2];
  return { x: o.x + h[0], y: o.y + h[1], w: h[2], h: h[3] };
}
function drOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/* 障害物を1つ出す（長いものを出したときは、その長さを返す） */
function drSpawnObstacle(run) {
  const C = DR_CONFIG;
  const meters = drMeters(run);
  // スキルを使わないと通れない区画（hardFromWorld ワールド目から、hardGapMin〜Max m ごと）
  if (run.worldIndex + 1 >= C.hardFromWorld) {
    if (!run.nextHardAt) run.nextHardAt = meters + drRand(60, 160);
    else if (meters >= run.nextHardAt) {
      const len = drSpawnGate(run);
      if (len) { run.nextHardAt = meters + drRand(C.hardGapMin, C.hardGapMax); return len; }
    }
  }
  const ids = drWorld(run).obstacles || [];
  const cands = DR_OBSTACLES.filter(o => ids.includes(o.id)
    && (o.minMeter || 0) <= meters
    && (!o.fly || meters >= C.flyingFromMeter));
  if (!cands.length) return;
  const def = drPickWeighted(cands);
  const x0 = DR_CONFIG.width + 6;
  const group = ++run.groupSeq;
  if (def.pit) { const o = drAddPit(run, def, x0, group); return o.w; }
  if (def.fly) {
    const lift = def.fly[Math.floor(Math.random() * def.fly.length)];
    run.obstacles.push(drMakeObstacle(def, x0, DR_CONFIG.groundY - lift - def.h, group));
    return;
  }
  // 地面のもの：小さいものは、ときどき2〜3個つながって出る
  let count = 1;
  if (def.h <= 24 && Math.random() < DR_CONFIG.clusterChanceMax * drDifficulty(run) + 0.08) count = Math.random() < 0.4 ? 3 : 2;
  for (let i = 0; i < count; i++) {
    run.obstacles.push(drMakeObstacle(def, x0 + i * (def.w + 2), DR_CONFIG.groundY - def.h, group));
  }
}
/* スキルを使わないと通れない区画：下りているシャッター（gate_roof）の下に、壊せるかべ（gate_wall）。
   居合切り・スピンアタック・火の玉のどれかがスキルボタンに入っていて、かべに着くまでに使えるようになるときだけ出す。
   出したら長さを返す（出さなかったら 0） */
function drSpawnGate(run) {
  const C = DR_CONFIG;
  const roof = DR_OBSTACLES.find(o => o.id === 'gate_roof'), wall = DR_OBSTACLES.find(o => o.id === 'gate_wall');
  if (!roof || !wall) return 0;
  const x0 = C.width + 6;
  const wallX = x0 + roof.w - wall.w - 18;
  const arrive = (wallX - (drPX(run) + 19)) / run.speed;     // かべに着くまでの秒数
  const ready = run.slots.some(id => id && ['slash', 'spin', 'fire'].includes(run.skills[id].action)
    && (run.cooldowns[id] || 0) <= arrive - 0.5);
  if (!ready) return 0;
  const group = ++run.groupSeq;
  run.obstacles.push(drMakeObstacle(roof, x0, C.groundY - roof.fly[0] - roof.h, group));
  run.obstacles.push(drMakeObstacle(wall, wallX, C.groundY - wall.h, group));
  return roof.w;
}

/* 落下穴を出す：幅はそのときの速さで決める（速いほど広い） */
function drAddPit(run, def, x, group) {
  const C = DR_CONFIG;
  const o = drMakeObstacle(def, x, C.groundY, group);
  o.w = Math.round(Math.max(C.pitWidthMin, Math.min(C.pitWidthMax, run.speed * drRand(C.pitTimeMin, C.pitTimeMax))));
  run.obstacles.push(o);
  return o;
}

function drMakeObstacle(def, x, y, group) {
  return {
    def, x, y, w: def.w, t0: Math.random() * 10, dead: false, deadT: 0, hitDone: false,
    group: group || 0,     // つながって出た障害物は同じ番号（かすりはまとめて1回）
    minGap: Infinity,      // 自機とのいちばん近づいたすき間（かすりの判定用）
    noGraze: false,        // かすりにしない（ぶつかった・スピン中にすれ違った・壊した）
    judged: false,         // かすりの判定をしたか
  };
}

function drSpawnCoins(run) {
  const C = DR_CONFIG;
  const n = Math.floor(drRand(C.coinRowMin, C.coinRowMax + 1));
  const style = Math.random();
  if (style < 0.35) {   // 山なり：ジャンプしたときに通る道すじに並べる（速いほど横に広がる）
    drArcCoins(run, C.width + 6 + drArcWidth(run) / 2, Math.max(4, n));
    return;
  }
  const baseLift = [6, 30, 54][Math.floor(Math.random() * 3)];
  for (let i = 0; i < n; i++) {
    run.coins.push({ x: C.width + 6 + i * 13, y: C.groundY - baseLift - DR_PICKUPS.coin.h, taken: false });
  }
}

/* 山なりのコインの横幅（ジャンプして着地するまでに進む距離の 7 割） */
function drArcWidth(run) { return run.speed * (2 * DR_CONFIG.jumpVelocity / DR_CONFIG.gravity) * 0.7; }

/* 山なりのコイン：cx を一番高いところにして、ジャンプの道すじに n 枚並べる。
   ちょうど cx の真上でジャンプのてっぺんになるように跳ぶと、全部取れる */
function drArcCoins(run, cx, n) {
  const C = DR_CONFIG, v = C.jumpVelocity, g = C.gravity, air = 2 * v / g;
  for (let i = 0; i < n; i++) {
    const tt = air * (0.15 + 0.7 * i / Math.max(1, n - 1));
    const lift = v * tt - g * tt * tt / 2 + 10;          // 自機の体のまん中の高さ
    run.coins.push({ x: cx + run.speed * (tt - air / 2) - 4, y: C.groundY - lift - DR_PICKUPS.coin.h / 2, taken: false });
  }
}

/* ボーナスステージのコイン：地面に1列（すべっているだけで取れる）＋ジャンプの目印＋空中のコインの山。
   空中のコインは、目印が自機の前の端に来たときにジャンプすると、ちょうど通る道すじに並べてある。
   次のコインを出すまでの長さ（px）を返す */
function drSpawnBonusCoins(run) {
  const C = DR_CONFIG, ch = DR_PICKUPS.coin.h, s = run.scroll;
  let x = C.width + 6;
  const n = Math.floor(drRand(C.bonusTrailMin, C.bonusTrailMax + 1));
  for (let i = 0; i < n; i++) run.coins.push({ x: x + i * 12, y: C.groundY - 4 - ch, taken: false });
  x += n * 12 + 30;
  const v = C.jumpVelocity, g = C.gravity, air = 2 * v / g;   // ジャンプしてから着地するまでの秒数
  run.marks.push({ x });
  const k = C.bonusArcCoins;
  for (let i = 0; i < k; i++) {
    const tt = air * (i + 0.6) / (k + 0.2);
    const lift = v * tt - g * tt * tt / 2 + 10;           // 自機の体のまん中の高さ
    run.coins.push({ x: x + s * tt - 10, y: C.groundY - lift - ch / 2, taken: false });
  }
  return (x - (C.width + 6)) + s * air + drRand(30, 70);
}

/* ---------- チュートリアル（DR_TUTORIAL。dinorun-worlds.js） ---------- */
function drInTutorial(run) {
  return !!(DR_CONFIG.tutorial && typeof DR_TUTORIAL !== 'undefined' && run && run.t !== undefined && drMeters(run) < DR_TUTORIAL.endMeter);
}
/* いま出している説明（なければ null） */
function drTutorialTip(run) {
  if (!drInTutorial(run) || !run.tutStep) return null;
  return DR_TUTORIAL.steps[run.tutStep - 1];
}
function drTutorialSpawn(run, st) {
  const C = DR_CONFIG;
  const x0 = C.width + 6;
  let cx = x0 + 20;           // コインを並べる目安（障害物のまん中）
  if (st.obstacle) {
    const def = DR_OBSTACLES.find(o => o.id === st.obstacle);
    if (def) {
      const group = ++run.groupSeq;
      if (def.pit) { const o = drAddPit(run, def, x0, group); cx = x0 + o.w / 2; }
      else {
        const lift = st.lift !== undefined ? st.lift : (def.fly ? def.fly[0] : 0);
        const y = C.groundY - lift - def.h;
        run.obstacles.push(drMakeObstacle(def, x0, y, group));
        cx = x0 + def.w / 2;
      }
    }
  }
  const ch = DR_PICKUPS.coin.h;
  if (st.coins === 'arc') drArcCoins(run, cx, 5);
  else if (st.coins === 'ground') for (let i = 0; i < 5; i++) run.coins.push({ x: cx - 40 + i * 18, y: C.groundY - 4 - ch, taken: false });
  else if (st.coins === 'under') for (let i = 0; i < 7; i++) run.coins.push({ x: cx - 49 + i * 14, y: C.groundY - 6 - ch, taken: false });
  else if (st.coins === 'row') for (let i = 0; i < 3; i++) run.coins.push({ x: x0 + i * 26, y: C.groundY - 6 - ch, taken: false });
  if (st.shop) {
    drSpawnShop(run);
    run.shopIcon.x = x0 + 110;
  }
}
/* 説明のまど（#dr-tip）の表示 */
function drUpdateTip() {
  const el = document.getElementById('dr-tip');
  if (!el) return;
  const st = dr.run && ['play', 'pause', 'ready'].includes(dr.mode) ? drTutorialTip(dr.run) : null;
  const key = st ? DR_TUTORIAL.steps.indexOf(st) : -1;
  if (dr.uiCache.tip === key) return;
  dr.uiCache.tip = key;
  el.hidden = !st;
  if (!st) return;
  const C = DR_CONFIG;
  el.querySelector('.dr-tip-head').textContent = st.title || 'ゲームの説明';
  // 空行（\n\n）で段落に分け、段落の中の \n は改行にする（段落のあいだは CSS で少しだけあける）
  const text = (st.text || '').replace(/\{(\w+)\}/g, (m, k) => (C[k] !== undefined ? C[k] : m));
  el.querySelector('.dr-tip-body').innerHTML = text.split(/\n\s*\n/).map(para => `<span>${drEscape(para).replace(/\n/g, '<br>')}</span>`).join('');
}

function drSpawnShop(run) {
  // 地面に置く（そのまま走って触ると入る。ジャンプで飛び越すとスキップ）
  const y = DR_CONFIG.groundY - DR_PICKUPS.shop.h;
  run.shopIcon = { x: DR_CONFIG.width + 8, y, baseY: y };
  // ショップのうしろ（shopClearAfter 秒ぶん）は障害物を出さない（戻ってすぐぶつからないように）
  run.nextObstacleIn = Math.max(run.nextObstacleIn, DR_CONFIG.shopClearAfter * run.speed + DR_PICKUPS.shop.w);
}

function drAfterShop(run) {
  run.shopIcon = null;
  run.shopCount++;
  run.nextShopAt = drMeters(run) + DR_CONFIG.shopInterval * Math.pow(DR_CONFIG.shopIntervalGrow, run.shopCount - 1);
}

/* ---------- 自機の動き ---------- */
/* ジャンプ（空中ではジャンプ回数が残っていれば空中ジャンプ。使い切っていたら、バタ足ジャンプを覚えていればバタ足） */
function drJump(run) {
  const v = DR_CONFIG.jumpVelocity;
  if (run.onGround) {
    run.slideT = 0; run.ducking = false; run.diving = false;
    run.onGround = false; run.vy = v; run.jumpsUsed = 1; run.y = Math.max(run.y, 0.01);
    drSound('jump');
  } else if (run.jumpsUsed < run.maxJumps) {
    run.slideT = 0; run.ducking = false; run.diving = false; run.fluttering = false;
    // 穴に落ちかけたとき（まだ1回も跳んでいない）は、地面と同じふつうのジャンプ
    run.vy = run.jumpsUsed === 0 ? v : v * 0.92;
    run.jumpsUsed++;
    drPuff(run, 5);
    drSound('jump');
  } else if (run.flutterLeft > 0 && !run.fluttering) {
    drStartFlutter(run);
  }
}

/* バタ足を始める（その高さのまま浮く。浮いていられるのは、いまの空中で残っている run.flutterLeft 秒） */
function drStartFlutter(run) {
  run.fluttering = true;
  run.diving = false;
  run.vy = 0;
  drSound('flutter');
}

/* 着地 */
function drLand(run) {
  const wasDiving = run.diving;
  run.y = 0; run.vy = 0; run.onGround = true; run.jumpsUsed = 0;
  run.fluttering = false; run.flutterLeft = run.flutterTime;
  drPuff(run, wasDiving ? 10 : 3);
  if (wasDiving) { run.diving = false; dr.shake = Math.max(dr.shake, 0.12); }
  // 空中でスライディングを押していたら、着地と同時に出す
  if (dr.slideBufT > 0) { dr.slideBufT = 0; drSlide(run); }
}

/* 足元に、落ちる穴があいているか（無敵の間は落ちない）。あいていればその穴を返す */
function drPitOpen(run) {
  if (run.invT > 0) return null;
  const fx = drPX(run) + 13;    // 足のまん中
  const pit = run.obstacles.find(o => o.def.pit && fx > o.x + 2 && fx < o.x + o.w - 2) || null;
  if (pit) run.lastPit = pit.def;
  return pit;
}

/* 穴に落ちた：ダメージ（無敵中はなし）を受けて、ぴょんと穴から出る */
function drPitHit(run) {
  drSound('fall');
  if (!(run.invT > 0)) {
    drDamage(run, run.lastPit);
    if (dr.mode !== 'play') return;
  }
  run.y = 0.01; run.vy = DR_CONFIG.pitBounce; run.onGround = false;
  run.jumpsUsed = Math.max(run.jumpsUsed, 1);
  run.diving = false; run.fluttering = false;
  drPuff(run, 6);
}

function drUseSkill(run, slot) {
  const id = run.slots[slot];
  if (!id) return;
  if ((run.cooldowns[id] || 0) > 0) return;
  const skill = run.skills[id];
  const fn = DR_SKILL_ACTIONS[skill.action];
  if (!fn) return;
  if (fn(run, skill) === false) return;   // 使えなかった（空振りにしない）
  run.cooldowns[id] = skill.cooldown;
}

function drKillObstacle(run, o) {
  o.dead = true; o.deadT = 0; o.noGraze = true;
  run.kills++;
  drSparkle(run, o.x + o.def.w / 2, o.y + o.def.h / 2, '#FFFFFF', 8);
  drFloatText(run, '+' + DR_CONFIG.scoreKill, o.x, o.y - 4, '#7FFFD4');
  drSound('kill');
}

/* ダメージ。def … ぶつかった障害物（ゲームオーバーのとき「○○にぶつかってしまった」に使う） */
function drDamage(run, def) {
  run.lives--;
  run.deathBy = def || null;
  dr.shake = 0.3;
  drSound('hit');
  drSparkle(run, drPX(run) + 12, DR_CONFIG.groundY - run.y - 12, '#FF5A7A', 10);
  if (run.lives <= 0) {
    run.lives = 0;
    drGameOver(run);
  } else {
    run.invT = run.invincibleTime;
  }
}

/* ---------- 演出（粒・文字） ---------- */
function drSparkle(run, x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = drRand(30, 90);
    run.effects.push({ type: 'dot', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 120, t: 0, life: drRand(0.3, 0.6), color, scroll: true });
  }
}
function drPuff(run, n) {
  for (let i = 0; i < n; i++) {
    run.effects.push({ type: 'dot', x: drPX(run) + drRand(6, 18), y: DR_CONFIG.groundY - run.y - 1, vx: drRand(-40, -10), vy: drRand(-20, -5), t: 0, life: 0.35, color: '#FFFFFF' });
  }
}
function drFloatText(run, text, x, y, color) {
  run.effects.push({ type: 'text', text, x, y, vy: -18, t: 0, life: 1.0, color });
}

/* ---------- ショップ ---------- */
function drItemPrice(run, it) {
  const lv = run.levels[it.id] || 0;
  return Math.round(it.price * Math.pow(it.priceUp || 1, lv));
}
/* ショップでの値段（最初のショップだけ DR_CONFIG.firstShopDiscount の割引がかかる） */
function drShopPrice(run, it) {
  const d = (dr.shop && dr.shop.discount) || 1;
  return Math.max(1, Math.round(drItemPrice(run, it) * d));
}
function drItemAvailable(run, it) {
  const lv = run.levels[it.id] || 0;
  if (!it.consumable && lv >= (it.maxLevel || 1)) return false;
  if (it.type === 'skill' && run.skills[it.skill]) return false;
  if (it.requires && !run.skills[it.requires]) return false;
  if (it.minWorld && run.worldIndex + 1 < it.minWorld) return false;
  if (typeof it.available === 'function' && !it.available(run)) return false;
  return true;
}

/* ショップに並べるアイテムを選ぶ（いま買えるものから、DR_CONFIG.shopOffers 個をランダムに） */
function drMakeOffers(run) {
  const pool = DR_ITEMS.filter(it => drItemAvailable(run, it));
  const offers = [];
  while (offers.length < DR_CONFIG.shopOffers && pool.length) {
    const it = drPickWeighted(pool);
    offers.push(it);
    pool.splice(pool.indexOf(it), 1);
  }
  return offers;
}

function drOpenShop(run) {
  drSound('shop');
  const discount = run.shopCount === 0 ? (DR_CONFIG.firstShopDiscount || 1) : 1;   // 最初のショップだけ割引
  dr.shop = { offers: drMakeOffers(run), sold: [], picking: null, swapSel: null, rerollsLeft: run.rerolls, discount };
  drAfterShop(run);
  drSetMode('shop');
  drRenderShop();
}

/* 品ぞろえを入れ替える（パッシブ「リロール」を持っているときだけ。1回のショップで run.rerolls 回まで） */
function drReroll() {
  const run = dr.run, shop = dr.shop;
  if (!run || !shop || shop.picking || !(shop.rerollsLeft > 0)) return;
  shop.rerollsLeft--;
  shop.offers = drMakeOffers(run);
  shop.sold = [];
  drSound('reroll');
  drRenderShop();
}

function drCloseShop() {
  if (dr.mode !== 'shop' || (dr.shop && dr.shop.picking)) return;
  dr.shop = null;
  drSetMode('play');   // ショップの前後は障害物がないので、カウントダウンなしですぐ再開
}

function drBuy(index) {
  const run = dr.run, shop = dr.shop;
  if (!run || !shop || shop.picking) return;
  const it = shop.offers[index];
  if (!it || shop.sold.includes(index)) return;
  const price = drShopPrice(run, it);
  if (Math.floor(run.wallet) < price) return;
  run.wallet -= price;
  run.levels[it.id] = (run.levels[it.id] || 0) + 1;
  shop.sold.push(index);
  drSound('buy');
  if (it.type === 'skill') {
    const base = DR_SKILLS[it.skill];
    run.skills[it.skill] = JSON.parse(JSON.stringify(base));
    run.cooldowns[it.skill] = 0;
    if (!base.button) {            // button: 'slide' のスキル（急降下）はスライディングボタンに付くので、選ばない
      const empty = run.slots.indexOf(null);
      shop.picking = it.skill;     // どのボタンに入れるか選んでもらう（空きがあっても選べる）
      shop.pickDefault = empty;
    }
  } else if (typeof it.apply === 'function') {
    const rerollsBefore = run.rerolls;
    it.apply(run, it.requires ? run.skills[it.requires] : undefined);
    shop.rerollsLeft += run.rerolls - rerollsBefore;   // リロールを買ったら、このショップからすぐ使える
  }
  drRenderShop();
  drUpdateHud(true);
}

/* 覚えたスキルを入れるボタンを選ぶ（入っていたスキルは「控え」に回る） */
function drPickSlot(slot) {
  const run = dr.run, shop = dr.shop;
  if (!run || !shop || !shop.picking) return;
  const old = run.slots[slot];
  if (old) run.bench.push(old);
  run.slots[slot] = shop.picking;
  shop.picking = null;
  drRenderShop();
}

/* ショップでのボタンの入れ替え：2つ選ぶと入れ替わる（0〜2 がボタン、3〜 が控え） */
function drSwapSelect(pos) {
  const run = dr.run, shop = dr.shop;
  if (!run || !shop) return;
  if (shop.swapSel === null || shop.swapSel === undefined) { shop.swapSel = pos; drRenderShop(); return; }
  const a = shop.swapSel, b = pos;
  shop.swapSel = null;
  if (a !== b) {
    const all = run.slots.concat(run.bench);
    const tmp = all[a]; all[a] = all[b]; all[b] = tmp;
    run.slots = all.slice(0, 3);
    run.bench = all.slice(3).filter(Boolean);
  }
  drRenderShop();
}

function drRenderShop() {
  const run = dr.run, shop = dr.shop;
  if (!run || !shop) return;
  const wallet = Math.floor(run.wallet);
  document.getElementById('dr-shop-wallet').textContent = wallet;
  const rr = document.getElementById('dr-shop-reroll');
  rr.hidden = !(shop.rerollsLeft > 0);
  rr.disabled = !!shop.picking;
  rr.querySelector('b').textContent = shop.rerollsLeft;
  // 「初回だけ割引！」の表示
  const sale = document.getElementById('dr-shop-sale');
  const off = shop.discount < 1;
  sale.hidden = !off;
  if (off) sale.textContent = '初回だけ割引！' + (shop.discount === 0.5 ? '（半額）' : `（${Math.round((1 - shop.discount) * 100)}%オフ）`);

  const cards = document.getElementById('dr-shop-cards');
  if (!shop.offers.length) {
    cards.innerHTML = '<p class="dr-shop-empty">もう買えるものがないよ！</p>';
  } else {
    cards.innerHTML = shop.offers.map((it, i) => {
      const lv = run.levels[it.id] || 0;
      const sold = shop.sold.includes(i);
      const price = sold ? 0 : drShopPrice(run, it);
      const normal = sold ? 0 : drItemPrice(run, it);   // 割引前の値段（割引中は消し線で出す）
      const max = it.maxLevel || 1;
      const lvText = it.type === 'skill' ? 'NEW スキル' : it.consumable ? '1回きり' : (sold ? `Lv.${lv} / ${max}` : `Lv.${lv} → ${lv + 1} / ${max}`);
      const icon = it.image ? `<img src="${it.image}" alt="">` : (it.icon || '★');
      const can = !sold && wallet >= price;
      return `<div class="dr-card${sold ? ' is-sold' : ''}">
          <div class="dr-card-icon">${icon}</div>
          <div class="dr-card-name">${it.name}</div>
          <div class="dr-card-lv">${lvText}</div>
          <div class="dr-card-desc">${it.desc || ''}</div>
          <button type="button" class="dr-card-buy" data-dr="buy" data-index="${i}" ${can ? '' : 'disabled'}>
            ${sold ? 'SOLD' : `<span class="dr-key">${i + 1}</span>🪙 ${normal !== price ? `<s>${normal}</s> ` : ''}${price}`}
          </button>
        </div>`;
    }).join('');
  }

  // スキルボタンの割り当て
  const slotsEl = document.getElementById('dr-shop-slots');
  const all = run.slots.concat(run.bench);
  const chip = (id, pos) => {
    const label = pos < 3 ? '①②③'[pos] : '控え';
    const name = id ? DR_SKILLS[id].name : '（なし）';
    const sel = shop.swapSel === pos ? ' is-selected' : '';
    return `<button type="button" class="dr-slot-chip${sel}${id ? '' : ' is-empty'}" data-dr="swap-slot" data-slot="${pos}">
        <span class="dr-slot-pos">${label}</span>${name}</button>`;
  };
  slotsEl.innerHTML = all.map((id, pos) => chip(id, pos)).join('');
  document.getElementById('dr-shop-slots-help').textContent =
    shop.swapSel !== null && shop.swapSel !== undefined ? '入れ替える先を選んでね' : '2つ選ぶと入れ替わるよ';

  // 覚えたスキルをどのボタンに入れるか
  const pick = document.getElementById('dr-shop-pick');
  pick.hidden = !shop.picking;
  document.getElementById('dr-shop').classList.toggle('is-picking', !!shop.picking);
  if (shop.picking) {
    document.getElementById('dr-shop-pick-name').textContent = DR_SKILLS[shop.picking].name;
    document.getElementById('dr-shop-pick-btns').innerHTML = run.slots.map((id, i) =>
      `<button type="button" class="dr-pick-btn${i === shop.pickDefault ? ' is-suggest' : ''}" data-dr="pick-slot" data-slot="${i}">
         <span class="dr-key">${'ASD'[i]}</span>${'①②③'[i]}<small>${id ? DR_SKILLS[id].name + 'と入れ替え' : '空き'}</small>
       </button>`).join('');
  }
  document.getElementById('dr-shop-close').disabled = !!shop.picking;
}

/* ---------- ゲームオーバー ----------
   ★拡張予定: 障害物ごとのやられアクション
     いまは、どの障害物でも同じ（はね上がって横に倒れる）。run.deathBy に、やられた障害物（DR_OBSTACLES の1件）が入っている。
     障害物ごとに変えたいときは:
       1. DR_OBSTACLES の障害物に deathAnim: 'burn' のような名前を足す
       2. 下の drGameOver() で run.deathBy.deathAnim を見て、はね上がる強さ（run.vy）などを変える
       3. 絵を変えるなら drDrawPlayer() の anim === 'hurt' のところで、run.deathBy.deathAnim ごとに描き分ける
          （自機の PNG に、やられ方ごとの行を足して DR_PLAYER.anims に登録してもよい）
     ゲームオーバーの文は drDeathText() で作っている（障害物の deathText で変えられる） */
function drGameOver(run) {
  run.deadT = 0;
  run.vy = 260; run.onGround = false;
  drBgm(null);
  drSound('gameover');
  drSetMode('dying');
}
function drUpdateDying(run, dt) {
  if (!run) return;
  run.deadT += dt;
  run.vy -= DR_CONFIG.gravity * 0.6 * dt;
  run.y = Math.max(-30, run.y + run.vy * dt);
  run.effects.forEach(fx => { fx.t += dt; fx.x += (fx.vx || 0) * dt; fx.y += (fx.vy || 0) * dt; if (fx.g) fx.vy += fx.g * dt; });
  run.effects = run.effects.filter(fx => fx.t < fx.life);
  if (run.deadT > 1.4) drShowResult(run);
}

function drShowResult(run) {
  const meters = Math.floor(drMeters(run));
  const score = drScore(run);
  run.final = { score, meters, coins: run.coinsPicked, kills: run.kills, grazes: run.grazes, slides: run.slides, durationMs: Math.round(run.t * 1000) };
  document.getElementById('dr-res-score').textContent = score.toLocaleString();
  document.getElementById('dr-res-cause').textContent = drDeathText(run);
  const C = DR_CONFIG;
  // かすり・スライディングは、スコアに入るとき（scoreGraze・scoreSlide が 0 より大きい）だけ計算の行を出す
  document.getElementById('dr-res-detail').innerHTML =
    `きょり ${meters}m<br>コイン ${run.coinsPicked}こ × ${C.scoreCoin}<br>こわした ${run.kills}こ × ${C.scoreKill}`
    + (C.scoreGraze ? `<br>かすり ${run.grazes}かい × ${C.scoreGraze}` : '')
    + (C.scoreSlide ? `<br>スライディング ${run.slides}かい × ${C.scoreSlide}` : '')
    + (!C.scoreGraze || !C.scoreSlide ? `<br><small>かすり ${run.grazes}かい・スライディング ${run.slides}かい</small>` : '');
  const qual = drQualifies(score);
  run.qualifies = qual;
  document.getElementById('dr-res-next').textContent = qual ? 'ランキングに名前を入れる' : 'タイトルにもどる';
  document.getElementById('dr-res-rankin').hidden = !qual;
  drSetMode('over');
}

/* ゲームオーバーの原因の文（「○○にぶつかってしまった…」） */
function drDeathText(run) {
  const d = run.deathBy;
  if (!d) return '';
  if (d.deathText) return d.deathText;
  return d.pit ? `${d.name}に落ちてしまった…` : `${d.name}にぶつかってしまった…`;
}

/* 今月の上位に入るか（今月に入らないなら全期間にも入らない） */
function drQualifies(score) {
  if (score <= 0) return false;
  if (!dr.ranking.ok && !dr.ranking.local) return true;   // ランキングが読めないときは、とりあえず名前を入れてもらう
  const list = dr.ranking.month || [];
  if (list.length < DR_CONFIG.rankingSize) return true;
  return score > list[list.length - 1].score;
}

function drAfterResult() {
  if (dr.mode !== 'over') return;
  const run = dr.run;
  if (run && run.qualifies) drStartEntry();
  else drShowTitle();
}

/* ---------- 名前入力（アーケード風。↑↓で文字を変える、←→で移動、Enter で決定） ---------- */
function drBuildEntry() {
  const box = document.getElementById('dr-entry-letters');
  let html = '';
  for (let i = 0; i < DR_CONFIG.nameLetters; i++) {
    html += `<div class="dr-letter" data-i="${i}">
        <button type="button" class="dr-letter-arrow" data-dr="entry-up" data-i="${i}" aria-label="次の文字">▲</button>
        <span class="dr-letter-char">A</span>
        <button type="button" class="dr-letter-arrow" data-dr="entry-down" data-i="${i}" aria-label="前の文字">▼</button>
      </div>`;
  }
  box.innerHTML = html;
  // 文字そのものをタップしたら、そこを選ぶ
  box.addEventListener('click', e => {
    const l = e.target.closest('.dr-letter');
    if (l && !e.target.closest('button') && dr.entry) { dr.entry.pos = +l.dataset.i; drRenderEntry(); }
  });
}

function drStartEntry() {
  let last = '';
  try { last = localStorage.getItem('dinorun-name') || ''; } catch (e) { /* なくてもよい */ }
  const chars = DR_CONFIG.nameChars;
  const idx = [];
  for (let i = 0; i < DR_CONFIG.nameLetters; i++) {
    const k = chars.indexOf(last[i] || 'A');
    idx.push(k >= 0 ? k : 0);
  }
  dr.entry = { idx, pos: 0, sending: false };
  document.getElementById('dr-entry-msg').textContent = '';
  document.getElementById('dr-entry-score').textContent = dr.run.final.score.toLocaleString();
  drSetMode('entry');
  drRenderEntry();
}

function drEntryName() {
  return dr.entry.idx.map(k => DR_CONFIG.nameChars[k]).join('');
}

function drRenderEntry() {
  const e = dr.entry;
  document.querySelectorAll('#dr-entry-letters .dr-letter').forEach((el, i) => {
    el.querySelector('.dr-letter-char').textContent = DR_CONFIG.nameChars[e.idx[i]];
    el.classList.toggle('is-current', i === e.pos);
  });
}

function drEntryChange(i, dir) {
  const e = dr.entry;
  if (!e || e.sending) return;
  const n = DR_CONFIG.nameChars.length;
  e.pos = i;
  e.idx[i] = (e.idx[i] + dir + n) % n;
  drRenderEntry();
}

function drEntryKey(ev) {
  const e = dr.entry;
  if (!e || e.sending) return;
  const c = ev.code;
  if (c === 'ArrowUp') drEntryChange(e.pos, 1);
  else if (c === 'ArrowDown') drEntryChange(e.pos, -1);
  else if (c === 'ArrowLeft' || c === 'Backspace') { e.pos = Math.max(0, e.pos - 1); drRenderEntry(); }
  else if (c === 'ArrowRight') { e.pos = Math.min(DR_CONFIG.nameLetters - 1, e.pos + 1); drRenderEntry(); }
  else if (c === 'Enter' || c === 'Space') {
    if (e.pos < DR_CONFIG.nameLetters - 1) { e.pos++; drRenderEntry(); }
    else drEntrySubmit();
  } else if (/^Key[A-Z]$/.test(c)) {
    // 文字キーを押したら、その文字を入れて次へ
    const k = DR_CONFIG.nameChars.indexOf(c.slice(3));
    if (k >= 0) { e.idx[e.pos] = k; e.pos = Math.min(DR_CONFIG.nameLetters - 1, e.pos + 1); drRenderEntry(); }
  }
}

async function drEntrySubmit() {
  const e = dr.entry, run = dr.run;
  if (!e || e.sending || !run) return;
  e.sending = true;
  const name = drEntryName();
  try { localStorage.setItem('dinorun-name', name); } catch (err) { /* なくてもよい */ }
  const msg = document.getElementById('dr-entry-msg');
  msg.textContent = 'おくっています...';
  const f = run.final;
  const res = await DRRanking.submit({
    token: run.token, name, score: f.score, distance: f.meters, coins: f.coins, kills: f.kills, grazes: f.grazes, slides: f.slides, durationMs: f.durationMs,
  });
  if (!res.ok) {
    e.sending = false;
    msg.textContent = 'おくれませんでした…（' + (res.error || 'error') + '）もう一度ためすか、スキップしてね';
    return;
  }
  await drLoadRanking();
  drShowRanking({ name, score: f.score });
}

/* ---------- ランキングの表示 ---------- */
async function drLoadRanking() {
  const data = await DRRanking.fetchTop();
  dr.ranking = Object.assign({ loaded: true }, data);
  drRenderRankingLists();
}

function drRenderRankingLists() {
  const rk = dr.ranking;
  const render = (list, hl) => {
    const rows = [];
    for (let i = 0; i < DR_CONFIG.rankingSize; i++) {
      const r = list[i];
      const isHl = r && hl && r.name === hl.name && r.score === hl.score;
      rows.push(`<li class="${isHl ? 'is-you' : ''}"><span class="dr-rk-no">${i + 1}</span>
        <span class="dr-rk-name">${r ? drEscape(r.name) : '---'}</span>
        <span class="dr-rk-score">${r ? Number(r.score).toLocaleString() : ''}</span></li>`);
    }
    return rows.join('');
  };
  const note = !rk.loaded ? 'よみこみ中...' : (rk.local ? '※ ランキングのサーバーが未設定なので、このブラウザだけの仮ランキングです'
    : (rk.ok ? '' : 'ランキングを読めませんでした'));
  // タイトル画面の小さいランキング（今月）
  const t = document.getElementById('dr-title-ranking');
  if (t) t.innerHTML = render(rk.month || []);
  // ランキング画面
  const list = document.getElementById('dr-ranking-list');
  if (list) list.innerHTML = render(dr.rankTab === 'month' ? (rk.month || []) : (rk.all || []), dr.highlight);
  document.querySelectorAll('[data-dr="tab-month"]').forEach(b => b.classList.toggle('is-on', dr.rankTab === 'month'));
  document.querySelectorAll('[data-dr="tab-all"]').forEach(b => b.classList.toggle('is-on', dr.rankTab === 'all'));
  document.querySelectorAll('.dr-ranking-note').forEach(el => { el.textContent = note; });
}

function drEscape(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- 画面の文字・ボタンの表示 ---------- */
function drUpdateHud(force) {
  const run = dr.run;
  const set = (id, val) => {
    if (!force && dr.uiCache[id] === val) return;
    dr.uiCache[id] = val;
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  if (!run) {
    set('dr-score', '0'); set('dr-coins', '0'); set('dr-dist', '0m');
    drSetHearts(0, 0, force);
    return;
  }
  set('dr-score', drScore(run).toLocaleString());
  set('dr-coins', String(Math.floor(run.wallet)));
  set('dr-dist', Math.floor(drMeters(run)) + 'm');
  drSetHearts(run.lives, run.maxLives, force);
}

/* ハート：いまのライフの数だけ赤、最大ライフまでの残りは空（うすい灰色） */
function drSetHearts(n, max, force) {
  const key = 'hearts' + n + '/' + max;
  if (!force && dr.uiCache.hearts === key) return;
  dr.uiCache.hearts = key;
  const el = document.getElementById('dr-hearts');
  if (!el) return;
  let html = '';
  if (max > 6) html = `<span class="dr-heart" aria-hidden="true"></span><span class="dr-heart-num">×${n}/${max}</span>`;   // 多いときは数字で
  else for (let i = 0; i < Math.max(n, max); i++) html += `<span class="dr-heart${i < n ? '' : ' is-empty'}" aria-hidden="true"></span>`;
  el.innerHTML = html;
  el.setAttribute('aria-label', `ライフ ${n} / ${max}`);
}

function drUpdatePads() {
  const run = dr.run;
  const playing = dr.mode === 'play';
  for (let i = 0; i < 3; i++) {
    const id = run ? run.slots[i] : null;
    const skill = id ? run.skills[id] : null;
    const cd = skill ? (run.cooldowns[id] || 0) : 0;
    const ratio = skill ? (skill.cooldown > 0 ? 1 - cd / skill.cooldown : 1) : 0;
    const ready = !!skill && cd <= 0;
    const key = `${id}|${Math.round(ratio * 40)}|${ready}|${playing}`;
    if (dr.uiCache['slot' + i] === key) continue;
    dr.uiCache['slot' + i] = key;
    document.querySelectorAll(`.dr-skill-btn[data-slot="${i}"]`).forEach(b => {
      b.classList.toggle('is-empty', !skill);
      b.classList.toggle('is-ready', ready);
      b.classList.toggle('is-cooling', !!skill && !ready);
      b.querySelector('.dr-skill-name').textContent = skill ? skill.name : 'スキル' + '①②③'[i];
      b.querySelector('.dr-skill-name').dataset.short = skill ? skill.label : '';
      b.querySelector('.dr-ct-fill').style.width = (skill ? ratio * 100 : 0) + '%';
    });
  }
  // ジャンプ回数（アイコンの数で表示。使った分は薄くなる）
  const max = run ? run.maxJumps : 1;
  const left = run ? (run.onGround ? max : Math.max(0, max - run.jumpsUsed)) : 1;
  const jkey = max + '/' + left;
  if (dr.uiCache.jumps !== jkey) {
    dr.uiCache.jumps = jkey;
    let html = '';
    for (let i = 0; i < max; i++) html += `<span class="dr-jump-dot${i < left ? '' : ' is-used'}"></span>`;
    document.querySelectorAll('.dr-jump-count').forEach(el => { el.innerHTML = html; el.title = 'ジャンプ回数: ' + max; });
  }
  // スライディングボタン：スライディング中は押しこんだ見た目（終わるまで次は出せない）。
  // 上半分＝スライディング、下半分＝急降下（覚えているときだけ）。使えるようになるまでの割合で色を戻す
  const sliding = !!(run && run.slideT > 0 && DR_CONFIG.slideLock);   // slideLock が false なら、すべっている間も押せる（いつも使える表示）
  const slideRatio = sliding ? 1 - run.slideT / (run.slideTotal || DR_CONFIG.slideTime) : 1;
  const dive = run && run.skills.dive;
  const diveCd = dive ? (run.cooldowns.dive || 0) : 0;
  const diveRatio = dive ? (dive.cooldown > 0 ? 1 - diveCd / dive.cooldown : 1) : 0;
  const air = !!(run && !run.onGround && dr.mode === 'play');
  const skey = `${sliding}|${Math.round(slideRatio * 40)}|${!!dive}|${Math.round(diveRatio * 40)}|${air}`;
  if (dr.uiCache.slide !== skey) {
    dr.uiCache.slide = skey;
    document.getElementById('dr-root').classList.toggle('dr-has-dive', !!dive);
    document.querySelectorAll('.dr-duck-btn').forEach(b => {
      b.classList.toggle('is-held', sliding);
      b.classList.toggle('has-dive', !!dive);
      b.classList.toggle('is-air', air && !!dive);   // 空中では急降下のほうを目立たせる
      const sh = b.querySelector('.is-slide'), dh = b.querySelector('.is-dive');
      sh.classList.toggle('is-ready', !sliding);
      sh.querySelector('.dr-half-fill').style.width = slideRatio * 100 + '%';
      dh.classList.toggle('is-ready', !!dive && diveCd <= 0);
      dh.querySelector('.dr-half-fill').style.width = diveRatio * 100 + '%';
    });
  }
  drUpdateEffectBars(run);
}

/* ---------- 効果時間のバー（ゲーム画面の左上、ハートの下）----------
   ★拡張予定: 効果時間を見せたいものが増えたら、drEffectBars() の配列に1行足す
     { id: '英数字', label: '画面に出す文字', left: 残り秒, total: 全体の秒, color: '#バーの色' }
     left が 0 以下のものは表示しない。 */
function drEffectBars(run) {
  return [
    { id: 'spin', label: 'SPIN', left: run.spinT, total: run.spinTotal || 1, color: '#7FFFD4' },
    { id: 'combo', label: 'COMBO', left: run.comboT, total: DR_CONFIG.diveComboTime, color: '#FFD84A' },   // 急降下のあと、技が強くなる残り時間
    { id: 'bonus', label: 'BONUS', left: run.bonus ? Math.max(0, run.nextWorldAt - drMeters(run)) : 0, total: DR_CONFIG.bonusLength, color: '#FF9E5E' },   // ボーナスステージの残り（m）
    { id: 'flutter', label: 'バタ足', left: run.fluttering ? run.flutterLeft : 0, total: run.flutterTime || 1, color: '#9FE8FF' },   // バタ足で浮いていられる残り時間
  ];
}
function drUpdateEffectBars(run) {
  const box = document.getElementById('dr-effects');
  if (!box) return;
  const bars = run && dr.mode !== 'title' ? drEffectBars(run).filter(b => b.left > 0) : [];
  const key = bars.map(b => b.id + Math.round(b.left / b.total * 50)).join('|');
  if (dr.uiCache.effects === key) return;
  dr.uiCache.effects = key;
  box.innerHTML = bars.map(b => `<div class="dr-effect"><span>${b.label}</span>
      <i><b style="width:${Math.max(0, Math.min(1, b.left / b.total)) * 100}%;background:${b.color}"></b></i></div>`).join('');
}

function drUpdateCount() {
  const el = document.getElementById('dr-count');
  if (!el) return;
  let text = '';
  if (dr.mode === 'ready') {
    // 最後の 1/4（最大0.4秒）が GO!、残りを 3・2・1 で3等分する
    const go = Math.min(0.4, dr.readyTotal * 0.25);
    const step = (dr.readyTotal - go) / 3;
    text = dr.readyT > go ? String(Math.min(3, Math.ceil((dr.readyT - go) / step))) : 'GO!';
  }
  if (dr.uiCache.count !== text) { dr.uiCache.count = text; el.textContent = text; el.hidden = !text; }
}

/* ワールド名の帯（ワールド移動のとき） */
function drShowBanner(name, sub) {
  const el = document.getElementById('dr-banner');
  if (!el) return;
  el.innerHTML = `<small>${sub}</small>${drEscape(name)}`;
  el.classList.remove('is-show');
  void el.offsetWidth;    // アニメーションをやり直すため
  el.classList.add('is-show');
}

/* =====================================================
   描画
   ===================================================== */
const drSpriteCache = new Map();   // 仮のドット絵 → 絵（canvas）にしたもの
const drImageCache = new Map();    // PNG の読み込み

function drPixelCanvas(rows, palette) {
  let c = drSpriteCache.get(rows);
  if (c) return c;
  const h = rows.length, w = rows.reduce((m, r) => Math.max(m, r.length), 0);
  c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let i = 0; i < rows[y].length; i++) {
      const col = (palette || DR_PALETTE)[rows[y][i]];
      if (!col) continue;
      x.fillStyle = col;
      x.fillRect(i, y, 1, 1);
    }
  }
  drSpriteCache.set(rows, c);
  return c;
}

function drImage(src) {
  if (!src) return null;
  let img = drImageCache.get(src);
  if (!img) {
    img = new Image();
    img.onerror = () => console.warn('[dinorun] 画像が読み込めません: ' + src);
    img.src = src;
    drImageCache.set(src, img);
  }
  return img.complete && img.naturalWidth ? img : null;
}

function drPreloadImages() {
  const srcs = [DR_PLAYER.image];
  DR_OBSTACLES.forEach(o => srcs.push(o.sprite && o.sprite.image));
  DR_WORLDS.forEach(w => { srcs.push(w.bgImage); srcs.push(w.groundImage); });
  Object.values(DR_PICKUPS).forEach(p => srcs.push(p.sprite && p.sprite.image));
  srcs.filter(Boolean).forEach(drImage);
}

/* 絵（sprite）を描く。t は秒（コマ送り用） */
function drDrawSprite(ctx, sprite, w, h, x, y, t) {
  if (!sprite) return;
  const fps = sprite.fps || 0;
  const img = drImage(sprite.image);
  if (img) {
    const frames = sprite.frames || 1;
    const f = fps ? Math.floor(t * fps) % frames : 0;
    const fw = img.naturalWidth / frames;
    ctx.drawImage(img, f * fw, 0, fw, img.naturalHeight, Math.round(x), Math.round(y), w, h);
    return;
  }
  const px = sprite.pixels;
  if (!px || !px.length) { ctx.fillStyle = '#FF00FF'; ctx.fillRect(Math.round(x), Math.round(y), w, h); return; }
  const frames = Array.isArray(px[0]) ? px : [px];
  const f = fps ? Math.floor(t * fps) % frames.length : 0;
  ctx.drawImage(drPixelCanvas(frames[f], sprite.palette), Math.round(x), Math.round(y));
}

function drRender() {
  const ctx = dr.ctx, C = DR_CONFIG;
  if (!ctx) return;
  const run = dr.run || dr.demo;
  if (!run) return;
  ctx.save();
  if (dr.shake > 0) ctx.translate(Math.round(drRand(-2, 2)), Math.round(drRand(-2, 2)));
  const world = drWorld(run);
  drDrawSky(ctx, world);
  // ボーナスステージ（下り坂）では、空以外を自機の足元を中心に傾けて描く
  const tilt = (run.tilt || 0) * Math.PI / 180;
  const tilted = Math.abs(tilt) > 0.001;
  if (tilted) {
    ctx.save();
    ctx.translate(C.playerX + 12, C.groundY);
    ctx.rotate(tilt);
    ctx.translate(-(C.playerX + 12), -C.groundY);
  }
  drDrawFar(ctx, world, run.dist, tilted ? 90 : 0);
  // ワールド移動の光（背景だけを白くする。自機・地面・障害物はこのあとに描くので隠れない）
  if (run.worldFx) drDrawWorldFlash(ctx, run.worldFx);
  drDrawGround(ctx, world, run.dist, tilted ? 90 : 0);
  // 落下穴（地面の上に穴を描く）
  run.obstacles.forEach(o => { if (o.def.pit) drDrawPit(ctx, o); });
  // ボーナスステージのジャンプの目印
  if (run.marks) run.marks.forEach(m => drDrawMark(ctx, m));

  // コイン
  run.coins.forEach(c => drDrawSprite(ctx, DR_PICKUPS.coin.sprite, 8, 8, c.x, c.y, dr.clock + c.x * 0.01));
  // ショップアイコン（ふわふわ上下＋「SHOP」の文字）
  if (run.shopIcon) {
    const s = run.shopIcon;
    drDrawSprite(ctx, DR_PICKUPS.shop.sprite, DR_PICKUPS.shop.w, DR_PICKUPS.shop.h, s.x, s.y, dr.clock);
    drPixelText(ctx, 'SHOP', s.x + 3, s.y - 8 - (Math.floor(dr.clock * 3) % 2), '#FFFFFF', '#1B1B2F');
  }
  // 障害物
  run.obstacles.forEach(o => {
    if (o.def.pit) return;
    if (o.dead) ctx.globalAlpha = Math.max(0, 1 - o.deadT / 0.4);
    drDrawSprite(ctx, o.def.sprite, o.def.w, o.def.h, o.x, o.y, dr.clock + o.t0);
    const lb = o.def.label;   // 絵の上の文字（スキルの区画の「SKILL!」など）。点滅させる
    if (lb && Math.floor(dr.clock * 4) % 2) {
      const lx = lb.x === undefined ? (o.def.w - (lb.text.length * 4 - 1)) / 2 : lb.x;
      drPixelText(ctx, lb.text, o.x + lx, o.y + lb.y, lb.color || '#FFFFFF', '#1B1B2F');
    }
    ctx.globalAlpha = 1;
  });
  // 前へ進んでいる間（急降下コンボ）は、横に流れる線を出す
  if (dr.run && run.rushT > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 9; i++) {
      const ly = 20 + Math.floor(drHash(i + Math.floor(dr.clock * 30)) * (C.groundY - 30));
      const lx = Math.floor(drHash(i * 3 + Math.floor(dr.clock * 30)) * C.width);
      ctx.fillRect(lx, ly, 26 + (i % 3) * 10, 1);
    }
  }
  // 火の玉
  if (dr.run) run.shots.forEach(sh => drDrawShot(ctx, sh));
  // 自機（急降下中は上に流れる線を出す）
  if (dr.run && run.diving) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 3; i++) ctx.fillRect(drPX(run) + 6 + i * 6, C.groundY - run.y - 40 - i * 4, 1, 16);
  }
  if (dr.run) drDrawPlayer(ctx, run);
  else drDrawPlayer(ctx, run, true);
  // 居合切りの軌跡
  if (run.slashT > 0) drDrawSlash(ctx, run);
  // 演出（粒・文字）
  run.effects.forEach(fx => {
    const a = Math.max(0, 1 - fx.t / fx.life);
    if (fx.type === 'dot') { ctx.globalAlpha = a; ctx.fillStyle = fx.color; ctx.fillRect(Math.round(fx.x), Math.round(fx.y), 2, 2); }
    else if (fx.type === 'text') { ctx.globalAlpha = a; drPixelText(ctx, fx.text, fx.x, fx.y, fx.color, '#1B1B2F'); }
    else if (fx.type === 'ghost') {   // ダッシュ・前へ進むときの残像
      ctx.globalAlpha = a * 0.45;
      const pose = fx.pose || 'run';
      const img = drImage(DR_PLAYER.image);
      if (img) ctx.drawImage(img, 0, DR_PLAYER.anims[pose].row * DR_PLAYER.frameH, DR_PLAYER.frameW, DR_PLAYER.frameH, Math.round(fx.x), Math.round(fx.y), DR_PLAYER.frameW, DR_PLAYER.frameH);
      else ctx.drawImage(drPixelCanvas((DR_PLAYER.placeholder[pose] || DR_PLAYER.placeholder.run)[0]), Math.round(fx.x), Math.round(fx.y));
    }
    ctx.globalAlpha = 1;
  });
  // コイン吸引の輪・磁石の範囲
  if (dr.run && run.vacuumFx > 0) {
    const pb = drPlayerBox(run);
    ctx.strokeStyle = '#FFD84A'; ctx.globalAlpha = run.vacuumFx / 0.35;
    ctx.beginPath(); ctx.arc(pb.x + pb.w / 2, pb.y + pb.h / 2, (1 - run.vacuumFx / 0.35) * C.width * 0.6 + 8, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // 急降下のあと、ダッシュにできる間は足元が光る
  if (dr.run && run.comboT > 0 && run.onGround) {
    ctx.fillStyle = Math.floor(dr.clock * 20) % 2 ? '#FFD84A' : '#FFFFFF';
    ctx.fillRect(drPX(run) + 2, C.groundY - 1, 20, 2);
  }
  if (dr.debug) drDrawDebug(ctx, run);
  if (tilted) ctx.restore();
  ctx.restore();
}

/* 落下穴：地面にまっすぐな穴。上のほうを少し明るくして、下ほど暗くする */
function drDrawPit(ctx, o) {
  const C = DR_CONFIG;
  const x = Math.round(o.x), w = Math.round(o.w), top = C.groundY;
  const g = ctx.createLinearGradient(0, top, 0, C.height);
  g.addColorStop(0, '#3A3F66'); g.addColorStop(0.35, '#1B1B2F'); g.addColorStop(1, '#0B0B18');
  ctx.fillStyle = g;
  ctx.fillRect(x, top, w, C.height - top + 90);
}

/* ボーナスステージのジャンプの目印（地面の光る矢印。ここが自機の前に来たときにジャンプ） */
function drDrawMark(ctx, m) {
  const C = DR_CONFIG;
  const x = Math.round(m.x), on = Math.floor(dr.clock * 8) % 2;
  ctx.fillStyle = on ? '#FFFFFF' : '#FFD84A';
  // 地面の上の「▲」
  for (let i = 0; i < 4; i++) ctx.fillRect(x - i, C.groundY - 1 - (3 - i) * 2, 1 + i * 2, 2);
  // 上向きの矢印
  const y0 = C.groundY - 22 - (on ? 1 : 0);
  ctx.fillRect(x, y0 + 3, 1, 9);
  ctx.fillRect(x - 1, y0 + 1, 3, 2);
  ctx.fillRect(x - 2, y0 + 3, 5, 1);
  ctx.fillRect(x, y0, 1, 1);
}

function drDrawWorldFlash(ctx, fx) {
  const C = DR_CONFIG;
  const p = fx.t / fx.dur;
  const a = p < 0.5 ? p * 2 : (1 - p) * 2;
  const r = (p < 0.5 ? p * 2 : 1) * C.width * 0.75;
  ctx.globalAlpha = Math.min(1, a * 1.1);
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(C.width / 2, C.height / 2, r, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

function drDrawPlayer(ctx, run, isDemo) {
  const C = DR_CONFIG, P = DR_PLAYER;
  const x = drPX(run);
  let y = C.groundY - run.y - P.frameH;
  if (run.fluttering) y += Math.sin(run.t * 40) > 0 ? 1 : 0;   // バタ足中は少しゆれる
  // 無敵中は点滅（切れる直前は速く点滅して知らせる）
  if (run.invT > 0 && dr.mode === 'play') {
    const period = run.invT > C.invincibleWarnTime ? 0.24 : 0.08;
    if (Math.floor(run.invT / period) % 2 === 0) ctx.globalAlpha = 0.25;
  }
  let anim = 'run';
  if (dr.mode === 'dying' || (run.deadT > 0 && !isDemo)) anim = 'hurt';
  else if (run.spinT > 0) anim = 'spin';
  else if (run.slashT > 0) anim = 'slash';
  else if (run.fluttering) anim = 'flutter';
  else if (!run.onGround) anim = 'jump';
  else if (run.ducking) anim = 'duck';
  const a = P.anims[anim] || P.anims.run;
  const t = isDemo ? dr.clock : run.t;
  let f = 0;
  if (anim === 'jump') f = run.vy > 0 ? 0 : 1;
  else if (anim === 'slash') f = Math.min(a.frames - 1, Math.floor((0.28 - run.slashT) * a.fps));
  else if (a.fps) f = Math.floor((anim === 'hurt' ? run.deadT : t) * a.fps) % a.frames;

  const img = drImage(P.image);
  if (img) {
    ctx.drawImage(img, f * P.frameW, a.row * P.frameH, P.frameW, P.frameH, x, Math.round(y), P.frameW, P.frameH);
  } else {
    // 仮のドット絵：スピンは回転、やられは横倒し、で代用
    const frames = P.placeholder[anim] || P.placeholder.run;
    const pc = drPixelCanvas(frames[f % frames.length]);
    if (anim === 'spin' || anim === 'hurt') {
      const ang = anim === 'spin' ? run.t * 22 : Math.min(1, run.deadT * 3) * Math.PI / 2 * -1;
      ctx.save();
      ctx.translate(x + P.frameW / 2, Math.round(y) + P.frameH / 2);
      ctx.rotate(ang);
      ctx.drawImage(pc, -P.frameW / 2, -P.frameH / 2);
      ctx.restore();
      if (anim === 'spin') {
        ctx.strokeStyle = 'rgba(127,255,212,0.8)';
        ctx.beginPath(); ctx.arc(x + 12, Math.round(y) + 12, 14, 0, Math.PI * 2); ctx.stroke();
      }
    } else {
      ctx.drawImage(pc, x, Math.round(y));
    }
  }
  ctx.globalAlpha = 1;
}

/* 火の玉（赤：オレンジの芯／青：水色の芯。うしろに短い尾） */
function drDrawShot(ctx, sh) {
  const outer = sh.blue ? '#2F6BFF' : '#E8352E';
  const mid = sh.blue ? '#7FDBFF' : '#FF9A3C';
  const core = sh.blue ? '#FFFFFF' : '#FFE27A';
  const fl = Math.floor(dr.clock * 20) % 2;
  const x = Math.round(sh.x), y = Math.round(sh.y), r = sh.r;
  ctx.fillStyle = outer;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(x - r * 3, y - Math.ceil(r / 2), r * 2, r);       // 尾
  ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.arc(x, y, r + fl * 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = mid;
  ctx.beginPath(); ctx.arc(x + 1, y, Math.max(1, r * 0.65), 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = core;
  ctx.fillRect(x, y - 1, Math.max(1, Math.round(r * 0.6)), 2);
}

function drDrawSlash(ctx, run) {
  const C = DR_CONFIG;
  const p = 1 - run.slashT / 0.28;
  const pb = drPlayerBox(run);
  const x0 = pb.x + pb.w - 2, range = run.slashRange;
  ctx.save();
  ctx.globalAlpha = 1 - p * 0.8;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x0, C.groundY - 18, range * (0.6 + p * 0.4), -Math.PI * 0.45, Math.PI * 0.2);
  ctx.stroke();
  ctx.strokeStyle = '#7FFFD4';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x0, C.groundY - 18, range * (0.5 + p * 0.4), -Math.PI * 0.4, Math.PI * 0.15);
  ctx.stroke();
  ctx.restore();
}

function drDrawDebug(ctx, run) {
  ctx.strokeStyle = 'red'; ctx.lineWidth = 1;
  const b = drPlayerBox(run);
  ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
  run.obstacles.forEach(o => {
    if (o.def.pit) { ctx.strokeRect(o.x + 0.5, DR_CONFIG.groundY + 0.5, o.w - 1, 8); return; }
    const ob = drObstacleBox(o); ctx.strokeRect(ob.x + 0.5, ob.y + 0.5, ob.w - 1, ob.h - 1);
  });
}

/* --- 背景（遠くの景色） --- */
function drHash(n) { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }

/* 空（画面の全体を塗る。傾けて描くときに、すき間が出ないように） */
function drDrawSky(ctx, w) {
  const C = DR_CONFIG;
  const g = ctx.createLinearGradient(0, 0, 0, C.groundY);
  g.addColorStop(0, w.sky[0]); g.addColorStop(1, w.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, C.width, C.height);
}

/* 遠くの景色。extra … 傾けて描くとき、左右にはみ出して描く幅（ドット） */
function drDrawFar(ctx, w, dist, extra) {
  const C = DR_CONFIG;
  extra = extra || 0;
  const img = drImage(w.bgImage);
  if (img) {
    const off = (dist * 0.2) % img.naturalWidth;
    for (let x = -off - (extra ? img.naturalWidth : 0); x < C.width + extra; x += img.naturalWidth) ctx.drawImage(img, Math.round(x), 0);
    return;
  }
  const f = w.far || { style: 'none' };
  const off = dist * 0.2;
  if (f.style === 'hills') {
    ctx.fillStyle = f.color2;
    for (let x = -extra; x < C.width + extra; x += 2) {
      const h = 26 + Math.sin((x + off * 0.5) / 47) * 10 + Math.sin((x + off * 0.5) / 19) * 4;
      ctx.fillRect(x, C.groundY - h - 14, 2, h + 14);
    }
    ctx.fillStyle = f.color;
    for (let x = -extra; x < C.width + extra; x += 2) {
      const h = 16 + Math.sin((x + off) / 31) * 8 + Math.sin((x + off) / 13) * 3;
      ctx.fillRect(x, C.groundY - h, 2, h);
    }
  } else if (f.style === 'city') {
    // 星
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 30; i++) ctx.fillRect(Math.floor(drHash(i) * C.width), Math.floor(drHash(i + 50) * 90), 1, 1);
    const bw = 22, start = Math.floor(off / bw);
    for (let i = start - 1; i < start + C.width / bw + 2; i++) {
      const bh = 30 + Math.floor(drHash(i) * 60);
      const x = Math.round(i * bw - off);
      ctx.fillStyle = f.color;
      ctx.fillRect(x, C.groundY - bh, bw - 3, bh);
      ctx.fillStyle = f.color2;
      for (let wy = C.groundY - bh + 4; wy < C.groundY - 6; wy += 6) {
        for (let wx = 3; wx < bw - 6; wx += 5) {
          if (drHash(i * 31 + wy * 7 + wx) > 0.55) ctx.fillRect(x + wx, wy, 2, 2);
        }
      }
    }
  } else if (f.style === 'stars') {
    for (let i = 0; i < 70; i++) {
      const sx = (drHash(i) * C.width * 2 - off * 0.3 * (0.5 + drHash(i + 9))) % C.width;
      const tw = Math.sin(dr.clock * 3 + i) > 0.6 ? 2 : 1;
      ctx.fillStyle = i % 7 === 0 ? f.color2 : f.color;
      ctx.fillRect(Math.round((sx + C.width) % C.width), Math.floor(drHash(i + 99) * 150), tw, tw);
    }
    ctx.fillStyle = f.color2;
    ctx.beginPath(); ctx.arc(310, 40, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = w.sky[0];
    ctx.beginPath(); ctx.arc(316, 36, 12, 0, Math.PI * 2); ctx.fill();
  } else if (f.style === 'pillars') {
    const pw = 64, start = Math.floor(off / pw);
    for (let i = start - 1; i < start + C.width / pw + 2; i++) {
      const x = Math.round(i * pw - off);
      ctx.fillStyle = f.color;
      ctx.fillRect(x, 20, 14, C.groundY - 20);
      ctx.fillStyle = f.color2;
      ctx.fillRect(x + 2, 20, 3, C.groundY - 20);
      ctx.fillStyle = f.color;
      ctx.fillRect(x - 3, 16, 20, 6);
    }
  }
}

/* --- 地面 --- */
/* extra … 傾けて描くとき、左右と下にはみ出して描く幅（ドット） */
function drDrawGround(ctx, w, dist, extra) {
  const C = DR_CONFIG;
  extra = extra || 0;
  const top = C.groundY, h = C.height - C.groundY + extra;
  const x0 = -extra, x1 = C.width + extra;
  const img = drImage(w.groundImage);
  if (img) {
    const off = dist % img.naturalWidth;
    if (extra) { ctx.fillStyle = (w.ground && w.ground.color) || '#888'; ctx.fillRect(x0, top, x1 - x0, h); }
    for (let x = -off - (extra ? img.naturalWidth : 0); x < x1; x += img.naturalWidth) ctx.drawImage(img, Math.round(x), top);
    return;
  }
  const gr = w.ground || { style: 'plain', color: '#888' };
  ctx.fillStyle = gr.color;
  ctx.fillRect(x0, top, x1 - x0, h);
  ctx.fillStyle = gr.line;
  ctx.fillRect(x0, top, x1 - x0, 2);
  const off = dist % 16;
  const bottom = top + h;
  if (gr.style === 'grid') {
    for (let y = top + 8; y < bottom; y += 8) ctx.fillRect(x0, y, x1 - x0, 1);
    for (let x = -off - (extra ? Math.ceil(extra / 16) * 16 : 0); x < x1; x += 16) ctx.fillRect(Math.round(x), top, 1, h);
  } else if (gr.style === 'tile') {
    for (let row = 0; row * 8 < h; row++) {
      for (let x = -(dist % 32) - 16 - (extra ? Math.ceil(extra / 32) * 32 : 0); x < x1; x += 16) {
        if (((Math.floor((x + dist) / 16) + row) & 1) === 0) ctx.fillRect(Math.round(x), top + 2 + row * 8, 16, 8);
      }
    }
  } else if (gr.style === 'stripe') {
    for (let x = -(dist % 24) - (extra ? Math.ceil(extra / 24) * 24 : 0); x < x1; x += 24) ctx.fillRect(Math.round(x), top + 10, 12, 3);
    ctx.fillRect(x0, top + 22, x1 - x0, 1);
  }
}

/* --- 小さいドット文字（3×5ドット。ゲーム画面の中の「SHOP」「+25」など） --- */
const DR_FONT = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111',
  '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001010010010',
  '8': '111101111101111', '9': '111101111001111', '+': '000010111010000', '-': '000000111000000',
  '!': '010010010000010', '.': '000000000000010', ' ': '000000000000000', ':': '000010000010000',
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111',
};
function drPixelText(ctx, text, x, y, color, shadow) {
  const draw = (ox, oy, col) => {
    ctx.fillStyle = col;
    let cx = Math.round(x) + ox;
    for (const ch of String(text).toUpperCase()) {
      const g = DR_FONT[ch];
      if (g) for (let i = 0; i < 15; i++) if (g[i] === '1') ctx.fillRect(cx + (i % 3), Math.round(y) + oy + Math.floor(i / 3), 1, 1);
      cx += 4;
    }
  };
  if (shadow) draw(1, 1, shadow);
  draw(0, 0, color);
}

/* --- タイトル画面の後ろで走る見本（ぶつからずに自動でジャンプする） --- */
function drUpdateDemo(dt) {
  if (!dr.demo) {
    dr.demo = drNewRun();
    dr.demo.speed = DR_CONFIG.speedStart * 1.2;
  }
  const d = dr.demo, C = DR_CONFIG;
  d.t += dt;
  const move = d.speed * dt;
  d.dist += move;
  if (d.dist / C.pxPerMeter > 400) { d.dist = 0; d.worldIndex++; }
  d.nextObstacleIn -= move;
  if (d.nextObstacleIn <= 0) {
    const ids = drWorld(d).obstacles || [];
    const cands = DR_OBSTACLES.filter(o => ids.includes(o.id) && !o.fly && !o.pit);
    if (cands.length) { const def = drPickWeighted(cands); d.obstacles.push(drMakeObstacle(def, C.width + 6, C.groundY - def.h)); }
    d.nextObstacleIn = drRand(1.2, 2.2) * d.speed;
  }
  d.obstacles.forEach(o => { o.x -= move; });
  d.obstacles = d.obstacles.filter(o => o.x > -30);
  // 目の前に障害物が来たら自動でジャンプ
  if (d.onGround && d.obstacles.some(o => o.x > C.playerX + 10 && o.x < C.playerX + 48)) { d.onGround = false; d.vy = C.jumpVelocity; }
  if (!d.onGround) {
    d.vy -= C.gravity * dt; d.y += d.vy * dt;
    if (d.y <= 0) { d.y = 0; d.vy = 0; d.onGround = true; }
  }
}

/* =====================================================
   音（dinorun-config.js の DR_SOUNDS。src が空なら鳴らさない）
   ===================================================== */
const drAudio = { cache: {}, bgm: null, bgmId: null, ctx: null, muted: false };
try { drAudio.muted = localStorage.getItem('dinorun-mute') === '1'; } catch (e) { /* なくてもよい */ }

/* 仮の電子音（ファイルを置くまでのあいだ鳴らす。DR_SOUNDS の tone の書き方は dinorun-config.js） */
function drTone(tone, volume) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!drAudio.ctx) drAudio.ctx = new AC();
    const ac = drAudio.ctx;
    if (ac.state === 'suspended') ac.resume();
    const notes = tone.notes || [[tone.freq, tone.dur || 0.1, tone.to]];
    let t = ac.currentTime;
    const vol = (volume == null ? 0.5 : volume) * 0.25;   // 電子音は大きく聞こえるので小さめに
    notes.forEach(([f, d, to]) => {
      const osc = ac.createOscillator(), g = ac.createGain();
      osc.type = tone.wave || 'square';
      osc.frequency.setValueAtTime(f, t);
      if (to) osc.frequency.exponentialRampToValueAtTime(to, t + d);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      osc.connect(g).connect(ac.destination);
      osc.start(t); osc.stop(t + d + 0.02);
      t += d;
    });
  } catch (e) { /* 音が鳴らなくてもゲームは続ける */ }
}

/* 音のオン・オフ（画面の 🔊 ボタン。このブラウザに覚えておく） */
function drToggleSound() {
  drAudio.muted = !drAudio.muted;
  try { localStorage.setItem('dinorun-mute', drAudio.muted ? '1' : '0'); } catch (e) { /* なくてもよい */ }
  if (drAudio.muted && drAudio.bgm) drAudio.bgm.pause();
  if (!drAudio.muted && drAudio.bgm) drAudio.bgm.play().catch(() => {});
  drUpdateSoundBtn();
  drSound('select');
}
function drUpdateSoundBtn() {
  document.querySelectorAll('[data-dr="sound"]').forEach(b => {
    b.textContent = drAudio.muted ? '🔇' : '🔊';
    b.setAttribute('aria-label', drAudio.muted ? '音を出す' : '音を消す');
  });
}

function drSound(id) {
  const def = DR_SOUNDS[id];
  if (!def || drAudio.muted) return;
  if (!def.src) { if (def.tone) drTone(def.tone, def.volume); return; }   // ファイルがなければ仮の電子音
  try {
    let base = drAudio.cache[id];
    if (!base) { base = new Audio(def.src); base.preload = 'auto'; drAudio.cache[id] = base; }
    const a = base.cloneNode();
    a.volume = def.volume == null ? 1 : def.volume;
    a.play().catch(() => { /* 操作の前は鳴らせないことがある */ });
  } catch (e) { /* 音が鳴らなくてもゲームは続ける */ }
}

/* BGM を切り替える（id が空なら止める） */
function drBgm(id) {
  if (drAudio.bgmId === (id || null)) return;
  if (drAudio.bgm) { drAudio.bgm.pause(); drAudio.bgm = null; }
  drAudio.bgmId = id || null;
  const def = id && DR_SOUNDS[id];
  if (!def || !def.src) return;
  try {
    const a = new Audio(def.src);
    a.loop = def.loop !== false;
    if (drAudio.muted) { drAudio.bgm = a; return; }
    a.volume = def.volume == null ? 0.5 : def.volume;
    a.play().catch(() => {});
    drAudio.bgm = a;
  } catch (e) { /* 音が鳴らなくてもゲームは続ける */ }
}
