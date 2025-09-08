// 請求書自動管理エージェント用スクリプト

// DOM要素の取得
const fileUploadArea = document.getElementById('fileUploadArea');
const fileInput = document.getElementById('fileInput');
const folderInput = document.getElementById('folderInput');
const fileSelectBtn = document.getElementById('fileSelectBtn');
const folderSelectBtn = document.getElementById('folderSelectBtn');
const selectedFiles = document.getElementById('selectedFiles');
const fileList = document.getElementById('fileList');
const processBtn = document.getElementById('processBtn');
const clearBtn = document.getElementById('clearBtn');
const chatMessages = document.getElementById('chatMessages');

// 初期化
window.addEventListener('DOMContentLoaded', () => {
    // 要素取得
    const fileInput = document.getElementById('fileInput');
    const folderInput = document.getElementById('folderInput');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const fileListBody = document.getElementById('fileListBody');
    const batchProcessBtn = document.getElementById('batchProcessBtn');
    const excelPreview = document.getElementById('excelPreview');
    const splitter = document.getElementById('splitter');
    const mainArea = document.querySelector('.main-area');
    const previewArea = document.querySelector('.preview-area');
    const wrapper = document.querySelector('.main-preview-wrapper');

    // --- プレビュー復元（メモリストレージ対応のため無効化） ---
    // メモリストレージでは永続化されないため、プレビュー復元は無効化
    // --- 比率復元 ---
    const lastSplit = localStorage.getItem('splitRatio');
    if (lastSplit) {
        const ratio = parseFloat(lastSplit);
        const wrapperRect = wrapper.getBoundingClientRect();
        // 一時的にtransitionを無効化
        mainArea.style.transition = 'none';
        previewArea.style.transition = 'none';
        const mainWidth = wrapperRect.width * ratio;
        const previewWidth = wrapperRect.width * (1 - ratio);
        mainArea.style.flexBasis = mainWidth + 'px';
        previewArea.style.width = previewWidth + 'px';
        // 次のフレームでtransitionを元に戻す
        setTimeout(() => {
            mainArea.style.transition = '';
            previewArea.style.transition = '';
        }, 0);
    } else {
        mainArea.style.flexBasis = '600px';
        previewArea.style.width = '300px';
    }

    // 初回リスト取得
    fetchFileList();

    // ファイル選択・フォルダ選択
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
    folderInput.addEventListener('change', (e) => handleFiles(e.target.files));

    // ドラッグ&ドロップ
    fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.classList.add('dragover');
    });
    fileUploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        fileUploadArea.classList.remove('dragover');
    });
    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    function handleFiles(fileList) {
        const files = Array.from(fileList).filter(f => 
            f.type.startsWith('image/') || f.type === 'application/pdf'
        );
        if (files.length === 0) return;
        // 1ファイルずつアップロード
        Promise.all(files.map(uploadFile)).then(fetchFileList);
    }

    async function uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
    }

    async function fetchFileList() {
        const res = await fetch('/api/files');
        const files = await res.json();
        updateFileTable(files);
    }

    function updateFileTable(files) {
        fileListBody.innerHTML = '';
        files.forEach((f) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${f.name}</td>
                <td>${formatDate(f.date)}</td>
                <td>${formatFileSize(f.size)}</td>
                <td><button class="delete-btn" data-file-id="${f.fileId}">削除</button></td>
            `;
            fileListBody.appendChild(tr);
        });
        // 削除ボタンイベント
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = async (e) => {
                const fileId = btn.getAttribute('data-file-id');
                await fetch('/api/delete-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileId })
                });
                fetchFileList();
            };
        });
    }

    function formatDate(date) {
        const d = new Date(date);
        return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
    }
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
        return (bytes/1024/1024).toFixed(1) + ' MB';
    }

    // 変換開始ボタン
    batchProcessBtn.addEventListener('click', async () => {
        excelPreview.innerHTML = '<div class="excel-status-bar">変換中...<div class="bar"></div></div>';
        try {
            const res = await fetch('/api/batch-process', { method: 'POST' });
            const result = await res.json();
            if (result.success) {
                // ExcelデータをBase64から直接処理
                if (result.excelData) {
                    const excelBlob = new Blob([Uint8Array.from(atob(result.excelData), c => c.charCodeAt(0))], {
                        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    });
                    const downloadUrl = URL.createObjectURL(excelBlob);
                    excelPreview.innerHTML = `
                        <div style="margin-bottom:12px;">
                            <a href="${downloadUrl}" class="upload-option-btn" download="${result.fileName}">📄 Excelダウンロード</a>
                        </div>
                        <div style="color:#1fa7a2;">処理完了: ${result.processedCount}件のファイルを処理しました</div>
                    `;
                } else {
                    excelPreview.innerHTML = '<div style="color:#1fa7a2;">Excelプレビューなし</div>';
                }
                // ファイルリストもリフレッシュ
                fetchFileList();
            } else {
                excelPreview.innerHTML = `<div style='color:#d00;'>${result.error || '変換に失敗しました'}</div>`;
            }
        } catch (err) {
            excelPreview.innerHTML = `<div style='color:#d00;'>サーバーエラー: ${err.message}</div>`;
        }
    });


    // 全クリアボタン
    document.getElementById('clearAllBtn').onclick = async () => {
        if (!confirm('本当に全てのファイルを削除しますか？')) return;
        await fetch('/api/clear-files', { method: 'POST' });
        fetchFileList();
        // プレビューも消去
        excelPreview.innerHTML = '';
    };

    // スプリッターによるリサイズ
    let isDragging = false;
    splitter.addEventListener('mousedown', (e) => {
        isDragging = true;
        splitter.classList.add('active');
        document.body.style.cursor = 'col-resize';
    });
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const wrapperRect = wrapper.getBoundingClientRect();
        let x = e.clientX - wrapperRect.left;
        x = Math.max(x, 50); // main最小
        x = Math.min(x, wrapperRect.width - 50); // preview最小
        const mainWidth = x;
        const previewWidth = wrapperRect.width - x;
        mainArea.style.flexBasis = mainWidth + 'px';
        previewArea.style.width = previewWidth + 'px';
        // 比率をlocalStorageに保存
        const ratio = mainWidth / (mainWidth + previewWidth);
        localStorage.setItem('splitRatio', ratio);
    });
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            splitter.classList.remove('active');
            document.body.style.cursor = '';
        }
    });
});

// メッセージ追加
function addMessage(type, text, content = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = type === 'user' ? '👤' : '🤖';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = text;
    
    if (content) {
        messageContent.appendChild(content);
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// プレビュークリア
function clearPreview() {
    chatMessages.innerHTML = '';
    localStorage.removeItem('invoicePreview');
}

// プレビューの復元
function restorePreview() {
    const savedPreview = localStorage.getItem('invoicePreview');
    if (savedPreview) {
        try {
            const data = JSON.parse(savedPreview);
            displayResults({ data: data });
        } catch (error) {
            console.error('Error restoring preview:', error);
            localStorage.removeItem('invoicePreview');
        }
    }
}

// エラーハンドリング
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    addMessage('assistant', 'エラーが発生しました: ' + e.error.message);
}); 