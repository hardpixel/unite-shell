const Unite = imports.misc.extensionUtils.getCurrentExtension()

var Injection = class Injection {
  __override__(ctx) {
    if (!this.active) return

    this._replace = (key, fn) => {
      const method = fn || this[key]
      ctx[key] = (...args) => method.call(ctx, ...args)
    }

    this._prepend = (key, fn) => {
      const method = fn || this[key]
      const target = ctx[key]

      ctx[key] = (...args) => {
        method.call(ctx, ...args)
        return target.call(ctx, ...args)
      }
    }

    this._append = (key, fn) => {
      const method = fn || this[key]
      const target = ctx[key]

      ctx[key] = (...args) => {
        target.call(ctx, ...args)
        return method.call(ctx, ...args)
      }
    }

    this._init(ctx)
  }
}

function inject(ctx, path, name) {
  const klass = Unite.imports.overrides[path][name]

  if (klass)  {
    const instance = new klass()
    instance.__override__(ctx)
  } else {
    throw new Error(`Unite Error: Override ${path}.${name} does not exist!`)
  }
}
