const mysql = require('mysql2');
const express = require('express');
const cors = require('cors');
const app = express();

function startServer(connection) {

  app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true
  }));

  app.use(express.json());

  app.get('/api/drinks', (req, res) => {
    connection.query('SELECT * FROM drinks', (error, results) => {
      if (error) {
        res.status(500).json({ error: 'データベースのクエリに失敗しました' });
      } else {
        res.json(results);
      }
    });
  });

  app.post('/api/purchase', (req, res) => {
    console.log('Request received at /api/purchase:', req.body);  // リクエストが届いたか確認
    const { drinkId, selectedMoney } = req.body;
    if (!selectedMoney || typeof selectedMoney !== 'object') {
      console.error('無効な金額:', selectedMoney);
      return res.status(400).json({ error: '無効な金額データ' });
    }

    connection.beginTransaction((err) => {
      if (err) {
        console.error('トランザクションの開始に失敗しました:', err);
        return res.status(500).json({ error: 'トランザクションの開始に失敗しました', details: err.message });
      }

      // ユーザーの所持金を取得
      connection.query('SELECT * FROM user_money', (err, userMoney) => {
        if (err) {
          console.error('ユーザーの所持金の取得に失敗しました:', err);
          return connection.rollback(() => res.status(500).json({ error: 'ユーザーの所持金の取得に失敗しました', details: err.message }));
        }

        // 飲み物情報を取得
        connection.query('SELECT * FROM drinks WHERE id = ?', [drinkId], (err, drinkData) => {
          if (err) {
            console.error('飲み物の取得に失敗しました:', err);
            return connection.rollback(() => res.status(500).json({ error: '飲み物の取得に失敗しました', details: err.message }));
          }
          const drink = drinkData[0];
            // 在庫の確認
          if (drink.stock <= 0) {
            console.error('在庫がありません');
            return connection.rollback(() => res.status(400).json({ error: '在庫がありません' }));
          }
          const totalMoney = Object.values(selectedMoney).reduce((sum, count, index) => {
            const coins = [1,5,10,50,100,500,1000,5000,10000];
            return sum + count * coins[index];
          }, 0);
          console.log("Total Money:", totalMoney);  // ターミナルに出力
          
          if (totalMoney < drink.cost) {
            const shortage = drink.cost - totalMoney;
            connection.rollback((rollbackErr) => {
              if (rollbackErr) {
                console.error('ロールバックに失敗しました:', rollbackErr);
                return res.status(500).json({ error: 'ロールバックに失敗しました', details: rollbackErr.message });
              }
              res.status(400).json({ 
                error: '金額が足りません', 
                details: `現在の投入金額: ${totalMoney}円、不足金額: ${shortage}円`
              });
            });
          }          

          let change = totalMoney - drink.cost;
          const userUpdate = {};
          userMoney.forEach((row) => {
            userUpdate[row.value] = row.quantity;
          });

          // 支払い分をユーザーの所持金から引く
          Object.keys(selectedMoney).forEach((value) => {
            const coin = parseInt(value);
            if (isNaN(coin)) {
              console.error(`無効な硬貨の値です: ${value}`);
              return connection.rollback(() => res.status(400).json({ error: '無効な硬貨の値です' }));
            }

            // 支払い前にユーザーの所持金をチェックし、足りなければ処理を中断
            if (userUpdate[coin] < selectedMoney[value]) {
              console.error(`硬貨が不足しています。値: ${coin}, 必要: ${selectedMoney[value]}, 所持: ${userUpdate[coin]}`);
              return connection.rollback(() => res.status(400).json({ error: `硬貨が不足しています: ${coin}` }));
            }

            // 所持金から支払い分を引く
            userUpdate[coin] -= selectedMoney[value];
          });

          const changeArray = [];
          const coins = [10000, 5000, 1000, 500, 100, 50, 10, 5, 1];

          // キャッシャーのデータを取得
          connection.query('SELECT * FROM Money', (err, cashData) => {
            if (err) {
              console.error('キャッシャーデータの取得に失敗しました:', err);
              return connection.rollback(() => res.status(500).json({ error: 'キャッシャーデータの取得に失敗しました', details: err.message }));
            }

            const casher = {};
            cashData.forEach((row) => {
              casher[row.value] = row.quantity;
            });

            // 支払い金額をキャッシャーに加算
            Object.keys(selectedMoney).forEach((value) => {
              const coin = parseInt(value);
              if (isNaN(coin)) {
                console.error(`無効な硬貨の値が検出されました: ${value}`);
                return connection.rollback(() => res.status(400).json({ error: '無効な硬貨の値です' }));
              }
              casher[coin] = (casher[coin] || 0) + selectedMoney[value];
            });

            // お釣り処理
            for (let i = 0; i < coins.length; i++) {
              const coin = coins[i];
              const neededChange = Math.floor(change / coin);

              if (neededChange > 0) {
                if (casher[coin] >= neededChange) {
                  casher[coin] -= neededChange;
                  changeArray.push({ coin, count: neededChange });
                  change -= neededChange * coin;
                }
              }
            }

            if (change > 0) {
              return connection.rollback(() => res.status(400).json({ error: 'お釣りが足りません' }));
            }

            // お釣りをユーザーの所持金に反映
            changeArray.forEach((item) => {
              userUpdate[item.coin] += item.count;
            });

            // データベースの更新 (user_money)
            const updateUserMoney = Object.keys(userUpdate).map((coinStr) => {
              const coin = parseInt(coinStr);  // 数値に変換
              if (isNaN(coin)) {
                console.error(`無効な硬貨の値です: ${coinStr}`);
                return Promise.reject(new Error(`無効な硬貨の値: ${coinStr}`));
              }
              return new Promise((resolve, reject) => {
                connection.query(
                  'UPDATE user_money SET quantity = ? WHERE value = ?',
                  [userUpdate[coin], coin],  // coin は数値である必要がある
                  (err) => {
                    if (err) {
                      console.error(`ユーザーのお金の更新に失敗しました (値 ${coin}):`, err);
                      return reject(err);
                    }
                    resolve();
                  }
                );
              });
            });

            const updateCasherMoney = Object.keys(casher).map((coinStr) => {
              const coin = parseInt(coinStr);  // 数値に変換
              if (isNaN(coin)) {
                console.error(`無効な硬貨の値です: ${coin}`);
                return reject(new Error(`無効な硬貨の値: ${coin}`));
              }
              return new Promise((resolve, reject) => {
                connection.query(
                  'UPDATE Money SET quantity = ? WHERE value = ?',
                  [casher[coin], coin],
                  (err) => {
                    if (err) {
                      console.error(`キャッシャーのお金の更新に失敗しました (値 ${coin}):`, err);
                      return reject(err);
                    }
                    resolve();
                  }
                );
              });
            });
            // 在庫の減少処理を追加
            const updateStock = new Promise((resolve, reject) => {
              connection.query(
                'UPDATE drinks SET stock = stock - 1 WHERE id = ?',
                [drinkId],
                (err) => {
                  if (err) {
                    console.error(`在庫の更新に失敗しました (ID ${drinkId}):`, err);
                    return reject(err);
                  }
                  resolve();
                }
              );
            });
            Promise.all([...updateUserMoney, ...updateCasherMoney])
              .then(() => {
                connection.commit((err) => {
                  if (err) {
                    console.error('コミットに失敗しました:', err);
                    return connection.rollback(() => res.status(500).json({ error: 'コミットに失敗しました', details: err.message }));
                  }
                  res.json({ message: '購入に成功しました', change: changeArray });
                });
              })
              .catch((err) => {
                console.error('更新に失敗しました:', err);
                connection.rollback(() => res.status(500).json({ error: '更新に失敗しました', details: err.message }));
              });
          });
        });
      });
    });
  });

  app.post('/api/drinks/add', (req, res) => {
    console.log(req.body);  // リクエストボディをログに出力
    const { name, type, cost, stock } = req.body;

    connection.query('INSERT INTO drinks (name, type, cost, stock) VALUES (?, ?, ?, ?)', [name, type, cost, stock], (error, results) => {
      if (error) {
        return res.status(500).json({ error: '飲み物の追加に失敗しました' });
      }
      res.json({ message: '飲み物が正常に追加されました' });
    });
  });

  app.post('/api/drinks/edit/:id', (req, res) => {
    console.log(req.body);  // リクエストボディをログに出力
    const { id } = req.params;
    const { name, type, cost, stock } = req.body;

    connection.query('UPDATE drinks SET name = ?, type = ?, cost = ?, stock = ? WHERE id = ?', [name, type, cost, stock, id], (error, results) => {
      if (error) {
        return res.status(500).json({ error: '飲み物の更新に失敗しました' });
      }
      console.log(`ID ${id}の飲み物を更新しました。新しい値 - 名前: ${name}, 種類: ${type}, 価格: ${cost}, 在庫: ${stock}`);
      res.json({ message: '飲み物が正常に更新されました' });
    });
  });

  app.get('/api/money', (req, res) => {
    connection.query('SELECT * FROM Money', (error, results) => {
      if (error) {
        res.status(500).json({ error: 'データベースのクエリに失敗しました' });
      } else {
        res.json(results);
      }
    });
  });

  app.post('/api/money/edit/:id', (req, res) => {
    console.log(req.body);  // リクエストボディをログに出力
    const { id } = req.params;
    const { value, quantity } = req.body;

    connection.query('UPDATE Money SET value = ?, quantity = ? WHERE id = ?', [value, quantity, id], (error, results) => {
      if (error) {
        return res.status(500).json({ error: 'お金の更新に失敗しました' });
      }
      res.json({ message: 'お金が正常に更新されました' });
    });
  });

  app.get('/api/user_money', (req, res) => {
    connection.query('SELECT * FROM user_money', (error, results) => {
      if (error) {
        res.status(500).json({ error: 'データベースのクエリに失敗しました' });
      } else {
        res.json(results);
      }
    });
  });

  app.post('/api/user_money/edit/:id', (req, res) => {
    console.log(req.body);  // リクエストボディをログに出力
    const { id } = req.params;
    const { value, quantity } = req.body;

    connection.query('UPDATE user_money SET value = ?, quantity = ? WHERE id = ?', [value, quantity, id], (error, results) => {
      if (error) {
        return res.status(500).json({ error: 'ユーザーの所持金の更新に失敗しました' });
      }
      res.json({ message: 'ユーザーの所持金が正常に更新されました' });
    });
  });

  app.get('/healthcheck', (req, res) => {
    res.status(200).send('OK');
  });

  app.listen(3001, () => {
    console.log('APIサーバーが http://localhost:3001 で稼働中です');
  });
}

function connectWithRetry() {
  const mysql = require('mysql2');
  const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4'  // ここでUTF-8エンコーディングを指定
  });

  connection.connect((err) => {
    if (err) {
      console.error('MySQLへの接続に失敗しました。5秒後に再試行します...', err);
      setTimeout(connectWithRetry, 5000);
    } else {
      console.log('MySQLに接続しました');
      startServer(connection);
      serverStarted = true;  // サーバーが起動したことを記録
    }
  });

  connection.on('error', (err) => {
    console.error('MySQL接続エラー:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      connectWithRetry();
    } else {
      throw err;
    }
  });
}

connectWithRetry();
