const Lang           = imports.lang;
const Main           = imports.ui.main;
const Clutter        = imports.gi.Clutter;
const ExtensionUtils = imports.misc.extensionUtils;
const Unite          = ExtensionUtils.getCurrentExtension();
const Convenience    = Unite.imports.convenience;

var MessageTray = new Lang.Class({
  Name: 'Unite.MessageTray',

  _init: function() {
    this._container = Main.messageTray._bannerBin;
    this._settings  = Convenience.getSettings();

    this._updatePosition();
    this._container.set_width(390);

    this._connectSettings();
  },

  _connectSettings: function () {
    this._settings.connect(
      'changed::notifications-position',
      Lang.bind(this, this._updatePosition)
    );
  },

  _updatePosition: function () {
    this._position = this._settings.get_enum('notifications-position');
    this._alignMessages();
  },

  _alignMessages: function () {
    let alignments = [
      Clutter.ActorAlign.CENTER,
      Clutter.ActorAlign.START,
      Clutter.ActorAlign.END
    ];

    this._container.set_x_align(alignments[this._position]);
  },

  destroy: function() {
    this._container.set_x_align(Clutter.ActorAlign.CENTER);
    this._container.set_width(0);
  }
});
