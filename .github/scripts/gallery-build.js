/* =====================================================
   フォトギャラリー：写真の圧縮と写真一覧の作成

   元の写真は容量が大きいので、リポジトリの外のフォルダ（PCにだけある）に置いておく。
     リポジトリ  : C:\Users\sdra_\Documents\MyWebSites\sunshaura.com
     元の写真    : C:\Users\sdra_\Documents\MyWebSites_photo   ← リポジトリの2つ上の階層の隣
   このスクリプトで圧縮版を作り、圧縮版と一覧だけを GitHub に上げる。

   やること:
     1. 元の写真フォルダ（直下と、1階層下のアルバムフォルダ）の写真を探す
     2. まだ圧縮版が無い写真について、WebP を2種類作る
          gallery/generated/thumb/<アルバム>/<ファイル名>.webp … 並べて表示する用（横 960px）
          gallery/generated/large/<アルバム>/<ファイル名>.webp … 拡大表示用（長辺 1920px）
     3. 元の写真が消えていたら、対応する圧縮版も消す（--no-prune を付けたときは消さない）
     4. gallery/data/photos.json（ギャラリーが読む一覧）を、圧縮版の中身から作り直す

   ★拡張予定: 写真を追加したときの手順（どちらか）
     A. Claude に「写真を追加したので圧縮してアップして」と頼む（PCとつながったチャットで）
     B. 自分で実行する（Node.js が入っている場合）
          リポジトリのフォルダでコマンドを開いて
            cd .github/scripts
            npm install --no-save sharp@0.33.5      ← 初回だけ
            cd ../..
            node .github/scripts/gallery-build.js
          終わったら GitHub Desktop で gallery/generated と gallery/data をコミットして Push

   オプション:
     --src <フォルダ>  元の写真の場所を変える（既定: 下の PHOTOS_DIR_DEFAULT）
     --no-prune       元の写真が見つからなくても、圧縮版を消さない
     --force          すでにある圧縮版も作り直す（大きさ・画質を変えたとき）
   ===================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const REPO      = path.resolve(__dirname, '../..');
const GALLERY   = path.join(REPO, 'gallery');
const GENERATED = path.join(GALLERY, 'generated');
const MANIFEST  = path.join(GALLERY, 'data', 'photos.json');

const args  = process.argv.slice(2);
const opt   = (name) => args.includes(name);
const srcAt = args.indexOf('--src');
/* ★拡張予定: 元の写真フォルダを移動した場合は、ここを書き換える
     リポジトリのフォルダ（REPO）からの相対パス。
     今は MyWebSites\sunshaura.com から見て ..\..\MyWebSites_photo */
const PHOTOS_DIR_DEFAULT = path.resolve(REPO, '..', '..', 'MyWebSites_photo');
const PHOTOS = srcAt >= 0 ? path.resolve(args[srcAt + 1]) : PHOTOS_DIR_DEFAULT;
const PRUNE = !opt('--no-prune');
const FORCE = opt('--force');

/* ★拡張予定: 対応する画像の種類を増やす場合は、ここに拡張子を追加する */
const PHOTO_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

/* ★拡張予定: 圧縮版の大きさ・画質を変える場合はここを書き換え、--force を付けて実行する
     width  : 横幅の上限（px）。元画像の方が小さい場合は拡大しない
     long   : 長辺の上限（px）。縦長の写真もこの大きさに収める
     quality: WebP の画質（0〜100。下げるほど軽くなる） */
const SIZES = {
  thumb: { width: 960,  quality: 78 },
  large: { long: 1920, quality: 82 }
};

const toPosix = (p) => p.split(path.sep).join('/');

function listPhotos() {
  if (!fs.existsSync(PHOTOS)) return [];
  const found = [];
  for (const ent of fs.readdirSync(PHOTOS, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue;
    if (ent.isFile() && PHOTO_EXT.test(ent.name)) {
      found.push(ent.name);
    } else if (ent.isDirectory()) {
      // アルバムは1階層まで（さらに下のフォルダは読まない）
      for (const f of fs.readdirSync(path.join(PHOTOS, ent.name), { withFileTypes: true })) {
        if (f.isFile() && !f.name.startsWith('.') && PHOTO_EXT.test(f.name)) found.push(ent.name + '/' + f.name);
      }
    }
  }
  return found.sort();
}

async function makeWebp(file, out, size) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  let img = sharp(file, { animated: /\.gif$/i.test(file) }).rotate();   // rotate(): スマホ写真の向き（EXIF）を反映
  if (size.width) img = img.resize({ width: size.width, withoutEnlargement: true });
  if (size.long)  img = img.resize({ width: size.long, height: size.long, fit: 'inside', withoutEnlargement: true });
  await img.webp({ quality: size.quality, effort: 5 }).toFile(out);
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (ent.name.endsWith('.webp')) out.push(full);
  }
  return out;
}

function removeEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.isDirectory()) removeEmptyDirs(path.join(dir, ent.name));
  }
  if (dir !== GENERATED && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
}

async function main() {
  if (!fs.existsSync(PHOTOS)) {
    // 写真フォルダが見つからないまま進むと、圧縮版が全部「元が消えた」扱いで削除されてしまうので止める
    console.error('元の写真フォルダが見つかりません: ' + PHOTOS);
    console.error('PHOTOS_DIR_DEFAULT を直すか、--src で場所を指定してください。');
    process.exit(1);
  }
  const photos = listPhotos();
  let made = 0, skipped = 0, failed = 0, removed = 0;

  for (const rel of photos) {
    const thumb = path.join(GENERATED, 'thumb', rel + '.webp');
    const large = path.join(GENERATED, 'large', rel + '.webp');
    if (!FORCE && fs.existsSync(thumb) && fs.existsSync(large)) { skipped++; continue; }
    try {
      await makeWebp(path.join(PHOTOS, rel), thumb, SIZES.thumb);
      await makeWebp(path.join(PHOTOS, rel), large, SIZES.large);
      made++;
      if (made % 25 === 0) console.log(`  ...${made} 枚作成`);
    } catch (e) {
      failed++;
      for (const f of [thumb, large]) if (fs.existsSync(f)) fs.unlinkSync(f);
      console.warn('圧縮できませんでした:', rel, e.message);
    }
  }

  // 元の写真が消えた圧縮版を削除する
  if (PRUNE) {
    const keep = new Set(photos.map((r) => r + '.webp'));
    for (const kind of ['thumb', 'large']) {
      const base = path.join(GENERATED, kind);
      for (const f of walk(base)) {
        if (!keep.has(toPosix(path.relative(base, f)))) { fs.unlinkSync(f); removed++; }
      }
    }
    removeEmptyDirs(GENERATED);
  }

  // 一覧は「thumb と large の両方がそろっている圧縮版」から作る
  const thumbBase = path.join(GENERATED, 'thumb');
  const entries = walk(thumbBase)
    .map((f) => toPosix(path.relative(thumbBase, f)))
    .filter((rel) => fs.existsSync(path.join(GENERATED, 'large', rel)))
    .sort()
    .map((rel) => ({
      album: rel.includes('/') ? rel.split('/')[0] : '',
      thumb: 'generated/thumb/' + rel,
      large: 'generated/large/' + rel
    }));

  const json = JSON.stringify({
    _note: 'このファイルは .github/scripts/gallery-build.js が自動で作っています。手で編集しないでください。',
    photos: entries
  }, null, 2) + '\n';
  fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
  fs.writeFileSync(MANIFEST, json);

  console.log(`元の写真 ${photos.length} 枚 / 作成 ${made} / 作成済み ${skipped} / 失敗 ${failed} / 削除 ${removed} / 一覧 ${entries.length} 枚`);
}

main().catch((e) => { console.error(e); process.exit(1); });
