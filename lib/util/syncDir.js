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
    srcListing: cb => fstate(srcDir, { includeDirectories: true }, cb),
    destListing: cb => fstate(destDir, { includeDirectories: true }, cb),
    sync: ['srcListing', 'destListing', (deps, cb) => {
      const srcFiles = _.filter(deps.srcListing[0], file => file.type === 'file');
      const destFiles = _.filter(deps.destListing[0], file => file.type === 'file');
      const srcFileRelPaths = _.sortBy(_.map(srcFiles, 'relPath'));
      const destFileRelPaths = _.sortBy(_.map(destFiles, 'relPath'));

      // Copy source files to output if contents do not match.
      const numCopied = _.sum(_.map(srcFiles, (srcFile) => {
        const destPath = path.join(destDir, srcFile.relPath);
        return ConditionalCopy(srcFile.absPath, destPath);
      }));

      if (numCopied) {
        log.info(
          `Copied ${col.bold(numCopied)} changed source files from ` +
          `${col.bold(srcDir)} to ${col.bold(destDir)}.`);
      }

      // Delete files in destination that are not in source.
      const filesToDelete = _.difference(destFileRelPaths, srcFileRelPaths);
      _.forEach(filesToDelete, (delFileRelPath) => {
        const delFile = path.join(destDir, delFileRelPath);
        fse.removeSync(delFile);
        log.verbose(`Deleted ${col.bold(delFile)}`.red);
      });
      let numDeleted = filesToDelete.length;

      if (numDeleted) {
        log.info(
          `Deleted ${col.bold(numDeleted)} unneccessary files from ` +
          `${col.bold(destDir)}.`);
      }

      // Delete dangling directories.
      const srcDirs = _.filter(deps.srcListing[0], file => file.type === 'dir');
      const destDirs = _.filter(deps.destListing[0], file => file.type === 'dir');
      const srcDirRelPaths = _.sortBy(_.map(srcDirs, 'relPath'));
      const destDirRelPaths = _.sortBy(_.map(destDirs, 'relPath'));
      const dirsToDelete = _.difference(destDirRelPaths, srcDirRelPaths);
      _.forEach(dirsToDelete, (delDirRelPath) => {
        const delDir = path.join(destDir, delDirRelPath);
        fse.removeSync(delDir);
        log.verbose(`Deleted directory ${col.bold(delDir)}`.red);
        numDeleted++;
      });

      if (!(numCopied || numDeleted)) {
        log.info('Build results unchanged from existing build.');
      }

      return cb();
    }],
  }, cb);
}


module.exports = syncDir;
