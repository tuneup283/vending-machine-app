const request = require('supertest');
const app = require('../server'); // 実際のアプリケーションのエンドポイント
let server;

beforeAll(() => {
  // サーバーを起動してsupertestがアクセスできるようにする
  server = app.listen(3002);  // テスト用にポートを指定
});

afterAll((done) => {
  // テストが終わったらサーバーを閉じる
  server.close(done);
});

describe('Vending Machine Purchase Tests', () => {
  
  // テストケース 1: ちょうど支払う場合
  test('Exact payment: 150 yen for a 150 yen drink', async () => {
    const response = await request(server)
      .post('/api/purchase')
      .send({
        userId: 1,
        drinkId: 1,
        selectedMoney: { yen_100: 1, yen_50: 1 }
      });
    expect(response.status).toBe(200);
    expect(response.body.change).toEqual([]);
  });

  // テストケース 2: 多く支払ってお釣りが出る場合（小額）
  test('Overpayment with change: 500 yen for a 150 yen drink', async () => {
    const response = await request(server)
      .post('/api/purchase')
      .send({
        userId: 1,
        drinkId: 1,
        selectedMoney: { yen_500: 1 }
      });
    expect(response.status).toBe(200);
    expect(response.body.change).toEqual([
      { denom: 100, count: 3 },
      { denom: 50, count: 1 }
    ]);
  });

  // テストケース 3: 多く支払ってお釣りが出る場合（複数の金額）
  test('Overpayment with mixed money: 300 yen for a 170 yen drink', async () => {
    const response = await request(server)
      .post('/api/purchase')
      .send({
        userId: 1,
        drinkId: 1,
        selectedMoney: { yen_100: 2, yen_50: 2 }
      });
    expect(response.status).toBe(200);
    expect(response.body.change).toEqual([
      { denom: 100, count: 1 },
      { denom: 10, count: 3 }
    ]);
  });

  // テストケース 4: 支払額が少ない場合
  test('Insufficient funds: 100 yen for a 200 yen drink', async () => {
    const response = await request(server)
      .post('/api/purchase')
      .send({
        userId: 1,
        drinkId: 2,
        selectedMoney: { yen_100: 1 }
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Insufficient funds');
  });

  // テストケース 5: キャッシャーにお釣りが不足している場合
  test('Insufficient change in casher', async () => {
    const response = await request(server)
      .post('/api/purchase')
      .send({
        userId: 1,
        drinkId: 1,
        selectedMoney: { yen_500: 1 }
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Insufficient change in casher');
  });

  // テストケース 6: 1円硬貨が複数含まれる場合
  test('Exact payment with small coins: 163 yen for a 163 yen drink', async () => {
    const response = await request(server)
      .post('/api/purchase')
      .send({
        userId: 1,
        drinkId: 1,
        selectedMoney: { yen_100: 1, yen_50: 1, yen_10: 1, yen_1: 3 }
      });
    expect(response.status).toBe(200);
    expect(response.body.change).toEqual([]);
  });

  // テストケース 7: キャッシャーがぴったりお釣りを返せる場合
  test('Exact change from casher: 500 yen for a 175 yen drink', async () => {
    const response = await request(server)
      .post('/api/purchase')
      .send({
        userId: 1,
        drinkId: 1,
        selectedMoney: { yen_500: 1 }
      });
    expect(response.status).toBe(200);
    expect(response.body.change).toEqual([
      { denom: 100, count: 3 },
      { denom: 50, count: 1 },
      { denom: 10, count: 2 },
      { denom: 5, count: 1 }
    ]);
  });

  // テストケース 8: 全ての金種が均等に使われる場合
  test('Overpayment with multiple coin types: 500 yen for a 183 yen drink', async () => {
    const response = await request(server)
      .post('/api/purchase')
      .send({
        userId: 1,
        drinkId: 1,
        selectedMoney: { yen_500: 1 }
      });
    expect(response.status).toBe(200);
    expect(response.body.change).toEqual([
      { denom: 100, count: 3 },
      { denom: 10, count: 1 },
      { denom: 5, count: 1 },
      { denom: 1, count: 2 }
    ]);
  });

  // テストケース 9: 釣り銭が全く不要な場合
  test('Exact payment: 1000 yen for a 1000 yen drink', async () => {
    const response = await request(server)
      .post('/api/purchase')
      .send({
        userId: 1,
        drinkId: 1,
        selectedMoney: { yen_1000: 1 }
      });
    expect(response.status).toBe(200);
    expect(response.body.change).toEqual([]);
  });

  // テストケース 10: 異常な金額（0円、負の値）
  test('Invalid payment: 0 yen or negative payment', async () => {
    const response = await request(server)
      .post('/api/purchase')
      .send({
        userId: 1,
        drinkId: 1,
        selectedMoney: { yen_100: 0 }
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid selectedMoney data');
  });

  // テストケース 11: 大額紙幣のみを使う場合
  test('Overpayment with large bills: 10000 yen for a 200 yen drink', async () => {
    const response = await request(server)
      .post('/api/purchase')
      .send({
        userId: 1,
        drinkId: 1,
        selectedMoney: { yen_10000: 1 }
      });
    expect(response.status).toBe(200);
    expect(response.body.change).toEqual([
      { denom: 5000, count: 1 },
      { denom: 1000, count: 4 },
      { denom: 500, count: 1 },
      { denom: 100, count: 3 }
    ]);
  });
});
