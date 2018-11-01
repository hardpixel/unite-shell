const Lang           = imports.lang;
const Clutter        = imports.gi.Clutter;
const Main           = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const Unite          = ExtensionUtils.getCurrentExtension();
const BaseModule     = Unite.imports.module.BaseModule;

var ExtendLeftBox = new Lang.Class({
  Name: 'Unite.ExtendLeftBox',
  Extends: BaseModule,

  _onActivate() {
    this._signals.connect(Main.panel.actor, 'allocate', this._extendBox);
  },

  _onReload() {
    Main.panel.actor.queue_relayout();
  },

  _extendBox(actor, box, flags) {
    let leftBox   = Main.panel._leftBox;
    let centerBox = Main.panel._centerBox;
    let rightBox  = Main.panel._rightBox;

    let allocWidth  = box.x2 - box.x1;
    let allocHeight = box.y2 - box.y1;

    let [leftMinWidth, leftNaturalWidth]     = leftBox.get_preferred_width(-1);
    let [centerMinWidth, centerNaturalWidth] = centerBox.get_preferred_width(-1);
    let [rightMinWidth, rightNaturalWidth]   = rightBox.get_preferred_width(-1);

    let sideWidth = allocWidth - rightNaturalWidth - centerNaturalWidth;
    let childBox  = new Clutter.ActorBox();

    childBox.y1 = 0;
    childBox.y2 = allocHeight;

    if (actor.get_text_direction() == Clutter.TextDirection.RTL) {
      childBox.x1 = allocWidth - Math.min(Math.floor(sideWidth), leftNaturalWidth);
      childBox.x2 = allocWidth;
    } else {
      childBox.x1 = 0;
      childBox.x2 = Math.min(Math.floor(sideWidth), leftNaturalWidth);
    }

    leftBox.allocate(childBox, flags);

    childBox.y1 = 0;
    childBox.y2 = allocHeight;

    if (actor.get_text_direction() == Clutter.TextDirection.RTL) {
      childBox.x1 = rightNaturalWidth;
      childBox.x2 = childBox.x1 + centerNaturalWidth;
    } else {
      childBox.x1 = allocWidth - centerNaturalWidth - rightNaturalWidth;
      childBox.x2 = childBox.x1 + centerNaturalWidth;
    }

    centerBox.allocate(childBox, flags);

    childBox.y1 = 0;
    childBox.y2 = allocHeight;

    if (actor.get_text_direction() == Clutter.TextDirection.RTL) {
      childBox.x1 = 0;
      childBox.x2 = rightNaturalWidth;
    } else {
      childBox.x1 = allocWidth - rightNaturalWidth;
      childBox.x2 = allocWidth;
    }

    rightBox.allocate(childBox, flags);
  }
});
