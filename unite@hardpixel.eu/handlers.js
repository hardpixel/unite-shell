const GObject     = imports.gi.GObject;
const Unite       = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Unite.imports.convenience;

var SignalsHandler = new GObject.Class({
  Name: 'UniteSignalsHandler',

  _init(context) {
    this._signals = {};
    this._context = context;
  },

  _getCallbackFunction(callback) {
    if (typeof callback == 'string')
      callback = this._context[callback] || this._context[`_${callback}`];

    return callback;
  },

  _connectHandler(object, name, callbackObj) {
    let callback = this._getCallbackFunction(callbackObj);
    let signalId = object.connect(name, callback.bind(this._context));

    return { object: object, signalId: signalId };
  },

  _addHandler(object, name, callback) {
    let signalKey = `${object}[${name}#${callback}]`;

    if (!this._signals[signalKey])
      this._signals[signalKey] = this._connectHandler(object, name, callback);

    return signalKey;
  },

  connect(object, name, callback) {
    return this._addHandler(object, name, callback);
  },

  disconnect(signalKey) {
    let signalData = this._signals[signalKey];
    if (!signalData) return;

    signalData.object.disconnect(signalData.signalId);
    delete this._signals[signalKey];
  },

  disconnectMany(signalKeys) {
    signalKeys.forEach(signalKey => { this.disconnect(signalKey) });
  },

  disconnectAll() {
    this.disconnectMany(Object.keys(this._signals));
  }
});

var SettingsHandler = new GObject.Class({
  Name: 'UniteSettingsHandler',
  Extends: SignalsHandler,

  _init(context) {
    this._enabler  = null;
    this._signals  = {};
    this._context  = context;
    this._settings = Convenience.getSettings();
    this._wmPrefs  = Convenience.getPreferences();
  },

  _getSettingObject(settingKey) {
    if (this._settings.exists(settingKey))
      return this._settings;

    if (this._wmPrefs.exists(settingKey))
      return this._wmPrefs;
  },

  connect(name, callback) {
    let object = this._getSettingObject(name);
    return this._addHandler(object, `changed::${name}`, callback);
  },

  enable(name, callback) {
    if (this._enabler) return;

    let signalObj = this._settings;
    this._enabler = this._connectHandler(signalObj, `changed::${name}`, callback);
  },

  disable() {
    if (!this._enabler) return;

    this._settings.disconnect(this._enabler.signalId);
    this._enabler = null;
  },

  get(settingKey) {
    if (settingKey == null) return;

    let object = this._getSettingObject(settingKey);
    if (object) return object.getSetting(settingKey);
  }
});
