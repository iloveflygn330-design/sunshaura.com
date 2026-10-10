# 圧縮版の写真（自動生成・手で触らない）

`.github/scripts/gallery-build.js` が `gallery/photos/` の元の写真から作ったものです。
手で追加・編集・削除しないでください（写真の追加・削除は gallery/photos/README.md の手順で）。

- `thumb/` … ギャラリーに並べる用（横960pxの WebP）
- `large/` … クリックしたときの拡大表示用（長辺1920pxの WebP）

<!--
  ★拡張予定: 圧縮版の大きさ・画質を変えたいとき
    .github/scripts/gallery-build.js の SIZES を書き換えて、--force を付けて実行し直す。
    （元の写真があるPCで実行する必要がある）
-->
