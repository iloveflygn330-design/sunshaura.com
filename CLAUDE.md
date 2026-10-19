# sunshaura.com 作業ルール

シャウラの個人サイト（VRChat のアバター改変・ギャラリー・ニュースなど）。GitHub Pages で公開している。
やりとりは日本語で行う。フォルダ構成は `directoryMEMO` を参照。

## コードのメモ（コメント）

- 「★拡張予定」と書いた処理（あとからコンテンツを足すもの）には、必ずコメントで説明と、コンテンツの足し方を書く。
- メモは公開時に自動で取り除かれる（`.github/scripts/build-site.mjs`）ので、詳しく書いてよい。
- **ただし、リポジトリは公開されているので、GitHub 上では誰でもメモを読める。**
  PC のユーザー名、PC のフォルダの場所、パスワード・API キー・トークンなどの個人情報や秘密は、メモにもファイルにも書かない。
  - PC のフォルダの場所を書くときは `%USERPROFILE%\Documents\...` の形にする。
  - 秘密の値は GitHub の Secrets（Settings → Secrets and variables → Actions）に入れる。

## ページを作るとき

- HTML を別ファイルに分けてページを作るときは、ページ移動の「ちょっとまってね...」→「おまたせ！」の演出を必ず入れる。
  - `assets/page-transition.js` を読み込む。
  - `<head>` に到着判定の script を入れる。
  - `#loading-bar` と `#loading-panel` を置く。
  - 本文に `data-transition-body`、リンクに `data-transition` を付ける。
- `<head>` にアクセス解析 `assets/analytics.js` を入れる（相対パスはページの深さに合わせる）。
- `world/index.html` をフォルダごとコピーして作れば、上の2つとヘッダー・フッターが最初から入っている。
- ヘッダーのボタンは `assets/site-header.js` の `SITE_NAV_ITEMS` で管理する。一時的に隠すときは `hidden: true` を付ける。

## 公開の仕組み

- サイトの公開は GitHub Actions の「Deploy site」（`.github/workflows/deploy.yml`）が行う。
  コメントを取り除いたコピー `_site/` を作って公開する（`_site/` は GitHub に上げない）。
- 公開しないファイル（作業用ツール・説明書きなど）は `build-site.mjs` の `EXCLUDE` / `EXCLUDE_EXT` に追加する。
- **main にコミットする自動処理（ワークフロー）を新しく作ったら、`deploy.yml` の `workflow_run` の `workflows` に、その `name:` を追加する。**
  自動処理が GitHub 上で行ったコミットでは push のきっかけが動かないので、追加しないとサイトに反映されない。

## 進め方

- シャウラが自分で書き換えた HTML などを渡されたときは、それを正として扱う。
- 変更はブランチを切ってプルリクエストにし、シャウラの「マージしてOK」をもらってからマージする。
