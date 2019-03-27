imports.gi.versions.Gdk    = '3.0';
imports.gi.versions.GdkX11 = '3.0';

const Lang           = imports.lang;
const GLib           = imports.gi.GLib;
const Gdk            = imports.gi.Gdk;
const GdkX11         = imports.gi.GdkX11;
const Meta           = imports.gi.Meta;
const Util           = imports.misc.util;
const Unite          = imports.misc.extensionUtils.getCurrentExtension();
const Base           = Unite.imports.module.BaseModule;
const versionCheck   = Unite.imports.helpers.versionCheck;
const getWindowXID   = Unite.imports.helpers.getWindowXID;
const isWindow       = Unite.imports.helpers.isWindow;
const isMaximized    = Unite.imports.helpers.isMaximized;
const loadUserStyles = Unite.imports.helpers.loadUserStyles;

var WindowDecoration = new Lang.Class({
  Name: 'Unite.WindowDecoration',
  Extends: Base,

  _enableKey: 'hide-window-titlebars',
  _disableValue: 'never',

  _onInitialize() {
    this.monitorManager = Meta.MonitorManager.get();
    this._useMotifHints = versionCheck('> 3.30.0');
  },

  _onActivate() {
    this._signals.connect(global.display, 'notify::focus-window', 'updateTitlebar');
    this._signals.connect(global.window_manager, 'size-change', 'updateTitlebar');
    this._signals.connect(this.monitorManager, 'monitors-changed', 'undecorateWindows');

    this._settings.connect('hide-window-titlebars', 'updateUserStyles');
    this._settings.connect('button-layout', 'updateUserStyles');

    this._updateUserStyles();
    this._undecorateWindows();
  },

  _onDeactivate() {
    this._removeUserStyles();
    this._decorateWindows();
  },

  _onReset() {
    this._removeUserStyles();
    this._updateUserStyles();

    this._undecorateWindows();
  },

  _getWindowXID(win) {
    win._windowXID = win._windowXID || getWindowXID(win);
    return win._windowXID;
  },

  _getAllWindows() {
    let windows = global.get_window_actors().map(win => win.meta_window);
    return windows.filter(win => this._handleWindow(win));
  },

  _handleWindow(win) {
    if (this._useMotifHints)
      return isWindow(win) && !win.is_client_decorated();
    else
      return isWindow(win) && win.decorated;
  },

  _toggleDecorations(win, hide) {
    let winId = this._getWindowXID(win);
    if (!winId) return;

    let script = `${Unite.path}/scripts/xprop.py`;
    Util.spawn(['python', script, winId, `${hide}`, `${this._useMotifHints}`]);
  },

  _resetDecorations(win) {
    if (!this._handleWindow(win))
      return;

    this._toggleDecorations(win, false);

    delete win._decorationOFF;
    delete win._windowXID;
  },

  _updateTitlebar() {
    let focusWindow = global.display.focus_window;
    let toggleDecor = focusWindow;

    if (!this._useMotifHints && this._setting == 'both')
      toggleDecor = focusWindow && focusWindow.get_maximized() !== 0;

    if (toggleDecor)
      this._toggleTitlebar(focusWindow);
  },

  _showTitlebar(win) {
    if (!win._decorationOFF) return;

    win._decorationOFF = false;
    this._toggleDecorations(win, false);
  },

  _hideTitlebar(win) {
    if (win._decorationOFF) return;

    win._decorationOFF = true;
    this._toggleDecorations(win, true);
  },

  _toggleTitlebar(win) {
    if (!this._handleWindow(win))
      return;

    if (isMaximized(win, this._setting))
      this._hideTitlebar(win);
    else
      this._showTitlebar(win);
  },

  _updateUserStyles() {
    let styles    = '';
    let position  = this._settings.get('window-buttons-position');
    let filePath  = `${Unite.path}/styles/buttons-${position}`;
    let maximized = `@import url('${filePath}.css');\n`;
    let tiled     = `@import url('${filePath}-tiled.css');\n`;

    switch (this._setting) {
      case 'both':      styles = maximized + tiled; break;
      case 'maximized': styles = maximized; break;
      case 'tiled':     styles = tiled; break;
    }

    loadUserStyles(styles);
  },

  _removeUserStyles() {
    loadUserStyles('');
  },

  _undecorateWindow(win) {
    GLib.idle_add(0, () => { this._toggleTitlebar(win) });
  },

  _undecorateWindows() {
    let windows = this._getAllWindows();
    windows.forEach(win => { this._undecorateWindow(win) });
  },

  _decorateWindow(win) {
    GLib.idle_add(0, () => { this._resetDecorations(win) });
  },

  _decorateWindows() {
    let windows = this._getAllWindows();
    windows.forEach(win => { this._decorateWindow(win) });
  }
});
