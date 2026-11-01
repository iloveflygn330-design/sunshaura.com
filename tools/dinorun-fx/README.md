# きょうりゅうラン：技のエフェクトの書き出し

バトル（RPG フェイズ）で出る技のエフェクトの PNG を、[pixelfx](https://github.com/patch-gg/pixelfx)（MIT ライセンス）から書き出すツール。
このフォルダはサイトには公開しない（`build-site.mjs` の EXCLUDE に `tools` が入っている）。

## 書き出し方

1. Node.js 18 以上と、Python 3 の Pillow を用意する（`pip install Pillow`）
2. pixelfx を、このリポジトリの外に取ってくる
   ```
   cd %USERPROFILE%\Documents
   git clone https://github.com/patch-gg/pixelfx
   ```
3. このリポジトリのフォルダで
   ```
   python tools/dinorun-fx/export_fx.py %USERPROFILE%\Documents\pixelfx
   ```
   名前をつけると、そのエフェクトだけ書き出す（例: `... pixelfx breath heal`）
4. `minigame/dinorun/rpg/fx/<名前>.png` ができる。表示された設定の frames・cols・w・h・fps・ax・ay を、
   `minigame/assets/dinorun-rpg-data.js` の `DR_RPG_EFFECTS` の同じ名前の行に写す
   （ox・oy・flip・aim・lead・life・fade は、ゲームの中での調整なので消さずに残す）

## 変えたいとき

- 色・大きさ・種類を変える … `export_fx.py` の `FX` を書きかえる
  - pixelfx のエフェクトは、pixelfx のフォルダで `node tools/list.mjs <言葉>` で探せる（一覧は pixelfx の docs/CATALOG.md）
  - 見た目の確認: pixelfx のフォルダで `node tools/render.mjs <id>` → `records/<id>/contact.png`
- 新しいエフェクトを足す … `FX` に1件足して書き出し、`DR_RPG_EFFECTS` に1行足して、`dinorun-rpg.js` で `drRpgEffect('名前', x, y)` を呼ぶ

## ライセンス

書き出した PNG と同じフォルダの `CREDITS.txt` に、pixelfx のライセンス（MIT）を入れてある。PNG を足したり差し替えたりしても、このファイルは残す。
