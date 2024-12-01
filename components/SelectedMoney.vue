<template>
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
</template>

<script>
export default {
  props: {
    selectedMoney: {
      type: Object,
      required: true,
    },
    getMaxQuantity: {
      type: Function,
      required: true,
    },
  },
};
</script>
