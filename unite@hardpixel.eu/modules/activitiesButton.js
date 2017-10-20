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

    this._updateVisibility();
    this._connectSettings();
  },

  _connectSettings: function() {
    this._settings.connect(
      'changed::hide-activities-button',
      Lang.bind(this, this._updateVisibility)
    );
  },

  _showButton: function() {
    this._activities.actor.show();
  },

  _hideButton: function() {
    this._activities.actor.hide();
  },

  _updateVisibility: function() {
    this._hidden = this._settings.get_boolean('hide-activities-button');

    if (this._hidden) {
      this._hideButton();
    } else {
      this._showButton();
    }
  },

  destroy: function() {
    this._showButton();
  }
});
