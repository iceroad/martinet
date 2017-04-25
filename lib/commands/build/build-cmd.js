const _ = require('lodash'),
  assert = require('assert'),
  async = require('async'),
  col = require('colors'),
  fse = require('fs-extra'),
  log = require('../../util/log'),
  json = JSON.stringify,
  path = require('path'),
  spec = require('../../util/spec'),
  syncDir = require('../../util/syncDir'),
  temp = require('temp'),
  Engine = require('../../engine')
  ;


function build(args) {
  //
  // Read build specification.
  //
  const projectRoot = process.cwd();
  const buildSpec = spec.read(projectRoot);
  log.debug(`Build spec: ${col.yellow(json(buildSpec))}`);

  //
  // If the build specification has an "paths" section, use it to add to the
  // the project root.
  //
  if (buildSpec.paths) {
    if ('dist' in buildSpec.paths && !args.output) {
      args.output = path.resolve(buildSpec.paths.dist);
      log.debug(`Project output: ${col.yellow(projectRoot)}`);
    }
  }
  assert(_.isString(args.output), 'Please specify --output or -o');

  assert(
      args.config === 'prod' || args.config === 'dev',
      `Invalid build config "${args.config}".`.red);
  log.info(`Build config: ${args.config.bgYellow.black}`);

  //
  // Create temporary build directory.
  //
  const buildDir = temp.mkdirSync();
  log.verbose(`Temporary build directory: ${buildDir}`);

  //
  // Build the project and synchronize changed output with output directory.
  //
  const engine = new Engine(projectRoot, buildDir, args.config);
  async.series([
    //
    // Build the project.
    //
    cb => engine.build(cb),

    //
    // Synchronize temporary directory with output directory.
    //
    (cb) => {
      fse.ensureDirSync(args.output);
      log.verbose(`Build output directory: ${args.output}`);
      syncDir(buildDir, args.output, cb);
    },
  ], (err) => {
    if (err) {
      log.error(err);
      log.fatal(`Build failed, temporary results in ${buildDir}.`.red.bold);
    } else {
      log.info('Build finished successfully.'.green.bold);
      fse.removeSync(buildDir);
    }
  });
}


module.exports = build;
