const _ = require('lodash'),
  assert = require('assert'),
  async = require('async'),
  col = require('colors'),
  fs = require('fs'),
  fse = require('fs-extra'),
  log = require('./log'),
  fstate = require('./fstate'),
  hashcache = require('./hashcache'),
  path = require('path')
  ;


function ConditionalCopy(srcFile, destPath) {
  const newHash = hashcache(srcFile);
  let currentHash;
  if (fs.existsSync(destPath)) {
    currentHash = hashcache(destPath);
  }
  if (currentHash !== newHash) {
    fse.ensureDirSync(path.dirname(destPath));
    fse.copySync(srcFile, destPath);
    log.verbose(`Copied ${col.bold(srcFile)} ⇒ ${col.bold(destPath)}`.yellow);
    return 1;
  }

  log.verbose(`Unchanged ${srcFile}`.gray);
  return 0;
}



function syncDir(srcDir, destDir, cb) {
  assert(fs.existsSync(srcDir), `Source directory ${srcDir} does not exist.`);
  assert(fs.existsSync(destDir), `Destination directory ${destDir} does not exist.`);

  async.auto({
    srcFiles: cb => fstate(srcDir, cb),
    destFiles: cb => fstate(destDir, cb),
    sync: ['srcFiles', 'destFiles', (deps, cb) => {
      const srcFiles = deps.srcFiles[0];
      const destFiles = deps.destFiles[0];
      const srcFileRelPaths = _.sortBy(_.map(srcFiles, 'relPath'));
      const destFileRelPaths = _.sortBy(_.map(destFiles, 'relPath'));

      log.verbose(
          `Copying ${col.bold(srcFiles.length)} source files from ` +
          `${col.bold(srcDir)} to ${col.bold(destDir)}...`);

      const numCopied = _.sum(_.map(srcFiles, (srcFile) => {
        const destPath = path.join(destDir, srcFile.relPath);
        return ConditionalCopy(srcFile.absPath, destPath);
      }));

      let numDeleted = 0;
      const filesToDelete = _.difference(destFileRelPaths, srcFileRelPaths);
      _.forEach(filesToDelete, (delFileRelPath) => {
        const delFile = path.join(destDir, delFileRelPath);
        fse.removeSync(delFile);
        log.verbose(`Deleted ${col.bold(delFile)}`.red);
        numDeleted++;
      });

      if (numCopied || numDeleted) {
        log.info(
            `Sync results: ${col.bold(numCopied)} copied, ` +
            `${col.bold(col.red(numDeleted))} deleted.`);
      } else {
        log.info('Build results unchanged from existing build.');
      }

      return cb();
    }],
  }, cb);
}


module.exports = syncDir;
