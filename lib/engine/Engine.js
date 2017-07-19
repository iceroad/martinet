const _ = require('lodash'),
  assert = require('assert'),
  async = require('async'),
  buildDigest = require('./buildDigest'),
  col = require('colors'),
  fs = require('fs'),
  genWebpackConfig = require('./genWebpackConfig'),
  json = JSON.stringify,
  log = require('../util/log'),
  path = require('path'),
  temp = require('temp').track(),
  webpack = require('webpack'),
  EngineWorker = require('./EngineWorker'),
  EventEmitter = require('events')
  ;


class Engine extends EventEmitter {
  constructor(buildSpec, outputRoot, configSpec, projectRoot, engineOpt) {
    super();
    this.configSpec_ = configSpec;
    this.outputRoot_ = outputRoot;
    this.options_ = engineOpt || {};
    this.projectRoot_ = projectRoot;
    this.srcRoot_ = buildSpec.paths.src;
    this.spec_ = buildSpec;
    assert(fs.existsSync(this.srcRoot_));
    assert(fs.existsSync(this.outputRoot_));
  }

  build(cb) {
    const parallel = Math.max(1, this.options_.parallel || 0);

    return async.auto({
      //
      // Spawn worker processes to execute Webpack builds in parallel.
      //
      workers: (cb) => {
        const spawners = _.map(_.range(0, parallel), idx => (cb) => {
          const cbOnce = _.once(cb);
          const worker = new EngineWorker(idx);
          worker.once('ready', () => cbOnce(null, worker));
          worker.once('error', cbOnce);
          worker.startChild();
        });
        return async.parallel(spawners, cb);
      },

      //
      // Assign pages to workers.
      //
      build: ['workers', (deps, cb) => {
        const workers = deps.workers;
        const buildSpec = this.spec_;
        const pages = buildSpec.pages;
        const numWorkers = deps.workers.length;
        const builders = _.map(pages, (pageDef, idx) => (cb) => {
          const worker = workers[idx % numWorkers];
          worker.sendWork('build_page', {
            pageDef,
            projectRoot: this.projectRoot_,
            srcRoot: buildSpec.paths.src,
            outputRoot: this.outputRoot_,
            configSpec: this.configSpec_,
          }, cb);
        });
        return async.parallelLimit(builders, numWorkers, cb);
      }],

    }, (err, results) => {
      if (err) {
        console.error(err);
      }

      // Cleanup all worker processes.
      if (results && results.workers) {
        _.forEach(results.workers, worker => worker.stopChild());
      }

      return cb(err, results.build);
    });
  }

  getBuildState() {
    return this.buildState_;
  }

  getBuildDirectory() {
    return this.outputRoot_;
  }

  publishBuildState() {
    //
    // See if the entire build is broken or not.
    //
    let overallStatus;
    _.forEach(this.buildState_.pages, (pageState) => {
      const status = pageState.status;
      if (!overallStatus) overallStatus = status;
      if (status === 'fail') overallStatus = 'fail';
      if (pageState === 'building' && overallStatus !== 'fail') {
        overallStatus = 'building';
      }
    });

    this.buildState_.status = overallStatus;
    this.emit('build_state', this.buildState_);

    //
    // Get debounced build digest.
    //
    if (overallStatus === 'ok') {
      buildDigest(this.outputRoot_, (err, buildId) => {
        if (buildId && buildId !== this.buildState_.buildId) {
          log.info(`New build ID is ${buildId}`);
          this.buildState_.buildId = buildId;
          this.emit('build_state', this.buildState_);
        }
      });
    }
  }

  watch() {
    const watchOptions = {
      aggregateTimeout: 300,
      poll: 1000,
    };

    this.buildState_ = {
      pages: [],
    };

    this.wpConfigs_ = _.map(this.spec_.pages, (pageDef) => {
      const entryPoints = [];

      //
      // Create a dummy JS file requiring the styles.
      //
      const dummyDir = temp.mkdirSync();
      const srcRoot = this.srcRoot_;
      const outputRoot = this.outputRoot_;
      const configSpec = this.configSpec_;
      const projectRoot = this.projectRoot_;
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

      return genWebpackConfig(
        pageDef, srcRoot, outputRoot, configSpec,
        entryPoints, pageDataLocals, projectRoot);
    });

    const specPageDefs = this.spec_.pages;
    _.forEach(this.wpConfigs_, (wpConf, idx) => {
      const pageDef = specPageDefs[idx];
      log.info(`Building and watching "${col.bold(pageDef.dist)}"...`);
      const compiler = webpack(wpConf);

      this.buildState_.pages.push({
        status: 'building',
        outputRelPath: pageDef.dist,
        errors: [],
        warnings: [],
      });

      compiler.plugin('compile', () => {
        this.buildState_.pages[idx].status = 'building';
        this.publishBuildState();
      });

      compiler.plugin('done', () => {
        this.buildState_.pages[idx].status = 'ok';
        this.publishBuildState();
      });

      compiler.plugin('fail', () => {
        this.buildState_.pages[idx].status = 'fail';
        this.publishBuildState();
      });

      compiler.watch(watchOptions, (err, stats) => {
        if (err) {
          log.error(err.details || err);
        } else {
          const info = stats.toJson();
          this.buildState_.pages[idx].errors = info.errors;
          this.buildState_.pages[idx].warnings = info.warnings;
          this.buildState_.pages[idx].status = info.errors.length ? 'fail' : 'ok';
          this.publishBuildState();
        }
      });
    });
  }
}

module.exports = Engine;
