let decorationDsHandler = null;
let decorationWindow    = null;

function enableDecoration() {
  decorationDsHandler = global.display.connect('notify::focus-window', updateDecoration);
}

function disableDecoration() {
  global.display.disconnect(decorationDsHandler);
  Mainloop.idle_add(restoreDecoration);

  decorationDsHandler = null;
  decorationWindow    = null;
}

function getXWindow(win) {
  let id = null;

  try {
    id = win.get_description().match(/0x[0-9a-f]+/);
    if (id) return id[0];
  } catch (err) {
    id = null;
  }

  let act = win.get_compositor_private();

  if (act) {
    id = GLib.spawn_command_line_sync('xwininfo -children -id 0x%x'.format(act['x-window']));

    if (id[0]) {
      let str    = id[1].toString();
      let regexp = new RegExp('(0x[0-9a-f]+) +"%s"'.format(win.title));

      id = str.match(regexp);
      if (id) return id[1];

      id = str.split(/child(?:ren)?:/)[1].match(/0x[0-9a-f]+/);
      if (id) return id[0];
    }
  }

  return null;
}

function toggleXTitlebar(id, hide) {
  let prop  = '_GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED';
  let value = hide ? '0x1' : '0x0';

  Util.spawn(['xprop', '-id', id, '-f', prop, '32c', '-set', prop, value]);
}

function toggleXMaximize(win) {
  if (win.get_maximized() === MAXIMIZED) {
    win.unmaximize(MAXIMIZED);
    win.maximize(MAXIMIZED);
  }
}

function updateDecoration() {
  decorationWindow = global.display.focus_window;

  if (decorationWindow && decorationWindow.decorated) {
    if (!decorationWindow._decorationOFF && !decorationWindow._windowXID) {
      decorationWindow._windowXID     = getXWindow(decorationWindow);
      decorationWindow._decorationOFF = true;

      toggleXTitlebar(decorationWindow._windowXID, true);
      toggleXMaximize(decorationWindow);
    }
  }
}

function restoreDecoration() {
  let items = global.screen.get_active_workspace().list_windows().filter(function (w) {
    return w._decorationOFF && w._windowXID;
  });

  items.forEach(function(win) {
    toggleXTitlebar(win._windowXID, true);
    toggleXMaximize(win);
  });
}
