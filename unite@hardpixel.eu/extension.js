const GObject       = imports.gi.GObject
const Unite         = imports.misc.extensionUtils.getCurrentExtension()
const PanelManager  = Unite.imports.panel.PanelManager
const WindowManager = Unite.imports.window.WindowManager
const ThemeManager  = Unite.imports.theme.ThemeManager

var UniteShell = GObject.registerClass(
  class UniteShell extends GObject.Object {
    _init() {
      this.panelManager  = new PanelManager()
      this.windowManager = new WindowManager()
      this.themeManager  = new ThemeManager()
    }

    get focusWindow() {
      return this.windowManager.focusWindow
    }

    activate() {
      this.panelManager.activate()
      this.windowManager.activate()
      this.themeManager.activate()
    }

    destroy() {
      this.panelManager.destroy()
      this.windowManager.destroy()
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
