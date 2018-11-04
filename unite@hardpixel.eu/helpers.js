const Gio = imports.gi.Gio;

function wmPreferences() {
  let schema = 'org.gnome.desktop.wm.preferences';
  let prefs  = new Gio.Settings({ schema_id: schema });

  return prefs;
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
