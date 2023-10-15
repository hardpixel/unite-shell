import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js'
import * as Main from 'resource:///org/gnome/shell/ui/main.js'
import * as Handlers from './handlers.js'
import { PanelManager } from './panel.js'
import { LayoutManager } from './layout.js'
import { WindowManager } from './window.js'

export default class UniteExtension extends Extension {
  enable() {
    global.unite = this

    this.panelManager  = new PanelManager()
    this.layoutManager = new LayoutManager()
    this.windowManager = new WindowManager()

    Handlers.resetGtkStyles()

    this.panelManager.activate()
    this.layoutManager.activate()
    this.windowManager.activate()

    Main.panel.add_style_class_name('unite-shell')
  }

  disable() {
    Handlers.resetGtkStyles()

    this.panelManager.destroy()
    this.layoutManager.destroy()
    this.windowManager.destroy()

    Main.panel.remove_style_class_name('unite-shell')

    global.unite = null
  }

  get focusWindow() {
    return this.windowManager.focusWindow
  }
}
