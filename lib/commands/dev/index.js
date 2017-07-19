const os = require('os'),
  DevCmd = require('./dev-cmd')
;

module.exports = {
  name: 'dev',
  desc: 'Starts an autorefreshing development webserver.',
  helpPriority: 2,
  helpGroup: 'Development Commands',
  argspec: [
    {
      flags: ['root', 'i'],
      desc: 'Project root directory (should contain martinet.json).',
      defVal: process.cwd(),
    },
    {
      flags: ['config', 'c'],
      desc: 'Build configuration: "dev" or "prod".',
      defVal: 'dev',
    },
    {
      flags: ['port', 'p'],
      desc: 'Port for development server to listen on.',
      defVal: 19191,
    },
    {
      flags: ['parallel'],
      desc: 'Number of worker processes for parallel builds.',
      defVal: os.cpus().length - 1,
    },
  ],
  impl: DevCmd,
};
