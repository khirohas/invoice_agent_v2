// 請求書自動管理エージェント用スクリプト

// セッション管理
let sessionId = localStorage.getItem('sessionId') || generateSessionId();
if (!localStorage.getItem('sessionId')) {
    localStorage.setItem('sessionId', sessionId);
}

function generateSessionId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

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

// 進捗表示用の要素
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

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
    console.log(`[セッション] セッションID: ${sessionId}`);
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
        
        // アップロード開始のUI更新
        startUploadUI(files.length);
        
        // 1ファイルずつアップロード（進捗表示付き）
        uploadFilesSequentially(files, 0);
    }

    // アップロードUI開始
    function startUploadUI(totalFiles) {
        fileUploadArea.classList.add('uploading');
        uploadProgress.style.display = 'block';
        progressFill.style.width = '0%';
        progressText.textContent = `アップロード準備中... (0/${totalFiles})`;
    }

    // アップロードUI終了
    function endUploadUI() {
        fileUploadArea.classList.remove('uploading');
        uploadProgress.style.display = 'none';
        progressFill.style.width = '0%';
    }

    // 進捗更新
    function updateProgress(current, total, fileName) {
        const percentage = (current / total) * 100;
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `アップロード中... (${current}/${total}) ${fileName}`;
    }

    // シーケンシャルアップロード（進捗表示付き）
    async function uploadFilesSequentially(files, index) {
        if (index >= files.length) {
            console.log('全ファイルアップロード完了');
            endUploadUI();
            await fetchFileList();
            return;
        }
        
        const currentFile = files[index];
        updateProgress(index, files.length, currentFile.name);
        
        try {
            console.log(`アップロード開始: ${index + 1}/${files.length} - ${currentFile.name}`);
            const uploadStartTime = Date.now();
            await uploadFile(currentFile);
            const uploadEndTime = Date.now();
            const uploadDuration = uploadEndTime - uploadStartTime;
            
            console.log(`アップロード完了: ${index + 1}/${files.length} - ${currentFile.name} (${uploadDuration}ms)`);
            
            // ファイルリストを即座に更新
            await fetchFileList();
            
            // 次のファイルをアップロード（少し間隔を空ける）
            setTimeout(() => {
                uploadFilesSequentially(files, index + 1);
            }, 500);
        } catch (error) {
            console.error(`アップロードエラー: ${currentFile.name}`, error);
            
            // エラーが発生した場合の処理
            const errorMessage = `ファイル "${currentFile.name}" のアップロードに失敗しました:\n\n${error.message}\n\n続行しますか？`;
            if (confirm(errorMessage)) {
                // 次のファイルをアップロード
                setTimeout(() => {
                    uploadFilesSequentially(files, index + 1);
                }, 500);
            } else {
                // アップロードを停止
                endUploadUI();
            }
        }
    }

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
        
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            let errorMessage;
            try {
                const errorData = await response.json();
                errorMessage = errorData.details || errorData.error || 'アップロードに失敗しました';
                console.error('アップロードエラー:', errorData);
            } catch (jsonError) {
                try {
                    const errorText = await response.text();
                    console.error('アップロードエラー (JSONパース失敗):', errorText);
                    errorMessage = `アップロードに失敗しました (${response.status}): ${errorText.substring(0, 100)}...`;
                } catch (textError) {
                    console.error('レスポンス読み取りエラー:', textError);
                    errorMessage = `アップロードに失敗しました (${response.status})`;
                }
            }
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        console.log(`アップロード成功: ${result.originalName || correctedName}`);
        return result;
    }

    async function fetchFileList() {
        try {
            console.log(`[ファイルリスト] 取得開始... セッションID: ${sessionId}`);
            const res = await fetch(`/api/files?sessionId=${encodeURIComponent(sessionId)}`);
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const files = await res.json();
            console.log('[ファイルリスト] 取得完了:', files.length, '件');
            console.log('[ファイルリスト] ファイル一覧:', files.map(f => ({ id: f.fileId, name: f.name })));
            updateFileTable(files);
        } catch (error) {
            console.error('[ファイルリスト] 取得エラー:', error);
            // エラーが発生してもテーブルは更新（空の状態で）
            updateFileTable([]);
        }
    }

    function updateFileTable(files) {
        fileListBody.innerHTML = '';
        files.forEach((f) => {
            console.log(`[ファイル表示] ${f.name}: サイズ=${f.size} (型: ${typeof f.size})`);
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
                const fileName = btn.closest('tr').querySelector('td:first-child').textContent;
                
                if (confirm(`ファイル "${fileName}" を削除しますか？`)) {
                    try {
                        const res = await fetch(`/api/delete-file/${fileId}?sessionId=${encodeURIComponent(sessionId)}`, {
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
                if ((header.includes('計') || header.includes('消費税')) && !isNaN(value) && value !== '') {
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
                    // プレビューも消去
                    excelPreview.innerHTML = '';
                } else {
                    const errorData = await res.json();
                    alert(`削除に失敗しました: ${errorData.error || '不明なエラー'}`);
                }
            } catch (err) {
                console.error('全削除エラー:', err);
                alert(`削除に失敗しました: ${err.message}`);
            }
        }
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