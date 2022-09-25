const Bytes    = imports.byteArray
const GLib     = imports.gi.GLib
const Main     = imports.ui.main
const Util     = imports.misc.util
const Me       = imports.misc.extensionUtils.getCurrentExtension()
const AppMenu  = Main.panel.statusArea.appMenu
const Override = Me.imports.overrides.helper
const VERSION  = Me.imports.overrides.helper.VERSION

const UNITE_HINTS = '_UNITE_ORIGINAL_STATE'
const MOTIF_HINTS = '_MOTIF_WM_HINTS'

const _SHOW_FLAGS = ['0x2', '0x0', '0x1', '0x0', '0x0']
const _WM_CLASSES = ['Firefox']

function safeSpawn(command) {
  try {
    return GLib.spawn_command_line_sync(command)
  } catch (e) {
    return [false, Bytes.fromString('')]
  }
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

function getHints(xid) {
  let value = getHint(xid, UNITE_HINTS)

  if (!value) {
    value = getHint(xid, MOTIF_HINTS, _SHOW_FLAGS)
    setHint(xid, UNITE_HINTS, value)
  }

  return value
}

function setHint(xid, hint, value) {
  value = value.join(', ')
  Util.spawn(['xprop', '-id', xid, '-f', hint, '32c', '-set', hint, value])
}

function isDecorated(hints) {
  return hints[2] != '0x2' && hints[2] != '0x0'
}

var ServerDecorations = class ServerDecorations extends Override.Injection {
  get active() {
    return true
  }

  _init(ctx) {
    if (_WM_CLASSES.includes(ctx.win.get_wm_class())) {
      ctx.mwm = getHints(ctx.xid)
      this._getter('handle')
    }
  }

  handle() {
    return isDecorated(this.mwm)
  }
}

var WindowManager = class WindowManager extends Override.Injection {
  get active() {
    return VERSION < 36
  }

  _init(ctx) {
    ctx.signals.connect(
      AppMenu._label, 'notify::text', this._onAppmenuChanged.bind(ctx)
    )
  }

  _onAppmenuChanged() {
    if (this.focusWindow) {
      this.focusWindow.syncAppmenu()
    }
  }
}
