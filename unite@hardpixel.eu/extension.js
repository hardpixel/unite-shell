const GObject       = imports.gi.GObject
const Main          = imports.ui.main
const Unite         = imports.misc.extensionUtils.getCurrentExtension()
const WindowManager = Unite.imports.window.WindowManager
const PanelManager  = Unite.imports.panel.PanelManager

var UniteShell = GObject.registerClass(
  class UniteShell extends GObject.Object {
    _init() {
      this.windowManager = new WindowManager()
      this.panelManager  = new PanelManager()

      Main.panel._addStyleClassName('unite-shell')
    }

    get focusWindow() {
      return this.windowManager.focusWindow
    }

    destroy() {
      this.windowManager.destroy()
      this.panelManager.destroy()

      Main.panel._removeStyleClassName('unite-shell')
    }
  }
)

function enable() {
  global.uniteShell = new UniteShell()
}

function disable() {
  global.uniteShell.destroy()
  global.uniteShell = null
}
