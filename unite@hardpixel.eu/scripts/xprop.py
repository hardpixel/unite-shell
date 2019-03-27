import os
import gi
import sys

gi.require_version('Gdk', '3.0')
gi.require_version('GdkX11', '3.0')

os.environ['GDK_BACKEND'] = 'x11'

from gi.repository import Gdk
from gi.repository import GdkX11


def get_xwindow(id):
  display = Gdk.Display.get_default()
  return GdkX11.X11Window.foreign_new_for_display(display, int(id, 16))


def set_titlebar(window, hide):
  current = window.get_hide_titlebar_when_maximized()

  if current != hide:
    window.set_hide_titlebar_when_maximized(hide)
    Gdk.flush()


def set_decorations(window, hide):
  hide_flag = Gdk.WMDecoration.BORDER
  show_flag = Gdk.WMDecoration.ALL
  [_, flag] = window.get_decorations()

  if hide == 'true' and flag != hide_flag:
    window.set_decorations(hide_flag)
    Gdk.flush()

  if hide == 'false' and flag != show_flag:
    window.set_decorations(show_flag)
    Gdk.flush()


def main(id, hide, use_motif):
  window = get_xwindow(id)

  if window and use_motif == 'true':
    set_decorations(window, hide)

  elif window and use_motif == 'false':
    set_titlebar(window, hide)


if __name__ == '__main__':
  main(*sys.argv[1:])
