const assert = require('assert'),
  col = require('colors'),
  log = require('../../util/log'),
  json = JSON.stringify,
  readBuildSpec = require('../../engine/readBuildSpec'),
  temp = require('temp').track(),
  Engine = require('../../engine'),
  DevServer = require('./DevServer')
  ;


function dev(args) {
  //
  // Read build specification.
  //
  const projectRoot = args.root;
  const buildSpec = readBuildSpec(projectRoot);
  log.debug(`Build spec: ${col.gray(json(buildSpec, null, 2))}`);

  //
  // Get build configuration
  //
  assert(
    args.config === 'prod' || args.config === 'dev',
    `Invalid build config "${args.config}".`.red);
  log.info(`Build configuration: ${col.bgYellow.black(args.config)}`);

  //
  // Create temporary build directory.
  //
  const buildDir = temp.mkdirSync();
  log.verbose(`Temporary build directory: ${buildDir}`);

  //
  // Create an instance of the Engine in watch mode.
  //
  const engine = new Engine(buildSpec, buildDir, args.config, projectRoot, args);
  engine.watch();

  //
  // Create and start DevServer instance.
  //
  const devServer = new DevServer(args, engine);
  devServer.listen((err) => {
    if (err) {
      log.error(err);
      return process.exit(1);
    }
    log.info(`${col.bold('Open the following URL in a browser:')}
┃
┃  ${col.bold(`http://localhost:${args.port}/`).green}
┃`);
  });
}


module.exports = dev;
