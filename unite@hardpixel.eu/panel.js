const Gi         = imports._gi
const GObject    = imports.gi.GObject
const Clutter    = imports.gi.Clutter
const AppSystem  = imports.gi.Shell.AppSystem.get_default()
const WinTracker = imports.gi.Shell.WindowTracker.get_default()
const Main       = imports.ui.main
const Unite      = imports.misc.extensionUtils.getCurrentExtension()
const AppMenu    = Main.panel.statusArea.appMenu
const Activities = Main.panel.statusArea.activities
const Buttons    = Unite.imports.buttons
const Handlers   = Unite.imports.handlers

var PanelExtension = class PanelExtension {
  constructor(settings, key, callback) {
    this.activated = false

    const isActive = () => {
      return callback.call(null, settings.get(key))
    }

    const onChange = () => {
      const active = isActive()

      if (active && !this.activated) {
        this.activated = true
        return this._init()
      }

      if (!active && this.activated) {
        this.activated = false
        return this._destroy()
      }
    }

    this.activate = () => {
      settings.connect(key, onChange.bind(this))
      onChange()
    }

    this.destroy = () => {
      if (this.activated) {
        this._destroy()
        this.activated = false
      }
    }
  }
}

var WindowButtons = class WindowButtons extends PanelExtension {
  constructor({ settings }) {
    const active = val => val != 'never'
    super(settings, 'show-window-buttons', active)
  }

  _init() {
    this.theme    = 'default-dark'
    this.signals  = new Handlers.Signals()
    this.settings = new Handlers.Settings()
    this.styles   = new Handlers.Styles()
    this.controls = new Buttons.WindowControls()

    this.signals.connect(
      Main.overview, 'showing', this._onOverviewShowing.bind(this)
    )

    this.signals.connect(
      Main.overview, 'hiding', this._onOverviewHiding.bind(this)
    )

    this.settings.connect(
      'window-buttons-layout', this._onLayoutChange.bind(this)
    )

    this.settings.connect(
      'window-buttons-position', this._onPositionChange.bind(this)
    )

    this.settings.connect(
      'window-buttons-placement', this._onPositionChange.bind(this)
    )

    this.settings.connect(
      'window-buttons-theme', this._onThemeChange.bind(this)
    )

    Main.panel.addToStatusArea(
      'uniteWindowControls', this.controls, this.index, this.side
    )

    this.controls.setVisible(false)

    this._onLayoutChange()
    this._onPositionChange()
    this._onThemeChange()
  }

  get position() {
    return this.settings.get('window-buttons-position')
  }

  get placement() {
    return this.settings.get('window-buttons-placement')
  }

  get side() {
    const sides = { first: 'left', last: 'right', auto: this.position }
    return sides[this.placement] || this.placement
  }

  get index() {
    if (this.placement == 'first') return 0
    if (this.placement == 'last') return -1

    return null
  }

  get sibling() {
    if (this.side == 'left') {
      return Main.panel.statusArea.appMenu.get_parent()
    } else {
      return Main.panel.statusArea.aggregateMenu.get_parent()
    }
  }

  get container() {
    if (this.side == 'left') {
      return Main.panel._leftBox
    } else {
      return Main.panel._rightBox
    }
  }

  _onOverviewShowing() {
    this.controls.setVisible(false)
  }

  _onOverviewHiding() {
    const focused = global.uniteShell.focusWindow
    this.controls.setVisible(focused && focused.showButtons)
  }

  _onLayoutChange() {
    const buttons = this.settings.get('window-buttons-layout')

    if (this.side == 'right' && this.position == 'left') {
      buttons.reverse()
    }

    this.controls.addButtons(buttons)
  }

  _onPositionChange() {
    const controls = this.controls.container
    controls.reparent(this.container)

    if (this.index != null) {
      this.container.set_child_at_index(controls, this.index)
    } else {
      this.container.set_child_below_sibling(controls, this.sibling)
    }

    this._onLayoutChange()
  }

  _onThemeChange() {
    this.controls.remove_style_class_name(this.theme)

    this.theme = this.settings.get('window-buttons-theme')
    const path = `themes/${this.theme}/stylesheet.css`

    this.styles.addShellStyle('windowButtons', path)
    this.controls.add_style_class_name(this.theme)
  }

  _destroy() {
    this.controls.destroy()

    this.signals.disconnectAll()
    this.settings.disconnectAll()
    this.styles.removeAll()
  }
}

var ExtendLeftBox = class ExtendLeftBox extends PanelExtension {
  constructor({ settings }) {
    const active = val => val == true
    super(settings, 'extend-left-box', active)
  }

  _init() {
    this._default = Main.panel.__proto__.vfunc_allocate

    Main.panel.__proto__[Gi.hook_up_vfunc_symbol]('allocate', (box, flags) => {
      Main.panel.vfunc_allocate.call(Main.panel, box, flags)
      this._allocate(Main.panel, box, flags)
    })

    Main.panel.queue_relayout()
  }

  _allocate(actor, box, flags) {
    let leftBox   = Main.panel._leftBox
    let centerBox = Main.panel._centerBox
    let rightBox  = Main.panel._rightBox

    let allocWidth  = box.x2 - box.x1
    let allocHeight = box.y2 - box.y1

    let [leftMinWidth, leftNaturalWidth]     = leftBox.get_preferred_width(-1)
    let [centerMinWidth, centerNaturalWidth] = centerBox.get_preferred_width(-1)
    let [rightMinWidth, rightNaturalWidth]   = rightBox.get_preferred_width(-1)

    let sideWidth = allocWidth - rightNaturalWidth - centerNaturalWidth
    let childBox  = new Clutter.ActorBox()

    childBox.y1 = 0
    childBox.y2 = allocHeight

    if (actor.get_text_direction() == Clutter.TextDirection.RTL) {
      childBox.x1 = allocWidth - Math.min(Math.floor(sideWidth), leftNaturalWidth)
      childBox.x2 = allocWidth
    } else {
      childBox.x1 = 0
      childBox.x2 = Math.min(Math.floor(sideWidth), leftNaturalWidth)
    }

    leftBox.allocate(childBox, flags)

    childBox.y1 = 0
    childBox.y2 = allocHeight

    if (actor.get_text_direction() == Clutter.TextDirection.RTL) {
      childBox.x1 = rightNaturalWidth
      childBox.x2 = childBox.x1 + centerNaturalWidth
    } else {
      childBox.x1 = allocWidth - centerNaturalWidth - rightNaturalWidth
      childBox.x2 = childBox.x1 + centerNaturalWidth
    }

    centerBox.allocate(childBox, flags)

    childBox.y1 = 0
    childBox.y2 = allocHeight

    if (actor.get_text_direction() == Clutter.TextDirection.RTL) {
      childBox.x1 = 0
      childBox.x2 = rightNaturalWidth
    } else {
      childBox.x1 = allocWidth - rightNaturalWidth
      childBox.x2 = allocWidth
    }

    rightBox.allocate(childBox, flags)
  }

  _destroy() {
    Main.panel.__proto__[Gi.hook_up_vfunc_symbol]('allocate', this._default)
    this._default = null

    Main.panel.queue_relayout()
  }
}

var PanelManager = GObject.registerClass(
  class UnitePanelManager extends GObject.Object {
    _init() {
      this.signals  = new Handlers.Signals()
      this.settings = new Handlers.Settings()

      this.buttons  = new WindowButtons(this)
      this.extender = new ExtendLeftBox(this)

      this.signals.connect(
        Main.overview, 'showing', this.syncButtonWidgets.bind(this)
      )

      this.signals.connect(
        Main.overview, 'hiding', this.syncButtonWidgets.bind(this)
      )

      this.signals.connect(
        AppSystem, 'app-state-changed', this.syncButtonWidgets.bind(this)
      )

      this.signals.connect(
        WinTracker, 'notify::focus-app', this.syncButtonWidgets.bind(this)
      )
    }

    get showDesktop() {
      return this.settings.get('show-desktop-name')
    }

    get hideActivities() {
      return this.settings.get('hide-activities-button')
    }

    syncActivities() {
      const button   = Activities.container
      const overview = Main.overview.visibleTarget

      switch (this.hideActivities) {
        case 'never':
          !button.visible && button.show()
          break
        case 'always':
          button.visible && button.hide()
          break
        default:
          if (this.showDesktop) {
            button.visible = overview
          } else {
            button.visible = overview || AppMenu._targetApp == null
          }
      }
    }

    syncButtonWidgets() {
      this.syncActivities()
    }

    resetButtonWidgets() {
      Activities.container.show()
    }

    activate() {
      this.syncButtonWidgets()

      this.buttons.activate()
      this.extender.activate()
    }

    destroy() {
      this.resetButtonWidgets()

      this.buttons.destroy()
      this.extender.destroy()

      this.signals.disconnectAll()
      this.settings.disconnectAll()
    }
  }
)
