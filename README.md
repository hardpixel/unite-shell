# Unite Shell
[<img src="https://raw.githubusercontent.com/andyholmes/gnome-shell-extensions-badge/master/get-it-on-ego.svg?sanitize=true" height="100" align="right">](https://extensions.gnome.org/extension/1287/unite/)
Unite is a GNOME Shell extension which makes a few layout tweaks to the top panel and removes window decorations to make it look like Ubuntu Unity Shell.

* Adds window buttons to the top panel for maximized windows.
* Shows current window title in the app menu for maximized windows.
* Removes titlebars on maximized windows.
* Hides window controls on maximized windows with headerbars.
* Moves the date to the right, fixes icons spacing and removes dropdown arrows.
* Moves legacy tray icons to the top panel.
* Moves notifications to the right.
* Hides activities button.
* Adds desktop name to the top panel.

### Screenshots
Unite running with the default options.

![Screenshot](https://raw.githubusercontent.com/hardpixel/unite-shell/master/screenshot.png)

Settings window available in gnome-tweaks.

![Settings](https://raw.githubusercontent.com/hardpixel/unite-shell/master/settings.png)

### Wayland
Since version `2` applications on wayland with client side decorations are supported using CSS.

## Install
Make sure you have installed `xorg-xprop`:

* Debian/Ubuntu: `apt install x11-utils`
* Fedora/RHEL: `dnf install xorg-x11-utils`
* Arch: `pacman -S xorg-xprop`

Then, download the latest [release](https://github.com/hardpixel/unite-shell/releases) and extract it into `~/.local/share/gnome-shell/extensions`. To get the complete Ubuntu Unity layout, you can combine it with [Dash to Dock](https://github.com/micheleg/dash-to-dock) or [Dash to Plank](https://github.com/hardpixel/dash-to-plank) extension and [Gnome HUD](https://github.com/hardpixel/gnome-hud) menu.

### Gnome Shell Extensions
The easiest way to install this extension is via the official [Gnome Shell Extensions](https://extensions.gnome.org) resource page [here](https://extensions.gnome.org/extension/1287/unite).

### Packages
Arch Linux: [AUR package](https://aur.archlinux.org/packages/gnome-shell-extension-unite)

## Contributing
Bug reports and pull requests are welcome on GitHub at https://github.com/hardpixel/unite-shell.

## License
Unite Shell is available as open source under the terms of the [GPLv3](http://www.gnu.org/licenses/gpl-3.0.en.html)

## Credits
This extension is inspired from [Pixel Saver](https://github.com/deadalnix/pixel-saver), [TopIcons Plus](https://github.com/phocean/TopIcons-plus), [Extend Left Box](https://github.com/StephenPCG/extend-left-box).
