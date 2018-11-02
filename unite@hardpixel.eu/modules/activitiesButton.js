const Lang  = imports.lang;
const Shell = imports.gi.Shell;
const Main  = imports.ui.main;
const Unite = imports.misc.extensionUtils.getCurrentExtension();
const Base  = Unite.imports.module.BaseModule;

var ActivitiesButton = new Lang.Class({
  Name: 'Unite.ActivitiesButton',
  Extends: Base,
  EnableKey: 'hide-activities-button',
  DisableValue: 'never',

  _onInitialize() {
    this._container = Main.panel.statusArea.activities.container;
  },

  _onActivate() {
    let appSystem  = Shell.AppSystem.get_default();
    let winTracker = Shell.WindowTracker.get_default();

    this._signals.connect(appSystem, 'app-state-changed', this._toggleButton);
    this._signals.connect(winTracker, 'notify::focus-app', this._toggleButton);

    this._signals.connect(Main.overview, 'showing', this._toggleButton);
    this._signals.connect(Main.overview, 'hiding', this._toggleButton);

    this._toggleButton();
  },

  _onDeactivate() {
    this._container.show();
  },

  _toggleButton() {
    let overview = Main.overview.visibleTarget;
    let target   = Main.panel.statusArea.appMenu._targetApp != null;
    let appmenu  = target && !overview;
    let hidden   = this._enabled == 'always' || appmenu;

    if (!hidden && this._settings.get('show-desktop-name'))
      hidden = !target && !overview;

    hidden ? this._container.hide() : this._container.show()
  }
});
