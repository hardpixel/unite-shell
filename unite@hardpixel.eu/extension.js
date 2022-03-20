const GObject       = imports.gi.GObject
const Main          = imports.ui.main
const Me            = imports.misc.extensionUtils.getCurrentExtension()
const Handlers      = Me.imports.handlers
const PanelManager  = Me.imports.panel.PanelManager
const LayoutManager = Me.imports.layout.LayoutManager
const WindowManager = Me.imports.window.WindowManager

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
      Handlers.resetGtkStyles()

      this.panelManager.activate()
      this.layoutManager.activate()
      this.windowManager.activate()

      Main.panel.add_style_class_name('unite-shell')
    }

    destroy() {
      Handlers.resetGtkStyles()

      this.panelManager.destroy()
      this.layoutManager.destroy()
      this.windowManager.destroy()

      Main.panel.remove_style_class_name('unite-shell')
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
