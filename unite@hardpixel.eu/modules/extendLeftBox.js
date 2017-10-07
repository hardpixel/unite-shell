const Clutter = imports.gi.Clutter;
const Lang    = imports.lang;
const Main    = imports.ui.main;
const Panel   = Main.panel;

var ExtendLeftBox = new Lang.Class({
  Name: 'ExtendLeftBox',

  _init: function() {
    this._handlerID = Panel.actor.connect('allocate', Lang.bind(this, this._extend));
  },

  _extend: function (actor, box, flags) {
    let allocWidth  = box.x2 - box.x1;
    let allocHeight = box.y2 - box.y1;

    let [leftMinWidth, leftNaturalWidth]     = Panel._leftBox.get_preferred_width(-1);
    let [centerMinWidth, centerNaturalWidth] = Panel._centerBox.get_preferred_width(-1);
    let [rightMinWidth, rightNaturalWidth]   = Panel._rightBox.get_preferred_width(-1);

    let sideWidth = allocWidth - rightNaturalWidth - centerNaturalWidth;
    let childBox  = new Clutter.ActorBox();

    childBox.y1 = 0;
    childBox.y2 = allocHeight;

    if (Panel.actor.get_text_direction() == Clutter.TextDirection.RTL) {
      childBox.x1 = allocWidth - Math.min(Math.floor(sideWidth), leftNaturalWidth);
      childBox.x2 = allocWidth;
    } else {
      childBox.x1 = 0;
      childBox.x2 = Math.min(Math.floor(sideWidth), leftNaturalWidth);
    }

    Panel._leftBox.allocate(childBox, flags);

    childBox.y1 = 0;
    childBox.y2 = allocHeight;

    if (Panel.actor.get_text_direction() == Clutter.TextDirection.RTL) {
      childBox.x1 = rightNaturalWidth;
      childBox.x2 = childBox.x1 + centerNaturalWidth;
    } else {
      childBox.x1 = allocWidth - centerNaturalWidth - rightNaturalWidth;
      childBox.x2 = childBox.x1 + centerNaturalWidth;
    }

    Panel._centerBox.allocate(childBox, flags);

    childBox.y1 = 0;
    childBox.y2 = allocHeight;

    if (Panel.actor.get_text_direction() == Clutter.TextDirection.RTL) {
      childBox.x1 = 0;
      childBox.x2 = rightNaturalWidth;
    } else {
      childBox.x1 = allocWidth - rightNaturalWidth;
      childBox.x2 = allocWidth;
    }

    Panel._rightBox.allocate(childBox, flags);
  },

  destroy: function() {
    Panel.actor.disconnect(this._handlerID);
  }
});
