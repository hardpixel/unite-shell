const Gi       = imports._gi
const Clutter  = imports.gi.Clutter
const Main     = imports.ui.main
const Me       = imports.misc.extensionUtils.getCurrentExtension()
const Override = Me.imports.overrides.helper
const VERSION  = Me.imports.overrides.helper.VERSION
const CLASSIC  = global.session_mode == 'classic'

var ExtendLeftBox = class ExtendLeftBox extends Override.Injection {
  get active() {
    return Gi.gobject_prototype_symbol === undefined
  }

  _init() {
    this._replace('_injectAllocate')
    this._replace('_restoreAllocate')
  }

  _injectAllocate() {
    Main.panel.__proto__[Gi.hook_up_vfunc_symbol]('allocate', (box) => {
      this._allocate(Main.panel, box)
    })
  }

  _restoreAllocate() {
    Main.panel.__proto__[Gi.hook_up_vfunc_symbol](
      'allocate', Main.panel.__proto__.vfunc_allocate
    )
  }
}

var ExtendLeftBoxLegacy = class ExtendLeftBoxLegacy extends Override.Injection {
  get active() {
    return VERSION < 38
  }

  _init() {
    this._replace('_injectAllocate')
    this._replace('_restoreAllocate')
    this._replace('_allocate')
  }

  _injectAllocate() {
    Main.panel.__proto__[Gi.hook_up_vfunc_symbol]('allocate', (box, flags) => {
      this._allocate(Main.panel, box, flags)
    })
  }

  _restoreAllocate() {
    Main.panel.__proto__[Gi.hook_up_vfunc_symbol](
      'allocate', Main.panel.__proto__.vfunc_allocate
    )
  }

  _allocate(actor, box, flags) {
    actor.set_allocation(box, flags)

    const leftBox     = actor._leftBox
    const centerBox   = actor._centerBox
    const rightBox    = actor._rightBox
    const childBox    = new Clutter.ActorBox()

    const leftWidth   = leftBox.get_preferred_width(-1)[1]
    const centerWidth = centerBox.get_preferred_width(-1)[1]
    const rightWidth  = rightBox.get_preferred_width(-1)[1]

    const allocWidth  = box.x2 - box.x1
    const allocHeight = box.y2 - box.y1
    const sideWidth   = Math.floor(allocWidth - centerWidth - rightWidth)

    const rtlTextDir  = actor.get_text_direction() == Clutter.TextDirection.RTL

    childBox.y1 = 0
    childBox.y2 = allocHeight

    if (rtlTextDir) {
      childBox.x1 = allocWidth - Math.min(sideWidth, leftWidth)
      childBox.x2 = allocWidth
    } else {
      childBox.x1 = 0
      childBox.x2 = Math.min(sideWidth, leftWidth)
    }

    leftBox.allocate(childBox, flags)

    childBox.y1 = 0
    childBox.y2 = allocHeight

    if (rtlTextDir) {
      childBox.x1 = rightWidth
      childBox.x2 = childBox.x1 + centerWidth
    } else {
      childBox.x1 = allocWidth - centerWidth - rightWidth
      childBox.x2 = childBox.x1 + centerWidth
    }

    centerBox.allocate(childBox, flags)

    childBox.y1 = 0
    childBox.y2 = allocHeight

    if (rtlTextDir) {
      childBox.x1 = 0
      childBox.x2 = rightWidth
    } else {
      childBox.x1 = allocWidth - rightWidth
      childBox.x2 = allocWidth
    }

    rightBox.allocate(childBox, flags)
  }
}

var TitlebarActions = class TitlebarActions extends Override.Injection {
  get active() {
    return VERSION < 42
  }

  _init() {
    this._replace('_menuPositionRect')
  }

  _menuPositionRect(x) {
    const size = Main.panel.height + 4
    return { x: x - size, y: 0, width: size * 2, height: size }
  }
}

var ActivitiesButtonClassic = class ActivitiesButtonClassic extends Override.Injection {
  get active() {
    return CLASSIC == true
  }

  _init() {
    this._replace('activate', () => {})
    this._replace('destroy', () => {})
  }
}
