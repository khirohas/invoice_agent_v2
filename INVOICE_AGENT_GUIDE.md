# 請求書エージェント開発ガイド

## 📋 概要

このガイドは、領収書自動入力エージェントv3の実装を基に、請求書エージェントを開発するための包括的な手順書です。AIアシスタントが効率的に作業できるよう、技術的な詳細と実装手順を詳しく説明します。

## 🏗️ アーキテクチャ概要

### 技術スタック
- **Backend**: Node.js + Express.js
- **Frontend**: Vanilla JavaScript + HTML/CSS
- **AI/OCR**: OpenAI GPT-4o Vision API
- **Excel処理**: ExcelJS
- **ファイル処理**: Multer (Memory Storage)
- **デプロイ**: Vercel (Serverless)
- **バージョン管理**: Git + GitHub

### 主要コンポーネント
```
請求書エージェント/
├── server.js              # メインサーバー
├── package.json           # 依存関係管理
├── vercel.json           # Vercel設定
├── public/               # フロントエンド
│   ├── index.html        # メインUI
│   ├── script.js         # フロントエンドロジック
│   └── style.css         # スタイリング
├── data/                 # データファイル
│   └── accounting_master.json  # 勘定科目マスタ
└── uploads/              # アップロードファイル（ローカル開発用）
```

## 🚀 実装手順

### Phase 1: プロジェクト基盤構築

#### 1.1 プロジェクト初期化
```bash
# 新しいディレクトリ作成
mkdir invoice-auto-input-agent
cd invoice-auto-input-agent

# package.json作成
npm init -y

# 依存関係インストール
npm install express multer cors exceljs openai dotenv path
npm install --save-dev nodemon
```

#### 1.2 package.json設定
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
  }
}
```

### Phase 2: バックエンド実装

#### 2.1 メインサーバー (server.js)

**重要な実装ポイント:**

1. **Vercel対応のメモリストレージ**
```javascript
// ファイルをメモリに保存（Vercelの一時ファイルシステム対応）
const fileStorage = new Map();

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB制限
});
```

2. **CORS設定（本番環境最適化）**
```javascript
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://*.vercel.app', 'https://your-domain.vercel.app'] 
    : true,
  credentials: true
}));
```

3. **リクエストサイズ制限**
```javascript
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
```

#### 2.2 主要APIエンドポイント

**ファイルアップロード (`/api/upload`)**
```javascript
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'ファイルが選択されていません' });
    }

    const fileId = Date.now().toString();
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
```

**バッチ処理 (`/api/batch-process`)**
```javascript
app.post('/api/batch-process', async (req, res) => {
  try {
    const results = [];
    const errors = [];

    for (const [fileId, fileData] of fileStorage) {
      try {
        const ocrResult = await processInvoiceOCR(fileData.buffer);
        results.push({
          fileId,
          fileName: fileData.originalname,
          data: ocrResult
        });
      } catch (error) {
        errors.push({
          fileId,
          fileName: fileData.originalname,
          error: error.message
        });
      }
    }

    // Excel生成
    const excelBuffer = await generateInvoiceExcel(results);
    const excelBase64 = excelBuffer.toString('base64');

    res.json({
      success: true,
      processedCount: results.length,
      errorCount: errors.length,
      errors: errors,
      excelData: excelBase64
    });
  } catch (error) {
    console.error('バッチ処理エラー:', error);
    res.status(500).json({ error: 'バッチ処理に失敗しました' });
  }
});
```

#### 2.3 OCR処理関数

**請求書OCR処理**
```javascript
async function processInvoiceOCR(imageBuffer) {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const base64Image = imageBuffer.toString('base64');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `この請求書画像から以下の情報を抽出し、JSON形式で返してください：
              {
                "invoiceNumber": "請求書番号",
                "issueDate": "発行日（YYYY-MM-DD形式）",
                "dueDate": "支払期限（YYYY-MM-DD形式）",
                "supplierName": "仕入先名",
                "supplierAddress": "仕入先住所",
                "totalAmount": 金額（数値のみ）,
                "taxAmount": 消費税額（数値のみ）,
                "items": [
                  {
                    "description": "品目名",
                    "quantity": 数量,
                    "unitPrice": 単価,
                    "amount": 金額
                  }
                ]
              }`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 2000
    });

    let content = response.choices[0].message.content.trim();
    
    // コードブロックの除去
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    return JSON.parse(content);
  } catch (error) {
    console.error('OCR処理エラー:', error);
    throw error;
  }
}
```

### Phase 3: フロントエンド実装

#### 3.1 HTML構造 (public/index.html)

**主要セクション:**
- ヘッダー（タイトル、説明）
- ファイルアップロードエリア
- ファイル一覧テーブル
- バッチ処理ボタン
- 結果表示エリア

**重要な実装ポイント:**
```html
<!-- ファイルアップロードエリア -->
<div class="file-upload-area" id="fileUploadArea">
  <div class="upload-icon">📄</div>
  <p>請求書画像をドラッグ&ドロップまたはクリックして選択</p>
  <input type="file" id="fileInput" multiple accept="image/*" style="display: none;">
</div>

<!-- ファイル一覧テーブル -->
<div class="file-list-section">
  <h3>アップロード済みファイル</h3>
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
```

#### 3.2 JavaScript実装 (public/script.js)

**ファイルアップロード処理**
```javascript
// ファイル選択処理
document.getElementById('fileInput').addEventListener('change', handleFiles);

function handleFiles(event) {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;
  
  uploadFilesSequentially(files);
}

// シーケンシャルアップロード（安定性向上）
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
```

**バッチ処理実装**
```javascript
// バッチ処理実行
document.getElementById('batchProcessBtn').addEventListener('click', async () => {
  const btn = document.getElementById('batchProcessBtn');
  const resultArea = document.getElementById('resultArea');
  
  btn.disabled = true;
  btn.textContent = '処理中...';
  
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
    btn.disabled = false;
    btn.textContent = '処理を開始';
  }
});
```

### Phase 4: デプロイ設定

#### 4.1 Vercel設定 (vercel.json)
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

#### 4.2 環境変数設定 (.env)
```bash
OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=production
```

### Phase 5: テストとデバッグ

#### 5.1 ローカルテスト
```bash
# 開発サーバー起動
npm run dev

# 本番ビルドテスト
npm start
```

#### 5.2 デプロイテスト
```bash
# Vercel CLIでデプロイ
vercel --prod

# ヘルスチェック
curl https://your-app.vercel.app/health
```

## 🔧 カスタマイズポイント

### 請求書固有の調整

1. **OCRプロンプトの調整**
   - 請求書特有の項目（請求書番号、支払期限など）
   - 仕入先情報の抽出
   - 品目別の詳細情報

2. **勘定科目マスタの調整**
   - 請求書処理用の勘定科目
   - 仕入先別の科目マッピング

3. **Excel出力フォーマット**
   - 請求書データ用のテンプレート
   - 必要な列の調整

### エラーハンドリング

1. **OCR処理エラー**
   - 画像品質チェック
   - 非JSON応答の処理
   - タイムアウト処理

2. **ファイル処理エラー**
   - ファイルサイズ制限
   - 対応形式チェック
   - メモリ不足対応

## 📊 パフォーマンス最適化

### 1. メモリ管理
- ファイルサイズ制限（10MB）
- 処理後のメモリクリア
- バッチサイズ制限

### 2. API最適化
- リクエストタイムアウト設定
- 並列処理制限
- エラーハンドリング強化

### 3. フロントエンド最適化
- シーケンシャルアップロード
- プログレス表示
- エラー状態管理

## 🚨 注意事項

### Vercel制限事項
- **実行時間**: 最大60秒（Proプラン）
- **メモリ**: 1024MB
- **ファイルシステム**: 一時的（メモリストレージ必須）
- **リクエストサイズ**: 4.5MB（Body）

### セキュリティ考慮事項
- APIキーの環境変数管理
- CORS設定の適切な設定
- ファイルタイプ検証
- 入力値サニタイゼーション

## 📈 今後の拡張可能性

1. **複数LLM対応**
   - OpenAI + Gemini
   - プロバイダー切り替え機能

2. **高度な機能**
   - 自動科目判定
   - 仕入先マスタ連携
   - 承認ワークフロー

3. **UI/UX改善**
   - リアルタイムプレビュー
   - ドラッグ&ドロップ改善
   - モバイル対応

## 🎯 実装チェックリスト

- [ ] プロジェクト初期化
- [ ] 依存関係インストール
- [ ] バックエンドAPI実装
- [ ] フロントエンドUI実装
- [ ] OCR処理実装
- [ ] Excel生成実装
- [ ] エラーハンドリング実装
- [ ] ローカルテスト
- [ ] Vercel設定
- [ ] 本番デプロイ
- [ ] 動作確認

このガイドに従って実装することで、領収書エージェントと同様の高品質な請求書エージェントを構築できます。
