// A worker child process for parallel builds. Intended to be spawned through
// node's builtin fork() so that it can communicate back to the parent process.
const _ = require('lodash'),
  assert = require('assert'),
  col = require('colors'),
  fork = require('child_process').fork,
  fs = require('fs'),
  genWebpackConfig = require('./genWebpackConfig'),
  json = JSON.stringify,
  log = require('../util/log'),
  minimist = require('minimist'),
  path = require('path'),
  temp = require('temp'),
  webpack = require('webpack'),
  EventEmitter = require('events')
  ;


class EngineWorker extends EventEmitter {
  constructor(idx) {
    super();
    this.idx_ = idx;
    this.nextId_ = 1;
    this.callbacks_ = {};
  }

  startChild() {
    assert(!this.child_, 'Child already started.');
    log.debug(`Starting worker child ${this.idx_}...`);
    this.child_ = fork(__filename, {
      stdio: 'inherit',
    });
    this.child_.on('message', this.receiveFromChild.bind(this));
    this.cleanupFn_ = () => {
      this.stopChild();
    };
    process.once('exit', this.cleanupFn_);
  }

  stopChild() {
    assert(this.child_, 'Child not started.');
    this.child_.kill();
    process.removeListener('exit', this.cleanupFn_);
    delete this.child_;
    delete this.cleanupFn_;
  }

  sendWork(evtName, evtData, cb) {
    assert(this.child_, 'Child not started.');
    const packet = {
      evtName,
      evtData,
    };
    if (_.isFunction(cb)) {
      const requestId = ++this.nextId_;
      this.callbacks_[requestId] = cb;
      packet.requestId = requestId;
    }
    return this.child_.send(packet);
  }

  receiveFromChild(inMsg) {
    const evtName = inMsg.evtName;
    const evtError = inMsg.error;
    const evtData = inMsg.evtData;
    const requestId = inMsg.requestId;
    log.debug(`recv_from_child: ${process.pid}: evtName=${evtName}`);

    if (evtName === 'page_build_result') {
      const cb = this.callbacks_[requestId];
      delete this.callbacks_[requestId];
      const stats = inMsg.results || {};
      stats.hasErrors = () => evtError || (!_.isEmpty(_.get(inMsg, 'results.errors')));
      stats.hasWarnings = () => (!_.isEmpty(_.get(inMsg, 'results.warnings')));
      return cb(evtError, stats);
    }

    return this.emit(evtName, evtData);
  }

  doWork(inMsg) {
    const evtName = inMsg.evtName;
    const requestId = inMsg.requestId;
    const evtData = inMsg.evtData;
    log.debug(
      `child_read: ${process.pid}: evtName=${evtName} requestId=${requestId}`);

    if (evtName === 'build_page') {
      this.buildPage(evtData, (err, results) => {
        return process.send({
          evtName: 'page_build_result',
          requestId: inMsg.requestId,
          error: err ? {
            message: err.toString(),
            stack: err.stack.toString(),
          } : null,
          results,
        });
      });
    }

    if (evtName === 'watch_page') {
      this.watchPage(evtData);
    }
  }

  buildPage(evtData, cb) {
    const entryPoints = [];
    const pageDef = evtData.pageDef;
    const projectRoot = evtData.projectRoot;
    const srcRoot = evtData.srcRoot;
    const outputRoot = evtData.outputRoot;
    const buildConfig = evtData.buildConfig;

    //
    // Create a dummy JS file requiring the styles.
    //
    const dummyDir = temp.mkdirSync();
    const dummySrc = _.map(pageDef.styles, (styleRelPath) => {
      const absPath = path.join(srcRoot, styleRelPath);
      assert(
        fs.existsSync(absPath), `Style "${styleRelPath}" does not exist.`);
      return `require('${absPath}');`;
    }).join('\n');
    const dummySrcPath = path.join(dummyDir, 'martinet_imports.js');
    fs.writeFileSync(dummySrcPath, dummySrc, 'utf-8');
    log.debug(`Wrote to ${dummySrcPath}:\n----\n${dummySrc}\n----\n`);
    entryPoints.push(dummySrcPath);

    //
    // Generate entry points for scripts.
    //
    _.forEach(pageDef.scripts, (scriptRelPath) => {
      entryPoints.push(path.join(srcRoot, scriptRelPath));
    });
    log.debug(`Entry points: ${json(entryPoints)}`);

    //
    // Load data files from disk, merge if necessary into a single locals
    // objects.
    //
    const dataObjects = _.map(pageDef.data, (dataRelPath) => {
      const absPath = path.join(srcRoot, dataRelPath);
      assert(
        fs.existsSync(absPath),
        `Data file "${dataRelPath}" does not exist.`);
      log.debug(`Loading data from ${absPath}...`);
      return _.cloneDeep(require(absPath));
    });
    const pageDataLocals = _.merge({}, ...dataObjects);
    log.debug(`Found ${_.size(pageDataLocals)} top-level keys in data.`);

    //
    // Generate Webpack config and execute build.
    //
    const wpConfig = genWebpackConfig(
      pageDef, srcRoot, outputRoot, buildConfig,
      entryPoints, pageDataLocals, projectRoot);
    log.info(`Building "${col.bold(pageDef.dist)}"...`);
    webpack(wpConfig, (err, stats) => {
      if (err) return cb(err);
      const info = stats.toJson();
      if (stats.hasErrors()) {
        _.forEach(info.errors, (errObj) => {
          const errLines = errObj.toString().split('\n');
          const errMsg = _.map(errLines, line => `E: ${line}`).join('\n');
          log.error(`Error building ${pageDef.dist}:\n
────────────────────────────────────────────────────────
${col.white(errMsg)}
────────────────────────────────────────────────────────`);
        });
        return cb(new Error('Compilation failed.'));
      }
      return cb(null, info);
    });
  }


  watchPage(evtData) {
    const pageDef = evtData.pageDef;
    const srcRoot = evtData.srcRoot;
    const projectRoot = evtData.projectRoot;
    const outputRoot = evtData.outputRoot;
    const buildConfig = evtData.buildConfig;
    const entryPoints = [];

    //
    // Create a dummy JS file requiring the styles.
    //
    const dummyDir = temp.mkdirSync();
    const dummySrc = _.map(pageDef.styles, (styleRelPath) => {
      const absPath = path.resolve(srcRoot, styleRelPath);
      return `require('${absPath}');`;
    }).join('\n');
    const dummySrcPath = path.join(dummyDir, 'martinet_imports.js');
    fs.writeFileSync(dummySrcPath, dummySrc, 'utf-8');
    entryPoints.push(dummySrcPath);

    //
    // Generate entry points for scripts.
    //
    _.forEach(pageDef.scripts, (scriptRelPath) => {
      entryPoints.push(path.resolve(srcRoot, scriptRelPath));
    });

    //
    // Load data files from disk, merge if necessary into a single locals
    // objects.
    //
    const dataObjects = _.map(pageDef.data, (dataRelPath) => {
      const absPath = path.resolve(srcRoot, dataRelPath);
      return require(absPath);
    });
    const pageDataLocals = _.merge({}, ...dataObjects);

    //
    // Generate Webpack configuration.
    //
    const wpConfig = genWebpackConfig(
      pageDef,
      srcRoot,
      outputRoot,
      buildConfig,
      entryPoints,
      pageDataLocals,
      projectRoot);

    const compiler = webpack(wpConfig);

    compiler.plugin('compile', () => {
      process.send({
        evtName: 'page_compile',
        evtData: {
          pageDef,
          worker: this.idx_,
        },
      });
    });

    compiler.plugin('done', (stats) => {
      process.send({
        evtName: 'page_done',
        evtData: {
          pageDef,
          worker: this.idx_,
          stats: stats.toJson(),
        },
      });
    });

    const watchOptions = {
      aggregateTimeout: 500,
      poll: 1000,
    };

    compiler.watch(watchOptions, () => {});
  }
}


module.exports = EngineWorker;


// Invoked when started as a child process with fork().
if (require.main === module) {
  const args = minimist(process.argv.slice(2));
  const worker = new EngineWorker(args.idx);
  process.on('message', worker.doWork.bind(worker));
  process.send({ evtName: 'ready' });
}
