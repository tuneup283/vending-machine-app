<template>
  <div>
    <h1>商品管理ページ</h1>
        <!-- 管理ページへの遷移ボタン -->
        <nuxt-link to="/">
          <button>商品ページへ</button>
        </nuxt-link>
        <nuxt-link to="/admin_money">
          <button>売上・釣り銭管理</button>
        </nuxt-link>
    <!-- 商品の追加フォーム -->
    <form @submit.prevent="addDrink">
      <input v-model="newDrink.name" placeholder="商品名" />
      <input v-model="newDrink.type" placeholder="保存方法"/>
      <input v-model.number="newDrink.cost" placeholder="価格" type="number" />
      <input v-model.number="newDrink.stock" placeholder="在庫数" type="number" />
      <button type="submit">商品を追加</button>
    </form>

    <h2>既存の商品一覧</h2>
    <div v-for="drink in drinks" :key="drink.id">
      <p>{{ drink.name }} - ¥{{ drink.cost }} - 在庫: {{ drink.stock }}</p>
      <form @submit.prevent="editDrink(drink.id)">
        <input v-model="drink.name" placeholder="商品名" />
        <input v-model="drink.type" placeholder="保存方法"/>
        <input v-model.number="drink.cost" placeholder="価格" type="number" />
        <input v-model.number="drink.stock" placeholder="在庫数" type="number" />
        <button type="submit">商品を編集</button>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      newDrink: {
        name: '',
        type: '',
        cost: 0,
        stock: 0,
      },
      drinks: []
    };
  },
  async mounted() {
    await this.fetchDrinks();
  },
  methods: {
    async fetchDrinks() {
      try {
        const response = await fetch('http://localhost:3001/api/drinks');
        this.drinks = await response.json();
      } catch (error) {
        console.error('ドリンクの同期に失敗しました', error);
      }
    },
    async addDrink() {
      try {
        await fetch('http://localhost:3001/api/drinks/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.newDrink),
        });
        await this.fetchDrinks();
        this.newDrink = { name: '',  type: '',  cost: 0, stock: 0 };
      } catch (error) {
        console.error('ドリンクの追加に失敗しました', error);
      }
    },
    async editDrink(id) {
      try {
        const drink = this.drinks.find(d => d.id === id);
        await fetch(`http://localhost:3001/api/drinks/edit/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(drink),
        });
        await this.fetchDrinks();
      } catch (error) {
        console.error('ドリンクの変更に失敗しました', error);
      }
    }
  }
};
</script>
