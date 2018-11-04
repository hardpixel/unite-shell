const Lang    = imports.lang;
const St      = imports.gi.St;
const Shell   = imports.gi.Shell;
const Meta    = imports.gi.Meta;
const Main    = imports.ui.main;
const Unite   = imports.misc.extensionUtils.getCurrentExtension();
const Base    = Unite.imports.module.BaseModule;
const Helpers = Unite.imports.helpers;

var WindowButtons = new Lang.Class({
  Name: 'Unite.WindowButtons',
  Extends: Base,
  EnableKey: 'show-window-buttons',
  DisableValue: 'never',

  _onActivate() {
    let wmPrefs = Helpers.wmPreferences();
    this._signals.connect(wmPrefs, 'changed::button-layout', this._updateButtons);

    this._signals.connect(global.display, 'notify::focus-window', this._toggleButtons);
    this._signals.connect(global.window_manager, 'size-change', this._toggleButtons);
    this._signals.connect(global.window_manager, 'destroy', this._toggleButtons);

    this._signals.connect(Main.overview, 'showing', this._toggleButtons);
    this._signals.connect(Main.overview, 'hiding', this._toggleButtons);

    this._settings.connect('window-buttons-theme', this._updateTheme);

    this._createButtons();
    this._toggleButtons();
    this._loadTheme();
  },

  _onDeactivate() {
    this._unloadTheme();
    this._destroyButtons();
  },

  _createButton(action) {
    if (!this._buttonsBox) return;

    let style  = `window-button  ${action}`;
    let button = new St.Button({ style_class: style, track_hover: true });
    let icon   = new St.Bin({ style_class: 'icon' });

    button._windowAction = action;

    button.add_actor(icon);
    button.connect('clicked', Lang.bind(this, this._onButtonClick));

    this._buttonsBox.add(button);
  },

  _createButtons() {
    [this._position, this._buttons] = Helpers.getWindowButtons();
    if (!this._buttons || this._buttonsActor) return;

    this._buttonsActor = new St.Bin();
    this._buttonsBox   = new St.BoxLayout({ style_class: 'window-buttons-box' });

    this._buttonsActor.add_actor(this._buttonsBox);
    this._buttonsActor.hide();

    this._buttons.forEach(Lang.bind(this, this._createButton));

    if (this._position == 'left') {
      let appmenu = Main.panel.statusArea.appMenu.actor.get_parent();
      Main.panel._leftBox.insert_child_below(this._buttonsActor, appmenu);
    }

    if (this._position == 'right')
      Main.panel._rightBox.add_child(this._buttonsActor);
  },

  _destroyButtons() {
    if (!this._buttonsActor) return;

    this._buttonsActor.destroy();

    this._buttonsBox   = null;
    this._buttonsActor = null;
  },

  _updateButtons() {
    if (!this._buttonsActor) return;

    this._destroyButtons();
    this._createButtons();
  },

  _updateTheme() {
    this._unloadTheme();
    this._loadTheme();
  },

  _loadTheme() {
    if (this._buttonsTheme || !this._buttonsBox) return;

    let theme   = this._settings.get('window-buttons-theme');
    let cssPath = `themes/${theme}/stylesheet.css`;

    this._buttonsTheme = this.loadStylesheet(cssPath);
    this._buttonsBox.add_style_class_name(`${theme}-buttons`);
  },

  _unloadTheme() {
    if (!this._buttonsTheme || !this._buttonsBox) return;

    let theme   = this._settings.get('window-buttons-theme');
    let gioFile = this._buttonsTheme;

    this.unloadStylesheet(gioFile);
    this._buttonsBox.remove_style_class_name(`${theme}-buttons`);

    delete this._buttonsTheme;
  },

  _onButtonClick(actor, event) {
    if (!this._activeWindow) return;

    switch (actor._windowAction) {
      case 'minimize': return this._minimizeWindow();
      case 'maximize': return this._maximizeWindow();
      case 'close':    return this._closeWindow();
    }
  },

  _minimizeWindow() {
    if (!this._activeWindow.minimized)
      this._activeWindow.minimize();
  },

  _maximizeWindow() {
    let bothMaximized = Meta.MaximizeFlags.BOTH;
    let maximizeState = this._activeWindow.get_maximized();

    if (maximizeState === bothMaximized)
      this._activeWindow.unmaximize(bothMaximized);
    else
      this._activeWindow.maximize(bothMaximized);
  },

  _closeWindow() {
    this._activeWindow.delete(global.get_current_time());
  },

  _toggleButtons() {
    this._activeWindow = global.display.focus_window;
    if (!this._buttonsActor) return;

    let overview = Main.overview.visibleTarget;
    let valid    = this.isValidWindow(this._activeWindow);
    let visible  = false;

    if (!overview && valid) {
      let maxed   = this.isMaximized(this._activeWindow, this._enabled);
      let always  = this._enabled == 'always' && this._activeWindow;

      visible = always || maxed;
    } else {
      let target  = Main.panel.statusArea.appMenu._targetApp;
      let running = target != null && target.get_state() == Shell.AppState.RUNNING;

      visible = running && !overview;
    }

    visible ? this._buttonsActor.show() : this._buttonsActor.hide()
  }
});
