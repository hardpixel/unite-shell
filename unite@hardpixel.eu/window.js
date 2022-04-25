const Bytes      = imports.byteArray
const GLib       = imports.gi.GLib
const GObject    = imports.gi.GObject
const Meta       = imports.gi.Meta
const WinTracker = imports.gi.Shell.WindowTracker.get_default()
const Main       = imports.ui.main
const Util       = imports.misc.util
const Me         = imports.misc.extensionUtils.getCurrentExtension()
const AppMenu    = Main.panel.statusArea.appMenu
const Handlers   = Me.imports.handlers
const Override   = Me.imports.overrides.helper

const VALID_TYPES = [
  Meta.WindowType.NORMAL,
  Meta.WindowType.DIALOG,
  Meta.WindowType.MODAL_DIALOG,
  Meta.WindowType.UTILITY
]

const UNITE_HINTS = '_UNITE_ORIGINAL_STATE'
const MOTIF_HINTS = '_MOTIF_WM_HINTS'

const _SHOW_FLAGS = ['0x2', '0x0', '0x1', '0x0', '0x0']
const _HIDE_FLAGS = ['0x2', '0x0', '0x2', '0x0', '0x0']

function safeSpawn(command) {
  try {
    return GLib.spawn_command_line_sync(command)
  } catch (e) {
    return [false, Bytes.fromString('')]
  }
}

function isValid(win) {
  return win && VALID_TYPES.includes(win.window_type)
}

function getId(win) {
  return win && win.get_id ? win.get_id() : win
}

function getXid(win) {
  const desc  = win.get_description()
  const match = desc && desc.match(/0x[0-9a-f]+/)

  return match && match[0]
}

function getHint(xid, name, fallback) {
  const result = safeSpawn(`xprop -id ${xid} ${name}`)
  const string = Bytes.toString(result[1])

  if (!string.match(/=/)) {
    return fallback
  }

  return string.split('=')[1].trim().split(',').map(part => {
    part = part.trim()
    return part.match(/\dx/) ? part : `0x${part}`
  })
}

function setHint(xid, hint, value) {
  value = value.join(', ')
  Util.spawn(['xprop', '-id', xid, '-f', hint, '32c', '-set', hint, value])
}

function getHints(xid) {
  let value = getHint(xid, UNITE_HINTS)

  if (!value) {
    value = getHint(xid, MOTIF_HINTS, _SHOW_FLAGS)
    setHint(xid, UNITE_HINTS, value)
  }

  return value
}

function isDecorated(hints) {
  return hints[2] != '0x2' && hints[2] != '0x0'
}

var ClientDecorations = class ClientDecorations {
  constructor(xid) {
    this.xid = xid
  }

  show() {
    return false
  }

  hide() {
    return false
  }

  reset() {
    return false
  }
}

var ServerDecorations = class ServerDecorations {
  constructor(xid) {
    this.xid     = xid
    this.initial = getHints(xid)
    this.current = this.initial
  }

  get decorated() {
    return isDecorated(this.current)
  }

  get handle() {
    return isDecorated(this.initial)
  }

  show() {
    if (this.handle && !this.decorated) {
      this.current = _SHOW_FLAGS
      setHint(this.xid, MOTIF_HINTS, _SHOW_FLAGS)
    }
  }

  hide() {
    if (this.handle && this.decorated) {
      this.current = _HIDE_FLAGS
      setHint(this.xid, MOTIF_HINTS, _HIDE_FLAGS)
    }
  }

  reset() {
    if (this.handle) {
      setHint(this.xid, MOTIF_HINTS, _SHOW_FLAGS)
    }
  }
}

var MetaWindow = GObject.registerClass(
  class UniteMetaWindow extends GObject.Object {
    _init(win) {
      win._uniteShellManaged = true

      this.win = win
      this.xid = getXid(win)

      this.signals  = new Handlers.Signals()
      this.settings = new Handlers.Settings()

      if (this.xid && !this.clientDecorated) {
        this.decorations = new ServerDecorations(this.xid)
      } else {
        this.decorations = new ClientDecorations(this.xid)
      }

      this.signals.connect(
        win, 'size-changed', this._onStateChanged.bind(this)
      )

      this.signals.connect(
        win, 'notify::title', this._onTitleChanged.bind(this)
      )

      this.settings.connect(
        'restrict-to-primary-screen', this.syncComponents.bind(this)
      )

      this.settings.connect(
        'hide-window-titlebars', this.syncDecorations.bind(this)
      )

      this.settings.connect(
        'show-window-buttons', this.syncControls.bind(this)
      )

      this.settings.connect(
        'show-window-title', this.syncAppmenu.bind(this)
      )

      this.syncComponents()
    }

    get app() {
      return WinTracker.get_window_app(this.win)
    }

    get hasFocus() {
      return this.win.has_focus()
    }

    get title() {
      if (this.showTitle) {
        return this.win.get_title()
      } else {
        return this.app.get_name()
      }
    }

    get clientDecorated() {
      return this.win.is_client_decorated()
    }

    get primaryScreen() {
      return this.win.is_on_primary_monitor()
    }

    get minimized() {
      return this.win.minimized
    }

    get maximized() {
      return this.win.maximized_horizontally && this.win.maximized_vertically
    }

    get tiled() {
      if (this.maximized) {
        return false
      } else {
        return this.win.maximized_horizontally || this.win.maximized_vertically
      }
    }

    get bothMaximized() {
      return this.maximized || this.tiled
    }

    get restrictToPrimary() {
      return this.settings.get('restrict-to-primary-screen')
    }

    get handleScreen() {
      return this.primaryScreen || !this.restrictToPrimary
    }

    get showTitle() {
      return this._parseEnumSetting('show-window-title')
    }

    get showButtons() {
      return this._parseEnumSetting('show-window-buttons')
    }

    get hideTitlebars() {
      return this._parseEnumSetting('hide-window-titlebars')
    }

    minimize() {
      if (this.minimized) {
        this.win.unminimize()
      } else {
        this.win.minimize()
      }
    }

    maximize() {
      if (this.maximized) {
        this.win.unmaximize(Meta.MaximizeFlags.BOTH)
      } else {
        this.win.maximize(Meta.MaximizeFlags.BOTH)
      }
    }

    maximizeX() {
      if (this.win.maximized_horizontally) {
        this.win.unmaximize(Meta.MaximizeFlags.HORIZONTAL)
      } else {
        this.win.maximize(Meta.MaximizeFlags.HORIZONTAL)
      }
    }

    maximizeY() {
      if (this.win.maximized_vertically) {
        this.win.unmaximize(Meta.MaximizeFlags.VERTICAL)
      } else {
        this.win.maximize(Meta.MaximizeFlags.VERTICAL)
      }
    }

    shade() {
      if (this.win.is_shaded) {
        this.win.shade(true)
      } else {
        this.win.unshade(true)
      }
    }

    lower() {
      this.win.lower()
    }

    close() {
      const time = global.get_current_time()
      time && this.win.delete(time)
    }

    syncDecorations() {
      if (this.hideTitlebars) {
        this.decorations.hide()
      } else {
        this.decorations.show()
      }
    }

    syncControls() {
      if (this.hasFocus) {
        const overview = Main.overview.visibleTarget
        const controls = Main.panel.statusArea.uniteWindowControls

        controls && controls.setVisible(!overview && this.showButtons)
      }
    }

    syncAppmenu() {
      const label = AppMenu._label

      if (label && this.hasFocus && this.title) {
        const current = label.get_text()
        const newText = this.title.replace(/\r?\n|\r/g, ' ')

        current != newText && label.set_text(newText)
      }
    }

    syncComponents() {
      this.syncDecorations()
      this.syncControls()
      this.syncAppmenu()
    }

    _parseEnumSetting(name) {
      switch (this.settings.get(name)) {
        case 'always':    return true
        case 'never':     return false
        case 'tiled':     return this.handleScreen && this.tiled
        case 'maximized': return this.handleScreen && this.maximized
        case 'both':      return this.handleScreen && this.bothMaximized
      }
    }

    _onStateChanged() {
      this.syncComponents()
    }

    _onTitleChanged() {
      this.syncAppmenu()
    }

    destroy(reset = true) {
      reset && this.decorations.reset()

      this.signals.disconnectAll()
      this.settings.disconnectAll()

      this.win._uniteShellManaged = false
    }
  }
)

var WindowManager = GObject.registerClass(
  class UniteWindowManager extends GObject.Object {
    _init() {
      this.windows  = new Map()
      this.signals  = new Handlers.Signals()
      this.settings = new Handlers.Settings()
      this.styles   = new Handlers.Styles()

      this.signals.connect(
        global.window_manager, 'map', this._onMapWindow.bind(this)
      )

      this.signals.connect(
        global.display, 'window-entered-monitor', this._onWindowEntered.bind(this)
      )

      this.signals.connect(
        global.display, 'notify::focus-window', this._onFocusWindow.bind(this)
      )

      this.signals.connect(
        global.display, 'window-demands-attention', this._onAttention.bind(this)
      )

      this.settings.connect(
        'hide-window-titlebars', this._onStylesChange.bind(this)
      )

      this.settings.connect(
        'button-layout', this._onStylesChange.bind(this)
      )

      Override.inject(this, 'window', 'WindowManager')
    }

    get focusWindow() {
      if (this._focusWindow) {
        return this.getWindow(this._focusWindow)
      }
    }

    get hideTitlebars() {
      return this.settings.get('hide-window-titlebars')
    }

    hasWindow(win) {
      return win && this.windows.has(getId(win))
    }

    getWindow(win) {
      return win && this.windows.get(getId(win))
    }

    setWindow(win) {
      if (!this.hasWindow(win)) {
        const meta = new MetaWindow(win)
        this.windows.set(getId(win), meta)

        win.connect('unmanaged', () => {
          this.deleteWindow(win, false)
        })
      }
    }

    deleteWindow(win, reset = true) {
      if (this.hasWindow(win)) {
        const meta = this.getWindow(win)
        meta.destroy(reset)

        this.windows.delete(getId(win))
      }
    }

    clearWindows() {
      for (const key of this.windows.keys()) {
        this.deleteWindow(key)
      }
    }

    _onMapWindow(shellwm, { meta_window }) {
      if (isValid(meta_window)) {
        this.setWindow(meta_window)
      }
    }

    _onWindowEntered(display, index, meta_window) {
      if (isValid(meta_window)) {
        this.setWindow(meta_window)
      }
    }

    _onFocusWindow(display) {
      this._focusWindow = display.focus_window

      if (this.focusWindow) {
        this.focusWindow.syncComponents()
      }
    }

    _onAttention(actor, win) {
      const auto = this.settings.get('autofocus-windows')
      const time = global.get_current_time()

      auto && Main.activateWindow(win, time)
    }

    _onStylesChange() {
      if (this.hideTitlebars != 'never') {
        const side = this.settings.get('window-buttons-position')
        const path = `@/buttons-${side}/${this.hideTitlebars}.css`

        this.styles.addGtkStyle('windowDecorations', path)
      } else {
        this.styles.deleteStyle('windowDecorations')
      }
    }

    activate() {
      GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
        const actors = global.get_window_actors()
        actors.forEach(actor => this._onMapWindow(null, actor))

        return GLib.SOURCE_REMOVE
      })

      this._onStylesChange()
    }

    destroy() {
      this.signals.disconnectAll()
      this.settings.disconnectAll()
      this.styles.removeAll()

      this.clearWindows()
    }
  }
)
