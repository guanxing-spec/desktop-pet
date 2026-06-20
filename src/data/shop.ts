export interface ShopItem {
  id: string
  name: string
  price: number
  hunger?: number
  thirst?: number
  mood?: number
  affinity?: number
  desc?: string
  emoji: string
}

export const FOODS: ShopItem[] = [
  { id: 'riceball', name: '饭团', price: 5, hunger: 25, mood: 3, emoji: '🍙' },
  { id: 'bread', name: '面包', price: 8, hunger: 35, mood: 5, emoji: '🍞' },
  { id: 'cake', name: '蛋糕', price: 20, hunger: 20, mood: 20, emoji: '🍰' },
  { id: 'ramen', name: '拉面', price: 15, hunger: 50, mood: 8, emoji: '🍜' },
  { id: 'steak', name: '牛排', price: 40, hunger: 70, mood: 15, emoji: '🥩' },
]

export const GIFTS: ShopItem[] = [
  { id: 'flower', name: '花束', price: 25, mood: 10, affinity: 8, emoji: '💐', desc: '好感度 +8' },
  { id: 'teddy', name: '小熊玩偶', price: 40, mood: 15, affinity: 15, emoji: '🧸', desc: '好感度 +15' },
  { id: 'ring', name: '闪闪发光的戒指', price: 100, mood: 25, affinity: 30, emoji: '💍', desc: '好感度 +30' },
  { id: 'perfume', name: '香水', price: 60, mood: 15, affinity: 20, emoji: '✨', desc: '好感度 +20' },
]

export const DRINKS: ShopItem[] = [
  { id: 'water', name: '矿泉水', price: 3, thirst: 20, mood: 2, emoji: '💧' },
  { id: 'juice', name: '果汁', price: 10, thirst: 30, mood: 5, emoji: '🧃' },
  { id: 'milk', name: '牛奶', price: 8, thirst: 25, mood: 4, emoji: '🥛' },
  { id: 'cola', name: '可乐', price: 6, thirst: 20, mood: 8, emoji: '🥤' },
  { id: 'tea', name: '奶茶', price: 18, thirst: 25, mood: 15, emoji: '🧋' },
]
