const Clutter        = imports.gi.Clutter;
const Main           = imports.ui.main;
const Shell          = imports.gi.Shell;
const Mainloop       = imports.mainloop;
const Gtk            = imports.gi.Gtk;
const St             = imports.gi.St;
const System         = imports.system;
const Lang           = imports.lang;
const PanelMenu      = imports.ui.panelMenu;
const Panel          = Main.panel;
const ExtensionUtils = imports.misc.extensionUtils;
const Unite          = ExtensionUtils.getCurrentExtension();
const Helpers        = Unite.imports.helpers;
const Convenience    = Unite.imports.convenience;

var TopIcons = new Lang.Class({
  Name: 'Unite.TopIcons',
  _handlerIDs: [],
  _icons: [],

  _init: function() {
    this._tray     = Main.legacyTray;
    this._settings = Convenience.getSettings();

    this._toggle();
    this._connectSettings();
  },

  _connectSettings: function() {
    this._settings.connect(
      'changed::show-legacy-tray', Lang.bind(this, this._toggle)
    );
  },

  _createTray: function () {
    this._createIconsContainer();

    this._tray = new Shell.TrayManager();
    this._tray.connect('tray-icon-added', Lang.bind(this, this._addTrayIcon));
    this._tray.connect('tray-icon-removed', Lang.bind(this, this._removeTrayIcon));
    this._tray.manage_screen(global.screen, Panel.actor);
  },

  _destroyTray: function () {
    this._icons = [];
    this._destroyIconsContainer();

    this._tray = null;
    System.gc();
  },

  _createIconsContainer: function () {
    this._iconsBoxLayout = new St.BoxLayout({ style_class: 'tray-icons-box' });
    this._iconsContainer = new PanelMenu.ButtonBox({ visible: false });
    this._iconsContainer.actor.add_actor(this._iconsBoxLayout);

    let parent = this._iconsContainer.actor.get_parent();
    let agmenu = Main.panel.statusArea.aggregateMenu.actor.get_parent();

    if (parent) {
      parent.remove_actor(this._iconsContainer.actor);
    }

    Panel._rightBox.insert_child_below(this._iconsContainer.actor, agmenu);
  },

  _destroyIconsContainer: function () {
    if (this._iconsBoxLayout) {
      this._iconsBoxLayout.destroy();
      delete this._iconsBoxLayout;
    }

    if (this._iconsContainer) {
      this._iconsContainer.actor.destroy();
      delete this._iconsContainer;
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

      this._addTrayIcon(null, icon);
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

    this._icons      = [];
    this._handlerIDs = [];

    this._destroyIconsContainer();
  },

  _addTrayIcon: function (o, icon, role) {
    this._icons.push(icon);

    let iconSym       = this._createIcon(icon);
    let buttonMask    = St.ButtonMask.ONE | St.ButtonMask.TWO | St.ButtonMask.THREE;
    let iconContainer = new St.Button({ child: iconSym, button_mask: buttonMask });

    icon.connect('destroy', function() {
      icon.clear_effects();
      iconContainer.destroy();
    });

    iconContainer.connect('button-release-event', function () {
      icon.click(Clutter.get_current_event());
    });

    this._iconsContainer.actor.show();
    this._iconsContainer.container.show();
    this._iconsBoxLayout.insert_child_at_index(iconContainer, 0);
  },

  _removeTrayIcon: function (o, icon) {
    let parent = icon.get_parent();

    if (parent) {
      parent.destroy();
    } else {
      icon.destroy();
    }

    this._icons.splice(this._icons.indexOf(icon), 1);

    if (this._iconsBoxLayout.get_n_children() === 0) {
      this._iconsContainer.actor.hide();
      this._iconsContainer.container.hide();
    }
  },

  _createIcon: function (icon) {
    let size  = Helpers.scaleSize(19);
    let theme = Gtk.IconTheme.get_default();
    let name  = icon.wm_class ? icon.wm_class.toLowerCase() + '-symbolic' : '';
    let info  = theme.lookup_icon(name, 24, Gtk.IconLookupFlags.FORCE_SYMBOLIC);

    if (info && info.is_symbolic) {
      name = info.get_filename().replace(/^.*\/|\.\S+$/g, '');
      icon = new St.Icon({ icon_name: name, style_class: 'system-status-icon' });
    } else {
      icon.reactive = true;
      icon.set_size(size, size);

      this._desaturateIcon(icon);
    }

    return icon;
  },

  _desaturateIcon: function (icon) {
    let desEffect = new Clutter.DesaturateEffect({ factor : 1.0 });
    let briEffect = new Clutter.BrightnessContrastEffect({});

    briEffect.set_brightness(0.2);
    briEffect.set_contrast(0.3);

    icon.clear_effects();
    icon.add_effect_with_name('desaturate', desEffect);
    icon.add_effect_with_name('brightness-contrast', briEffect);
  },

  _toggle: function() {
    this._enabled = this._settings.get_boolean('show-legacy-tray');
    this._enabled ? this._activate() : this.destroy();
  },

  _activate: function() {
    if (!this._activated) {
      this._activated = true;

      if (Main.legacyTray) {
        Mainloop.idle_add(Lang.bind(this, this._moveToPanel));
        this._tray.actor.hide();
      } else {
        Mainloop.idle_add(Lang.bind(this, this._createTray));
      }
    }
  },

  destroy: function() {
    if (this._activated) {
      this._activated = false;

      if (Main.legacyTray) {
        Mainloop.idle_add(Lang.bind(this, this._moveToTray));
        this._tray.actor.show();
      } else {
        Mainloop.idle_add(Lang.bind(this, this._destroyTray));
      }
    }
  }
});
