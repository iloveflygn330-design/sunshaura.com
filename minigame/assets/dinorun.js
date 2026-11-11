/* =====================================================
   きょうりゅうラン（dinorun）のゲーム本体
   minigame/index.html で、dinorun-config / items / worlds / sprites / ranking のあとに読み込む。

   遊び方:
     恐竜が右へ走り続ける。障害物をジャンプ・しゃがみ・スキルでよける。
     走り始めの約 270m はチュートリアル（説明の文を出しながら、決まった障害物を出す。dinorun-worlds.js の DR_TUTORIAL）。
     コインを集めて、途中で地面に出てくるショップに触ると、ショップで強化を買える（ジャンプで飛び越すとスキップ）。
     障害物にぶつからず、ぎりぎりでよけると「かすりボーナス」（コイン）。地面の穴（落下穴）はジャンプで飛び越す。
     走った距離でワールドが切り替わる。ボーナスチケットを買うと、次のワールドの前にボーナスステージ（障害物なし・下り坂）。
     5ワールド目からは、ときどきスキルを使わないと通れない区画（シャッター＋かべ）が出る。
     5ワールド目からは、ときどき「入り口の敵」も出る。触れると別の遊び（フェイズ）に切りかわる（いまは RPG のバトル。dinorun-rpg.js）。ライフが 0 になったらゲームオーバー → 名前（英字3文字）を入れてランキングへ。

   操作:
     PC     … Space ジャンプ（バタ足ジャンプを覚えたら、長押しで空中に浮く）、↓ スライディング（急降下を覚えたら、空中では急降下）、
              ← ↑ → または A / S / D スキル①②③、P / Esc 一時停止（W・K でもジャンプ、J でもスライディング）
              ボタンをクリックしても操作できる
     スマホ … 画面下のボタンをタップ（横持ちのときは左右どちらにも同じボタンが出る）

   画面の流れ（dr.mode）:
     title（タイトル）→ ready（カウントダウン）→ play（プレイ中）
       ⇄ shop（ショップ。ゲームは止まる）/ pause（一時停止）
       ⇄ phase（RPG などのフェイズ。入り口の敵に触れると始まる）→ phaseResult（フェイズの結果）→ ready → play
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
  /* 居合切り：自機から前へ range の先まで（高さ height）にある、壊せる障害物を全部切る。切ったものからコインが出る
     （急降下のすぐあとなら「ダッシュ切り」：前へ dashDistance 進みながら、その道のりもまとめて切る。
       ダッシュ切りのときは、天井から下がっているもの（障害物の dashCut: true）も切れる） */
  slash(run, skill) {
    const dash = drTryDash(run);
    drSlashCut(run, skill, dash);
    // RPGエリアのリズム技：拍に合わせて、あと slashCount - 1 回切る（drUpdate が拍ごとに切る）
    if (run.rhythmBoost) {
      const A = DR_DESIGN.rpgArea, note = A.slashNote || 4;
      run.rhythmSlash = { left: Math.max(0, (A.slashCount || 3) - 1), note, next: Math.round(run.beat * note / 4) + 1, skill, dash: dash || DR_CONFIG.dashDistance };
    }
  },
  /* スピンアタック：duration 秒のあいだ回転。ぶつかった障害物を壊し、ダメージを受けない
     （急降下のすぐあとなら、回転しながら本当に前へ spinRushMeters m 進む＝画面が一気に流れる） */
  spin(run, skill) {
    const k = run.rhythmBoost ? (DR_DESIGN.rpgArea.spinMult || 1) : 1;   // RPGエリアのリズム技：長く回って、遠くまで進む
    if (run.comboT > 0) { run.comboT = 0; drStartRush(run, DR_CONFIG.spinRushMeters * k, DR_CONFIG.spinRushTime * k); }
    run.spinT = skill.duration * k;
    run.spinTotal = skill.duration * k;
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
    run.coins.forEach(c => { if (c.x < drViewW(run)) c.vac = true; });
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
    // RPGエリアのリズム技：fireWays 方向に飛ばす（まっすぐ＋上へ fireAngle 度ずつ。下は地面なので、上へ広げる）
    const ways = run.rhythmBoost ? Math.max(1, DR_DESIGN.rpgArea.fireWays || 3) : 1;
    for (let i = 0; i < ways; i++) {
      const ang = i * (DR_DESIGN.rpgArea.fireAngle || 14) * Math.PI / 180;
      const speed = blue ? skill.blueSpeed : skill.speed;
      run.shots.push({
        x: p.x + p.w + r - 2, y: Math.min(p.y + 7, DR_CONFIG.groundY - r - 1), r, blue, t: 0, dist: 0,
        speed: speed * Math.cos(ang), vy: -speed * Math.sin(ang),
        range: blue ? Infinity : skill.range,
        pierce: skill.pierce, hit: new Set(),
      });
    }
    drSound(blue ? 'bluefire' : 'fire');
  },
};

/* 居合切りの1回ぶん：自機から前へ range（＋ダッシュの距離 dash）の先までにある、切れる障害物を全部切る */
function drSlashCut(run, skill, dash) {
  run.dashCut = dash > 0;
  run.slashT = 0.28;
  run.slashRange = skill.range + dash;
  const p = drPlayerBox(run);
  // 自機のうしろの端から、前の端＋range（＋ダッシュ）まで。重なっているものも、目の前のものも全部切れる
  const area = { x: p.x, y: DR_CONFIG.groundY - skill.height, w: p.w - 2 + skill.range + dash, h: skill.height };
  run.obstacles.forEach(o => {
    if (!o.dead && drCanCut(run, o) && drOverlap(area, drObstacleBox(o))) { drKillObstacle(run, o); drDropCoins(run, o); }
  });
  drSound('slash');
}

/* 画面に見えている幅（ドット）。ズームアウトしているときは広い。障害物・コインは、この右の外に出す */
function drViewW(run) { return DR_CONFIG.width / ((run && run.zoom) || 1); }
/* 走る速さから決まるズーム（1 = ふつう。DR_CONFIG.zoomMin まで小さくなる） */
function drZoomFor(speed) {
  const C = DR_CONFIG;
  const q = Math.max(0, Math.min(1, (speed - C.zoomFromSpeed) / Math.max(1, C.zoomFullSpeed - C.zoomFromSpeed)));
  return 1 + ((C.zoomMin || 1) - 1) * q * q * (3 - 2 * q);
}

/* 居合切りで切れるか（ふつうは breakable のものだけ。ダッシュ切りなら dashCut のものも） */
function drCanCut(run, o) { return !o.def.pit && !o.def.encounter && (o.def.breakable !== false || (run.dashCut && o.def.dashCut)); }

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

/* -----------------------------------------------------
   ★拡張予定: フェイズ（入り口の敵に触れると切りかわる、別の遊び。RPG のバトル・音ゲーなど）
     いまは RPG だけ（dinorun-rpg.js が DR_PHASES.rpg を登録する）。新しいフェイズを足すときは:
       1. 新しいファイル（例: dinorun-rhythm.js）を作り、index.html で dinorun.js のあとに読み込む
       2. そのファイルで  DR_PHASES.rhythm = { start, update, render, press, pads, end }  を登録する
            start(run, enc)  … フェイズが始まるとき（enc は入り口の敵の設定）
            update(dt)       … 毎フレーム（dr.mode === 'phase' のあいだ）
            render(ctx)      … ゲーム画面の描画（384 × 216）
            press(act)       … ボタン・キー。act は 'jump' / 'slide' / 'potion' / 'escape' / 'pskill0'～
            pads()           … 下のボタンの表示の更新（毎フレーム）
            end()            … 終わるとき（ボタンの表示などを元に戻す）
       3. dinorun-rpg-data.js の DR_ENCOUNTERS に、そのフェイズの入り口の敵（色を変える）を足す
     終わるときは drEndPhase('win' / 'escape' / 'lose') を呼ぶ。
       'win' … ハートが全回復してノーマルフェイズに戻る / 'escape' … ハートが 1 になって戻る / 'lose' … ゲームオーバー
       （勝ち・負けの意味はフェイズごとに変えてよい。戻り方を変えたいときは drEndPhase() に足す）
     結果の画面を出したいときは drShowPhaseResult(タイトル, 中身のHTML) を呼ぶ（「つぎへ」で drEndPhase('win')）
   ----------------------------------------------------- */
const DR_PHASES = {};

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
  jumpHeld: new Set(),
  phase: null,             // いま遊んでいるフェイズ { type, enc, impl }（ノーマルフェイズのときは null）
  pauseFrom: 'play',       // 一時停止する前のモード（戻るときに使う）     // いま押しっぱなしのジャンプボタン・キー（バタ足ジャンプ用。'k'+キー名 / 'p'+指の番号）
  ranking: { all: [], month: [], local: true, ok: true, loaded: false },
  rankTab: 'month',
  entry: null,        // 名前入力中の状態
  readyT: 0, readyNext: 'play',
  shop: null,         // ショップを開いている間の状態
  shake: 0,
  debug: /[?&]drdebug\b/.test(location.search),
  metronome: /[?&]drbeat\b/.test(location.search),   // テスト用：URL に &drbeat を付けると、拍に合わせて「カッ」と鳴る（BGM がないときに拍を確かめる）
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
  // DR_CONFIG.renderScale 倍の細かさで描く（drRender のはじめに、その倍率をかけている。描く処理は 384 × 216 のまま書ける）
  dr.canvas.width = DR_CONFIG.width * (DR_CONFIG.renderScale || 1);
  dr.canvas.height = DR_CONFIG.height * (DR_CONFIG.renderScale || 1);
  dr.ctx = dr.canvas.getContext('2d');
  dr.ctx.imageSmoothingEnabled = false;

  drCheckData();
  drBuildPads();
  drBindInput();
  drInitControl();
  drBuildEntry();
  drUpdateSoundBtn();
  // テスト用：URL に &drdebug を付けて開いたときだけ、一時停止ボタンの横に「⚔」ボタン（押すとすぐバトル。スマホでも試せる）
  if (dr.debug) {
    const pause = document.querySelector('#dr-hud [data-dr="pause"]');
    if (pause) pause.insertAdjacentHTML('beforebegin', '<button type="button" class="dr-pause-btn dr-debug-btn" id="dr-debug-note" data-dr="debug-note" aria-label="拍とノーツの音（テスト用）">♪</button>'
      + '<button type="button" class="dr-pause-btn dr-debug-btn" data-dr="debug-battle" aria-label="バトルを始める（テスト用）">⚔</button>');
    dr.noteSound = true;   // テスト用：拍（メトロノーム）とノーツの音。♪ボタンで切りかえ
  }

  // スキル・アイテムの画像（PNG）を指定していれば先に読み込んでおく
  drPreloadImages();
  // 投稿ページ（minigame/upload/）から入れた素材を読みこむ
  drLoadAssetManifest();
}

/* ---------- 投稿された素材（minigame/dinorun/assets.json） ----------
   素材の投稿ページ（minigame/upload/）で BGM や画像を投稿すると、ファイルが minigame/dinorun/uploads/ に入り、
   どこに使うかが minigame/dinorun/assets.json に書かれる。ゲームを開いたときにそれを読んで、データに当てはめる。
   assets.json の中身（どれも、書いていないものは今までどおり）:
     bgm      … { world1〜world5, rpg, bonus: { src, beatStart, volume } }
                 world1〜4 はそのワールドの番号のとき、world5 は5以降、rpg はバトルと RPGエリア、bonus はボーナスステージ
     obstacle … { 障害物の id: { image, frames, fps } }      player … { image }（自機の PNG）
     worldBg  … { ワールドの id: { image } }（遠くの景色）   ground … { ワールドの id: { image } }（地面）
     boss     … { ボスの id: { image } }                      rpgBg  … { image }（バトルの背景）
   ★拡張予定: 投稿できる素材の種類を増やすときは、ここ（drApplyAssetManifest）と、投稿ページ（minigame/upload/upload.js の UP_TARGETS）の両方に足す */
function drLoadAssetManifest() {
  fetch('dinorun/assets.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).then(m => {
    if (m) { drApplyAssetManifest(m); drPreloadImages(); }
  }).catch(() => { /* 読めなくてもゲームは続ける（今までどおりの素材で遊べる） */ });
}
function drApplyAssetManifest(m) {
  const bgm = m.bgm || {};
  Object.keys(bgm).forEach(key => {
    const b = bgm[key];
    if (!b || !b.src) return;
    DR_SOUNDS['bgm_' + key] = { src: b.src, volume: b.volume == null ? 0.5 : b.volume, loop: true, beatStart: b.beatStart };
  });
  if (DR_SOUNDS.bgm_rpg && typeof DR_RPG !== 'undefined') DR_RPG.bgm = 'bgm_rpg';
  if (DR_SOUNDS.bgm_bonus) DR_BONUS_WORLD.bgm = 'bgm_bonus';
  Object.entries(m.obstacle || {}).forEach(([id, v]) => {
    const o = DR_OBSTACLES.find(x => x.id === id);
    if (!o || !v.image) return;
    o.sprite = Object.assign({}, o.sprite, { image: v.image, frames: v.frames || 1 });
    if (v.fps) o.sprite.fps = v.fps;
  });
  if (m.player && m.player.image) DR_PLAYER.image = m.player.image;
  Object.entries(m.worldBg || {}).forEach(([id, v]) => { const w = DR_WORLDS.find(x => x.id === id); if (w && v.image) w.bgImage = v.image; });
  Object.entries(m.ground || {}).forEach(([id, v]) => { const w = DR_WORLDS.find(x => x.id === id); if (w && v.image) w.groundImage = v.image; });
  if (typeof DR_BOSSES !== 'undefined') Object.entries(m.boss || {}).forEach(([id, v]) => { const b = DR_BOSSES.find(x => x.id === id); if (b && v.image) b.image = v.image; });
  if (m.rpgBg && m.rpgBg.image && typeof DR_RPG !== 'undefined') DR_RPG.bgImage = m.rpgBg.image;
}

/* データの書き間違いを見つけたら、ブラウザの開発者ツール（Console）に出す */
function drCheckData() {
  const obIds = new Set(DR_OBSTACLES.map(o => o.id));
  // 設計書の写し（dinorun-design.js）のワールドと障害物が、見た目（dinorun-worlds.js）にあるか
  Object.keys(DR_DESIGN.worlds).forEach(id => {
    if (!DR_WORLDS.some(w => w.id === id)) console.warn(`[dinorun] DR_DESIGN.worlds の ${id} が DR_WORLDS にありません`);
    Object.keys(DR_DESIGN.worlds[id].obstacles || {}).forEach(ob => {
      if (!obIds.has(ob)) console.warn(`[dinorun] DR_DESIGN.worlds.${id} の障害物 ${ob} が DR_OBSTACLES にありません`);
    });
  });
  if (!DR_DESIGN.worlds[DR_DESIGN.firstWorld]) console.warn(`[dinorun] DR_DESIGN.firstWorld の ${DR_DESIGN.firstWorld} が DR_DESIGN.worlds にありません`);
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
    // フェイズ（RPG のバトルなど）のあいだだけ出る小さいボタンの列（中身はそのフェイズが入れる。dinorun-rpg.js）
    html += '<div class="dr-battle-row"></div>';
    html += `<button type="button" class="dr-btn dr-jump-btn" data-act="jump">
        <span class="dr-key">Space</span><span class="dr-btn-label">ジャンプ</span>
        <span class="dr-jump-count" aria-label="ジャンプ回数"></span>
        <span class="dr-ct dr-jump-ct"><span class="dr-ct-fill"></span></span>
      </button>`;
    // スライディングボタン。急降下を覚えると下半分に「急降下」が増える（空中で押すと急降下）。
    // 上半分・下半分それぞれ、使えないあいだは灰色で、使えるようになるまで左から色が戻っていく（.dr-half-fill）
    html += `<button type="button" class="dr-btn dr-duck-btn" data-act="slide">
        <span class="dr-duck-half is-slide"><span class="dr-half-fill"></span>
          <span class="dr-key">↓</span><span class="dr-btn-label">スライディング</span></span>
        <span class="dr-duck-half is-dive"><span class="dr-half-fill"></span>
          <span class="dr-key">↓（空中）</span><span class="dr-btn-label">急降下<small>（空中で）</small></span></span>
      </button>`;
    // タップエリア（タップモードのとき、ジャンプ・スライディングのボタンのかわりに出る）
    //   まん中をタップ（長押し）・上へスワイプでジャンプ、下へスワイプでスライディング、左へスワイプでスキル①、右へスワイプでスキル③。まわりの文字は「どっちにスワイプすると何が出るか」
    //   「長押しでバタ足」は、バタ足ジャンプを覚えたら出る（.has-flutter）
    //   .dr-tap-run はふだん、.dr-tap-battle はフェイズ（バトル）中に出る文字
    html += `<div class="dr-tap-area" role="button" aria-label="上へスワイプでジャンプ。ほかのスワイプでスライディングとスキル。空中で長押しでバタ足">
        <span class="dr-tap-hint is-up" data-dir="up">↑ <b><span class="dr-tap-run">ジャンプ</span><span class="dr-tap-battle">ふみつけ</span></b></span>
        <span class="dr-tap-hint is-left" data-dir="left" data-slot="0">← <b class="dr-tap-name dr-tap-run">スキル①</b><b class="dr-tap-battle">技1</b></span>
        <span class="dr-tap-center"><span class="dr-tap-run">上へ<wbr>スワイプで<wbr>ジャンプ<small>空中で長押しでバタ足</small></span><span class="dr-tap-battle">上へ<wbr>スワイプで<wbr>ふみつけ</span></span>
        <span class="dr-tap-hint is-right" data-dir="right" data-slot="2"><b class="dr-tap-name dr-tap-run">スキル③</b><b class="dr-tap-battle">技3</b> →</span>
        <span class="dr-tap-hint is-down" data-dir="down">↓ <b><span class="dr-tap-run">スライディング<small class="dr-tap-dive">（空中で急降下）</small></span><span class="dr-tap-battle">防御</span></b></span>
        <span class="dr-jump-count" aria-label="ジャンプ回数"></span>
      </div>`;
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
  drBindTapArea(pads);
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

  // 操作の切りかえ（タップモード ⇄ ボタンモード）
  document.getElementById('dr-ctrl-toggle').addEventListener('click', () => drSetControl(dr.control === 'tap' ? 'button' : 'tap', true));

  // ヘッダーを隠す／出す（スマホ用）
  document.getElementById('dr-header-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dr-header-hidden');
    drUpdateHeaderToggle();
  });

  // ほかのタブに切り替えたら一時停止
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && dr.active && (dr.mode === 'play' || dr.mode === 'ready' || dr.mode === 'phase')) drPause();
  });
  window.addEventListener('pagehide', () => { if (dr.active && (dr.mode === 'play' || dr.mode === 'phase')) drPause(); });
}

/* ---------- タップモード ----------
   タップエリアに指を置いたら、tapDecideMs ミリ秒（2〜3フレーム）だけ様子を見る:
     下へ swipeDist 以上動いた → スライディング・急降下
     左右へ swipeDistSkill 以上、しっかり横向きに動いた → スキル（左 … スキル① / 右 … スキル③。ななめに動いたときは決めない）
     上へ少しでも動いた・動かずに離した・時間が過ぎた → ジャンプ（押したままならバタ足）
   スワイプは指を置いた瞬間から速く動くので、短い時間で見分けられる（ジャンプが遅れて感じないように、待つ時間は短くしている）
   ※ 待つ時間は setTimeout ではなく、毎フレーム（drLoop → dr.tapTick）とタッチのイベントのたびに確かめる。
     スマホは指を置いているあいだ setTimeout が大きく遅れることがある（0.1〜0.4 秒）ため。
     時間は「指を置いた瞬間」（イベントの timeStamp）から数えるので、イベントが遅れて届いても待ちすぎない
   ジャンプしたあと、指を置いたまま大きく動かしたら、そのスワイプも1回だけ使える（ジャンプ → 下へスワイプで急降下 など） */
function drBindTapArea(pads) {
  // タップエリアの操作（DR_CONFIG のタップモードの説明も参照）:
  //   上へスワイプ → ジャンプ（指を置いたままなら、いちばん高いところでバタ足）
  //   タップ（tapDecideMs 動かさずに置いたまま）→ バタ足だけ（空中のとき）。ジャンプはしない（暴発しないように）
  //   下へスワイプ → スライディング（空中で急降下）/ 左・右へスワイプ → スキル①・スキル③
  const C = DR_CONFIG;
  const touches = new Map();   // pointerId → { x, y（指を置いた位置）, state: 'wait' | 'hold'（タップ）| 'jump'（ジャンプした）| 'done', t0, area }
  const now = () => performance.now();
  // 指を置いてから tapDecideMs たっても動いていなければ「タップ（長押し）」＝バタ足（毎フレーム・イベントのたびに呼ぶ）
  const check = () => {
    touches.forEach((t, id) => { if (t.state === 'wait' && now() - t.t0 >= C.tapDecideMs) hold(id, t); });
  };
  dr.tapTick = check;
  const actFor = dir => {
    if (dir === 'down') return 'slide';
    const n = { left: 0, right: 2 }[dir];
    return dr.mode === 'phase' ? 'pskill' + n : 'skill' + n;   // バトル中は、その技のボタン（左から1番目・3番目）
  };
  const flash = (area, dir) => {
    const h = area.querySelector(`.dr-tap-hint[data-dir="${dir}"]`);
    if (!h) return;
    h.classList.remove('is-fired'); void h.offsetWidth; h.classList.add('is-fired');
  };
  const hold = (id, t) => {
    t.state = 'hold';
    t.area.classList.add('is-held');
    drPress('flutter', 'p' + id);
  };
  const jump = (id, t) => {
    t.state = 'jump';
    t.ax = t.lx; t.ay = t.ly;   // ジャンプしたときの指の位置（ここから大きく動いたら、急降下なども使える）
    t.area.classList.add('is-held');
    flash(t.area, 'up');
    drPress('jump', 'p' + id);
  };
  pads.addEventListener('pointerdown', e => {
    const area = e.target.closest('.dr-tap-area');
    if (!area) return;
    e.preventDefault();
    try { area.setPointerCapture(e.pointerId); } catch (err) { /* 古いブラウザ */ }
    // 指を置いた時刻：イベントの timeStamp（performance.now と同じ時計）。おかしな値なら今の時刻
    const ts = e.timeStamp > 0 && e.timeStamp <= now() + 1 && now() - e.timeStamp < 1000 ? e.timeStamp : now();
    const t = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, state: 'wait', area, t0: ts };
    t.timer = setTimeout(check, C.tapDecideMs);   // 念のため（ふだんは毎フレームの check が先に動く）
    touches.set(e.pointerId, t);
  });
  pads.addEventListener('pointermove', e => {
    const t = touches.get(e.pointerId);
    if (!t || t.state === 'done') return;
    t.lx = e.clientX; t.ly = e.clientY;
    const ox = t.state === 'jump' ? t.ax : t.x, oy = t.state === 'jump' ? t.ay : t.y;
    const dx = e.clientX - ox, dy = e.clientY - oy, dist = Math.hypot(dx, dy);
    const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    // 上へ動いた：ジャンプ（バタ足で浮いているときは空中ジャンプ）。ジャンプしたあとは何もしない
    if (dir === 'up') {
      if ((t.state === 'wait' || t.state === 'hold') && dist >= (C.swipeDistJump || 6)) { clearTimeout(t.timer); jump(e.pointerId, t); }
      return;
    }
    // スキル（左右）は、スライディングより大きく・しっかり横向きに動かしたときだけ（暴発しないように）
    const skill = dir === 'left' || dir === 'right';
    const base = skill ? (C.swipeDistSkill || C.swipeDist) : C.swipeDist;
    const need = t.state === 'jump' ? base * 2.5 : base;   // ジャンプのあとは、大きく動かしたときだけ（急降下など）
    if (dist < need) return;
    if (skill && Math.abs(dx) < Math.abs(dy) * (C.swipeSkillRatio || 1)) return;   // ななめ：まだ決めない
    clearTimeout(t.timer);
    dr.jumpHeld.delete('p' + e.pointerId);   // バタ足もやめる
    t.state = 'done';
    flash(t.area, dir);
    drPress(actFor(dir), 'p' + e.pointerId);
  });
  const end = e => {
    const t = touches.get(e.pointerId);
    if (!t) return;
    clearTimeout(t.timer);
    dr.jumpHeld.delete('p' + e.pointerId);   // すぐ離したタップは何もしない（ジャンプはしない）
    t.area.classList.remove('is-held');
    touches.delete(e.pointerId);
  };
  pads.addEventListener('pointerup', end);
  pads.addEventListener('pointercancel', end);
}

/* 操作のしかた（'tap' … タップモード / 'button' … ボタンモード）。save = true ならこのブラウザに覚えておく */
function drSetControl(mode, save) {
  dr.control = mode === 'tap' ? 'tap' : 'button';
  const root = document.getElementById('dr-root');
  if (root) root.classList.toggle('dr-tapmode', dr.control === 'tap');
  const b = document.getElementById('dr-ctrl-toggle');
  if (b) b.textContent = dr.control === 'tap' ? '操作：タップ' : '操作：ボタン';
  if (save) { try { localStorage.setItem('dinorun-control', dr.control); } catch (e) { /* 覚えられなくても遊べる */ } }
}
/* 最初の操作のしかた：前に選んだもの → なければ、タッチの端末（スマホ・タブレット）はタップモード、PC はボタンモード */
function drInitControl() {
  let m = null;
  try { m = localStorage.getItem('dinorun-control'); } catch (e) { /* なくてもよい */ }
  if (m !== 'tap' && m !== 'button') m = window.matchMedia('(hover: none)').matches ? 'tap' : 'button';
  drSetControl(m, false);
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
  if (e.repeat && c !== 'ArrowDown') return;   // 押しっぱなしのキーリピートは、スライディング（↓）だけ通す

  switch (dr.mode) {
    case 'title':
      if (c === 'Space' || c === 'Enter' || c === 'ArrowUp') drStartGame();
      else if (c === 'KeyR') drShowRanking();
      break;
    case 'play':
      // 方向キー：← スキル①、↑ スキル②、→ スキル③、↓ スライディング（ジャンプは Space）
      if (c === 'Space' || c === 'KeyW' || c === 'KeyK') {
        if (!dr.jumpHeld.has('k' + c)) drPress('jump', 'k' + c);   // 押しっぱなしのキーリピートでは跳ばない
      }
      else if (c === 'ArrowDown' || c === 'KeyJ') drPress('slide');
      else if (c === 'KeyA' || c === 'ArrowLeft') drPress('skill0');
      else if (c === 'KeyS' || c === 'ArrowUp') drPress('skill1');
      else if (c === 'KeyD' || c === 'ArrowRight') drPress('skill2');
      else if (c === 'KeyQ') drUsePotion();
      else if (c === 'KeyB' && dr.debug) drDebugBattle();   // テスト用：URL に &drdebug を付けると B キーでバトルを始められる
      else if (c === 'KeyP' || c === 'Escape') drPause();
      break;
    case 'phase':
      // フェイズ中のキー（走るときと同じ並び。Space ふみつけ、↓ 防御、← ↑ → 技の1〜3番目、1〜6 技、Q 回復薬、X 逃げる）
      if (c === 'Space' || c === 'KeyW' || c === 'KeyK') drPress('jump');
      else if (c === 'ArrowDown' || c === 'KeyJ') drPress('slide');
      else if (c === 'ArrowLeft') drPress('pskill0');
      else if (c === 'ArrowUp') drPress('pskill1');
      else if (c === 'ArrowRight') drPress('pskill2');
      else if (c === 'KeyQ') drPress('potion');
      else if (c === 'KeyX') drPress('escape');
      else if (/^(Digit|Numpad)[1-9]$/.test(c)) drPress('pskill' + (+c.slice(-1) - 1));
      else if (c === 'KeyP' || c === 'Escape') drPause();
      break;
    case 'phaseResult':
      if (c === 'Space' || c === 'Enter') drUiAction('phase-next');
      break;
    case 'pause':
      if (c === 'KeyP' || c === 'Escape' || c === 'Enter' || c === 'Space') drResume();
      break;
    case 'shop':
      if (dr.shop && dr.shop.picking) {
        if (c === 'Digit1' || c === 'KeyA') drPickSlot(0);
        else if (c === 'Digit2' || c === 'KeyS') drPickSlot(1);
        else if (c === 'Digit3' || c === 'KeyD') drPickSlot(2);
        else if (c === 'Digit4' || c === 'KeyF') drPickSlot('bench');
        else if (c === 'Escape' || c === 'Backspace') drPickCancel();
      } else if (c === 'Digit1') drBuy(0);
      else if (c === 'Digit2') drBuy(1);
      else if (c === 'Digit3') drBuy(2);
      else if (c === 'Digit4') drBuy(3);
      else if (c === 'KeyR') drReroll();
      else if (c === 'Backspace') drShopUndoAll();
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
    case 'howto':   // あそびかた：← → でページ送り、Esc でもどる
      if (c === 'ArrowLeft') drHowtoMove(-1);
      else if (c === 'ArrowRight' || c === 'Space') drHowtoMove(1);
      else if (c === 'Escape' || c === 'Enter') drShowTitle();
      break;
  }
}

/* 操作（ボタン・キー共通） */
function drPress(act, src) {
  if (dr.mode === 'title' && act === 'jump') { drStartGame(); return; }
  if (dr.mode === 'phase' && dr.phase && dr.run) { dr.phase.impl.press(act, src); return; }
  if (dr.mode !== 'play' || !dr.run) return;
  if (act === 'potion') { drUsePotion(); return; }
  const run = dr.run;
  if (act === 'jump') { if (src) dr.jumpHeld.add(src); drJump(run); }
  else if (act === 'flutter') {   // タップモードのタップ（長押し）：バタ足だけ（ジャンプはしない）。指を離すまで浮く
    if (src) dr.jumpHeld.add(src);
    // 落ちているときはすぐ浮く。上がっているときは、いちばん高いところで浮く（指を置いている間 = dr.jumpHeld）
    if (!run.onGround && run.vy <= 0 && run.flutterLeft > 0 && !run.fluttering && run.y > 0) drStartFlutter(run);
  }
  else if (act === 'slide') drSlide(run);
  else if (act.startsWith('skill')) drUseSkill(run, +act.slice(5));
}

/* 画面のボタン（data-dr）の処理 */
function drUiAction(act, el) {
  drSound('select');
  switch (act) {
    case 'start': drStartGame(); break;
    case 'ranking': drShowRanking(); break;
    case 'howto': drSetMode('howto'); drHowtoOpen(); break;
    case 'howto-prev': drHowtoMove(-1); break;     // あそびかた（dinorun-howto.js）
    case 'howto-next': drHowtoMove(1); break;
    case 'howto-tab': drHowtoTab(el.dataset.tab); break;
    case 'title': drShowTitle(); break;
    case 'pause': if (dr.mode === 'play') drPause(); break;
    case 'resume': drResume(); break;
    case 'quit': drBgm(null); dr.run = null; drShowTitle(); break;
    case 'shop-close': drCloseShop(); break;
    case 'reroll': drReroll(); break;
    case 'retry': drStartGame(); break;
    case 'sound': drToggleSound(); break;
    case 'buy': drBuy(+el.dataset.index); break;
    case 'pick-slot': drPickSlot(el.dataset.slot === 'bench' ? 'bench' : +el.dataset.slot); break;
    case 'pick-cancel': drPickCancel(); break;      // スキルのボタン選びをやめる（買う前に戻す）
    case 'shop-undo': drShopUndoAll(); break;       // 購入キャンセル（ショップに入ったときに戻す）
    case 'swap-slot': drSwapSelect(+el.dataset.slot); break;
    case 'over-next': drAfterResult(); break;
    case 'tab-month': drSetRankTab('month'); break;
    case 'tab-all': drSetRankTab('all'); break;
    case 'entry-up': drEntryChange(+el.dataset.i, 1); break;
    case 'entry-down': drEntryChange(+el.dataset.i, -1); break;
    case 'entry-ok': drEntrySubmit(); break;
    case 'entry-skip': drShowTitle(); break;
    case 'potion': drUsePotion(); break;
    case 'phase-next': if (dr.mode === 'phaseResult') drEndPhase('win'); break;
    case 'debug-battle': drDebugBattle(); break;
    case 'debug-note': dr.noteSound = !dr.noteSound; if (el) el.style.opacity = dr.noteSound ? '' : '0.4'; break;   // テスト用：拍とノーツの音のオン・オフ
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
  root.classList.toggle('dr-menu-open', !['play', 'ready', 'dying', 'phase'].includes(mode));
  // タイトル以外のメニューを出している間（スマホではヘッダーの上に重ねる。dinorun.css の body.dr-modal）
  document.body.classList.toggle('dr-modal', dr.active && !['play', 'ready', 'dying', 'title', 'phase'].includes(mode));
}

function drShowTitle() {
  drCleanupPhase();
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
    gateCount: 0,          // その区画を出した回数（はじめの DR_CONFIG.gateHintCount 回は札を出す）
    potion: 0,             // 持っている回復薬の数（1個まで。ハートの横のボタン・Q キーで使う。フェイズ中も使える）
    encounter: null,       // このワールドで出す入り口の敵 { def, at（m） }（出さないときは null）
    bosses: 0,             // フェイズで倒したボスの数
    bossScore: 0,          // フェイズで倒したボスのスコアの合計（スコアに足す）
    lives: DR_CONFIG.startLives,
    maxLives: DR_CONFIG.startLives,   // 最大ライフ（回復薬はここまで回復する）
    deathBy: null,         // 最後にぶつかった障害物（ゲームオーバーの原因の表示に使う）
    deathTip: '',          // ゲームオーバーの画面に出すヒント（ボスに負けたとき。dinorun-rpg.js の drRpgLose）
    lastPit: null,         // いま落ちかけている穴
    tutStep: 0,            // チュートリアルの、次に出す番号（DR_TUTORIAL.steps）
    invincibleTime: DR_CONFIG.invincibleTime,
    invT: 0,               // 無敵の残り時間
    stumbleT: 0,           // 「おっとと」とよろけている残り時間（drStumble）
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
    rpgArea: null,         // RPGエリアの間 { until: このワールド（worldIndex）に入ったらおわり }
    beat: 0,               // 走り始めてから何拍目か（4分音符。drBeatTick が進める）
    nextObsBeat: null,     // 次の障害物が恐竜君のところに着く拍（8分音符の番号。drUpdate が決める）
    worldIndex: 0,         // いま何ワールド目か（0 から。画面の「WORLD 1」は worldIndex + 1）
    worldId: DR_DESIGN.firstWorld,   // いまのワールド（DR_WORLDS / DR_DESIGN.worlds の id）
    nextWorldAt: DR_CONFIG.worldLength,
    worldFx: null,         // ワールド移動の演出中
    calmT: 0,              // 障害物を出さない残り時間
    deadT: 0,
    token: null,           // ランキングの受付番号
  };
}

function drStartGame() {
  drSound('start');
  drCleanupPhase();
  dr.run = drNewRun();
  dr.jumpHeld.clear();
  dr.phaseBlend = null; dr.phaseResultT = 0;
  DRRanking.startSession().then(tok => { if (dr.run) dr.run.token = tok; });
  drBgm(drRunBgm(dr.run));
  drShowBanner(drWorld(dr.run).name, 'WORLD 1', drWorldFeature(dr.run));
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
  if (dr.mode !== 'play' && dr.mode !== 'ready' && dr.mode !== 'phase') return;
  dr.pauseFrom = dr.mode === 'ready' ? dr.readyNext : dr.mode;   // フェイズ中に止めたら、フェイズに戻る
  drSetMode('pause');
}
function drResume() {
  if (dr.mode !== 'pause') return;
  drStartReady(dr.pauseFrom === 'phase' && dr.phase ? 'phase' : 'play', DR_CONFIG.resumeCountSec);
}

/* ---------- ループ ---------- */
function drLoop(now) {
  if (!dr.active) { dr.raf = 0; return; }
  dr.raf = requestAnimationFrame(drLoop);
  let dt = (now - dr.lastT) / 1000;
  dr.lastT = now;
  if (dt > 0.05) dt = 0.05;    // 重くなったときにワープしないように
  if (dr.tapTick) dr.tapTick();   // タップモード：指を置いたまま待つ時間が過ぎたらジャンプ（drBindTapArea）
  if (dt < 0) dt = 0;
  dr.clock += dt;

  if (dr.run && (dr.mode === 'play' || dr.mode === 'phase' || dr.mode === 'phaseResult')) drBeatTick(dr.run, dt);   // 拍の時計（止まっている間は進めない）
  if (dr.mode === 'play') drUpdate(dr.run, dt);
  else if ((dr.mode === 'phase' || dr.mode === 'phaseResult') && dr.phase) dr.phase.impl.update(dt);   // 結果の画面のうしろでも、走りつづける
  // フェイズの結果の画面：決まった秒数が過ぎたら、自動でノーマルフェイズへ（drShowPhaseResult の autoSec）
  if (dr.mode === 'phaseResult' && dr.phaseResultT > 0) {
    dr.phaseResultT -= dt;
    if (dr.phaseResultT <= 0) drEndPhase('win');
  }
  // RPGフェイズからノーマルフェイズへのフェードチェンジ（drEndPhase）。バトルの背景も走ったぶん流しつづける
  if (dr.phaseBlend && dr.mode === 'play' && dr.run) {
    dr.phaseBlend.t += dt; dr.phaseBlend.runX += dr.run.speed * dt;
    if (dr.phaseBlend.t >= dr.phaseBlend.dur) dr.phaseBlend = null;
  }
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
function drWorld(run) { return run.bonus ? DR_BONUS_WORLD : (DR_WORLDS.find(w => w.id === run.worldId) || DR_WORLDS[0]); }
/* いまのワールドの設計（dinorun-design.js の DR_DESIGN.worlds の1件） */
function drWorldDesign(run) { return DR_DESIGN.worlds[run.worldId] || DR_DESIGN.worlds[DR_DESIGN.firstWorld] || {}; }
/* いまのワールドの特徴の文（ワールド名と一緒に出す） */
function drWorldFeature(run) { return run.bonus ? '' : (drWorldDesign(run).feature || ''); }
/* いまのワールドの番号の決まり（DR_DESIGN.progression の1行。最後の行は、それより先のワールドすべてに使う） */
function drProgress(run) { const P = DR_DESIGN.progression; return P[Math.min(run.worldIndex, P.length - 1)]; }
/* 次のワールドを抽選で決める（ワールド2から）。
   DR_DESIGN.worlds の中から、from がこのワールドの番号以下で、weight が 0 より大きく、いまのワールドとちがうものを、weight の重みで選ぶ */
function drPickNextWorld(run) {
  const no = run.worldIndex + 1;   // これから入るワールドの番号（worldIndex を増やしたあとに呼ぶ）
  const all = Object.keys(DR_DESIGN.worlds).map(id => ({ id, weight: DR_DESIGN.worlds[id].weight || 0, from: DR_DESIGN.worlds[id].from || 2 }))
    .filter(x => x.weight > 0 && DR_WORLDS.some(w => w.id === x.id));
  let cands = all.filter(x => x.from <= no && x.id !== run.worldId);
  if (!cands.length) cands = all.filter(x => x.id !== run.worldId);
  if (!cands.length) return run.worldId;
  return drPickWeighted(cands).id;
}
/* ---------- 拍（BPM） ----------
   run.beat … 走り始めてから何拍目か（4分音符で数える。小数つき）。BPM はそのときの場面で変わる（drBpm）。
   BGM が鳴っているときは、曲の拍（DR_DESIGN.bgmBeatStart 秒を拍の0とする）に少しずつそろえる。
   障害物（drUpdate）・ショップ（drSpawnShop）・ボスの攻撃（dinorun-rpg.js）が、この拍にタイミングを合わせる。 */
function drBpm(run) {
  if (dr.mode === 'phase' || dr.mode === 'phaseResult' || run.rpgArea) return DR_DESIGN.rhythm.rpgBpm;   // RPGフェイズ・RPGエリア
  return drProgress(run).bpm;                                 // ノーマル（ボーナスステージも、そのワールドと同じ）
}
function drBeatTick(run, dt) {
  const bpm = drBpm(run), before = run.beat || 0;
  run.beat = before + dt * bpm / 60;
  const a = drAudio.bgm;
  if (a && !a.paused && a.readyState >= 2) {
    const def = DR_SOUNDS[drAudio.bgmId] || {};
    const start = def.beatStart != null ? def.beatStart : DR_DESIGN.bgmBeatStart;
    const t = a.currentTime - start;
    if (t >= 0) {
      let diff = (t * bpm / 60 - run.beat) % 1;
      diff -= Math.round(diff);            // -0.5〜0.5 拍のずれ
      run.beat += diff * 0.2;              // いっぺんに飛ばず、少しずつ合わせる
    }
  }
  // テスト用のメトロノーム（&drbeat）
  if ((dr.metronome || dr.noteSound) && Math.floor(run.beat) > Math.floor(before)) drSound(Math.floor(run.beat) % 4 === 0 ? 'beatTop' : 'beat');
}
/* t 秒のあいだに走る距離（px）。走る速さはだんだん上がる（speedAccel）ので、そのぶんも足す（拍とずれないように） */
function drTravel(run, t) {
  const C = DR_CONFIG;
  if (run.bonus || run.speed >= C.speedMax) return run.speed * t;
  const tUp = Math.min(t, (C.speedMax - run.speed) / C.speedAccel);   // 最高速になるまでの時間
  return run.speed * t + C.speedAccel * tUp * (t - tUp / 2);
}
/* いま拍に合っているか（RPGエリアのリズム技。DR_DESIGN.rpgArea の note・window） */
function drOnBeat(run) {
  const A = DR_DESIGN.rpgArea, note = A.note || 4;
  const pos = run.beat * note / 4;
  return Math.abs(pos - Math.round(pos)) * 240 / note / drBpm(run) <= A.window;
}

/* ---------- RPGエリア（RPGフェイズに勝ったあと。DR_DESIGN.rpgArea） ---------- */
function drStartRpgArea(run) {
  run.rpgArea = { until: run.worldIndex + (DR_DESIGN.rpgArea.worlds || 2), from: drMeters(run) };
  drShowBanner('RPG AREA', 'SPECIAL', DR_DESIGN.rpgArea.feature);
}
/* ワールドが切りかわったとき：決めたワールドまで来たら、RPGエリアをおわる */
function drCheckRpgAreaEnd(run) {
  if (run.rpgArea && run.worldIndex >= run.rpgArea.until) run.rpgArea = null;
}
/* いま流す BGM（RPGエリアの間は RPG の BGM が鳴りつづける）。
   投稿された BGM（assets.json の bgm）は、ワールドの番号ごと（world1〜world5。5は5以降）。BPM が番号ごとに決まっているため */
function drRunBgm(run) {
  if (run.rpgArea && typeof DR_RPG !== 'undefined') return DR_RPG.bgm || null;
  if (run.bonus) return drWorld(run).bgm || null;
  const stage = 'bgm_world' + Math.min(run.worldIndex + 1, 5);
  return DR_SOUNDS[stage] ? stage : drWorld(run).bgm;
}

/* フェイズのあいだ、走りつづける（RPGフェイズは走りながら戦う）。距離は進むが、ワールド・ショップ・入り口の敵などの位置は
   そのぶん先へずらす（＝フェイズのあいだにワールドは進まない）。dinorun-rpg.js の update から呼ぶ */
function drPhaseRunForward(run, dt) {
  const move = run.speed * dt, m = move / DR_CONFIG.pxPerMeter;
  run.dist += move;
  run.nextWorldAt += m;
  run.nextShopAt += m;
  if (run.nextHardAt) run.nextHardAt += m;
  if (run.encounter) run.encounter.at += m;
  return move;
}

/* 障害物などが「着いた」とみなす位置（恐竜君の真ん中）。ダッシュで前に出ても動かさない */
function drArriveX() { return DR_CONFIG.playerX + 12; }

/* 新しいワールドに入ったときの「ライフ+1」（DR_DESIGN.lifeUpWorlds のワールドだけ）。
   減っていれば1回復、満タンならハートの枠が1つ増えて回復する */
function drWorldLifeUp(run) {
  if (!(DR_DESIGN.lifeUpWorlds || []).includes(run.worldIndex + 1)) return;
  const full = run.lives >= run.maxLives;
  if (full) run.maxLives++;
  run.lives = Math.min(run.maxLives, run.lives + 1);
  drFloatText(run, full ? 'MAX LIFE +1' : 'LIFE +1', drPX(run) - 4, DR_CONFIG.groundY - run.y - 40, '#FF5A7A');
  run.effects[run.effects.length - 1].life = 2;   // ワールド名の演出と重なるので、ふつうより長く出す
  drSparkle(run, drPX(run) + 12, DR_CONFIG.groundY - run.y - 12, '#FF5A7A', 10);
  drSound('potion');
  drUpdateHud(true);
}
function drMeters(run) { return run.dist / DR_CONFIG.pxPerMeter; }
function drScore(run) {
  const C = DR_CONFIG;
  return Math.floor(drMeters(run)) + run.coinsPicked * C.scoreCoin + run.kills * C.scoreKill
    + run.grazes * C.scoreGraze + run.slides * C.scoreSlide + (run.bossScore || 0);
}
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
  if (run.stumbleT > 0) run.stumbleT = Math.max(0, run.stumbleT - dt);
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
        run.worldId = drPickNextWorld(run);   // ワールド2からは抽選（dinorun-design.js）
        drCheckRpgAreaEnd(run);
        drRollEncounter(run);
        drWorldLifeUp(run);
      }
      const w = drWorld(run);
      drShowBanner(w.name, run.bonus ? 'BONUS STAGE' : 'WORLD ' + (run.worldIndex + 1) + (run.rpgArea ? '・RPG AREA' : ''), drWorldFeature(run));
      drBgm(drRunBgm(run));
    }
    if (run.worldFx.t >= run.worldFx.dur) run.worldFx = null;
  }

  // --- ズームアウト（速くなると、前が広く見える） ---
  run.zoom = drZoomFor(run.speed);

  // --- RPGエリア：いつもコンボの状態。リズム技の居合切りは、拍ごとにあと何回か切る ---
  if (run.rpgArea) run.comboT = C.diveComboTime;
  if (run.rhythmSlash) {
    const rs = run.rhythmSlash;
    if (rs.left <= 0) run.rhythmSlash = null;
    else if (run.beat * rs.note / 4 >= rs.next) { rs.next++; rs.left--; drSlashCut(run, rs.skill, rs.dash); }
  }

  // --- テスト用：ノーツの音（障害物・ショップの真ん中が、恐竜君の真ん中を通った瞬間に鳴らす。♪ボタン） ---
  if (dr.noteSound) {
    const ax = drArriveX();
    for (const o of run.obstacles) {
      if (o.noted || o.def.id === 'gate_roof') continue;
      if (o.x + o.w / 2 <= ax) {
        o.noted = true;
        if (run.notedGroup !== o.group) { run.notedGroup = o.group; drSound('note'); dr.noteFlash = 0.12; }
      }
    }
    const sh = run.shopIcon;
    if (sh && !sh.noted && sh.x + DR_PICKUPS.shop.w / 2 <= ax) { sh.noted = true; drSound('note'); dr.noteFlash = 0.12; }
  }
  if (dr.noteFlash > 0) dr.noteFlash -= dt;

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
  // 障害物は「何拍目（8分音符で数える）に恐竜君のところへ着くか」を先に決めて、ちょうどその拍に着く位置に出す。
  //   run.nextObsBeat … 次の障害物が着く拍（8分音符の番号）
  //   run.nextObstacleIn … この距離（px）を走るまでは出さない（ショップの後・バトルの後など）
  {
    const note = DR_DESIGN.rhythm.obstacleNote || 8;
    const unit = 240 / note / drBpm(run);                    // 1音符の長さ（秒）
    const now = run.beat * note / 4;                          // いま何音符目か
    if (run.nextObsBeat == null || run.nextObsBeat < now) run.nextObsBeat = Math.ceil(now) + drObstacleGapNotes(run);
    const lead = drTravel(run, (run.nextObsBeat - now) * unit); // 着くまでに走る距離（px）
    if (lead <= drViewW(run) + 96 - drArriveX()) {                // 画面の外（右）に出せる距離まで来たら出す
      let extra = 0;   // 長い障害物（スキルの区画）を出したら、その長さのぶん次をあける
      if (run.nextObstacleIn <= 0 && run.calmT <= 0 && !shopSoon && !run.bonus && !tutorial) extra = drSpawnObstacle(run, drArriveX() + lead) || 0;
      run.nextObsBeat += drObstacleGapNotes(run) + Math.ceil(extra / run.speed / unit);
    }
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
    // 入り口の敵：触れたらフェイズが始まる（スピン中・無敵中でも）
    if (o.def.encounter) {
      if (drOverlap(pb, drObstacleBox(o))) { drStartPhase(o.def.encounter, o); return; }
      continue;
    }
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
   DR_CONFIG.slashCoinDrop 個のコインが、障害物のあった場所から前のほうへ飛んで、地面の少し上に落ちる。
   落ちたあとは流れてくるので、そのまま走っていれば拾える（自機の頭の上を越えて取りこぼさないように、低めに前へ飛ばす） */
function drDropCoins(run, o) {
  const C = DR_CONFIG, ob = drObstacleBox(o);
  const y = Math.min(ob.y + ob.h, C.groundY) - 12;
  for (let i = 0; i < C.slashCoinDrop; i++) {
    run.coins.push({ x: ob.x + ob.w / 2 - 4 + i * 5, y, taken: false, pop: true, vx: run.scroll + drRand(50, 130), vy: -drRand(70, 120) });
  }
}

/* ---------- 火の玉 ---------- */
function drUpdateShots(run, dt) {
  for (const s of run.shots) {
    const step = s.speed * dt;
    s.x += step; s.dist += step; s.t += dt;
    if (s.vy) s.y += s.vy * dt;   // ななめに飛ぶ火の玉（リズム技の 3way）
    const box = { x: s.x - s.r, y: s.y - s.r, w: s.r * 2, h: s.r * 2 };
    for (const o of run.obstacles) {
      if (o.dead || o.def.pit || o.def.encounter || s.hit.has(o) || !drOverlap(box, drObstacleBox(o))) continue;
      s.hit.add(o);
      if (s.blue) { drKillObstacle(run, o); continue; }                // 青：なんでも消す
      if (o.def.breakable === false) { s.done = true; break; }          // 赤：壊せないものに当たったら消える
      drKillObstacle(run, o);
      if (--s.pierce <= 0) { s.done = true; break; }
    }
    if (s.blue && Math.random() < 0.9) run.effects.push({ type: 'dot', x: s.x - s.r, y: s.y + drRand(-s.r, s.r), vx: -40, t: 0, life: 0.25, color: '#9FE8FF' });
    if (s.dist > s.range || s.x - s.r > drViewW(run) || s.y + s.r < DR_CONFIG.height - DR_CONFIG.height / (run.zoom || 1)) s.done = true;
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

/* 次の障害物までの間隔（8分音符いくつ）。ワールドの番号ごとの範囲（DR_DESIGN.progression）から選んで、
   ワールドの gapMult（チルワールドは広い など）をかける。拍にそろえるので整数 */
function drObstacleGapNotes(run) {
  const p = drProgress(run);
  const n = p.gapMin + Math.floor(Math.random() * (p.gapMax - p.gapMin + 1));
  return Math.max(1, Math.round(n * (drWorldDesign(run).gapMult || 1)));
}

/* 障害物を1つ出す（長いものを出したときは、その長さを返す）。
   cx … 障害物の真ん中を置く位置（ここから走ってきて、ちょうど拍のときに恐竜君の真ん中を通る） */
function drSpawnObstacle(run, cx) {
  const C = DR_CONFIG;
  const meters = drMeters(run);
  // 入り口の敵（このワールドで出ると決まっていて、その距離まで来たら出す）
  if (run.encounter && meters >= run.encounter.at) {
    const def = drEncounterObstacle(run.encounter.def);
    run.encounter = null;
    run.obstacles.push(drMakeObstacle(def, Math.round(cx - def.w / 2), C.groundY - def.h, ++run.groupSeq));
    return def.w;
  }
  // スキルを使わないと通れない区画（hardFromWorld ワールド目から、hardGapMin〜Max m ごと）
  if (run.worldIndex + 1 >= C.hardFromWorld) {
    if (!run.nextHardAt) run.nextHardAt = meters + drRand(60, 160);
    else if (meters >= run.nextHardAt) {
      const len = drSpawnGate(run, cx);
      if (len) { run.nextHardAt = meters + drRand(C.hardGapMin, C.hardGapMax); return len; }
    }
  }
  // 出る障害物と出やすさは、ワールドごとに dinorun-design.js（設計書「障害物の出やすさ」）で決める
  const table = drWorldDesign(run).obstacles || {};
  const cands = DR_OBSTACLES.filter(o => table[o.id] > 0
    && (o.minMeter || 0) <= meters
    && (!o.fly || meters >= C.flyingFromMeter)).map(o => ({ def: o, weight: table[o.id] }));
  if (!cands.length) return;
  const def = drPickWeighted(cands).def;
  const x0 = Math.round(cx - def.w / 2);
  const group = ++run.groupSeq;
  if (def.pit) { const o = drAddPit(run, def, x0, group); o.x = Math.round(cx - o.w / 2); return o.w; }   // 穴は幅が決まってから真ん中をそろえる
  if (def.fly) {
    const lift = def.fly[Math.floor(Math.random() * def.fly.length)];
    run.obstacles.push(drMakeObstacle(def, x0, DR_CONFIG.groundY - lift - def.h, group));
    return;
  }
  // 地面のもの：小さいものは、ときどき2〜3個つながって出る
  let count = 1;
  if (def.h <= 24 && Math.random() < drProgress(run).cluster) count = Math.random() < 0.4 ? 3 : 2;   // 確率は DR_DESIGN.progression
  for (let i = 0; i < count; i++) {
    run.obstacles.push(drMakeObstacle(def, x0 + i * (def.w + 2), DR_CONFIG.groundY - def.h, group));
  }
}
/* スキルを使わないと通れない区画：下りているシャッター（gate_roof）の下に、壊せるかべ（gate_wall）。
   居合切り・スピンアタック・火の玉のどれかがスキルボタンに入っていて、かべに着くまでに使えるようになるときだけ出す。
   出したら長さを返す（出さなかったら 0）。cx … かべの真ん中を置く位置（拍にそろえる） */
function drSpawnGate(run, cx) {
  const C = DR_CONFIG;
  const roof = DR_OBSTACLES.find(o => o.id === 'gate_roof'), wall = DR_OBSTACLES.find(o => o.id === 'gate_wall');
  if (!roof || !wall) return 0;
  const wallX = Math.round(cx - wall.w / 2);
  const x0 = wallX - (roof.w - wall.w - 18);
  const arrive = (wallX - (drPX(run) + 19)) / run.speed;     // かべに着くまでの秒数
  const ready = run.slots.some(id => id && ['slash', 'spin', 'fire'].includes(run.skills[id].action)
    && (run.cooldowns[id] || 0) <= arrive - 0.5);
  if (!ready) return 0;
  const group = ++run.groupSeq;
  const r = drMakeObstacle(roof, x0, C.groundY - roof.fly[0] - roof.h, group);
  r.hint = (run.gateCount || 0) < C.gateHintCount;   // はじめの何回かは「スキルをつかって！」の札を出す
  run.gateCount = (run.gateCount || 0) + 1;
  run.obstacles.push(r);
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
    drArcCoins(run, drViewW(run) + 6 + drArcWidth(run) / 2, Math.max(4, n));
    return;
  }
  const baseLift = [6, 30, 54][Math.floor(Math.random() * 3)];
  for (let i = 0; i < n; i++) {
    run.coins.push({ x: drViewW(run) + 6 + i * 13, y: C.groundY - baseLift - DR_PICKUPS.coin.h, taken: false });
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
  const xStart = drViewW(run) + 6;
  let x = xStart;
  const n = Math.floor(drRand(C.bonusTrailMin, C.bonusTrailMax + 1));
  for (let i = 0; i < n; i++) run.coins.push({ x: x + i * 12, y: C.groundY - 4 - ch, taken: false });
  x += n * 12 + 30;
  const air = 2 * C.jumpVelocity / C.gravity;   // ふつうのジャンプで、跳んでから着地するまでの秒数
  // 空中ジャンプ・バタ足を持っていたら、ときどき、それを使わないと取れない道すじにする
  const kinds = [];
  if (run.maxJumps >= 2) kinds.push('double');
  if (run.flutterTime > 0) kinds.push('flutter');
  const kind = kinds.length && Math.random() < C.bonusSpecialChance ? kinds[Math.floor(Math.random() * kinds.length)] : 'normal';
  const path = drJumpPath(run, kind);
  const total = path[path.length - 1].t;
  run.marks.push({ x, kind });
  const k = Math.round(C.bonusArcCoins * total / air);
  for (let i = 0; i < k; i++) {
    const tt = total * (i + 0.6) / (k + 0.2);
    const p = path[Math.min(path.length - 1, Math.round(tt / path.dt))];
    const lift = p.y + 10;                                  // 自機の体のまん中の高さ
    run.coins.push({ x: x + s * tt - 10, y: C.groundY - lift - ch / 2, taken: false });
  }
  return (x - xStart) + s * total + drRand(30, 70);
}

/* ジャンプの道すじ（ボーナスステージのコインを並べるのに使う）。[{ t: 秒, y: 足の高さ }] を返す
     'normal'  … ふつうのジャンプ
     'double'  … 落ちてきて DR_CONFIG.bonusDoubleAt の高さになったら、もう一度ジャンプ（空中ジャンプ）
     'flutter' … ボタンを押しっぱなしにして、てっぺんでバタ足して浮く（DR_CONFIG.bonusHoverMax 秒まで） */
function drJumpPath(run, kind) {
  const C = DR_CONFIG, v = C.jumpVelocity, g = C.gravity, dt = 1 / 120;
  const hoverTime = kind === 'flutter' ? Math.min(run.flutterTime || 0, C.bonusHoverMax) : 0;
  const pts = [];
  let y = 0, vy = v, t = 0, hover = -1, jumped2 = false;
  pts.dt = dt;
  for (let i = 0; i < 2000; i++) {
    pts.push({ t, y });
    t += dt;
    if (hover >= 0 && hover < hoverTime) { hover += dt; continue; }   // 浮いている
    const before = vy;
    vy -= g * dt;
    if (before > 0 && vy <= 0 && kind === 'flutter' && hover < 0) { vy = 0; hover = 0; }   // てっぺんで浮く
    y += vy * dt;
    if (kind === 'double' && !jumped2 && vy < 0 && y <= C.bonusDoubleAt) { vy = v * 0.92; jumped2 = true; }   // 落ちてきたら2回目のジャンプ
    if (y <= 0) { pts.push({ t, y: 0 }); break; }
  }
  return pts;
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
  const x0 = drViewW(run) + 6;
  let cx = null;              // コインを並べる目安（最初の障害物のまん中）
  const list = st.obstacle ? (Array.isArray(st.obstacle) ? st.obstacle : [st.obstacle]) : [];
  list.forEach((item, i) => {
    const id = typeof item === 'string' ? item : item.id;
    const def = DR_OBSTACLES.find(o => o.id === id);
    if (!def) return;
    const group = ++run.groupSeq;
    let mid;
    if (def.pit) { const o = drAddPit(run, def, x0, group); mid = x0 + o.w / 2; }
    else {
      const lift = item.lift !== undefined ? item.lift : (i === 0 && st.lift !== undefined ? st.lift : (def.fly ? def.fly[0] : 0));
      // 2つ目からは、最初の障害物のまん中にそろえる
      const x = cx === null ? x0 : cx - def.w / 2;
      run.obstacles.push(drMakeObstacle(def, x, C.groundY - lift - def.h, group));
      mid = x + def.w / 2;
    }
    if (cx === null) cx = mid;
  });
  if (cx === null) cx = x0 + 20;
  const ch = DR_PICKUPS.coin.h;
  if (st.coins === 'arc') drArcCoins(run, cx, 5);
  else if (st.coins === 'ground') for (let i = 0; i < 5; i++) run.coins.push({ x: cx - 40 + i * 18, y: C.groundY - 4 - ch, taken: false });
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
  // 障害物が自機に近づいたら、まどをうすくして、うしろの障害物・コインが見えるようにする
  const near = !!st && dr.run.obstacles.some(o => !o.dead && o.x < DR_CONFIG.width * 0.55 && o.x + o.w > 0);
  el.classList.toggle('is-faint', near);
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
  // 拍の頭（DR_DESIGN.rhythm.shopNote の音符）で、ショップの真ん中が恐竜君の真ん中に着くように、出す位置を少し右にずらす
  const note = DR_DESIGN.rhythm.shopNote || 4, unit = 240 / note / drBpm(run);
  const cx0 = drViewW(run) + 8 + DR_PICKUPS.shop.w / 2;
  const at = run.beat * note / 4 + (cx0 - drArriveX()) / run.speed / unit;   // そのまま出したら何音符目に着くか（だいたい）
  const cx = drArriveX() + drTravel(run, (Math.ceil(at) - run.beat * note / 4) * unit);
  run.shopIcon = { x: Math.round(cx - DR_PICKUPS.shop.w / 2), y, baseY: y };
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
  if (!id) { drStumble(run); return; }
  if ((run.cooldowns[id] || 0) > 0) { drStumble(run); return; }   // クールタイム中：おっとと
  const skill = run.skills[id];
  const fn = DR_SKILL_ACTIONS[skill.action];
  if (!fn) return;
  // RPGエリア：いつもコンボの状態（drUpdate）。さらに、拍に合わせて出すと、もう1段強くなる（リズム技。
  //   居合切りは拍ごとに3回、火の玉は 3way、スピンは長く遠く。数値は DR_DESIGN.rpgArea。動きは DR_SKILL_ACTIONS が run.rhythmBoost を見て変える）
  const rhythm = !!run.rpgArea && drOnBeat(run);
  if (run.rpgArea) run.comboT = Math.max(run.comboT, 0.05);
  run.rhythmBoost = rhythm;
  const used = fn(run, skill);
  run.rhythmBoost = false;
  if (used === false) return;   // 使えなかった（空振りにしない）
  if (rhythm) { drFloatText(run, 'RHYTHM!', drPX(run) - 4, DR_CONFIG.groundY - run.y - 40, '#FF7AE0'); drSound('charge'); }
  run.cooldowns[id] = skill.cooldown * (run.rpgArea ? (DR_DESIGN.rpgArea.ctMult || 1) : 1);   // RPGエリアの間はクールタイムが短い
}

/* クールタイム中（または空き）のスキルを使おうとした：恐竜君が「おっとと」とよろける（見た目だけ。動きは変わらない） */
function drStumble(run) {
  if (run.stumbleT > DR_CONFIG.stumbleTime * 0.6) return;   // よろけ始めたばかりなら、やり直さない（連打で音が鳴りっぱなしにならないように）
  run.stumbleT = DR_CONFIG.stumbleTime;
  drSound('oops');
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

/* ---------- 回復薬（1個まで持てる。いつでも使える） ----------
   ノーマルフェイズ … ハートが最大まで回復（ハートが減っていないときは使わない）
   フェイズ中      … そのフェイズの press('potion') が使う（RPG なら HP が全回復） */
function drUsePotion() {
  const run = dr.run;
  if (!run || !(run.potion > 0)) return;
  if (dr.mode === 'phase' && dr.phase) { dr.phase.impl.press('potion'); return; }
  if (dr.mode !== 'play') return;
  if (run.lives >= run.maxLives) { drFloatText(run, 'FULL', drPX(run) + 4, DR_CONFIG.groundY - run.y - 34, '#FFFFFF'); return; }
  run.potion = 0;
  run.lives = run.maxLives;
  drSparkle(run, drPX(run) + 12, DR_CONFIG.groundY - run.y - 12, '#7FFFD4', 10);
  drSound('potion');
  drUpdateHud(true);
}

/* ---------- フェイズ（入り口の敵・切りかえ・戻り方。中身は DR_PHASES。上の「★拡張予定: フェイズ」を参照） ---------- */
/* ワールドが切りかわったとき、このワールドで入り口の敵を出すか決める（1ワールドに1体まで） */
function drRollEncounter(run) {
  run.encounter = null;
  if (typeof DR_ENCOUNTERS === 'undefined') return;
  const world = run.worldIndex + 1;
  for (const enc of DR_ENCOUNTERS) {
    if (world < (enc.fromWorld || 1) || !DR_PHASES[enc.phase]) continue;
    if (run.rpgArea && enc.phase !== 'rpg') continue;   // RPGエリアの間は、RPGフェイズに入るアイコンだけ
    if (Math.random() < enc.chance) {
      const start = run.nextWorldAt - DR_CONFIG.worldLength;   // このワールドが始まった距離（m）
      run.encounter = { def: enc, at: start + DR_CONFIG.worldLength * drRand(0.25, 0.75) };
      return;
    }
  }
}
/* 入り口の敵を、障害物と同じ形にしたもの（当たり判定・描画は障害物のしくみを使う） */
function drEncounterObstacle(enc) {
  if (!enc.obstacleDef) {
    enc.obstacleDef = { id: enc.id, name: enc.name, w: enc.w, h: enc.h, fly: null, breakable: false, encounter: enc, sprite: enc.sprite };
  }
  return enc.obstacleDef;
}
/* テスト用：プレイ中にすぐバトルを始める（URL に &drdebug を付けたときだけ。B キーか「⚔」ボタン）。
   4ワールド目までなら、5ワールド目として戦う（本番と同じ強さで試せるように） */
function drDebugBattle() {
  const run = dr.run;
  if (!dr.debug || !run || dr.mode !== 'play' || typeof DR_ENCOUNTERS === 'undefined') return;
  if (run.worldIndex < 4) run.worldIndex = 4;
  drStartPhase(DR_ENCOUNTERS[0]);
}

/* フェイズを始める（入り口の敵に触れたとき） */
function drStartPhase(enc, obstacle) {
  const run = dr.run, impl = enc && DR_PHASES[enc.phase];
  if (!run || !impl) return;
  if (obstacle) run.obstacles = run.obstacles.filter(o => o !== obstacle);
  dr.jumpHeld.clear();
  dr.phase = { type: enc.phase, enc, impl };
  document.getElementById('dr-root').classList.add('dr-in-phase');
  dr.uiCache = {};
  impl.start(run, enc);
  drSetMode('phase');
}
/* フェイズを終える。outcome: 'win'（ハート全回復）/ 'escape'（ハートが 1）/ 'lose'（ゲームオーバー） */
function drEndPhase(outcome) {
  const run = dr.run, C = DR_CONFIG;
  if (!run || !dr.phase) return;
  // 勝ったときは、フェードチェンジでバトルの背景を流しつづけるため、走ってきた距離を覚えておく
  const runX = (typeof drRpg !== 'undefined' && drRpg && drRpg.runX) || 0;
  drCleanupPhase();
  if (outcome === 'lose') {
    drBgm(null);
    drSound('gameover');
    drShowResult(run);
    return;
  }
  if (outcome === 'win') run.lives = run.maxLives;
  else if (outcome === 'escape') run.lives = 1;
  // その場から再開：画面の障害物を消して、少しのあいだ無敵・障害物なし
  run.obstacles = [];
  run.shots = [];
  run.invT = Math.max(run.invT, run.invincibleTime);
  run.calmT = Math.max(run.calmT, 3);
  run.nextObstacleIn = Math.max(run.nextObstacleIn, run.speed * 2);
  run.slideT = 0; run.ducking = false;
  dr.phaseResultT = 0;
  if (outcome === 'win') {
    // 勝ち：RPGエリアが始まる。恐竜君は走りつづけたまま、背景・床・恐竜君の位置と大きさが
    // フェードでノーマルフェイズのものに変わって、カウントダウンなしでそのままノーマルのゲームに戻る（境目をなくす）
    drStartRpgArea(run);
    drBgm(drRunBgm(run));
    drUpdateHud(true);
    run.y = 0; run.vy = 0; run.onGround = true;
    dr.phaseBlend = typeof drRpgDrawBg === 'function' ? { t: 0, dur: DR_DESIGN.rpgPhase.blendTime || 1.5, runX } : null;
    drSetMode('play');
    return;
  }
  drBgm(drRunBgm(run));
  drUpdateHud(true);
  drStartReady('play', C.resumeCountSec);
}
/* フェイズの後片づけ（ボタンの表示を元に戻す）。タイトルに戻るときなどにも呼ぶ */
function drCleanupPhase() {
  if (!dr.phase) return;
  const p = dr.phase;
  dr.phase = null;
  try { p.impl.end(); } catch (e) { /* 片づけに失敗してもゲームは続ける */ }
  const root = document.getElementById('dr-root');
  if (root) root.classList.remove('dr-in-phase');
  document.querySelectorAll('.dr-battle-row').forEach(el => { el.innerHTML = ''; });
  dr.uiCache = {};
}
/* フェイズの結果の画面（「つぎへ」で drEndPhase('win')）。autoSec を渡すと、その秒数で自動でつぎへ進む */
function drShowPhaseResult(title, html, autoSec) {
  document.getElementById('dr-pr-title').textContent = title;
  document.getElementById('dr-pr-detail').innerHTML = html;
  dr.phaseResultT = autoSec || 0;
  drSetMode('phaseResult');
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
  // 「購入キャンセル」で戻すための、ショップに入ったときの状態（drAfterShop のあとに取る＝次のショップの場所などは戻さない）
  dr.shop.opening = drShopSnapshot(run, dr.shop);
  dr.shop.changed = false;   // 何か買った・入れ替えた・リロールしたら true（「購入キャンセル」を押せるようになる）
  drSetMode('shop');
  drRenderShop();
}

/* ---------- ショップの「やりなおし」 ----------
   買い物の前の状態を写しておき、あとで戻す。使うところは2つ:
     ・「購入キャンセル」ボタン … ショップに入ったときの状態（dr.shop.opening）に全部戻す
     ・スキルを買ってボタンを選んでいるときの「キャンセル」 … そのスキルを買う前（dr.shop.pending）に戻す
   写すもの:
     ・run の数値・文字・true/false は全部（コイン・ライフ・ジャンプ回数・リロール回数・回復薬など。
       ショップの間はゲームが止まっているので、ショップ以外で変わるものはない）
     ・run の中の入れ物は、下の DR_SHOP_UNDO_KEYS に書いたものだけ（中身ごと写す）
     ・ショップの品ぞろえ・売り切れ・のこりリロール回数
   ★拡張予定: アイテムの apply() で run の中の「入れ物」（{ } や [ ]）を書き換えるようにしたら、
     その名前を DR_SHOP_UNDO_KEYS に足す（足さないと「購入キャンセル」で戻らない）。
     数値（run.xxx = 1 のようなもの）は自動で戻るので、足さなくてよい。 */
const DR_SHOP_UNDO_KEYS = ['levels', 'skills', 'cooldowns', 'slots', 'bench'];

function drShopSnapshot(run, shop) {
  const vals = {};
  Object.keys(run).forEach(k => { const v = run[k]; if (v === null || (typeof v !== 'object' && typeof v !== 'function')) vals[k] = v; });
  const boxes = {};
  DR_SHOP_UNDO_KEYS.forEach(k => { boxes[k] = JSON.parse(JSON.stringify(run[k])); });
  return { vals, boxes, offers: shop.offers.slice(), sold: shop.sold.slice(), rerollsLeft: shop.rerollsLeft };
}

function drShopRestore(run, shop, snap) {
  Object.keys(run).forEach(k => {   // あとから増えた数値は消す（写したときになかったもの）
    const v = run[k];
    if ((v === null || (typeof v !== 'object' && typeof v !== 'function')) && !(k in snap.vals)) delete run[k];
  });
  Object.assign(run, snap.vals);
  DR_SHOP_UNDO_KEYS.forEach(k => { run[k] = JSON.parse(JSON.stringify(snap.boxes[k])); });
  shop.offers = snap.offers.slice();
  shop.sold = snap.sold.slice();
  shop.rerollsLeft = snap.rerollsLeft;
  shop.picking = null; shop.pending = null; shop.pickIndex = null; shop.swapSel = null;
  dr.uiCache = {};   // スキルボタンの表示を作り直す
}

/* 「購入キャンセル」：ショップに入ったときの状態に戻す（買ったもの・入れ替え・リロールを全部なかったことにする） */
function drShopUndoAll() {
  const run = dr.run, shop = dr.shop;
  if (!run || !shop || !shop.opening || !shop.changed) return;
  drShopRestore(run, shop, shop.opening);
  shop.changed = false;
  drRenderShop();
  drUpdateHud(true);
}

/* スキルを買ってボタンを選んでいるときの「キャンセル」：そのスキルを買う前に戻す */
function drPickCancel() {
  const run = dr.run, shop = dr.shop;
  if (!run || !shop || !shop.picking || !shop.pending) return;
  const changed = shop.pending.changed;
  drShopRestore(run, shop, shop.pending);
  shop.changed = changed;
  drRenderShop();
  drUpdateHud(true);
}

/* 品ぞろえを入れ替える（パッシブ「リロール」を持っているときだけ。1回のショップで run.rerolls 回まで） */
function drReroll() {
  const run = dr.run, shop = dr.shop;
  if (!run || !shop || shop.picking || !(shop.rerollsLeft > 0)) return;
  shop.rerollsLeft--;
  shop.offers = drMakeOffers(run);
  shop.sold = [];
  shop.changed = true;
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
  // スキルは、ボタンを選ぶところで「キャンセル」できるように、買う前の状態を写しておく
  if (it.type === 'skill') { shop.pending = drShopSnapshot(run, shop); shop.pending.changed = shop.changed; }
  shop.changed = true;
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
      shop.picking = it.skill;     // どのボタンに入れるか選んでもらう（空きがあっても、控えにも入れられる）
      shop.pickDefault = empty;
      shop.pickIndex = index;      // このカードの「購入」ボタンが「キャンセル」になる
    } else shop.pending = null;
  } else if (typeof it.apply === 'function') {
    // リロールを買っても、このショップの「のこり」は増やさない（次のショップから使える。drOpenShop で run.rerolls 回になる）
    it.apply(run, it.requires ? run.skills[it.requires] : undefined);
  }
  drRenderShop();
  drUpdateHud(true);
}

/* 覚えたスキルを入れるボタンを選ぶ（0〜2 がボタン①〜③。入っていたスキルは「控え」に回る。'bench' で控えに入れる） */
function drPickSlot(slot) {
  const run = dr.run, shop = dr.shop;
  if (!run || !shop || !shop.picking) return;
  if (slot === 'bench') run.bench.push(shop.picking);
  else {
    const old = run.slots[slot];
    if (old) run.bench.push(old);
    run.slots[slot] = shop.picking;
  }
  shop.picking = null; shop.pending = null; shop.pickIndex = null;
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
    shop.changed = true;
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
      const picking = shop.picking && shop.pickIndex === i;   // いまボタンを選んでいるスキル（購入ボタンが「キャンセル」になる）
      const lvText = it.type === 'skill' ? 'NEW スキル' : it.consumable ? '1回きり' : (sold ? `Lv.${lv} / ${max}` : `Lv.${lv} → ${lv + 1} / ${max}`);
      const icon = it.image ? `<img src="${it.image}" alt="">` : (it.icon || '★');
      const can = !sold && !shop.picking && wallet >= price;
      if (picking) {
        return `<div class="dr-card is-picking">
          <div class="dr-card-icon">${icon}</div>
          <div class="dr-card-name">${it.name}</div>
          <div class="dr-card-lv">${lvText}</div>
          <div class="dr-card-desc">${it.desc || ''}</div>
          <button type="button" class="dr-card-buy is-cancel" data-dr="pick-cancel"><span class="dr-key">Esc</span>キャンセル</button>
        </div>`;
      }
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
       </button>`).join('')
      // 控え：ボタンには入れずにしまっておく（あとで下の「スキルボタン」の入れ替えで使える）
      + `<button type="button" class="dr-pick-btn is-bench" data-dr="pick-slot" data-slot="bench">
         <span class="dr-key">F</span>控え<small>あとで入れ替え</small>
       </button>`;
  }
  document.getElementById('dr-shop-close').disabled = !!shop.picking;
  document.getElementById('dr-shop-undo').disabled = !!shop.picking || !shop.changed;
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
  run.final = { score, meters, coins: run.coinsPicked, kills: run.kills, grazes: run.grazes, slides: run.slides,
    bosses: run.bosses || 0, bossScore: run.bossScore || 0, durationMs: Math.round(run.t * 1000) };
  document.getElementById('dr-res-score').textContent = score.toLocaleString();
  document.getElementById('dr-res-cause').textContent = drDeathText(run);
  document.getElementById('dr-res-tip').textContent = run.deathTip || '';
  const C = DR_CONFIG;
  // かすり・スライディングは、スコアに入るとき（scoreGraze・scoreSlide が 0 より大きい）だけ計算の行を出す
  document.getElementById('dr-res-detail').innerHTML =
    `きょり ${meters}m<br>コイン ${run.coinsPicked}こ × ${C.scoreCoin}<br>こわした ${run.kills}こ × ${C.scoreKill}`
    + (C.scoreGraze ? `<br>かすり ${run.grazes}かい × ${C.scoreGraze}` : '')
    + (C.scoreSlide ? `<br>スライディング ${run.slides}かい × ${C.scoreSlide}` : '')
    + (run.bosses ? `<br>たおしたボス ${run.bosses}たい（+${run.bossScore.toLocaleString()}）` : '')
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
    token: run.token, name, score: f.score, distance: f.meters, coins: f.coins, kills: f.kills, grazes: f.grazes, slides: f.slides,
    bosses: f.bosses, bossScore: f.bossScore, durationMs: f.durationMs,
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
  // 回復薬を持っているときだけ、ハートの横にボタンを出す
  const pot = document.getElementById('dr-potion');
  if (pot && (force || dr.uiCache.potion !== run.potion)) { dr.uiCache.potion = run.potion; pot.hidden = !(run.potion > 0); }
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
  // フェイズ中は、そのフェイズがボタンの表示を決める
  if (dr.phase && run) { dr.phase.impl.pads(); return; }
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
    // タップエリアの、スワイプの向きの文字（スキルの短い名前。クールタイム中・空きはうすく）
    document.querySelectorAll(`.dr-tap-hint[data-slot="${i}"]`).forEach(h => {
      h.querySelector('.dr-tap-name').textContent = skill ? skill.label : 'スキル' + '①②③'[i];
      h.classList.toggle('is-off', !ready);
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
    document.querySelectorAll('.dr-tap-area').forEach(a => a.classList.toggle('has-dive', !!dive));
  }
  // タップエリアの「長押しでバタ足」は、バタ足ジャンプを覚えたら出す
  const flutter = !!(run && run.flutterTime > 0);
  if (dr.uiCache.flutter !== flutter) {
    dr.uiCache.flutter = flutter;
    document.querySelectorAll('.dr-tap-area').forEach(a => a.classList.toggle('has-flutter', flutter));
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
    { id: 'rpgArea', label: 'RPG', left: run.rpgArea ? Math.max(0, (run.nextWorldAt + (run.rpgArea.until - run.worldIndex - 1) * DR_CONFIG.worldLength) - drMeters(run)) : 0,
      total: (DR_DESIGN.rpgArea.worlds || 2) * DR_CONFIG.worldLength, color: '#FF7AE0' },   // RPGエリアの残り（m。だいたい）
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
function drShowBanner(name, sub, feature) {
  const el = document.getElementById('dr-banner');
  if (!el) return;
  // feature … ワールドの特徴（dinorun-design.js の feature）。ワールド名の下に小さく出す
  el.innerHTML = `<small>${sub}</small>${drEscape(name)}${feature ? `<span class="dr-banner-feat">${drEscape(feature)}</span>` : ''}`;
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

/* 壊せない障害物の縁取り。いまのコマの形（透明でないところ）を色でぬりつぶしたものを、まわりにずらして描く。
   内側（1ドット）は DR_CONFIG.unbreakableOutline、その外側（もう1ドット）は unbreakableOutline2 */
const drOutlineCache = new Map();
function drDrawOutline(ctx, o) {
  const C = DR_CONFIG, d = o.def, sp = d.sprite;
  if (!sp) return;
  const t = dr.clock + o.t0, fps = sp.fps || 0;
  const img = drImage(sp.image);
  const n = img ? (sp.frames || 1) : (Array.isArray(sp.pixels[0]) ? sp.pixels.length : 1);
  const f = fps ? Math.floor(t * fps) % n : 0;
  const key = d.id + ':' + f + ':' + (img ? 'i' : 'p');
  let sil = drOutlineCache.get(key);
  if (!sil) {
    // このコマを描いて、色でぬりつぶした形（2色ぶん）を作る
    const base = document.createElement('canvas'); base.width = d.w; base.height = d.h;
    const bx = base.getContext('2d'); bx.imageSmoothingEnabled = false;
    drDrawSprite(bx, sp, d.w, d.h, 0, 0, fps ? (f + 0.5) / fps : 0);
    const tint = col => {
      const c = document.createElement('canvas'); c.width = d.w; c.height = d.h;
      const x = c.getContext('2d'); x.drawImage(base, 0, 0);
      x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, d.w, d.h);
      return c;
    };
    sil = { a: tint(C.unbreakableOutline), b: C.unbreakableOutline2 ? tint(C.unbreakableOutline2) : null };
    drOutlineCache.set(key, sil);
  }
  const x = Math.round(o.x), y = Math.round(o.y);
  if (sil.b) for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, -1], [-1, 1], [1, 1]]) ctx.drawImage(sil.b, x + dx, y + dy);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.drawImage(sil.a, x + dx, y + dy);
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
  // 画面は renderScale 倍の細かさ。ここで倍率をかけるので、このあとの描く処理は 384 × 216 のつもりで書ける
  const rs = C.renderScale || 1;
  ctx.setTransform(rs, 0, 0, rs, 0, 0);
  ctx.imageSmoothingEnabled = false;
  // フェイズ中（一時停止・結果の画面・再開のカウントダウンも）は、そのフェイズが画面を描く
  if (dr.phase && (['phase', 'phaseResult'].includes(dr.mode) || (dr.mode === 'pause' && dr.pauseFrom === 'phase')
      || (dr.mode === 'ready' && dr.readyNext === 'phase'))) {
    ctx.save(); dr.phase.impl.render(ctx); ctx.restore();
    drDrawBeatDebug(ctx);
    return;
  }
  const run = dr.run || dr.demo;
  if (!run) return;
  ctx.save();
  if (dr.shake > 0) ctx.translate(Math.round(drRand(-2, 2)), Math.round(drRand(-2, 2)));
  const world = drWorld(run);
  drDrawSky(ctx, world);
  // ズームアウト：空以外を、画面の左下を中心に縮めて描く（右と上が広く見える。地面と恐竜君は左下に残る）
  const zoom = (dr.run && run.zoom) || 1;
  const zExtra = zoom < 1 ? Math.ceil(C.width / zoom - C.width) + 2 : 0;   // 右にはみ出して描く幅
  if (zoom < 1) { ctx.translate(0, C.height); ctx.scale(zoom, zoom); ctx.translate(0, -C.height); }
  // ボーナスステージ（下り坂）では、空以外を自機の足元を中心に傾けて描く
  const tilt = (run.tilt || 0) * Math.PI / 180;
  const tilted = Math.abs(tilt) > 0.001;
  if (tilted) {
    ctx.save();
    // 下り坂で地面が下がって見えにくくならないように、傾きに合わせて全体を上へ持ち上げる
    ctx.translate(0, -Math.round(C.bonusRaise * Math.min(1, Math.abs(run.tilt) / C.bonusTilt)));
    ctx.translate(C.playerX + 12, C.groundY);
    ctx.rotate(tilt);
    ctx.translate(-(C.playerX + 12), -C.groundY);
  }
  drDrawFar(ctx, world, run.dist, (tilted ? 90 : 0) + zExtra);
  // ワールド移動の光（背景だけを白くする。自機・地面・障害物はこのあとに描くので隠れない）
  if (run.worldFx) drDrawWorldFlash(ctx, run.worldFx);
  drDrawGround(ctx, world, run.dist, (tilted ? 90 : 0) + zExtra);
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
    // 壊せないもの（breakable: false）は、黒っぽい赤で縁取りして目立たせる（スキルの区画のシャッターは別の見た目なので付けない）
    if (o.def.breakable === false && !o.def.encounter && !/^gate_/.test(o.def.id) && C.unbreakableOutline) drDrawOutline(ctx, o);
    drDrawSprite(ctx, o.def.sprite, o.def.w, o.def.h, o.x, o.y, dr.clock + o.t0);
    const lb = o.def.label;   // 絵の上の文字（スキルの区画の「SKILL!」など）。点滅させる
    if (lb && Math.floor(dr.clock * 4) % 2) {
      const lx = lb.x === undefined ? (o.def.w - (lb.text.length * 4 - 1)) / 2 : lb.x;
      drPixelText(ctx, lb.text, o.x + lx, o.y + lb.y, lb.color || '#FFFFFF', '#1B1B2F');
    }
    if (o.hint && !o.dead) drDrawHint(ctx, o, 'スキルをつかって！');
    ctx.globalAlpha = 1;
  });
  // 前へ進んでいる間（急降下コンボ）は、横に流れる線を出す
  if (dr.run && run.rushT > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 9; i++) {
      const ly = 20 + Math.floor(drHash(i + Math.floor(dr.clock * 30)) * (C.groundY - 30));
      const lx = Math.floor(drHash(i * 3 + Math.floor(dr.clock * 30)) * C.width / zoom);
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
  if (dr.run) { if (!dr.phaseBlend) drDrawPlayer(ctx, run); }   // フェードチェンジ中は、あとで位置と大きさを動かしながら描く
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
  // RPGエリア：拍ごとに足元がピンクに光る（リズム技のタイミングの目印）
  if (dr.run && run.rpgArea) {
    const note = DR_DESIGN.rpgArea.note || 4, pos = run.beat * note / 4, f = pos - Math.floor(pos);
    const a = Math.max(0, 1 - f * 3);
    if (a > 0) {
      ctx.globalAlpha = a;
      ctx.fillStyle = '#FF7AE0';
      ctx.fillRect(drPX(run) - 2 - Math.round((1 - a) * 6), C.groundY - 1, 28 + Math.round((1 - a) * 12), 2);
      ctx.globalAlpha = 1;
    }
  }
  if (dr.debug) drDrawDebug(ctx, run);
  // テスト用：ノーツが鳴る位置（恐竜君の真ん中）の線。鳴った瞬間に光る
  if (dr.run && dr.noteSound) {
    ctx.fillStyle = dr.noteFlash > 0 ? '#FFD84A' : 'rgba(255,255,255,0.35)';
    ctx.fillRect(drArriveX(), C.groundY - 60, 1, 60);
  }
  if (tilted) ctx.restore();
  ctx.restore();
  drDrawBeatDebug(ctx);
  // RPGフェイズからのフェードチェンジ（勝ったあと）。
  //   バトルの背景（床の模様も）を上にかさねて、だんだん透明にする → 下のノーマルフェイズの背景・地面が見えてくる。
  //   バトルの床の境目（地平線）も、ノーマルの地面の高さ（DR_CONFIG.groundY）まで下がっていく。
  //   恐竜君は走りつづけたまま、バトルでの位置・大きさ（DR_RPG_PLAYER_X・FEET、48 ドット）から、ノーマルの位置・大きさ（24 ドット）へ動く
  if (dr.phaseBlend && dr.run) {
    const B = dr.phaseBlend, q0 = Math.min(1, B.t / B.dur), q = q0 * q0 * (3 - 2 * q0);
    ctx.save();
    ctx.globalAlpha = 1 - q;
    drRpgDrawBg(ctx, 0, 0, 0, B.runX, DR_RPG_FLOOR + (C.groundY - DR_RPG_FLOOR) * q);   // 床の境目も、ノーマルの地面の高さまで下がる
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = false;
    // ノーマルでの位置・大きさ（ズームアウトしているときは、そのぶん小さく・下になる）
    const zx = x => x * zoom, zy = y => C.height - (C.height - y) * zoom;
    const size = 48 + (24 * zoom - 48) * q;
    const cx = DR_RPG_PLAYER_X + (zx(drPX(run) + 12) - DR_RPG_PLAYER_X) * q;
    const feet = DR_RPG_PLAYER_FEET + (zy(C.groundY - run.y) - DR_RPG_PLAYER_FEET) * q;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';   // 影
    ctx.beginPath(); ctx.ellipse(cx, DR_RPG_PLAYER_FEET + (zy(C.groundY) - DR_RPG_PLAYER_FEET) * q, size / 3, size / 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(drRpgPlayerImage(!run.onGround, Math.floor(B.runX / 9)), Math.round(cx - size / 2), Math.round(feet - size), Math.round(size), Math.round(size));
    ctx.restore();
  }
}

/* テスト用（URL に &drdebug を付けたときだけ）：BPM と拍を画面の右下に出す。
   「BPM 144」と、小節の中の4拍（いまの拍が光る。1拍目は黄色）、その下に 8分音符の目盛り（障害物がそろう拍）。
   RPGフェイズのときは「RPG」、RPGエリアのときは「AREA」、BGM が鳴っていて曲の拍に合わせているときは「BGM」と出る */
function drDrawBeatDebug(ctx) {
  const run = dr.run;
  if (!dr.debug || !run || !['play', 'phase', 'phaseResult', 'pause', 'ready'].includes(dr.mode)) return;
  const W = DR_CONFIG.width, H = DR_CONFIG.height;
  const bpm = drBpm(run), beat = run.beat || 0, k = Math.floor(beat), f = beat - k;
  const S = 1.5;                               // スマホでも読めるように、少し大きく描く
  const x0 = 3, y0 = 3;
  ctx.save();
  ctx.translate(W - 86 * S, H - 24 * S);       // 右下
  ctx.scale(S, S);
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#12163A';
  ctx.fillRect(x0 - 3, y0 - 3, 86, 24);
  ctx.globalAlpha = 1;
  const tag = (dr.mode === 'phase' || dr.mode === 'phaseResult') ? ' RPG' : run.rpgArea ? ' AREA' : '';
  const synced = drAudio.bgm && !drAudio.bgm.paused ? ' BGM' : '';
  drPixelText(ctx, 'BPM ' + bpm + tag + synced, x0, y0, '#FFFFFF');
  // 4拍（いまの拍が光る。拍の頭で明るく、だんだん暗く）
  for (let i = 0; i < 4; i++) {
    const on = k % 4 === i;
    ctx.fillStyle = on ? (i === 0 ? '#FFD84A' : '#FF7AE0') : '#3A3F7A';
    ctx.globalAlpha = on ? 1 - f * 0.6 : 1;
    ctx.fillRect(x0 + i * 10, y0 + 9, 8, 6);
  }
  ctx.globalAlpha = 1;
  // 8分音符の目盛り（1小節 = 8つ）と、いまの位置
  const e = (beat * 2) % 8;
  for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#5C6577' : '#9AA4B5'; ctx.fillRect(x0 + 44 + i * 4, y0 + 13, 1, 2); }
  ctx.fillStyle = '#7FFFD4';
  ctx.fillRect(x0 + 44 + Math.floor(e * 4), y0 + 9, 1, 6);
  ctx.restore();
}

/* スキルの区画の札（シャッターの注意の板の上に、白い札を下げる） */
function drDrawHint(ctx, o, text) {
  drDrawBadge(ctx, o.x + o.def.w / 2, o.y + o.def.h - 15 - 23, text, '#FFFFFF', '#C7305A');
}
/* 日本語の小さい札（cx を真ん中に、top から下へ）。日本語なのでドット文字ではなくフォントで描く */
function drDrawBadge(ctx, cx, top, text, bg, fg) {
  ctx.save();
  ctx.font = '10px "DotGothic16", sans-serif';
  ctx.textBaseline = 'middle';
  const w = Math.ceil(ctx.measureText(text).width) + 10, h = 15;
  const x = Math.round(cx - w / 2);
  const y = Math.round(top) - (Math.floor(dr.clock * 3) % 2);
  ctx.fillStyle = '#1B1B2F';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fg || '#1B1B2F';
  ctx.fillText(text, x + 5, y + h / 2 + 1);
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
  // 空中ジャンプ・バタ足の道すじには、目印の上に「2回ジャンプ」「長押し」の札を出す
  if (m.kind === 'double') drDrawBadge(ctx, x, C.groundY - 40, '2回ジャンプ', '#7FFFD4');
  else if (m.kind === 'flutter') drDrawBadge(ctx, x, C.groundY - 40, '長押し', '#9FE8FF');
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
  const r = (p < 0.5 ? p * 2 : 1) * C.width * 1.1;   // ズームアウトしていても画面をおおう大きさ
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

  // おっとと（クールタイム中のスキルを使おうとした）：足元を軸に、前後にぐらぐらゆれる（だんだん小さく）
  const st = isDemo ? 0 : (run.stumbleT || 0);
  const sk = st / (C.stumbleTime || 0.45);   // 1（よろけ始め）→ 0
  if (st > 0) {
    const ang = Math.sin((1 - sk) * Math.PI * 5) * 0.32 * sk;
    const fx = x + P.frameW / 2, fy = Math.round(y) + P.frameH;
    ctx.save();
    ctx.translate(fx, fy); ctx.rotate(ang); ctx.translate(-fx, -fy);
  }
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
  if (st > 0) {
    ctx.restore();
    // 頭のまわりに汗が飛ぶ
    const k = 1 - sk;
    ctx.fillStyle = '#7FD8FF';
    for (const [dx, dy] of [[1, -1], [1.6, 0.2]]) {
      const sx = Math.round(x + P.frameW - 2 + dx * k * 10), sy = Math.round(y + 2 - dy * k * 8 + k * k * 10);
      ctx.fillRect(sx, sy, 2, 3); ctx.fillRect(sx + (dx > 1.2 ? 0 : 1), sy - 1, 1, 1);
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
    for (let k = 0; k * C.width < C.width + extra; k++)   // はみ出して描くときは、同じ星をもう1回右に並べる
      for (let i = 0; i < 30; i++) ctx.fillRect(Math.floor(drHash(i) * C.width) + k * C.width, Math.floor(drHash(i + 50) * 90), 1, 1);
    const bw = 22, start = Math.floor(off / bw);
    for (let i = start - 1 - Math.ceil(extra / bw); i < start + (C.width + extra) / bw + 2; i++) {
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
      for (let k = 0; k * C.width < C.width + extra; k++) ctx.fillRect(Math.round((sx + C.width) % C.width) + k * C.width, Math.floor(drHash(i + 99) * 150), tw, tw);
    }
    ctx.fillStyle = f.color2;
    ctx.beginPath(); ctx.arc(310, 40, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = w.sky[0];
    ctx.beginPath(); ctx.arc(316, 36, 12, 0, Math.PI * 2); ctx.fill();
  } else if (f.style === 'pillars') {
    const pw = 64, start = Math.floor(off / pw);
    for (let i = start - 1 - Math.ceil(extra / pw); i < start + (C.width + extra) / pw + 2; i++) {
      const x = Math.round(i * pw - off);
      ctx.fillStyle = f.color;
      const top = extra ? -80 : 20;   // ズームアウトで上が見えるときは、柱を上までのばす
      ctx.fillRect(x, top, 14, C.groundY - top);
      ctx.fillStyle = f.color2;
      ctx.fillRect(x + 2, top, 3, C.groundY - top);
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
  '/': '001001010100100',
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
  if (d.dist / C.pxPerMeter > 400) {   // 見本は 400m ごとに、ワールドを順番に見せる
    d.dist = 0; d.worldIndex++;
    d.worldId = DR_WORLDS[d.worldIndex % DR_WORLDS.length].id;
  }
  d.nextObstacleIn -= move;
  if (d.nextObstacleIn <= 0) {
    const table = drWorldDesign(d).obstacles || {};
    const cands = DR_OBSTACLES.filter(o => table[o.id] > 0 && !o.fly && !o.pit).map(o => ({ def: o, weight: table[o.id] }));
    if (cands.length) { const def = drPickWeighted(cands).def; d.obstacles.push(drMakeObstacle(def, C.width + 6, C.groundY - def.h)); }
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
    // くり返すときは、拍の始まり（DR_DESIGN.bgmBeatStart。頭の無音のあと）から最後までをくり返す（拍がずれないように）
    if (def.loop !== false) {
      const start = def.beatStart != null ? def.beatStart : DR_DESIGN.bgmBeatStart;
      a.addEventListener('ended', () => { if (drAudio.bgm === a) { a.currentTime = start; a.play().catch(() => {}); } });
    }
    if (drAudio.muted) { drAudio.bgm = a; return; }
    a.volume = def.volume == null ? 0.5 : def.volume;
    a.play().catch(() => {});
    drAudio.bgm = a;
  } catch (e) { /* 音が鳴らなくてもゲームは続ける */ }
}
