guard :copy, from: 'src/assets', to: 'dist/unite@hardpixel.eu/assets', mkpath: true, run_at_start: true
guard :copy, from: 'src/meta', to: 'dist/unite@hardpixel.eu', mkpath: true, run_at_start: true

guard 'sprockets', destination: 'dist/unite@hardpixel.eu', asset_paths: ['src/sass'] do
  watch (%r{src/sass/stylesheet.sass}) { 'dist/unite@hardpixel.eu/stylesheet.css' }
  watch (%r{src/sass/buttons-left.sass}) { 'dist/unite@hardpixel.eu/buttons-left.css' }
  watch (%r{src/sass/buttons-right.sass}) { 'dist/unite@hardpixel.eu/buttons-right.css' }
  watch (%r{src/sass/_decoration.sass}) { 'dist/unite@hardpixel.eu/buttons-left.css' }
  watch (%r{src/sass/_decoration.sass}) { 'dist/unite@hardpixel.eu/buttons-right.css' }
end

guard 'sprockets', destination: 'dist/unite@hardpixel.eu', asset_paths: ['src/js'] do
  watch (%r{src/js/extension.js}) { 'dist/unite@hardpixel.eu/extension.js' }
  watch (%r{src/js/helperUtils.js}) { 'dist/unite@hardpixel.eu/helperUtils.js' }
  watch (%r{src/js/activateWindow.js}) { 'dist/unite@hardpixel.eu/activateWindow.js' }
  watch (%r{src/js/extendLeftBox.js}) { 'dist/unite@hardpixel.eu/extendLeftBox.js' }
  watch (%r{src/js/appMenu.js}) { 'dist/unite@hardpixel.eu/appMenu.js' }
  watch (%r{src/js/windowButtons.js}) { 'dist/unite@hardpixel.eu/windowButtons.js' }
  watch (%r{src/js/windowDecoration.js}) { 'dist/unite@hardpixel.eu/windowDecoration.js' }
  watch (%r{src/js/topIcons.js}) { 'dist/unite@hardpixel.eu/topIcons.js' }
end
