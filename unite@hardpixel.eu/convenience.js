const Lang           = imports.lang;
const Gettext        = imports.gettext;
const Gio            = imports.gi.Gio;
const Config         = imports.misc.config;
const ExtensionUtils = imports.misc.extensionUtils;
const Unite          = ExtensionUtils.getCurrentExtension();
const GioSSS         = Gio.SettingsSchemaSource;

var SettingsManager = new Lang.Class({
  Name: 'Unite.Settings',

  Types: {
    'autofocus-windows':      'boolean',
    'hide-activities-button': 'enum',
    'show-window-title':      'enum',
    'show-desktop-name':      'boolean',
    'desktop-name-text':      'string',
    'extend-left-box':        'boolean',
    'notifications-position': 'enum',
    'show-legacy-tray':       'boolean',
    'greyscale-tray-icons':   'boolean',
    'show-window-buttons':    'enum',
    'window-buttons-theme':   'enum',
    'hide-window-titlebars':  'enum'
  },

  _init(gioSettings) {
    this._gioSettings = gioSettings;
  },

  getSettingType(key) {
    return this.Types[key] || 'string';
  },

  getTypeSettings(type) {
    return Object.keys(this.Types).filter(key => this.Types[key] == type);
  },

  getSetting(key) {
    let type  = this.getSettingType(key);
    let value = null;

    if (type == 'boolean')
      value = this._gioSettings.get_boolean(key);
    else
      value = this._gioSettings.get_string(key);

    return value;
  }
});

function initTranslations(domain) {
  domain = domain || Unite.metadata['gettext-domain'];

  let localeDir = Unite.dir.get_child('locale');

  if (localeDir.query_exists(null)) {
    Gettext.bindtextdomain(domain, localeDir.get_path());
  } else {
    Gettext.bindtextdomain(domain, Config.LOCALEDIR);
  }
}

function getSettings(schema) {
  schema = schema || Unite.metadata['settings-schema'];

  let schemaDir    = Unite.dir.get_child('schemas');
  let schemaSource = null;

  if (schemaDir.query_exists(null)) {
    schemaSource = GioSSS.new_from_directory(schemaDir.get_path(), GioSSS.get_default(), false);
  } else {
    schemaSource = GioSSS.get_default();
  }

  let schemaObj = schemaSource.lookup(schema, true);

  if (!schemaObj) {
    let message = 'Schema ' + schema + ' could not be found for extension ' + Unite.metadata.uuid;
    throw new Error(message + '. Please check your installation.');
  }

  return new Gio.Settings({ settings_schema: schemaObj });
}

function getSettingsManager(schema) {
  return new SettingsManager(getSettings(schema));
}
