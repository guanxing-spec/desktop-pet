import { Store } from '@tauri-apps/plugin-store'

export function useCustomBarrages() {
  let customs: string[] = []

  async function load(): Promise<string[]> {
    try {
      const store = await Store.load('custom_barrages.json')
      customs = (await store.get<string[]>('list')) ?? []
    } catch {
      customs = []
    }
    return customs
  }

  async function add(text: string): Promise<void> {
    if (!text.trim()) return
    customs.push(text.trim())
    try {
      const store = await Store.load('custom_barrages.json')
      await store.set('list', customs)
      await store.save()
    } catch {
      /* ignore */
    }
  }

  function getAll(): string[] {
    return customs
  }

  return { load, add, getAll }
}
