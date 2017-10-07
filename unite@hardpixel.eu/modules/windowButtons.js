const Main           = imports.ui.main;
const Meta           = imports.gi.Meta;
const Mainloop       = imports.mainloop;
const Panel          = Main.panel;
const AppMenu        = Panel.statusArea.appMenu;
const St             = imports.gi.St;
const Lang           = imports.lang;
const ExtensionUtils = imports.misc.extensionUtils;
const Unite          = ExtensionUtils.getCurrentExtension();
const Helpers        = Unite.imports.helpers;
const MAXIMIZED      = Meta.MaximizeFlags.BOTH;

var WindowButtons = new Lang.Class({
  Name: 'WindowButtons',
  _buttons: null,
  _position: null,
  _wmHandlerIDs: [],
  _ovHandlerIDs: [],
  _dsHandlerID : null,
  _buttonsActor: null,
  _buttonsBox: null,
  _activeWindow: null,

  _init: function() {
    [this._position, this._buttons] = Helpers.getWindowButtons();

    Mainloop.idle_add(Lang.bind(this, this._createButtons));
    Mainloop.idle_add(Lang.bind(this, this._updateVisibility));

    this._connectSignals();
  },

  _connectSignals: function () {
    this._dsHandlerID = global.display.connect(
      'notify::focus-window', Lang.bind(this, this._updateVisibility)
    );

    this._ovHandlerIDs.push(Main.overview.connect(
      'showing', Lang.bind(this, this._updateVisibility)
    ));

    this._ovHandlerIDs.push(Main.overview.connect(
      'hidden', Lang.bind(this, this._updateVisibility)
    ));

    this._wmHandlerIDs.push(global.window_manager.connect(
      'destroy', Lang.bind(this, this._updateVisibility)
    ));

    let sizeSignal = Helpers.versionLT('3.24') ? 'size-change' : 'size-changed';

    this._wmHandlerIDs.push(global.window_manager.connect(
      sizeSignal, Lang.bind(this, this._updateVisibility)
    ));
  },

  _createButtons: function () {
    if (this._buttons) {
      this._buttonsActor = new St.Bin();
      this._buttonsBox   = new St.BoxLayout({ style_class: 'window-buttons-box' });

      this._buttonsActor._windowButtons = true;

      this._buttonsActor.add_actor(this._buttonsBox);
      this._buttonsActor.hide();

      this._buttons.forEach(Lang.bind(this, function (action) {
        let button = new St.Button({ style_class: action  + ' window-button', track_hover: true });

        button._windowAction = action;
        button.connect('button-release-event', Lang.bind(this, this._onButtonClick));

        this._buttonsBox.add(button);
      }));

      if (this._position == 'left') {
        Panel._leftBox.insert_child_at_index(this._buttonsActor, 1);
      }

      if (this._position == 'right') {
        let index = Panel._rightBox.get_n_children() + 1;
        Panel._rightBox.insert_child_at_index(this._buttonsActor, index);
      }
    }
  },

  _destroyButtons: function () {
    if (this._buttonsActor) {
      this._buttonsActor.destroy();
    }

    if (this._buttonsBox) {
      this._buttonsBox.destroy();
    }
  },

  _onButtonClick: function (actor, evt) {
    if (evt.get_button() === 1) {
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
    if (this._activeWindow && !this._activeWindow.minimized) {
      this._activeWindow.minimize();
    }
  },

  _maximizeWindow: function () {
    if (this._activeWindow) {
      if (this._activeWindow.get_maximized()) {
        this._activeWindow.unmaximize(MAXIMIZED);
      } else {
        this._activeWindow.maximize(MAXIMIZED);
      }

      this._activeWindow.activate(global.get_current_time());
    }
  },

  _closeWindow: function () {
    if (this._activeWindow) {
      this._activeWindow.delete(global.get_current_time());
    }
  },

  _updateVisibility: function () {
    this._activeWindow = global.display.focus_window;

    if (this._buttonsActor) {
      let visible = AppMenu._visible;

      if (!Main.overview.visible && this._activeWindow) {
        visible = this._activeWindow.get_maximized();
      }

      if (visible) {
        this._buttonsActor.show();
      } else {
        this._buttonsActor.hide();
      }
    }
  },

  destroy: function() {
    global.display.disconnect(this._dsHandlerID);

    this._ovHandlerIDs.forEach(function (handler) {
      if (Helpers.overviewSignalIDs().indexOf(handler) > -1) {
        Main.overview.disconnect(handler);
      }
    });

    this._wmHandlerIDs.forEach(function (handler) {
      global.window_manager.disconnect(handler);
    });

    Mainloop.idle_add(Lang.bind(this, this._destroyButtons));
  }
});
