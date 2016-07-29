const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Decoration = Me.imports.decoration;
const Buttons = Me.imports.buttons;
const AppMenu = Me.imports.app_menu;
const LeftBox = Me.imports.left_box;
const TopIcons = Me.imports.top_icons;
const ShowWindow = Me.imports.show_window;
const StatusArea = Me.imports.status_area;

function init(extensionMeta) {
	Buttons.init(extensionMeta);
	Decoration.init(extensionMeta);
	AppMenu.init(extensionMeta);
	LeftBox.init(extensionMeta);
	TopIcons.init(extensionMeta);
	ShowWindow.init(extensionMeta);
	StatusArea.init(extensionMeta);
}

function enable() {
	Buttons.enable();
	Decoration.enable();
	AppMenu.enable();
	LeftBox.enable();
	TopIcons.enable();
	ShowWindow.enable();
	StatusArea.enable();
}

function disable() {
	AppMenu.disable();
	Decoration.disable();
	Buttons.disable();
	LeftBox.disable();
	TopIcons.disable();
	ShowWindow.disable();
	StatusArea.disable();
}
