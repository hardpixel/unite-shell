const GtkSettings = imports.gi.Gtk.Settings.get_default()
const Main        = imports.ui.main
const Me          = imports.misc.extensionUtils.getCurrentExtension()
const AppMenu     = Main.panel.statusArea.appMenu
const AggMenu     = Main.panel.statusArea.aggregateMenu
const Handlers    = Me.imports.handlers
const WidgetArrow = Me.imports.layout.WidgetArrow
const Override    = Me.imports.overrides.helper
const VERSION     = Me.imports.overrides.helper.VERSION
const CLASSIC     = global.session_mode == 'classic'

var AppMenuArrow = class AppMenuArrow extends Handlers.Feature {
  constructor() {
    super('hide-app-menu-arrow', setting => setting == true)
  }

  activate() {
    this.arrow = new WidgetArrow(AppMenu)
    this.arrow.hide()
  }

  destroy() {
    this.arrow.show()
  }
}

var AggMenuArrow = class AggMenuArrow extends Handlers.Feature {
  constructor() {
    super('hide-aggregate-menu-arrow', setting => setting == true)
  }

  activate() {
    this.arrow = new WidgetArrow(AggMenu)
    this.arrow.hide()
  }

  destroy() {
    this.arrow.show()
  }
}

var SystemFonts = class SystemFonts extends Handlers.Feature {
  constructor() {
    super('use-system-fonts', setting => setting == true)
  }

  activate() {
    this.signals = new Handlers.Signals()
    this.styles  = new Handlers.Styles()

    this.signals.connect(
      GtkSettings, 'notify::gtk-font-name', this._onFontsChange.bind(this)
    )

    this._onFontsChange()
  }

  get fontName() {
    return GtkSettings.gtk_font_name.replace(/\s\d+$/, '')
  }

  _resetStyles() {
    Main.panel._removeStyleClassName('system-fonts')
    this.styles.removeAll()
  }

  _onFontsChange() {
    this._resetStyles()

    this.styles.addWidgetStyle('uiGroup', Main.uiGroup, `font-family: ${this.fontName};`)
    this.styles.addWidgetStyle('panel', Main.panel, 'font-size: 11.25pt;')

    Main.panel._addStyleClassName('system-fonts')
  }

  destroy() {
    this.signals.disconnectAll()
    this._resetStyles()
  }
}

var DropdownArrows = class DropdownArrows extends Override.Injection {
  get active() {
    return VERSION < 40
  }

  _init() {
    this._replace('_handleWidget')
  }

  _handleWidget(name) {
    const ignored = ['aggregateMenu', 'appMenu']
    return !name.startsWith('unite') && !ignored.includes(name)
  }
}

var PanelSpacing = class PanelSpacing extends Override.Injection {
  get active() {
    return VERSION < 40
  }

  _init() {
    this._prepend('activate', this._onActivate)
    this._prepend('destroy', this._onDestroy)

    this._replace('_injectStyles')
    this._replace('_syncLayout')
  }

  _injectStyles() {
    this.styles.addShellStyle('spacingLegacy', '@/overrides/styles/spacing-legacy.css')
  }

  _syncLayout() {
    // Fix for panel spacing not applied until mouse-over
    // Issue: https://gitlab.gnome.org/GNOME/gnome-shell/-/issues/1708
    if (VERSION >= 34) {
      Object.values(Main.panel.statusArea).forEach(item => {
        if (item !== null) {
          item.add_style_pseudo_class('hover')
          item.remove_style_pseudo_class('hover')
        }
      })
    }
  }

  _onActivate() {
    if (CLASSIC == true) {
      Main.panel._addStyleClassName('classic-spacing')
    }

    if (VERSION < 34) {
      Main.panel._addStyleClassName('extra-spacing')
    }
  }

  _onDestroy() {
    Main.panel._removeStyleClassName('classic-spacing')
    Main.panel._removeStyleClassName('extra-spacing')
  }
}

var PanelSpacingClassic = class PanelSpacingClassic extends Override.Injection {
  get active() {
    return CLASSIC == true
  }

  _init() {
    this._prepend('activate', this._onActivate)
    this._prepend('destroy', this._onDestroy)
    this._prepend('_injectStyles')
  }

  _injectStyles() {
    this.styles.addShellStyle('spacingClassic', '@/overrides/styles/spacing-classic.css')
  }

  _onActivate() {
    AppMenu.add_style_class_name('app-menu-button')
    AppMenu._iconBox.hide()
  }

  _onDestroy() {
    AppMenu.remove_style_class_name('app-menu-button')
  }
}

var AppMenuIconClassic = class AppMenuIconClassic extends Override.Injection {
  get active() {
    return CLASSIC == true
  }

  _init() {
    this._prepend('activate', this._resizeAppIcon)
  }

  _resizeAppIcon() {
    AppMenu._iconBox.set_size(16, 16)
  }
}

var LayoutManager = class LayoutManager extends Override.Injection {
  get active() {
    return true
  }

  _init(ctx) {
    if (VERSION < 40) {
      ctx.features.add(AppMenuArrow)
      ctx.features.add(AggMenuArrow)
    }

    if (VERSION < 36) {
      ctx.features.add(SystemFonts)
    }
  }
}
