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
