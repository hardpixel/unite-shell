const GObject     = imports.gi.GObject;
const Shell       = imports.gi.Shell;
const Gtk         = imports.gi.Gtk;
const Meta        = imports.gi.Meta;
const Main        = imports.ui.main;
const Unite       = imports.misc.extensionUtils.getCurrentExtension();
const Base        = Unite.imports.module.BaseModule;
const isWindow    = Unite.imports.helpers.isWindow;
const isMaximized = Unite.imports.helpers.isMaximized;

var ApplicationMenu = new GObject.Class({
  Name: 'UniteApplicationMenu',
  Extends: Base,

  _enableKey: 'show-window-title',
  _disableValue: 'never',

  _onInitialize() {
    this.appMenu        = Main.panel.statusArea.appMenu;
    this.winTracker     = Shell.WindowTracker.get_default();
    this.appSystem      = Shell.AppSystem.get_default();
    this.gtkSettings    = Gtk.Settings.get_default();
    this.monitorManager = Meta.MonitorManager.get();
  },

  _onActivate() {
    this._signals.connect(global.display, 'notify::focus-window', 'updateTitle');
    this._signals.connect(global.window_manager, 'size-change', 'updateTitle');
    this._signals.connect(this.monitorManager, 'monitors-changed', 'updateTitle');
    this._signals.connect(this.gtkSettings, 'notify::gtk-shell-shows-app-menu', 'showsMenu');

    this._settings.connect('restrict-to-primary-screen', 'enableShowsMenu');

    this._enableShowsMenu();
    this._updateTitle();
  },

  _onReset() {
    this._updateTitle();
  },

  _onDeactivate() {
    this._resetShowsMenu();
  },

  _showsMenu() {
    this._resetShowsMenu();
    this._enableShowsMenu();
  },

  _enableShowsMenu() {
    if (this.gtkSettings.gtk_shell_shows_app_menu) return;

    this._showsMenuSignals = [
      this._signals.connect(Main.overview, 'hiding', 'toggleMenu'),
      this._signals.connect(this.winTracker, 'notify::focus-app', 'toggleMenu'),
      this._signals.connect(this.appSystem, 'app-state-changed', 'toggleMenu')
    ];

    this._toggleMenu();
  },

  _resetShowsMenu() {
    if (!this._showsMenuSignals) return;

    this._signals.disconnectMany(this._showsMenuSignals);
    this.appMenu.setSensitive(true);
  },

  _toggleMenu() {
    let target   = this.appMenu._targetApp != null;
    let overview = Main.overview.visibleTarget;
    let visible  = target && !overview;

    if (visible && !this.appMenu_visible) {
      this.appMenu.show();
      this.appMenu.setSensitive(false);
    }

    if (!visible && this.appMenu_visible) {
      this.appMenu.hide();
      this.appMenu.setSensitive(true);
    }
  },

  _handleWindowTitle(win) {
    if (!isWindow(win) || win._updateTitleID) return;

    win._updateTitleID = win.connect(
      'notify::title', () => { this._updateTitleText() }
    );
  },

  _updateTitle() {
    let focusWindow = global.display.focus_window;

    this._handleWindowTitle(focusWindow);
    this._updateTitleText();
  },

  _updateTitleText() {
    let focusApp    = this.winTracker.focus_app;
    let focusWindow = global.display.focus_window;
    let current     = this.appMenu._label.get_text();
    let maximized   = isMaximized(focusWindow, this._setting);
    let always      = this._setting == 'always' && focusWindow;
    let title       = null;

    if (always || maximized)
      title = focusWindow.title;

    if (!title && focusApp)
      title = focusApp.get_name();

    if (title && title != current) {
      this.appMenu._label.set_text(title);

      this.appMenu.container.hide();
      this.appMenu.container.show();
    }
  }
});
