/* eslint no-undef: "ignore" */
const _ = require('lodash'),
  assert = require('chai').assert,
  fs = require('fs'),
  json = JSON.stringify,
  path = require('path'),
  spawnSync = require('child_process').spawnSync,
  readBuildSpec = require('../../lib/engine/readBuildSpec'),
  temp = require('temp').track(),
  Engine = require('../../lib/engine/Engine')
  ;


const TEST_DATA = path.resolve(__dirname, '../../test_data');


describe('Engine: compile-time constants for conditional compilation', function() {
  this.slow(5000);
  this.timeout(10000);

  it('should build a page with with conditional compilation (prod)',
      (cb) => {
    const projRoot = path.join(TEST_DATA, 'compile-constants');
    const buildSpec = readBuildSpec(projRoot);
    const outputRoot = temp.mkdirSync();
    const engine = new Engine(buildSpec, outputRoot, 'prod', projRoot);
    engine.build((err, allStats) => {
      if (err) {
        console.error(allStats);
        return cb(err);
      }

      // Ensure compilation was successful.
      const stats = allStats[0];  // first page in build specification
      assert.isFalse(stats.hasErrors());

      // Ensure output directory matches expectation.
      const outDirContents = fs.readdirSync(outputRoot);
      assert.deepEqual(
          _.sortBy(outDirContents),
          ['__ver__', 'index.html']);
      const versionedFiles = fs.readdirSync(path.join(outputRoot, '__ver__'));
      assert.strictEqual(versionedFiles.length, 1);

      // Read js file, ensure conditional compilation occurred.
      let jsPath = path.join(outputRoot, '__ver__', versionedFiles[0]);
      let js = fs.readFileSync(jsPath, 'utf-8');
      assert.match(js, /config:prod/mi);
      assert.notMatch(js, /config:dev/mi);
      assert.notMatch(js, /config:unknown/mi);


      // Ensure that the Pug file had access to $martinet.
      const html = fs.readFileSync(path.join(outputRoot, 'index.html'), 'utf-8');
      assert.notMatch(html, /pug_sentinel:dev/i);
      assert.notMatch(html, /pug_sentinel:unknown/i);
      assert.match(html, /pug_sentinel:prod/i);
      assert.match(html, /public_path::/i);

      return cb();
    });
  });

  it('should build a page with with conditional compilation (dev)',
      (cb) => {
    const projRoot = path.join(TEST_DATA, 'compile-constants');
    const buildSpec = readBuildSpec(projRoot);
    const outputRoot = temp.mkdirSync();
    const engine = new Engine(buildSpec, outputRoot, 'dev', projRoot);
    engine.build((err, allStats) => {
      if (err) {
        console.error(allStats);
        return cb(err);
      }

      // Ensure compilation was successful.
      const stats = allStats[0];  // first page in build specification
      assert.isFalse(stats.hasErrors());

      // Ensure output directory matches expectation.
      const outDirContents = fs.readdirSync(outputRoot);
      assert.deepEqual(
          _.sortBy(outDirContents),
          ['__ver__', 'index.html']);
      const versionedFiles = fs.readdirSync(path.join(outputRoot, '__ver__'));
      assert.strictEqual(versionedFiles.length, 1);

      // Read js file, all versions of conditional compilation should be
      // included (i.e., no code removal).
      let jsPath = path.join(outputRoot, '__ver__', versionedFiles[0]);
      let js = fs.readFileSync(jsPath, 'utf-8');
      assert.match(js, /config:prod/mi);
      assert.match(js, /config:dev/mi);
      assert.match(js, /config:unknown/mi);

      // Finally execute bundle using node.
      const rv = spawnSync(process.execPath, [jsPath], { stdio: 'pipe' });
      assert.strictEqual(0, rv.status);
      assert.match(rv.stdout.toString('utf-8'), /config:dev/mgi);
      assert.notMatch(rv.stdout.toString('utf-8'), /config:prod/mgi);
      assert.notMatch(rv.stdout.toString('utf-8'), /config:unknown/mgi);

      // Ensure that the Pug file had access to $martinet.
      const html = fs.readFileSync(path.join(outputRoot, 'index.html'), 'utf-8');
      assert.match(html, /pug_sentinel:dev/i);
      assert.notMatch(html, /pug_sentinel:prod/i);
      assert.notMatch(html, /pug_sentinel:unknown/i);
      assert.match(html, /public_path::/i);

      return cb();
    });
  });

});
