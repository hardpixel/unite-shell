let decorationDsHandler = null;
let decorationWindow    = null;
let decorationStyleFile = null;
let decorationPosition  = null;
let decorationMaxUnmax  = null;

function enableDecoration() {
  decorationPosition  = buttonsPosition;
  decorationDsHandler = global.display.connect('notify::focus-window', updateDecoration);
  decorationMaxUnmax  = versionCompare(Config.PACKAGE_VERSION, '3.24') < 0;

  Mainloop.idle_add(addDecorationStyles);
  Mainloop.idle_add(applyDecoration);
}

function disableDecoration() {
  global.display.disconnect(decorationDsHandler);

  Mainloop.idle_add(removeDecorationStyles);
  Mainloop.idle_add(restoreDecoration);

  decorationDsHandler = null;
  decorationWindow    = null;
  decorationMaxUnmax  = null;
  decorationPosition  = null;
}

function toggleWindowDecoration(id, hide) {
  let prop  = '_GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED';
  let value = hide ? '0x1' : '0x0';

  Util.spawn(['xprop', '-id', id, '-f', prop, '32c', '-set', prop, value]);
}

function toggleWindowMaximize(win) {
  if (decorationMaxUnmax && win.get_maximized() === MAXIMIZED) {
    win.unmaximize(MAXIMIZED);
    win.maximize(MAXIMIZED);
  }
}

function updateDecoration() {
  decorationWindow = global.display.focus_window;
  hideDecoration(decorationWindow);
}

function applyDecoration() {
  let windows = getAllWindows();

  windows.forEach(function(win) {
    hideDecoration(win);
  });
}

function restoreDecoration() {
  let windows = getAllWindows();

  windows.forEach(function(win) {
    showDecoration(win);
  });
}

function showDecoration(win) {
  if (win._decorationOFF && win._windowXID) {
    toggleWindowDecoration(win._windowXID, false);
    toggleWindowMaximize(win);

    win._windowXID     = null;
    win._decorationOFF = false;
  }
}

function hideDecoration(win) {
  if (win && win.decorated) {
    if (!win._decorationOFF && !win._windowXID) {
      win._windowXID     = getXWindow(win);
      win._decorationOFF = true;

      toggleWindowDecoration(win._windowXID, true);
      toggleWindowMaximize(win);
    }
  }
}

function addDecorationStyles() {
  decorationStyleFile = GLib.get_user_config_dir() + '/gtk-3.0/gtk.css';

  if (decorationPosition) {
    let styleContent  = decorationStyleContent();
    let styleFilePath = extpath + '/buttons-' + decorationPosition + '.css';
    let styleImport   = "@import url('" + styleFilePath + "');\n"

    GLib.file_set_contents(decorationStyleFile, styleImport + styleContent);
  }
}

function removeDecorationStyles() {
  let styleContent = decorationStyleContent();
  GLib.file_set_contents(decorationStyleFile, styleContent);

  decorationStyleFile = null;
}

function decorationStyleContent() {
  let styleContent = '';

  if (GLib.file_test(decorationStyleFile, GLib.FileTest.EXISTS)) {
    let fileContent = GLib.file_get_contents(decorationStyleFile);

    if (fileContent[0] == true) {
      styleContent = fileContent[1].toString().replace(/@import.*unite@hardpixel\.eu.*css['"]\);\n/g, '');
    }
  }

  return styleContent;
}
