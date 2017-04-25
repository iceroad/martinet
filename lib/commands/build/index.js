const BuildCmd = require('./build-cmd');

module.exports = {
  name: 'build',
  desc: 'Builds the project.',
  helpPriority: 3,
  helpGroup: 'Development Commands',
  argspec: [
    {
      flags: ['root', 'i'],
      desc: 'Project root directory (should contain martinet.json).',
      defVal: process.cwd(),
    },
    {
      flags: ['output', 'o'],
      desc: 'Build output directory.',
    },
    {
      flags: ['config', 'c'],
      desc: 'Build configuration: "dev" or "prod".',
      defVal: 'prod',
    },
  ],
  impl: BuildCmd,
};
