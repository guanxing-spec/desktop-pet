<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import PetCanvas from './components/PetCanvas.vue'

const crashed = ref(false)
const errorText = ref('')

onErrorCaptured((err) => {
  console.error('[桌面显眼包] 渲染异常:', err)
  crashed.value = true
  errorText.value = err instanceof Error ? err.message : String(err)
  return false
})
</script>

<template>
  <div v-if="crashed" class="crash-overlay">
    <p class="crash-icon">╮(╯_╰)╭</p>
    <p class="crash-title">啊哦，出错了...</p>
    <p class="crash-detail">{{ errorText }}</p>
    <button class="crash-btn" @click="crashed = false; errorText = ''">重试</button>
  </div>
  <PetCanvas v-else />
</template>

<style scoped>
.crash-overlay {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #C4B4A4;
  font-family: "Microsoft YaHei", sans-serif;
  user-select: none;
}
.crash-icon { font-size: 32px; margin-bottom: 8px; }
.crash-title { font-size: 18px; margin-bottom: 12px; }
.crash-detail {
  font-size: 12px; opacity: 0.6;
  max-width: 260px; text-align: center;
  margin-bottom: 16px; word-break: break-all;
}
.crash-btn {
  background: #7A6658; border: none; color: #fff;
  padding: 8px 24px; border-radius: 4px; cursor: pointer; font-size: 14px;
}
.crash-btn:hover { background: #8A7668; }
</style>
