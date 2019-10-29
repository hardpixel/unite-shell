const GObject       = imports.gi.GObject
const Main          = imports.ui.main
const Unite         = imports.misc.extensionUtils.getCurrentExtension()
const PanelManager  = Unite.imports.panel.PanelManager
const LayoutManager = Unite.imports.layout.LayoutManager
const WindowManager = Unite.imports.window.WindowManager

var UniteExtension = GObject.registerClass(
  class UniteExtension extends GObject.Object {
    _init() {
      this.panelManager  = new PanelManager()
      this.layoutManager = new LayoutManager()
      this.windowManager = new WindowManager()
    }

    get focusWindow() {
      return this.windowManager.focusWindow
    }

    activate() {
      this.panelManager.activate()
      this.layoutManager.activate()
      this.windowManager.activate()

      Main.panel._addStyleClassName('unite-shell')
    }

    destroy() {
      this.panelManager.destroy()
      this.layoutManager.destroy()
      this.windowManager.destroy()

      Main.panel._removeStyleClassName('unite-shell')
    }
  }
)

function enable() {
  global.unite = new UniteExtension()
  global.unite.activate()
}

function disable() {
  global.unite.destroy()
  global.unite = null
}
