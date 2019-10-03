const GObject      = imports.gi.GObject;
const Gtk          = imports.gi.Gtk;
const Main         = imports.ui.main;
const Unite        = imports.misc.extensionUtils.getCurrentExtension();
const Base         = Unite.imports.module.BaseModule;
const versionCheck = Unite.imports.helpers.versionCheck;

var ThemeMods = new GObject.Class({
  Name: 'UniteThemeMods',
  Extends: Base,

  _onInitialize() {
    this.gtkSettings = Gtk.Settings.get_default();
    this._extraSpace = versionCheck('< 3.34.0');
    this._mainStyles = Main.uiGroup.get_style();
    this._appMenu    = Main.panel.statusArea.appMenu;
    this._aggMenu    = Main.panel.statusArea.aggregateMenu;
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
    this._settings.connect('hide-app-menu-icon', 'toggleAppMenuIcon');
    this._settings.connect('fix-panel-spacing', 'togglePanelSpacing');
    this._settings.connect('hide-dropdown-arrows', 'togglePanelArrows');
    this._settings.connect('hide-aggregate-menu-arrow', 'toggleAggMenuArrow');

    this._setShellFont();
    this._toggleAppMenuIcon();
    this._togglePanelSpacing();
    this._togglePanelArrows();
    this._toggleAggMenuArrow();
  },

  _onDeactivate() {
    this._resetShellFont();
    this._resetAppMenuIcon();
    this._resetPanelSpacing();
    this._resetPanelArrows();
    this._resetAggMenuArrow();
  },

  _setShellFont() {
    const enabled = this._settings.get('use-system-fonts');
    if (!enabled) return;

    const gtkFont = this.gtkSettings.gtk_font_name;
    const cssFont = gtkFont.replace(/\s\d+$/, '');

    Main.uiGroup.set_style(`font-family: ${cssFont};`);
    this._addClass('system-fonts');
  },

  _resetShellFont() {
    Main.uiGroup.set_style(this._mainStyles);
    this._removeClass('system-fonts');
  },

  _updateShellFont() {
    this._resetShellFont();
    this._setShellFont();
  },

  _toggleAppMenuIcon() {
    const enabled = this._settings.get('hide-app-menu-icon');

    if (enabled) {
      this._appMenu._iconBox.hide();
    } else {
      this._resetAppMenuIcon();
    }
  },

  _resetAppMenuIcon() {
    this._appMenu._iconBox.show();
  },

  _togglePanelSpacing() {
    const enabled = this._settings.get('fix-panel-spacing');

    if (enabled) {
      this._addClass('fix-spacing');
    } else {
      this._resetPanelSpacing();
    }

    if (this._extraSpace) {
      this._addClass('extra-spacing');
    }
  },

  _resetPanelSpacing() {
    this._removeClass('fix-spacing');

    if (this._extraSpace) {
      this._removeClass('extra-spacing');
    }
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
    if (!widget) return;

    const arrow = this._getWidgetArrow(widget);
    if (!arrow) return;

    if (hide && !widget._arrowHandled) {
      arrow.visible = false;
      widget._arrowHandled = true;
    }

    if (!hide && widget._arrowHandled) {
      arrow.visible = true;
      delete widget._arrowHandled;
    }
  },

  _removePanelArrows() {
    for (const [name, widget] of Object.entries(Main.panel.statusArea)) {
      if (name != 'aggregateMenu') {
        this._toggleWidgetArrow(widget, true);
      }
    }
  },

  _resetPanelArrows() {
    for (const [name, widget] of Object.entries(Main.panel.statusArea)) {
      if (name != 'aggregateMenu') {
        this._toggleWidgetArrow(widget, false);
      }
    }
  },

  _togglePanelArrows() {
    const enabled = this._settings.get('hide-dropdown-arrows');

    if (enabled) {
      this._removePanelArrows();
    } else {
      this._resetPanelArrows();
    }
  },

  _toggleAggMenuArrow() {
    const enabled = this._settings.get('hide-aggregate-menu-arrow');

    if (enabled) {
      this._toggleWidgetArrow(this._aggMenu, true);
    } else {
      this._resetAggMenuArrow();
    }
  },

  _resetAggMenuArrow() {
    this._toggleWidgetArrow(this._aggMenu, false);
  },

  _addClass(name) {
    Main.panel._addStyleClassName(name);
  },

  _removeClass(name) {
    Main.panel._removeStyleClassName(name);
  }
});
