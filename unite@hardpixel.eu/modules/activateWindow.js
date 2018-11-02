const Lang           = imports.lang;
const Main           = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const Unite          = ExtensionUtils.getCurrentExtension();
const BaseModule     = Unite.imports.module.BaseModule;

var ActivateWindow = new Lang.Class({
  Name: 'Unite.ActivateWindow',
  Extends: BaseModule,
  EnableKey: 'autofocus-windows',
  EnableValue: true,

  _onActivate() {
    this._signals.connect(
      global.display, 'window-demands-attention', this._activateWindow
    );
  },

  _activateWindow(actor, win) {
    Main.activateWindow(win);
  }
});
