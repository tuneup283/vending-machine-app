<template>
  <div :class="['drink-item', { 'out-of-stock': drink.stock === 0 }]">
    <h3>{{ drink.name }}</h3>
    <p>種類: {{ drink.type }}</p>
    <p>価格: ¥{{ drink.cost }}</p>
    <button @click="purchaseDrink" :disabled="isPurchasing || drink.stock === 0">購入</button>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from '@nuxtjs/composition-api'

export default defineComponent({
  props: {
    drink: {
      type: Object,
      required: true
    }
  },
  setup() {
    const isPurchasing = ref(false)

    return {
      isPurchasing
    }
  },
  methods: {
    purchaseDrink() {
      this.isPurchasing = true
      this.$emit('purchase', this.drink)
      this.isPurchasing = false
    }
  }
})
</script>

<style scoped>
.drink-item {
  border: 1px solid #ccc;
  padding: 16px;
  margin-bottom: 16px;
  border-radius: 8px;
  text-align: center;
}

.drink-item.out-of-stock {
  background-color: #f0f0f0; /* Grey background for out-of-stock items */
}

button {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>