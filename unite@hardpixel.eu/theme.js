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

const WindowControlsTheme = class WindowControlsTheme {
  constructor(uuid, path) {
    this.uuid = uuid
    this.keys = new GLib.KeyFile()

    try {
      const theme = GLib.build_filenamev([path, 'unite.theme'])
      this.keys.load_from_file(theme, GLib.KeyFileFlags.NONE)

      const dark  = this.keys.get_string('Dark', 'Style')
      const light = this.keys.get_string('Light', 'Style')

      this.name  = this.keys.get_string('Theme', 'Name')
      this.dark  = GLib.build_filenamev([path, dark])
      this.light = GLib.build_filenamev([path, light])

      this.valid = fileExists(this.dark) && fileExists(this.light)
    } catch (e) {
      this.valid = false
    }
  }

  getStyle(dark = true) {
    return dark ? this.dark : this.light
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

  get default() {
    return this.themes['default']
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

        if (item.valid) {
          this.themes[uuid] = item
        }
      }

      data.close(null)
    })
  }
}
