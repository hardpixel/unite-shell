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

  exists(key) {
    return Object.keys(this.Types).includes(key);
  },

  getSettingType(key) {
    return this.Types[key] || 'invalid';
  },

  getTypeSettings(type) {
    return Object.keys(this.Types).filter(key => this.Types[key] == type);
  },

  getSetting(key) {
    if (!this.exists(key)) return;

    let type = this.getSettingType(key);
    return type == 'boolean' ? this.get_boolean(key) : this.get_string(key);
  }
});

var PreferencesManager = new Lang.Class({
  Name: 'Unite.Preferences',
  Extends: Gio.Settings,

  _window_buttons_position() {
    let setting = this.get_string('button-layout');
    return /(close|minimize|maximize).*:/.test(setting) ? 'left' : 'right';
  },

  _window_buttons_layout() {
    let setting = this.get_string('button-layout');
    return setting.match(/(close|minimize|maximize)/g);
  },

  exists(key) {
    return this[key] || this.list_keys().includes(key);
  },

  getSetting(key) {
    let method = `_${key.replace(/-/g, '_')}`;

    if (this.exists(method)) return this[method]();
    if (this.exists(key))    return this.get_string(key);
  }
});

function initTranslations(domain) {
  let textDomain = domain || Unite.metadata['gettext-domain'];
  let localeDir  = Unite.dir.get_child('locale');

  if (localeDir.query_exists(null))
    localeDir = localeDir.get_path()
  else
    localeDir = Config.LOCALEDIR

  Gettext.bindtextdomain(textDomain, localeDir);
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

function getPreferences() {
  let schemaId = 'org.gnome.desktop.wm.preferences';
  return new PreferencesManager({ schema_id: schemaId });
}
