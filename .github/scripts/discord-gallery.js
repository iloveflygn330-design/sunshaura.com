/* =====================================================
   フォトギャラリー：Discord に投稿された画像の取り込み
   .github/workflows/gallery-discord.yml から毎朝実行される（手元で動かす必要はない）。

   やること:
     1. 下の DISCORD_CHANNELS のチャンネルから、前回より後に投稿されたメッセージを読む
     2. 添付された画像をダウンロードして、WebP の圧縮版を2種類作る
          gallery/generated/thumb/<アルバム>/discord_<メッセージID>_<番号>_<ファイル名>.webp
          gallery/generated/large/<アルバム>/discord_<メッセージID>_<番号>_<ファイル名>.webp
        大きさ・画質は gallery-build.js の SIZES と同じ（PC から上げた写真とそろう）
     3. 取り込んだメッセージに ✅ のリアクションを付ける（Bot に「リアクションの追加」権限がある場合）
     4. どこまで読んだかを gallery/data/discord-state.json に記録する（次回はその続きから）
     5. gallery/data/photos.json（ギャラリーが読む一覧）を作り直す
     6. 追加した枚数を Discord の Webhook（ニュースと同じチャンネル）に通知する

   必要な設定（GitHub の Settings → Secrets and variables → Actions → Secrets）:
     DISCORD_BOT_TOKEN   : 画像を読む Bot のトークン（必須）
                           Bot には View Channels / Read Message History（必須）、Add Reactions（任意）の権限と、
                           Developer Portal で MESSAGE CONTENT INTENT をオンにしておくこと
     DISCORD_WEBHOOK_URL : 完了通知を送る Webhook（ニュース通知と共通。未設定なら通知しない）

   ※ 元の画像は Discord に残る（GitHub には圧縮版だけを上げる）。
     Discord のメッセージを消しても、サイトの写真は消えない。
     サイトから消したい場合は、gallery/generated/thumb と large から該当の discord_〜.webp を消して
     photos.json を作り直す（Claude に「この写真をギャラリーから消して」と頼んでもOK）。
   ===================================================== */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { GENERATED, SIZES, DISCORD_PREFIX, makeWebp, writeManifest } = require('./gallery-build.js');

/* -----------------------------------------------------
   ★拡張予定: 取り込むチャンネル
     チャンネルを増やすときは、ここに1行追加する。
       id    : Discord のチャンネルID（チャンネルを右クリック →「チャンネルIDをコピー」）
       album : 入れるアルバム（gallery/generated の中のフォルダ名。'' はアルバムなし＝「その他」）
               日本語のボタン名は gallery/assets/gallery.js の GALLERY_ALBUMS で付ける
       since : このチャンネルを初めて読むとき、この日時より後の投稿だけを取り込む（ISO形式）
               それより前の投稿は取り込まない（「これから投稿する分だけ」にするため）
     Bot がそのチャンネルを見られるように、チャンネルの権限設定も忘れずに。
  ----------------------------------------------------- */
const DISCORD_CHANNELS = [
  { id: '1558828712688881674', album: '', since: '2026-10-11T22:55:00+09:00' }
];

/* 取り込む画像の種類（拡張子） */
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

/* ★拡張予定: 完了通知の文面を変える場合はここを書き換える（{count}=枚数、{url}=ギャラリーのURL） */
const NOTIFY_TEXT = '📷 フォトギャラリーに写真を {count} 枚追加しました\n{url}';
const GALLERY_URL = process.env.GALLERY_BASE_URL || 'https://sunshaura.com/gallery/';

const STATE_FILE = path.join(GENERATED, '..', 'data', 'discord-state.json');
const API = 'https://discord.com/api/v10';
const TOKEN = process.env.DISCORD_BOT_TOKEN;

/* ---------- ヘルパー ---------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Discord のID（スノーフレーク）は日時から作れる。since の日時より後のIDを「ここから」として使う
function snowflakeFromDate(iso) {
  const ms = BigInt(new Date(iso).getTime()) - 1420070400000n;
  return (ms << 22n).toString();
}
const idLess = (a, b) => BigInt(a) < BigInt(b);

async function discord(method, url, body) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(API + url, {
      method,
      headers: {
        Authorization: 'Bot ' + TOKEN,
        'User-Agent': 'DiscordBot (https://sunshaura.com, 1.0)',
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (res.status === 429) {            // 回数制限：指定された時間待ってやり直す
      const data = await res.json().catch(() => ({}));
      await sleep(((data.retry_after || 1) * 1000) + 250);
      continue;
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`${method} ${url} → ${res.status} ${text.slice(0, 200)}`);
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }
  throw new Error(`${method} ${url} → 回数制限が続いたため中止`);
}

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch (e) { return { channels: {} }; }
}
function writeState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify({
    _note: 'Discord からどこまで取り込んだかの記録（.github/scripts/discord-gallery.js が自動で更新）。手で編集しないでください。',
    channels: state.channels
  }, null, 2) + '\n');
}

// ファイル名を安全な形にする（英数字・. _ - 以外は _ に置き換え、長すぎるものは切る）
function safeName(name) {
  const ext = (name.match(IMAGE_EXT) || [''])[0].toLowerCase();
  const base = name.slice(0, name.length - ext.length).replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').slice(0, 60);
  return (base || 'image') + ext;
}

/* チャンネルの「after より後」のメッセージを古い順にすべて取得する */
async function fetchMessagesAfter(channelId, after) {
  const all = [];
  let cursor = after;
  for (;;) {
    const page = await discord('GET', `/channels/${channelId}/messages?after=${cursor}&limit=100`);
    if (!page.length) break;
    page.sort((a, b) => (idLess(a.id, b.id) ? -1 : 1));
    all.push(...page);
    cursor = page[page.length - 1].id;
    if (page.length < 100) break;
  }
  return all;
}

async function importAttachment(att, msgId, index, album) {
  const name = `${DISCORD_PREFIX}${msgId}_${index}_${safeName(att.filename)}`;
  const rel = (album ? album + '/' : '') + name + '.webp';
  const thumb = path.join(GENERATED, 'thumb', rel);
  const large = path.join(GENERATED, 'large', rel);
  if (fs.existsSync(thumb) && fs.existsSync(large)) return 'skip';   // 取り込み済み（やり直し時など）

  const res = await fetch(att.url);
  if (!res.ok) throw new Error(`画像のダウンロードに失敗 ${att.filename}: ${res.status}`);
  const tmp = path.join(os.tmpdir(), name);
  fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  try {
    await makeWebp(tmp, thumb, SIZES.thumb);
    await makeWebp(tmp, large, SIZES.large);
  } catch (e) {
    for (const f of [thumb, large]) if (fs.existsSync(f)) fs.unlinkSync(f);
    throw e;
  } finally {
    fs.unlinkSync(tmp);
  }
  return 'made';
}

async function notify(count) {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook || count === 0) return;
  const content = NOTIFY_TEXT.replace('{count}', count).replace('{url}', GALLERY_URL);
  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, allowed_mentions: { parse: [] } })
  });
  console.log('完了通知:', res.status);
}

/* ---------- 本体 ---------- */
async function main() {
  if (!TOKEN) {
    console.error('DISCORD_BOT_TOKEN が設定されていません（GitHub の Settings → Secrets に登録してください）');
    process.exit(1);
  }

  const state = readState();
  let made = 0;

  for (const ch of DISCORD_CHANNELS) {
    const after = state.channels[ch.id] || snowflakeFromDate(ch.since);
    let messages;
    try {
      messages = await fetchMessagesAfter(ch.id, after);
    } catch (e) {
      if (e.status === 403 || e.status === 401) {
        console.error(`チャンネル ${ch.id} を読めません。Bot のトークン・チャンネル権限（View Channels / Read Message History）を確認してください。`);
      }
      throw e;
    }
    console.log(`チャンネル ${ch.id}: 新しいメッセージ ${messages.length} 件`);

    let lastDone = after;
    for (const msg of messages) {
      const images = (msg.attachments || []).filter((a) =>
        (a.content_type || '').startsWith('image/') || IMAGE_EXT.test(a.filename));
      let added = 0;
      try {
        for (let i = 0; i < images.length; i++) {
          if (await importAttachment(images[i], msg.id, i + 1, ch.album) === 'made') added++;
        }
      } catch (e) {
        // 失敗したメッセージから先は、次回もう一度読む（ここまでを記録して止める）
        console.error(`メッセージ ${msg.id} の取り込みに失敗したため、ここで止めます:`, e.message);
        break;
      }
      made += added;
      lastDone = msg.id;
      if (images.length) {
        console.log(`  ${msg.id}: 画像 ${images.length} 枚（新規 ${added}）`);
        // 取り込んだ印に ✅ を付ける（権限がなければ何もしない）
        await discord('PUT', `/channels/${ch.id}/messages/${msg.id}/reactions/%E2%9C%85/@me`).catch(() => {});
      }
    }
    state.channels[ch.id] = lastDone;
  }

  writeState(state);
  const entries = writeManifest();
  console.log(`追加 ${made} 枚 / 一覧 ${entries.length} 枚`);
  fs.writeFileSync(path.join(os.tmpdir(), 'gallery-added-count'), String(made));
  // 通知はコミット・push が終わってから workflow 側で送る（node discord-gallery.js --notify <枚数>）
}

if (process.argv[2] === '--notify') {
  notify(Number(process.argv[3] || 0)).catch((e) => { console.error(e); process.exit(1); });
} else {
  main().catch((e) => { console.error(e); process.exit(1); });
}
