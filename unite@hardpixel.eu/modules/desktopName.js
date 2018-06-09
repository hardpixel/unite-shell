const Lang           = imports.lang;
const Main           = imports.ui.main;
const St             = imports.gi.St;
const Shell          = imports.gi.Shell;
const AppSystem      = Shell.AppSystem.get_default();
const WindowTracker  = Shell.WindowTracker.get_default();
const Panel          = Main.panel;
const AppMenu        = Panel.statusArea.appMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Unite          = ExtensionUtils.getCurrentExtension();
const Convenience    = Unite.imports.convenience;

var DesktopName = new Lang.Class({
  Name: 'Unite.DesktopName',

  _init: function() {
    this._settings = Convenience.getSettings();

    this._toggle();
    this._connectSettings();
  },

  _connectSettings: function() {
    this._settings.connect(
      'changed::show-desktop-name', Lang.bind(this, this._toggle)
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
    let show = AppMenu._targetApp == null && !Main.overview.visibleTarget;

    if (show) {
      this._labelActor.show();
    } else {
      this._labelActor.hide();
    }
  },

  _createLabel: function () {
    if (!this._labelActor) {
      this._labelActor = new St.Bin({ style_class: 'desktop-name' });
      this._labelActor.hide();

      this._labelText = new St.Label({ text: 'GNOME Desktop' });
      this._labelActor.add_actor(this._labelText);

      let activities = Panel.statusArea.activities.actor.get_parent();
      Panel._leftBox.insert_child_below(this._labelActor, activities);

      Panel._desktopName = true;
    }
  },

  _destroyLabel: function () {
    if (this._labelActor) {
      this._labelActor.destroy();

      delete this._labelActor;
      delete this._labelText;
      delete Panel._desktopName;
    }
  },

  _toggle: function() {
    this._enabled = this._settings.get_boolean('show-desktop-name');
    this._enabled ? this._activate() : this.destroy();
  },

  _activate: function() {
    this._createLabel();
    this._updateVisibility();
    this._connectSignals();
  },

  destroy: function() {
    this._destroyLabel();
    this._disconnectSignals();
  }
});
