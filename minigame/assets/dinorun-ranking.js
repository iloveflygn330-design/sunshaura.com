/* =====================================================
   きょうりゅうラン（dinorun）のランキングの読み書き
   minigame/index.html で dinorun-config.js のあと、dinorun.js より先に読み込む。

   ランキングは Google Apps Script（GAS）＋スプレッドシートに保存する。
     サーバー側のコードと設定手順: tools/dinorun-ranking/（Code.gs と README.md）
     接続先の URL: dinorun-config.js の DR_CONFIG.rankingUrl

   rankingUrl が空のあいだは、このブラウザの中だけの「仮ランキング」になる（localStorage に保存。テスト用）。

   GAS とのやりとり（サーバー側の Code.gs と同じ約束で動いている。片方だけ変えないこと）:
     GET  ?action=top         … ランキング { ok, all: [...], month: [...] }（1件 = { name, score, date }）
     GET  ?action=start       … プレイ開始の受付番号 { ok, token }（不正対策。スコア送信のときに必要）
     POST { action: 'submit', token, name, score, distance, coins, kills, grazes, slides, durationMs }
                              … スコア送信 { ok, rankAll, rankMonth }（ランク外は 0）
     ※ POST は Content-Type を付けずに送る（付けると GAS が受け付けない「事前確認」が走るため）
   ===================================================== */

const DRRanking = (function () {
  'use strict';

  const LOCAL_KEY = 'dinorun-local-ranking';
  const TIMEOUT_MS = 10000;

  function isOnline() { return !!DR_CONFIG.rankingUrl; }

  /* タイムアウト付きの fetch（GAS は初回が遅いことがあるので 10 秒待つ） */
  async function fetchJson(url, options) {
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT_MS) : null;
    try {
      const res = await fetch(url, Object.assign({ redirect: 'follow' }, options || {}, ctrl ? { signal: ctrl.signal } : {}));
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function monthKey(date) {
    // 日本時間の「年-月」（サーバー側もスプレッドシートのタイムゾーン＝日本時間で数える）
    const d = new Date(date.getTime() + 9 * 3600 * 1000);
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
  }

  /* ---- このブラウザだけの仮ランキング ---- */
  function localLoad() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]') || []; } catch (e) { return []; }
  }
  function localSave(list) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(0, 200))); } catch (e) { /* 保存できなくても遊べる */ }
  }
  function topOf(list, size) {
    return list.slice().sort((a, b) => b.score - a.score).slice(0, size)
      .map(r => ({ name: r.name, score: r.score, date: r.date }));
  }
  function localTop() {
    const list = localLoad();
    const m = monthKey(new Date());
    return {
      all: topOf(list, DR_CONFIG.rankingSize),
      month: topOf(list.filter(r => r.month === m), DR_CONFIG.rankingSize),
    };
  }

  /* ---- 外に見せる関数 ---- */

  /* ランキングを読む → { ok, all, month, local } */
  async function fetchTop() {
    if (!isOnline()) return Object.assign({ ok: true, local: true }, localTop());
    try {
      const data = await fetchJson(DR_CONFIG.rankingUrl + '?action=top&t=' + Date.now());
      if (!data || !data.ok) throw new Error((data && data.error) || 'bad response');
      return { ok: true, local: false, all: data.all || [], month: data.month || [] };
    } catch (e) {
      console.warn('[dinorun] ランキングを読めませんでした', e);
      return { ok: false, local: false, all: [], month: [], error: String(e.message || e) };
    }
  }

  /* プレイ開始の受付番号をもらう → token（失敗したら null） */
  async function startSession() {
    if (!isOnline()) return 'local';
    try {
      const data = await fetchJson(DR_CONFIG.rankingUrl + '?action=start&t=' + Date.now());
      return (data && data.ok && data.token) || null;
    } catch (e) {
      console.warn('[dinorun] 受付番号をもらえませんでした', e);
      return null;
    }
  }

  /* スコアを送る → { ok, rankAll, rankMonth, error } */
  async function submit(entry) {
    if (!isOnline()) {
      const now = new Date();
      const list = localLoad();
      list.push({ name: entry.name, score: entry.score, date: now.toISOString(), month: monthKey(now) });
      localSave(list);
      const top = localTop();
      const idx = (arr) => {
        const i = arr.findIndex(r => r.name === entry.name && r.score === entry.score && r.date === now.toISOString());
        return i >= 0 ? i + 1 : 0;
      };
      return { ok: true, local: true, rankAll: idx(top.all), rankMonth: idx(top.month) };
    }
    try {
      const data = await fetchJson(DR_CONFIG.rankingUrl, {
        method: 'POST',
        body: JSON.stringify(Object.assign({ action: 'submit' }, entry)),
      });
      if (!data || !data.ok) return { ok: false, error: (data && data.error) || 'bad response' };
      return { ok: true, local: false, rankAll: data.rankAll || 0, rankMonth: data.rankMonth || 0 };
    } catch (e) {
      console.warn('[dinorun] スコアを送れませんでした', e);
      return { ok: false, error: String(e.message || e) };
    }
  }

  return { isOnline, fetchTop, startSession, submit, monthKey };
})();
