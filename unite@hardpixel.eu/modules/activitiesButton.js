const Lang = imports.lang;
const Main = imports.ui.main;

var ActivitiesButton = new Lang.Class({
  Name: 'ActivitiesButton',
  _activities: null,

  _init: function() {
    this._activities = Main.panel.statusArea.activities;
    this._activities.actor.hide();
  },

  destroy: function() {
    this._activities.actor.show();
  }
});
