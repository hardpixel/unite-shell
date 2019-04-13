const GObject = imports.gi.GObject;
const Gtk     = imports.gi.Gtk;
const Main    = imports.ui.main;
const Unite   = imports.misc.extensionUtils.getCurrentExtension();
const Base    = Unite.imports.module.BaseModule;

var ThemeMods = new GObject.Class({
  Name: 'Unite.ThemeMods',
  GTypeName: 'UniteThemeMods',
  Extends: Base,

  _onInitialize() {
    this.gtkSettings = Gtk.Settings.get_default();
    this._mainStyles = Main.uiGroup.get_style();
  },

  _onActivate() {
    this._signals.connect(this.gtkSettings, 'notify::gtk-font-name', 'updateShellFont');
    this._settings.connect('use-system-fonts', 'updateShellFont');

    this._setShellFont();
  },

  _onDeactivate() {
    this._resetStyles();
  },

  _setShellFont() {
    const enabled = this._settings.get('use-system-fonts');
    if (!enabled) return;

    const gtkFont = this.gtkSettings.gtk_font_name;
    const cssFont = gtkFont.replace(/\s\d+$/, '');

    Main.uiGroup.set_style(`font-family: ${cssFont};`);
  },

  _updateShellFont() {
    this._resetStyles();
    this._setShellFont();
  },

  _resetStyles() {
    Main.uiGroup.set_style(this._mainStyles);
  }
});
