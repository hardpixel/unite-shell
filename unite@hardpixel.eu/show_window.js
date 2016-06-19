const WindowAttentionHandler = imports.ui.windowAttentionHandler;
const Shell = imports.gi.Shell;
const Main = imports.ui.main;

let handler

function init(extensionMeta)
{
}

function enable()
{
	windowtracker = Shell.WindowTracker.get_default();
	handler = global.display.connect('window-demands-attention', function(a,window) {
		Main.activateWindow(window);
	});
}

function disable()
{
	global.display.disconnect(handler)
}
