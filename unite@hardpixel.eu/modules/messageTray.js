const Lang    = imports.lang;
const Clutter = imports.gi.Clutter;
const Main    = imports.ui.main;
const Unite   = imports.misc.extensionUtils.getCurrentExtension();
const Base    = Unite.imports.module.BaseModule;
const Helpers = Unite.imports.helpers;

var MessageTray = new Lang.Class({
  Name: 'Unite.MessageTray',
  Extends: Base,
  EnableKey: 'notifications-position',
  DisableValue: 'center',

  _onInitialize() {
    this._banner = Main.messageTray._bannerBin;
  },

  _onActivate() {
    let mappings = { center: 'CENTER', left: 'START', right: 'END' };
    let position = mappings[this._enabled]

    this._banner.set_x_align(Clutter.ActorAlign[position]);
    this._banner.set_width(this.scaleSize(390));
  },

  _onDeactivate() {
    this._banner.set_x_align(Clutter.ActorAlign.CENTER);
    this._banner.set_width(-1);
  }
});
