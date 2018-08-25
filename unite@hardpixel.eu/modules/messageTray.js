const Lang           = imports.lang;
const Main           = imports.ui.main;
const Clutter        = imports.gi.Clutter;
const MessageBanner  = Main.messageTray._bannerBin;
const ExtensionUtils = imports.misc.extensionUtils;
const Unite          = ExtensionUtils.getCurrentExtension();
const Helpers        = Unite.imports.helpers;
const Convenience    = Unite.imports.convenience;

var MessageTray = new Lang.Class({
  Name: 'Unite.MessageTray',

  _init: function() {
    this._settings = Convenience.getSettings();

    this._toggle();
    this._connectSettings();
  },

  _connectSettings: function () {
    this._npHandlerID = this._settings.connect(
      'changed::notifications-position', Lang.bind(this, this._toggle)
    );
  },

  _disconnectSettings: function() {
    if (this._npHandlerID) {
      this._settings.disconnect(this._npHandlerID);
      delete this._npHandlerID;
    }
  },

  _updatePosition: function () {
    let alignments = {
      center: Clutter.ActorAlign.CENTER,
      left:   Clutter.ActorAlign.START,
      right:  Clutter.ActorAlign.END
    };

    MessageBanner.set_x_align(alignments[this._position]);
  },

  _resetPosition: function () {
    MessageBanner.set_x_align(Clutter.ActorAlign.CENTER);
  },

  _updateWidth: function () {
    let width = Helpers.scaleSize(390);
    MessageBanner.set_width(width);
  },

  _resetWidth: function () {
    MessageBanner.set_width(-1);
  },

  _toggle: function() {
    this._deactivate();
    this._activate();
  },

  _activate: function () {
    this._position = this._settings.get_string('notifications-position');

    if (this._position != 'center') {
      this._updatePosition();
      this._updateWidth();
    }
  },

  _deactivate: function() {
    this._resetPosition();
    this._resetWidth();
  },

  destroy: function() {
    this._deactivate();
    this._disconnectSettings();
  }
});
