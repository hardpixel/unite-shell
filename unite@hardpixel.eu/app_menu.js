const Lang     = imports.lang;
const Main     = imports.ui.main;
const Mainloop = imports.mainloop;
const Shell    = imports.gi.Shell;
const St       = imports.gi.St;
const Tweener  = imports.ui.tweener;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Util = Me.imports.util;

let appMenu = null;

function updateAppMenu() {
  let win = global.display.focus_window;

  if (!win) {
    return false;
  }

  let title = win.title;

  // Not the topmost maximized window.
  if (win !== Util.getWindow()) {
    let app = Shell.WindowTracker.get_default().get_window_app(win);
    title   = app.get_name();
  }

  appMenu._label.set_text(title);
  tooltip.text = title;

  return false;
}

let activeWindow = null;
let awCallbackID = 0;

function changeActiveWindow(win) {
  if (win === activeWindow) {
    return;
  }

  if (activeWindow) {
    activeWindow.disconnect(awCallbackID);
  }

  activeWindow = win;

  if (win) {
    awCallbackID = win.connect('notify::title', updateAppMenu);
    updateAppMenu();
  }
}

function onFocusChange() {
  let input_mode_check = (global.stage_input_mode === undefined) ? true : global.stage_input_mode == Shell.StageInputMode.FOCUSED;

  if (!Shell.WindowTracker.get_default().focus_app && input_mode_check) {
    return false;
  }

  changeActiveWindow(global.display.focus_window);
  return false;
}

let tooltip     = null;
let showTooltip = false;

let SHOW_DELAY    = 350;
let SHOW_DURATION = 0.15;
let HIDE_DURATION = 0.1;

let tooltipDelayCallbackID = 0;
let menuCallbackID         = 0;

function onAppMenuHover(actor) {
  let hover = actor.get_hover();

  if (showTooltip === hover) {
    return false;
  }

  showTooltip = hover;

  if (showTooltip) {
    tooltipDelayCallbackID = Mainloop.timeout_add(SHOW_DELAY, function() {
      let label = appMenu._label._label;

      if(!label.get_clutter_text().get_layout().is_ellipsized()) {
        tooltipDelayCallbackID = 0;
        return false;
      }

      Main.uiGroup.add_actor(tooltip);

      menuCallbackID = appMenu.menu.connect('open-state-changed', function(menu, open) {
        if (open) {
          Main.uiGroup.remove_actor(tooltip);
        } else {
          Main.uiGroup.add_actor(tooltip);
        }
      });

      [bx, by] = label.get_transformed_position();
      [w , h] = label.get_transformed_size();

      let y = by + h + 5;
      let x = bx - Math.round((tooltip.get_width() - w) / 2);

      tooltip.opacity = 0;
      tooltip.set_position(x, y);

      Tweener.removeTweens(tooltip);
      Tweener.addTween(tooltip, {
        opacity: 255,
        time: SHOW_DURATION,
        transition: 'easeOutQuad',
      });

      return false;
    });
  } else if (tooltipDelayCallbackID > 0) {
    if(!Mainloop.source_remove(tooltipDelayCallbackID)) {
      if(menuCallbackID) {
        appMenu.menu.disconnect(menuCallbackID);
        menuCallbackID = 0;
      }

      Tweener.removeTweens(tooltip);
      Tweener.addTween(tooltip, {
        opacity: 0,
        time: HIDE_DURATION,
        transition: 'easeOutQuad',
        onComplete: function() {
          Main.uiGroup.remove_actor(tooltip);
        }
      });
    }

    tooltipDelayCallbackID = 0;
  }

  return false;
}

function init() {
  tooltip = new St.Label({
    style_class: 'tooltip dash-label',
    text: '',
  });
}

let wmCallbackIDs     = [];
let focusCallbackID   = 0;
let tooltipCallbackID = 0;

function enable() {
  tooltip.opacity = 0;
  appMenu         = Main.panel.statusArea.appMenu;
  focusCallbackID = Shell.WindowTracker.get_default().connect('notify::focus-app', onFocusChange);

  try {
    // Gnome 3.16
    wmCallbackIDs.push(global.window_manager.connect('maximize', updateAppMenu));
    wmCallbackIDs.push(global.window_manager.connect('unmaximize', updateAppMenu));
  } catch (e) {
    // Gnome 3.18
    wmCallbackIDs.push(global.window_manager.connect('size-change', updateAppMenu));
  }

  // note: 'destroy' needs a delay for .list_windows() report correctly
  wmCallbackIDs.push(global.window_manager.connect('destroy', function () {
    Mainloop.idle_add(updateAppMenu);
  }));

  tooltipCallbackID = appMenu.actor.connect('notify::hover', onAppMenuHover);
}

function disable() {
  appMenu.actor.disconnect(tooltipCallbackID);

  Shell.WindowTracker.get_default().disconnect(focusCallbackID);
  focusCallbackID = 0;

  for (let i = 0; i < wmCallbackIDs.length; ++i) {
    global.window_manager.disconnect(wmCallbackIDs[i]);
  }

  wmCallbackIDs = [];

  if(activeWindow) {
    activeWindow.disconnect(awCallbackID);
    awCallbackID = 0;
    activeWindow = null;
  }

  if(tooltipDelayCallbackID) {
    Mainloop.source_remove(tooltipDelayCallbackID);
    tooltipDelayCallbackID = 0;
  }

  if(menuCallbackID) {
    appMenu.menu.disconnect(menuCallbackID);
    menuCallbackID = 0;
  }

  Main.uiGroup.remove_actor(tooltip);
}
