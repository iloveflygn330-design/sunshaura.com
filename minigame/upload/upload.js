/* =====================================================
   きょうりゅうラン 素材の投稿ページ（minigame/upload/index.html）の動き

   流れ: トークンを入れる → BGM か画像か・どこに使うかを選ぶ → ファイルを選ぶ（大きさ・長さをチェック）→ 投稿
     投稿すると GitHub の API で、次の2つを main にコミットする（そのあと「Deploy site」が動いてサイトに反映される）:
       1. ファイル        … minigame/dinorun/uploads/<種類>/<名前>.<拡張子>（同じ場所にあれば上書き）
       2. 使う場所の一覧  … minigame/dinorun/assets.json（ゲームの dinorun.js の drApplyAssetManifest が読む）
   どこに使うかの一覧・絵の大きさ・BPM は、ゲームのデータ（dinorun-worlds.js / dinorun-design.js / dinorun-sprites.js /
   dinorun-rpg-data.js）から作るので、ゲーム側でワールドや障害物を足すと、ここにも自動で増える。
   ===================================================== */

const UP_REPO = { owner: 'iloveflygn330-design', repo: 'sunshaura.com', branch: 'main' };
const UP_MANIFEST = 'minigame/dinorun/assets.json';     // 使う場所の一覧（リポジトリのトップからの場所）
const UP_DIR = 'minigame/dinorun/uploads';              // 投稿したファイルの置き場所
const UP_TOKEN_KEY = 'dinorun-upload-token';            // トークンを保存する localStorage の名前（このブラウザだけ）
const UP_MAX = { bgm: 5 * 1024 * 1024, image: 2 * 1024 * 1024 };   // ファイルの大きさの上限

/* ★拡張予定: 素材の決まり（設計書「素材のルール」と同じ文にする。変えたら両方を書きかえる） */
const UP_RULES = {
  bgm: [
    `拍の始まり：曲の頭から <b>${DR_DESIGN.bgmBeatStart} 秒</b>のところで、最初の小節の1拍目が鳴るようにする（頭に無音を入れてそろえる）`,
    'BPM：曲の中で一定にする（途中でテンポを変えない）。上に出ている BPM と同じにする',
    '拍子：4分の4拍子',
    '長さ：拍の始まり ＋ ちょうどの小節数（例: 16小節）。最後の小節の終わりで切る（余韻を長く残さない）',
    'ループ：拍の始まりから最後までをくり返すので、最後から拍の始まりに自然につながるように作る',
    'ファイル：mp3（または ogg）、44.1kHz、ステレオ、5MB まで',
    '音量：効果音が聞こえるように、大きすぎないように（目安 -14 LUFS くらい）',
  ],
  image: [
    'ファイル：PNG（背景は透明）、2MB まで',
    'ドット絵は等倍で描く（1ドット = 1ピクセル。拡大はゲームがする）',
    '動く絵は、コマを横に並べる（1コマの幅 = 画像の幅 ÷ コマ数）',
    '遠くの景色・地面は横にくり返して流れるので、左はしと右はしがつながる絵にする',
  ],
};
/* BGM を投稿する前に、チェックしてもらうこと（全部チェックしないと投稿できない） */
const UP_CHECKS_BGM = [
  `曲の頭から ${DR_DESIGN.bgmBeatStart} 秒のところで、最初の小節の1拍目が鳴る`,
  'テンポは曲の中で一定で、上の BPM と同じ',
  '4分の4拍子で、ちょうどの小節数で切ってある',
  'くり返したとき（最後 → 拍の始まり）に、自然につながる',
];

/* -----------------------------------------------------
   ★拡張予定: 投稿できる場所の一覧（UP_TARGETS）
     1件 = { key: 'assets.json の中の場所', group: '種類', id: '名前', label: '画面に出す名前', ... 種類ごとの決まり }
     種類（group）を増やしたら、dinorun.js の drApplyAssetManifest にも当てはめ方を足す。
   ----------------------------------------------------- */
function upTargets(kind) {
  const list = [];
  if (kind === 'bgm') {
    DR_DESIGN.progression.forEach((p, i) => {
      if (i > 4) return;
      const n = i + 1, last = i === Math.min(4, DR_DESIGN.progression.length - 1);
      list.push({ group: 'bgm', id: 'world' + n, label: `ワールド${n}${last ? '以降' : ''} の曲`, bpm: p.bpm });
    });
    list.push({ group: 'bgm', id: 'rpg', label: 'バトル（RPGフェイズ）と RPGエリアの曲', bpm: DR_DESIGN.rhythm.rpgBpm });
    list.push({ group: 'bgm', id: 'bonus', label: 'ボーナスステージの曲', bpm: null });
    return list;
  }
  DR_OBSTACLES.filter(o => !o.pit && !/^gate_/.test(o.id)).forEach(o => list.push({ group: 'obstacle', id: o.id, label: `障害物：${o.name}`, w: o.w, h: o.h }));
  const rows = Math.max(...Object.values(DR_PLAYER.anims).map(a => a.row)) + 1;
  list.push({ group: 'player', id: '', label: '自機（恐竜君）', frameW: DR_PLAYER.frameW, frameH: DR_PLAYER.frameH, rows });
  DR_WORLDS.forEach(w => list.push({ group: 'worldBg', id: w.id, label: `${w.name} の遠くの景色`, h: DR_CONFIG.height }));
  DR_WORLDS.forEach(w => list.push({ group: 'ground', id: w.id, label: `${w.name} の地面`, h: DR_CONFIG.height - DR_CONFIG.groundY }));
  DR_BOSSES.forEach(b => list.push({ group: 'boss', id: b.id, label: `ボス：${b.name}`, w: b.w, h: b.h }));
  list.push({ group: 'rpgBg', id: '', label: 'バトルの背景', w: DR_CONFIG.width, h: DR_CONFIG.height });
  return list;
}

/* ---------- 状態 ---------- */
const up = { kind: 'bgm', target: null, file: null, ok: false, warn: false, audio: null, beat: null, manifest: null };
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function setStatus(el, text, cls) {
  el.textContent = text || '';
  el.className = 'up-status' + (cls ? ' is-' + cls : '');
}

/* ---------- トークン ---------- */
function upToken() {
  try {
    const t = localStorage.getItem(UP_TOKEN_KEY);
    if (t) return t;
    const avt = JSON.parse(localStorage.getItem('avt_settings') || 'null');   // アバターの登録フォームで保存したもの
    return (avt && avt.token) || '';
  } catch (e) { return ''; }
}
async function upCheckToken() {
  const st = $('up-token-status');
  if (!upToken()) { setStatus(st, 'トークンがまだ入っていません', 'warn'); return false; }
  try {
    const r = await upApi('GET', `/repos/${UP_REPO.owner}/${UP_REPO.repo}`);
    if (r.permissions && r.permissions.push) { setStatus(st, 'OK：このトークンで投稿できます', 'ok'); return true; }
    setStatus(st, 'このトークンでは書きこめません（Contents: Read and write を許可してください）', 'ng');
  } catch (e) { setStatus(st, 'トークンが使えません：' + e.message, 'ng'); }
  return false;
}

/* ---------- GitHub の API ---------- */
async function upApi(method, path, body) {
  const res = await fetch('https://api.github.com' + path, {
    method,
    headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + upToken(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 404 && method === 'GET') return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const err = new Error(data.message || ('HTTP ' + res.status)); err.status = res.status; throw err; }
  return data;
}
const upContents = p => `/repos/${UP_REPO.owner}/${UP_REPO.repo}/contents/${p.split('/').map(encodeURIComponent).join('/')}`;
function b64ToText(b64) { return new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, '')), c => c.charCodeAt(0))); }
function textToB64(text) {
  const bytes = new TextEncoder().encode(text);
  let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function fileToB64(file) {
  return new Promise((ok, ng) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = () => ng(r.error); r.readAsDataURL(file); });
}
/* 使う場所の一覧（assets.json）を読む。{ data, sha } */
async function upReadManifest() {
  const r = await upApi('GET', upContents(UP_MANIFEST) + '?ref=' + UP_REPO.branch);
  if (!r) return { data: {}, sha: null };
  return { data: JSON.parse(b64ToText(r.content)), sha: r.sha };
}
/* 使う場所の一覧を書きかえる（fn でデータを変える）。ほかの投稿とぶつかったら、読みなおして1回やりなおす */
async function upWriteManifest(fn, message) {
  for (let i = 0; i < 2; i++) {
    const m = await upReadManifest();
    fn(m.data);
    try {
      await upApi('PUT', upContents(UP_MANIFEST), { message, branch: UP_REPO.branch, content: textToB64(JSON.stringify(m.data, null, 2) + '\n'), ...(m.sha ? { sha: m.sha } : {}) });
      up.manifest = m.data;
      return;
    } catch (e) { if (e.status !== 409 || i) throw e; }
  }
}

/* ---------- 画面 ---------- */
function upRenderTargets() {
  const sel = $('up-target');
  const list = upTargets(up.kind);
  sel.innerHTML = list.map((t, i) => `<option value="${i}">${esc(t.label)}</option>`).join('');
  up.list = list;
  upSelectTarget(0);
}
function upSelectTarget(i) {
  up.target = up.list[i];
  const t = up.target;
  let spec = '';
  if (t.group === 'bgm') spec = t.bpm ? `BPM <b>${t.bpm}</b>（1小節 = ${(240 / t.bpm).toFixed(3)} 秒）・拍の始まり <b>${DR_DESIGN.bgmBeatStart} 秒</b>` : 'BPM：自由（ボーナスステージは障害物が出ないので、拍に合わせない）';
  else if (t.group === 'obstacle') spec = `大きさ <b>${t.w} × ${t.h}</b>（1コマ）。コマが2つなら ${t.w * 2} × ${t.h}`;
  else if (t.group === 'player') spec = `1コマ <b>${t.frameW} × ${t.frameH}</b>。動きごとに1行（走る・ジャンプ・スライディング・居合切り・スピン・やられ…）で <b>${t.rows} 行</b>、コマは横に並べる`;
  else if (t.group === 'worldBg') spec = `高さ <b>${t.h}</b>（幅は自由。384 以上がおすすめ）`;
  else if (t.group === 'ground') spec = `高さ <b>${t.h}</b>（幅は自由）`;
  else if (t.group === 'boss') spec = `ゲームでは <b>${t.w} × ${t.h}</b> に拡大・縮小して描く（同じ形の比率で描くときれい。足元は画像のいちばん下）`;
  else if (t.group === 'rpgBg') spec = `大きさ <b>${t.w} × ${t.h}</b>（走りながら戦うので、横にくり返して流れる）`;
  $('up-spec').innerHTML = spec;
  $('up-rules').innerHTML = `<h3>素材の決まり</h3><ul>${UP_RULES[up.kind].map(r => `<li>${r}</li>`).join('')}</ul>`;
  $('up-file').accept = up.kind === 'bgm' ? '.mp3,.ogg,audio/mpeg,audio/ogg' : '.png,image/png';
  $('up-image-opts').hidden = !(t.group === 'obstacle');
  upCheckFile();
}

/* ---------- ファイルのチェックと見本 ---------- */
async function upCheckFile() {
  upStopBeat();
  const f = $('up-file').files[0], t = up.target, chk = $('up-check'), pv = $('up-preview');
  up.file = f || null; up.ok = false; up.warn = false;
  pv.innerHTML = ''; $('up-checklist').innerHTML = '';
  if (!f) { setStatus(chk, ''); upUpdateSend(); return; }
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  if (f.size > UP_MAX[up.kind]) { setStatus(chk, `ファイルが大きすぎます（${(f.size / 1048576).toFixed(1)}MB。${UP_MAX[up.kind] / 1048576}MB まで）`, 'ng'); upUpdateSend(); return; }
  if (up.kind === 'bgm') {
    if (!['mp3', 'ogg'].includes(ext)) { setStatus(chk, 'mp3 か ogg のファイルにしてください', 'ng'); upUpdateSend(); return; }
    await upCheckBgm(f, t);
  } else {
    if (ext !== 'png') { setStatus(chk, 'PNG のファイルにしてください', 'ng'); upUpdateSend(); return; }
    await upCheckImage(f, t);
  }
  upUpdateSend();
}

async function upCheckBgm(f, t) {
  const chk = $('up-check'), pv = $('up-preview');
  const url = URL.createObjectURL(f);
  pv.innerHTML = `<audio controls src="${url}"></audio>`;
  let buf = null;
  try {
    const ac = up.ac || (up.ac = new (window.AudioContext || window.webkitAudioContext)());
    buf = await ac.decodeAudioData(await f.arrayBuffer());
  } catch (e) { setStatus(chk, '音のファイルが読めませんでした', 'ng'); return; }
  up.buffer = buf;
  const start = DR_DESIGN.bgmBeatStart, lines = [`長さ ${buf.duration.toFixed(2)} 秒`];
  let cls = 'ok';
  if (t.bpm) {
    const bars = (buf.duration - start) / (240 / t.bpm);
    const off = Math.abs(bars - Math.round(bars));
    lines.push(`拍の始まりから ${bars.toFixed(2)} 小節（BPM ${t.bpm} のとき）`);
    if (off > 0.05) { lines.push('⚠ ちょうどの小節数になっていません。BPM か、曲の終わり・頭の無音を確かめてください'); cls = 'warn'; up.warn = true; }
    else lines.push(`ちょうど ${Math.round(bars)} 小節。OK`);
    // 拍を耳で確かめる（曲に合わせてクリック音を鳴らす）
    pv.insertAdjacentHTML('beforeend', `<div class="up-beat"><button type="button" class="up-btn" id="up-beat-btn">▶ 拍に合わせてクリックを鳴らす</button>
      <span class="up-beat-dots" id="up-beat-dots"><i class="is-top"></i><i></i><i></i><i></i></span><small>クリックと曲の拍がずれていなければ OK</small></div>`);
    $('up-beat-btn').addEventListener('click', () => (up.beat ? upStopBeat() : upPlayBeat(t.bpm)));
  }
  setStatus(chk, lines.join('\n'), cls);
  $('up-checklist').innerHTML = UP_CHECKS_BGM.map((c, i) => `<label><input type="checkbox" data-check="${i}">${esc(c)}</label>`).join('')
    + (up.warn ? '<label><input type="checkbox" data-check="warn">小節数のずれは分かったうえで投稿する</label>' : '');
  $('up-checklist').querySelectorAll('input').forEach(el => el.addEventListener('change', upUpdateSend));
  up.ok = true;
}
/* 曲を頭から流して、拍の始まり（bgmBeatStart）から BPM どおりにクリックを鳴らす */
function upPlayBeat(bpm) {
  const ac = up.ac; if (!ac || !up.buffer) return;
  ac.resume();
  const t0 = ac.currentTime + 0.1, start = DR_DESIGN.bgmBeatStart, beat = 60 / bpm;
  const src = ac.createBufferSource(); src.buffer = up.buffer; src.connect(ac.destination); src.start(t0);
  const clicks = [];
  const n = Math.floor((up.buffer.duration - start) / beat);
  for (let i = 0; i <= n; i++) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = i % 4 === 0 ? 1800 : 1200;
    g.gain.setValueAtTime(0.0001, t0 + start + i * beat);
    g.gain.exponentialRampToValueAtTime(0.4, t0 + start + i * beat + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + i * beat + 0.05);
    o.connect(g); g.connect(ac.destination); o.start(t0 + start + i * beat); o.stop(t0 + start + i * beat + 0.06);
    clicks.push(o);
  }
  const dots = $('up-beat-dots') ? [...$('up-beat-dots').children] : [];
  const tick = () => {
    if (!up.beat) return;
    const k = Math.floor((ac.currentTime - t0 - start) / beat);
    dots.forEach((d, i) => d.classList.toggle('is-on', k >= 0 && k % 4 === i));
    up.beat.raf = requestAnimationFrame(tick);
  };
  up.beat = { src, clicks, raf: requestAnimationFrame(tick) };
  src.onended = upStopBeat;
  if ($('up-beat-btn')) $('up-beat-btn').textContent = '■ とめる';
}
function upStopBeat() {
  if (!up.beat) return;
  const b = up.beat; up.beat = null;
  try { b.src.stop(); } catch (e) { /* もう止まっている */ }
  b.clicks.forEach(o => { try { o.stop(); } catch (e) { /* もう止まっている */ } });
  cancelAnimationFrame(b.raf);
  if ($('up-beat-btn')) $('up-beat-btn').textContent = '▶ 拍に合わせてクリックを鳴らす';
  if ($('up-beat-dots')) [...$('up-beat-dots').children].forEach(d => d.classList.remove('is-on'));
}

async function upCheckImage(f, t) {
  const chk = $('up-check'), pv = $('up-preview');
  const url = URL.createObjectURL(f);
  const img = await new Promise((ok, ng) => { const im = new Image(); im.onload = () => ok(im); im.onerror = ng; im.src = url; }).catch(() => null);
  if (!img) { setStatus(chk, '画像が読めませんでした', 'ng'); return; }
  const W = img.naturalWidth, H = img.naturalHeight, lines = [`画像の大きさ ${W} × ${H}`];
  let bad = '';
  if (t.group === 'obstacle') {
    if (W % t.w === 0 && W / t.w >= 1 && $('up-frames').dataset.auto !== '0') $('up-frames').value = W / t.w;   // コマ数を幅から入れておく
    const frames = Math.max(1, +$('up-frames').value || 1);
    if (H !== t.h || W !== t.w * frames) bad = `${t.w * frames} × ${t.h} にしてください（1コマ ${t.w} × ${t.h} が ${frames} コマ）`;
  } else if (t.group === 'player') {
    if (W % t.frameW || H % t.frameH) bad = `幅と高さを ${t.frameW} の倍数にしてください`;
    else if (H / t.frameH < t.rows) bad = `${t.rows} 行（高さ ${t.rows * t.frameH}）にしてください`;
  } else if (t.group === 'worldBg' || t.group === 'ground') {
    if (H !== t.h) bad = `高さを ${t.h} にしてください`;
  } else if (t.group === 'rpgBg') {
    if (W !== t.w || H !== t.h) bad = `${t.w} × ${t.h} にしてください`;
  } else if (t.group === 'boss') {
    if (Math.abs(W / H - t.w / t.h) > 0.05) lines.push(`⚠ 形の比率が ${t.w} × ${t.h} とちがうので、のびて見えます`);
  }
  // 見本（ゲームと同じように、ドットのまま拡大して見せる）
  const scale = Math.max(1, Math.min(4, Math.floor(600 / W)));
  pv.innerHTML = `<img src="${url}" alt="見本" width="${W * scale}" height="${H * scale}">`;
  if (bad) { lines.push('✕ ' + bad); setStatus(chk, lines.join('\n'), 'ng'); return; }
  lines.push('OK');
  setStatus(chk, lines.join('\n'), lines.some(l => l.startsWith('⚠')) ? 'warn' : 'ok');
  up.ok = true;
}

function upUpdateSend() {
  let ready = up.ok && !!up.file && !!upToken();
  if (ready && up.kind === 'bgm') ready = [...$('up-checklist').querySelectorAll('input')].every(el => el.checked);
  $('up-send').disabled = !ready;
}

/* ---------- 投稿 ---------- */
async function upSend() {
  const t = up.target, f = up.file, st = $('up-send-status');
  if (!t || !f) return;
  $('up-send').disabled = true;
  const ext = f.name.split('.').pop().toLowerCase();
  const name = (t.id || t.group) + '.' + ext;
  const path = `${UP_DIR}/${t.group}/${name}`;
  const memo = $('up-memo').value.trim();
  const message = `きょうりゅうラン素材: ${t.label}${memo ? '（' + memo + '）' : ''}`;
  try {
    setStatus(st, 'ファイルを送っています…');
    const old = await upApi('GET', upContents(path) + '?ref=' + UP_REPO.branch);
    await upApi('PUT', upContents(path), { message, branch: UP_REPO.branch, content: await fileToB64(f), ...(old && old.sha ? { sha: old.sha } : {}) });
    setStatus(st, '使う場所を登録しています…');
    const src = path.replace(/^minigame\//, '') + '?v=' + Date.now();   // ゲームのページ（minigame/）から見た場所。差し替えたときに古いものが残らないように ?v= を付ける
    const entry = t.group === 'bgm' ? { src, beatStart: DR_DESIGN.bgmBeatStart } : { image: src };
    if (t.group === 'obstacle') { entry.frames = Math.max(1, +$('up-frames').value || 1); if (entry.frames > 1) entry.fps = Math.max(1, +$('up-fps').value || 8); }
    if (memo) entry.memo = memo;
    entry.at = new Date().toISOString();
    await upWriteManifest(m => {
      if (t.id) { m[t.group] = m[t.group] || {}; m[t.group][t.id] = entry; }
      else m[t.group] = entry;
    }, message + '（使う場所を登録）');
    setStatus(st, '投稿しました！ 数分でサイトに反映されます（GitHub の Actions の「Deploy site」が終わったら）', 'ok');
    $('up-file').value = ''; $('up-memo').value = ''; upCheckFile();
    upRenderList();
  } catch (e) {
    setStatus(st, '投稿できませんでした：' + e.message, 'ng');
    upUpdateSend();
  }
}

/* ---------- いま入っている素材 ---------- */
async function upRenderList() {
  const box = $('up-list');
  let m = null;
  try { m = upToken() ? (await upReadManifest()).data : await (await fetch('../dinorun/assets.json', { cache: 'no-cache' })).json(); }
  catch (e) { box.textContent = '読みこめませんでした'; return; }
  up.manifest = m || {};
  const all = upTargets('bgm').concat(upTargets('image'));
  const items = [];
  all.forEach(t => {
    const e = t.id ? (up.manifest[t.group] || {})[t.id] : up.manifest[t.group];
    if (e && (e.src || e.image)) items.push({ t, e });
  });
  if (!items.length) { box.textContent = 'まだありません'; return; }
  box.innerHTML = items.map(({ t, e }, i) => `<div class="up-item"><span>${esc(t.label)}<br><small>${esc((e.src || e.image).split('?')[0])}${e.memo ? '・' + esc(e.memo) : ''}</small></span>
    <button type="button" class="up-btn" data-remove="${i}">外す</button></div>`).join('');
  box.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click', async () => {
    const { t } = items[+btn.dataset.remove];
    if (!upToken()) { alert('トークンを入れてください'); return; }
    if (!confirm(`「${t.label}」を外しますか？（ファイルは残ります）`)) return;
    btn.disabled = true;
    try {
      await upWriteManifest(m => { if (t.id) { if (m[t.group]) delete m[t.group][t.id]; } else m[t.group] = {}; }, `きょうりゅうラン素材: ${t.label} を外す`);
      upRenderList();
    } catch (e) { alert('外せませんでした：' + e.message); btn.disabled = false; }
  }));
}

/* ---------- はじめ ---------- */
document.addEventListener('DOMContentLoaded', () => {
  $('up-token').value = upToken();
  $('up-token-save').addEventListener('click', () => {
    try { localStorage.setItem(UP_TOKEN_KEY, $('up-token').value.trim()); } catch (e) { /* 保存できなくても、このページを開いている間は使える */ }
    upCheckToken().then(() => { upUpdateSend(); upRenderList(); });
  });
  document.querySelectorAll('.up-tab').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.up-tab').forEach(x => x.classList.toggle('is-active', x === b));
    up.kind = b.dataset.kind;
    $('up-file').value = '';
    upRenderTargets();
  }));
  $('up-target').addEventListener('change', e => { $('up-file').value = ''; upSelectTarget(+e.target.value); });
  $('up-file').addEventListener('change', () => { $('up-frames').dataset.auto = '1'; upCheckFile(); });
  $('up-frames').addEventListener('input', () => { $('up-frames').dataset.auto = '0'; upCheckFile(); });
  $('up-send').addEventListener('click', upSend);
  upRenderTargets();
  if (upToken()) upCheckToken();
  upRenderList();
});
