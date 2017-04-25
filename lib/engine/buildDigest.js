const _ = require('lodash'),
  fstate = require('../util/fstate'),
  digest = require('../util/digest'),
  hashcache = require('../util/hashcache'),
  log = require('../util/log')
  ;


function buildDigest(buildDir, cb) {
  fstate(buildDir, { includeDirectories: true }, (err, files) => {
    if (err) return cb(err);

    const buildId = digest(_.map(
        _.sortBy(files, 'relPath'),
        fileInfo => hashcache(fileInfo.absPath)).join(' '), 'base64');

    log.verbose(`Current build-digest for ${buildDir} is "${buildId}"`);

    return cb(null, buildId);
  });
}

module.exports = _.debounce(buildDigest, 300);
