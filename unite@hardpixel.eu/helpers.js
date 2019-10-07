const Gio    = imports.gi.Gio
const GLib   = imports.gi.GLib
const St     = imports.gi.St
const Config = imports.misc.config
const Unite  = imports.misc.extensionUtils.getCurrentExtension()

const USER_CONFIG = GLib.get_user_config_dir()
const USER_STYLES = `${USER_CONFIG}/gtk-3.0/gtk.css`

var minorVersion = parseInt(Config.PACKAGE_VERSION.split('.')[1])

function fileExists(path) {
  return GLib.file_test(path, GLib.FileTest.EXISTS)
}

function getUserStyles() {
  if (!fileExists(USER_STYLES)) return ''

  let file  = GLib.file_get_contents(USER_STYLES)
  let style = String.fromCharCode.apply(null, file[1])

  return style.replace(/@import.*unite@hardpixel\.eu.*css['"]\);\n/g, '')
}

function loadUserStyles(styles) {
  let existing = getUserStyles()
  GLib.file_set_contents(USER_STYLES, styles + existing)
}

function getThemeContext() {
  return St.ThemeContext.get_for_stage(global.stage)
}

function getTheme() {
  let context = getThemeContext()
  return context.get_theme()
}

function getGioFile(filePath) {
  let absPath = GLib.build_filenamev([Unite.path, filePath])

  if (fileExists(absPath))
    return Gio.file_new_for_path(absPath)
}

function loadStyles(filePath) {
  let gioFile = getGioFile(filePath)
  if (!gioFile) return

  let theme = getTheme()
  theme.load_stylesheet(gioFile)

  return gioFile
}

function unloadStyles(gioFile) {
  let theme = getTheme()
  theme.unload_stylesheet(gioFile)

  return null
}

function scaleSize(initialSize) {
  let context = getThemeContext()
  return initialSize * context.scale_factor
}
