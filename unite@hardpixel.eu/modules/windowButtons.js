const GObject        = imports.gi.GObject;
const St             = imports.gi.St;
const Shell          = imports.gi.Shell;
const Meta           = imports.gi.Meta;
const Main           = imports.ui.main;
const Unite          = imports.misc.extensionUtils.getCurrentExtension();
const Base           = Unite.imports.module.BaseModule;
const WindowControls = Unite.imports.panel.WindowControls;
const isWindow       = Unite.imports.helpers.isWindow;
const isMaximized    = Unite.imports.helpers.isMaximized;
const loadStyles     = Unite.imports.helpers.loadStyles;
const unloadStyles   = Unite.imports.helpers.unloadStyles;

var WindowButtons = new GObject.Class({
  Name: 'Unite.WindowButtons',
  GTypeName: 'UniteWindowButtons',
  Extends: Base,

  _enableKey: 'show-window-buttons',
  _disableValue: 'never',

  _onInitialize() {
    this.monitorManager = Meta.MonitorManager.get();
  },

  _onActivate() {
    this._signals.connect(global.display, 'notify::focus-window', 'toggleButtons');
    this._signals.connect(global.window_manager, 'size-change', 'toggleButtons');
    this._signals.connect(global.window_manager, 'destroy', 'toggleButtons');
    this._signals.connect(this.monitorManager, 'monitors-changed', 'toggleButtons');

    this._signals.connect(Main.overview, 'showing', 'toggleButtons');
    this._signals.connect(Main.overview, 'hiding', 'toggleButtons');

    this._settings.connect('window-buttons-theme', 'updateTheme');
    this._settings.connect('button-layout', 'updateButtons');

    this._createButtons();
    this._toggleButtons();
    this._loadTheme();
  },

  _onReset() {
    this._toggleButtons();
  },

  _onDeactivate() {
    this._unloadTheme();
    this._destroyButtons();
  },

  _createButtons() {
    let position = this._settings.get('window-buttons-position');
    let buttons  = this._settings.get('window-buttons-layout');

    if (!buttons || this._controls) return;

    this._controls = new WindowControls();
    this._controls.addButtons(buttons, (actor, event) => {
      this._onButtonClick(actor, event);
    });

    Main.panel.addToStatusArea('uniteWindowControls', this._controls, 0, position);
  },

  _destroyButtons() {
    this._controls.destroy();
  },

  _updateButtons() {
    this._destroyButtons();
    this._createButtons();
  },

  _updateTheme() {
    this._unloadTheme();
    this._loadTheme();
  },

  _loadTheme() {
    if (this._buttonsTheme || !this._controls) return;

    let theme   = this._settings.get('window-buttons-theme');
    let cssPath = `themes/${theme}/stylesheet.css`;

    this._buttonsTheme = loadStyles(cssPath);
    this._controls.add_style_class_name(`${theme}-buttons`);
  },

  _unloadTheme() {
    if (!this._buttonsTheme || !this._controls) return;

    let theme   = this._settings.get('window-buttons-theme');
    let gioFile = this._buttonsTheme;

    this._buttonsTheme = unloadStyles(gioFile);
    this._controls.remove_style_class_name(`${theme}-buttons`);
  },

  _onButtonClick(actor, event) {
    let focusWindow = global.display.focus_window;
    if (!focusWindow) return;

    switch (actor._windowAction) {
      case 'minimize': return this._minimizeWindow(focusWindow);
      case 'maximize': return this._maximizeWindow(focusWindow);
      case 'close':    return this._closeWindow(focusWindow);
    }
  },

  _minimizeWindow(win) {
    if (!win.minimized) win.minimize();
  },

  _maximizeWindow(win) {
    let bothMaximized = Meta.MaximizeFlags.BOTH;
    let maximizeState = win.get_maximized();

    if (maximizeState === bothMaximized)
      win.unmaximize(bothMaximized);
    else
      win.maximize(bothMaximized);
  },

  _closeWindow(win) {
    win.delete(global.get_current_time());
  },

  _toggleButtons() {
    if (!this._controls) return;

    let focusWindow = global.display.focus_window;
    let overview    = Main.overview.visibleTarget;
    let valid       = isWindow(focusWindow);
    let visible     = false;

    if (!overview && valid) {
      let maxed   = isMaximized(focusWindow, this._setting);
      let always  = this._setting == 'always' && focusWindow;

      visible = always || maxed;
    } else {
      let target  = Main.panel.statusArea.appMenu._targetApp;
      let state   = target != null && target.get_state();
      let running = state == Shell.AppState.RUNNING;

      visible = running && !overview;
    }

    this._controls.setVisible(visible);
  }
});
