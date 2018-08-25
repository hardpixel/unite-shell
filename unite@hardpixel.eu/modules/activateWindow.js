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
    this._awHandlerID = this._settings.connect(
      'changed::autofocus-windows', Lang.bind(this, this._toggle)
    );
  },

  _disconnectSettings: function() {
    if (this._awHandlerID) {
      this._settings.disconnect(this._awHandlerID);
      delete this._awHandlerID;
    }
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

    this._deactivate();
    this._activate();
  },

  _activate: function() {
    if (this._enabled) {
      this._connectSignals();
    }
  },

  _deactivate: function() {
    this._disconnectSignals();
  },

  destroy: function() {
    this._deactivate();
    this._disconnectSettings();
  }
});
