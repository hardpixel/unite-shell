let appmenuWmHandlers = [];
let appmenuDsHandler  = null;
let appmenuMtHandler  = null;
let appmenuBbHandler  = null;
let appmenuSizeChange = null;
let activeApp         = null;
let activeWindow      = null;

function enableAppMenu() {
  appmenuSizeChange = versionCompare(Config.PACKAGE_VERSION, '3.24') < 0;
  appmenuDsHandler  = global.display.connect('notify::focus-window', updateAppMenu);
  appmenuMtHandler  = mtray.connect('source-removed', restoreAppMenuTitle);
  appmenuBbHandler  = mtray._bannerBin.connect('notify::hover', removeAppMenuTitle);

  appmenuWmHandlers.push(global.window_manager.connect('destroy', updateAppMenu));

  if (appmenuSizeChange) {
    appmenuWmHandlers.push(global.window_manager.connect('size-change', updateAppMenu));
  } else {
    appmenuWmHandlers.push(global.window_manager.connect('size-changed', updateAppMenu));
  }

  Mainloop.idle_add(updateAppMenu);
}

function disableAppMenu() {
  let windows = getAllWindows();

  windows.forEach(function(win) {
    if (win._updateTitleID) {
      win.disconnect(win._updateTitleID);
      win._updateTitleID = null;
    }
  });

  global.display.disconnect(appmenuDsHandler);
  mtray.disconnect(appmenuMtHandler);
  mtray._bannerBin.disconnect(appmenuBbHandler);

  appmenuWmHandlers.forEach(function (handler) {
    global.window_manager.disconnect(handler);
  });

  appmenuWmHandlers = [];
  appmenuDsHandler  = null;
  appmenuMtHandler  = null;
  appmenuBbHandler  = null;
  appmenuSizeChange = null;
  activeApp         = null;
  activeWindow      = null;
}

function updateAppMenu() {
  activeApp    = wtracker.focus_app;
  activeWindow = global.display.focus_window;

  if (activeWindow && !activeWindow._updateTitleID) {
    activeWindow._updateTitleID = activeWindow.connect('notify::title', updateAppMenuTitle);
  }

  updateAppMenuTitle();
}

function updateAppMenuTitle() {
  Mainloop.idle_add(function () {
    let title = null;

    if (activeWindow && activeWindow.get_maximized()) {
      title = activeWindow.title;
    }

    if (activeApp && !title) {
      title = activeApp.get_name();
    }

    if (title) {
      appmenu._label.set_text(title);
    }
  });
}

function removeAppMenuTitle() {
  Mainloop.idle_add(function () {
    appmenu._label.set_text('');
  });
}

function restoreAppMenuTitle() {
  Mainloop.idle_add(updateAppMenu);
}
