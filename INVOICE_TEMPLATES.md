# 請求書エージェント実装テンプレート

## 📁 ファイル構造テンプレート

```
invoice-auto-input-agent/
├── server.js                    # メインサーバー
├── package.json                 # 依存関係管理
├── vercel.json                 # Vercel設定
├── .env.example                # 環境変数テンプレート
├── .gitignore                  # Git除外設定
├── README.md                   # プロジェクト説明
├── public/                     # フロントエンド
│   ├── index.html              # メインUI
│   ├── script.js               # フロントエンドロジック
│   ├── style.css               # スタイリング
│   └── favicon.ico             # ファビコン
├── data/                       # データファイル
│   └── accounting_master.json  # 勘定科目マスタ
└── uploads/                    # アップロードファイル（ローカル開発用）
```

## 🔧 実装テンプレート

### 1. package.json テンプレート

```json
{
  "name": "invoice-auto-input-agent",
  "version": "1.0.0",
  "description": "請求書自動入力エージェント - AI OCR処理",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^17.0.1",
    "exceljs": "^4.4.0",
    "express": "^4.18.2",
    "multer": "^1.4.5-lts.1",
    "openai": "^4.20.1",
    "path": "^0.12.7"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "keywords": [
    "invoice",
    "ocr",
    "excel",
    "automation",
    "ai",
    "accounting"
  ],
  "author": "Invoice Auto Input Agent",
  "license": "MIT"
}
```

### 2. vercel.json テンプレート

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node",
      "config": {
        "maxDuration": 60
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 3. .env.example テンプレート

```bash
# OpenAI API設定
OPENAI_API_KEY=your_openai_api_key_here

# 環境設定
NODE_ENV=development

# サーバー設定
PORT=3000
```

### 4. .gitignore テンプレート

```gitignore
# 依存関係
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# 環境変数
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# ログファイル
logs
*.log

# ランタイムデータ
pids
*.pid
*.seed
*.pid.lock

# アップロードファイル
uploads/*
!uploads/.gitkeep

# OS生成ファイル
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE設定
.vscode/
.idea/
*.swp
*.swo

# 一時ファイル
*.tmp
*.temp
```

## 🎨 UI テンプレート

### 1. HTML基本構造 (public/index.html)

```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>請求書自動入力エージェント</title>
    <link rel="stylesheet" href="style.css">
    <link rel="icon" href="favicon.ico" type="image/x-icon">
</head>
<body>
    <div class="app-root">
        <div class="main-preview-wrapper">
            <main class="main-area">
                <!-- ヘッダー -->
                <div class="main-header">
                    <h1>請求書Excel取り込み</h1>
                    <p>月末までに全ての請求書をこちらにアップロードしてください</p>
                </div>

                <!-- メインコンテンツ -->
                <div class="main-content">
                    <!-- ファイルアップロードセクション -->
                    <section class="file-upload-section">
                        <div class="file-upload-area" id="fileUploadArea">
                            <div class="upload-icon">📄</div>
                            <p>請求書画像をドラッグ&ドロップまたはクリックして選択</p>
                            <input type="file" id="fileInput" multiple accept="image/*" style="display: none;">
                        </div>
                    </section>

                    <!-- ファイル一覧セクション -->
                    <section class="file-list-section">
                        <div class="file-list-header">
                            <h3>アップロード済みファイル</h3>
                            <div class="file-actions">
                                <button id="batchProcessBtn" class="btn btn-primary">処理を開始</button>
                                <button id="clearAllBtn" class="btn btn-secondary">全クリア</button>
                            </div>
                        </div>
                        <div class="file-table-container">
                            <table id="fileTable" class="file-table">
                                <thead>
                                    <tr>
                                        <th>ファイル名</th>
                                        <th>アップロード日時</th>
                                        <th>ファイルサイズ</th>
                                        <th>操作</th>
                                    </tr>
                                </thead>
                                <tbody id="fileTableBody"></tbody>
                            </table>
                        </div>
                    </section>

                    <!-- 結果表示セクション -->
                    <section class="result-section">
                        <div id="resultArea"></div>
                    </section>
                </div>
            </main>
        </div>
    </div>

    <script src="script.js"></script>
</body>
</html>
```

### 2. CSS基本スタイル (public/style.css)

```css
/* リセットとベーススタイル */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
    background-color: #f5f5f5;
}

.app-root {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

.main-preview-wrapper {
    flex: 1;
    display: flex;
    justify-content: center;
    padding: 20px;
}

.main-area {
    width: 100%;
    max-width: 1200px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    overflow: hidden;
}

.main-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 30px;
    text-align: center;
}

.main-header h1 {
    font-size: 2.5rem;
    margin-bottom: 10px;
    font-weight: 700;
}

.main-header p {
    font-size: 1.1rem;
    opacity: 0.9;
}

.main-content {
    padding: 30px;
}

/* ファイルアップロードエリア */
.file-upload-area {
    border: 3px dashed #ddd;
    border-radius: 12px;
    padding: 60px 20px;
    text-align: center;
    background: #fafafa;
    transition: all 0.3s ease;
    cursor: pointer;
}

.file-upload-area:hover {
    border-color: #667eea;
    background: #f0f4ff;
}

.file-upload-area.dragover {
    border-color: #667eea;
    background: #e8f2ff;
    transform: scale(1.02);
}

.upload-icon {
    font-size: 4rem;
    margin-bottom: 20px;
}

.file-upload-area p {
    font-size: 1.2rem;
    color: #666;
    margin-bottom: 20px;
}

/* ボタンスタイル */
.btn {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    text-decoration: none;
    display: inline-block;
}

.btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.btn-secondary {
    background: #6c757d;
    color: white;
}

.btn-secondary:hover {
    background: #5a6268;
    transform: translateY(-2px);
}

.btn-danger {
    background: #dc3545;
    color: white;
    padding: 6px 12px;
    font-size: 0.9rem;
}

.btn-danger:hover {
    background: #c82333;
}

/* ファイル一覧テーブル */
.file-list-section {
    margin-top: 30px;
}

.file-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.file-list-header h3 {
    font-size: 1.5rem;
    color: #333;
}

.file-actions {
    display: flex;
    gap: 10px;
}

.file-table-container {
    overflow-x: auto;
    border-radius: 8px;
    border: 1px solid #ddd;
}

.file-table {
    width: 100%;
    border-collapse: collapse;
    background: white;
}

.file-table th {
    background: #f8f9fa;
    padding: 15px;
    text-align: left;
    font-weight: 600;
    color: #495057;
    border-bottom: 2px solid #dee2e6;
}

.file-table td {
    padding: 15px;
    border-bottom: 1px solid #dee2e6;
    vertical-align: middle;
}

.file-table tbody tr:hover {
    background: #f8f9fa;
}

/* 結果表示エリア */
.result-section {
    margin-top: 30px;
}

.result-section .success {
    background: #d4edda;
    border: 1px solid #c3e6cb;
    color: #155724;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 20px;
}

.result-section .error {
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    color: #721c24;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 20px;
}

/* レスポンシブデザイン */
@media (max-width: 768px) {
    .main-preview-wrapper {
        padding: 10px;
    }
    
    .main-content {
        padding: 20px;
    }
    
    .main-header h1 {
        font-size: 2rem;
    }
    
    .file-list-header {
        flex-direction: column;
        gap: 15px;
        align-items: stretch;
    }
    
    .file-actions {
        justify-content: center;
    }
}
```

## 🔧 JavaScript テンプレート

### 1. 基本構造 (public/script.js)

```javascript
// グローバル変数
let uploadedFiles = [];

// DOM要素の取得
const fileInput = document.getElementById('fileInput');
const fileUploadArea = document.getElementById('fileUploadArea');
const fileTableBody = document.getElementById('fileTableBody');
const batchProcessBtn = document.getElementById('batchProcessBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const resultArea = document.getElementById('resultArea');

// イベントリスナーの設定
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // ファイル入力の設定
    fileInput.addEventListener('change', handleFiles);
    
    // ドラッグ&ドロップの設定
    fileUploadArea.addEventListener('click', () => fileInput.click());
    fileUploadArea.addEventListener('dragover', handleDragOver);
    fileUploadArea.addEventListener('dragleave', handleDragLeave);
    fileUploadArea.addEventListener('drop', handleDrop);
    
    // ボタンの設定
    batchProcessBtn.addEventListener('click', startBatchProcess);
    clearAllBtn.addEventListener('click', clearAllFiles);
    
    // 初期ファイル一覧の取得
    fetchFileList();
}

// ファイル処理関数
function handleFiles(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    uploadFilesSequentially(files);
}

// ドラッグ&ドロップ処理
function handleDragOver(e) {
    e.preventDefault();
    fileUploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    fileUploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    fileUploadArea.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    
    uploadFilesSequentially(files);
}

// シーケンシャルアップロード
async function uploadFilesSequentially(files) {
    const uploadArea = document.getElementById('fileUploadArea');
    uploadArea.style.opacity = '0.6';
    
    for (let i = 0; i < files.length; i++) {
        try {
            await uploadSingleFile(files[i]);
            console.log(`ファイル ${i + 1}/${files.length} アップロード完了`);
        } catch (error) {
            console.error(`ファイル ${i + 1} アップロードエラー:`, error);
        }
    }
    
    uploadArea.style.opacity = '1';
    fetchFileList();
}

// 単一ファイルアップロード
async function uploadSingleFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'アップロードに失敗しました');
        }
        
        return result;
    } catch (error) {
        console.error('アップロードエラー:', error);
        throw error;
    }
}

// ファイル一覧取得
async function fetchFileList() {
    try {
        const response = await fetch('/api/files');
        const files = await response.json();
        
        uploadedFiles = files;
        updateFileTable();
    } catch (error) {
        console.error('ファイル一覧取得エラー:', error);
    }
}

// ファイルテーブル更新
function updateFileTable() {
    fileTableBody.innerHTML = '';
    
    uploadedFiles.forEach(file => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${file.name}</td>
            <td>${formatDate(file.date)}</td>
            <td>${formatFileSize(file.size)}</td>
            <td><button class="btn btn-danger delete-btn" data-id="${file.id}">削除</button></td>
        `;
        fileTableBody.appendChild(tr);
    });
    
    // 削除ボタンのイベントリスナー設定
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = btn.getAttribute('data-id');
            await deleteFile(id);
        });
    });
}

// ファイル削除
async function deleteFile(id) {
    try {
        const response = await fetch('/api/delete-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        
        if (response.ok) {
            fetchFileList();
        } else {
            const error = await response.json();
            alert('削除に失敗しました: ' + error.error);
        }
    } catch (error) {
        alert('削除に失敗しました: ' + error.message);
    }
}

// バッチ処理開始
async function startBatchProcess() {
    batchProcessBtn.disabled = true;
    batchProcessBtn.textContent = '処理中...';
    resultArea.innerHTML = '';
    
    try {
        const response = await fetch('/api/batch-process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayBatchResult(result);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('バッチ処理エラー:', error);
        resultArea.innerHTML = `<div class="error">エラー: ${error.message}</div>`;
    } finally {
        batchProcessBtn.disabled = false;
        batchProcessBtn.textContent = '処理を開始';
    }
}

// バッチ処理結果表示
function displayBatchResult(result) {
    let html = `
        <div class="success">
            <h3>処理完了</h3>
            <p>処理済み: ${result.processedCount}件</p>
            <p>エラー: ${result.errorCount}件</p>
        </div>
    `;
    
    if (result.errors && result.errors.length > 0) {
        const errorDetails = result.errors.map(err =>
            `• ${err.fileName || err.fileId}: ${err.error}`
        ).join('<br>');
        html += `
            <div class="error">
                <strong>処理できなかったファイル: ${result.errors.length}件</strong><br>
                ${errorDetails}
            </div>
        `;
    }
    
    if (result.excelData) {
        html += `
            <div class="success">
                <h3>Excelファイル生成完了</h3>
                <a href="data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${result.excelData}" 
                   download="請求書一括処理結果.xlsx" class="btn btn-primary">
                    Excelファイルをダウンロード
                </a>
            </div>
        `;
    }
    
    resultArea.innerHTML = html;
}

// 全ファイルクリア
async function clearAllFiles() {
    if (!confirm('全てのファイルを削除しますか？')) return;
    
    try {
        const response = await fetch('/api/clear-files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            fetchFileList();
            resultArea.innerHTML = '';
        } else {
            const error = await response.json();
            alert('クリアに失敗しました: ' + error.error);
        }
    } catch (error) {
        alert('クリアに失敗しました: ' + error.message);
    }
}

// ユーティリティ関数
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
```

## 📊 勘定科目マスタテンプレート

### data/accounting_master.json

```json
{
  "categories": {
    "仕入": {
      "description": "商品・サービスの仕入に関する勘定科目",
      "accounts": [
        {
          "code": "5001",
          "name": "商品仕入高",
          "description": "商品の仕入に関する費用"
        },
        {
          "code": "5002", 
          "name": "材料仕入高",
          "description": "原材料の仕入に関する費用"
        },
        {
          "code": "5003",
          "name": "外注費",
          "description": "外部委託に関する費用"
        }
      ]
    },
    "一般管理費": {
      "description": "企業の管理・運営に関する費用",
      "accounts": [
        {
          "code": "6001",
          "name": "通信費",
          "description": "電話・インターネット等の通信に関する費用"
        },
        {
          "code": "6002",
          "name": "交通費",
          "description": "出張・移動に関する費用"
        },
        {
          "code": "6003",
          "name": "会議費",
          "description": "会議・打ち合わせに関する費用"
        }
      ]
    },
    "販売費": {
      "description": "販売活動に関する費用",
      "accounts": [
        {
          "code": "7001",
          "name": "広告宣伝費",
          "description": "広告・宣伝に関する費用"
        },
        {
          "code": "7002",
          "name": "販売手数料",
          "description": "販売に関する手数料"
        }
      ]
    }
  },
  "suppliers": {
    "default": {
      "category": "仕入",
      "account": "5001"
    }
  }
}
```

これらのテンプレートを使用することで、AIアシスタントは効率的に請求書エージェントを実装できます。
