const Bytes       = imports.byteArray
const Gio         = imports.gi.Gio
const GLib        = imports.gi.GLib
const St          = imports.gi.St
const Unite       = imports.misc.extensionUtils.getCurrentExtension()
const Convenience = Unite.imports.convenience

const SETTINGS = Convenience.getSettings()
const WM_PREFS = Convenience.getPreferences()

const USER_CONFIG = GLib.get_user_config_dir()
const USER_STYLES_GTK3 = `${USER_CONFIG}/gtk-3.0/gtk.css`
const USER_STYLES_GTK4 = `${USER_CONFIG}/gtk-4.0/gtk.css`

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
  if (!fileExists(path)) {
    const dirname = GLib.path_get_dirname(path)
    GLib.mkdir_with_parents(dirname, parseInt('0700', 8))
  }

  GLib.file_set_contents(path, contents)
}

function resetGtkStyles(filepath) {
  let style = getFileContents(filepath)

  style = style.replace(/\/\* UNITE ([\s\S]*?) UNITE \*\/\n/g, '')
  style = style.replace(/@import.*unite@hardpixel\.eu.*css['"]\);\n/g, '')

  setFileContents(filepath, style)
}

var Signals = class Signals {
  constructor() {
    this.signals = new Map()
  }

  registerHandler(object, name, callback) {
    const uid = GLib.uuid_string_random()
    const key = `[signal ${name} uuid@${uid}]`

    this.signals.set(key, {
      object:   object,
      signalId: object.connect(name, callback)
    })

    return key
  }

  hasSignal(key) {
    return this.signals.has(key)
  }

  connect(object, name, callback) {
    return this.registerHandler(object, name, callback)
  }

  disconnect(key) {
    if (this.hasSignal(key)) {
      const data = this.signals.get(key)
      data.object.disconnect(data.signalId)

      this.signals.delete(key)
    }
  }

  disconnectMany(keys) {
    keys.forEach(this.disconnect.bind(this))
  }

  disconnectAll() {
    for (const key of this.signals.keys()) {
      this.disconnect(key)
    }
  }
}

var Settings = class Settings extends Signals {
  getSettingObject(key) {
    if (SETTINGS.exists(key)) {
      return SETTINGS
    } else {
      return WM_PREFS
    }
  }

  connect(name, callback) {
    const object = this.getSettingObject(name)
    return this.registerHandler(object, `changed::${name}`, callback)
  }

  get(key) {
    const object = this.getSettingObject(key)
    return object.getSetting(key)
  }
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
  constructor(filepath, name, contents) {
    this.filepath = filepath
    this.contents = `/* UNITE ${name} */\n${contents}\n/* ${name} UNITE */\n`
  }

  get existing() {
    return getFileContents(this.filepath)
  }

  load() {
    const style = this.contents + this.existing
    setFileContents(this.filepath, style)
  }

  unload() {
    const style = this.existing.replace(this.contents, '')
    setFileContents(this.filepath, style)
  }
}

var Styles = class Styles {
  constructor() {
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

  addShellStyle(name, path) {
    this.deleteStyle(name)
    this.setStyle(name, ShellStyle, path)
  }

  addWidgetStyle(name, widget, styles) {
    this.deleteStyle(name)
    this.setStyle(name, WidgetStyle, widget, styles)
  }

  addGtk3Style(name, contents) {
    this.deleteStyle(name)
    this.setStyle(name, GtkStyle, USER_STYLES_GTK3, name, contents)
  }

  addGtk4Style(name, contents) {
    this.deleteStyle(name)
    this.setStyle(name, GtkStyle, USER_STYLES_GTK4, name, contents)
  }

  removeAll() {
    for (const key of this.styles.keys()) {
      this.deleteStyle(key)
    }
  }
}

resetGtkStyles(USER_STYLES_GTK3)
resetGtkStyles(USER_STYLES_GTK4)
