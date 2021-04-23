const GObject   = imports.gi.GObject
const St        = imports.gi.St
const Clutter   = imports.gi.Clutter
const Main      = imports.ui.main
const AppMenu   = Main.panel.statusArea.appMenu
const PanelMenu = imports.ui.panelMenu

var DesktopLabel = GObject.registerClass(
  class UniteDesktopLabel extends PanelMenu.Button {
    _init(text) {
      super._init(0.0, null, true)

      this._label = new St.Label({ y_align: Clutter.ActorAlign.CENTER })
      this.add_actor(this._label)

      this.reactive = false
      this.label_actor = this._label

      this.setText(text || 'Desktop')
      this.add_style_class_name('desktop-name-label')
    }

    setText(text) {
      this._label.set_text(text)
    }

    setVisible(visible) {
      this.container.visible = visible
      AppMenu.container.visible = !visible
    }
  }
)

var TrayIndicator = GObject.registerClass(
  class UniteTrayIndicator extends PanelMenu.Button {
    _init(size) {
      this._size  = size || 20
      this._icons = []

      super._init(0.0, null, true)

      this._indicators = new St.BoxLayout({ style_class: 'panel-status-indicators-box' })
      this.add_child(this._indicators)

      this.add_style_class_name('system-tray-icons')
      this._sync()
    }

    get size() {
      const context = St.ThemeContext.get_for_stage(global.stage)
      return this._size * context.scale_factor
    }

    _sync() {
      this.visible = this._icons.length > 0
    }

    addIcon(icon) {
      this._icons.push(icon)

      const mask = St.ButtonMask.ONE | St.ButtonMask.TWO | St.ButtonMask.THREE
      const ibtn = new St.Button({ child: icon, button_mask: mask, width: this.size })

      this._indicators.add_child(ibtn)

      icon.connect('destroy', () => { ibtn.destroy() })
      ibtn.connect('button-release-event', (actor, event) => icon.click(event))

      icon.set_reactive(true)
      icon.set_height(this.size)
      icon.set_x_align(Clutter.ActorAlign.CENTER)
      icon.set_y_align(Clutter.ActorAlign.CENTER)

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
      this._icons.forEach(icon => callback.call(null, icon))
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
      this.remove_style_class_name('panel-button')
    }

    _addButton(action) {
      const pos = Clutter.ActorAlign.CENTER
      const bin = new St.Bin({ style_class: 'icon', x_align: pos, y_align: pos })
      const btn = new St.Button({ track_hover: true })

      btn.add_style_class_name(`window-button ${action}`)
      btn.add_actor(bin)

      btn.connect('clicked', () => {
        const target = global.unite.focusWindow
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
