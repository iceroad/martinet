#!/usr/bin/env node
const _ = require('lodash'),
  argparse = require('./util/argparse'),
  arghelp = require('./util/arghelp'),
  col = require('colors'),
  log = require('./util/log'),
  minimist = require('minimist'),
  pkgVer = require('../package.json').version,
  spawnSync = require('child_process').spawnSync,
  Commands = require('./commands')
  ;


function ShowCLIUsage() {
  const maxCmdLen = Math.max(10, _.max(_.map(Commands, (cmdDef, cmdName) => cmdName.length)));
  const cmdGroups = _.orderBy(_.toPairs(_.groupBy(Commands, 'helpGroup')),
      (pair) => {
        return _.min(_.map(pair[1], 'helpPriority'));
      });
  const cmdGroupHelp = _.map(cmdGroups, (pair) => {
    const groupName = pair[0];
    const cmdList = pair[1];
    return [
      `  * ${col.yellow(groupName)}`,
      _.map(
          _.orderBy(_.values(cmdList), 'helpPriority'),
          cmdDef => `${_.padStart(cmdDef.name, maxCmdLen).bold}: ${cmdDef.desc.dim}`).join('\n'),
      '',
    ].join('\n');
  }).join('\n');

  console.error([
    col.yellow(`Martinet ${col.bold(pkgVer)}`),
    `Usage: ${col.yellow('martinet <command>'.bold)} [options]`,
    'Commands:',
    '',
    cmdGroupHelp,
    `Use ${'martinet <command> -h'.bold}${' to see command-specific help.'.dim}`,
  ].join('\n'));
}


function ShowVersion() {
  let latestVer = spawnSync('npm show @iceroad/martinet version', {
    shell: true,
    stdio: 'pipe',
  }).stdout;
  let latestVerStr;
  if (latestVer) {
    latestVer = latestVer.toString('utf-8').replace(/\s/gm, '');
    latestVerStr = `, latest version available: ${col.bold(latestVer)}`;
  }
  console.error(`martinet ${pkgVer}${latestVerStr}`);
}


function main(args) {
  // Handle special flags.
  if (args.version || args.v) {
    return ShowVersion();
  }
  if ('colors' in args) {
    col.enabled = !!((args.colors && args.colors !== 'false'));
    delete args.colors;
  }

  // The first positional (non-option) argument must be a sub-command to run.
  const cmdName = _.first(args._);
  if (!cmdName || !Commands[cmdName]) {
    return ShowCLIUsage();
  }
  const cmd = Commands[cmdName];

  // Parse command line arguments using the sub-command's argspec.
  if (args.help || args.h) {
    console.error(arghelp(cmd.argspec, cmdName));
    return process.exit(1);
  }
  if (!('LOGLEVEL' in process.env)) {
    process.env.LOGLEVEL = 1;  // info
  }
  if (args.logLevel) {
    process.env.LOGLEVEL = _.toInteger(args.logLevel);
    delete args.logLevel;
  }
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
