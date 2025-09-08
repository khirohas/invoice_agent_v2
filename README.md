# 請求書自動管理エージェント

請求書画像をアップロードし、AIで情報抽出・Excel統合管理表を自動生成するWebアプリです。

## 🚀 デプロイ方法

### Vercelでのデプロイ（推奨）

1. **GitHubリポジトリにプッシュ**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Vercelでデプロイ**
   - [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
   - "New Project"をクリック
   - GitHubリポジトリを選択
   - 環境変数を設定：
     - `OPENAI_API_KEY`: あなたのOpenAI APIキー
     - `NODE_ENV`: `production`

3. **デプロイ完了**
   - 自動的にデプロイが開始されます
   - 完了後、提供されたURLでアクセス可能

詳細な手順は [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) を参照してください。

## 🛠️ ローカル開発

### 前提条件
- Node.js 18以上
- OpenAI APIキー

### 起動方法

```bash
# 依存関係インストール
npm install

# 環境変数設定
export OPENAI_API_KEY="your_openai_api_key_here"

# ローカルサーバー起動
npm start
```

- http://localhost:3000 でアクセス
- `public/`配下にフロントエンド
- メモリストレージを使用（ファイルシステム不要）

## 📋 機能

- **ファイルアップロード**: 請求書画像・PDFのアップロード
- **AI処理**: OpenAI GPT-4o Vision APIによる情報抽出
- **Excel生成**: 統合管理表の自動生成
- **バッチ処理**: 複数ファイルの一括処理
- **メモリストレージ**: Vercel対応の一時ファイル管理

## 🔧 技術スタック

- **Backend**: Node.js + Express.js
- **Frontend**: Vanilla JavaScript + HTML/CSS
- **AI/OCR**: OpenAI GPT-4o Vision API
- **Excel処理**: ExcelJS
- **Deployment**: Vercel Serverless Functions
- **Storage**: メモリストレージ（一時的）

## 📚 ドキュメント

- [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) - Vercelデプロイ手順書
- [INVOICE_AGENT_GUIDE.md](./INVOICE_AGENT_GUIDE.md) - 開発ガイド
- [INVOICE_TEMPLATES.md](./INVOICE_TEMPLATES.md) - テンプレート情報 