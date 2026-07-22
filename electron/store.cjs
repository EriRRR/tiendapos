const { app } = require('electron')
const path = require('path')
const fs = require('fs')

const configPath = path.join(app.getPath('userData'), 'tiendapos-config.json')

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    }
  } catch (e) {
    console.warn('[Store] Error leyendo config:', e.message)
  }
  return {}
}

function saveConfig(data) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (e) {
    console.error('[Store] Error guardando config:', e.message)
  }
}

const store = {
  _data: null,
  _loaded: false,
  _ensureLoaded() {
    if (!this._loaded) {
      this._data = loadConfig()
      this._loaded = true
    }
  },
  get(k, def) {
    this._ensureLoaded()
    return this._data[k] !== undefined ? this._data[k] : def
  },
  set(k, v) {
    this._ensureLoaded()
    this._data[k] = v
    saveConfig(this._data)
  },
}

module.exports = store