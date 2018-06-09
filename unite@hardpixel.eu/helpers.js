const Config = imports.misc.config;
const Gio    = imports.gi.Gio;
const St     = imports.gi.St;
const Main   = imports.ui.main;
const Meta   = imports.gi.Meta;

function wmPreferences() {
  let schema = 'org.gnome.desktop.wm.preferences';
  let prefs  = new Gio.Settings({ schema_id: schema });

  return prefs;
}

function isValidWindow(win) {
  let valid = false;

  if (win) {
    let valid_types = [
      Meta.WindowType.NORMAL,
      Meta.WindowType.DIALOG,
      Meta.WindowType.MODAL_DIALOG,
      Meta.WindowType.UTILITY
    ];

    valid = valid_types.indexOf(win.window_type) > -1;
  }

  return valid;
}

function getXWindow(win) {
  try {
    return win.get_description().match(/0x[0-9a-f]+/)[0];
  } catch (err) {
    return null;
  }
}

function getAllWindows() {
  let windows = global.get_window_actors().map(function (win) {
    return win.meta_window;
  });

  windows = windows.filter(function(win) {
    return isValidWindow(win);
  });

  return windows;
}

function getWindowButtons(return_only) {
  let prefs  = wmPreferences();
  let layout = prefs.get_string('button-layout');
  let order  = layout.replace(/ /g, '').split(':');

  if (order.length < 2) {
    return null;
  }

  let buttons  = collectWindowButtons(order[1].split(','));
  let position = 'right';

  if (!buttons) {
    buttons  = collectWindowButtons(order[0].split(','));
    position = 'left';
  }

  if (return_only == 'position') {
    return position;
  }

  if (return_only == 'buttons') {
    return buttons;
  }

  return [position, buttons];
}

function collectWindowButtons(layout_items) {
  let names = ['close', 'minimize', 'maximize'];
  let items = [];

  layout_items.forEach(function (item) {
    if (names.indexOf(item) > -1) {
      items.push(item);
    }
  });

  if (items.length == 0) {
    items = null;
  }

  return items;
}

function isMaximized(win, match_state) {
  let check = false;
  let flags = Meta.MaximizeFlags;

  if (win) {
    let maximized     = win.get_maximized()
    let primaryScreen = win.is_on_primary_monitor();
    let tileMaximized = maximized == flags.HORIZONTAL || maximized == flags.VERTICAL;
    let fullMaximized = maximized == flags.BOTH;

    switch (match_state) {
      case 'both':
        check = primaryScreen && maximized;
        break;
      case 'maximized':
        check = primaryScreen && fullMaximized;
        break;
      case 'tiled':
        check = primaryScreen && tileMaximized;
        break;
    }
  }

  return check;
}

function getVersion() {
  let version = Config.PACKAGE_VERSION.match(/\d+.\d+/);
  return parseFloat(version);
}

function scaleSize(initial_size) {
  let scale = St.ThemeContext.get_for_stage(global.stage).scale_factor;
  let size  = initial_size * scale;

  return size;
}
