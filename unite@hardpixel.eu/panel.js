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
        const method = target[action]

        method.call(target)
      })

      this._controls.add_child(btn)
    }

    addButtons(buttons) {
      this._controls.destroy_all_children()
      buttons.forEach(this._addButton.bind(this))
    }

    setVisible(visible) {
      this.visible = visible
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
    this.controls.reparent(this.container)

    if (this.index != null) {
      this.container.set_child_at_index(this.controls, this.index)
    } else {
      this.container.set_child_below_sibling(this.controls, this.sibling)
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

var PanelManager = GObject.registerClass(
  class UnitePanelManager extends GObject.Object {
    _init() {
      this.signals  = new Signals()
      this.settings = new Settings()
    }

    activate() {
    }

    destroy() {
      this.signals.disconnectAll()
      this.settings.disconnectAll()
    }
  }
)
