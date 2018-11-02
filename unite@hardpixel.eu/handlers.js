const Lang        = imports.lang;
const Unite       = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Unite.imports.convenience;

var SignalsHandler = new Lang.Class({
  Name: 'Unite.SignalsHandler',

  _init(context) {
    this._signals = {};
    this._context = context;
  },

  connect(object, signalName, callback) {
    let signalKey = `${object}/${signalName}#${callback}`;

    if (!this._signals[signalKey]) {
      let signalId = object.connect(
        signalName, Lang.bind(this._context, callback)
      );

      this._signals[signalKey] = { object: object, signalId: signalId };
    }

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

  _init(context) {
    this._signals  = {};
    this._context  = context;
    this._settings = Convenience.getSettings();
  },

  connect(signalName, callback) {
    let signalId = `${signalName}#${callback}`;

    if (!this._signals[signalId]) {
      this._signals[signalId] = this._settings.connect(
        signalName, Lang.bind(this._context, callback)
      );
    }

    return signalId;
  },

  disconnect(signalKey) {
    let signalId = this._signals[signalKey];
    if (!signalId) return;

    this._settings.disconnect(signalId);
    delete this._signals[signalId];
  },

  disconnectAll() {
    for (let signalKey in this._signals) {
      this.disconnect(signalKey);
    }
  },

  get(settingKey) {
    return this._settings.getSetting(settingKey);
  }
});
