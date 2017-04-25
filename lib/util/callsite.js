const _ = require('lodash'),
  fmt = require('util').format,
  path = require('path')
  ;


const PROJ_ROOT = path.resolve(__dirname, '..', '..');
const STACK_LINE_RE_1 = /^\s+at (.+) \((\S+):(\d+):(\d+)\)/;
const STACK_LINE_RE_2 = /^\s+at (.+):(\d+):(\d+)/;

module.exports = function getCallsite(stack) {
  //
  // This is a horrible, ugly, necessary way to extract information.
  //
  if (!stack) {
    stack = (new Error()).stack.toString().split('\n');
  } else {
    stack = stack.toString().split('\n');
  }

  //
  // Extract callsites from stack lines.
  //
  let cleanStack = _.filter(_.map(stack, (stackLine) => {
    stackLine = stackLine.replace(/\[as .*?\]\s*/, '');

    //
    // Try pattern 1.
    //
    let parts = STACK_LINE_RE_1.exec(stackLine);
    if (parts && parts.length) {
      return {
        symbol: parts[1],
        absPath: parts[2],
        line: _.toInteger(parts[3]),
        column: _.toInteger(parts[4]),
      };
    }

    //
    // Try pattern 2.
    //
    parts = STACK_LINE_RE_2.exec(stackLine);
    if (parts && parts.length) {
      return {
        absPath: parts[1],
        line: _.toInteger(parts[2]),
        column: _.toInteger(parts[3]),
      };
    }
  }));

  //
  // Filter out files in our lib project.
  //
  cleanStack = _.filter(_.map(cleanStack, (stackLine) => {
    if (stackLine.absPath.substr(0, PROJ_ROOT.length) === PROJ_ROOT) {
      stackLine.path = path.relative(PROJ_ROOT, stackLine.absPath);
      delete stackLine.absPath;
      return stackLine;
    }
    return stackLine;
  }));

  //
  // Filter out syslog and callsite
  //
  cleanStack = _.filter(cleanStack, (stackLine) => {
    const symbol = stackLine.symbol || '';
    const symPath = stackLine.path || '';
    if (symbol === getCallsite.name) {
      return;
    }
    if (symbol.match(/^SysLog/)) {
      return;
    }
    if (symPath.match(/^log\//)) {
      return;
    }
    return true;
  });

  const result = {
    clean: cleanStack,
    full: stack.toString(),
  };
  if (cleanStack.length) {
    result.summary = fmt(
        '%s:%d', cleanStack[0].path, cleanStack[0].line);
  }

  return result;
};
