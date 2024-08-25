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
    <h2>釣り銭編集</h2>
    <div v-for="money in Money" :key="money.id">
      <p>¥{{ money.value }} - {{ money.quantity }}枚 </p>
      <form @submit.prevent="editmoney(money.id)">
        <input v-model.number="money.value" placeholder="金額" type="number" />
        <input v-model.number="money.quantity" placeholder="枚数" type="number" />
        <button type="submit">釣り銭を編集</button>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      Money: []
    };
  },
  async mounted() {
    await this.fetchMoney();
  },
  methods: {
    async fetchMoney() {
      try {
        const response = await fetch('http://localhost:3001/api/money');
        this.Money = await response.json();
      } catch (error) {
        console.error('Failed to fetch Money', error);
      }
    },
    async editmoney(id) {
      try {
        const money = this.Money.find(d => d.id === id);
        await fetch(`http://localhost:3001/api/money/edit/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(money),
        });
        await this.fetchMoney();
      } catch (error) {
        console.error('Failed to edit Money', error);
      }
    }
  }
};
</script>
