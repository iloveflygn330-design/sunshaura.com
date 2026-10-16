/* =====================================================
   ニュース動画の音声づくり（GitHub Actions で実行）

   使い方:
     node tools/news-video/build-voice.mjs <記事フォルダ> <素材フォルダ>
       例: node tools/news-video/build-voice.mjs news/column/202610/15 assets-private

   入力:
     <記事フォルダ>/script.json  … 読み上げ台本（形式は news/GUIDE.md「8. 動画の台本」）
     <素材フォルダ>/bgm/          … BGM と list.json（非公開リポジトリ sunshaura-assets）
     <素材フォルダ>/zundamon/     … 立ち絵 PNG と credit.txt
     VOICEVOX エンジン            … 環境変数 VOICEVOX_URL（既定 http://localhost:50021）

   出力:
     <記事フォルダ>/voice.mp3     … ナレーション + BGM（1本の音声ファイル）
     <記事フォルダ>/video.json    … 字幕・口パク・場面切り替えのタイミング
     news/assets/video/chara/     … 立ち絵（素材リポジトリの PNG を軽い WebP に変換して置く）

   必要なもの: Node.js 20 以上、ffmpeg
   ===================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const [, , articleDir, assetsDir = 'assets-private'] = process.argv;
if (!articleDir) {
  console.error('使い方: node build-voice.mjs <記事フォルダ> [素材フォルダ]');
  process.exit(1);
}
const VOICEVOX = process.env.VOICEVOX_URL || 'http://localhost:50021';
const TMP = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || '/tmp', 'news-voice-'));

/* -----------------------------------------------------
   ★拡張予定: 間の取り方・音量の調整
     ここの数値を変えると、次に作る音声から反映される。
----------------------------------------------------- */
const TIMING = {
  LEAD_IN:        0.6,   // 再生開始から最初のセリフまで（秒）
  GAP_LINE:       0.25,  // セリフとセリフの間
  GAP_SECTION:    0.8,   // コーナー（オープニング・各ニュース・占い・エンディング）の間
  TAIL:           2.0,   // 最後のセリフのあと、BGMだけ流れる時間
  BGM_VOLUME:     0.13,  // BGMの音量（声を1としたとき）
  BGM_FADE_OUT:   1.8    // 最後のBGMのフェードアウト（秒）
};

/* 立ち絵の表情。素材リポジトリの各キャラクターのフォルダにあるファイル名と一致させる
   ★拡張予定: 表情を増やしたら、ここにも名前を追記する（news/GUIDE.md の face の一覧にも） */
const FACES = ['normal', 'smile', 'surprise', 'amazement', 'look'];

/* 出演キャラクターの設定（声の話者ID・声色・色・立ち絵フォルダ）
   ★拡張予定: キャラクターや声色を増やす場合は tools/news-video/characters.json を編集する */
const CHARS = JSON.parse(fs.readFileSync(new URL('./characters.json', import.meta.url), 'utf8'));
delete CHARS._説明;

/* =====================================================
   VOICEVOX
   ===================================================== */
async function voicevox(text, speaker, speed) {
  const q = await fetch(`${VOICEVOX}/audio_query?speaker=${speaker}&text=${encodeURIComponent(text)}`, { method: 'POST' });
  if (!q.ok) throw new Error(`audio_query 失敗 (${q.status}): ${text}`);
  const query = await q.json();
  query.speedScale = speed;
  query.prePhonemeLength = 0.05;
  query.postPhonemeLength = 0.08;
  const s = await fetch(`${VOICEVOX}/synthesis?speaker=${speaker}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(query)
  });
  if (!s.ok) throw new Error(`synthesis 失敗 (${s.status}): ${text}`);
  return { query, wav: Buffer.from(await s.arrayBuffer()) };
}

/* WAV（PCM）を読み取る */
function parseWav(buf) {
  let p = 12, fmt = null, data = null;
  while (p + 8 <= buf.length) {
    const id = buf.toString('ascii', p, p + 4);
    const size = buf.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { channels: buf.readUInt16LE(p + 10), rate: buf.readUInt32LE(p + 12), bits: buf.readUInt16LE(p + 22) };
    if (id === 'data') data = buf.subarray(p + 8, p + 8 + size);
    p += 8 + size + (size % 2);
  }
  if (!fmt || !data) throw new Error('WAVの形式を読み取れません');
  return { ...fmt, data };
}
function wavHeader(dataLen, { channels, rate, bits }) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + dataLen, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(channels, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * channels * bits / 8, 28);
  h.writeUInt16LE(channels * bits / 8, 32); h.writeUInt16LE(bits, 34);
  h.write('data', 36); h.writeUInt32LE(dataLen, 40);
  return h;
}

/* 口パクのタイミング（母音が鳴っている区間 = 口を開ける）を音素の長さから計算する */
function mouthIntervals(query, actualDuration) {
  const open = [];
  let t = query.prePhonemeLength;
  for (const ap of query.accent_phrases) {
    for (const m of ap.moras) {
      t += m.consonant_length || 0;
      const v = m.vowel_length || 0;
      if (!['N', 'cl', 'pau'].includes(m.vowel) && v > 0) open.push([t, t + v]);
      t += v;
    }
    if (ap.pause_mora) t += ap.pause_mora.vowel_length || 0;
  }
  t += query.postPhonemeLength;
  const k = t > 0 ? actualDuration / t : 1; // 実際の音声の長さに合わせて伸縮
  return open.map(([a, b]) => [a * k, b * k]);
}

/* =====================================================
   メイン
   ===================================================== */
const round = (n) => Math.round(n * 1000) / 1000;

async function main() {
  const script = JSON.parse(fs.readFileSync(path.join(articleDir, 'script.json'), 'utf8'));
  const speed = script.speed ?? 1.15;
  const guest = CHARS[script.guest] ? script.guest : null;

  // セリフごとの話者IDを決める（who = キャラクター、style = 声色）
  function speakerOf(line) {
    const who = CHARS[line.who] ? line.who : 'zundamon';
    if (line.who && !CHARS[line.who]) console.warn(`  ※ 不明なキャラクター "${line.who}" → ずんだもんで読みます`);
    const styles = CHARS[who].styles;
    if (!line.who && script.speaker != null) return { who, id: script.speaker }; // 旧形式の台本
    const style = styles[line.style] != null ? line.style : 'ノーマル';
    if (line.style && styles[line.style] == null) console.warn(`  ※ ${CHARS[who].name} に声色 "${line.style}" はありません → ノーマル`);
    return { who, id: styles[style] };
  }

  let fmt = null;
  const pcm = [];
  let cursor = 0;
  const pushSilence = (sec) => {
    const bytesPerSec = fmt.rate * fmt.channels * fmt.bits / 8;
    const len = Math.round(sec * bytesPerSec / (fmt.channels * fmt.bits / 8)) * (fmt.channels * fmt.bits / 8);
    pcm.push(Buffer.alloc(len));
    cursor += len / bytesPerSec;
  };

  const lines = [], sections = [], mouth = {};
  for (let si = 0; si < script.sections.length; si++) {
    const sec = script.sections[si];
    const secStart = cursor;
    for (let li = 0; li < sec.lines.length; li++) {
      const line = sec.lines[li];
      const sp = speakerOf(line);
      const { query, wav } = await voicevox(line.read || line.text, sp.id, speed);
      const w = parseWav(wav);
      if (!fmt) { fmt = w; pushSilence(TIMING.LEAD_IN); }
      const bytesPerSec = fmt.rate * fmt.channels * fmt.bits / 8;
      const dur = w.data.length / bytesPerSec;
      const start = cursor;
      pcm.push(w.data); cursor += dur;
      (mouth[sp.who] = mouth[sp.who] || []);
      mouthIntervals(query, dur).forEach(([a, b]) => mouth[sp.who].push([round(start + a), round(start + b)]));
      lines.push({ who: sp.who, text: line.text, face: FACES.includes(line.face) ? line.face : 'normal', section: si, start: round(start), end: round(cursor) });
      console.log(`  ${round(start)}s  [${CHARS[sp.who].name}] ${line.text}`);
      if (li < sec.lines.length - 1) pushSilence(TIMING.GAP_LINE);
    }
    const isLast = si === script.sections.length - 1;
    pushSilence(isLast ? TIMING.TAIL : TIMING.GAP_SECTION);
    const entry = { type: sec.type, start: round(secStart), end: round(cursor) };
    // 画面左に立つキャラクター：そのコーナーで話すずんだもん以外のキャラ（占いならイタコ）、いなければ今日のゲスト
    const other = sec.lines.map((l) => speakerOf(l).who).find((w) => w !== 'zundamon');
    entry.left = other || guest;
    if (sec.item != null) entry.item = sec.item;
    if (sec.ranking) entry.ranking = sec.ranking;
    sections.push(entry);
  }
  const duration = round(cursor);

  // ナレーションを1本のWAVに
  const narr = path.join(TMP, 'narration.wav');
  const body = Buffer.concat(pcm);
  fs.writeFileSync(narr, Buffer.concat([wavHeader(body.length, fmt), body]));

  // ---------- BGM ----------
  const bgmDir = path.join(assetsDir, 'bgm');
  let bgmList = [];
  try { bgmList = JSON.parse(fs.readFileSync(path.join(bgmDir, 'list.json'), 'utf8')); } catch { /* BGMなし */ }
  bgmList = bgmList.filter((b) => b.file && fs.existsSync(path.join(bgmDir, b.file)));
  const pick = (use) => {
    const pool = bgmList.filter((b) => (b.use || 'main') === use);
    if (!pool.length) return null;
    const day = Math.floor(Date.parse(script.date) / 86400000); // 日付で日替わり
    return pool[day % pool.length];
  };
  const mainBgm = pick('main');
  const fortuneBgm = pick('fortune');
  const fortuneSec = sections.find((s) => s.type === 'fortune');

  const out = path.join(articleDir, 'voice.mp3');
  const ffArgs = ['-y', '-loglevel', 'error', '-i', narr];
  let filter;
  const usedBgm = [];
  const V = TIMING.BGM_VOLUME, FO = TIMING.BGM_FADE_OUT;
  if (mainBgm && fortuneBgm && fortuneSec) {
    // ニュース中はメインBGM、占いから占い用BGMに切り替える
    const cut = fortuneSec.start;
    ffArgs.push('-stream_loop', '-1', '-i', path.join(bgmDir, mainBgm.file));
    ffArgs.push('-stream_loop', '-1', '-i', path.join(bgmDir, fortuneBgm.file));
    filter =
      `[1:a]atrim=0:${cut},asetpts=PTS-STARTPTS,volume=${V},afade=t=in:d=1,afade=t=out:st=${Math.max(0, cut - 1)}:d=1[m];` +
      `[2:a]atrim=0:${duration - cut},asetpts=PTS-STARTPTS,volume=${V},afade=t=in:d=0.8,afade=t=out:st=${Math.max(0, duration - cut - FO)}:d=${FO},adelay=${Math.round(cut * 1000)}:all=1[f];` +
      `[0:a][m][f]amix=inputs=3:duration=first:normalize=0[out]`;
    usedBgm.push(mainBgm, fortuneBgm);
  } else if (mainBgm || fortuneBgm) {
    const b = mainBgm || fortuneBgm;
    ffArgs.push('-stream_loop', '-1', '-i', path.join(bgmDir, b.file));
    filter =
      `[1:a]atrim=0:${duration},asetpts=PTS-STARTPTS,volume=${V},afade=t=in:d=1,afade=t=out:st=${Math.max(0, duration - FO)}:d=${FO}[m];` +
      `[0:a][m]amix=inputs=2:duration=first:normalize=0[out]`;
    usedBgm.push(b);
  }
  if (filter) ffArgs.push('-filter_complex', filter, '-map', '[out]');
  ffArgs.push('-ar', '44100', '-ac', '2', '-b:a', '96k', out);
  execFileSync('ffmpeg', ffArgs, { stdio: 'inherit' });

  // ---------- 立ち絵（あれば軽いWebPに変換して公開側に置く） ----------
  // 原本のPNG（1枚600KB程度）はスマホでは重いため、高さ1000pxのWebP（1枚50KB程度）にする
  // 素材リポジトリの <キャラのフォルダ>/ → 公開側の news/assets/video/chara/<キャラのフォルダ>/
  const castKeys = [...new Set(['zundamon', ...(guest ? [guest] : []), ...lines.map((l) => l.who)])];
  const cast = {};
  const extraCredits = [];
  const seenCredit = new Set();
  for (const key of castKeys) {
    const c = CHARS[key];
    const src = path.join(assetsDir, c.folder);
    const dstRel = `assets/video/chara/${c.folder}/`;
    const dst = path.join('news', dstRel);
    const faces = [];
    if (fs.existsSync(src)) {
      for (const face of FACES) {
        const names = ['eyeopen_mouthclose', 'eyeopen_mouthopen', 'eyeclose_mouthclose', 'eyeclose_mouthopen'].map((x) => `${face}_${x}.png`);
        if (names.every((n) => fs.existsSync(path.join(src, n)))) {
          fs.mkdirSync(dst, { recursive: true });
          names.forEach((n) => {
            execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(src, n),
              '-vf', 'scale=-1:1000', '-c:v', 'libwebp', '-quality', '85', path.join(dst, n.replace(/\.png$/, '.webp'))]);
          });
          faces.push(face);
        }
      }
      // credit.txt：1行に1つ「項目：表記」（例: 立ち絵：坂本アヒル様）。同じ表記は1回だけ出す
      try {
        fs.readFileSync(path.join(src, 'credit.txt'), 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((l) => {
          const i = l.search(/[：:]/);
          const item = i > 0 ? { label: l.slice(0, i).trim(), text: l.slice(i + 1).trim() } : { label: 'クレジット', text: l };
          const k = item.label + '|' + item.text;
          if (!seenCredit.has(k)) { seenCredit.add(k); extraCredits.push(item); }
        });
      } catch { /* なし */ }
    }
    cast[key] = {
      name: c.name,
      color: c.color,
      chara: faces.includes('normal') ? { path: dstRel, ext: 'webp', faces } : null
    };
    if (!cast[key].chara) console.log(`  ※ ${c.name} の立ち絵がまだないため、仮の図形で表示します`);
  }
  const speaking = castKeys.filter((k) => lines.some((l) => l.who === k));

  // ---------- video.json ----------
  const video = {
    date: script.date,
    duration,
    audio: 'voice.mp3',
    sections,
    lines,
    mouth,
    guest,
    cast,
    credits: {
      voice: speaking.map((k) => `VOICEVOX:${CHARS[k].name}`).join(' / '),
      extra: extraCredits,
      bgm: usedBgm.map((b) => ({ title: b.title || '', artist: b.artist || '', site: b.site || '' }))
    }
  };
  fs.writeFileSync(path.join(articleDir, 'video.json'), JSON.stringify(video, null, 1));
  console.log(`完了: ${duration}秒 / BGM: ${usedBgm.map((b) => b.title || b.file).join(', ') || 'なし'} / 出演: ${castKeys.map((k) => CHARS[k].name + (cast[k].chara ? '' : '（仮）')).join('・')}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
