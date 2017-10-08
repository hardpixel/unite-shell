const Lang           = imports.lang;
const Main           = imports.ui.main;
const Meta           = imports.gi.Meta;
const Mainloop       = imports.mainloop;
const Gtk            = imports.gi.Gtk;
const Shell          = imports.gi.Shell;
const WindowTracker  = Shell.WindowTracker.get_default();
const AppSystem      = Shell.AppSystem.get_default()
const ExtensionUtils = imports.misc.extensionUtils;
const Unite          = ExtensionUtils.getCurrentExtension();
const Helpers        = Unite.imports.helpers;
const MAXIMIZED      = Meta.MaximizeFlags.BOTH;

var AppMenu = new Lang.Class({
  Name: 'Unite.AppMenu',
  _wmHandlerIDs: [],

  _init: function() {
    this._appMenu     = Main.panel.statusArea.appMenu;
    this._gtkSettings = Gtk.Settings.get_default();

    Mainloop.idle_add(Lang.bind(this, this._showMenu));
    Mainloop.idle_add(Lang.bind(this, this._updateMenu));

    this._connectSignals();
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

  _showMenu: function () {
    let showMenu = this._gtkSettings.gtk_shell_shows_app_menu;

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

    if (this._activeWindow && this._activeWindow.get_maximized() === MAXIMIZED) {
      title = this._activeWindow.title;
    }

    if (this._activeApp && !title) {
      title = this._activeApp.get_name();
    }

    if (title) {
      this._appMenu._label.set_text(title);
    }
  },

  destroy: function() {
    let windows = Helpers.getAllWindows();

    windows.forEach(function(win) {
      if (win._updateTitleID) {
        win.disconnect(win._updateTitleID);
        delete win._updateTitleID;
      }
    });

    global.display.disconnect(this._dsHandlerID);
    AppSystem.disconnect(this._asHandlerID);
    WindowTracker.disconnect(this._wtHandlerID);

    this._wmHandlerIDs.forEach(function (handler) {
      global.window_manager.disconnect(handler);
    });

    Mainloop.idle_add(Lang.bind(this, Lang.bind(this, function () {
      this._showMenu();
      delete this._appMenu._nonSensitive;
    })));
  }
});
