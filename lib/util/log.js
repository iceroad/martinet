const col = require('colors'),
  callsite = require('./callsite'),
  fmt = require('util').format
  ;

const LEVELS = {
  NORMAL: 1,
  INFO: 2,
  VERBOSE: 3,
  DEBUG: 4,
};


class SysLog {
  //
  // Base logging function.
  //
  baseLog(colFn, logStream, ...args) {
    console.log([
      colFn(`${logStream}:`),
      col.blue(callsite().summary),
      colFn(fmt(...args)),
    ].join(' '));
  }

  //
  // Stream aliases
  //
  info(...args) {
    if (process.env.LOGLEVEL >= LEVELS.INFO) {
      this.baseLog(col.green, 'info', ...args);
    }
  }

  verbose(...args) {
    if (process.env.LOGLEVEL >= LEVELS.VERBOSE) {
      this.baseLog(col.dim, 'verbose', ...args);
    }
  }


  debug(...args) {
    if (process.env.LOGLEVEL >= LEVELS.DEBUG) {
      this.baseLog(col.dim, 'debug', ...args);
    }
  }


  fatal(...args) {
    this.baseLog(col.red, 'fatal', ...args);
  }


  error(...args) {
    this.baseLog(col.red, 'error', ...args);
  }


  warn(...args) {
    this.baseLog(col.yellow, 'warning', ...args);
  }


  warning(...args) {
    this.baseLog(col.yellow, 'warning', ...args);
  }
}


SysLog.prototype.LEVELS = LEVELS;

module.exports = new SysLog();
