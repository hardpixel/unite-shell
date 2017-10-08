const Meta           = imports.gi.Meta;
const GLib           = imports.gi.GLib;
const Mainloop       = imports.mainloop;
const Util           = imports.misc.util;
const Lang           = imports.lang;
const ExtensionUtils = imports.misc.extensionUtils;
const Unite          = ExtensionUtils.getCurrentExtension();
const Helpers        = Unite.imports.helpers;
const MAXIMIZED      = Meta.MaximizeFlags.BOTH;

var WindowDecoration = new Lang.Class({
  Name: 'Unite.WindowDecoration',

  _init: function() {
    this._buttonsPosition = Helpers.getWindowButtons('position');
    this._needsMaxUnmax   = Helpers.getVersion() < 3.24;
    this._userStylesPath  = GLib.get_user_config_dir() + '/gtk-3.0/gtk.css';

    Mainloop.idle_add(Lang.bind(this, this._addUserStyles));
    Mainloop.idle_add(Lang.bind(this, this._undecorateWindows));

    this._connectSignals();
  },

  _connectSignals: function () {
    this._dsHandlerID = global.display.connect(
      'notify::focus-window', Lang.bind(this, this._updateTitlebar)
    );

    this._wmHandlerID = global.window_manager.connect(
      'size-change', Lang.bind(this, this._updateTitlebar)
    );
  },

  _toggleTitlebar: function (id, hide) {
    let prop  = '_GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED';
    let value = hide ? '0x1' : '0x0';

    Util.spawn(['xprop', '-id', id, '-f', prop, '32c', '-set', prop, value]);
  },

  _toggleMaximize: function (win) {
    if (this._needsMaxUnmax && win.get_maximized() === MAXIMIZED) {
      Mainloop.idle_add(function () {
        win.unmaximize(MAXIMIZED);
        win.maximize(MAXIMIZED);
      });
    }
  },

  _updateTitlebar: function () {
    this._activeWindow = global.display.focus_window;

    if (this._activeWindow) {
      if (this._activeWindow.get_maximized() == MAXIMIZED) {
        this._hideTitlebar(this._activeWindow);
      } else {
        this._showTitlebar(this._activeWindow);
      }
    }
  },

  _showTitlebar: function (win) {
    if (win._decorationOFF && win._windowXID) {
      win._decorationOFF = false;

      this._toggleTitlebar(win._windowXID, false);
      this._toggleMaximize(win);
    }
  },

  _hideTitlebar: function (win) {
    if (win && win.decorated) {
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
      if (win.get_maximized() == MAXIMIZED) {
        this._hideTitlebar(win);
      } else {
        this._showTitlebar(win);
      }
    }));
  },

  _decorateWindows: function () {
    let windows = Helpers.getAllWindows();

    windows.forEach(Lang.bind(this, Lang.bind(this, function (win) {
      this._showTitlebar(win);

      delete win._decorationOFF;
      delete win._windowXID;
    })));
  },

  destroy: function() {
    global.display.disconnect(this._dsHandlerID);
    global.window_manager.disconnect(this._wmHandlerID);

    Mainloop.idle_add(Lang.bind(this, this._removeUserStyles));
    Mainloop.idle_add(Lang.bind(this, this._decorateWindows));
  }
});
