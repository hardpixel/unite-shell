const Gio      = imports.gi.Gio;
const GLib     = imports.gi.GLib;
const St       = imports.gi.St;
const Meta     = imports.gi.Meta;
const Config   = imports.misc.config;
const Unite    = imports.misc.extensionUtils.getCurrentExtension();
const Settings = Unite.imports.convenience.getSettings();

const USER_CONFIG = GLib.get_user_config_dir();
const USER_STYLES = `${USER_CONFIG}/gtk-3.0/gtk.css`;

function versionCompare(aVersion, bVersion) {
  const aParts = aVersion.replace(/(\.0+)+$/, '').split('.');
  const bParts = bVersion.replace(/(\.0+)+$/, '').split('.');
  const length = Math.min(aParts.length, bParts.length);

  for (let i = 0; i < length; i++) {
    let diff = parseInt(aParts[i], 10) - parseInt(bParts[i], 10);
    if (diff) return diff;
  }

  return aParts.length - bParts.length;
}

function versionCheck(version) {
  const [cmp, ver] = version.split(' ');
  const difference = versionCompare(Config.PACKAGE_VERSION, ver);

  if (cmp == '>' && difference > 0)  return true;
  if (cmp == '<' && difference < 0)  return true;
  if (cmp == '=' && difference == 0) return true;

  return false;
}

function fileExists(path) {
  return GLib.file_test(path, GLib.FileTest.EXISTS);
}

function getUserStyles() {
  if (!fileExists(USER_STYLES)) return '';

  let file  = GLib.file_get_contents(USER_STYLES);
  let style = String.fromCharCode.apply(null, file[1]);

  return style.replace(/@import.*unite@hardpixel\.eu.*css['"]\);\n/g, '');
}

function loadUserStyles(styles) {
  let existing = getUserStyles();
  GLib.file_set_contents(USER_STYLES, styles + existing);
}

function getThemeContext() {
  return St.ThemeContext.get_for_stage(global.stage);
}

function getTheme() {
  let context = getThemeContext();
  return context.get_theme();
}

function getGioFile(filePath) {
  let absPath = GLib.build_filenamev([Unite.path, filePath]);

  if (fileExists(absPath))
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

function scaleSize(initialSize) {
  let context = getThemeContext();
  return initialSize * context.scale_factor;
}

function getWindowXID(win) {
  let desc  = win.get_description() || '';
  let match = desc.match(/0x[0-9a-f]+/) || [null];

  return match[0];
}

function isWindow(win) {
  if (!win) return;

  let meta  = Meta.WindowType;
  let types = [meta.NORMAL, meta.DIALOG, meta.MODAL_DIALOG, meta.UTILITY];

  return types.includes(win.window_type);
}

function isMaximized(win, matchState) {
  if (!win) return;

  let flags         = Meta.MaximizeFlags;
  let maximized     = win.get_maximized();
  let primaryScreen = win.is_on_primary_monitor() || !(Settings.getSetting('restrict-to-primary-screen'));
  let tileMaximized = maximized == flags.HORIZONTAL || maximized == flags.VERTICAL;
  let fullMaximized = maximized == flags.BOTH;
  let bothMaximized = fullMaximized || tileMaximized;

  switch (matchState) {
    case 'both':      return primaryScreen && bothMaximized;
    case 'maximized': return primaryScreen && fullMaximized;
    case 'tiled':     return primaryScreen && tileMaximized;
  }
}
