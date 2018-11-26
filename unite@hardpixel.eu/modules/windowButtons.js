const Lang         = imports.lang;
const St           = imports.gi.St;
const Shell        = imports.gi.Shell;
const Meta         = imports.gi.Meta;
const Main         = imports.ui.main;
const Unite        = imports.misc.extensionUtils.getCurrentExtension();
const Base         = Unite.imports.module.BaseModule;
const isWindow     = Unite.imports.helpers.isWindow;
const isMaximized  = Unite.imports.helpers.isMaximized;
const loadStyles   = Unite.imports.helpers.loadStyles;
const unloadStyles = Unite.imports.helpers.unloadStyles;
const toggleWidget = Unite.imports.helpers.toggleWidget;

var WindowButtons = new Lang.Class({
  Name: 'Unite.WindowButtons',
  Extends: Base,

  _enableKey: 'show-window-buttons',
  _disableValue: 'never',

  _onActivate() {
    this._signals.connect(global.display, 'notify::focus-window', 'toggleButtons');
    this._signals.connect(global.window_manager, 'size-change', 'toggleButtons');
    this._signals.connect(global.window_manager, 'destroy', 'toggleButtons');

    this._signals.connect(Main.overview, 'showing', 'toggleButtons');
    this._signals.connect(Main.overview, 'hiding', 'toggleButtons');

    this._settings.connect('window-buttons-theme', 'updateTheme');
    this._settings.connect('button-layout', 'updateButtons');

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
    let position = this._settings.get('window-buttons-position');
    let buttons  = this._settings.get('window-buttons-layout');

    if (!buttons || this._buttonsActor) return;

    this._buttonsActor = new St.Bin();
    this._buttonsBox   = new St.BoxLayout({ style_class: 'window-buttons-box' });

    this._buttonsActor.add_actor(this._buttonsBox);
    this._buttonsActor.hide();

    buttons.forEach(Lang.bind(this, this._createButton));

    if (position == 'left') {
      let appmenu = Main.panel.statusArea.appMenu.actor.get_parent();
      Main.panel._leftBox.insert_child_below(this._buttonsActor, appmenu);
    }

    if (position == 'right')
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

    this._buttonsTheme = loadStyles(cssPath);
    this._buttonsBox.add_style_class_name(`${theme}-buttons`);
  },

  _unloadTheme() {
    if (!this._buttonsTheme || !this._buttonsBox) return;

    let theme   = this._settings.get('window-buttons-theme');
    let gioFile = this._buttonsTheme;

    this._buttonsTheme = unloadStyles(gioFile);
    this._buttonsBox.remove_style_class_name(`${theme}-buttons`);
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
    if (!this._buttonsActor) return;

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

    toggleWidget(this._buttonsActor, !visible);
  }
});
