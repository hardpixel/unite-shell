const Lang           = imports.lang;
const Main           = imports.ui.main;
const Mainloop       = imports.mainloop;
const Gtk            = imports.gi.Gtk;
const Shell          = imports.gi.Shell;
const WindowTracker  = Shell.WindowTracker.get_default();
const AppSystem      = Shell.AppSystem.get_default()
const ExtensionUtils = imports.misc.extensionUtils;
const Unite          = ExtensionUtils.getCurrentExtension();
const Helpers        = Unite.imports.helpers;
const Convenience    = Unite.imports.convenience;

var AppMenu = new Lang.Class({
  Name: 'Unite.AppMenu',
  _wmHandlerIDs: [],

  _init: function() {
    this._appMenu  = Main.panel.statusArea.appMenu;
    this._settings = Convenience.getSettings();

    this._toggle();
    this._connectSettings();
  },

  _connectSettings: function() {
    this._settings.connect(
      'changed::show-window-title', Lang.bind(this, this._toggle)
    );
  },

  _connectSignals: function () {
    this._dsHandlerID = global.display.connect(
      'notify::focus-window', Lang.bind(this, this._updateMenu)
    );

    this._asHandlerID = AppSystem.connect(
      'app-state-changed', Lang.bind(this, this._showMenu)
    );

    this._wtHandlerID = WindowTracker.connect(
      'notify::focus-app', Lang.bind(this, this._showMenu)
    );

    this._wmHandlerIDs.push(global.window_manager.connect(
      'destroy', Lang.bind(this, this._updateMenu)
    ));

    this._wmHandlerIDs.push(global.window_manager.connect(
      'size-change', Lang.bind(this, this._updateMenu)
    ));
  },

  _disconnectSignals: function() {
    let windows = Helpers.getAllWindows();

    windows.forEach(function(win) {
      if (win._updateTitleID) {
        win.disconnect(win._updateTitleID);
        delete win._updateTitleID;
      }
    });

    if (this._dsHandlerID) {
      global.display.disconnect(this._dsHandlerID);
      delete this._dsHandlerID;
    }

    if (this._asHandlerID) {
      AppSystem.disconnect(this._asHandlerID);
      delete this._asHandlerID;
    }

    if (this._wtHandlerID) {
      WindowTracker.disconnect(this._wtHandlerID);
      delete this._wtHandlerID;
    }

    this._wmHandlerIDs.forEach(function (handler) {
      global.window_manager.disconnect(handler);
    });

    this._wmHandlerIDs = [];
  },

  _showMenu: function () {
    let settings = Gtk.Settings.get_default();
    let showMenu = settings.gtk_shell_shows_app_menu;

    if (showMenu) {
      if (this._appMenu._nonSensitive) {
        this._appMenu.setSensitive(true);
        this._appMenu._nonSensitive = false;
      }
    } else {
      if (!this._appMenu._visible && this._appMenu._targetApp) {
        this._appMenu.show();
        this._appMenu.setSensitive(false);
        this._appMenu._nonSensitive = true;
      }
    }
  },

  _updateMenu: function () {
    this._activeApp    = WindowTracker.focus_app;
    this._activeWindow = global.display.focus_window;

    if (this._activeWindow && !this._activeWindow._updateTitleID) {
      this._activeWindow._updateTitleID = this._activeWindow.connect(
        'notify::title', Lang.bind(this, this._updateTitle)
      );
    }

    this._updateTitle();
    this._showMenu();
  },

  _updateTitle: function () {
    let title = null;
    let maximized = Helpers.isMaximized(this._activeWindow, this._enabled);
    let always = Helpers.getStateName(this._enabled) == 'always';

    if (always || maximized) {
      title = this._activeWindow.title;
    }

    if (this._activeApp && !title) {
      title = this._activeApp.get_name();
    }

    if (title) {
      this._appMenu._label.set_text(title);
    }
  },

  _toggle: function() {
    this._enabled = this._settings.get_enum('show-window-title');
    this._enabled != 0 ? this._activate() : this.destroy();
  },

  _activate: function() {
    Mainloop.idle_add(Lang.bind(this, this._showMenu));
    Mainloop.idle_add(Lang.bind(this, this._updateMenu));

    if (!this._activated) {
      this._activated = true;
      this._connectSignals();
    }
  },

  destroy: function() {
    Mainloop.idle_add(Lang.bind(this, Lang.bind(this, function () {
      this._showMenu();
      delete this._appMenu._nonSensitive;
    })));

    this._disconnectSignals();

    this._activated = false;
  }
});
