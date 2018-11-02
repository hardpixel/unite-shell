const Lang     = imports.lang;
const Unite    = imports.misc.extensionUtils.getCurrentExtension();
const Signals  = Unite.imports.handlers.SignalsHandler;
const Settings = Unite.imports.handlers.SettingsHandler;

var BaseModule = new Lang.Class({
  Name: 'Unite.BaseModule',
  EnableKey: null,
  EnableValue: null,
  DisableValue: null,

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

    this._settings.connect(`changed::${this.EnableKey}`, this._reload);
  },

  _activate() {
    this._enabled = this._settings.get(this.EnableKey);

    let enabled = this._enabled == this.EnableValue;
    if (this.EnableValue != null && !enabled) return;

    let disabled = this._enabled == this.DisableValue;
    if (this.DisableValue != null && disabled) return;

    this._onActivate();
  },

  _deactivate() {
    this._onDeactivate();
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
    this._settings.disconnectAll();
  }
});
