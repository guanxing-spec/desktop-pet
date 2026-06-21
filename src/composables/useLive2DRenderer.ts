import * as PIXI from 'pixi.js'
import { Live2DModel, cubism4Ready } from 'pixi-live2d-display/cubism4'
import { ref } from 'vue'

export type Live2DMotion = 'Idle' | 'TapBody' | 'Emote' | 'Action' | 'Special'

export function useLive2DRenderer() {
  let app: PIXI.Application | null = null
  let model: Live2DModel | null = null
  let _isReady = false
  let _currentFactor = 0.5
  const initError = ref<string | null>(null)
  let _repositionHandler: (() => void) | null = null

  // Bobbing animation for movement
  let _bobActive = false
  let _bobAnimId: number | null = null
  let _baseY = 0
  let _bobAmplitude = 0
  let _bobSpeed = 0

  async function init(canvasEl: HTMLCanvasElement, modelUrl: string): Promise<boolean> {
    try {
      await cubism4Ready()

      app = new PIXI.Application({
        view: canvasEl,
        backgroundAlpha: 0,
        resizeTo: window,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      })

      // Expose PIXI globally so pixi-live2d-display can find Ticker for auto-update
      ;(window as any).PIXI = PIXI

      model = await Live2DModel.from(modelUrl, { autoInteract: false })
      app.stage.addChild(model)

      // Auto-scale to fit window
      model.anchor.set(0.5, 0.5)
      applyScale()

      // Auto-center on resize — offset Y to show full body
      _repositionHandler = () => {
        if (!model) return
        model.position.set(window.innerWidth / 2, window.innerHeight * 0.55)
      }
      _repositionHandler()
      window.addEventListener('resize', _repositionHandler)

      // Start idle
      _playMotion('Idle')

      _isReady = true
      initError.value = null
      return true
    } catch (err) {
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
      console.error('Live2D init failed:', err)
      initError.value = msg
      _isReady = false
      return false
    }
  }

  function _playMotion(name: string) {
    if (!model || !_isReady) return
    try {
      model.motion(name)
    } catch {
      // motion not found — ignore
    }
  }

  function applyScale() {
    if (!model) return
    const iw = (model as any).internalModel?.originalWidth ?? 600
    const ih = (model as any).internalModel?.originalHeight ?? 800
    const scaleX = (window.innerWidth * _currentFactor) / iw
    const scaleY = (window.innerHeight * _currentFactor) / ih
    model.scale.set(Math.max(0.06, Math.min(scaleX, scaleY)))
  }

  function setScaleFactor(factor: number) {
    _currentFactor = factor
    applyScale()
  }

  function playMotion(action: Live2DMotion) {
    _playMotion(action)
  }

  function returnToIdle() {
    _playMotion('Idle')
  }

  /** Start a bobbing animation (walking: fast/small, flying: slow/gentle) */
  function startBob(style: 'walk' | 'climb' | 'fly') {
    if (!model || _bobActive) return
    _bobActive = true
    _baseY = model.position.y
    switch (style) {
      case 'climb': _bobAmplitude = 4; _bobSpeed = 300; break
      case 'fly':   _bobAmplitude = 6; _bobSpeed = 600; break
      default:      _bobAmplitude = 3; _bobSpeed = 180; break
    }

    function bobFrame() {
      if (!_bobActive || !model) return
      const t = performance.now() / _bobSpeed
      model.position.y = _baseY + Math.sin(t * Math.PI * 2) * _bobAmplitude
      _bobAnimId = requestAnimationFrame(bobFrame)
    }
    bobFrame()
  }

  function stopBob() {
    _bobActive = false
    if (_bobAnimId) { cancelAnimationFrame(_bobAnimId); _bobAnimId = null }
    if (model) model.position.y = _baseY
  }

  function setMousePos(x: number, y: number) {
    if (!model || !_isReady) return
    try {
      // Built-in focus API — handles head/eye tracking with smooth interpolation
      model.focus(x, y)
    } catch {
      // focus may not be available before model is fully ready
    }
  }

  function destroy() {
    if (_repositionHandler) window.removeEventListener('resize', _repositionHandler)
    if (app) {
      app.destroy(true, { children: true })
      app = null
    }
    model = null
    _isReady = false
  }

  return {
    init,
    playMotion,
    returnToIdle,
    setMousePos,
    setScaleFactor,
    startBob,
    stopBob,
    destroy,
    get isReady() { return _isReady },
    get error() { return initError },
  }
}
