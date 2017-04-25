/* eslint no-undef: "ignore" */
const _ = require('lodash'),
  assert = require('chai').assert,
  fs = require('fs'),
  json = JSON.stringify,
  path = require('path'),
  readBuildSpec = require('../../lib/engine/readBuildSpec'),
  spawnSync = require('child_process').spawnSync,
  temp = require('temp'),
  Engine = require('../../lib/engine')
  ;


const TEST_DATA = path.resolve(__dirname, '../../test_data');


describe('Engine: ES6 support via Babel', function() {
  this.slow(5000);
  this.timeout(10000);


  it('should compile a simple ES6 JS file (prod)', (cb) => {
    const projRoot = path.join(TEST_DATA, 'es6-js');
    const outputRoot = temp.mkdirSync();
    const engine = new Engine(readBuildSpec(projRoot), outputRoot, 'prod');
    engine.build((err, allStats) => {
      const stats = allStats[0];

      // Ensure compilation was successful.
      assert.isNotOk(err);
      assert.isFalse(stats.hasErrors());

      // Ensure no warnings compiling ES-latest code.
      assert.isFalse(stats.hasWarnings());
      const warnings = _.get(stats, 'compilation.warnings', []);

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
      assert.notMatch(bundle, /\/\*\*/mgi);

      // Check file dependencies.
      const fileDeps = _.get(stats, 'compilation.fileDependencies', []);
      assert.strictEqual(fileDeps.length, 5);

      // Finally execute bundle using node.
      const rv = spawnSync(process.execPath, [bundlePath], { stdio: 'pipe' });
      assert.strictEqual(0, rv.status);
      assert.match(rv.stdout.toString('utf-8'), /sentinel_1 1/mgi);
      assert.match(rv.stdout.toString('utf-8'), /sentinel_2 2/mgi);

      return cb();
    });
  });


});
