/* =====================================================
   ニュース動画を YouTube にアップロードする（GitHub Actions で実行）

   使い方:
     node tools/news-video/upload-youtube.mjs <フォルダ> <日付>
       例: node tools/news-video/upload-youtube.mjs out 2026-11-04
     <フォルダ> には render.mjs が作ったファイルが入っている必要がある:
       sunshaura-news-<日付>.mp4 / thumbnail-<日付>.jpg / title-<日付>.txt / description-<日付>.txt

   必要な環境変数（GitHub の Secrets から渡す。値はファイルやメモに書かない）:
     YT_CLIENT_ID / YT_CLIENT_SECRET / YT_REFRESH_TOKEN … Google Cloud の OAuth クライアントと、
       OAuth Playground で取ったリフレッシュトークン（権限は youtube.upload だけ）
   任意の環境変数:
     YT_PRIVACY … 公開設定。private（非公開）/ unlisted（限定公開）/ public（公開）。既定は private
       ※ YouTube API Services の審査（監査）に通るまでは、何を指定しても YouTube 側で非公開に固定される

   出力:
     <フォルダ>/youtube-<日付>.txt … アップロードした動画の URL（Releases に置いて、二重投稿の防止に使う）

   ★拡張予定: 再生リストに追加する・タグを変える・カテゴリを変える場合は、下の YT_SETTINGS を編集する
     （再生リストへの追加は youtube.upload の権限ではできないため、権限の追加とトークンの取り直しが必要）
   ===================================================== */
import fs from 'node:fs';
import path from 'node:path';

const [, , dir = 'out', date] = process.argv;
if (!date) {
  console.error('使い方: node upload-youtube.mjs <フォルダ> <日付 YYYY-MM-DD>');
  process.exit(1);
}

const YT_SETTINGS = {
  categoryId: '28',                 // 28 = 科学と技術（22 = ブログ、20 = ゲーム、25 = ニュースと政治）
  tags: ['VRChat', 'VRニュース', 'ずんだもん', 'VOICEVOX', 'sunshaura'],
  language: 'ja'
};

const { YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN } = process.env;
const PRIVACY = ['private', 'unlisted', 'public'].includes(process.env.YT_PRIVACY) ? process.env.YT_PRIVACY : 'private';
if (!YT_CLIENT_ID || !YT_CLIENT_SECRET || !YT_REFRESH_TOKEN) {
  console.log('YouTube の認証情報（Secrets）が未設定のため、アップロードをスキップします。');
  process.exit(0);
}

const file = (name) => path.join(dir, name);
const mp4 = file(`sunshaura-news-${date}.mp4`);
const thumb = file(`thumbnail-${date}.jpg`);

/* YouTube のタイトル・説明文で使えない文字（< >）を置き換え、長さの上限に収める */
function clean(text, maxChars) {
  const s = text.replace(/</g, '＜').replace(/>/g, '＞').trim();
  return [...s].slice(0, maxChars).join('');
}
function cleanDescription(text) {
  // 説明文の上限は 5000 バイト
  let s = text.replace(/</g, '＜').replace(/>/g, '＞');
  while (Buffer.byteLength(s, 'utf8') > 4900) s = s.slice(0, -1);
  return s;
}

/* リフレッシュトークンから、1時間だけ使えるアクセストークンをもらう */
async function accessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: YT_CLIENT_ID, client_secret: YT_CLIENT_SECRET,
      refresh_token: YT_REFRESH_TOKEN, grant_type: 'refresh_token'
    })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`アクセストークンの取得に失敗しました（${res.status}）: ${json.error} ${json.error_description || ''}\n` +
    '→ invalid_grant の場合は、リフレッシュトークンの期限切れか取り消しです。OAuth Playground で取り直して YT_REFRESH_TOKEN を更新してください。');
  return json.access_token;
}

async function main() {
  const title = clean(fs.readFileSync(file(`title-${date}.txt`), 'utf8'), 100);
  const description = cleanDescription(fs.readFileSync(file(`description-${date}.txt`), 'utf8'));
  const token = await accessToken();
  const size = fs.statSync(mp4).size;

  // 1. アップロードの受付（再開可能アップロード）
  const meta = {
    snippet: {
      title, description,
      tags: YT_SETTINGS.tags,
      categoryId: YT_SETTINGS.categoryId,
      defaultLanguage: YT_SETTINGS.language,
      defaultAudioLanguage: YT_SETTINGS.language
    },
    status: { privacyStatus: PRIVACY, selfDeclaredMadeForKids: false, embeddable: true }
  };
  const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': 'video/mp4',
      'X-Upload-Content-Length': String(size)
    },
    body: JSON.stringify(meta)
  });
  if (!init.ok) throw new Error(`アップロードの受付に失敗しました（${init.status}）: ${await init.text()}`);
  const uploadUrl = init.headers.get('location');

  // 2. 動画ファイルを送る
  console.log(`アップロード中… ${(size / 1048576).toFixed(1)}MB（公開設定: ${PRIVACY}）`);
  const up = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(size) },
    body: fs.readFileSync(mp4)
  });
  const video = await up.json();
  if (!up.ok) throw new Error(`アップロードに失敗しました（${up.status}）: ${JSON.stringify(video)}`);
  const url = `https://youtu.be/${video.id}`;
  console.log(`アップロード完了: ${url}（YouTube 側の公開設定: ${video.status && video.status.privacyStatus}）`);

  // 3. サムネイルを設定する（チャンネルの電話番号認証が済んでいる必要がある。失敗しても動画はそのまま）
  if (fs.existsSync(thumb)) {
    const t = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${video.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/jpeg' },
      body: fs.readFileSync(thumb)
    });
    console.log(t.ok ? 'サムネイルを設定しました' : `サムネイルの設定に失敗しました（${t.status}）: ${await t.text()}`);
  }

  fs.writeFileSync(file(`youtube-${date}.txt`), url + '\n');
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
