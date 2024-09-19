import Adw from 'gi://Adw'
import GLib from 'gi://GLib'
import GObject from 'gi://GObject'
import Gtk from 'gi://Gtk'
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'
import * as Theme from './theme.js'
import * as Convenience from './convenience.js'

class UnitePreferencesWidget {
  constructor() {
    this._settings  = Convenience.getSettings()
    this._buildable = new Gtk.Builder()
    this._themes    = new Theme.WindowControlsThemes()

    this._loadTemplate()
    this._loadThemes()

    this._bindStrings()
    this._bindSelects()
    this._bindBooleans()
    this._bindEnumerations()
    this._bindIntegers()
  }

  _loadTemplate() {
    const template = GLib.build_filenamev([Convenience.getPath(), 'settings.ui'])
    this._buildable.add_from_file(template)
  }

  _loadThemes() {
    const widget = this._getWidget('window-buttons-theme')
    const themes = this._themes.available.sort((a, b) => {
      return a.uuid < b.uuid ? -1 : a.uuid > b.uuid ? 1 : 0
    })

    themes.forEach(theme => {
      if (theme.uuid !== 'default') {
        widget.append(theme.uuid, theme.name)
      }
    })
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

    widget.connect('changed', combobox => {
      this._settings.set_enum(setting, combobox.get_active())
    })
  }

  _bindStrings() {
    let settings = this._settings.getTypeSettings('string')
    settings.forEach(setting => this._bindInput(setting, 'text'))
  }

  _bindSelects() {
    let settings = this._settings.getTypeSettings('select')
    settings.forEach(setting => this._bindInput(setting, 'active-id'))
  }

  _bindBooleans() {
    let settings = this._settings.getTypeSettings('boolean')
    settings.forEach(setting => this._bindInput(setting, 'active'))
  }

  _bindEnumerations() {
    let settings = this._settings.getTypeSettings('enum')
    settings.forEach(setting => this._bindEnum(setting))
  }

  _bindIntegers() {
    let settings = this._settings.getTypeSettings('int')
    settings.forEach(setting => this._bindInput(setting, 'value'))
  }
}

export default class UnitePreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const widget = new UnitePreferencesWidget()

    window.add(widget._getWidget('general_page'))
    window.add(widget._getWidget('windows_page'))

    window.set_default_size(620, 660)
  }
}
