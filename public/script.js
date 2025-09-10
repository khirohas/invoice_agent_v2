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
        
        console.log(`選択されたファイル数: ${files.length}`);
        console.log('ファイル一覧:', files.map(f => f.name));
        
        // 1ファイルずつアップロード（エラーハンドリング付き）
        uploadFilesSequentially(files).then(() => {
            console.log('全ファイルアップロード完了');
            fetchFileList();
        });
    }

    async function uploadFilesSequentially(files) {
        for (const file of files) {
            try {
                console.log(`アップロード開始: ${file.name}`);
                await uploadFile(file);
                console.log(`アップロード完了: ${file.name}`);
            } catch (error) {
                console.error(`アップロードエラー: ${file.name}`, error);
                // エラーが発生しても次のファイルの処理を続行
            }
        }
    }

    async function uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'アップロードに失敗しました');
        }
        
        const result = await response.json();
        console.log(`アップロード成功: ${file.name}`, result);
        return result;
    }

    async function fetchFileList() {
        try {
            console.log('ファイルリスト取得開始');
            const res = await fetch('/api/files');
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const files = await res.json();
            console.log(`ファイルリスト取得完了: ${files.length}件`);
            updateFileTable(files);
        } catch (error) {
            console.error('ファイルリスト取得エラー:', error);
            // エラーが発生してもテーブルは更新（空の状態で）
            updateFileTable([]);
        }
    }

    function updateFileTable(files) {
        fileListBody.innerHTML = '';
        files.forEach((f) => {
            // ファイル名のエンコーディング確認
            console.log('表示するファイル名:', f.name);
            
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
        console.log('変換開始ボタンがクリックされました');
        excelPreview.innerHTML = '<div class="excel-status-bar">変換中...<div class="bar"></div></div>';
        try {
            console.log('API呼び出し開始: /api/batch-process');
            const res = await fetch('/api/batch-process', { method: 'POST' });
            console.log('API応答受信:', res.status, res.statusText);
            
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const result = await res.json();
            console.log('API結果:', result);
            if (result.success) {
                // ExcelデータをBase64から直接処理
                if (result.excelData) {
                    const excelBlob = new Blob([Uint8Array.from(atob(result.excelData), c => c.charCodeAt(0))], {
                        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    });
                    const downloadUrl = URL.createObjectURL(excelBlob);
                    
                    // 処理結果をテーブル形式で表示
                    if (result.results && result.results.length > 0) {
                        excelPreview.innerHTML = `
                            <div style="margin-bottom:12px;">
                                <a href="${downloadUrl}" class="upload-option-btn" download="${result.fileName}">📄 Excelダウンロード</a>
                            </div>
                            <div style="color:#1fa7a2; margin-bottom: 12px;">処理完了: ${result.processedCount}件のファイルを処理しました</div>
                            ${renderResultsTable(result.results)}
                        `;
                    } else {
                        excelPreview.innerHTML = `
                            <div style="margin-bottom:12px;">
                                <a href="${downloadUrl}" class="upload-option-btn" download="${result.fileName}">📄 Excelダウンロード</a>
                            </div>
                            <div style="color:#1fa7a2;">処理完了: ${result.processedCount}件のファイルを処理しました</div>
                        `;
                    }
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

    // 結果テーブル表示関数
    function renderResultsTable(results) {
        if (!results || results.length === 0) return '';
        
        const headers = [
            'ファイル名', 'インボイス登録番号', '請求日', '支払期限', '請求元会社', 
            '支払品目概要', '請求元担当者', '件名', '小計（税抜）', '消費税額', 
            '合計(税込)', '支払方法', '支払状況', '支払日', '備考'
        ];
        
        let html = '<table class="results-table" style="width:100%; border-collapse: collapse; margin-top: 12px;">';
        html += '<thead><tr style="background-color: #f5f5f5;">';
        headers.forEach(header => {
            html += `<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">${header}</th>`;
        });
        html += '</tr></thead><tbody>';
        
        results.forEach(row => {
            html += '<tr>';
            headers.forEach(header => {
                const value = row[header] || '';
                let displayValue = value;
                
                // 金額項目の場合は¥マークとコンマ区切りを適用
                if (header.includes('計') && !isNaN(value) && value !== '') {
                    displayValue = `¥${parseFloat(value).toLocaleString('ja-JP')}`;
                }
                
                html += `<td style="border: 1px solid #ddd; padding: 8px;">${displayValue}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody></table>';
        
        return html;
    }

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