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
async function buy(drinkId, productCost, stock, payment) {
  // 元のデータを取得
  await getOriginalData(drinkId);

  const testData = {
    drinkId: drinkId,
    selectedMoney: payment
  };

  console.log('テストデータ:', testData);

  try {
    // /api/purchase エンドポイントへのPOSTリクエスト
    const response = await fetch('http://localhost:3001/api/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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
      console.log('購入失敗: ', data.error);
      if (data.details) {
        console.log('詳細: ', data.details);
      }
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

buy(2,150,10,{"1":150,"5":0,"10":0,"50":0,"100":0,"500":0,"1000":0,"5000":0,"10000":0})
