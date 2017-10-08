const Lang             = imports.lang;
const Main             = imports.ui.main;
const ExtensionUtils   = imports.misc.extensionUtils;
const Unite            = ExtensionUtils.getCurrentExtension();
const ActivateWindow   = Unite.imports.modules.activateWindow.ActivateWindow;
const ExtendLeftBox    = Unite.imports.modules.extendLeftBox.ExtendLeftBox;
const MessageTray      = Unite.imports.modules.messageTray.MessageTray;
const ActivitiesButton = Unite.imports.modules.activitiesButton.ActivitiesButton;
const AppMenu          = Unite.imports.modules.appMenu.AppMenu;
const WindowButtons    = Unite.imports.modules.windowButtons.WindowButtons;
const WindowDecoration = Unite.imports.modules.windowDecoration.WindowDecoration;
const TopIcons         = Unite.imports.modules.topIcons.TopIcons;

var UniteShell = new Lang.Class({
  Name: 'Unite',

  _init: function() {
    this._activateWindow   = new ActivateWindow();
    this._extendLeftBox    = new ExtendLeftBox();
    this._messageTray      = new MessageTray();
    this._activitiesButton = new ActivitiesButton();
    this._appMenu          = new AppMenu();
    this._windowButtons    = new WindowButtons();
    this._windowDecoration = new WindowDecoration();
    this._topIcons         = new TopIcons();

    Main.loadTheme();
  },

  destroy: function() {
    this._activateWindow.destroy();
    this._extendLeftBox.destroy();
    this._messageTray.destroy();
    this._activitiesButton.destroy();
    this._appMenu.destroy();
    this._windowButtons.destroy();
    this._windowDecoration.destroy();
    this._topIcons.destroy();

    Main.loadTheme();
  }
});

let uniteShell;

function enable() {
  uniteShell = new UniteShell();
};

function disable() {
  uniteShell.destroy();
  uniteShell = null;
};
