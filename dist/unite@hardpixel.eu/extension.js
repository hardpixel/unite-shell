const Main       = imports.ui.main;
const Meta       = imports.gi.Meta;
const Shell      = imports.gi.Shell;
const GLib       = imports.gi.GLib;
const Gio        = imports.gi.Gio;
const Mainloop   = imports.mainloop;
const St         = imports.gi.St;
const Clutter    = imports.gi.Clutter;
const Util       = imports.misc.util;
const Lang       = imports.lang;
const PanelMenu  = imports.ui.panelMenu;
const DCONF_META = 'org.gnome.desktop.wm.preferences';
const MAXIMIZED  = Meta.MaximizeFlags.BOTH;

let wtracker;
let panel;
let appmenu;
let mtray;
let tray;
let extpath;

function init(extensionMeta) {
  wtracker = Shell.WindowTracker.get_default();
  panel    = Main.panel;
  appmenu  = panel.statusArea.appMenu;
  mtray    = Main.messageTray;
  tray     = Main.legacyTray;
  extpath  = extensionMeta.path;
}

function enable() {
  Main.loadTheme();

  enableShowWindow();
  enableLeftBox();
  enableButtons();
  enableAppMenu();
  enableDecoration();
  enableTopIcons();
}

function disable() {
  disableShowWindow();
  disableLeftBox();
  disableButtons();
  disableAppMenu();
  disableDecoration();
  disableTopIcons();
}
;
let showWindowHandler;

function enableShowWindow() {
  showWindowHandler = global.display.connect('window-demands-attention', function (actor, window) {
    Main.activateWindow(window);
  });
}

function disableShowWindow() {
  global.display.disconnect(showWindowHandler);
}
;
let leftBoxHandler;

function enableLeftBox() {
  leftBoxHandler = panel.actor.connect('allocate', function (actor, box, flags) {
    let allocWidth  = box.x2 - box.x1;
    let allocHeight = box.y2 - box.y1;

    let [leftMinWidth, leftNaturalWidth]     = panel._leftBox.get_preferred_width(-1);
    let [centerMinWidth, centerNaturalWidth] = panel._centerBox.get_preferred_width(-1);
    let [rightMinWidth, rightNaturalWidth]   = panel._rightBox.get_preferred_width(-1);

    let sideWidth = allocWidth - rightNaturalWidth - centerNaturalWidth;
    let childBox  = new Clutter.ActorBox();

    childBox.y1 = 0;
    childBox.y2 = allocHeight;

    if (panel.actor.get_text_direction() == Clutter.TextDirection.RTL) {
      childBox.x1 = allocWidth - Math.min(Math.floor(sideWidth), leftNaturalWidth);
      childBox.x2 = allocWidth;
    } else {
      childBox.x1 = 0;
      childBox.x2 = Math.min(Math.floor(sideWidth), leftNaturalWidth);
    }

    panel._leftBox.allocate(childBox, flags);

    childBox.y1 = 0;
    childBox.y2 = allocHeight;

    if (panel.actor.get_text_direction() == Clutter.TextDirection.RTL) {
      childBox.x1 = rightNaturalWidth;
      childBox.x2 = childBox.x1 + centerNaturalWidth;
    } else {
      childBox.x1 = allocWidth - centerNaturalWidth - rightNaturalWidth;
      childBox.x2 = childBox.x1 + centerNaturalWidth;
    }

    panel._centerBox.allocate(childBox, flags);

    childBox.y1 = 0;
    childBox.y2 = allocHeight;

    if (panel.actor.get_text_direction() == Clutter.TextDirection.RTL) {
      childBox.x1 = 0;
      childBox.x2 = rightNaturalWidth;
    } else {
      childBox.x1 = allocWidth - rightNaturalWidth;
      childBox.x2 = allocWidth;
    }

    panel._rightBox.allocate(childBox, flags);
  });
}

function disableLeftBox() {
  panel.actor.disconnect(leftBoxHandler);
}
;
let buttonsWmHandlers = [];
let buttonsOvHandlers = [];
let buttonsDsHandler  = null;
let buttonsActor      = null;
let buttonsBox        = null;
let focusWindow       = null;
let buttonsPosition   = 'right';
let buttonsCallbacks  = { close: closeWindow, minimize: minimizeWindow, maximize: maximizeWindow };

function enableButtons() {
  createButtons();

  buttonsDsHandler = global.display.connect('notify::focus-window', updateButtons);

  buttonsOvHandlers.push(Main.overview.connect('showing', updateButtons));
  buttonsOvHandlers.push(Main.overview.connect('hidden', updateButtons));

  buttonsWmHandlers.push(global.window_manager.connect('size-changed', updateButtons));
  buttonsWmHandlers.push(global.window_manager.connect('destroy', updateButtons));
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
  buttonsPosition   = null;

  destroyButtons();
}

function createButtons() {
  let layout = new Gio.Settings({ schema_id: DCONF_META }).get_string('button-layout');
  let order  = layout.replace(/ /g, '').split(':');

  if (order.length < 2) {
    return;
  }

  let buttons = collectButtons(order[1].split(','));

  if (!buttons) {
    buttons         = collectButtons(order[0].split(','));
    buttonsPosition = 'left';
  }

  if (buttons) {
    buttonsActor = new St.Bin({ style_class: 'box-bin'});
    buttonsBox   = new St.BoxLayout({ style_class: 'window-buttons-box' });

    buttonsActor.add_actor(buttonsBox);
    buttonsActor.hide();

    buttons.forEach(function (btn) {
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
    if (event.get_button() !== 1) {
      return;
    }

    return callback(actor, event);
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
;
let appmenuWmHandlers = [];
let appmenuDsHandler  = null;
let appmenuMtHandler  = null;
let appmenuBbHandler  = null;
let activeApp         = null;
let activeWindow      = null;

function enableAppMenu() {
  appmenuDsHandler = global.display.connect('notify::focus-window', updateAppMenu);
  appmenuMtHandler = mtray.connect('source-removed', restoreAppMenuTitle);
  appmenuBbHandler = mtray._bannerBin.connect('notify::hover', removeAppMenuTitle);

  appmenuWmHandlers.push(global.window_manager.connect('size-changed', updateAppMenu));
  appmenuWmHandlers.push(global.window_manager.connect('destroy', updateAppMenu));
}

function disableAppMenu() {
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

function restoreAppMenuTitle() {
  Mainloop.idle_add(updateAppMenu);
}
;
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
;
let trayHandlers   = [];
let trayIcons      = [];
let iconsBoxLayout = null;
let iconsContainer = null;

function enableTopIcons() {
  Mainloop.idle_add(moveToPanel);
  tray.actor.hide();
}

function disableTopIcons() {
  Mainloop.idle_add(moveToTray);
  tray.actor.show();
}

function moveToPanel() {
  if (tray._trayIconAddedId) {
    tray._trayManager.disconnect(tray._trayIconAddedId);
  }

  if (tray._trayIconRemovedId) {
    tray._trayManager.disconnect(tray._trayIconRemovedId);
  }

  trayHandlers.push(tray._trayManager.connect('tray-icon-added', addTrayIcon));
  trayHandlers.push(tray._trayManager.connect('tray-icon-removed', removeTrayIcon));

  iconsBoxLayout = new St.BoxLayout({ style_class: 'tray-icons-box' });
  iconsContainer = new PanelMenu.ButtonBox({ visible: false });
  iconsContainer.actor.add_actor(iconsBoxLayout);

  let parent = iconsContainer.actor.get_parent();
  let index  = panel._rightBox.get_n_children() - 1;
  let icons  = tray._iconBox.get_children();

  if (parent) {
    parent.remove_actor(iconsContainer.actor);
  }

  panel._rightBox.insert_child_at_index(iconsContainer.actor, index);

  icons.forEach(function (button) {
    let icon = button.child;

    button.remove_actor(icon);
    button.destroy();

    addTrayIcon(null, icon, '', 0);
  });
}

function moveToTray() {
  trayHandlers.forEach(function (handler) {
    tray._trayManager.disconnect(handler);
  });

  tray._trayIconAddedId   = tray._trayManager.connect('tray-icon-added', Lang.bind(tray, tray._onTrayIconAdded));
  tray._trayIconRemovedId = tray._trayManager.connect('tray-icon-removed', Lang.bind(tray, tray._onTrayIconRemoved));

  trayIcons.forEach(function (icon) {
    let parent = icon.get_parent();

    if (parent) {
      parent.remove_actor(icon);
      parent.destroy();
    }

    tray._onTrayIconAdded(tray, icon);
  });

  if (iconsBoxLayout) {
    iconsBoxLayout.destroy();
    iconsBoxLayout = null;
  }

  if (iconsContainer) {
    iconsContainer.destroy();
    iconsContainer = null;
  }

  trayHandlers   = [];
  trayIcons      = [];
}

function addTrayIcon(o, icon, role, delay=1000) {
  let iconContainer = new St.Button({ child: icon, visible: false });

  icon.connect('destroy', function() {
    icon.clear_effects();
    iconContainer.destroy();
  });

  iconContainer.connect('button-release-event', function (actor, event) {
    icon.click(event);
  });

  Mainloop.timeout_add(delay, Lang.bind(this, function () {
    iconContainer.visible        = true;
    iconsContainer.actor.visible = true;
  }));

  iconsBoxLayout.insert_child_at_index(iconContainer, 0);

  let scale = St.ThemeContext.get_for_stage(global.stage).scale_factor;
  let size  = 18 * scale;

  icon.reactive = true;
  icon.get_parent().set_size(size, size);
  icon.set_size(size, size);

  trayIcons.push(icon);
}

function removeTrayIcon(o, icon) {
  let parent = icon.get_parent();

  if (parent) {
    parent.destroy();
  }

  icon.destroy();
  trayIcons.splice(trayIcons.indexOf(icon), 1);

  if (trayIcons.length === 0) {
    iconsContainer.actor.visible = false;
  }
}
;
