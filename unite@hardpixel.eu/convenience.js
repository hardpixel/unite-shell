import GObject from 'gi://GObject'
import Gio from 'gi://Gio'

export const SettingsObject = GObject.registerClass(
  class UniteSettingsObject extends Gio.Settings {
    exists(key) {
      return this.settings_schema.has_key(key)
    }

    getSetting(key) {
      if (this.exists(key)) return this.get_string(key)
    }

    setSetting() {
      return false
    }
  }
)

export const SettingsManager = GObject.registerClass(
  class UniteSettings extends Gio.Settings {
    get DEFAULT_BINDING() {
      return Gio.SettingsBindFlags.DEFAULT
    }

    get _types() {
      return {
        'autofocus-windows':          'boolean',
        'hide-activities-button':     'enum',
        'show-window-title':          'enum',
        'show-appmenu-button':        'boolean',
        'show-desktop-name':          'boolean',
        'use-activities-text':        'boolean',
        'desktop-name-text':          'string',
        'extend-left-box':            'boolean',
        'notifications-position':     'enum',
        'show-legacy-tray':           'boolean',
        'greyscale-tray-icons':       'boolean',
        'show-window-buttons':        'enum',
        'window-buttons-theme':       'select',
        'hide-window-titlebars':      'enum',
        'enable-titlebar-actions':    'boolean',
        'window-buttons-placement':   'enum',
        'hide-app-menu-icon':         'boolean',
        'reduce-panel-spacing':       'boolean',
        'restrict-to-primary-screen': 'boolean',
        'app-menu-max-width':         'int',
        'app-menu-ellipsize-mode':    'enum'
      }
    }

    exists(key) {
      return Object.prototype.hasOwnProperty.call(this._types, key)
    }

    getSettingType(key) {
      return this._types[key] || 'invalid'
    }

    getTypeSettings(type) {
      return Object.keys(this._types).filter(key => this._types[key] == type)
    }

    getSetting(key) {
      if (!this.exists(key)) return

      switch (this.getSettingType(key)) {
        case 'int':     return this.get_int(key)
        case 'boolean': return this.get_boolean(key)
        default:        return this.get_string(key)
      }
    }

    setSetting(key, value) {
      if (!this.exists(key)) return false

      switch (this.getSettingType(key)) {
        case 'int':     return this.set_int(key, value)
        case 'boolean': return this.set_boolean(key, value)
        default:        return this.set_string(key, value)
      }
    }
  }
)

export const PreferencesManager = GObject.registerClass(
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
      return (fun in this) || this.settings_schema.has_key(key)
    }

    getSetting(key) {
      let fun = key.replace(/-/g, '_')

      if (this.exists(fun)) return this[fun]
      if (this.exists(key)) return this.get_string(key)
    }

    setSetting() {
      return false
    }
  }
)

export function getSettings(schema) {
  schema = schema || 'org.gnome.shell.extensions.unite'

  let gioSSS       = Gio.SettingsSchemaSource
  let schemaDir    = getDir().get_child('schemas')
  let schemaSource = gioSSS.get_default()

  if (schemaDir.query_exists(null)) {
    schemaDir    = schemaDir.get_path()
    schemaSource = gioSSS.new_from_directory(schemaDir, schemaSource, false)
  }

  let schemaObj = schemaSource.lookup(schema, true)

  if (!schemaObj) {
    let metaId  = 'unite@hardpixel.eu'
    let message = `Schema ${schema} could not be found for extension ${metaId}.`

    throw new Error(`${message} Please check your installation.`)
  }

  return new SettingsManager({ settings_schema: schemaObj })
}

export function getPreferences() {
  let schemaId = 'org.gnome.desktop.wm.preferences'
  return new PreferencesManager({ schema_id: schemaId })
}

export function getInterface() {
  let schemaId = 'org.gnome.desktop.interface'
  return new SettingsObject({ schema_id: schemaId })
}

export function getDir() {
  return Gio.File.new_for_uri(import.meta.url).get_parent()
}

export function getPath() {
  return getDir().get_path()
}
