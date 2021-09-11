const GLib    = imports.gi.GLib
const GObject = imports.gi.GObject
const Gio     = imports.gi.Gio
const Me      = imports.misc.extensionUtils.getCurrentExtension()

const THEME_DIRS = [
  GLib.build_filenamev([Me.path, 'themes']),
  GLib.build_filenamev([GLib.get_user_data_dir(), 'unite-shell/themes'])
]

function toTitleCase(text) {
  const upcase = (_, char) => char ? char.toUpperCase() : ''
  const string = text.replace(/-|_/g, ' ')

  return string.replace(/\b([a-z])/g, upcase)
}

const WindowControlsTheme = class WindowControlsTheme {
  constructor(uuid, path) {
    this.uuid = uuid
    this.name = toTitleCase(uuid)
    this.path = GLib.build_filenamev([path, 'stylesheet.css'])
  }

  get isValid() {
    return GLib.file_test(this.path, GLib.FileTest.EXISTS)
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
    return this.themes[name] || this.themes['default-dark']
  }

  getStyle(name) {
    return this.get(name).path
  }

  update() {
    THEME_DIRS.forEach(pathName => {
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
