import { Store } from '@tauri-apps/plugin-store'

interface DayRecord {
  clicks: number
  keypresses: number
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function useInteractionCounter() {
  async function incrementClicks(): Promise<number> {
    try {
      const store = await Store.load('interactions.json')
      const d = today()
      const r = (await store.get<DayRecord>(d)) ?? { clicks: 0, keypresses: 0 }
      r.clicks++
      await store.set(d, r)
      await store.save()
      return r.clicks
    } catch {
      return -1
    }
  }

  async function incrementKeypresses(): Promise<number> {
    try {
      const store = await Store.load('interactions.json')
      const d = today()
      const r = (await store.get<DayRecord>(d)) ?? { clicks: 0, keypresses: 0 }
      r.keypresses++
      await store.set(d, r)
      await store.save()
      return r.keypresses
    } catch {
      return -1
    }
  }

  async function getTodayCount(): Promise<DayRecord> {
    try {
      const store = await Store.load('interactions.json')
      const d = today()
      return (await store.get<DayRecord>(d)) ?? { clicks: 0, keypresses: 0 }
    } catch {
      return { clicks: 0, keypresses: 0 }
    }
  }

  return { incrementClicks, incrementKeypresses, getTodayCount }
}
