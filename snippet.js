// DBの元の状態を保持する変数
let originalUserMoney = [];
let originalCasherMoney = [];
let originalDrinkData = {};

// DBの状態を取得する関数
async function getOriginalData(drinkId) {
  try {
    // ユーザーの所持金を取得
    const userResponse = await fetch('http://localhost:3001/api/user_money', { method: 'GET' });
    originalUserMoney = await userResponse.json();

    // キャッシャーの所持金を取得
    const casherResponse = await fetch('http://localhost:3001/api/money', { method: 'GET' });
    originalCasherMoney = await casherResponse.json();

    // 全ての飲み物データを取得してIDでフィルタリング
    const drinksResponse = await fetch('http://localhost:3001/api/drinks', { method: 'GET' });
    const drinksData = await drinksResponse.json();
    originalDrinkData = drinksData.find(drink => drink.id === drinkId);

    if (!originalDrinkData) {
      throw new Error(`ID ${drinkId} の飲み物が見つかりません`);
    }
  } catch (error) {
    console.error('元のデータ取得中にエラーが発生しました:', error);
  }
}

// DBの状態を復元する関数
async function restoreOriginalData(drinkId) {
  try {
    // ユーザーの所持金を復元
    for (let money of originalUserMoney) {
      await fetch(`http://localhost:3001/api/user_money/edit/${money.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value: money.value, quantity: money.quantity })
      });
    }

    // キャッシャーの所持金を復元
    for (let money of originalCasherMoney) {
      await fetch(`http://localhost:3001/api/money/edit/${money.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value: money.value, quantity: money.quantity })
      });
    }

    // 飲み物の在庫を復元
    await fetch(`http://localhost:3001/api/drinks/edit/${drinkId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: originalDrinkData.name,
        type: originalDrinkData.type,
        cost: originalDrinkData.cost,
        stock: originalDrinkData.stock
      })
    });

    console.log('データベースを元の状態に復元しました');
  } catch (error) {
    console.error('データベース復元中にエラーが発生しました:', error);
  }
}

// APIテストを行うbuy関数を定義
async function buy(drinkId, productCost, stock, payment, userMoney, casherMoney) {
  // 元のデータを取得
  await getOriginalData(drinkId);

  // 投入金額形式からデータベース用の形式に変換する関数
  function formatMoneyData(moneyObject) {
    return Object.entries(moneyObject).map(([value, quantity]) => ({
      value: parseInt(value), // 金額を整数に変換
      quantity: quantity      // 枚数
    }));
  }

  // テスト用の飲み物データを設定する関数
  async function setTestDrinkData(drinkId, name, type, cost, stock) {
    await fetch(`http://localhost:3001/api/drinks/edit/${drinkId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type, cost, stock })
    });
  }

  // ユーザーの所持金とキャッシャーの所持金を設定する関数
  async function setTestMoney(moneyObject, endpoint) {
    let id = 1; // IDは1から始まると仮定
  
    for (const [value, quantity] of Object.entries(moneyObject)) {
      await fetch(`http://localhost:3001/api/${endpoint}/edit/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: parseInt(value), quantity })
      });
      id++; // IDをインクリメント
    }
  }
  
  try {
    // ユーザーの所持金を設定
    if (userMoney) {
      console.log('ユーザーの所持金を設定中:', userMoney);
      await setTestMoney(userMoney, 'user_money');
    }

    // キャッシャーの所持金を設定
    if (casherMoney) {
      console.log('キャッシャーの所持金を設定中:', casherMoney);
      await setTestMoney(casherMoney, 'money');
    }

    // 飲み物データを設定
    if (productCost !== undefined && stock !== undefined) {
      console.log('テスト用飲み物データを設定中:', { drinkId, productCost, stock });
      await setTestDrinkData(drinkId, originalDrinkData.name, originalDrinkData.type, productCost, stock);
    }

    // テストデータ
    const testData = { drinkId: drinkId, selectedMoney: payment };
    console.log('テストデータ:', testData);

    // /api/purchase エンドポイントへのPOSTリクエスト
    const response = await fetch('http://localhost:3001/api/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    const contentType = response.headers.get('Content-Type');
    const text = await response.text();

    if (!contentType || !contentType.includes('application/json')) {
      console.error('JSON形式ではないレスポンスを受け取りました:', text);
      return;
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('レスポンスのパース中にエラーが発生しました:', e);
      console.log('レスポンス内容:', text);
      return;
    }

    if (response.status === 200) {
      console.log('購入成功: テスト成功');
      console.log('購入成功メッセージ:', data.message);
      console.log('お釣りの詳細:', data.change);
    } else if (response.status === 400) {
      console.log('購入失敗:', data.error);
      if (data.details) console.log('詳細:', data.details);
    } else {
      console.log('予期しないレスポンス:', response.status);
    }
  } catch (error) {
    console.error('APIリクエストエラー:', error);
  } finally {
    // エラーが発生しても必ず元のデータを復元
    try {
      await restoreOriginalData(drinkId);
      console.log('テスト実行後、データベースを元の状態に復元しました');
    } catch (restoreError) {
      console.error('データベース復元中にエラーが発生しました:', restoreError);
    }
  }
}


buy(
  2, // 飲み物ID
  150, // 商品の価格
  10, // 在庫数
  { "1": 150, "5": 0, "10": 0, "50": 0, "100": 0, "500": 0, "1000": 0, "5000": 0, "10000": 0 }, // 支払い
  { "1": 150, "5": 10, "10": 20, "50": 10, "100": 5, "500": 2, "1000": 1, "5000": 0, "10000": 0 }, // ユーザーの所持金
  { "1": 100, "5": 50, "10": 50, "50": 50, "100": 50, "500": 10, "1000": 5, "5000": 2, "10000": 1 } // キャッシャーの所持金
);

