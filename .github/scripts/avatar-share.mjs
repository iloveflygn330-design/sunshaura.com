/* =====================================================
   アバター改変ページ：アバターごとの共有用ページ（SNS のカード表示用）を作る

   X や Discord にリンクを貼ったとき、アバターの名前と画像がカードで出るようにするための小さなページ。
     avatar/p/<アバターID>/index.html … カード用の情報（OGP）だけを持つページ。
                                         開いた人はすぐに avatar/?id=<アバターID> へ移動する
     avatar/p/<アバターID>/ogp.jpg    … カードに出る画像（1200x630。背景画像の上にアバターを重ねたもの）
   アバター改変ページの「共有」ボタンは、この avatar/p/<アバターID>/ の URL を共有する。

   ※ X などは JavaScript を動かさずにページの <meta> だけを読むので、
     avatar/?id=... の URL のままではアバターごとのカードが出ない。そのためアバターごとにページを作っている。

   GitHub 上では自動で実行される（.github/workflows/avatar-build.yml）。
   avatars.js が更新されると、追加・変更されたアバターのページと画像が作られ、消えたアバターのページは消される。

   ★拡張予定: カードの文言・画像を変える場合
     下の SITE_URL / SITE_NAME / descriptionOf() / makeOgpImage() を書き換えて、--force を付けて実行する。

   自分で実行する場合（.github/scripts で npm install --no-save sharp@0.33.5 を済ませてから、リポジトリのフォルダで）:
     node .github/scripts/avatar-share.mjs           … 画像は、まだ無いものと元の画像が変わったものだけ作る
     node .github/scripts/avatar-share.mjs --force   … 全部作り直す
   ===================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const OUT_DIR = path.join(REPO, 'avatar', 'p');
const FORCE = process.argv.includes('--force');

const SITE_URL = 'https://sunshaura.com/';   // ★ サイトの URL（最後の / を忘れない）
const SITE_NAME = 'sunshaura.com';
const OGP_W = 1200, OGP_H = 630;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* カードに出る説明文：説明文の最初の 90 文字。説明がまだ無いときは決まった文 */
function descriptionOf(a) {
  const d = (a.desc || '').replace(/\s+/g, ' ').trim();
  if (!d || d === 'アバターの説明テキスト。') return `シャウラのアバター改変「${a.name}」`;
  return d.length > 90 ? d.slice(0, 90) + '…' : d;
}

/* カード画像：アバターの背景画像を 1200x630 に敷いて、アバター画像（main.png）を右寄りに重ねる */
async function makeOgpImage(a, out) {
  const file = (p) => path.join(REPO, p);
  const bg = a.bgImg && fs.existsSync(file(a.bgImg)) ? file(a.bgImg) : file('assets/images/ShareImg/bg.png');
  const base = await sharp(bg).resize(OGP_W, OGP_H, { fit: 'cover' }).toBuffer();
  const layers = [];
  if (a.mainImg && fs.existsSync(file(a.mainImg))) {
    const meta = await sharp(file(a.mainImg)).metadata();
    if (meta.hasAlpha) {
      // 透過画像：キャラクターだけを、下端に立たせるように重ねる
      const chara = await sharp(file(a.mainImg))
        .resize({ width: Math.round(OGP_W * 0.7), height: OGP_H - 30, fit: 'inside' })
        .png().toBuffer({ resolveWithObject: true });
      const left = Math.min(OGP_W - chara.info.width, Math.round(OGP_W * 0.62 - chara.info.width / 2));
      layers.push({ input: chara.data, left: Math.max(0, left), top: OGP_H - chara.info.height });
    } else {
      // 背景つきの画像（スクリーンショットなど）：白いフチと角丸を付けた写真として重ねる
      const FRAME = 10, R = 22;
      const photo = await sharp(file(a.mainImg))
        .resize({ width: Math.round(OGP_W * 0.6), height: OGP_H - 70 - FRAME * 2, fit: 'inside' })
        .toBuffer({ resolveWithObject: true });
      const w = photo.info.width + FRAME * 2, h = photo.info.height + FRAME * 2;
      const round = (W, H, r) => Buffer.from(`<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" rx="${r}" ry="${r}"/></svg>`);
      const inner = await sharp(photo.data).composite([{ input: round(photo.info.width, photo.info.height, R - FRAME / 2), blend: 'dest-in' }]).png().toBuffer();
      const framed = await sharp({ create: { width: w, height: h, channels: 4, background: '#ffffff' } })
        .composite([{ input: inner, left: FRAME, top: FRAME }, { input: round(w, h, R), blend: 'dest-in' }])
        .png().toBuffer();
      const left = Math.min(OGP_W - w - 20, Math.round(OGP_W * 0.62 - w / 2));
      layers.push({ input: framed, left: Math.max(20, left), top: Math.round((OGP_H - h) / 2) });
    }
  }
  await sharp(base).composite(layers).jpeg({ quality: 85 }).toFile(out);
}

function pageHtml(a) {
  const id = encodeURIComponent(a.id);
  const target = `../../?id=${id}`;
  const pageUrl = `${SITE_URL}avatar/p/${id}/`;
  const title = `${a.name} | アバター改変 | ${SITE_NAME}`;
  const desc = descriptionOf(a);
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!--
    このファイルは .github/scripts/avatar-share.mjs が自動で作る（手で編集しない）。
    SNS にリンクを貼ったときのカード表示用。開いた人はアバター改変ページへすぐ移動する。
  -->
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${esc(pageUrl)}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="${esc(SITE_NAME)}">
  <meta property="og:title" content="${esc(a.name + ' | アバター改変')}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${esc(pageUrl)}">
  <meta property="og:image" content="${esc(pageUrl)}ogp.jpg">
  <meta property="og:image:width" content="${OGP_W}">
  <meta property="og:image:height" content="${OGP_H}">
  <meta name="twitter:card" content="summary_large_image">
  <meta http-equiv="refresh" content="0; url=${esc(target)}">
  <script>location.replace(${JSON.stringify(target)});</script>
</head>
<body>
  <p><a href="${esc(target)}">${esc(a.name)} のページへ移動します</a></p>
</body>
</html>
`;
}

const avatars = (await import(pathToFileURL(path.join(REPO, 'avatars.js')).href)).default;
fs.mkdirSync(OUT_DIR, { recursive: true });
const STATE = path.join(OUT_DIR, 'state.json');   // カード画像を作ったときの元画像の中身（ハッシュ）
let prevState = {};
try { prevState = JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch (e) {}
const state = {};
const keep = new Set();
let pages = 0, images = 0;
for (const a of avatars) {
  if (!a.id || !/^[\w.-]+$/.test(a.id)) { console.warn('ID に使えない文字があるため飛ばしました:', a.id); continue; }
  keep.add(a.id);
  const dir = path.join(OUT_DIR, a.id);
  fs.mkdirSync(dir, { recursive: true });
  const html = pageHtml(a);
  const htmlPath = path.join(dir, 'index.html');
  if (!fs.existsSync(htmlPath) || fs.readFileSync(htmlPath, 'utf8') !== html) { fs.writeFileSync(htmlPath, html); pages++; }
  const img = path.join(dir, 'ogp.jpg');
  // 元の画像（main.png・背景）の中身が変わったときだけ作り直す（GitHub 上では日時が当てにならないため中身で比べる）
  const h = crypto.createHash('sha1');
  for (const p of [a.mainImg, a.bgImg]) { const f = p && path.join(REPO, p); h.update(f && fs.existsSync(f) ? fs.readFileSync(f) : '-'); }
  state[a.id] = h.digest('hex').slice(0, 16);
  const stale = !fs.existsSync(img) || prevState[a.id] !== state[a.id];
  if (FORCE || stale) {
    try { await makeOgpImage(a, img); images++; } catch (e) { console.warn('カード画像を作れませんでした:', a.id, e.message); }
  }
}
fs.writeFileSync(STATE, JSON.stringify(state, null, 1) + '\n');
// avatars.js から消えたアバターのページは消す
let removed = 0;
for (const name of fs.readdirSync(OUT_DIR)) {
  if (!keep.has(name) && fs.statSync(path.join(OUT_DIR, name)).isDirectory()) {
    fs.rmSync(path.join(OUT_DIR, name), { recursive: true });
    removed++;
  }
}
console.log(`ページ更新 ${pages} 件 / カード画像作成 ${images} 件 / 削除 ${removed} 件（全 ${keep.size} 件）`);
