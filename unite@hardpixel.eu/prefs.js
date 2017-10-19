const GLib           = imports.gi.GLib;
const GObject        = imports.gi.GObject;
const Gio            = imports.gi.Gio;
const Gtk            = imports.gi.Gtk;
const Gettext        = imports.gettext.domain('gnome-shell-extensions');
const _              = Gettext.gettext;
const ExtensionUtils = imports.misc.extensionUtils;
const Unite          = ExtensionUtils.getCurrentExtension();
const Convenience    = Unite.imports.convenience;

var PrefsWidget = new GObject.Class({
  Name: 'Unite.PrefsWidget',
  GTypeName: 'PrefsWidget',
  Extends: Gtk.Box,

  _init: function(params) {
    this.parent(params);

    this._buildable = new Gtk.Builder();
    this._buildable.add_from_file(Unite.path + '/settings.ui');

    let prefsWidget = this._get_widget('prefs_widget');
    this.add(prefsWidget);

    this._settings = Convenience.getSettings();
  },

  _get_widget: function(name) {
    return this._buildable.get_object(name);
  }
});

function init() {
  Convenience.initTranslations();
}

function buildPrefsWidget() {
  let widget = new PrefsWidget();
  widget.show_all();

  return widget;
}
