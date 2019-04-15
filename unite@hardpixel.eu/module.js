const GObject  = imports.gi.GObject;
const Unite    = imports.misc.extensionUtils.getCurrentExtension();
const Signals  = Unite.imports.handlers.SignalsHandler;
const Settings = Unite.imports.handlers.SettingsHandler;

var BaseModule = new GObject.Class({
  Name: 'UniteBaseModule',

  _enableKey: null,
  _enableValue: null,
  _disableValue: null,

  _init() {
    this._signals  = new Signals(this);
    this._settings = new Settings(this);
    this._setting  = this._settings.get(this._enableKey);

    this._runCallback('_onInitialize');
    this._activate();

    this._settings.enable(this._enableKey, 'reload');
  },

  get _enabled() {
    if (this._enableKey == null)
      return true;

    if (this._enableValue != null)
      return this._setting == this._enableValue;

    if (this._disableValue != null)
      return this._setting != this._disableValue;
  },

  _hasCallback(name) {
    return typeof(this[name]) === 'function';
  },

  _runCallback(name) {
    if (this._hasCallback(name))
      this[name]();
  },

  _activate() {
    if (this._enabled)
      this._runCallback('_onActivate');
  },

  _deactivate() {
    this._runCallback('_onDeactivate');

    this._settings.disconnectAll();
    this._signals.disconnectAll();
  },

  _reload() {
    let prevState = this._enabled;
    this._setting = this._settings.get(this._enableKey);

    if (prevState == this._enabled) {
      this._runCallback('_onReset');
    } else {
      this._deactivate();
      this._activate();

      this._runCallback('_onReload');
    }
  },

  destroy() {
    this._deactivate();
    this._runCallback('_onDestroy');

    this._settings.disable();
  }
});
