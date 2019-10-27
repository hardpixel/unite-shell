const Bytes   = imports.byteArray
const Gio     = imports.gi.Gio
const GLib    = imports.gi.GLib
const GObject = imports.gi.GObject
const St      = imports.gi.St
const Main    = imports.ui.main
const Unite   = imports.misc.extensionUtils.getCurrentExtension()

const USER_CONFIG = GLib.get_user_config_dir()
const USER_STYLES = `${USER_CONFIG}/gtk-3.0/gtk.css`

function fileExists(path) {
  return GLib.file_test(path, GLib.FileTest.EXISTS)
}

function getGioFile(path) {
  const absPath = GLib.build_filenamev([Unite.path, path])

  if (fileExists(absPath)) {
    return Gio.file_new_for_path(absPath)
  }
}

function getFileContents(path) {
  if (fileExists(path)) {
    const contents = GLib.file_get_contents(path)
    return Bytes.toString(contents[1])
  } else {
    return ''
  }
}

function setFileContents(path, contents) {
  GLib.file_set_contents(path, contents)
}

var ShellStyle = class ShellStyle {
  constructor(path) {
    this.file = getGioFile(path)
  }

  get context() {
    return St.ThemeContext.get_for_stage(global.stage)
  }

  get theme() {
    return this.context.get_theme()
  }

  load() {
    this.theme.load_stylesheet(this.file)
  }

  unload() {
    this.theme.unload_stylesheet(this.file)
  }
}

var WidgetStyle = class WidgetStyle {
  constructor(widget, style) {
    this.widget = widget
    this.style  = style
  }

  get existing() {
    return this.widget.get_style() || ''
  }

  load() {
    const style = this.existing + this.style
    this.widget.set_style(style)
  }

  unload() {
    const style = this.existing.replace(this.style, '')
    this.widget.set_style(style)
  }
}

var GtkStyle = class GtkStyle {
  constructor(contents) {
    this.contents = contents
  }

  get existing() {
    const contents = getFileContents(USER_STYLES)
    return contents.replace(/@import.*unite@hardpixel\.eu.*css['"]\);\n/g, '')
  }

  load() {
    setFileContents(USER_STYLES, this.contents + this.existing)
  }

  unload() {
    setFileContents(USER_STYLES, this.existing)
  }
}

var ThemeManager = GObject.registerClass(
  class UniteThemeManager extends GObject.Object {
    _init() {
      this.styles = new Map()
    }

    hasStyle(name) {
      return name && this.styles.has(name)
    }

    getStyle(name) {
      return name && this.styles.get(name)
    }

    setStyle(name, object, ...args) {
      if (!this.hasStyle(name)) {
        const style = new object(...args)
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

    addWidgetStyle(name, widget, styles) {
      this.deleteStyle(name)
      this.setStyle(name, WidgetStyle, widget, styles)
    }

    addGtkStyle(name, contents) {
      this.deleteStyle(name)
      this.setStyle(name, GtkStyle, contents)
    }

    activate() {
      Main.panel._addStyleClassName('unite-shell')
    }

    destroy() {
      this.clearStyles()
      Main.panel._removeStyleClassName('unite-shell')
    }
  }
)
