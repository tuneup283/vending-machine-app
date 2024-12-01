<template>
  <div>
    <h1>商品管理ページ</h1>
    <!-- 管理ページへの遷移ボタン -->
    <nuxt-link to="/">
      <button>商品ページへ</button>
    </nuxt-link>
    <nuxt-link to="/admin">
      <button>管理ページトップへ</button>
    </nuxt-link>
    <div class="admin-money">
      <div>
        <h2>釣り銭編集</h2>
        <div v-for="money in Money" :key="money.id">
          <p>¥{{ money.value }} - {{ money.quantity }}枚 </p>
          <form @submit.prevent="editMoney(money.id)">
            <input v-model.number="money.value" placeholder="金額" type="number" />
            <input v-model.number="money.quantity" placeholder="枚数" type="number" />
            <button type="submit">釣り銭を編集</button>
          </form>
        </div>
      </div>
      <div>
        <h2>所持金編集</h2>
        <div v-for="usermoney in userMoney" :key="usermoney.id">
          <p>¥{{ usermoney.value }} - {{ usermoney.quantity }}枚 </p>
          <form @submit.prevent="editUserMoney(usermoney.id)">
            <input v-model.number="usermoney.value" placeholder="金額" type="number" />
            <input v-model.number="usermoney.quantity" placeholder="枚数" type="number" />
            <button type="submit">所持金を編集</button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted } from 'vue';

export default defineComponent({
  setup() {
    const Money = ref([]);
    const userMoney = ref([]);

    // 釣り銭データを取得
    const fetchMoney = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/money');
        Money.value = await response.json();
      } catch (error) {
        console.error('釣り銭データの取得に失敗しました', error);
      }
    };

    // ユーザーの所持金データを取得
    const fetchUserMoney = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/user_money');
        userMoney.value = await response.json();
      } catch (error) {
        console.error('所持金データの取得に失敗しました', error);
      }
    };

    // 釣り銭データの編集
    const editMoney = async (id) => {
      try {
        const money = Money.value.find(d => d.id === id);
        await fetch(`http://localhost:3001/api/money/edit/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(money),
        });
        await fetchMoney();
      } catch (error) {
        console.error('釣り銭の編集に失敗しました', error);
      }
    };

    // 所持金データの編集
    const editUserMoney = async (id) => {
      try {
        const usermoney = userMoney.value.find(d => d.id === id);
        await fetch(`http://localhost:3001/api/user_money/edit/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(usermoney),
        });
        await fetchUserMoney();
      } catch (error) {
        console.error('所持金の編集に失敗しました', error);
      }
    };

    // 初回のマウント時にデータを取得
    onMounted(async () => {
      await fetchMoney();
      await fetchUserMoney();
    });

    return {
      Money,
      userMoney,
      editMoney,
      editUserMoney,
    };
  }
});
</script>

<style>
  .admin-money{
   display: flex;
   justify-content: space-around
  }
</style>