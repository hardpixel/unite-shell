imports.gi.versions.Gdk    = '3.0';
imports.gi.versions.GdkX11 = '3.0';
imports.gi.versions.Gtk    = '3.0';

const GLib   = imports.gi.GLib;
const Gdk    = imports.gi.Gdk;
const GdkX11 = imports.gi.GdkX11;
const Gtk    = imports.gi.Gtk;

GLib.environ_setenv(null, 'GDK_BACKEND', 'x11', true);
Gtk.init(null);

function toggleDecorations(winId, hide, motif) {
  let display = Gdk.Display.get_default();
  let xWindow = GdkX11.X11Window.foreign_new_for_display(display, winId);
  if (!xWindow) return;

  if (motif == 'true') {
    let hideFlag  = Gdk.WMDecoration.BORDER;
    let showFlag  = Gdk.WMDecoration.ALL;
    let [_, flag] = xWindow.get_decorations();

    if (hide == 'true' && flag != hideFlag) {
      xWindow.set_decorations(hideFlag);
      Gdk.flush();
    }

    if (hide == 'false' && flag != showFlag) {
      xWindow.set_decorations(showFlag);
      Gdk.flush();
    }
  } else {
    xWindow.set_hide_titlebar_when_maximized(hide);
    Gdk.flush();
  }
}

const [winId, hide, motif] = ARGV;
toggleDecorations(winId, hide, motif);
