const GLib           = imports.gi.GLib;
const GObject        = imports.gi.GObject;
const Gio            = imports.gi.Gio;
const Gtk            = imports.gi.Gtk;
const Gettext        = imports.gettext.domain('gnome-shell-extensions');
const _              = Gettext.gettext;
const ExtensionUtils = imports.misc.extensionUtils;
const Unite          = ExtensionUtils.getCurrentExtension();
const Convenience    = Unite.imports.convenience;

function init() {
  Convenience.initTranslations('unite');
}

function buildPrefsWidget() {
  let buildable = new Gtk.Builder();
  buildable.add_from_file(Unite.path + '/settings.ui');

  let box = buildable.get_object('prefs_widget');
  box.show_all();

  return box;
}
