const GLib    = imports.gi.GLib
const GObject = imports.gi.GObject
const Gio     = imports.gi.Gio
const Me      = imports.misc.extensionUtils.getCurrentExtension()

const THEME_DIRS = [
  GLib.build_filenamev([Me.path, 'themes']),
  GLib.build_filenamev([GLib.get_user_data_dir(), 'unite-shell/themes'])
]

function fileExists(path) {
  return GLib.file_test(path, GLib.FileTest.EXISTS)
}

function isColorDark({ red, green, blue }) {
  // HSP equation from http://alienryderflex.com/hsp.html
  const hsp = Math.sqrt(
    0.299 * (red * red) +
    0.587 * (green * green) +
    0.114 * (blue * blue)
  )

  return hsp < 127.6
}

function parseKeyFile(path) {
  const file = GLib.build_filenamev(path)

  if (!fileExists(file)) {
    return { get: (group, name, fallback = null) => fallback }
  }

  const keys = new GLib.KeyFile()
  keys.load_from_file(file, GLib.KeyFileFlags.NONE)

  return {
    get: (group, name, fallback = null) => {
      try {
        return keys.get_string(group, name) || fallback
      } catch {
        return fallback
      }
    }
  }
}

function toTitleCase(text) {
  const upcase = (_, char) => char ? char.toUpperCase() : ''
  const string = text.replace(/-|_/g, ' ')

  return string.replace(/\b([a-z])/g, upcase)
}

const WindowControlsTheme = class WindowControlsTheme {
  constructor(uuid, path) {
    const theme = parseKeyFile([path, 'unite.theme'])
    const name  = theme.get('Theme', 'Name')
    const style = theme.get('Theme', 'Stylesheet', 'stylesheet.css')
    const dark  = theme.get('Theme', 'DarkStylesheet', style)
    const light = theme.get('Theme', 'LightStylesheet', dark)

    this.uuid = uuid
    this.name = name || toTitleCase(uuid)

    this.dark  = GLib.build_filenamev([path, dark])
    this.light = GLib.build_filenamev([path, light])
  }

  get isValid() {
    return fileExists(this.dark) && fileExists(this.light)
  }

  getStyle(bgColor) {
    return isColorDark(bgColor) ? this.dark : this.light
  }

  match(gtkTheme) {
    return gtkTheme == this.name || gtkTheme.startsWith(`${this.name}-`)
  }
}

var WindowControlsThemes = class WindowControlsThemes {
  constructor() {
    this.themes = {}
    this.update()
  }

  get available() {
    return Object.values(this.themes)
  }

  forEach(callback) {
    this.available.forEach(callback)
  }

  get(name) {
    return this.themes[name] || this.default
  }

  match(gtkTheme) {
    return this.available.find(theme => theme.match(gtkTheme)) || this.default
  }

  locate(btnTheme, gtkTheme) {
    if (btnTheme == 'auto') {
      return this.match(gtkTheme)
    } else {
      return this.get(btnTheme)
    }
  }

  update() {
    THEME_DIRS.filter(fileExists).forEach(pathName => {
      const path = Gio.File.new_for_path(pathName)
      const data = path.enumerate_children(
        Gio.FILE_ATTRIBUTE_STANDARD_NAME,
        Gio.FileQueryInfoFlags.NONE,
        null
      )

      while (true) {
        const info = data.next_file(null)
        if (!info) break

        const uuid = info.get_name()
        const path = GLib.build_filenamev([pathName, uuid])
        const item = new WindowControlsTheme(uuid, path)

        if (item.isValid) {
          this.themes[uuid] = item
        }
      }

      data.close(null)
    })
  }
}
