import { ref } from 'vue'
import { load, type Store } from '@tauri-apps/plugin-store'

export interface InventoryItem {
  id: string
  name: string
  emoji: string
  quantity: number
  type: 'food' | 'drink' | 'medicine' | 'gift'
  hunger?: number
  thirst?: number
  mood?: number
  health?: number
  affinity?: number
}

export function useInventory() {
  const items = ref<InventoryItem[]>([])
  let _store: Store | null = null

  async function loadInventory() {
    try {
      _store = await load('inventory.json', {
        defaults: { items: [] },
        autoSave: true,
      })
      const raw = await _store.get<InventoryItem[]>('items')
      if (raw) items.value = raw
    } catch { /* first run */ }
  }

  async function saveInventory() {
    if (!_store) return
    try {
      await _store.set('items', items.value)
      await _store.save()
    } catch { /* ignore */ }
  }

  /** Add N items to inventory (or increment quantity) */
  function addItem(
    id: string,
    name: string,
    emoji: string,
    type: InventoryItem['type'],
    quantity = 1,
    effects?: { hunger?: number; thirst?: number; mood?: number; health?: number; affinity?: number },
  ) {
    const existing = items.value.find((i) => i.id === id)
    if (existing) {
      existing.quantity += quantity
    } else {
      items.value.push({
        id,
        name,
        emoji,
        quantity,
        type,
        ...effects,
      })
    }
    saveInventory()
  }

  /** Use one of an item, returns its effects */
  function useItem(id: string): InventoryItem | null {
    const idx = items.value.findIndex((i) => i.id === id)
    if (idx === -1) return null
    const item = items.value[idx]
    item.quantity--
    if (item.quantity <= 0) {
      items.value.splice(idx, 1)
    }
    saveInventory()
    return { ...item, quantity: 1 }
  }

  function getQuantity(id: string): number {
    return items.value.find((i) => i.id === id)?.quantity ?? 0
  }

  return { items, loadInventory, addItem, useItem, getQuantity, saveInventory }
}
