const Lang           = imports.lang;
const Main           = imports.ui.main;
const Mainloop       = imports.mainloop;
const Shell          = imports.gi.Shell;
const ExtensionUtils = imports.misc.extensionUtils;
const UniteExtension = ExtensionUtils.getCurrentExtension();
const HelperUtils    = UniteExtension.imports.helperUtils;

const AppMenu = new Lang.Class({
  Name: 'AppMenu',
  _appMenu: null,
  _windowTracker: null,
  _messageTray: null,
  _sizeSignal: null,
  _wmHandlerIDs: [],
  _dsHandlerID: null,
  _mtHandlerID: null,
  _bbHandlerID: null,
  _activeApp: null,
  _activeWindow: null,

  _init: function() {
    this._appMenu       = Main.panel.statusArea.appMenu,
    this._windowTracker = Shell.WindowTracker.get_default() || {},
    this._messageTray   = Main.messageTray,
    this._sizeSignal    = HelperUtils.versionLT('3.24') ? 'size-change' : 'size-changed';

    this._dsHandlerID = global.display.connect('notify::focus-window', Lang.bind(this, this._updateMenu));
    this._mtHandlerID = this._messageTray.connect('source-removed', Lang.bind(this, this._restoreTitle));
    this._bbHandlerID = this._messageTray._bannerBin.connect('notify::hover', Lang.bind(this, this._removeTitle));

    this._wmHandlerIDs.push(global.window_manager.connect('destroy', Lang.bind(this, this._updateMenu)));
    this._wmHandlerIDs.push(global.window_manager.connect(this._sizeSignal, Lang.bind(this, this._updateMenu)));

    Mainloop.idle_add(Lang.bind(this, this._updateMenu));
  },

  _updateMenu: function () {
    this._activeApp    = this._windowTracker.focus_app;
    this._activeWindow = global.display.focus_window;

    if (this._activeWindow && !this._activeWindow._updateTitleID) {
      this._activeWindow._updateTitleID = this._activeWindow.connect('notify::title', Lang.bind(this, this._updateTitle));
    }

    this._updateTitle();
  },

  _updateTitle: function () {
    let title = null;

    if (this._activeWindow && this._activeWindow.get_maximized()) {
      title = this._activeWindow.title;
    }

    if (this._activeApp && !title) {
      title = this._activeApp.get_name();
    }

    if (title) {
      this._appMenu._label.set_text(title);
    }
  },

  _removeTitle: function () {
    this._appMenu._label.set_text('');
  },

  _restoreTitle: function () {
    Mainloop.idle_add(Lang.bind(this, this._updateMenu));
  },

  destroy: function() {
    let windows = HelperUtils.getAllWindows();

    windows.forEach(function(win) {
      if (win._updateTitleID) {
        win.disconnect(win._updateTitleID);
        win._updateTitleID = null;
      }
    });

    global.display.disconnect(this._dsHandlerID);

    this._messageTray.disconnect(this._mtHandlerID);
    this._messageTray._bannerBin.disconnect(this._bbHandlerID);

    this._wmHandlerIDs.forEach(function (handler) {
      global.window_manager.disconnect(handler);
    });
  }
});
