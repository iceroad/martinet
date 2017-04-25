/* eslint-disable global-require,import/no-dynamic-require */
const _ = require('lodash'),
  assert = require('assert'),
  configs = require('./configs')
  ;


function genWebpackConfig(pageDef, projectRoot, outputRoot, configSpec,
  entryPoints, pageDataLocals) {
  const wpConfigGenerator = (configSpec in configs)
      ? configs[configSpec] : require(configSpec);
  assert(_.isFunction(wpConfigGenerator), 'Invalid config generator.');
  return wpConfigGenerator(pageDef, projectRoot, outputRoot, configSpec,
      entryPoints, pageDataLocals);
}

module.exports = genWebpackConfig;
