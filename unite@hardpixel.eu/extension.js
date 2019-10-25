const GObject       = imports.gi.GObject
const Unite         = imports.misc.extensionUtils.getCurrentExtension()
const WindowManager = Unite.imports.window.WindowManager
const PanelManager  = Unite.imports.panel.PanelManager
const ThemeManager  = Unite.imports.theme.ThemeManager

var UniteShell = GObject.registerClass(
  class UniteShell extends GObject.Object {
    _init() {
      this.windowManager = new WindowManager()
      this.panelManager  = new PanelManager()
      this.themeManager  = new ThemeManager()
    }

    get focusWindow() {
      return this.windowManager.focusWindow
    }

    activate() {
      this.windowManager.activate()
      this.panelManager.activate()
      this.themeManager.activate()
    }

    destroy() {
      this.windowManager.destroy()
      this.panelManager.destroy()
      this.themeManager.destroy()
    }
  }
)

function enable() {
  global.uniteShell = new UniteShell()
  global.uniteShell.activate()
}

function disable() {
  global.uniteShell.destroy()
  global.uniteShell = null
}
