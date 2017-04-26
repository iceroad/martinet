/* eslint-disable global-require,import/no-dynamic-require */
const _ = require('lodash'),
  assert = require('assert'),
  configs = require('./configs')
  ;


function genWebpackConfig(pageDef, srcRoot, outputRoot, configSpec,
  entryPoints, pageDataLocals, projectRoot) {
  const wpConfigGenerator = (configSpec in configs) ?
      configs[configSpec] : require(configSpec);
  assert(_.isFunction(wpConfigGenerator), 'Invalid config generator.');
  return wpConfigGenerator(pageDef, srcRoot, outputRoot, configSpec,
      entryPoints, pageDataLocals, projectRoot);
}

module.exports = genWebpackConfig;
