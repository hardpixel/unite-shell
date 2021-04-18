const GObject  = imports.gi.GObject
const St       = imports.gi.St
const Clutter  = imports.gi.Clutter
const Main     = imports.ui.main
const Unite    = imports.misc.extensionUtils.getCurrentExtension()
const AppMenu  = Main.panel.statusArea.appMenu
const Handlers = Unite.imports.handlers
const Override = Unite.imports.overrides.helper

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

var DropdownArrows = class DropdownArrows extends Handlers.Feature {
  constructor() {
    super('hide-dropdown-arrows', setting => setting == true)
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

var PanelSpacing = class PanelSpacing extends Handlers.Feature {
  constructor() {
    super('reduce-panel-spacing', setting => setting == true)

    Override.inject(this, 'layout', 'PanelSpacing')
  }

  activate() {
    this.styles = new Handlers.Styles()
    this._injectStyles()

    Main.panel._addStyleClassName('reduce-spacing')
    this._syncLayout()
  }

  _injectStyles() {
    this.styles.addShellStyle('spacing', '@/styles/shell/spacing.css')
  }

  _syncLayout() {
    // Fix dateMenu paddings when reduce spacing enabled
    // when returning from lock screen
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
      this.features.add(DropdownArrows)
      this.features.add(PanelSpacing)

      Override.inject(this, 'layout', 'LayoutManager')
    }

    activate() {
      this.features.activate()
    }

    destroy() {
      this.features.destroy()
    }
  }
)
