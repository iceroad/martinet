const _ = require('lodash');

function expandBuildSpec(buildSpec) {
  // Expand global styles.
  const globalStyles = _.get(buildSpec, 'global.styles');
  if (globalStyles) {
    _.forEach(buildSpec.pages, (pageDef) => {
      pageDef.styles = _.uniq(_.filter(_.concat(pageDef.styles, globalStyles)));
    });
  }

  // Expand global scripts.
  const globalScripts = _.get(buildSpec, 'global.scripts');
  if (globalScripts) {
    _.forEach(buildSpec.pages, (pageDef) => {
      pageDef.scripts = _.uniq(_.filter(_.concat(pageDef.scripts, globalScripts)));
    });
  }
}

module.exports = expandBuildSpec;
