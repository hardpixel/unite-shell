const Mainloop = imports.mainloop;
const St = imports.gi.St;
const Shell = imports.gi.Shell;

const Main = imports.ui.main;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

let actorAddedID, styleLine, styleLineStatusIcon, padding, statusIconPadding;

/* Note: the gnome-shell class always overrides any you add in the extension.
 * So doing add_style_class(my_style_with_less_hpadding) doesn't work.
 * However set_style sets the inline style and that works.
 *
 * In GNOME 3.6 the actor with style class 'panel-button' is not the top-level
 * actor; they are all nested into St.Bins.
 *
 * So we have to drill down to find the GenericConainer.
 * However, we only recurse down one level to find the actor with style class
 * 'panel-button' because otherwise we'll spend all day doing it.
 *
 * 3.12+ (when did the aggregateMenu come?)
 * Main.panel.statusArea._indicators.get_children() inherit from SystemIndicator.
 *  get_children() that for the StIcon with class system-status-icon
 */
function overrideStyle(actor, secondTime) {
	// it could be that the first child has the right style class name.
	if (!actor.has_style_class_name ||
			!(actor.has_style_class_name('panel-button') || actor.has_style_class_name('system-status-icon'))) {
		if (secondTime) {
			// if we've already recursed once, then give up (we will only look
			// one level down to find the 'panel-button' actor).
			return;
		}
		let child = actor.get_children();
		if (child.length) {
			overrideStyle(child[0], true);
		}
		return;
	}

	if (actor._original_inline_style_ === undefined) {
		actor._original_inline_style_ = actor.get_style();
	}

	if (actor.has_style_class_name('system-status-icon')) {
		actor.set_style(styleLineStatusIcon + '; ' + (actor._original_inline_style_ || ''));
		actor._sahs_line_style = styleLineStatusIcon;
	} else {
		actor.set_style(styleLine + '; ' + (actor._original_inline_style_ || ''));
		actor._sahs_line_style = styleLine;
	}
	/* listen for the style being set externally so we can re-apply our style */
	// TODO: somehow throttle the number of calls to this - add a timeout with
	// a flag?
	if (!actor._statusAreaHorizontalSpacingSignalID) {
		actor._statusAreaHorizontalSpacingSignalID =
			actor.connect('style-changed', function () {
				let currStyle = actor.get_style();
				if (currStyle && !currStyle.match(actor._sahs_line_style)) {
					// re-save the style (if it has in fact changed)
					actor._original_inline_style_ = currStyle;
					// have to do this or else the overrideStyle call will trigger
					// another call of this, firing an endless series of these signals.
					// TODO: a ._style_pending which prevents it rather than disconnect/connect?
					actor.disconnect(actor._statusAreaHorizontalSpacingSignalID);
					delete actor._statusAreaHorizontalSpacingSignalID;
					overrideStyle(actor);
				}
			});
	}
}

// see the note in overrideStyle about us having to recurse down to the first
// child of `actor` in order to find the container with style class name
// 'panel-button' (applying our style to the parent container won't work).
function restoreOriginalStyle(actor, secondTime) {
	if (!actor.has_style_class_name ||
			!(actor.has_style_class_name('panel-button') || actor.has_style_class_name('system-status-icon'))) {
		if (secondTime) {
			// if we've already recursed once, then give up (we will only look
			// one level down to find the 'panel-button' actor).
			return;
		}
		let child = actor.get_children();
		if (child.length) {
			restoreOriginalStyle(child[0], true);
		}
		return;
	}
	if (actor._statusAreaHorizontalSpacingSignalID) {
		actor.disconnect(actor._statusAreaHorizontalSpacingSignalID);
		delete actor._statusAreaHorizontalSpacingSignalID;
	}
	if (actor._original_inline_style_ !== undefined) {
		actor.set_style(actor._original_inline_style_);
		delete actor._original_inline_style_;
	}
}

function init(extensionMeta) {}

function enable() {
	padding = 6;
	styleLine = '-natural-hpadding: %dpx'.format(padding);

	statusIconPadding = 2;
	styleLineStatusIcon = 'padding-left: %dpx; padding-right: %dpx'.format(statusIconPadding, statusIconPadding)
	// if you set it below 6 and it looks funny, that's your fault!
	if (padding < 6) {
		styleLine += '; -minimum-hpadding: %dpx'.format(padding);
	}

	/* set style for everything in _rightBox */

	//
	let children = Main.panel._rightBox.get_children().concat(Main.panel.statusArea.aggregateMenu._indicators.get_children());
	// Main.panel.statusArea.aggregateMenu._indicators.get_children()

	for (let i = 0; i < children.length; ++i) {
		overrideStyle(children[i]);
	}

	/* connect signal */
	actorAddedID = Main.panel._rightBox.connect('actor-added',
		function (container, actor) {
			overrideStyle(actor);
		}
	);
}

function disable() {
	/* disconnect signal */
	if (actorAddedID) {
		Main.panel._rightBox.disconnect(actorAddedID);
	}
	/* remove style class name. */
	let children = Main.panel._rightBox.get_children().concat(Main.panel.statusArea.aggregateMenu._indicators.get_children());
	for (let i = 0; i < children.length; ++i) {
		restoreOriginalStyle(children[i]);
	}
}
