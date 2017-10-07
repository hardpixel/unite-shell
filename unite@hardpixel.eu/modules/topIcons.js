const Main      = imports.ui.main;
const Shell     = imports.gi.Shell;
const Mainloop  = imports.mainloop;
const St        = imports.gi.St;
const System    = imports.system;
const Lang      = imports.lang;
const PanelMenu = imports.ui.panelMenu;
const Panel     = Main.panel;

var TopIcons = new Lang.Class({
  Name: 'TopIcons',
  _handlerIDs: [],
  _icons: [],

  _init: function() {
    this._tray = Main.legacyTray;

    if (this._tray) {
      Mainloop.idle_add(Lang.bind(this, this._moveToPanel));
      this._tray.actor.hide();
    } else {
      Mainloop.idle_add(Lang.bind(this, this._createTray));
    }
  },

  _createTray: function () {
    this._createIconsContainer();

    this._tray = new Shell.TrayManager();
    this._tray.connect('tray-icon-added', Lang.bind(this, this._addTrayIcon));
    this._tray.connect('tray-icon-removed', Lang.bind(this, this._removeTrayIcon));
    this._tray.manage_screen(global.screen, Panel.actor);
  },

  _destroyTray: function () {
    this._destroyIconsContainer();
    System.gc();
  },

  _createIconsContainer: function () {
    this._iconsBoxLayout = new St.BoxLayout({ style_class: 'tray-icons-box' });
    this._iconsContainer = new PanelMenu.ButtonBox({ visible: false });
    this._iconsContainer.actor.add_actor(this._iconsBoxLayout);

    let parent = this._iconsContainer.actor.get_parent();
    let index  = Panel._rightBox.get_n_children() - 1;
    let child  = Panel._rightBox.get_children();

    if (child[index]._windowButtons) {
      index = index - 1;
    }

    if (parent) {
      parent.remove_actor(this._iconsContainer.actor);
    }

    Panel._rightBox.insert_child_at_index(this._iconsContainer.actor, index);
  },

  _destroyIconsContainer: function () {
    if (this._iconsBoxLayout) {
      this._iconsBoxLayout.destroy();
    }

    if (this._iconsContainer) {
      this._iconsContainer.actor.destroy();
    }
  },

  _moveToPanel: function () {
    this._createIconsContainer();

    if (this._tray._trayIconAddedId) {
      this._tray._trayManager.disconnect(this._tray._trayIconAddedId);
    }

    if (this._tray._trayIconRemovedId) {
      this._tray._trayManager.disconnect(this._tray._trayIconRemovedId);
    }

    this._handlerIDs.push(this._tray._trayManager.connect(
      'tray-icon-added', Lang.bind(this, this._addTrayIcon))
    );

    this._handlerIDs.push(this._tray._trayManager.connect(
      'tray-icon-removed', Lang.bind(this, this._removeTrayIcon))
    );

    let icons = this._tray._iconBox.get_children();

    icons.forEach(Lang.bind(this, function (button) {
      let icon = button.child;

      button.remove_actor(icon);
      button.destroy();

      this._addTrayIcon(null, icon, '', 0);
    }));
  },

  _moveToTray: function () {
    this._handlerIDs.forEach(Lang.bind(this, function (handler) {
      this._tray._trayManager.disconnect(handler);
    }));

    this._tray._trayIconAddedId = this._tray._trayManager.connect(
      'tray-icon-added', Lang.bind(this._tray, this._tray._onTrayIconAdded)
    );

    this._tray._trayIconRemovedId = this._tray._trayManager.connect(
      'tray-icon-removed', Lang.bind(this._tray, this._tray._onTrayIconRemoved)
    );

    this._icons.forEach(Lang.bind(this, function (icon) {
      let parent = icon.get_parent();

      if (parent) {
        parent.remove_actor(icon);
        parent.destroy();
      }

      this._tray._onTrayIconAdded(this._tray, icon);
    }));

    this._destroyIconsContainer();
  },

  _addTrayIcon: function (o, icon, role, delay=1000) {
    this._icons.push(icon);

    let iconContainer = new St.Button({ child: icon, visible: false });

    icon.connect('destroy', function() {
      icon.clear_effects();
      iconContainer.destroy();
    });

    iconContainer.connect('button-release-event', function (actor, evt) {
      icon.click(evt);
    });

    Mainloop.timeout_add(delay, Lang.bind(this, function () {
      iconContainer.visible              = true;
      this._iconsContainer.actor.visible = true;
    }));

    this._iconsBoxLayout.insert_child_at_index(iconContainer, 0);

    let scale = St.ThemeContext.get_for_stage(global.stage).scale_factor;
    let size  = 18 * scale;

    icon.reactive = true;
    icon.get_parent().set_size(size, size);
    icon.set_size(size, size);
  },

  _removeTrayIcon: function (o, icon) {
    let parent = icon.get_parent();

    if (parent) {
      parent.destroy();
    }

    icon.destroy();
    this._icons.splice(this._icons.indexOf(icon), 1);

    if (this._icons.length === 0) {
      this._iconsContainer.actor.visible = false;
    }
  },

  destroy: function() {
    if (Main.legacyTray) {
      Mainloop.idle_add(Lang.bind(this, this._moveToTray));
      this._tray.actor.show();
    } else {
      Mainloop.idle_add(Lang.bind(this, this._destroyTray));
    }
  }
});
