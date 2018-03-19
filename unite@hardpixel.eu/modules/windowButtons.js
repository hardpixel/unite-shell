const Main           = imports.ui.main;
const Meta           = imports.gi.Meta;
const Mainloop       = imports.mainloop;
const Panel          = Main.panel;
const AppMenu        = Panel.statusArea.appMenu;
const St             = imports.gi.St;
const Gio            = imports.gi.Gio;
const GLib           = imports.gi.GLib;
const Lang           = imports.lang;
const ExtensionUtils = imports.misc.extensionUtils;
const Unite          = ExtensionUtils.getCurrentExtension();
const Helpers        = Unite.imports.helpers;
const Convenience    = Unite.imports.convenience;
const MAXIMIZED      = Meta.MaximizeFlags.BOTH;

var WindowButtons = new Lang.Class({
  Name: 'Unite.WindowButtons',
  _wmHandlerIDs: [],
  _ovHandlerIDs: [],

  _init: function() {
    this._settings = Convenience.getSettings();

    this._toggle();
    this._connectSettings();
  },

  _connectSettings: function() {
    this._settings.connect(
      'changed::show-window-buttons', Lang.bind(this, this._toggle)
    );

    this._settings.connect(
      'changed::window-buttons-theme', Lang.bind(this, this._updateTheme)
    );
  },

  _connectSignals: function () {
    this._dsHandlerID = global.display.connect(
      'notify::focus-window', Lang.bind(this, this._updateVisibility)
    );

    this._ovHandlerIDs.push(Main.overview.connect(
      'showing', Lang.bind(this, this._updateVisibility)
    ));

    this._ovHandlerIDs.push(Main.overview.connect(
      'hiding', Lang.bind(this, this._updateVisibility)
    ));

    this._wmHandlerIDs.push(global.window_manager.connect(
      'destroy', Lang.bind(this, this._updateVisibility)
    ));

    this._wmHandlerIDs.push(global.window_manager.connect(
      'size-change', Lang.bind(this, this._updateVisibility)
    ));
  },

  _disconnectSignals: function() {
    let handlers = Helpers.overviewSignalIDs();

    this._ovHandlerIDs.forEach(function (handler) {
      if (handlers.indexOf(handler) > -1) {
        Main.overview.disconnect(handler);
      }
    });

    this._wmHandlerIDs.forEach(function (handler) {
      global.window_manager.disconnect(handler);
    });

    if (this._dsHandlerID) {
      global.display.disconnect(this._dsHandlerID);
      delete this._dsHandlerID;
    }

    this._ovHandlerIDs = [];
    this._wmHandlerIDs = [];
  },

  _createButtons: function () {
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
        Panel._leftBox.insert_child_below(this._buttonsActor, appmenu);
      }

      if (this._position == 'right') {
        let index = Panel._rightBox.get_n_children() + 1;
        Panel._rightBox.insert_child_at_index(this._buttonsActor, index);
      }
    }
  },

  _destroyButtons: function () {
    if (this._buttonsBox) {
      this._buttonsBox.destroy();
      delete this._buttonsBox;
    }

    if (this._buttonsActor) {
      this._buttonsActor.destroy();
      delete this._buttonsActor;
    }
  },

  _updateTheme: function () {
    this._unloadTheme();
    this._loadTheme();

    Main.loadTheme();
  },

  _loadTheme: function () {
    let context = St.ThemeContext.get_for_stage(global.stage).get_theme();
    let theme   = this._settings.get_string('window-buttons-theme');
    let cssPath = GLib.build_filenamev([Unite.path, 'themes', theme, 'stylesheet.css']);
    let cssFile = Gio.file_new_for_path(cssPath);

    if (!this._buttonsTheme || this._buttonsTheme !== cssFile) {
      this._buttonsTheme = cssFile;
      context.load_stylesheet(cssFile);
    }
  },

  _unloadTheme: function () {
    if (this._buttonsTheme) {
      let context = St.ThemeContext.get_for_stage(global.stage).get_theme();
      context.unload_stylesheet(this._buttonsTheme);
    }
  },

  _onButtonClick: function (actor, evt) {
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

  _minimizeWindow: function () {
    if (!this._activeWindow.minimized) {
      this._activeWindow.minimize();
    }
  },

  _maximizeWindow: function () {
    if (this._activeWindow.get_maximized() === MAXIMIZED) {
      this._activeWindow.unmaximize(MAXIMIZED);
    } else {
      this._activeWindow.maximize(MAXIMIZED);
    }
  },

  _closeWindow: function () {
    this._activeWindow.delete(global.get_current_time());
  },

  _updateVisibility: function () {
    this._activeWindow = global.display.focus_window;

    if (this._buttonsActor) {
      let visible = AppMenu._visible;

      if (!Main.overview.visible) {
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
  },

  _toggle: function() {
    this._enabled = this._settings.get_string('show-window-buttons');
    this._enabled != 'never' ? this._activate() : this.destroy();
  },

  _activate: function() {
    if (!this._activated) {
      [this._position, this._buttons] = Helpers.getWindowButtons();

      Mainloop.idle_add(Lang.bind(this, this._createButtons));
      Mainloop.idle_add(Lang.bind(this, this._updateVisibility));

      this._activated = true;
      this._connectSignals();
      this._loadTheme();
    }
  },

  destroy: function() {
    if (this._activated) {
      Mainloop.idle_add(Lang.bind(this, this._destroyButtons));
      this._disconnectSignals();
      this._unloadTheme();

      this._activated = false;
      delete this._buttonsTheme;
    }
  }
});
