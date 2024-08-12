# ベースイメージ
FROM node:20

# 作業ディレクトリの設定
WORKDIR /usr/src/app

# 依存関係のインストール
COPY package*.json ./
RUN npm install

# ソースコードのコピー
COPY . .

# ビルド
RUN npm run build

# アプリの実行
CMD ["npm", "start"]

# ポートのエクスポート
EXPOSE 3000
