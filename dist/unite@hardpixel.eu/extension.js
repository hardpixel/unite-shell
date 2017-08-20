const ExtensionUtils = imports.misc.extensionUtils;
const Me             = ExtensionUtils.getCurrentExtension();
const Decoration     = Me.imports.decoration;
const Buttons        = Me.imports.buttons;
const AppMenu        = Me.imports.app_menu;
const LeftBox        = Me.imports.left_box;
const TopIcons       = Me.imports.top_icons;
const ShowWindow     = Me.imports.show_window;

function init(extensionMeta) {
  Buttons.init(extensionMeta);
  Decoration.init(extensionMeta);
  AppMenu.init(extensionMeta);
  LeftBox.init(extensionMeta);
  TopIcons.init(extensionMeta);
  ShowWindow.init(extensionMeta);
}

function enable() {
  Buttons.enable();
  Decoration.enable();
  AppMenu.enable();
  LeftBox.enable();
  TopIcons.enable();
  ShowWindow.enable();
}

function disable() {
  AppMenu.disable();
  Decoration.disable();
  Buttons.disable();
  LeftBox.disable();
  TopIcons.disable();
  ShowWindow.disable();
}
