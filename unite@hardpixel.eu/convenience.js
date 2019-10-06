const Gettext = imports.gettext
const GObject = imports.gi.GObject
const Gio     = imports.gi.Gio
const Config  = imports.misc.config
const Unite   = imports.misc.extensionUtils.getCurrentExtension()

var SettingsManager = GObject.registerClass(
  class UniteSettings extends Gio.Settings {
    get DEFAULT_BINDING() {
      return Gio.SettingsBindFlags.DEFAULT
    }

    get _types() {
      return {
        'autofocus-windows':          'boolean',
        'hide-activities-button':     'enum',
        'show-window-title':          'enum',
        'show-desktop-name':          'boolean',
        'desktop-name-text':          'string',
        'extend-left-box':            'boolean',
        'notifications-position':     'enum',
        'use-system-fonts':           'boolean',
        'show-legacy-tray':           'boolean',
        'greyscale-tray-icons':       'boolean',
        'show-window-buttons':        'enum',
        'window-buttons-theme':       'enum',
        'hide-window-titlebars':      'enum',
        'window-buttons-placement':   'select',
        'hide-dropdown-arrows':       'boolean',
        'hide-aggregate-menu-arrow':  'boolean',
        'hide-app-menu-arrow':        'boolean',
        'hide-app-menu-icon':         'boolean',
        'reduce-panel-spacing':       'boolean',
        'restrict-to-primary-screen': 'boolean'
      }
    }

    exists(key) {
      return Object.keys(this._types).includes(key)
    }

    getSettingType(key) {
      return this._types[key] || 'invalid'
    }

    getTypeSettings(type) {
      return Object.keys(this._types).filter(key => this._types[key] == type)
    }

    getSetting(key) {
      if (!this.exists(key)) return

      let boolean = this.getSettingType(key) == 'boolean'
      return boolean ? this.get_boolean(key) : this.get_string(key)
    }
  }
)

var PreferencesManager = GObject.registerClass(
  class UnitePreferences extends Gio.Settings {
    get window_buttons_position() {
      let setting = this.get_string('button-layout')
      return /(close|minimize|maximize).*:/.test(setting) ? 'left' : 'right'
    }

    get window_buttons_layout() {
      let setting = this.get_string('button-layout')
      return setting.match(/(close|minimize|maximize)/g)
    }

    exists(key) {
      let fun = key.replace(/-/g, '_')
      return (fun in this) || this.list_keys().includes(key)
    }

    getSetting(key) {
      let fun = key.replace(/-/g, '_')

      if (this.exists(fun)) return this[fun]
      if (this.exists(key)) return this.get_string(key)
    }
  }
)

function initTranslations(domain) {
  let textDomain = domain || Unite.metadata['gettext-domain']
  let localeDir  = Unite.dir.get_child('locale')

  if (localeDir.query_exists(null))
    localeDir = localeDir.get_path()
  else
    localeDir = Config.LOCALEDIR

  Gettext.bindtextdomain(textDomain, localeDir)
}

function getSettings(schema) {
  schema = schema || Unite.metadata['settings-schema']

  let gioSSS       = Gio.SettingsSchemaSource
  let schemaDir    = Unite.dir.get_child('schemas')
  let schemaSource = gioSSS.get_default()

  if (schemaDir.query_exists(null)) {
    schemaDir    = schemaDir.get_path()
    schemaSource = gioSSS.new_from_directory(schemaDir, schemaSource, false)
  }

  let schemaObj = schemaSource.lookup(schema, true)

  if (!schemaObj) {
    let metaId  = Unite.metadata.uuid
    let message = `Schema ${schema} could not be found for extension ${metaId}.`

    throw new Error(`${message} Please check your installation.`)
  }

  return new SettingsManager({ settings_schema: schemaObj })
}

function getPreferences() {
  let schemaId = 'org.gnome.desktop.wm.preferences'
  return new PreferencesManager({ schema_id: schemaId })
}
