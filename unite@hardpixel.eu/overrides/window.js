const Main     = imports.ui.main
const Unite    = imports.misc.extensionUtils.getCurrentExtension()
const AppMenu  = Main.panel.statusArea.appMenu
const Override = Unite.imports.overrides.helper
const VERSION  = Unite.imports.overrides.helper.VERSION

var WindowManager = class WindowManager extends Override.Injection {
  get active() {
    return VERSION < 36
  }

  _init(ctx) {
    ctx.signals.connect(
      AppMenu._label, 'notify::text', this._onAppmenuChanged.bind(ctx)
    )
  }

  _onAppmenuChanged() {
    if (this.focusWindow) {
      this.focusWindow.syncAppmenu()
    }
  }
}
