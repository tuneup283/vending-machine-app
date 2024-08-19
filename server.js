const mysql = require('mysql2');
const express = require('express');
const cors = require('cors');

function connectWithRetry() {
  const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  connection.connect((err) => {
    if (err) {
      console.error('Failed to connect to MySQL, retrying in 5 seconds...', err);
      setTimeout(connectWithRetry, 5000);
    } else {
      console.log('Connected to MySQL');
      startServer(connection);
    }
  });

  connection.on('error', (err) => {
    console.error('MySQL connection error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      connectWithRetry();
    } else {
      throw err;
    }
  });
}

function startServer(connection) {
  const app = express();

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
        res.status(500).json({ error: 'Database query failed' });
      } else {
        res.json(results);
      }
    });
  });

  app.post('/api/purchase', (req, res) => {
    const { userId, drinkId, selectedMoney } = req.body;

    // selectedMoneyがundefinedまたはnullの場合の処理
    if (!selectedMoney || typeof selectedMoney !== 'object') {
        console.error('selectedMoney is invalid:', selectedMoney);
        return res.status(400).json({ error: 'Invalid selectedMoney data' });
    }

    // トランザクションの開始
    connection.beginTransaction((transactionErr) => {
        if (transactionErr) {
            return res.status(500).json({ error: 'Failed to start transaction' });
        }

        // 1. ユーザーの所持金を取得
        connection.query('SELECT * FROM user WHERE id = ?', [userId], (userErr, userResults) => {
            if (userErr) {
                return connection.rollback(() => {
                    res.status(500).json({ error: 'Failed to retrieve user data' });
                });
            }

            const userMoney = userResults[0];

            // 2. 購入する商品（ドリンク）の価格を取得
            connection.query('SELECT * FROM drinks WHERE id = ?', [drinkId], (drinkErr, drinkResults) => {
                if (drinkErr) {
                    return connection.rollback(() => {
                        res.status(500).json({ error: 'Failed to retrieve drink data' });
                    });
                }

                const drink = drinkResults[0];
                const totalSelectedMoney = Object.values(selectedMoney).reduce((sum, count, index) => {
                    const denominations = [10000, 5000, 1000, 500, 100, 50, 10, 5, 1];
                    return sum + (count * denominations[index]);
                }, 0);

                // 3. 支払い可能かどうかを確認
                if (totalSelectedMoney < drink.cost) {
                    return connection.rollback(() => {
                        res.status(400).json({ error: 'Insufficient funds' });
                    });
                }

                let change = totalSelectedMoney - drink.cost;

                const userMoneyUpdate = {
                  yen_10000: userMoney.yen_10000,
                  yen_5000: userMoney.yen_5000,
                  yen_1000: userMoney.yen_1000,
                  yen_500: userMoney.yen_500,
                  yen_100: userMoney.yen_100,
                  yen_50: userMoney.yen_50,
                  yen_10: userMoney.yen_10,
                  yen_5: userMoney.yen_5,
                  yen_1: userMoney.yen_1
                };

                // 支払いに使用した紙幣・硬貨を所持金から減らす
                Object.keys(selectedMoney).forEach((key) => {
                  userMoneyUpdate[key] -= selectedMoney[key];  // 支払いに使用した枚数を減らす
                });

                const changeArray = [];
                const denominations = [10000, 5000, 1000, 500, 100, 50, 10, 5, 1];

                // お釣りを計算し、適切な硬貨や紙幣で返す
                for (let i = 0; i < denominations.length; i++) {
                  const denom = denominations[i];
                  const changeCount = Math.floor(change / denom);

                  if (changeCount > 0) {
                    changeArray.push({ denom, count: changeCount });
                    change -= changeCount * denom;
                  }
                }

                // お釣りとして返却された硬貨や紙幣をユーザーの所持金に加算
                changeArray.forEach(item => {
                  userMoneyUpdate[`yen_${item.denom}`] += item.count;
                });

                // お釣りが計算され、ユーザーの所持金が適切に更新されたか確認する
                if (change !== 0) {
                  return connection.rollback(() => {
                    res.status(400).json({ error: 'Failed to return exact change' });
                  });
                }

                connection.query('UPDATE user SET ? WHERE id = ?', [userMoneyUpdate, userId], (updateErr) => {
                  if (updateErr) {
                    return connection.rollback(() => {
                      res.status(500).json({ error: 'Failed to update user money' });
                    });
                  }

                  connection.commit((commitErr) => {
                    if (commitErr) {
                      return connection.rollback(() => {
                        res.status(500).json({ error: 'Failed to commit transaction' });
                      });
                    }

                    res.json({ message: 'Purchase successful', change: changeArray });
                  });
                });
            });
        });
    });
});



  app.get('/api/user_money', (req, res) => {
    connection.query('SELECT `yen_10000`, `yen_5000`, `yen_1000`, `yen_500`, `yen_100`, `yen_50`, `yen_10`, `yen_5`, `yen_1` FROM user WHERE id = 1', 
    (error, results) => {
      if (error) {
        res.status(500).json({ error: 'Database query failed' });
      } else {
        res.json(results[0]);  
      }
    });
  });

  app.get('/healthcheck', (req, res) => {
    res.status(200).send('OK');
  });  
  
  app.listen(3001, () => {
    console.log('API server is running on http://localhost:3001');
  });
}

connectWithRetry();
