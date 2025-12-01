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

// Canvas設定
const ctx = arrowCanvas.getContext('2d');

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

// ターゲットボックスのランダム配置
function placeTargets() {
    targetSection.innerHTML = '';
    gameState.targets = [];
    
    const sectionWidth = targetSection.offsetWidth;
    const sectionHeight = targetSection.offsetHeight;
    
    targetPages.forEach((page, index) => {
        const box = document.createElement('div');
        box.className = 'target-box';
        box.textContent = page.name;
        box.dataset.url = page.url;
        
        // ランダムな位置を計算（重ならないように配置）
        let attempts = 0;
        let x, y;
        let overlapping;
        
        do {
            x = Math.random() * (sectionWidth - 150);
            y = Math.random() * (sectionHeight - 60);
            
            overlapping = gameState.targets.some(target => {
                const dx = x - target.x;
                const dy = y - target.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                return distance < 150; // 最小距離
            });
            
            attempts++;
        } while (overlapping && attempts < 50);
        
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
    const velocityX = (power / 100) * 15; // 最大速度
    const velocityY = -8 - (power / 100) * 5; // 上方向の初速度
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
