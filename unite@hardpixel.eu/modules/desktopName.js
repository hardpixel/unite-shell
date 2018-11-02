const Lang  = imports.lang;
const St    = imports.gi.St;
const Shell = imports.gi.Shell;
const Main  = imports.ui.main;
const Unite = imports.misc.extensionUtils.getCurrentExtension();
const Base  = Unite.imports.module.BaseModule;

var DesktopName = new Lang.Class({
  Name: 'Unite.DesktopName',
  Extends: Base,
  EnableKey: 'show-desktop-name',
  EnableValue: true,

  _onInitialize() {
    this._settings.connect('desktop-name-text', this._setLabelText);
  },

  _onActivate() {
    let appSystem  = Shell.AppSystem.get_default();
    let winTracker = Shell.WindowTracker.get_default();

    this._signals.connect(appSystem, 'app-state-changed', this._toggleLabel);
    this._signals.connect(winTracker, 'notify::focus-app', this._toggleLabel);

    this._signals.connect(Main.overview, 'showing', this._toggleLabel);
    this._signals.connect(Main.overview, 'hiding', this._toggleLabel);

    this._createLabel();
    this._setLabelText();
    this._toggleLabel();
  },

  _onDeactivate() {
    if (!this._labelBox) return;

    this._labelBox.destroy();

    delete this._labelBox;
    delete this._labelActor;
    delete this._labelText;
    delete Main.panel._desktopName;
  },

  _setLabelText() {
    let text = this._settings.get('desktop-name-text');
    this._labelText.set_text(text);
  },

  _toggleLabel() {
    let show = Main.panel.statusArea.appMenu._targetApp == null
      && !Main.overview.visibleTarget;

    show ? this._labelBox.show() : this._labelBox.hide()
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
