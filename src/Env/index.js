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
const path = require("path");
const util = require("util");
const dotenv = require("dotenv");
const dotenvStringify = require("dotenv-stringify");

const fs = require("fs");
const GE = require("@adonisjs/generic-exceptions");
const debug = require("debug")("adonis:framework");
const process = require("process");
const lockFile = require("lockfile");

/**
 * Manages the application environment variables by
 * reading the `.env` file from the project root.
 *
 * If `.env` file is missing, an exception will be thrown
 * to supress the exception, pass `ENV_SILENT=true` when
 * starting the app.
 *
 * Can define different location by setting `ENV_PATH`
 * environment variable.
 *
 * @binding Adonis/Src/Env
 * @group Core
 * @alias Env
 * @singleton
 *
 * @class Env
 * @constructor
 */
class Env {
  constructor(appRoot) {
    this.appRoot = appRoot;
    const bootedAsTesting = process.env.NODE_ENV === "testing";
    const env = this.load(this.getEnvPath(), false); // do not overwrite at first place
    this._defaults = this.readDefaultEnvFile()

    /**
     * Throwing the exception when ENV_SILENT is not set to true
     * and ofcourse there is an error
     */
    if (env.error && process.env.ENV_SILENT !== "true") {
      throw env.error;
    }

    /**
     * Load the `.env.testing` file if app was booted
     * under testing mode
     */
    if (bootedAsTesting) {
      this.load(".env.testing");
    }
  }

  get defaults() {
    return this._defaults
  }

  /**
   * Replacing dynamic values inside .env file
   *
   * @method _interpolate
   *
   * @param  {String}     env
   * @param  {Object}     envConfig
   *
   * @return {String}
   *
   * @private
   */
  _interpolate(env, envConfig) {
    const matches =
      env.match(/(\\)?\$([a-zA-Z0-9_]+)|(\\)?\${([a-zA-Z0-9_]+)}/g) || [];
    _.each(matches, (match) => {
      /**
       * Variable is escaped
       */
      if (match.indexOf("\\") === 0) {
        env = env.replace(match, match.replace(/^\\\$/, "$"));
        return;
      }

      const key = match.replace(/\$|{|}/g, "");
      const variable = envConfig[key] || process.env[key] || "";
      env = env.replace(match, this._interpolate(variable, envConfig));
    });

    return env;
  }

  /**
   * Load env file from a given location.
   *
   * @method load
   *
   * @param  {String}  filePath
   * @param  {Boolean} [overwrite = 'true']
   * @param  {String}  [encoding = 'utf8']
   *
   * @return {Object}
   */
  load(filePath, overwrite = true, encoding = "utf8") {
    const options = {
      path: path.isAbsolute(filePath)
        ? filePath
        : path.join(this.appRoot, filePath),
      encoding,
    };

    try {
      const envConfig = dotenv.parse(
        fs.readFileSync(options.path, options.encoding)
      );

      /**
       * Dotenv doesn't overwrite existing env variables, so we
       * need to do it manaully by parsing the file.
       */
      debug(
        "%s environment file from %s",
        overwrite ? "merging" : "loading",
        options.path
      );

      /**
       * Loop over values and set them on environment only
       * when actual value is not defined or overwrite
       * is set to true
       */
      _.each(envConfig, (value, key) => {
        if (process.env[key] === undefined || overwrite) {
          process.env[key] = this._interpolate(value, envConfig);
        }
      });
      return { parsed: envConfig };
    } catch (error) {
      return { error };
    }
  }

  readDefaultEnvFile() {
    //const file = await fs.promises.readFile(this.getDefaultEnvPath());
    const envConfig = dotenv.parse(
      fs.readFileSync(this.getDefaultEnvPath(), "utf8")
    );
    return envConfig;
  }

  async readEnvFile() {
    // const file = await fs.promises.readFile(this.getEnvPath());
    const file = await util.promisify(fs.readFile)(this.getEnvPath());
    const env = dotenv.parse(file);
    return env;
  }

  async writeEnvFile(newProps = {}) {
    const tempLockFile = this.getEnvPath() + ".lock";

    await util.promisify(lockFile.lock)(tempLockFile, {
      retries: 50,
      retryWait: 50,
      stale: 250,
    });
    const currentProps = await this.readEnvFile();
    const mergedProps = { ...currentProps, ...newProps };
    const orderedProps = {};
    Object.keys(mergedProps)
      .sort()
      .forEach(function (key) {
        orderedProps[key] = mergedProps[key];
      });

    // await fs.promises.writeFile(
    //   this.getEnvPath(),
    //   dotenvStringify(orderedProps)
    // );
    await util.promisify(fs.writeFile)(
      this.getEnvPath(),
      dotenvStringify(orderedProps)
    );

    this.load(this.getEnvPath(), false);
    await util.promisify(lockFile.unlock)(tempLockFile);

    return orderedProps;
  }

  /**
   * Returns the path from where the `.env`
   * file should be loaded.
   *
   * @method getEnvPath
   *
   * @return {String}
   */
  getEnvPath() {
    if (!process.env.ENV_PATH || process.env.ENV_PATH.length === 0) {
      return process.pkg
        ? path.join(
          path
            .dirname(process.execPath)
            .split(path.sep)
            .slice(0, -1)
            .join(path.sep),
          ".env"
        )
        : ".env";
    }
    return process.env.ENV_PATH;
  }

  /**
   * Returns the path from where the `.env`
   * file should be loaded.
   *
   * @method getEnvPath
   *
   * @return {String}
   */
  getDefaultEnvPath() {
    if (
      !process.env.DEFAULT_ENV_PATH ||
      process.env.DEFAULT_ENV_PATH.length === 0
    ) {
      return ".env.default";
    }
    return process.env.DEFAULT_ENV_PATH;
  }

  /**
   * Get value for a given key from the `process.env`
   * object.
   *
   * @method get
   *
   * @param  {String} key
   * @param  {Mixed} [defaultValue = null]
   *
   * @return {Mixed}
   *
   * @example
   * ```js
   * Env.get('CACHE_VIEWS', false)
   * ```
   */
  get(key, defaultValue = null) {
    return _.get(process.env, key, defaultValue);
  }

  /**
   * Get value for a given key from the `process.env`
   * object or throw an error if the key does not exist.
   *
   * @method getOrFail
   *
   * @param  {String} key
   *
   * @return {Mixed}
   *
   * @example
   * ```js
   * Env.getOrFail('MAIL_PASSWORD')
   * ```
   */
  getOrFail(key) {
    const val = _.get(process.env, key);

    if (_.isUndefined(val)) {
      throw GE.RuntimeException.missingEnvKey(key);
    }

    return val;
  }

  /**
   * Set value for a given key inside the `process.env`
   * object. If value exists, will be updated
   *
   * @method set
   *
   * @param  {String} key
   * @param  {Mixed} value
   *
   * @return {void}
   *
   * @example
   * ```js
   * Env.set('PORT', 3333)
   * ```
   */
  set(key, value) {
    _.set(process.env, key, value);
  }
}

module.exports = Env;
