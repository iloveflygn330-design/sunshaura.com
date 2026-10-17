/* =====================================================
   ニュース動画を MP4 に書き出す（GitHub Actions で実行）

   使い方:
     node tools/news-video/render.mjs <記事フォルダ> <出力フォルダ> <サイトのURL>
       例: node tools/news-video/render.mjs news/column/202610/17 out http://localhost:8000/
     ※ <サイトのURL> は、リポジトリのトップを配信しているサーバーのURL
       （立ち絵・音声をそこから読み込む。Actions では python の簡易サーバーを使う）

   出力（<出力フォルダ>/ に作る）:
     sunshaura-news-YYYY-MM-DD.mp4   … 動画（1920×1080, 30fps）
     thumbnail-YYYY-MM-DD.jpg         … YouTube用のサムネイル候補（1本目のニュースの場面）
     description-YYYY-MM-DD.txt       … YouTube用の説明文（出典・クレジット入り）
     title-YYYY-MM-DD.txt             … YouTube用のタイトル

   ★拡張予定: 説明文やタイトルの書き方を変える場合は、下の makeTitle / makeDescription を編集する
   ===================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const [, , articleDir, outDir = 'out', siteUrl = 'http://localhost:8000/'] = process.argv;
if (!articleDir) {
  console.error('使い方: node render.mjs <記事フォルダ> <出力フォルダ> <サイトのURL>');
  process.exit(1);
}
const SITE = siteUrl.replace(/\/?$/, '/');
const PUBLIC_SITE = 'https://sunshaura.com/';

const video = JSON.parse(fs.readFileSync(path.join(articleDir, 'video.json'), 'utf8'));
const article = JSON.parse(fs.readFileSync(path.join(articleDir, 'article.json'), 'utf8'));
const date = video.date;
const relDir = articleDir.replace(/\\/g, '/').replace(/^\.?\//, '').replace(/\/?$/, '/'); // news/column/YYYYMM/DD/
const articleUrl = PUBLIC_SITE + relDir;

/* ---------- YouTube 用のタイトルと説明文 ---------- */
function makeTitle() {
  const [, m, d] = date.split('-').map(Number);
  return `【${m}月${d}日のVRニュース】${article.items[0] ? article.items[0].headline : article.title}ほか【ずんだもん】`;
}
function makeDescription() {
  const [y, m, d] = date.split('-');
  const lines = [];
  lines.push(`${y}年${Number(m)}月${Number(d)}日のVRニュースを、ずんだもんたちが読み上げます。`);
  lines.push('');
  lines.push('▼ 記事ページ');
  lines.push(articleUrl);
  lines.push('');
  lines.push('▼ 今日のニュース');
  article.items.forEach((it, i) => {
    lines.push(`${i + 1}. ${it.headline}`);
    (it.sources || []).forEach((s) => lines.push(`   出典：${s.name} ${s.url}`));
  });
  lines.push('');
  lines.push('※ ニュースは公開情報をもとにAI（Claude）が要約しています。正確な情報は各出典をご確認ください。');
  lines.push('※ 星座占いはエンタメです。');
  lines.push('');
  lines.push('▼ クレジット');
  video.credits.voice.split(' / ').forEach((v) => lines.push(v));
  (video.credits.extra || []).forEach((c) => lines.push(`${c.label}：${c.text}`));
  (video.credits.bgm || []).forEach((b) => lines.push(`BGM：${[b.title, b.artist, b.site].filter(Boolean).join(' / ')}`));
  return lines.join('\n') + '\n';
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const inputProps = {
    video,
    article,
    base: SITE + 'news/',
    audioSrc: SITE + relDir + video.audio,
    skipFont: process.env.SKIP_FONT === '1'
  };

  console.log('バンドル中…');
  const serveUrl = await bundle({ entryPoint: path.join(__dirname, 'src', 'root.jsx') });
  const composition = await selectComposition({ serveUrl, id: 'NewsVideo', inputProps, browserExecutable: process.env.BROWSER_EXECUTABLE || null });

  const mp4 = path.join(outDir, `sunshaura-news-${date}.mp4`);
  console.log(`書き出し中… ${composition.durationInFrames}フレーム`);
  let last = -1;
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    crf: 22,
    outputLocation: mp4,
    inputProps,
    browserExecutable: process.env.BROWSER_EXECUTABLE || null,
    frameRange: process.env.FRAME_RANGE ? process.env.FRAME_RANGE.split('-').map(Number) : null,
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 10);
      if (p !== last) { last = p; console.log(`  ${p * 10}%`); }
    }
  });

  // サムネイル候補：1本目のニュースが始まって3秒後の場面
  const news1 = video.sections.find((s) => s.type === 'news');
  const thumbFrame = Math.min(composition.durationInFrames - 1, Math.round(((news1 ? news1.start : 0) + 3) * composition.fps));
  await renderStill({
    composition, serveUrl, inputProps, frame: process.env.FRAME_RANGE ? Number(process.env.FRAME_RANGE.split('-')[0]) : thumbFrame,
    output: path.join(outDir, `thumbnail-${date}.jpg`), imageFormat: 'jpeg', jpegQuality: 90,
    browserExecutable: process.env.BROWSER_EXECUTABLE || null
  });

  fs.writeFileSync(path.join(outDir, `title-${date}.txt`), makeTitle() + '\n');
  fs.writeFileSync(path.join(outDir, `description-${date}.txt`), makeDescription());
  console.log('完了:', mp4, `(${(fs.statSync(mp4).size / 1048576).toFixed(1)}MB)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
