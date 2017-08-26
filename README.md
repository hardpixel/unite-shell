# Unite Shell

Unite makes GNOME Shell look like Ubuntu Unity Shell.

![Screenshot](https://raw.githubusercontent.com/hardpixel/unite-shell/master/screenshot.png)

## About
Unite is a GNOME Shell extension which makes a few layout tweaks to the top panel and removes window decorations to make it look like Ubuntu Unity Shell.

* Adds window buttons to the top panel for maximized windows.
* Shows current window title in the app menu for maximized windows.
* Moves the date to the right, fixes icons spacing and removes dropdown arrows.
* Moves legacy tray icons to the top panel.

### Wayland
On Wayland removing window decorations for windows with CSD is not working.

## Install
Make sure you have installed `xorg-xprop` and copy folder `unite@hardpixel.eu` into `~/.local/share/gnome-shell/extensions`. To get the complete Ubuntu Unity layout you can combine it with [Dash to Dock](https://github.com/micheleg/dash-to-dock) extension.

### Arch Linux
[AUR package](https://aur.archlinux.org/packages/gnome-shell-extension-unite)

## License
[GPLv3](http://www.gnu.org/licenses/gpl-3.0.en.html)

## Credits
This extension is inspired by or uses parts of code from the extensions [Pixel Saver](https://github.com/deadalnix/pixel-saver), [TopIcons Plus](https://github.com/phocean/TopIcons-plus), [Extend Left Box](https://github.com/StephenPCG/extend-left-box).
