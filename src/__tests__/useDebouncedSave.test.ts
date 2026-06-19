/// 验证 2（续）：防抖 Hooks 测试
///
/// 验证 500ms 内多次拖动仅触发 1 次写入。
/// 使用 vitest 模拟时序。

import { describe, it, expect, vi } from 'vitest'
import { useDebouncedSave } from '../composables/useDebouncedSave'

describe('useDebouncedSave', () => {
  it('应在 500ms 内多次调用仅执行一次保存', async () => {
    vi.useFakeTimers()

    const { debouncedSave, getSaveCount, reset } = useDebouncedSave(500)
    reset()

    // 模拟 5 次快速拖动（10ms 间隔）
    for (let i = 0; i < 5; i++) {
      debouncedSave(100 + i, 200 + i)
      vi.advanceTimersByTime(10)
    }

    // 防抖尚未触发
    expect(getSaveCount()).toBe(0)

    // 前进 500ms，防抖应触发一次
    vi.advanceTimersByTime(500)
    expect(getSaveCount()).toBe(1)

    vi.useRealTimers()
  })

  it('应在 500ms 间隔两次操作触发两次保存', async () => {
    vi.useFakeTimers()

    const { debouncedSave, getSaveCount, reset } = useDebouncedSave(500)
    reset()

    // 第一次拖动 → 等待 600ms 让第一次保存触发
    debouncedSave(10, 20)
    vi.advanceTimersByTime(600)
    expect(getSaveCount()).toBe(1)

    // 第二次拖动 → 再等 600ms 让第二次保存触发
    debouncedSave(30, 40)
    vi.advanceTimersByTime(600)
    expect(getSaveCount()).toBe(2)

    vi.useRealTimers()
  })

  it('第一次保存应等待完整防抖窗口', async () => {
    vi.useFakeTimers()

    const { debouncedSave, getSaveCount, reset } = useDebouncedSave(500)
    reset()

    debouncedSave(50, 60)

    // 400ms 时尚未触发
    vi.advanceTimersByTime(400)
    expect(getSaveCount()).toBe(0)

    // 再前进 100ms，触发保存
    vi.advanceTimersByTime(100)
    expect(getSaveCount()).toBe(1)

    vi.useRealTimers()
  })
})
