<template>
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
    <h3>合計金額: ¥{{ total }}</h3>
  </div>
</template>

<script>
export default {
  props: {
    casherMoney: {
      type: Array,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
  },
};
</script>
