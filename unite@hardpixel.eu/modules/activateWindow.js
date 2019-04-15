const GObject = imports.gi.GObject;
const Main    = imports.ui.main;
const Unite   = imports.misc.extensionUtils.getCurrentExtension();
const Base    = Unite.imports.module.BaseModule;

var ActivateWindow = new GObject.Class({
  Name: 'UniteActivateWindow',
  Extends: Base,

  _enableKey: 'autofocus-windows',
  _enableValue: true,

  _onActivate() {
    this._signals.connect(global.display, 'window-demands-attention', 'focusWindow');
  },

  _focusWindow(actor, win) {
    Main.activateWindow(win, global.get_current_time());
  }
});
