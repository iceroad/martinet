const DeployCmd = require('./deploy-cmd');

module.exports = {
  name: 'deploy',
  desc: 'Syncs build output to a remote host like Amazon S3.',
  helpPriority: 1,
  helpGroup: 'Deployment Commands',
  argspec: [
    {
      flags: ['root', 'i'],
      desc: 'Project root directory (should contain martinet.json).',
      defVal: process.cwd(),
    },
    {
      flags: ['dist', 'd'],
      desc: 'Path to web distribution.',
    },
    {
      flags: ['config', 'c'],
      desc: 'Path to deployment credentials.',
      defVal: 'deploy.json',
    },
    {
      flags: ['target', 't'],
      desc: 'Target to deploy to.',
      defVal: '',
    },
    {
      flags: ['parallel', 'p'],
      desc: 'Upload concurrency.',
      defVal: 5,
    },
  ],
  impl: DeployCmd,
};
