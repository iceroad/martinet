const _ = require('lodash'),
  assert = require('assert'),
  buildDigest = require('./buildDigest'),
  col = require('colors'),
  express = require('express'),
  fs = require('fs'),
  http = require('http'),
  json = JSON.stringify,
  log = require('../util/log'),
  mime = require('mime'),
  path = require('path'),
  readBuildSpec = require('../engine/readBuildSpec'),
  stablejson = require('json-stable-stringify'),
  temp = require('temp'),
  url = require('url'),
  ws = require('ws'),
  Engine = require('../engine'),
  EventEmitter = require('events')
  ;

const BUILD_STATES = {
  init: 'init',
  building: 'building',
  done: 'done',
  error: 'error',
};

const RELOADER_JS = `
<script>
  ${fs.readFileSync(path.join(__dirname, 'reloader.js'), 'utf-8')}
</script>`;

class DevServer extends EventEmitter {
  constructor(options) {
    super();
    this.opt_ = options;

    //
    // Get "prod" or "dev" build configuration.
    //
    assert(
      this.opt_.config === 'prod' || this.opt_.config === 'dev',
      `Invalid build config "${this.opt_.config}".`.red);
    this.buildConfig_ = this.opt_.config;

    //
    // Ensure build specification exists in project root directory
    // (but may be invalid/malformed, that's OK).
    //
    this.projectRoot_ = path.resolve(this.opt_.root);
    this.buildSpecPath_ = path.resolve(this.opt_.root, 'martinet.json');
    try {
      fs.accessSync(this.buildSpecPath_, fs.constants.R_OK);
    } catch (e) {
      throw new Error(
        `Unable to read build specification "${this.buildSpecPath_}": ` +
        `${e.message}`);
    }

    this.buildState_ = BUILD_STATES.init;

    //
    // WebPack can "finish" a build and then restart it and then finish again
    // sometimes, causing havoc with UI. Debounce build success notifications.
    //
    this.succeedBuild = _.debounce(this.succeedBuild.bind(this), 1000);
    this.failBuild = _.debounce(this.failBuild.bind(this), 1000);
  }

  start() {
    log.info(`Build configuration: ${col.bgYellow.black(this.buildConfig_)}`);

    //
    // Create and start a server instance.
    //
    this.createWebServer();
    const port = this.opt_.port;
    this.httpServer_.listen(port, '0.0.0.0', (err) => {
      if (err) {
        log.error(err);
        return process.exit(1);
      }
      log.info(`${col.bold('Open the following URL in a browser:')}
┃
┃  ${col.bold(`http://localhost:${port}/`).green}
┃`);

      //
      // Create and start a build file watcher to bootstrap the engine
      // creation process.
      //
      this.watchBuildSpecification();
    });
  }

  watchBuildSpecification() {
    const state = {};

    const ReadSpec = () => {
      // Read raw JSON.
      try {
        state.curSpec = readBuildSpec(this.projectRoot_);
      } catch (e) {
        this.failBuild({
          reason: 'bad_spec',
          text: `Cannot read build specification: ${e.message}`,
        });
        delete state.oldSpec;
        return _.delay(ReadSpec, 2000);
      }

      // Compare to previous spec, kickstart rebuild if needed.
      const currentStableStr = stablejson(state.curSpec);
      if (currentStableStr !== state.oldSpec) {
        state.oldSpec = currentStableStr;
        this.startNewBuild(state.curSpec);
      }

      return _.delay(ReadSpec, 2000);
    };

    ReadSpec();
  }

  failBuild(errorDetail) {
    this.buildState_ = BUILD_STATES.error;
    this.errorDetails_ = errorDetail;
    this.broadcast(this.getBuildState());
  }

  succeedBuild() {
    this.buildState_ = BUILD_STATES.done;
    delete this.errorDetails_;
    this.broadcast(this.getBuildState());
  }

  createWebServer() {
    //
    // Create HTTP server and bind HTTP request listener.
    //
    const app = this.expressApp_ = express();
    app.use(
        '/__martinet__/status',
        express.static(path.join(__dirname, 'statuspage')));
    app.use(this.onHttpRequest.bind(this));
    app.use(this.onHttp404.bind(this));
    this.httpServer_ = http.createServer(app);

    //
    // Create Websocket server.
    //
    const wsOptions = {
      path: '/__martinet__/ws',
      perMessageDeflate: true,
      server: this.httpServer_,
    };
    this.wsServer_ = new ws.Server(wsOptions);
    this.wsServer_.on('connection', this.onWsConnectionStart.bind(this));
    this.wsServer_.on('error', err => log.error(err));
  }

  onHttp404(req, res) {
    res.writeHead(404, {
      'Content-Type': 'text/plain',
    });
    res.end('404 Not Found');
  }

  onWsConnectionStart(websocket) {
    websocket.send(json(this.getBuildState()));
  }

  getBuildState() {
    return {
      specPath: this.buildSpecPath_,
      projectRoot: this.projectRoot_,
      status: this.buildState_,
      error: this.errorDetails_,
      build: this.pageBuildStatus_,
      buildId: this.buildId_,
    };
  }

  broadcast(data) {
    const dataStr = stablejson(data);
    if (dataStr !== this.lastBroadcast_) {
      log.debug(`Websocket broadcast: ${json(data).substr(0, 140)}`);
      this.wsServer_.clients.forEach((client) => {
        if (client.readyState === ws.OPEN) {
          client.send(dataStr);
        }
      });
      this.lastBroadcast_ = dataStr;
    }
  }

  onHttpRequest(req, res, next) {
    switch (this.buildState_) {
      case BUILD_STATES.init:
      case BUILD_STATES.building:
      case BUILD_STATES.error: {
        // Redirect to status page.
        const statusUrl =
          `/__martinet__/status?bounceBack=${encodeURIComponent(req.url)}`;
        res.writeHead(302, {
          Location: statusUrl,
        });
        res.end();
        break;
      }

      case BUILD_STATES.done: {
        // Serve file from project build directory.
        let urlPath = decodeURIComponent(url.parse(req.url).pathname);
        if (urlPath[urlPath.length - 1] === '/') urlPath += 'index.html';
        let clientPath = path.join(this.buildDir_, path.normalize(urlPath).substr(1));
        if (fs.existsSync(clientPath) && fs.statSync(clientPath).isDirectory()) {
          clientPath += '/index.html';
        }
        let fileContents, mimeType;
        try {
          fileContents = fs.readFileSync(clientPath);
          mimeType = mime.lookup(clientPath);
        } catch (e) {
          log.debug(`File not found: ${clientPath}: ${e}`);
          return next();
        }

        //
        // Inject auto-reloader if the config flag is set and MIME is HTML.
        //
        if (mimeType === 'text/html') {
          fileContents = Buffer.from(
            fileContents.toString('utf-8').replace(/<\/body>/mi, RELOADER_JS),
            'utf-8');
        }
        res.writeHead(200, {
          'Content-Type': mimeType,
          'Content-Length': fileContents.length,
        });
        res.end(fileContents);
        break;
      }

      default: {
        log.error(`Unknown build state: ${this.buildState_}`);
        return process.exit(1);
      }
    }
  }

  startNewBuild(buildSpec) {
    log.info(`Starting new build...`);
    delete this.errorDetails_;
    this.buildState_ = BUILD_STATES.building;
    this.broadcast(this.getBuildState());

    //
    // Create new temporary directory for each build.
    //
    const buildDir = this.buildDir_ = temp.mkdirSync();
    log.verbose(`Temporary build directory: ${buildDir}`);

    //
    // Destroy existing build engine.
    //
    if (this.engine_) {
      log.debug(`Destroying existing build engine...`);
      this.engine_.stopWorkers();
      this.engine_.removeAllListeners();
      temp.cleanupSync();
      delete this.engine_;
    }

    //
    // Create build engine and start in watch mode.
    //
    const engine = this.engine_ = new Engine(
        buildSpec,
        buildDir,
        this.buildConfig_,
        this.projectRoot_,
        this.opt_);
    engine.startWorkers((err) => {
      if (err) {
        this.failBuild({
          reason: 'worker_error',
          text: err.message,
        });
        engine.stopWorkers();
        return;
      }
      log.debug(`All worker processes ready.`);
      engine.watch();
    });

    engine.on('build_status', (pageBuildStatus) => {
      this.pageBuildStatus_ = pageBuildStatus;
      this.broadcast(this.getBuildState());
      if (pageBuildStatus.overall === 'done') {
        buildDigest(this.buildDir_, (err, buildId) => {
          if (err) {
            log.error(err);
          }
          this.buildId_ = buildId;
          this.succeedBuild();
        });
      }
      if (pageBuildStatus.overall === 'fail') {
        this.failBuild({
          reason: 'build_failed',
        });
      }
    });
  }
}

module.exports = DevServer;
