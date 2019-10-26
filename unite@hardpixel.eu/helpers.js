const GLib   = imports.gi.GLib
const St     = imports.gi.St
const Config = imports.misc.config

const USER_CONFIG = GLib.get_user_config_dir()
const USER_STYLES = `${USER_CONFIG}/gtk-3.0/gtk.css`

var minorVersion = parseInt(Config.PACKAGE_VERSION.split('.')[1])

function fileExists(path) {
  return GLib.file_test(path, GLib.FileTest.EXISTS)
}

function getThemeContext() {
  return St.ThemeContext.get_for_stage(global.stage)
}

function scaleSize(initialSize) {
  let context = getThemeContext()
  return initialSize * context.scale_factor
}
