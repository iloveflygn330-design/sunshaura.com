/* =====================================================
   きょうりゅうラン（dinorun）の RPG フェイズの「技のエフェクト」
   minigame/index.html で dinorun-rpg.js のあとに読み込む。

   使い方（dinorun-rpg.js から）:
     drRpgEffect('stomp', x, y)            … エフェクトを1つ出す（x, y はゲーム画面のドット）
     drRpgEffect('breath', x, y, { tx, ty }) … 追加の指定があるときは4つめに書く（tx・ty … ねらう場所）
     drRpgFlash('#FFFFFF', 0.08, 0.5)      … 画面全体を一瞬光らせる（色・秒数・こさ）

   絵:
     dinorun-rpg-data.js の DR_RPG_EFFECTS に PNG（スプライトシート）の場所を書くと、その絵を出す。
     PNG が空のあいだは、このファイルの DR_RPG_FX_DRAW にある「仮のドット絵」を描く。
     ★拡張予定: 新しいエフェクトを足すときは
       1. dinorun-rpg-data.js の DR_RPG_EFFECTS に1件足す（PNG があれば image に場所を書く）
       2. PNG を用意しないなら、下の DR_RPG_FX_DRAW に同じ名前で描き方を1つ足す
       3. dinorun-rpg.js の、出したいところで drRpgEffect('名前', x, y) を呼ぶ
   ===================================================== */

/* エフェクトを1つ出す。opt … 描き方に渡す追加の指定（big・blue・tx・ty など）。life を書くとその秒数になる
   出ている秒数は、life（DR_RPG_EFFECTS）→ PNG のコマ数 ÷ fps → 0.35 秒 の順に決まる */
function drRpgEffect(id, x, y, opt) {
  if (!drRpg) return;
  const def = (typeof DR_RPG_EFFECTS !== 'undefined' && DR_RPG_EFFECTS[id]) || {};
  const img = def.image ? drImage(def.image) : null;
  const life = def.life || (img && def.fps ? (def.frames || 1) / def.fps : 0) || def.drawLife || 0.35;
  drRpg.fx.push(Object.assign({ type: 'eff', id, x, y, t: 0, life, seed: Math.floor(Math.random() * 1e9) }, opt || {}));
}

/* エフェクトの PNG を先に読みこんでおく（バトルが始まるとき。読みこみ中は仮のドット絵が出る） */
function drRpgPreloadEffects() {
  if (typeof DR_RPG_EFFECTS === 'undefined') return;
  for (const k in DR_RPG_EFFECTS) if (DR_RPG_EFFECTS[k].image) drImage(DR_RPG_EFFECTS[k].image);
}

/* 画面全体を一瞬光らせる（会心・パーフェクト・スタンピングなど）。強いほうが残る */
function drRpgFlash(color, life, alpha) {
  if (!drRpg) return;
  const f = drRpg.flash;
  if (f && f.t < f.life && f.alpha > alpha) return;
  drRpg.flash = { color, t: 0, life, alpha };
}

/* エフェクトを描く（dinorun-rpg.js の drRpgDrawScene から） */
function drRpgDrawEffect(ctx, f) {
  const def = (typeof DR_RPG_EFFECTS !== 'undefined' && DR_RPG_EFFECTS[f.id]) || {};
  const q = Math.max(0, Math.min(1, f.t / f.life));
  const img = def.image ? drImage(def.image) : null;
  ctx.save();
  if (img) {
    // PNG：コマを左上から右へ（cols コマで折り返して）並べた画像。life の間に1回流す（loop なら fps でくり返す）
    const n = def.frames || 1, cols = def.cols || n;
    const w = def.w || img.width / cols, h = def.h || img.height / Math.ceil(n / cols);
    const fr = def.loop && def.fps ? Math.floor(f.t * def.fps) % n : Math.min(n - 1, Math.floor(q * n));
    const s = f.scale || 1;
    const ax = def.ax == null ? 0.5 : def.ax, ay = def.ay == null ? 0.5 : def.ay;
    const flip = !!def.flip !== !!f.flip;   // 設定と呼び出しの両方で反転を指定したら、元の向き
    ctx.translate(Math.round(f.x + (def.ox || 0) * (flip ? -1 : 1)), Math.round(f.y + (def.oy || 0)));
    if (flip) ctx.scale(-1, 1);
    // aim: true … 右向きの絵を、f.tx・f.ty（ねらう場所）のほうへ回す（ブレスなど）
    if (def.aim && f.tx != null) ctx.rotate(Math.atan2(f.ty - f.y - (def.oy || 0), Math.abs(f.tx - f.x)));
    if (def.fade) drFxFade(ctx, q, 1 - def.fade);   // 終わりの fade の割合でだんだん消える（切りつめたエフェクト用）
    ctx.drawImage(img, (fr % cols) * w, Math.floor(fr / cols) * h, w, h, Math.round(-w * s * ax), Math.round(-h * s * ay), w * s, h * s);
  } else {
    const draw = DR_RPG_FX_DRAW[f.id];
    if (draw) draw(ctx, f, q, drFxRandom(f.seed || 1));
  }
  ctx.restore();
}

/* ---------- 仮のドット絵を描くための道具 ---------- */
/* いつも同じ並びになる乱数（エフェクトごとに seed を決めておくと、毎フレーム同じ形になる） */
function drFxRandom(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function drFxDot(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
}
/* ドットの線（size ドット角の四角を並べる） */
function drFxLine(ctx, x0, y0, x1, y1, size, color) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  ctx.fillStyle = color;
  for (let i = 0; i <= n; i++) {
    const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
    ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
  }
}
/* ドットの円（中を塗る）。2ドットごとの横の帯で描くので、カクカクしたドット絵になる */
function drFxDisc(ctx, cx, cy, r, color) {
  if (r <= 0) return;
  ctx.fillStyle = color;
  for (let dy = -r; dy <= r; dy += 2) {
    const half = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)));
    ctx.fillRect(Math.round(cx - half), Math.round(cy + dy), half * 2, 2);
  }
}
/* ドットの輪（だ円）。ry を省くと円 */
function drFxRing(ctx, cx, cy, rx, ry, size, color, gap) {
  ry = ry == null ? rx : ry;
  const n = Math.max(8, Math.round(Math.max(rx, ry) * 1.6));
  for (let i = 0; i < n; i++) {
    if (gap && i % gap === 0) continue;
    const a = i / n * Math.PI * 2;
    drFxDot(ctx, cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, size, color);
  }
}
/* 終わりのほう（from 以降）でだんだん消える */
function drFxFade(ctx, q, from) { ctx.globalAlpha = q < from ? 1 : Math.max(0, (1 - q) / (1 - from)); }
const drFxEaseOut = q => 1 - Math.pow(1 - q, 3);

/* ---------- ★拡張予定: 仮のドット絵（PNG を用意したら、そちらが優先される） ----------
   1件の書き方:  名前(ctx, f, q, rnd) { ... }
     f … エフェクト（f.x・f.y が出す場所。drRpgEffect の opt で渡したものも入っている）
     q … 0（出た瞬間）～ 1（消える瞬間）
     rnd … いつも同じ並びになる乱数（rnd() で 0～1） */
const DR_RPG_FX_DRAW = {
  /* ふみつけ：白い光と、8方向に飛ぶ線 */
  stomp(ctx, f, q) {
    const s = f.small ? 0.5 : 1;
    drFxFade(ctx, q, 0.5);
    if (q < 0.25) drFxDisc(ctx, f.x, f.y, Math.round(7 * s), '#FFFFFF');
    const d = (5 + drFxEaseOut(q) * 16) * s;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + Math.PI / 8;
      const c = q < 0.4 ? '#FFFFFF' : '#FFD84A';
      for (let k = 0; k < 3; k++) drFxDot(ctx, f.x + Math.cos(a) * (d + k * 3 * s), f.y + Math.sin(a) * (d + k * 3 * s) * 0.8, k === 0 ? 3 : 2, c);
    }
  },
  /* スタンピング：地面に広がる衝撃の輪と、とび散る岩 */
  stamp(ctx, f, q, rnd) {
    drFxFade(ctx, q, 0.55);
    const rx = 8 + drFxEaseOut(q) * 78;
    drFxRing(ctx, f.x, f.y, rx, rx * 0.2, 3, '#FFD84A');
    drFxRing(ctx, f.x, f.y, rx * 0.7, rx * 0.14, 2, '#FFFFFF', 3);
    if (q < 0.18) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(Math.round(f.x - 40), Math.round(f.y - 2), 80, 4); }
    const t = q * f.life;
    for (let i = 0; i < 12; i++) {
      const vx = (rnd() - 0.5) * 220, vy = 120 + rnd() * 160, sz = rnd() < 0.5 ? 3 : 4;
      const x = f.x + vx * t, y = f.y - (vy * t - 520 * t * t);
      if (y <= f.y) drFxDot(ctx, x, y, sz, i % 3 ? '#B5651D' : '#7A3E12');
    }
  },
  /* 居合切り：三日月の形の切った線（big … 溜めのとき。金色で大きく、横一文字の光も） */
  slash(ctx, f, q) {
    const big = !!f.big;
    const r = (big ? 46 : 34) + q * 6;
    const a0 = -2.5, a1 = 0.7;
    const head = a0 + (a1 - a0) * Math.min(1, q / 0.3);
    const tail = a0 + (a1 - a0) * Math.max(0, (q - 0.25) / 0.75);
    const T = big ? 6 : 4;
    const outer = big ? '#FFD84A' : '#9FE8FF';
    for (let a = tail; a <= head; a += 0.035) {
      const k = (a - tail) / Math.max(0.01, head - tail);   // しっぽ 0 → 先 1
      const th = Math.max(1, Math.round(T * Math.sin(Math.PI * Math.min(1, k * 1.1))));
      for (let j = 0; j < th; j++) {
        const rr = r - j;
        drFxDot(ctx, f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr, 2, j === 0 || j === th - 1 ? outer : '#FFFFFF');
      }
    }
    if (big && q < 0.3) {
      const w = 150 * (1 - q / 0.3);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(Math.round(f.x - w), Math.round(f.y), Math.round(w * 2), 2);
    }
  },
  /* 溜めの居合切り・溜めの青い火の玉・会心（PNG がないときは、ほかの仮の絵を使い回す） */
  slashBig(ctx, f, q, rnd) { DR_RPG_FX_DRAW.slash(ctx, Object.assign({}, f, { big: true }), q, rnd); },
  blueHit(ctx, f, q, rnd) { DR_RPG_FX_DRAW.fireHit(ctx, Object.assign({}, f, { blue: true }), q, rnd); },
  crit(ctx, f, q, rnd) { DR_RPG_FX_DRAW.stomp(ctx, f, q, rnd); },
  flutter(ctx, f, q, rnd) { DR_RPG_FX_DRAW.stomp(ctx, Object.assign({}, f, { small: true }), q, rnd); },   // バタ足（小さいふみつけ）
  /* 火の玉が当たった：ドットの爆発（blue … 溜めの青い火の玉） */
  fireHit(ctx, f, q, rnd) {
    const blue = !!f.blue;
    const R = (blue ? 26 : 16) * drFxEaseOut(Math.min(1, q / 0.5));
    const c = blue ? ['#2F6BFF', '#6FB7FF', '#FFFFFF'] : ['#E8352E', '#FF9A3C', '#FFE88A'];
    if (q < 0.6) {
      drFxDisc(ctx, f.x, f.y, Math.round(R), c[0]);
      drFxDisc(ctx, f.x, f.y, Math.round(R * 0.7), c[1]);
      drFxDisc(ctx, f.x, f.y, Math.round(R * 0.4 * (1 - q)), c[2]);
    }
    // けむり
    drFxFade(ctx, q, 0.4);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + rnd() * 0.5, d = R * 0.6 + q * (blue ? 34 : 24);
      drFxDot(ctx, f.x + Math.cos(a) * d, f.y + Math.sin(a) * d - q * 8, q < 0.5 ? 4 : 3, q < 0.5 ? c[1] : '#6B5B6E');
    }
  },
  /* スピンが当たった：回る3本の線 */
  spinHit(ctx, f, q) {
    drFxFade(ctx, q, 0.5);
    const r = 10 + drFxEaseOut(q) * 24, rot = q * 9;
    for (let k = 0; k < 3; k++) {
      for (let i = 0; i < 10; i++) {
        const a = rot + k * Math.PI * 2 / 3 + i * 0.12;
        drFxDot(ctx, f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * 0.8, i < 3 ? 3 : 2, i < 3 ? '#FFFFFF' : '#7FFFD4');
      }
    }
  },
  /* 回復：足元の光の輪と、のぼっていく「＋」 */
  heal(ctx, f, q, rnd) {
    drFxFade(ctx, q, 0.6);
    drFxRing(ctx, f.x, f.y, 18 + q * 6, 5 + q * 2, 2, '#7FFFD4', 4);
    for (let i = 0; i < 7; i++) {
      const x = f.x + (rnd() - 0.5) * 40, delay = rnd() * 0.4, sp = 30 + rnd() * 30;
      const k = q - delay;
      if (k <= 0) continue;
      const y = f.y - 6 - k * sp * 1.6;
      const c = Math.floor((q + i) * 10) % 2 ? '#FFFFFF' : '#7FFFD4';
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(x - 2), Math.round(y), 5, 1);
      ctx.fillRect(Math.round(x), Math.round(y - 2), 1, 5);
    }
  },
  /* 防御できた：六角形の盾 */
  guard(ctx, f, q) {
    drFxFade(ctx, q, 0.3);
    const r = 16 + q * 4;
    drFxHex(ctx, f.x, f.y, r, '#9FE8FF', 2);
  },
  /* パーフェクト防御：大きな白い盾と、きらきら */
  perfect(ctx, f, q, rnd) {
    drFxFade(ctx, q, 0.4);
    const r = 20 + drFxEaseOut(q) * 8;
    drFxHex(ctx, f.x, f.y, r, '#FFFFFF', 3);
    drFxHex(ctx, f.x, f.y, r - 5, '#7FFFD4', 1);
    for (let i = 0; i < 8; i++) {
      const a = rnd() * Math.PI * 2, d = r + q * 20;
      const x = f.x + Math.cos(a) * d, y = f.y + Math.sin(a) * d;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(Math.round(x - 2), Math.round(y), 5, 1);
      ctx.fillRect(Math.round(x), Math.round(y - 2), 1, 5);
    }
  },
  /* ボスの通常攻撃が当たった：3本のひっかき傷 */
  claw(ctx, f, q) {
    drFxFade(ctx, q, 0.45);
    const k = Math.min(1, q / 0.3);
    for (let i = 0; i < 3; i++) {
      const x0 = f.x + 6 + i * 7, y0 = f.y - 18, x1 = f.x - 12 + i * 7, y1 = f.y + 16;
      const xe = x0 + (x1 - x0) * k, ye = y0 + (y1 - y0) * k;
      drFxLine(ctx, x0 + 1, y0, xe + 1, ye, 2, '#FF5A7A');
      drFxLine(ctx, x0, y0, xe, ye, 1, '#FFFFFF');
    }
  },
  /* ボスの強攻撃が当たった：赤い大きな衝撃 */
  smash(ctx, f, q) {
    drFxFade(ctx, q, 0.5);
    if (q < 0.2) drFxDisc(ctx, f.x, f.y, 14, '#FFFFFF');
    const d = 8 + drFxEaseOut(q) * 26;
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      for (let k = 0; k < 4; k++) drFxDot(ctx, f.x + Math.cos(a) * (d + k * 4), f.y + Math.sin(a) * (d + k * 4), k < 2 ? 4 : 3, q < 0.35 ? '#FFFFFF' : (k % 2 ? '#FF9A3C' : '#FF5A7A'));
    }
  },
  /* ほのおのブレス：ボスの口（f.x, f.y）から自機（f.tx, f.ty）へ流れる炎 */
  breath(ctx, f, q, rnd) {
    const tx = f.tx == null ? f.x - 180 : f.tx, ty = f.ty == null ? f.y + 40 : f.ty;
    const cols = ['#FFE88A', '#FFD84A', '#FF9A3C', '#E8352E', '#8A2A3A'];
    for (let i = 0; i < 46; i++) {
      const delay = rnd() * 0.55, spread = (rnd() - 0.5) * 2, sz = 3 + Math.floor(rnd() * 3);
      const s = (q - delay) / 0.45;
      if (s <= 0 || s >= 1) continue;
      const x = f.x + (tx - f.x) * s, y = f.y + (ty - f.y) * s + spread * (4 + s * 22);
      drFxDot(ctx, x, y, Math.max(2, Math.round(sz * (0.6 + s * 0.8))), cols[Math.min(cols.length - 1, Math.floor(s * cols.length))]);
    }
  },
  /* 麻痺の稲妻 */
  bolt(ctx, f, q, rnd) {
    if (q > 0.5 && Math.floor(q * 12) % 2) return;   // 後半はちかちか
    let x = f.x, y = f.y - 22;
    for (let i = 0; i < 5; i++) {
      const nx = f.x + (rnd() - 0.5) * 16, ny = y + 9;
      drFxLine(ctx, x, y, nx, ny, 3, '#FFD84A');
      drFxLine(ctx, x, y, nx, ny, 1, '#FFFFFF');
      x = nx; y = ny;
    }
  },
  /* ボスを倒した：大きな爆発 */
  boom(ctx, f, q, rnd) {
    const R = 22 * drFxEaseOut(Math.min(1, q / 0.45));
    if (q < 0.55) {
      drFxDisc(ctx, f.x, f.y, Math.round(R), '#FF9A3C');
      drFxDisc(ctx, f.x, f.y, Math.round(R * 0.65), '#FFE88A');
      drFxDisc(ctx, f.x, f.y, Math.round(R * 0.3 * (1 - q)), '#FFFFFF');
    }
    drFxFade(ctx, q, 0.35);
    for (let i = 0; i < 10; i++) {
      const a = rnd() * Math.PI * 2, d = R * 0.7 + q * 30;
      drFxDot(ctx, f.x + Math.cos(a) * d, f.y + Math.sin(a) * d - q * 10, 4, q < 0.5 ? '#FFD84A' : '#6B5B6E');
    }
  },
};

/* 六角形の盾の線 */
function drFxHex(ctx, cx, cy, r, color, size) {
  for (let i = 0; i < 6; i++) {
    const a0 = i / 6 * Math.PI * 2 + Math.PI / 6, a1 = (i + 1) / 6 * Math.PI * 2 + Math.PI / 6;
    drFxLine(ctx, cx + Math.cos(a0) * r * 0.8, cy + Math.sin(a0) * r, cx + Math.cos(a1) * r * 0.8, cy + Math.sin(a1) * r, size, color);
  }
}
