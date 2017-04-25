/* eslint no-undef: "ignore" */
const _ = require('lodash'),
  assert = require('chai').assert,
  fs = require('fs'),
  json = JSON.stringify,
  path = require('path'),
  spawnSync = require('child_process').spawnSync,
  readBuildSpec = require('../../lib/engine/readBuildSpec')
  temp = require('temp').track(),
  Engine = require('../../lib/engine/Engine')
  ;


const TEST_DATA = path.resolve(__dirname, '../../test_data');


describe('Engine: template+data only pages', function() {
  this.slow(5000);
  this.timeout(10000);


  it('should build a page with template and data, without styles or scripts (prod)',
      (cb) => {
    const projRoot = path.join(TEST_DATA, 'template-data-inject');
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
      assert.deepEqual(
          _.sortBy(outDirContents),
          ['__ver__', 'index.html', 'no-data.html']);
      const versionedFiles = fs.readdirSync(path.join(outputRoot, '__ver__'));
      assert.strictEqual(versionedFiles.length, 1);

      // Read index.html, ensure sentinel from data file is present.
      let htmlPath = path.join(outDir, 'index.html');
      let html = fs.readFileSync(htmlPath, 'utf-8');
      assert.match(html, /12345678/mi);

      // Read no-data.html, ensure sentinel is not present.
      htmlPath = path.join(outDir, 'no-data.html');
      html = fs.readFileSync(htmlPath, 'utf-8');
      assert.notMatch(html, /12345678/mi);

      return cb();
    });
  });

});
