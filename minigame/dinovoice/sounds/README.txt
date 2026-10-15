恐竜ボイスゲームの音声素材フォルダ（VOICEVOX:ずんだもん）

ここにファイルを置くと、自動でゲームに使われます。
置いていないファイルは、仮の合成音で代わりに鳴ります（ゲームは素材なしでも動きます）。

■ 鳴き声の元（このフォルダに直接置く・WAV・モノラル）
  VOICEVOXの設定：抑揚 0 ／ 開始無音・終了無音 0 ／ 音高・話速はデフォルト
  それぞれ「あーーー」のように約3秒、高さを変えずに伸ばす

  ノーマル（スタイル：ノーマル）
    voice_a_normal.wav   あー
    voice_i_normal.wav   いー
    voice_u_normal.wav   うー
    voice_e_normal.wav   えー
    voice_o_normal.wav   おー
    voice_n_normal.wav   んー
  ささやき（スタイル：ささやき または ヒソヒソ）
    voice_a_whisper.wav  ～  voice_n_whisper.wav（上と同じ6つ）

  ※ MP3 だとループの継ぎ目で「プツッ」と途切れるので、ここは必ず WAV にする

■ 鳴き始めの勢い（任意・WAV）
    attack_gu.wav  ぐ ／ attack_ga.wav  が ／ attack_bo.wav  ぼ ／ attack_bu.wav  ぶ
  短く1音。どの恐竜がどれを使うかは assets/dinovoice-data.js の DV_DINOS の attack

■ セリフ（lines/ フォルダに置く・MP3でOK）
    文とファイル名の一覧は assets/dinovoice-data.js の DV_LINES
    例：lines/start_01.mp3 「仲間の恐竜が鳴いてるのだ！ 同じ声で返事をしてあげるのだ！」

★拡張予定: 素材を増やす場合
  口の形・出だしの音・セリフを増やすときは、assets/dinovoice-data.js の各一覧に1行足してから、
  その行に書いたファイル名でここに置く（足し方は各一覧の上のコメントに書いてある）。

クレジット「VOICEVOX:ずんだもん」はゲーム画面の右下に自動で出ます（消さないこと）。
