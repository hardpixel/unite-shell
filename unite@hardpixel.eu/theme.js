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

function parseKeyFile(path, callback) {
  const file = GLib.build_filenamev(path)

  if (!fileExists(file)) {
    return { get: () => null }
  }

  const keys = new GLib.KeyFile()
  keys.load_from_file(file, GLib.KeyFileFlags.NONE)

  return {
    get: (group, name) => {
      try {
        return keys.get_string(group, name)
      } catch {
        return null
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
    const style = theme.get('Theme', 'Stylesheet')

    this.uuid = uuid
    this.name = name || toTitleCase(uuid)
    this.path = GLib.build_filenamev([path, style || 'stylesheet.css'])
  }

  get isValid() {
    return fileExists(this.path)
  }

  match(gtkTheme, isDark) {
    const name = this.name.replace(/(\sDark|\sLight)$/, '')
    const dark = !this.uuid.endsWith('-light')

    return dark == isDark &&
      (gtkTheme == name || gtkTheme.startsWith(`${name}-`))
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

  getDefault(variant) {
    return this.themes[`default-${variant}`]
  }

  get(name) {
    return this.themes[name] || this.getDefault('dark')
  }

  match(gtkTheme, bgColor) {
    const isDark = isColorDark(bgColor)

    return this.available.find(theme => theme.match(gtkTheme, isDark)) ||
      this.available.find(theme => theme.match(gtkTheme, !isDark)) ||
      this.getDefault(isDark ? 'dark' : 'light')
  }

  locate(btnTheme, gtkTheme, bgColor) {
    if (btnTheme == 'auto') {
      return this.match(gtkTheme, bgColor)
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
