const Clutter = imports.gi.Clutter;
const Main    = imports.ui.main;

let panelConnectId;
let panel;

function init(extensionMeta) {
  panel = Main.panel;
}

function enable() {
  panelConnectId = panel.actor.connect('allocate', allocate);
}

function disable() {
  panel.actor.disconnect(panelConnectId);
}

function allocate(actor, box, flags) {
  let allocWidth  = box.x2 - box.x1;
  let allocHeight = box.y2 - box.y1;

  let [leftMinWidth, leftNaturalWidth]     = panel._leftBox.get_preferred_width(-1);
  let [centerMinWidth, centerNaturalWidth] = panel._centerBox.get_preferred_width(-1);
  let [rightMinWidth, rightNaturalWidth]   = panel._rightBox.get_preferred_width(-1);

  let sideWidth = allocWidth - rightNaturalWidth - centerNaturalWidth;
  let childBox  = new Clutter.ActorBox();

  childBox.y1 = 0;
  childBox.y2 = allocHeight;

  if (panel.actor.get_text_direction() == Clutter.TextDirection.RTL) {
    childBox.x1 = allocWidth - Math.min(Math.floor(sideWidth), leftNaturalWidth);
    childBox.x2 = allocWidth;
  } else {
    childBox.x1 = 0;
    childBox.x2 = Math.min(Math.floor(sideWidth), leftNaturalWidth);
  }

  panel._leftBox.allocate(childBox, flags);

  childBox.y1 = 0;
  childBox.y2 = allocHeight;

  if (panel.actor.get_text_direction() == Clutter.TextDirection.RTL) {
    childBox.x1 = rightNaturalWidth;
    childBox.x2 = childBox.x1 + centerNaturalWidth;
  } else {
    childBox.x1 = allocWidth - centerNaturalWidth - rightNaturalWidth;
    childBox.x2 = childBox.x1 + centerNaturalWidth;
  }

  panel._centerBox.allocate(childBox, flags);

  childBox.y1 = 0;
  childBox.y2 = allocHeight;

  if (panel.actor.get_text_direction() == Clutter.TextDirection.RTL) {
    childBox.x1 = 0;
    childBox.x2 = rightNaturalWidth;
  } else {
    childBox.x1 = allocWidth - rightNaturalWidth;
    childBox.x2 = allocWidth;
  }

  panel._rightBox.allocate(childBox, flags);
}
