const Lang = imports.lang;
const Main = imports.ui.main;

var ActivateWindow = new Lang.Class({
  Name: 'ActivateWindow',
  _handlerID: null,

  _init: function() {
    this._handlerID = global.display.connect(
      'window-demands-attention', Lang.bind(this, this._activate)
    );
  },

  _activate: function (actor, win) {
    Main.activateWindow(win);
  },

  destroy: function() {
    global.display.disconnect(this._handlerID);
  }
});
