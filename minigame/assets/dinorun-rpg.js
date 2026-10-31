/* =====================================================
   きょうりゅうラン（dinorun）の RPG フェイズ（ボスとのバトル）
   minigame/index.html で dinorun.js・dinorun-rpg-data.js のあとに読み込む。
   数値・ボス・入り口の敵は dinorun-rpg-data.js。ふつうはこのファイルは触らなくてよい。

   流れ（drRpg.st）:
     close（黒い画面が上下から迫って暗転）→ intro（回りながら近づき、自機は左・ボスは右から出てくる）
     → fight（「FIGHT!」）→ battle（リアルタイムのバトル）
     → win（勝ち。結果の画面 → ノーマルフェイズへ）/ lose（負け。ゲームオーバー）/ escaped（逃げた。ノーマルフェイズへ）

   バトル（リアルタイム）:
     ジャンプボタン（Space / ↑）     … ふみつけ。ジャンプ回数のぶん踏む。CT は DR_RPG.jumpCT
     スライディングボタン（↓）       … 防御。ボスの攻撃が当たる直前に押すと半減、ぎりぎりならパーフェクト（0）。CT は DR_RPG.guardCT
     回復薬（Q）・にげる（X）         … 下の小さいボタン
     ボス … 通常攻撃・強攻撃。3回光ってから、4拍目に当たる（光る間隔は技の bpm）。技と技のあいだは毎回ぶれる

   画面（384 × 216 ドット）:
     上 … ボスの名前と HP（左寄り）、右 … ボス
     左下 … 自機、右下 … 自機の名前と HP、その下 … メッセージ
   ===================================================== */

let drRpg = null;   // いまのバトルの状態（バトルしていないときは null）

DR_PHASES.rpg = {
  /* バトルを始める（入り口の敵に触れたとき。dinorun.js の drStartPhase から） */
  start(run, enc) {
    const C = DR_RPG;
    const lv = run.worldIndex + 1;
    const bossDef = drRpgPickBoss(lv);
    const k = Math.pow(1 + (bossDef.growth || 0), Math.max(0, lv - (bossDef.fromWorld || 1)));
    const maxHp = C.hpBase + lv * C.hpPerLv + Math.max(0, run.lives) * C.hpPerHeart;
    const inv = run.levels.inv_up || 0;   // ショップの「被弾後無敵時間UP」の段階
    // 暗転の前の画面（走っていたところ）を写しておく
    const snap = document.createElement('canvas');
    snap.width = DR_CONFIG.width; snap.height = DR_CONFIG.height;
    snap.getContext('2d').drawImage(dr.canvas, 0, 0);
    drRpg = {
      run, enc, lv, snap,
      st: 'close', t: 0,
      time: 0,                 // バトルが始まってからの秒数（FIGHT! のあとから数える）
      p: { name: C.playerName, hp: maxHp, maxHp, atk: C.atkBase + lv * C.atkPerLv, anim: null, hurtT: 0, guardT: 0 },
      b: { def: bossDef, name: bossDef.name, hp: Math.round(bossDef.hp * k), maxHp: Math.round(bossDef.hp * k), atk: Math.round(bossDef.atk * k),
           act: null, nextIn: 1.2, hurtT: 0, lunge: 0 },
      ct: { jump: 0, guard: 0 },
      guardAt: -99,            // 最後に防御を押した時刻（drRpg.time）
      guardWin: C.guardWindow + inv * C.guardWindowPerInv,
      perfWin: C.perfectWindow + inv * C.perfectWindowPerInv,
      escapeT: 0,
      fx: [], msg: '', shake: 0, reward: null, shown: false,
    };
    drRpgMsg(`${bossDef.name}が あらわれた！`);
    drRpgSetPads(true);
    drBgm(C.bgm || null);
    drSound('encounter');
  },

  update(dt) {
    const R = drRpg, C = DR_RPG;
    if (!R) return;
    R.t += dt;
    if (R.shake > 0) R.shake = Math.max(0, R.shake - dt);
    R.fx.forEach(f => { f.t += dt; f.y += (f.vy || 0) * dt; });
    R.fx = R.fx.filter(f => f.t < f.life);
    if (R.st === 'close' && R.t >= C.closeTime) { R.st = 'intro'; R.t = 0; }
    else if (R.st === 'intro' && R.t >= C.introTime) { R.st = 'fight'; R.t = 0; drSound('fight'); }
    else if (R.st === 'fight' && R.t >= C.fightTime) { R.st = 'battle'; R.t = 0; }
    else if (R.st === 'battle') drRpgBattle(dt);
    else if (R.st === 'win' && R.t >= C.winTime && !R.shown) { R.shown = true; drRpgShowResult(); }
    else if (R.st === 'lose' && R.t >= C.loseTime) { drEndPhase('lose'); }
    else if (R.st === 'escaped' && R.t >= C.escapeRunTime) { drEndPhase('escape'); }
  },

  /* ボタン・キー（act: 'jump' / 'slide' / 'potion' / 'escape' / 'pskill0'～） */
  press(act) {
    const R = drRpg;
    if (!R || R.st !== 'battle') return;
    if (act === 'jump') drRpgStomp();
    else if (act === 'slide') drRpgGuard();
    else if (act === 'potion') drRpgPotion();
    else if (act === 'escape') drRpgEscape();
    // 'pskill0'～ … スキルのボタン（次の段階で足す）
  },

  pads() { drRpgUpdatePads(); },

  end() {
    drRpgSetPads(false);
    drRpg = null;
  },

  render(ctx) { drRpgRender(ctx); },
};

/* そのワールドに出てくるボスを選ぶ（DR_BOSSES の fromWorld ～ toWorld に当てはまるものからランダム） */
function drRpgPickBoss(lv) {
  const list = DR_BOSSES.filter(b => lv >= (b.fromWorld || 1) && lv <= (b.toWorld || 999));
  return (list.length ? list : DR_BOSSES)[Math.floor(Math.random() * (list.length || DR_BOSSES.length))] || DR_BOSSES[0];
}

function drRpgMsg(text) { if (drRpg) drRpg.msg = text; }
function drRpgFx(text, x, y, color, scale) {
  drRpg.fx.push({ type: 'text', text, x, y, vy: -22, t: 0, life: 0.9, color, scale: scale || 2 });
}

/* ---------- バトルの進み方 ---------- */
function drRpgBattle(dt) {
  const R = drRpg, C = DR_RPG, p = R.p, b = R.b;
  R.time += dt;
  R.ct.jump = Math.max(0, R.ct.jump - dt);
  R.ct.guard = Math.max(0, R.ct.guard - dt);
  p.hurtT = Math.max(0, p.hurtT - dt);
  p.guardT = Math.max(0, p.guardT - dt);
  b.hurtT = Math.max(0, b.hurtT - dt);
  b.lunge = Math.max(0, b.lunge - dt);

  // ふみつけの動き（踏む瞬間にダメージ）
  if (p.anim) {
    const a = p.anim;
    a.t += dt;
    while (a.next < a.hits.length && a.t >= a.hits[a.next]) {
      a.next++;
      drRpgHitBoss(Math.round(p.atk * C.stompPower * drRand(0.9, 1.1)), 'ふみつけ');
      if (R.st !== 'battle') return;
    }
    if (a.t >= a.total) p.anim = null;
  }

  // 逃げる（押してから escapeDelay 秒後）
  if (R.escapeT > 0) {
    R.escapeT -= dt;
    if (R.escapeT <= 0) { R.st = 'escaped'; R.t = 0; drRpgMsg('うまく にげきれた！'); drSound('escape'); return; }
  }

  // ボスの技：3回光ってから、4拍目に当たる
  if (!b.act) {
    b.nextIn -= dt;
    if (b.nextIn <= 0) drRpgBossStart();
  } else {
    const a = b.act, prev = a.t;
    a.t += dt;
    for (let i = 1; i < 3; i++) if (prev < i * a.beat && a.t >= i * a.beat) drSound('warn');
    if (a.t >= a.hitAt) drRpgBossHit();
  }
}

function drRpgBossStart() {
  const b = drRpg.b;
  const atk = drPickWeighted(b.def.attacks);
  const beat = 60 / (atk.bpm || 120);
  b.act = { atk, t: 0, beat, hitAt: beat * 3 };
  drRpgMsg(`${b.name}の ${atk.name}！`);
  drSound('warn');
}

function drRpgBossHit() {
  const R = drRpg, p = R.p, b = R.b, a = b.act;
  const since = R.time - R.guardAt;   // 防御を押してから当たるまでの秒数
  let mult = 1, kind = 'hit';
  if (since >= 0 && since <= R.perfWin) { mult = 0; kind = 'perfect'; }
  else if (since >= 0 && since <= R.guardWin) { mult = 0.5; kind = 'guard'; }
  const dmg = Math.round(b.atk * a.atk.power * drRand(0.9, 1.1) * mult);
  b.lunge = 0.3;
  b.act = null;
  b.nextIn = drRand(b.def.gapMin, b.def.gapMax);
  const px = 86, py = 150;
  if (kind === 'perfect') { drRpgFx('PERFECT!', px - 20, py - 34, '#7FFFD4', 2); drSound('perfect'); drRpgMsg('パーフェクトガード！ ダメージ 0'); return; }
  p.hp = Math.max(0, p.hp - dmg);
  p.hurtT = 0.4;
  drRpgFx(String(dmg), px, py - 20, '#FF5A7A', 2);
  if (kind === 'guard') { drRpgFx('GUARD', px - 10, py - 40, '#9FE8FF', 1); drSound('guard'); drRpgMsg(`ガード！ ${dmg}のダメージ`); }
  else { drSound('bosshit'); drRpgMsg(`${dmg}のダメージを うけた！`); if (a.atk.type === 'strong') R.shake = 0.35; }
  if (p.hp <= 0) drRpgLose();
}

/* ボスにダメージ（技の名前はメッセージに出す） */
function drRpgHitBoss(dmg, name) {
  const R = drRpg, b = R.b;
  b.hp = Math.max(0, b.hp - dmg);
  b.hurtT = 0.2;
  drRpgFx(String(dmg), 262 + drRand(-16, 16), 70 + drRand(-8, 8), '#FFFFFF', 2);
  drRpgMsg(`${name}！ ${dmg}のダメージ`);
  drSound('stomp');
  if (b.hp <= 0) drRpgWin();
}

function drRpgWin() {
  const R = drRpg, C = DR_RPG, run = R.run, b = R.b;
  R.st = 'win'; R.t = 0;
  b.act = null;
  const timeBonus = Math.max(0, Math.round((C.timeBonusLimit - R.time) * C.timeBonusPerSec));
  const score = (b.def.score || 0) + timeBonus;
  const coins = C.winCoinBase + R.lv * C.winCoinPerWorld;
  run.bosses = (run.bosses || 0) + 1;
  run.bossScore = (run.bossScore || 0) + score;
  run.wallet += coins;
  R.reward = { score, timeBonus, coins, sec: R.time };
  drRpgMsg(`${b.name}を たおした！`);
  drSound('victory');
}

function drRpgShowResult() {
  const R = drRpg, rw = R.reward, b = R.b;
  drShowPhaseResult('VICTORY!',
    `${drEscape(b.name)}を たおした！<br>`
    + `ボーナス ${b.def.score.toLocaleString()}<br>`
    + `タイムボーナス +${rw.timeBonus.toLocaleString()}（${rw.sec.toFixed(1)}びょう）<br>`
    + `コイン +${rw.coins}<br>`
    + 'ハートが ぜんかいふく！');
}

function drRpgLose() {
  const R = drRpg, C = DR_RPG, b = R.b;
  R.st = 'lose'; R.t = 0;
  b.act = null;
  const left = b.hp / b.maxHp;
  const rank = left < C.loseCloseUnder ? '惜敗' : left >= C.loseBigFrom ? '惨敗' : '敗北';
  // ゲームオーバーの画面に出す文（dinorun.js の drDeathText が使う）
  R.run.deathBy = { name: b.name, deathText: `${rank}… ${b.name}に やられてしまった…` };
  drRpgMsg(`${C.playerName}は たおれてしまった…`);
}

/* ---------- 自機の行動 ---------- */
function drRpgStomp() {
  const R = drRpg, C = DR_RPG, p = R.p;
  if (p.anim || R.ct.jump > 0 || R.escapeT > 0) return;
  R.ct.jump = C.jumpCT;
  const n = Math.max(1, R.run.maxJumps);
  const rise = 0.22, each = 0.18, back = 0.22;
  const hits = [];
  for (let i = 0; i < n; i++) hits.push(rise + i * each);
  p.anim = { type: 'stomp', t: 0, n, rise, each, back, hits, next: 0, total: rise + n * each + back };
  drSound('jump');
}

function drRpgGuard() {
  const R = drRpg, C = DR_RPG;
  if (R.ct.guard > 0) return;
  R.ct.guard = C.guardCT;
  R.guardAt = R.time;
  R.p.guardT = 0.3;
  drSound('slide');
}

function drRpgPotion() {
  const R = drRpg, p = R.p, run = R.run;
  if (!(run.potion > 0) || p.hp >= p.maxHp) return;
  run.potion = 0;
  p.hp = p.maxHp;
  drRpgFx('HEAL', 70, 110, '#7FFFD4', 2);
  drRpgMsg('かいふくやくを つかった！ HPが ぜんかいふく');
  drSound('potion');
}

function drRpgEscape() {
  const R = drRpg;
  if (R.escapeT > 0) return;
  R.escapeT = DR_RPG.escapeDelay;
  drRpgMsg('にげだそうとしている…');
}

/* ---------- 下のボタン ---------- */
/* バトル用にボタンの表示を切りかえる（on = false で元に戻す） */
function drRpgSetPads(on) {
  document.querySelectorAll('.dr-jump-btn .dr-btn-label').forEach(el => { el.textContent = on ? 'ふみつけ' : 'ジャンプ'; });
  document.querySelectorAll('.dr-duck-half.is-slide .dr-btn-label').forEach(el => { el.textContent = on ? '防御' : 'スライディング'; });
  document.querySelectorAll('.dr-jump-btn').forEach(el => el.classList.remove('is-cooling'));
  if (!on) return;
  // 小さいボタンの列（スキルのボタンは次の段階で、この左に足す）
  const html = `<button type="button" class="dr-btn dr-pbtn" data-act="potion"><span class="dr-key">Q</span>
      <span class="dr-pbtn-name">回復薬</span><span class="dr-pbtn-sub">HP全回復</span></button>
    <button type="button" class="dr-btn dr-pbtn is-escape" data-act="escape"><span class="dr-key">X</span>
      <span class="dr-pbtn-name">にげる</span><span class="dr-pbtn-sub">ハート1になる</span></button>`;
  document.querySelectorAll('.dr-battle-row').forEach(el => { el.innerHTML = html; });
  // ジャンプ回数（ふみつける回数）の表示
  const n = Math.max(1, drRpg.run.maxJumps);
  let dots = '';
  for (let i = 0; i < n; i++) dots += '<span class="dr-jump-dot"></span>';
  document.querySelectorAll('.dr-jump-count').forEach(el => { el.innerHTML = dots; el.title = 'ふみつける回数: ' + n; });
}

function drRpgUpdatePads() {
  const R = drRpg;
  if (!R) return;
  const C = DR_RPG, run = R.run;
  const fighting = R.st === 'battle';
  const jumpBusy = !!R.p.anim || R.ct.jump > 0 || !fighting;
  const jr = 1 - R.ct.jump / C.jumpCT, gr = 1 - R.ct.guard / C.guardCT;
  const key = `${R.st}|${jumpBusy}|${Math.round(jr * 20)}|${Math.round(gr * 20)}|${run.potion}|${R.escapeT > 0}|${R.p.hp >= R.p.maxHp}`;
  if (dr.uiCache.rpgPads === key) return;
  dr.uiCache.rpgPads = key;
  document.querySelectorAll('.dr-jump-btn').forEach(el => {
    el.classList.toggle('is-cooling', jumpBusy);
    el.querySelector('.dr-jump-ct .dr-ct-fill').style.width = jr * 100 + '%';
  });
  document.getElementById('dr-root').classList.remove('dr-has-dive');
  document.querySelectorAll('.dr-duck-btn').forEach(el => {
    el.classList.remove('has-dive', 'is-air', 'is-held');
    const half = el.querySelector('.is-slide');
    half.classList.toggle('is-ready', fighting && R.ct.guard <= 0);
    half.querySelector('.dr-half-fill').style.width = gr * 100 + '%';
  });
  document.querySelectorAll('.dr-pbtn[data-act="potion"]').forEach(el => { el.disabled = !fighting || !(run.potion > 0) || R.p.hp >= R.p.maxHp; });
  document.querySelectorAll('.dr-pbtn[data-act="escape"]').forEach(el => { el.disabled = !fighting || R.escapeT > 0; });
}

/* =====================================================
   描画
   ===================================================== */
const DR_RPG_FLOOR = 134;              // 床の上の端
const DR_RPG_BOSS_X = 268, DR_RPG_BOSS_FEET = 152;   // ボスのまん中と足元
const DR_RPG_PLAYER_X = 86, DR_RPG_PLAYER_FEET = 194;  // 自機のまん中と足元
const drRpgTintCache = new Map();

/* 絵を1色にぬりつぶしたもの（光る・ダメージの演出に使う） */
function drRpgTint(src, color) {
  const key = src;
  let m = drRpgTintCache.get(key);
  if (!m) { m = {}; drRpgTintCache.set(key, m); }
  if (m[color]) return m[color];
  const c = document.createElement('canvas');
  c.width = src.width || src.naturalWidth; c.height = src.height || src.naturalHeight;
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  m[color] = c;
  return c;
}

function drRpgBossImage(def) {
  return drImage(def.image) || drPixelCanvas(def.sprite.pixels, def.sprite.palette);
}
function drRpgPlayerImage(jumping) {
  const P = DR_PLAYER;
  const img = drImage(P.image);
  if (img) {
    // PNG のときは、その行の1コマ目を切り出して使う
    const key = 'rpg-player-' + (jumping ? 'jump' : 'run');
    let c = drRpgTintCache.get(key);
    if (!c) {
      c = document.createElement('canvas'); c.width = P.frameW; c.height = P.frameH;
      const a = P.anims[jumping ? 'jump' : 'run'];
      c.getContext('2d').drawImage(img, 0, a.row * P.frameH, P.frameW, P.frameH, 0, 0, P.frameW, P.frameH);
      drRpgTintCache.set(key, c);
    }
    return c;
  }
  return drPixelCanvas((jumping ? P.placeholder.jump : P.placeholder.run)[0]);
}

function drRpgRender(ctx) {
  const R = drRpg, C = DR_RPG;
  if (!R) return;
  const W = DR_CONFIG.width, H = DR_CONFIG.height;
  ctx.imageSmoothingEnabled = false;

  // 暗転：走っていた画面に、上下から黒い画面が迫ってくる（ふちは斜め）
  if (R.st === 'close') {
    ctx.drawImage(R.snap, 0, 0);
    const p = Math.min(1, R.t / C.closeTime);
    const hh = (H / 2 + 50) * (1 - p * p);
    const s = hh * 0.55, cy = H / 2;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.moveTo(-20 + s, cy - hh); ctx.lineTo(W + 20 + s, cy - hh);
    ctx.lineTo(W + 20 - s, cy + hh); ctx.lineTo(-20 - s, cy + hh); ctx.closePath();
    ctx.fill('evenodd');
    return;
  }

  // 暗転が開けて、回りながら近づく（だんだんゆっくり）。後半で自機は左から、ボスは右から出てくる
  let scale = 1, rot = 0, alpha = 1, charIn = 1;
  if (R.st === 'intro') {
    const p = Math.min(1, R.t / C.introTime), e = 1 - Math.pow(1 - p, 3);
    scale = 0.45 + 0.55 * e;
    rot = (1 - e) * 0.5;
    alpha = Math.min(1, p * 3);
    charIn = Math.max(0, Math.min(1, (p - 0.45) / 0.55));
    charIn = 1 - Math.pow(1 - charIn, 2);
  }
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  if (R.shake > 0) ctx.translate(Math.round(drRand(-3, 3)), Math.round(drRand(-3, 3)));
  ctx.translate(W / 2, H / 2); ctx.rotate(rot); ctx.scale(scale, scale); ctx.translate(-W / 2, -H / 2);
  ctx.globalAlpha = alpha;
  drRpgDrawBg(ctx);
  ctx.globalAlpha = alpha * charIn;
  drRpgDrawBoss(ctx, (1 - charIn) * 80);
  drRpgDrawPlayer(ctx, -(1 - charIn) * 80);
  ctx.globalAlpha = 1;
  // ダメージの数字など
  R.fx.forEach(f => {
    ctx.globalAlpha = Math.max(0, 1 - f.t / f.life);
    const w = f.text.length * 4 * f.scale;
    ctx.save(); ctx.translate(Math.round(f.x - w / 2), Math.round(f.y)); ctx.scale(f.scale, f.scale);
    drPixelText(ctx, f.text, 0, 0, f.color, '#1B1B2F');
    ctx.restore();
  });
  ctx.globalAlpha = 1;
  ctx.restore();

  if (R.st !== 'intro') drRpgDrawUi(ctx);

  // 大きい文字（FIGHT! / WIN! / LOSE）
  if (R.st === 'fight') {
    const pop = Math.min(1, R.t / 0.15);
    drRpgBigText(ctx, 'FIGHT!', H / 2 - 30, '#FFD84A', 3 + 2 * pop);
    drRpgJpText(ctx, 'ボスを倒せ！', W / 2, H / 2 + 6, '#FFFFFF', 14, 'center');
  } else if (R.st === 'win') {
    drRpgBigText(ctx, 'WIN!', H / 2 - 40, '#FFD84A', 5);
  } else if (R.st === 'lose') {
    drRpgBigText(ctx, 'LOSE', H / 2 - 40, '#FF5A7A', 5);
  }
}

function drRpgDrawBg(ctx) {
  const W = DR_CONFIG.width, H = DR_CONFIG.height, F = DR_RPG_FLOOR;
  const img = drImage(DR_RPG.bgImage);
  if (img) { ctx.drawImage(img, 0, 0, W, H); return; }
  const g = ctx.createLinearGradient(0, 0, 0, F);
  g.addColorStop(0, '#FFE6A8'); g.addColorStop(1, '#FFF6DE');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, F);
  ctx.fillStyle = '#E8913A';
  ctx.fillRect(0, F, W, H - F);
  ctx.fillStyle = '#F2A65A';
  ctx.fillRect(0, F, W, 3);
  // 床の奥行きの線
  ctx.fillStyle = 'rgba(160, 80, 20, 0.25)';
  for (let i = 0; i < 6; i++) ctx.fillRect(0, F + 8 + i * i * 2.6, W, 1);
}

function drRpgDrawBoss(ctx, offX) {
  const R = drRpg, b = R.b, def = b.def;
  const img = drRpgBossImage(def);
  const w = def.w, h = def.h;
  let x = DR_RPG_BOSS_X - w / 2 + offX, y = DR_RPG_BOSS_FEET - h;
  if (b.lunge > 0) x -= Math.sin((b.lunge / 0.3) * Math.PI) * 24;
  if (b.hurtT > 0) x += Math.round(drRand(-2, 2));
  if (R.st === 'win') {          // 倒れたボスは点滅しながら消える
    if (Math.floor(R.t * 12) % 2) return;
    ctx.globalAlpha *= Math.max(0, 1 - R.t / DR_RPG.winTime);
  }
  // 影
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(DR_RPG_BOSS_X + offX, DR_RPG_BOSS_FEET, w * 0.4, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.drawImage(img, Math.round(x), Math.round(y), w, h);
  // ダメージを受けた（赤く光る）・技の予告（3回光る。強攻撃はオレンジ）
  const a = b.act;
  if (b.hurtT > 0) {
    const a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * 0.5;
    ctx.drawImage(drRpgTint(img, '#FF5A7A'), Math.round(x), Math.round(y), w, h);
    ctx.globalAlpha = a0;
  } else if (a) {
    const idx = Math.floor(a.t / a.beat);
    if (idx < 3 && a.t - idx * a.beat < 0.15) {
      const a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * 0.85;
      ctx.drawImage(drRpgTint(img, a.atk.type === 'strong' ? '#FF9A3C' : '#FFFFFF'), Math.round(x), Math.round(y), w, h);
      ctx.globalAlpha = a0;
    }
    // 何回光ったか（「!」の数）
    const marks = Math.min(3, idx + 1);
    const col = a.atk.type === 'strong' ? '#FF5A7A' : '#FFFFFF';
    for (let i = 0; i < marks; i++) {
      ctx.save(); ctx.translate(Math.round(x + w * 0.2 + i * 10), Math.round(y - 4)); ctx.scale(2, 2);
      drPixelText(ctx, '!', 0, 0, col, '#1B1B2F'); ctx.restore();
    }
  }
}

function drRpgDrawPlayer(ctx, offX) {
  const R = drRpg, p = R.p;
  let x = DR_RPG_PLAYER_X + offX, y = DR_RPG_PLAYER_FEET;
  let jumping = false;
  const a = p.anim;
  if (a) {
    // ボスの頭の上まで跳んで、ジャンプ回数のぶん踏んで、戻ってくる
    jumping = true;
    const tx = DR_RPG_BOSS_X - 30, ty = DR_RPG_BOSS_FEET - R.b.def.h + 34;
    if (a.t < a.rise) {
      const q = a.t / a.rise;
      x = DR_RPG_PLAYER_X + (tx - DR_RPG_PLAYER_X) * q; y = DR_RPG_PLAYER_FEET + (ty - DR_RPG_PLAYER_FEET) * q - Math.sin(q * Math.PI) * 40;
    } else if (a.t < a.rise + a.n * a.each) {
      const q = ((a.t - a.rise) % a.each) / a.each;
      x = tx; y = ty - Math.sin(q * Math.PI) * 16;
    } else {
      const q = Math.min(1, (a.t - a.rise - a.n * a.each) / a.back);
      x = tx + (DR_RPG_PLAYER_X - tx) * q; y = ty + (DR_RPG_PLAYER_FEET - ty) * q - Math.sin(q * Math.PI) * 30;
    }
  }
  if (R.st === 'escaped') {      // 逃げる：左へ走り去る
    x -= R.t / DR_RPG.escapeRunTime * 120;
    ctx.globalAlpha *= Math.max(0, 1 - R.t / DR_RPG.escapeRunTime);
  }
  if (R.st === 'lose') ctx.globalAlpha *= Math.max(0.2, 1 - R.t / DR_RPG.loseTime);
  // 影
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(DR_RPG_PLAYER_X + offX, DR_RPG_PLAYER_FEET, 16, 4, 0, 0, Math.PI * 2); ctx.fill();
  if (p.hurtT > 0 && Math.floor(p.hurtT * 20) % 2) return;   // ダメージを受けたら点滅
  const img = drRpgPlayerImage(jumping);
  ctx.drawImage(img, Math.round(x - 24), Math.round(y - 48), 48, 48);
  // 防御（前に盾の光）
  if (p.guardT > 0) {
    ctx.strokeStyle = 'rgba(127, 255, 212, ' + (p.guardT / 0.3) + ')';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(Math.round(x + 10), Math.round(y - 24), 28, -Math.PI * 0.4, Math.PI * 0.4); ctx.stroke();
    ctx.lineWidth = 1;
  }
  // 逃げようとしている
  if (R.escapeT > 0) drRpgJpText(ctx, 'にげる…', x, y - 60, '#FFFFFF', 10, 'center');
}

/* 名前と HP の箱・メッセージ */
function drRpgDrawUi(ctx) {
  const R = drRpg, b = R.b, p = R.p;
  // ボス（上）
  drRpgBox(ctx, 100, 6, 176, 26);
  drRpgJpText(ctx, b.name, 106, 9, '#FFFFFF', 10);
  drRpgBar(ctx, 106, 22, 164, 5, b.hp / b.maxHp);
  // 自機（右下）
  drRpgBox(ctx, 200, 156, 178, 30);
  drRpgJpText(ctx, `${p.name}  Lv${R.lv}`, 206, 159, '#FFFFFF', 10);
  const hpText = `${p.hp}/${p.maxHp}`;
  drPixelText(ctx, hpText, 372 - hpText.length * 4, 161, '#FFFFFF', '#1B1B2F');
  drRpgBar(ctx, 206, 174, 166, 6, p.hp / p.maxHp);
  // メッセージ（自機の体力の下）
  if (R.msg) {
    ctx.fillStyle = 'rgba(18, 22, 58, 0.75)';
    ctx.fillRect(200, 189, 178, 15);
    drRpgJpText(ctx, R.msg, 205, 191, '#FFFFFF', 10);
  }
}

function drRpgBox(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(18, 22, 58, 0.85)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#FFFFFF';
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}
function drRpgBar(ctx, x, y, w, h, ratio) {
  const r = Math.max(0, Math.min(1, ratio));
  ctx.fillStyle = '#3A3F66';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = r > 0.5 ? '#6CD96C' : r > 0.25 ? '#FFD84A' : '#FF5A7A';
  ctx.fillRect(x, y, Math.round(w * r), h);
}
function drRpgJpText(ctx, text, x, y, color, size, align) {
  ctx.save();
  ctx.font = `${size}px "DotGothic16", sans-serif`;
  ctx.textBaseline = 'top';
  ctx.textAlign = align || 'left';
  ctx.fillStyle = '#1B1B2F';
  ctx.fillText(text, Math.round(x) + 1, Math.round(y) + 1);
  ctx.fillStyle = color;
  ctx.fillText(text, Math.round(x), Math.round(y));
  ctx.restore();
}
function drRpgBigText(ctx, text, y, color, scale) {
  const w = (text.length * 4 - 1) * scale;
  ctx.save();
  ctx.translate(Math.round(DR_CONFIG.width / 2 - w / 2), Math.round(y));
  ctx.scale(scale, scale);
  drPixelText(ctx, text, 0, 0, color, '#1B1B2F');
  ctx.restore();
}
