/* eslint-disable global-require, import/no-dynamic-require */
const _ = require('lodash'),
  assert = require('assert'),
  async = require('async'),
  col = require('colors'),
  fs = require('fs'),
  fstate = require('../../util/fstate'),
  hashcache = require('../../util/hashcache'),
  log = require('../../util/log'),
  json = JSON.stringify,
  path = require('path'),
  readBuildSpec = require('../../engine/readBuildSpec')
  ;


function deploy(args) {
  //
  // Read build specification from project root.
  //
  const projectRoot = args.root;
  const buildSpec = readBuildSpec(projectRoot);

  //
  // If args.dist is set, override "paths.dist" with it.
  //
  if (args.dist) {
    buildSpec.paths.dist = args.dist;
  }
  const localRoot = buildSpec.paths.dist;
  assert(_.isString(localRoot), 'Please specify --dist');
  assert(fs.existsSync(localRoot), `Directory "${localRoot}" does not exist.`);
  assert(
    fs.statSync(localRoot).isDirectory(),
    `Argument "${localRoot}" is not a directory.`);

  //
  // Get deployment configuration and target.
  //
  const deploySpecPath = path.resolve(projectRoot, args.config);
  assert(
    fs.existsSync(deploySpecPath),
    `Invalid deployment config path "${deploySpecPath}".`);
  const deploySpec = require(deploySpecPath);
  const targets = deploySpec.targets || [];
  assert(
    targets.length,
    `Deployment config ${deploySpecPath} has no "targets" section.`);
  if (!args.target) {
    if (targets.length !== 1) {
      const allTargets = _.map(targets, 'name').join(', ');
      throw new Error(
        `deploy.json contains more than one deployment target: [${allTargets}]
Please select one by specifying the --target flag.`);
    }
    args.target = deploySpec.targets[0].name;
  }
  const deployTarget = _.find(deploySpec.targets, (targetInfo) => {
    return targetInfo.name === args.target;
  });
  assert(_.isObject(deployTarget), `Unknown deployment target "${args.target}"`);

  //
  // Load deployment provider module.
  //
  const providerPath = path.resolve(__dirname, 'providers', deployTarget.provider);
  const ProviderClass = require(providerPath);
  const provider = new ProviderClass(deployTarget.config);

  //
  // Synchronize local and remote.
  //
  async.auto({
    localListing: cb => fstate(localRoot, cb),
    remoteListing: ['localListing', (deps, cb) => provider.getRemoteListing(cb)],
    sync: ['localListing', 'remoteListing', (deps, cb) => {
      const localFiles = deps.localListing[0];
      const remoteFiles = deps.remoteListing;

      _.forEach(localFiles, (localFileObj) => {
        localFileObj.hash = hashcache(localFileObj.absPath);
      });

      const remoteFilesMap = _.keyBy(remoteFiles, 'relPath');
      const filesToUpload = _.filter(localFiles, (localFileObj) => {
        const remoteHash = _.get(remoteFilesMap[localFileObj.relPath], 'hash');
        if (!remoteHash || remoteHash !== localFileObj.hash) {
          return true;
        }
      });
      const localFilesMap = _.keyBy(localFiles, 'relPath');
      const filesToDelete = _.filter(remoteFiles, (remoteFileObj) => {
        if (!localFilesMap[remoteFileObj.relPath]) {
          return true;
        }
      });

      log.debug('upload', json(filesToUpload, null, 2));
      log.debug('delete', json(filesToDelete, null, 2));

      const uploaders = _.map(filesToUpload, localFileObj => (cb) => {
        provider.upload(localFileObj, cb);
      });
      const deleters = _.map(filesToDelete, remoteFileObj => (cb) => {
        provider.remoteDelete(remoteFileObj, cb);
      });

      return async.parallelLimit(
        _.concat(uploaders, deleters), Math.max(1, args.parallel), cb);
    }],
  }, (err) => {
    if (err) {
      log.error(err);
    } else {
      log.info(`Deployment to ${col.bold(deployTarget.name)} complete.`);
    }
  });
}

module.exports = deploy;
