#!/usr/bin/env node
const _ = require('lodash'),
  argparse = require('./util/argparse'),
  arghelp = require('./util/arghelp'),
  col = require('colors'),
  log = require('./util/log'),
  minimist = require('minimist'),
  Commands = require('./commands')
  ;

function main(args) {
  // Handle special flags.
  if (args.version || args.v) {
    return process.exit(arghelp.ShowVersion());
  }
  const logLevel = (
    process.env.LOG || process.env.LOGLEVEL || args.log || '').toUpperCase();
  process.env.LOGLEVEL = log.LEVELS[logLevel || 'INFO'];

  // Pick a sub-command to run or show subcommand help.
  // The first positional (non-option) argument must be a sub-command to run.
  const cmdName = _.first(args._);
  if (!cmdName) {
    return process.exit(arghelp.ShowCLIUsage());
  }
  const cmd = Commands[cmdName];
  if (!cmd) {
    log.error(`Unknown command "${col.bold(cmd)})"`);
    return process.exit(1);
  }
  if (args.help || args.h) {
    return arghelp.ShowCommandHelp(cmd.argspec, cmdName);
  }


  // Parse command line arguments using the sub-command's argspec.
  try {
    args = argparse(cmd.argspec, args);
  } catch (e) {
    log.error(`Invalid command-line arguments: ${e}`);
    return process.exit(1);
  }

  // Hand over process control to sub-command.
  try {
    return cmd.impl.call(cmd, args);
  } catch (e) {
    log.error(col.red(`Unable to run command "${cmd.name}": ${e}`));
    log.debug(e.stack.toString());
    return process.exit(1);
  }
}


if (require.main === module) {
  main(minimist(process.argv.slice(2)));
}
