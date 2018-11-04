const Lang     = imports.lang;
const Unite    = imports.misc.extensionUtils.getCurrentExtension();
const Signals  = Unite.imports.handlers.SignalsHandler;
const Settings = Unite.imports.handlers.SettingsHandler;

var BaseModule = new Lang.Class({
  Name: 'Unite.BaseModule',

  _enableKey: null,
  _enableValue: null,
  _disableValue: null,

  _onInitialize() {},
  _onActivate() {},
  _onDeactivate() {},
  _onReload() {},
  _onDestroy() {},

  _init() {
    this._signals  = new Signals(this);
    this._settings = new Settings(this);

    this._onInitialize();
    this._activate();

    this._settings.enable(this._enableKey, this._reload);
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
    this._onDeactivate();

    this._settings.disconnectAll();
    this._signals.disconnectAll();
  },

  _reload() {
    this._deactivate();
    this._activate();
    this._onReload();
  },

  destroy() {
    this._deactivate();
    this._onDestroy();
    this._settings.disable();
  }
});
