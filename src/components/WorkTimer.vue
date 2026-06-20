<script setup lang="ts">
import { ref, onUnmounted, watch } from 'vue'

const props = defineProps<{
  active: boolean
  label: string
  durationMs: number
}>()

const emit = defineEmits<{
  complete: []
}>()

const progress = ref(0)
let startTime = 0
let raf = 0

function startTimer() {
  startTime = performance.now()
  progress.value = 0
  tick()
}

function tick() {
  if (!props.active) return
  const elapsed = performance.now() - startTime
  progress.value = Math.min(1, elapsed / props.durationMs)
  if (progress.value >= 1) {
    emit('complete')
    progress.value = 0
    return
  }
  raf = requestAnimationFrame(tick)
}

watch(() => props.active, (v) => {
  if (v) startTimer()
  else { progress.value = 0; cancelAnimationFrame(raf) }
})

onUnmounted(() => cancelAnimationFrame(raf))
</script>

<template>
  <div v-if="active" class="work-timer">
    <span class="work-label">{{ label }}</span>
    <div class="work-track">
      <div class="work-fill" :style="{ width: (progress * 100) + '%' }" />
    </div>
    <span class="work-pct">{{ Math.floor(progress * 100) }}%</span>
  </div>
</template>

<style scoped>
.work-timer {
  position: fixed;
  bottom: 130px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(6px);
  padding: 8px 18px;
  border-radius: 12px;
  pointer-events: none;
  z-index: 90;
  font-family: sans-serif;
}
.work-label {
  color: #ccc;
  font-size: 13px;
  white-space: nowrap;
}
.work-track {
  width: 140px;
  height: 8px;
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
  overflow: hidden;
}
.work-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  border-radius: 4px;
  transition: width 0.05s linear;
}
.work-pct {
  color: #a5b4fc;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  width: 36px;
  text-align: right;
}
</style>
