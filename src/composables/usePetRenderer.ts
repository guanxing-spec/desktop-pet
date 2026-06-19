import { ref, onUnmounted } from 'vue'

export interface BarrageItem {
  id: number
  text: string
  track: number
  speed: number
  birth: number
}

export type PetAction = 'JumpLight' | 'ComboBreak' | 'CrazyDance' | 'Yawn' | 'Talk'

interface ActiveAction {
  action: PetAction
  startTime: number
  duration: number
}

// ── Action-contextual barrage texts ──
const ACTION_BARRAGES: Record<PetAction, string[]> = {
  JumpLight: ['诶？就这力度？', '哼！没吃饭吗？', '你手速好慢哦～', '轻飘飘~'],
  ComboBreak: ['加油加油！论文必过！', '不错嘛，再来！', '连击！', '手速不错嘛'],
  CrazyDance: ['看呆了吧！200年的舞步！', '录屏发宿舍群！', '嗨起来了！', '好嗨哟~'],
  Yawn: ['困死啦……你帮我写作业～', '好困...', 'zzZ', '眼睛睁不开了…'],
  Talk: ['说点什么好呢', '今天天气不错', '嗯…', '好无聊，写会作业？'],
}

export function usePetRenderer() {
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  let animId: number | null = null
  let startTime = 0

  // FSM action state
  let currentAction: ActiveAction | null = null

  // Barrage state
  const barrages: BarrageItem[] = []
  let nextBarrageId = 0
  let nextTrack = 0
  let _moveMode = false

  const ACTION_DURATION: Record<PetAction, number> = {
    JumpLight: 400,
    ComboBreak: 600,
    CrazyDance: 800,
    Yawn: 1200,
    Talk: 500,
  }

  // ── Idle system ──
  const IDLE_YAWN_MS = 15000
  const IDLE_SLEEP_MS = 30000
  let lastInteractionTime = performance.now()
  let isVisible = true
  let idlePhase: 'awake' | 'drowsy' | 'asleep' = 'awake'

  // ── FPS counter ──
  let _frameTimes: number[] = []
  let _fps = 60

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

    // Push contextual barrage
    const texts = ACTION_BARRAGES[action]
    addBarrage(texts[Math.floor(Math.random() * texts.length)])

    const now = performance.now()
    currentAction = {
      action,
      startTime: now,
      duration: ACTION_DURATION[action],
    }
  }

  function addBarrage(text: string) {
    const elapsed = startTime ? (performance.now() - startTime) / 1000 : 0
    barrages.push({
      id: nextBarrageId++,
      text,
      track: nextTrack,
      speed: 70 + Math.random() * 30,
      birth: elapsed,
    })
    if (barrages.length > 10) barrages.splice(0, barrages.length - 10)
    nextTrack = (nextTrack + 1) % 3
  }

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

  function idleBarrageText(): string {
    if (idlePhase === 'drowsy')
      return ['有点困了…', '好想睡觉', '眼睛打架了'][Math.floor(Math.random() * 3)]
    if (idlePhase === 'asleep')
      return ['zzZ', '呼呼…', '睡得好香', '别吵我…'][Math.floor(Math.random() * 4)]
    return ''
  }

  function render(timestamp: number) {
    const canvas = canvasRef.value
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (startTime === 0) startTime = timestamp
    const elapsed = (timestamp - startTime) / 1000

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
        _onAction?.('Yawn')
        triggerAction('Yawn')
        addBarrage(idleBarrageText())
      } else if (idleMs > IDLE_YAWN_MS && idlePhase === 'awake') {
        idlePhase = 'drowsy'
        _onAction?.('Yawn')
        triggerAction('Yawn')
        addBarrage(idleBarrageText())
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
    drawBarrages(ctx, elapsed, w, h, barrages)

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
    drawFps(ctx, w, _fps, currentPetAction, idlePhase)

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

  onUnmounted(stop)

  return {
    canvasRef, start, stop,
    triggerDance, triggerAction, addBarrage,
    setMoveMode, notifyInteraction, setVisible, setMousePos,
    setActionCallback, setMouseCallback,
  }
}

// ── Overlay drawing functions ──

function drawBarrages(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  w: number,
  h: number,
  items: BarrageItem[],
) {
  if (items.length === 0) return

  const fontSize = Math.max(13, Math.floor(h / 28))
  const lineHeight = fontSize * 1.6
  const tracksTop = h * 0.68

  ctx.save()
  ctx.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'

  for (const item of items) {
    const age = elapsed - item.birth
    const x = w - age * item.speed
    const y = tracksTop + item.track * lineHeight

    if (x + fontSize * item.text.length * 0.6 < 0) continue
    if (x > w) continue

    let alpha = 1
    if (age < 0.3) alpha = age / 0.3

    ctx.globalAlpha = alpha
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'
    ctx.lineWidth = 3
    ctx.lineJoin = 'round'
    ctx.strokeText(item.text, x, y)
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(item.text, x, y)
  }

  ctx.globalAlpha = 1
  ctx.restore()
}

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
