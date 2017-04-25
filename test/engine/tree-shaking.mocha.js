/* eslint no-undef: "ignore" */
const _ = require('lodash'),
  assert = require('chai').assert,
  fs = require('fs'),
  json = JSON.stringify,
  path = require('path'),
  spawnSync = require('child_process').spawnSync,
  readBuildSpec = require('../../lib/engine/readBuildSpec'),
  temp = require('temp'),
  Engine = require('../../lib/engine/Engine')
  ;


const TEST_DATA = path.resolve(__dirname, '../../test_data');


describe('Engine: Webpack tree-shaking', function() {
  this.slow(5000);
  this.timeout(10000);


  it('should compile a simple JS file with tree-shaking (prod)', (cb) => {
    const projRoot = path.join(TEST_DATA, 'single-js');
    const outputRoot = temp.mkdirSync();
    const engine = new Engine(readBuildSpec(projRoot), outputRoot, 'prod', projRoot);
    engine.build((err, allStats) => {
      if (err) {
        console.error(allStats);
        return cb(err);
      }
      const stats = allStats[0];

      // Ensure compilation was successful.
      assert.isFalse(stats.hasErrors());

      // Ensure that removing the unused function lead to a warning.
      assert.isTrue(stats.hasWarnings());  // for unused function removal
      const warnings = _.get(stats, 'compilation.warnings', []);
      assert.strictEqual(warnings.length, 1);
      assert.match(warnings[0].message, /unused function func2/i);

      // Ensure output directory matches expectation.
      const outDir = _.get(stats, 'compilation.outputOptions.path');
      const outDirContents = fs.readdirSync(outputRoot);
      assert.deepEqual(_.sortBy(outDirContents), ['__ver__', 'index.html']);
      const versionedFiles = fs.readdirSync(path.join(outputRoot, '__ver__'));
      assert.strictEqual(versionedFiles.length, 1);

      // Read bundle, ensure both functions are present.
      const bundlePath = path.join(outDir, '__ver__', versionedFiles[0]);
      const bundle = fs.readFileSync(bundlePath, 'utf-8');
      assert.match(bundle, /sentinel_1/mgi);
      assert.notMatch(bundle, /sentinel_2/mgi);
      assert.notMatch(bundle, /\/\*\*/mgi);

      // Check file dependencies.
      const fileDeps = _.get(stats, 'compilation.fileDependencies', []);
      assert.strictEqual(fileDeps.length, 7);
      assert.deepEqual(
          _.sortBy(_.map(fileDeps, absPath => path.basename(absPath))),
          ['entry.js', 'global.js', 'index.html', 'library.js',
          'lodash.js', 'martinet_imports.js', 'module.js']);

      // Finally execute bundle using node.
      const rv = spawnSync(process.execPath, [bundlePath], { stdio: 'pipe' });
      assert.strictEqual(0, rv.status);
      assert.match(rv.stdout.toString('utf-8'), /sentinel_1/mgi);
      assert.notMatch(rv.stdout.toString('utf-8'), /sentinel_2/mgi);

      return cb();
    });
  });


  it('should compile a simple JS file without tree-shaking (dev)', (cb) => {
    const projRoot = path.join(TEST_DATA, 'single-js');
    const outputRoot = temp.mkdirSync();
    const engine = new Engine(readBuildSpec(projRoot), outputRoot, 'dev', projRoot);
    engine.build((err, allStats) => {
      if (err) {
        console.error(allStats);
        return cb(err);
      }
      const stats = allStats[0];

      // Ensure compilation was successful.
      assert.isNotOk(err);
      assert.isFalse(stats.hasErrors());
      assert.isFalse(stats.hasWarnings());

      // Ensure output directory matches expectation.
      const outDir = _.get(stats, 'compilation.outputOptions.path');
      const outDirContents = fs.readdirSync(outputRoot);
      assert.deepEqual(_.sortBy(outDirContents), ['__ver__', 'index.html']);
      const versionedFiles = fs.readdirSync(path.join(outputRoot, '__ver__'));
      assert.strictEqual(versionedFiles.length, 1);

      // Read bundle, ensure both functions are present.
      const bundlePath = path.join(outDir, '__ver__', versionedFiles[0]);
      const bundle = fs.readFileSync(bundlePath, 'utf-8');
      assert.match(bundle, /sentinel_1/mgi);
      assert.match(bundle, /sentinel_2/mgi);

      // Check file dependencies.
      const fileDeps = _.get(stats, 'compilation.fileDependencies', []);
      assert.strictEqual(fileDeps.length, 7);

      return cb();
    });
  });


  it('should remove unused library dependencies using import (prod)', (cb) => {
    const projRoot = path.join(TEST_DATA, 'js-with-deps');
    const outputRoot = temp.mkdirSync();
    const engine = new Engine(readBuildSpec(projRoot), outputRoot, 'prod', projRoot);
    engine.build((err, allStats) => {
      if (err) {
        console.error(allStats);
        return cb(err);
      }
      const stats = allStats[0];

      // Ensure compilation was successful.
      assert.isNotOk(err);
      assert.isFalse(stats.hasErrors());

      // Ensure output directory matches expectation.
      const outDir = _.get(stats, 'compilation.outputOptions.path');
      const outDirContents = fs.readdirSync(outputRoot);
      assert.deepEqual(_.sortBy(outDirContents), ['__ver__', 'index.html']);
      const versionedFiles = fs.readdirSync(path.join(outputRoot, '__ver__'));
      assert.strictEqual(versionedFiles.length, 1);

      // Read bundle, ensure both functions are present.
      const bundlePath = path.join(outDir, '__ver__', versionedFiles[0]);
      const bundle = fs.readFileSync(bundlePath, 'utf-8');
      assert.match(bundle, /sentinel_1/mgi);
      assert.notMatch(bundle, /sentinel_2/mgi);
      assert.notMatch(bundle, /\/\*\*/mgi);
      assert.isBelow(bundle.length, 25 * 1024, 'lodash not tree-shaken');
      assert.isAbove(bundle.length, 15 * 1024, 'lodash not tree-shaken');

      return cb();
    });
  });

});
