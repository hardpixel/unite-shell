const System     = imports.system
const GObject    = imports.gi.GObject
const GLib       = imports.gi.GLib
const St         = imports.gi.St
const Pango      = imports.gi.Pango
const Clutter    = imports.gi.Clutter
const Meta       = imports.gi.Meta
const Shell      = imports.gi.Shell
const AppSystem  = imports.gi.Shell.AppSystem.get_default()
const WinTracker = imports.gi.Shell.WindowTracker.get_default()
const Main       = imports.ui.main
const Me         = imports.misc.extensionUtils.getCurrentExtension()
const AppMenu    = Main.panel.statusArea.appMenu
const Activities = Main.panel.statusArea.activities
const Buttons    = Me.imports.buttons
const Theme      = Me.imports.theme
const Handlers   = Me.imports.handlers
const Override   = Me.imports.overrides.helper

var WindowButtons = class WindowButtons extends Handlers.Feature {
  constructor() {
    super('show-window-buttons', setting => setting != 'never')
  }

  activate() {
    this.signals  = new Handlers.Signals()
    this.settings = new Handlers.Settings()
    this.styles   = new Handlers.Styles()
    this.controls = new Buttons.WindowControls()
    this.themes   = new Theme.WindowControlsThemes()
    this.theme    = this.themes.default
    this.isDark   = true

    this.signals.connect(
      Main.overview, 'showing', this._syncVisible.bind(this)
    )

    this.signals.connect(
      Main.overview, 'hiding', this._syncVisible.bind(this)
    )

    this.signals.connect(
      WinTracker, 'notify::focus-app', this._syncVisible.bind(this)
    )

    this.signals.connect(
      Main.panel, 'style-changed', this._onPanelStyleChange.bind(this)
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

    this.settings.connect(
      'gtk-theme', this._onAutoThemeChange.bind(this)
    )

    Main.panel.addToStatusArea(
      'uniteWindowControls', this.controls, this.index, this.side
    )

    this._onPositionChange()
    this._onThemeChange()
    this._syncVisible()
  }

  get gtkTheme() {
    return this.settings.get('gtk-theme')
  }

  get themeName() {
    return this.settings.get('window-buttons-theme')
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
    const controls  = this.controls.container
    const container = controls.get_parent()

    controls.add_style_class_name('window-controls-container')

    if (container) {
      container.remove_child(controls)
      this.container.add_child(controls)
    }

    if (this.index != null) {
      this.container.set_child_at_index(controls, this.index)
    } else {
      this.container.set_child_below_sibling(controls, this.sibling)
    }

    this._onLayoutChange()
  }

  _onThemeChange() {
    this.controls.remove_style_class_name(this.theme.uuid)

    this.theme = this.themes.locate(this.themeName, this.gtkTheme)
    this.styles.addShellStyle('windowButtons', this.theme.getStyle(this.isDark))

    this.controls.add_style_class_name(this.theme.uuid)
  }

  _onPanelStyleChange() {
    const node = Main.panel.get_theme_node()
    const dark = Theme.isColorDark(node.get_background_color())

    if (this.isDark != dark) {
      this.isDark = dark
      this._onThemeChange()
    }
  }

  _onAutoThemeChange() {
    if (this.themeName == 'auto') {
      this._onThemeChange()
    }
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

  destroy() {
    this.signals.disconnectAll()
    this.settings.disconnectAll()
    this.styles.removeAll()

    this.controls.destroy()
  }
}

var ExtendLeftBox = class ExtendLeftBox extends Handlers.Feature {
  constructor() {
    super('extend-left-box', setting => setting == true)

    Override.inject(this, 'panel', 'ExtendLeftBox')
  }

  activate() {
    this.injections = new Handlers.Injections()

    this.injections.vfunc(
      Main.panel, 'allocate', this._allocate.bind(this)
    )

    Main.panel.queue_relayout()
  }

  _allocate(box) {
    Main.panel.set_allocation(box)

    const leftBox     = Main.panel._leftBox
    const centerBox   = Main.panel._centerBox
    const rightBox    = Main.panel._rightBox
    const childBox    = new Clutter.ActorBox()

    const leftWidth   = leftBox.get_preferred_width(-1)[1]
    const centerWidth = centerBox.get_preferred_width(-1)[1]
    const rightWidth  = rightBox.get_preferred_width(-1)[1]

    const allocWidth  = box.x2 - box.x1
    const allocHeight = box.y2 - box.y1
    const sideWidth   = Math.floor(allocWidth - centerWidth - rightWidth)

    const rtlTextDir  = Main.panel.get_text_direction() == Clutter.TextDirection.RTL

    childBox.y1 = 0
    childBox.y2 = allocHeight

    if (rtlTextDir) {
      childBox.x1 = allocWidth - Math.min(sideWidth, leftWidth)
      childBox.x2 = allocWidth
    } else {
      childBox.x1 = 0
      childBox.x2 = Math.min(sideWidth, leftWidth)
    }

    leftBox.allocate(childBox)

    childBox.y1 = 0
    childBox.y2 = allocHeight

    if (rtlTextDir) {
      childBox.x1 = rightWidth
      childBox.x2 = childBox.x1 + centerWidth
    } else {
      childBox.x1 = allocWidth - centerWidth - rightWidth
      childBox.x2 = childBox.x1 + centerWidth
    }

    centerBox.allocate(childBox)

    childBox.y1 = 0
    childBox.y2 = allocHeight

    if (rtlTextDir) {
      childBox.x1 = 0
      childBox.x2 = rightWidth
    } else {
      childBox.x1 = allocWidth - rightWidth
      childBox.x2 = allocWidth
    }

    rightBox.allocate(childBox)
  }

  destroy() {
    this.injections.removeAll()
    Main.panel.queue_relayout()
  }
}

var ActivitiesButton = class ActivitiesButton extends Handlers.Feature {
  constructor() {
    super('hide-activities-button', setting => setting != 'never')

    Override.inject(this, 'panel', 'ActivitiesButtonClassic')
  }

  activate() {
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

  destroy() {
    if (!Main.overview.isDummy) {
      Activities.container.show()
    }

    this.signals.disconnectAll()
    this.settings.disconnectAll()
  }
}

var DesktopName = class DesktopName extends Handlers.Feature {
  constructor() {
    super('show-desktop-name', setting => setting == true)
  }

  activate() {
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

  destroy() {
    this.signals.disconnectAll()
    this.settings.disconnectAll()

    this.label.destroy()
  }
}

var TrayIcons = class TrayIcons extends Handlers.Feature {
  constructor() {
    super('show-legacy-tray', setting => setting == true)
  }

  activate() {
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

  destroy() {
    this.tray = null
    System.gc()

    this.indicators.destroy()
    this.settings.disconnectAll()
  }
}

var TitlebarActions = class TitlebarActions extends Handlers.Feature {
  constructor() {
    super('enable-titlebar-actions', setting => setting == true)

    Override.inject(this, 'panel', 'TitlebarActions')
  }

  activate() {
    this.signals  = new Handlers.Signals()
    this.settings = new Handlers.Settings()

    this.signals.connect(
      Main.panel, 'button-press-event', this._onButtonPressEvent.bind(this)
    )
  }

  _onButtonPressEvent(actor, event) {
    if (Main.modalCount > 0 || actor != event.get_source()) {
      return Clutter.EVENT_PROPAGATE
    }

    const focusWindow = global.unite.focusWindow

    if (!focusWindow || !focusWindow.hideTitlebars) {
      return Clutter.EVENT_PROPAGATE
    }

    const ccount = event.get_click_count && event.get_click_count()
    const button = event.get_button()

    let action = null

    if (button == 1 && ccount == 2) {
      action = this.settings.get('action-double-click-titlebar')
    }

    if (button == 2) {
      action = this.settings.get('action-middle-click-titlebar')
    }

    if (button == 3) {
      action = this.settings.get('action-right-click-titlebar')
    }

    if (action == 'menu') {
      return this._openWindowMenu(focusWindow.win, event.get_coords()[0])
    }

    if (action && action != 'none') {
      return this._handleClickAction(action, focusWindow)
    }

    return Clutter.EVENT_PROPAGATE
  }

  _handleClickAction(action, win) {
    const mapping = {
      'toggle-maximize':              'maximize',
      'toggle-maximize-horizontally': 'maximizeX',
      'toggle-maximize-vertically':   'maximizeY',
      'toggle-shade':                 'shade',
      'minimize':                     'minimize',
      'lower':                        'lower'
    }

    const method = win[mapping[action]]

    if (typeof method !== 'function') {
      return Clutter.EVENT_PROPAGATE
    }

    method.call(win)
    return Clutter.EVENT_STOP
  }

  _openWindowMenu(win, x) {
    const rect = this._menuPositionRect(x)
    const type = Meta.WindowMenuType.WM

    Main.wm._windowMenuManager.showWindowMenuForWindow(win, type, rect)
    return Clutter.EVENT_STOP
  }

  _menuPositionRect(x) {
    const size = Main.panel.height
    return { x: x - size, y: 0, width: size * 2, height: size }
  }

  destroy() {
    this.signals.disconnectAll()
    this.settings.disconnectAll()
  }
}

var AppMenuCustomizer = class AppMenuCustomizer extends Handlers.Feature {
  constructor() {
    super('app-menu-max-width', setting => setting > 0)
  }

  activate() {
    this.signals  = new Handlers.Signals()
    this.settings = new Handlers.Settings()
    this.tooltip  = new St.Label({ visible: false, style_class: 'dash-label' })

    this.signals.connect(
      AppMenu, 'notify::hover', this._onAppMenuHover.bind(this)
    )

    this.signals.connect(
      AppMenu, 'button-press-event', this._onAppMenuClicked.bind(this)
    )

    this.settings.connect(
      'app-menu-max-width', this._onMaxWidthChange.bind(this)
    )

    this.settings.connect(
      'app-menu-ellipsize-mode', this._onEllipsizeModeChange.bind(this)
    )

    Main.uiGroup.add_child(this.tooltip)

    this._onMaxWidthChange()
  }

  get maxWidth() {
    return this.settings.get('app-menu-max-width')
  }

  get ellipsizeMode() {
    return this.settings.get('app-menu-ellipsize-mode')
  }

  setLabelMaxWidth(width) {
    const label = AppMenu._label
    label && label.set_style('max-width' + (width ? `: ${width}px` : ''))
  }

  setTextEllipsizeMode(mode) {
    const modeK = mode.toUpperCase()
    const label = AppMenu._label

    label && label.get_clutter_text().set_ellipsize(Pango.EllipsizeMode[modeK])
  }

  _onAppMenuHover(appMenu) {
    if (!appMenu._label) return

    this.isHovered = appMenu.get_hover()

    if (!this.isHovered) {
      return this.tooltip.hide()
    }

    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 400, () => {
      if (this.isHovered && !this.tooltip.visible) {
        const [mouseX, mouseY] = global.get_pointer()

        this.tooltip.set_position(mouseX + 20, mouseY)
        this.tooltip.set_text(appMenu._label.get_text())
        this.tooltip.show()
      }

      return GLib.SOURCE_REMOVE
    })
  }

  _onAppMenuClicked() {
    this.isHovered = false
    this.tooltip.hide()
  }

  _onMaxWidthChange() {
    this.setLabelMaxWidth(this.maxWidth)
    this.setTextEllipsizeMode(this.ellipsizeMode)
  }

  _onEllipsizeModeChange() {
    this.setTextEllipsizeMode(this.ellipsizeMode)
  }

  destroy() {
    this.setLabelMaxWidth(null)
    this.setTextEllipsizeMode('end')

    this.signals.disconnectAll()
    this.settings.disconnectAll()

    this.tooltip.destroy()
  }
}

var PanelManager = GObject.registerClass(
  class UnitePanelManager extends GObject.Object {
    _init() {
      this.features = new Handlers.Features()

      this.features.add(WindowButtons)
      this.features.add(ExtendLeftBox)
      this.features.add(ActivitiesButton)
      this.features.add(DesktopName)
      this.features.add(TrayIcons)
      this.features.add(TitlebarActions)
      this.features.add(AppMenuCustomizer)
    }

    activate() {
      this.features.activate()
    }

    destroy() {
      this.features.destroy()
    }
  }
)
