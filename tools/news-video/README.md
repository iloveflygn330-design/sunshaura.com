# ニュース動画（読み上げ掛け合い動画）

| ファイル | 役割 |
|---|---|
| `characters.json` | 出演キャラクターの設定（名前・字幕の色・VOICEVOXの話者ID と声色・立ち絵フォルダ） |
| `build-voice.mjs` | 台本（script.json）から音声（voice.mp3）とタイミング（video.json）を作る。GitHub Actions（news-voice.yml）が実行する |
| `src/NewsVideo.jsx` | 動画の見た目（Remotion） |
| `src/index.jsx` | 記事ページへの埋め込みと、再生前の待機画面 |
| `build.mjs` | プレイヤーのビルド（`npm install && npm run build` → `news/assets/video/news-video.js`） |

## ★拡張予定: キャラクターを増やす手順

1. `characters.json` にキャラクターを1件追加する
   - キー（例: `kiritan`）は台本の `who` に書く名前
   - `styles` は VOICEVOX の声色名と話者ID。一覧は GitHub の Actions → VOICEVOX speakers で確認できる
   - `folder` は立ち絵を入れる sunshaura-assets のフォルダ名
2. sunshaura-assets の `<folder>/` に立ち絵を入れる（ファイル名のルールは zundamon/README.md と同じ）
3. `news/GUIDE.md`「8. 動画の台本」の出演者の表と、キャラクターの設定に追記する
   （設定は公式サイトで確認できることだけを書く）
4. 動画の見た目は変更不要（立ち絵がまだないキャラは、色と名前の仮の図形で表示される）
