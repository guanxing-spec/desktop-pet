<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  text: string
}>()

const visible = ref(false)
const displayText = ref('')
let hideTimer: ReturnType<typeof setTimeout> | null = null

watch(() => props.text, (val) => {
  if (!val) {
    visible.value = false
    return
  }
  if (hideTimer) clearTimeout(hideTimer)
  displayText.value = val
  visible.value = true
  hideTimer = setTimeout(() => { visible.value = false }, 5000)
})
</script>

<template>
  <Transition name="bubble">
    <div v-if="visible && text" class="dialogue-bubble">
      <span class="bubble-text">{{ displayText }}</span>
      <div class="bubble-arrow" />
    </div>
  </Transition>
</template>

<style scoped>
.dialogue-bubble {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255,255,255,0.92);
  color: #222;
  padding: 10px 18px;
  border-radius: 16px;
  font-size: 14px;
  font-family: sans-serif;
  max-width: 240px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 90;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}
.bubble-text {
  line-height: 1.4;
}
.bubble-arrow {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 12px;
  height: 12px;
  background: rgba(255,255,255,0.92);
}
.bubble-enter-active,
.bubble-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.bubble-enter-from,
.bubble-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
