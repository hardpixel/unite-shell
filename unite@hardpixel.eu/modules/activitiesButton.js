const Lang           = imports.lang;
const Main           = imports.ui.main;
const Shell          = imports.gi.Shell;
const AppSystem      = Shell.AppSystem.get_default();
const WindowTracker  = Shell.WindowTracker.get_default();
const Panel          = Main.panel;
const AppMenu        = Panel.statusArea.appMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Unite          = ExtensionUtils.getCurrentExtension();
const Convenience    = Unite.imports.convenience;

var ActivitiesButton = new Lang.Class({
  Name: 'Unite.ActivitiesButton',
  _ovHandlerIDs: [],

  _init: function() {
    this._activities = Panel.statusArea.activities;
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
    this._wtHandlerID = WindowTracker.connect(
      'notify::focus-app', Lang.bind(this, this._updateVisibility)
    );

    this._asHandlerID = AppSystem.connect(
      'app-state-changed', Lang.bind(this, this._updateVisibility)
    );

    ['showing', 'hiding'].forEach(function (eventName) {
      this._ovHandlerIDs.push(Main.overview.connect(
        eventName, Lang.bind(this, this._updateVisibility)
      ));
    });
  },

  _disconnectSignals: function() {
    if (this._wtHandlerID) {
      WindowTracker.disconnect(this._wtHandlerID);
      delete this._wtHandlerID;
    }

    if (this._asHandlerID) {
      AppSystem.disconnect(this._asHandlerID);
      delete this._asHandlerID;
    }

    this._ovHandlerIDs.forEach(function (handler) {
      Main.overview.disconnect(handler);
    });

    this._ovHandlerIDs = [];
  },

  _updateVisibility: function() {
    let menu = AppMenu._targetApp != null && !Main.overview.visibleTarget;
    let hide = this._enabled == 'always' || menu;

    if (!hide && Panel._desktopName) {
      hide = AppMenu._targetApp == null && !Main.overview.visibleTarget;
    }

    if (hide) {
      this._hideButton();
    } else {
      this._showButton();
    }
  },

  _hideButton: function () {
    this._activities.container.hide();
  },

  _showButton: function () {
    this._activities.container.show();
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

      this._showButton();
      this._disconnectSignals();
    }
  }
});
