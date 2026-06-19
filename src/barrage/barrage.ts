/// 弹幕文案库
///
/// 采集自校园墙/表白墙/吐槽帖的 TOP 吐槽，
/// 是项目的核心资产和护城河。
///
/// 来源：项目计划书 6.2 文案示例

export interface Barrage {
  id: number
  text: string
  category: BarrageCategory
}

export type BarrageCategory =
  | 'study'        // 学习吐槽
  | 'teacher'      // 老师/导员
  | 'dormitory'    // 宿舍生活
  | 'daily'        // 日常真实
  | 'self-deprec'  // 自嘲
  | 'custom'       // 用户投稿

export const barrages: Barrage[] = [
  // ── 学习吐槽 ──
  { id: 1, text: '高数作业写完了吗就来摸鱼？', category: 'study' },
  { id: 2, text: '这破论文谁爱写谁写', category: 'study' },
  { id: 3, text: '复习？不存在的', category: 'study' },
  { id: 4, text: '下辈子一定好好预习', category: 'study' },
  { id: 5, text: '翻开书：马冬梅，合上书：马什么梅', category: 'study' },
  { id: 6, text: '期末周，一种当代酷刑', category: 'study' },

  // ── 老师/导员 ──
  { id: 7, text: '别看了，辅导员在窗外', category: 'teacher' },
  { id: 8, text: '老师说这节课点名', category: 'teacher' },
  { id: 9, text: '导员：你最近状态不太对啊', category: 'teacher' },
  { id: 10, text: '老师：这题我讲过八百遍了', category: 'teacher' },

  // ── 宿舍生活 ──
  { id: 11, text: '周三下午查寝记得叠被子', category: 'dormitory' },
  { id: 12, text: '你室友都在卷，就你在看猫', category: 'dormitory' },
  { id: 13, text: '关灯了还在煲电话粥是吧', category: 'dormitory' },
  { id: 14, text: '谁的外卖到了下去拿一下', category: 'dormitory' },

  // ── 日常真实 ──
  { id: 15, text: '你又在刷抖音', category: 'daily' },
  { id: 16, text: '这个月生活费还剩三天就花完了', category: 'daily' },
  { id: 17, text: '手机电量 1% 才是真正的紧迫感', category: 'daily' },

  // ── 自嘲 ──
  { id: 18, text: 'DDL 是第一生产力', category: 'self-deprec' },
  { id: 19, text: '间歇性踌躇满志，持续性混吃等死', category: 'self-deprec' },
  { id: 20, text: '大…大不了就延毕嘛', category: 'self-deprec' },
  { id: 21, text: '今天也是元气满满摆烂的一天', category: 'self-deprec' },
  { id: 22, text: '收藏了就是学会了', category: 'self-deprec' },
]

export function getRandomBarrage(customs?: string[]): Barrage {
  const pool = customs?.length
    ? [
        ...barrages,
        ...customs.map((t, i) => ({ id: 1000 + i, text: t, category: 'custom' as BarrageCategory })),
      ]
    : barrages
  return pool[Math.floor(Math.random() * pool.length)]
}

export function getBarragesByCategory(category: BarrageCategory): Barrage[] {
  return barrages.filter((b) => b.category === category)
}
