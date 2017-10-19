const Gettext        = imports.gettext;
const Gio            = imports.gi.Gio;
const Config         = imports.misc.config;
const ExtensionUtils = imports.misc.extensionUtils;
const Unite          = ExtensionUtils.getCurrentExtension();
const GioSSS         = Gio.SettingsSchemaSource;

function initTranslations(domain) {
  domain = domain || Unite.metadata['gettext-domain'];

  let localeDir = Unite.dir.get_child('locale');

  if (localeDir.query_exists(null)) {
    Gettext.bindtextdomain(domain, localeDir.get_path());
  } else {
    Gettext.bindtextdomain(domain, Config.LOCALEDIR);
  }
}

function getSettings(schema) {
  schema = schema || Unite.metadata['settings-schema'];

  let schemaDir    = Unite.dir.get_child('schemas');
  let schemaSource = null;

  if (schemaDir.query_exists(null)) {
    schemaSource = GioSSS.new_from_directory(schemaDir.get_path(), GioSSS.get_default(), false);
  } else {
    schemaSource = GioSSS.get_default();
  }

  let schemaObj = schemaSource.lookup(schema, true);

  if (!schemaObj) {
    let message = 'Schema ' + schema + ' could not be found for extension ' + Unite.metadata.uuid;
    throw new Error(message + '. Please check your installation.');
  }

  return new Gio.Settings({ settings_schema: schemaObj });
}
