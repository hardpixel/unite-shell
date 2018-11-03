const Lang     = imports.lang;
const Gio      = imports.gi.Gio;
const GLib     = imports.gi.GLib;
const St       = imports.gi.St;
const Unite    = imports.misc.extensionUtils.getCurrentExtension();
const Signals  = Unite.imports.handlers.SignalsHandler;
const Settings = Unite.imports.handlers.SettingsHandler;

var BaseModule = new Lang.Class({
  Name: 'Unite.BaseModule',
  EnableKey: null,
  EnableValue: null,
  DisableValue: null,

  _onInitialize() {},
  _onActivate() {},
  _onDeactivate() {},
  _onReload() {},
  _onDestroy() {},

  _init() {
    this._signals  = new Signals(this);
    this._settings = new Settings(this);

    this._onInitialize();
    this._activate();

    this._settings.connect(this.EnableKey, this._reload);
  },

  _activate() {
    this._enabled = this._settings.get(this.EnableKey);

    let enabled = this._enabled == this.EnableValue;
    if (this.EnableValue != null && !enabled) return;

    let disabled = this._enabled == this.DisableValue;
    if (this.DisableValue != null && disabled) return;

    this._onActivate();
  },

  _deactivate() {
    this._onDeactivate();
    this._signals.disconnectAll();
  },

  _reload() {
    this._deactivate();
    this._activate();
    this._onReload();
  },

  destroy() {
    this._deactivate();
    this._onDestroy();
    this._settings.disconnectAll();
  },

  getThemeContext() {
    return St.ThemeContext.get_for_stage(global.stage);
  },

  getTheme() {
    let context = this.getThemeContext();
    return context.get_theme();
  },

  getGioFile(filePath) {
    let absPath = GLib.build_filenamev([Unite.path, filePath]);

    if (GLib.file_test(absPath, GLib.FileTest.EXISTS))
      return Gio.file_new_for_path(absPath);
  },

  loadStylesheet(filePath) {
    let gioFile = this.getGioFile(filePath);
    if (!gioFile) return;

    let theme = this.getTheme();
    theme.load_stylesheet(gioFile);

    return gioFile;
  },

  unloadStylesheet(gioFile) {
    let theme = this.getTheme();
    theme.unload_stylesheet(gioFile);
  },

  scaleSize(initial_size) {
    let context = this.getThemeContext();
    return initial_size * context.scale_factor;
  }
});
