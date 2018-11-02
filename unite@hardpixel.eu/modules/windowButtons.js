const Lang    = imports.lang;
const St      = imports.gi.St;
const Gio     = imports.gi.Gio;
const GLib    = imports.gi.GLib;
const Shell   = imports.gi.Shell;
const Meta    = imports.gi.Meta;
const Main    = imports.ui.main;
const Unite   = imports.misc.extensionUtils.getCurrentExtension();
const Base    = Unite.imports.module.BaseModule;
const Helpers = Unite.imports.helpers;

var WindowButtons = new Lang.Class({
  Name: 'Unite.WindowButtons',
  Extends: Base,
  EnableKey: 'show-window-buttons',
  DisableValue: 'never',

  _onInitialize() {
    this._settings.connect('window-buttons-theme', this._updateTheme);
  },

  _onActivate() {
    let wmPrefs = Helpers.wmPreferences();
    this._signals.connect(wmPrefs, 'changed::button-layout', this._updateButtons);

    this._signals.connect(global.display, 'notify::focus-window', this._toggleButtons);
    this._signals.connect(global.window_manager, 'size-change', this._toggleButtons);
    this._signals.connect(global.window_manager, 'destroy', this._toggleButtons);

    this._signals.connect(Main.overview, 'showing', this._toggleButtons);
    this._signals.connect(Main.overview, 'hiding', this._toggleButtons);

    this._createButtons();
    this._toggleButtons();
    this._loadTheme();
  },

  _onDeactivate() {
    this._destroyButtons();
    this._unloadTheme();
  },

  _createButtons() {
    [this._position, this._buttons] = Helpers.getWindowButtons();

    if (this._buttons && !this._buttonsActor) {
      this._buttonsActor = new St.Bin();
      this._buttonsBox   = new St.BoxLayout({ style_class: 'window-buttons-box' });

      this._buttonsActor._windowButtons = true;

      this._buttonsActor.add_actor(this._buttonsBox);
      this._buttonsActor.hide();

      this._buttons.forEach(Lang.bind(this, function (action) {
        let button = new St.Button({ style_class: 'window-button ' + action, track_hover: true });
        let icon   = new St.Bin({ style_class: 'icon' });

        button._windowAction = action;
        button.add_actor(icon);
        button.connect('clicked', Lang.bind(this, this._onButtonClick));

        this._buttonsBox.add(button);
      }));

      if (this._position == 'left') {
        let appmenu = Main.panel.statusArea.appMenu.actor.get_parent();
        Main.panel._leftBox.insert_child_below(this._buttonsActor, appmenu);
      }

      if (this._position == 'right') {
        Main.panel._rightBox.add_child(this._buttonsActor);
      }
    }
  },

  _destroyButtons() {
    if (this._buttonsBox) {
      this._buttonsBox.destroy();
      delete this._buttonsBox;
    }

    if (this._buttonsActor) {
      this._buttonsActor.destroy();
      delete this._buttonsActor;
    }
  },

  _updateButtons() {
    if (this._buttonsActor) {
      this._destroyButtons();
      this._createButtons();
    }
  },

  _updateTheme() {
    this._unloadTheme();
    this._loadTheme();
  },

  _loadTheme() {
    let context = St.ThemeContext.get_for_stage(global.stage).get_theme();
    let theme   = this._settings.get('window-buttons-theme');
    let cssPath = GLib.build_filenamev([Unite.path, 'themes', theme, 'stylesheet.css']);

    if (GLib.file_test(cssPath, GLib.FileTest.EXISTS)) {
      let cssFile = Gio.file_new_for_path(cssPath);

      if (!this._buttonsTheme) {
        this._buttonsTheme = cssFile;
        context.load_stylesheet(this._buttonsTheme);

        if (this._buttonsBox) {
          this._buttonsBox.add_style_class_name(theme + '-buttons');
        }
      }
    }
  },

  _unloadTheme() {
    if (this._buttonsTheme) {
      let theme   = this._settings.get('window-buttons-theme');
      let context = St.ThemeContext.get_for_stage(global.stage).get_theme();
      context.unload_stylesheet(this._buttonsTheme);

      if (this._buttonsBox) {
        this._buttonsBox.remove_style_class_name(theme + '-buttons');
      }

      delete this._buttonsTheme;
    }
  },

  _onButtonClick(actor, event) {
    if (this._activeWindow) {
      switch (actor._windowAction) {
        case 'minimize':
          this._minimizeWindow();
          break;
        case 'maximize':
          this._maximizeWindow();
          break;
        case 'close':
          this._closeWindow();
          break;
      }
    }
  },

  _minimizeWindow() {
    if (!this._activeWindow.minimized) {
      this._activeWindow.minimize();
    }
  },

  _maximizeWindow() {
    let bothMaximized = Meta.MaximizeFlags.BOTH;
    let maximizeState = this._activeWindow.get_maximized();

    if (maximizeState === bothMaximized) {
      this._activeWindow.unmaximize(bothMaximized);
    } else {
      this._activeWindow.maximize(bothMaximized);
    }
  },

  _closeWindow() {
    this._activeWindow.delete(global.get_current_time());
  },

  _toggleButtons() {
    this._activeWindow = global.display.focus_window;

    if (this._buttonsActor) {
      let valid    = Helpers.isValidWindow(this._activeWindow);
      let overview = Main.overview.visibleTarget;
      let target   = Main.panel.statusArea.appMenu._targetApp;
      let running  = target != null && target.get_state() == Shell.AppState.RUNNING;
      let visible  = running && !overview;

      if (!overview && valid) {
        let maximized = Helpers.isMaximized(this._activeWindow, this._enabled);
        let always    = this._enabled == 'always' && this._activeWindow;

        visible = always || maximized;
      }

      if (visible) {
        this._buttonsActor.show();
      } else {
        this._buttonsActor.hide();
      }
    }
  }
});
