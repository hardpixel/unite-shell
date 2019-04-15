const GObject      = imports.gi.GObject;
const Shell        = imports.gi.Shell;
const Main         = imports.ui.main;
const Unite        = imports.misc.extensionUtils.getCurrentExtension();
const Base         = Unite.imports.module.BaseModule;
const DesktopLabel = Unite.imports.panel.DesktopLabel;

var DesktopName = new GObject.Class({
  Name: 'UniteDesktopName',
  Extends: Base,

  _enableKey: 'show-desktop-name',
  _enableValue: true,

  _onInitialize() {
    this.appSystem  = Shell.AppSystem.get_default();
    this.winTracker = Shell.WindowTracker.get_default();
  },

  _onActivate() {
    this._signals.connect(this.appSystem, 'app-state-changed', 'toggleLabel');
    this._signals.connect(this.winTracker, 'notify::focus-app', 'toggleLabel');

    this._signals.connect(Main.overview, 'showing', 'toggleLabel');
    this._signals.connect(Main.overview, 'hiding', 'toggleLabel');

    this._settings.connect('desktop-name-text', 'setLabelText');

    this._createLabel();
  },

  _onDeactivate() {
    if (!this._label) return;

    this._label.destroy();
    this._label = null;
  },

  _visibleWindows() {
    let windows = global.get_window_actors().find(win => {
      let visible = win.metaWindow.showing_on_its_workspace();
      let skipped = win.metaWindow.skip_taskbar;

      return visible && !skipped;
    });

    return windows;
  },

  _setLabelText() {
    let text = this._settings.get('desktop-name-text');
    this._label.setText(text);
  },

  _toggleLabel() {
    let appMenu  = Main.panel.statusArea.appMenu._targetApp != null;
    let overview = Main.overview.visibleTarget;
    let visible  = !appMenu && !overview;

    if (visible)
      visible = visible && !this._visibleWindows();

    this._label.setVisible(visible);
  },

  _createLabel() {
    if (this._label) return;

    this._label = new DesktopLabel();
    Main.panel.addToStatusArea('uniteDesktopLabel', this._label, 1, 'left');

    this._setLabelText();
    this._toggleLabel();
  }
});
