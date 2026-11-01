/* =====================================================
   きょうりゅうラン（dinorun）の RPG フェイズ（ボスとのバトル）
   minigame/index.html で dinorun.js・dinorun-rpg-data.js のあとに読み込む。
   数値・ボス・入り口の敵・負けたときのヒントは dinorun-rpg-data.js。ふつうはこのファイルは触らなくてよい。

   流れ（drRpg.st）:
     close（イナズマの線がすれちがい、黒い画面が上下から迫って暗転）
     → intro（暗転と逆の動きでバトル用のカメラに切りかわり、カメラが手前から恐竜君たちのところまで、だんだんゆっくり進む）
     → fight（「FIGHT!」）→ battle（リアルタイムのバトル）
     → win（勝ち。結果の画面 → ノーマルフェイズへ）/ lose（負け。ゲームオーバー）/ escaped（逃げた。ノーマルフェイズへ）

   バトル（リアルタイム。技ごとのクールタイム（CT）が終われば、いつでも押せる）:
     ジャンプボタン（Space / ↑）  … ふみつけ。ジャンプ回数のぶん踏む
                                     急降下を覚えていたら、最後の1回がスタンピング → 「溜め」になる
     スライディングボタン（↓）    … 防御。ボスの攻撃が当たる直前に押すと半減、ぎりぎりならパーフェクト（0）
     技のボタン（1・2・3…）        … 居合切り・火の玉・スピン・回復魔法（溜めのときは強くなる）
     回復薬（Q）・にげる（X）
     会心の一撃 … どの攻撃にもある。麻痺 … 磁石を持っているとき、ふみつけ・バタ足で
     ボス … 通常攻撃・強攻撃は3回光ってから4拍目に当たる（防御できる）。スキル攻撃は技名を出して当たる（防御できない）
            スキル攻撃は、スピンで回っているあいだに受けると軽くなる

   画面（384 × 216 ドット）:
     上 … ボスの名前と HP、右 … ボス
     左下 … 自機、その下 … 会心率などのステータス
     右下 … 自機の名前と HP、その下 … メッセージ
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
    const L = run.levels;
    // 暗転の前の画面（走っていたところ）を写しておく
    const snap = document.createElement('canvas');
    snap.width = DR_CONFIG.width; snap.height = DR_CONFIG.height;
    snap.getContext('2d').drawImage(dr.canvas, 0, 0);
    drRpg = {
      run, enc, lv, snap,
      st: 'close', t: 0,
      time: 0,                 // バトルが始まってからの秒数（FIGHT! のあとから数える）
      p: { name: C.playerName, hp: maxHp, maxHp, atk: C.atkBase + lv * C.atkPerLv, anim: null, hurtT: 0, guardT: 0, charged: false },
      b: { def: bossDef, name: bossDef.name, hp: Math.round(bossDef.hp * k), maxHp: Math.round(bossDef.hp * k), atk: Math.round(bossDef.atk * k),
           act: null, nextIn: 1.2, hurtT: 0, lunge: 0, paraT: 0, paraImmT: 0 },
      ct: { jump: 0, guard: 0 },   // 技ごとのクールタイムの残り（技のボタンはスキルの id で入る）
      skills: drRpgSkillList(run),
      guardAt: -99,            // 最後に防御を押した時刻（drRpg.time）
      guardWin: C.guardWindow + (L.inv_up || 0) * C.guardWindowPerInv,
      perfWin: C.perfectWindow + (L.inv_up || 0) * C.perfectWindowPerInv,
      crit: C.critBase + (L.coin_mult || 0) * C.critPerLv,
      para: L.magnet ? C.paraBase + (L.magnet - 1) * C.paraPerLv : 0,
      flutterHits: (L.flutter || 0) * C.flutterHitsPerLv,
      hasDive: !!run.skills.dive,
      fireLv: L.fire_power || 0,
      escapeT: 0,
      pending: [],             // あとから入るダメージ（バタ足）
      shots: [],               // 飛んでいる火の玉
      fx: [], msg: '', shake: 0, reward: null, shown: false,
      flash: null,             // 画面全体が一瞬光る（drRpgFlash）
      booms: 0,                // 倒したときの爆発を何回出したか
    };
    drRpgMsg(`${bossDef.name}が あらわれた！`);
    drRpgSetPads(true);
    if (typeof drRpgPreloadEffects === 'function') drRpgPreloadEffects();   // 技のエフェクトの PNG を先に読みこむ
    drBgm(C.bgm || null);
    drSound('encounter');
  },

  update(dt) {
    const R = drRpg, C = DR_RPG;
    if (!R) return;
    R.t += dt;
    if (R.shake > 0) R.shake = Math.max(0, R.shake - dt);
    R.fx.forEach(f => { f.t += dt; f.vy = (f.vy || 0) + (f.g || 0) * dt; f.x += (f.vx || 0) * dt; f.y += f.vy * dt; });
    R.fx = R.fx.filter(f => f.t < f.life);
    if (R.flash) { R.flash.t += dt; if (R.flash.t >= R.flash.life) R.flash = null; }
    // 倒したとき：ボスのあちこちで爆発してから、ファンファーレ
    if (R.st === 'win') {
      const b = R.b;
      while (R.booms < 7 && R.t >= R.booms * 0.12) {
        R.booms++;
        drRpgEffect('boom', DR_RPG_BOSS_X + drRand(-b.def.w * 0.35, b.def.w * 0.35), DR_RPG_BOSS_FEET - drRand(10, b.def.h * 0.85));
        drSound('boom');
        R.shake = Math.max(R.shake, 0.12);
      }
      if (!R.fanfare && R.t >= 0.7) { R.fanfare = true; drSound('victory'); drRpgFlash('#FFFFFF', 0.15, 0.6); }
    }
    if (R.st === 'close' && R.t >= C.closeTime + C.closeHold) { R.st = 'intro'; R.t = 0; }
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
    else if (act.startsWith('pskill')) { const s = R.skills[+act.slice(6)]; if (s) drRpgUseSkill(s); }
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

/* バトルで使える技の一覧（スキルボタン①②③ → 控え の順。DR_RPG.skills に動きがあるスキルだけ） */
function drRpgSkillList(run) {
  const ids = run.slots.concat(run.bench).filter(Boolean);
  const list = [];
  ids.forEach(id => {
    const skill = run.skills[id];
    const cfg = skill && DR_RPG.skills[skill.action];
    if (!cfg || list.some(s => s.id === id)) return;
    const item = DR_ITEMS.find(it => it.type === 'skill' && it.skill === id);
    list.push({ id, action: skill.action, cfg, icon: item ? item.icon : '' });
  });
  return list;
}

function drRpgMsg(text) { if (drRpg) drRpg.msg = text; }
/* 数字・英字（ドット文字）の演出 */
function drRpgFx(text, x, y, color, scale) {
  drRpg.fx.push({ type: 'text', text, x, y, vy: -48, g: 80, t: 0, life: 0.9, color, scale: scale || 2 });   // ぽんと上がって、ゆっくりになる
}
/* 日本語の演出（フォントで描く） */
function drRpgFxJp(text, x, y, color, size) {
  drRpg.fx.push({ type: 'jp', text, x, y, vy: -18, t: 0, life: 1.0, color, size: size || 11 });
}

/* ---------- バトルの進み方 ---------- */
function drRpgBattle(dt) {
  const R = drRpg, p = R.p, b = R.b;
  R.time += dt;
  for (const k in R.ct) R.ct[k] = Math.max(0, R.ct[k] - dt);
  p.hurtT = Math.max(0, p.hurtT - dt);
  p.guardT = Math.max(0, p.guardT - dt);
  b.hurtT = Math.max(0, b.hurtT - dt);
  b.lunge = Math.max(0, b.lunge - dt);

  // 自機の動き（ふみつけ・居合切りなど）。決まった時刻にダメージ
  if (p.anim) {
    const a = p.anim;
    a.t += dt;
    while (a.next < a.hits.length && a.t >= a.hits[a.next]) {
      a.onHit(a.next++);
      if (R.st !== 'battle') return;
    }
    if (a.t >= a.total) p.anim = null;
  }
  // 火の玉（届いたらダメージ）
  for (const s of R.shots) {
    s.t += dt;
    // 飛んでいるあいだの火の粉
    const q = Math.min(1, s.t / s.dur);
    if (Math.random() < 0.8) R.fx.push({ type: 'dot', x: s.x0 + (s.x1 - s.x0) * q - drRand(2, 6), y: s.y0 + (s.y1 - s.y0) * q - Math.sin(q * Math.PI) * 12 + drRand(-s.r, s.r) * 0.6,
      vx: -30, vy: drRand(-20, 0), t: 0, life: drRand(0.12, 0.25), color: s.blue ? (Math.random() < 0.5 ? '#9FE8FF' : '#2F6BFF') : (Math.random() < 0.5 ? '#FFD84A' : '#FF9A3C'), size: 2 });
    if (s.t >= s.dur && !s.done) { s.done = true; s.onHit(); if (R.st !== 'battle') return; }
  }
  R.shots = R.shots.filter(s => !s.done);
  // あとから入るダメージ（バタ足）
  while (R.pending.length && R.pending[0].at <= R.time) {
    const d = R.pending.shift();
    drRpgEffect('flutter', DR_RPG_BOSS_X - 30 + drRand(-12, 12), DR_RPG_BOSS_FEET - b.def.h + 38 + drRand(-6, 6));
    drRpgAttack(d.base, d.name, { normal: true, small: true });
    if (R.st !== 'battle') return;
  }

  // 溜めのあいだは、黄色い光の粒がのぼる
  if (p.charged && Math.random() < 0.35) R.fx.push({ type: 'dot', x: DR_RPG_PLAYER_X + drRand(-16, 16), y: DR_RPG_PLAYER_FEET - drRand(0, 20), vx: 0, vy: -45, t: 0, life: 0.4, color: Math.random() < 0.5 ? '#FFD84A' : '#FFFFFF' });

  // 逃げる（押してから escapeDelay 秒後）
  if (R.escapeT > 0) {
    R.escapeT -= dt;
    if (R.escapeT <= 0) { R.st = 'escaped'; R.t = 0; drRpgMsg('うまく にげきれた！'); drSound('escape'); return; }
  }

  b.paraImmT = Math.max(0, b.paraImmT - dt);
  // ボス：麻痺している間は動かない
  if (b.paraT > 0) {
    b.paraT = Math.max(0, b.paraT - dt);
    if (b.paraT <= 0) b.paraImmT = DR_RPG.paraImmune || 0;   // 麻痺がとけたら、しばらく麻痺しない
    if (Math.random() < 0.015) drRpgEffect('bolt', DR_RPG_BOSS_X + drRand(-b.def.w * 0.35, b.def.w * 0.3), DR_RPG_BOSS_FEET - drRand(24, b.def.h * 0.8));
    return;
  }
  if (!b.act) {
    b.nextIn -= dt;
    if (b.nextIn <= 0) drRpgBossStart();
  } else {
    const a = b.act, prev = a.t;
    a.t += dt;
    if (a.atk.type !== 'skill') for (let i = 1; i < 3; i++) if (prev < i * a.beat && a.t >= i * a.beat) drSound('warn');
    // 当たる少し前から出すエフェクト（ブレスの炎など。DR_RPG_EFFECTS の lead）
    const fx = drRpgBossFx(a.atk), lead = ((typeof DR_RPG_EFFECTS !== 'undefined' && DR_RPG_EFFECTS[fx]) || {}).lead || 0;
    if (lead && !a.fxShown && a.t >= a.hitAt - lead) { a.fxShown = true; drRpgBossEffect(fx); }
    if (a.t >= a.hitAt) drRpgBossHit();
  }
}

function drRpgBossStart() {
  const b = drRpg.b;
  const atk = drPickWeighted(b.def.attacks);
  if (atk.type === 'skill') {
    // スキル攻撃：技の名前を出して、wind 秒後に当たる（防御できない）
    b.act = { atk, t: 0, beat: 1, hitAt: atk.wind || 1.2 };
    drRpgMsg(`${b.name}の ${atk.name}！ 防御できない！`);
    drSound('encounter');
    return;
  }
  const beat = 60 / (atk.bpm || 120);
  b.act = { atk, t: 0, beat, hitAt: beat * 3 };
  drRpgMsg(`${b.name}の ${atk.name}！`);
  drSound('warn');
}

function drRpgBossHit() {
  const R = drRpg, p = R.p, b = R.b, a = b.act;
  const skill = a.atk.type === 'skill';
  const since = R.time - R.guardAt;   // 防御を押してから当たるまでの秒数
  let mult = 1, kind = 'hit';
  if (!skill && since >= 0 && since <= R.perfWin) { mult = 0; kind = 'perfect'; }
  else if (!skill && since >= 0 && since <= R.guardWin) { mult = 0.5; kind = 'guard'; }
  else if (skill && p.anim && p.anim.spin) { mult = 1 - (DR_RPG.skills.spin.skillCut || 0); kind = 'spin'; }   // スピン中はスキル攻撃が軽くなる
  const dmg = Math.round(b.atk * a.atk.power * drRand(0.9, 1.1) * mult);
  b.lunge = 0.3;
  b.act = null;
  b.nextIn = drRand(b.def.gapMin, b.def.gapMax);
  const px = DR_RPG_PLAYER_X, py = DR_RPG_PLAYER_FEET - 44;
  // 当たるときのエフェクト（lead があるものは、もう出ている）
  const fx = drRpgBossFx(a.atk), lead = ((typeof DR_RPG_EFFECTS !== 'undefined' && DR_RPG_EFFECTS[fx]) || {}).lead || 0;
  if (!lead || !a.fxShown) drRpgBossEffect(fx);
  if (kind === 'perfect') {
    drRpgEffect('perfect', px + 14, py + 18);
    drRpgFlash('#9FFFE8', 0.1, 0.35);
    drRpgFx('PERFECT!', px, py - 14, '#7FFFD4', 2); drSound('perfect'); drRpgMsg('パーフェクトガード！ ダメージ 0'); return;
  }
  if (kind === 'guard') drRpgEffect('guard', px + 14, py + 18);
  p.hp = Math.max(0, p.hp - dmg);
  p.hurtT = 0.4;
  drRpgFx(String(dmg), px, py, '#FF5A7A', 2);
  if (kind === 'guard') { drRpgFx('GUARD', px, py - 20, '#9FE8FF', 1); drSound('guard'); drRpgMsg(`ガード！ ${dmg}のダメージ`); }
  else if (kind === 'spin') { drRpgFxJp('スピンで軽減！', px, py - 24, '#7FFFD4', 12); drSound('guard'); drRpgMsg(`スピンで ふせいだ！ ${dmg}のダメージ`); R.shake = 0.2; }
  else {
    drSound(a.atk.sound || (skill ? 'breath' : 'bosshit'));
    drRpgMsg(`${dmg}のダメージを うけた！`);
    if (a.atk.type !== 'normal') { R.shake = 0.35; drRpgFlash(skill ? '#FF9A3C' : '#FF5A7A', 0.1, 0.3); }
  }
  if (p.hp <= 0) drRpgLose();
}

/* ボスの攻撃のエフェクトの名前（attacks の fx。省いたときは種類で決まる） */
function drRpgBossFx(atk) { return atk.fx || (atk.type === 'skill' ? 'breath' : atk.type === 'strong' ? 'smash' : 'claw'); }
/* ボスの攻撃のエフェクトを出す（ブレスはボスの口から自機へ、ほかは自機の上） */
function drRpgBossEffect(fx) {
  const def = drRpg.b.def, px = DR_RPG_PLAYER_X, py = DR_RPG_PLAYER_FEET - 26;
  if (fx === 'breath') drRpgEffect(fx, DR_RPG_BOSS_X - def.w * 0.38, DR_RPG_BOSS_FEET - def.h * 0.72, { tx: px + 6, ty: py });
  else drRpgEffect(fx, px, py);
}

/* ボスに攻撃する。base … ダメージのもと（攻撃力 × 倍率）。会心の抽選をして、ふみつけ・バタ足（normal）なら麻痺の抽選もする */
function drRpgAttack(base, name, opt) {
  const R = drRpg, C = DR_RPG, b = R.b;
  opt = opt || {};
  const crit = Math.random() < R.crit;
  const dmg = Math.max(1, Math.round(base * drRand(0.9, 1.1) * (crit ? C.critMult : 1)));
  b.hp = Math.max(0, b.hp - dmg);
  b.hurtT = 0.2;
  const x = DR_RPG_BOSS_X + drRand(-24, 24), y = DR_RPG_BOSS_FEET - b.def.h * 0.55 + drRand(-10, 10);
  drRpgFx(String(dmg), x, y, crit ? '#FFD84A' : '#FFFFFF', opt.small && !crit ? 1 : 2);
  if (crit) { drRpgEffect('crit', x, y); drRpgFxJp('会心！', x, y - 16, '#FFD84A', 12); R.shake = Math.max(R.shake, 0.25); drSound('crit'); drRpgFlash('#FFFFFF', 0.07, 0.45); }
  else if (dmg >= b.maxHp * 0.12) R.shake = Math.max(R.shake, 0.2);   // 大ダメージ
  if (!opt.small) drRpgMsg(`${name}！ ${dmg}のダメージ${crit ? '（会心の一撃！）' : ''}`);
  drSound(opt.small ? 'kill' : 'stomp');
  // 麻痺（磁石）
  if (opt.normal && R.para > 0 && b.hp > 0 && !(b.paraImmT > 0) && Math.random() < R.para * (crit ? C.critMult : 1)) {
    b.paraT = Math.min(C.paraMax, b.paraT + (b.paraT > 0 ? (C.paraStack == null ? C.paraTime : C.paraStack) : C.paraTime));   // 麻痺中にまた麻痺したら paraStack 秒のびる
    b.act = null;                                  // 出しかけの技も止まる
    drRpgFxJp('マヒ！', DR_RPG_BOSS_X, DR_RPG_BOSS_FEET - b.def.h - 4, '#FFD84A', 12);
    for (let i = 0; i < 3; i++) drRpgEffect('bolt', DR_RPG_BOSS_X + (i - 1) * 30, DR_RPG_BOSS_FEET - b.def.h * 0.55 + drRand(-10, 10));
    drSound('para');
    drRpgMsg(`${b.name}は しびれて うごけない！`);
  }
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
  drRpgMsg(`${b.name}を たおした！`);   // 爆発とファンファーレは update で出す
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
  const R = drRpg, C = DR_RPG, b = R.b, run = R.run;
  R.st = 'lose'; R.t = 0;
  b.act = null;
  const left = b.hp / b.maxHp;
  const rank = left < C.loseCloseUnder ? '惜敗' : left >= C.loseBigFrom ? '惨敗' : '敗北';
  // ゲームオーバーの画面に出す文（dinorun.js の drDeathText が使う）と、持っていないものからヒントを1つ
  run.deathBy = { name: b.name, deathText: `${rank}… ${b.name}に やられてしまった…` };
  const tips = (C.tips || []).filter(t => (t.skill && !run.skills[t.skill]) || (t.item && !run.levels[t.item]) || (t.potion && !(run.potion > 0)));
  run.deathTip = tips.length ? tips[Math.floor(Math.random() * tips.length)].text : '';
  drRpgMsg(`${C.playerName}は たおれてしまった…`);
}

/* ---------- 自機の行動 ---------- */
function drRpgBusy() { const R = drRpg; return !!R.p.anim || R.escapeT > 0; }

/* ふみつけ：ジャンプ回数のぶん踏む。急降下を覚えていたら最後の1回はスタンピング（ダメージ増）→「溜め」 */
function drRpgStomp() {
  const R = drRpg, C = DR_RPG, p = R.p;
  if (drRpgBusy() || R.ct.jump > 0) return;
  R.ct.jump = C.jumpCT;
  const n = Math.max(1, R.run.maxJumps);
  const rise = C.stompRise, each = C.stompEach, back = C.stompBack;
  const hits = [];
  for (let i = 0; i < n; i++) hits.push(rise + i * each);
  p.anim = {
    type: 'stomp', t: 0, n, rise, each, back, hits, next: 0, total: rise + n * each + back,
    onHit(i) {
      const stamp = R.hasDive && i === n - 1;
      const hx = DR_RPG_BOSS_X - 30, hy = DR_RPG_BOSS_FEET - R.b.def.h + 34;   // 踏んだところ（自機の足元）
      drRpgEffect('stomp', hx, hy);
      if (stamp) { drRpgEffect('stamp', DR_RPG_BOSS_X, DR_RPG_BOSS_FEET); drRpgFlash('#FFE88A', 0.08, 0.35); drSound('stamp'); }
      drRpgAttack(p.atk * C.stompPower * (stamp ? C.stampPower : 1), stamp ? 'スタンピング' : 'ふみつけ', { normal: true });
      if (R.st !== 'battle') return;
      // バタ足：小さいダメージを少しずつ
      for (let k = 0; k < R.flutterHits; k++) R.pending.push({ at: R.time + 0.05 * (k + 1), base: p.atk * C.flutterPower, name: 'バタ足' });
      if (stamp) {
        p.charged = true;
        drRpgFxJp('溜め！', DR_RPG_PLAYER_X, DR_RPG_PLAYER_FEET - 64, '#FFD84A', 12);
        R.shake = Math.max(R.shake, 0.15);
        drSound('charge');
      }
    },
  };
  drSound('jump');
}

/* 技（居合切り・火の玉・スピン・回復魔法）。溜めのときは強くなる（回復魔法は溜めを使わない） */
function drRpgUseSkill(s) {
  const R = drRpg, p = R.p, cfg = s.cfg;
  if (drRpgBusy() || (R.ct[s.id] || 0) > 0) return;
  R.ct[s.id] = cfg.ct;
  const charged = p.charged && s.action !== 'vacuum';
  if (charged) p.charged = false;
  const name = cfg.name + (charged ? '（溜め）' : '');
  if (s.action === 'slash') {
    // 居合切り：ボスの前へ踏みこんで切る
    p.anim = { type: 'dash', t: 0, go: 0.12, stay: 0.14, back: 0.16, hits: [0.12], next: 0, total: 0.42,
      onHit() {
        drRpgEffect(charged ? 'slashBig' : 'slash', DR_RPG_BOSS_X - 10, DR_RPG_BOSS_FEET - R.b.def.h * 0.5);
        if (charged) drRpgFlash('#FFFFFF', 0.1, 0.5);
        drSound('slash');
        drRpgAttack(p.atk * (charged ? cfg.chargedPower : cfg.power), name);
      } };
  } else if (s.action === 'spin') {
    // スピン：回りながら体当たり。全体攻撃（いまはボス1体なので、そのボスに当たる）。溜めなら2回
    const n = charged ? cfg.chargedHits : 1;
    const hits = [];
    for (let i = 0; i < n; i++) hits.push(0.14 + i * 0.16);
    p.anim = { type: 'dash', spin: true, t: 0, go: 0.14, stay: 0.16 * n, back: 0.16, hits, next: 0, total: 0.3 + 0.16 * n,
      onHit() {
        drRpgEffect('spinHit', DR_RPG_BOSS_X - 30, DR_RPG_BOSS_FEET - 34);
        drSound('spin');
        drRpgAttack(p.atk * cfg.power, name);
      } };
  } else if (s.action === 'fire') {
    // 火の玉：飛ばしてボスに当てる。溜めなら青い大きな火の玉（全体攻撃・威力大）
    const power = (cfg.power + cfg.powerPerLv * R.fireLv) * (charged ? cfg.chargedMult : 1);
    p.anim = { type: 'cast', t: 0, hits: [0.08], next: 0, total: 0.3,
      onHit() {
        R.shots.push({ x0: DR_RPG_PLAYER_X + 20, y0: DR_RPG_PLAYER_FEET - 26, x1: DR_RPG_BOSS_X - 20, y1: DR_RPG_BOSS_FEET - R.b.def.h * 0.5,
          t: 0, dur: 0.35, blue: charged, r: (charged ? 9 : 5) + R.fireLv,
          onHit() {
            drRpgEffect(charged ? 'blueHit' : 'fireHit', this.x1, this.y1);
            if (charged) drRpgFlash('#9FE8FF', 0.08, 0.35);
            drRpgAttack(p.atk * power, name);
          } });
        drSound(charged ? 'bluefire' : 'fire');
      } };
  } else if (s.action === 'vacuum') {
    // 回復魔法
    p.anim = { type: 'cast', t: 0, hits: [0.1], next: 0, total: 0.35,
      onHit() {
        const heal = Math.min(p.maxHp - p.hp, Math.round(p.maxHp * cfg.heal));
        p.hp += heal;
        drRpgFx('+' + heal, DR_RPG_PLAYER_X, DR_RPG_PLAYER_FEET - 50, '#7FFFD4', 2);
        drRpgEffect('heal', DR_RPG_PLAYER_X, DR_RPG_PLAYER_FEET);
        drRpgMsg(`${cfg.name}！ HPが ${heal} かいふく`);
        drSound('heal');
      } };
  }
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
  drRpgFx('HEAL', DR_RPG_PLAYER_X, DR_RPG_PLAYER_FEET - 60, '#7FFFD4', 2);
  drRpgEffect('heal', DR_RPG_PLAYER_X, DR_RPG_PLAYER_FEET);
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
  // 小さいボタンの列：技（もとのスキルのアイコンをうすく出す）→ 回復薬 → にげる
  let html = '';
  drRpg.skills.forEach((s, i) => {
    html += `<button type="button" class="dr-btn dr-pbtn is-skill" data-act="pskill${i}" data-skill="${s.id}">
        <span class="dr-pbtn-icon" aria-hidden="true">${s.icon}</span><span class="dr-key">${i + 1}</span>
        <span class="dr-pbtn-name">${s.cfg.name}</span><span class="dr-pbtn-short">${s.cfg.short || s.cfg.name}</span><span class="dr-pbtn-sub">${s.cfg.sub || ''}</span>
        <span class="dr-ct"><span class="dr-ct-fill"></span></span></button>`;
  });
  html += `<button type="button" class="dr-btn dr-pbtn" data-act="potion"><span class="dr-pbtn-icon" aria-hidden="true">🧪</span><span class="dr-key">Q</span>
      <span class="dr-pbtn-name">回復薬</span><span class="dr-pbtn-short">回復薬</span><span class="dr-pbtn-sub">HP全回復</span></button>
    <button type="button" class="dr-btn dr-pbtn is-escape" data-act="escape"><span class="dr-key">X</span>
      <span class="dr-pbtn-name">にげる</span><span class="dr-pbtn-short">にげる</span><span class="dr-pbtn-sub">ハート1に</span></button>`;
  document.querySelectorAll('.dr-battle-row').forEach(el => { el.innerHTML = html; el.dataset.count = drRpg.skills.length + 2; });
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
  const busy = drRpgBusy();
  const jumpBusy = busy || R.ct.jump > 0 || !fighting;
  const jr = 1 - R.ct.jump / C.jumpCT, gr = 1 - R.ct.guard / C.guardCT;
  const sk = R.skills.map(s => Math.round((1 - (R.ct[s.id] || 0) / s.cfg.ct) * 20)).join(',');
  const skillComing = fighting && !!R.b.act && R.b.act.atk.type === 'skill';   // ボスのスキル攻撃の前 → スピンのボタンを光らせる
  const key = `${R.st}|${busy}|${jumpBusy}|${Math.round(jr * 20)}|${Math.round(gr * 20)}|${sk}|${R.p.charged}|${run.potion}|${R.escapeT > 0}|${R.p.hp >= R.p.maxHp}|${skillComing}`;
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
  R.skills.forEach((s, i) => {
    const ct = R.ct[s.id] || 0;
    document.querySelectorAll(`.dr-pbtn[data-act="pskill${i}"]`).forEach(el => {
      el.classList.toggle('is-cooling', ct > 0 || busy || !fighting);
      el.classList.toggle('is-charged', R.p.charged && s.action !== 'vacuum');
      el.classList.toggle('is-hint', skillComing && s.action === 'spin' && ct <= 0);
      el.querySelector('.dr-ct-fill').style.width = (1 - ct / s.cfg.ct) * 100 + '%';
    });
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

/* 絵を1色にぬりつぶしたもの（光る・ダメージ・溜めの演出に使う） */
function drRpgTint(src, color) {
  let m = drRpgTintCache.get(src);
  if (!m) { m = {}; drRpgTintCache.set(src, m); }
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

  // 暗転：走っていた画面が、イナズマの線と黒い画面に閉じられていく
  if (R.st === 'close') {
    drRpgWipe(ctx, Math.min(1, R.t / C.closeTime), () => ctx.drawImage(R.snap, 0, 0));
    return;
  }
  // 暗転が開ける（暗転と逆の動き）。見えてくるのはバトル用のカメラの画面。カメラは手前から近づいてくる
  if (R.st === 'intro') {
    const cam = drRpgCam();
    drRpgWipe(ctx, Math.max(0, 1 - R.t / C.openTime), () => drRpgDrawScene(ctx, cam.back, cam.tilt, cam.side));
    return;
  }

  drRpgDrawScene(ctx, 0, 0);
  // 画面全体が一瞬光る
  if (R.flash) {
    ctx.globalAlpha = R.flash.alpha * (1 - R.flash.t / R.flash.life);
    ctx.fillStyle = R.flash.color;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
  drRpgDrawUi(ctx);

  // ボスのスキル攻撃の名前（防御できない）
  const ba = R.b.act;
  if (R.st === 'battle' && ba && ba.atk.type === 'skill') {
    ctx.fillStyle = 'rgba(199, 48, 90, 0.85)';
    ctx.fillRect(0, 40, W, 22);
    drRpgJpText(ctx, `${ba.atk.name}！`, W / 2, 44, '#FFFFFF', 14, 'center');
  }

  // 大きい文字（FIGHT! / WIN! / LOSE）
  if (R.st === 'fight') {
    // うしろに網掛けの帯を敷いて、文字を読みやすくする
    // 帯は左からスライドイン＋フェードイン → 右へスライドアウト＋フェードアウト（文字は帯が消えるときにいっしょに消える）
    const fade = Math.max(0.01, C.fightFade || 0.2);
    const aIn = Math.min(1, R.t / fade), aOut = Math.min(1, Math.max(0, (C.fightTime - R.t) / fade));
    const slide = aOut < 1 ? Math.pow(1 - aOut, 2) * W : -Math.pow(1 - aIn, 2) * W;   // 入るときはだんだんゆっくり、出るときはだんだん速く
    drRpgShade(ctx, H / 2 - 44, 80, Math.min(aIn, aOut), slide);
    const pop = Math.min(1, R.t / 0.15);
    ctx.globalAlpha = aOut;
    drRpgBigText(ctx, 'FIGHT!', H / 2 - 30, '#FFD84A', 3 + 2 * pop);
    drRpgJpText(ctx, 'ボスを倒せ！', W / 2, H / 2 + 6, '#FFFFFF', 14, 'center');
    ctx.globalAlpha = 1;
  } else if (R.st === 'win') {
    drRpgBigText(ctx, 'WIN!', H / 2 - 40, '#FFD84A', 5);
  } else if (R.st === 'lose') {
    drRpgBigText(ctx, 'LOSE', H / 2 - 40, '#FF5A7A', 5);
  }
}

/* intro のときのカメラの位置 { back（手前へのずれ）, tilt（傾き）, side（横のずれ） }。どれも 0 がいつもの位置。
   線が入ってきて画面が見え始めるところから動き出し、introTime で止まる（だんだんゆっくり）。
   横のずれは camSideEnd のところで先に無くなるので、上から見ると斜めから入ってきて、最後はまっすぐ近づく軌道になる */
function drRpgCam() {
  const R = drRpg, C = DR_RPG;
  if (!R || R.st !== 'intro') return { back: 0, tilt: 0, side: 0 };
  const from = C.openTime / 3;   // 画面が見え始めるころ（素材のコマで 9/27）
  const p = Math.max(0, Math.min(1, (R.t - from) / Math.max(0.01, C.introTime - from)));
  const ps = Math.min(1, p / Math.max(0.01, C.camSideEnd || 1));
  const k = Math.pow(1 - p, 3), ks = Math.pow(1 - ps, 2);   // 横は少しゆるやかに減らして、斜めに入ってくるのが見えるようにする
  return { back: (C.camBack || 0) * k, tilt: (C.camTilt || 0) * k, side: (C.camSide || 0) * ks };
}

/* エンカウントの切りかえ。素材の動画（battlestart_all.mp4・27コマ）の動きをまねている。
     q … 0 = まだ閉じていない、1 = 終わり（暗転するときは 0 → 1、開けるときは 1 → 0 で、同じ動きを逆に流す）
     drawScene … 見えている部分に描くもの
   動き（W・H は画面の幅と高さ）:
     ・見えている部分の上の端と下の端が、まん中へ向かってまっすぐ閉じる（素材の 18 コマ目で閉じきる）
     ・ギザギザの斜めの線（イナズマ）が2本。A は右へ、B は左へ動いて、まん中ですれちがう（12.5 コマ目）
       見えているのは「上下の端のあいだ」かつ「A と B のあいだ」だけ
     ・A は下の黒い部分に、B は上の黒い部分に、線として見える。上下の端にも細い線が出る */
function drRpgWipe(ctx, q, drawScene) {
  const W = DR_CONFIG.width, H = DR_CONFIG.height, cy = H / 2;
  const f = q * 27;                               // 素材のコマ番号
  const y1 = Math.min(cy, cy * f / 18), y2 = H - y1;
  const xa = W * (0.5 + (f - 12.5) * 0.075);      // A の線の、画面のまん中の高さでの x
  const xb = W * (0.5 - (f - 12.5) * 0.075);
  const SLOPE = 1.35;                             // 線のかたむき（上へ 1 進むと右へ 1.35）
  const STEP = 9, NOTCH = 2.5;                    // ギザギザの間隔と、段の高さ（ドット）
  const baseX = (xc, y) => xc - (y - cy) * SLOPE;
  // ギザギザの線の点（上から下へ）。段の位置は画面に固定して、動いてもちらつかないようにする
  const zig = xc => {
    const pts = [], K = Math.ceil(cy / STEP) + 2;
    for (let k = -K; k < K; k++) {
      const ya = cy + k * STEP, yb = ya + STEP;
      pts.push([baseX(xc, ya), ya], [baseX(xc, ya) - 0.3, ya + NOTCH]);
      if (k === K - 1) pts.push([baseX(xc, yb), yb]);
    }
    return pts;
  };
  const A = zig(xa), B = zig(xb);
  const path = pts => pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  const open = y2 - y1 > 0.5;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  if (open) {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, y1, W, y2 - y1); ctx.clip();
    ctx.beginPath(); path(A); for (let i = B.length - 1; i >= 0; i--) ctx.lineTo(B[i][0], B[i][1]); ctx.closePath(); ctx.clip();
    drawScene();
    ctx.restore();
  }
  // イナズマの線（A は下の黒い部分、B は上の黒い部分）
  ctx.strokeStyle = DR_RPG.wipeLineColor || '#5FD3FF';
  ctx.lineWidth = 1.2;
  const stroke = (pts, top, bottom) => {
    if (bottom - top <= 0) return;
    ctx.save(); ctx.beginPath(); ctx.rect(0, top, W, bottom - top); ctx.clip();
    ctx.beginPath(); path(pts); ctx.stroke(); ctx.restore();
  };
  stroke(A, y2, H);
  stroke(B, 0, y1);
  // 上下の端の細い線（すれちがう前は左から、すれちがったあとは右へ）
  if (open) {
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (const y of [Math.round(y1) + 0.5, Math.round(y2) - 0.5]) {
      if (xa < xb) { ctx.moveTo(0, y); ctx.lineTo(baseX(xb, y), y); }
      else { ctx.moveTo(baseX(xa, y), y); ctx.lineTo(W, y); }
    }
    ctx.stroke();
  }
  ctx.lineWidth = 1;
}

/* バトルの画面（背景・ボス・自機・火の玉・演出）。
   back … カメラがどれだけ手前にいるか、tilt … カメラの傾き（ラジアン）、side … カメラの横のずれ。どれも 0 がいつもの位置 */
function drRpgDrawScene(ctx, back, tilt, side) {
  const R = drRpg, W = DR_CONFIG.width, H = DR_CONFIG.height;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  if (R.shake > 0) ctx.translate(Math.round(drRand(-3, 3)), Math.round(drRand(-3, 3)));
  if (tilt) { ctx.translate(W / 2, DR_RPG_FLOOR); ctx.rotate(tilt); ctx.translate(-W / 2, -DR_RPG_FLOOR); }   // 地平線のまん中を軸に傾ける
  drRpgDrawBg(ctx, back, tilt || (R.shake > 0 ? 0.0001 : 0), side);   // ゆれているときも、すみが空かないように広く描く
  drRpgDepth(ctx, DR_RPG_BOSS_X, DR_RPG_BOSS_FEET, back, side, () => drRpgDrawBoss(ctx, 0));
  drRpgDepth(ctx, DR_RPG_PLAYER_X, DR_RPG_PLAYER_FEET, back, side, () => drRpgDrawPlayer(ctx, 0));
  // 火の玉
  R.shots.forEach(s => {
    const q = Math.min(1, s.t / s.dur);
    const x = s.x0 + (s.x1 - s.x0) * q, y = s.y0 + (s.y1 - s.y0) * q - Math.sin(q * Math.PI) * 12;
    ctx.fillStyle = s.blue ? '#2F6BFF' : '#E8352E';
    ctx.beginPath(); ctx.arc(x, y, s.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = s.blue ? '#9FE8FF' : '#FFD84A';
    ctx.beginPath(); ctx.arc(x + 1, y, s.r * 0.55, 0, Math.PI * 2); ctx.fill();
  });
  // 演出（ダメージの数字・粒・切った線など）
  R.fx.forEach(f => {
    const a = Math.max(0, 1 - f.t / f.life);
    ctx.globalAlpha = a;
    if (f.type === 'text') {
      const w = f.text.length * 4 * f.scale;
      ctx.save(); ctx.translate(Math.round(f.x - w / 2), Math.round(f.y)); ctx.scale(f.scale, f.scale);
      drPixelText(ctx, f.text, 0, 0, f.color, '#1B1B2F');
      ctx.restore();
    } else if (f.type === 'jp') {
      drRpgJpText(ctx, f.text, f.x, f.y, f.color, f.size, 'center');
    } else if (f.type === 'dot') {
      ctx.fillStyle = f.color;
      ctx.fillRect(Math.round(f.x), Math.round(f.y), f.size || 2, f.size || 2);
    } else if (f.type === 'eff') {     // 技のエフェクト（dinorun-rpg-fx.js）
      ctx.globalAlpha = 1;
      drRpgDrawEffect(ctx, f);
    }
  });
  ctx.globalAlpha = 1;
  ctx.restore();
}

/* 奥行きのある床の上に立っているものを、カメラの位置に合わせて描く（遠近法）。
   (x0, y0) … いつもの位置での足元。床の上の端（DR_RPG_FLOOR）が地平線で、足元が下にあるほど手前にいる。
   カメラが back だけ手前に下がると、手前のもの（自機）ほど大きく小さくなり、奥のもの（ボス）はあまり変わらない。
   カメラが side だけ横にずれると、手前のものほど大きく反対側へずれて見える */
const DR_RPG_EYE = 60;   // カメラの高さ（奥行きの計算に使う。足元が床の上の端から 60 ドット下 = 奥行き 1）
function drRpgDepth(ctx, x0, y0, back, side, draw) {
  if (back <= 0 && !side) { draw(); return; }
  const W = DR_CONFIG.width, F = DR_RPG_FLOOR;
  const z = DR_RPG_EYE / Math.max(1, y0 - F), k = z / (z + back);
  ctx.save();
  // 横：カメラが右にずれると、ものは左に見える。手前のもの（奥行き z が小さい）ほど大きくずれる
  ctx.translate(W / 2 + ((x0 - W / 2) * z - (side || 0)) / (z + back), F + (y0 - F) * k);
  ctx.scale(k, k);
  ctx.translate(-x0, -y0);
  draw();
  ctx.restore();
}

/* 背景。back … カメラがどれだけ手前にいるか（床の線が流れて、近づいていくように見える）。
   tilt … カメラの傾き。傾いているときは、画面のすみが空かないように、空と床を画面より広く描く
   side … カメラの横のずれ。ずれているあいだだけ、奥へのびる床の線をうすく出して、横に動いているのが分かるようにする */
function drRpgDrawBg(ctx, back, tilt, side) {
  const W = DR_CONFIG.width, H = DR_CONFIG.height, F = DR_RPG_FLOOR;
  const img = drImage(DR_RPG.bgImage);
  if (img) {   // 背景の PNG は近づいても大きさを変えない（遠くの景色なので）。傾いているときだけ、すみが空かないように少し大きく描く
    const z = 1 + Math.abs(tilt || 0) * 2.5;
    ctx.drawImage(img, W / 2 - W * z / 2, H / 2 - H * z / 2, W * z, H * z);
    return;
  }
  const X0 = tilt ? -W : 0, XW = tilt ? W * 3 : W, Y0 = tilt ? -H : 0, YB = tilt ? H * 2 : H;   // 描く範囲
  const g = ctx.createLinearGradient(0, 0, 0, F);
  g.addColorStop(0, '#FFE6A8'); g.addColorStop(1, '#FFF6DE');
  ctx.fillStyle = g;
  ctx.fillRect(X0, Y0, XW, F - Y0);
  ctx.fillStyle = '#E8913A';
  ctx.fillRect(X0, F, XW, YB - F);
  ctx.fillStyle = '#F2A65A';
  ctx.fillRect(X0, F, XW, 3);
  // 床の奥行きの線（奥行き 0.5 ごとに1本。遠くほどつまって、うすくなる）
  for (let i = 2; i < 80; i++) {
    const y = F + DR_RPG_EYE / (i * 0.5 + (back || 0));
    if (y >= H) continue;
    if (y < F + 4) break;
    ctx.fillStyle = `rgba(160, 80, 20, ${0.3 * Math.min(1, (y - F - 4) / 24)})`;
    ctx.fillRect(X0, Math.round(y), XW, 1);
  }
  // 奥へのびる床の線（カメラが横にずれているあいだだけ。まっすぐになるにつれて消える）
  if (side) {
    const fade = Math.min(1, Math.abs(side) / Math.max(1, Math.abs(DR_RPG.camSide || 1) * 0.25));
    ctx.strokeStyle = `rgba(160, 80, 20, ${0.3 * fade})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let X = -2400; X <= 2400; X += 80) {
      ctx.moveTo(W / 2, F + 3);
      ctx.lineTo(W / 2 + (X - side) * (YB - F) / DR_RPG_EYE, YB);
    }
    ctx.stroke();
  }
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
  const a0 = ctx.globalAlpha;
  const a = b.act;
  if (b.hurtT > 0) {             // ダメージを受けた（赤く光る）
    ctx.globalAlpha = a0 * 0.5;
    ctx.drawImage(drRpgTint(img, '#FF5A7A'), Math.round(x), Math.round(y), w, h);
  } else if (b.paraT > 0) {      // 麻痺（黄色くちらつく）
    if (Math.floor(R.t * 8) % 2) { ctx.globalAlpha = a0 * 0.35; ctx.drawImage(drRpgTint(img, '#FFD84A'), Math.round(x), Math.round(y), w, h); }
    ctx.globalAlpha = a0;
    drRpgJpText(ctx, 'マヒ', Math.round(x + w * 0.3), Math.round(y + 28), '#FFD84A', 12, 'center');
  } else if (a && a.atk.type === 'skill') {   // スキル攻撃の前（赤くふるえる）
    ctx.globalAlpha = a0 * (0.3 + 0.3 * Math.sin(R.time * 30));
    ctx.drawImage(drRpgTint(img, '#C7305A'), Math.round(x + drRand(-1, 1)), Math.round(y), w, h);
  } else if (a) {                // 技の予告（3回光る。強攻撃はオレンジ）
    const idx = Math.floor(a.t / a.beat);
    if (idx < 3 && a.t - idx * a.beat < 0.15) {
      ctx.globalAlpha = a0 * 0.85;
      ctx.drawImage(drRpgTint(img, a.atk.type === 'strong' ? '#FF9A3C' : '#FFFFFF'), Math.round(x), Math.round(y), w, h);
    }
    ctx.globalAlpha = a0;
    // 何回光ったか（「!」の数）
    const marks = Math.min(3, idx + 1);
    const col = a.atk.type === 'strong' ? '#FF5A7A' : '#FFFFFF';
    for (let i = 0; i < marks; i++) {
      ctx.save(); ctx.translate(Math.round(x + w * 0.2 + i * 10), Math.round(y - 4)); ctx.scale(2, 2);
      drPixelText(ctx, '!', 0, 0, col, '#1B1B2F'); ctx.restore();
    }
  }
  ctx.globalAlpha = a0;
}

function drRpgDrawPlayer(ctx, offX) {
  const R = drRpg, p = R.p, def = R.b.def;
  const hx = DR_RPG_PLAYER_X, hy = DR_RPG_PLAYER_FEET;   // いつもの位置
  let x = hx + offX, y = hy;
  let jumping = false, rot = 0;
  const a = p.anim;
  if (a && a.type === 'stomp') {
    // ボスの頭の上まで跳んで、ジャンプ回数のぶん踏んで、戻ってくる
    jumping = true;
    const tx = DR_RPG_BOSS_X - 30, ty = DR_RPG_BOSS_FEET - def.h + 34;
    if (a.t < a.rise) {
      const q = a.t / a.rise;
      x = hx + (tx - hx) * q; y = hy + (ty - hy) * q - Math.sin(q * Math.PI) * 40;
    } else if (a.t < a.rise + a.n * a.each) {
      const q = ((a.t - a.rise) % a.each) / a.each;
      x = tx; y = ty - Math.sin(q * Math.PI) * 16;
    } else {
      const q = Math.min(1, (a.t - a.rise - a.n * a.each) / a.back);
      x = tx + (hx - tx) * q; y = ty + (hy - ty) * q - Math.sin(q * Math.PI) * 30;
    }
  } else if (a && a.type === 'dash') {
    // 居合切り・スピン：ボスの前へ踏みこんで戻る
    const tx = DR_RPG_BOSS_X - def.w / 2 - 6, ty = hy - 18;
    if (a.t < a.go) { const q = a.t / a.go; x = hx + (tx - hx) * q; y = hy + (ty - hy) * q; }
    else if (a.t < a.go + a.stay) { x = tx; y = ty; }
    else { const q = Math.min(1, (a.t - a.go - a.stay) / a.back); x = tx + (hx - tx) * q; y = ty + (hy - ty) * q; }
    if (a.spin) rot = a.t * 30;
    // 踏みこむときの残像
    if (a.t < a.go && Math.random() < 0.7) R.fx.push({ type: 'dot', x: x - 10, y: y - drRand(4, 40), vx: -120, vy: 0, t: 0, life: 0.15, color: '#FFFFFF' });
  } else if (a && a.type === 'cast') {
    y = hy - Math.sin(Math.min(1, a.t / a.total) * Math.PI) * 6;   // その場で少し跳ねる
  }
  if (R.st === 'escaped') {      // 逃げる：左へ走り去る
    x -= R.t / DR_RPG.escapeRunTime * 120;
    ctx.globalAlpha *= Math.max(0, 1 - R.t / DR_RPG.escapeRunTime);
  }
  if (R.st === 'lose') ctx.globalAlpha *= Math.max(0.2, 1 - R.t / DR_RPG.loseTime);
  // 影
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(hx + offX, hy, 16, 4, 0, 0, Math.PI * 2); ctx.fill();
  if (p.hurtT > 0 && Math.floor(p.hurtT * 20) % 2) return;   // ダメージを受けたら点滅
  const img = drRpgPlayerImage(jumping);
  const a0 = ctx.globalAlpha;
  // 溜め（黄色い光がちらつく）
  if (p.charged && Math.floor(R.t * 10) % 2) {
    ctx.globalAlpha = a0 * 0.6;
    ctx.drawImage(drRpgTint(img, '#FFD84A'), Math.round(x - 26), Math.round(y - 50), 52, 52);
    ctx.globalAlpha = a0;
  }
  if (rot) {
    ctx.save(); ctx.translate(Math.round(x), Math.round(y - 24)); ctx.rotate(rot);
    ctx.drawImage(img, -24, -24, 48, 48); ctx.restore();
  } else {
    ctx.drawImage(img, Math.round(x - 24), Math.round(y - 48), 48, 48);
  }
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

/* 名前と HP の箱・メッセージ・ステータス */
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
    drRpgJpText(ctx, R.msg, 205, 191, '#FFFFFF', 10, 'left', 168);   // 長いときは横に縮める
  }
  // ステータス（左下。ボタンにはならないもの）
  const st = [`会心${Math.round(R.crit * 100)}%`];
  if (R.para > 0) st.push(`マヒ${Math.round(R.para * 100)}%`);
  if (R.flutterHits > 0) st.push(`バタ足+${R.flutterHits}`);
  if (R.hasDive) st.push(p.charged ? '溜め中！' : '溜めOK');
  ctx.fillStyle = 'rgba(18, 22, 58, 0.6)';
  ctx.fillRect(4, 202, 190, 12);
  drRpgJpText(ctx, st.join('  '), 8, 203, p.charged ? '#FFD84A' : '#FFFFFF', 9, 'left', 182);
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
/* maxW … 横幅の上限（はみ出すときは横に縮める。なくてもよい） */
function drRpgJpText(ctx, text, x, y, color, size, align, maxW) {
  ctx.save();
  ctx.font = `${size}px "DotGothic16", sans-serif`;
  ctx.textBaseline = 'top';
  ctx.textAlign = align || 'left';
  ctx.fillStyle = '#1B1B2F';
  ctx.fillText(text, Math.round(x) + 1, Math.round(y) + 1, maxW);
  ctx.fillStyle = color;
  ctx.fillText(text, Math.round(x), Math.round(y), maxW);
  ctx.restore();
}
/* 網掛けの帯（画面の幅いっぱい）。y … 上の端、h … 高さ、alpha … こさ（0～1）、x … 横にずらす量（スライドするとき） */
function drRpgShade(ctx, y, h, alpha, x) {
  if (alpha <= 0) return;
  const W = DR_CONFIG.width;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(Math.round(x || 0), 0);
  ctx.fillStyle = 'rgba(27, 27, 47, 0.55)';
  ctx.fillRect(0, y, W, h);
  // 1ドットおきに少し濃くして、網の目にする（2 × 2 ドットの模様をくり返す。模様は1回だけ作る）
  if (!drRpgShade.pat) {
    const c = document.createElement('canvas');
    c.width = 2; c.height = 2;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(27, 27, 47, 0.35)';
    g.fillRect(0, 0, 1, 1); g.fillRect(1, 1, 1, 1);
    drRpgShade.pat = ctx.createPattern(c, 'repeat');
  }
  ctx.fillStyle = drRpgShade.pat;
  ctx.fillRect(0, y, W, h);
  // 上下のふち
  ctx.fillStyle = 'rgba(255, 216, 74, 0.8)';
  ctx.fillRect(0, y, W, 1); ctx.fillRect(0, y + h - 1, W, 1);
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
