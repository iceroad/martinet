const BuildCmd = require('./build-cmd');

module.exports = {
  name: 'build',
  desc: 'Builds the project.',
  helpPriority: 3,
  helpGroup: 'Development Commands',
  argspec: [
    {
      flags: ['config', 'c'],
      desc: 'Build configuration: "dev" or "prod".',
      defVal: 'prod',
    },
    {
      flags: ['output', 'o'],
      desc: 'Output directory for build.',
    },
  ],
  impl: BuildCmd,
};
