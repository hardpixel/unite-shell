const Lang        = imports.lang;
const Unite       = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Unite.imports.convenience;

var SignalsHandler = new Lang.Class({
  Name: 'Unite.SignalsHandler',

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
    let signalId = object.connect(name, Lang.bind(this._context, callback));

    return { object: object, signalId: signalId }
  },

  connect(object, name, callback) {
    let signalKey = `${object}/${name}#${callback}`;

    if (!this._signals[signalKey])
      this._signals[signalKey] = this._connectHandler(object, name, callback);

    return signalKey;
  },

  disconnect(signalKey) {
    let signalData = this._signals[signalKey];
    if (!signalData) return;

    signalData.object.disconnect(signalData.signalId);
    delete this._signals[signalKey];
  },

  disconnectAll() {
    for (let signalKey in this._signals) {
      this.disconnect(signalKey);
    }
  }
});

var SettingsHandler = new Lang.Class({
  Name: 'Unite.SettingsHandler',
  Extends: SignalsHandler,

  _init(context) {
    this._enabler  = null;
    this._signals  = {};
    this._context  = context;
    this._settings = Convenience.getSettings();
    this._wmPrefs  = Convenience.getPreferences();
  },

  _getSettingObject(settingKey) {
    let isSetting = this._settings.exists(settingKey);
    return isSetting ? this._settings : this._wmPrefs;
  },

  connect(name, callback) {
    let signalId = `${name}#${callback}`;

    if (!this._signals[signalId]) {
      let object  = this._getSettingObject(name);
      let handler = this._connectHandler(object, `changed::${name}`, callback);

      this._signals[signalId] = handler;
    }

    return signalId;
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
    let object = this._getSettingObject(settingKey);
    return object.getSetting(settingKey);
  }
});
