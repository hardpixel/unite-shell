let appmenuWmHandlers = [];
let appmenuDsHandler  = null;
let activeApp         = null;
let activeWindow      = null;

function enableAppMenu() {
  appmenuDsHandler = global.display.connect('notify::focus-window', updateAppMenu);

  appmenuWmHandlers.push(global.window_manager.connect('size-changed', updateAppMenu));
  appmenuWmHandlers.push(global.window_manager.connect('destroy', updateAppMenu));
}

function disableAppMenu() {
  global.display.disconnect(appmenuDsHandler);

  appmenuWmHandlers.forEach(function (handler) {
    global.window_manager.disconnect(handler);
  });

  appmenuWmHandlers = [];
  appmenuDsHandler  = null;
  activeApp         = null;
  activeWindow      = null;
}

function updateAppMenu() {
  activeApp    = wtracker.focus_app;
  activeWindow = global.display.focus_window;

  if (activeWindow && activeWindow.get_window_type() !== TOPLEVEL) {
    return;
  }

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
