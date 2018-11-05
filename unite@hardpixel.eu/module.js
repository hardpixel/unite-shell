const Lang     = imports.lang;
const Unite    = imports.misc.extensionUtils.getCurrentExtension();
const Signals  = Unite.imports.handlers.SignalsHandler;
const Settings = Unite.imports.handlers.SettingsHandler;

var BaseModule = new Lang.Class({
  Name: 'Unite.BaseModule',

  _enableKey: null,
  _enableValue: null,
  _disableValue: null,

  _init() {
    this._signals  = new Signals(this);
    this._settings = new Settings(this);

    this._runCallback('_onInitialize');
    this._activate();

    this._settings.enable(this._enableKey, this._reload);
  },

  _runCallback(name) {
    if (typeof this[name] === 'function') this[name]();
  },

  _activate() {
    this._enabled = this._settings.get(this._enableKey);

    let enabled = this._enabled == this._enableValue;
    if (this._enableValue != null && !enabled) return;

    let disabled = this._enabled == this._disableValue;
    if (this._disableValue != null && disabled) return;

    this._onActivate();
  },

  _deactivate() {
    this._runCallback('_onDeactivate');

    this._settings.disconnectAll();
    this._signals.disconnectAll();
  },

  _reload() {
    this._deactivate();
    this._activate();
    this._runCallback('_onReload');
  },

  destroy() {
    this._deactivate();
    this._runCallback('_onDestroy');

    this._settings.disable();
  }
});
