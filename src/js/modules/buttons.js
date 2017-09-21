let buttonsWmHandlers = [];
let buttonsOvHandlers = [];
let buttonsDsHandler  = null;
let buttonsSizeChange = null;
let buttonsActor      = null;
let buttonsBox        = null;
let focusWindow       = null;
let buttonsItems      = null;
let buttonsPosition   = null;
let buttonsCallbacks  = { close: closeWindow, minimize: minimizeWindow, maximize: maximizeWindow };

function enableButtons() {
  detectButtons();

  Mainloop.idle_add(createButtons);

  buttonsSizeChange = versionCompare(Config.PACKAGE_VERSION, '3.24') < 0;
  buttonsDsHandler  = global.display.connect('notify::focus-window', updateButtons);

  buttonsOvHandlers.push(Main.overview.connect('showing', updateButtons));
  buttonsOvHandlers.push(Main.overview.connect('hidden', updateButtons));

  buttonsWmHandlers.push(global.window_manager.connect('destroy', updateButtons));

  if (buttonsSizeChange) {
    buttonsWmHandlers.push(global.window_manager.connect('size-change', updateButtons));
  } else {
    buttonsWmHandlers.push(global.window_manager.connect('size-changed', updateButtons));
  }
}

function disableButtons() {
  global.display.disconnect(buttonsDsHandler);

  buttonsOvHandlers.forEach(function (handler) {
    Main.overview.disconnect(handler);
  });

  buttonsWmHandlers.forEach(function (handler) {
    global.window_manager.disconnect(handler);
  });

  buttonsWmHandlers = [];
  buttonsOvHandlers = [];
  buttonsDsHandler  = null;
  buttonsItems      = null;
  buttonsPosition   = null;
  buttonsSizeChange = null;

  Mainloop.idle_add(destroyButtons);
}

function detectButtons() {
  let layout = new Gio.Settings({ schema_id: DCONF_META }).get_string('button-layout');
  let order  = layout.replace(/ /g, '').split(':');

  if (order.length < 2) {
    return;
  }

  buttonsItems    = collectButtons(order[1].split(','));
  buttonsPosition = 'right';

  if (!buttonsItems) {
    buttonsItems    = collectButtons(order[0].split(','));
    buttonsPosition = 'left';
  }
}

function createButtons() {
  if (buttonsItems) {
    buttonsActor = new St.Bin({ style_class: 'box-bin'});
    buttonsBox   = new St.BoxLayout({ style_class: 'window-buttons-box' });

    buttonsActor.add_actor(buttonsBox);
    buttonsActor.hide();

    buttonsItems.forEach(function (btn) {
      let callback = buttonsCallbacks[btn];
      let button   = new St.Button({ style_class: btn  + ' window-button', track_hover: true });

      button.connect('button-release-event', buttonsClick(callback));
      buttonsBox.add(button);
    });

    if (buttonsPosition == 'left') {
      panel._leftBox.insert_child_at_index(buttonsActor, 1);
    }

    if (buttonsPosition == 'right') {
      let index = panel._rightBox.get_n_children() + 1;
      panel._rightBox.insert_child_at_index(buttonsActor, index);
    }
  }
}

function destroyButtons() {
  if (buttonsActor) {
    buttonsActor.destroy();
    buttonsActor = null;
  }

  if (buttonsBox) {
    buttonsBox.destroy();
    buttonsBox = null;
  }
}

function collectButtons(items) {
  let buttons = [];

  items.forEach(function (item) {
    if (buttonsCallbacks[item]) {
      buttons.push(item);
    }
  });

  if (buttons.length == 0) {
    buttons = null;
  }

  return buttons;
}

function buttonsClick(callback) {
  return function(actor, event) {
    if (event.get_button() === 1) {
      callback(actor, event);
    }
  }
}

function minimizeWindow() {
  if (focusWindow && !focusWindow.minimized) {
    focusWindow.minimize();
  }
}

function maximizeWindow() {
  if (focusWindow) {
    if (focusWindow.get_maximized()) {
      focusWindow.unmaximize(MAXIMIZED);
    } else {
      focusWindow.maximize(MAXIMIZED);
    }

    focusWindow.activate(global.get_current_time());
  }
}

function closeWindow() {
  if (focusWindow) {
    focusWindow.delete(global.get_current_time());
  }
}

function updateButtons() {
  let visible = false;
  focusWindow = global.display.focus_window;

  if (!Main.overview.visible && focusWindow) {
    visible = focusWindow.get_maximized();
  }

  updateButtonsVisibility(visible);
}

function updateButtonsVisibility(visible) {
  Mainloop.idle_add(function () {
    if (visible) {
      buttonsActor.show();
    } else {
      buttonsActor.hide();
    }
  });
}
