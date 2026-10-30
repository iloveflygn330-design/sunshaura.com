/* =====================================================
   きょうりゅうラン（minigame の dinorun）のランキング用 Google Apps Script

   これはサイトには公開されない（tools/ は公開の対象外）。
   Google スプレッドシートの「拡張機能 → Apps Script」に、この中身をまるごと貼り付けて使う。
   設定の手順は同じフォルダの README.md。

   サイト側（minigame/assets/dinorun-ranking.js）とのやりとり:
     GET  ?action=top    … ランキング（全期間・今月の上位）
     GET  ?action=start  … プレイ開始の受付番号（不正対策）
     POST { action: 'submit', token, name, score, distance, coins, kills, grazes, slides, durationMs } … スコア登録

   秘密の値（Discord の Webhook URL）はこのコードに書かない。
   Apps Script の「プロジェクトの設定 → スクリプト プロパティ」に DISCORD_WEBHOOK_URL として入れる。
   ===================================================== */

/* ---- 設定（サイト側の dinorun-config.js と合わせる） ---- */
const SHEET_NAME   = 'scores';        // スコアを書き込むシートの名前（なければ自動で作る）
const RANK_SIZE    = 10;              // 何位まで返すか（DR_CONFIG.rankingSize）
const NAME_PATTERN = /^[A-Z]{3}$/;    // 名前のルール（DR_CONFIG.nameLetters / nameChars）
const SCORE_COIN   = 10;              // DR_CONFIG.scoreCoin
const SCORE_KILL   = 25;              // DR_CONFIG.scoreKill
const SCORE_GRAZE  = 15;              // DR_CONFIG.scoreGraze
const SCORE_SLIDE  = 20;              // DR_CONFIG.scoreSlide
const MAX_METERS_PER_SEC = 44 * 1.6;  // 最高速（DR_CONFIG.speedMax ÷ pxPerMeter）に余裕を足したもの
                                      // （急降下コンボのスピン＋15m・スライディング＋8m で、最高速より速く進むことがあるので大きめ）
const TOKEN_TTL_SEC = 21600;          // 受付番号の有効期限（秒。6時間が上限）
const TIMEZONE = 'Asia/Tokyo';
const DEFAULT_GAME_URL = 'https://sunshaura.com/minigame/?game=dinorun';   // Discord 通知に付けるリンク

/* ---- 入口 ---- */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || '';
  try {
    if (action === 'top') return json_(Object.assign({ ok: true }, getTop_()));
    if (action === 'start') return json_(start_());
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action === 'submit') return json_(submit_(body));
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---- プレイ開始：受付番号を発行して、発行した時刻を覚えておく ---- */
function start_() {
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put('t_' + token, String(Date.now()), TOKEN_TTL_SEC);
  return { ok: true, token };
}

/* ---- スコア登録（ありえない値は弾く） ---- */
function submit_(b) {
  const cache = CacheService.getScriptCache();
  const key = 't_' + String(b.token || '');
  const started = Number(cache.get(key));
  if (!started) return { ok: false, error: 'invalid token' };   // 受付番号がない・期限切れ・使用済み
  cache.remove(key);                                           // 1回のプレイで1回だけ登録できる

  const name = String(b.name || '').toUpperCase();
  if (!NAME_PATTERN.test(name)) return { ok: false, error: 'invalid name' };

  const n = v => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.floor(Number(v)) : -1);
  const score = n(b.score), distance = n(b.distance), coins = n(b.coins), kills = n(b.kills), durationMs = n(b.durationMs);
  const grazes = b.grazes === undefined ? 0 : n(b.grazes);
  const slides = b.slides === undefined ? 0 : n(b.slides);
  if ([score, distance, coins, kills, grazes, slides, durationMs].some(v => v < 0)) return { ok: false, error: 'invalid number' };

  const durSec = durationMs / 1000;
  const elapsedSec = (Date.now() - started) / 1000;
  // 遊んだ時間が、受付からの経過時間より長いのはおかしい
  if (durSec > elapsedSec + 5) return { ok: false, error: 'time check' };
  // 最高速でも走れない距離はおかしい
  if (distance > MAX_METERS_PER_SEC * durSec + 50) return { ok: false, error: 'distance check' };
  // 距離に対して、コイン・壊した数が多すぎるのはおかしい
  if (coins > distance * 0.6 + 20) return { ok: false, error: 'coin check' };
  if (kills > distance * 0.5 + 10) return { ok: false, error: 'kill check' };
  if (kills + grazes + slides > distance * 0.5 + 10) return { ok: false, error: 'graze check' };
  // スコアの計算が合わないのはおかしい
  if (score !== distance + coins * SCORE_COIN + kills * SCORE_KILL + grazes * SCORE_GRAZE + slides * SCORE_SLIDE) return { ok: false, error: 'score check' };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  let before, after;
  try {
    before = getTop_();
    const sheet = getSheet_();
    const now = new Date();
    sheet.appendRow([now, "'" + Utilities.formatDate(now, TIMEZONE, 'yyyy/MM'), name, score, distance, coins, kills, Math.round(durSec), grazes, slides]);
    SpreadsheetApp.flush();
    after = getTop_();
  } finally {
    lock.releaseLock();
  }

  const rankOf = list => {
    const i = list.findIndex(r => r.name === name && r.score === score);
    return i >= 0 ? i + 1 : 0;
  };
  const rankAll = rankOf(after.all);

  // 全期間の1位が入れ替わったら Discord に知らせる
  const prevTop = before.all[0];
  if (rankAll === 1 && (!prevTop || score > prevTop.score)) notifyDiscord_(name, score, prevTop);

  return { ok: true, rankAll, rankMonth: rankOf(after.month) };
}

/* ---- ランキングを作る ---- */
function getTop_() {
  const sheet = getSheet_();
  const last = sheet.getLastRow();
  const rows = last >= 2 ? sheet.getRange(2, 1, last - 1, 4).getValues() : [];
  const thisMonth = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM');
  const all = [];
  rows.forEach(r => {
    const d = r[0] instanceof Date ? r[0] : new Date(r[0]);
    if (!r[2] || isNaN(d.getTime())) return;
    all.push({
      name: String(r[2]), score: Number(r[3]) || 0,
      date: Utilities.formatDate(d, TIMEZONE, 'yyyy-MM-dd'),
      month: Utilities.formatDate(d, TIMEZONE, 'yyyy-MM'),
    });
  });
  // 同点のときは先に出した人が上
  const sortTop = list => list.slice().sort((a, b) => b.score - a.score).slice(0, RANK_SIZE)
    .map(r => ({ name: r.name, score: r.score, date: r.date }));
  return { all: sortTop(all), month: sortTop(all.filter(r => r.month === thisMonth)) };
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['日時', '月', '名前', 'スコア', '距離(m)', 'コイン', '壊した数', '遊んだ秒数', 'かすり', 'スライディング']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/* ---- Discord 通知（スクリプト プロパティの DISCORD_WEBHOOK_URL に送る。なければ何もしない） ---- */
function notifyDiscord_(name, score, prevTop) {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty('DISCORD_WEBHOOK_URL');
  if (!url) return;
  const link = props.getProperty('GAME_URL') || DEFAULT_GAME_URL;
  const prev = prevTop ? `（これまでの1位: ${prevTop.name} ${prevTop.score.toLocaleString()}点）` : '';
  const content = `🦖 **きょうりゅうラン** 新記録！\n**${name}** さんが **${score.toLocaleString()}点** で全期間1位になりました${prev}\n${link}`;
  try {
    UrlFetchApp.fetch(url, {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify({ content }), muteHttpExceptions: true,
    });
  } catch (err) {
    console.warn('Discord に送れませんでした', err);
  }
}

/* ---- 動作確認用（Apps Script の画面で、関数を選んで「実行」） ---- */
function testTop() { console.log(JSON.stringify(getTop_())); }
function testDiscord() { notifyDiscord_('TST', 12345, null); }
