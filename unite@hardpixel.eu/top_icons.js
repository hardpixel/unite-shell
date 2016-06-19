const Clutter = imports.gi.Clutter;
const Shell = imports.gi.Shell;
const St = imports.gi.St;
const Main = imports.ui.main;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Panel = imports.ui.panel;
const PanelMenu = imports.ui.panelMenu;
const Meta = imports.gi.Meta;
const Mainloop = imports.mainloop;
const NotificationDaemon = imports.ui.notificationDaemon;

let trayAddedId = 0;
let trayRemovedId = 0;
let getSource = null;
let icons = [];
let notificationDaemon;
let notify_id = 0;

const PANEL_ICON_SIZE = 24;

let extensionPath;
function init(extensionMeta) {
	extensionPath = extensionMeta.path;
	if (Main.legacyTray) {
		notificationDaemon = Main.legacyTray;
		NotificationDaemon.STANDARD_TRAY_ICON_IMPLEMENTATIONS = imports.ui.legacyTray.STANDARD_TRAY_ICON_IMPLEMENTATIONS;
	}
	else if (Main.notificationDaemon._fdoNotificationDaemon) {
		notificationDaemon = Main.notificationDaemon._fdoNotificationDaemon;
		getSource = Lang.bind(notificationDaemon, NotificationDaemon.FdoNotificationDaemon.prototype._getSource);
	}
	else {
		notificationDaemon = Main.notificationDaemon;
		getSource = Lang.bind(notificationDaemon, NotificationDaemon.NotificationDaemon.prototype._getSource);
	}
}

function enable() {
	Main.legacyTray.actor.hide();

  notify_id = Main.legacyTray.actor.connect("notify::visible", function() {
    if (Main.legacyTray.actor.visible)
      Main.legacyTray.actor.hide();
  });

	GLib.idle_add(GLib.PRIORITY_LOW, moveToTop);
}

function createSource (title, pid, ndata, sender, trayIcon) {
  if (trayIcon) {
		onTrayIconAdded(this, trayIcon, title);
		return null;
  }

  return getSource(title, pid, ndata, sender, trayIcon);
};

function onTrayIconAdded(o, icon, role) {
	let wmClass = icon.wm_class ? icon.wm_class.toLowerCase() : '';
	if (NotificationDaemon.STANDARD_TRAY_ICON_IMPLEMENTATIONS[wmClass] !== undefined)
		return;

	let buttonBox = new PanelMenu.ButtonBox();
	let box = buttonBox.actor;
	let parent = box.get_parent();

	let scaleFactor = St.ThemeContext.get_for_stage(global.stage).scale_factor;
	let iconSize = PANEL_ICON_SIZE * scaleFactor;

	icon.set_size(iconSize, iconSize);
	box.add_actor(icon);

	icon.reactive = true;

	if (parent)
		parent.remove_actor(box);

	icons.push(icon);
	Main.panel._rightBox.insert_child_at_index(box, 0);

	let clickProxy = new St.Bin({ width: iconSize, height: iconSize });
	clickProxy.reactive = true;
	Main.uiGroup.add_actor(clickProxy);

	icon._proxyAlloc = Main.panel._rightBox.connect('allocation-changed', function() {
		Meta.later_add(Meta.LaterType.BEFORE_REDRAW, function() {
			let [x, y] = icon.get_transformed_position();
			clickProxy.set_position(x, y);
		});
	});

	icon.connect("destroy", function() {
		Main.panel._rightBox.disconnect(icon._proxyAlloc);
		clickProxy.destroy();
	});

	clickProxy.connect('button-release-event', function(actor, event) {
		icon.click(event);
	});

	icon._clickProxy = clickProxy;

	/* Fixme: HACK */
	Meta.later_add(Meta.LaterType.BEFORE_REDRAW, function() {
		let [x, y] = icon.get_transformed_position();
		clickProxy.set_position(x, y);
		return false;
	});
	let timerId = 0;
	let i = 0;
	timerId = Mainloop.timeout_add(500, function() {
		icon.set_size(icon.width == iconSize ? iconSize - 1 : iconSize, icon.width == iconSize ? iconSize - 1 : iconSize);
		i++;
		if (i == 2)
			Mainloop.source_remove(timerId);
	});
}

function onTrayIconRemoved(o, icon) {
	let parent = icon.get_parent();
	parent.destroy();
	icon.destroy();
	icons.splice(icons.indexOf(icon), 1);
}

function moveToTop() {
	notificationDaemon._trayManager.disconnect(notificationDaemon._trayIconAddedId);
	notificationDaemon._trayManager.disconnect(notificationDaemon._trayIconRemovedId);
	trayAddedId = notificationDaemon._trayManager.connect('tray-icon-added', onTrayIconAdded);
	trayRemovedId = notificationDaemon._trayManager.connect('tray-icon-removed', onTrayIconRemoved);

	notificationDaemon._getSource = createSource;

	let toDestroy = [];
	if (notificationDaemon._sources) {
		for (let i = 0; i < notificationDaemon._sources.length; i++) {
			let source = notificationDaemon._sources[i];
			if (!source.trayIcon)
				continue;
			let parent = source.trayIcon.get_parent();
			parent.remove_actor(source.trayIcon);
			onTrayIconAdded(this, source.trayIcon, source.initialTitle);
			toDestroy.push(source);
		}
	}
	else {
		for (let i = 0; i < notificationDaemon._iconBox.get_n_children(); i++) {
			let button = notificationDaemon._iconBox.get_child_at_index(i);
			let icon = button.child;
			button.remove_actor(icon);
			onTrayIconAdded(this, icon, '');
			toDestroy.push(button);
		}
	}

	for (let i = 0; i < toDestroy.length; i++) {
		toDestroy[i].destroy();
	}
}

function moveToTray() {
	if (trayAddedId != 0) {
		notificationDaemon._trayManager.disconnect(trayAddedId);
		trayAddedId = 0;
	}

	if (trayRemovedId != 0) {
		notificationDaemon._trayManager.disconnect(trayRemovedId);
		trayRemovedId = 0;
	}

	notificationDaemon._trayIconAddedId = notificationDaemon._trayManager.connect('tray-icon-added', Lang.bind(notificationDaemon, notificationDaemon._onTrayIconAdded));
	notificationDaemon._trayIconRemovedId = notificationDaemon._trayManager.connect('tray-icon-removed', Lang.bind(notificationDaemon, notificationDaemon._onTrayIconRemoved));
	notificationDaemon._getSource = getSource;

	for (let i = 0; i < icons.length; i++) {
		let icon = icons[i];
		let parent = icon.get_parent();
		if (icon._clicked) {
			icon.disconnect(icon._clicked);
		}
		icon._clicked = undefined;
		if (icon._proxyAlloc) {
			Main.panel._rightBox.disconnect(icon._proxyAlloc);
		}
		icon._clickProxy.destroy();
		parent.remove_actor(icon);
		parent.destroy();
		notificationDaemon._onTrayIconAdded(notificationDaemon, icon);
	}

	icons = [];
}

function disable() {
	moveToTray();

	if (notify_id > 0)
    Main.legacyTray.actor.disconnect(notify_id);

	notify_id = 0;
  Main.legacyTray.actor.show();
}
