<template>
  <div>
    <h1>Vending Machine</h1>
    <div v-if="drinks.length">
      <div v-for="drink in drinks" :key="drink.id">
        <DrinkItem :drink="drink" @purchase="handlePurchase" />
      </div>
    </div>
    <div v-else>
      <p>Loading...</p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from '@nuxtjs/composition-api'
import DrinkItem from '~/components/DrinkItem.vue'
import axios from 'axios'

interface Drink {
  id: number;
  name: string;
  type: string;
  temperature: string;
}

export default defineComponent({
  components: {
    DrinkItem
  },
  setup() {
    const drinks = ref<Drink[]>([])

    onMounted(async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/drinks', {
          withCredentials: true  // ここでクッキーなどの認証情報を含める設定をしています
        });
        drinks.value = response.data;
      } catch (error) {
        console.error("Failed to fetch drinks:", error);
      }
    })

    return {
      drinks
    }
  },
  methods: {
    handlePurchase(drink: Drink) {
      alert(`You have purchased: ${drink.name} (${drink.temperature})`)
    }
  }
})
</script>

<style scoped>
h1 {
  text-align: center;
}
</style>
