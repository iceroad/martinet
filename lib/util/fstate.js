const _ = require('lodash'),
  path = require('path'),
  walk = require('walk')
  ;


function fstate(dir, opt, cb) {
  if (_.isFunction(opt) && _.isUndefined(cb)) {
    cb = opt;
    opt = {};
  }
  const files = [];
  const errors = [];
  const walker = walk.walk(dir, {
    followLinks: true,
  });

  walker.on('directory', (root, dirStat, next) => {
    if (opt.includeDirectories) {
      const absPath = path.join(root, dirStat.name);
      const relPath = path.relative(dir, absPath);
      files.push({
        absPath,
        relPath,
        mtime: dirStat.mtime,
        name: dirStat.name,
        type: 'dir',
      });
    }
    return next();
  });

  walker.on('file', (root, fileStat, next) => {
    // Filter out hidden files and directories in the listing.
    if (fileStat.name[0] !== '.') {
      // Assemble return structure.
      const absPath = path.join(root, fileStat.name);
      const relPath = path.relative(dir, absPath);
      files.push({
        absPath,
        relPath,
        size: fileStat.size,
        mtime: fileStat.mtime,
        name: fileStat.name,
        type: 'file',
      });
    }
    return next();
  });

  walker.on('errors', (root, nodeStatsArray, next) => {
    const firstErr = nodeStatsArray[0];
    errors.push(`File: ${firstErr.error.path}, error: "${firstErr.error.code}"`);
    return next();
  });

  walker.once('end', () => {
    return cb(null, _.sortBy(files, 'absPath'), errors);
  });
}


module.exports = fstate;
