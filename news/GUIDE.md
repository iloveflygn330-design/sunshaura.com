# ニュース記事 作成ガイド

毎朝のスケジュールタスク（Claude）は、このファイルの手順どおりに記事を作成・公開する。
ルールを変えたいときは、タスク側ではなくこのファイルを書き換える（次回の実行から反映される）。

---

## 1. 作成する記事

- 1日1本。その日のニュースを **3〜5件** まとめた記事にする
- 対象は「前日の朝7時〜当日の朝7時（日本時間）」ごろに公開・発表された情報
- 記事の日付は **作成した当日（日本時間）**
- **当日の記事（news/column/YYYYMM/DD/）がすでにある場合は、何もせずに終了する**（手動で先に作った日や、再実行したときの二重作成を防ぐため）
- 過去の記事（直近7日分の article.json）と同じニュースは取り上げない
- 文章は日本語。英語の情報源は日本語で要約する

### 取り上げる優先順位

1. VRChat本体のアップデート・不具合・告知
2. VRChat関連のイベント（Vket など）、アバター・ワールド制作の話題
3. VR機器・ソーシャルVR全般の話題
4. 上記で3件に満たない日は、**AI関連のニュース** で補う
5. それでも1件も見つからない日は、記事を作らずに終了する（「特になし」の記事は作らない）

<!--
  ★拡張予定: 取り上げる分野を増やす場合
    上の優先順位リストに行を追加する。
    新しい分野用のカテゴリが必要なら「4. カテゴリ」と news/assets/news.js の NEWS_CATEGORIES の両方に追記する。
-->

---

## 2. 情報源

公式または公開されている情報のみを使う。WebSearch と WebFetch で取得する。

| 情報源 | 確認先 | 主な内容 |
|---|---|---|
| VRChat公式（Steamニュース） | https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=438100&count=10 | アップデート告知 |
| VRChat公式ブログ | https://hello.vrchat.com/blog | 公式のお知らせ・特集 |
| VRChatリリースノート | https://docs.vrchat.com/docs/latest-release | クライアント更新内容 |
| VRChatステータス | https://status.vrchat.com | 障害・メンテナンス |
| VRChat公式X | WebSearch で「VRChat 公式 告知」等を検索（X本体は取得しない） | 告知 |
| Mogura VR | https://www.moguravr.com/ | 国内VRニュース |
| PANORA | https://panora.tokyo/ | 国内VRニュース |
| Vket（バーチャルマーケット） | https://www.vket.com/ | イベント情報 |
| WebSearch | 「VRChat ニュース」「VRChat アップデート」「ソーシャルVR」など、日付を付けて検索 | 上記以外の話題 |
| AI関連（補充用） | WebSearch で「AI ニュース 今日」「生成AI 発表」など | AI関連の補充 |

<!--
  ★拡張予定: 情報源を追加する手順
    1. 上の表に1行追加する（情報源名 / 確認先URLまたは検索語 / 主な内容）
    2. 追加してよいのは、公式サイト・RSS・公開APIなど、自動取得が規約で禁止されていないものだけ
    3. 以下は追加しない
       - X（旧Twitter）、Instagram、BOOTH などの直接取得（スクレイピングは規約違反）
       - ログインが必要なページ、有料記事
-->

### 禁止事項

- 記事本文・画像の転載（引用する場合も1か所15語未満まで。基本は自分の言葉で要約する）
- 他サイトの画像をサムネイルに使うこと
- 出典のない情報、未確認の噂を事実として書くこと
- 特定の個人を批判・晒す内容

---

## 3. 記事の書き方

- **タイトル**: その日の一番大きな話題を中心に、40文字程度（例：「VRChatに新アバター機能が登場ほか、今日のVRニュース4本」）
- **intro**: 今日の記事全体の紹介を2〜3文
- **各ニュース**
  - headline: そのニュースの見出し（30文字程度）
  - overview: 何が起きたかの概要を3〜4文、自分の言葉で
  - points: 読者にとってのポイントを2〜4個、箇条書き（1つ40文字程度）
  - sources: 出典の名前とURL（必ず1つ以上）
- **outro**: 締めの一言（任意。1〜2文）
- 文体は「です・ます」。主観的な感想は控えめにし、事実とポイントを中心にする

<!--
  ★拡張予定: 書き方を変える場合
    上の項目の文字数や文体の指定を書き換える。
    新しい項目（例：「関連リンク」）を増やす場合は、
    下の「記事データの形式」と news/assets/news.js の renderArticle() にも追加する。
-->

---

## 4. カテゴリ

記事全体の category には、その日の1件目のニュースのカテゴリを使う。
各ニュースの category は、次の中から選ぶ（news/assets/news.js の NEWS_CATEGORIES と同じ名前）。

- VRChat公式
- イベント
- アバター・制作
- ワールド
- VR機器・技術
- AI
- その他

<!--
  ★拡張予定: カテゴリを追加する場合
    このリストと news/assets/news.js の NEWS_CATEGORIES の両方に、同じ名前で追記する。
-->

---

## 5. ファイルの置き方

日付が 2026-10-10 の場合:

```
news/column/202610/10/index.html   ← news/column/_template/index.html をそのままコピー
news/column/202610/10/article.json ← 記事の中身（下の形式）
news/data/articles.json            ← 先頭に一覧用の1件を追加
```

### 記事データの形式（article.json）

```json
{
  "date": "2026-10-10",
  "title": "記事タイトル",
  "category": "VRChat公式",
  "thumb": "",
  "intro": "今日の記事全体の紹介。",
  "items": [
    {
      "headline": "ニュースの見出し",
      "category": "VRChat公式",
      "overview": "概要の文章。",
      "points": ["ポイント1", "ポイント2"],
      "sources": [{ "name": "VRChat公式ブログ", "url": "https://..." }]
    }
  ],
  "outro": "締めの一言。"
}
```

- thumb は通常は空文字 ""（カテゴリ色とアイコンでサムネイルが自動表示される）

### 一覧データの形式（articles.json に追加する1件）

```json
{ "date": "2026-10-10", "title": "記事タイトル", "category": "VRChat公式", "thumb": "" }
```

- 配列の **先頭** に追加する（新しい記事が上）
- date / title / category / thumb は article.json と同じ値にする

---

## 6. 公開

1. JSONが正しい形式か確認する（`python3 -m json.tool` 等で読み込めること）
2. コミットメッセージ: `news: 2026-10-10 記事タイトル`
3. main ブランチに push する
4. push されると GitHub Actions（.github/workflows/news-discord.yml）が
   Discord に記事のURLと見出しを自動で送る（タスク側で Discord に送る必要はない）
