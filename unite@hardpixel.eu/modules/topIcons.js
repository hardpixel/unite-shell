const Lang      = imports.lang;
const System    = imports.system;
const Mainloop  = imports.mainloop;
const Clutter   = imports.gi.Clutter;
const Shell     = imports.gi.Shell;
const St        = imports.gi.St;
const Main      = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const Unite     = imports.misc.extensionUtils.getCurrentExtension();
const Base      = Unite.imports.module.BaseModule;
const Helpers   = Unite.imports.helpers;

var TopIcons = new Lang.Class({
  Name: 'Unite.TopIcons',
  Extends: Base,
  EnableKey: 'show-legacy-tray',
  EnableValue: true,

  _onInitialize() {
    this._icons = [];
    this._settings.connect('greyscale-tray-icons', this._desaturateIcons);
  },

  _onActivate() {
    Mainloop.idle_add(Lang.bind(this, this._createTray));
  },

  _onDeactivate() {
    Mainloop.idle_add(Lang.bind(this, this._destroyTray));
  },

  _createTray() {
    this._createIconsContainer();

    this._tray = new Shell.TrayManager();
    this._tray.connect('tray-icon-added', Lang.bind(this, this._addTrayIcon));
    this._tray.connect('tray-icon-removed', Lang.bind(this, this._removeTrayIcon));

    if (global.screen) {
      this._tray.manage_screen(global.screen, Main.panel.actor);
    } else {
      this._tray.manage_screen(Main.panel.actor);
    }
  },

  _destroyTray() {
    this._icons = [];
    this._destroyIconsContainer();

    delete this._tray;
    System.gc();
  },

  _createIconsContainer() {
    this._iconsBoxLayout = new St.BoxLayout({ style_class: 'tray-icons-box' });
    this._iconsContainer = new PanelMenu.ButtonBox({ visible: false });
    this._iconsContainer.actor.add_actor(this._iconsBoxLayout);

    let parent = this._iconsContainer.actor.get_parent();
    let agmenu = Main.panel.statusArea.aggregateMenu.actor.get_parent();

    if (parent) {
      parent.remove_actor(this._iconsContainer.actor);
    }

    Main.panel._rightBox.insert_child_below(this._iconsContainer.actor, agmenu);
  },

  _destroyIconsContainer() {
    if (this._iconsBoxLayout) {
      this._iconsBoxLayout.destroy();
      delete this._iconsBoxLayout;
    }

    if (this._iconsContainer) {
      this._iconsContainer.actor.destroy();
      delete this._iconsContainer;
    }
  },

  _addTrayIcon(o, icon, role) {
    this._icons.push(icon);

    let buttonMask    = St.ButtonMask.ONE | St.ButtonMask.TWO | St.ButtonMask.THREE;
    let iconContainer = new St.Button({ child: icon, button_mask: buttonMask });

    icon.connect('destroy', function() {
      iconContainer.destroy();
    });

    iconContainer.connect('button-release-event', function (actor, event) {
      icon.click(event);
    });

    this._setIcon(icon);

    this._iconsContainer.actor.show();
    this._iconsContainer.container.show();
    this._iconsBoxLayout.insert_child_at_index(iconContainer, 0);
  },

  _removeTrayIcon(o, icon) {
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

  _setIcon(icon) {
    let size = Helpers.scaleSize(20);

    icon.reactive = true;
    icon.set_size(size, size);
    this._desaturateIcon(icon);
  },

  _desaturateIcon(icon) {
    let greyscale = this._settings.get('greyscale-tray-icons');
    icon.clear_effects();

    if (!greyscale) return;

    let desEffect = new Clutter.DesaturateEffect({ factor : 1.0 });
    let briEffect = new Clutter.BrightnessContrastEffect({});

    briEffect.set_brightness(0.2);
    briEffect.set_contrast(0.3);

    icon.add_effect_with_name('desaturate', desEffect);
    icon.add_effect_with_name('brightness-contrast', briEffect);
  },

  _desaturateIcons() {
    this._icons.forEach(Lang.bind(this, this._desaturateIcon));
  }
});
