const mysql = require('mysql2/promise');
const express = require('express');
const cors = require('cors');
const app = express();
//DBから表示に必要なデータを呼び出す
async function selectAllEntities(connection, tableName, res) {
  try {
    const [results] = await connection.execute(`SELECT * FROM ${tableName}`);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: `Failed to query ${tableName}`, details: error.message });
  }
}
//DBから選択したデータを呼び出す
async function selectById(connection, tableName, id) {
  const [results] = await connection.execute(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
  return results;
}
//DBに新しいデータを追加する
async function insertEntity(connection, tableName, columns, values, res, successMessage, errorMessage) {
  const placeholders = columns.map(() => '?').join(', ');
  const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
  try {
    await connection.execute(query, values);
    res.json({ message: successMessage });
  } catch (error) {
    res.status(500).json({ error: errorMessage, details: error.message });
  }
}
//DBの要素を更新しメッセージを出力
async function updateEntity(connection, tableName, columns, values, id, res, successMessage, errorMessage) {
  const setClause = columns.map(col => `${col} = ?`).join(', ');
  const query = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;
  console.log('Executing query:', query, 'with values:', [...values, id]); // デバッグログ
  try {
    const [result] = await connection.execute(query, [...values, id]);
    console.log('Query result:', result); // 実行結果をログに出力
    res.json({ message: successMessage });
  } catch (error) {
    console.error('Query failed:', error.message); // エラーメッセージを出力
    res.status(500).json({ error: errorMessage, details: error.message });
  }
}

//DBのデータを複数行更新する
function updateDatabase(connection, tableName, updates) {
  const promises = updates.map(({ value, quantity }) =>
    connection.execute(
      `UPDATE ${tableName} SET quantity = ? WHERE value = ?`,
      [quantity, value]
    )
  );
  return Promise.all(promises);
}


async function startServer() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4'
  });

  app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true
  }));

  app.use(express.json());

  // ドリンク一覧取得
  app.get('/api/drinks', (req, res) => {
    selectAllEntities(connection, 'drinks', res);
  });

  // 購入処理
  app.post('/api/purchase', async (req, res) => {
    console.log('Request received at /api/purchase:', req.body);
    const { drinkId, selectedMoney } = req.body;

    if (!selectedMoney || typeof selectedMoney !== 'object') {
      return res.status(400).json({ error: '無効な金額データ' });
    }

    let userMoney;
    try {
      const [um] = await connection.execute('SELECT * FROM user_money');
      userMoney = um;
    } catch (err) {
      return res.status(500).json({ error: 'ユーザー所持金の取得に失敗しました', details: err.message });
    }

    // ユーザー所持金超過チェック
    for (const row of userMoney) {
      const coinValue = row.value;
      const userHas = row.quantity;
      const userInsert = selectedMoney[coinValue] || 0;
      if (userInsert > userHas) {
        return res.status(400).json({
          error: '投入金額が所持金を超えています',
          details: `硬貨${coinValue}円: 所持${userHas}枚に対し、${userInsert}枚要求されています`
        });
      }
    }

    await connection.beginTransaction();
    try {
      const drinkData = await selectById(connection, 'drinks', drinkId);
      const drink = drinkData[0];
      if (!drink || drink.stock <= 0) {
        return await handleRollback(connection, res, '在庫がありません');
      }

      // 支払い金額計算
      let totalMoney = 0;
      for (const [coin, count] of Object.entries(selectedMoney)) {
        totalMoney += parseInt(coin) * count;
      }

      if (totalMoney < drink.cost) {
        return await handleRollback(
          connection,
          res,
          '金額が足りません',
          `現在の投入金額: ${totalMoney}円、不足金額: ${drink.cost - totalMoney}円`
        );
      }

      // ユーザーのお金更新計算
      const userUpdate = {};
      userMoney.forEach((row) => {
        userUpdate[row.value] = row.quantity - (selectedMoney[row.value] || 0);
        if (userUpdate[row.value] < 0) {
          throw new Error(`硬貨が不足しています: ${row.value}`);
        }
      });

      // お釣り計算
      let change = totalMoney - drink.cost;
      const changeArray = [];
      const coins = [10000, 5000, 1000, 500, 100, 50, 10, 5, 1];
      const [casher] = await connection.execute('SELECT * FROM Money');
      const casherMap = {};
      casher.forEach((row) => (casherMap[row.value] = row.quantity));

      for (const coin of coins) {
        const neededChange = Math.floor(change / coin);
        if (neededChange > 0 && casherMap[coin] >= neededChange) {
          casherMap[coin] -= neededChange;
          change -= neededChange * coin;
          changeArray.push({ coin, count: neededChange });
        }
      }

      if (change > 0) {
        throw new Error('お釣りが足りません');
      }

      // 更新処理
      function convertUpdateData(obj) {
        return Object.entries(obj).map(([value, quantity]) => ({ value, quantity }));
      }
      
      await updateDatabase(connection, 'user_money', convertUpdateData(userUpdate));
      await updateDatabase(connection, 'Money', convertUpdateData(casherMap));

      await connection.execute('UPDATE drinks SET stock = stock - 1 WHERE id = ?', [drinkId]);

      await connection.commit();
      res.json({ message: '購入に成功しました', change: changeArray });
    } catch (error) {
      console.error(error.message);
      await handleRollback(connection, res, '購入処理に失敗しました', error.message);
    }
  });

  // ドリンク追加
  app.post('/api/drinks/add', async (req, res) => {
    console.log(req.body);
    const { name, type, cost, stock } = req.body;
    await insertEntity(
      connection,
      'drinks',
      ['name', 'type', 'cost', 'stock'],
      [name, type, cost, stock],
      res,
      '飲み物が正常に追加されました',
      '飲み物の追加に失敗しました'
    );
  });

  // ドリンク編集
  app.post('/api/drinks/edit/:id', async (req, res) => {
    const { id } = req.params;
    const { name, type, cost, stock } = req.body;
  
    // 必須フィールドのバリデーション
    if (!name || !type || cost == null || stock == null) {
      return res.status(400).json({ error: '必要なデータが不足しています' });
    }
  
    if (!['cold', 'hot'].includes(type)) {
      return res.status(400).json({ error: 'typeの値が不正です' });
    }
  
    await updateEntity(
      connection,
      'drinks',
      ['name', 'type', 'cost', 'stock'],
      [name, type, cost, stock],
      id,
      res,
      '飲み物が正常に更新されました',
      '飲み物の更新に失敗しました'
    );
  });
  

  // Money一覧取得
  app.get('/api/money', (req, res) => {
    selectAllEntities(connection, 'Money', res);
  });

  // Money編集
  app.post('/api/money/edit/:id', async (req, res) => {
    console.log(req.body);
    const { id } = req.params;
    const { value, quantity } = req.body;
    await updateEntity(
      connection,
      'Money',
      ['value', 'quantity'],
      [value, quantity],
      id,
      res,
      'お金が正常に更新されました',
      'お金の更新に失敗しました'
    );
  });

  // ユーザー所持金一覧取得
  app.get('/api/user_money', (req, res) => {
    selectAllEntities(connection, 'user_money', res);
  });

  // ユーザー所持金編集
  app.post('/api/user_money/edit/:id', async (req, res) => {
    console.log(req.body);
    const { id } = req.params;
    const { value, quantity } = req.body;
    await updateEntity(
      connection,
      'user_money',
      ['value', 'quantity'],
      [value, quantity],
      id,
      res,
      'ユーザーの所持金が正常に更新されました',
      'ユーザーの所持金の更新に失敗しました'
    );
  });

  // ヘルスチェック
  app.get('/healthcheck', (req, res) => {
    res.status(200).send('OK');
  });

  app.listen(3001, () => {
    console.log('APIサーバーが http://localhost:3001 で稼働中です');
  });
}

startServer().catch(err => {
  console.error('サーバー起動中にエラーが発生しました:', err);
});
