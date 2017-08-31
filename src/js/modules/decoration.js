let decorationDsHandler = null;
let decorationWindow    = null;
let decorationStyleFile = null;

function enableDecoration() {
  decorationStyleFile = GLib.get_user_config_dir() + '/gtk-3.0/gtk.css';
  decorationDsHandler = global.display.connect('notify::focus-window', updateDecoration);

  addDecorationStyles();
}

function disableDecoration() {
  removeDecorationStyles();

  global.display.disconnect(decorationDsHandler);
  Mainloop.idle_add(restoreDecoration);

  decorationDsHandler = null;
  decorationWindow    = null;
  decorationStyleFile = null;
}

function getXWindow(win) {
  let id = null;

  try {
    id = win.get_description().match(/0x[0-9a-f]+/)[0];
  } catch (err) {
    id = null;
  }

  return id;
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

function addDecorationStyles() {
  let styleContent  = decorationStyleContent();
  let styleFilePath = extpath + '/buttons-' + buttonsPosition + '.css';
  let styleImport   = "@import url('" + styleFilePath + "');\n"

  GLib.file_set_contents(decorationStyleFile, styleImport + styleContent);
}

function removeDecorationStyles() {
  let styleContent = decorationStyleContent();
  GLib.file_set_contents(decorationStyleFile, styleContent);
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
