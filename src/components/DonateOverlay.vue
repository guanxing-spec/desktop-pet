<script setup lang="ts">
const emit = defineEmits<{ close: [] }>()

const platforms = [
  { name: '爱发电', url: 'https://afdian.com/a/your-page', desc: '请作者喝杯咖啡 ☕' },
  { name: 'Buy Me a Coffee', url: 'https://buymeacoffee.com/your-page', desc: 'Support on BMC' },
]

function openUrl(url: string) {
  window.open(url, '_blank')
}
</script>

<template>
  <div class="donate-overlay" @click.self="emit('close')">
    <div class="donate-card">
      <h3>支持作者</h3>
      <p class="subtitle">如果这只小猫让你开心了，欢迎投喂</p>
      <button
        v-for="p in platforms"
        :key="p.name"
        class="donate-btn"
        @click="openUrl(p.url)"
      >
        <span class="btn-name">{{ p.name }}</span>
        <span class="btn-desc">{{ p.desc }}</span>
      </button>
      <button class="close-btn" @click="emit('close')">关闭</button>
    </div>
  </div>
</template>

<style scoped>
.donate-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.donate-card {
  background: rgba(30, 30, 30, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 24px;
  min-width: 220px;
  text-align: center;
}
h3 {
  margin: 0 0 4px;
  font-size: 18px;
  color: #fff;
  font-weight: bold;
}
.subtitle {
  margin: 0 0 16px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}
.donate-btn {
  display: block;
  width: 100%;
  padding: 10px;
  margin-bottom: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  cursor: pointer;
  text-align: center;
}
.donate-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}
.btn-name {
  display: block;
  font-size: 15px;
  font-weight: bold;
}
.btn-desc {
  display: block;
  font-size: 11px;
  opacity: 0.6;
  margin-top: 2px;
}
.close-btn {
  margin-top: 8px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  font-size: 13px;
}
.close-btn:hover {
  color: rgba(255, 255, 255, 0.7);
}
</style>
