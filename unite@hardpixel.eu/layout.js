const GObject     = imports.gi.GObject
const St          = imports.gi.St
const Clutter     = imports.gi.Clutter
const GtkSettings = imports.gi.Gtk.Settings.get_default()
const Main        = imports.ui.main
const Unite       = imports.misc.extensionUtils.getCurrentExtension()
const AppMenu     = Main.panel.statusArea.appMenu
const AggMenu     = Main.panel.statusArea.aggregateMenu
const Handlers    = Unite.imports.handlers
const VERSION     = Unite.imports.constants.VERSION

function actorHasClass(actor, name) {
  return actor.has_style_class_name && actor.has_style_class_name(name)
}

function getWidgetArrow(widget) {
  let arrow = widget._arrow

  if (!arrow) {
    const last  = widget.get_n_children() - 1
    const actor = widget.get_children()[last]

    if (actor) {
      if (actorHasClass(actor, 'popup-menu-arrow')) {
        arrow = actor
      } else {
        arrow = getWidgetArrow(actor)
      }
    }
  }

  if (arrow && !widget.hasOwnProperty('_arrow')) {
    widget._arrow = arrow
  }

  return arrow
}

function toggleWidgetArrow(widget, hide) {
  const arrow = widget && getWidgetArrow(widget)

  if (arrow) {
    if (hide && !widget._arrowHandled) {
      arrow.visible = false
      widget._arrowHandled = true
    }

    if (!hide && widget._arrowHandled) {
      arrow.visible = true
      delete widget._arrowHandled
    }
  }
}

var Messages = class Messages extends Handlers.Feature {
  constructor() {
    super('notifications-position', setting => setting != 'center')
  }

  activate() {
    this.settings = new Handlers.Settings()

    this.settings.connect(
      'notifications-position', this._onPositionChange.bind(this)
    )

    this._onPositionChange()
  }

  get position() {
    const mapping = { left: 'START', right: 'END' }
    const setting = this.settings.get('notifications-position')

    return mapping[setting]
  }

  _onPositionChange() {
    const banner   = Main.messageTray._bannerBin
    const context  = St.ThemeContext.get_for_stage(global.stage)
    const position = Clutter.ActorAlign[this.position]

    banner.set_x_align(position)
    banner.set_width(390 * context.scale_factor)
  }

  destroy() {
    const banner   = Main.messageTray._bannerBin
    const position = Clutter.ActorAlign.CENTER

    banner.set_x_align(position)
    banner.set_width(-1)

    this.settings.disconnectAll()
  }
}

var AppMenuIcon = class AppMenuIcon extends Handlers.Feature {
  constructor() {
    super('hide-app-menu-icon', setting => setting == true)
  }

  activate() {
    AppMenu._iconBox.hide()
  }

  destroy() {
    AppMenu._iconBox.show()
  }
}

var AppMenuArrow = class AppMenuArrow extends Handlers.Feature {
  constructor() {
    super('hide-app-menu-arrow', setting => VERSION < 40 && setting == true)
  }

  activate() {
    toggleWidgetArrow(AppMenu, true)
  }

  destroy() {
    toggleWidgetArrow(AppMenu, false)
  }
}

var AggMenuArrow = class AggMenuArrow extends Handlers.Feature {
  constructor() {
    super('hide-aggregate-menu-arrow', setting => VERSION < 40 && setting == true)
  }

  activate() {
    toggleWidgetArrow(AggMenu, true)
  }

  destroy() {
    toggleWidgetArrow(AggMenu, false)
  }
}

var DropdownArrows = class DropdownArrows extends Handlers.Feature {
  constructor() {
    super('hide-dropdown-arrows', setting => VERSION < 40 && setting == true)
  }

  activate() {
    this.signals = new Handlers.Signals()

    for (const panelBox of Main.panel.get_children()) {
      this.signals.connect(
        panelBox, 'actor_added', this._onActorAdded.bind(this)
      )
    }

    this._onActorAdded()
  }

  _toggleArrows(hide) {
    for (const [name, widget] of Object.entries(Main.panel.statusArea)) {
      if (name != 'aggregateMenu' && name != 'appMenu') {
        toggleWidgetArrow(widget, hide)
      }
    }
  }

  _onActorAdded() {
    this._toggleArrows(true)
  }

  destroy() {
    this._toggleArrows(false)
    this.signals.disconnectAll()
  }
}

var SystemFonts = class SystemFonts extends Handlers.Feature {
  constructor() {
    super('use-system-fonts', setting => VERSION < 36 && setting == true)
  }

  activate() {
    this.signals = new Handlers.Signals()
    this.styles  = new Handlers.Styles()

    this.signals.connect(
      GtkSettings, 'notify::gtk-font-name', this._onFontsChange.bind(this)
    )

    this._onFontsChange()
  }

  get fontName() {
    return GtkSettings.gtk_font_name.replace(/\s\d+$/, '')
  }

  _resetStyles() {
    Main.panel._removeStyleClassName('system-fonts')
    this.styles.removeAll()
  }

  _onFontsChange() {
    this._resetStyles()

    this.styles.addWidgetStyle('uiGroup', Main.uiGroup, `font-family: ${this.fontName};`)
    this.styles.addWidgetStyle('panel', Main.panel, 'font-size: 11.25pt;')

    Main.panel._addStyleClassName('system-fonts')
  }

  destroy() {
    this.signals.disconnectAll()
    this._resetStyles()
  }
}

var PanelSpacing = class PanelSpacing extends Handlers.Feature {
  constructor() {
    super('reduce-panel-spacing', setting => setting == true)
  }

  activate() {
    this.styles = new Handlers.Styles()
    this._injectStyles()

    Main.panel._addStyleClassName('reduce-spacing')
    this._syncLayout()
  }

  _injectStyles() {
    if (VERSION >= 40) {
      this.styles.addShellStyle('spacing', '@/styles/shell/spacing.css')
    }

    if (VERSION < 40) {
      this.styles.addShellStyle('spacing38', '@/styles/shell/spacing38.css')
    }

    if (VERSION < 34) {
      this.styles.addShellStyle('spacing32', '@/styles/shell/spacing32.css')
    }
  }

  _syncLayout() {
    // Fix dateMenu paddings when reduce spacing enabled
    // when returning from lock screen
    if (VERSION >= 40) {
      const dateMenu = Main.panel.statusArea.dateMenu
      const paddings = this._dateMenuPadding

      if (!paddings) {
        this._dateMenuPadding = [dateMenu._minHPadding, dateMenu._natHPadding]

        dateMenu._minHPadding = 0
        dateMenu._natHPadding = 0
      } else {
        dateMenu._minHPadding = paddings[0]
        dateMenu._natHPadding = paddings[1]

        this._dateMenuPadding = null
      }

      dateMenu.queue_relayout()
    }

    // Fix for panel spacing not applied until mouse-over
    // Issue: https://gitlab.gnome.org/GNOME/gnome-shell/-/issues/1708
    if (VERSION >= 34 && VERSION < 40) {
      Object.values(Main.panel.statusArea).forEach((item) => {
        if (item !== null) {
          item.add_style_pseudo_class('hover')
          item.remove_style_pseudo_class('hover')
        }
      })
    }
  }

  destroy() {
    Main.panel._removeStyleClassName('reduce-spacing')
    this.styles.removeAll()

    this._syncLayout()
  }
}

var LayoutManager = GObject.registerClass(
  class UniteLayoutManager extends GObject.Object {
    _init() {
      this.features = new Handlers.Features()

      this.features.add(Messages)
      this.features.add(AppMenuIcon)
      this.features.add(AppMenuArrow)
      this.features.add(AggMenuArrow)
      this.features.add(DropdownArrows)
      this.features.add(SystemFonts)
      this.features.add(PanelSpacing)
    }

    activate() {
      this.features.activate()
    }

    destroy() {
      this.features.destroy()
    }
  }
)
