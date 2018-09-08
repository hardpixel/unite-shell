const Meta           = imports.gi.Meta;
const GLib           = imports.gi.GLib;
const Mainloop       = imports.mainloop;
const Util           = imports.misc.util;
const Lang           = imports.lang;
const ExtensionUtils = imports.misc.extensionUtils;
const Unite          = ExtensionUtils.getCurrentExtension();
const Helpers        = Unite.imports.helpers;
const Convenience    = Unite.imports.convenience;
const STYLESPATH     = GLib.get_user_config_dir() + '/gtk-3.0/gtk.css';

var WindowDecoration = new Lang.Class({
  Name: 'Unite.WindowDecoration',

  _init: function() {
    this._settings = Convenience.getSettings();

    this._activate();
    this._connectSettings();
  },

  _connectSettings: function() {
    this._hwtHandlerID = this._settings.connect(
      'changed::hide-window-titlebars', Lang.bind(this, this._toggle)
    );
  },

  _disconnectSettings: function() {
    if (this._hwtHandlerID) {
      this._settings.disconnect(this._hwtHandlerID);
      delete this._hwtHandlerID;
    }
  },

  _connectSignals: function () {
    if (!this._dsHandlerID) {
      this._dsHandlerID = global.display.connect(
        'notify::focus-window', Lang.bind(this, this._updateTitlebar)
      );
    }

    if (!this._wmHandlerID) {
      this._wmHandlerID = global.window_manager.connect(
        'size-change', Lang.bind(this, this._updateTitlebar)
      );
    }
  },

  _disconnectSignals: function() {
    if (this._dsHandlerID) {
      global.display.disconnect(this._dsHandlerID);
      delete this._dsHandlerID;
    }

    if (this._wmHandlerID) {
      global.window_manager.disconnect(this._wmHandlerID);
      delete this._wmHandlerID;
    }
  },

  _toggleTitlebar: function (win, hide) {
    if (!win._windowXID) {
      win._windowXID = Helpers.getXWindow(win);
    }

    if (win._windowXID) {
      let prop  = '_GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED';
      let value = hide ? '0x1' : '0x0';

      Util.spawn(['xprop', '-id', win._windowXID, '-f', prop, '32c', '-set', prop, value]);
    }
  },

  _toggleMaximize: function (win) {
    let remaximize    = Helpers.getVersion() < 3.24;
    let maximizeState = win && win.get_maximized();

    if (remaximize && maximizeState > 0) {
      win._doingMaxUnmax = true;

      Mainloop.timeout_add(50, function () {
        win.unmaximize(maximizeState);
        win.maximize(maximizeState);

        win._doingMaxUnmax = false;
      });
    }
  },

  _updateTitlebar: function () {
    let window = global.display.focus_window;
    let toggle = window;

    if (this._enabled == 'both') {
      toggle = window && window.get_maximized() !== 0;
    }

    if (toggle && Helpers.isValidWindow(window)) {
      if (Helpers.isMaximized(window, this._enabled)) {
        this._hideTitlebar(window);
      } else {
        this._showTitlebar(window);
      }
    }
  },

  _showTitlebar: function (win) {
    let undecorated = win && win._decorationOFF;

    if (undecorated && !win._doingMaxUnmax) {
      win._decorationOFF = false;

      this._toggleTitlebar(win, false);
      this._toggleMaximize(win);
    }
  },

  _hideTitlebar: function (win) {
    let decorated = win && !win._decorationOFF && win.decorated;

    if (decorated && !win._doingMaxUnmax) {
      win._decorationOFF = true;

      this._toggleTitlebar(win, true);
      this._toggleMaximize(win);
    }
  },

  _updateUserStyles: function () {
    let styleContent = '';

    if (GLib.file_test(STYLESPATH, GLib.FileTest.EXISTS)) {
      let fileContent = GLib.file_get_contents(STYLESPATH);

      if (fileContent[0] == true) {
        styleContent = fileContent[1].toString();
        styleContent = styleContent.replace(/@import.*unite@hardpixel\.eu.*css['"]\);\n/g, '');
      }
    }

    return styleContent;
  },

  _addUserStyles: function () {
    let buttonsPosition = Helpers.getWindowButtons('position');

    if (buttonsPosition) {
      let styleContent  = this._updateUserStyles();
      let styleFilePath = Unite.path + '/styles/buttons-' + buttonsPosition;
      let styleImport   = "@import url('" + styleFilePath + ".css');\n";

      if (this._enabled == 'both' || this._enabled == 'tiled') {
        styleImport = styleImport + "@import url('" + styleFilePath + "-tiled.css');\n";
      }

      GLib.file_set_contents(STYLESPATH, styleImport + styleContent);
    }
  },

  _removeUserStyles: function () {
    let styleContent = this._updateUserStyles();
    GLib.file_set_contents(STYLESPATH, styleContent);
  },

  _undecorateWindows: function () {
    let windows = Helpers.getAllWindows();

    windows.forEach(Lang.bind(this, function (win) {
      Mainloop.idle_add(Lang.bind(this, function () {
        if (Helpers.isMaximized(win, this._enabled)) {
          this._hideTitlebar(win);
        } else {
          this._showTitlebar(win);
        }
      }));
    }));
  },

  _decorateWindows: function () {
    let windows = Helpers.getAllWindows();

    windows.forEach(Lang.bind(this, function (win) {
      Mainloop.idle_add(Lang.bind(this, function () {
        win._decorationOFF = true;
        this._showTitlebar(win);

        delete win._decorationOFF;
        delete win._windowXID;
        delete win._doingMaxUnmax;
      }));
    }));
  },

  _toggle: function() {
    this._deactivate();
    this._activate();
  },

  _activate: function() {
    this._enabled = this._settings.get_string('hide-window-titlebars');

    if (this._enabled != 'never') {
      this._addUserStyles();
      this._undecorateWindows();
      this._connectSignals();
    }
  },

  _deactivate: function() {
    this._removeUserStyles();
    this._decorateWindows();
    this._disconnectSignals();
  },

  destroy: function() {
    this._deactivate();
    this._disconnectSettings();
  }
});
