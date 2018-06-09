const Lang           = imports.lang;
const Main           = imports.ui.main;
const Gtk            = imports.gi.Gtk;
const GtkSettings    = Gtk.Settings.get_default();
const Shell          = imports.gi.Shell;
const WindowTracker  = Shell.WindowTracker.get_default();
const AppSystem      = Shell.AppSystem.get_default();
const AppMenu        = Main.panel.statusArea.appMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Unite          = ExtensionUtils.getCurrentExtension();
const Helpers        = Unite.imports.helpers;
const Convenience    = Unite.imports.convenience;

var ApplicationMenu = new Lang.Class({
  Name: 'Unite.ApplicationMenu',

  _init: function() {
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
    if (!this._gsHandlerID) {
      this._gsHandlerID = GtkSettings.connect(
        'notify::gtk-shell-shows-app-menu', Lang.bind(this, this._syncMenu)
      );
    }

    if (!this._wtHandlerID) {
      this._wtHandlerID = WindowTracker.connect(
        'notify::focus-app', Lang.bind(this, this._showMenu)
      );
    }

    if (!this._dsHandlerID) {
      this._dsHandlerID = global.display.connect(
        'notify::focus-window', Lang.bind(this, this._updateMenu)
      );
    }

    if (!this._asHandlerID) {
      this._asHandlerID = AppSystem.connect(
        'app-state-changed', Lang.bind(this, this._showMenu)
      );
    }

    if (!this._ovHandlerID) {
      this._ovHandlerID = Main.overview.connect(
        'hiding', Lang.bind(this, this._showMenu)
      );
    }

    if (!this._wmHandlerID) {
      this._wmHandlerID = global.window_manager.connect(
        'size-change', Lang.bind(this, this._updateMenu)
      );
    }
  },

  _disconnectSignals: function() {
    let windows = Helpers.getAllWindows();

    windows.forEach(function(win) {
      if (win._updateTitleID) {
        win.disconnect(win._updateTitleID);
        delete win._updateTitleID;
      }
    });

    if (this._gsHandlerID) {
      GtkSettings.disconnect(this._gsHandlerID);
      delete this._gsHandlerID;
    }

    if (this._wtHandlerID) {
      WindowTracker.disconnect(this._wtHandlerID);
      delete this._wtHandlerID;
    }

    if (this._dsHandlerID) {
      global.display.disconnect(this._dsHandlerID);
      delete this._dsHandlerID;
    }

    if (this._asHandlerID) {
      AppSystem.disconnect(this._asHandlerID);
      delete this._asHandlerID;
    }

    if (this._ovHandlerID) {
      Main.overview.disconnect(this._ovHandlerID);
      delete this._ovHandlerID;
    }

    if (this._wmHandlerID) {
      global.window_manager.disconnect(this._wmHandlerID);
      delete this._wmHandlerID;
    }
  },

  _syncMenu: function () {
    this._appMenu = GtkSettings.gtk_shell_shows_app_menu;
  },

  _resetMenu: function () {
    if (AppMenu._nonSensitive) {
      AppMenu.setSensitive(true);
      delete AppMenu._nonSensitive;
    }
  },

  _forceShowMenu: function () {
    let visible = AppMenu._targetApp != null && !Main.overview.visibleTarget;

    if (!AppMenu._visible && visible) {
      AppMenu.show();
      AppMenu.setSensitive(false);

      AppMenu._nonSensitive = true;
    }
  },

  _showMenu: function () {
    if (this._appMenu) {
      this._resetMenu();
    } else {
      this._forceShowMenu();
    }
  },

  _updateMenu: function () {
    this._activeApp    = WindowTracker.focus_app;
    this._activeWindow = global.display.focus_window;

    if (Helpers.isValidWindow(this._activeWindow)) {
      if (this._activeWindow && !this._activeWindow._updateTitleID) {
        this._activeWindow._updateTitleID = this._activeWindow.connect(
          'notify::title', Lang.bind(this, this._updateTitle)
        );
      }

      this._updateTitle();
      this._showMenu();
    }
  },

  _updateTitle: function () {
    let title     = null;
    let current   = AppMenu._label.get_text();
    let maximized = Helpers.isMaximized(this._activeWindow, this._enabled);
    let always    = this._enabled == 'always' && this._activeWindow;

    if (always || maximized) {
      title = this._activeWindow.title;
    }

    if (!title && this._activeApp) {
      title = this._activeApp.get_name();
    }

    if (title && title != current) {
      AppMenu._label.set_text(title);
    }
  },

  _toggle: function() {
    this._enabled = this._settings.get_string('show-window-title');
    this._enabled != 'never' ? this._activate() : this.destroy();
  },

  _activate: function() {
    this._syncMenu();
    this._updateMenu();
    this._connectSignals();
  },

  destroy: function() {
    this._syncMenu();
    this._showMenu();
    this._disconnectSignals();
  }
});
