let appmenuWmHandlers = [];
let appmenuDsHandler  = null;
let appmenuMtHandler  = null;
let activeApp         = null;
let activeWindow      = null;

function enableAppMenu() {
  appmenuDsHandler = global.display.connect('notify::focus-window', updateAppMenu);
  appmenuMtHandler = mtray._bannerBin.connect('notify::hover', removeAppMenuTitle);

  appmenuWmHandlers.push(global.window_manager.connect('size-changed', updateAppMenu));
  appmenuWmHandlers.push(global.window_manager.connect('destroy', updateAppMenu));
}

function disableAppMenu() {
  global.display.disconnect(appmenuDsHandler);
  mtray._bannerBin.disconnect(appmenuMtHandler);

  appmenuWmHandlers.forEach(function (handler) {
    global.window_manager.disconnect(handler);
  });

  appmenuWmHandlers = [];
  appmenuDsHandler  = null;
  appmenuMtHandler  = null;
  activeApp         = null;
  activeWindow      = null;
}

function updateAppMenu() {
  activeApp    = wtracker.focus_app;
  activeWindow = global.display.focus_window;

  if (activeWindow) {
    activeWindow.connect('notify::title', updateAppMenuTitle);
  }

  updateAppMenuTitle();
}

function updateAppMenuTitle() {
  Mainloop.idle_add(function () {
    if (activeWindow) {
      let title = null;

      if (activeWindow.get_maximized()) {
        title = activeWindow.title;
      } else {
        title = activeApp.get_name();
      }

      appmenu._label.set_text(title);
    }
  });
}

function removeAppMenuTitle() {
  Mainloop.idle_add(function () {
    appmenu._label.set_text('');
  });
}
