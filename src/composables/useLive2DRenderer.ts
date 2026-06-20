import * as PIXI from 'pixi.js'
import { Live2DModel, cubism4Ready } from 'pixi-live2d-display/cubism4'
import { ref } from 'vue'

export type Live2DMotion = 'Idle' | 'TapBody'

export function useLive2DRenderer() {
  let app: PIXI.Application | null = null
  let model: Live2DModel | null = null
  let _isReady = false
  const initError = ref<string | null>(null)

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

      // Auto-scale to fit window — read model's actual canvas size
      const iw = (model as any).internalModel?.originalWidth ?? 600
      const ih = (model as any).internalModel?.originalHeight ?? 800
      const scaleX = (window.innerWidth * 0.6) / iw
      const scaleY = (window.innerHeight * 0.6) / ih
      model.anchor.set(0.5, 0.5)
      model.scale.set(Math.max(0.06, Math.min(scaleX, scaleY, 0.4)))

      // Auto-center on resize
      const reposition = () => {
        if (!model) return
        model.position.set(window.innerWidth / 2, window.innerHeight * 0.5)
      }
      reposition()
      window.addEventListener('resize', reposition)

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

  function playMotion(action: Live2DMotion) {
    _playMotion(action)
  }

  function returnToIdle() {
    _playMotion('Idle')
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
    window.removeEventListener('resize', () => {})
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
    destroy,
    get isReady() { return _isReady },
    get error() { return initError },
  }
}
