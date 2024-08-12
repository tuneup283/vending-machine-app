<template>
  <div>
    <h3>{{ drink.name }}</h3>
    <p>Type: {{ drink.type }}</p>
    <p>Temperature: {{ drink.temperature }}</p>
    <button @click="purchaseDrink">Purchase</button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from '@nuxtjs/composition-api'

export default defineComponent({
  props: {
    drink: {
      type: Object,
      required: true
    }
  },
  methods: {
    purchaseDrink() {
      this.$emit('purchase', this.drink)
    }
  }
})
</script>
