/* =====================================================
   恐竜ボイスゲーム（dinovoice）の動き
   minigame/index.html で dinovoice-data.js のあとに読み込む。
   ゲームの中身（恐竜・セリフ・調整値）は dinovoice-data.js に書く。

   流れ:
     スタート → ずんだもんのセリフ → お手本の声を1回再生（恐竜はシルエット）
     → プレイヤーが「喉の長さ・口の形・口のとじ具合・息」を調整
     → 「返事をする」で一致率を計算 → 合格ライン以上で成功／3回はずれでゲームオーバー
     → シルエットが色付きになり、よろこぶ／しょんぼり

   音のしくみ（Pink Trombone 風）:
     あいうえお＋ん を「ノーマル」「ささやき」の2種類、合計12本の素材を同時にループ再生し、
     つまみの位置で音量の配分を滑らかに変える（＝口の形が途切れずに変わる）。
     喉の長さは再生速度（低く・こもった声になる）とこもり具合（ローパスフィルター）で表す。
     素材ファイルがないときは、その音だけ仮の合成音を作って代わりに鳴らす。

   一致率:
     音の波形ではなく「つまみの位置」とお手本の値の差で計算する（同じに聞こえるのに判定がぶれるのを防ぐ）。
   ===================================================== */

/* -----------------------------------------------------
   音声エンジン
   ----------------------------------------------------- */
const DVAudio = {
  ctx: null,
  master: null,
  buffers: { normal: {}, whisper: {} },  // buffers[style][母音のfile] = AudioBuffer
  attacks: {},                            // attacks[id] = AudioBuffer（ファイルがあるものだけ）
  loaded: false,
  fallbackCount: 0,                       // 仮の合成音で代用した素材の数（画面に注意を出す用）

  async init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    if (!this.loaded) await this.loadAll();
  },

  /* 全素材の読み込み。読めなかった母音は仮の合成音を作る */
  async loadAll() {
    const all = DV_SOUNDS.concat([DV_CLOSED_SOUND]);
    const jobs = [];
    this.fallbackCount = 0;
    for (const style of ['normal', 'whisper']) {
      for (const s of all) {
        const url = DV_SETTINGS.soundDir + 'voice_' + s.file + '_' + style + '.wav';
        jobs.push(this.loadFile(url).then(buf => {
          if (!buf) { this.fallbackCount++; return this.synthVowel(s, style); }
          return buf;
        }).then(buf => { this.buffers[style][s.file] = buf; }));
      }
    }
    for (const a of DV_ATTACKS) {
      jobs.push(this.loadFile(DV_SETTINGS.soundDir + 'attack_' + a.file + '.wav')
        .then(buf => { if (buf) this.attacks[a.id] = buf; }));
    }
    await Promise.all(jobs);
    this.loaded = true;
  },

  async loadFile(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.arrayBuffer();
      return await new Promise((ok, ng) => this.ctx.decodeAudioData(data, ok, ng));
    } catch (e) {
      return null;
    }
  },

  /* 仮の合成音：ブザー音（または息の音）を3つの響き（フォルマント）に通して母音っぽくする。
     ループの継ぎ目が出ないよう、声の高さ 180Hz がちょうど360周期入る2秒で切り出す */
  async synthVowel(sound, style) {
    const sr = this.ctx.sampleRate;
    const pre = 0.5, len = 2.0;
    const off = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, Math.ceil(sr * (pre + len)), sr);
    let src;
    if (style === 'normal') {
      src = off.createOscillator();
      src.type = 'sawtooth';
      src.frequency.value = 180;
    } else {
      const nb = off.createBuffer(1, sr * (pre + len), sr);
      const d = nb.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      src = off.createBufferSource();
      src.buffer = nb;
    }
    const sum = off.createGain();
    const gains = [1.0, 0.55, 0.25];
    sound.formants.forEach((f, i) => {
      const bp = off.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f;
      bp.Q.value = style === 'normal' ? 6 + i * 3 : 4 + i * 2;
      const g = off.createGain();
      g.gain.value = gains[i];
      src.connect(bp); bp.connect(g); g.connect(sum);
    });
    if (sound.file === DV_CLOSED_SOUND.file) {
      // 「ん」は口を閉じた音なので高い成分を落とす
      const lp = off.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 900;
      sum.connect(lp); lp.connect(off.destination);
    } else {
      sum.connect(off.destination);
    }
    src.start(0);
    const rendered = await off.startRendering();

    // 先頭の立ち上がり部分を捨てて、2秒ぶんだけ取り出す＋音量をそろえる
    const out = this.ctx.createBuffer(1, Math.round(sr * len), sr);
    const from = rendered.getChannelData(0).subarray(Math.round(sr * pre), Math.round(sr * pre) + out.length);
    let peak = 0;
    for (let i = 0; i < from.length; i++) peak = Math.max(peak, Math.abs(from[i]));
    const scale = peak > 0 ? 0.5 / peak : 1;
    const to = out.getChannelData(0);
    for (let i = 0; i < from.length; i++) to[i] = from[i] * scale;
    return out;
  },
};

/* 鳴っている1つの声。お手本と自分の声は同じしくみで、params だけが違う */
class DVVoice {
  constructor(params, attackId) {
    const ctx = DVAudio.ctx;
    this.sources = [];   // { src, gain, file, style }
    this.env = ctx.createGain();
    this.env.gain.value = 0;
    this.lowpass = ctx.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.Q.value = 0.8;
    this.lowpass.connect(this.env);
    this.env.connect(DVAudio.master);

    for (const style of ['normal', 'whisper']) {
      for (const file of Object.keys(DVAudio.buffers[style])) {
        const src = ctx.createBufferSource();
        src.buffer = DVAudio.buffers[style][file];
        src.loop = true;
        const gain = ctx.createGain();
        gain.gain.value = 0;
        src.connect(gain); gain.connect(this.lowpass);
        this.sources.push({ src, gain, file, style });
      }
    }
    this.set(params, true);
    const now = ctx.currentTime;
    // 素材ごとに再生開始位置をずらして、同時に鳴らしたときの打ち消し合いを防ぐ
    this.sources.forEach(s => s.src.start(now, Math.random() * Math.max(0, s.src.buffer.duration - 0.1)));
    this.env.gain.setValueAtTime(0, now);
    this.env.gain.linearRampToValueAtTime(1, now + 0.12);

    // 鳴き始めの勢い（素材があるときだけ）
    if (attackId && DVAudio.attacks[attackId]) {
      const a = ctx.createBufferSource();
      a.buffer = DVAudio.attacks[attackId];
      a.playbackRate.value = dvThroatToRate(params.throat);
      a.connect(this.lowpass);
      a.start(now);
    }
  }

  /* つまみの値を音に反映（途切れないよう少しずつ変える） */
  set(p, immediate) {
    const ctx = DVAudio.ctx;
    const t = ctx.currentTime;
    const smooth = immediate ? 0.001 : 0.04;
    const vowelW = dvVowelWeights(p.mouthX, p.mouthY);
    const rate = dvThroatToRate(p.throat);
    const cutoff = 9000 - (9000 - 1500) * p.throat;
    // 喉が長いほど音量が下がって聞こえるので少し補正
    const loud = 0.55 + 0.35 * p.throat;

    this.lowpass.frequency.setTargetAtTime(cutoff, t, smooth);
    for (const s of this.sources) {
      const styleW = s.style === 'normal' ? 1 - p.breath : p.breath;
      const shapeW = s.file === DV_CLOSED_SOUND.file ? p.close : (vowelW[s.file] || 0) * (1 - p.close);
      s.gain.gain.setTargetAtTime(styleW * shapeW * loud, t, smooth);
      s.src.playbackRate.setTargetAtTime(rate, t, smooth);
    }
  }

  stop(fade = 0.15) {
    const ctx = DVAudio.ctx;
    const t = ctx.currentTime;
    this.env.gain.cancelScheduledValues(t);
    this.env.gain.setValueAtTime(this.env.gain.value, t);
    this.env.gain.linearRampToValueAtTime(0, t + fade);
    this.sources.forEach(s => { try { s.src.stop(t + fade + 0.05); } catch (e) {} });
  }
}

/* 喉の長さ（0〜1）→ 再生速度 */
function dvThroatToRate(throat) {
  const a = DV_SETTINGS.rateShortThroat, b = DV_SETTINGS.rateLongThroat;
  return a * Math.pow(b / a, throat);   // 耳で均等に変わるよう対数でつなぐ
}

/* 口の形パッドの位置 → 各母音の混ぜ具合（近い母音ほど大きく、合計1） */
function dvVowelWeights(x, y) {
  const w = {};
  let total = 0;
  for (const s of DV_SOUNDS) {
    const d = Math.hypot(x - s.x, y - s.y);
    if (d < 0.0001) { DV_SOUNDS.forEach(o => { w[o.file] = 0; }); w[s.file] = 1; return w; }
    w[s.file] = 1 / Math.pow(d, 4);
    total += w[s.file];
  }
  for (const k in w) w[k] /= total;
  return w;
}

/* -----------------------------------------------------
   ゲーム本体
   ----------------------------------------------------- */
const DV_DEFAULT_PARAMS = { throat: 0.5, mouthX: 0.5, mouthY: 0.5, close: 0.2, breath: 0.2 };

const dv = {
  target: null,       // { dino, sound, params }
  player: Object.assign({}, DV_DEFAULT_PARAMS),
  triesLeft: 0,
  phase: 'idle',      // idle（スタート前）/ play（調整中）/ done（結果）
  voice: null,        // いま鳴っている DVVoice
  voiceTimer: null,
  liveHeld: false,    // 操作中の声を鳴らしているか
  lastDinoId: null,
  lineAudio: null,
};

/* ミニゲーム選択からこの画面に来たとき（minigame.js の mgStartGame から呼ばれる） */
function dvInit() {
  dvStop();
  dv.phase = 'idle';
  document.getElementById('dv-start-overlay').style.display = 'flex';
  document.getElementById('dv-loading').style.display = 'none';
  document.getElementById('dv-start-btn').disabled = false;
  dvBindControlsOnce();
}

/* 画面を離れるとき：音とタイマーを止める */
function dvStop() {
  clearTimeout(dv.voiceTimer);
  if (dv.voice) { dv.voice.stop(0.05); dv.voice = null; }
  dv.liveHeld = false;
  if (dv.lineAudio) { dv.lineAudio.pause(); dv.lineAudio = null; }
  document.querySelectorAll('.dv-voice-btn').forEach(b => b.classList.remove('is-playing'));
  const cover = document.getElementById('dv-cover');
  if (cover) cover.classList.remove('is-rustle');
}

function dvWait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function dvStart() {
  const btn = document.getElementById('dv-start-btn');
  btn.disabled = true;
  document.getElementById('dv-loading').style.display = 'block';
  try {
    await DVAudio.init();
  } catch (e) {
    document.getElementById('dv-loading').textContent = 'このブラウザでは音が鳴らせないみたい…';
    return;
  }
  document.getElementById('dv-start-overlay').style.display = 'none';
  document.getElementById('dv-fallback-note').style.display = DVAudio.fallbackCount > 0 ? 'block' : 'none';
  dvNewRound();
}

/* 1問はじめる */
async function dvNewRound() {
  dvStop();
  // 同じ恐竜が続かないように選ぶ
  const pool = DV_DINOS.filter(d => d.id !== dv.lastDinoId);
  const dino = pool[Math.floor(Math.random() * pool.length)];
  dv.lastDinoId = dino.id;
  const soundId = dino.sounds[Math.floor(Math.random() * dino.sounds.length)];
  const sound = DV_SOUNDS.find(s => s.id === soundId) || DV_SOUNDS[0];
  dv.target = {
    dino, sound,
    params: { throat: dino.voice.throat, close: dino.voice.close, breath: dino.voice.breath, mouthX: sound.x, mouthY: sound.y },
  };
  dv.player = Object.assign({}, DV_DEFAULT_PARAMS);
  dv.triesLeft = DV_SETTINGS.maxTries;
  dv.phase = 'play';

  dvRenderDino(dino, 'silhouette');
  document.getElementById('dv-cover').classList.remove('is-open');
  document.getElementById('dv-dino-wrap').classList.add('is-covered');
  dvSyncControls();
  dvRenderTries();
  document.getElementById('dv-result').innerHTML = '';
  document.getElementById('dv-name').textContent = '？？？';
  document.getElementById('dv-answer-btn').style.display = '';
  document.getElementById('dv-again-btn').style.display = 'none';
  dvSetControlsEnabled(true);

  await dvSay('start');
  if (dv.phase === 'play') dvPlayVoice('model');
}

/* 恐竜のSVGを描く。mood: silhouette / normal / happy / sad */
function dvRenderDino(dino, mood) {
  const [cx, cy] = dino.eye;
  const box = document.getElementById('dv-dino');
  box.innerHTML =
    '<svg viewBox="0 0 400 280" class="dv-dino-svg ' + (mood === 'silhouette' ? 'silhouette' : 'mood-' + mood) +
    '" style="--dino-color:' + dino.color + '" role="img" aria-label="' + (mood === 'silhouette' ? 'なぞの恐竜' : dino.name) + '">' +
      '<g class="dv-body">' + dino.shape + '</g>' +
      '<g class="dv-eyes">' +
        // ふつう：縦線
        '<line class="dv-eye dv-eye-normal" x1="' + cx + '" y1="' + (cy - 7) + '" x2="' + cx + '" y2="' + (cy + 7) + '"/>' +
        // よろこぶ：上向きの弧
        '<path class="dv-eye dv-eye-happy" d="M' + (cx - 7) + ' ' + (cy + 4) + ' Q' + cx + ' ' + (cy - 9) + ' ' + (cx + 7) + ' ' + (cy + 4) + '"/>' +
        // しょんぼり：下がり目＋涙
        '<g class="dv-eye dv-eye-sad"><path d="M' + (cx - 7) + ' ' + (cy + 4) + ' L' + (cx + 7) + ' ' + (cy - 3) + '"/>' +
        '<ellipse class="dv-tear" cx="' + (cx + 3) + '" cy="' + (cy + 14) + '" rx="3" ry="5"/></g>' +
        /*
         * ★拡張予定: 表情を増やす場合
         *   1. ここに class="dv-eye dv-eye-<表情名>" の図形を1つ足す（目の中心は cx, cy）
         *   2. dinovoice.css に  .dv-dino-svg.mood-<表情名> .dv-eye-<表情名> { display: inline; }  を足す
         *   3. dvRenderDino(dino, '<表情名>') で呼ぶ
         */
      '</g>' +
    '</svg>';
}

/* 恐竜の表情を変える（色はCSSのアニメーションで黒からふわっと変わる） */
function dvSetMood(mood, anim) {
  const svg = document.querySelector('#dv-dino svg');
  if (!svg) return;
  svg.setAttribute('class', 'dv-dino-svg mood-' + mood);
  svg.setAttribute('aria-label', dv.target.dino.name);
  const box = document.getElementById('dv-dino');
  box.classList.remove('dv-anim-happy', 'dv-anim-sad');
  void box.offsetWidth;   // アニメーションをやり直すため
  if (anim) box.classList.add('dv-anim-' + anim);
}

/* -----------------------------------------------------
   声を鳴らす
     kind: 'model'（お手本）/ 'player'（自分の声）
   ----------------------------------------------------- */
function dvPlayVoice(kind) {
  if (!DVAudio.loaded || !dv.target) return;
  dvStop();
  const params = kind === 'model' ? dv.target.params : dv.player;
  dv.voice = new DVVoice(params, dv.target.dino.attack);
  const btn = document.getElementById(kind === 'model' ? 'dv-model-btn' : 'dv-player-btn');
  btn.classList.add('is-playing');
  const cover = document.getElementById('dv-cover');
  if (kind === 'model') cover.classList.add('is-rustle');   // お手本は草むらの中から鳴く
  dv.voiceTimer = setTimeout(() => {
    if (dv.voice) { dv.voice.stop(); dv.voice = null; }
    btn.classList.remove('is-playing');
    cover.classList.remove('is-rustle');
  }, DV_SETTINGS.voiceSeconds * 1000);
}

/* つまみを触っている間は、自分の声を鳴らし続ける（Pink Trombone と同じ遊び方） */
function dvLiveStart() {
  if (dv.phase !== 'play' || !DVAudio.loaded) return;
  dvStop();
  dv.voice = new DVVoice(dv.player, null);
  dv.liveHeld = true;
  document.getElementById('dv-player-btn').classList.add('is-playing');
}
function dvLiveEnd() {
  if (!dv.liveHeld) return;
  dv.liveHeld = false;
  if (dv.voice) { dv.voice.stop(); dv.voice = null; }
  document.getElementById('dv-player-btn').classList.remove('is-playing');
}
function dvParamsChanged() {
  if (dv.voice && dv.liveHeld) dv.voice.set(dv.player);
}

/* -----------------------------------------------------
   答え合わせ
   ----------------------------------------------------- */
function dvScore(p, t) {
  const w = DV_SETTINGS.weights;
  // 口の形パッドの距離は、いちばん遠い母音どうしが約0.9なので 0.6 で 100% ずれ扱い
  const diffs = {
    throat: Math.abs(p.throat - t.throat),
    mouth: Math.min(1, Math.hypot(p.mouthX - t.mouthX, p.mouthY - t.mouthY) / 0.6),
    close: Math.abs(p.close - t.close),
    breath: Math.abs(p.breath - t.breath),
  };
  let miss = 0;
  for (const k in diffs) miss += w[k] * diffs[k];
  const percent = Math.max(0, Math.min(100, Math.round((1 - miss) * 100)));
  // いちばんずれている項目（ヒント用）
  let worst = 'throat';
  for (const k in diffs) if (w[k] * diffs[k] > w[worst] * diffs[worst]) worst = k;
  return { percent, worst };
}

function dvHint(worst) {
  const p = dv.player, t = dv.target.params;
  switch (worst) {
    case 'throat': return t.throat > p.throat ? 'もっと低い声（長い喉）みたい' : 'もっと高い声（短い喉）みたい';
    case 'mouth':  return '口の形がちがうみたい。お手本をよーく聴いてみて';
    case 'close':  return t.close > p.close ? 'もっと口をとじた声みたい' : 'もっと口をあけた声みたい';
    case 'breath': return t.breath > p.breath ? 'もっと息の多い声みたい' : 'もっとはっきりした声みたい';
  }
  return '';
}

async function dvAnswer() {
  if (dv.phase !== 'play') return;
  dvStop();
  const { percent, worst } = dvScore(dv.player, dv.target.params);
  const result = document.getElementById('dv-result');

  if (percent >= DV_SETTINGS.passPercent) {
    dv.phase = 'done';
    result.innerHTML = '<b class="dv-ok">' + percent + '% 一致！ 成功！</b>';
    dvFinish(true);
    return;
  }

  dv.triesLeft--;
  dvRenderTries();
  if (dv.triesLeft <= 0) {
    dv.phase = 'done';
    result.innerHTML = '<b class="dv-ng">' + percent + '% 一致… ゲームオーバー</b>';
    dvFinish(false);
    return;
  }
  result.innerHTML = '<b class="dv-ng">' + percent + '% 一致</b>（合格は ' + DV_SETTINGS.passPercent + '% 以上）<br>' + dvHint(worst);
  dvSay('retry');
}

async function dvFinish(success) {
  dvSetControlsEnabled(false);
  document.getElementById('dv-answer-btn').style.display = 'none';
  const dino = dv.target.dino;
  // 草むらをどける → 黒いシルエットを少し見せる → 色付き＋表情
  document.getElementById('dv-cover').classList.add('is-open');
  document.getElementById('dv-dino-wrap').classList.remove('is-covered');
  await dvWait(1000);
  document.getElementById('dv-name').textContent = dino.name;
  dvSetMood(success ? 'happy' : 'sad', success ? 'happy' : 'sad');
  document.getElementById('dv-result').insertAdjacentHTML('beforeend',
    '<p class="dv-answer-detail">正解：' + dino.name + 'の「' + dv.target.sound.label + '」の声</p>' +
    '<p class="dv-dino-hint">' + dino.hint + '</p>');
  // 成功ならお手本の声で喜ぶ
  if (success) dvPlayVoice('model');
  await dvSay(success ? 'success' : 'gameover');
  await dvSay('intro', dino.id);
  document.getElementById('dv-again-btn').style.display = '';
}

/* -----------------------------------------------------
   ずんだもんのセリフ（吹き出し＋音声。音声ファイルがなければ文字だけ）
     終わるまで待てる Promise を返す
   ----------------------------------------------------- */
function dvSay(scene, dinoId) {
  let list = DV_LINES[scene];
  if (scene === 'intro') list = (DV_LINES.intro || {})[dinoId];
  if (!list || !list.length) return Promise.resolve();
  const line = list[Math.floor(Math.random() * list.length)];
  const bubble = document.getElementById('dv-bubble');
  bubble.textContent = line.text;
  bubble.classList.remove('is-pop'); void bubble.offsetWidth; bubble.classList.add('is-pop');

  return new Promise(resolve => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    if (!line.file) { setTimeout(finish, 900); return; }
    if (dv.lineAudio) dv.lineAudio.pause();
    const audio = new Audio(DV_SETTINGS.lineDir + line.file);
    dv.lineAudio = audio;
    audio.addEventListener('ended', finish);
    audio.addEventListener('error', () => setTimeout(finish, 900));   // ファイルなし → 文字を読む時間だけ待つ
    audio.play().catch(() => setTimeout(finish, 900));
    setTimeout(finish, 6000);   // 念のため、長くても6秒で次へ
  });
}

/* -----------------------------------------------------
   画面の部品
   ----------------------------------------------------- */
function dvRenderTries() {
  const el = document.getElementById('dv-tries');
  let html = '';
  for (let i = 0; i < DV_SETTINGS.maxTries; i++) html += i < dv.triesLeft ? '🦖' : '<span class="dv-try-used">🦖</span>';
  el.innerHTML = html;
}

function dvSetControlsEnabled(on) {
  document.getElementById('dv-controls').classList.toggle('is-disabled', !on);
  document.querySelectorAll('#dv-controls input').forEach(i => { i.disabled = !on; });
}

/* つまみの見た目を dv.player に合わせる */
function dvSyncControls() {
  document.getElementById('dv-throat').value = dv.player.throat;
  document.getElementById('dv-close').value  = dv.player.close;
  document.getElementById('dv-breath').value = dv.player.breath;
  const knob = document.getElementById('dv-pad-knob');
  knob.style.left = (dv.player.mouthX * 100) + '%';
  knob.style.top  = (dv.player.mouthY * 100) + '%';
}

/* パッドに母音の目印を置き、操作イベントをつなぐ（最初の1回だけ） */
let dvBound = false;
function dvBindControlsOnce() {
  if (dvBound) return;
  dvBound = true;

  const pad = document.getElementById('dv-pad');
  DV_SOUNDS.forEach(s => {
    const mark = document.createElement('span');
    mark.className = 'dv-pad-mark';
    mark.textContent = s.label;
    mark.style.left = (s.x * 100) + '%';
    mark.style.top  = (s.y * 100) + '%';
    pad.appendChild(mark);
  });

  const movePad = e => {
    const r = pad.getBoundingClientRect();
    dv.player.mouthX = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    dv.player.mouthY = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    dvSyncControls();
    dvParamsChanged();
  };
  pad.addEventListener('pointerdown', e => {
    if (dv.phase !== 'play') return;
    pad.setPointerCapture(e.pointerId);
    movePad(e);
    dvLiveStart();
  });
  pad.addEventListener('pointermove', e => { if (dv.liveHeld && pad.hasPointerCapture(e.pointerId)) movePad(e); });
  pad.addEventListener('pointerup', dvLiveEnd);
  pad.addEventListener('pointercancel', dvLiveEnd);

  ['throat', 'close', 'breath'].forEach(key => {
    const input = document.getElementById('dv-' + key);
    input.addEventListener('input', () => { dv.player[key] = parseFloat(input.value); dvParamsChanged(); });
    input.addEventListener('pointerdown', dvLiveStart);
    input.addEventListener('pointerup', dvLiveEnd);
    input.addEventListener('pointercancel', dvLiveEnd);
  });

  document.getElementById('dv-credit').textContent = '音声：' + DV_SETTINGS.credit;
}

/* ページを離れるときは音を止める */
window.addEventListener('pagehide', dvStop);
