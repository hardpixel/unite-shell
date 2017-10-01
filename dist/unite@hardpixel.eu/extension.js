const Lang             = imports.lang;
const Main             = imports.ui.main;
const ExtensionUtils   = imports.misc.extensionUtils;
const Unite            = ExtensionUtils.getCurrentExtension();
const ActivateWindow   = Unite.imports.activateWindow.ActivateWindow;
const ExtendLeftBox    = Unite.imports.extendLeftBox.ExtendLeftBox;
const AppMenu          = Unite.imports.appMenu.AppMenu;
const WindowButtons    = Unite.imports.windowButtons.WindowButtons;
const WindowDecoration = Unite.imports.windowDecoration.WindowDecoration;
const TopIcons         = Unite.imports.topIcons.TopIcons;

const UniteShell = new Lang.Class({
  Name: 'UniteShell',
  _activateWindow: null,
  _extendLeftBox: null,
  _appMenu: null,
  _windowButtons: null,
  _windowDecoration: null,
  _topIcons: null,

  _init: function() {
    this._activateWindow   = new ActivateWindow();
    this._extendLeftBox    = new ExtendLeftBox();
    this._appMenu          = new AppMenu();
    this._windowButtons    = new WindowButtons();
    this._windowDecoration = new WindowDecoration();
    this._topIcons         = new TopIcons();

    Main.loadTheme();
  },

  destroy: function() {
    this._activateWindow.destroy();
    this._extendLeftBox.destroy();
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
};
