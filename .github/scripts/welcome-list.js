/* =====================================================
   トップページ：キャラクター画像の一覧を作る

   assets/images/welcome/ の3つのフォルダの画像から、一覧 assets/images/welcome/list.json を作る。
     left/   … キャラクター①（左から傾いて現れる）
     right/  … キャラクター②（右から傾いて現れる）
     footer/ … キャラクター③（フッターに並ぶ）
   トップページ（assets/welcome.js）はこの一覧から、ページを開くたびにランダムに選んで表示する。
   同じ場所に軽量版（.webp。.github/scripts/avatar-webp.js が作る）があれば、そちらを使うように一覧に書く。

   GitHub 上では自動で実行される（.github/workflows/avatar-build.yml。avatar-webp.js のあと）。
   画像を入れて push するだけで、一覧も WebP も自動で更新される。

   ★拡張予定: キャラクターの置き場所（フォルダ）を増やす場合
     下の FOLDERS に名前を追加し、assets/welcome.js で list.<名前> を使う

   自分で実行する場合（リポジトリのフォルダで）: node .github/scripts/welcome-list.js
   ===================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '../..');
const BASE = 'assets/images/welcome';
const FOLDERS = ['left', 'right', 'footer'];
const IMG_EXT = /\.(png|jpe?g|webp|gif|avif)$/i;

// WebP 化の一覧（.github/scripts/avatar-webp.js が作る。WebP の方が軽い画像だけ載っている）
let webpOk = new Set();
try { webpOk = new Set(JSON.parse(fs.readFileSync(path.join(REPO, 'assets/images/webp.json'), 'utf8')).files || []); } catch (e) {}

const list = { note: 'welcome-list.js が自動で作る一覧。手で編集しない（画像はフォルダに入れるだけでよい）' };
for (const folder of FOLDERS) {
  const dir = path.join(REPO, BASE, folder);
  fs.mkdirSync(dir, { recursive: true });
  const files = fs.readdirSync(dir).filter((f) => IMG_EXT.test(f)).sort();
  // 同じ名前の PNG と WebP が両方ある場合は、元の画像（PNG など）1件として数える
  const originals = files.filter((f) => !/\.webp$/i.test(f) || !files.some((g) => g !== f && g.replace(IMG_EXT, '') === f.replace(IMG_EXT, '')));
  list[folder] = originals.map((f) => {
    const src = `${BASE}/${folder}/${f}`;
    const rel = src.replace('assets/images/', '');
    const item = { src };
    if (!/\.webp$/i.test(f) && webpOk.has(rel)) item.webp = src.replace(IMG_EXT, '.webp');
    return item;
  });
  console.log(`${folder}: ${list[folder].length} 枚`);
}
fs.writeFileSync(path.join(REPO, BASE, 'list.json'), JSON.stringify(list, null, 1) + '\n');
