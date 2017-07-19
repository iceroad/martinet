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


describe('Engine: Javascript modules should be able to require static JSON',
    function() {
  this.slow(5000);
  this.timeout(10000);


  it('should include require()\' JSON inline (prod)',
      (cb) => {
    const projRoot = path.join(TEST_DATA, 'import-static-json');
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
      assert.match(js, /data_sentinel:{nested:12345}/i);

      return cb();
    });
  });


  it('should include require()\'d JSON inline (dev)',
      (cb) => {
    const projRoot = path.join(TEST_DATA, 'import-static-json');
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

      // Read js file, ensure conditional compilation occurred.
      let jsPath = path.join(outputRoot, '__ver__', versionedFiles[0]);
      let js = fs.readFileSync(jsPath, 'utf-8');
      assert.match(js, /data_sentinel/i);

      return cb();
    });
  });

});
