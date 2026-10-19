/* =====================================================
   公開用のサイトを作る（メモ＝コメントを取り除いたコピー）

   リポジトリのファイルは、作業用のメモ（★拡張予定などのコメント）付きのまま残しておき、
   サイトに公開するときだけ、このスクリプトでコメントを取り除いたコピーを _site/ に作る。
   公開されるのは _site/ の中身なので、ブラウザの開発者ツールで見てもメモは出てこない。
     HTML … <!-- --> のコメントと、<script>・<style> の中のコメントを取り除く
     JS   … 「//」と「/*」で始まるコメントを取り除く（ライセンス表記「/*!」「@license」は残す）
     CSS  … 「/*」で始まるコメントを取り除く
   改行や字下げはそのまま、または詰めるだけで、動きは変わらない。
   うまく変換できなかったファイルは、元のままコピーする（サイトが壊れないように）。

   GitHub 上では自動で実行される（.github/workflows/deploy.yml）。

   ★拡張予定: 公開しないファイル・フォルダを増やす場合は、下の EXCLUDE に追加する
     （作業用のツール・メモなど。サイトの表示に使っているファイルは入れないこと）

   自分で確認する場合（リポジトリのフォルダで）:
     cd .github/scripts
     npm install --no-save html-minifier-terser@7.2.0 terser@5.31.6 clean-css@5.3.3   ← 初回だけ
     cd ../..
     node .github/scripts/build-site.mjs        … _site/ ができる（GitHub には上げない）
   ===================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { minify: minifyHtml } = require('html-minifier-terser');
const { minify: minifyJs } = require('terser');
const CleanCSS = require('clean-css');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const OUT = path.join(REPO, '_site');

/* 公開しないもの（リポジトリのトップからのパス。フォルダは中身ごと） */
const EXCLUDE = [
  '.git', '.github', '_site', 'node_modules',
  'tools',                 // ニュース動画を作るツール（サイトでは使っていない）
  'avatarform/profile',    // フォームの参照画像（フォームは GitHub から直接読むので、サイトには不要）
  'directoryMEMO',         // フォルダ構成のメモ
  '.gitignore',
];
/* 公開しない種類のファイル（説明書き・スクリプト・動画編集ソフトのプロジェクトファイルなど） */
const EXCLUDE_EXT = /\.(md|py|pyc|exo|aup|aup3)$/i;

// ライセンス表記などは残す
const KEEP_COMMENT = /@license|@preserve|^!/;

const cssMin = new CleanCSS({
  level: { 1: { specialComments: 'all' } },   // /*!〜 で始まるものだけ残し、他のコメントは消す
  inline: ['none'],                           // @import はそのまま（共通CSSの読み込みを崩さない）
  format: 'keep-breaks',
  rebase: false,
});

async function stripJs(code, file) {
  const isModule = /^\s*(import|export)\s|^\s*import\(|\bexport\s+default\b/m.test(code);
  const res = await minifyJs(code, {
    module: isModule,
    compress: false,
    mangle: false,
    format: { comments: (node, c) => KEEP_COMMENT.test(c.value), beautify: false },
  });
  if (typeof res.code !== 'string') throw new Error('terser: no output ' + file);
  return res.code;
}

function stripCss(code, file) {
  const res = cssMin.minify(code);
  if (res.errors.length) throw new Error(res.errors.join(' / '));
  return res.styles;
}

async function stripHtml(code) {
  return minifyHtml(code, {
    removeComments: true,
    collapseWhitespace: false,     // 見た目が変わらないよう、空白はそのまま
    minifyCSS: (text) => stripCss(text),
    minifyJS: { compress: false, mangle: false, format: { comments: (n, c) => KEEP_COMMENT.test(c.value) } },
    ignoreCustomComments: [],
  });
}

function excluded(rel) {
  const r = rel.split(path.sep).join('/');
  return EXCLUDE.some((e) => r === e || r.startsWith(e + '/')) || EXCLUDE_EXT.test(r);
}

const stats = { copied: 0, stripped: 0, failed: [], before: 0, after: 0 };

async function processFile(src, dst, rel) {
  const ext = path.extname(src).toLowerCase();
  const kind = ext === '.html' ? 'html' : (ext === '.js' || ext === '.mjs') ? 'js' : ext === '.css' ? 'css' : null;
  if (!kind) { fs.copyFileSync(src, dst); stats.copied++; return; }
  const code = fs.readFileSync(src, 'utf8');
  try {
    const out = kind === 'html' ? await stripHtml(code) : kind === 'js' ? await stripJs(code, rel) : stripCss(code, rel);
    fs.writeFileSync(dst, out);
    stats.stripped++;
    stats.before += Buffer.byteLength(code);
    stats.after += Buffer.byteLength(out);
  } catch (e) {
    // 変換できなかったら元のまま（サイトが壊れないことを優先）
    fs.copyFileSync(src, dst);
    stats.failed.push(rel + ' … ' + String(e.message || e).split('\n')[0]);
  }
}

async function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const src = path.join(dir, ent.name);
    const rel = path.relative(REPO, src);
    if (excluded(rel)) continue;
    const dst = path.join(OUT, rel);
    if (ent.isDirectory()) { fs.mkdirSync(dst, { recursive: true }); await walk(src); }
    else if (ent.isFile()) await processFile(src, dst, rel);
  }
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
await walk(REPO);
// GitHub Pages の自動変換（Jekyll）を使わない印
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

const kb = (n) => Math.round(n / 1024) + 'KB';
console.log(`コメントを取り除いたファイル ${stats.stripped} 件（${kb(stats.before)} → ${kb(stats.after)}）/ そのままコピー ${stats.copied} 件`);
if (stats.failed.length) {
  console.log(`変換できず元のままコピーしたファイル ${stats.failed.length} 件:`);
  stats.failed.forEach((f) => console.log('  ' + f));
}
