const Main       = imports.ui.main;
const Meta       = imports.gi.Meta;
const Shell      = imports.gi.Shell;
const Gio        = imports.gi.Gio;
const Mainloop   = imports.mainloop;
const St         = imports.gi.St;
const Clutter    = imports.gi.Clutter;
const Util       = imports.misc.util;
const Lang       = imports.lang;
const PanelMenu  = imports.ui.panelMenu;
const DCONF_META = 'org.gnome.desktop.wm.preferences';
const MAXIMIZED  = Meta.MaximizeFlags.BOTH;

let wtracker;
let panel;
let appmenu;
let mtray;
let tray;

function init(extensionMeta) {
  wtracker = Shell.WindowTracker.get_default();
  panel    = Main.panel;
  appmenu  = panel.statusArea.appMenu;
  mtray    = Main.messageTray;
  tray     = Main.legacyTray;
}

function enable() {
  Main.loadTheme();

  enableShowWindow();
  enableLeftBox();
  enableButtons();
  enableAppMenu();
  enableDecoration();
  enableTopIcons();
}

function disable() {
  disableShowWindow();
  disableLeftBox();
  disableButtons();
  disableAppMenu();
  disableDecoration();
  disableTopIcons();
}
