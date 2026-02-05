import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js'
import * as Main from 'resource:///org/gnome/shell/ui/main.js'
import * as Handlers from './handlers.js'
import { PanelManager } from './panel.js'
import { LayoutManager } from './layout.js'
import { WindowManager } from './window.js'

export default class UniteExtension extends Extension {
  enable() {
    global.unite = this

    this.windowManager = new WindowManager()
    this.panelManager  = new PanelManager()
    this.layoutManager = new LayoutManager()

    Handlers.resetGtkStyles()

    this.panelManager.activate()
    this.layoutManager.activate()
    this.windowManager.activate()

    Main.panel.add_style_class_name('unite-shell')
  }

  disable() {
    // 1. Disconnect Signals
    if (this.handlers) {
      this.handlers.forEach((handler) => {
        try {
          if (handler) handler.disconnect()
        } catch (e) {
          /* Ignore */
        }
      })
    }
    this.handlers = []

    // 2. Destroy Managers
    const managers = [
      'windowManager',
      'panelManager',
      'layoutManager',
      'platform',
    ]
    managers.forEach((mgr) => {
      try {
        if (this[mgr]) {
          if (this[mgr].destroy) {
            this[mgr].destroy()
          } else if (this[mgr].deactivate) {
            this[mgr].deactivate()
          }
        }
      } catch (e) {
        // Log removed to keep PR clean, or use console.debug if preferred
      }
      this[mgr] = null
    })

    // 3. FORCE REMOVE PANEL INDICATORS
    // Fixes 'Extension point conflict' crash on unlock
    const zombieRoles = [
      'uniteWindowControls',
      'uniteAppMenu',
      'uniteTray',
      'uniteDesktopLabel',
    ]
    zombieRoles.forEach((role) => {
      try {
        if (Main.panel.statusArea[role]) {
          let actor = Main.panel.statusArea[role]
          if (actor && actor.destroy) {
            actor.destroy()
          } else if (
            actor &&
            actor.container &&
            actor.container.destroy
          ) {
            actor.container.destroy()
          }
          delete Main.panel.statusArea[role]
        }
      } catch (e) {
        try {
          delete Main.panel.statusArea[role]
        } catch (z) {}
      }
    })

    // 4. Remove Shell Style
    try {
      Main.panel.remove_style_class_name('unite-shell')
    } catch (e) {}

    // 5. Clean up Settings
    try {
      if (this.settings) {
        this.settings.runDispose()
        this.settings = null
      }
    } catch (e) {}

    // 6. CLEAR GLOBAL REF (Fixes Memory Leak)
    if (global.unite === this) {
      global.unite = null
    }

    // 7. Force GC
    try {
      if (global.gc) global.gc()
    } catch (e) {}
  }

  get focusApp() {
    return this.windowManager && this.windowManager.focusApp
      ? this.windowManager.focusApp
      : null
  }

  get focusWindow() {
    return this.windowManager && this.windowManager.focusWindow
      ? this.windowManager.focusWindow
      : null
  }
}
