const Lang        = imports.lang;
const Shell       = imports.gi.Shell;
const Gtk         = imports.gi.Gtk;
const Main        = imports.ui.main;
const Unite       = imports.misc.extensionUtils.getCurrentExtension();
const Base        = Unite.imports.module.BaseModule;
const isWindow    = Unite.imports.helpers.isWindow;
const isMaximized = Unite.imports.helpers.isMaximized;

var ApplicationMenu = new Lang.Class({
  Name: 'Unite.ApplicationMenu',
  Extends: Base,

  _enableKey: 'show-window-title',
  _disableValue: 'never',

  _onInitialize() {
    this.appMenu    = Main.panel.statusArea.appMenu;
    this.winTracker = Shell.WindowTracker.get_default();
    this.appSystem  = Shell.AppSystem.get_default();
  },

  _onActivate() {
    this._signals.connect(global.display, 'notify::focus-window', 'updateTitle');
    this._signals.connect(global.window_manager, 'size-change', 'updateTitle');

    this._signals.connect(Main.overview, 'hiding', 'showMenu');
    this._signals.connect(this.winTracker, 'notify::focus-app', 'showMenu');
    this._signals.connect(this.appSystem, 'app-state-changed', 'showMenu');

    this._updateTitle();
  },

  _onDeactivate() {
    this._showMenu();
  },

  _showMenu() {
    let settings  = Gtk.Settings.get_default();
    let showsMenu = settings.gtk_shell_shows_app_menu;

    if (showsMenu)
      this._resetMenu();
    else
      this._forceShowMenu();
  },

  _resetMenu() {
    if (!this.appMenu._nonSensitive) return;

    this.appMenu.setSensitive(true);
    delete this.appMenu._nonSensitive;
  },

  _forceShowMenu() {
    let visible = this.appMenu._targetApp != null && !Main.overview.visibleTarget;
    if (!visible && this.appMenu._visible) return;

    this.appMenu.show();
    this.appMenu.setSensitive(false);

    this.appMenu._nonSensitive = true;
  },

  _handleWindowTitle(win) {
    if (!isWindow(win) || win._updateTitleID) return;

    win._updateTitleID = win.connect(
      'notify::title', Lang.bind(this, this._updateTitleText)
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

    if (title && title != current)
      this.appMenu._label.set_text(title);
  }
});
