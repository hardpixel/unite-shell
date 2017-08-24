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

  iconsBoxLayout.destroy();
  iconsContainer.destroy();

  trayHandlers   = [];
  trayIcons      = [];
  iconsBoxLayout = null;
  iconsContainer = null;
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
