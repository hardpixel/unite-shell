let buttonsWmHandlers = [];
let buttonsOvHandlers = [];
let buttonsWtHandler  = null;
let buttonsGsHandler  = null;
let buttonsActor      = null;
let buttonsBox        = null;
let focusWindow       = null;
let buttonsCallbacks  = { close: closeWindow, minimize: minimizeWindow, maximize: maximizeWindow };

function enableButtons() {
  createButtons();

  buttonsWtHandler = wtracker.connect('notify::focus-app', updateButtons);
  buttonsGsHandler = global.screen.connect('restacked', updateAppMenu);

  buttonsOvHandlers.push(Main.overview.connect('showing', updateButtons));
  buttonsOvHandlers.push(Main.overview.connect('hidden', updateButtons));

  buttonsWmHandlers.push(global.window_manager.connect('size-changed', updateButtons));
  buttonsWmHandlers.push(global.window_manager.connect('destroy', updateButtons));
}

function disableButtons() {
  wtracker.disconnect(buttonsWtHandler);
  global.screen.disconnect(buttonsGsHandler);

  buttonsOvHandlers.forEach(function (handler) {
    Main.overview.disconnect(handler);
  });

  buttonsWmHandlers.forEach(function (handler) {
    global.window_manager.disconnect(handler);
  });

  buttonsWmHandlers = [];
  buttonsOvHandlers = [];
  buttonsWtHandler  = null;
  buttonsGsHandler  = null;

  destroyButtons();
}

function createButtons() {
  let layout   = new Gio.Settings({ schema_id: DCONF_META }).get_string('button-layout');
  let order    = layout.replace(/ /g, '').split(':');
  let buttons  = collectButtons(order[1].split(','));
  let position = 'right';

  if (!buttons) {
    buttons  = collectButtons(order[0].split(','));
    position = 'left';
  }

  if (buttons) {
    buttonsActor = new St.Bin({ style_class: 'box-bin'});
    buttonsBox   = new St.BoxLayout({ style_class: 'button-box' });

    buttonsActor.add_actor(buttonsBox);

    buttons.forEach(function (btn) {
      let callback = buttonsCallbacks[btn];
      let button   = new St.Button({ style_class: btn  + ' window-button', track_hover: true });

      button.connect('button-release-event', buttonsClick(callback));
      buttonsBox.add(button);
    });

    if (position == 'left') {
      panel._leftBox.insert_child_at_index(buttonsActor, 1);
    }

    if (position == 'right') {
      let index = panel._rightBox.get_children().length + 1;
      panel._rightBox.insert_child_at_index(buttonsActor, index);
    }
  }
}

function destroyButtons() {
  if (buttonsActor) {
    buttonsBox.destroy();
    buttonsActor.destroy();

    buttonsActor = null;
    buttonsBox   = null;
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
    if (event.get_button() !== 1) {
      return;
    }

    return callback(actor, event);
  }
}

function minimizeWindow() {
  focusWindow = global.display.focus_window;

  if (focusWindow && !focusWindow.minimized) {
    focusWindow.minimize();
  }
}

function maximizeWindow() {
  focusWindow = global.display.focus_window;

  if (focusWindow) {
    if (focusWindow.get_maximized() === MAXIMIZED) {
      focusWindow.unmaximize(MAXIMIZED);
    } else {
      focusWindow.maximize(MAXIMIZED);
    }

    focusWindow.activate(global.get_current_time());
  }
}

function closeWindow() {
  focusWindow = global.display.focus_window;

  if (focusWindow) {
    focusWindow.delete(global.get_current_time());
  }
}

function updateButtons() {
  let window = global.display.focus_window;

  if (window.get_window_type() !== TOPLEVEL) {
    return;
  }

  let visible = false;
  focusWindow = global.display.focus_window;

  if (!Main.overview.visible && focusWindow) {
    visible = focusWindow.decorated && focusWindow.get_maximized() === MAXIMIZED;
  }

  Mainloop.idle_add(function () {
    if (visible) {
      buttonsActor.show();
    } else {
      buttonsActor.hide();
    }
  });
}
