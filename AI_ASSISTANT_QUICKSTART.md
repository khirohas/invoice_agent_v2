# AIアシスタント向け 請求書エージェント クイックスタートガイド

## 🚀 5分で始める実装

### Step 1: プロジェクト作成
```bash
# 1. 新しいディレクトリ作成
mkdir invoice-auto-input-agent
cd invoice-auto-input-agent

# 2. package.json作成（テンプレートコピー）
# INVOICE_TEMPLATES.mdのpackage.jsonをコピー

# 3. 依存関係インストール
npm install
```

### Step 2: 基本ファイル作成
```bash
# 1. メインファイル作成
touch server.js
touch vercel.json
touch .env.example
touch .gitignore

# 2. フロントエンドディレクトリ作成
mkdir public
touch public/index.html
touch public/script.js
touch public/style.css
touch public/favicon.ico

# 3. データディレクトリ作成
mkdir data
touch data/accounting_master.json
```

### Step 3: ファイル内容コピー
1. `INVOICE_TEMPLATES.md`から各ファイルの内容をコピー
2. 必要に応じてカスタマイズ

### Step 4: 環境変数設定
```bash
# .envファイル作成
cp .env.example .env

# OpenAI APIキーを設定
echo "OPENAI_API_KEY=your_api_key_here" >> .env
echo "NODE_ENV=development" >> .env
```

### Step 5: ローカルテスト
```bash
# 開発サーバー起動
npm run dev

# ブラウザで http://localhost:3000 にアクセス
```

## 🔧 カスタマイズポイント

### 1. 請求書固有の調整

**OCRプロンプトの変更（server.js内）**
```javascript
// 請求書用プロンプトに変更
const prompt = `この請求書画像から以下の情報を抽出し、JSON形式で返してください：
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
}`;
```

**UI文言の変更（public/index.html）**
```html
<!-- ヘッダー部分を請求書用に変更 -->
<div class="main-header">
    <h1>請求書Excel取り込み</h1>
    <p>月末までに全ての請求書をこちらにアップロードしてください</p>
</div>
```

### 2. Excel出力フォーマットの調整

**請求書用Excel生成（server.js内）**
```javascript
async function generateInvoiceExcel(results) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('請求書一括処理結果');
  
  // 請求書用の列設定
  worksheet.columns = [
    { header: '請求書番号', key: 'invoiceNumber', width: 15 },
    { header: '発行日', key: 'issueDate', width: 12 },
    { header: '支払期限', key: 'dueDate', width: 12 },
    { header: '仕入先名', key: 'supplierName', width: 25 },
    { header: '合計金額', key: 'totalAmount', width: 15 },
    { header: '消費税額', key: 'taxAmount', width: 15 },
    { header: 'ファイル名', key: 'fileName', width: 20 }
  ];
  
  // データ行の追加
  results.forEach(result => {
    worksheet.addRow({
      ...result.data,
      fileName: result.fileName
    });
  });
  
  return await workbook.xlsx.writeBuffer();
}
```

## 🚀 デプロイ手順

### 1. GitHubリポジトリ作成
```bash
# Git初期化
git init
git add .
git commit -m "Initial commit: Invoice Auto Input Agent"

# GitHubリポジトリ作成（GitHub CLI使用）
gh repo create invoice-auto-input-agent --public
git remote add origin https://github.com/username/invoice-auto-input-agent.git
git push -u origin main
```

### 2. Vercelデプロイ
1. [Vercel](https://vercel.com)にアクセス
2. GitHubアカウントでログイン
3. "New Project"をクリック
4. 作成したリポジトリを選択
5. 環境変数を設定：
   - `OPENAI_API_KEY`: あなたのOpenAI APIキー
   - `NODE_ENV`: production
6. "Deploy"をクリック

### 3. カスタムドメイン設定（オプション）
1. Vercelダッシュボードでプロジェクトを選択
2. "Settings" → "Domains"
3. カスタムドメインを追加

## 🐛 トラブルシューティング

### よくある問題と解決方法

**1. ファイルアップロードが失敗する**
```javascript
// 解決方法: ファイルサイズ制限を確認
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB制限
});
```

**2. OCR処理でエラーが発生する**
```javascript
// 解決方法: エラーハンドリングを強化
try {
  const result = JSON.parse(content);
  return result;
} catch (parseError) {
  console.error('JSONパースエラー:', parseError);
  throw new Error('画像から情報を抽出できませんでした');
}
```

**3. Vercelで静的ファイルが読み込まれない**
```javascript
// 解決方法: 静的ファイル配信を確認
app.use(express.static(path.join(__dirname, 'public')));
```

**4. CORSエラーが発生する**
```javascript
// 解決方法: CORS設定を確認
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://*.vercel.app', 'https://your-domain.vercel.app'] 
    : true,
  credentials: true
}));
```

## 📊 パフォーマンス最適化

### 1. メモリ使用量の最適化
```javascript
// 処理後のメモリクリア
results.forEach(result => {
  // 大きなバッファをクリア
  if (result.buffer) {
    result.buffer = null;
  }
});
```

### 2. 並列処理の制限
```javascript
// 同時処理数を制限
const MAX_CONCURRENT = 3;
const semaphore = new Semaphore(MAX_CONCURRENT);

// 処理時にセマフォを使用
await semaphore.acquire();
try {
  await processInvoiceOCR(imageBuffer);
} finally {
  semaphore.release();
}
```

### 3. エラーハンドリングの強化
```javascript
// 詳細なエラーログ
console.error('OCR処理エラー:', {
  fileName: fileData.originalname,
  error: error.message,
  stack: error.stack
});
```

## 🔍 デバッグ方法

### 1. ローカルデバッグ
```bash
# 詳細ログ付きで起動
DEBUG=* npm run dev

# 特定のモジュールのみデバッグ
DEBUG=express:router npm run dev
```

### 2. Vercelログ確認
```bash
# Vercel CLIでログ確認
vercel logs

# リアルタイムログ
vercel logs --follow
```

### 3. フロントエンドデバッグ
```javascript
// コンソールログの追加
console.log('ファイルアップロード開始:', files.length);
console.log('API応答:', result);
```

## 📈 監視とメトリクス

### 1. ヘルスチェックエンドポイント
```javascript
app.get('/health', async (req, res) => {
  try {
    const llmHealth = await llmService.healthCheck();
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      llm: llmHealth
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      error: error.message 
    });
  }
});
```

### 2. エラー監視
```javascript
// エラー発生時の通知設定
process.on('uncaughtException', (error) => {
  console.error('未捕捉例外:', error);
  // 通知システムに送信
});
```

## 🎯 実装チェックリスト

- [ ] プロジェクト初期化完了
- [ ] 基本ファイル作成完了
- [ ] 依存関係インストール完了
- [ ] 環境変数設定完了
- [ ] ローカルテスト完了
- [ ] GitHubリポジトリ作成完了
- [ ] Vercelデプロイ完了
- [ ] 動作確認完了
- [ ] カスタマイズ完了
- [ ] ドキュメント更新完了

このガイドに従って、効率的に請求書エージェントを実装できます！
