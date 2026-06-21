import { ref, onUnmounted } from 'vue'

export type PetAction = 'JumpLight' | 'ComboBreak' | 'CrazyDance' | 'Yawn' | 'Talk'

interface ActiveAction {
  action: PetAction
  startTime: number
  duration: number
}

export function usePetRenderer() {
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  let animId: number | null = null
  let startTime = 0

  // FSM action state
  let currentAction: ActiveAction | null = null
  let _moveMode = false

  const ACTION_DURATION: Record<PetAction, number> = {
    JumpLight: 400,
    ComboBreak: 600,
    CrazyDance: 800,
    Yawn: 1200,
    Talk: 500,
  }

  // ── Idle system ──
  let lastInteractionTime = performance.now()
  let isVisible = true
  let idlePhase: 'awake' | 'drowsy' | 'asleep' = 'awake'

  // ── FPS counter ──
  let _frameTimes: number[] = []
  let _fps = 60
  let _showFps = false

  // ── Live2D bridge callback ──
  let _onAction: ((action: PetAction | null) => void) | null = null
  let _onMouse: ((x: number, y: number) => void) | null = null
  let _lastAction: PetAction | null = null

  function setActionCallback(cb: (action: PetAction | null) => void) {
    _onAction = cb
  }

  function setMouseCallback(cb: (x: number, y: number) => void) {
    _onMouse = cb
  }

  // ── Helpers ──

  function triggerDance() {
    notifyInteraction()
    triggerAction('JumpLight')
  }

  function triggerAction(action: PetAction) {
    notifyInteraction()

    const now = performance.now()
    currentAction = {
      action,
      startTime: now,
      duration: ACTION_DURATION[action],
    }
  }

  const IDLE_YAWN_MS = 15000
  const IDLE_SLEEP_MS = 30000

  function notifyInteraction() {
    lastInteractionTime = performance.now()
    idlePhase = 'awake'
  }

  function setVisible(v: boolean) {
    isVisible = v
    if (v) {
      lastInteractionTime = performance.now()
    }
  }

  function setMousePos(x: number, y: number) {
    _onMouse?.(x, y)
  }

  function render(timestamp: number) {
    const canvas = canvasRef.value
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (startTime === 0) startTime = timestamp

    const w = window.innerWidth
    const h = window.innerHeight
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }

    // ── Idle detection ──
    const nowPerf = performance.now()
    const idleMs = nowPerf - lastInteractionTime
    if (isVisible && !currentAction) {
      if (idleMs > IDLE_SLEEP_MS && idlePhase !== 'asleep') {
        idlePhase = 'asleep'
        triggerAction('Yawn')
      } else if (idleMs > IDLE_YAWN_MS && idlePhase === 'awake') {
        idlePhase = 'drowsy'
        triggerAction('Yawn')
      }
    }

    ctx.clearRect(0, 0, w, h)

    // ── Live2D action bridge ──
    const currentPetAction = currentAction?.action ?? null
    if (currentPetAction !== _lastAction) {
      _lastAction = currentPetAction
      _onAction?.(currentPetAction)
    }

    // Clean up expired action
    if (currentAction) {
      if (nowPerf - currentAction.startTime >= currentAction.duration) {
        currentAction = null
      }
    }

    // ── Draw overlays ──
    if (_moveMode) {
      drawMoveIndicator(ctx, w, h)
    }

    // ── FPS counter ──
    _frameTimes.push(nowPerf)
    while (_frameTimes.length > 0 && _frameTimes[0] < nowPerf - 1000) {
      _frameTimes.shift()
    }
    if (_frameTimes.length > 1) {
      _fps = Math.round((_frameTimes.length - 1) / ((nowPerf - _frameTimes[0]) / 1000))
    }
    if (_showFps) {
      drawFps(ctx, w, _fps, currentPetAction, idlePhase)
    }

    animId = requestAnimationFrame(render)
  }

  function start() {
    if (animId !== null) return
    startTime = 0
    animId = requestAnimationFrame(render)
  }

  function stop() {
    if (animId !== null) {
      cancelAnimationFrame(animId)
      animId = null
    }
  }

  function setMoveMode(v: boolean) {
    _moveMode = v
  }

  function setShowFps(v: boolean) {
    _showFps = v
  }

  onUnmounted(stop)

  return {
    canvasRef, start, stop,
    triggerDance, triggerAction,
    setMoveMode, notifyInteraction, setVisible, setMousePos,
    setActionCallback, setMouseCallback,
    setShowFps,
  }
}

// ── Overlay drawing functions ──

function drawMoveIndicator(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  const borderWidth = Math.max(2, Math.floor(Math.min(w, h) / 400))
  ctx.save()
  ctx.setLineDash([6, 4])
  ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)'
  ctx.lineWidth = borderWidth
  ctx.strokeRect(borderWidth / 2, borderWidth / 2, w - borderWidth, h - borderWidth)

  const fontSize = Math.max(12, Math.floor(w / 55))
  ctx.font = `${fontSize}px "Microsoft YaHei", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillStyle = 'rgba(100, 200, 255, 0.4)'
  ctx.fillText('拖拽移动', w / 2, h - 6)
  ctx.restore()
}

function drawFps(
  ctx: CanvasRenderingContext2D,
  w: number,
  fps: number,
  action: PetAction | null,
  idle: string,
) {
  ctx.save()
  const fontSize = Math.max(10, Math.floor(w / 80))
  ctx.font = `${fontSize}px monospace`
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  const color = fps >= 55 ? '#4CAF50' : fps >= 30 ? '#FF9800' : '#F44336'
  ctx.fillStyle = color
  ctx.globalAlpha = 0.7
  const info = `${fps} FPS${action ? ' | ' + action : ''}${idle !== 'awake' ? ' | ' + idle : ''}`
  ctx.fillText(info, w - 6, 6)
  ctx.restore()
}
