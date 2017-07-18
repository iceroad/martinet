/* eslint-disable global-require,import/no-dynamic-require */
const _ = require('lodash'),
  assert = require('assert'),
  construct = require('runtype').construct,
  expandBuildSpec = require('./expandBuildSpec'),
  fs = require('fs'),
  path = require('path'),
  SCHEMA = require('./buildSpec.schema')
  ;


function readBuildSpec(projectRoot) {
  let buildSpec, buildSpecPath, outRoot;
  let srcRoot = projectRoot;

  // Attempt to read martinet.json from project root.
  const martinetJson = path.resolve(projectRoot, 'martinet.json');
  if (fs.existsSync(martinetJson)) {
    buildSpec = require(martinetJson);
    buildSpecPath = martinetJson;
  } else {
    // Attempt to read build specification from package.json in root.
    const pkgJson = path.join(projectRoot, 'package.json');
    if (fs.existsSync(pkgJson)) {
      const pkgSpec = require(pkgJson);
      if (pkgSpec.martinet) {
        buildSpec = pkgSpec.martinet;
        buildSpecPath = pkgJson;
      } else {
        throw new Error(
          `Cannot find build specification in directory "${projectRoot}".`);
      }
    }
  }

  // Expand and validate build specification.
  expandBuildSpec(buildSpec);
  buildSpec = construct(
    SCHEMA, buildSpec, `Invalid build specification in ${projectRoot}`);

  // Check for path overrides and convert them to absolute paths.
  const srcOverride = _.get(buildSpec, 'paths.src');
  if (srcOverride) {
    srcRoot = path.resolve(projectRoot, srcOverride);
  }
  const outOverride = _.get(buildSpec, 'paths.dist');
  if (outOverride) {
    outRoot = path.resolve(projectRoot, outOverride);
  }
  _.set(buildSpec, 'paths.src', srcRoot);
  _.set(buildSpec, 'paths.dist', outRoot);

  // Ensure all paths are specified as relative paths.
  _.forEach(buildSpec.pages, (pageDef) => {
    // Paths that must be relative, and must exist.
    const allPaths = _.concat(
      pageDef.styles || [],
      pageDef.data || [],
      pageDef.scripts || [],
      [pageDef.src] || []);
    _.forEach(allPaths, (relPath) => {
      assert(
        !path.isAbsolute(relPath),
        `Path ${relPath} is not a relative path.`);
      const absPath = path.resolve(srcRoot, relPath);
      assert(fs.existsSync(absPath), `Path ${absPath} does not exist.`);
    });

    // Paths that must be relative, but may not exist.
    assert(
      !path.isAbsolute(pageDef.dist),
      `Path ${pageDef.dist} is not a relative path.`);
  });

  // Save path to build specification so that it can be watched.
  _.set(buildSpec, 'paths.spec', buildSpecPath);

  return buildSpec;
}


module.exports = readBuildSpec;
