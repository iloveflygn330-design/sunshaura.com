/* =====================================================
   動画プレイヤーのビルド
     cd tools/news-video && npm install && npm run build
   → news/assets/video/news-video.js を出力（これをコミットする）

   ★拡張予定: 動画のデザイン（src/NewsVideo.jsx）を変えたら、
     このビルドを実行して news-video.js を作り直し、コミットすること。
     過去の記事も同じプレイヤーを使うので、全記事の動画に反映される。
   ===================================================== */
import { build } from 'esbuild';
import fs from 'node:fs';
import crypto from 'node:crypto';

await build({
  entryPoints: ['src/index.jsx'],
  bundle: true,
  minify: true,
  format: 'iife',
  jsx: 'automatic',
  target: ['es2019'],
  define: { 'process.env.NODE_ENV': '"production"' },
  outfile: '../../news/assets/video/news-video.js',
  legalComments: 'eof',
  logLevel: 'info'
});

/* ビルド結果の内容から版番号を作り、news.js に書き込む（ブラウザに古いプレイヤーが残らないように） */
const OUT = '../../news/assets/video/news-video.js';
const NEWS_JS = '../../news/assets/news.js';
const version = crypto.createHash('sha1').update(fs.readFileSync(OUT)).digest('hex').slice(0, 10);
const src = fs.readFileSync(NEWS_JS, 'utf8');
const next = src.replace(/var VIDEO_PLAYER_VERSION = '[^']*';/, `var VIDEO_PLAYER_VERSION = '${version}';`);
if (next === src && !src.includes(version)) throw new Error('news.js に VIDEO_PLAYER_VERSION が見つかりません');
fs.writeFileSync(NEWS_JS, next);
console.log('VIDEO_PLAYER_VERSION =', version);
