# Vercelデプロイ手順書

## 📋 概要

このドキュメントは、請求書自動管理エージェントをVercelにデプロイするための詳細な手順書です。[[memory:4622549]]に従い、技術的な詳細を含めて説明します。

## 🏗️ アーキテクチャ概要

### 技術スタック
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Deployment**: Vercel Serverless Functions
- **Storage**: メモリストレージ（一時的）
- **AI/OCR**: OpenAI GPT-4o Vision API
- **Excel処理**: ExcelJS（メモリベース）

### Vercel制限事項
- **実行時間**: 最大60秒（Proプラン）
- **メモリ**: 1024MB
- **ファイルシステム**: 一時的（メモリストレージ必須）
- **リクエストサイズ**: 4.5MB（Body）

## 🚀 デプロイ手順

### Phase 1: 事前準備

#### 1.1 必要なアカウント
- [Vercelアカウント](https://vercel.com)（GitHub連携推奨）
- [OpenAIアカウント](https://platform.openai.com)（APIキー取得）

#### 1.2 ローカル環境での動作確認
```bash
# 依存関係インストール
npm install

# 環境変数設定
export OPENAI_API_KEY="your_openai_api_key_here"
export NODE_ENV="development"

# ローカルサーバー起動
npm start
```

### Phase 2: GitHubリポジトリ準備

#### 2.1 リポジトリ作成
```bash
# Git初期化
git init

# .gitignore作成
echo "node_modules/
.env
.vercel/
*.log" > .gitignore

# ファイル追加
git add .
git commit -m "Initial commit: Invoice Agent v2"

# GitHubリポジトリ作成（GitHub CLI使用）
gh repo create invoice-agent-v2 --public
git remote add origin https://github.com/yourusername/invoice-agent-v2.git
git push -u origin main
```

#### 2.2 必要なファイル確認
```
請求書自動管理エージェント_v2/
├── server.js              # メインサーバー（Vercel対応済み）
├── package.json           # 依存関係（Vercel対応済み）
├── vercel.json           # Vercel設定
├── public/               # フロントエンド
│   ├── index.html
│   ├── script.js
│   └── style.css
└── README.md
```

### Phase 3: Vercelデプロイ

#### 3.1 Vercel CLIを使用したデプロイ
```bash
# Vercel CLIインストール
npm install -g vercel

# プロジェクトディレクトリでログイン
vercel login

# デプロイ実行
vercel

# 本番環境デプロイ
vercel --prod
```

#### 3.2 Vercel Dashboard経由でのデプロイ
1. [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
2. "New Project"をクリック
3. GitHubリポジトリを選択
4. プロジェクト設定：
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `./`
   - **Install Command**: `npm install`

### Phase 4: 環境変数設定

#### 4.1 Vercel Dashboardでの設定
1. プロジェクトの"Settings"タブに移動
2. "Environment Variables"セクションを選択
3. 以下の環境変数を追加：

| 変数名 | 値 | 環境 |
|--------|-----|------|
| `OPENAI_API_KEY` | `your_openai_api_key_here` | Production, Preview, Development |
| `NODE_ENV` | `production` | Production |

#### 4.2 環境変数確認
```bash
# デプロイ後の環境変数確認
vercel env ls
```

### Phase 5: 動作確認

#### 5.1 ヘルスチェック
```bash
# デプロイURLを確認
vercel ls

# ヘルスチェック実行
curl https://your-app.vercel.app/health
```

#### 5.2 機能テスト
1. **ファイルアップロードテスト**
   - 請求書画像をアップロード
   - ファイル一覧表示確認

2. **AI処理テスト**
   - バッチ処理実行
   - Excelファイル生成確認

3. **エラーハンドリングテスト**
   - 無効なファイル形式のアップロード
   - ネットワークエラー時の動作

## 🔧 トラブルシューティング

### よくある問題と解決方法

#### 1. デプロイエラー
```bash
# ログ確認
vercel logs https://your-app.vercel.app

# 再デプロイ
vercel --prod --force
```

#### 2. 環境変数エラー
```bash
# 環境変数再設定
vercel env add OPENAI_API_KEY
vercel env add NODE_ENV

# 再デプロイ
vercel --prod
```

#### 3. メモリ不足エラー
- ファイルサイズ制限を10MB以下に設定
- バッチ処理のファイル数を制限
- 画像解像度を調整

#### 4. タイムアウトエラー
- 処理時間を短縮
- ファイル数を制限
- 並列処理を制限

### ログ確認方法
```bash
# リアルタイムログ
vercel logs --follow

# 特定のデプロイメントのログ
vercel logs https://your-app.vercel.app --since=1h
```

## 📊 パフォーマンス最適化

### 1. メモリ使用量最適化
- ファイル処理後のメモリクリア
- バッチサイズ制限（推奨：5ファイル以下）
- 画像圧縮処理

### 2. 実行時間最適化
- 並列処理の制限
- 不要な処理の削除
- キャッシュ機能の実装

### 3. リクエスト最適化
- ファイルサイズ制限
- リクエストタイムアウト設定
- エラーハンドリング強化

## 🔒 セキュリティ設定

### 1. 環境変数管理
- APIキーの適切な管理
- 本番環境でのみ公開
- 定期的なキーローテーション

### 2. CORS設定
- 適切なオリジン設定
- 本番環境での制限
- セキュリティヘッダーの追加

### 3. ファイルアップロード制限
- ファイルタイプ検証
- ファイルサイズ制限
- マルウェアスキャン

## 📈 監視とメンテナンス

### 1. 監視設定
- Vercel Analytics有効化
- エラーログ監視
- パフォーマンス監視

### 2. 定期メンテナンス
- 依存関係の更新
- セキュリティパッチ適用
- パフォーマンス最適化

### 3. バックアップ
- コードのバージョン管理
- 環境変数のバックアップ
- 設定ファイルの管理

## 🎯 デプロイチェックリスト

- [ ] ローカル環境での動作確認
- [ ] GitHubリポジトリ作成
- [ ] Vercelプロジェクト作成
- [ ] 環境変数設定
- [ ] 初回デプロイ実行
- [ ] ヘルスチェック確認
- [ ] 機能テスト実行
- [ ] エラーハンドリング確認
- [ ] パフォーマンステスト
- [ ] セキュリティ設定確認
- [ ] 監視設定有効化
- [ ] ドキュメント更新

## 📞 サポート

### 公式ドキュメント
- [Vercel Documentation](https://vercel.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Express.js Documentation](https://expressjs.com/)

### コミュニティ
- [Vercel Community](https://github.com/vercel/vercel/discussions)
- [OpenAI Community](https://community.openai.com/)

この手順書に従って実装することで、請求書自動管理エージェントをVercelに安全かつ効率的にデプロイできます。
