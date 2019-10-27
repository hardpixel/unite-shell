const GObject       = imports.gi.GObject
const Main          = imports.ui.main
const Unite         = imports.misc.extensionUtils.getCurrentExtension()
const PanelManager  = Unite.imports.panel.PanelManager
const WindowManager = Unite.imports.window.WindowManager

var UniteShell = GObject.registerClass(
  class UniteShell extends GObject.Object {
    _init() {
      this.panelManager  = new PanelManager()
      this.windowManager = new WindowManager()
    }

    get focusWindow() {
      return this.windowManager.focusWindow
    }

    activate() {
      this.panelManager.activate()
      this.windowManager.activate()

      Main.panel._addStyleClassName('unite-shell')
    }

    destroy() {
      this.panelManager.destroy()
      this.windowManager.destroy()

      Main.panel._removeStyleClassName('unite-shell')
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
