const Gi       = imports._gi
const Main     = imports.ui.main
const Me       = imports.misc.extensionUtils.getCurrentExtension()
const Override = Me.imports.overrides.helper
const VERSION  = Me.imports.overrides.helper.VERSION

var ExtendLeftBox = class ExtendLeftBox extends Override.Injection {
  get active() {
    return VERSION < 38
  }

  _init() {
    this._replace('_injectAllocate')
    this._replace('_boxAllocate')
  }

  _injectAllocate() {
    Main.panel.__proto__[Gi.hook_up_vfunc_symbol]('allocate', (box, flags) => {
      Main.panel.vfunc_allocate.call(Main.panel, box, flags)
      this._allocate(Main.panel, box, flags)
    })
  }

  _boxAllocate(box, childBox, flags) {
    box.allocate(childBox, flags)
  }
}
