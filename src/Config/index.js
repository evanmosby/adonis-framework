"use strict";

/**
 * adonis-framework
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

const _ = require("lodash");
const requireAll = require("require-all");
const debug = require("debug")("adonis:framework");

/**
 * Manages configuration by recursively reading all
 * `.js` files from the `config` folder.
 *
 * @alias Config
 * @binding Adonis/Src/Config
 * @group Core
 * @singleton
 *
 * @class Config
 * @constructor
 *
 * @param {String} configPath Absolute path from where to load the config files from
 */
class Config {
  constructor(configPath, Event) {
    this.Event = Event;
    this._configPath = configPath;
    this._config = {};
    this.syncWithFileSystem();
  }

  /**
   * Syncs the in-memory config store with the
   * file system. Ideally you should keep your
   * config static and never update the file
   * system on the fly.
   *
   * @method syncWithFileSystem
   *
   * @return {void}
   */
  syncWithFileSystem() {
    try {
      this._config = requireAll({
        dirname: this._configPath,
        filter: /(.*)\.js$/,
      });
      debug("loaded all config files from %s", this._configPath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  /**
   * Get value for a given key from the config store. Nested
   * values can be accessed via (dot notation). Values
   * referenced with `self::` are further resolved.
   *
   * @method get
   *
   * @param  {String} key
   * @param  {Mixed} [defaultValue]
   *
   * @return {Mixed}
   *
   * @example
   * ```
   * Config.get('database.mysql')
   *
   * // referenced
   * {
   *   prodMysql: 'self::database.mysql'
   * }
   * Config.get('database.prodMysql')
   * ```
   */
  get(key, defaultValue) {
    return _.clone(_.get(this._config, key, defaultValue));
  }

  /**
   * Merge default values with the resolved values.
   * This is to provide a default set of values
   * when it does not exists. This method uses
   * lodash `_.mergeWith` method.
   *
   * @method merge
   *
   * @param  {String}   key
   * @param  {Object}   defaultValues
   * @param  {Function} [customizer]
   *
   * @return {Object}
   *
   * @example
   * ```js
   * Config.merge('services.redis', {
   *   port: 6379,
   *   host: 'localhost'
   * })
   * ```
   */
  merge(key, defaultValues, customizer) {
    const current = this.get(key, {});
    return _.mergeWith(defaultValues, current, customizer);
  }

  mergeOver(key, newValues, customizer) {
    const current = this.get(key, {});
    return _.mergeWith(current, newValues, customizer);
  }

  /**
   * Update value for a given key inside the config store. If
   * value does not exists it will be created.
   *
   * ## Note
   * This method updates the value in memory and not on the
   * file system.
   *
   * @method set
   *
   * @param  {String} key
   * @param  {Mixed}  value
   *
   * @example
   * ```js
   * Config.set('database.mysql.host', '127.0.0.1')
   *
   * // later get the value
   * Config.get('database.mysql.host')
   * ```
   */
  set(key, value, emit = true) {
    const oldValue = this.get(key);
    _.set(this._config, key, value);
    if (emit) {
      this.Event.emit("config::set", { key, value, oldValue });
    }
  }

  delete(key, emit = true) {
    const oldValue = this.get(key);
    _.unset(this._config, key);
    if (emit) {
      this.Event.emit("config::delete", { key, oldValue });
    }
  }
}

module.exports = Config;
