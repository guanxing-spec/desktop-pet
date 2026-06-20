<script setup lang="ts">
import { computed } from 'vue'
import type { InventoryItem } from '../composables/useInventory'

const props = defineProps<{
  items: InventoryItem[]
}>()

const emit = defineEmits<{
  use: [item: InventoryItem]
  close: []
}>()

const categories = computed(() => {
  const map: Record<string, { label: string; items: InventoryItem[] }> = {
    food: { label: '🍽️ 食物', items: [] },
    drink: { label: '🥤 饮料', items: [] },
    medicine: { label: '💊 药品', items: [] },
    gift: { label: '🎁 礼物', items: [] },
  }
  for (const item of props.items) {
    if (map[item.type]) map[item.type].items.push(item)
  }
  return Object.values(map).filter((c) => c.items.length > 0)
})
</script>

<template>
  <div class="inv-overlay" @click.self="$emit('close')">
    <div class="inv-panel">
      <div class="inv-header">
        <span class="inv-title">🎒 背包</span>
        <span class="inv-count">{{ items.length }} 种</span>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>
      <div v-if="items.length === 0" class="inv-empty">背包空空如也……去商店买点东西吧</div>
      <div v-for="cat in categories" :key="cat.label" class="inv-section">
        <div class="section-label">{{ cat.label }}</div>
        <div class="inv-list">
          <button
            v-for="item in cat.items"
            :key="item.id"
            class="inv-item"
            @click="emit('use', item)"
          >
            <span class="item-emoji">{{ item.emoji }}</span>
            <span class="item-name">{{ item.name }}</span>
            <span class="item-qty">×{{ item.quantity }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inv-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  pointer-events: auto;
}
.inv-panel {
  width: 300px;
  max-height: 70vh;
  background: rgba(25,25,35,0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 16px;
  color: #eee;
  font-family: sans-serif;
  overflow-y: auto;
}
.inv-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
.inv-title {
  font-size: 16px;
  font-weight: 700;
  flex: 1;
}
.inv-count {
  font-size: 12px;
  color: #888;
}
.close-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 18px;
}
.close-btn:hover { color: #fff; }
.inv-empty {
  text-align: center;
  color: #666;
  padding: 32px 0;
  font-size: 14px;
}
.inv-section {
  margin-bottom: 12px;
}
.section-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.inv-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.inv-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  cursor: pointer;
  color: #ddd;
  font-size: 14px;
  text-align: left;
  transition: background 0.15s;
}
.inv-item:hover {
  background: rgba(99,102,241,0.2);
}
.item-emoji { font-size: 18px; }
.item-name { flex: 1; }
.item-qty {
  color: #a5b4fc;
  font-size: 13px;
  font-weight: 600;
}
</style>
