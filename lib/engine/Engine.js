const _ = require('lodash'),
  assert = require('assert'),
  async = require('async'),
  col = require('colors'),
  fs = require('fs'),
  genWebpackConfig = require('./genWebpackConfig'),
  json = JSON.stringify,
  log = require('../util/log'),
  os = require('os'),
  path = require('path'),
  temp = require('temp').track(),
  webpack = require('webpack'),
  EngineWorker = require('./EngineWorker'),
  EventEmitter = require('events')
  ;


class Engine extends EventEmitter {
  constructor(buildSpec, outputRoot, buildConfig, projectRoot, engineOpt) {
    super();
    this.buildConfig_ = buildConfig;
    this.outputRoot_ = outputRoot;
    this.options_ = engineOpt || {};
    this.parallel_ = this.options_.parallel || os.cpus().length;
    this.projectRoot_ = projectRoot;
    this.srcRoot_ = buildSpec.paths.src;
    this.buildSpec_ = buildSpec;
  }

  startWorkers(cb) {
    const spawners = _.map(_.range(0, this.parallel_), idx => (cb) => {
      const cbOnce = _.once(cb);
      const worker = new EngineWorker(idx);
      worker.once('ready', () => cbOnce(null, worker));
      worker.once('error', cbOnce);
      worker.startChild();
    });
    return async.parallel(spawners, (err, workers) => {
      if (err) return cb(err);
      this.workers_ = workers;
      return cb();
    });
  }

  stopWorkers() {
    _.forEach(this.workers_, worker => worker.stopChild());
    this.removeAllListeners();
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
        const buildSpec = this.buildSpec_;
        const pages = buildSpec.pages;
        const numWorkers = deps.workers.length;
        const builders = _.map(pages, (pageDef, idx) => (cb) => {
          const worker = workers[idx % numWorkers];
          worker.sendWork('build_page', {
            pageDef,
            projectRoot: this.projectRoot_,
            srcRoot: buildSpec.paths.src,
            outputRoot: this.outputRoot_,
            buildConfig: this.buildConfig_,
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

  watch() {
    const workers = this.workers_;
    const buildSpec = this.buildSpec_;
    const pages = buildSpec.pages;
    const numWorkers = workers.length;

    //
    // Maintain a compile status for each page, indexed by output path.
    //
    const pageStates = _.fromPairs(_.map(pages, (pageDef, idx) => {
      return [pageDef.dist, {
        status: 'wait',
        idx,
      }];
    }));

    //
    // Handle status updates from workers.
    //
    const handlerWorkerUpdates = (evtName) => (evtData) => {
      // Update page build status based on page output path.
      const pageDist = evtData.pageDef.dist;
      const state = pageStates[pageDist];

      switch(evtName) {
        case 'page_compile': {
          // Compilation started.
          pageStates[pageDist] = {
            idx: state.idx,
            status: 'building',
          };
          break;
        }

        case 'page_done': {
          // Compilation has finished, with either a pass or a fail.
          const pageErrors = _.get(evtData, 'stats.errors', []);
          const pageWarnings = _.get(evtData, 'stats.warnings', []);
          const pageAssets = _.get(evtData, 'stats.assets', []);
          pageStates[pageDist] = {
            idx: state.idx,
            status: pageErrors.length ? 'fail' : 'done',
            errors: pageErrors,
            warnings: pageWarnings,
            assets: _.map(pageAssets, (asset) => {
              return _.pick(asset, ['name', 'size', 'chunkNames']);
            }),
          };
          break;
        }

        default: {
          log.error(`Unknown event "${evtName}" from worker child.`);
          return process.exit(1);
        }
      }

      // Determine overall build status.
      const hasFailed = _.find(pageStates, pg => pg.status === 'fail');
      const hasFinished = _.every(pageStates, pg => pg.status === 'done');
      const overallStatus = (hasFinished ? 'done' : (hasFailed ? 'fail' : 'building'));
      this.emit('build_status', {
        overall: overallStatus,
        pageStates,
      });
    };

    //
    // Listen for messages from child workers.
    //
    _.forEach(workers, (worker) => {
      worker.on('page_compile', handlerWorkerUpdates('page_compile'));
      worker.on('page_done', handlerWorkerUpdates('page_done'));
    });

    //
    // Distribute pages among builders to watch.
    //
    _.forEach(pages, (pageDef, idx) => {
      const worker = workers[idx % numWorkers];
      worker.sendWork('watch_page', {
        pageDef,
        projectRoot: this.projectRoot_,
        srcRoot: buildSpec.paths.src,
        outputRoot: this.outputRoot_,
        buildConfig: this.buildConfig_,
      });
    });
  }
}

module.exports = Engine;
