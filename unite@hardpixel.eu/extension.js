const GObject       = imports.gi.GObject
const Main          = imports.ui.main
const Unite         = imports.misc.extensionUtils.getCurrentExtension()
const WindowManager = Unite.imports.window.WindowManager

var UniteShell = GObject.registerClass(
  class UniteShell extends GObject.Object {
    _init() {
      this.windowManager = new WindowManager()

      Main.panel._addStyleClassName('unite-shell')
    }

    destroy() {
      this.windowManager.destroy()

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
