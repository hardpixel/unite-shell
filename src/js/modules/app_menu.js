let appmenuWmHandlers = [];
let appmenuWtHandler  = null;
let appmenuAwHandler  = null;
let appmenuAaHandler  = null;
let activeApp         = null;
let activeWindow      = null;

function enableAppMenu() {
  appmenuWtHandler = wtracker.connect('notify::focus-app', updateAppMenu);

  appmenuWmHandlers.push(global.window_manager.connect('size-changed', updateAppMenu));
  appmenuWmHandlers.push(global.window_manager.connect('destroy', updateAppMenu));
}

function disableAppMenu() {
  wtracker.disconnect(appmenuWtHandler);

  appmenuWmHandlers.forEach(function (handler) {
    global.window_manager.disconnect(handler);
  });

  if (activeWindow) {
    activeWindow.disconnect(appmenuAwHandler);
  }

  appmenuWmHandlers = [];
  appmenuWtHandler  = null;
  appmenuAwHandler  = null;
  appmenuAaHandler  = null;
  activeApp         = null;
  activeWindow      = null;
}

function updateAppMenu() {
  activeApp    = wtracker.focus_app;
  activeWindow = global.display.focus_window;

  if (appmenuAaHandler) {
    activeApp.disconnect(appmenuAaHandler);
  }

  if (appmenuAwHandler) {
    activeWindow.disconnect(appmenuAwHandler);
  }

  if (activeWindow) {
    appmenuAaHandler = activeApp.connect('windows-changed', updateAppMenu);
    appmenuAwHandler = activeWindow.connect('notify::title', updateAppMenu);

    let title = activeWindow.title;

    if (activeWindow.get_maximized() !== MAXIMIZED) {
      title = activeApp.get_name();
    }

    appmenu._label.set_text(title);
  }
}
