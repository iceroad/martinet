/* eslint-disable no-unused-vars */
const _ = require('lodash'),
  assert = require('assert'),
  col = require('colors'),
  json = JSON.stringify
  ;


module.exports = function help(argspec, argname) {
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

  return `${_.concat(header, flagDetails).join('\n')}`;
};
