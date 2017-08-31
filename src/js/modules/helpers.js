function getXWindow(win) {
  let id = null;

  try {
    id = win.get_description().match(/0x[0-9a-f]+/)[0];
  } catch (err) {
    id = null;
  }

  return id;
}

function getAllWindows() {
  let items = global.get_window_actors().map(function (w) { return w.meta_window; })
  return items.filter(function(w) { return w.window_type !== Meta.WindowType.DESKTOP; });
}
