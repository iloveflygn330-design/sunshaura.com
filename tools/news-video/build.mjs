/* =====================================================
   動画プレイヤーのビルド
     cd tools/news-video && npm install && npm run build
   → news/assets/video/news-video.js を出力（これをコミットする）

   ★拡張予定: 動画のデザイン（src/NewsVideo.jsx）を変えたら、
     このビルドを実行して news-video.js を作り直し、コミットすること。
     過去の記事も同じプレイヤーを使うので、全記事の動画に反映される。
   ===================================================== */
import { build } from 'esbuild';

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
