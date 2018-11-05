const Lang           = imports.lang;
const Mainloop       = imports.mainloop;
const Util           = imports.misc.util;
const Unite          = imports.misc.extensionUtils.getCurrentExtension();
const Base           = Unite.imports.module.BaseModule;
const isWindow       = Unite.imports.helpers.isWindow;
const isMaximized    = Unite.imports.helpers.isMaximized;
const loadUserStyles = Unite.imports.helpers.loadUserStyles;

var WindowDecoration = new Lang.Class({
  Name: 'Unite.WindowDecoration',
  Extends: Base,

  _enableKey: 'hide-window-titlebars',
  _disableValue: 'never',

  _onActivate() {
    this._signals.connect(global.display, 'notify::focus-window', 'updateTitlebar');
    this._signals.connect(global.window_manager, 'size-change', 'updateTitlebar');

    this._settings.connect('hide-window-titlebars', 'updateUserStyles');
    this._settings.connect('button-layout', 'updateUserStyles');

    this._updateUserStyles();
    this._undecorateWindows();
  },

  _onDeactivate() {
    this._updateUserStyles();
    this._decorateWindows();
  },

  _getWindowXID(win) {
    win._windowXID = win._windowXID || win.get_description().match(/0x[0-9a-f]+/)[0];
    return win._windowXID;
  },

  _getAllWindows() {
    let windows = global.get_window_actors().map(win => win.meta_window);
    return windows.filter(win => isWindow(win));
  },

  _toggleDecorations(win, hide) {
    let winId = this._getWindowXID(win);
    if (!winId) return;

    let prop  = '_GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED';
    let value = hide ? '0x1' : '0x0';

    Util.spawn(['xprop', '-id', winId, '-f', prop, '32c', '-set', prop, value]);
  },

  _resetDecorations(win) {
    this._toggleDecorations(win, false);

    delete win._decorationOFF;
    delete win._windowXID;
  },

  _updateTitlebar() {
    let focusWindow = global.display.focus_window;
    let toggleDecor = focusWindow;

    if (this._setting == 'both')
      toggleDecor = focusWindow && focusWindow.get_maximized() !== 0;

    if (toggleDecor && isWindow(focusWindow))
      this._toggleTitlebar(focusWindow);
  },

  _showTitlebar(win) {
    let undecorated = win && win._decorationOFF;
    if (!undecorated) return;

    win._decorationOFF = false;
    this._toggleDecorations(win, false);
  },

  _hideTitlebar(win) {
    let decorated = win && !win._decorationOFF && win.decorated;
    if (!decorated) return;

    win._decorationOFF = true;
    this._toggleDecorations(win, true);
  },

  _toggleTitlebar(win) {
    if (isMaximized(win, this._setting))
      this._hideTitlebar(win);
    else
      this._showTitlebar(win);
  },

  _updateUserStyles() {
    let position  = this._settings.get('window-buttons-position');
    let filePath  = `${Unite.path}/styles/buttons-${position}`;
    let maximized = `@import url('${filePath}.css');\n`;
    let tiled     = `@import url('${filePath}-tiled.css');\n`;

    if (this._setting == 'both')
      loadUserStyles(maximized + tiled);

    if (this._setting == 'maximized')
      loadUserStyles(maximized);

    if (this._setting == 'tiled')
      loadUserStyles(tiled);

    if (this._setting == 'never')
      loadUserStyles('');
  },

  _undecorateWindow(win) {
    Mainloop.idle_add(() => { this._toggleTitlebar(win) });
  },

  _undecorateWindows() {
    let windows = this._getAllWindows();
    windows.forEach(Lang.bind(this, this._undecorateWindow));
  },

  _decorateWindow(win) {
    Mainloop.idle_add(() => { this._resetDecorations(win) });
  },

  _decorateWindows() {
    let windows = this._getAllWindows();
    windows.forEach(Lang.bind(this, this._decorateWindow));
  }
});
