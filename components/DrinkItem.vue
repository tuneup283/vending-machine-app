<template>
  <div class="drink-item">
    <h3>{{ drink.name }}</h3>
    <p>Type: {{ drink.type }}</p>
    <p>Temperature: {{ drink.temperature }}</p>
    <p>Cost: ¥{{ drink.cost }}</p>
    <button @click="purchaseDrink" :disabled="isPurchasing">Purchase</button>
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
