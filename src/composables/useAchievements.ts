import { ref } from 'vue'
import { load, type Store } from '@tauri-apps/plugin-store'

export interface Achievement {
  id: string
  name: string
  desc: string
  emoji: string
  unlocked: boolean
  condition: (stats: { level: number; money: number; affinity: number; clicks: number; itemsUsed: number; breakthroughCount: number }) => boolean
}

const ACHIEVEMENT_DEFS: Omit<Achievement, 'unlocked'>[] = [
  { id: 'first_click', name: '初次互动', desc: '第一次点击宠物', emoji: '👆', condition: (s) => s.clicks >= 1 },
  { id: 'pet_100', name: '撸猫狂魔', desc: '点击宠物 100 次', emoji: '🤲', condition: (s) => s.clicks >= 100 },
  { id: 'pet_1000', name: '触手之巅', desc: '点击宠物 1000 次', emoji: '👏', condition: (s) => s.clicks >= 1000 },
  { id: 'money_100', name: '小有积蓄', desc: '累计拥有 ¥100', emoji: '💰', condition: (s) => s.money >= 100 },
  { id: 'money_1000', name: '富甲一方', desc: '累计拥有 ¥1000', emoji: '💎', condition: (s) => s.money >= 1000 },
  { id: 'money_10000', name: '十万富翁', desc: '累计拥有 ¥10000', emoji: '👑', condition: (s) => s.money >= 10000 },
  { id: 'level_10', name: '初出茅庐', desc: '达到 10 级', emoji: '⭐', condition: (s) => s.level >= 10 },
  { id: 'level_50', name: '小有名气', desc: '达到 50 级', emoji: '🌟', condition: (s) => s.level >= 50 },
  { id: 'level_100', name: '百级大佬', desc: '达到 100 级', emoji: '💫', condition: (s) => s.level >= 100 },
  { id: 'level_500', name: '半神之路', desc: '达到 500 级', emoji: '🔥', condition: (s) => s.level >= 500 },
  { id: 'level_1000', name: '满级传说', desc: '达到 1000 级', emoji: '🏆', condition: (s) => s.level >= 1000 },
  { id: 'affinity_50', name: '好朋友', desc: '好感度达到 50', emoji: '💕', condition: (s) => s.affinity >= 50 },
  { id: 'affinity_100', name: '最好的朋友', desc: '好感度达到 100', emoji: '❤️', condition: (s) => s.affinity >= 100 },
  { id: 'breakthrough', name: '超越极限', desc: '完成第 1 次突破', emoji: '🌈', condition: (s) => s.breakthroughCount >= 1 },
  { id: 'breakthrough_5', name: '无限突破', desc: '完成第 5 次突破', emoji: '♾️', condition: (s) => s.breakthroughCount >= 5 },
  { id: 'shop_all', name: '全部买单', desc: '买过商店里所有商品', emoji: '🛒', condition: () => false },
  { id: 'item_50', name: '购物达人', desc: '使用 50 次物品', emoji: '📦', condition: (s) => s.itemsUsed >= 50 },
]

export function useAchievements() {
  const achievements = ref<Achievement[]>(
    ACHIEVEMENT_DEFS.map((a) => ({ ...a, unlocked: false }))
  )
  const lastUnlocked = ref<string | null>(null)
  let _store: Store | null = null

  async function loadAchievements() {
    try {
      _store = await load('achievements.json', {
        defaults: { unlocked: [] as string[] },
        autoSave: true,
      })
      const unlocked = await _store.get<string[]>('unlocked')
      if (unlocked) {
        for (const id of unlocked) {
          const a = achievements.value.find((a) => a.id === id)
          if (a) a.unlocked = true
        }
      }
    } catch { /* ignore */ }
  }

  async function saveAchievements() {
    if (!_store) return
    try {
      const unlocked = achievements.value.filter((a) => a.unlocked).map((a) => a.id)
      await _store.set('unlocked', unlocked)
      await _store.save()
    } catch { /* ignore */ }
  }

  function checkAchievements(stats: { level: number; money: number; affinity: number; clicks: number; itemsUsed: number; breakthroughCount: number }): Achievement | null {
    for (const a of achievements.value) {
      if (a.unlocked) continue
      if (a.condition(stats)) {
        a.unlocked = true
        lastUnlocked.value = a.id
        saveAchievements()
        return a
      }
    }
    return null
  }

  return { achievements, lastUnlocked, loadAchievements, checkAchievements }
}
