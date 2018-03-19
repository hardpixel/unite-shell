const Lang           = imports.lang;
const Main           = imports.ui.main;
const Shell          = imports.gi.Shell;
const AppSystem      = Shell.AppSystem.get_default();
const AppMenu        = Main.panel.statusArea.appMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Unite          = ExtensionUtils.getCurrentExtension();
const Helpers        = Unite.imports.helpers;
const Convenience    = Unite.imports.convenience;

var ActivitiesButton = new Lang.Class({
  Name: 'Unite.ActivitiesButton',
  _wmHandlerIDs: [],
  _ovHandlerIDs: [],

  _init: function() {
    this._activities = Main.panel.statusArea.activities;
    this._settings   = Convenience.getSettings();

    this._toggle();
    this._connectSettings();
  },

  _connectSettings: function() {
    this._settings.connect(
      'changed::hide-activities-button', Lang.bind(this, this._toggle)
    );
  },

  _connectSignals: function () {
    this._dsHandlerID = global.display.connect(
      'notify::focus-window', Lang.bind(this, this._updateVisibility)
    );

    this._asHandlerID = AppSystem.connect(
      'app-state-changed', Lang.bind(this, this._updateVisibility)
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

    if (this._asHandlerID) {
      AppSystem.disconnect(this._asHandlerID);
      delete this._asHandlerID;
    }

    this._ovHandlerIDs = [];
    this._wmHandlerIDs = [];
  },

  _updateVisibility: function() {
    let hide = AppMenu._visible;

    if (this._enabled == 'always') {
      hide = true;
    }

    if (this._enabled == 'never') {
      hide = false;
    }

    if (hide) {
      this._activities.container.hide();
    } else {
      this._activities.container.show();
    }
  },

  _toggle: function() {
    this._enabled = this._settings.get_string('hide-activities-button');
    this._enabled != 'never' ? this._activate() : this.destroy();
  },

  _activate: function() {
    if (!this._activated) {
      this._activated = true;

      this._updateVisibility();
      this._connectSignals();
    }
  },

  destroy: function() {
    if (this._activated) {
      this._activated = false;

      this._updateVisibility();
      this._disconnectSignals();
    }
  }
});
