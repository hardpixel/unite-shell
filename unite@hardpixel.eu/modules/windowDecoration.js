const Meta           = imports.gi.Meta;
const GLib           = imports.gi.GLib;
const Mainloop       = imports.mainloop;
const Util           = imports.misc.util;
const Lang           = imports.lang;
const ExtensionUtils = imports.misc.extensionUtils;
const Unite          = ExtensionUtils.getCurrentExtension();
const Helpers        = Unite.imports.helpers;
const Convenience    = Unite.imports.convenience;
const MAXIMIZED      = Meta.MaximizeFlags.BOTH;

var WindowDecoration = new Lang.Class({
  Name: 'Unite.WindowDecoration',

  _init: function() {
    this._settings        = Convenience.getSettings();
    this._needsMaxUnmax   = Helpers.getVersion() < 3.24;
    this._userStylesPath  = GLib.get_user_config_dir() + '/gtk-3.0/gtk.css';
    this._buttonsPosition = Helpers.getWindowButtons('position');

    this._toggle();
    this._connectSettings();
  },

  _connectSettings: function() {
    this._settings.connect(
      'changed::hide-window-titlebars', Lang.bind(this, this._toggle)
    );
  },

  _connectSignals: function () {
    this._dsHandlerID = global.display.connect(
      'notify::focus-window', Lang.bind(this, this._updateTitlebar)
    );

    this._wmHandlerID = global.window_manager.connect(
      'size-change', Lang.bind(this, this._updateTitlebar)
    );
  },

  _disconnectSignals: function() {
    if (this._dsHandlerID) {
      global.display.disconnect(this._dsHandlerID);
    }

    if (this._wmHandlerID) {
      global.window_manager.disconnect(this._wmHandlerID);
    }

    delete this._dsHandlerID;
    delete this._wmHandlerID;
  },

  _toggleTitlebar: function (id, hide) {
    let prop  = '_GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED';
    let value = hide ? '0x1' : '0x0';

    Util.spawn(['xprop', '-id', id, '-f', prop, '32c', '-set', prop, value]);
  },

  _toggleMaximize: function (win) {
    if (this._needsMaxUnmax && win.get_maximized() === MAXIMIZED) {
      win._doingMaxUnmax = true;

      Mainloop.timeout_add(50, function () {
        win.unmaximize(MAXIMIZED);
        win.maximize(MAXIMIZED);

        win._doingMaxUnmax = false;
      });
    }
  },

  _updateTitlebar: function () {
    this._activeWindow = global.display.focus_window;

    if (Helpers.isMaximized(this._activeWindow, this._enabled)) {
      this._hideTitlebar(this._activeWindow);
    } else {
      this._showTitlebar(this._activeWindow);
    }
  },

  _showTitlebar: function (win) {
    if (win && !win._doingMaxUnmax) {
      if (!win._windowXID) {
        win._windowXID = Helpers.getXWindow(win);
      }

      if (win._windowXID && win._decorationOFF) {
        win._decorationOFF = false;

        this._toggleTitlebar(win._windowXID, false);
        this._toggleMaximize(win);
      }
    }
  },

  _hideTitlebar: function (win) {
    if (win && !win._doingMaxUnmax && win.decorated) {
      if (!win._windowXID) {
        win._windowXID = Helpers.getXWindow(win);
      }

      if (win._windowXID && !win._decorationOFF) {
        win._decorationOFF = true;

        this._toggleTitlebar(win._windowXID, true);
        this._toggleMaximize(win);
      }
    }
  },

  _updateUserStyles: function () {
    let styleContent = '';

    if (GLib.file_test(this._userStylesPath, GLib.FileTest.EXISTS)) {
      let fileContent = GLib.file_get_contents(this._userStylesPath);

      if (fileContent[0] == true) {
        styleContent = fileContent[1].toString();
        styleContent = styleContent.replace(/@import.*unite@hardpixel\.eu.*css['"]\);\n/g, '');
      }
    }

    return styleContent;
  },

  _addUserStyles: function () {
    if (this._buttonsPosition) {
      let styleContent  = this._updateUserStyles();
      let styleFilePath = Unite.path + '/styles/buttons-' + this._buttonsPosition + '.css';
      let styleImport   = "@import url('" + styleFilePath + "');\n"

      GLib.file_set_contents(this._userStylesPath, styleImport + styleContent);
    }
  },

  _removeUserStyles: function () {
    let styleContent = this._updateUserStyles();
    GLib.file_set_contents(this._userStylesPath, styleContent);
  },

  _undecorateWindows: function () {
    let windows = Helpers.getAllWindows();

    windows.forEach(Lang.bind(this, function (win) {
      if (Helpers.isMaximized(win, this._enabled)) {
        this._hideTitlebar(win);
      } else {
        this._showTitlebar(win);
      }
    }));
  },

  _decorateWindows: function () {
    let windows = Helpers.getAllWindows();

    windows.forEach(Lang.bind(this, Lang.bind(this, function (win) {
      win._decorationOFF = true;

      this._showTitlebar(win);

      delete win._decorationOFF;
      delete win._windowXID;
      delete win._doingMaxUnmax;
    })));
  },

  _toggle: function() {
    this._enabled = this._settings.get_enum('hide-window-titlebars');
    this._enabled != 0 ? this._activate() : this.destroy();
  },

  _activate: function() {
    Mainloop.idle_add(Lang.bind(this, this._addUserStyles));
    Mainloop.idle_add(Lang.bind(this, this._undecorateWindows));

    if (!this._activated) {
      this._activated = true;
      this._connectSignals();
    }
  },

  destroy: function() {
    Mainloop.idle_add(Lang.bind(this, this._removeUserStyles));
    Mainloop.idle_add(Lang.bind(this, this._decorateWindows));

    this._disconnectSignals();

    this._activated = false;
  }
});
