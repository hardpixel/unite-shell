const Lang           = imports.lang;
const Main           = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const Unite          = ExtensionUtils.getCurrentExtension();
const Convenience    = Unite.imports.convenience;

var ActivitiesButton = new Lang.Class({
  Name: 'Unite.ActivitiesButton',

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

  _toggleButton: function(hide) {
    if (hide) {
      this._activities.actor.hide();
    } else {
      this._activities.actor.show();
    }
  },

  _toggle: function() {
    this._hidden = this._settings.get_boolean('hide-activities-button');
    this._toggleButton(this._hidden);
  },

  destroy: function() {
    this._toggleButton(false);
  }
});
