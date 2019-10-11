const Gtk          = imports.gi.Gtk
const Main         = imports.ui.main
const Unite        = imports.misc.extensionUtils.getCurrentExtension()
const Base         = Unite.imports.module.BaseModule
const minorVersion = Unite.imports.helpers.minorVersion

var ThemeMods = class ThemeMods extends Base {
  _onInitialize() {
    this.gtkSettings = Gtk.Settings.get_default()
    this._extraSpace = minorVersion < 34
    this._appMenu    = Main.panel.statusArea.appMenu
    this._aggMenu    = Main.panel.statusArea.aggregateMenu
    this._leftBox    = Main.panel._leftBox
    this._centerBox  = Main.panel._centerBox
    this._rightBox   = Main.panel._rightBox
    this._uiStyles   = {}
  }

  _onActivate() {
    this._signals.connect(this.gtkSettings, 'notify::gtk-font-name', 'setPanelStyle')
    this._signals.connect(this._leftBox, 'actor_added', 'removePanelArrows')
    this._signals.connect(this._centerBox, 'actor_added', 'removePanelArrows')
    this._signals.connect(this._rightBox, 'actor_added', 'removePanelArrows')

    this._settings.connect('use-system-fonts', 'setPanelStyle')
    this._settings.connect('reduce-panel-spacing', 'setPanelStyle')
    this._settings.connect('hide-app-menu-icon', 'toggleAppMenuIcon')
    this._settings.connect('hide-dropdown-arrows', 'togglePanelArrows')
    this._settings.connect('hide-aggregate-menu-arrow', 'toggleAggMenuArrow')
    this._settings.connect('hide-app-menu-arrow', 'toggleAppMenuArrow')

    this._setExtraSpace()

    this._toggleAppMenuIcon()
    this._togglePanelArrows()
    this._toggleAggMenuArrow()
    this._toggleAppMenuArrow()

    this._setPanelStyle()
  }

  _onDeactivate() {
    this._unsetExtraSpace()

    this._resetAppMenuIcon()
    this._resetPanelArrows()
    this._resetAggMenuArrow()
    this._resetAppMenuArrow()

    this._unsetPanelStyle()
  }

  _setExtraSpace() {
    if (this._extraSpace) {
      this._addClass('extra-spacing')
    }
  }

  _unsetExtraSpace() {
    if (this._extraSpace) {
      this._removeClass('extra-spacing')
    }
  }

  _setPanelStyle() {
    this._unsetPanelStyle()

    const fonts = this._settings.get('use-system-fonts')
    const space = this._settings.get('reduce-panel-spacing')

    if (!fonts && !space) return

    if (fonts) {
      const gtkFont = this.gtkSettings.gtk_font_name
      const cssFont = gtkFont.replace(/\s\d+$/, '')

      this._addStyle('uiGroup', `font-family: ${cssFont};`)
      this._addClass('system-fonts')
    }

    if (space) {
      this._addClass('small-spacing')
    }

    this._addStyle('panel', 'font-size: 11.25pt;')
  }

  _unsetPanelStyle() {
    this._removeClass('small-spacing')
    this._removeClass('system-fonts')

    this._removeStyle('uiGroup')
    this._removeStyle('panel')
  }

  _toggleAppMenuIcon() {
    const enabled = this._settings.get('hide-app-menu-icon')

    if (enabled) {
      this._appMenu._iconBox.hide()
    } else {
      this._resetAppMenuIcon()
    }
  }

  _resetAppMenuIcon() {
    this._appMenu._iconBox.show()
  }

  _getWidgetArrow(widget) {
    let arrow = widget._arrow

    if (!arrow) {
      const last  = widget.get_n_children() - 1
      const actor = widget.get_children()[last]

      if (!actor) return

      if (actor.has_style_class_name && actor.has_style_class_name('popup-menu-arrow'))
        arrow = actor
      else
        arrow = this._getWidgetArrow(actor)
    }

    if (arrow && !widget.hasOwnProperty('_arrow'))
      widget._arrow = arrow

    return arrow
  }

  _toggleWidgetArrow(widget, hide) {
    if (!widget) return

    const arrow = this._getWidgetArrow(widget)
    if (!arrow) return

    if (hide && !widget._arrowHandled) {
      arrow.visible = false
      widget._arrowHandled = true
    }

    if (!hide && widget._arrowHandled) {
      arrow.visible = true
      delete widget._arrowHandled
    }
  }

  _removePanelArrows() {
    for (const [name, widget] of Object.entries(Main.panel.statusArea)) {
      if (name != 'aggregateMenu' && name != 'appMenu') {
        this._toggleWidgetArrow(widget, true)
      }
    }
  }

  _resetPanelArrows() {
    for (const [name, widget] of Object.entries(Main.panel.statusArea)) {
      if (name != 'aggregateMenu' && name != 'appMenu') {
        this._toggleWidgetArrow(widget, false)
      }
    }
  }

  _togglePanelArrows() {
    const enabled = this._settings.get('hide-dropdown-arrows')

    if (enabled) {
      this._removePanelArrows()
    } else {
      this._resetPanelArrows()
    }
  }

  _toggleAggMenuArrow() {
    const enabled = this._settings.get('hide-aggregate-menu-arrow')

    if (enabled) {
      this._toggleWidgetArrow(this._aggMenu, true)
    } else {
      this._resetAggMenuArrow()
    }
  }

  _resetAggMenuArrow() {
    this._toggleWidgetArrow(this._aggMenu, false)
  }

  _toggleAppMenuArrow() {
    const enabled = this._settings.get('hide-app-menu-arrow')

    if (enabled) {
      this._toggleWidgetArrow(this._appMenu, true)
    } else {
      this._resetAppMenuArrow()
    }
  }

  _resetAppMenuArrow() {
    this._toggleWidgetArrow(this._appMenu, false)
  }

  _addClass(name) {
    Main.panel._addStyleClassName(name)
  }

  _removeClass(name) {
    Main.panel._removeStyleClassName(name)
  }

  _addStyle(name, style) {
    this._uiStyles[name] = style

    let widget = Main[name]
    let styles = widget.get_style() || ''

    widget.set_style(style + styles)
  }

  _removeStyle(name) {
    let style = this._uiStyles[name]
    if (!style) return

    let widget = Main[name]
    let styles = widget.get_style() || ''

    widget.set_style(styles.replace(style, ''))

    delete this._uiStyles[name]
  }
}
