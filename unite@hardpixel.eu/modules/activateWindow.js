const Lang  = imports.lang;
const Main  = imports.ui.main;
const Unite = imports.misc.extensionUtils.getCurrentExtension();
const Base  = Unite.imports.module.BaseModule;

var ActivateWindow = new Lang.Class({
  Name: 'Unite.ActivateWindow',
  Extends: Base,

  _enableKey: 'autofocus-windows',
  _enableValue: true,

  _onActivate() {
    let signalName = 'window-demands-attention';
    this._signals.connect(global.display, signalName, this._focusWindow);
  },

  _focusWindow(actor, win) {
    Main.activateWindow(win);
  }
});
