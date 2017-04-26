/* eslint no-undef: "ignore" */
const _ = require('lodash'),
  assert = require('chai').assert,
  fs = require('fs'),
  path = require('path'),
  readBuildSpec = require('../../lib/engine/readBuildSpec'),
  temp = require('temp').track(),
  Engine = require('../../lib/engine/Engine')
  ;


const TEST_DATA = path.resolve(__dirname, '../../test_data');


describe('Engine: projects that specify sub-paths', function() {
  this.slow(5000);
  this.timeout(10000);


  it('should build a project in a subdirectory to the correct output path (prod)',
      (cb) => {
    const projRoot = path.join(TEST_DATA, 'sub-paths');
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
      const outDir = _.get(stats, 'compilation.outputOptions.path');
      const outDirContents = fs.readdirSync(outputRoot);
      assert.deepEqual(_.sortBy(outDirContents), ['__ver__', 'index.html']);
      const versionedFiles = fs.readdirSync(path.join(outputRoot, '__ver__'));
      assert.strictEqual(versionedFiles.length, 2);

      // Read JS bundle, ensure Typescript was compiled.
      const bundlePath = path.join(
          outDir, '__ver__', _.find(versionedFiles, f => f.match(/\.js$/)));
      const bundle = fs.readFileSync(bundlePath, 'utf-8');
      assert.match(bundle, /Hello, world/mi, 'TypeScript not compiled.');
      assert.notMatch(bundle, /public greeting:/mi, 'TypeScript not compiled.');

      // Read HTML bundle, ensure image was correctly referenced.
      const htmlPath = path.join(outDir, 'index.html');
      const html = fs.readFileSync(htmlPath, 'utf-8');
      assert.match(html, /img src=__ver__\/sample\.[a-f0-9]+\.jpg/mi);
      assert.match(html, /pug_sentinel/mi);

      return cb();
    });
  });

});
