const System       = imports.system;
const GObject      = imports.gi.GObject;
const Clutter      = imports.gi.Clutter;
const Shell        = imports.gi.Shell;
const St           = imports.gi.St;
const Main         = imports.ui.main;
const PanelMenu    = imports.ui.panelMenu;
const Unite        = imports.misc.extensionUtils.getCurrentExtension();
const Base         = Unite.imports.module.BaseModule;
const scaleSize    = Unite.imports.helpers.scaleSize;
const toggleWidget = Unite.imports.helpers.toggleWidget;

var TopIcons = new GObject.Class({
  Name: 'Unite.TopIcons',
  GTypeName: 'TopIcons',
  Extends: Base,

  _enableKey: 'show-legacy-tray',
  _enableValue: true,

  _onInitialize() {
    this._icons = [];
    this._iSize = scaleSize(20);
  },

  _onActivate() {
    this._settings.connect('greyscale-tray-icons', 'desaturateIcons');

    this._createContainer();
    this._createTray();
  },

  _onDeactivate() {
    this._icons = [];

    this._destroyContainer();
    this._destroyTray();
  },

  _createTray() {
    this._tray = new Shell.TrayManager();

    this._tray.connect('tray-icon-added', (trayManager, icon) => {
      this._addTrayIcon(trayManager, icon);
    });

    this._tray.connect('tray-icon-removed', (trayManager, icon) => {
      this._removeTrayIcon(trayManager, icon);
    });

    if (global.screen)
      this._tray.manage_screen(global.screen, Main.panel.actor);
    else
      this._tray.manage_screen(Main.panel.actor);
  },

  _destroyTray() {
    this._tray = null;
    System.gc();
  },

  _createContainer() {
    this._iconsBoxLayout = new St.BoxLayout({ style_class: 'tray-icons-box' });
    this._iconsContainer = new PanelMenu.ButtonBox({ visible: false });
    this._iconsContainer.actor.add_actor(this._iconsBoxLayout);

    let parent = this._iconsContainer.actor.get_parent();
    parent.remove_actor(this._iconsContainer.actor);

    let agmenu = Main.panel.statusArea.aggregateMenu.actor.get_parent();
    Main.panel._rightBox.insert_child_below(this._iconsContainer.actor, agmenu);
  },

  _destroyContainer() {
    if (!this._iconsContainer) return;

    this._iconsContainer.actor.destroy();

    this._iconsContainer = null;
    this._iconsBoxLayout = null;
  },

  _addTrayIcon(trayManager, icon) {
    this._icons.push(icon);

    let buttonMask = St.ButtonMask.ONE | St.ButtonMask.TWO | St.ButtonMask.THREE;
    let iconButton = new St.Button({ child: icon, button_mask: buttonMask });

    icon.connect('destroy', function() {
      iconButton.destroy();
    });

    iconButton.connect('button-release-event', function(actor, event) {
      icon.click(event);
    });

    this._iconsBoxLayout.insert_child_at_index(iconButton, 0);

    this._transformIcon(icon);
    this._toggleContainer();
  },

  _removeTrayIcon(trayManager, icon) {
    let iconContainer = icon.get_parent() || icon;
    iconContainer.destroy();

    let iconindex = this._icons.indexOf(icon);
    this._icons.splice(iconindex, 1);

    this._toggleContainer();
  },

  _toggleContainer() {
    let hidden = this._iconsBoxLayout.get_n_children() == 0;
    toggleWidget(this._iconsContainer.actor, hidden);
  },

  _transformIcon(icon) {
    icon.set_reactive(true);
    icon.set_size(this._iSize, this._iSize);

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
    this._icons.forEach(icon => { this._desaturateIcon(icon) });
  }
});
