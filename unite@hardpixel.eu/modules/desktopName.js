const GObject      = imports.gi.GObject;
const St           = imports.gi.St;
const Shell        = imports.gi.Shell;
const Main         = imports.ui.main;
const Unite        = imports.misc.extensionUtils.getCurrentExtension();
const Base         = Unite.imports.module.BaseModule;
const toggleWidget = Unite.imports.helpers.toggleWidget;

var DesktopName = new GObject.Class({
  Name: 'Unite.DesktopName',
  Extends: Base,

  _enableKey: 'show-desktop-name',
  _enableValue: true,

  _onInitialize() {
    this.appSystem  = Shell.AppSystem.get_default();
    this.winTracker = Shell.WindowTracker.get_default();
    this.appMenu    = Main.panel.statusArea.appMenu;
  },

  _onActivate() {
    this._signals.connect(this.appSystem, 'app-state-changed', 'toggleLabel');
    this._signals.connect(this.winTracker, 'notify::focus-app', 'toggleLabel');

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
    this._labelText.set_text(text);
  },

  _toggleLabel() {
    let appMenu  = this.appMenu._targetApp != null;
    let overview = Main.overview.visibleTarget;
    let visible  = !appMenu && !overview;

    if (visible)
      visible = visible && !this._visibleWindows();

    toggleWidget(this._labelBox, !visible);
    toggleWidget(this.appMenu.container, visible);
  },

  _createLabel() {
    if (this._labelBox) return;

    this._labelBox = new St.BoxLayout({ style_class: 'panel-button' });
    this._labelBox.hide();

    this._labelActor = new St.Bin({ style_class: 'desktop-name' });
    this._labelBox.add_actor(this._labelActor);

    this._labelText = new St.Label();
    this._labelActor.add_actor(this._labelText);

    Main.panel._leftBox.insert_child_at_index(this._labelBox, 1);
  }
});
