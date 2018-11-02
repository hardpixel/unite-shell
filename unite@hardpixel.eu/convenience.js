const Lang    = imports.lang;
const Gettext = imports.gettext;
const Gio     = imports.gi.Gio;
const Config  = imports.misc.config;
const Unite   = imports.misc.extensionUtils.getCurrentExtension();
const GioSSS  = Gio.SettingsSchemaSource;

var SettingsManager = new Lang.Class({
  Name: 'Unite.Settings',
  Extends: Gio.Settings,
  DEFAULT_BINDING: Gio.SettingsBindFlags.DEFAULT,

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

  getSettingType(key) {
    return this.Types[key] || 'string';
  },

  getTypeSettings(type) {
    return Object.keys(this.Types).filter(key => this.Types[key] == type);
  },

  getSetting(key) {
    let type = this.getSettingType(key);
    return type == 'boolean' ? this.get_boolean(key) : this.get_string(key);
  }
});

function initTranslations(domain) {
  let textDomain = domain || Unite.metadata['gettext-domain'];
  let localeDir  = Unite.dir.get_child('locale');

  if (localeDir.query_exists(null)) {
    Gettext.bindtextdomain(textDomain, localeDir.get_path());
  } else {
    Gettext.bindtextdomain(textDomain, Config.LOCALEDIR);
  }
}

function getSettings(schema) {
  schema = schema || Unite.metadata['settings-schema'];

  let schemaDir    = Unite.dir.get_child('schemas');
  let schemaSource = GioSSS.get_default();

  if (schemaDir.query_exists(null)) {
    schemaDir    = schemaDir.get_path();
    schemaSource = GioSSS.new_from_directory(schemaDir, schemaSource, false);
  }

  let schemaObj = schemaSource.lookup(schema, true);

  if (!schemaObj) {
    let metaId  = Unite.metadata.uuid
    let message = `Schema ${schema} could not be found for extension ${metaId}.`;

    throw new Error(`${message} Please check your installation.`);
  }

  return new SettingsManager({ settings_schema: schemaObj });
}
