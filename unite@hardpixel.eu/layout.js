const GObject  = imports.gi.GObject
const St       = imports.gi.St
const Clutter  = imports.gi.Clutter
const Main     = imports.ui.main
const Me       = imports.misc.extensionUtils.getCurrentExtension()
const AppMenu  = Main.panel.statusArea.appMenu
const Handlers = Me.imports.handlers
const Override = Me.imports.overrides.helper

var WidgetArrow = class WidgetArrow {
  constructor(widget) {
    this.widget = widget || {}

    if (!this.widget.hasOwnProperty('_arrow')) {
      this._findActor(this.widget)
    }
  }

  get arrow() {
    return this.widget._arrow || {}
  }

  _findActor(widget) {
    if (widget.hasOwnProperty('_arrow')) {
      return this.widget._arrow = widget._arrow
    }

    const actor = widget.last_child
    const valid = actor && actor.has_style_class_name

    if (valid && actor.has_style_class_name('popup-menu-arrow')) {
      return this.widget._arrow = actor
    }

    actor && this._findActor(actor)
  }

  hide() {
    if (!this.widget._arrowRemoved) {
      this.arrow.visible = false
      this.widget._arrowRemoved = true
    }
  }

  show() {
    if (this.widget._arrowRemoved) {
      this.arrow.visible = true
      delete this.widget._arrowRemoved
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

    Override.inject(this, 'layout', 'AppMenuIconClassic')
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

    Override.inject(this, 'layout', 'DropdownArrows')
  }

  activate() {
    this.signals = new Handlers.Signals()

    const boxes = [
      Main.panel._leftBox,
      Main.panel._centerBox,
      Main.panel._rightBox
    ]

    for (const box of boxes) {
      this.signals.connect(
        box, 'actor_added', this._onActorAdded.bind(this)
      )
    }

    this._onActorAdded()
  }

  get arrows() {
    const items = Main.panel.statusArea
    const names = Object.keys(items).filter(this._handleWidget.bind(this))

    return names.map(name => new WidgetArrow(items[name]))
  }

  _handleWidget(name) {
    return !name.startsWith('unite')
  }

  _onActorAdded() {
    this.arrows.forEach(arrow => arrow.hide())
  }

  destroy() {
    this.arrows.forEach(arrow => arrow.show())
    this.signals.disconnectAll()
  }
}

var PanelSpacing = class PanelSpacing extends Handlers.Feature {
  constructor() {
    super('reduce-panel-spacing', setting => setting == true)

    Override.inject(this, 'layout', 'PanelSpacing')
    Override.inject(this, 'layout', 'PanelSpacingClassic')
  }

  activate() {
    this.styles = new Handlers.Styles()
    this._injectStyles()

    Main.panel.add_style_class_name('reduce-spacing')
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
    Main.panel.remove_style_class_name('reduce-spacing')
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
