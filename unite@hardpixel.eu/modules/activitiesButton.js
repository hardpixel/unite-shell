const Lang           = imports.lang;
const Main           = imports.ui.main;
const Shell          = imports.gi.Shell;
const AppSystem      = Shell.AppSystem.get_default();
const WindowTracker  = Shell.WindowTracker.get_default();
const Panel          = Main.panel;
const Activities     = Panel.statusArea.activities;
const AppMenu        = Panel.statusArea.appMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Unite          = ExtensionUtils.getCurrentExtension();
const Convenience    = Unite.imports.convenience;

var ActivitiesButton = new Lang.Class({
  Name: 'Unite.ActivitiesButton',

  _init: function() {
    this._settings = Convenience.getSettings();

    this._toggle();
    this._connectSettings();
  },

  _connectSettings: function() {
    this._settings.connect(
      'changed::hide-activities-button', Lang.bind(this, this._toggle)
    );
  },

  _connectSignals: function () {
    if (!this._wtHandlerID) {
      this._wtHandlerID = WindowTracker.connect(
        'notify::focus-app', Lang.bind(this, this._updateVisibility)
      );
    }

    if (!this._asHandlerID) {
      this._asHandlerID = AppSystem.connect(
        'app-state-changed', Lang.bind(this, this._updateVisibility)
      );
    }

    if (!this._ovHandlerIDs) {
      let ovEvents = ['showing', 'hiding'];

      this._ovHandlerIDs = ovEvents.map(Lang.bind(this, function (eventName) {
        return Main.overview.connect(
          eventName, Lang.bind(this, this._updateVisibility)
        );
      }));
    }
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

    if (this._ovHandlerIDs) {
      this._ovHandlerIDs.forEach(function (handler) {
        Main.overview.disconnect(handler);
      });

      delete this._ovHandlerIDs;
    }
  },

  _updateVisibility: function() {
    let overview = Main.overview.visibleTarget;
    let target   = AppMenu._targetApp != null;
    let appmenu  = target && !overview;
    let hidden   = this._enabled == 'always' || appmenu;

    if (!hidden && Panel._desktopName) {
      hidden = !target && !overview;
    }

    if (hidden) {
      this._hideButton();
    } else {
      this._showButton();
    }
  },

  _hideButton: function () {
    Activities.container.hide();
  },

  _showButton: function () {
    Activities.container.show();
  },

  _toggle: function() {
    this._enabled = this._settings.get_string('hide-activities-button');
    this._enabled != 'never' ? this._activate() : this.destroy();
  },

  _activate: function() {
    this._updateVisibility();
    this._connectSignals();
  },

  destroy: function() {
    this._showButton();
    this._disconnectSignals();
  }
});
