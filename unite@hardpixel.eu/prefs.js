const GObject     = imports.gi.GObject
const Gtk         = imports.gi.Gtk
const Config      = imports.misc.config
const Unite       = imports.misc.extensionUtils.getCurrentExtension()
const Convenience = Unite.imports.convenience

const VERSION = parseInt(Config.PACKAGE_VERSION.split('.')[1])

var PrefsWidget = GObject.registerClass(
  class UnitePrefsWidget extends Gtk.Box {
    _init(params) {
      this._settings = Convenience.getSettings()
      super._init(params)

      this._buildable = new Gtk.Builder()
      this._buildable.add_from_file(`${Unite.path}/settings.ui`)

      this._container = this._getWidget('prefs_widget')
      this.add(this._container)

      if (VERSION >= 36) {
        const fonts = this._getWidget('use_system_fonts_section')
        fonts.set_sensitive(false)
      }

      this._bindStrings()
      this._bindSelects()
      this._bindBooleans()
      this._bindEnumerations()
    }

    _getWidget(name) {
      let widgetName = name.replace(/-/g, '_')
      return this._buildable.get_object(widgetName)
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
  }
)

function init() {
  Convenience.initTranslations()
}

function buildPrefsWidget() {
  let widget = new PrefsWidget()
  widget.show_all()

  return widget
}
