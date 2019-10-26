const Gi        = imports._gi
const GObject   = imports.gi.GObject
const St        = imports.gi.St
const Clutter   = imports.gi.Clutter
const Main      = imports.ui.main
const PanelMenu = imports.ui.panelMenu
const Unite     = imports.misc.extensionUtils.getCurrentExtension()
const Signals   = Unite.imports.handlers.SignalsHandler
const Settings  = Unite.imports.handlers.SettingsHandler

var DesktopLabel = GObject.registerClass(
  class UniteDesktopLabel extends PanelMenu.Button {
    _init(params = { text: 'Desktop' }) {
      this.params  = params
      this.appMenu = Main.panel.statusArea.appMenu

      super._init(0.0, null, true)

      this._label = new St.Label({ y_align: Clutter.ActorAlign.CENTER })
      this.add_actor(this._label)

      this.reactive = false
      this.label_actor = this._label

      this.setText(params.text)
    }

    setText(text) {
      this._label.set_text(text)
    }

    setVisible(visible) {
      this.container.visible = visible
      this.appMenu.container.visible = !visible
    }
  }
)

var TrayIndicator = GObject.registerClass(
  class UniteTrayIndicator extends PanelMenu.Button {
    _init(params = { size: 20 }) {
      this._icons = []
      this.params = params

      super._init(0.0, null, true)

      this._indicators = new St.BoxLayout({ style_class: 'panel-status-indicators-box' })
      this.add_child(this._indicators)

      this._sync()
    }

    _sync() {
      this.visible = this._icons.length
    }

    addIcon(icon) {
      this._icons.push(icon)

      const mask = St.ButtonMask.ONE | St.ButtonMask.TWO | St.ButtonMask.THREE
      const ibtn = new St.Button({ child: icon, button_mask: mask })

      this._indicators.add_child(ibtn)

      icon.connect('destroy', () => { ibtn.destroy() })
      ibtn.connect('button-release-event', (actor, event) => { icon.click(event) })

      icon.set_reactive(true)
      icon.set_size(this.params.size, this.params.size)

      this._sync()
    }

    removeIcon(icon) {
      const actor = icon.get_parent() || icon
      actor.destroy()

      const index = this._icons.indexOf(icon)
      this._icons.splice(index, 1)

      this._sync()
    }

    forEach(callback) {
      this._icons.forEach(icon => { callback.call(null, icon) })
    }
  }
)

var WindowControls = GObject.registerClass(
  class UniteWindowControls extends PanelMenu.Button {
    _init() {
      super._init(0.0, null, true)

      this._controls = new St.BoxLayout({ style_class: 'window-controls-box' })
      this.add_child(this._controls)

      this.add_style_class_name('window-controls')
    }

    _addButton(action) {
      const bin = new St.Bin({ style_class: 'icon' })
      const btn = new St.Button({ track_hover: true })

      btn.add_style_class_name(`window-button ${action}`)
      btn.add_actor(bin)

      btn.connect('clicked', () => {
        const target = global.uniteShell.focusWindow
        const method = target && target[action]

        method && method.call(target)
      })

      this._controls.add_child(btn)
    }

    addButtons(buttons) {
      this._controls.destroy_all_children()
      buttons.forEach(this._addButton.bind(this))
    }

    setVisible(visible) {
      this.container.visible = visible
    }
  }
)

var WindowButtons = class WindowButtons {
  constructor() {
    this.theme    = 'default-dark'
    this.signals  = new Signals()
    this.settings = new Settings()
    this.controls = new WindowControls()

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

    global.uniteShell.themeManager.addShellStyle('windowButtons', path)
    this.controls.add_style_class_name(this.theme)
  }

  destroy() {
    this.controls.destroy()
    global.uniteShell.themeManager.deleteStyle('windowButtons')

    this.signals.disconnectAll()
    this.settings.disconnectAll()
  }
}

var ExtendLeftBox = class ExtendLeftBox {
  constructor() {
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

  destroy() {
    Main.panel.__proto__[Gi.hook_up_vfunc_symbol]('allocate', this._default)
    this._default = null

    Main.panel.queue_relayout()
  }
}

var PanelManager = GObject.registerClass(
  class UnitePanelManager extends GObject.Object {
    _init() {
      this.signals  = new Signals()
      this.settings = new Settings()

      this.settings.connect(
        'show-window-buttons', this._onShowButtonsChange.bind(this)
      )

      this.settings.connect(
        'extend-left-box', this._onExtendLeftBoxChange.bind(this)
      )
    }

    get showButtons() {
      return this.settings.get('show-window-buttons') != 'never'
    }

    get extendLeftBox() {
      return this.settings.get('extend-left-box')
    }

    _createButtons() {
      if (!this.buttons) {
        this.buttons = new WindowButtons()
      }
    }

    _destroyButtons() {
      if (this.buttons) {
        this.buttons.destroy()
        this.buttons = null
      }
    }

    _createExtender() {
      if (!this.extender) {
        this.extender = new ExtendLeftBox()
      }
    }

    _destroyExtender() {
      if (this.extender) {
        this.extender.destroy()
        this.extender = null
      }
    }

    _onShowButtonsChange() {
      if (this.showButtons) {
        this._createButtons()
      } else {
        this._destroyButtons()
      }
    }

    _onExtendLeftBoxChange() {
      if (this.extendLeftBox) {
        this._createExtender()
      } else {
        this._destroyExtender()
      }
    }

    activate() {
      this._onShowButtonsChange()
      this._onExtendLeftBoxChange()
    }

    destroy() {
      this._destroyButtons()
      this._destroyExtender()

      this.signals.disconnectAll()
      this.settings.disconnectAll()
    }
  }
)
