const Main       = imports.ui.main;
const Meta       = imports.gi.Meta;
const Shell      = imports.gi.Shell;
const Gtk        = imports.gi.Gtk;
const Gio        = imports.gi.Gio;
const GLib       = imports.gi.GLib;
const Mainloop   = imports.mainloop;
const St         = imports.gi.St;
const Clutter    = imports.gi.Clutter;
const Util       = imports.misc.util;
const Lang       = imports.lang;
const PanelMenu  = imports.ui.panelMenu;
const DCONF_META = 'org.gnome.desktop.wm.preferences';
const MAXIMIZED  = Meta.MaximizeFlags.BOTH;
const TOPLEVEL   = Gtk.WindowType.TOPLEVEL;

let wtracker;
let panel;
let appmenu;

function init(extensionMeta) {
  wtracker = Shell.WindowTracker.get_default();
  panel    = Main.panel;
  appmenu  = panel.statusArea.appMenu;
}

function enable() {
  Main.loadTheme();

  enableShowWindow();
  enableLeftBox();
  enableButtons();
  enableAppMenu();
  enableTopIcons();
  enableDecoration();
}

function disable() {
  disableShowWindow();
  disableLeftBox();
  disableButtons();
  disableAppMenu();
  disableTopIcons();
  disableDecoration();
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
    buttonsActor.hide();

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
  let visible = false;
  focusWindow = global.display.focus_window;

  if (focusWindow && focusWindow.get_window_type() !== TOPLEVEL) {
    return;
  }

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
;
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
;
let tray           = null;
let trayAddedId    = 0;
let trayRemovedId  = 0;
let icons          = [];
let iconsBoxLayout = null;
let iconsContainer = null;

function enableTopIcons() {
  GLib.idle_add(GLib.PRIORITY_LOW, moveToTop);
  tray = Main.legacyTray;
  Main.legacyTray.actor.hide();
}

function disableTopIcons() {
  moveToTray();
  Main.legacyTray.actor.show();
}

function onTrayIconAdded(o, icon, role, delay=1000) {
  let iconContainer = new St.Button({ child: icon, visible: false });

  icon.connect('destroy', function() {
    icon.clear_effects();
    iconContainer.destroy();
  });

  iconContainer.connect('button-release-event', function(actor, event) {
    icon.click(event);
  });

  GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, Lang.bind(this, function(){
    iconContainer.visible        = true;
    iconsContainer.actor.visible = true;

    return GLib.SOURCE_REMOVE;
  }));

  iconsBoxLayout.insert_child_at_index(iconContainer, 0);

  icon.reactive   = true;
  let iconSize    = 18;
  let scaleFactor = St.ThemeContext.get_for_stage(global.stage).scale_factor;
  let newsize     = iconSize * scaleFactor;

  icon.get_parent().set_size(newsize, newsize);
  icon.set_size(newsize, newsize);

  icons.push(icon);
}

function onTrayIconRemoved(o, icon) {
  let parent = icon.get_parent();

  if (parent)
    parent.destroy();

  icon.destroy();
  icons.splice(icons.indexOf(icon), 1);

  if (icons.length === 0)
    iconsContainer.actor.visible = false;
}

function moveToTop() {
  // Replace signal handlers
  if (tray._trayIconAddedId)
    tray._trayManager.disconnect(tray._trayIconAddedId);

  if (tray._trayIconRemovedId)
    tray._trayManager.disconnect(tray._trayIconRemovedId);

  trayAddedId   = tray._trayManager.connect('tray-icon-added', onTrayIconAdded);
  trayRemovedId = tray._trayManager.connect('tray-icon-removed', onTrayIconRemoved);

  // Create box layout for icon containers
  iconsBoxLayout = new St.BoxLayout();
  iconsBoxLayout.set_style('spacing: 10px; margin_top: 2px; margin_bottom: 2px;');

  // An empty ButtonBox will still display padding,therefore create it without visibility.
  iconsContainer = new PanelMenu.ButtonBox({ visible: false });
  iconsContainer.actor.add_actor(iconsBoxLayout);
  placeTray();

  // Move each tray icon to the top
  let length = tray._iconBox.get_n_children();

  for (let i = 0; i < length; i++) {
    let button = tray._iconBox.get_child_at_index(0);
    let icon   = button.child;

    button.remove_actor(icon);
    button.destroy();
    // Icon already loaded, no need to delay insertion
    onTrayIconAdded(this, icon, '', 0);
  }
}

function moveToTray() {
  // Replace signal handlers
  if (trayAddedId) {
    tray._trayManager.disconnect(trayAddedId);
    trayAddedId = 0;
  }

  if (trayRemovedId) {
    tray._trayManager.disconnect(trayRemovedId);
    trayRemovedId = 0;
  }

  tray._trayIconAddedId = tray._trayManager.connect('tray-icon-added', Lang.bind(tray, tray._onTrayIconAdded));
  tray._trayIconRemovedId = tray._trayManager.connect('tray-icon-removed', Lang.bind(tray, tray._onTrayIconRemoved));

  // Clean and move each icon back to the Legacy Tray;
  for (let i = 0; i < icons.length; i++) {
    let icon     = icons[i];
    icon.opacity = 255;

    icon.clear_effects();

    let parent = icon.get_parent();

    if (parent) {
      parent.remove_actor(icon);
      parent.destroy();
    }

    tray._onTrayIconAdded(tray, icon);
  }

  // Clean containers
  icons = [];

  if (iconsBoxLayout) {
    iconsBoxLayout.destroy();
    iconsBoxLayout = null;
  }
  if (iconsContainer) {
    if (iconsContainer.actor) {
      iconsContainer.actor.destroy();
      iconsContainer.actor = null;
    }

    iconsContainer = null;
  }
}

function placeTray() {
  let parent = iconsContainer.actor.get_parent();

  if (parent) {
    parent.remove_actor(iconsContainer.actor);
  }

  let index = Main.panel._rightBox.get_n_children() - 1;
  Main.panel._rightBox.insert_child_at_index(iconsContainer.actor, index);
}
;
/**
 * Guesses the X ID of a window.
 *
 * It is often in the window's title, being `"0x%x %10s".format(XID, window.title)`.
 * (See `mutter/src/core/window-props.c`).
 *
 * If we couldn't find it there, we use `win`'s actor, `win.get_compositor_private()`.
 * The actor's `x-window` property is the X ID of the window *actor*'s frame
 * (as opposed to the window itself).
 *
 * However, the child window of the window actor is the window itself, so by
 * using `xwininfo -children -id [actor's XID]` we can attempt to deduce the
 * window's X ID.
 *
 * It is not always foolproof, but works good enough for now.
 *
 * @param {Meta.Window} win - the window to guess the XID of. You wil get better
 * success if the window's actor (`win.get_compositor_private()`) exists.
 */

function guessWindowXID(win) {
  // We cache the result so we don't need to redetect.
  if (win._uniteWindowID) {
    return win._uniteWindowID;
  }

  /**
   * If window title has non-utf8 characters, get_description() complains
   * "Failed to convert UTF-8 string to JS string: Invalid byte sequence in conversion input",
   * event though get_title() works.
   */
  try {
    let m = win.get_description().match(/0x[0-9a-f]+/);
    if (m && m[0]) {
      return win._uniteWindowID = m[0];
    }
  } catch (err) { }

  // use xwininfo, take first child.
  let act = win.get_compositor_private();
  let xwindow = act && act['x-window'];
  if (xwindow) {
    let xwininfo = GLib.spawn_command_line_sync('xwininfo -children -id 0x%x'.format(xwindow));
    if (xwininfo[0]) {
      let str = xwininfo[1].toString();

      /**
       * The X ID of the window is the one preceding the target window's title.
       * This is to handle cases where the window has no frame and so
       * act['x-window'] is actually the X ID we want, not the child.
       */
      let regexp = new RegExp('(0x[0-9a-f]+) +"%s"'.format(win.title));
      let m = str.match(regexp);
      if (m && m[1]) {
        return win._uniteWindowID = m[1];
      }

      // Otherwise, just grab the child and hope for the best
      m = str.split(/child(?:ren)?:/)[1].match(/0x[0-9a-f]+/);
      if (m && m[0]) {
        return win._uniteWindowID = m[0];
      }
    }
  }

  // Try enumerating all available windows and match the title. Note that this
  // may be necessary if the title contains special characters and `x-window`
  // is not available.
  let result = GLib.spawn_command_line_sync('xprop -root _NET_CLIENT_LIST');

  if (result[0]) {
    let str = result[1].toString();

    // Get the list of window IDs.
    let windowList = str.match(/0x[0-9a-f]+/g);

    // For each window ID, check if the title matches the desired title.
    for (var i = 0; i < windowList.length; ++i) {
      let cmd = 'xprop -id "' + windowList[i] + '" _NET_WM_NAME _UNITE_ORIGINAL_STATE';
      let result = GLib.spawn_command_line_sync(cmd);

      if (result[0]) {
        let output = result[1].toString();
        let isManaged = output.indexOf("_UNITE_ORIGINAL_STATE(CARDINAL)") > -1;
        if (isManaged) {
          continue;
        }

        let title = output.match(/_NET_WM_NAME(\(\w+\))? = "(([^\\"]|\\"|\\\\)*)"/);

        // Is this our guy?
        if (title && title[2] == win.title) {
          return windowList[i];
        }
      }
    }
  }

  return null;
}

const WindowState = {
  DEFAULT: 'default',
  HIDE_TITLEBAR: 'hide_titlebar',
  UNDECORATED: 'undecorated',
  UNKNOWN: 'unknown'
}

/**
 * Get the value of _GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED
 *
 * @param {Meta.Window} win - the window to check the property
 */
function getOriginalState(win) {
  if (win._uniteOriginalState !== undefined) {
    return win._uniteOriginalState;
  }

  if (!win.decorated) {
    return win._uniteOriginalState = WindowState.UNDECORATED;
  }

  let id = guessWindowXID(win);
  let cmd = 'xprop -id ' + id;

  let xprops = GLib.spawn_command_line_sync(cmd);
  if (!xprops[0]) {
    return win._uniteOriginalState = State.UNKNOWN;
  }

  let str = xprops[1].toString();
  let m = str.match(/^_UNITE_ORIGINAL_STATE\(CARDINAL\) = ([0-9]+)$/m);
  if (m) {
    return win._uniteOriginalState = !!m[1]
      ? WindowState.HIDE_TITLEBAR
      : WindowState.DEFAULT;
  }

  m = str.match(/^_GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED(\(CARDINAL\))? = ([0-9]+)$/m);
  if (m) {
    let state = !!m[1];

    cmd = ['xprop', '-id', id,
          '-f', '_UNITE_ORIGINAL_STATE', '32c',
          '-set', '_UNITE_ORIGINAL_STATE',
          (state ? '0x1' : '0x0')];

    Util.spawn(cmd);
    return win._uniteOriginalState = state
      ? WindowState.HIDE_TITLEBAR
      : WindowState.DEFAULT;
  }

  // GTK uses the _GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED atom to indicate that the
  // title bar should be hidden when maximized. If we can't find this atom, the
  // window uses the default behavior
  return win._uniteOriginalState = WindowState.DEFAULT;
}

/**
 * Tells the window manager to hide the titlebar on maximised windows.
 *
 * Does this by setting the _GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED hint - means
 * I can do it once and forget about it, rather than tracking maximize/unmaximize
 * events.
 *
 * **Caveat**: doesn't work with Ubuntu's Ambiance and Radiance window themes -
 * my guess is they don't respect or implement this property.
 *
 * I don't know how to read the inital value, so I'm not sure how to resore it.
 *
 * @param {Meta.Window} win - window to set the HIDE_TITLEBAR_WHEN_MAXIMIZED property of.
 * @param {boolean} hide - whether to hide the titlebar or not.
 */
function setHideTitlebar(win, hide) {
  // Make sure we save the state before altering it.
  getOriginalState(win);

  /**
   * Undecorate with xprop. Use _GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED.
   * See (eg) mutter/src/window-props.c
   */
  let cmd = ['xprop', '-id', guessWindowXID(win),
             '-f', '_GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED', '32c',
             '-set', '_GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED',
             (hide ? '0x1' : '0x0')];

  // Run xprop
  let [success, pid] = GLib.spawn_async(
    null,
    cmd,
    null,
    GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
    null);

  // After xprop completes, unmaximize and remaximize any window
  // that is already maximized. It seems that setting the xprop on
  // a window that is already maximized doesn't actually take
  // effect immediately but it needs a focuse change or other
  // action to force a relayout. Doing unmaximize and maximize
  // here seems to be an uninvasive way to handle this. This needs
  // to happen _after_ xprop completes.
  GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, function () {
    const MAXIMIZED = Meta.MaximizeFlags.BOTH;
    let flags = win.get_maximized();
    if (flags == MAXIMIZED) {
      win.unmaximize(MAXIMIZED);
      win.maximize(MAXIMIZED);
    }
  });
}

/**** Callbacks ****/
/**
 * Callback when a window is added in any of the workspaces.
 * This includes a window switching to another workspace.
 *
 * If it is a window we already know about, we do nothing.
 *
 * Otherwise, we activate the hide title on maximize feature.
 *
 * @param {Meta.Window} win - the window that was added.
 *
 * @see undecorate
 */
function onWindowAdded(ws, win, retry) {
  if (win.window_type === Meta.WindowType.DESKTOP) {
    return false;
  }

  // If the window is simply switching workspaces, it will trigger a
  // window-added signal. We don't want to reprocess it then because we already
  // have.
  if (win._uniteOriginalState !== undefined) {
    return false;
  }

  /**
   * Newly-created windows are added to the workspace before
   * the compositor knows about them: get_compositor_private() is null.
   * Additionally things like .get_maximized() aren't properly done yet.
   * (see workspace.js _doAddWindow)
   */
  if (!win.get_compositor_private()) {
    retry = (retry !== undefined) ? retry : 0;
    if (retry > 3) {
      return false;
    }

    Mainloop.idle_add(function () {
      onWindowAdded(ws, win, retry + 1);
      return false;
    });
    return false;
  }

  retry = 3;
  Mainloop.idle_add(function () {
    let id = guessWindowXID(win);
    if (!id) {
      if (--retry) {
        return true;
      }

      return false;
    }

    setHideTitlebar(win, true);
    return false;
  });

  return false;
}

let workspaces = [];

/**
 * Callback whenever the number of workspaces changes.
 *
 * We ensure that we are listening to the 'window-added' signal on each of
 * the workspaces.
 *
 * @see onWindowAdded
 */
function onChangeNWorkspaces() {
  cleanWorkspaces();

  let i = global.screen.n_workspaces;
  while (i--) {
    let ws = global.screen.get_workspace_by_index(i);
    workspaces.push(ws);
    // we need to add a Mainloop.idle_add, or else in onWindowAdded the
    // window's maximized state is not correct yet.
    ws._uniteWindowAddedId = ws.connect('window-added', function (ws, win) {
      Mainloop.idle_add(function () { return onWindowAdded(ws, win); });
    });
  }

  return false;
}

/**
 * Utilities
 */
function cleanWorkspaces() {
  // disconnect window-added from workspaces
  workspaces.forEach(function(ws) {
    ws.disconnect(ws._uniteWindowAddedId);
    delete ws._uniteWindowAddedId;
  });

  workspaces = [];
}

function forEachWindow(callback) {
  global.get_window_actors()
    .map(function (w) { return w.meta_window; })
    .filter(function(w) { return w.window_type !== Meta.WindowType.DESKTOP; })
    .forEach(callback);
}

/**
 * Subextension hooks
 */

let changeWorkspaceID = 0;

function enableDecoration() {
  // Connect events
  changeWorkspaceID = global.screen.connect('notify::n-workspaces', onChangeNWorkspaces);

  /**
   * Go through already-maximised windows & undecorate.
   * This needs a delay as the window list is not yet loaded
   * when the extension is loaded.
   * Also, connect up the 'window-added' event.
   * Note that we do not connect this before the onMaximise loop
   * because when one restarts the gnome-shell, window-added gets
   * fired for every currently-existing window, and then
   * these windows will have onMaximise called twice on them.
   */
  Mainloop.idle_add(function () {
    forEachWindow(function(win) {
      onWindowAdded(null, win);
    });

    onChangeNWorkspaces();
    return false;
  });
}

function disableDecoration() {
  if (changeWorkspaceID) {
    global.screen.disconnect(changeWorkspaceID);
    changeWorkspaceID = 0;
  }

  cleanWorkspaces();

  forEachWindow(function(win) {
    let state = getOriginalState(win);

    if (state == WindowState.DEFAULT) {
      setHideTitlebar(win, false);
    }

    delete win._uniteOriginalState;
  });
}
;







