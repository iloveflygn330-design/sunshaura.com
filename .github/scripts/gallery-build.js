/* =====================================================
   フォトギャラリー：軽量版画像と写真一覧の自動生成
   .github/workflows/gallery-build.yml から実行される（手元で動かす必要はない）。

   やること:
     1. gallery/photos/ の写真（直下と、1階層下のアルバムフォルダ）を探す
     2. 写真ごとに WebP を2種類作る
          gallery/generated/thumb/<アルバム>/<ファイル名>.webp … 並べて表示する用（横 960px）
          gallery/generated/large/<アルバム>/<ファイル名>.webp … 拡大表示用（長辺 2000px）
        前回から中身が変わっていない写真は作り直さない（photos.json の hash で判定）
     3. 元の写真が消えていたら、対応する軽量版も消す
     4. gallery/data/photos.json（ギャラリーが読む一覧）を書き出す

   手元で試す場合（任意）:
     cd .github/scripts && npm install --no-save sharp && cd ../.. && node .github/scripts/gallery-build.js
   ===================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const REPO      = path.resolve(__dirname, '../..');
const GALLERY   = path.join(REPO, 'gallery');
const PHOTOS    = path.join(GALLERY, 'photos');
const GENERATED = path.join(GALLERY, 'generated');
const MANIFEST  = path.join(GALLERY, 'data', 'photos.json');

/* ★拡張予定: 対応する画像の種類を増やす場合は、ここと gallery/assets/gallery.js の PHOTO_EXT を同じにする */
const PHOTO_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

/* ★拡張予定: 軽量版の大きさ・画質を変える場合はここを書き換える
     width  : 横幅の上限（px）。元画像の方が小さい場合は拡大しない
     long   : 長辺の上限（px）。縦長の写真もこの大きさに収める
     quality: WebP の画質（0〜100。下げるほど軽くなる）
   値を変えたあと全部作り直したい場合は、gallery/generated/ フォルダを削除して push する
   （または GitHub の Actions タブ → Gallery build → Run workflow で「作り直す」をオンにして実行） */
const SIZES = {
  thumb: { width: 960, quality: 78 },
  large: { long: 2000, quality: 85 }
};

const FORCE = process.env.GALLERY_FORCE === 'true';   // true なら全部作り直す

/* ---------- ヘルパー ---------- */
const toPosix = (p) => p.split(path.sep).join('/');
const sha1 = (buf) => crypto.createHash('sha1').update(buf).digest('hex');

function listPhotos() {
  if (!fs.existsSync(PHOTOS)) return [];
  const found = [];
  for (const ent of fs.readdirSync(PHOTOS, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue;
    if (ent.isFile() && PHOTO_EXT.test(ent.name)) {
      found.push({ album: '', rel: ent.name });
    } else if (ent.isDirectory()) {
      // アルバムは1階層まで（さらに下のフォルダは読まない）
      for (const f of fs.readdirSync(path.join(PHOTOS, ent.name), { withFileTypes: true })) {
        if (f.isFile() && !f.name.startsWith('.') && PHOTO_EXT.test(f.name)) {
          found.push({ album: ent.name, rel: ent.name + '/' + f.name });
        }
      }
    }
  }
  return found.sort((a, b) => a.rel.localeCompare(b.rel));
}

function readOldManifest() {
  try {
    const data = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    const map = new Map();
    for (const p of data.photos || []) map.set(p.src, p);
    return map;
  } catch (e) {
    return new Map();
  }
}

async function makeWebp(buf, isGif, out, size) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  let img = sharp(buf, { animated: isGif }).rotate();   // rotate(): スマホ写真の向き（EXIF）を反映
  if (size.width) img = img.resize({ width: size.width, withoutEnlargement: true });
  if (size.long)  img = img.resize({ width: size.long, height: size.long, fit: 'inside', withoutEnlargement: true });
  await img.webp({ quality: size.quality, effort: 5 }).toFile(out);
}

function removeEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.isDirectory()) removeEmptyDirs(path.join(dir, ent.name));
  }
  if (dir !== GENERATED && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
}

/* ---------- 本体 ---------- */
async function main() {
  const photos = listPhotos();
  const old = readOldManifest();
  const keep = new Set();      // 残す軽量版ファイル
  const entries = [];
  let made = 0, skipped = 0, failed = 0;

  for (const p of photos) {
    const srcFile = path.join(PHOTOS, p.rel);
    const buf = fs.readFileSync(srcFile);
    const hash = sha1(buf);
    const src = 'photos/' + p.rel;
    const outs = {
      thumb: path.join(GENERATED, 'thumb', p.rel + '.webp'),
      large: path.join(GENERATED, 'large', p.rel + '.webp')
    };
    const prev = old.get(src);
    const upToDate = !FORCE && prev && prev.hash === hash &&
      fs.existsSync(outs.thumb) && fs.existsSync(outs.large);

    if (upToDate) {
      skipped++;
    } else {
      try {
        const isGif = /\.gif$/i.test(p.rel);
        await makeWebp(buf, isGif, outs.thumb, SIZES.thumb);
        await makeWebp(buf, isGif, outs.large, SIZES.large);
        made++;
        console.log('作成:', src);
      } catch (e) {
        // 壊れた画像などは軽量版なしで一覧に載せる（ギャラリーは元画像を表示する）
        failed++;
        console.warn('軽量版を作れませんでした:', src, e.message);
        entries.push({ album: p.album, src, hash });
        continue;
      }
    }
    keep.add(path.resolve(outs.thumb));
    keep.add(path.resolve(outs.large));
    entries.push({
      album: p.album,
      src,
      thumb: toPosix(path.relative(GALLERY, outs.thumb)),
      large: toPosix(path.relative(GALLERY, outs.large)),
      hash
    });
  }

  // 元の写真が消えた軽量版を削除する
  let removed = 0;
  (function sweep(dir) {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) sweep(full);
      else if (ent.name.endsWith('.webp') && !keep.has(path.resolve(full))) { fs.unlinkSync(full); removed++; }
    }
  }(GENERATED));
  removeEmptyDirs(GENERATED);

  // 一覧を書き出す（中身が同じなら書き換えない＝無駄なコミットを作らない）
  const json = JSON.stringify({
    _note: 'このファイルは GitHub Actions（.github/workflows/gallery-build.yml）が自動で作っています。手で編集しないでください。',
    photos: entries
  }, null, 2) + '\n';
  fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
  const before = fs.existsSync(MANIFEST) ? fs.readFileSync(MANIFEST, 'utf8') : '';
  if (before !== json) fs.writeFileSync(MANIFEST, json);

  console.log(`写真 ${photos.length} 枚 / 作成 ${made} / 変更なし ${skipped} / 失敗 ${failed} / 削除 ${removed}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
