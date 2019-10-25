const Gio      = imports.gi.Gio
const GLib     = imports.gi.GLib
const GObject  = imports.gi.GObject
const St       = imports.gi.St
const Main     = imports.ui.main
const Unite    = imports.misc.extensionUtils.getCurrentExtension()
const Signals  = Unite.imports.handlers.SignalsHandler
const Settings = Unite.imports.handlers.SettingsHandler

function fileExists(path) {
  return GLib.file_test(path, GLib.FileTest.EXISTS)
}

function getGioFile(path) {
  const absPath = GLib.build_filenamev([Unite.path, path])

  if (fileExists(absPath)) {
    return Gio.file_new_for_path(absPath)
  }
}

var ShellStyle = class ShellStyle {
  constructor(theme, path) {
    this.theme = theme
    this.file  = getGioFile(path)
  }

  load() {
    this.theme.load_stylesheet(this.file)
  }

  unload() {
    this.theme.unload_stylesheet(this.file)
  }
}

var ThemeManager = GObject.registerClass(
  class UniteThemeManager extends GObject.Object {
    _init() {
      this.styles   = new Map()
      this.signals  = new Signals()
      this.settings = new Settings()
    }

    get context() {
      return St.ThemeContext.get_for_stage(global.stage)
    }

    get theme() {
      return this.context.get_theme()
    }

    hasStyle(name) {
      return name && this.styles.has(name)
    }

    getStyle(name) {
      return name && this.styles.get(name)
    }

    setStyle(name, object, path) {
      if (!this.hasStyle(name)) {
        const style = new object(this.theme, path)
        style.load()

        this.styles.set(name, style)
      }
    }

    deleteStyle(name) {
      if (this.hasStyle(name)) {
        const style = this.getStyle(name)
        style.unload()

        this.styles.delete(name)
      }
    }

    clearStyles() {
      for (const key of this.styles.keys()) {
        this.deleteStyle(key)
      }
    }

    addShellStyle(name, path) {
      this.deleteStyle(name)
      this.setStyle(name, ShellStyle, path)
    }

    activate() {
      Main.panel._addStyleClassName('unite-shell')
    }

    destroy() {
      this.clearStyles()

      this.signals.disconnectAll()
      this.settings.disconnectAll()

      Main.panel._removeStyleClassName('unite-shell')
    }
  }
)
