<template>
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
        <tr v-for="money in userMoney" :key="money.id">
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
    userMoney: {
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

<style scoped>
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
</style>
