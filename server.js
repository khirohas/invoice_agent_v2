const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const OpenAI = require('openai');
const ExcelJS = require('exceljs');
const pdfParse = require('pdf-parse');
const pdf2pic = require('pdf2pic');

const app = express();
const PORT = process.env.PORT || 3000;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Vercel対応: メモリストレージを使用
const fileStorage = new Map();
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { 
        fileSize: 10 * 1024 * 1024 // 10MB制限
    },
    fileFilter: (req, file, cb) => {
        // ファイル名のエンコーディングを修正
        if (file.originalname) {
            try {
                // latin1からutf8に変換
                const decodedName = Buffer.from(file.originalname, 'latin1').toString('utf8');
                file.originalname = decodedName;
                console.log('ファイル名変換:', file.originalname, '->', decodedName);
            } catch (e) {
                console.log('ファイル名変換エラー:', e);
            }
        }
        cb(null, true);
    }
});

// CORS設定（Vercel対応）
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://*.vercel.app', 'https://invoice-agent.vercel.app'] 
        : true,
    credentials: true
}));

// リクエストサイズ制限
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ファイルアップロード
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'ファイルが選択されていません' });
        }

        const fileId = Date.now().toString();
        console.log('アップロードファイル名（変換後）:', req.file.originalname);
        
        fileStorage.set(fileId, {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            buffer: req.file.buffer,
            uploadDate: new Date()
        });

        res.json({ 
            success: true, 
            fileId: fileId,
            message: 'ファイルがアップロードされました' 
        });
    } catch (error) {
        console.error('アップロードエラー:', error);
        res.status(500).json({ error: 'アップロードに失敗しました' });
    }
});

// ファイル一覧
app.get('/api/files', async (req, res) => {
    try {
        const fileList = Array.from(fileStorage.entries()).map(([fileId, fileData]) => ({
            fileId: fileId,
            name: fileData.originalname,
            date: fileData.uploadDate,
            size: fileData.size,
            mimetype: fileData.mimetype
        }));
        res.json(fileList);
    } catch (error) {
        console.error('ファイル一覧取得エラー:', error);
        res.status(500).json({ error: 'ファイル一覧の取得に失敗しました' });
    }
});

// ファイル削除
app.post('/api/delete-file', async (req, res) => {
    try {
        const { fileId } = req.body;
        if (!fileId) return res.status(400).json({ error: 'ファイルID未指定' });
        
        if (fileStorage.has(fileId)) {
            fileStorage.delete(fileId);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'ファイルが見つかりません' });
        }
    } catch (error) {
        console.error('ファイル削除エラー:', error);
        res.status(500).json({ error: '削除に失敗しました' });
    }
});

// 全ファイル削除
app.post('/api/clear-files', async (req, res) => {
    try {
        fileStorage.clear();
        res.json({ success: true });
    } catch (error) {
        console.error('全ファイル削除エラー:', error);
        res.status(500).json({ error: '全削除に失敗しました' });
    }
});

// バッチ処理
app.post('/api/batch-process', async (req, res) => {
    try {
        if (fileStorage.size === 0) {
            return res.json({ success: false, error: 'ファイルがありません' });
        }
        
        // Vercel環境でのファイル数制限
        const maxFiles = process.env.NODE_ENV === 'production' ? 5 : 10;
        if (fileStorage.size > maxFiles) {
            return res.json({ 
                success: false, 
                error: `ファイル数が多すぎます。最大${maxFiles}ファイルまで処理できます。現在: ${fileStorage.size}ファイル` 
            });
        }
        
        console.log('処理対象ファイル数:', fileStorage.size);
        const results = [];
        
        for (const [fileId, fileData] of fileStorage) {
            try {
                const fileType = getFileType(fileData.originalname);
                console.log(`ファイル: ${fileData.originalname}, タイプ: ${fileType}`);
                console.log(`ファイルサイズ: ${fileData.buffer.length} bytes`);
                console.log(`MIMEタイプ: ${fileData.mimetype}`);
                
                let extractedData;
                if (fileType === 'pdf') {
                    // PDFファイルの場合、Vercel環境では直接テキスト解析
                    console.log(`PDF処理開始: ${fileData.originalname}`);
                    try {
                        if (process.env.NODE_ENV === 'production') {
                            // Vercel環境: 直接テキスト解析
                            console.log(`Vercel環境: PDFテキスト解析: ${fileData.originalname}`);
                            const pdfData = await pdfParse(fileData.buffer);
                            console.log(`PDFテキスト抽出完了: ${fileData.originalname}`);
                            extractedData = await extractInvoiceDataFromText(pdfData.text);
                            extractedData.ファイル名 = fileData.originalname;
                        } else {
                            // ローカル環境: 画像変換を試行
                            const base64Image = await convertPdfToImage(fileData.buffer);
                            console.log(`PDF変換完了: ${fileData.originalname}, 画像サイズ: ${base64Image.length}`);
                            
                            // 画像データの検証
                            if (!base64Image || base64Image.length === 0) {
                                throw new Error('画像データの変換に失敗しました');
                            }
                            
                            console.log(`AI処理開始（画像）: ${fileData.originalname}`);
                            extractedData = await extractInvoiceData(base64Image, fileData.originalname);
                            console.log(`AI処理完了（画像）: ${fileData.originalname}`);
                        }
                    } catch (pdfError) {
                        console.log(`PDF処理失敗、テキスト解析に切り替え: ${fileData.originalname}`);
                        // PDFを直接テキストとして解析
                        const pdfData = await pdfParse(fileData.buffer);
                        console.log(`PDFテキスト抽出完了: ${fileData.originalname}`);
                        extractedData = await extractInvoiceDataFromText(pdfData.text);
                        extractedData.ファイル名 = fileData.originalname;
                    }
                } else if (fileType === 'image') {
                    // 画像ファイルの場合、直接読み込み
                    console.log(`画像読み込み: ${fileData.originalname}`);
                    const base64Image = fileData.buffer.toString('base64');
                    console.log(`画像読み込み完了: ${fileData.originalname}, サイズ: ${base64Image.length}`);
                    console.log(`Base64先頭10文字: ${base64Image.substring(0, 10)}`);
                    
                    // 画像データの検証
                    if (!base64Image || base64Image.length === 0) {
                        throw new Error('画像データの変換に失敗しました');
                    }
                    
                    console.log(`AI処理開始（画像）: ${fileData.originalname}`);
                    extractedData = await extractInvoiceData(base64Image, fileData.originalname);
                    console.log(`AI処理完了（画像）: ${fileData.originalname}`);
                } else {
                    throw new Error('サポートされていないファイル形式です');
                }
                
                results.push(extractedData);
            } catch (e) {
                console.error(`ファイル処理エラー: ${fileData.originalname}`, e);
                console.error(`エラーメッセージ: ${e.message}`);
                console.error(`エラースタック: ${e.stack}`);
                results.push({ ファイル名: fileData.originalname, error: e.message });
            }
        }
        
        console.log('Excelファイル生成開始');
        const excelBuffer = await generateExcelFile(results);
        const excelBase64 = excelBuffer.toString('base64');
        console.log('Excelファイル生成完了');
        
        const response = { 
            success: true, 
            processedCount: results.length,
            results: results,
            excelData: excelBase64,
            fileName: `請求書統合管理表_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.xlsx`
        };
        
        console.log('バッチ処理完了:', {
            processedCount: response.processedCount,
            fileName: response.fileName,
            excelDataSize: excelBase64.length
        });
        
        res.json(response);
    } catch (e) {
        console.error('バッチ処理エラー:', e);
        console.error('エラースタック:', e.stack);
        res.status(500).json({ 
            success: false, 
            error: process.env.NODE_ENV === 'production' 
                ? '処理中にエラーが発生しました。ファイル数やサイズを確認してください。' 
                : e.message 
        });
    }
});

// ヘルスチェック
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// テキストベースの請求書情報抽出
async function extractInvoiceDataFromText(text) {
    console.log('テキストベース請求書解析開始');
    
    const prompt = `以下の請求書テキストから、以下の項目を抽出してください。JSON形式で回答してください。\n\n抽出項目：\n- インボイス登録番号（Tから始まる番号）\n- 請求日\n- 支払期限\n- 請求元会社\n- 請求元担当者\n- 件名\n- 小計（税抜）\n- 消費税額\n- 合計(税込)\n- 支払品目概要\n- 支払方法\n- 支払状況\n- 支払日\n- 備考\n\n注意事項：\n- 金額は数値のみで回答（カンマや円マークは含めない）\n- 日付はYYYY/MM/DD形式で回答\n- 不明な項目は空文字列で回答\n- 明細がある場合は、支払品目概要に品名と数量を記載\n- インボイス登録番号はTから始まる番号を抽出してください\n\n請求書テキスト：\n${text}\n\n回答形式：\n{\n  "インボイス登録番号": "値",\n  "請求日": "値",\n  "支払期限": "値",\n  "請求元会社": "値",\n  "請求元担当者": "値",\n  "件名": "値",\n  "小計（税抜）": "値",\n  "消費税額": "値",\n  "合計(税込)": "値",\n  "支払品目概要": "値",\n  "支払方法": "値",\n  "支払状況": "値",\n  "支払日": "値",\n  "備考": "値"\n}`;
    
    try {
        console.log('OpenAI API呼び出し開始（テキスト）');
        
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 1000
        });
        
        console.log('OpenAI API応答受信（テキスト）');
        
        const content = response.choices[0].message.content;
        console.log('AI応答内容（テキスト）:', content.substring(0, 200) + '...');
        
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const extractedData = JSON.parse(jsonMatch[0]);
            console.log('JSON解析完了（テキスト）:', Object.keys(extractedData));
            return extractedData;
        } else {
            throw new Error('JSONデータが見つかりませんでした');
        }
    } catch (error) {
        console.error('AI処理エラー詳細（テキスト）:', error);
        throw new Error('AI処理エラー: ' + error.message);
    }
}

// 請求書情報抽出
async function extractInvoiceData(base64Image, filename) {
    console.log(`AI処理開始: ${filename}, 画像サイズ: ${base64Image.length}`);
    
    // 画像データの検証
    if (!base64Image || base64Image.length === 0) {
        throw new Error('画像データが空です');
    }
    
    // Base64データの形式確認
    const imageDataUrl = `data:image/jpeg;base64,${base64Image}`;
    console.log('画像データURL長:', imageDataUrl.length);
    console.log('画像データURL先頭:', imageDataUrl.substring(0, 50) + '...');
    
    const prompt = `以下の請求書画像から、以下の項目を抽出してください。JSON形式で回答してください。\n\n抽出項目：\n- インボイス登録番号（Tから始まる番号）\n- 請求日\n- 支払期限\n- 請求元会社\n- 請求元担当者\n- 件名\n- 小計（税抜）\n- 消費税額\n- 合計(税込)\n- 支払品目概要\n- 支払方法\n- 支払状況\n- 支払日\n- 備考\n\n注意事項：\n- 金額は数値のみで回答（カンマや円マークは含めない）\n- 日付はYYYY/MM/DD形式で回答\n- 不明な項目は空文字列で回答\n- 明細がある場合は、支払品目概要に品名と数量を記載\n- インボイス登録番号はTから始まる番号を抽出してください\n\n回答形式：\n{\n  "インボイス登録番号": "値",\n  "請求日": "値",\n  "支払期限": "値",\n  "請求元会社": "値",\n  "請求元担当者": "値",\n  "件名": "値",\n  "小計（税抜）": "値",\n  "消費税額": "値",\n  "合計(税込)": "値",\n  "支払品目概要": "値",\n  "支払方法": "値",\n  "支払状況": "値",\n  "支払日": "値",\n  "備考": "値"\n}`;
    
    try {
        console.log('OpenAI API呼び出し開始');
        console.log('API Key存在確認:', process.env.OPENAI_API_KEY ? 'あり' : 'なし');
        
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: imageDataUrl
                            }
                        }
                    ]
                }
            ],
            max_tokens: 1000
        });
        
        console.log('OpenAI API応答受信');
        console.log('レスポンス選択肢数:', response.choices.length);
        
        const content = response.choices[0].message.content;
        console.log('AI応答内容:', content.substring(0, 200) + '...');
        
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const extractedData = JSON.parse(jsonMatch[0]);
            console.log('JSON解析完了:', Object.keys(extractedData));
            return { ファイル名: filename, ...extractedData };
        } else {
            throw new Error('JSONデータが見つかりませんでした');
        }
    } catch (error) {
        console.error('AI処理エラー詳細:', error);
        console.error('エラーメッセージ:', error.message);
        console.error('エラースタック:', error.stack);
        throw new Error('AI処理エラー: ' + error.message);
    }
}

// Excelファイル生成（メモリ対応）
async function generateExcelFile(data) {
    const workbook = new ExcelJS.Workbook();
    
    // 文字エンコーディング設定
    workbook.creator = '請求書自動管理エージェント';
    workbook.lastModifiedBy = '請求書自動管理エージェント';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    const worksheet = workbook.addWorksheet('請求書統合管理表');
    
    // ヘッダー行の設定
    const headers = [
        'ファイル名', 'インボイス登録番号', '請求日', '支払期限', '請求元会社', '支払品目概要', '請求元担当者',
        '件名', '小計（税抜）', '消費税額', '合計(税込)',
        '支払方法', '支払状況', '支払日', '備考'
    ];
    
    // ヘッダー行を追加
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };
    
    // データ行を追加
    data.forEach(row => {
        const rowData = headers.map(h => {
            const value = row[h] || '';
            // 数値の場合は数値として設定
            if (h.includes('計') && !isNaN(value) && value !== '') {
                return parseFloat(value);
            }
            return value;
        });
        worksheet.addRow(rowData);
    });
    
    // 列幅の設定
    worksheet.columns.forEach(column => { 
        column.width = 15; 
    });
    
    // 金額列の書式設定
    const amountColumns = [8, 9, 10]; // 小計、消費税額、合計の列インデックス
    amountColumns.forEach(colIndex => {
        worksheet.getColumn(colIndex).numFmt = '#,##0';
    });
    
    // メモリに書き込み（UTF-8エンコーディング）
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
}

// PDFを画像に変換する関数（Vercel対応）
async function convertPdfToImage(pdfBuffer) {
    try {
        console.log(`PDF変換開始, サイズ: ${pdfBuffer.length}`);
        
        // Vercel環境ではファイルシステムが制限されているため、
        // 直接テキスト解析に切り替え
        if (process.env.NODE_ENV === 'production') {
            console.log('Vercel環境: PDFテキスト解析に切り替え');
            const pdfData = await pdfParse(pdfBuffer);
            console.log('PDFテキスト抽出完了:', pdfData.text.substring(0, 200));
            
            // テキストベースで請求書情報を抽出
            const extractedData = await extractInvoiceDataFromText(pdfData.text);
            return extractedData;
        }
        
        // ローカル環境でのみ画像変換を実行
        const options = {
            density: 300,
            format: "png",
            width: 2480,
            height: 3508
        };
        const convert = pdf2pic.fromBuffer(pdfBuffer, options);
        const pageData = await convert(1); // 最初のページを変換
        const imageBuffer = await fs.readFile(pageData.path);
        const base64Image = imageBuffer.toString('base64');
        await fs.unlink(pageData.path); // 一時ファイル削除
        console.log(`PDF変換完了, サイズ: ${base64Image.length}`);
        return base64Image;
    } catch (error) {
        console.error('PDF変換エラー詳細:', error);
        // PDF変換に失敗した場合、PDFを直接テキストとして解析
        try {
            console.log('PDF直接解析に切り替え');
            const pdfData = await pdfParse(pdfBuffer);
            console.log('PDFテキスト抽出完了:', pdfData.text.substring(0, 200));
            
            // テキストベースで請求書情報を抽出
            const extractedData = await extractInvoiceDataFromText(pdfData.text);
            return extractedData;
        } catch (textError) {
            console.error('PDFテキスト解析エラー:', textError);
            throw new Error('PDF変換エラー: ' + error.message);
        }
    }
}

// ファイルタイプを判定する関数
function getFileType(filename) {
    const ext = path.extname(filename).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(ext)) {
        return 'image';
    } else if (ext === '.pdf') {
        return 'pdf';
    }
    return 'unknown';
}

// Vercel対応: サーバー起動を条件分岐
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`請求書自動管理エージェントが起動しました: http://localhost:${PORT}`);
    });
}

// Vercel用のエクスポート
module.exports = app; 