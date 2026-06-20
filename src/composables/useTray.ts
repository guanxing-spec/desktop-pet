import { TrayIcon } from '@tauri-apps/api/tray'
import { Menu, MenuItem, CheckMenuItem, Submenu, PredefinedMenuItem } from '@tauri-apps/api/menu'
import { getCurrentWindow, PhysicalSize } from '@tauri-apps/api/window'
import { invoke } from '@tauri-apps/api/core'

const BASE_W = 300
const BASE_H = 340

let passThroughCheck: CheckMenuItem | null = null

export async function setupTray(opts: {
  onToggleMoveMode: () => void
  onSetClickThrough?: (enabled: boolean) => void
}) {
  const tray = await TrayIcon.getById('main-tray')
  if (!tray) {
    console.warn('[Tray] main-tray not found, skipping')
    return
  }

  const showHide = await MenuItem.new({
    text: '显示/隐藏',
    action: async () => {
      const win = getCurrentWindow()
      if (await win.isVisible()) {
        await win.hide()
      } else {
        await win.show()
      }
    },
  })

  const moveMode = await MenuItem.new({
    text: '移动模式',
    action: () => opts.onToggleMoveMode(),
  })

  const sep1 = await PredefinedMenuItem.new({ item: 'Separator' })

  passThroughCheck = await CheckMenuItem.new({
    text: '穿透模式',
    checked: false,
    action: async () => {
      const checked = await passThroughCheck!.isChecked()
      await getCurrentWindow().setIgnoreCursorEvents(checked)
      opts.onSetClickThrough?.(checked)
    },
  })

  const scaleSubmenu = await Submenu.new({ text: '缩放' })
  for (const s of [50, 75, 100, 125, 150]) {
    await scaleSubmenu.append(
      await MenuItem.new({
        text: `${s}%`,
        action: async () => {
          await getCurrentWindow().setSize(
            new PhysicalSize(
              Math.round(BASE_W * s / 100),
              Math.round(BASE_H * s / 100),
            ),
          )
        },
      }),
    )
  }

  const sep2 = await PredefinedMenuItem.new({ item: 'Separator' })

  const quit = await MenuItem.new({
    text: '退出',
    action: () => invoke('exit_app').catch(() => {}),
  })

  const menu = await Menu.new({
    items: [showHide, moveMode, sep1, passThroughCheck, scaleSubmenu, sep2, quit],
  })

  await tray.setMenu(menu)
}

/** 穿透模式（由 Ctrl+Shift+M 等快捷键触发时同步托盘勾选状态） */
export async function setPassThroughChecked(checked: boolean) {
  if (passThroughCheck) {
    await passThroughCheck.setChecked(checked)
  }
}
