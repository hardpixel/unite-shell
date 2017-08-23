let decorationDsHandler = null;

function enableDecoration() {
  decorationDsHandler = global.display.connect('notify::focus-window', watchXWindows);
}

function disableDecoration() {
  global.display.disconnect(decorationDsHandler);

  decorationDsHandler = null;
  Mainloop.idle_add(restoreXWindows);
}

function getXWindows() {
  let items  = [];
  let result = GLib.spawn_command_line_sync('xprop -root _NET_CLIENT_LIST');

  if (result[0]) {
    items = result[1].toString().match(/0x[0-9a-f]+/g);
  }

  return items;
}

function isXWindowHidden(id) {
  let prop   = '_GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED(CARDINAL) = 1';
  let result = GLib.spawn_command_line_sync('xprop -id ' + id);

  if (result[0] && result[1].toString().indexOf(prop) !== -1) {
    return true;
  }
}

function isXWindowMaximized(id) {
  let prop   = '_NET_WM_STATE_MAXIMIZED_HORZ, _NET_WM_STATE_MAXIMIZED_VERT';
  let result = GLib.spawn_command_line_sync('xprop -id ' + id);

  if (result[0] && result[1].toString().indexOf(prop) !== -1) {
    return true;
  }
}

function toggleXTitlebar(id, hide) {
  let prop  = '_GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED';
  let value = hide ? '0x1' : '0x0';

  Util.spawn(['xprop', '-id', id, '-f', prop, '32c', '-set', prop, value]);
}

function toggleXMaximize(id) {
  let prop    = 'toggle,maximized_vert,maximized_horz'
  let command = ['wmctrl', '-i', '-r', id, '-b', prop];

  Util.spawn(command); Util.spawn(command);
}

function watchXWindows() {
  let items = getXWindows();

  items.forEach(function(id) {
    if (!isXWindowHidden(id)) {
      toggleXTitlebar(id, true);

      if (isXWindowMaximized(id)) {
        toggleXMaximize(id);
      }
    }
  });
}

function restoreXWindows() {
  let items = getXWindows();

  items.forEach(function(id) {
    if (isXWindowHidden(id)) {
      toggleXTitlebar(id, false);
    }
  });
}
