const Lang           = imports.lang;
const Main           = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const Unite          = ExtensionUtils.getCurrentExtension();
const Convenience    = Unite.imports.convenience;

var ActivateWindow = new Lang.Class({
  Name: 'Unite.ActivateWindow',

  _init: function() {
    this._settings = Convenience.getSettings();

    this._update();
    this._connectSettings();
  },

  _connectSettings: function() {
    this._settings.connect(
      'changed::autofocus-windows',
      Lang.bind(this, this._update)
    );
  },

  _enable: function() {
    this._handlerID = global.display.connect(
      'window-demands-attention', Lang.bind(this, this._activate)
    );
  },

  _activate: function (actor, win) {
    Main.activateWindow(win);
  },

  _update: function() {
    this._enabled = this._settings.get_boolean('autofocus-windows');

    if (this._enabled) {
      this._enable();
    } else {
      this.destroy();
    }
  },

  destroy: function() {
    if (this._handlerID) {
      global.display.disconnect(this._handlerID);
    }
  }
});
