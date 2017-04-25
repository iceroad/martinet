const InitCmd = require('./init-cmd');

module.exports = {
  name: 'init',
  desc: 'Initializes an empty directory with a project structure.',
  helpPriority: 1,
  helpGroup: 'Development Commands',
  argspec: [
  ],
  impl: InitCmd,
};
