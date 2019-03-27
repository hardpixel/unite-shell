imports.gi.versions.Gdk    = '3.0';
imports.gi.versions.GdkX11 = '3.0';

const Gdk    = imports.gi.Gdk;
const GdkX11 = imports.gi.GdkX11;

function toggleDecorations(winId, hide, useMotifHints) {
  let display = Gdk.Display.get_default();
  let xWindow = GdkX11.X11Window.foreign_new_for_display(display, winId);
  if (!xWindow) return;

  if (useMotifHints == 'true') {
    let hideFlag  = Gdk.WMDecoration.BORDER;
    let showFlag  = Gdk.WMDecoration.ALL;
    let [_, flag] = xWindow.get_decorations();

    if (hide == 'true' && flag != hideFlag)
      xWindow.set_decorations(hideFlag);

    if (hide == 'false' && flag != showFlag)
      xWindow.set_decorations(showFlag);
  } else {
    xWindow.set_hide_titlebar_when_maximized(hide);
  }

  Gdk.flush();
}

toggleDecorations(ARGV);
