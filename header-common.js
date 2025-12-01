// 共通ヘッダーを生成して挿入
(function() {
    // 現在のページを判定
    const pageName = getCurrentPageName();
    
    // ヘッダーHTML
    const headerHTML = `
        <header class="site-header">
            <div class="header-container">
                <a href="index.html" class="site-logo">Sunshaura's Portfolio</a>
                <div class="current-page">${pageName}</div>
            </div>
        </header>
    `;
    
    // body の最初に挿入
    document.body.insertAdjacentHTML('afterbegin', headerHTML);
    
    // 現在のページ名を取得
    function getCurrentPageName() {
        const path = window.location.pathname;
        const fileName = path.split('/').pop() || 'index.html';
        
        const pageNames = {
            'index.html': 'トップページ',
            'profile.html': 'プロフィール',
            'links.html': 'リンク',
            'tools.html': 'ツール',
            'blog.html': 'ブログ',
            'contact.html': 'コンタクト'
        };
        
        return pageNames[fileName] || 'トップページ';
    }
})();
