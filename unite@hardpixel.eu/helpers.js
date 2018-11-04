const Gio   = imports.gi.Gio;
const GLib  = imports.gi.GLib;
const St    = imports.gi.St;
const Meta  = imports.gi.Meta;
const Unite = imports.misc.extensionUtils.getCurrentExtension();

function getThemeContext() {
  return St.ThemeContext.get_for_stage(global.stage);
}

function getTheme() {
  let context = getThemeContext();
  return context.get_theme();
}

function getGioFile(filePath) {
  let absPath = GLib.build_filenamev([Unite.path, filePath]);

  if (GLib.file_test(absPath, GLib.FileTest.EXISTS))
    return Gio.file_new_for_path(absPath);
}

function loadStyles(filePath) {
  let gioFile = getGioFile(filePath);
  if (!gioFile) return;

  let theme = getTheme();
  theme.load_stylesheet(gioFile);

  return gioFile;
}

function unloadStyles(gioFile) {
  let theme = getTheme();
  theme.unload_stylesheet(gioFile);

  return null;
}

function scaleSize(initial_size) {
  let context = getThemeContext();
  return initial_size * context.scale_factor;
}

function isWindow(win) {
  if (!win) return;

  let meta  = Meta.WindowType;
  let types = [meta.NORMAL, meta.DIALOG, meta.MODAL_DIALOG, meta.UTILITY];

  return types.includes(win.window_type);
}

function isMaximized(win, match_state) {
  if (!win) return;

  let flags         = Meta.MaximizeFlags;
  let maximized     = win.get_maximized()
  let primaryScreen = win.is_on_primary_monitor();
  let tileMaximized = maximized == flags.HORIZONTAL || maximized == flags.VERTICAL;
  let fullMaximized = maximized == flags.BOTH;
  let bothMaximized = fullMaximized || tileMaximized;

  switch (match_state) {
    case 'both':      return primaryScreen && bothMaximized;
    case 'maximized': return primaryScreen && fullMaximized;
    case 'tiled':     return primaryScreen && tileMaximized;
  }
}
