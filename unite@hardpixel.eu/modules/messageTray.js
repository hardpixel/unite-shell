const Lang           = imports.lang;
const Main           = imports.ui.main;
const Clutter        = imports.gi.Clutter;
const St             = imports.gi.St;
const MessageBanner  = Main.messageTray._bannerBin;
const ExtensionUtils = imports.misc.extensionUtils;
const Unite          = ExtensionUtils.getCurrentExtension();
const Convenience    = Unite.imports.convenience;

var MessageTray = new Lang.Class({
  Name: 'Unite.MessageTray',

  _init: function() {
    this._settings = Convenience.getSettings();

    this._toggle();
    this._connectSettings();
  },

  _connectSettings: function () {
    this._settings.connect(
      'changed::notifications-position', Lang.bind(this, this._toggle)
    );
  },

  _updatePosition: function () {
    let alignments = {
      center: Clutter.ActorAlign.CENTER,
      left:   Clutter.ActorAlign.START,
      right:  Clutter.ActorAlign.END
    };

    MessageBanner.set_x_align(alignments[this._position]);
  },

  _updateWidth: function () {
    let scale = St.ThemeContext.get_for_stage(global.stage).scale_factor;
    MessageBanner.set_width(390 * scale);
  },

  _resetWidth: function () {
    MessageBanner.set_width(-1);
  },

  _toggle: function() {
    this._position = this._settings.get_string('notifications-position');
    this._position != 'center' ? this._activate() : this.destroy();
  },

  _activate: function () {
    if (!this._activated) {
      this._activated = true;

      this._updatePosition();
      this._updateWidth();
    }
  },

  destroy: function() {
    if (this._activated) {
      this._activated = false;

      this._updatePosition();
      this._resetWidth();
    }
  }
});
