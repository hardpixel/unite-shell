const GObject     = imports.gi.GObject
const Gtk         = imports.gi.Gtk
const Unite       = imports.misc.extensionUtils.getCurrentExtension()
const Convenience = Unite.imports.convenience
const VERSION     = Unite.imports.constants.VERSION
const TEMPLATE    = VERSION < 40 ? 'settings-gtk3.ui' : 'settings-gtk4.ui'

var PrefsWidget = GObject.registerClass(
  class UnitePrefsWidget extends Gtk.Box {
    _init(params) {
      this._settings = Convenience.getSettings()
      super._init(params)

      this._buildable = new Gtk.Builder()
      this._buildable.add_from_file(`${Unite.path}/${TEMPLATE}`)

      this._container = this._getWidget('prefs_widget')

      if (VERSION < 40) {
        this.add(this._container)
      } else {
        this.append(this._container)
      }

      this._bindStrings()
      this._bindSelects()
      this._bindBooleans()
      this._bindEnumerations()
      this._bindIntegers()
    }

    startup() {
      if (VERSION < 40) {
        this.show_all()
      }

      if (VERSION >= 36) {
        this._hideSetting('use-system-fonts')
      }

      if (VERSION >= 40) {
        this._disableSetting('hide-dropdown-arrows')
        this._disableSetting('hide-aggregate-menu-arrow')
        this._disableSetting('hide-app-menu-arrow')
      }
    }

    _getWidget(name) {
      let widgetName = name.replace(/-/g, '_')
      return this._buildable.get_object(widgetName)
    }

    _hideSetting(name) {
      const widget = this._getWidget(`${name}_section`)
      widget.set_visible(false)
    }

    _disableSetting(name) {
      const widget = this._getWidget(`${name}_section`)
      widget.set_sensitive(false)
    }

    _bindInput(setting, prop) {
      let widget = this._getWidget(setting)
      this._settings.bind(setting, widget, prop, this._settings.DEFAULT_BINDING)
    }

    _bindEnum(setting) {
      let widget = this._getWidget(setting)
      widget.set_active(this._settings.get_enum(setting))

      widget.connect('changed', (combobox) => {
        this._settings.set_enum(setting, combobox.get_active())
      })
    }

    _bindStrings() {
      let settings = this._settings.getTypeSettings('string')
      settings.forEach(setting => { this._bindInput(setting, 'text') })
    }

    _bindSelects() {
      let settings = this._settings.getTypeSettings('select')
      settings.forEach(setting => { this._bindInput(setting, 'active-id') })
    }

    _bindBooleans() {
      let settings = this._settings.getTypeSettings('boolean')
      settings.forEach(setting => { this._bindInput(setting, 'active') })
    }

    _bindEnumerations() {
      let settings = this._settings.getTypeSettings('enum')
      settings.forEach(setting => { this._bindEnum(setting) })
    }

    _bindIntegers() {
      let settings = this._settings.getTypeSettings('int')
      settings.forEach(setting => { this._bindInput(setting, 'value') })
    }
  }
)

function init() {
  Convenience.initTranslations()
}

function buildPrefsWidget() {
  let widget = new PrefsWidget()
  widget.startup()

  return widget
}
