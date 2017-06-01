const GLib            = imports.gi.GLib;
const Gio             = imports.gi.Gio;
const Gtk             = imports.gi.Gtk;
const Main            = imports.ui.main;
const Mainloop        = imports.mainloop;
const Meta            = imports.gi.Meta;
const St              = imports.gi.St;
const ExtensionUtils  = imports.misc.extensionUtils;
const Me              = ExtensionUtils.getCurrentExtension();
const Util            = Me.imports.util;
const DCONF_META_PATH = 'org.gnome.desktop.wm.preferences';

let actors = [], boxes = [];

function createButtons() {
  // Ensure we do not create buttons twice.
  destroyButtons();

  actors = [new St.Bin({ style_class: 'box-bin'}), new St.Bin({ style_class: 'box-bin'})];
  boxes  = [new St.BoxLayout({ style_class: 'button-box' }), new St.BoxLayout({ style_class: 'button-box' })];

  for (let i = 0; i < actors.length; ++i) {
    actors[i].add_actor(boxes[i]);
  }

  let order  = new Gio.Settings({schema_id: DCONF_META_PATH}).get_string('button-layout');
  let orders = order.replace(/ /g, '').split(':');

  orders[0] = orders[0].split(',');
  orders[1] = orders[1].split(',');

  const callbacks = {
    minimize : minimize,
    maximize : maximize,
    close    : close
  };

  for (let bi = 0; bi < boxes.length; ++bi) {
    let order = orders[bi],
    box       = boxes[bi];

    for (let i = 0; i < order.length; ++i) {
      if (!order[i]) {
        continue;
      }

      if (!callbacks[order[i]]) {
        continue;
      }

      let button = new St.Button({
        style_class: order[i]  + ' window-button',
        track_hover: true
      });

      button.connect('button-release-event', leftclick(callbacks[order[i]]));
      box.add(button);
    }
  }

  Mainloop.idle_add(function () {
    // 1 for activity button and +1 for the menu
    if (boxes[0].get_children().length) {
      Main.panel._leftBox.insert_child_at_index(actors[0], 1);
    }

    if (boxes[1].get_children().length) {
      Main.panel._rightBox.insert_child_at_index(actors[1], Main.panel._rightBox.get_children().length + 1);
    }

    updateVisibility();
    return false;
  });
}

function destroyButtons() {
  for (let i = 0; i < actors.length; ++i) {
    actors[i].destroy();
    boxes[i].destroy();
  }

  actors = [];
  boxes  = [];
}

/*
 * Buttons actions
 */
function leftclick(callback) {
  return function(actor, event) {
    if (event.get_button() !== 1) {
      return;
    }

    return callback(actor, event);
  }
}

function minimize() {
  let win = Util.getWindow();

  if (!win || win.minimized) {
    return;
  }

  win.minimize();
}

function maximize() {
  let win = Util.getWindow();

  if (!win) {
    return;
  }

  const MAXIMIZED = Meta.MaximizeFlags.BOTH;

  if (win.get_maximized() === MAXIMIZED) {
    win.unmaximize(MAXIMIZED);
  } else {
    win.maximize(MAXIMIZED);
  }

  win.activate(global.get_current_time());
}

function close() {
  let win = Util.getWindow();

  if (!win) {
    return;
  }

  win.delete(global.get_current_time());
}

let activeCSS = false;

function loadTheme() {
  let theme = Gtk.Settings.get_default().gtk_theme_name,
    cssPath = GLib.build_filenamev([extensionPath, 'themes', theme, 'style.css']);

  if (!GLib.file_test(cssPath, GLib.FileTest.EXISTS)) {
    cssPath = GLib.build_filenamev([extensionPath, 'themes/default/style.css']);
  }

  if (cssPath === activeCSS) {
    return;
  }

  unloadTheme();

  // Load the new style
  let cssFile = Gio.file_new_for_path(cssPath);
  St.ThemeContext.get_for_stage(global.stage).get_theme().load_stylesheet(cssFile);

  // Force style update.
  for (let i = 0; i < actors.length; ++i) {
    actors[i].grab_key_focus();
  }

  activeCSS = cssPath;
}

function unloadTheme() {
  if (activeCSS) {
    let cssFile = Gio.file_new_for_path(activeCSS);
    St.ThemeContext.get_for_stage(global.stage).get_theme().unload_stylesheet(cssFile);
    activeCSS = false;
  }
}

function updateVisibility() {
  // If we have a window to control, then we show the buttons.
  let visible = !Main.overview.visible;

  if (visible) {
    visible = false;
    let win = Util.getWindow();

    if (win) {
      visible = win.decorated;
    }
  }

  for (let i = 0; i < actors.length; ++i) {
    let actor = actors[i];

    if(!boxes[i].get_children().length) {
      continue;
    }

    if(visible) {
      actor.show();
    } else {
      actor.hide();
    }
  }

  return false;
}

let extensionPath;

function init(extensionMeta) {
  extensionPath = extensionMeta.path;
}

let wmCallbackIDs       = [];
let overviewCallbackIDs = [];

function enable() {
  createButtons();
  loadTheme();

  overviewCallbackIDs.push(Main.overview.connect('showing', updateVisibility));
  overviewCallbackIDs.push(Main.overview.connect('hidden', updateVisibility));

  wmCallbackIDs.push(global.window_manager.connect('switch-workspace', updateVisibility));
  wmCallbackIDs.push(global.window_manager.connect('map', updateVisibility));
  wmCallbackIDs.push(global.window_manager.connect('minimize', updateVisibility));
  wmCallbackIDs.push(global.window_manager.connect('unminimize', updateVisibility));

  try {
    // Gnome 3.16
    wmCallbackIDs.push(global.window_manager.connect('maximize', updateVisibility));
    wmCallbackIDs.push(global.window_manager.connect('unmaximize', updateVisibility));
  } catch (e) {
    // Gnome 3.18
    wmCallbackIDs.push(global.window_manager.connect('size-change', updateVisibility));
  }

  // note: 'destroy' needs a delay for .list_windows() report correctly
  wmCallbackIDs.push(global.window_manager.connect('destroy', function () {
    Mainloop.idle_add(updateVisibility);
  }));
}

function disable() {
  for (let i = 0; i < wmCallbackIDs.length; ++i) {
    global.window_manager.disconnect(wmCallbackIDs[i]);
  }

  for (let i = 0; i < overviewCallbackIDs.length; ++i) {
    Main.overview.disconnect(overviewCallbackIDs[i]);
  }

  wmCallbackIDs       = [];
  overviewCallbackIDs = [];

  unloadTheme();
  destroyButtons();
}
