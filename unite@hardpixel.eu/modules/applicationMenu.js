const Shell       = imports.gi.Shell
const Meta        = imports.gi.Meta
const Main        = imports.ui.main
const Unite       = imports.misc.extensionUtils.getCurrentExtension()
const Base        = Unite.imports.module.BaseModule
const isWindow    = Unite.imports.helpers.isWindow
const isMaximized = Unite.imports.helpers.isMaximized

var ApplicationMenu = class ApplicationMenu extends Base {
  _onSetup() {
    this._enableKey    = 'show-window-title'
    this._disableValue = 'never'
  }

  _onInitialize() {
    this.appMenu        = Main.panel.statusArea.appMenu
    this.winTracker     = Shell.WindowTracker.get_default()
    this.monitorManager = Meta.MonitorManager.get()
    this._isUpdating    = false
  }

  _onActivate() {
    this._signals.connect(global.display, 'notify::focus-window', 'updateTitle')
    this._signals.connect(this.monitorManager, 'monitors-changed', 'updateTitle')

    this._signals.connect(global.window_manager, 'size-change', 'updateTitleText')
    this._signals.connect(this.appMenu._label, 'notify::text', 'updateTitleText')

    this._updateTitle()
  }

  _onReset() {
    this._updateTitle()
  }

  _handleWindowTitle(win) {
    if (!isWindow(win) || win._updateTitleID) return

    win._updateTitleID = win.connect(
      'notify::title', () => { this._updateTitleText() }
    )
  }

  _updateTitle() {
    let focusWindow = global.display.focus_window

    this._handleWindowTitle(focusWindow)
    this._updateTitleText()
  }

  _updateTitleText() {
    if (this._isUpdating) return

    let focusApp    = this.winTracker.focus_app
    let focusWindow = global.display.focus_window
    let current     = this.appMenu._label.get_text()
    let maximized   = isMaximized(focusWindow, this._setting)
    let always      = this._setting == 'always' && focusWindow
    let title       = null

    if (always || maximized)
      title = focusWindow.title

    if (!title && focusApp)
      title = focusApp.get_name()

    if (title && title != current) {
      this._isUpdating = true
      this.appMenu._label.set_text(title)
      this._isUpdating = false
    }
  }
}
