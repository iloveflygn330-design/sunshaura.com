/* =====================================================
   sunshaura.com ミニゲームページ専用スクリプト
   minigame/index.html で読み込む。
   ===================================================== */
// =====================================================
// ミニゲームページ
// =====================================================

/* --- 共通：ゲーム選択 ⇔ 各ゲーム画面 --- */
function mgShowSelect() {
  document.querySelectorAll('#minigame-inner .mg-screen').forEach(s => s.classList.remove('active'));
  document.getElementById('mg-select').classList.add('active');
}

function mgStartGame(gameId) {
  mgShootingStop();
  if (typeof dvStop === 'function') dvStop();
  if (typeof dinorunStop === 'function') dinorunStop();
  document.querySelectorAll('#minigame-inner .mg-screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('mg-' + gameId);
  if (target) target.classList.add('active');
  /*
   * ★拡張予定: 新しいゲームを追加する場合はここに
   *   if (gameId === 'ゲームID') { 初期化処理 }
   *   を追記する
   */
  if (gameId === 'janken') mgJankenReset();
  if (gameId === 'dinovoice') dvInit();
  if (gameId === 'dinorun') dinorunInit();
  window.scrollTo(0, 0);
}

function mgBackToSelect() {
  mgShootingStop();
  if (typeof dvStop === 'function') dvStop();   // 恐竜ボイスゲームの音を止める
  if (typeof dinorunStop === 'function') dinorunStop();   // きょうりゅうランのループ・BGMを止める
  mgShowSelect();
}

/* URL の ?game=ゲームID で、そのゲームを最初から開く（例: minigame/?game=dinorun）
   ランキング1位の Discord 通知のリンクなどで使う。ゲームID は mgStartGame() と同じ */
document.addEventListener('DOMContentLoaded', () => {
  const id = new URLSearchParams(location.search).get('game');
  if (id && /^[a-z0-9_-]+$/i.test(id) && document.getElementById('mg-' + id)) mgStartGame(id);
});

/* --- まとあてシューティング --- */
const MG_SH_DURATION_SEC = 30;
const MG_SH_SPAWN_MS     = 700;
const MG_SH_TARGET_LIFE_MS = 900;

let mgShScore = 0, mgShTimeLeft = MG_SH_DURATION_SEC;
let mgShSpawnTimer = null, mgShCountdownTimer = null, mgShPlaying = false;

function mgShootingStart() {
  mgShootingStop();
  const field = document.getElementById('mg-sh-field');
  field.querySelectorAll('.mg-target').forEach(t => t.remove());
  document.getElementById('mg-sh-start-overlay').style.display  = 'none';
  document.getElementById('mg-sh-result-overlay').style.display = 'none';

  mgShScore = 0; mgShTimeLeft = MG_SH_DURATION_SEC; mgShPlaying = true;
  document.getElementById('mg-sh-score').textContent = mgShScore;
  document.getElementById('mg-sh-time').textContent  = mgShTimeLeft;

  mgShSpawnTimer = setInterval(mgShootingSpawnTarget, MG_SH_SPAWN_MS);
  mgShCountdownTimer = setInterval(() => {
    mgShTimeLeft--;
    document.getElementById('mg-sh-time').textContent = mgShTimeLeft;
    if (mgShTimeLeft <= 0) mgShootingEnd();
  }, 1000);
}

function mgShootingSpawnTarget() {
  const field = document.getElementById('mg-sh-field');
  if (!field || !mgShPlaying) return;
  const size = 56;
  const maxX = field.clientWidth  - size;
  const maxY = field.clientHeight - size;
  if (maxX <= 0 || maxY <= 0) return;

  const target = document.createElement('div');
  target.className = 'mg-target';
  target.style.left = Math.random() * maxX + 'px';
  target.style.top  = Math.random() * maxY + 'px';
  target.onclick = () => mgShootingHit(target);
  field.appendChild(target);

  target._mgTimeout = setTimeout(() => target.remove(), MG_SH_TARGET_LIFE_MS);
}

function mgShootingHit(target) {
  if (!mgShPlaying || target.classList.contains('mg-target-hit')) return;
  clearTimeout(target._mgTimeout);
  target.classList.add('mg-target-hit');
  setTimeout(() => target.remove(), 180);
  mgShScore++;
  document.getElementById('mg-sh-score').textContent = mgShScore;
}

function mgShootingEnd() {
  mgShootingStop();
  const field = document.getElementById('mg-sh-field');
  if (field) field.querySelectorAll('.mg-target').forEach(t => t.remove());
  document.getElementById('mg-sh-final-score').textContent = mgShScore;
  document.getElementById('mg-sh-result-overlay').style.display = 'flex';
}

function mgShootingStop() {
  mgShPlaying = false;
  clearInterval(mgShSpawnTimer); clearInterval(mgShCountdownTimer);
  mgShSpawnTimer = null; mgShCountdownTimer = null;
}

/* --- じゃんけんゲーム --- */
const MG_JK_HAND_EMOJI = { rock: '✊', scissors: '✌️', paper: '✋' };
const MG_JK_HAND_LABEL = { rock: 'グー', scissors: 'チョキ', paper: 'パー' };
const MG_JK_BEATS      = { rock: 'scissors', scissors: 'paper', paper: 'rock' }; // key が勝つ相手

let mgJkWin = 0, mgJkLose = 0, mgJkDraw = 0, mgJkBusy = false;

function mgJankenReset() {
  mgJkWin = 0; mgJkLose = 0; mgJkDraw = 0; mgJkBusy = false;
  document.getElementById('mg-jk-win').textContent  = mgJkWin;
  document.getElementById('mg-jk-lose').textContent = mgJkLose;
  document.getElementById('mg-jk-draw').textContent = mgJkDraw;
  document.getElementById('mg-jk-cpu-hand').textContent    = '？';
  document.getElementById('mg-jk-player-hand').textContent = '？';
  document.getElementById('mg-jk-message').textContent = '手を選んでね！';
  document.querySelectorAll('.mg-jk-btn').forEach(b => b.disabled = false);
}

function mgJankenJudge(player, cpu) {
  if (player === cpu) return 'draw';
  return MG_JK_BEATS[player] === cpu ? 'win' : 'lose';
}

function mgJankenPlay(playerHand) {
  if (mgJkBusy) return;
  mgJkBusy = true;
  document.querySelectorAll('.mg-jk-btn').forEach(b => b.disabled = true);

  const hands = Object.keys(MG_JK_HAND_EMOJI);
  const cpuHand = hands[Math.floor(Math.random() * hands.length)];

  const cpuEl    = document.getElementById('mg-jk-cpu-hand');
  const playerEl = document.getElementById('mg-jk-player-hand');
  const msgEl    = document.getElementById('mg-jk-message');

  playerEl.textContent = MG_JK_HAND_EMOJI[playerHand];
  cpuEl.textContent = '？';
  cpuEl.classList.add('mg-jk-shake');
  msgEl.textContent = 'せーの...';

  setTimeout(() => {
    cpuEl.classList.remove('mg-jk-shake');
    cpuEl.textContent = MG_JK_HAND_EMOJI[cpuHand];

    const result = mgJankenJudge(playerHand, cpuHand);
    const vsText = `（${MG_JK_HAND_LABEL[playerHand]} vs ${MG_JK_HAND_LABEL[cpuHand]}）`;
    if (result === 'win')       { mgJkWin++;  msgEl.textContent = '勝ち！' + vsText; }
    else if (result === 'lose') { mgJkLose++; msgEl.textContent = '負け...' + vsText; }
    else                        { mgJkDraw++; msgEl.textContent = 'あいこ！' + vsText; }

    document.getElementById('mg-jk-win').textContent  = mgJkWin;
    document.getElementById('mg-jk-lose').textContent = mgJkLose;
    document.getElementById('mg-jk-draw').textContent = mgJkDraw;

    document.querySelectorAll('.mg-jk-btn').forEach(b => b.disabled = false);
    mgJkBusy = false;
  }, 600);
}

/* ページを離れるときは、裏でタイマーを回さない */
window.addEventListener('pagehide', mgShootingStop);
