const Shell = imports.gi.Shell
const Main  = imports.ui.main
const Unite = imports.misc.extensionUtils.getCurrentExtension()
const Base  = Unite.imports.module.BaseModule

var ActivitiesButton = class ActivitiesButton extends Base {
  _onSetup() {
    this._enableKey    = 'hide-activities-button'
    this._disableValue = 'never'
  }

  _onInitialize() {
    this._container = Main.panel.statusArea.activities.container
    this.appSystem  = Shell.AppSystem.get_default()
    this.winTracker = Shell.WindowTracker.get_default()
  }

  _onActivate() {
    this._signals.connect(this.appSystem, 'app-state-changed', 'toggleButton')
    this._signals.connect(this.winTracker, 'notify::focus-app', 'toggleButton')

    this._signals.connect(Main.overview, 'showing', 'toggleButton')
    this._signals.connect(Main.overview, 'hiding', 'toggleButton')

    this._toggleButton()
  }

  _onReset() {
    this._toggleButton()
  }

  _onDeactivate() {
    this._container.show()
  }

  _toggleButton() {
    let appMenu  = Main.panel.statusArea.appMenu._targetApp != null
    let overview = Main.overview.visibleTarget
    let hidden   = this._setting == 'always' || (appMenu && !overview)

    if (!hidden && this._settings.get('show-desktop-name'))
      hidden = !appMenu && !overview

    this._container.visible = !hidden
  }
}
