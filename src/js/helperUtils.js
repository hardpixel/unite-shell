const Config = imports.misc.config;
const Meta   = imports.gi.Meta;

function getXWindow(win) {
  try {
    return win.get_description().match(/0x[0-9a-f]+/)[0];
  } catch (err) {
    return null;
  }
}

function getAllWindows() {
  let actors  = global.get_window_actors().map(function (w) { return w.meta_window; });
  let windows = actors.filter(function(w) { return w.window_type !== Meta.WindowType.DESKTOP; });

  return windows;
}

function versionCompare(v1, v2) {
  let v1parts   = ('' + v1).split('.')
  let v2parts   = ('' + v2).split('.')
  let minLength = Math.min(v1parts.length, v2parts.length)

  let i, p1, p2;

  for (i = 0; i < minLength; i++) {
    p1 = parseInt(v1parts[i], 10);
    p2 = parseInt(v2parts[i], 10);

    if (isNaN(p1)) { p1 = v1parts[i]; }
    if (isNaN(p2)) { p2 = v2parts[i]; }

    if (p1 === p2) {
      continue;
    } else if (p1 > p2) {
      return 1;
    } else if (p1 < p2) {
      return -1;
    } else {
      return NaN;
    }
  }

  if (v1parts.length === v2parts.length) {
    return 0;
  } else {
    return (v1parts.length < v2parts.length) ? -1 : 1;
  }
}

function versionEQ(ver) {
  return versionCompare(Config.PACKAGE_VERSION, ver) === 0;
}

function versionLT(ver) {
  return versionCompare(Config.PACKAGE_VERSION, ver) < 0;
}

function versionGT(ver) {
  return versionCompare(Config.PACKAGE_VERSION, ver) > 0;
}
