const assert = require('assert'),
  async = require('async'),
  col = require('colors'),
  fse = require('fs-extra'),
  log = require('../../util/log'),
  json = JSON.stringify,
  readBuildSpec = require('../../engine/readBuildSpec'),
  syncDir = require('../../util/syncDir'),
  temp = require('temp'),
  Engine = require('../../engine')
  ;


function build(args) {
  //
  // Read build specification from.
  //
  const projectRoot = args.root;
  const buildSpec = readBuildSpec(projectRoot);

  //
  // If args.output is set, override "paths.dist" with it.
  // (Always force output to the command-line option)
  //
  if (args.output) {
    buildSpec.paths.dist = args.output;
  }
  assert(buildSpec.paths.dist, 'Please specify --output or -o');

  log.debug(`Build spec loaded: ${json(buildSpec)}`);
  log.info(`Source: ${buildSpec.paths.src.yellow}`);
  log.info(`Output: ${buildSpec.paths.dist.yellow}`);

  assert(
      args.config === 'prod' || args.config === 'dev',
      `Invalid build config "${args.config}".`.red);
  log.info(`Config: ${args.config.bgYellow.black}`);

  //
  // Create temporary build directory.
  //
  const buildDir = temp.mkdirSync();
  log.verbose(`Temporary build directory: ${buildDir}`);

  //
  // Build the project and synchronize changed output with output directory.
  //
  const engine = new Engine(buildSpec, buildDir, args.config, projectRoot);
  async.series([
    //
    // Build the project.
    //
    cb => engine.build(cb),

    //
    // Synchronize temporary directory with output directory.
    //
    (cb) => {
      fse.ensureDirSync(buildSpec.paths.dist);
      syncDir(buildDir, buildSpec.paths.dist, cb);
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
