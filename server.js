const mysql = require('mysql2');
const express = require('express');
const cors = require('cors');
const app = express();
module.exports = app;  // appをエクスポート

let serverStarted = false;

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
  
    if (!selectedMoney || typeof selectedMoney !== 'object') {
      console.error('selectedMoney is invalid:', selectedMoney);
      return res.status(400).json({ error: 'Invalid selectedMoney data' });
    }
  
    connection.beginTransaction((transactionErr) => {
      if (transactionErr) {
        return res.status(500).json({ error: 'Failed to start transaction' });
      }
  
      connection.query('SELECT * FROM user WHERE id = ?', [userId], (userErr, userResults) => {
        if (userErr) {
          return connection.rollback(() => {
            res.status(500).json({ error: 'Failed to retrieve user data' });
          });
        }
  
        const userMoney = userResults[0];
  
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
          console.log('Total selected money:', totalSelectedMoney);

  
          if (totalSelectedMoney < drink.cost) {
            return connection.rollback(() => {
              res.status(400).json({ error: 'Insufficient funds' });
            });
          }
  
          let change = totalSelectedMoney - drink.cost;
          console.log('Calculated change:', change);

          const userMoneyUpdate = {
            yen_10000: userMoney.yen_10000,
            yen_5000: userMoney.yen_5000,
            yen_1000: userMoney.yen_1000,
            yen_500: userMoney.yen_500,
            yen_100: userMoney.yen_100,
            yen_50: userMoney.yen_50,
            yen_10: userMoney.yen_10,
            yen_5: userMoney.yen_5,
            yen_1: userMoney.yen_1,
          };
  
          Object.keys(selectedMoney).forEach((key) => {
            userMoneyUpdate[key] -= selectedMoney[key];
          });
  
          const changeArray = [];
          const denominations = [10000, 5000, 1000, 500, 100, 50, 10, 5, 1];
  
          connection.query('SELECT * FROM Money', (moneyErr, moneyResults) => {
            if (moneyErr) {
              return connection.rollback(() => {
                res.status(500).json({ error: 'Failed to retrieve casher data' });
              });
            }
  
            const casherUpdate = {};
            moneyResults.forEach((row) => {
              casherUpdate[row.value] = row.quantity;
            });
                      // 支払ったお金をキャッシャーに加算する処理を追加
            Object.keys(selectedMoney).forEach((key) => {
              const denom = parseInt(key.replace('yen_', ''));
              if (casherUpdate[denom] !== undefined) {
                casherUpdate[denom] += selectedMoney[key]; // 支払った金額をキャッシャーに加算
              } else {
                casherUpdate[denom] = selectedMoney[key]; // 新しい金額の場合は初期化
              }
            });
            //お釣りの処理
            for (let i = 0; i < denominations.length; i++) {
              const denom = denominations[i];
              const changeCount = Math.floor(change / denom);
  
              if (changeCount > 0) {
                if (casherUpdate[denom] >= changeCount) {
                  casherUpdate[denom] -= changeCount;
                  changeArray.push({ denom, count: changeCount });
                  change -= changeCount * denom;
                } else if (casherUpdate[denom] > 0) {
                  change -= casherUpdate[denom] * denom;
                  changeArray.push({ denom, count: casherUpdate[denom] });
                  casherUpdate[denom] = 0;
                }
              }
            }
            console.log('Casher update before database update:', casherUpdate);
            console.log('Remaining change after processing:', change);
  
            if (change > 0) {
              return connection.rollback(() => {
                res.status(400).json({ error: 'Insufficient change in casher' });
              });
            }
  
            changeArray.forEach((item) => {
              userMoneyUpdate[`yen_${item.denom}`] += item.count;
            });
  
            const casherUpdates = Object.keys(casherUpdate).map((denom) => {
              return new Promise((resolve, reject) => {
                connection.query(
                  'UPDATE Money SET quantity = ? WHERE value = ?',
                  [casherUpdate[denom], denom],
                  (updateErr, results) => {
                    if (updateErr) {
                      console.error('Failed to update casher money for denomination:', denom, updateErr);
                      return reject(updateErr);
                    }
                    // クエリが成功した場合のログを追加
                    console.log('Updated casher money for denomination:', denom, 'with quantity:', casherUpdate[denom]);
                    console.log('SQL affected rows:', results.affectedRows); // 影響を受けた行数を確認
                    resolve();
                  }
                );
              });
            });
            
  
            Promise.all(casherUpdates)
              .then(() => {
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
                  
                    // コミット後にデータベースの内容を再確認
                    connection.query('SELECT * FROM Money', (checkErr, results) => {
                      if (checkErr) {
                        console.error('Failed to retrieve updated Money data:', checkErr);
                      } else {
                        console.log('Updated Money data after commit:', results);
                      }
                      res.json({ message: 'Purchase successful', change: changeArray });
                    });
                  });                  
                });
              })
              .catch((err) => {
                return connection.rollback(() => {
                  console.error('Transaction rolled back due to insufficient change or another error');
                  res.status(500).json({ error: 'Failed to update casher money' });
                });
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
        return res.status(500).json({ error: 'Failed to add drink' });
      }
      res.json({ message: 'Drink added successfully' });
    });
  });

  app.post('/api/drinks/edit/:id', (req, res) => {
    console.log(req.body);  // リクエストボディをログに出力
    const { id } = req.params;
    const { name, type, cost, stock } = req.body;

    connection.query('UPDATE drinks SET name = ?, type = ?, cost = ?, stock = ? WHERE id = ?', [name, type, cost, stock, id], (error, results) => {
      if (error) {
        return res.status(500).json({ error: 'Failed to update drink' });
      }
      console.log(`Drink with ID ${id} updated. New values - Name: ${name}, Type: ${type}, Cost: ${cost}, Stock: ${stock}`);
      res.json({ message: 'Drink updated successfully' });
    });
  });

  app.get('/api/money', (req, res) => {
    connection.query('SELECT * FROM Money', (error, results) => {
      if (error) {
        res.status(500).json({ error: 'Database query failed' });
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
        return res.status(500).json({ error: 'Failed to update money' });
      }
      res.json({ message: 'Money updated successfully' });
    });
  });

  app.get('/api/user', (req, res) => {
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

function connectWithRetry() {
  const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost', // ホスト名を指定
    user: process.env.DB_USER || 'root',       // ユーザー名を指定
    password: process.env.DB_PASSWORD || 'password',  // パスワードを指定
    database: process.env.DB_NAME || 'vending_machine', // データベース名を指定
    charset: 'utf8mb4'  // エンコーディングを指定
  });

  connection.connect((err) => {
    if (err) {
      console.error('Failed to connect to MySQL, retrying in 5 seconds...', err);
      setTimeout(connectWithRetry, 5000);
    } else {
      console.log('Connected to MySQL');
      startServer(connection);
      serverStarted = true;  // サーバーが起動したことを記録
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

connectWithRetry();




