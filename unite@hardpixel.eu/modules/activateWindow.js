const Lang           = imports.lang;
const Main           = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const Unite          = ExtensionUtils.getCurrentExtension();
const Convenience    = Unite.imports.convenience;

var ActivateWindow = new Lang.Class({
  Name: 'Unite.ActivateWindow',

  _init: function() {
    this._settings = Convenience.getSettings();

    this._toggle();
    this._connectSettings();
  },

  _connectSettings: function() {
    this._settings.connect(
      'changed::autofocus-windows', Lang.bind(this, this._toggle)
    );
  },

  _connectSignals: function() {
    if (!this._handlerID) {
      this._handlerID = global.display.connect(
        'window-demands-attention', Lang.bind(this, this._activateWindow)
      );
    }
  },

  _disconnectSignals: function() {
    if (this._handlerID) {
      global.display.disconnect(this._handlerID);
      delete this._handlerID;
    }
  },

  _activateWindow: function (actor, win) {
    Main.activateWindow(win);
  },

  _toggle: function() {
    this._enabled = this._settings.get_boolean('autofocus-windows');
    this._enabled ? this._activate() : this.destroy();
  },

  _activate: function() {
    this._connectSignals();
  },

  destroy: function() {
    this._disconnectSignals();
  }
});
