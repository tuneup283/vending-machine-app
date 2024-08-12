const express = require('express');
const cors = require('cors');  // CORS パッケージのインポート

const app = express();

// CORS ミドルウェアを使用する
app.use(cors({
  origin: 'http://localhost:3000', // 許可するオリジンを指定
  methods: ['GET', 'POST'], // 許可するHTTPメソッド
  allowedHeaders: ['Content-Type'], // 許可するヘッダー
  credentials: true // クッキーなどの認証情報を含める場合
}));

// APIエンドポイント
app.get('/api/drinks', (req, res) => {
  res.json([
    { id: 1, name: 'Cola', type: 'cold', temperature: 'Chilled' },
    { id: 2, name: 'Tea', type: 'hot', temperature: 'Heated' }
  ]);
});

// サーバーの起動
app.listen(3001, () => {
  console.log('API server is running on http://localhost:3001');
});
