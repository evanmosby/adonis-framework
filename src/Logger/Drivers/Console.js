'use strict'

/*
 * adonis-framework
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const _ = require('lodash')
const winston = require('winston')

/**
 * Winston console transport driver for @ref('Logger').
 * All the logs will be written to `stdout` or
 * `stderr` based upon the log level.
 *
 * @class WinstonConsole
 * @constructor
 */
class WinstonConsole {
  setConfig (config) {
    /**
     * Merging user config with defaults.
     */
    this.config = Object.assign({}, {
      name: 'adonis-app',
      level: 'info',
      timestamp: new Date().toLocaleTimeString()
    }, config)

    const format = this.config.format || winston.format.combine(
      winston.format.colorize(),
      winston.format.splat(),
      winston.format.simple()
    )

    delete this.config.format

    /**
     * Creating new instance of winston with file transport
     */
    this.logger = winston.createLogger({
      format: format,
      levels: this.levels,
      transports: [new winston.transports.Console(this.config)]
    })

    winston.addColors({
      severe: 'bold red',
      warning: 'bold yellow',
      info: 'bold blue',
      fine: 'bold cyan',
      verbose: 'bold gray',
      debug: 'bold white',
    });
  }

  /**
   * A list of available log levels
   *
   * @attribute levels
   *
   * @return {Object}
   */
  get levels () {
    return {
      severe: 0,
      warning: 1,
      info: 2,
      fine: 3,
      verbose: 4,
      debug: 5,
    }
  }

  /**
   * Returns the current level for the driver
   *
   * @attribute level
   *
   * @return {String}
   */
  get level () {
    return this.logger.transports[0].level
  }

  /**
   * Update driver log level at runtime
   *
   * @param  {String} level
   *
   * @return {void}
   */
  set level (level) {
    this.logger.transports[0].level = level
  }

  /**
   * Log message for a given level.
   *
   * @method log
   *
   * @param  {Number}    level
   * @param  {String}    msg
   * @param  {...Spread} meta
   *
   * @return {void}
   */
  log (level, msg, ...meta) {
    const levelName = _.findKey(this.levels, (num) => {
      return num === level
    })
    this.logger.log(levelName, msg, ...meta)
  }
}

module.exports = WinstonConsole
