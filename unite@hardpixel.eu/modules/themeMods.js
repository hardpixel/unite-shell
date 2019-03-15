const Lang  = imports.lang;
const Gtk   = imports.gi.Gtk;
const Main  = imports.ui.main;
const Unite = imports.misc.extensionUtils.getCurrentExtension();
const Base  = Unite.imports.module.BaseModule;

var ThemeMods = new Lang.Class({
  Name: 'Unite.ThemeMods',
  Extends: Base,

  _onInitialize() {
    this.gtkSettings = Gtk.Settings.get_default();
    this._mainStyles = Main.uiGroup.get_style();
  },

  _onActivate() {
    this._signals.connect(this.gtkSettings, 'notify::gtk-font-name', 'setShellFont');

    this._setShellFont();
  },

  _onDeactivate() {
    this._resetStyles();
  },

  _setShellFont() {
    const gtkFont  = this.gtkSettings.gtk_font_name;
    const fontName = gtkFont.replace(/\s\d+$/, '');

    Main.uiGroup.set_style(`font-family: ${fontName};`);
  },

  _resetStyles() {
    Main.uiGroup.set_style(this._mainStyles);
  }
});
