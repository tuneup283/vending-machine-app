<template>
  <div>
    <h1>自動販売機</h1>
    <nuxt-link to="/admin">
      <button>管理ページへ</button>
    </nuxt-link>

    <div v-if="drinks.length" class="items-column">
      <div v-for="drink in drinks" :key="drink.id">
        <DrinkList :drink="drink" @purchase="handlePurchase" />
      </div>
    </div>
    <div v-else>
      <p>読み込み中...</p>
    </div>

    <div class="money-container">
      <div v-if="userMoney.length">
        <h2>所持金：</h2>
        <table class="money-table">
          <thead>
            <tr>
              <th>金額</th>
              <th>枚数</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="usermoney in userMoney" :key="usermoney.id">
              <td>¥{{ usermoney.value }}</td>
              <td>{{ usermoney.quantity }} 枚</td>
            </tr>
          </tbody>
        </table>
        <h3>合計金額: ¥{{ totalUserMoney }}</h3>
      </div>

      <div v-if="selectedMoney">
        <h2>投入金額:</h2>
        <table class="money-table">
          <thead>
            <tr>
              <th>金額</th>
              <th>枚数</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(value, key) in selectedMoney" :key="key">
              <td>¥{{ key }}</td>
              <td><input type="number" v-model.number="selectedMoney[key]" min="0" :max="getMaxQuantity(key)" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="casherMoney.length">
        <h2>キャッシャー金額:</h2>
        <table class="money-table">
          <thead>
            <tr>
              <th>金額</th>
              <th>枚数</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="money in casherMoney" :key="money.id">
              <td>¥{{ money.value }}</td>
              <td>{{ money.quantity }} 枚</td>
            </tr>
          </tbody>
        </table>
        <h3>合計金額: ¥{{ totalCasherMoney }}</h3>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from '@nuxtjs/composition-api';
import axios from 'axios';
import DrinkList from '../components/DrinkList.vue';
import UserMoney from '../components/UserMoney.vue';
import SelectedMoney from '../components/SelectedMoney.vue';
import CasherMoney from '../components/CasherMoney.vue';

interface Drink {
  id: number;
  name: string;
  type: string;
  cost: number;
}

interface Money {
  id: number;
  value: number;
  quantity: number;
}


export default {
  components: {
    DrinkList,
    UserMoney,
    SelectedMoney,
    CasherMoney,
  },
  setup() {
    const drinks = ref<Drink[]>([]);
    const userMoney = ref<Money[]>([]);
    const casherMoney = ref<Money[]>([]);
    const selectedMoney = ref<Record<number, number>>({
      10000: 0,
      5000: 0,
      1000: 0,
      500: 0,
      100: 0,
      50: 0,
      10: 0,
      5: 0,
      1: 0,
    });

    const totalCasherMoney = computed(() =>
      casherMoney.value.reduce((total, money) => total + money.value * money.quantity, 0)
    );
    const totalUserMoney = computed(() =>
      userMoney.value.reduce((total, money) => total + money.value * money.quantity, 0)
    );
    const getMaxQuantity = (key: number) =>
      userMoney.value.find((money) => money.value === key)?.quantity || 0;

    const fetchData = async () => {
      try {
        const [drinksResponse, casherResponse, userResponse] = await Promise.all([
          axios.get('http://localhost:3001/api/drinks', { withCredentials: true }),
          axios.get('http://localhost:3001/api/money', { withCredentials: true }),
          axios.get('http://localhost:3001/api/user_money', { withCredentials: true }),
        ]);
        drinks.value = drinksResponse.data;
        casherMoney.value = casherResponse.data;
        userMoney.value = userResponse.data;
      } catch (error) {
        console.error('データの取得に失敗しました:', error);
      }
    };

    const handlePurchase = async (drink: Drink) => {
      try {
        const response = await axios.post(
          'http://localhost:3001/api/purchase',
          {
            userId: 1,
            drinkId: drink.id,
            selectedMoney: selectedMoney.value,
          },
          { withCredentials: true }
        );
        alert(`購入が成功しました。お釣り: ${JSON.stringify(response.data.change)}`);
        fetchData();
      } catch (error) {
        console.error('購入エラー:', error);
        alert('購入に失敗しました');
      }
    };

    onMounted(fetchData);

    return {
      drinks,
      userMoney,
      casherMoney,
      selectedMoney,
      totalUserMoney,
      totalCasherMoney,
      handlePurchase,
      getMaxQuantity,
    };
  },
};
</script>

<style scoped>
.items-column {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

.money-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
}

h1 {
  text-align: center;
}

button {
  margin-bottom: 20px;
}

.money-table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
}

.money-table th,
.money-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: center;
}

.money-table th {
  background-color: #f2f2f2;
}
.items-column>div{
  width: 15%;
}
</style>
