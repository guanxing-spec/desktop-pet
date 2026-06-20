import { ref } from 'vue'
import { PhysicalPosition, getCurrentWindow } from '@tauri-apps/api/window'

export type AutoBehavior = 'idle' | 'walking' | 'climbing' | 'flying'

const WINDOW_W = 400

export function usePetAutoBehavior() {
  const behavior = ref<AutoBehavior>('idle')
  const behaviorLabel = ref('')
  let _running = false

  async function startRandomBehavior() {
    if (_running) return
    const choices: AutoBehavior[] = ['walking', 'climbing', 'flying']
    const chosen = choices[Math.floor(Math.random() * choices.length)]
    await startBehavior(chosen)
  }

  async function startBehavior(type: AutoBehavior) {
    if (_running) return
    _running = true
    behavior.value = type

    try {
      const win = getCurrentWindow()
      const pos = await win.outerPosition()
      const sx = pos.x
      const sy = pos.y
      const screenW = window.screen.availWidth
      const screenH = window.screen.availHeight

      switch (type) {
        case 'walking': {
          behaviorLabel.value = '🚶 散个步…'
          const dir = Math.random() > 0.5 ? 1 : -1
          const dist = 100 + Math.random() * 200
          const endX = clamp(sx + dir * dist, 0, screenW - WINDOW_W)
          await animatePosition(sx, sy, endX, sy, 2000)
          break
        }
        case 'climbing': {
          behaviorLabel.value = '🧗 爬墙！'
          // Climb up, then along top edge
          const topY = 0
          await animatePosition(sx, sy, sx, topY, 1500)
          const climbDir = Math.random() > 0.5 ? 1 : -1
          const climbDist = 100 + Math.random() * 150
          const endX = clamp(sx + climbDir * climbDist, 0, screenW - WINDOW_W)
          await animatePosition(sx, topY, endX, topY, 1500)
          break
        }
        case 'flying': {
          behaviorLabel.value = '🕊️ 飞咯～'
          const targetX = Math.random() * (screenW - WINDOW_W)
          const targetY = Math.random() * screenH * 0.4
          await animatePosition(sx, sy, targetX, targetY, 2500)
          break
        }
      }
    } catch { /* ignore errors */ }

    behavior.value = 'idle'
    behaviorLabel.value = ''
    _running = false
  }

  function animatePosition(
    fromX: number, fromY: number,
    toX: number, toY: number,
    duration: number,
  ): Promise<void> {
    return new Promise((resolve) => {
      const start = performance.now()
      const win = getCurrentWindow()

      function frame() {
        const t = Math.min(1, (performance.now() - start) / duration)
        // Ease-out cubic
        const ease = 1 - Math.pow(1 - t, 3)
        const cx = Math.round(fromX + (toX - fromX) * ease)
        const cy = Math.round(fromY + (toY - fromY) * ease)

        win.setPosition(new PhysicalPosition(cx, cy)).catch(() => {})

        if (t < 1) {
          requestAnimationFrame(frame)
        } else {
          resolve()
        }
      }

      requestAnimationFrame(frame)
    })
  }

  return { behavior, behaviorLabel, startRandomBehavior, startBehavior }
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}
