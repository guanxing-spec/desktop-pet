import { ref, computed } from 'vue'
import { load, type Store } from '@tauri-apps/plugin-store'

export interface PetStatsData {
  level: number
  exp: number
  money: number
  stamina: number
  mood: number
  hunger: number
  thirst: number
  health: number
  affinity: number
}

const DEFAULT: PetStatsData = {
  level: 1,
  exp: 0,
  money: 10,
  stamina: 80,
  mood: 60,
  hunger: 70,
  thirst: 70,
  health: 100,
  affinity: 0,
}

/** EXP needed to reach each level */
function expToNext(level: number): number {
  return Math.floor(50 * Math.pow(level, 1.5))
}

export type StatAction =
  | 'feed' | 'drink'
  | 'work' | 'study' | 'sleep_start' | 'sleep_end'
  | 'pet' | 'idle_tick'

export function usePetStats() {
  const stats = ref<PetStatsData>({ ...DEFAULT })
  const sleeping = ref(false)
  let saveTimer: ReturnType<typeof setInterval> | null = null

  // --- computed helpers ---
  const expNeeded = computed(() => expToNext(stats.value.level))
  const expProgress = computed(() => stats.value.exp / expNeeded.value)

  // --- decay per ~30s tick ---
  function decayTick() {
    const s = stats.value
    if (sleeping.value) {
      s.stamina = Math.min(100, s.stamina + 3)
      s.hunger = Math.max(0, s.hunger - 1)
      s.thirst = Math.max(0, s.thirst - 1)
      return
    }
    // Normal decay
    s.hunger = Math.max(0, s.hunger - 1)
    s.thirst = Math.max(0, s.thirst - 1)
    s.mood = Math.max(0, s.mood - 0.5)
    s.stamina = Math.min(100, s.stamina + 0.5)

    // Health penalty if starving
    if (s.hunger < 15 || s.thirst < 15) {
      s.health = Math.max(0, s.health - 1)
    } else {
      s.health = Math.min(100, s.health + 0.2)
    }

    // Clamp all
    clampStats(s)
  }

  function clampStats(s: PetStatsData) {
    s.stamina = clamp(s.stamina, 0, 100)
    s.mood = clamp(s.mood, 0, 100)
    s.hunger = clamp(s.hunger, 0, 100)
    s.thirst = clamp(s.thirst, 0, 100)
    s.health = clamp(s.health, 0, 100)
    s.affinity = clamp(s.affinity, 0, 100)
  }

  // --- actions ---
  function applyAction(action: StatAction) {
    const s = stats.value
    switch (action) {
      case 'feed':
        s.hunger = Math.min(100, s.hunger + 25)
        s.mood = Math.min(100, s.mood + 5)
        break
      case 'drink':
        s.thirst = Math.min(100, s.thirst + 25)
        s.mood = Math.min(100, s.mood + 3)
        break
      case 'work':
        if (s.stamina >= 15) {
          s.stamina -= 15
          s.mood = Math.max(0, s.mood - 5)
          s.money += 5 + Math.floor(s.level * 0.5)
          return true
        }
        return false
      case 'study':
        if (s.stamina >= 15) {
          s.stamina -= 15
          s.mood = Math.max(0, s.mood - 3)
          s.exp += 10 + Math.floor(s.level * 2)
          checkLevelUp()
          return true
        }
        return false
      case 'sleep_start':
        sleeping.value = true
        break
      case 'sleep_end':
        sleeping.value = false
        break
      case 'pet':
        s.mood = Math.min(100, s.mood + 10)
        s.affinity = Math.min(100, s.affinity + 2)
        break
    }
    return true
  }

  function checkLevelUp() {
    const s = stats.value
    while (s.exp >= expNeeded.value && s.level < 99) {
      s.exp -= expNeeded.value
      s.level++
      s.stamina = Math.min(100, s.stamina + 20)
      s.mood = Math.min(100, s.mood + 10)
    }
  }

  // --- shop ---
  function buyItem(price: number, hungerGain = 0, thirstGain = 0, moodGain = 0): boolean {
    const s = stats.value
    if (s.money < price) return false
    s.money -= price
    s.hunger = Math.min(100, s.hunger + hungerGain)
    s.thirst = Math.min(100, s.thirst + thirstGain)
    s.mood = Math.min(100, s.mood + moodGain)
    return true
  }

  // --- save / load ---
  let _store: Store | null = null

  async function loadStats(): Promise<PetStatsData | null> {
    try {
      _store = await load('stats.json', { defaults: { pet_stats: DEFAULT }, autoSave: true })
      const raw = await _store.get<PetStatsData>('pet_stats')
      if (raw) {
        stats.value = { ...DEFAULT, ...raw }
        return stats.value
      }
    } catch { /* first run */ }
    return null
  }

  async function saveStats() {
    if (!_store) return
    try {
      await _store.set('pet_stats', { ...stats.value })
      await _store.save()
    } catch { /* ignore */ }
  }

  function startAutoSave(intervalMs = 10_000) {
    saveTimer = setInterval(() => saveStats(), intervalMs)
  }

  function stopAutoSave() {
    if (saveTimer) { clearInterval(saveTimer); saveTimer = null }
  }

  // --- get dialogue based on current state ---
  function getDialogue(): string {
    const s = stats.value
    if (s.health < 20) return '唔…好难受……'
    if (s.hunger < 15) return '好饿啊……想吃东西……'
    if (s.thirst < 15) return '口渴死了……要喝水……'
    if (s.stamina < 15) return '好累……让我睡一会儿……'
    if (s.mood < 20) return '好无聊……陪我玩嘛……'
    if (s.affinity > 80 && s.mood > 70) return '最喜欢你啦！✨'
    if (s.level > 1 && Math.random() < 0.1) return `我已经${s.level}级啦！`
    if (Math.random() < 0.15) return idleLines[Math.floor(Math.random() * idleLines.length)]
    return ''
  }

  function destroy() {
    stopAutoSave()
  }

  return {
    stats,
    sleeping,
    expNeeded,
    expProgress,
    decayTick,
    applyAction,
    buyItem,
    loadStats,
    saveStats,
    startAutoSave,
    stopAutoSave,
    getDialogue,
    destroy,
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

const idleLines = [
  '嗯～今天天气不错！',
  '好闲啊……写会作业？',
  '看什么呢？',
  '哒哒哒～',
  '哼～哼～哼～♪',
  '你一直在看我呢……',
  '肚子有点饿了……',
]
