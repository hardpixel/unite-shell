const Main             = imports.ui.main
const Unite            = imports.misc.extensionUtils.getCurrentExtension()

class UniteExtension {
  constructor() {

    Main.panel._addStyleClassName('unite-shell')
  }

  destroy() {

    Main.panel._removeStyleClassName('unite-shell')
  }
}

let uniteExtension

function enable() {
  uniteExtension = new UniteExtension()
}

function disable() {
  uniteExtension.destroy()
  uniteExtension = null
}
