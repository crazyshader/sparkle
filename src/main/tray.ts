import { Tray, Menu, app, BrowserWindow } from "electron"
import { getResourcePath } from "@main/utils"

type TrayLocale = "en" | "zh-CN"

const TRAY_LABELS: Record<TrayLocale, { open: string; quit: string }> = {
  en: { open: "Open Window", quit: "Quit" },
  "zh-CN": { open: "打开窗口", quit: "退出" },
}

let activeTray: Tray | null = null
let activeWindow: BrowserWindow | null = null
let locale: TrayLocale = "en"

function buildContextMenu(window: BrowserWindow): Menu {
  const labels = TRAY_LABELS[locale]
  return Menu.buildFromTemplate([
    { label: labels.open, click: (): void => window.show() },
    { label: labels.quit, click: (): void => app.quit() },
  ])
}

export function createTray(mainWindow: BrowserWindow): Tray {
  const tray = new Tray(getResourcePath("sparkle2.ico"))
  activeTray = tray
  activeWindow = mainWindow

  tray.setToolTip("Sparkle Optimizer")
  tray.setTitle("Sparkle Optimizer")
  tray.setContextMenu(buildContextMenu(mainWindow))
  tray.on("click", (): void => ToggleWindowState(mainWindow))

  return tray
}

/** Update the tray menu language. No-op while the tray is disabled. */
export function setTrayLocale(next: TrayLocale): void {
  locale = next
  if (activeTray && activeWindow) {
    activeTray.setContextMenu(buildContextMenu(activeWindow))
  }
}

/** Forget the current tray (call it after destroying the tray). */
export function clearTray(): void {
  activeTray = null
  activeWindow = null
}

function ToggleWindowState(mainWindow: BrowserWindow): void {
  mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
}
