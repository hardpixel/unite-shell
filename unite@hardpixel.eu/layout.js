import GObject from 'gi://GObject'
import St from 'gi://St'
import Clutter from 'gi://Clutter'
import * as Main from 'resource:///org/gnome/shell/ui/main.js'
import * as Handlers from './handlers.js'

class Messages extends Handlers.Feature {
  constructor() {
    super('notifications-position', setting => setting != 'center')
  }

  activate() {
    this.settings = new Handlers.Settings()

    this.settings.connect(
      'notifications-position', this._onPositionChange.bind(this)
    )

    this._onPositionChange()
  }

  get position() {
    const mapping = { left: 'START', right: 'END' }
    const setting = this.settings.get('notifications-position')

    return mapping[setting]
  }

  _onPositionChange() {
    const banner   = Main.messageTray._bannerBin
    const context  = St.ThemeContext.get_for_stage(global.stage)
    const position = Clutter.ActorAlign[this.position]

    banner.set_x_align(position)
    banner.set_width(390 * context.scale_factor)
  }

  destroy() {
    const banner   = Main.messageTray._bannerBin
    const position = Clutter.ActorAlign.CENTER

    banner.set_x_align(position)
    banner.set_width(-1)

    this.settings.disconnectAll()
  }
}

class PanelSpacing extends Handlers.Feature {
  constructor() {
    super('reduce-panel-spacing', setting => setting == true)
  }

  activate() {
    this.styles = new Handlers.Styles()
    this._injectStyles()

    Main.panel.add_style_class_name('reduce-spacing')
    this._syncLayout()
  }

  _injectStyles() {
    this.styles.addShellStyle('spacing', '@/styles/shell/spacing.css')
  }

  _syncLayout() {
    // Fix dateMenu paddings when reduce spacing enabled
    // when returning from lock screen
    const dateMenu = Main.panel.statusArea.dateMenu
    const paddings = this._dateMenuPadding

    if (!paddings) {
      this._dateMenuPadding = [dateMenu._minHPadding, dateMenu._natHPadding]

      dateMenu._minHPadding = 0
      dateMenu._natHPadding = 0
    } else {
      dateMenu._minHPadding = paddings[0]
      dateMenu._natHPadding = paddings[1]

      this._dateMenuPadding = null
    }

    dateMenu.queue_relayout()
  }

  destroy() {
    Main.panel.remove_style_class_name('reduce-spacing')
    this.styles.removeAll()

    this._syncLayout()
  }
}

export const LayoutManager = GObject.registerClass(
  class UniteLayoutManager extends GObject.Object {
    _init() {
      this.features = new Handlers.Features()

      this.features.add(Messages)
      this.features.add(PanelSpacing)
    }

    activate() {
      this.features.activate()
    }

    destroy() {
      this.features.destroy()
    }
  }
)
