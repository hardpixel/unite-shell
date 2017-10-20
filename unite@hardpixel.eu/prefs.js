const Lang           = imports.lang;
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

    let prefsWidget = this._getWidget('prefs_widget');
    this.add(prefsWidget);

    this._settings = Convenience.getSettings();
    this._bindBooleans();
    this._bindEnumerations();
  },

  _getWidget: function(name) {
    let wname = name.replace(/-/g, '_');
    return this._buildable.get_object(wname);
  },

  _getBooleans: function () {
    items = [
      'hide-activities-button',
      'extend-left-box',
      'show-legacy-tray',
      'autofocus-windows',
      'show-window-title',
      'show-window-buttons'
    ];

    return items;
  },

  _bindBoolean: function (setting) {
    let widget = this._getWidget(setting);
    this._settings.bind(setting, widget, 'active', Gio.SettingsBindFlags.DEFAULT);
  },

  _bindBooleans: function () {
    this._getBooleans().forEach(Lang.bind(this, this._bindBoolean));
  },

  _getEnumerations: function () {
    items = [
      'window-buttons-theme',
      'hide-window-titlebars',
      'notifications-position'
    ];

    return items;
  },

  _bindEnumeration: function (setting) {
    let widget = this._getWidget(setting);
    widget.set_active(this._settings.get_enum(setting));

    widget.connect('changed', Lang.bind (this, function(combobox) {
      this._settings.set_enum(setting, combobox.get_active());
    }));
  },

  _bindEnumerations: function () {
    this._getEnumerations().forEach(Lang.bind(this, this._bindEnumeration));
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
