const _ = require('lodash'),
  col = require('colors'),
  pkgVer = require('../../package.json').version,
  spawnSync = require('child_process').spawnSync,
  Commands = require('../commands')
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
        cmdDef => (`${col.bold(_.padStart(cmdDef.name, maxCmdLen))}: ` +
          `${col.dim(cmdDef.desc)}`)).join('\n'),
      '',
    ].join('\n');
  }).join('\n');

  console.error([
    `${col.yellow.bold(`Martinet ${pkgVer}`)}: Webpack based static site generator`,
    `Usage: martinet ${col.bold('<command>')} [options]`,
    'Commands:',
    '',
    cmdGroupHelp,
    `Use ${'martinet <command> -h'.bold}${' to see command-specific help.'.dim}`,
  ].join('\n'));

  return 1;
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
  console.error(`@iceroad/martinet ${pkgVer}${latestVerStr}`);
  return 0;
}


function ShowCommandHelp(argspec, argname) {
  const publicFlags = _.filter(argspec, (aspec) => {
    return !aspec.private;
  });

  //
  // Help message header.
  //
  const header = _.filter([
    'Usage: '.dim + `martinet ${argname}`.bold,
    publicFlags.length ? ' <options>'.yellow : null,
    publicFlags.length ? `\n${'Options:\n'.dim}` : null,
  ]).join('');

  //
  // Flag details.
  //
  const flagAliases = _.map(publicFlags, (aspec) => {
    return _.map(aspec.flags, (alias) => {
      if (!alias) return alias;
      return `-${alias.length > 1 ? '-' : ''}${alias}`;
    }).join(', ');
  });
  const flagDescriptions = _.map(publicFlags, 'desc');
  const longestAliasStr = _.max([10, _.max(_.map(flagAliases, _.size))]);
  const flagDetails = _.map(_.zip(
    flagAliases, flagDescriptions, publicFlags), (ftriple) => {
    let flagDefVal = ftriple[2].defVal;

    // Indent multi-line descriptions
    const flagDesc = ftriple[2].desc;
    let descLines = _.map(flagDesc.split('\n'), (lineStr, idx) => {
      return ((idx ? _.padEnd('', longestAliasStr + 5) : '') + lineStr);
    });
    const longestDescStr = _.max(_.map(descLines, 'length'));
    descLines = descLines.join('\n');

    if (_.isObject(flagDefVal)) {
      flagDefVal = flagDefVal.value;
    }

    return `${[
      ' ',
      _.padEnd(ftriple[0], longestAliasStr).yellow,
      ' ',
      descLines,
    ].join(' ')}\n${[
      '   ',
      _.padEnd('', longestAliasStr),
      'Default: '.gray + (
        (!_.isUndefined(flagDefVal)) ?
          flagDefVal.toString().yellow.dim :
          '<none> (must specify)'.dim.yellow),
    ].join(' ')}\n     ${
      _.padEnd('', longestAliasStr)}${_.padEnd('', longestDescStr, '─')}\n`;
  });

  console.error(`${_.concat(header, flagDetails).join('\n')}`);
  return 1;
}


module.exports = {
  ShowCommandHelp,
  ShowCLIUsage,
  ShowVersion,
};
