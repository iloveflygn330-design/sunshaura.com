/* =====================================================
   ショップ：商品素材の変換（AVI → WebM など）

   元の素材は容量が大きい（AVI は1本で数百MB〜1GB）ので、リポジトリの外のフォルダ（PCにだけある）に置く。
     リポジトリ  : %USERPROFILE%\Documents\MyWebSites\sunshaura.com
     元の素材    : %USERPROFILE%\Documents\MyWebSites_shop   ← リポジトリの2つ上の階層の隣
   このスクリプトで軽い版を作り、軽い版だけを GitHub に上げる。

   元の素材フォルダの置き方:
     MyWebSites_shop\
       link.png / coin.png / cloud.png   ← 商品情報ウィンドウのアイコン（全商品共通）
       0010_matsuge\                     ← 商品ID（番号_名前）。フォルダ1つ = 商品1つ
         bg.png      背景（横長。2560×1440 など）
         thumb.png   商品サムネイル（正方形がおすすめ。横長でも比率のまま表示する。.jpg / .webp でもよい）
         in.avi      フェードイン動画（透過付き。最後のコマがアイドル状態の静止画になる）
         out.avi     フェードアウト動画（透過付き。先頭の OUT_SECONDS 秒だけ使う）
     ※ 名前が _ や . で始まるフォルダは無視する（作業用フォルダを置いてよい）
     ※ 上の4つ以外のファイル（layout_PC.png などのレイアウト画像）は置いておいてよい（変換しない）

   作られるもの（shop/items/<商品ID>/。手で触らない）:
     bg.webp     背景（長辺 1920px）
     thumb.webp  サムネイル（長辺 480px。切り抜かない）
     in.webm     フェードイン（VP9 透過付き。Chrome・Edge・Firefox 用）
     out.webm    フェードアウト（同上）
     idle.webp   in.avi の最後のコマ（アイドル状態。iPhone・iPad では動画の代わりにこれを動かす）
   アイコンは shop/assets/icons/ にそのままコピーする。

   ★拡張予定: 商品を追加したときの手順（どちらか）
     A. Claude に「0020_xxx を置いたので変換してアップして」と頼む（PCとつながったチャットで）
     B. 自分で実行する
          1. ffmpeg を入れる（初回だけ）: PowerShell で  winget install ffmpeg
          2. リポジトリのフォルダでコマンドを開いて
               node .github/scripts/shop-build.js
             （新しい商品・素材を差し替えた商品だけ変換される。AVI 1本につき数十秒〜数分かかる）
          3. GitHub Desktop で shop/items をコミットして Push
          4. 商品の文字情報は shop/assets/shop-data.js に1件追加する（書き方はそのファイルの先頭）

   オプション:
     --src <フォルダ>  元の素材の場所を変える（既定: 下の SRC_DIR_DEFAULT）
     --out <フォルダ>  出力先を変える（既定: リポジトリの shop/items）
     --only <商品ID>   その商品だけ変換する
     --force           すでにある軽い版も作り直す（大きさ・画質の設定を変えたとき）
   ===================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '../..');

const args  = process.argv.slice(2);
const opt   = (name) => args.includes(name);
const val   = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };

/* ★拡張予定: 元の素材フォルダを移動した場合は、ここを書き換える
     リポジトリのフォルダ（REPO）から見て ..\..\MyWebSites_shop */
const SRC_DIR_DEFAULT = path.resolve(REPO, '..', '..', 'MyWebSites_shop');
const SRC   = val('--src') ? path.resolve(val('--src')) : SRC_DIR_DEFAULT;
const OUT   = val('--out') ? path.resolve(val('--out')) : path.join(REPO, 'shop', 'items');
const ICONS = val('--out') ? path.join(OUT, '_icons') : path.join(REPO, 'shop', 'assets', 'icons');
const ONLY  = val('--only');
const FORCE = opt('--force');

/* ★拡張予定: 大きさ・画質を変える場合はここを書き換え、--force を付けて実行する
     VIDEO_HEIGHT : 動画の高さ（px）。横幅は元の比率のまま
     VIDEO_CRF    : 動画の画質（数字が大きいほど軽く・粗くなる。30〜40 くらい）
     OUT_SECONDS  : フェードアウト動画の使う長さ（秒）。画面では 0.4 秒で退場するので少し余裕をもたせている
     BG_LONG      : 背景の長辺（px）。ページ側で CSS でぼかすので大きすぎなくてよい
     THUMB_SIZE   : サムネイルの長辺（px）
     WEBP_QUALITY : 画像の画質（0〜100） */
const SET = {
  VIDEO_HEIGHT: 1080,
  VIDEO_CRF:    36,
  OUT_SECONDS:  0.7,
  BG_LONG:      1920,
  THUMB_SIZE:   480,
  WEBP_QUALITY: 80
};

/* ★拡張予定: 素材を増やす場合は、ここに「元のファイル名 → 作るファイル」を1行追加し、
     下の build() に変換方法を書く。src は候補を順に探し、最初に見つかったものを使う。見つからない項目は飛ばす */
const JOBS = [
  { src: ['bg.png', 'bg.jpg', 'bg.jpeg', 'bg.webp'],          out: 'bg.webp' },
  { src: ['thumb.png', 'thumb.jpg', 'thumb.jpeg', 'thumb.webp'], out: 'thumb.webp' },
  { src: ['in.avi'],  out: 'in.webm' },
  { src: ['in.avi'],  out: 'idle.webp' },   // 静止画は動画の最後のコマから作る（透過が必要なため、別に置いた idle.png は使わない）
  { src: ['out.avi'], out: 'out.webm' }
];

function ffmpeg(list) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y'].concat(list), { stdio: 'inherit' });
  if (r.error && r.error.code === 'ENOENT') {
    console.error('ffmpeg が見つかりません。PowerShell で  winget install ffmpeg  を実行してから、もう一度試してください。');
    process.exit(1);
  }
  if (r.status !== 0) throw new Error('ffmpeg の変換に失敗しました: ' + list.join(' '));
}

/* VP9 の透過動画（yuva420p）。auto-alt-ref 0 は透過を壊さないための指定 */
function webmArgs() {
  return ['-an', '-vf', 'scale=-2:' + SET.VIDEO_HEIGHT + ':flags=lanczos',
    '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', String(SET.VIDEO_CRF),
    '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', '-auto-alt-ref', '0'];
}

function build(job, srcFile, outFile) {
  switch (job.out) {
    case 'bg.webp':
      return ffmpeg(['-i', srcFile, '-vf',
        "scale='if(gt(iw,ih)," + SET.BG_LONG + ",-2)':'if(gt(iw,ih),-2," + SET.BG_LONG + ")':flags=lanczos",
        '-c:v', 'libwebp', '-quality', String(SET.WEBP_QUALITY), outFile]);
    case 'thumb.webp':
      return ffmpeg(['-i', srcFile, '-vf',
        'scale=' + SET.THUMB_SIZE + ':' + SET.THUMB_SIZE + ':force_original_aspect_ratio=decrease:flags=lanczos',
        '-c:v', 'libwebp', '-quality', String(SET.WEBP_QUALITY), outFile]);
    case 'in.webm':
      return ffmpeg(['-i', srcFile].concat(webmArgs(), [outFile]));
    case 'out.webm':
      return ffmpeg(['-i', srcFile, '-t', String(SET.OUT_SECONDS)].concat(webmArgs(), [outFile]));
    case 'idle.webp':
      // 最後のコマ（終わりの 0.05 秒前から1コマ）。透過を残すため lossless ではなく alpha 付き WebP
      return ffmpeg(['-sseof', '-0.05', '-i', srcFile, '-frames:v', '1',
        '-vf', 'scale=-2:' + SET.VIDEO_HEIGHT + ':flags=lanczos',
        '-c:v', 'libwebp', '-quality', String(SET.WEBP_QUALITY), '-pix_fmt', 'yuva420p', outFile]);
  }
}

const isNewer = (a, b) => !fs.existsSync(b) || fs.statSync(a).mtimeMs > fs.statSync(b).mtimeMs;

function main() {
  if (!fs.existsSync(SRC)) { console.error('元の素材フォルダがありません: ' + SRC); process.exit(1); }

  // 共通アイコン（直下の画像）をコピー
  fs.mkdirSync(ICONS, { recursive: true });
  for (const f of fs.readdirSync(SRC)) {
    const p = path.join(SRC, f);
    if (fs.statSync(p).isFile() && /\.(png|webp|svg)$/i.test(f) && (FORCE || isNewer(p, path.join(ICONS, f)))) {
      fs.copyFileSync(p, path.join(ICONS, f));
      console.log('アイコン: ' + f);
    }
  }

  const items = fs.readdirSync(SRC, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !/^[_.]/.test(e.name))
    .map((e) => e.name)
    .filter((id) => !ONLY || id === ONLY);

  for (const id of items) {
    const dir = path.join(OUT, id);
    fs.mkdirSync(dir, { recursive: true });
    for (const job of JOBS) {
      const found = job.src.find((f) => fs.existsSync(path.join(SRC, id, f)));
      const outFile = path.join(dir, job.out);
      if (!found) { console.log(id + ': ' + job.src[0] + ' がないので ' + job.out + ' は作りません'); continue; }
      const srcFile = path.join(SRC, id, found);
      if (!FORCE && !isNewer(srcFile, outFile)) continue;
      console.log(id + ': ' + job.out + ' を作成中...');
      build(job, srcFile, outFile);
    }
  }
  console.log('完了: ' + OUT);
}

main();
