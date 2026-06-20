<script setup lang="ts">
import { computed } from 'vue'
import type { PetStatsData } from '../composables/usePetStats'

const props = defineProps<{
  stats: PetStatsData
  sleeping: boolean
}>()

defineEmits<{
  close: []
}>()

function barColor(v: number): string {
  if (v > 60) return '#4ade80'
  if (v > 30) return '#facc15'
  return '#ef4444'
}

const rows = computed(() => [
  { label: '等级', value: `Lv.${props.stats.level}`, color: '#a78bfa' },
  { label: '经验', value: `${Math.floor(props.stats.exp)}`, max: 0, raw: props.stats.exp / (50 * Math.pow(props.stats.level, 1.5)) },
  { label: '金钱', value: `¥${props.stats.money}`, color: '#facc15' },
  { label: '体力', max: 100, raw: props.stats.stamina },
  { label: '心情', max: 100, raw: props.stats.mood },
  { label: '饱腹', max: 100, raw: props.stats.hunger },
  { label: '口渴', max: 100, raw: props.stats.thirst },
  { label: '健康', max: 100, raw: props.stats.health, hidden: props.stats.health >= 95 },
  { label: '亲密度', max: 100, raw: props.stats.affinity },
])
</script>

<template>
  <div class="stats-panel" @click.stop>
    <div class="panel-header">
      <span class="panel-title">📊 状态</span>
      <span v-if="sleeping" class="sleep-badge">💤 睡觉中</span>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
    <div class="stats-list">
      <div v-for="r in rows" :key="r.label" class="stat-row" :class="{ hidden: r.hidden }">
        <span class="stat-label">{{ r.label }}</span>
        <template v-if="r.raw !== undefined">
          <div class="bar-track">
            <div
              class="bar-fill"
              :style="{ width: Math.min(100, Math.max(0, r.raw * 100)) + '%', background: barColor(r.raw * 100) }"
            />
          </div>
          <span class="stat-val">{{ Math.floor(Math.min(100, Math.max(0, r.raw * 100))) }}</span>
        </template>
        <span v-else class="stat-val">{{ r.value }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-panel {
  position: fixed;
  top: 12px;
  right: 12px;
  width: 220px;
  background: rgba(20, 20, 30, 0.88);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px;
  padding: 12px;
  color: #eee;
  font-size: 13px;
  font-family: sans-serif;
  pointer-events: auto;
  z-index: 100;
  user-select: none;
}
.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.panel-title {
  font-weight: 700;
  font-size: 14px;
  flex: 1;
}
.sleep-badge {
  font-size: 11px;
  background: #6366f1;
  padding: 2px 8px;
  border-radius: 10px;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%,100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.close-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
}
.close-btn:hover { color: #fff; }
.stats-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.stat-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.stat-row.hidden { display: none; }
.stat-label {
  width: 52px;
  font-size: 12px;
  color: #aaa;
  flex-shrink: 0;
}
.bar-track {
  flex: 1;
  height: 8px;
  background: rgba(255,255,255,0.08);
  border-radius: 4px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease, background 0.3s ease;
}
.stat-val {
  width: 30px;
  text-align: right;
  font-size: 12px;
  color: #ccc;
  font-variant-numeric: tabular-nums;
}
</style>
