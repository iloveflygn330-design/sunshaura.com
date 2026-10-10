# 自動生成フォルダ（触らない）

このフォルダの中身は、GitHub Actions（`.github/workflows/gallery-build.yml`）が
`gallery/photos/` の写真から自動で作っています。手で追加・編集・削除しないでください。

- `thumb/` … ギャラリーに並べる用の軽量版（横960pxの WebP）
- `large/` … クリックしたときの拡大表示用（長辺2000pxの WebP）

<!--
  ★拡張予定: 軽量版の大きさ・画質を変えたいとき
    .github/scripts/gallery-build.js の SIZES を書き換えて push し、
    GitHub の Actions タブ → Gallery build → Run workflow で「作り直す」にチェックを入れて実行する。
-->
