const System        = imports.system
const Clutter       = imports.gi.Clutter
const Shell         = imports.gi.Shell
const Main          = imports.ui.main
const Unite         = imports.misc.extensionUtils.getCurrentExtension()
const Base          = Unite.imports.module.BaseModule
const TrayIndicator = Unite.imports.panel.TrayIndicator
const scaleSize     = Unite.imports.helpers.scaleSize

var TopIcons = class TopIcons extends Base {
  _onSetup() {
    this._enableKey   = 'show-legacy-tray'
    this._enableValue = true
  }

  _onActivate() {
    this._settings.connect('greyscale-tray-icons', 'desaturateIcons')

    this._createContainer()
    this._createTray()
  }

  _onDeactivate() {
    this._destroyContainer()
    this._destroyTray()
  }

  _createTray() {
    this._tray = new Shell.TrayManager()

    this._tray.connect('tray-icon-added', (trayManager, icon) => {
      this._indicators.addIcon(icon)
      this._desaturateIcon(icon)
    })

    this._tray.connect('tray-icon-removed', (trayManager, icon) => {
      this._indicators.removeIcon(icon)
    })

    this._tray.manage_screen(Main.panel)
  }

  _destroyTray() {
    this._tray = null
    System.gc()
  }

  _createContainer() {
    if (this._indicators) return

    this._indicators = new TrayIndicator({ size: scaleSize(20) })
    Main.panel.addToStatusArea('uniteTrayIndicator', this._indicators)
  }

  _destroyContainer() {
    if (!this._indicators) return

    this._indicators.destroy()
    this._indicators = null
  }

  _desaturateIcon(icon) {
    let greyscale = this._settings.get('greyscale-tray-icons')
    icon.clear_effects()

    if (!greyscale) return

    let desEffect = new Clutter.DesaturateEffect({ factor : 1.0 })
    let briEffect = new Clutter.BrightnessContrastEffect({})

    briEffect.set_brightness(0.2)
    briEffect.set_contrast(0.3)

    icon.add_effect_with_name('desaturate', desEffect)
    icon.add_effect_with_name('brightness-contrast', briEffect)
  }

  _desaturateIcons() {
    if (!this._indicators) return

    this._indicators.forEach(icon => { this._desaturateIcon(icon) })
  }
}
