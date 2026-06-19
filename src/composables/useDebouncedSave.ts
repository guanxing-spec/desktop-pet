import { useDebounceFn } from '@vueuse/core'
import { Store } from '@tauri-apps/plugin-store'
import { PhysicalPosition, getCurrentWindow } from '@tauri-apps/api/window'

export interface Position {
  x: number
  y: number
}

export function useDebouncedSave(delay: number = 500) {
  let lastSavedPosition: Position | null = null
  let saveCount = 0

  const savePosition = async (x: number, y: number) => {
    try {
      const store = await Store.load('settings.json')
      await store.set('window_position', { x, y })
      await store.save()
      lastSavedPosition = { x, y }
      saveCount++
    } catch {
      // not critical
    }
  }

  const debouncedSave = useDebounceFn(savePosition, delay)

  /** 从 store 加载并恢复窗口位置 */
  async function loadPosition() {
    try {
      const store = await Store.load('settings.json')
      const pos = await store.get<Position>('window_position')
      if (pos) {
        await getCurrentWindow().setPosition(new PhysicalPosition(pos.x, pos.y))
        lastSavedPosition = pos
      }
    } catch {
      // not critical
    }
  }

  return {
    debouncedSave,
    savePosition,
    loadPosition,
    getSaveCount: () => saveCount,
    getLastSavedPosition: () => lastSavedPosition,
    reset: () => {
      saveCount = 0
      lastSavedPosition = null
    },
  }
}
