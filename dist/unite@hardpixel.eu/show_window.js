const Main = imports.ui.main;

let handler;

function init(extensionMeta) {}

function enable() {
  handler = global.display.connect('window-demands-attention', function(a, window) {
    Main.activateWindow(window);
  });
}

function disable() {
  global.display.disconnect(handler);
}
