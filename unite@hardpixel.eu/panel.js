const Gi         = imports._gi
const System     = imports.system
const GObject    = imports.gi.GObject
const Clutter    = imports.gi.Clutter
const Shell      = imports.gi.Shell
const AppSystem  = imports.gi.Shell.AppSystem.get_default()
const WinTracker = imports.gi.Shell.WindowTracker.get_default()
const Main       = imports.ui.main
const Config     = imports.misc.config
const Unite      = imports.misc.extensionUtils.getCurrentExtension()
const AppMenu    = Main.panel.statusArea.appMenu
const Activities = Main.panel.statusArea.activities
const Buttons    = Unite.imports.buttons
const Handlers   = Unite.imports.handlers

const VERSION = parseInt(Config.PACKAGE_VERSION.split('.')[1])

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
      Main.overview, 'showing', this._syncVisible.bind(this)
    )

    this.signals.connect(
      Main.overview, 'hiding', this._syncVisible.bind(this)
    )

    this.signals.connect(
      WinTracker, 'notify::focus-app', this._syncVisible.bind(this)
    )

    this.settings.connect(
      'button-layout', this._onPositionChange.bind(this)
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

    this._onPositionChange()
    this._onThemeChange()
    this._syncVisible()
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

    if (this.side != this.position) {
      buttons.reverse()
    }

    this.controls.addButtons(buttons)
    this._syncVisible()
  }

  _onPositionChange() {
    const controls = this.controls.container

    if (controls.reparent) {
      controls.reparent(this.container)
    } else {
      const currentParent = controls.get_parent()

      if (currentParent) {
        currentParent.remove_child(controls)
        this.container.add_child(controls)
      }
   }

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

  _syncVisible() {
    const overview = Main.overview.visibleTarget
    const focusApp = WinTracker.focus_app || AppMenu._targetApp

    if (!overview && focusApp && focusApp.state == Shell.AppState.RUNNING) {
      const win = global.unite.focusWindow
      this.controls.setVisible(win && win.showButtons)
    } else {
      this.controls.setVisible(false)
    }
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

    if (VERSION < 37) {
      Main.panel.__proto__[Gi.hook_up_vfunc_symbol]('allocate', (box, flags) => {
        Main.panel.vfunc_allocate.call(Main.panel, box, flags)
        this._allocate(Main.panel, box, flags)
      })
    } else {
      Main.panel.__proto__[Gi.hook_up_vfunc_symbol]('allocate', (box) => {
        Main.panel.vfunc_allocate.call(Main.panel, box)
        this._allocate(Main.panel, box)
      })
    }

    Main.panel.queue_relayout()
  }

  _boxAllocate(box, childBox, flags) {
    if (VERSION < 37) {
      box.allocate(childBox, flags)
    } else {
      box.allocate(childBox)
    }
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

    this._boxAllocate(leftBox, childBox, flags)

    childBox.y1 = 0
    childBox.y2 = allocHeight

    if (actor.get_text_direction() == Clutter.TextDirection.RTL) {
      childBox.x1 = rightNaturalWidth
      childBox.x2 = childBox.x1 + centerNaturalWidth
    } else {
      childBox.x1 = allocWidth - centerNaturalWidth - rightNaturalWidth
      childBox.x2 = childBox.x1 + centerNaturalWidth
    }

    this._boxAllocate(centerBox, childBox, flags)

    childBox.y1 = 0
    childBox.y2 = allocHeight

    if (actor.get_text_direction() == Clutter.TextDirection.RTL) {
      childBox.x1 = 0
      childBox.x2 = rightNaturalWidth
    } else {
      childBox.x1 = allocWidth - rightNaturalWidth
      childBox.x2 = allocWidth
    }

    this._boxAllocate(rightBox, childBox, flags)
  }

  _destroy() {
    Main.panel.__proto__[Gi.hook_up_vfunc_symbol]('allocate', this._default)
    this._default = null

    Main.panel.queue_relayout()
  }
}

var ActivitiesButton = class ActivitiesButton extends PanelExtension {
  constructor({ settings }) {
    const active = val => val != 'never'
    super(settings, 'hide-activities-button', active)
  }

  _init() {
    this.signals  = new Handlers.Signals()
    this.settings = new Handlers.Settings()

    this.signals.connect(
      Main.overview, 'showing', this._syncVisible.bind(this)
    )

    this.signals.connect(
      Main.overview, 'hiding', this._syncVisible.bind(this)
    )

    this.signals.connect(
      AppSystem, 'app-state-changed', this._syncVisible.bind(this)
    )

    this.signals.connect(
      WinTracker, 'notify::focus-app', this._syncVisible.bind(this)
    )

    this.settings.connect(
      'show-desktop-name', this._syncVisible.bind(this)
    )

    this._syncVisible()
  }

  get hideButton() {
    return this.settings.get('hide-activities-button')
  }

  get showDesktop() {
    return this.settings.get('show-desktop-name')
  }

  _syncVisible() {
    const button   = Activities.container
    const overview = Main.overview.visibleTarget
    const focusApp = WinTracker.focus_app || AppMenu._targetApp

    if (this.hideButton == 'always') {
      return button.hide()
    }

    if (this.showDesktop) {
      button.visible = overview
    } else {
      button.visible = overview || focusApp == null
    }
  }

  _destroy() {
    if (!Main.overview.isDummy) {
      Activities.container.show()
    }

    this.signals.disconnectAll()
    this.settings.disconnectAll()
  }
}

var DesktopName = class DesktopName extends PanelExtension {
  constructor({ settings }) {
    const active = val => val == true
    super(settings, 'show-desktop-name', active)
  }

  _init() {
    this.signals  = new Handlers.Signals()
    this.settings = new Handlers.Settings()
    this.label    = new Buttons.DesktopLabel()

    this.signals.connect(
      Main.overview, 'showing', this._syncVisible.bind(this)
    )

    this.signals.connect(
      Main.overview, 'hiding', this._syncVisible.bind(this)
    )

    this.signals.connect(
      AppSystem, 'app-state-changed', this._syncVisible.bind(this)
    )

    this.signals.connect(
      WinTracker, 'notify::focus-app', this._syncVisible.bind(this)
    )

    this.settings.connect(
      'desktop-name-text', this._onTextChanged.bind(this)
    )

    Main.panel.addToStatusArea(
      'uniteDesktopLabel', this.label, 1, 'left'
    )

    this._onTextChanged()
    this._syncVisible()
  }

  _syncVisible() {
    const overview = Main.overview.visibleTarget
    const focusApp = WinTracker.focus_app || AppMenu._targetApp

    this.label.setVisible(!overview && focusApp == null)
  }

  _onTextChanged() {
    const text = this.settings.get('desktop-name-text')
    this.label.setText(text)
  }

  _destroy() {
    this.label.destroy()

    this.signals.disconnectAll()
    this.settings.disconnectAll()
  }
}

var TrayIcons = class TrayIcons extends PanelExtension {
  constructor({ settings }) {
    const active = val => val == true
    super(settings, 'show-legacy-tray', active)
  }

  _init() {
    this.tray       = new Shell.TrayManager()
    this.settings   = new Handlers.Settings()
    this.indicators = new Buttons.TrayIndicator()

    this.tray.connect(
      'tray-icon-added', this._onIconAdded.bind(this)
    )

    this.tray.connect(
      'tray-icon-removed', this._onIconRemoved.bind(this)
    )

    this.settings.connect(
      'greyscale-tray-icons', this._onGreyscaleChange.bind(this)
    )

    Main.panel.addToStatusArea(
      'uniteTrayIndicator', this.indicators, 0, 'right'
    )

    this.tray.manage_screen(Main.panel)
  }

  _desaturateIcon(icon) {
    const greyscale = this.settings.get('greyscale-tray-icons')
    icon.clear_effects()

    if (greyscale) {
      const desEffect = new Clutter.DesaturateEffect({ factor : 1.0 })
      const briEffect = new Clutter.BrightnessContrastEffect({})

      briEffect.set_brightness(0.2)
      briEffect.set_contrast(0.3)

      icon.add_effect_with_name('desaturate', desEffect)
      icon.add_effect_with_name('brightness-contrast', briEffect)
    }
  }

  _onIconAdded(trayManager, icon) {
    this.indicators.addIcon(icon)
    this._desaturateIcon(icon)
  }

  _onIconRemoved(trayManager, icon) {
    this.indicators.removeIcon(icon)
  }

  _onGreyscaleChange() {
    this.indicators.forEach(this._desaturateIcon.bind(this))
  }

  _destroy() {
    this.tray = null
    System.gc()

    this.indicators.destroy()
    this.settings.disconnectAll()
  }
}

var PanelManager = GObject.registerClass(
  class UnitePanelManager extends GObject.Object {
    _init() {
      this.settings   = new Handlers.Settings()
      this.buttons    = new WindowButtons(this)
      this.extender   = new ExtendLeftBox(this)
      this.activities = new ActivitiesButton(this)
      this.desktop    = new DesktopName(this)
      this.tray       = new TrayIcons(this)
    }

    activate() {
      this.buttons.activate()
      this.extender.activate()
      this.activities.activate()
      this.desktop.activate()
      this.tray.activate()
    }

    destroy() {
      this.buttons.destroy()
      this.extender.destroy()
      this.activities.destroy()
      this.desktop.destroy()
      this.tray.destroy()

      this.settings.disconnectAll()
    }
  }
)
