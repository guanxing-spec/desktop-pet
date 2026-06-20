<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { load } from '@tauri-apps/plugin-store'
import { usePetRenderer, type PetAction } from '../composables/usePetRenderer'
import { useDebouncedSave } from '../composables/useDebouncedSave'
import { useInteractionCounter } from '../composables/useInteractionCounter'
import { useLive2DRenderer, type Live2DMotion } from '../composables/useLive2DRenderer'
import { usePetStats } from '../composables/usePetStats'
import { getRandomBarrage } from '../barrage/barrage'
import { useCustomBarrages } from '../composables/useCustomBarrages'
import { setupTray, setPassThroughChecked } from '../composables/useTray'
import DonateOverlay from './DonateOverlay.vue'
import BarrageInput from './BarrageInput.vue'
import StatsPanel from './StatsPanel.vue'
import DialogueBubble from './DialogueBubble.vue'
import ShopPanel from './ShopPanel.vue'
import WorkTimer from './WorkTimer.vue'
import SettingsPanel from './SettingsPanel.vue'

const overlay = usePetRenderer()
const overlayCanvasRef = overlay.canvasRef
void overlayCanvasRef
const { start, stop, triggerDance, triggerAction, addBarrage, setMoveMode, notifyInteraction, setVisible, setMousePos, setActionCallback, setMouseCallback } = overlay

const { incrementClicks, incrementKeypresses } = useInteractionCounter()

const live2d = useLive2DRenderer()
const live2dCanvasRef = ref<HTMLCanvasElement | null>(null)

// --- Phase 2: cold-start tolerance ---
const isReady = ref(false)
const live2dError = ref<string | null>(null)

// --- click vs drag detection ---
const CLICK_THRESHOLD_SQ = 64
let ptrStart = { x: 0, y: 0 }
let ptrActive = false
let ptrDragging = false

const customBarrages = useCustomBarrages()
const showDonate = ref(false)
const showBarrageInput = ref(false)
const showStats = ref(false)

const petStats = usePetStats()
const dialogueText = ref('')
let dialogueTimer: ReturnType<typeof setInterval> | null = null
let decayTimer: ReturnType<typeof setInterval> | null = null

// Shop & work state
const showShop = ref(false)
const showSettings = ref(false)
const working = ref(false)
const studying = ref(false)
const WORK_DURATION = 10_000
const STUDY_DURATION = 8_000

// --- click-through / move mode toggle ---
const moveMode = ref(false)

function toggleMoveMode() {
  moveMode.value = !moveMode.value
  setMoveMode(moveMode.value)
  getCurrentWindow().setIgnoreCursorEvents(moveMode.value).catch(() => {})
  setPassThroughChecked(moveMode.value).catch(() => {})
}

// --- dragging (smart click vs drag) ---
function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  ptrStart = { x: e.clientX, y: e.clientY }
  ptrActive = true
  ptrDragging = false
}

function onPointerMove(e: PointerEvent) {
  setMousePos(e.clientX, e.clientY)
  if (!ptrActive || e.buttons !== 1) return
  const dx = e.clientX - ptrStart.x
  const dy = e.clientY - ptrStart.y
  if (dx * dx + dy * dy > CLICK_THRESHOLD_SQ) {
    ptrDragging = true
    ptrActive = false
    getCurrentWindow().startDragging().catch(() => {})
  }
}

function onPointerUp() {
  if (ptrActive && !ptrDragging) {
    if (isReady.value) {
      notifyInteraction()
      petStats.applyAction('pet')
      const d = petStats.getDialogue()
      if (d) dialogueText.value = d
      invoke('record_click').catch(() => {})
      incrementClicks().catch(() => {})
    }
  }
  ptrActive = false
  ptrDragging = false
}

// --- keyboard events + barrage scheduler ---
let lastBarrageTime = -5

function onKeyDown(e: KeyboardEvent) {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
    e.preventDefault()
    showDonate.value = !showDonate.value
    showBarrageInput.value = false
    return
  }
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'b') {
    e.preventDefault()
    showBarrageInput.value = !showBarrageInput.value
    showDonate.value = false
    return
  }
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'm') {
    e.preventDefault()
    toggleMoveMode()
    return
  }

  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
    e.preventDefault()
    showStats.value = !showStats.value
    return
  }

  // Settings panel
  if (e.ctrlKey && e.shiftKey && e.key === ',') {
    e.preventDefault()
    showSettings.value = true
    return
  }

  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
    e.preventDefault()
    showShop.value = true
    return
  }
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'w') {
    e.preventDefault()
    if (working.value || studying.value) return
    if (petStats.applyAction('work')) {
      working.value = true
    }
    return
  }
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z') {
    e.preventDefault()
    if (working.value || studying.value) return
    if (petStats.applyAction('study')) {
      studying.value = true
    }
    return
  }
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 't') {
    e.preventDefault()
    if (petStats.sleeping.value) {
      petStats.applyAction('sleep_end')
    } else {
      petStats.applyAction('sleep_start')
    }
    return
  }

  if (showDonate.value || showBarrageInput.value) return

  notifyInteraction()
  triggerDance()

  invoke('send_key_event', { key: 'keydown' }).catch(() => {})
  incrementKeypresses().catch(() => {})

  const now = performance.now() / 1000
  if (now - lastBarrageTime >= 5 && Math.random() < 0.5) {
    addBarrage(getRandomBarrage(customBarrages.getAll()).text)
    lastBarrageTime = now
  }
}

function onBarrageSubmit(text: string) {
  customBarrages.add(text).catch(() => {})
  addBarrage(text)
  showBarrageInput.value = false
}

// --- boss key ---
let unlistenBossKey: (() => void) | null = null
let unlistenPetCommand: (() => void) | null = null
let posInterval: ReturnType<typeof setInterval> | null = null
const { debouncedSave, loadPosition } = useDebouncedSave()

const LIVE2D_MODEL_URL = '/assets/live2d/Hiyori/Hiyori.model3.json'

// Map PetAction → Live2D motion group
const ACTION_TO_MOTION: Record<string, Live2DMotion> = {
  JumpLight: 'TapBody' as Live2DMotion,
  ComboBreak: 'TapBody' as Live2DMotion,
  CrazyDance: 'TapBody' as Live2DMotion,
  Yawn: 'Idle',
  Talk: 'TapBody' as Live2DMotion,
}

onMounted(async () => {
  start()

  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {})
  }

  // Init pet stats
  await petStats.loadStats()
  petStats.startAutoSave()

  // Decay every 30s
  decayTimer = setInterval(() => {
    petStats.decayTick()
    const s = petStats.stats.value
    // Low-stat notifications
    if (s.hunger < 15 && Notification.permission === 'granted') {
      new Notification('桌面显眼包', { body: '我好饿啊～想吃东西……' })
    } else if (s.thirst < 15 && Notification.permission === 'granted') {
      new Notification('桌面显眼包', { body: '渴死啦～要喝水……' })
    } else if (s.mood < 15 && Notification.permission === 'granted') {
      new Notification('桌面显眼包', { body: '好无聊……陪我玩嘛……' })
    }
    const d = petStats.getDialogue()
    if (d) dialogueText.value = d
  }, 30_000)

  // Daily gift
  ;(async () => {
    try {
      const giftStore = await load('daily.json', { defaults: { daily: {} } })
      const lastDate = await giftStore.get<string>('lastLogin')
      const today = new Date().toDateString()
      if (lastDate !== today) {
        const s = petStats.stats.value
        s.money += 50
        s.mood = Math.min(100, s.mood + 20)
        s.affinity = Math.min(100, s.affinity + 5)
        dialogueText.value = '🎁 每日礼包！获得 ¥50！'
        await giftStore.set('lastLogin', today)
        await giftStore.save()
      }
    } catch { /* ignore */ }
  })()

  // Periodic dialogue even without decay triggers
  dialogueTimer = setInterval(() => {
    if (!dialogueText.value && Math.random() < 0.3) {
      dialogueText.value = petStats.getDialogue()
    }
  }, 60_000)

  // Init Live2D
  if (live2dCanvasRef.value) {
    const ok = await live2d.init(live2dCanvasRef.value, LIVE2D_MODEL_URL)
    if (!ok) {
      live2dError.value = live2d.error?.value ?? 'Unknown error'
    }
    if (ok) {
      // Bridge: FSM → Live2D
      setActionCallback((action: PetAction | null) => {
        if (action) {
          const motion = ACTION_TO_MOTION[action] ?? 'TapBody'
          live2d.playMotion(motion as Live2DMotion)
        } else {
          live2d.returnToIdle()
        }
      })
      setMouseCallback((x: number, y: number) => {
        live2d.setMousePos(x, y)
      })
    }
  }

  document.addEventListener('keydown', onKeyDown)
  await customBarrages.load()

  setupTray({
    onToggleMoveMode: toggleMoveMode,
    onSetClickThrough: (enabled) => {
      moveMode.value = enabled
      setMoveMode(enabled)
    },
  }).catch(() => {})

  document.addEventListener('visibilitychange', () => {
    setVisible(!document.hidden)
  })

  unlistenBossKey = await listen<boolean>('boss-key-event', (event) => {
    if (event.payload) {
      start()
    } else {
      stop()
    }
  })

  await loadPosition()

  getCurrentWindow().setShadow(false).catch(() => {})

  unlistenPetCommand = await listen<PetAction>('pet-command', (event) => {
    notifyInteraction()
    triggerAction(event.payload)
  })
  isReady.value = true

  posInterval = setInterval(async () => {
    try {
      const { x, y } = await getCurrentWindow().outerPosition()
      debouncedSave(x, y)
    } catch { /* ignore */ }
  }, 2000)
})

// --- shop buy ---
function onBuyItem(item: { price: number; hunger?: number; thirst?: number; mood?: number; affinity?: number }) {
  if (petStats.buyItem(item.price, item.hunger ?? 0, item.thirst ?? 0, item.mood ?? 0, item.affinity ?? 0)) {
    if (item.affinity) {
      dialogueText.value = `好开心！🥰`
    } else {
      dialogueText.value = `好吃！😋`
    }
  }
}

// --- work/study complete ---
function onWorkComplete() {
  working.value = false
  dialogueText.value = `赚了 ¥${5 + Math.floor(petStats.stats.value.level * 0.5)}！`
}
function onStudyComplete() {
  studying.value = false
  dialogueText.value = '学习真充实！📚'
}

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
  unlistenBossKey?.()
  unlistenPetCommand?.()
  if (posInterval) clearInterval(posInterval)
  if (decayTimer) clearInterval(decayTimer)
  if (dialogueTimer) clearInterval(dialogueTimer)
  petStats.destroy()
  live2d.destroy()
})
</script>

<template>
  <div class="pet-container">
    <canvas
      ref="live2dCanvasRef"
      class="live2d-canvas"
    />
    <canvas
      ref="overlayCanvasRef"
      class="overlay-canvas"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointerleave="() => { onPointerUp(); setMousePos(-9999, -9999); }"
    />
    <DonateOverlay v-if="showDonate" @close="showDonate = false" />
    <BarrageInput v-if="showBarrageInput" @submit="onBarrageSubmit" @close="showBarrageInput = false" />
    <StatsPanel v-if="showStats" :stats="petStats.stats.value" :sleeping="petStats.sleeping.value" @close="showStats = false" />
    <ShopPanel v-if="showShop" :money="petStats.stats.value.money" @buy="onBuyItem" @close="showShop = false" />
    <SettingsPanel v-if="showSettings" @close="showSettings = false" />
    <WorkTimer :active="working" label="💼 打工中…" :duration-ms="WORK_DURATION" @complete="onWorkComplete" />
    <WorkTimer :active="studying" label="📖 学习中…" :duration-ms="STUDY_DURATION" @complete="onStudyComplete" />
    <DialogueBubble :text="dialogueText" />
    <div v-if="live2dError" class="live2d-error">{{ live2dError }}</div>
  </div>
</template>

<style scoped>
.pet-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
}

.live2d-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: transparent;
  pointer-events: none;
}

.overlay-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: transparent;
  cursor: grab;
  touch-action: none;
  pointer-events: auto;
}

.overlay-canvas:active {
  cursor: grabbing;
}

.live2d-error {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(200, 40, 40, 0.85);
  color: #fff;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-family: monospace;
  max-width: 80vw;
  word-break: break-all;
  pointer-events: none;
  z-index: 999;
}
</style>
