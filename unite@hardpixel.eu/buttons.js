import GObject from 'gi://GObject'
import St from 'gi://St'
import Clutter from 'gi://Clutter'
import { AppMenu } from 'resource:///org/gnome/shell/ui/appMenu.js'
import * as Main from 'resource:///org/gnome/shell/ui/main.js'
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js'
import * as Animation from 'resource:///org/gnome/shell/ui/animation.js'

export const AppmenuLabel = GObject.registerClass(
  class UniteAppmenuLabel extends PanelMenu.Button {
    _init(text) {
      super._init(0.0, null, true)

      const bin = new St.Bin({ name: 'appMenu' })
      this.add_actor(bin)

      this.bind_property('reactive', this, 'can-focus', 0)
      this.reactive = false

      this._container = new St.BoxLayout({ style_class: 'panel-status-menu-box' })
      bin.set_child(this._container)

      this._icon = new St.Icon()
      this._icon.set_icon_size(16)
      this._icon.set_fallback_gicon(null)

      this._iconBox = new St.Bin({ style_class: 'app-menu-icon', y_align: Clutter.ActorAlign.CENTER })
      this._iconBox.set_child(this._icon)
      this._container.add_actor(this._iconBox)

      this._label = new St.Label({ y_align: Clutter.ActorAlign.CENTER })
      this._container.add_actor(this._label)

      this._spinner = new Animation.Spinner(16, { animate: true, hideOnStop: true })
      this._container.add_actor(this._spinner)

      const menu = new AppMenu(this)
      this.setMenu(menu)

      this._menuManager = Main.panel.menuManager
      this._menuManager.addMenu(menu)

      const iconEffect = new Clutter.DesaturateEffect()
      this._iconBox.add_effect(iconEffect)

      this._iconBox.connect('style-changed', () => {
        const themeNode = this._iconBox.get_theme_node()
        iconEffect.enabled = themeNode.get_icon_style() === St.IconStyle.SYMBOLIC
      })

      this.setText(text || '')
      this.add_style_class_name('app-menu-label')
    }

    setApp(app) {
      this.setIcon(app.get_icon())
      this.setText(app.get_name())
      this.menu.setApp(app)
    }

    setIcon(icon) {
      this._icon.set_gicon(icon)
    }

    setText(text) {
      this._label.set_text(text)
    }

    setReactive(reactive) {
      this.reactive = reactive
    }

    setVisible(visible) {
      this.container.visible = visible
    }

    toggleIcon(hidden) {
      this._iconBox.visible = !hidden
    }

    stopAnimation() {
      this._spinner.stop()
    }

    startAnimation() {
      this._spinner.play()
    }

    _onDestroy() {
      if (this.menu) {
        this._menuManager.removeMenu(this.menu)
        this._menuManager = null

        this.menu.setApp(null)
        this.setMenu(null)
      }

      super._onDestroy()
    }
  }
)

export const DesktopLabel = GObject.registerClass(
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
    }
  }
)

export const TrayIndicator = GObject.registerClass(
  class UniteTrayIndicator extends PanelMenu.Button {
    _init() {
      this._icons = []
      super._init(0.0, null, true)

      this._indicators = new St.BoxLayout({ style_class: 'panel-status-indicators-box' })
      this.add_child(this._indicators)

      this.add_style_class_name('system-tray-icons')
      this._sync()
    }

    _sync() {
      this.visible = this._icons.length > 0
    }

    addIcon(icon) {
      this._icons.push(icon)

      const mask = St.ButtonMask.ONE | St.ButtonMask.TWO | St.ButtonMask.THREE
      const ibtn = new St.Button({ child: icon, button_mask: mask })

      this._indicators.add_child(ibtn)

      icon.connect('destroy', () => { ibtn.destroy() })
      ibtn.connect('button-release-event', (actor, event) => icon.click(event))

      icon.set_reactive(true)
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

export const WindowControls = GObject.registerClass(
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
      buttons && buttons.forEach(this._addButton.bind(this))
    }

    setVisible(visible) {
      this.container.visible = visible
    }
  }
)
