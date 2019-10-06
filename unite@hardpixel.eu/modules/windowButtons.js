const St             = imports.gi.St
const Shell          = imports.gi.Shell
const Meta           = imports.gi.Meta
const Main           = imports.ui.main
const Unite          = imports.misc.extensionUtils.getCurrentExtension()
const Base           = Unite.imports.module.BaseModule
const WindowControls = Unite.imports.panel.WindowControls
const isWindow       = Unite.imports.helpers.isWindow
const isMaximized    = Unite.imports.helpers.isMaximized
const loadStyles     = Unite.imports.helpers.loadStyles
const unloadStyles   = Unite.imports.helpers.unloadStyles

var WindowButtons = class WindowButtons extends Base {
  _onSetup() {
    this._enableKey    = 'show-window-buttons'
    this._disableValue = 'never'
  }

  _onInitialize() {
    this.monitorManager = Meta.MonitorManager.get()
  }

  _onActivate() {
    this._signals.connect(global.display, 'notify::focus-window', 'toggleButtons')
    this._signals.connect(global.window_manager, 'size-change', 'toggleButtons')
    this._signals.connect(global.window_manager, 'destroy', 'toggleButtons')
    this._signals.connect(this.monitorManager, 'monitors-changed', 'toggleButtons')

    this._signals.connect(Main.overview, 'showing', 'toggleButtons')
    this._signals.connect(Main.overview, 'hiding', 'toggleButtons')

    this._settings.connect('window-buttons-theme', 'updateTheme')
    this._settings.connect('button-layout', 'updateButtons')
    this._settings.connect('window-buttons-placement', 'updateButtons')
    this._settings.connect('restrict-to-primary-screen', 'updateButtons')

    this._createButtons()
    this._toggleButtons()
    this._loadTheme()
  }

  _onReset() {
    this._toggleButtons()
  }

  _onDeactivate() {
    this._unloadTheme()
    this._destroyButtons()
  }

  _createButtons() {
    let buttons = this._settings.get('window-buttons-layout')
    let side    = this._settings.get('window-buttons-position')
    let place   = this._settings.get('window-buttons-placement')
    let index   = side == 'left' ? 1 : -1

    if (!buttons || this._controls) return

    if ((place == 'right' || place == 'last') && side == 'left') {
      buttons = buttons.reverse()
    }

    if (place == 'left' || place == 'first') {
      side  = 'left'
      index = 0
    }

    if (place == 'right' || place == 'last') {
      side  = 'right'
      index = -1
    }

    this._controls = new WindowControls()

    this._controls.addButtons(buttons, (actor, event) => {
      this._onButtonClick(actor, event)
    })

    Main.panel.addToStatusArea('uniteWindowControls', this._controls, index, side)

    const widget  = this._controls.get_parent()
    const appMenu = Main.panel.statusArea.appMenu.get_parent()
    const aggMenu = Main.panel.statusArea.aggregateMenu.get_parent()

    if (side == 'left' && place != 'first')  {
      Main.panel._leftBox.set_child_below_sibling(widget, appMenu)
    }

    if (side == 'right' && place != 'last')  {
      Main.panel._rightBox.set_child_below_sibling(widget, aggMenu)
    }
  }

  _destroyButtons() {
    if (!this._controls) return

    this._controls.destroy()
    this._controls = null
  }

  _updateButtons() {
    this._destroyButtons()
    this._createButtons()
  }

  _updateTheme() {
    this._unloadTheme()
    this._loadTheme()
  }

  _loadTheme() {
    if (this._themeFile || !this._controls) return

    this._themeName = this._settings.get('window-buttons-theme')
    this._themeFile = loadStyles(`themes/${this._themeName}/stylesheet.css`)

    this._controls.add_style_class_name(`${this._themeName}-buttons`)
  }

  _unloadTheme() {
    if (!this._themeFile || !this._controls) return

    this._controls.remove_style_class_name(`${this._themeName}-buttons`)

    this._themeName = this._settings.get('window-buttons-theme')
    this._themeFile = unloadStyles(this._themeFile)
  }

  _onButtonClick(actor, event) {
    let focusWindow = global.display.focus_window
    if (!focusWindow) return

    switch (actor._windowAction) {
      case 'minimize': return this._minimizeWindow(focusWindow)
      case 'maximize': return this._maximizeWindow(focusWindow)
      case 'close':    return this._closeWindow(focusWindow)
    }
  }

  _minimizeWindow(win) {
    if (!win.minimized) win.minimize()
  }

  _maximizeWindow(win) {
    let bothMaximized = Meta.MaximizeFlags.BOTH
    let maximizeState = win.get_maximized()

    if (maximizeState === bothMaximized)
      win.unmaximize(bothMaximized)
    else
      win.maximize(bothMaximized)
  }

  _closeWindow(win) {
    win.delete(global.get_current_time())
  }

  _toggleButtons() {
    if (!this._controls) return

    let focusWindow = global.display.focus_window
    let overview    = Main.overview.visibleTarget
    let valid       = isWindow(focusWindow)
    let visible     = false

    if (!overview && valid) {
      let maxed  = isMaximized(focusWindow, this._setting)
      let always = this._setting == 'always' && focusWindow

      visible = always || maxed
    } else {
      let target  = Main.panel.statusArea.appMenu._targetApp
      let state   = target != null && target.get_state()
      let running = state == Shell.AppState.RUNNING

      visible = running && !overview
    }

    this._controls.setVisible(visible)
  }
}
