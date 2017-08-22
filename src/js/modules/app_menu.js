let appmenuWmHandlers = [];
let appmenuWtHandler  = null;
let appmenuGsHandler  = null;
let activeApp         = null;
let activeWindow      = null;

function enableAppMenu() {
  appmenuWtHandler = wtracker.connect('notify::focus-app', updateAppMenu);
  appmenuGsHandler = global.screen.connect('restacked', updateAppMenu);

  appmenuWmHandlers.push(global.window_manager.connect('size-changed', updateAppMenu));
  appmenuWmHandlers.push(global.window_manager.connect('destroy', updateAppMenu));
}

function disableAppMenu() {
  wtracker.disconnect(appmenuWtHandler);

  appmenuWmHandlers.forEach(function (handler) {
    global.window_manager.disconnect(handler);
  });

  appmenuWmHandlers = [];
  appmenuWtHandler  = null;
  appmenuGsHandler  = null;
  activeApp         = null;
  activeWindow      = null;
}

function updateAppMenu() {
  activeApp    = wtracker.focus_app;
  activeWindow = global.display.focus_window;

  if (activeWindow) {
    activeWindow.connect('notify::title', updateAppMenuTitle);
    updateAppMenuTitle();
  }
}

function updateAppMenuTitle() {
  Mainloop.idle_add(function () {
    let title = activeWindow.title;

    if (activeWindow.get_maximized() !== MAXIMIZED) {
      title = activeApp.get_name();
    }

    appmenu._label.set_text(title);
  });
}
