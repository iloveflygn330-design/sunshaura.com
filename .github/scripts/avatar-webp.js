/* =====================================================
   アバター改変ページ：画像の軽量版（WebP）を作る

   assets/images/ の中の PNG / JPG から、同じ場所に同じ名前の .webp を作る。
     例: assets/images/1010_akahinata/thumbnail/main.png → main.webp
   作った WebP の一覧を assets/images/webp.json に書く。
   アバター改変ページ（avatar/assets/avatar.js）はこの一覧を読んで、
   WebP があるものは WebP を、まだ無いもの（追加した直後など）は元の PNG を表示する。

   GitHub 上では自動で実行される（.github/workflows/avatar-build.yml）。
   avatar_form.html で画像を保存すると、数分後に WebP ができてコミットされる。
   元の PNG は消さない（avatar_form.html やほかのページはそのまま PNG を使える）。

   ★拡張予定: 画質・大きさを変える場合
     下の QUALITY（0〜100。大きいほどきれいで重い）/ MAX_SIDE（長辺の上限 px）を書き換えて、
     --force を付けて実行すると全部作り直す。

   自分で実行する場合（Node.js が入っている PC で、リポジトリのフォルダから）:
     cd .github/scripts
     npm install --no-save sharp@0.33.5      ← 初回だけ
     cd ../..
     node .github/scripts/avatar-webp.js           … まだ WebP が無い・元の画像が変わったものだけ作る
     node .github/scripts/avatar-webp.js --force   … 全部作り直す
   ===================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const crypto = require('crypto');

const REPO = path.resolve(__dirname, '../..');
const IMAGES = path.join(REPO, 'assets', 'images');
const MANIFEST = path.join(IMAGES, 'webp.json');

const QUALITY = 82;       // WebP の画質
const MAX_SIDE = 1920;    // 長辺がこれより大きい画像は縮小する（背景画像 1920x640 はそのまま）
const SRC_EXT = /\.(png|jpe?g)$/i;
const FORCE = process.argv.includes('--force');

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (SRC_EXT.test(ent.name)) out.push(p);
  }
  return out;
}

(async () => {
  const sources = walk(IMAGES).sort();
  // 前回作ったときの元画像の中身（ハッシュ）。中身が変わった画像だけ作り直す
  //  （GitHub 上ではファイルの日時が当てにならないため、日時ではなく中身で比べる）
  let prev = {};
  try { prev = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')).hashes || {}; } catch (e) {}
  const hashes = {};
  const listed = [];
  let made = 0, before = 0, after = 0;
  for (const src of sources) {
    const out = src.replace(SRC_EXT, '.webp');
    const rel = path.relative(IMAGES, src).split(path.sep).join('/');
    const hash = crypto.createHash('sha1').update(fs.readFileSync(src)).digest('hex').slice(0, 16);
    hashes[rel] = hash;
    const fresh = fs.existsSync(out) && prev[rel] === hash;
    if (FORCE || !fresh) {
      try {
        await sharp(src)
          .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: QUALITY, alphaQuality: 90, effort: 5 })
          .toFile(out);
        made++;
        console.log('作成', rel.replace(SRC_EXT, '.webp'));
      } catch (e) {
        console.warn('作れませんでした（元の画像のまま表示されます）:', rel, e.message);
        continue;
      }
    }
    // WebP の方が大きくなってしまった画像は、一覧に載せない（元の画像を使う方が軽いため）
    const a = fs.statSync(src).size, b = fs.statSync(out).size;
    before += a;
    if (b < a) { listed.push(rel); after += b; } else { after += a; }
  }
  // 元の画像が消えた WebP は消す
  const webps = [];
  (function walkWebp(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walkWebp(p);
      else if (/\.webp$/i.test(ent.name)) webps.push(p);
    }
  }(IMAGES));
  let removed = 0;
  for (const w of webps) {
    const base = w.replace(/\.webp$/i, '');
    if (!['.png', '.PNG', '.jpg', '.jpeg', '.JPG', '.JPEG'].some((e) => fs.existsSync(base + e))) {
      fs.unlinkSync(w);
      removed++;
    }
  }
  const json = { note: 'avatar-webp.js が自動で作る一覧。手で編集しない。files にある画像は同じ場所の .webp が使われる', files: listed, hashes };
  fs.writeFileSync(MANIFEST, JSON.stringify(json, null, 1) + '\n');
  const mb = (n) => (n / 1024 / 1024).toFixed(1) + 'MB';
  console.log(`作成 ${made} 件 / 削除 ${removed} 件 / 一覧 ${listed.length} 件 / 合計 ${mb(before)} → ${mb(after)}`);
})();
