/* eslint no-undef: "ignore" */
const _ = require('lodash'),
  assert = require('chai').assert,
  fs = require('fs'),
  json = JSON.stringify,
  path = require('path'),
  spawnSync = require('child_process').spawnSync,
  readBuildSpec = require('../../lib/engine/readBuildSpec'),
  temp = require('temp'),
  Engine = require('../../lib/engine')
  ;


const TEST_DATA = path.resolve(__dirname, '../../test_data');


describe('Engine: Vue single-file components support', function() {
  this.slow(5000);
  this.timeout(10000);


  it('should compile a single-file .vue component (prod)', (cb) => {
    const projRoot = path.join(TEST_DATA, 'vue-components');
    const outputRoot = temp.mkdirSync();
    const engine = new Engine(readBuildSpec(projRoot), outputRoot, 'prod');
    engine.build((err, allStats) => {
      const stats = allStats[0];

      // Ensure compilation was successful.
      assert.isNotOk(err);
      assert.isFalse(stats.hasErrors());

      // Ensure output directory matches expectation.
      const outDir = _.get(stats, 'compilation.outputOptions.path');
      const outDirContents = fs.readdirSync(outputRoot);
      assert.deepEqual(_.sortBy(outDirContents), ['__ver__', 'index.html']);
      const versionedFiles = fs.readdirSync(path.join(outputRoot, '__ver__'));
      assert.strictEqual(versionedFiles.length, 4);       // .map, .bundle.js, .css, and .jpg

      // Read JS bundle, ensure sentinels are present.
      const bundleFilename = _.find(versionedFiles, fileInfo => fileInfo.match(/\.js$/));
      const bundlePath = path.join(outDir, '__ver__', bundleFilename);
      const bundle = fs.readFileSync(bundlePath, 'utf-8');
      assert.match(bundle, /vue-script-sentinel/mgi);
      assert.match(bundle, /vue-template-sentinel/mgi);
      assert.notMatch(bundle, /vue-style-sentinel/mgi);

      // Read CSS bundle, ensure sentinel is present.
      const styleFilename = _.find(versionedFiles, fileInfo => fileInfo.match(/\.css$/));
      const stylePath = path.join(outDir, '__ver__', styleFilename);
      const style = fs.readFileSync(stylePath, 'utf-8');
      assert.match(style, /vue-style-sentinel/mgi);
      assert.notMatch(style, /vue-script-sentinel/mgi);
      assert.notMatch(style, /vue-template-sentinel/mgi);

      // Finally execute bundle using node.
      const rv = spawnSync(process.execPath, [bundlePath], { stdio: 'pipe' });
      assert.strictEqual(0, rv.status);
      const stdout = rv.stdout.toString('utf-8');
      assert.match(stdout, /vue-script-sentinel/mgi);
      assert.notMatch(stdout, /vue-style-sentinel/mgi);
      assert.notMatch(stdout, /vue-template-sentinel/mgi);

      return cb();
    });
  });


  it('should compile a single-file .vue component (dev)', (cb) => {
    const projRoot = path.join(TEST_DATA, 'vue-components');
    const outputRoot = temp.mkdirSync();
    const engine = new Engine(readBuildSpec(projRoot), outputRoot, 'dev');
    engine.build((err, allStats) => {
      const stats = allStats[0];

      // Ensure compilation was successful.
      assert.isNotOk(err);
      assert.isFalse(stats.hasErrors());

      // Ensure output directory matches expectation.
      const outDir = _.get(stats, 'compilation.outputOptions.path');
      const outDirContents = fs.readdirSync(outputRoot);
      assert.deepEqual(_.sortBy(outDirContents), ['__ver__', 'index.html']);
      const versionedFiles = fs.readdirSync(path.join(outputRoot, '__ver__'));
      assert.strictEqual(versionedFiles.length, 3);       // .bundle.js, .css, and .jpg

      // Read JS bundle, ensure sentinels are present.
      const bundleFilename = _.find(versionedFiles, fileInfo => fileInfo.match(/\.js$/));
      const bundlePath = path.join(outDir, '__ver__', bundleFilename);
      const bundle = fs.readFileSync(bundlePath, 'utf-8');
      assert.match(bundle, /vue-script-sentinel/mgi);
      assert.match(bundle, /vue-template-sentinel/mgi);
      assert.notMatch(bundle, /vue-style-sentinel/mgi);

      // Read CSS bundle, ensure sentinel is present.
      const styleFilename = _.find(versionedFiles, fileInfo => fileInfo.match(/\.css$/));
      const stylePath = path.join(outDir, '__ver__', styleFilename);
      const style = fs.readFileSync(stylePath, 'utf-8');
      assert.match(style, /vue-style-sentinel/mgi);
      assert.notMatch(style, /vue-script-sentinel/mgi);
      assert.notMatch(style, /vue-template-sentinel/mgi);

      // Finally execute bundle using node.
      const rv = spawnSync(process.execPath, [bundlePath], { stdio: 'pipe' });
      assert.strictEqual(0, rv.status);
      const stdout = rv.stdout.toString('utf-8');
      assert.match(stdout, /vue-script-sentinel/mgi);
      assert.notMatch(stdout, /vue-style-sentinel/mgi);
      assert.notMatch(stdout, /vue-template-sentinel/mgi);

      return cb();
    });
  });

});
