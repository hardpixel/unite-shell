const Unite    = imports.misc.extensionUtils.getCurrentExtension()
const Override = Unite.imports.overrides.helper
const VERSION  = Unite.imports.overrides.helper.VERSION

var PrefsWidget = class PrefsWidget extends Override.Injection {
  get active() {
    return VERSION < 40
  }

  _init() {
    this._replace('_loadTemplate')
  }

  _loadTemplate() {
    this._buildable.add_from_file(`${Unite.path}/overrides/settings.ui`)

    this._container = this._getWidget('prefs_widget')
    this.add(this._container)

    if (VERSION >= 36) {
      const fonts = this._getWidget('use-system-fonts-section')

      fonts.set_no_show_all(true)
      fonts.set_visible(false)
    }

    this.show_all()
  }
}
