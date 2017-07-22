const log = require('../../util/log'),
  DevServer = require('../../server/DevServer')
;

function dev(args) {
  try {
    const devServer = new DevServer(args);
    devServer.start();
  } catch (e) {
    log.error(e.message);
    return process.exit(1);
  }
}

module.exports = dev;
