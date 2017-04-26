const express = require('express'),
  fs = require('fs'),
  http = require('http'),
  json = JSON.stringify,
  log = require('../../util/log'),
  mime = require('mime'),
  path = require('path'),
  url = require('url'),
  ws = require('ws'),
  EventEmitter = require('events')
  ;


const RELOADER_JS = `
<script>
  ${fs.readFileSync(path.resolve(__dirname, 'reloader.js'), 'utf-8')}
</script>`;

class DevServer extends EventEmitter {
  constructor(options, engine) {
    super();
    this.port_ = options.port || 8000;
    this.engine_ = engine;

    //
    // Create HTTP server and bind HTTP request listener.
    //
    const app = this.expressApp_ = express();
    app.use('/__dev__/status', express.static(path.join(__dirname, 'static')));
    app.use(this.onHttpRequest.bind(this));
    app.use((req, res) => {
      const newLocation =
          `/__dev__/status/?error=404&url=${encodeURIComponent(req.url)}`;
      res.writeHead(302, { Location: newLocation });
      res.end();
    });
    this.httpServer_ = http.createServer(app);

    //
    // Create Websocket server.
    //
    const wsOptions = {
      path: '/__dev__/ws',
      perMessageDeflate: true,
      server: this.httpServer_,
    };
    this.wsServer_ = new ws.Server(wsOptions);
    this.wsServer_.on('connection', this.onWsConnectionStart.bind(this));
    this.wsServer_.on('error', err => log.error(err));

    //
    // Forward build_state to connected Websocket clients.
    //
    engine.on('build_state', this.broadcast.bind(this));
  }

  listen(cb) {
    this.httpServer_.listen(this.port_, '0.0.0.0', cb);
  }

  onWsConnectionStart(websocket) {
    websocket.send(json(this.engine_.getBuildState()));
  }

  broadcast(data) {
    log.debug(`Websocket broadcast: ${json(data).substr(0, 80)}`);
    const dataStr = json(data);
    this.wsServer_.clients.forEach((client) => {
      if (client.readyState === ws.OPEN) {
        client.send(dataStr);
      }
    });
  }

  onHttpRequest(req, res, next) {
    const engine = this.engine_;
    const buildDir = engine.getBuildDirectory();
    let urlPath = url.parse(req.url).pathname;
    if (urlPath[urlPath.length - 1] === '/') urlPath += 'index.html';
    let clientPath = path.join(buildDir, path.normalize(urlPath).substr(1));
    if (fs.existsSync(clientPath) && fs.statSync(clientPath).isDirectory()) {
      clientPath += '/index.html';
    }
    log.debug(`HTTP request for file ${clientPath}.`);

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
  }
}


module.exports = DevServer;
