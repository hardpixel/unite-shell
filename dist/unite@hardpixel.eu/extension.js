const Main       = imports.ui.main;
const Meta       = imports.gi.Meta;
const Shell      = imports.gi.Shell;
const GLib       = imports.gi.GLib;
const Gio        = imports.gi.Gio;
const Mainloop   = imports.mainloop;
const St         = imports.gi.St;
const System     = imports.system;
const Clutter    = imports.gi.Clutter;
const Config     = imports.misc.config;
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
  enableShowWindow();
  enableLeftBox();
  enableTopIcons();
  enableButtons();
  enableAppMenu();
  enableDecoration();

  Main.loadTheme();
}

function disable() {
  disableShowWindow();
  disableLeftBox();
  disableTopIcons();
  disableButtons();
  disableAppMenu();
  disableDecoration();

  Main.loadTheme();
}
;
function getXWindow(win) {
  let id = null;

  try {
    id = win.get_description().match(/0x[0-9a-f]+/)[0];
  } catch (err) {
    id = null;
  }

  return id;
}

function getAllWindows() {
  let items = global.get_window_actors().map(function (w) { return w.meta_window; })
  return items.filter(function(w) { return w.window_type !== Meta.WindowType.DESKTOP; });
}

function versionCompare(v1, v2) {
  let v1parts   = ('' + v1).split('.')
  let v2parts   = ('' + v2).split('.')
  let minLength = Math.min(v1parts.length, v2parts.length)

  let i, p1, p2;

  for (i = 0; i < minLength; i++) {
    p1 = parseInt(v1parts[i], 10);
    p2 = parseInt(v2parts[i], 10);

    if (isNaN(p1)) {
      p1 = v1parts[i];
    }

    if (isNaN(p2)) {
      p2 = v2parts[i];
    }

    if (p1 === p2) {
      continue;
    } else if (p1 > p2) {
      return 1;
    } else if (p1 < p2) {
      return -1;
    }

    return NaN;
  }

  if (v1parts.length === v2parts.length) {
    return 0;
  }

  return (v1parts.length < v2parts.length) ? -1 : 1;
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

  Mainloop.idle_add(updateButtons);
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
;
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
;
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
;
let trayHandlers   = [];
let trayIcons      = [];
let iconsBoxLayout = null;
let iconsContainer = null;

function enableTopIcons() {
  if (Main.legacyTray) {
    Mainloop.idle_add(moveToPanel);
    tray.actor.hide();
  } else {
    Mainloop.idle_add(createTray);
  }
}

function disableTopIcons() {
  if (Main.legacyTray) {
    Mainloop.idle_add(moveToTray);
    tray.actor.show();
  } else {
    Mainloop.idle_add(destroyTray);
  }

  trayHandlers = [];
  trayIcons    = [];
}

function createTray() {
  createIconsContainer();

  tray = new Shell.TrayManager();
  tray.connect('tray-icon-added', addTrayIcon);
  tray.connect('tray-icon-removed', removeTrayIcon);
  tray.manage_screen(global.screen, Main.panel.actor);
}

function destroyTray() {
  tray = null;
  System.gc();

  destroyIconsContainer();
}

function createIconsContainer() {
  iconsBoxLayout = new St.BoxLayout({ style_class: 'tray-icons-box' });
  iconsContainer = new PanelMenu.ButtonBox({ visible: false });
  iconsContainer.actor.add_actor(iconsBoxLayout);

  let parent = iconsContainer.actor.get_parent();
  let index  = panel._rightBox.get_n_children() - 1;

  if (parent) {
    parent.remove_actor(iconsContainer.actor);
  }

  panel._rightBox.insert_child_at_index(iconsContainer.actor, index);
}

function destroyIconsContainer() {
  if (iconsBoxLayout) {
    iconsBoxLayout.destroy();
    iconsBoxLayout = null;
  }

  if (iconsContainer) {
    iconsContainer.actor.destroy();
    iconsContainer = null;
  }
}

function moveToPanel() {
  createIconsContainer();

  if (tray._trayIconAddedId) {
    tray._trayManager.disconnect(tray._trayIconAddedId);
  }

  if (tray._trayIconRemovedId) {
    tray._trayManager.disconnect(tray._trayIconRemovedId);
  }

  trayHandlers.push(tray._trayManager.connect('tray-icon-added', addTrayIcon));
  trayHandlers.push(tray._trayManager.connect('tray-icon-removed', removeTrayIcon));

  let icons = tray._iconBox.get_children();

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

  destroyIconsContainer();
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
