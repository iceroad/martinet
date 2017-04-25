const _ = require('lodash'),
  path = require('path'),
  walk = require('walk')
  ;


function fstate(dir, cb) {
  const files = [];
  const errors = [];
  const walker = walk.walk(dir, {
    followLinks: true,
  });

  walker.on('file', (root, fileStat, next) => {
    // Filter out hidden files and directories in the listing.
    if (fileStat.name[0] !== '.' && fileStat.type === 'file') {
      // Assemble return structure.
      const absPath = path.join(root, fileStat.name);
      const relPath = path.relative(dir, absPath);
      files.push({
        absPath,
        relPath,
        size: fileStat.size,
        mtime: fileStat.mtime,
        name: fileStat.name,
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
