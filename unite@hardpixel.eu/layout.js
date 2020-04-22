const GObject     = imports.gi.GObject
const St          = imports.gi.St
const Clutter     = imports.gi.Clutter
const GtkSettings = imports.gi.Gtk.Settings.get_default()
const Main        = imports.ui.main
const Config      = imports.misc.config
const Unite       = imports.misc.extensionUtils.getCurrentExtension()
const AppMenu     = Main.panel.statusArea.appMenu
const AggMenu     = Main.panel.statusArea.aggregateMenu
const Handlers    = Unite.imports.handlers

const VERSION = parseInt(Config.PACKAGE_VERSION.split('.')[1])

function actorHasClass(actor, name) {
  return actor.has_style_class_name && actor.has_style_class_name(name)
}

function getWidgetArrow(widget) {
  let arrow = widget._arrow

  if (!arrow) {
    const last  = widget.get_n_children() - 1
    const actor = widget.get_children()[last]

    if (actor) {
      if (actorHasClass(actor, 'popup-menu-arrow')) {
        arrow = actor
      } else {
        arrow = getWidgetArrow(actor)
      }
    }
  }

  if (arrow && !widget.hasOwnProperty('_arrow')) {
    widget._arrow = arrow
  }

  return arrow
}

function toggleWidgetArrow(widget, hide) {
  const arrow = widget && getWidgetArrow(widget)

  if (arrow) {
    if (hide && !widget._arrowHandled) {
      arrow.visible = false
      widget._arrowHandled = true
    }

    if (!hide && widget._arrowHandled) {
      arrow.visible = true
      delete widget._arrowHandled
    }
  }
}

var LayoutManager = GObject.registerClass(
  class UniteLayoutManager extends GObject.Object {
    _init() {
      this.signals  = new Handlers.Signals()
      this.settings = new Handlers.Settings()
      this.styles   = new Handlers.Styles()

      this.signals.connect(
        Main.panel._leftBox, 'actor_added', this._onHideDropdownArrows.bind(this)
      )

      this.signals.connect(
        Main.panel._centerBox, 'actor_added', this._onHideDropdownArrows.bind(this)
      )

      this.signals.connect(
        Main.panel._rightBox, 'actor_added', this._onHideDropdownArrows.bind(this)
      )

      this.settings.connect(
        'notifications-position', this._onNotificationsChange.bind(this)
      )

      this.settings.connect(
        'hide-app-menu-icon', this._onHideAppMenuIcon.bind(this)
      )

      this.settings.connect(
        'hide-app-menu-arrow', this._onHideAppMenuArrow.bind(this)
      )

      this.settings.connect(
        'hide-aggregate-menu-arrow', this._onHideAggMenuArrow.bind(this)
      )

      this.settings.connect(
        'hide-dropdown-arrows', this._onHideDropdownArrows.bind(this)
      )

      this.settings.connect(
        'use-system-fonts', this._onChangeStyles.bind(this)
      )

      this.settings.connect(
        'reduce-panel-spacing', this._onChangeStyles.bind(this)
      )

      if (VERSION < 36) {
        this.signals.connect(
          GtkSettings, 'notify::gtk-font-name', this._onChangeStyles.bind(this)
        )
      }
    }

    _onNotificationsChange() {
      const setting = this.settings.get('notifications-position')

      if (setting != 'center') {
        const context  = St.ThemeContext.get_for_stage(global.stage)
        const banner   = Main.messageTray._bannerBin
        const mappings = { left: 'START', right: 'END' }
        const position = mappings[setting]

        banner.set_x_align(Clutter.ActorAlign[position])
        banner.set_width(390 * context.scale_factor)
      } else {
        this._resetNotifications()
      }
    }

    _onHideAppMenuIcon() {
      const setting = this.settings.get('hide-app-menu-icon')

      if (setting) {
        AppMenu._iconBox.hide()
      } else {
        this._resetAppMenuIcon()
      }
    }

    _onHideAppMenuArrow() {
      const setting = this.settings.get('hide-app-menu-arrow')

      if (setting) {
        toggleWidgetArrow(AppMenu, true)
      } else {
        this._resetAppMenuArrow()
      }
    }

    _onHideAggMenuArrow() {
      const setting = this.settings.get('hide-aggregate-menu-arrow')

      if (setting) {
        toggleWidgetArrow(AggMenu, true)
      } else {
        this._resetAggMenuArrow()
      }
    }

    _onHideDropdownArrows() {
      const setting = this.settings.get('hide-dropdown-arrows')

      if (setting) {
        for (const [name, widget] of Object.entries(Main.panel.statusArea)) {
          if (name != 'aggregateMenu' && name != 'appMenu') {
            toggleWidgetArrow(widget, true)
          }
        }
      } else {
        this._resetDropdownArrows()
      }
    }

    _onChangeStyles() {
      const fonts = this.settings.get('use-system-fonts')
      const space = this.settings.get('reduce-panel-spacing')

      this._resetStyles()

      if (VERSION < 36 && fonts) {
        const font = GtkSettings.gtk_font_name.replace(/\s\d+$/, '')

        this.styles.addWidgetStyle('uiGroup', Main.uiGroup, `font-family: ${font};`)
        this.styles.addWidgetStyle('panel', Main.panel, 'font-size: 11.25pt;')
      }

      if (space) {
        Main.panel._addStyleClassName('small-spacing')
      }

      if (VERSION < 34) {
        Main.panel._addStyleClassName('extra-spacing')
      }

      this._syncStyles()
    }

    _resetNotifications() {
      const banner = Main.messageTray._bannerBin

      banner.set_x_align(Clutter.ActorAlign.CENTER)
      banner.set_width(-1)
    }

    _resetAppMenuIcon() {
      AppMenu._iconBox.show()
    }

    _resetAppMenuArrow() {
      toggleWidgetArrow(AppMenu, false)
    }

    _resetAggMenuArrow() {
      toggleWidgetArrow(AggMenu, false)
    }

    _resetDropdownArrows() {
      for (const [name, widget] of Object.entries(Main.panel.statusArea)) {
        if (name != 'aggregateMenu' && name != 'appMenu') {
          toggleWidgetArrow(widget, false)
        }
      }
    }

    _resetStyles() {
      Main.panel._removeStyleClassName('small-spacing')
      Main.panel._removeStyleClassName('extra-spacing')

      this.styles.deleteStyle('uiGroup')
      this.styles.deleteStyle('panel')
    }

    // Fix for panel spacing not applied until mouse-over
    // Issue: https://gitlab.gnome.org/GNOME/gnome-shell/-/issues/1708
    _syncStyles() {
      const space = this.settings.get('reduce-panel-spacing')

      if (VERSION >= 34 && space) {
        Object.values(Main.panel.statusArea).forEach((item) => {
          if (item !== null) {
            item.add_style_pseudo_class('hover')
            item.remove_style_pseudo_class('hover')
          }
        })
      }
    }

    activate() {
      this._onNotificationsChange()
      this._onHideAppMenuIcon()
      this._onHideAppMenuArrow()
      this._onHideAggMenuArrow()
      this._onHideDropdownArrows()
      this._onChangeStyles()
    }

    destroy() {
      this._resetNotifications()
      this._resetAppMenuIcon()
      this._resetAppMenuArrow()
      this._resetAggMenuArrow()
      this._resetDropdownArrows()
      this._resetStyles()
      this._syncStyles()

      this.signals.disconnectAll()
      this.settings.disconnectAll()
      this.styles.removeAll()
    }
  }
)
