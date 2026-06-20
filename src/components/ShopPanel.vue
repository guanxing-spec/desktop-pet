<script setup lang="ts">
import { FOODS, DRINKS, type ShopItem } from '../data/shop'

const props = defineProps<{
  money: number
}>()

const emit = defineEmits<{
  buy: [item: ShopItem]
  close: []
}>()

function canBuy(item: ShopItem): boolean {
  return props.money >= item.price
}
</script>

<template>
  <div class="shop-overlay" @click.self="$emit('close')">
    <div class="shop-panel">
      <div class="shop-header">
        <span class="shop-title">🛒 更好买</span>
        <span class="shop-money">¥{{ money }}</span>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>
      <div class="shop-section">
        <div class="section-label">🍽️ 食物</div>
        <div class="shop-list">
          <button
            v-for="item in FOODS"
            :key="item.id"
            class="shop-item"
            :class="{ disabled: !canBuy(item) }"
            :disabled="!canBuy(item)"
            @click="emit('buy', item)"
          >
            <span class="item-emoji">{{ item.emoji }}</span>
            <span class="item-name">{{ item.name }}</span>
            <span class="item-price">¥{{ item.price }}</span>
          </button>
        </div>
      </div>
      <div class="shop-section">
        <div class="section-label">🥤 饮料</div>
        <div class="shop-list">
          <button
            v-for="item in DRINKS"
            :key="item.id"
            class="shop-item"
            :class="{ disabled: !canBuy(item) }"
            :disabled="!canBuy(item)"
            @click="emit('buy', item)"
          >
            <span class="item-emoji">{{ item.emoji }}</span>
            <span class="item-name">{{ item.name }}</span>
            <span class="item-price">¥{{ item.price }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shop-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  pointer-events: auto;
}
.shop-panel {
  width: 320px;
  background: rgba(25,25,35,0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 16px;
  color: #eee;
  font-family: sans-serif;
  max-height: 80vh;
  overflow-y: auto;
}
.shop-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.shop-title {
  font-size: 16px;
  font-weight: 700;
  flex: 1;
}
.shop-money {
  font-size: 14px;
  color: #facc15;
  font-weight: 600;
}
.close-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 18px;
}
.close-btn:hover { color: #fff; }
.shop-section {
  margin-bottom: 14px;
}
.section-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.shop-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.shop-item {
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
  transition: background 0.15s;
  text-align: left;
}
.shop-item:hover:not(.disabled) {
  background: rgba(255,255,255,0.1);
}
.shop-item.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.item-emoji { font-size: 18px; }
.item-name { flex: 1; }
.item-price {
  color: #facc15;
  font-weight: 600;
}
</style>
