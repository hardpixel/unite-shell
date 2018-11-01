const Lang            = imports.lang;
const ExtensionUtils  = imports.misc.extensionUtils;
const Unite           = ExtensionUtils.getCurrentExtension();
const SignalsHandler  = Unite.imports.handlers.SignalsHandler;
const SettingsHandler = Unite.imports.handlers.SettingsHandler;

var BaseModule = new Lang.Class({
  Name: 'Unite.BaseModule',

  _init() {
    this._signals  = new SignalsHandler(this);
    this._settings = new SettingsHandler(this);

    this._activate();
    this._connectSettings();
  },

  _connectSettings() {},
  _connnectSignals() {},

  _runCallback(name) {
    let callback = this[name];

    if (typeof callback == 'function')
      callback();
  },

  _activate() {
    this._connnectSignals();
    this._runCallback('_onActivate');
  },

  _deactivate() {
    this._signals.disconnectAll();
    this._runCallback('_onDeactivate');
  },

  _reload() {
    this._deactivate();
    this._activate();
  },

  destroy() {
    this._deactivate();
    this._settings.disconnectAll();
  }
});
