import Gio from 'gi://Gio'
import GLib from 'gi://GLib'
import St from 'gi://St'
import { InjectionManager } from 'resource:///org/gnome/shell/extensions/extension.js'
import * as Main from 'resource:///org/gnome/shell/ui/main.js'
import * as Convenience from './convenience.js'

const SETTINGS = Convenience.getSettings()
const WM_PREFS = Convenience.getPreferences()
const IF_PREFS = Convenience.getInterface()

const GTK_VERSIONS = [3, 4]
const USER_CONFIGS = GLib.get_user_config_dir()

function isAbsPath(value) {
  return value.toString().startsWith('/')
}

function isRelPath(value) {
  return value.toString().startsWith('@/')
}

function isFilePath(value) {
  return isAbsPath(value) || isRelPath(value)
}

function filePath(parts) {
  const parse = part => part ? part.replace(/^@/, '') : ''
  const root  = isAbsPath(parts) ? [] : [Convenience.getPath()]
  const paths = root.concat(parts).map(parse)

  return GLib.build_filenamev(paths)
}

function userStylesPath(version) {
  return GLib.build_filenamev([USER_CONFIGS, `gtk-${version}.0`, 'gtk.css'])
}

function fileExists(path) {
  return GLib.file_test(path, GLib.FileTest.EXISTS)
}

function getGioFile(path) {
  const absPath = filePath(path)

  if (fileExists(absPath)) {
    return Gio.file_new_for_path(absPath)
  }
}

function getFileContents(path) {
  if (fileExists(path)) {
    const contents = GLib.file_get_contents(path)
    return String.fromCharCode(...contents[1])
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

export function resetGtkStyles() {
  GTK_VERSIONS.forEach(version => {
    const filepath = userStylesPath(version)
    let style = getFileContents(filepath)

    style = style.replace(/\/\* UNITE ([\s\S]*?) UNITE \*\/\n/g, '')
    setFileContents(filepath, style)
  })
}

export class Signals {
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

      if (data.object != null) {
        data.object.disconnect(data.signalId)
      }

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

export class Settings extends Signals {
  getSettingObject(key) {
    if (SETTINGS.exists(key)) {
      return SETTINGS
    } else if (WM_PREFS.exists(key)) {
      return WM_PREFS
    } else {
      return IF_PREFS
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

  set(key, value) {
    const object = this.getSettingObject(key)
    return object.setSetting(key, value)
  }
}

export class Injections {
  constructor() {
    this.store = new Map()
    this.items = new InjectionManager()
  }

  registerInjection(name, value) {
    const uid = GLib.uuid_string_random()
    const key = `[injection ${name} uuid@${uid}]`

    this.store.set(key, value)
    return key
  }

  method(object, method, callback) {
    const proto = object.prototype
    this.items.overrideMethod(proto, method, () => callback)

    return this.registerInjection(method, [proto, method])
  }

  vfunc(object, method, callback) {
    const proto = Object.getPrototypeOf(object)
    const vfunc = `vfunc_${method}`
    this.items.overrideMethod(proto, vfunc, () => callback)

    return this.registerInjection(vfunc, [proto, vfunc])
  }

  remove(key) {
    if (this.store.has(key)) {
      const [prototype, method] = this.store.get(key)
      this.items.restoreMethod(prototype, method)

      this.store.delete(key)
    }
  }

  removeAll() {
    this.store.clear()
    this.items.clear()
  }
}

export class Timeouts {
  constructor() {
    this.store = new Map()
  }

  register(sourceId) {
    const uid = GLib.uuid_string_random()
    const key = `[timeout uuid@${uid}]`

    this.store.set(key, sourceId)

    return key
  }

  idle(callback) {
    return this.register(
      GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
        callback.call(null)
        return GLib.SOURCE_REMOVE
      })
    )
  }

  timeout(time, callback) {
    return this.register(
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, time, () => {
        callback.call(null)
        return GLib.SOURCE_REMOVE
      })
    )
  }

  interval(time, callback) {
    return this.register(
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, time, () => {
        if (callback.call(null) === false) {
          return GLib.SOURCE_REMOVE
        } else {
          return GLib.SOURCE_CONTINUE
        }
      })
    )
  }

  remove(key) {
    if (this.store.has(key)) {
      const sourceId = this.store.get(key)
      GLib.source_remove(sourceId)

      this.store.delete(key)
    }
  }

  removeAll() {
    for (const key of this.store.keys()) {
      this.remove(key)
    }
  }
}

export class Feature {
  constructor(setting, callback) {
    this._settingsKey = setting
    this._checkActive = callback
  }
}

export class Features {
  constructor() {
    this.features = []
    this.settings = new Settings()
  }

  add(klass) {
    const feature = new klass()
    this.features.push(feature)

    const setting = feature._settingsKey
    const checkCb = feature._checkActive

    feature.activated = false

    const isActive = () => {
      return checkCb.call(null, this.settings.get(setting))
    }

    const onChange = () => {
      const active = isActive()

      if (active && !feature.activated) {
        feature.activated = true
        return feature.activate()
      }

      if (!active && feature.activated) {
        feature.activated = false
        return feature.destroy()
      }
    }

    feature._doActivate = () => {
      this.settings.connect(setting, onChange.bind(feature))
      onChange()
    }

    feature._doDestroy = () => {
      if (feature.activated) {
        feature.destroy()
        feature.activated = false
      }
    }
  }

  activate() {
    this.features.forEach(feature => feature._doActivate())
  }

  destroy() {
    this.features.forEach(feature => feature._doDestroy())
    this.settings.disconnectAll()
  }
}

class ShellStyle {
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

class WidgetStyle {
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

class GtkStyle {
  constructor(version, name, data) {
    const content = this.parse(data, version)

    this.filepath = userStylesPath(version)
    this.contents = `/* UNITE ${name} */\n${content}\n/* ${name} UNITE */\n`
  }

  get existing() {
    return getFileContents(this.filepath)
  }

  parse(data, ver) {
    if (isFilePath(data)) {
      const path = filePath(['styles', `gtk${ver}`, data])
      return `@import url('${path}');`
    } else {
      return data
    }
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

class GtkStyles {
  constructor(name, data, versions) {
    const items = [].concat(versions).filter(ver => GTK_VERSIONS.includes(ver))
    this.styles = items.map(ver => new GtkStyle(ver, name, data))
  }

  load() {
    this.styles.forEach(style => style.load())
  }

  unload() {
    this.styles.forEach(style => style.unload())
  }
}

export class Styles {
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

  addShellStyle(name, data) {
    if (isFilePath(data)) {
      this.deleteStyle(name)
      this.setStyle(name, ShellStyle, data)
    } else {
      this.addWidgetStyle(name, Main.uiGroup, data)
    }
  }

  addWidgetStyle(name, widget, styles) {
    this.deleteStyle(name)
    this.setStyle(name, WidgetStyle, widget, styles)
  }

  addGtkStyle(name, contents, versions = GTK_VERSIONS) {
    this.deleteStyle(name)
    this.setStyle(name, GtkStyles, name, contents, versions)
  }

  removeAll() {
    for (const key of this.styles.keys()) {
      this.deleteStyle(key)
    }
  }
}
