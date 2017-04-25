const DeployCmd = require('./deploy-cmd');

module.exports = {
  name: 'deploy',
  desc: 'Syncs build output to a remote host like Amazon S3.',
  helpPriority: 1,
  helpGroup: 'Deployment Commands',
  argspec: [
  ],
  impl: DeployCmd,
};
