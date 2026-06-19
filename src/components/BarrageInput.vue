<script setup lang="ts">
import { ref, onMounted } from 'vue'

const emit = defineEmits<{ submit: [text: string]; close: [] }>()
const text = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

onMounted(() => {
  inputRef.value?.focus()
})

function onSubmit() {
  if (text.value.trim()) {
    emit('submit', text.value.trim())
    text.value = ''
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
  if (e.key === 'Enter' && !e.isComposing) onSubmit()
}
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="input-box">
      <input
        ref="inputRef"
        v-model="text"
        placeholder="输入你的弹幕..."
        maxlength="40"
        @keydown="onKeydown"
      />
      <button class="go-btn" @click="onSubmit">发送</button>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 60px;
  z-index: 100;
}
.input-box {
  display: flex;
  gap: 8px;
  background: rgba(30, 30, 30, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px;
}
input {
  width: 220px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  font-size: 14px;
  outline: none;
}
input:focus {
  border-color: rgba(255, 255, 255, 0.4);
}
input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}
.go-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: #7a6658;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}
.go-btn:hover {
  background: #8a7668;
}
</style>
