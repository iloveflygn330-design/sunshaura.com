// ゲーム状態管理
const gameState = {
    isCharging: false,
    power: 0,
    isArrowFlying: false,
    targets: []
};

// ターゲット情報（ページ名とURL）
const targetPages = [
    { name: 'プロフィール', url: 'profile.html' },
    { name: 'リンク', url: 'links.html' },
    { name: 'ツール', url: 'tools.html' },
    { name: 'ブログ', url: 'blog.html' },
    { name: 'コンタクト', url: 'contact.html' }
];

// DOM要素の取得
const toggleBtn = document.getElementById('toggle-footer');
const gameFooter = document.getElementById('game-footer');
const character = document.getElementById('character');
const powerFill = document.getElementById('power-fill');
const targetSection = document.getElementById('target-section');
const arrowCanvas = document.getElementById('arrow-canvas');
const gameOver = document.getElementById('game-over');
const retryBtn = document.getElementById('retry-btn');
const gameTitle = document.getElementById('game-title');
const gameSwitchBtns = document.querySelectorAll('.game-switch-btn');

// ゲーム2の要素
const game2Container = document.getElementById('game2-container');
const balloonArea = document.getElementById('balloon-area');
const balloonArrowCanvas = document.getElementById('balloon-arrow-canvas');
const shootBtn = document.getElementById('shoot-btn');
const gameOver2 = document.getElementById('game-over-2');
const retryBtn2 = document.getElementById('retry-btn-2');

// Canvas設定
const ctx = arrowCanvas.getContext('2d');
const ctx2 = balloonArrowCanvas ? balloonArrowCanvas.getContext('2d') : null;

// 現在のゲームモード
let currentGame = 'arrow';

// ゲーム2の状態
const game2State = {
    balloons: [],
    isArrowFlying: false,
    animationFrameId: null
};

// ゲーム切り替えボタンのイベント
gameSwitchBtns.forEach(btn => {
    const gameType = btn.dataset.game;
    
    // 弓矢とゲーム2は実装済み、それ以外は未実装
    if (gameType !== 'arrow' && gameType !== 'game2') {
        btn.disabled = true;
        btn.title = '準備中...';
    }
    
    btn.addEventListener('click', () => {
        if (btn.disabled) return;
        
        // アクティブボタンの切り替え
        gameSwitchBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // ゲームモードの変更
        currentGame = gameType;
        switchGame(gameType);
    });
});

// ゲーム切り替え処理
function switchGame(gameType) {
    // すべてのゲームコンテナを非表示
    document.querySelectorAll('.game-container').forEach(container => {
        if (!container.classList.contains('game-header')) {
            container.style.display = 'none';
        }
    });
    
    if (gameType === 'arrow') {
        gameTitle.textContent = '🏹 弓矢チャレンジ';
        document.querySelector('.game-container:not(.game2-container)').style.display = 'flex';
        initializeGame();
    }
    else if (gameType === 'game2') {
        gameTitle.textContent = '🎈 風船射撃';
        game2Container.style.display = 'flex';
        initializeGame2();
    }
    // 他のゲームは後で実装
    else if (gameType === 'game3') {
        gameTitle.textContent = '🎮 ゲーム3';
        // TODO: Game3の初期化
    }
    else if (gameType === 'game4') {
        gameTitle.textContent = '🎮 ゲーム4';
        // TODO: Game4の初期化
    }
    else if (gameType === 'game5') {
        gameTitle.textContent = '🎮 ゲーム5';
        // TODO: Game5の初期化
    }
}

// フッターの折りたたみ/展開
toggleBtn.addEventListener('click', () => {
    gameFooter.classList.toggle('collapsed');
    toggleBtn.classList.toggle('expanded');
    
    // 展開時にCanvasサイズを更新
    if (!gameFooter.classList.contains('collapsed')) {
        updateCanvasSize();
        initializeGame();
    }
});

// Canvasサイズの更新
function updateCanvasSize() {
    arrowCanvas.width = gameFooter.offsetWidth;
    arrowCanvas.height = gameFooter.offsetHeight;
}

// ゲームの初期化
function initializeGame() {
    gameState.isCharging = false;
    gameState.power = 0;
    gameState.isArrowFlying = false;
    powerFill.style.width = '0%';
    gameOver.style.display = 'none';
    ctx.clearRect(0, 0, arrowCanvas.width, arrowCanvas.height);
    
    // ターゲットボックスをランダム配置
    placeTargets();
}

// ターゲットボックスのランダム配置（横一列、縦のずれなし）
function placeTargets() {
    targetSection.innerHTML = '';
    gameState.targets = [];
    
    const sectionWidth = targetSection.offsetWidth;
    const sectionHeight = targetSection.offsetHeight;
    
    // ボックスを横一列に配置（中央の高さ）
    const fixedY = (sectionHeight - 60) / 2; // 中央に配置
    
    // 利用可能な横幅を計算
    const boxWidth = 120; // ボックスの平均幅
    const spacing = 30; // ボックス間の最小スペース
    const totalWidth = sectionWidth - boxWidth;
    
    // X座標の候補を作成（重ならないように）
    const xPositions = [];
    const numBoxes = targetPages.length;
    const segment = totalWidth / numBoxes;
    
    for (let i = 0; i < numBoxes; i++) {
        // 各セグメント内でランダムな位置を選択
        const minX = i * segment;
        const maxX = minX + segment - boxWidth - spacing;
        const x = minX + Math.random() * (maxX - minX);
        xPositions.push(x);
    }
    
    // Fisher-Yatesシャッフルでランダム化
    for (let i = xPositions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [xPositions[i], xPositions[j]] = [xPositions[j], xPositions[i]];
    }
    
    targetPages.forEach((page, index) => {
        const box = document.createElement('div');
        box.className = 'target-box';
        box.textContent = page.name;
        box.dataset.url = page.url;
        
        const x = xPositions[index];
        const y = fixedY;
        
        box.style.left = `${x}px`;
        box.style.top = `${y}px`;
        
        targetSection.appendChild(box);
        
        // 当たり判定用に位置を保存
        gameState.targets.push({
            element: box,
            x: x,
            y: y,
            width: box.offsetWidth,
            height: box.offsetHeight,
            url: page.url
        });
    });
}

// キャラクタークリック時の処理
let chargingInterval;
let powerChargeStartTime;

character.addEventListener('mousedown', startCharging);
character.addEventListener('touchstart', startCharging);

document.addEventListener('mouseup', releaseArrow);
document.addEventListener('touchend', releaseArrow);

function startCharging(e) {
    if (gameState.isArrowFlying) return;
    
    e.preventDefault();
    gameState.isCharging = true;
    powerChargeStartTime = Date.now();
    
    // キャラクターにアニメーションクラスを追加
    character.querySelector('.bow-character').classList.add('charging');
    
    // パワーゲージの充電
    chargingInterval = setInterval(() => {
        const elapsed = Date.now() - powerChargeStartTime;
        const chargeTime = 2000; // 2秒で満タン
        gameState.power = Math.min((elapsed / chargeTime) * 100, 100);
        powerFill.style.width = `${gameState.power}%`;
    }, 16); // 約60fps
}

function releaseArrow() {
    if (!gameState.isCharging) return;
    
    gameState.isCharging = false;
    clearInterval(chargingInterval);
    
    // キャラクターのアニメーションを解除
    character.querySelector('.bow-character').classList.remove('charging');
    
    // 矢を発射
    if (gameState.power > 5) { // 最低5%のパワーが必要
        shootArrow(gameState.power);
    }
    
    // パワーゲージをリセット
    setTimeout(() => {
        if (!gameState.isArrowFlying) {
            powerFill.style.width = '0%';
            gameState.power = 0;
        }
    }, 100);
}

// 矢を発射
function shootArrow(power) {
    gameState.isArrowFlying = true;
    
    // 発射位置（キャラクターの位置）
    const characterRect = character.getBoundingClientRect();
    const footerRect = gameFooter.getBoundingClientRect();
    
    const startX = characterRect.left - footerRect.left + characterRect.width;
    const startY = characterRect.top - footerRect.top + characterRect.height / 2;
    
    // 矢の初速度を計算（パワーに応じて変化）
    const velocityX = (power / 100) * 25; // 最大速度を増加（15→25）
    const velocityY = -8 - (power / 100) * 6; // 上方向の初速度も少し増加
    const gravity = 0.5; // 重力加速度
    
    let x = startX;
    let y = startY;
    let vx = velocityX;
    let vy = velocityY;
    let time = 0;
    
    // 矢の軌跡をアニメーション
    function animateArrow() {
        ctx.clearRect(0, 0, arrowCanvas.width, arrowCanvas.height);
        
        // 物理演算
        vy += gravity;
        x += vx;
        y += vy;
        time++;
        
        // 矢の角度を計算
        const angle = Math.atan2(vy, vx);
        
        // 矢を描画（シンプルな三角形）
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        
        // 矢の本体
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(-15, -2, 30, 4);
        
        // 矢じり
        ctx.fillStyle = '#696969';
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(5, -5);
        ctx.lineTo(5, 5);
        ctx.closePath();
        ctx.fill();
        
        // 羽
        ctx.fillStyle = '#FF6B6B';
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.lineTo(-20, -4);
        ctx.lineTo(-20, 4);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
        
        // 軌跡を描画（薄い線）
        if (time > 1) {
            ctx.strokeStyle = 'rgba(139, 69, 19, 0.2)';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x - vx, y - vy + gravity);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
        
        // 当たり判定
        const hit = checkCollision(x, y);
        
        // 画面外に出たら終了
        if (x > arrowCanvas.width || y > arrowCanvas.height || x < 0) {
            endArrowFlight(false);
            return;
        }
        
        if (hit) {
            endArrowFlight(true, hit);
            return;
        }
        
        // 次のフレーム
        requestAnimationFrame(animateArrow);
    }
    
    animateArrow();
}

// 当たり判定
function checkCollision(arrowX, arrowY) {
    for (let target of gameState.targets) {
        // フッター内での相対位置を計算
        const targetRect = target.element.getBoundingClientRect();
        const footerRect = gameFooter.getBoundingClientRect();
        
        const targetX = targetRect.left - footerRect.left;
        const targetY = targetRect.top - footerRect.top;
        const targetWidth = targetRect.width;
        const targetHeight = targetRect.height;
        
        // 当たり判定（優しめ：少し大きめの判定）
        const hitMargin = 20;
        if (arrowX >= targetX - hitMargin &&
            arrowX <= targetX + targetWidth + hitMargin &&
            arrowY >= targetY - hitMargin &&
            arrowY <= targetY + targetHeight + hitMargin) {
            return target;
        }
    }
    return null;
}

// 矢の飛行終了
function endArrowFlight(success, hitTarget = null) {
    gameState.isArrowFlying = false;
    
    if (success && hitTarget) {
        // ヒットエフェクト
        hitTarget.element.classList.add('hit');
        
        // 光るエフェクト
        createSparkEffect(hitTarget.element);
        
        // 1秒後にページ遷移
        setTimeout(() => {
            window.location.href = hitTarget.url;
        }, 1000);
        
    } else {
        // ゲームオーバー
        setTimeout(() => {
            showGameOver();
        }, 500);
    }
}

// 光るエフェクト
function createSparkEffect(element) {
    const rect = element.getBoundingClientRect();
    const footerRect = gameFooter.getBoundingClientRect();
    
    const centerX = rect.left - footerRect.left + rect.width / 2;
    const centerY = rect.top - footerRect.top + rect.height / 2;
    
    // 放射状に光る粒子を描画
    let particles = [];
    for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 * i) / 20;
        particles.push({
            x: centerX,
            y: centerY,
            vx: Math.cos(angle) * 5,
            vy: Math.sin(angle) * 5,
            life: 30
        });
    }
    
    function animateParticles() {
        ctx.clearRect(0, 0, arrowCanvas.width, arrowCanvas.height);
        
        let stillAlive = false;
        particles.forEach(p => {
            if (p.life > 0) {
                p.x += p.vx;
                p.y += p.vy;
                p.life--;
                
                ctx.fillStyle = `rgba(255, 215, 0, ${p.life / 30})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                ctx.fill();
                
                stillAlive = true;
            }
        });
        
        if (stillAlive) {
            requestAnimationFrame(animateParticles);
        }
    }
    
    animateParticles();
}

// ゲームオーバー表示
function showGameOver() {
    gameOver.style.display = 'block';
    ctx.clearRect(0, 0, arrowCanvas.width, arrowCanvas.height);
    
    // キャラクターを「やれやれ」状態に
    // （画像差し替え時に実装）
}

// リトライボタン
retryBtn.addEventListener('click', () => {
    initializeGame();
});

// ウィンドウリサイズ時の処理
window.addEventListener('resize', () => {
    if (!gameFooter.classList.contains('collapsed')) {
        updateCanvasSize();
        placeTargets();
    }
});

// 初期化
window.addEventListener('load', () => {
    updateCanvasSize();
});

// ============================================
// ゲーム2: 風船射撃
// ============================================

// ゲーム2の初期化
function initializeGame2() {
    game2State.isArrowFlying = false;
    gameOver2.style.display = 'none';
    shootBtn.disabled = false;
    
    // Canvas サイズ更新
    if (balloonArrowCanvas) {
        balloonArrowCanvas.width = game2Container.offsetWidth;
        balloonArrowCanvas.height = game2Container.offsetHeight;
        ctx2.clearRect(0, 0, balloonArrowCanvas.width, balloonArrowCanvas.height);
    }
    
    // 風船を生成
    createBalloons();
    
    // アニメーション開始
    animateBalloons();
}

// 風船を生成
function createBalloons() {
    balloonArea.innerHTML = '';
    game2State.balloons = [];
    
    const areaWidth = balloonArea.offsetWidth;
    const areaHeight = balloonArea.offsetHeight;
    const balloonSize = window.innerWidth <= 400 ? 50 : (window.innerWidth <= 768 ? 60 : 80);
    
    targetPages.forEach((page, index) => {
        const balloon = document.createElement('div');
        balloon.className = `balloon color-${(index % 5) + 1}`;
        balloon.textContent = page.name;
        balloon.dataset.url = page.url;
        
        // 初期位置（横に並べる）
        const x = (index + 1) * (areaWidth / (targetPages.length + 1)) - balloonSize / 2;
        const y = Math.random() * (areaHeight - balloonSize);
        
        balloon.style.left = `${x}px`;
        balloon.style.top = `${y}px`;
        
        balloonArea.appendChild(balloon);
        
        // 状態を保存
        game2State.balloons.push({
            element: balloon,
            x: x,
            y: y,
            speedY: (Math.random() * 2 + 1) * (Math.random() > 0.5 ? 1 : -1), // ランダムな速度と方向
            size: balloonSize,
            url: page.url
        });
    });
}

// 風船のアニメーション
function animateBalloons() {
    if (currentGame !== 'game2') return;
    
    const areaHeight = balloonArea.offsetHeight;
    
    game2State.balloons.forEach(balloon => {
        if (!balloon.element.classList.contains('hit')) {
            // Y座標を更新
            balloon.y += balloon.speedY;
            
            // 上下の境界で反転
            if (balloon.y <= 0 || balloon.y >= areaHeight - balloon.size) {
                balloon.speedY *= -1;
                balloon.y = Math.max(0, Math.min(balloon.y, areaHeight - balloon.size));
            }
            
            balloon.element.style.top = `${balloon.y}px`;
        }
    });
    
    game2State.animationFrameId = requestAnimationFrame(animateBalloons);
}

// 発射ボタン
shootBtn.addEventListener('click', () => {
    if (game2State.isArrowFlying) return;
    shootArrow2();
});

// 矢を発射（ゲーム2）
function shootArrow2() {
    game2State.isArrowFlying = true;
    shootBtn.disabled = true;
    
    // 弓の位置を取得
    const bowRect = document.querySelector('.balloon-bow').getBoundingClientRect();
    const containerRect = game2Container.getBoundingClientRect();
    
    const startX = bowRect.left - containerRect.left + bowRect.width;
    const startY = bowRect.top - containerRect.top + bowRect.height / 2;
    
    let x = startX;
    const y = startY;
    const velocityX = 15; // 右に進む速度
    
    function animateArrow2() {
        ctx2.clearRect(0, 0, balloonArrowCanvas.width, balloonArrowCanvas.height);
        
        x += velocityX;
        
        // 矢を描画
        ctx2.save();
        ctx2.translate(x, y);
        
        // 矢の本体
        ctx2.fillStyle = '#8B4513';
        ctx2.fillRect(-15, -2, 30, 4);
        
        // 矢じり
        ctx2.fillStyle = '#696969';
        ctx2.beginPath();
        ctx2.moveTo(15, 0);
        ctx2.lineTo(5, -5);
        ctx2.lineTo(5, 5);
        ctx2.closePath();
        ctx2.fill();
        
        // 羽
        ctx2.fillStyle = '#FF6B6B';
        ctx2.beginPath();
        ctx2.moveTo(-15, 0);
        ctx2.lineTo(-20, -4);
        ctx2.lineTo(-20, 4);
        ctx2.closePath();
        ctx2.fill();
        
        ctx2.restore();
        
        // 当たり判定
        const hit = checkBalloonCollision(x, y);
        
        // 画面外に出たら終了
        if (x > balloonArrowCanvas.width) {
            endArrow2Flight(false);
            return;
        }
        
        if (hit) {
            endArrow2Flight(true, hit);
            return;
        }
        
        requestAnimationFrame(animateArrow2);
    }
    
    animateArrow2();
}

// 風船との当たり判定
function checkBalloonCollision(arrowX, arrowY) {
    // balloonAreaの位置を取得
    const balloonAreaRect = balloonArea.getBoundingClientRect();
    const containerRect = game2Container.getBoundingClientRect();
    
    // balloonAreaの左端と上端のオフセット
    const areaOffsetX = balloonAreaRect.left - containerRect.left;
    const areaOffsetY = balloonAreaRect.top - containerRect.top;
    
    for (let balloon of game2State.balloons) {
        if (balloon.element.classList.contains('hit')) continue;
        
        // 風船の絶対位置を計算（balloonAreaのオフセットを加算）
        const balloonAbsoluteX = balloon.x + areaOffsetX;
        const balloonAbsoluteY = balloon.y + areaOffsetY;
        
        const balloonCenterX = balloonAbsoluteX + balloon.size / 2;
        const balloonCenterY = balloonAbsoluteY + balloon.size / 2;
        const radius = balloon.size / 2;
        
        const distance = Math.sqrt(
            Math.pow(arrowX - balloonCenterX, 2) + 
            Math.pow(arrowY - balloonCenterY, 2)
        );
        
        if (distance < radius + 10) { // 少し優しめの判定
            return balloon;
        }
    }
    return null;
}

// 矢の飛行終了（ゲーム2）
function endArrow2Flight(success, hitBalloon = null) {
    game2State.isArrowFlying = false;
    
    if (success && hitBalloon) {
        // ヒットエフェクト
        hitBalloon.element.classList.add('hit');
        
        // アニメーション停止
        if (game2State.animationFrameId) {
            cancelAnimationFrame(game2State.animationFrameId);
        }
        
        // 1秒後にページ遷移
        setTimeout(() => {
            window.location.href = hitBalloon.url;
        }, 500);
        
    } else {
        // ゲームオーバー
        setTimeout(() => {
            showGameOver2();
        }, 500);
    }
}

// ゲームオーバー表示（ゲーム2）
function showGameOver2() {
    gameOver2.style.display = 'block';
    ctx2.clearRect(0, 0, balloonArrowCanvas.width, balloonArrowCanvas.height);
    
    // アニメーション停止
    if (game2State.animationFrameId) {
        cancelAnimationFrame(game2State.animationFrameId);
    }
}

// リトライボタン（ゲーム2）
retryBtn2.addEventListener('click', () => {
    initializeGame2();
});

// ============================================
// 既存のコード（ゲーム1）
// ============================================
