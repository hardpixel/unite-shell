const Lang  = imports.lang;
const St    = imports.gi.St;
const Shell = imports.gi.Shell;
const Main  = imports.ui.main;
const Unite = imports.misc.extensionUtils.getCurrentExtension();
const Base  = Unite.imports.module.BaseModule;

var DesktopName = new Lang.Class({
  Name: 'Unite.DesktopName',
  Extends: Base,

  _enableKey: 'show-desktop-name',
  _enableValue: true,

  _onActivate() {
    let appSystem  = Shell.AppSystem.get_default();
    let winTracker = Shell.WindowTracker.get_default();

    this._signals.connect(appSystem, 'app-state-changed', 'toggleLabel');
    this._signals.connect(winTracker, 'notify::focus-app', 'toggleLabel');

    this._signals.connect(Main.overview, 'showing', 'toggleLabel');
    this._signals.connect(Main.overview, 'hiding', 'toggleLabel');

    this._settings.connect('desktop-name-text', 'setLabelText');

    this._createLabel();
    this._setLabelText();
    this._toggleLabel();
  },

  _onDeactivate() {
    if (!this._labelBox) return;

    this._labelBox.destroy();

    this._labelBox   = null;
    this._labelActor = null;
    this._labelText  = null;
  },

  _setLabelText() {
    let text = this._settings.get('desktop-name-text');
    this._labelText.set_text(text);
  },

  _toggleLabel() {
    let appMenu  = Main.panel.statusArea.appMenu._targetApp != null;
    let overview = Main.overview.visibleTarget;
    let visible  = !appMenu && !overview;

    visible ? this._labelBox.show() : this._labelBox.hide()
  },

  _createLabel() {
    if (this._labelBox) return;

    this._labelBox = new St.BoxLayout({ style_class: 'panel-button' });
    this._labelBox.hide();

    this._labelActor = new St.Bin({ style_class: 'desktop-name' });
    this._labelBox.add_actor(this._labelActor);

    this._labelText = new St.Label();
    this._labelActor.add_actor(this._labelText);

    let activities = Main.panel.statusArea.activities.actor.get_parent();
    Main.panel._leftBox.insert_child_below(this._labelBox, activities);
  }
});
