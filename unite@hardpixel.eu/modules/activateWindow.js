const Lang  = imports.lang;
const Main  = imports.ui.main;
const Unite = imports.misc.extensionUtils.getCurrentExtension();
const Base  = Unite.imports.module.BaseModule;

var ActivateWindow = new Lang.Class({
  Name: 'Unite.ActivateWindow',
  Extends: Base,
  EnableKey: 'autofocus-windows',
  EnableValue: true,

  _onActivate() {
    let signalName = 'window-demands-attention';
    this._signals.connect(global.display, signalName, this._focusWindow);
  },

  _focusWindow(actor, window) {
    Main.activateWindow(window);
  }
});
