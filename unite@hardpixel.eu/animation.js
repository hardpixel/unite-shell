import GObject from 'gi://GObject'
import St from 'gi://St'
import Clutter from 'gi://Clutter'
import * as Animation from 'resource:///org/gnome/shell/ui/animation.js'

export const Spinner = GObject.registerClass(
  class UniteSpinner extends Animation.Spinner {
    play() {
      if (!this._spinner) {
        this._spinner = new St.SpinnerContent()
        this.set_content(this._spinner)
      }

      this.remove_all_transitions()
      this.show()

      this.ease({
        opacity: 255,
        delay: 1000,
        duration: 300,
        mode: Clutter.AnimationMode.LINEAR
      })
    }

    stop() {
      this.remove_all_transitions()

      this.ease({
        opacity: 0,
        duration: 300,
        mode: Clutter.AnimationMode.LINEAR,
        onComplete: () => { this.hide() }
      })
    }
  }
)
