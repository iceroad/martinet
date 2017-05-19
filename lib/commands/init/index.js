const InitCmd = require('./init-cmd');

module.exports = {
  name: 'init',
  desc: 'Initializes the current with a skeleton project structure.',
  helpPriority: 1,
  helpGroup: 'Development Commands',
  argspec: [
  ],
  impl: InitCmd,
};
