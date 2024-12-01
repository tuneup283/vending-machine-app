<template>
  <div>
    <h1>Vending Machine</h1>
      <!-- 管理ページへの遷移ボタン -->
      <nuxt-link to="/admin">
        <button>管理ページへ</button>
      </nuxt-link>
    <div class="money-container">
      <div v-if="userMoney">
      <h2>Your Money:</h2>
      <p>10000 yen bills: {{ userMoney.yen_10000 }}</p>
      <p>5000 yen bills: {{ userMoney.yen_5000 }}</p>
      <p>1000 yen bills: {{ userMoney.yen_1000 }}</p>
      <p>500 yen coins: {{ userMoney.yen_500 }}</p>
      <p>100 yen coins: {{ userMoney.yen_100 }}</p>
      <p>50 yen coins: {{ userMoney.yen_50 }}</p>
      <p>10 yen coins: {{ userMoney.yen_10 }}</p>
      <p>5 yen coins: {{ userMoney.yen_5 }}</p>
      <p>1 yen coins: {{ userMoney.yen_1 }}</p>
      <h3>Total Money: ¥{{ totalMoney }}</h3> <!-- 合計金額を表示 -->
    </div>
    <div v-if="casherMoney.length">
      <h2>Your Money:</h2>
      <div v-for="money in casherMoney" :key="money.id">
        <p>¥{{ money.value }} - {{ money.quantity }}枚</p>
      </div>
      <h3>Total Money: ¥{{ totalCasherMoney }}</h3> <!-- 合計金額を表示 -->
    </div>
    </div>
    
    <div v-if="selectedMoney">
      <h2>Select Money to Use:</h2>
      <div>
        <label>10000 yen bills: </label>
        <input type="number" v-model.number="selectedMoney.yen_10000" min="0" max="userMoney.yen_10000" />
      </div>
      <div>
        <label>5000 yen bills: </label>
        <input type="number" v-model.number="selectedMoney.yen_5000" min="0" max="userMoney.yen_5000" />
      </div>
      <div>
        <label>1000 yen bills: </label>
        <input type="number" v-model.number="selectedMoney.yen_1000" min="0" max="userMoney.yen_1000" />
      </div>
      <div>
        <label>500 yen coins: </label>
        <input type="number" v-model.number="selectedMoney.yen_500" min="0" max="userMoney.yen_500" />
      </div>
      <div>
        <label>100 yen coins: </label>
        <input type="number" v-model.number="selectedMoney.yen_100" min="0" max="userMoney.yen_100" />
      </div>
      <div>
        <label>50 yen coins: </label>
        <input type="number" v-model.number="selectedMoney.yen_50" min="0" max="userMoney.yen_50" />
      </div>
      <div>
        <label>10 yen coins: </label>
        <input type="number" v-model.number="selectedMoney.yen_10" min="0" max="userMoney.yen_10" />
      </div>
      <div>
        <label>5 yen coins: </label>
        <input type="number" v-model.number="selectedMoney.yen_5" min="0" max="userMoney.yen_5" />
      </div>
      <div>
        <label>1 yen coins: </label>
        <input type="number" v-model.number="selectedMoney.yen_1" min="0" max="userMoney.yen_1" />
      </div>
    </div>

    <div v-if="drinks.length">
      <div v-for="drink in drinks" :key="drink.id">
        <DrinkList :drink="drink" @purchase="handlePurchase" />
      </div>
    </div>
    <div v-else>
      <p>Loading...</p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from '@nuxtjs/composition-api'
import DrinkList from '~/components/DrinkList.vue'
import axios from 'axios'

interface Drink {
  id: number;
  name: string;
  type: string;
  cost: number;
}

interface UserMoney {
  yen_10000: number;
  yen_5000: number;
  yen_1000: number;
  yen_500: number;
  yen_100: number;
  yen_50: number;
  yen_10: number;
  yen_5: number;
  yen_1: number;
}
interface Money {
  id: number;
  value: number;
  quantity: number;
}
export default defineComponent({
  components: {
    DrinkList
  },
  setup() {
    const drinks = ref<Drink[]>([])
    const userMoney = ref<UserMoney | null>(null)
    const selectedMoney = ref<UserMoney>({
      yen_10000: 0,
      yen_5000: 0,
      yen_1000: 0,
      yen_500: 0,
      yen_100: 0,
      yen_50: 0,
      yen_10: 0,
      yen_5: 0,
      yen_1: 0
    })
    const casherMoney = ref<Money[]>([]);

    const totalCasherMoney = computed(() => {
      return casherMoney.value.reduce((total, money) => {
        return total + (money.value * money.quantity);
      }, 0);
    });
    const totalMoney = computed(() => {
      if (!userMoney.value) return 0; // userMoneyがnullの場合は0を返す
      return (
        (userMoney.value.yen_10000 || 0) * 10000 +
        (userMoney.value.yen_5000 || 0) * 5000 +
        (userMoney.value.yen_1000 || 0) * 1000 +
        (userMoney.value.yen_500 || 0) * 500 +
        (userMoney.value.yen_100 || 0) * 100 +
        (userMoney.value.yen_50 || 0) * 50 +
        (userMoney.value.yen_10 || 0) * 10 +
        (userMoney.value.yen_5 || 0) * 5 +
        (userMoney.value.yen_1 || 0) * 1
      );
    });

    onMounted(async () => {
      try {
        const [drinksResponse, moneyResponse] = await Promise.all([
          axios.get('http://localhost:3001/api/drinks', {
            withCredentials: true
          }),
          axios.get('http://localhost:3001/api/user', {
            withCredentials: true
          })
        ]);
        const casherResponse = await axios.get('http://localhost:3001/api/money', { withCredentials: true });
        casherMoney.value = casherResponse.data;
        drinks.value = drinksResponse.data;
        userMoney.value = moneyResponse.data;
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    })

    return {
      drinks,
      userMoney,
      selectedMoney,
      totalMoney, // 合計金額を返す
      casherMoney,
      totalCasherMoney
    }
  },
  methods: {
    async handlePurchase(drink: Drink) {
      if (!this.userMoney) {
        alert("User money data is not available");
        return;
      }

      try {
        const response = await axios.post('http://localhost:3001/api/purchase', {
          userId: 1,  // ユーザーIDを指定
          drinkId: drink.id,
          selectedMoney: this.selectedMoney
        }, {
          withCredentials: true
        });

        alert(`Purchase successful. Your change: ${JSON.stringify(response.data.change)}`);
        
        // ユーザーの所持金を再取得して更新
        const moneyResponse = await axios.get('http://localhost:3001/api/user', {
          withCredentials: true
        });
        this.userMoney = moneyResponse.data;
        const casherResponse = await axios.get('http://localhost:3001/api/money', {
          withCredentials: true
        });
        this.casherMoney = casherResponse.data;

      } catch (error) {
        console.error("Failed to purchase:", error);
        alert("Failed to purchase");
      }
    }
  }
})
</script>

<style scoped>
h1 {
  text-align: center;
}

h2, h3 {
  text-align: center;
  margin: 10px 0;
}

p {
  text-align: center;
}

input {
  width: 50px;
  margin: 5px;
}

.money-container {
  display: flex;
  justify-content: space-around;
  align-items: flex-start;
  margin: 20px 0;
}

.money-section {
  width: 45%; /* 各セクションの幅を設定 */
}
</style>
