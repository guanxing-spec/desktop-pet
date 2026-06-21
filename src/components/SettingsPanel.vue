<script setup lang="ts">
import { ref, watch } from 'vue'
import { load, type Store } from '@tauri-apps/plugin-store'

const props = defineProps<{
  showFps?: boolean
  scaleFactor?: number
  autoBehavior?: boolean
}>()

const emit = defineEmits<{
  close: []
  'update:showFps': [value: boolean]
  'update:scaleFactor': [value: number]
  'update:autoBehavior': [value: boolean]
}>()

// Settings state
const decayEnabled = ref(true)
const decayIntervalMs = ref(30_000)
const autoSaveIntervalMs = ref(10_000)
let _store: Store | null = null

const presets = [
  { label: '正常', interval: 30_000 },
  { label: '休闲', interval: 60_000 },
  { label: '挂机', interval: 120_000 },
]

async function loadSettings() {
  try {
    _store = await load('settings.json', { defaults: { settings: {} } })
    const raw = await _store.get<Record<string, unknown>>('settings')
    if (raw) {
      if (typeof raw.decayEnabled === 'boolean') decayEnabled.value = raw.decayEnabled
      if (typeof raw.decayIntervalMs === 'number') decayIntervalMs.value = raw.decayIntervalMs
      if (typeof raw.autoSaveIntervalMs === 'number') autoSaveIntervalMs.value = raw.autoSaveIntervalMs
    }
  } catch { /* ignore */ }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
async function saveSettings() {
  if (!_store) return
  try {
    await _store.set('settings', {
      decayEnabled: decayEnabled.value,
      decayIntervalMs: decayIntervalMs.value,
      autoSaveIntervalMs: autoSaveIntervalMs.value,
    })
    await _store.save()
  } catch { /* ignore */ }
}

function markDirty() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(saveSettings, 500)
}

watch(decayEnabled, markDirty)
watch(decayIntervalMs, markDirty)

function setPreset(ms: number) {
  decayIntervalMs.value = ms
}

loadSettings()
</script>

<template>
  <div class="settings-overlay" @click.self="$emit('close')">
    <div class="settings-panel">
      <div class="settings-header">
        <span class="settings-title">⚙️ 设置</span>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="setting-group">
        <div class="setting-row">
          <span class="setting-label">显示 FPS</span>
          <label class="toggle">
            <input type="checkbox" :checked="showFps" @change="$emit('update:showFps', ($event.target as HTMLInputElement).checked)" />
            <span class="toggle-slider" />
          </label>
        </div>
        <div class="setting-hint">在右上角显示实时渲染帧率</div>
      </div>

      <div class="setting-group">
        <div class="setting-row">
          <span class="setting-label">自动行为</span>
          <label class="toggle">
            <input type="checkbox" :checked="autoBehavior" @change="$emit('update:autoBehavior', ($event.target as HTMLInputElement).checked)" />
            <span class="toggle-slider" />
          </label>
        </div>
        <div class="setting-hint">桌宠随机行走、爬墙、飞行</div>
      </div>

      <div class="setting-group">
        <div class="setting-row">
          <span class="setting-label">宠物缩放</span>
          <span class="setting-val">{{ scaleFactor?.toFixed(1) ?? '1.0' }}x</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          :value="scaleFactor ?? 1.0"
          class="slider"
          @input="$emit('update:scaleFactor', Number(($event.target as HTMLInputElement).value))"
        />
      </div>

      <div class="setting-group">
        <div class="setting-row">
          <span class="setting-label">数值衰减</span>
          <label class="toggle">
            <input v-model="decayEnabled" type="checkbox" />
            <span class="toggle-slider" />
          </label>
        </div>
        <div class="setting-hint">关闭后属性不再自动变化，纯装饰模式</div>
      </div>

      <div class="setting-group" v-if="decayEnabled">
        <div class="setting-row">
          <span class="setting-label">衰减速度</span>
          <span class="setting-val">{{ (decayIntervalMs / 1000).toFixed(0) }}秒/次</span>
        </div>
        <div class="preset-row">
          <button
            v-for="p in presets"
            :key="p.label"
            class="preset-btn"
            :class="{ active: decayIntervalMs === p.interval }"
            @click="setPreset(p.interval)"
          >{{ p.label }}</button>
        </div>
        <input
          type="range"
          min="10"
          max="120"
          :value="decayIntervalMs / 1000"
          class="slider"
          @input="decayIntervalMs = Number(($event.target as HTMLInputElement).value) * 1000"
        />
      </div>

      <div class="setting-group">
        <div class="setting-row">
          <span class="setting-label">快捷键说明</span>
        </div>
        <div class="shortcut-list">
          <div v-for="s in shortcuts" :key="s.key" class="shortcut-row">
            <kbd>{{ s.key }}</kbd>
            <span>{{ s.desc }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
const shortcuts = [
  { key: 'Ctrl+Shift+S', desc: '统计面板' },
  { key: 'Ctrl+Shift+F', desc: '商店' },
  { key: 'Ctrl+Shift+W', desc: '打工' },
  { key: 'Ctrl+Shift+Z', desc: '学习' },
  { key: 'Ctrl+Shift+T', desc: '睡觉/起床' },
  { key: 'Ctrl+Shift+M', desc: '鼠标穿透' },
  { key: 'Ctrl+Shift+B', desc: '弹幕输入' },
  { key: 'Ctrl+Shift+D', desc: '捐赠' },
  { key: 'Ctrl+Shift+,', desc: '设置' },
]
</script>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  pointer-events: auto;
}
.settings-panel {
  width: 340px;
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
.settings-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.settings-title {
  font-size: 16px;
  font-weight: 700;
  flex: 1;
}
.close-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 18px;
}
.close-btn:hover { color: #fff; }
.setting-group {
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.setting-group:last-child { border: none; margin-bottom: 0; padding-bottom: 0; }
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.setting-label {
  font-size: 14px;
  font-weight: 500;
}
.setting-hint {
  font-size: 11px;
  color: #888;
  margin-top: 2px;
}
.setting-val {
  font-size: 13px;
  color: #a5b4fc;
  font-variant-numeric: tabular-nums;
}
.preset-row {
  display: flex;
  gap: 6px;
  margin: 8px 0;
}
.preset-btn {
  flex: 1;
  padding: 6px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  color: #bbb;
  font-size: 13px;
  cursor: pointer;
  text-align: center;
}
.preset-btn.active {
  background: rgba(99,102,241,0.3);
  border-color: #6366f1;
  color: #fff;
}
.slider {
  width: 100%;
  accent-color: #6366f1;
}
.toggle {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
}
.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}
.toggle-slider {
  position: absolute;
  inset: 0;
  background: #444;
  border-radius: 22px;
  transition: background 0.2s;
  cursor: pointer;
}
.toggle-slider::before {
  content: '';
  position: absolute;
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
}
.toggle input:checked + .toggle-slider { background: #6366f1; }
.toggle input:checked + .toggle-slider::before { transform: translateX(18px); }
.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.shortcut-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #bbb;
}
kbd {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 11px;
  color: #ddd;
  font-family: monospace;
  min-width: 100px;
  text-align: center;
}
</style>
