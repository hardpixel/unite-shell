# Unite Shell
Unite is a GNOME Shell extension which makes a few layout tweaks to the top panel and removes window decorations to make it look like Ubuntu Unity Shell.

* Adds window buttons to the top panel for maximized windows.
* Shows current window title in the app menu for maximized windows.
* Removes titlebars on maximized windows.
* Hides window controls on maximized windows with headerbars.
* Moves the date to the right, fixes icons spacing and removes dropdown arrows.
* Moves legacy tray icons to the top panel.
* Moves notifications to the right.
* Hides activities button / workspace switcher.
* Adds desktop name to the top panel.

### Screenshots
Unite running with the default options.

![Screenshot](https://raw.githubusercontent.com/hardpixel/unite-shell/master/screenshot.png)

Settings window available in gnome extensions application.

![Settings](https://raw.githubusercontent.com/hardpixel/unite-shell/master/settings.png)

## Installation
Before installing the extension, make sure you have installed `xprop`.

| Distribution | Package Name | Install Command |
| ------------ | ------------ | --------------- |
| Debian, Ubuntu |x11-utils | `apt install x11-utils` |
| Fedora, RHEL | xprop| `dnf install xprop` |
| Fedora Silverblue |xprop | `rpm-ostree install xprop` |
| Arch Linux, Manjaro, EndeavourOS |xorg-xprop | `pacman -S xorg-xprop` |

Then install the latest version using the commands below.

```bash
wget https://github.com/hardpixel/unite-shell/releases/download/v79/unite-v79.zip
gnome-extensions install unite-v79.zip
```

To get notifications for new [releases](https://github.com/hardpixel/unite-shell/releases) you can watch this repository.

For the complete Ubuntu Unity layout, you can combine it with [Dash to Dock](https://github.com/micheleg/dash-to-dock) extension and [Gnome HUD](https://github.com/hardpixel/gnome-hud) menu.

### Gnome Shell Extensions
For Gnome versions up to 44 you can install the extension from the official extensions resource page [here](https://extensions.gnome.org/extension/1287/unite).

### Packages
Arch Linux: [AUR package](https://aur.archlinux.org/packages/gnome-shell-extension-unite)

## Contributing
Bug reports and pull requests are welcome on GitHub at https://github.com/hardpixel/unite-shell.

## License
Unite Shell is available as open source under the terms of the [GPLv3](http://www.gnu.org/licenses/gpl-3.0.en.html)

## Credits
This extension is inspired from [Pixel Saver](https://github.com/deadalnix/pixel-saver), [TopIcons Plus](https://github.com/phocean/TopIcons-plus), [Extend Left Box](https://github.com/StephenPCG/extend-left-box).
