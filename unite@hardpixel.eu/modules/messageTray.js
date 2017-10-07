const Lang    = imports.lang;
const Main    = imports.ui.main;
const Clutter = imports.gi.Clutter;

var MessageTray = new Lang.Class({
  Name: 'MessageTray',
  _container: null,

  _init: function() {
    this._container = Main.messageTray._bannerBin;

    this._container.set_x_align(Clutter.ActorAlign.END);
    this._container.set_width(390);
  },

  destroy: function() {
    this._container.set_x_align(Clutter.ActorAlign.CENTER);
    this._container.set_width(0);
  }
});
