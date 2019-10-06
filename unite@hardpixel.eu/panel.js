const GObject   = imports.gi.GObject
const St        = imports.gi.St
const Clutter   = imports.gi.Clutter
const Main      = imports.ui.main
const PanelMenu = imports.ui.panelMenu

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

    _addButton(action, callback) {
      const bin = new St.Bin({ style_class: 'icon' })
      const btn = new St.Button({ track_hover: true })

      btn._windowAction = action

      btn.add_style_class_name(`window-button ${action}`)
      btn.add_actor(bin)

      btn.connect('clicked', (actor, event) => {
        callback.call(null, actor, event)
      })

      this._controls.add_child(btn)
    }

    addButtons(buttons, callback) {
      buttons.forEach(action => { this._addButton(action, callback) })
    }

    setVisible(visible) {
      this.container.visible = visible
    }
  }
)
