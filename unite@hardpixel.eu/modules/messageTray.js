const GObject   = imports.gi.GObject;
const Clutter   = imports.gi.Clutter;
const Main      = imports.ui.main;
const Unite     = imports.misc.extensionUtils.getCurrentExtension();
const Base      = Unite.imports.module.BaseModule;
const scaleSize = Unite.imports.helpers.scaleSize;

var MessageTray = new GObject.Class({
  Name: 'UniteMessageTray',
  Extends: Base,

  _enableKey: 'notifications-position',
  _disableValue: 'center',

  _onInitialize() {
    this._banner = Main.messageTray._bannerBin;
  },

  _onActivate() {
    let mappings = { center: 'CENTER', left: 'START', right: 'END' };
    let position = mappings[this._setting] || 'CENTER';

    this._banner.set_x_align(Clutter.ActorAlign[position]);
    this._banner.set_width(scaleSize(390));
  },

  _onDeactivate() {
    this._banner.set_x_align(Clutter.ActorAlign.CENTER);
    this._banner.set_width(-1);
  }
});
