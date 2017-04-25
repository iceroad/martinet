/* eslint-disable global-require,import/no-dynamic-require */
const _ = require('lodash'),
  assert = require('assert'),
  construct = require('runtype').construct,
  fs = require('fs'),
  path = require('path'),
  SCHEMA = require('./buildSpec.schema')
  ;


function readBuildSpec(projectRoot) {
  let buildSpec;

  // Attempt to read martinet.json from project root.
  const martinetJson = path.join(projectRoot, 'martinet.json');
  if (fs.existsSync(martinetJson)) {
    buildSpec = require(martinetJson);
  } else {
    // Attempt to read build specification from package.json in root.
    const pkgJson = path.join(projectRoot, 'package.json');
    if (fs.existsSync(pkgJson)) {
      const pkgSpec = require(pkgJson);
      if (pkgSpec.martinet) {
        buildSpec = pkgSpec.martinet;
      } else {
        throw new Error(
            `Cannot find build specification in directory "${projectRoot}".`);
      }
    }
  }

  buildSpec = construct(
      SCHEMA, buildSpec, `Invalid build specification in ${projectRoot}`);

  // Check for path overrides.
  const overridePath = _.get(buildSpec, 'paths.src');
  if (overridePath) {
    projectRoot = path.resolve(overridePath);
    console.error(projectRoot);
  }

  // Ensure all paths are specified as relative paths.
  _.forEach(buildSpec.pages, (pageDef) => {
    // Paths that must exist.
    const allPaths = _.concat(
        pageDef.styles || [],
        pageDef.data || [],
        pageDef.scripts || [],
        [pageDef.src] || []);
    _.forEach(allPaths, (relPath) => {
      assert(!path.isAbsolute(relPath), `Path ${relPath} is not relative.`);
      const absPath = path.join(projectRoot, relPath);
      assert(fs.existsSync(absPath), `Path ${absPath} does not exist.`);
    });

    // Paths that must be relative, but may not exist.
    assert(!path.isAbsolute(pageDef.dist), `Path ${pageDef.dist} is not relative.`);
  });

  return buildSpec;
}


module.exports = {
  read: readBuildSpec,
};
