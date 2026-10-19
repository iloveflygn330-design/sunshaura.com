/* =====================================================
   このサイトについて：プロフィールカードの「今のひとこと」を Discord から取り込む
   .github/workflows/about-status.yml から30分ごとに実行される（手元で動かす必要はない）。

   使い方:
     ひとこと用のチャンネル（下の CHANNEL_ID_IN_FILE）に、ひとことを投稿するだけ。
     いちばん新しい投稿（Bot の投稿は除く）の文字が、カードの「今のひとこと」になる。
     最大30分ほどで取り込まれ、その数分後にサイトに反映される。
     取り込んだ投稿には ✅ のリアクションが付く（Bot に「リアクションの追加」権限がある場合）。
     すぐに変えたいときは、GitHub の Actions タブ →「About status from Discord」→「Run workflow」。

   やること:
     1. チャンネルの新しい投稿を20件読み、Bot 以外のいちばん新しい投稿の文字を取り出す
          ・カスタム絵文字・メンション・URL は消す（カードでは表示できないため。URL だけの投稿は取り込まない）
          ・長すぎる場合は MAX_LENGTH 文字で切る（カードは2行まで）
     2. about/data/status.json に書く（前と同じ文字なら何もしない＝コミットもしない）
          { text: 文字, updatedAt: 投稿日時, messageId: 投稿のID }
        カード（about/assets/about.js）はこのファイルを読んで表示する

   必要な設定（GitHub の Settings → Secrets and variables → Actions → Secrets）:
     DISCORD_BOT_TOKEN : フォトギャラリーと同じ Bot のトークン（設定済みのものをそのまま使う）
                         Bot がひとこと用チャンネルを見られるように、チャンネルの権限設定も忘れずに
                         （View Channel / Read Message History。✅ を付けるなら Add Reactions）

   ★拡張予定: ひとこと用のチャンネルを決める（最初の1回だけ）
     1. Discord でひとこと用のチャンネルを作る（自分だけが見られるチャンネルがおすすめ）
     2. チャンネルを右クリック →「チャンネルIDをコピー」（開発者モードをオンにすると出る）
     3. 下の CHANNEL_ID_IN_FILE の '' の中に貼り付けて push する
        （GitHub の Settings → Secrets and variables → Actions → Variables に
          DISCORD_STATUS_CHANNEL_ID という名前で入れても OK。こちらが優先される）
     チャンネルID が空のあいだは、何もせずに終わる（カードには about-data.js の status.fallback が出る）。

   ★拡張予定: 自分以外の投稿を取り込まないようにする
     ALLOWED_AUTHOR_IDS に自分の Discord ユーザーID を入れる（空のときは、Bot 以外の誰の投稿でも取り込む）。
     ユーザーID は、自分のアイコンを右クリック →「ユーザーIDをコピー」。
   ===================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const CHANNEL_ID_IN_FILE = '1561578487306002513';   // ← ここにひとこと用チャンネルのIDを貼る
const STATUS_CHANNEL_ID = process.env.DISCORD_STATUS_CHANNEL_ID || CHANNEL_ID_IN_FILE;
const ALLOWED_AUTHOR_IDS = [];
const MAX_LENGTH = 40;   // ★拡張予定: カードに出す最大の文字数（増やしすぎるとカードからはみ出す）

const REPO = path.resolve(__dirname, '../..');
const OUT = path.join(REPO, 'about', 'data', 'status.json');
const API = 'https://discord.com/api/v10';
const TOKEN = process.env.DISCORD_BOT_TOKEN;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function discord(method, url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(API + url, {
      method,
      headers: { Authorization: 'Bot ' + TOKEN, 'User-Agent': 'DiscordBot (https://sunshaura.com, 1.0)' }
    });
    if (res.status === 429) {            // 回数制限：指定された時間待ってやり直す
      const data = await res.json().catch(() => ({}));
      await sleep(((data.retry_after || 1) * 1000) + 250);
      continue;
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`${method} ${url} → ${res.status} ${text.slice(0, 200)}`);
    }
    return res.status === 204 ? null : res.json();
  }
  throw new Error(`${method} ${url} → 回数制限が続いたため中止`);
}

/* カードで表示できない部分を取り除く */
function cleanText(s) {
  let t = String(s || '')
    .replace(/<a?:\w+:\d+>/g, '')          // カスタム絵文字
    .replace(/<[@#][!&]?\d+>/g, '')        // メンション・チャンネル
    .replace(/<t:\d+(:\w)?>/g, '')         // 日時の埋め込み
    .replace(/<?https?:\/\/\S+>?/g, '')     // URL（Bot の招待リンクなどを貼ったときに、ひとことにしないため）
    .replace(/\s+/g, ' ')
    .trim();
  const chars = Array.from(t);             // 絵文字を途中で切らないよう、1文字ずつに分けて数える
  if (chars.length > MAX_LENGTH) t = chars.slice(0, MAX_LENGTH - 1).join('') + '…';
  return t;
}

async function main() {
  if (!STATUS_CHANNEL_ID) {
    console.log('ひとこと用のチャンネルID が未設定のため、何もしません（設定方法はこのファイルの先頭）');
    return;
  }
  if (!TOKEN) throw new Error('DISCORD_BOT_TOKEN が設定されていません');

  const msgs = await discord('GET', `/channels/${STATUS_CHANNEL_ID}/messages?limit=20`);
  msgs.sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? 1 : -1));   // 新しい順
  const msg = msgs.find((m) => !m.author.bot &&
    (!ALLOWED_AUTHOR_IDS.length || ALLOWED_AUTHOR_IDS.includes(m.author.id)) &&
    cleanText(m.content));
  if (!msg) { console.log('取り込める投稿がありません'); return; }

  const text = cleanText(msg.content);
  let current = {};
  try { current = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) {}
  if (current.text === text && current.messageId === msg.id) { console.log('変更なし: ' + text); return; }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({
    _note: 'Discord から取り込んだ「今のひとこと」（.github/scripts/discord-status.js が自動で更新）。手で編集しないでください。',
    text,
    updatedAt: msg.timestamp,
    messageId: msg.id
  }, null, 2) + '\n');
  console.log('更新: ' + text);

  // 取り込んだ印に ✅ を付ける（権限がなければ何もしない）
  try {
    await discord('PUT', `/channels/${STATUS_CHANNEL_ID}/messages/${msg.id}/reactions/${encodeURIComponent('✅')}/@me`);
  } catch (e) {
    console.log('リアクションは付けられませんでした（権限がない場合は無視してよい）');
  }
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
