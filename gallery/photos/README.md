# （使っていません）元の写真の置き場所は移動しました

元の写真は、リポジトリの外のフォルダに置いています（GitHub には上げません）。

```
C:\Users\sdra_\Documents\MyWebSites\sunshaura.com   ← このリポジトリ
C:\Users\sdra_\Documents\MyWebSites_photo          ← 元の写真（PCにだけある）
  ├─ event\    ← フォルダ1つ = アルバム1つ（例）
  ├─ world\
  └─ （直下の写真は「その他」アルバム）
```

このフォルダ（gallery/photos/）は、間違って写真を入れても GitHub に上がらないよう、
中身をすべて除外する設定（.gitignore）だけ残してあります。

<!--
  ★拡張予定: 写真を追加する手順
    1. MyWebSites_photo（またはその中のアルバムフォルダ）に写真を入れる
    2. 圧縮して GitHub に上げる（どちらか）
       A. Claude に「写真を追加したので圧縮してアップして」と頼む（PCとつながったチャットで）
       B. 自分で実行する（Node.js が必要。手順は .github/scripts/gallery-build.js の先頭コメント）
          → 終わったら GitHub Desktop で gallery/generated と gallery/data をコミットして Push
    HTML や JS の書き換えは不要。

  ★拡張予定: アルバムを増やす手順
    1. MyWebSites_photo の中に新しいフォルダを作って写真を入れる（フォルダ名は半角英数字がおすすめ）
    2. ボタンの表示名を日本語にしたい・並び順を決めたい場合は、
       gallery/assets/gallery.js の GALLERY_ALBUMS に { dir: 'フォルダ名', label: '表示名' } を追記する
       （書かなくても、フォルダ名のままボタンが出る）
    3. すでに上げた写真をアルバムに移した場合も、圧縮をやり直す（古い圧縮版は自動で消える）
    ※ フォルダの中にさらにフォルダを作っても、その中の写真は表示されない（アルバムは1階層まで）

  ★拡張予定: 写真を消す
    MyWebSites_photo から写真を消して、圧縮をやり直す（対応する圧縮版も消える）。

  ★拡張予定: 元の写真フォルダの場所を変えた場合
    .github/scripts/gallery-build.js の PHOTOS_DIR_DEFAULT を書き換える。
-->

## Discord から追加する（毎朝自動）

Discord のチャンネル（ID: 1558828712688881674）に画像を投稿すると、毎朝7時15分ごろに自動で取り込まれます。
- 取り込まれた投稿には ✅ が付き、ニュースと同じチャンネルに「◯枚追加しました」と通知されます
- アルバムは「その他」になります（チャンネルごとにアルバムを決める設定は .github/scripts/discord-gallery.js の DISCORD_CHANNELS）
- すぐ取り込みたいときは、GitHub の Actions タブ →「Gallery from Discord」→「Run workflow」
- 元の画像は Discord に残ります（PCの MyWebSites_photo には入りません）

## 入れられるファイル

- 形式：`.jpg` `.jpeg` `.png` `.webp` `.gif` `.avif`
  - iPhoneの `.heic` は変換できないので、jpg か webp にしてから入れてください
- ファイル名は何でもOKです（サイト上には表示されません）

## 圧縮版の大きさ

- 並べる用：横 960px の WebP（1枚 40KB 前後）
- 拡大表示用：長辺 1920px の WebP（1枚 130KB 前後）

## 注意

- 元の写真は MyWebSites_photo にしかありません。PCの故障に備えて、別の場所にもバックアップしておくと安心です。
- 圧縮版はサイトで公開されるため、誰でも見られます。他の人が写っている写真は、本人の許可を取ってから入れてください。
