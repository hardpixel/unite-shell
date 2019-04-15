const Gi      = imports._gi;
const GObject = imports.gi.GObject;
const Clutter = imports.gi.Clutter;
const Main    = imports.ui.main;
const Unite   = imports.misc.extensionUtils.getCurrentExtension();
const Base    = Unite.imports.module.BaseModule;

var ExtendLeftBox = new GObject.Class({
  Name: 'UniteExtendLeftBox',
  Extends: Base,

  _enableKey: 'extend-left-box',
  _enableValue: true,

  _onActivate() {
    if (Main.panel.vfunc_allocate) {
      this._vfuncAllocate();
    } else {
      this._signalAllocate();
    }
  },

  _onDeactivate() {
    if (this._oldAllocate) {
      Main.panel.__proto__[Gi.hook_up_vfunc_symbol]('allocate', this._oldAllocate);
      this._oldAllocate = null;
    }
  },

  _onReload() {
    Main.panel.actor.queue_relayout();
  },

  _vfuncAllocate() {
    this._oldAllocate = Main.panel.__proto__.vfunc_allocate;

    Main.panel.__proto__[Gi.hook_up_vfunc_symbol]('allocate', (box, flags) => {
      Main.panel.vfunc_allocate.call(Main.panel, box, flags);
      this._extendBox(Main.panel, box, flags);
    });
  },

  _signalAllocate() {
    this._signals.connect(Main.panel.actor, 'allocate', 'extendBox');
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
