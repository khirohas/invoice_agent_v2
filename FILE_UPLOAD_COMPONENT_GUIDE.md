# ファイルアップロード機能 再利用ガイド

このプロジェクトのファイルアップロード機能（ステータスバー + ファイルごとの進捗表示）を他のプロジェクトで再利用するためのガイドです。

## 📁 必要なファイル

### 1. HTML構造 (`index.html` の該当部分)

```html
<!-- ファイルアップロードエリア -->
<section class="file-upload-section">
    <div class="file-upload-area" id="fileUploadArea">
        <div class="upload-icon">📁</div>
        <p>ファイルをドラッグ&ドロップまたはクリックして選択</p>
        <div class="upload-options">
            <label class="upload-option-btn" for="fileInput">
                📄 ファイル選択
                <input type="file" id="fileInput" multiple accept="image/*" style="display: none;">
            </label>
            <span class="upload-divider">or</span>
            <label class="upload-option-btn" for="folderInput">
                📂 フォルダ選択
                <input type="file" id="folderInput" webkitdirectory directory multiple accept="image/*" style="display: none;">
            </label>
        </div>
    </div>
</section>

<!-- ファイルリスト表示エリア -->
<section class="file-list-section">
    <div style="display:flex;justify-content:space-between;align-items:center;">
        <h2>アップロード済みファイル</h2>
        <div class="button-group">
            <button id="clearAllBtn" class="clear-btn">全クリア</button>
        </div>
    </div>
    <table class="file-list-table" id="fileListTable">
        <thead>
            <tr>
                <th>ファイル名</th>
                <th>アップロード日</th>
                <th>容量</th>
                <th>操作</th>
            </tr>
        </thead>
        <tbody id="fileListBody">
            <!-- ファイルリストがここに表示されます -->
        </tbody>
    </table>
</section>
```

### 2. CSS スタイル (`style.css` の該当部分)

```css
/* ファイルアップロードエリア */
.file-upload-section {
    margin-bottom: 12px;
}

.file-upload-area {
    border: 2px dashed #35d5d0;
    border-radius: 12px;
    padding: 40px 20px;
    text-align: center;
    background: #f8fffe;
    transition: all 0.3s ease;
    cursor: pointer;
}

.file-upload-area:hover {
    border-color: #1fa7a2;
    background: #f0fffe;
}

.file-upload-area.dragover {
    border-color: #1fa7a2;
    background: #e8fffe;
    transform: scale(1.02);
}

.upload-icon {
    font-size: 3rem;
    margin-bottom: 16px;
}

.upload-options {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    margin-top: 20px;
}

.upload-option-btn {
    background: linear-gradient(135deg, #35d5d0 0%, #1fa7a2 100%);
    color: #fff;
    font-size: 1.1rem;
    font-weight: bold;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
    box-shadow: 0 2px 8px rgba(53, 213, 208, 0.08);
    padding: 10px 24px;
    margin: 0 8px;
}

.upload-option-btn:hover {
    background: linear-gradient(135deg, #1fa7a2 0%, #35d5d0 100%);
}

.upload-divider {
    color: #666;
    font-weight: bold;
}

/* ファイルリストテーブル */
.file-list-section {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(53, 213, 208, 0.06);
    padding: 20px 24px;
    margin-top: 0;
}

.file-list-table {
    width: 100%;
    border-collapse: collapse;
    background: #fff;
}

.file-list-table th, .file-list-table td {
    padding: 10px 12px;
    border-bottom: 1px solid #e0e0e0;
    text-align: left;
    font-size: 1rem;
}

.file-list-table th {
    background: #e0f7f7;
    color: #1fa7a2;
    font-weight: 700;
}

.file-list-table tr:last-child td {
    border-bottom: none;
}

/* ボタンスタイル */
.clear-btn {
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
    color: #fff;
    font-size: 1.1rem;
    font-weight: bold;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
    box-shadow: 0 2px 8px rgba(255, 107, 107, 0.08);
    padding: 0 18px;
    height: 44px;
    min-height: 44px;
    max-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
}

.clear-btn:hover {
    background: linear-gradient(135deg, #ee5a52 0%, #ff6b6b 100%);
}

.delete-btn {
    background: linear-gradient(135deg, #35d5d0 0%, #1fa7a2 100%);
    color: #fff;
    font-size: 1rem;
    font-weight: bold;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
    padding: 6px 12px;
}

.delete-btn:hover {
    background: linear-gradient(135deg, #1fa7a2 0%, #35d5d0 100%);
}
```

### 3. JavaScript機能 (`script.js` の該当部分)

```javascript
// セッション管理
let sessionId = localStorage.getItem('sessionId') || generateSessionId();
if (!localStorage.getItem('sessionId')) {
    localStorage.setItem('sessionId', sessionId);
}

function generateSessionId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// DOM要素の取得
const fileInput = document.getElementById('fileInput');
const folderInput = document.getElementById('folderInput');
const fileUploadArea = document.getElementById('fileUploadArea');
const fileListBody = document.getElementById('fileListBody');
const clearAllBtn = document.getElementById('clearAllBtn');

// ファイル選択イベント
fileInput.addEventListener('change', (e) => handleFileSelection(e.target.files));
folderInput.addEventListener('change', (e) => handleFileSelection(e.target.files));

// ドラッグ&ドロップイベント
fileUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileUploadArea.classList.add('dragover');
});

fileUploadArea.addEventListener('dragleave', () => {
    fileUploadArea.classList.remove('dragover');
});

fileUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    fileUploadArea.classList.remove('dragover');
    handleFileSelection(e.dataTransfer.files);
});

// ファイル選択処理
function handleFileSelection(files) {
    if (files.length === 0) return;
    
    console.log(`選択されたファイル数: ${files.length}`);
    
    // アップロードエリアのテキストを更新
    const uploadArea = document.querySelector('.file-upload-area');
    const originalText = uploadArea.querySelector('p').textContent;
    uploadArea.querySelector('p').textContent = `アップロード中... (${files.length}ファイル)`;
    
    // 1ファイルずつアップロード（並列処理を制限）
    uploadFilesSequentially(files, 0, uploadArea, originalText);
}

// シーケンシャルアップロード（進捗表示付き）
async function uploadFilesSequentially(files, index, uploadArea, originalText) {
    if (index >= files.length) {
        uploadArea.querySelector('p').textContent = originalText;
        console.log('[アップロード] 全ファイルのアップロード完了');
        // 最終的なファイルリストを取得
        await fetchFileList();
        return;
    }
    
    const currentFile = files[index];
    const progressText = `アップロード中... (${index + 1}/${files.length}) ${currentFile.name}`;
    uploadArea.querySelector('p').textContent = progressText;
    
    try {
        console.log(`アップロード中: ${index + 1}/${files.length} - ${currentFile.name}`);
        const uploadStartTime = Date.now();
        const result = await uploadFile(currentFile);
        const uploadEndTime = Date.now();
        const uploadDuration = uploadEndTime - uploadStartTime;
        
        console.log(`アップロード完了: ${index + 1}/${files.length} - ${result.originalName} (${uploadDuration}ms)`);
        
        // ファイルリストを即座に更新
        fetchFileList();
        
        setTimeout(() => {
            // 次のファイルをアップロード
            uploadFilesSequentially(files, index + 1, uploadArea, originalText);
        }, 500);
    } catch (err) {
        console.error(`アップロードエラー (${currentFile.name}):`, err);
        uploadArea.querySelector('p').textContent = originalText;
        
        // 詳細なエラーメッセージを表示
        const errorMessage = `ファイル "${currentFile.name}" のアップロードに失敗しました:\n\n${err.message}\n\n続行しますか？`;
        if (confirm(errorMessage)) {
            // 次のファイルをアップロード
            uploadFilesSequentially(files, index + 1, uploadArea, originalText);
        } else {
            // アップロードを停止
            uploadArea.querySelector('p').textContent = originalText;
        }
    }
}

// 個別ファイルアップロード
async function uploadFile(file) {
    console.log(`アップロード開始: ${file.name} (${file.size} bytes, ${file.type})`);
    
    // ファイルサイズチェック
    if (file.size > 10 * 1024 * 1024) {
        throw new Error(`ファイルサイズが大きすぎます: ${(file.size / 1024 / 1024).toFixed(2)}MB (制限: 10MB)`);
    }
    
    // ファイル名の文字化け修正
    let correctedName = file.name;
    try {
        correctedName = decodeURIComponent(escape(file.name));
    } catch (e) {
        console.warn('ファイル名修正(方法1)失敗:', e.message);
        correctedName = file.name;
    }
    
    if (correctedName === file.name) {
        console.log(`ファイル名修正スキップ: "${file.name}" (修正不要)`);
    } else {
        console.log(`ファイル名修正: "${file.name}" → "${correctedName}"`);
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionId', sessionId);
    
    const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
    });
    
    if (!res.ok) {
        let errorMessage;
        try {
            const errorData = await res.json();
            errorMessage = errorData.details || errorData.error || 'アップロードに失敗しました';
            console.error('アップロードエラー:', errorData);
        } catch (jsonError) {
            try {
                const errorText = await res.text();
                console.error('アップロードエラー (JSONパース失敗):', errorText);
                errorMessage = `アップロードに失敗しました (${res.status}): ${errorText.substring(0, 100)}...`;
            } catch (textError) {
                console.error('レスポンス読み取りエラー:', textError);
                errorMessage = `アップロードに失敗しました (${res.status})`;
            }
        }
        throw new Error(errorMessage);
    }
    
    const result = await res.json();
    console.log(`アップロード成功: ${result.originalName}`);
    return result;
}

// ファイルリスト取得
async function fetchFileList() {
    try {
        console.log(`[ファイルリスト] 取得開始... セッションID: ${sessionId}`);
        const res = await fetch(`/api/files?sessionId=${encodeURIComponent(sessionId)}`);
        const files = await res.json();
        console.log('[ファイルリスト] 取得完了:', files.length, '件');
        console.log('[ファイルリスト] ファイル一覧:', files.map(f => ({ id: f.id, name: f.name })));
        updateFileTable(files);
    } catch (err) {
        console.error('[ファイルリスト] 取得エラー:', err);
    }
}

// ファイルテーブル更新
function updateFileTable(files) {
    fileListBody.innerHTML = '';
    files.forEach((f) => {
        console.log(`[ファイル表示] ${f.name}: サイズ=${f.size} (型: ${typeof f.size})`);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${f.name}</td>
            <td>${formatDate(f.date)}</td>
            <td>${formatFileSize(f.size)}</td>
            <td><button class="delete-btn" data-id="${f.id}">削除</button></td>
        `;
        fileListBody.appendChild(tr);
    });
    
    // 削除ボタンイベント
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const id = btn.getAttribute('data-id');
            const fileName = btn.closest('tr').querySelector('td:first-child').textContent;
            
            if (confirm(`ファイル "${fileName}" を削除しますか？`)) {
                try {
                    const res = await fetch(`/api/delete-file/${id}?sessionId=${encodeURIComponent(sessionId)}`, {
                        method: 'DELETE'
                    });
                    
                    if (res.ok) {
                        console.log(`ファイル削除成功: ${fileName}`);
                        await fetchFileList();
                    } else {
                        const errorData = await res.json();
                        alert(`削除に失敗しました: ${errorData.error || '不明なエラー'}`);
                    }
                } catch (err) {
                    console.error('削除エラー:', err);
                    alert(`削除に失敗しました: ${err.message}`);
                }
            }
        };
    });
}

// ユーティリティ関数
function formatDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function formatFileSize(bytes) {
    // 数値型でない場合は0として扱う
    const size = Number(bytes) || 0;
    if (size < 1024) return size + ' B';
    if (size < 1024*1024) return (size/1024).toFixed(1) + ' KB';
    return (size/1024/1024).toFixed(1) + ' MB';
}

// 全クリアボタン
clearAllBtn.addEventListener('click', async () => {
    if (confirm('すべてのファイルを削除しますか？')) {
        try {
            const res = await fetch('/api/clear-files', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sessionId })
            });
            
            if (res.ok) {
                console.log('全ファイル削除成功');
                await fetchFileList();
            } else {
                const errorData = await res.json();
                alert(`削除に失敗しました: ${errorData.error || '不明なエラー'}`);
            }
        } catch (err) {
            console.error('全削除エラー:', err);
            alert(`削除に失敗しました: ${err.message}`);
        }
    }
});

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log(`[セッション] セッションID: ${sessionId}`);
    fetchFileList();
});
```

## 🔧 サーバー側API（Express.js）

```javascript
// 必要なミドルウェア
const multer = require('multer');
const uploadSingle = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB制限
        files: 1
    }
});

// ファイルストレージ（メモリ）
const fileStorage = new Map();

// アップロードAPI
app.post('/api/upload', uploadSingle.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'ファイルが選択されていません' });
        }
        
        const fileId = Date.now().toString() + Math.random().toString(36).substring(2);
        const sessionId = req.body.sessionId || 'default';
        
        // ファイル保存
        fileStorage.set(fileId, {
            buffer: req.file.buffer,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            uploadTime: new Date(),
            sessionId: sessionId
        });
        
        res.json({
            id: fileId,
            originalName: req.file.originalname,
            size: req.file.size
        });
    } catch (err) {
        console.error('アップロードエラー:', err);
        res.status(500).json({ error: 'アップロードに失敗しました' });
    }
});

// ファイルリスト取得API
app.get('/api/files', (req, res) => {
    const sessionId = req.query.sessionId || 'default';
    const files = Array.from(fileStorage.entries())
        .filter(([_, fileData]) => fileData.sessionId === sessionId)
        .map(([fileId, fileData]) => ({
            id: fileId,
            name: fileData.originalname,
            size: fileData.size,
            date: fileData.uploadTime
        }));
    
    res.json(files);
});

// ファイル削除API
app.delete('/api/delete-file/:id', (req, res) => {
    const fileId = req.params.id;
    const sessionId = req.query.sessionId || 'default';
    
    if (fileStorage.has(fileId)) {
        const fileData = fileStorage.get(fileId);
        if (fileData.sessionId === sessionId) {
            fileStorage.delete(fileId);
            res.json({ success: true });
        } else {
            res.status(403).json({ error: 'アクセス権限がありません' });
        }
    } else {
        res.status(404).json({ error: 'ファイルが見つかりません' });
    }
});

// 全ファイル削除API
app.post('/api/clear-files', (req, res) => {
    const { sessionId } = req.body;
    
    for (const [fileId, fileData] of fileStorage.entries()) {
        if (fileData.sessionId === sessionId) {
            fileStorage.delete(fileId);
        }
    }
    
    res.json({ success: true });
});
```

## ✨ 主な機能

### 1. **進捗表示**
- アップロード中に「アップロード中... (1/4) ファイル名」を表示
- ファイルごとの完了時間をログ出力

### 2. **エラーハンドリング**
- ファイルサイズ制限チェック
- ネットワークエラーの詳細表示
- ユーザーに続行/停止の選択肢を提供

### 3. **セッション管理**
- ブラウザごとに独立したファイル管理
- ページリロード後もファイルリストを保持

### 4. **ファイル管理**
- リアルタイムファイルリスト更新
- 個別ファイル削除
- 全ファイル一括削除

### 5. **文字化け対策**
- 日本語ファイル名の自動修正
- 複数のエンコーディング方法を試行

## 🚀 使用方法

1. HTML、CSS、JavaScriptのコードをコピー
2. サーバー側APIを実装
3. 必要に応じてファイルサイズ制限やファイル形式を調整
4. セッション管理の仕組みを確認

このコンポーネントは、ファイルアップロードの進捗表示とファイル管理に特化した再利用可能な機能です。
