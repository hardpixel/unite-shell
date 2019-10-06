const Main  = imports.ui.main
const Unite = imports.misc.extensionUtils.getCurrentExtension()
const Base  = Unite.imports.module.BaseModule

var ActivateWindow = class ActivateWindow extends Base {
  _onSetup() {
    this._enableKey   = 'autofocus-windows'
    this._enableValue = true
  }

  _onActivate() {
    this._signals.connect(global.display, 'window-demands-attention', 'focusWindow')
  }

  _focusWindow(actor, win) {
    Main.activateWindow(win, global.get_current_time())
  }
}
