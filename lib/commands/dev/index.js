const DevCmd = require('./dev-cmd');

module.exports = {
  name: 'dev',
  desc: 'Starts an autorefreshing development webserver.',
  helpPriority: 2,
  helpGroup: 'Development Commands',
  argspec: [
    {
      flags: ['config', 'c'],
      desc: 'Build configuration: "dev" or "prod".',
      defVal: 'dev',
    },
    {
      flags: ['port', 'p'],
      desc: 'Port for development preview HTTP server to listen on.',
      defVal: 19191,
    },
  ],
  impl: DevCmd,
};
