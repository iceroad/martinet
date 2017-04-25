/* eslint no-undef: "ignore" */
const _ = require('lodash'),
  assert = require('chai').assert,
  fs = require('fs'),
  fstate = require('../../lib/util/fstate'),
  log = require('../../lib/util/log'),
  json = JSON.stringify,
  path = require('path'),
  temp = require('temp'),
  Engine = require('../../lib/engine/Engine')
  ;


const TEST_DATA = path.resolve(__dirname, '../../test_data');


describe('Engine: simple static site generation', function() {
  this.slow(5000);
  this.timeout(10000);


  it('should build a simple static site with assets (prod)', (cb) => {
    const projRoot = path.join(TEST_DATA, 'simple-static');
    const outputRoot = temp.mkdirSync();
    const engine = new Engine(projRoot, outputRoot, 'prod');
    engine.build((err, allStats) => {
      if (err) {
        console.error(allStats);
        return cb(err);
      }

      //
      // Examine build.
      //
      fstate(outputRoot, (err, files) => {
        if (err) return cb(err);

        //
        // Raw contents:
        //
        //   * .map: 2 sourcemaps
        //   * .html: 3: /index.html and /nested/inner/index.html /nested/inned/about.html
        //   * .js: 2: one bundle each for /nested/inner/index and /index
        //   * .jpg: /__ver__/test.*.jpg
        //   * .css: /__ver__/style.*.css
        //
        const byExt = _.groupBy(files, fileInfo => path.extname(fileInfo.name).substr(1));
        log.debug('Build output files:', json(byExt, null, 2));
        //assert.strictEqual(byExt.ico.length, 1);
        assert.strictEqual(byExt.jpg.length, 1);
        assert.strictEqual(byExt.css.length, 1);
        assert.strictEqual(byExt.html.length, 3);
        assert.strictEqual(byExt.map.length, 2);
        assert.strictEqual(byExt.woff2.length, 1);

        //
        // Validate that URLs in generated HTML point to the right asset paths.
        //
        const htmlFiles = _.sortBy(byExt.html, 'relPath');
        assert.deepEqual(_.map(htmlFiles, 'relPath'), [
            'index.html',
            'nested/inner/about.html',
            'nested/inner/index.html',
          ]);

        // Validate relative URLs: /index.html
        const indexHtml = fs.readFileSync(htmlFiles[0].absPath, 'utf-8');
        assert.match(indexHtml, /link href="__ver__\/style.[a-f0-9]+\.css/mi);
        assert.match(indexHtml, /src="__ver__\/js.[a-f0-9]+\.bundle\.js/mi);
        assert.match(indexHtml, /img src=__ver__\/test\.[a-f0-9]+\.jpg/mi);

        // Validate relative URLs: /nested/inner/about.html
        const innerAbout = fs.readFileSync(htmlFiles[1].absPath, 'utf-8');
        assert.match(innerAbout, /link href="..\/..\/__ver__\/style.[a-f0-9]+\.css/mi);
        assert.match(innerAbout, /src="..\/..\/__ver__\/js.[a-f0-9]+\.bundle\.js/mi);
        assert.match(innerAbout, /img src=..\/..\/__ver__\/test\.[a-f0-9]+\.jpg/mi);

        // Validate relative URLs: /nested/inner/index.html
        const innerIndex = fs.readFileSync(htmlFiles[2].absPath, 'utf-8');
        assert.match(innerAbout, /link href="..\/..\/__ver__\/style.[a-f0-9]+\.css/mi);
        assert.match(innerAbout, /src="..\/..\/__ver__\/js.[a-f0-9]+\.bundle\.js/mi);
        assert.match(innerAbout, /img src=..\/..\/__ver__\/test\.[a-f0-9]+\.jpg/mi);

        // Validate that Pug mixins have been mixed in.
        assert.match(innerAbout, /mixin-sentinel/i);
        assert.match(innerAbout, /<h2>456789<\/h2>/i);  // from sample.json

        //
        // Validate that URLs in generated CSS point to the right asset paths.
        //
        const cssFiles = _.sortBy(byExt.css, 'relPath');
        assert.match(byExt.css[0].relPath, /^__ver__\/style\.[0-9a-f]+\.css/mi);

        // Validate relative URLs: /__ver__/style.NNN.css
        const indexCss = fs.readFileSync(cssFiles[0].absPath, 'utf-8');
        assert.match(indexCss, /url\(\.\.\/__ver__\/glyphicons.[a-f0-9]+\.woff2/mi);
        assert.match(indexCss, /url\(\.\.\/__ver__\/test.[a-f0-9]+\.jpg/mi);

        // Validate that the HTML files all include the CSS.
        const reInner = new RegExp(`link href="../../__ver__/${cssFiles[0].name}`, 'mi');
        const reTop = new RegExp(`link href="__ver__/${cssFiles[0].name}`, 'mi');
        assert.match(innerAbout, reInner);
        assert.match(innerIndex, reInner);
        assert.match(indexHtml, reTop);

        // Validate that Less has been compiled down into CSS.
        assert.match(indexCss, /\.nested-style \.more-div/mi);

        return cb();
      });
    });
  });


});
