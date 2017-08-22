let showWindowHandler;

function enableShowWindow() {
  showWindowHandler = global.display.connect('window-demands-attention', function (actor, window) {
    Main.activateWindow(window);
  });
}

function disableShowWindow() {
  global.display.disconnect(showWindowHandler);
}
