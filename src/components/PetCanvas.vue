<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { load } from '@tauri-apps/plugin-store'
import { usePetRenderer, type PetAction } from '../composables/usePetRenderer'
import { useDebouncedSave } from '../composables/useDebouncedSave'
import { useInteractionCounter } from '../composables/useInteractionCounter'
import { useLive2DRenderer, type Live2DMotion } from '../composables/useLive2DRenderer'
import { usePetStats, type StatAction } from '../composables/usePetStats'
import { useAchievements } from '../composables/useAchievements'
import { usePetAutoBehavior } from '../composables/usePetAutoBehavior'
import { setupTray, setPassThroughChecked } from '../composables/useTray'
import DonateOverlay from './DonateOverlay.vue'
import StatsPanel from './StatsPanel.vue'
import DialogueBubble from './DialogueBubble.vue'
import ShopPanel from './ShopPanel.vue'
import WorkTimer from './WorkTimer.vue'
import SettingsPanel from './SettingsPanel.vue'
import ContextMenu from './ContextMenu.vue'
import InventoryPanel from './InventoryPanel.vue'
import { useInventory, type InventoryItem } from '../composables/useInventory'

const overlay = usePetRenderer()
const overlayCanvasRef = overlay.canvasRef
const { start, stop, triggerDance, triggerAction, setMoveMode, notifyInteraction, setVisible, setMousePos, setActionCallback, setMouseCallback, setShowFps } = overlay

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

const showDonate = ref(false)
const showStats = ref(false)

const petStats = usePetStats()
const dialogueText = ref('')
let dialogueTimer: ReturnType<typeof setInterval> | null = null
let decayTimer: ReturnType<typeof setInterval> | null = null

// Shop & work state
const showShop = ref(false)
const showSettings = ref(false)
const showInventory = ref(false)
const working = ref(false)
const studying = ref(false)
const slackingTimer = ref(false)
const WORK_DURATION = 10_000
const STUDY_DURATION = 8_000

// Context menu
const ctxMenuPos = ref<{ x: number; y: number } | null>(null)

// Inventory
const inventory = useInventory()

// Achievements
const achievements = useAchievements()

// Settings state loaded by PetCanvas (shared with SettingsPanel)
const showFpsSetting = ref(false)
const scaleFactorSetting = ref(0.5)
const autoBehaviorEnabled = ref(true)

// Auto behavior (walk/climb/fly)
const autoBehavior = usePetAutoBehavior()
let autoBehaviorTimer: ReturnType<typeof setInterval> | null = null

function startAutoBehaviorLoop() {
  if (autoBehaviorTimer) return
  autoBehaviorTimer = setInterval(async () => {
    if (working.value || studying.value || petStats.sleeping.value || !isReady.value) return
    if (autoBehavior.behavior.value !== 'idle') return
    // Random chance every 30s
    if (Math.random() < 0.3) {
      await autoBehavior.startRandomBehavior()
    }
  }, 30_000)
}
const achievementNotify = ref<string | null>(null)
let achievementNotifyTimer: ReturnType<typeof setTimeout> | null = null
let itemUseCount = 0

function checkPetAchievements() {
  const s = petStats.stats.value
  const unlocked = achievements.checkAchievements({
    level: s.level,
    money: s.money,
    affinity: s.affinity,
    clicks: 0, // tracked separately
    itemsUsed: itemUseCount,
    breakthroughCount: petStats.breakthroughCount.value,
  })
  if (unlocked) {
    achievementNotify.value = unlocked.emoji + ' ' + unlocked.name + ' — ' + unlocked.desc
    if (achievementNotifyTimer) clearTimeout(achievementNotifyTimer)
    achievementNotifyTimer = setTimeout(() => { achievementNotify.value = null }, 4000)
  }
}

// --- click-through / move mode toggle ---
const moveMode = ref(false)

function toggleMoveMode() {
  moveMode.value = !moveMode.value
  setMoveMode(moveMode.value)
  getCurrentWindow().setIgnoreCursorEvents(moveMode.value).catch(() => {})
  setPassThroughChecked(moveMode.value).catch(() => {})
}

// --- right-click context menu ---
function onContextMenu(e: MouseEvent) {
  e.preventDefault()
  // Pre-compute safe position to avoid clipping by window border
  const menuW = 180
  const menuH = 300
  let x = Math.max(8, Math.min(e.clientX, window.innerWidth - menuW - 8))
  let y = Math.max(8, Math.min(e.clientY, window.innerHeight - menuH - 8))
  ctxMenuPos.value = { x, y }
}

function closeContextMenu() {
  ctxMenuPos.value = null
}

// --- dragging (smart click vs drag) + detailed click zone ---
function getClickZone(x: number, y: number): 'head' | 'body' | 'face' {
  // Simple zone detection based on canvas position
  // Head: upper 35%, Face: upper 20% center, Body: rest
  const canvas = overlayCanvasRef.value
  if (!canvas) return 'body'
  const rect = canvas.getBoundingClientRect()
  const relY = (y - rect.top) / rect.height
  const relX = (x - rect.left) / rect.width
  if (relY < 0.25 && relX > 0.35 && relX < 0.65) return 'face'
  if (relY < 0.35) return 'head'
  return 'body'
}

function onPointerDown(e: PointerEvent) {
  if (e.button === 2) return // right-click handled separately
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

function onPointerUp(e?: PointerEvent) {
  if (ptrActive && !ptrDragging && isReady.value) {
    // Skip clicks in empty space around the pet
    if (e) {
      const rect = overlayCanvasRef.value?.getBoundingClientRect()
      if (rect) {
        const relX = (e.clientX - rect.left) / rect.width
        const relY = (e.clientY - rect.top) / rect.height
        if (relX < 0.08 || relX > 0.92 || relY < 0.1) {
          ptrActive = false
          ptrDragging = false
          return
        }
      }
    }
    notifyInteraction()
    // Determine click zone for detailed interaction
    const zone = e ? getClickZone(e.clientX, e.clientY) : 'body'
    let action: StatAction
    switch (zone) {
      case 'head':
        action = 'pet_head'
        dialogueText.value = '摸头好舒服～😊'
        break
      case 'face':
        action = 'pinch_face'
        dialogueText.value = 'QAQ 别捏我脸……'
        break
      default:
        action = 'pet_body'
        dialogueText.value = petStats.getDialogue() || '嘿嘿～'
        break
    }
    petStats.applyAction(action)
    invoke('record_click').catch(() => {})
    incrementClicks().catch(() => {})
    checkPetAchievements()
  }
  ptrActive = false
  ptrDragging = false
}

// --- keyboard events ---
function onKeyDown(e: KeyboardEvent) {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
    e.preventDefault()
    showDonate.value = !showDonate.value
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
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r') {
    e.preventDefault()
    if (petStats.applyBreakthrough()) {
      dialogueText.value = `✨ 第 ${petStats.breakthroughCount.value} 次突破！全属性重置，上限提升！`
      checkPetAchievements()
    } else {
      dialogueText.value = `需要达到 1000 级才能突破！（当前 ${petStats.stats.value.level} 级）`
    }
    return
  }

  if (showDonate.value) return

  notifyInteraction()
  triggerDance()

  invoke('send_key_event', { key: 'keydown' }).catch(() => {})
  incrementKeypresses().catch(() => {})
}

// --- boss key ---
let unlistenBossKey: (() => void) | null = null
let unlistenPetCommand: (() => void) | null = null
let posInterval: ReturnType<typeof setInterval> | null = null
let slackCheckInterval: ReturnType<typeof setInterval> | null = null
const { debouncedSave, loadPosition } = useDebouncedSave()

const LIVE2D_MODEL_URL = '/assets/live2d/Hiyori/Hiyori.model3.json'

// Map PetAction → Live2D motion group
const ACTION_TO_MOTION: Record<string, Live2DMotion> = {
  JumpLight: 'Action',
  ComboBreak: 'Emote',
  CrazyDance: 'Emote',
  Yawn: 'Idle',
  Talk: 'TapBody',
}

// --- context menu items ---
const contextMenuItems = computed((): any[] => [
  {
    label: '互动',
    emoji: '🤲',
    children: [
      {
        label: working.value || studying.value ? '停止工作' : '💼 工作',
        emoji: working.value || studying.value ? '⏹' : '💼',
        action: () => {
          if (working.value || studying.value) {
            working.value = false; studying.value = false
            dialogueText.value = '不干了不干了！'
          } else if (petStats.sick.value) {
            dialogueText.value = '咳咳…生病了没法工作……'
          } else if (petStats.applyAction('work')) {
            working.value = true
          } else {
            dialogueText.value = '太累了，休息一下吧……'
          }
          closeContextMenu()
        },
        disabled: petStats.sick.value && !working.value && !studying.value,
      },
      {
        label: working.value || studying.value ? '停止学习' : '📖 学习',
        emoji: working.value || studying.value ? '⏹' : '📖',
        action: () => {
          if (working.value || studying.value) {
            working.value = false; studying.value = false
            dialogueText.value = '不干了不干了！'
          } else if (petStats.sick.value) {
            dialogueText.value = '咳咳…生病了没法学习……'
          } else if (petStats.applyAction('study')) {
            studying.value = true
          } else {
            dialogueText.value = '太累了，休息一下吧……'
          }
          closeContextMenu()
        },
        disabled: petStats.sick.value && !working.value && !studying.value,
      },
      {
        label: petStats.sleeping.value ? '起床' : '😴 睡觉',
        emoji: petStats.sleeping.value ? '🌅' : '😴',
        action: () => {
          if (petStats.sleeping.value) {
            petStats.applyAction('sleep_end')
            dialogueText.value = '睡得好舒服～😊'
          } else {
            petStats.applyAction('sleep_start')
            dialogueText.value = '晚安……💤'
          }
          closeContextMenu()
        },
      },
    ],
  },
  {
    label: '商店',
    emoji: '🛒',
    action: () => { showShop.value = true; closeContextMenu() },
  },
  {
    label: '背包',
    emoji: '🎒',
    action: () => { showInventory.value = true; closeContextMenu() },
  },
  {
    label: '统计',
    emoji: '📊',
    action: () => { showStats.value = true; closeContextMenu() },
  },
  {
    label: '设置',
    emoji: '⚙️',
    action: () => { showSettings.value = true; closeContextMenu() },
  },
  {
    label: moveMode.value ? '退出穿透' : '穿透模式',
    emoji: '🖱️',
    shortcut: '⇧⌃M',
    action: () => { toggleMoveMode(); closeContextMenu() },
  },
  {
    label: '退出',
    emoji: '🚪',
    action: () => { invoke('exit_app'); closeContextMenu() },
  },
])

onMounted(async () => {
  start()

  // Load settings
  try {
    const store = await load('settings.json', { defaults: { settings: {} } })
    const raw = await store.get<Record<string, unknown>>('settings')
    if (raw) {
      if (typeof raw.showFps === 'boolean') showFpsSetting.value = raw.showFps
      if (typeof raw.petScale === 'number') scaleFactorSetting.value = raw.petScale
      if (typeof raw.autoBehavior === 'boolean') autoBehaviorEnabled.value = raw.autoBehavior
    }
  } catch { /* ignore */ }
  setShowFps(showFpsSetting.value)
  autoBehavior.enabled.value = autoBehaviorEnabled.value

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
        checkPetAchievements()
      } else {
        checkPetAchievements()
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
  await inventory.loadInventory()
  await achievements.loadAchievements()

  // Periodic slack check during work/study
  slackCheckInterval = setInterval(() => notifySlack(), 15_000)

  // Start auto-behavior loop
  startAutoBehaviorLoop()

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

// --- shop buy (now adds to inventory) ---
function onBuyItem(item: { id: string; name: string; emoji: string; price: number; hunger?: number; thirst?: number; mood?: number; health?: number; affinity?: number }) {
  // Determine item type
  let type: InventoryItem['type'] = 'gift'
  if (item.health) type = 'medicine'
  else if (item.hunger) type = 'food'
  else if (item.thirst) type = 'drink'

  if (petStats.buyItem(item.price, item.hunger ?? 0, item.thirst ?? 0, item.mood ?? 0, item.affinity ?? 0)) {
    inventory.addItem(item.id, item.name, item.emoji, type, 1, {
      hunger: item.hunger,
      thirst: item.thirst,
      mood: item.mood,
      health: item.health,
      affinity: item.affinity,
    })
    dialogueText.value = `买了${item.name}！已放入背包 🎒`
  }
}

// --- inventory use ---
function onInventoryUse(item: InventoryItem) {
  const used = inventory.useItem(item.id)
  if (!used) return
  itemUseCount++
  checkPetAchievements()
  const s = petStats.stats.value
  if (used.type === 'medicine') {
    petStats.applyAction('medicine')
    s.health = Math.min(100, s.health + (used.health ?? 0))
    dialogueText.value = `吃了${used.name}，感觉好多了！💪`
  } else if (used.type === 'food') {
    petStats.applyAction('feed')
    s.hunger = Math.min(100, s.hunger + (used.hunger ?? 0))
    s.mood = Math.min(100, s.mood + (used.mood ?? 0))
    dialogueText.value = `吃了${used.name}！😋`
  } else if (used.type === 'drink') {
    petStats.applyAction('drink')
    s.thirst = Math.min(100, s.thirst + (used.thirst ?? 0))
    s.mood = Math.min(100, s.mood + (used.mood ?? 0))
    dialogueText.value = `喝了${used.name}！🥰`
  } else if (used.type === 'gift') {
    s.mood = Math.min(100, s.mood + (used.mood ?? 0))
    s.affinity = Math.min(100, s.affinity + (used.affinity ?? 0))
    dialogueText.value = `好开心！🥰`
  }
}

// --- slacking ---
function onSlack() {
  petStats.slacking.value = true
  dialogueText.value = '唔…偷偷懒……'
}
function onRefocus() {
  petStats.slacking.value = false
  slackingTimer.value = false
  dialogueText.value = '好啦好啦，继续干活……'
}
function notifySlack() {
  // Called periodically by WorkTimer
  if ((working.value || studying.value) && !petStats.slacking.value && Math.random() < 0.08) {
    petStats.slacking.value = true
    slackingTimer.value = true
    dialogueText.value = '呼……让我歇会儿……'
  }
}

// --- work/study complete ---
function onWorkComplete() {
  working.value = false
  dialogueText.value = `赚了 ¥${5 + Math.floor(petStats.stats.value.level * 0.5)}！`
  checkPetAchievements()
}
function onStudyComplete() {
  studying.value = false
  dialogueText.value = '学习真充实！📚'
  checkPetAchievements()
}

// Persist FPS setting when toggled
watch(showFpsSetting, async (val) => {
  setShowFps(val)
  try {
    const store = await load('settings.json', { defaults: { settings: {} } })
    const raw = (await store.get<Record<string, unknown>>('settings')) ?? {}
    raw.showFps = val
    await store.set('settings', raw)
    await store.save()
  } catch { /* ignore */ }
})

// Persist scale factor
watch(scaleFactorSetting, async (val) => {
  live2d.setScaleFactor(val)
  try {
    const store = await load('settings.json', { defaults: { settings: {} } })
    const raw = (await store.get<Record<string, unknown>>('settings')) ?? {}
    raw.petScale = val
    delete raw.scaleFactor // clear old key
    await store.set('settings', raw)
    await store.save()
  } catch { /* ignore */ }
})

// Persist auto-behavior toggle
watch(autoBehaviorEnabled, async (val) => {
  autoBehavior.enabled.value = val
  try {
    const store = await load('settings.json', { defaults: { settings: {} } })
    const raw = (await store.get<Record<string, unknown>>('settings')) ?? {}
    raw.autoBehavior = val
    await store.set('settings', raw)
    await store.save()
  } catch { /* ignore */ }
})

// Play Live2D motion + bobbing when auto-behavior starts
watch(() => autoBehavior.behavior.value, (b) => {
  if (b === 'walking') { live2d.playMotion('Action'); live2d.startBob('walk') }
  else if (b === 'climbing') { live2d.playMotion('Emote'); live2d.startBob('climb') }
  else if (b === 'flying') { live2d.playMotion('Special'); live2d.startBob('fly') }
  else { live2d.returnToIdle(); live2d.stopBob() }
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
  unlistenBossKey?.()
  unlistenPetCommand?.()
  if (posInterval) clearInterval(posInterval)
  if (decayTimer) clearInterval(decayTimer)
  if (dialogueTimer) clearInterval(dialogueTimer)
  if (slackCheckInterval) clearInterval(slackCheckInterval)
  if (autoBehaviorTimer) clearInterval(autoBehaviorTimer)
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
      @pointerup="onPointerUp($event as unknown as PointerEvent)"
      @pointerleave="() => { onPointerUp(); setMousePos(-9999, -9999); }"
      @contextmenu="onContextMenu"
    />
    <DonateOverlay v-if="showDonate" @close="showDonate = false" />
    <StatsPanel v-if="showStats" :stats="petStats.stats.value" :sleeping="petStats.sleeping.value" @close="showStats = false" />
    <ShopPanel v-if="showShop" :money="petStats.stats.value.money" @buy="onBuyItem" @close="showShop = false" />
    <SettingsPanel v-if="showSettings" :showFps="showFpsSetting" :scaleFactor="scaleFactorSetting" :autoBehavior="autoBehaviorEnabled" @update:showFps="showFpsSetting = $event" @update:scaleFactor="scaleFactorSetting = $event" @update:autoBehavior="autoBehaviorEnabled = $event" @close="showSettings = false" />
    <InventoryPanel
      v-if="showInventory"
      :items="inventory.items.value"
      @use="onInventoryUse"
      @close="showInventory = false"
    />
    <WorkTimer :active="working" label="💼 打工中…" :duration-ms="WORK_DURATION" :slacking="petStats.slacking.value" @slack="onSlack" @refocus="onRefocus" @complete="onWorkComplete" />
    <WorkTimer :active="studying" label="📖 学习中…" :duration-ms="STUDY_DURATION" :slacking="petStats.slacking.value" @slack="onSlack" @refocus="onRefocus" @complete="onStudyComplete" />
    <DialogueBubble :text="dialogueText" />
    <div v-if="live2dError" class="live2d-error">{{ live2dError }}</div>
    <ContextMenu
      v-if="ctxMenuPos"
      :x="ctxMenuPos.x"
      :y="ctxMenuPos.y"
      :items="contextMenuItems"
      @close="closeContextMenu"
    />
    <!-- Auto behavior label -->
    <div v-if="autoBehavior.behaviorLabel.value" class="auto-behavior-label">{{ autoBehavior.behaviorLabel.value }}</div>
    <!-- Sick indicator -->
    <div v-if="petStats.sick.value" class="sick-indicator">🤒 生病了</div>
    <!-- Achievement notification -->
    <div v-if="achievementNotify" class="achievement-popup">{{ achievementNotify }}</div>
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
.auto-behavior-label {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(6px);
  color: #a5b4fc;
  padding: 4px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-family: sans-serif;
  pointer-events: none;
  z-index: 80;
  white-space: nowrap;
}
.sick-indicator {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(239, 68, 68, 0.85);
  color: #fff;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-family: sans-serif;
  pointer-events: none;
  z-index: 100;
  animation: sickPulse 1.2s ease-in-out infinite;
}
@keyframes sickPulse {
  0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
  50% { opacity: 0.7; transform: translateX(-50%) scale(1.05); }
}
.achievement-popup {
  position: fixed;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, rgba(99,102,241,0.95), rgba(139,92,246,0.95));
  color: #fff;
  padding: 10px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-family: sans-serif;
  font-weight: 600;
  pointer-events: none;
  z-index: 200;
  box-shadow: 0 4px 20px rgba(99,102,241,0.4);
  animation: achEnter 0.4s ease-out;
  white-space: nowrap;
}
@keyframes achEnter {
  from { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.9); }
  to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}
</style>
