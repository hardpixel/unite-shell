const GObject = imports.gi.GObject;
const Gtk     = imports.gi.Gtk;
const Main    = imports.ui.main;
const Unite   = imports.misc.extensionUtils.getCurrentExtension();
const Base    = Unite.imports.module.BaseModule;

var ThemeMods = new GObject.Class({
  Name: 'UniteThemeMods',
  Extends: Base,

  _onInitialize() {
    this.gtkSettings = Gtk.Settings.get_default();
    this._mainStyles = Main.uiGroup.get_style();
    this._appMenu    = Main.panel.statusArea.appMenu;
    this._leftBox    = Main.panel._leftBox;
    this._centerBox  = Main.panel._centerBox;
    this._rightBox   = Main.panel._rightBox;
  },

  _onActivate() {
    this._signals.connect(this.gtkSettings, 'notify::gtk-font-name', 'updateShellFont');
    this._signals.connect(this._leftBox, 'actor_added', 'removePanelArrows');
    this._signals.connect(this._centerBox, 'actor_added', 'removePanelArrows');
    this._signals.connect(this._rightBox, 'actor_added', 'removePanelArrows');

    this._settings.connect('use-system-fonts', 'updateShellFont');

    this._setShellFont();
    this._hideAppMenuIcon();
    this._removePanelArrows();
  },

  _onDeactivate() {
    this._resetShellFont();
    this._showAppMenuIcon();
    this._resetPanelArrows();
  },

  _setShellFont() {
    const enabled = this._settings.get('use-system-fonts');
    if (!enabled) return;

    const gtkFont = this.gtkSettings.gtk_font_name;
    const cssFont = gtkFont.replace(/\s\d+$/, '');

    Main.uiGroup.set_style(`font-family: ${cssFont};`);
    Main.panel._addStyleClassName('system-fonts');
  },

  _resetShellFont() {
    Main.uiGroup.set_style(this._mainStyles);
    Main.panel._removeStyleClassName('system-fonts');
  },

  _updateShellFont() {
    this._resetShellFont();
    this._setShellFont();
  },

  _hideAppMenuIcon() {
    this._appMenu._iconBox.hide();
  },

  _showAppMenuIcon() {
    this._appMenu._iconBox.show();
  },

  _getWidgetArrow(widget) {
    let arrow = widget._arrow;

    if (!arrow) {
      const item  = widget.get_children ? widget : widget.actor;
      const last  = item.get_n_children() - 1;
      const actor = item.get_children()[last];

      if (!actor) return;

      if (actor.has_style_class_name && actor.has_style_class_name('popup-menu-arrow'))
        arrow = actor;
      else
        arrow = this._getWidgetArrow(actor);
    }

    if (arrow && !widget.hasOwnProperty('_arrow'))
      widget._arrow = arrow;

    return arrow;
  },

  _toggleWidgetArrow(widget, hide) {
    const arrow = this._getWidgetArrow(widget);
    if (!arrow) return;

    arrow.visible = !hide;
  },

  _removePanelArrows() {
    for (const [name, widget] of Object.entries(Main.panel.statusArea)) {
      if (name != 'aggregateMenu' && widget && !widget._arrowHandled) {
        widget._arrowHandled = true;
        this._toggleWidgetArrow(widget, true);
      }
    }
  },

  _resetPanelArrows() {
    for (const [name, widget] of Object.entries(Main.panel.statusArea)) {
      if (name != 'aggregateMenu' && widget && widget._arrowHandled) {
        this._toggleWidgetArrow(widget, false);
        delete widget._arrowHandled;
      }
    }
  }
});
