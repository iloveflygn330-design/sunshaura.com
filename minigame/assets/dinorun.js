/* =====================================================
   きょうりゅうラン（dinorun）のゲーム本体
   minigame/index.html で、dinorun-config / items / worlds / sprites / ranking のあとに読み込む。

   遊び方:
     恐竜が右へ走り続ける。障害物をジャンプ・しゃがみ・スキルでよける。
     コインを集めて、途中に出てくるショップアイコン（ジャンプで届く高さ）に触ると、ショップで強化を買える。
     走った距離でワールドが切り替わる。ライフが 0 になったらゲームオーバー → 名前（英字3文字）を入れてランキングへ。

   操作:
     PC     … Space / ↑ ジャンプ、↓ しゃがみ（空中なら急降下）、A / S / D スキル①②③、P / Esc 一時停止
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
   ----------------------------------------------------- */
const DR_SKILL_ACTIONS = {
  /* 居合切り：目の前の range × height の範囲にある、壊せる障害物を切る */
  slash(run, skill) {
    run.slashT = 0.28;
    run.slashRange = skill.range;
    const p = drPlayerBox(run);
    const area = { x: p.x + p.w - 2, y: DR_CONFIG.groundY - skill.height, w: skill.range, h: skill.height };
    run.obstacles.forEach(o => {
      if (!o.dead && o.def.breakable !== false && drOverlap(area, drObstacleBox(o))) drKillObstacle(run, o);
    });
    drSound('slash');
  },
  /* スピンアタック：duration 秒のあいだ回転。ぶつかった障害物を壊し、ダメージを受けない */
  spin(run, skill) {
    run.spinT = skill.duration;
    drSound('spin');
  },
};

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
  duckKeys: new Set(),     // しゃがみを押している入力（キー・指ごと）
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
  drShowTitle();
  drLoadRanking();
  if (!dr.raf) { dr.lastT = performance.now(); dr.raf = requestAnimationFrame(drLoop); }
}

/* ゲーム選択に戻るとき・ほかのゲームを選んだとき */
function dinorunStop() {
  if (!dr.active) return;
  dr.active = false;
  cancelAnimationFrame(dr.raf); dr.raf = 0;
  dr.duckKeys.clear();
  drBgm(null);
  document.body.classList.remove('dr-active', 'dr-header-hidden');
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
    html += `<button type="button" class="dr-btn dr-duck-btn" data-act="duck">
        <span class="dr-key">↓</span><span class="dr-btn-label">しゃがむ</span>
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
  const release = e => {
    const btn = e.target.closest('[data-act]');
    if (btn && btn.dataset.act === 'duck') drRelease('duck', 'p' + e.pointerId);
  };
  pads.addEventListener('pointerup', release);
  pads.addEventListener('pointercancel', release);
  pads.addEventListener('lostpointercapture', release);
  pads.addEventListener('contextmenu', e => e.preventDefault());

  // ゲーム画面をタップ／クリック：プレイ中はジャンプ
  document.getElementById('dr-stage').addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    if (dr.mode === 'play') { e.preventDefault(); drPress('jump', 'stage'); }
  });

  // キーボード
  window.addEventListener('keydown', drOnKeyDown);
  window.addEventListener('keyup', e => {
    if (!dr.active) return;
    if (e.code === 'ArrowDown' || e.code === 'KeyJ') drRelease('duck', 'k' + e.code);
  });

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
      if (c === 'Space' || c === 'ArrowUp' || c === 'KeyW' || c === 'KeyK') drPress('jump', 'k');
      else if (c === 'ArrowDown' || c === 'KeyJ') drPress('duck', 'k' + c);
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
      else if (c === 'Enter' || c === 'Escape') drCloseShop();
      break;
    case 'entry':
      drEntryKey(e);
      break;
    case 'over':
      if (c === 'Space' || c === 'Enter') drUiAction('over-next');
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
  if (act === 'jump') drJump(run);
  else if (act === 'duck') { dr.duckKeys.add(src || 'x'); }
  else if (act.startsWith('skill')) drUseSkill(run, +act.slice(5));
}
function drRelease(act, src) {
  if (act === 'duck') dr.duckKeys.delete(src || 'x');
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
    maxJumps: 1,           // ジャンプできる回数
    jumpPower: 1,          // ジャンプの強さの倍率
    lives: DR_CONFIG.startLives,
    invincibleTime: DR_CONFIG.invincibleTime,
    invT: 0,               // 無敵の残り時間
    coinMult: 1,           // コイン倍率
    wallet: 0,             // 持っているコイン（倍率がかかるので小数もある。表示は切り捨て）
    coinsPicked: 0,        // 拾ったコインの個数（スコア用。倍率はかからない）
    kills: 0,              // 壊した障害物の数
    skills: {},            // 覚えたスキル（id → 数値のコピー）
    cooldowns: {},         // スキルの残りクールタイム（id → 秒）
    slots: [null, null, null],   // スキルボタン①②③に入っているスキルの id
    bench: [],             // ボタンから外したスキル（ショップで入れ直せる）
    levels: {},            // アイテムを何回買ったか（id → 回数）
    spinT: 0, slashT: 0, slashRange: 0,
    obstacles: [], coins: [], effects: [], shopIcon: null,
    nextObstacleIn: DR_CONFIG.speedStart * 1.4,
    nextCoinIn: DR_CONFIG.speedStart * 0.8,
    nextShopAt: DR_CONFIG.shopFirstMeter,
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
  dr.duckKeys.clear();
  DRRanking.startSession().then(tok => { if (dr.run) dr.run.token = tok; });
  drBgm(drWorld(dr.run).bgm);
  drShowBanner(drWorld(dr.run).name, 'WORLD 1');
  drUpdateHud(true);
  drStartReady('play');
}

function drStartReady(next) {
  dr.readyT = DR_CONFIG.readyCountSec;
  dr.readyNext = next;
  drSetMode('ready');
}

function drPause() {
  if (dr.mode !== 'play' && dr.mode !== 'ready') return;
  dr.duckKeys.clear();
  drSetMode('pause');
}
function drResume() {
  if (dr.mode !== 'pause') return;
  drStartReady('play');
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
}

/* ---------- ゲームの計算 ---------- */
function drWorld(run) { return DR_WORLDS[run.worldIndex % DR_WORLDS.length]; }
function drMeters(run) { return run.dist / DR_CONFIG.pxPerMeter; }
function drScore(run) { return Math.floor(drMeters(run)) + run.coinsPicked * DR_CONFIG.scoreCoin + run.kills * DR_CONFIG.scoreKill; }
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
  const move = run.speed * dt;
  run.dist += move;

  // --- 自機 ---
  const duckHeld = dr.duckKeys.size > 0;
  let g = C.gravity;
  if (!run.onGround && duckHeld) g *= C.fastFallRate;
  if (!run.onGround) {
    run.vy -= g * dt;
    run.y += run.vy * dt;
    if (run.y <= 0) { run.y = 0; run.vy = 0; run.onGround = true; run.jumpsUsed = 0; drPuff(run, 3); }
  }
  run.ducking = run.onGround && duckHeld && run.spinT <= 0;

  // --- タイマー ---
  if (run.invT > 0) run.invT = Math.max(0, run.invT - dt);
  if (run.spinT > 0) run.spinT = Math.max(0, run.spinT - dt);
  if (run.slashT > 0) run.slashT = Math.max(0, run.slashT - dt);
  if (run.calmT > 0) run.calmT = Math.max(0, run.calmT - dt);
  for (const id in run.cooldowns) run.cooldowns[id] = Math.max(0, run.cooldowns[id] - dt);

  // --- ワールド移動 ---
  if (!run.worldFx && drMeters(run) >= run.nextWorldAt) {
    run.worldFx = { t: 0, dur: 1.2, switched: false };
    run.calmT = C.worldCalmTime;
    run.nextWorldAt += C.worldLength;
    drSound('world');
  }
  if (run.worldFx) {
    run.worldFx.t += dt;
    if (!run.worldFx.switched && run.worldFx.t >= run.worldFx.dur / 2) {
      run.worldFx.switched = true;
      run.worldIndex++;
      const w = drWorld(run);
      drShowBanner(w.name, 'WORLD ' + (run.worldIndex + 1));
      drBgm(w.bgm);
    }
    if (run.worldFx.t >= run.worldFx.dur) run.worldFx = null;
  }

  // --- 出現 ---
  run.nextObstacleIn -= move;
  if (run.nextObstacleIn <= 0) {
    if (run.calmT <= 0) drSpawnObstacle(run);
    const d = drDifficulty(run);
    const gap = drRand(drLerp(C.gapStartMin, C.gapEndMin, d), drLerp(C.gapStartMax, C.gapEndMax, d));
    run.nextObstacleIn = gap * run.speed;
  }
  run.nextCoinIn -= move;
  if (run.nextCoinIn <= 0) {
    drSpawnCoins(run);
    run.nextCoinIn = drRand(C.coinGapMin, C.coinGapMax) * run.speed;
  }
  if (!run.shopIcon && drMeters(run) >= run.nextShopAt) drSpawnShop(run);

  // --- 動かす ---
  run.obstacles.forEach(o => {
    o.x -= move;
    if (o.dead) { o.deadT += dt; o.y -= 40 * dt; }
  });
  run.obstacles = run.obstacles.filter(o => o.x + o.def.w > -10 && (!o.dead || o.deadT < 0.4));
  run.coins.forEach(c => { c.x -= move; });
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
      drFloatText(run, `SKIP +${bonus}`, C.playerX + 10, C.groundY - 50, '#FFD84A');
      drSound('skip');
      drAfterShop(run);
    }
  }

  // --- 当たり判定 ---
  const pb = drPlayerBox(run);
  for (const o of run.obstacles) {
    if (o.dead || o.hitDone) continue;
    if (!drOverlap(pb, drObstacleBox(o))) continue;
    if (run.spinT > 0) {
      if (o.def.breakable !== false) drKillObstacle(run, o);
      else o.hitDone = true;
      continue;
    }
    if (run.invT > 0) continue;
    o.hitDone = true;
    drDamage(run);
    if (dr.mode !== 'play') return;
  }
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

/* 自機の当たり判定の箱（画面の中の位置） */
function drPlayerBox(run) {
  const h = run.ducking ? DR_PLAYER.hit.duck : DR_PLAYER.hit.stand;
  const top = DR_CONFIG.groundY - run.y - DR_PLAYER.frameH;
  return { x: DR_CONFIG.playerX + h[0], y: top + h[1], w: h[2], h: h[3] };
}
function drObstacleBox(o) {
  const d = o.def;
  const h = d.hit || [1, 1, d.w - 2, d.h - 2];
  return { x: o.x + h[0], y: o.y + h[1], w: h[2], h: h[3] };
}
function drOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function drSpawnObstacle(run) {
  const meters = drMeters(run);
  const ids = drWorld(run).obstacles || [];
  const cands = DR_OBSTACLES.filter(o => ids.includes(o.id)
    && (o.minMeter || 0) <= meters
    && (!o.fly || meters >= DR_CONFIG.flyingFromMeter));
  if (!cands.length) return;
  const def = drPickWeighted(cands);
  const x0 = DR_CONFIG.width + 6;
  if (def.fly) {
    const lift = def.fly[Math.floor(Math.random() * def.fly.length)];
    run.obstacles.push(drMakeObstacle(def, x0, DR_CONFIG.groundY - lift - def.h));
    return;
  }
  // 地面のもの：小さいものは、ときどき2〜3個つながって出る
  let count = 1;
  if (def.h <= 24 && Math.random() < DR_CONFIG.clusterChanceMax * drDifficulty(run) + 0.08) count = Math.random() < 0.4 ? 3 : 2;
  for (let i = 0; i < count; i++) {
    run.obstacles.push(drMakeObstacle(def, x0 + i * (def.w + 2), DR_CONFIG.groundY - def.h));
  }
}
function drMakeObstacle(def, x, y) {
  return { def, x, y, t0: Math.random() * 10, dead: false, deadT: 0, hitDone: false };
}

function drSpawnCoins(run) {
  const C = DR_CONFIG;
  const n = Math.floor(drRand(C.coinRowMin, C.coinRowMax + 1));
  const style = Math.random();
  const baseLift = [6, 30, 54][Math.floor(Math.random() * 3)];
  for (let i = 0; i < n; i++) {
    let lift = baseLift;
    if (style < 0.35) lift = 14 + Math.sin((i / Math.max(1, n - 1)) * Math.PI) * 44;   // 山なり
    run.coins.push({ x: C.width + 6 + i * 13, y: C.groundY - lift - DR_PICKUPS.coin.h, taken: false });
  }
}

function drSpawnShop(run) {
  // ジャンプで届く高さに出す（ショップアイコンの下の端が地面から 40 ドット上）
  run.shopIcon = { x: DR_CONFIG.width + 8, y: DR_CONFIG.groundY - 40 - DR_PICKUPS.shop.h, baseY: DR_CONFIG.groundY - 40 - DR_PICKUPS.shop.h };
  // ショップの真下に障害物が来ないよう、少しあける
  run.nextObstacleIn = Math.max(run.nextObstacleIn, run.speed * 0.9);
}

function drAfterShop(run) {
  run.shopIcon = null;
  run.shopCount++;
  run.nextShopAt = drMeters(run) + DR_CONFIG.shopInterval * Math.pow(DR_CONFIG.shopIntervalGrow, run.shopCount - 1);
}

/* ---------- 自機の動き ---------- */
function drJump(run) {
  const v = DR_CONFIG.jumpVelocity * run.jumpPower;
  if (run.onGround) {
    run.onGround = false; run.vy = v; run.jumpsUsed = 1; run.y = Math.max(run.y, 0.01);
    drSound('jump');
  } else if (run.jumpsUsed < run.maxJumps) {
    run.vy = v * 0.92; run.jumpsUsed++;
    drPuff(run, 5);
    drSound('jump');
  }
}

function drUseSkill(run, slot) {
  const id = run.slots[slot];
  if (!id) return;
  if ((run.cooldowns[id] || 0) > 0) return;
  const skill = run.skills[id];
  const fn = DR_SKILL_ACTIONS[skill.action];
  if (!fn) return;
  fn(run, skill);
  run.cooldowns[id] = skill.cooldown;
}

function drKillObstacle(run, o) {
  o.dead = true; o.deadT = 0;
  run.kills++;
  drSparkle(run, o.x + o.def.w / 2, o.y + o.def.h / 2, '#FFFFFF', 8);
  drFloatText(run, '+' + DR_CONFIG.scoreKill, o.x, o.y - 4, '#7FFFD4');
  drSound('kill');
}

function drDamage(run) {
  run.lives--;
  dr.shake = 0.3;
  drSound('hit');
  drSparkle(run, DR_CONFIG.playerX + 12, DR_CONFIG.groundY - run.y - 12, '#FF5A7A', 10);
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
    run.effects.push({ type: 'dot', x: DR_CONFIG.playerX + drRand(6, 18), y: DR_CONFIG.groundY - run.y - 1, vx: drRand(-40, -10), vy: drRand(-20, -5), t: 0, life: 0.35, color: '#FFFFFF' });
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
function drItemAvailable(run, it) {
  const lv = run.levels[it.id] || 0;
  if (lv >= (it.maxLevel || 1)) return false;
  if (it.type === 'skill' && run.skills[it.skill]) return false;
  if (it.requires && !run.skills[it.requires]) return false;
  return true;
}

function drOpenShop(run) {
  drSound('shop');
  dr.duckKeys.clear();
  const pool = DR_ITEMS.filter(it => drItemAvailable(run, it));
  const offers = [];
  while (offers.length < DR_CONFIG.shopOffers && pool.length) {
    const it = drPickWeighted(pool);
    offers.push(it);
    pool.splice(pool.indexOf(it), 1);
  }
  dr.shop = { offers, sold: [], picking: null, swapSel: null };
  drAfterShop(run);
  drSetMode('shop');
  drRenderShop();
}

function drCloseShop() {
  if (dr.mode !== 'shop' || (dr.shop && dr.shop.picking)) return;
  dr.shop = null;
  drStartReady('play');
}

function drBuy(index) {
  const run = dr.run, shop = dr.shop;
  if (!run || !shop || shop.picking) return;
  const it = shop.offers[index];
  if (!it || shop.sold.includes(index)) return;
  const price = drItemPrice(run, it);
  if (Math.floor(run.wallet) < price) return;
  run.wallet -= price;
  run.levels[it.id] = (run.levels[it.id] || 0) + 1;
  shop.sold.push(index);
  drSound('buy');
  if (it.type === 'skill') {
    const base = DR_SKILLS[it.skill];
    run.skills[it.skill] = JSON.parse(JSON.stringify(base));
    run.cooldowns[it.skill] = 0;
    const empty = run.slots.indexOf(null);
    shop.picking = it.skill;       // どのボタンに入れるか選んでもらう（空きがあっても選べる）
    shop.pickDefault = empty;
  } else if (typeof it.apply === 'function') {
    it.apply(run, it.requires ? run.skills[it.requires] : undefined);
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

  const cards = document.getElementById('dr-shop-cards');
  if (!shop.offers.length) {
    cards.innerHTML = '<p class="dr-shop-empty">もう買えるものがないよ！</p>';
  } else {
    cards.innerHTML = shop.offers.map((it, i) => {
      const lv = run.levels[it.id] || 0;
      const sold = shop.sold.includes(i);
      const price = sold ? 0 : drItemPrice(run, it);
      const max = it.maxLevel || 1;
      const lvText = it.type === 'skill' ? 'NEW スキル' : (sold ? `Lv.${lv} / ${max}` : `Lv.${lv} → ${lv + 1} / ${max}`);
      const icon = it.image ? `<img src="${it.image}" alt="">` : (it.icon || '★');
      const can = !sold && wallet >= price;
      return `<div class="dr-card${sold ? ' is-sold' : ''}">
          <div class="dr-card-icon">${icon}</div>
          <div class="dr-card-name">${it.name}</div>
          <div class="dr-card-lv">${lvText}</div>
          <div class="dr-card-desc">${it.desc || ''}</div>
          <button type="button" class="dr-card-buy" data-dr="buy" data-index="${i}" ${can ? '' : 'disabled'}>
            ${sold ? 'SOLD' : `<span class="dr-key">${i + 1}</span>🪙 ${price}`}
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
  if (shop.picking) {
    document.getElementById('dr-shop-pick-name').textContent = DR_SKILLS[shop.picking].name;
    document.getElementById('dr-shop-pick-btns').innerHTML = run.slots.map((id, i) =>
      `<button type="button" class="dr-pick-btn${i === shop.pickDefault ? ' is-suggest' : ''}" data-dr="pick-slot" data-slot="${i}">
         <span class="dr-key">${'ASD'[i]}</span>${'①②③'[i]}<small>${id ? DR_SKILLS[id].name + 'と入れ替え' : '空き'}</small>
       </button>`).join('');
  }
  document.getElementById('dr-shop-close').disabled = !!shop.picking;
}

/* ---------- ゲームオーバー ---------- */
function drGameOver(run) {
  run.deadT = 0;
  run.vy = 260; run.onGround = false;
  dr.duckKeys.clear();
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
  run.final = { score, meters, coins: run.coinsPicked, kills: run.kills, durationMs: Math.round(run.t * 1000) };
  document.getElementById('dr-res-score').textContent = score.toLocaleString();
  document.getElementById('dr-res-detail').innerHTML =
    `きょり ${meters}m<br>コイン ${run.coinsPicked}こ × ${DR_CONFIG.scoreCoin}<br>こわした ${run.kills}こ × ${DR_CONFIG.scoreKill}`;
  const qual = drQualifies(score);
  run.qualifies = qual;
  document.getElementById('dr-res-next').textContent = qual ? 'ランキングに名前を入れる' : 'タイトルにもどる';
  document.getElementById('dr-res-rankin').hidden = !qual;
  drSetMode('over');
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
    token: run.token, name, score: f.score, distance: f.meters, coins: f.coins, kills: f.kills, durationMs: f.durationMs,
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
    drSetHearts(0, force);
    return;
  }
  set('dr-score', drScore(run).toLocaleString());
  set('dr-coins', String(Math.floor(run.wallet)));
  set('dr-dist', Math.floor(drMeters(run)) + 'm');
  drSetHearts(run.lives, force);
}

function drSetHearts(n, force) {
  const key = 'hearts' + n;
  if (!force && dr.uiCache.hearts === key) return;
  dr.uiCache.hearts = key;
  const el = document.getElementById('dr-hearts');
  if (!el) return;
  let html = '';
  if (n > 6) html = `<span class="dr-heart" aria-hidden="true"></span><span class="dr-heart-num">×${n}</span>`;   // 多いときは数字で
  else for (let i = 0; i < n; i++) html += '<span class="dr-heart" aria-hidden="true"></span>';
  el.innerHTML = html;
  el.setAttribute('aria-label', 'ライフ ' + n);
}

function drUpdatePads() {
  const run = dr.run;
  const playing = dr.mode === 'play';
  for (let i = 0; i < 3; i++) {
    const id = run ? run.slots[i] : null;
    const skill = id ? run.skills[id] : null;
    const cd = skill ? (run.cooldowns[id] || 0) : 0;
    const ratio = skill ? 1 - cd / skill.cooldown : 0;
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
  // しゃがみボタンの押している表示
  const duck = dr.duckKeys.size > 0;
  if (dr.uiCache.duck !== duck) {
    dr.uiCache.duck = duck;
    document.querySelectorAll('.dr-duck-btn').forEach(b => b.classList.toggle('is-held', duck));
  }
}

function drUpdateCount() {
  const el = document.getElementById('dr-count');
  if (!el) return;
  let text = '';
  if (dr.mode === 'ready') text = dr.readyT > 0.4 ? String(Math.ceil(dr.readyT - 0.4)) : 'GO!';
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
  drDrawBackground(ctx, world, run.dist);
  drDrawGround(ctx, world, run.dist);

  // コイン
  run.coins.forEach(c => drDrawSprite(ctx, DR_PICKUPS.coin.sprite, 8, 8, c.x, c.y, dr.clock + c.x * 0.01));
  // ショップアイコン（ふわふわ上下＋「SHOP」の文字）
  if (run.shopIcon) {
    const s = run.shopIcon;
    s.y = s.baseY + Math.round(Math.sin(dr.clock * 4) * 2);
    drDrawSprite(ctx, DR_PICKUPS.shop.sprite, DR_PICKUPS.shop.w, DR_PICKUPS.shop.h, s.x, s.y, dr.clock);
    drPixelText(ctx, 'SHOP', s.x + 3, s.y - 8, '#FFFFFF', '#1B1B2F');
  }
  // 障害物
  run.obstacles.forEach(o => {
    if (o.dead) ctx.globalAlpha = Math.max(0, 1 - o.deadT / 0.4);
    drDrawSprite(ctx, o.def.sprite, o.def.w, o.def.h, o.x, o.y, dr.clock + o.t0);
    ctx.globalAlpha = 1;
  });
  // 自機
  if (dr.run) drDrawPlayer(ctx, run);
  else drDrawPlayer(ctx, run, true);
  // 居合切りの軌跡
  if (run.slashT > 0) drDrawSlash(ctx, run);
  // 演出（粒・文字）
  run.effects.forEach(fx => {
    const a = Math.max(0, 1 - fx.t / fx.life);
    if (fx.type === 'dot') { ctx.globalAlpha = a; ctx.fillStyle = fx.color; ctx.fillRect(Math.round(fx.x), Math.round(fx.y), 2, 2); }
    else if (fx.type === 'text') { ctx.globalAlpha = a; drPixelText(ctx, fx.text, fx.x, fx.y, fx.color, '#1B1B2F'); }
    ctx.globalAlpha = 1;
  });
  // ワールド移動の光
  if (run.worldFx) {
    const p = run.worldFx.t / run.worldFx.dur;
    const a = p < 0.5 ? p * 2 : (1 - p) * 2;
    const r = (p < 0.5 ? p * 2 : 1) * C.width * 0.75;
    ctx.globalAlpha = Math.min(1, a * 1.1);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(C.width / 2, C.height / 2, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (dr.debug) drDrawDebug(ctx, run);
  ctx.restore();
}

function drDrawPlayer(ctx, run, isDemo) {
  const C = DR_CONFIG, P = DR_PLAYER;
  const x = C.playerX, y = C.groundY - run.y - P.frameH;
  // 無敵中は点滅（切れる直前は速く点滅して知らせる）
  if (run.invT > 0 && dr.mode === 'play') {
    const period = run.invT > C.invincibleWarnTime ? 0.24 : 0.08;
    if (Math.floor(run.invT / period) % 2 === 0) ctx.globalAlpha = 0.25;
  }
  let anim = 'run';
  if (dr.mode === 'dying' || (run.deadT > 0 && !isDemo)) anim = 'hurt';
  else if (run.spinT > 0) anim = 'spin';
  else if (run.slashT > 0) anim = 'slash';
  else if (!run.onGround) anim = 'jump';
  else if (run.ducking) anim = 'duck';
  const a = P.anims[anim];
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
  run.obstacles.forEach(o => { const ob = drObstacleBox(o); ctx.strokeRect(ob.x + 0.5, ob.y + 0.5, ob.w - 1, ob.h - 1); });
}

/* --- 背景（遠くの景色） --- */
function drHash(n) { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }

function drDrawBackground(ctx, w, dist) {
  const C = DR_CONFIG;
  const g = ctx.createLinearGradient(0, 0, 0, C.groundY);
  g.addColorStop(0, w.sky[0]); g.addColorStop(1, w.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, C.width, C.groundY);

  const img = drImage(w.bgImage);
  if (img) {
    const off = (dist * 0.2) % img.naturalWidth;
    for (let x = -off; x < C.width; x += img.naturalWidth) ctx.drawImage(img, Math.round(x), 0);
    return;
  }
  const f = w.far || { style: 'none' };
  const off = dist * 0.2;
  if (f.style === 'hills') {
    ctx.fillStyle = f.color2;
    for (let x = 0; x < C.width; x += 2) {
      const h = 26 + Math.sin((x + off * 0.5) / 47) * 10 + Math.sin((x + off * 0.5) / 19) * 4;
      ctx.fillRect(x, C.groundY - h - 14, 2, h + 14);
    }
    ctx.fillStyle = f.color;
    for (let x = 0; x < C.width; x += 2) {
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
function drDrawGround(ctx, w, dist) {
  const C = DR_CONFIG;
  const top = C.groundY, h = C.height - C.groundY;
  const img = drImage(w.groundImage);
  if (img) {
    const off = dist % img.naturalWidth;
    for (let x = -off; x < C.width; x += img.naturalWidth) ctx.drawImage(img, Math.round(x), top);
    return;
  }
  const gr = w.ground || { style: 'plain', color: '#888' };
  ctx.fillStyle = gr.color;
  ctx.fillRect(0, top, C.width, h);
  ctx.fillStyle = gr.line;
  ctx.fillRect(0, top, C.width, 2);
  const off = dist % 16;
  if (gr.style === 'grid') {
    for (let y = top + 8; y < C.height; y += 8) ctx.fillRect(0, y, C.width, 1);
    for (let x = -off; x < C.width; x += 16) ctx.fillRect(Math.round(x), top, 1, h);
  } else if (gr.style === 'tile') {
    for (let row = 0; row * 8 < h; row++) {
      for (let x = -(dist % 32) - 16; x < C.width; x += 16) {
        if (((Math.floor((x + dist) / 16) + row) & 1) === 0) ctx.fillRect(Math.round(x), top + 2 + row * 8, 16, 8);
      }
    }
  } else if (gr.style === 'stripe') {
    for (let x = -(dist % 24); x < C.width; x += 24) ctx.fillRect(Math.round(x), top + 10, 12, 3);
    ctx.fillRect(0, top + 22, C.width, 1);
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
    const cands = DR_OBSTACLES.filter(o => ids.includes(o.id) && !o.fly);
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
const drAudio = { cache: {}, bgm: null, bgmId: null };

function drSound(id) {
  const def = DR_SOUNDS[id];
  if (!def || !def.src) return;
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
    a.volume = def.volume == null ? 0.5 : def.volume;
    a.play().catch(() => {});
    drAudio.bgm = a;
  } catch (e) { /* 音が鳴らなくてもゲームは続ける */ }
}
